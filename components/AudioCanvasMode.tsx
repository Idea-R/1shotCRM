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
        console.log('[AudioCanvasMode] Attempting to download from Supabase storage...');
        console.log('[AudioCanvasMode] Bucket: audio, File: CursorAllNight.mp3');
        
        const { data, error: downloadError } = await supabase.storage
          .from('audio')
          .download('CursorAllNight.mp3');
        
        if (downloadError) {
          console.error('[AudioCanvasMode] Supabase download error:', downloadError);
          console.error('[AudioCanvasMode] Error details:', JSON.stringify(downloadError, null, 2));
          setError(`Failed to load audio: ${downloadError.message || 'Unknown error'}`);
          setLoading(false);
          return;
        }
        
        if (!data) {
          console.error('[AudioCanvasMode] No data returned from Supabase');
          setError('No audio data received from server');
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
        setError(`Error loading audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

    const draw = () => {
      if (!analyser || !ctx) return;

      analyser.getByteFrequencyData(dataArray);
      
      // Clear canvas with fade effect
      ctx.fillStyle = 'rgba(17, 24, 39, 0.15)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      if (!isPlaying) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      
      // Draw audio-reactive visuals
      const barWidth = canvas.width / bufferLength * 2.5;
      let x = 0;
      
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height * 0.8;
        
        // Create gradient
        const gradient = ctx.createLinearGradient(x, canvas.height, x, canvas.height - barHeight);
        const hue = (i / bufferLength) * 360 + Date.now() * 0.05;
        gradient.addColorStop(0, `hsl(${hue}, 100%, 50%)`);
        gradient.addColorStop(1, `hsl(${hue + 60}, 100%, 70%)`);
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x, canvas.height - barHeight, barWidth - 1, barHeight);
        
        // Mirror effect
        ctx.fillRect(x, 0, barWidth - 1, barHeight);
        
        x += barWidth;
      }
      
      // Beat detection and visual effects
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const bass = dataArray.slice(0, 10).reduce((a, b) => a + b) / 10;
      
      if (bass > 100) {
        // Beat detected - add pulse effect
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = `hsl(${(bass * 2) % 360}, 100%, 50%)`;
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, bass * 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Add particle effects on beats
      if (average > 120) {
        for (let i = 0; i < 5; i++) {
          const angle = (Math.PI * 2 * i) / 5;
          const distance = average * 2;
          const px = canvas.width / 2 + Math.cos(angle) * distance;
          const py = canvas.height / 2 + Math.sin(angle) * distance;
          
          ctx.save();
          ctx.globalAlpha = 0.6;
          ctx.fillStyle = `hsl(${(average * 3 + i * 60) % 360}, 100%, 60%)`;
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
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
      
      {/* Play button */}
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
          {isPlaying ? (
            <Pause className="w-12 h-12" />
          ) : (
            <Play className="w-12 h-12 ml-1" />
          )}
        </motion.button>
        {!loading && !error && audioUrl && (
          <div className="text-white text-sm opacity-75">Ready to play</div>
        )}
      </div>
      
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

