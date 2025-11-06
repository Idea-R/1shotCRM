'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Pause, X } from 'lucide-react';
import { motion } from 'framer-motion';
import InteractiveCanvas from '@/components/InteractiveCanvas';

interface AudioCanvasModeProps {
  onClose: () => void;
}

export default function AudioCanvasMode({ onClose }: AudioCanvasModeProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Load audio from Supabase storage
    const loadAudio = async () => {
      console.log('[AudioCanvasMode] Starting audio load...');
      setLoading(true);
      setError(null);
      
      try {
        // First, try to get the public URL (works for public buckets)
        console.log('[AudioCanvasMode] Attempting to get public URL from Supabase storage...');
        console.log('[AudioCanvasMode] Bucket: audio, File: CursorAllNight.mp3');
        
        const { data: urlData } = supabase.storage
          .from('audio')
          .getPublicUrl('CursorAllNight.mp3');
        
        console.log('[AudioCanvasMode] Public URL:', urlData.publicUrl);
        
        // Try downloading first (works if file exists and permissions are correct)
        const { data, error: downloadError } = await supabase.storage
          .from('audio')
          .download('CursorAllNight.mp3');
        
        if (downloadError) {
          console.error('[AudioCanvasMode] Supabase download error:', downloadError);
          console.error('[AudioCanvasMode] Error details:', JSON.stringify(downloadError, null, 2));
          console.error('[AudioCanvasMode] Error name:', downloadError.name);
          console.error('[AudioCanvasMode] Error message:', downloadError.message);
          
          // If file doesn't exist, provide helpful error message
          if (downloadError.message?.includes('not found') || downloadError.message?.includes('404') || downloadError.name === 'StorageUnknownError') {
            setError('Audio file not found. Please upload CursorAllNight.mp3 to the "audio" bucket in Supabase Storage.');
          } else {
            setError(`Failed to load audio: ${downloadError.message || downloadError.name || 'Unknown error'}. Check browser console for details.`);
          }
          setLoading(false);
          return;
        }
        
        if (!data) {
          console.error('[AudioCanvasMode] No data returned from Supabase');
          setError('No audio data received from server. The file may not exist in the storage bucket.');
          setLoading(false);
          return;
        }
        
        console.log('[AudioCanvasMode] Audio downloaded successfully, size:', data.size, 'bytes');
        console.log('[AudioCanvasMode] Creating object URL...');
        
        const url = URL.createObjectURL(data);
        console.log('[AudioCanvasMode] Object URL created:', url);
        setAudioUrl(url);
        setLoading(false);
      } catch (error) {
        console.error('[AudioCanvasMode] Exception during audio load:', error);
        console.error('[AudioCanvasMode] Error stack:', error instanceof Error ? error.stack : 'No stack');
        setError(`Error loading audio: ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure CursorAllNight.mp3 is uploaded to the "audio" bucket.`);
        setLoading(false);
      }
    };
    
    loadAudio();
  }, []);

  useEffect(() => {
    if (!audioUrl) {
      console.log('[AudioCanvasMode] No audioUrl, skipping Web Audio API initialization');
      return;
    }

    console.log('[AudioCanvasMode] Initializing Web Audio API...');
    
    try {
      // Initialize Web Audio API
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      console.log('[AudioCanvasMode] AudioContext created, state:', ctx.state);
      
      const analyserNode = ctx.createAnalyser();
      analyserNode.fftSize = 256;
      analyserNode.smoothingTimeConstant = 0.8;
      
      setAudioContext(ctx);
      setAnalyser(analyserNode);

      // Create audio element
      console.log('[AudioCanvasMode] Creating Audio element with URL:', audioUrl);
      const audio = new Audio(audioUrl);
      audio.crossOrigin = 'anonymous';
      
      // Add error handlers
      audio.onerror = (e) => {
        console.error('[AudioCanvasMode] Audio element error:', e);
        console.error('[AudioCanvasMode] Audio error details:', {
          code: audio.error?.code,
          message: audio.error?.message,
        });
        setError(`Audio playback error: ${audio.error?.message || 'Unknown error'}`);
      };
      
      audio.onloadstart = () => {
        console.log('[AudioCanvasMode] Audio load started');
      };
      
      audio.onloadeddata = () => {
        console.log('[AudioCanvasMode] Audio data loaded');
      };
      
      audio.oncanplay = () => {
        console.log('[AudioCanvasMode] Audio can play');
      };
      
      audio.oncanplaythrough = () => {
        console.log('[AudioCanvasMode] Audio can play through');
      };
      
      // Connect audio to analyser
      console.log('[AudioCanvasMode] Connecting audio to analyser...');
      const source = ctx.createMediaElementSource(audio);
      source.connect(analyserNode);
      analyserNode.connect(ctx.destination);
      
      audioRef.current = audio;
      console.log('[AudioCanvasMode] Audio setup complete');

      audio.onended = () => {
        console.log('[AudioCanvasMode] Audio ended');
        setIsPlaying(false);
      };

      return () => {
        console.log('[AudioCanvasMode] Cleaning up audio...');
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        if (ctx.state !== 'closed') {
          ctx.close();
        }
      };
    } catch (error) {
      console.error('[AudioCanvasMode] Error initializing Web Audio API:', error);
      console.error('[AudioCanvasMode] Error stack:', error instanceof Error ? error.stack : 'No stack');
      setError(`Web Audio API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [audioUrl]);

  useEffect(() => {
    if (!analyser || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Particle system
    const particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      hue: number;
      life: number;
    }> = [];
    
    // Wave system
    const waves: Array<{
      x: number;
      y: number;
      radius: number;
      speed: number;
      alpha: number;
      hue: number;
    }> = [];

    // 3D Cube state
    let cubeRotationX = 0;
    let cubeRotationY = 0;
    let cubeRotationZ = 0;
    
    // Burst effects that fly out from center
    const bursts: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      hue: number;
      life: number;
      type: 'particle' | 'line' | 'circle';
    }> = [];
    
    let lastBurstTime = 0;

    const draw = () => {
      if (!analyser || !ctx) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas with very subtle fade to keep background visible
      ctx.fillStyle = 'rgba(17, 24, 39, 0.08)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (!isPlaying) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const bass = dataArray.slice(0, 10).reduce((a, b) => a + b) / 10;
      const mid = dataArray.slice(10, 50).reduce((a, b) => a + b) / 40;
      const treble = dataArray.slice(50, 128).reduce((a, b) => a + b) / 78;
      
      const time = Date.now() * 0.001;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Periodic burst effects from center
      if (time - lastBurstTime > 2) { // Every 2 seconds
        lastBurstTime = time;
        const numBursts = 20;
        for (let i = 0; i < numBursts; i++) {
          const angle = (Math.PI * 2 * i) / numBursts;
          const speed = 3 + Math.random() * 4;
          const type = ['particle', 'line', 'circle'][Math.floor(Math.random() * 3)] as 'particle' | 'line' | 'circle';
          bursts.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 5,
            hue: (angle * 57.3 + time * 50) % 360,
            life: 1.0,
            type,
          });
        }
      }
      
      // Update and draw bursts
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 0.015;
        b.vx *= 0.98;
        b.vy *= 0.98;
        
        if (b.life <= 0 || b.x < -50 || b.x > canvas.width + 50 || b.y < -50 || b.y > canvas.height + 50) {
          bursts.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = b.life * 0.6;
        
        if (b.type === 'particle') {
          ctx.fillStyle = `hsl(${b.hue}, 100%, 60%)`;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (b.type === 'line') {
          ctx.strokeStyle = `hsl(${b.hue}, 100%, 60%)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(b.x, b.y);
          ctx.lineTo(b.x - b.vx * 5, b.y - b.vy * 5);
          ctx.stroke();
        } else if (b.type === 'circle') {
          ctx.strokeStyle = `hsl(${b.hue}, 100%, 60%)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(b.x, b.y, b.size * 2, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Bars across the entire canvas - multiple rows
      const numBarRows = 5;
      const barSpacing = canvas.height / (numBarRows + 1);
      
      for (let row = 0; row < numBarRows; row++) {
        const yPos = barSpacing * (row + 1);
        const barWidth = canvas.width / bufferLength * 1.2;
        let x = 0;
        
        for (let i = 0; i < bufferLength; i += 2) {
          const barHeight = (dataArray[i] / 255) * 30; // Smaller bars
          
          if (barHeight > 3) {
            const gradient = ctx.createLinearGradient(x, yPos - barHeight / 2, x, yPos + barHeight / 2);
            const hue = (i / bufferLength) * 360 + time * 20 + row * 30;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.15)`);
            gradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 70%, 0.25)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0.15)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(x, yPos - barHeight / 2, barWidth - 1, barHeight);
          }
          
          x += barWidth * 2;
        }
      }
      
      // Vertical bars on sides
      const numVerticalRows = 3;
      const verticalBarSpacing = canvas.width / (numVerticalRows + 1);
      
      for (let col = 0; col < numVerticalRows; col++) {
        const xPos = verticalBarSpacing * (col + 1);
        const barHeight = canvas.height / bufferLength * 1.2;
        let y = 0;
        
        for (let i = 0; i < bufferLength; i += 2) {
          const barWidth = (dataArray[i] / 255) * 30;
          
          if (barWidth > 3) {
            const gradient = ctx.createLinearGradient(xPos - barWidth / 2, y, xPos + barWidth / 2, y);
            const hue = (i / bufferLength) * 360 + time * 20 + col * 40;
            gradient.addColorStop(0, `hsla(${hue}, 100%, 50%, 0.15)`);
            gradient.addColorStop(0.5, `hsla(${hue + 60}, 100%, 70%, 0.25)`);
            gradient.addColorStop(1, `hsla(${hue}, 100%, 50%, 0.15)`);
            
            ctx.fillStyle = gradient;
            ctx.fillRect(xPos - barWidth / 2, y, barWidth, barHeight - 1);
          }
          
          y += barHeight * 2;
        }
      }
      
      // Expanding circles/waves on beats - reduced intensity
      if (bass > 80) {
        waves.push({
          x: centerX,
          y: centerY,
          radius: 0,
          speed: 2 + (bass / 50),
          alpha: 0.4, // Reduced from 0.6
          hue: (bass * 2 + time * 30) % 360,
        });
      }
      
      // Update and draw waves
      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        wave.radius += wave.speed;
        wave.alpha -= 0.015;
        
        if (wave.alpha <= 0 || wave.radius > Math.max(canvas.width, canvas.height)) {
          waves.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = wave.alpha;
        ctx.strokeStyle = `hsl(${wave.hue}, 100%, 60%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      
      // Enhanced particle effects on strong beats
      if (average > 100) {
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5 + time;
          const speed = 2 + (average / 50);
          particles.push({
            x: centerX,
            y: centerY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 3 + Math.random() * 4,
            hue: (average * 3 + i * 60 + time * 50) % 360,
            life: 1.0,
          });
        }
      }
      
      // Update and draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        p.vx *= 0.98;
        p.vy *= 0.98;
        
        if (p.life <= 0 || p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
          particles.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = p.life * 0.7;
        ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Additional effects: Starfield particles
      if (treble > 100) {
        for (let i = 0; i < 3; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 50 + Math.random() * 100;
          const px = centerX + Math.cos(angle) * distance;
          const py = centerY + Math.sin(angle) * distance;
          
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = `hsl(${(treble * 3 + time * 60) % 360}, 100%, 80%)`;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      
      // Rotating circles around center
      if (mid > 90) {
        const numCircles = 8;
        for (let i = 0; i < numCircles; i++) {
          const angle = (Math.PI * 2 * i) / numCircles + time;
          const distance = 100 + mid;
          const px = canvas.width / 2 + Math.cos(angle) * distance;
          const py = canvas.height / 2 + Math.sin(angle) * distance;
          
          ctx.save();
          ctx.globalAlpha = 0.4;
          ctx.fillStyle = `hsl(${(mid * 2 + i * 45 + time * 40) % 360}, 100%, 60%)`;
          ctx.beginPath();
          ctx.arc(px, py, 8 + (mid / 20), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      
      // 3D Rotating Cube in center
      cubeRotationX += 0.01 + (mid / 1000);
      cubeRotationY += 0.015 + (bass / 1000);
      cubeRotationZ += 0.01 + (treble / 1000);
      
      const cubeSize = 60 + (average / 10);
      const vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ];
      
      // Rotate vertices
      const rotatedVertices = vertices.map(v => {
        let [x, y, z] = v;
        
        // Rotate around X axis
        const y1 = y * Math.cos(cubeRotationX) - z * Math.sin(cubeRotationX);
        const z1 = y * Math.sin(cubeRotationX) + z * Math.cos(cubeRotationX);
        y = y1;
        z = z1;
        
        // Rotate around Y axis
        const x1 = x * Math.cos(cubeRotationY) + z * Math.sin(cubeRotationY);
        const z2 = -x * Math.sin(cubeRotationY) + z * Math.cos(cubeRotationY);
        x = x1;
        z = z2;
        
        // Rotate around Z axis
        const x2 = x * Math.cos(cubeRotationZ) - y * Math.sin(cubeRotationZ);
        const y2 = x * Math.sin(cubeRotationZ) + y * Math.cos(cubeRotationZ);
        x = x2;
        y = y2;
        
        return {
          x: centerX + x * cubeSize,
          y: centerY + y * cubeSize,
          z: z * cubeSize
        };
      });
      
      // Draw cube faces
      const faces = [
        [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4],
        [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5]
      ];
      
      ctx.save();
      ctx.globalAlpha = 0.7;
      
      faces.forEach((face, idx) => {
        const points = face.map(i => rotatedVertices[i]);
        const avgZ = points.reduce((sum, p) => sum + p.z, 0) / points.length;
        
        // Only draw front faces
        if (avgZ > -cubeSize) {
          const hue = (idx * 60 + time * 30 + average) % 360;
          ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.4)`;
          ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
          ctx.lineWidth = 2;
          
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      });
      
      ctx.restore();
      
      // Reduced brightness central pulse on bass hits
      if (bass > 100) {
        ctx.save();
        ctx.globalAlpha = 0.15; // Reduced from 0.3
        ctx.fillStyle = `hsl(${(bass * 2 + time * 30) % 360}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(centerX, centerY, bass * 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Flowing lines effect
      if (treble > 100) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = `hsl(${(treble * 3 + time * 50) % 360}, 100%, 70%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 20; i++) {
          const x = (canvas.width / 20) * i;
          const y = canvas.height / 2 + Math.sin(time * 2 + i * 0.5) * (treble / 3);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyser, isPlaying]);

  const handlePlay = async () => {
    console.log('[AudioCanvasMode] Play button clicked');
    console.log('[AudioCanvasMode] audioRef.current:', audioRef.current);
    console.log('[AudioCanvasMode] audioContext:', audioContext);
    console.log('[AudioCanvasMode] isPlaying:', isPlaying);
    
    if (!audioRef.current) {
      console.error('[AudioCanvasMode] No audio element available');
      setError('Audio not loaded yet. Please wait...');
      return;
    }
    
    if (!audioContext) {
      console.error('[AudioCanvasMode] No audio context available');
      setError('Audio context not initialized');
      return;
    }
    
    try {
      if (audioContext.state === 'suspended') {
        console.log('[AudioCanvasMode] Resuming suspended audio context...');
        await audioContext.resume();
        console.log('[AudioCanvasMode] Audio context resumed, state:', audioContext.state);
      }
      
      if (isPlaying) {
        console.log('[AudioCanvasMode] Pausing audio...');
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        console.log('[AudioCanvasMode] Playing audio...');
        console.log('[AudioCanvasMode] Audio element readyState:', audioRef.current.readyState);
        console.log('[AudioCanvasMode] Audio element src:', audioRef.current.src);
        
        try {
          await audioRef.current.play();
          console.log('[AudioCanvasMode] Audio play() succeeded');
          setIsPlaying(true);
        } catch (playError) {
          console.error('[AudioCanvasMode] Audio play() failed:', playError);
          console.error('[AudioCanvasMode] Play error details:', {
            code: audioRef.current.error?.code,
            message: audioRef.current.error?.message,
          });
          setError(`Playback failed: ${playError instanceof Error ? playError.message : 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('[AudioCanvasMode] Error in handlePlay:', error);
      setError(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClose = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
    
    // Restore main content visibility
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.style.opacity = '1';
      mainContent.style.pointerEvents = 'auto';
    }
    
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-gray-950"
      onAnimationStart={() => {
        // Hide main content
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.style.opacity = '0';
          mainContent.style.pointerEvents = 'none';
        }
      }}
      onAnimationComplete={() => {
        // Ensure main content is hidden
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          mainContent.style.opacity = '0';
          mainContent.style.pointerEvents = 'none';
        }
      }}
    >
      <InteractiveCanvas />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{ background: 'transparent' }}
      />
      
      {/* Play button - hidden when playing for full audio experience */}
      {!isPlaying && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 gap-4">
          {loading && (
            <div className="text-white text-lg">Loading audio...</div>
          )}
          {error && (
            <div className="text-red-400 text-sm max-w-md text-center px-4">
              {error}
              <div className="text-xs mt-2 text-gray-400">
                Check browser console for detailed error logs
              </div>
            </div>
          )}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={handlePlay}
            disabled={loading || !!error || !audioUrl}
            className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl transition-colors ${
              loading || !!error || !audioUrl
                ? 'bg-gray-600 cursor-not-allowed opacity-50'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Play className="w-12 h-12 ml-1" />
          </motion.button>
          {!loading && !error && audioUrl && (
            <div className="text-white text-sm opacity-75">Ready to play</div>
          )}
        </div>
      )}
      
      {/* Pause button - small, top-right when playing */}
      {isPlaying && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePlay}
          className="absolute top-4 left-4 z-20 w-16 h-16 rounded-full bg-blue-600/80 hover:bg-blue-700/90 text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all"
        >
          <Pause className="w-8 h-8" />
        </motion.button>
      )}
      
      {/* Close button */}
      <button
        onClick={handleClose}
        className="absolute top-4 right-4 z-20 text-white hover:text-gray-300 transition-colors"
      >
        <X className="w-6 h-6" />
      </button>
    </motion.div>
  );
}

