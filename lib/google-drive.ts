import { google } from 'googleapis';
import { Readable } from 'stream';

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
  webContentLink?: string;
  parents?: string[];
}

export interface GoogleDriveUploadOptions {
  folderId?: string;
  fileName: string;
  mimeType: string;
  fileContent: Buffer | Readable | string;
  parents?: string[];
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
 * Upload a file to Google Drive
 */
export async function uploadToGoogleDrive(
  refreshToken: string,
  options: GoogleDriveUploadOptions
): Promise<GoogleDriveFile> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // Convert file content to stream if needed
  let fileStream: Readable;
  if (Buffer.isBuffer(options.fileContent)) {
    fileStream = Readable.from(options.fileContent);
  } else if (typeof options.fileContent === 'string') {
    fileStream = Readable.from(Buffer.from(options.fileContent));
  } else {
    fileStream = options.fileContent;
  }

  const fileMetadata = {
    name: options.fileName,
    parents: options.parents || options.folderId ? [options.folderId!] : undefined,
  };

  const media = {
    mimeType: options.mimeType,
    body: fileStream,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents',
  });

  return {
    id: response.data.id || '',
    name: response.data.name || options.fileName,
    mimeType: response.data.mimeType || options.mimeType,
    size: response.data.size,
    createdTime: response.data.createdTime,
    modifiedTime: response.data.modifiedTime,
    webViewLink: response.data.webViewLink,
    webContentLink: response.data.webContentLink,
    parents: response.data.parents,
  };
}

/**
 * Create a folder in Google Drive
 */
export async function createDriveFolder(
  refreshToken: string,
  folderName: string,
  parentFolderId?: string
): Promise<string> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const fileMetadata = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder',
    parents: parentFolderId ? [parentFolderId] : undefined,
  };

  const response = await drive.files.create({
    requestBody: fileMetadata,
    fields: 'id',
  });

  return response.data.id || '';
}

/**
 * List files in a folder
 */
export async function listDriveFiles(
  refreshToken: string,
  folderId?: string,
  query?: string
): Promise<GoogleDriveFile[]> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  let searchQuery = 'trashed = false';
  if (folderId) {
    searchQuery += ` and '${folderId}' in parents`;
  }
  if (query) {
    searchQuery += ` and (name contains '${query}' or fullText contains '${query}')`;
  }

  const response = await drive.files.list({
    q: searchQuery,
    fields: 'files(id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents)',
    orderBy: 'modifiedTime desc',
    pageSize: 100,
  });

  return (response.data.files || []).map((file) => ({
    id: file.id || '',
    name: file.name || '',
    mimeType: file.mimeType || '',
    size: file.size,
    createdTime: file.createdTime,
    modifiedTime: file.modifiedTime,
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink,
    parents: file.parents,
  }));
}

/**
 * Get file metadata
 */
export async function getDriveFile(
  refreshToken: string,
  fileId: string
): Promise<GoogleDriveFile | null> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  try {
    const response = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, createdTime, modifiedTime, webViewLink, webContentLink, parents',
    });

    return {
      id: response.data.id || '',
      name: response.data.name || '',
      mimeType: response.data.mimeType || '',
      size: response.data.size,
      createdTime: response.data.createdTime,
      modifiedTime: response.data.modifiedTime,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      parents: response.data.parents,
    };
  } catch (error) {
    console.error('Error getting drive file:', error);
    return null;
  }
}

/**
 * Download file from Google Drive
 */
export async function downloadDriveFile(
  refreshToken: string,
  fileId: string
): Promise<Buffer> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  const response = await drive.files.get(
    {
      fileId,
      alt: 'media',
    },
    { responseType: 'arraybuffer' }
  );

  return Buffer.from(response.data as ArrayBuffer);
}

/**
 * Share file with email
 */
export async function shareDriveFile(
  refreshToken: string,
  fileId: string,
  email: string,
  role: 'reader' | 'writer' | 'commenter' = 'reader'
): Promise<boolean> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  await drive.permissions.create({
    fileId,
    requestBody: {
      role,
      type: 'user',
      emailAddress: email,
    },
    sendNotificationEmail: true,
  });

  return true;
}

/**
 * Delete file from Google Drive
 */
export async function deleteDriveFile(
  refreshToken: string,
  fileId: string
): Promise<boolean> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  await drive.files.delete({
    fileId,
  });

  return true;
}

/**
 * Organize file in folder structure (creates folders if needed)
 * Example: organizeFileInFolders(token, fileId, ['Customers', 'John Doe', 'Service Sheets'])
 */
export async function organizeFileInFolders(
  refreshToken: string,
  fileId: string,
  folderPath: string[]
): Promise<string[]> {
  const oauth2Client = getOAuth2Client(refreshToken);
  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  let currentParentId: string | undefined;
  const createdFolderIds: string[] = [];

  // Create folder structure
  for (const folderName of folderPath) {
    // Check if folder already exists
    const existingFolders = await listDriveFiles(refreshToken, currentParentId, folderName);
    const existingFolder = existingFolders.find(
      (f) => f.name === folderName && f.mimeType === 'application/vnd.google-apps.folder'
    );

    if (existingFolder) {
      currentParentId = existingFolder.id;
    } else {
      // Create new folder
      const newFolderId = await createDriveFolder(refreshToken, folderName, currentParentId);
      createdFolderIds.push(newFolderId);
      currentParentId = newFolderId;
    }
  }

  // Move file to final folder
  if (currentParentId) {
    await drive.files.update({
      fileId,
      addParents: currentParentId,
      fields: 'id, parents',
    });
  }

  return createdFolderIds;
}

