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
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    // Load audio from Supabase storage
    const loadAudio = async () => {
      try {
        const { data, error } = await supabase.storage
          .from('audio')
          .download('CursorAllNight.mp3');
        
        if (error) {
          console.error('Error loading audio:', error);
          return;
        }
        
        const url = URL.createObjectURL(data);
        setAudioUrl(url);
      } catch (error) {
        console.error('Error creating audio URL:', error);
      }
    };
    
    loadAudio();
  }, []);

  useEffect(() => {
    if (!audioUrl) return;

    // Initialize Web Audio API
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const analyserNode = ctx.createAnalyser();
    analyserNode.fftSize = 256;
    analyserNode.smoothingTimeConstant = 0.8;
    
    setAudioContext(ctx);
    setAnalyser(analyserNode);

    // Create audio element
    const audio = new Audio(audioUrl);
    audio.crossOrigin = 'anonymous';
    
    // Connect audio to analyser
    const source = ctx.createMediaElementSource(audio);
    source.connect(analyserNode);
    analyserNode.connect(ctx.destination);
    
    audioRef.current = audio;

    audio.onended = () => {
      setIsPlaying(false);
    };

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (ctx.state !== 'closed') {
        ctx.close();
      }
    };
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
    if (!audioRef.current || !audioContext) return;
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
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
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={handlePlay}
          className="w-24 h-24 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-2xl transition-colors"
        >
          {isPlaying ? (
            <Pause className="w-12 h-12" />
          ) : (
            <Play className="w-12 h-12 ml-1" />
          )}
        </motion.button>
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

