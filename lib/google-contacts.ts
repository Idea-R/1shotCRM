import { google } from 'googleapis';

export interface GoogleContact {
  resourceName?: string;
  names?: Array<{
    givenName?: string;
    familyName?: string;
    displayName?: string;
  }>;
  emailAddresses?: Array<{
    value: string;
    type?: string;
  }>;
  phoneNumbers?: Array<{
    value: string;
    type?: string;
  }>;
  organizations?: Array<{
    name?: string;
    title?: string;
  }>;
}

/**
 * Get OAuth2 client with refresh token
 */
function getOAuth2Client(refreshToken: string) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/calendar/google/callback`
  );

  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return oauth2Client;
}

/**
 * List Google Contacts
 */
export async function listGoogleContacts(
  refreshToken: string,
  pageSize: number = 100,
  pageToken?: string
) {
  const oauth2Client = getOAuth2Client(refreshToken);
  const people = google.people({ version: 'v1', auth: oauth2Client });

  const response = await people.people.connections.list({
    resourceName: 'people/me',
    personFields: 'names,emailAddresses,phoneNumbers,organizations',
    pageSize,
    pageToken,
  });

  return {
    contacts: response.data.connections || [],
    nextPageToken: response.data.nextPageToken,
  };
}

/**
 * Get a specific Google Contact
 */
export async function getGoogleContact(
  refreshToken: string,
  resourceName: string
): Promise<GoogleContact | null> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const people = google.people({ version: 'v1', auth: oauth2Client });

  try {
    const response = await people.people.get({
      resourceName,
      personFields: 'names,emailAddresses,phoneNumbers,organizations',
    });

    return response.data as GoogleContact;
  } catch (error) {
    console.error('Error getting Google contact:', error);
    return null;
  }
}

/**
 * Create a Google Contact
 */
export async function createGoogleContact(
  refreshToken: string,
  contact: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
  }
): Promise<string> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const people = google.people({ version: 'v1', auth: oauth2Client });

  const contactData: any = {};

  // Add name
  if (contact.name || contact.firstName || contact.lastName) {
    contactData.names = [
      {
        givenName: contact.firstName || contact.name?.split(' ')[0] || '',
        familyName: contact.lastName || contact.name?.split(' ').slice(1).join(' ') || '',
        displayName: contact.name || `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
      },
    ];
  }

  // Add email
  if (contact.email) {
    contactData.emailAddresses = [
      {
        value: contact.email,
        type: 'work',
      },
    ];
  }

  // Add phone
  if (contact.phone) {
    contactData.phoneNumbers = [
      {
        value: contact.phone,
        type: 'work',
      },
    ];
  }

  // Add organization
  if (contact.company) {
    contactData.organizations = [
      {
        name: contact.company,
      },
    ];
  }

  const response = await people.people.createContact({
    requestBody: contactData,
  });

  return response.data.resourceName || '';
}

/**
 * Update a Google Contact
 */
export async function updateGoogleContact(
  refreshToken: string,
  resourceName: string,
  updates: {
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
  }
): Promise<string> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const people = google.people({ version: 'v1', auth: oauth2Client });

  // Get existing contact
  const existing = await getGoogleContact(refreshToken, resourceName);
  if (!existing) {
    throw new Error('Contact not found');
  }

  const contactData: any = {
    names: existing.names || [],
    emailAddresses: existing.emailAddresses || [],
    phoneNumbers: existing.phoneNumbers || [],
    organizations: existing.organizations || [],
  };

  // Update name
  if (updates.name || updates.firstName || updates.lastName) {
    contactData.names = [
      {
        givenName: updates.firstName || updates.name?.split(' ')[0] || contactData.names[0]?.givenName || '',
        familyName: updates.lastName || updates.name?.split(' ').slice(1).join(' ') || contactData.names[0]?.familyName || '',
        displayName: updates.name || `${updates.firstName || ''} ${updates.lastName || ''}`.trim() || contactData.names[0]?.displayName || '',
      },
    ];
  }

  // Update email
  if (updates.email) {
    if (contactData.emailAddresses.length > 0) {
      contactData.emailAddresses[0].value = updates.email;
    } else {
      contactData.emailAddresses.push({
        value: updates.email,
        type: 'work',
      });
    }
  }

  // Update phone
  if (updates.phone) {
    if (contactData.phoneNumbers.length > 0) {
      contactData.phoneNumbers[0].value = updates.phone;
    } else {
      contactData.phoneNumbers.push({
        value: updates.phone,
        type: 'work',
      });
    }
  }

  // Update company
  if (updates.company) {
    if (contactData.organizations.length > 0) {
      contactData.organizations[0].name = updates.company;
    } else {
      contactData.organizations.push({
        name: updates.company,
      });
    }
  }

  const response = await people.people.updateContact({
    resourceName,
    updatePersonFields: 'names,emailAddresses,phoneNumbers,organizations',
    requestBody: contactData,
  });

  return response.data.resourceName || '';
}

