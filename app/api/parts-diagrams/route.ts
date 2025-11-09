import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { requireAuthAndPermission } from '@/lib/api-auth';
import { logAction } from '@/lib/audit-logger';

/**
 * Parts Diagrams API Routes
 * Parts diagrams are stored as attachments with entity_type='parts_diagram'
 * Files are stored in the 'parts-diagrams' bucket
 */
export async function GET(req: NextRequest) {
  try {
    // Check permission
    const authResult = await requireAuthAndPermission(req, 'appliances:read');
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(req.url);
    const applianceTypeId = searchParams.get('appliance_type_id');
    const tags = searchParams.get('tags');
    
    let query = supabase
      .from('attachments')
      .select('*')
      .eq('entity_type', 'parts_diagram')
      .order('created_at', { ascending: false });
    
    if (applianceTypeId) {
      // Filter by appliance_type_id stored in metadata or tags
      query = query.contains('tags', [`appliance_type:${applianceTypeId}`]);
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
      'parts_diagram',
      null,
      { applianceTypeId, tags },
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
    const authResult = await requireAuthAndPermission(req, 'appliances:write');
    if (authResult instanceof NextResponse) return authResult;

    // Support both FormData and JSON
    let file: File | null = null;
    let applianceTypeId: string | null = null;
    let title: string | null = null;
    let description: string | null = null;
    let tags: string[] | null = null;

    const contentType = req.headers.get('content-type');
    
    if (contentType?.includes('multipart/form-data')) {
      const formData = await req.formData();
      file = formData.get('file') as File;
      applianceTypeId = formData.get('appliance_type_id') as string;
      title = formData.get('title') as string || null;
      description = formData.get('description') as string || null;
      const tagsStr = formData.get('tags') as string;
      tags = tagsStr ? tagsStr.split(',').map(t => t.trim()) : null;
    } else {
      const body = await req.json();
      file = body.file;
      applianceTypeId = body.appliance_type_id;
      title = body.title || null;
      description = body.description || null;
      tags = body.tags ? (Array.isArray(body.tags) ? body.tags : body.tags.split(',').map((t: string) => t.trim())) : null;
    }
    
    if (!file || !applianceTypeId) {
      return NextResponse.json(
        { success: false, error: 'File and appliance_type_id are required' },
        { status: 400 }
      );
    }

    // Add appliance_type_id to tags
    const allTags = tags || [];
    if (!allTags.includes(`appliance_type:${applianceTypeId}`)) {
      allTags.push(`appliance_type:${applianceTypeId}`);
    }

    // Generate unique file path
    const fileExt = file instanceof File ? file.name.split('.').pop() : 'png';
    const fileName = file instanceof File ? file.name : `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `parts-diagrams/${applianceTypeId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
    
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
      .from('parts-diagrams')
      .upload(filePath, fileBlob, {
        contentType: mimeType,
        upsert: false,
      });
    
    if (uploadError) throw uploadError;
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from('parts-diagrams')
      .getPublicUrl(filePath);
    
    // Save attachment record (use appliance_type_id as entity_id for filtering)
    const { data, error } = await supabase
      .from('attachments')
      .insert({
        entity_type: 'parts_diagram',
        entity_id: applianceTypeId, // Store appliance_type_id here for filtering
        file_name: title || fileName,
        file_path: filePath,
        file_size: fileSize,
        mime_type: mimeType,
        uploaded_by: authResult.user.id,
        tags: allTags.length > 0 ? allTags : null,
        upload_source: 'web',
      })
      .select()
      .single();
    
    if (error) throw error;

    // Log creation
    await logAction(
      authResult.user.id,
      'create',
      'parts_diagram',
      data.id,
      { appliance_type_id: applianceTypeId },
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
    const authResult = await requireAuthAndPermission(req, 'appliances:write');
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
      .eq('entity_type', 'parts_diagram')
      .select()
      .single();
    
    if (error) throw error;

    // Log update
    await logAction(
      authResult.user.id,
      'update',
      'parts_diagram',
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
    const authResult = await requireAuthAndPermission(req, 'appliances:delete');
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
      .eq('entity_type', 'parts_diagram')
      .single();
    
    if (fetchError) throw fetchError;
    
    // Delete from storage
    if (attachment?.file_path) {
      await supabase.storage
        .from('parts-diagrams')
        .remove([attachment.file_path]);
    }
    
    // Delete record
    const { error } = await supabase
      .from('attachments')
      .delete()
      .eq('id', id)
      .eq('entity_type', 'parts_diagram');
    
    if (error) throw error;

    // Log deletion
    await logAction(
      authResult.user.id,
      'delete',
      'parts_diagram',
      id,
      {},
      req
    );
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

