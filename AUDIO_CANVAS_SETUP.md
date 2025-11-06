# Audio Canvas Mode Setup

## ✅ Implemented Features

1. **Text Selection Restrictions**
   - Text selection disabled globally
   - Only enabled in chatboxes (AI Assistant) and form inputs
   - CSS: `user-select: none` globally, `select-text` for inputs/chat

2. **Sidebar Improvements**
   - Collapsible sidebar with expand/collapse button
   - Smooth transitions
   - Proper z-index for mouse interaction
   - Avatar upload support (click avatar to upload)

3. **Audio Canvas Mode**
   - Hidden "Audio Canvas" button in sidebar (above user profile)
   - Fullscreen canvas mode that hides all content
   - Audio-reactive visualizations:
     - Frequency bars with gradients
     - Beat detection with pulse effects
     - Particle effects on beats
     - Mirror effects
   - Play/pause controls
   - Web Audio API integration

## 📋 Setup Required

### 1. Create Supabase Storage Buckets

Run this SQL in Supabase SQL Editor or use MCP:

```sql
-- Create audio bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', true)
ON CONFLICT (id) DO NOTHING;

-- Create avatars bucket  
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS policies for audio bucket
CREATE POLICY "Public audio access" ON storage.objects
FOR SELECT USING (bucket_id = 'audio');

-- Set up RLS policies for avatars bucket
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Public avatar access" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
```

### 2. Upload MP3 File

**Option A: Via Supabase Dashboard**
1. Go to Storage in Supabase dashboard
2. Create bucket named "audio" (public)
3. Upload `CursorAllNight.mp3` to the bucket

**Option B: Via Script**
```bash
node scripts/upload-audio.js
```
(Requires SUPABASE_SERVICE_ROLE_KEY in .env.local)

### 3. Test Features

1. **Text Selection**: Try selecting text - should only work in AI chat
2. **Sidebar**: Click chevron to collapse/expand
3. **Avatar**: Click avatar icon to upload (if logged in)
4. **Audio Canvas**: Click "Audio Canvas" button in sidebar
5. **Play Music**: Click play button in audio canvas mode

## 🎨 Features

- **Audio-Reactive Visualizations**: Real-time frequency analysis
- **Beat Detection**: Visual pulses on bass hits
- **Particle Effects**: Particles spawn on beats
- **Smooth Animations**: Framer Motion for transitions
- **Responsive Design**: Works on all screen sizes

The audio canvas mode creates an immersive fullscreen experience with the interactive canvas background and audio-reactive visualizations!

