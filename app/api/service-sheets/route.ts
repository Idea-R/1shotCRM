import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { logAction } from '@/lib/audit-logger';

/**
 * Service Sheets API Routes
 * Service sheets are stored as attachments with entity_type='service_sheet'
 * Files are stored in the 'service-sheets' bucket
 */
export async function GET(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:read');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const serviceId = searchParams.get('service_id');
    const applianceId = searchParams.get('appliance_id');
    const tags = searchParams.get('tags');
    
    let query = supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', 'service_sheet')
      .order('created_at', { ascending: false });
    
    if (serviceId) {
      query = query.eq('entity_id', serviceId);
    }

    if (applianceId) {
      query = query.eq('appliance_id', applianceId);
    }

    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim());
      query = query.contains('tags', tagArray);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;

    // Log read action
    await logAction(
      authResult.user.id,
      'read',
      'service_sheet',
      null,
      { serviceId, applianceId, tags },
      req
    );
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:write');
    if (authResult instanceof NextResponse) return authResult;

    // Support both FormData and JSON
    let file: File | null = null;
    let serviceId: string | null = null;
    let applianceId: string | null = null;
    let title: string | null = null;
    let description: string | null = null;
    let tags: string[] | null = null;

    const contentType = req.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = formData.get('file') as File;
      serviceId = formData.get('service_id') as string;
      applianceId = formData.get('appliance_id') as string || null;
      title = formData.get('title') as string || null;
      description = formData.get('description') as string || null;
      const tagsStr = formData.get('tags') as string;
      tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : null;
    } else {
      const body = await req.json();
      file = body.file;
      serviceId = body.service_id;
      applianceId = body.appliance_id || null;
      title = body.title || null;
      description = body.description || null;
      tags = body.tags ? (Array.isArray(body.tags) ? body.tags : body.tags.split(',').map((t: string) => t.trim())) : null;
    }
    
    if (!file || !serviceId) {
      return NextResponse.json(
        { success: false, error: 'File and service_id are required' },
        { status: 400 }
      );
    }

    // Generate unique file path
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'pdf';
    const fileName = file instanceof File ? file.name : `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `service-sheets/${serviceId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
    // Convert file to Blob
    let fileBlob: Blob;
    let fileSize: number;
    let mimeType: string;

    if (file instanceof File) {
      fileBlob = file;
      fileSize = file.size;
      mimeType = file.type;
    } else if (typeof file === 'string' && file.startsWith('data:')) {
      const base64Data = file.split(',')[1];
      mimeType = file.split(';')[0].split(':')[1];
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      fileBlob = new Blob([bytes], { type: mimeType });
      fileSize = fileBlob.size;
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid file format' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('service-sheets')
      .upload(filePath, fileBlob, {
        contentType: mimeType,
        upsert: false,
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('service-sheets')
      .getPublicUrl(filePath);
    
    // Save attachment record
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        entity_type: 'service_sheet',
        entity_id: serviceId,
        appliance_id: applianceId,
        file_name: title || fileName,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: authResult.user.id,
        tags: tags && tags.length > 0 ? tags : null,
        upload_source: 'web',
      })
      .select()
      .single();
    
    if (error) throw error;

    // Log creation
    await logAction(
      authResult.user.id,
      'create',
      'service_sheet',
      data.id,
      { service_id: serviceId, appliance_id: applianceId },
      req
    );
    
    return NextResponse.json({
      success: true,
      data: {
        ...data,
        url: urlData.publicUrl,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:write');
    if (authResult instanceof NextResponse) return authResult;

    const body = await req.json();
    const { id, title, description, tags } = body;
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const updateData: any = {};
    if (title !== undefined) updateData.file_name = title;
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) {
      updateData.tags = Array.isArray(tags) ? tags : tags.split(',').map((t: string) => t.trim());
    }

    const { data, error } = await supabase
      .from('attachments')
      .update(updateData)
      .eq('id', id)
      .eq('entity_type', 'service_sheet')
      .select()
      .single();
    
    if (error) throw error;

    // Log update
    await logAction(
      authResult.user.id,
      'update',
      'service_sheet',
      id,
      updateData,
      req
    );
    
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'services:delete');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }
    
    // Get attachment to delete file from storage
    const { data: attachment, error: fetchError } = await supabase
      .from('attachments')
      .select('file_path')
      .eq('id', id)
      .eq('entity_type', 'service_sheet')
      .single();
    
    if (fetchError) throw fetchError;
    
    // Delete from storage
    if (attachment?.file_path) {
      await supabase.storage
        .from('service-sheets')
        .remove([attachment.file_path]);
    }
    
    // Delete record
    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id)
      .eq('entity_type', 'service_sheet');
    
    if (error) throw error;

    // Log deletion
    await logAction(
      authResult.user.id,
      'delete',
      'service_sheet',
      id,
      {},
      req
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

