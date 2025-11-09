import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { exportToGoogleSheets, importFromGoogleSheets, createTemplateSpreadsheet, getSpreadsheetInfo, shareSpreadsheet } from '@/lib/google-sheets';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { logAction } from '@/lib/audit-logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, data, options } = body;

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'settings:write');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.sheets_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Sheets integration not connected' },
        { status: 400 }
      );
    }

    if (action === 'export') {
      if (!data || !Array.isArray(data)) {
        return NextResponse.json(
          { success: false, error: 'Data array is required' },
          { status: 400 }
        );
      }

      const spreadsheetId = await exportToGoogleSheets(
        integration.refresh_token,
        data,
        options || {}
      );

      // Log audit event
      await logAction(
        authResult.user.id,
        'export',
        'google_sheets',
        spreadsheetId,
        { rowCount: data.length },
        req
      );

      return NextResponse.json({ success: true, data: { spreadsheetId } });
    }

    if (action === 'import') {
      if (!options?.spreadsheetId) {
        return NextResponse.json(
          { success: false, error: 'Spreadsheet ID is required' },
          { status: 400 }
        );
      }

      const importedData = await importFromGoogleSheets(
        integration.refresh_token,
        options
      );

      // Log audit event
      await logAction(
        authResult.user.id,
        'import',
        'google_sheets',
        options.spreadsheetId,
        { rowCount: importedData.length },
        req
      );

      return NextResponse.json({ success: true, data: importedData });
    }

    if (action === 'template') {
      if (!options?.templateType) {
        return NextResponse.json(
          { success: false, error: 'Template type is required' },
          { status: 400 }
        );
      }

      const spreadsheetId = await createTemplateSpreadsheet(
        integration.refresh_token,
        options.templateType,
        options.sheetName
      );

      return NextResponse.json({ success: true, data: { spreadsheetId } });
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
    const spreadsheetId = searchParams.get('spreadsheet_id');

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'settings:read');
    if (authResult instanceof NextResponse) return authResult;

    if (!spreadsheetId) {
      return NextResponse.json(
        { success: false, error: 'Spreadsheet ID is required' },
        { status: 400 }
      );
    }

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.sheets_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Sheets integration not connected' },
        { status: 400 }
      );
    }

    const info = await getSpreadsheetInfo(integration.refresh_token, spreadsheetId);

    return NextResponse.json({ success: true, data: info });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

