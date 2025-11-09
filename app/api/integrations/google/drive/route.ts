import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  uploadToGoogleDrive,
  createDriveFolder,
  listDriveFiles,
  getDriveFile,
  downloadDriveFile,
  shareDriveFile,
  deleteDriveFile,
  organizeFileInFolders,
} from '@/lib/google-drive';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { logAction } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'attachments:write');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.drive_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Drive integration not connected' },
        { status: 400 }
      );
    }

    if (action === 'upload') {
      const { fileName, mimeType, fileContent, folderId, parents } = params;

      if (!fileName || !mimeType || !fileContent) {
        return NextResponse.json(
          { success: false, error: 'fileName, mimeType, and fileContent are required' },
          { status: 400 }
        );
      }

      // Convert base64 to buffer if needed
      let fileBuffer: Buffer;
      if (typeof fileContent === 'string' && fileContent.startsWith('data:')) {
        // Base64 data URL
        const base64Data = fileContent.split(',')[1];
        fileBuffer = Buffer.from(base64Data, 'base64');
      } else if (typeof fileContent === 'string') {
        // Plain base64
        fileBuffer = Buffer.from(fileContent, 'base64');
      } else {
        return NextResponse.json(
          { success: false, error: 'Invalid file content format' },
          { status: 400 }
        );
      }

      const file = await uploadToGoogleDrive(integration.refresh_token, {
        fileName,
        mimeType,
        fileContent: fileBuffer,
        folderId,
        parents,
      });

      // Log audit event
      await logAction(
        authResult.user.id,
        'upload',
        'google_drive',
        file.id,
        { fileName, mimeType },
        req
      );

      return NextResponse.json({ success: true, data: file });
    }

    if (action === 'create_folder') {
      const { folderName, parentFolderId } = params;

      if (!folderName) {
        return NextResponse.json(
          { success: false, error: 'folderName is required' },
          { status: 400 }
        );
      }

      const folderId = await createDriveFolder(
        integration.refresh_token,
        folderName,
        parentFolderId
      );

      return NextResponse.json({ success: true, data: { folderId } });
    }

    if (action === 'organize') {
      const { fileId, folderPath } = params;

      if (!fileId || !folderPath || !Array.isArray(folderPath)) {
        return NextResponse.json(
          { success: false, error: 'fileId and folderPath array are required' },
          { status: 400 }
        );
      }

      const folderIds = await organizeFileInFolders(
        integration.refresh_token,
        fileId,
        folderPath
      );

      return NextResponse.json({ success: true, data: { folderIds } });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const fileId = searchParams.get('file_id');
    const folderId = searchParams.get('folder_id');
    const query = searchParams.get('query');

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'attachments:read');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.drive_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Drive integration not connected' },
        { status: 400 }
      );
    }

    if (action === 'list') {
      const files = await listDriveFiles(
        integration.refresh_token,
        folderId || undefined,
        query || undefined
      );

      return NextResponse.json({ success: true, data: files });
    }

    if (action === 'get' && fileId) {
      const file = await getDriveFile(integration.refresh_token, fileId);

      if (!file) {
        return NextResponse.json(
          { success: false, error: 'File not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: file });
    }

    if (action === 'download' && fileId) {
      const fileBuffer = await downloadDriveFile(integration.refresh_token, fileId);
      const file = await getDriveFile(integration.refresh_token, fileId);

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': file?.mimeType || 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${file?.name || 'file'}"`,
        },
      });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action or missing parameters' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileId, email, role } = body;

    if (!fileId || !email) {
      return NextResponse.json(
        { success: false, error: 'fileId and email are required' },
        { status: 400 }
      );
    }

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'attachments:write');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.drive_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Drive integration not connected' },
        { status: 400 }
      );
    }

    await shareDriveFile(integration.refresh_token, fileId, email, role || 'reader');

    // Log audit event
    await logAction(
      authResult.user.id,
      'share',
      'google_drive',
      fileId,
      { email, role: role || 'reader' },
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('file_id');

    if (!fileId) {
      return NextResponse.json(
        { success: false, error: 'fileId is required' },
        { status: 400 }
      );
    }

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'attachments:delete');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.drive_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Drive integration not connected' },
        { status: 400 }
      );
    }

    await deleteDriveFile(integration.refresh_token, fileId);

    // Log audit event
    await logAction(
      authResult.user.id,
      'delete',
      'google_drive',
      fileId,
      null,
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

