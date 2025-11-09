import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  listGoogleContacts,
  getGoogleContact,
  createGoogleContact,
  updateGoogleContact,
  deleteGoogleContact,
  syncContactsToGoogle,
  syncGoogleContactsToCRM,
  searchGoogleContacts,
} from '@/lib/google-contacts';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { logAction } from '@/lib/audit-logger';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const resourceName = searchParams.get('resource_name');
    const query = searchParams.get('query');
    const pageToken = searchParams.get('page_token');

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'contacts:read');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.contacts_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Contacts integration not connected' },
        { status: 400 }
      );
    }

    if (action === 'list') {
      const result = await listGoogleContacts(
        integration.refresh_token,
        100,
        pageToken || undefined
      );

      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'get' && resourceName) {
      const contact = await getGoogleContact(integration.refresh_token, resourceName);

      if (!contact) {
        return NextResponse.json(
          { success: false, error: 'Contact not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, data: contact });
    }

    if (action === 'search' && query) {
      const contacts = await searchGoogleContacts(integration.refresh_token, query);

      return NextResponse.json({ success: true, data: contacts });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action or missing parameters' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ...params } = body;

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'contacts:write');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.contacts_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Contacts integration not connected' },
        { status: 400 }
      );
    }

    if (action === 'create') {
      const { name, firstName, lastName, email, phone, company } = params;

      if (!name && !firstName) {
        return NextResponse.json(
          { success: false, error: 'Name or firstName is required' },
          { status: 400 }
        );
      }

      const resourceName = await createGoogleContact(integration.refresh_token, {
        name,
        firstName,
        lastName,
        email,
        phone,
        company,
      });

      // Log audit event
      await logAction(
        authResult.user.id,
        'create',
        'google_contact',
        resourceName,
        { name: name || `${firstName} ${lastName}`.trim() },
        req
      );

      return NextResponse.json({ success: true, data: { resourceName } });
    }

    if (action === 'sync_to_google') {
      const { contacts, contactMap } = params;

      if (!contacts || !Array.isArray(contacts)) {
        return NextResponse.json(
          { success: false, error: 'contacts array is required' },
          { status: 400 }
        );
      }

      const map = contactMap ? new Map(Object.entries(contactMap)) : undefined;
      const result = await syncContactsToGoogle(integration.refresh_token, contacts, map);

      // Log audit event
      await logAction(
        authResult.user.id,
        'sync',
        'google_contacts',
        null,
        { created: result.created, updated: result.updated, errors: result.errors },
        req
      );

      return NextResponse.json({ success: true, data: result });
    }

    if (action === 'sync_from_google') {
      const { contacts } = params;

      if (!contacts || !Array.isArray(contacts)) {
        return NextResponse.json(
          { success: false, error: 'contacts array is required' },
          { status: 400 }
        );
      }

      const result = await syncGoogleContactsToCRM(integration.refresh_token, contacts);

      // Log audit event
      await logAction(
        authResult.user.id,
        'sync',
        'google_contacts',
        null,
        { matched: result.length },
        req
      );

      return NextResponse.json({ success: true, data: result });
    }

    return NextResponse.json(
      { success: false, error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { resourceName, ...updates } = body;

    if (!resourceName) {
      return NextResponse.json(
        { success: false, error: 'resourceName is required' },
        { status: 400 }
      );
    }

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'contacts:write');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.contacts_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Contacts integration not connected' },
        { status: 400 }
      );
    }

    await updateGoogleContact(integration.refresh_token, resourceName, updates);

    // Log audit event
    await logAction(
      authResult.user.id,
      'update',
      'google_contact',
      resourceName,
      { updates },
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
    const resourceName = searchParams.get('resource_name');

    if (!resourceName) {
      return NextResponse.json(
        { success: false, error: 'resourceName is required' },
        { status: 400 }
      );
    }

    // Check permission
    const authResult = await requireAuthAndPermission(req, 'contacts:delete');
    if (authResult instanceof NextResponse) return authResult;

    // Get user's Google integration
    const { data: integration, error: integrationError } = await supabase
      .from('google_integrations')
      .select('*')
      .eq('user_id', authResult.user.id)
      .eq('provider', 'google')
      .single();

    if (integrationError || !integration || !integration.contacts_enabled) {
      return NextResponse.json(
        { success: false, error: 'Google Contacts integration not connected' },
        { status: 400 }
      );
    }

    await deleteGoogleContact(integration.refresh_token, resourceName);

    // Log audit event
    await logAction(
      authResult.user.id,
      'delete',
      'google_contact',
      resourceName,
      null,
      req
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

