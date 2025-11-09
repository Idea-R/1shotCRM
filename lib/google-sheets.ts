import { google } from 'googleapis';

export interface GoogleSheetExportOptions {
  spreadsheetId?: string; // If provided, updates existing sheet; otherwise creates new
  sheetName?: string;
  range?: string; // A1 notation, e.g., 'A1:Z1000'
  append?: boolean; // If true, appends to existing sheet
}

export interface GoogleSheetImportOptions {
  spreadsheetId: string;
  range?: string; // A1 notation
  sheetName?: string;
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
 * Export data to Google Sheets
 */
export async function exportToGoogleSheets(
  refreshToken: string,
  data: any[][], // 2D array: rows of data
  options: GoogleSheetExportOptions = {}
): Promise<string> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const sheetName = options.sheetName || 'Sheet1';
  const range = options.range || 'A1';

  if (options.spreadsheetId) {
    // Update existing spreadsheet
    if (options.append) {
      // Append data
      await sheets.spreadsheets.values.append({
        spreadsheetId: options.spreadsheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data,
        },
      });
    } else {
      // Overwrite data
      await sheets.spreadsheets.values.update({
        spreadsheetId: options.spreadsheetId,
        range: `${sheetName}!${range}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: data,
        },
      });
    }
    return options.spreadsheetId;
  } else {
    // Create new spreadsheet
    const spreadsheet = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: options.sheetName || 'CRM Export',
        },
        sheets: [
          {
            properties: {
              title: sheetName,
            },
          },
        ],
      },
    });

    const spreadsheetId = spreadsheet.data.spreadsheetId;
    if (!spreadsheetId) {
      throw new Error('Failed to create spreadsheet');
    }

    // Add data
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!${range}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: data,
      },
    });

    return spreadsheetId;
  }
}

/**
 * Import data from Google Sheets
 */
export async function importFromGoogleSheets(
  refreshToken: string,
  options: GoogleSheetImportOptions
): Promise<any[][]> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const range = options.range || `${options.sheetName || 'Sheet1'}!A:Z`;

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: options.spreadsheetId,
    range,
  });

  return response.data.values || [];
}

/**
 * Create a template spreadsheet for CRM data
 */
export async function createTemplateSpreadsheet(
  refreshToken: string,
  templateType: 'contacts' | 'deals' | 'services',
  sheetName?: string
): Promise<string> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  let headers: string[][] = [];
  let title = '';

  switch (templateType) {
    case 'contacts':
      title = 'Contacts Template';
      headers = [[
        'Name',
        'Email',
        'Phone',
        'Company',
        'Created At',
        'Updated At',
      ]];
      break;
    case 'deals':
      title = 'Deals Template';
      headers = [[
        'Title',
        'Contact',
        'Value',
        'Stage',
        'Probability',
        'Expected Close Date',
        'Created At',
        'Updated At',
      ]];
      break;
    case 'services':
      title = 'Services Template';
      headers = [[
        'Title',
        'Contact',
        'Appliance',
        'Service Date',
        'Status',
        'Technician',
        'Cost',
        'Created At',
        'Updated At',
      ]];
      break;
  }

  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: sheetName || 'Data',
          },
        },
      ],
    },
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId;
  if (!spreadsheetId) {
    throw new Error('Failed to create template spreadsheet');
  }

  // Add headers
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName || 'Data'}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: headers,
    },
  });

  // Format headers (bold)
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: 0,
              startRowIndex: 0,
              endRowIndex: 1,
            },
            cell: {
              userEnteredFormat: {
                textFormat: {
                  bold: true,
                },
                backgroundColor: {
                  red: 0.9,
                  green: 0.9,
                  blue: 0.9,
                },
              },
            },
            fields: 'userEnteredFormat(textFormat,backgroundColor)',
          },
        },
      ],
    },
  });

  return spreadsheetId;
}

/**
 * Get spreadsheet metadata
 */
export async function getSpreadsheetInfo(
  refreshToken: string,
  spreadsheetId: string
) {
  const oauth2Client = getOAuth2Client(refreshToken);
  const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
  });

  return {
    id: response.data.spreadsheetId,
    title: response.data.properties?.title,
    sheets: response.data.sheets?.map((sheet) => ({
      id: sheet.properties?.sheetId,
      title: sheet.properties?.title,
    })),
  };
}

/**
 * Share spreadsheet with email
 */
export async function shareSpreadsheet(
  refreshToken: string,
  spreadsheetId: string,
  email: string,
  role: 'reader' | 'writer' | 'commenter' = 'reader'
) {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: {
      role,
      type: 'user',
      emailAddress: email,
    },
    sendNotificationEmail: true,
  });

  return true;
}