/**
 * Delete a Google Contact
 */
export async function deleteGoogleContact(
  refreshToken: string,
  resourceName: string
): Promise<boolean> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const people = google.people({ version: 'v1', auth: oauth2Client });

  await people.people.deleteContact({
    resourceName,
  });

  return true;
}

/**
 * Sync CRM contacts to Google Contacts (two-way sync)
 */
export async function syncContactsToGoogle(
  refreshToken: string,
  crmContacts: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
    company?: string;
  }>,
  googleContactMap?: Map<string, string> // Maps CRM contact ID to Google resourceName
): Promise<{
  created: number;
  updated: number;
  errors: number;
}> {
  let created = 0;
  let updated = 0;
  let errors = 0;

  for (const crmContact of crmContacts) {
    try {
      const googleResourceName = googleContactMap?.get(crmContact.id);

      if (googleResourceName) {
        // Update existing contact
        await updateGoogleContact(refreshToken, googleResourceName, {
          name: crmContact.name,
          email: crmContact.email,
          phone: crmContact.phone,
          company: crmContact.company,
        });
        updated++;
      } else {
        // Create new contact
        await createGoogleContact(refreshToken, {
          name: crmContact.name,
          email: crmContact.email,
          phone: crmContact.phone,
          company: crmContact.company,
        });
        created++;
      }
    } catch (error) {
      console.error(`Error syncing contact ${crmContact.id}:`, error);
      errors++;
    }
  }

  return { created, updated, errors };
}

/**
 * Sync Google Contacts to CRM (two-way sync)
 */
export async function syncGoogleContactsToCRM(
  refreshToken: string,
  crmContacts: Array<{
    id: string;
    name: string;
    email?: string;
    phone?: string;
  }>
): Promise<Array<{
  crmContactId: string;
  googleResourceName: string;
  action: 'created' | 'updated' | 'matched';
}>> {
  const results: Array<{
    crmContactId: string;
    googleResourceName: string;
    action: 'created' | 'updated' | 'matched';
  }> = [];

  // Get all Google contacts
  let pageToken: string | undefined;
  const googleContactsMap = new Map<string, GoogleContact>(); // email -> contact

  do {
    const response = await listGoogleContacts(refreshToken, 100, pageToken);
    for (const contact of response.contacts) {
      const email = contact.emailAddresses?.[0]?.value;
      if (email) {
        googleContactsMap.set(email.toLowerCase(), contact as GoogleContact);
      }
    }
    pageToken = response.nextPageToken;
  } while (pageToken);

  // Match CRM contacts with Google contacts
  for (const crmContact of crmContacts) {
    if (crmContact.email) {
      const googleContact = googleContactsMap.get(crmContact.email.toLowerCase());
      if (googleContact) {
        results.push({
          crmContactId: crmContact.id,
          googleResourceName: googleContact.resourceName || '',
          action: 'matched',
        });
      }
    }
  }

  return results;
}

/**
 * Search Google Contacts
 */
export async function searchGoogleContacts(
  refreshToken: string,
  query: string
): Promise<GoogleContact[]> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const people = google.people({ version: 'v1', auth: oauth2Client });

  const response = await people.people.searchContacts({
    query,
    readMask: 'names,emailAddresses,phoneNumbers,organizations',
  });

  return (response.data.results || []).map((result) => result.person as GoogleContact);
}

