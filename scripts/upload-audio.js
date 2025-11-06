// Script to upload MP3 file to Supabase storage
// Run this with: node scripts/upload-audio.js

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://otbaeguavfmruyuadjva.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseKey) {
  console.error('Please set SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function uploadAudio() {
  try {
    // Create audio bucket if it doesn't exist
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (!buckets?.find(b => b.name === 'audio')) {
      console.log('Creating audio bucket...');
      const { error: createError } = await supabase.storage.createBucket('audio', {
        public: true,
        allowedMimeTypes: ['audio/mpeg', 'audio/mp3'],
        fileSizeLimit: 10485760, // 10MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        return;
      }
      console.log('Audio bucket created!');
    }

    // Read the MP3 file
    const filePath = path.join(__dirname, '..', 'CursorAllNight.mp3');
    
    if (!fs.existsSync(filePath)) {
      console.error('MP3 file not found at:', filePath);
      return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    const fileName = 'CursorAllNight.mp3';

    console.log('Uploading MP3 file...');
    const { data, error } = await supabase.storage
      .from('audio')
      .upload(fileName, fileBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      });

    if (error) {
      console.error('Error uploading file:', error);
      return;
    }

    console.log('✅ MP3 file uploaded successfully!');
    console.log('File path:', data.path);
  } catch (error) {
    console.error('Error:', error);
  }
}

uploadAudio();

