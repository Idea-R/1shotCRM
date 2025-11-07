'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { motion } from 'framer-motion';

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
  const [volume, setVolume] = useState(0.7);
  const [isMuted, setIsMuted] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [showVolumeControls, setShowVolumeControls] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mouseIdleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number>();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const cursorCubeRotationRef = useRef({ x: 0, y: 0, z: 0 });
  const clickExplosionsRef = useRef<Array<{
    x: number;
    y: number;
    particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      hue: number;
      life: number;
    }>;
    life: number;
  }>>([]);
  const pulsatingRingsRef = useRef<Array<{
    radius: number;
    speed: number;
    alpha: number;
    hue: number;
    maxRadius: number;
    shape: 'circle' | 'wavy' | 'star' | 'hexagon';
    waveOffset: number;
  }>>([]);
  const borgsEffectsRef = useRef<Array<{
    x: number;
    y: number;
    radius: number;
    segments: number;
    life: number;
    hue: number;
  }>>([]);
  
  // Time-based effect systems
  const vocalParticlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    hue: number;
    life: number;
    char: string;
  }>>([]);
  const sparkParticlesRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    hue: number;
    life: number;
    trail: Array<{ x: number; y: number }>;
  }>>([]);
  const lightningBranchesRef = useRef<Array<{
    x: number;
    y: number;
    branches: Array<{ x: number; y: number; vx: number; vy: number }>;
    life: number;
    hue: number;
  }>>([]);
  const guitarStringsRef = useRef<Array<{
    x: number;
    y: number;
    amplitude: number;
    frequency: number;
    hue: number;
    life: number;
  }>>([]);
  const confettiRef = useRef<Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    hue: number;
    life: number;
    rotation: number;
    rotationSpeed: number;
  }>>([]);
  const starsRef = useRef<Array<{
    x: number;
    y: number;
    size: number;
    brightness: number;
    twinkle: number;
  }>>([]);
  
  // Mouse trail and interaction refs
  const mouseTrailRef = useRef<Array<{ x: number; y: number; time: number }>>([]);
  const isMouseDownRef = useRef(false);
  const previousMousePosRef = useRef({ x: 0, y: 0 });
  
  // Cube splitting system for finale
  const splitCubesRef = useRef<Array<{
    x: number;
    y: number;
    rotationX: number;
    rotationY: number;
    rotationZ: number;
    size: number;
    vx: number;
    vy: number;
    phase: 'splitting' | 'spread' | 'merging';
  }>>([]);
  
  // Track current split phase (1, 2, 4, 8 cubes)
  const splitPhaseRef = useRef<1 | 2 | 4 | 8 | null>(null);
  
  // Transition smoothing refs
  const previousIntensityRef = useRef(1);
  const targetIntensityRef = useRef(1);
  
  // Screen-wide effect animation states
  const screenEffectProgressRef = useRef<{
    waves: number;
    guitar: number;
    flowingLines: number;
  }>({ waves: 0, guitar: 0, flowingLines: 0 });

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
      analyserNode.fftSize = 512; // Increased for better frequency resolution
      analyserNode.smoothingTimeConstant = 0.7;
      
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
      audio.volume = volume;
      console.log('[AudioCanvasMode] Audio setup complete');

      audio.onended = () => {
        console.log('[AudioCanvasMode] Audio ended');
        setIsPlaying(false);
        setShowEndModal(true);
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

    // Mouse tracking for interaction
    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX;
      const newY = e.clientY;
      const prevPos = previousMousePosRef.current;
      
      // Show volume controls on mouse movement
      setShowVolumeControls(true);
      
      // Clear existing timeout
      if (mouseIdleTimeoutRef.current) {
        clearTimeout(mouseIdleTimeoutRef.current);
      }
      
      // Set timeout to hide controls after 2 seconds of idle
      mouseIdleTimeoutRef.current = setTimeout(() => {
        setShowVolumeControls(false);
      }, 2000);
      
      // Track mouse movement for trail
      const distance = Math.sqrt(
        Math.pow(newX - prevPos.x, 2) + Math.pow(newY - prevPos.y, 2)
      );
      
      if (distance > 5) { // Only add to trail if mouse moved significantly
        mouseTrailRef.current.push({
          x: newX,
          y: newY,
          time: Date.now(),
        });
        
        // Keep trail limited to last 20 positions
        if (mouseTrailRef.current.length > 20) {
          mouseTrailRef.current.shift();
        }
      }
      
      mouseRef.current = { x: newX, y: newY };
      previousMousePosRef.current = { x: newX, y: newY };
    };
    
    // Mouse down handler
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDownRef.current = true;
    };
    
    // Mouse up handler
    const handleMouseUp = (e: MouseEvent) => {
      isMouseDownRef.current = false;
    };
    
    // Mouse leave handler - clear trail
    const handleMouseLeave = () => {
      mouseTrailRef.current = [];
      isMouseDownRef.current = false;
    };
    
    // Mouse click handler for explosions
    const handleMouseClick = (e: MouseEvent) => {
      const clickX = e.clientX;
      const clickY = e.clientY;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Check if click is on cube (within cube bounds)
      const cubeSize = 60;
      const distanceToCube = Math.sqrt(
        Math.pow(clickX - centerX, 2) + Math.pow(clickY - centerY, 2)
      );
      
      if (distanceToCube < cubeSize * 1.5) {
        // Borgs effect - geometric pattern expanding from cube
        const segments = 12;
        for (let i = 0; i < segments; i++) {
          const angle = (Math.PI * 2 * i) / segments;
          borgsEffectsRef.current.push({
            x: centerX,
            y: centerY,
            radius: 0,
            segments: segments,
            life: 1.0,
            hue: (angle * 57.3 + Date.now() * 0.01) % 360,
          });
        }
      } else {
        // Regular explosion effect
        const particles: Array<{
          x: number;
          y: number;
          vx: number;
          vy: number;
          size: number;
          hue: number;
          life: number;
        }> = [];
        
        for (let i = 0; i < 30; i++) {
          const angle = (Math.PI * 2 * i) / 30 + Math.random() * 0.5;
          const speed = 2 + Math.random() * 4;
          particles.push({
            x: clickX,
            y: clickY,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 4,
            hue: (angle * 57.3 + Date.now() * 0.01) % 360,
            life: 1.0,
          });
        }
        
        clickExplosionsRef.current.push({
          x: clickX,
          y: clickY,
          particles,
          life: 1.0,
        });
      }
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('click', handleMouseClick);

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
      
      // Clear canvas completely (no ghost effect)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Volume affects effect intensity - maintain minimum visual state when muted
      const effectIntensity = isMuted ? 0.25 : volume; // Minimum 0.25 for idle state
      
      if (!isPlaying && !showEndModal) {
        animationFrameRef.current = requestAnimationFrame(draw);
        return;
      }
      
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;
      const bass = dataArray.slice(0, 15).reduce((a, b) => a + b) / 15;
      const mid = dataArray.slice(15, 80).reduce((a, b) => a + b) / 65;
      const treble = dataArray.slice(80, 256).reduce((a, b) => a + b) / 176;
      
      // Get audio time for time-based effects
      const currentTime = audioRef.current?.currentTime || 0;
      
      // Calculate tempo estimate from bass frequency
      const tempoMultiplier = 1 + (bass / 255) * 2; // 1x to 3x multiplier
      
      // Time-based intensity multiplier
      let timeIntensityMultiplier = 1;
      let isVocalSection = false;
      let isSparksSection = false;
      let isStormSection = false;
      let isGuitarSection = false;
      let isRampUpSection = false;
      let isLullSection = false;
      let isMusicPopsSection = false;
      let isFinaleSection = false;
      
      // Determine current section and target intensity
      if (currentTime >= 26 && currentTime < 45) {
        isVocalSection = true;
        targetIntensityRef.current = 1.2;
      } else if (currentTime >= 45 && currentTime < 58) {
        isSparksSection = true;
        targetIntensityRef.current = 1.3;
      } else if (currentTime >= 58 && currentTime < 75) {
        isStormSection = true;
        targetIntensityRef.current = 1.5;
      } else if (currentTime >= 75 && currentTime < 124) {
        isGuitarSection = true;
        targetIntensityRef.current = 1.4;
      } else if (currentTime >= 124 && currentTime < 135) {
        isRampUpSection = true;
        const rampProgress = (currentTime - 124) / 11; // 0 to 1
        targetIntensityRef.current = 1.2 + rampProgress * 0.8; // 1.2 to 2.0
      } else if (currentTime >= 135 && currentTime < 157) {
        targetIntensityRef.current = 2.0;
      } else if (currentTime >= 157 && currentTime < 194) {
        isLullSection = true;
        targetIntensityRef.current = 0.6;
      } else if (currentTime >= 194 && currentTime < 213) {
        isVocalSection = true;
        const vocalRampProgress = (currentTime - 194) / 19;
        targetIntensityRef.current = 1.0 + vocalRampProgress * 1.0; // 1.0 to 2.0
      } else if (currentTime >= 213 && currentTime < 230) {
        targetIntensityRef.current = 2.0;
      } else if (currentTime >= 230 && currentTime < 250) {
        isMusicPopsSection = true;
        targetIntensityRef.current = 2.5;
      } else if (currentTime >= 250) {
        isFinaleSection = true;
        targetIntensityRef.current = 3.0;
      }
      
      // Smooth transition between intensity values (especially for lull)
      const transitionSpeed = isLullSection ? 0.02 : 0.05; // Slower transition for lull
      const intensityDiff = targetIntensityRef.current - previousIntensityRef.current;
      previousIntensityRef.current += intensityDiff * transitionSpeed;
      timeIntensityMultiplier = previousIntensityRef.current;
      
      // Apply time intensity to base intensity
      const finalIntensity = effectIntensity * timeIntensityMultiplier;
      
      const time = Date.now() * 0.001;
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const mouse = mouseRef.current;
      
      // Mouse interaction - ripple effects
      if (mouse.x > 0 && mouse.y > 0 && bass > 50) {
        const mouseDistance = Math.sqrt(Math.pow(mouse.x - centerX, 2) + Math.pow(mouse.y - centerY, 2));
        if (mouseDistance < 300) {
          waves.push({
            x: mouse.x,
            y: mouse.y,
            radius: 0,
            speed: 1.5 + (bass / 100),
            alpha: 0.5 * effectIntensity,
            hue: (bass * 2 + time * 40) % 360,
          });
        }
      }
      
      // Periodic burst effects from center - volume affected (performance limit)
      if (time - lastBurstTime > 2.5 && effectIntensity > 0.3 && bursts.length < 50) {
        lastBurstTime = time;
        const numBursts = Math.floor(15 * effectIntensity);
        for (let i = 0; i < numBursts && bursts.length < 50; i++) {
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
      
      // Update and draw bursts (performance: cleanup off-screen)
      for (let i = bursts.length - 1; i >= 0; i--) {
        const b = bursts[i];
        b.x += b.vx;
        b.y += b.vy;
        b.life -= 0.015;
        b.vx *= 0.98;
        b.vy *= 0.98;
        
        // More aggressive cleanup - remove if off-screen or dead
        if (b.life <= 0 || b.x < -100 || b.x > canvas.width + 100 || b.y < -100 || b.y > canvas.height + 100) {
          bursts.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = b.life * 0.6 * effectIntensity;
        
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
      
      // Mouse interaction - particles follow mouse
      if (mouse.x > 0 && mouse.y > 0 && average > 80) {
        for (let i = 0; i < 2; i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 30 + Math.random() * 50;
          particles.push({
            x: mouse.x + Math.cos(angle) * distance,
            y: mouse.y + Math.sin(angle) * distance,
            vx: Math.cos(angle) * (1 + average / 100),
            vy: Math.sin(angle) * (1 + average / 100),
            size: 2 + Math.random() * 3,
            hue: (average * 2 + i * 60 + time * 40) % 360,
            life: 1.0,
          });
        }
      }
      
      // VOCAL EFFECTS (0:26, 3:14) - Text-like particles flowing upward
      if (isVocalSection && mid > 100 && vocalParticlesRef.current.length < 200) {
        // Vocal frequency range visualization (200-2000 Hz roughly maps to mid frequencies)
        const vocalIntensity = mid / 255;
        for (let i = 0; i < Math.floor(5 * vocalIntensity * finalIntensity); i++) {
          const chars = ['♪', '♫', '♬', '♭', '♮', '♯', '♪'];
          vocalParticlesRef.current.push({
            x: Math.random() * canvas.width,
            y: canvas.height + 20,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -2 - Math.random() * 2,
            size: 12 + Math.random() * 8,
            hue: (mid * 2 + i * 30 + time * 40) % 360,
            life: 1.0,
            char: chars[Math.floor(Math.random() * chars.length)],
          });
        }
        
        // Waveform patterns
        ctx.save();
        ctx.globalAlpha = 0.3 * finalIntensity;
        ctx.strokeStyle = `hsl(${(mid * 2 + time * 50) % 360}, 100%, 70%)`;
        ctx.lineWidth = 2;
        for (let wave = 0; wave < 3; wave++) {
          ctx.beginPath();
          const waveY = canvas.height / 2 + (wave - 1) * 80;
          for (let i = 0; i < canvas.width; i += 2) {
            const x = i;
            const y = waveY + Math.sin(time * 3 + i * 0.02 + wave) * (mid / 5) * finalIntensity;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }
      
      // Mouse trail music notes - create notes behind cursor like a fountain trail
      if (mouseTrailRef.current.length > 1 && mouse.x > 0 && mouse.y > 0) {
        const trailLength = mouseTrailRef.current.length;
        // Create notes from trail positions with more spread (every 4th position, more spread out)
        for (let i = Math.max(0, trailLength - 12); i < trailLength; i += 4) {
          const trailPos = mouseTrailRef.current[i];
          const age = Date.now() - trailPos.time;
          if (age < 300 && vocalParticlesRef.current.length < 200) { // Performance limit
            const chars = ['♪', '♫', '♬', '♭', '♮', '♯'];
            // Calculate spread angle based on position in trail (fountain effect)
            const trailProgress = i / trailLength;
            const spreadAngle = (trailProgress - 0.5) * Math.PI * 0.6; // Wider spread
            const spreadDistance = trailProgress * 30; // More distance spread
            
            vocalParticlesRef.current.push({
              x: trailPos.x + Math.cos(spreadAngle) * spreadDistance,
              y: trailPos.y + Math.sin(spreadAngle) * spreadDistance,
              vx: (Math.random() - 0.5) * 0.8 + Math.cos(spreadAngle) * 0.3, // More horizontal spread
              vy: -0.8 - Math.random() * 0.6 + Math.sin(spreadAngle) * 0.2, // More vertical spread
              size: 20 + Math.random() * 10,
              hue: (time * 50 + i * 25) % 360,
              life: 1.0,
              char: chars[Math.floor(Math.random() * chars.length)],
            });
          }
        }
      }
      
      // Click and hold music notes
      if (isMouseDownRef.current && mouse.x > 0 && mouse.y > 0 && vocalParticlesRef.current.length < 200) {
        const chars = ['♪', '♫', '♬', '♭', '♮', '♯'];
        for (let i = 0; i < 2; i++) {
          vocalParticlesRef.current.push({
            x: mouse.x + (Math.random() - 0.5) * 20,
            y: mouse.y + (Math.random() - 0.5) * 20,
            vx: (Math.random() - 0.5) * 0.5,
            vy: -1 - Math.random() * 1,
            size: 10 + Math.random() * 6,
            hue: (time * 60 + i * 30) % 360,
            life: 1.0,
            char: chars[Math.floor(Math.random() * chars.length)],
          });
        }
      }
      
      // Update and draw vocal particles (longer duration)
      for (let i = vocalParticlesRef.current.length - 1; i >= 0; i--) {
        const vp = vocalParticlesRef.current[i];
        vp.x += vp.vx;
        vp.y += vp.vy;
        vp.life -= 0.005; // Slower decay for longer duration
        
        if (vp.life <= 0 || vp.y < -50) {
          vocalParticlesRef.current.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = vp.life * 0.8 * finalIntensity;
        ctx.fillStyle = `hsl(${vp.hue}, 100%, 60%)`;
        ctx.font = `${vp.size}px Arial`;
        ctx.fillText(vp.char, vp.x, vp.y);
        ctx.restore();
      }
      
      // SPARKS EFFECT (0:45) - Enhanced spark particles
      if (isSparksSection && treble > 80 && sparkParticlesRef.current.length < 150) {
        const sparkIntensity = treble / 255;
        for (let i = 0; i < Math.floor(8 * sparkIntensity * finalIntensity); i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = 3 + Math.random() * 5;
          sparkParticlesRef.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 4,
            hue: (treble * 3 + i * 20 + time * 60) % 360,
            life: 1.0,
            trail: [],
          });
        }
      }
      
      // Update and draw spark particles
      for (let i = sparkParticlesRef.current.length - 1; i >= 0; i--) {
        const sp = sparkParticlesRef.current[i];
        sp.trail.push({ x: sp.x, y: sp.y });
        if (sp.trail.length > 5) sp.trail.shift();
        
        sp.x += sp.vx;
        sp.y += sp.vy;
        sp.vx *= 0.98;
        sp.vy *= 0.98;
        sp.life -= 0.015;
        
        if (sp.life <= 0 || sp.x < -50 || sp.x > canvas.width + 50 || sp.y < -50 || sp.y > canvas.height + 50) {
          sparkParticlesRef.current.splice(i, 1);
          continue;
        }
        
        // Draw trail
        ctx.save();
        ctx.strokeStyle = `hsl(${sp.hue}, 100%, 60%)`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let j = 0; j < sp.trail.length - 1; j++) {
          const alpha = (j / sp.trail.length) * sp.life * 0.6 * finalIntensity;
          ctx.globalAlpha = alpha;
          if (j === 0) ctx.moveTo(sp.trail[j].x, sp.trail[j].y);
          ctx.lineTo(sp.trail[j + 1].x, sp.trail[j + 1].y);
        }
        ctx.stroke();
        
        // Draw spark
        ctx.globalAlpha = sp.life * 0.9 * finalIntensity;
        ctx.fillStyle = `hsl(${sp.hue}, 100%, 70%)`;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // WAVES/STORM EFFECT (0:58) - Intense wave patterns and lightning
      if (isStormSection) {
        // Update screen effect progress for waves
        screenEffectProgressRef.current.waves = Math.min(1, screenEffectProgressRef.current.waves + 0.02);
        
        // Intense waves - animate from center outward (limit to 30 waves)
        if (bass > 70 && waves.length < 30) {
          const progress = screenEffectProgressRef.current.waves;
          for (let wave = 0; wave < 5; wave++) {
            const waveProgress = Math.max(0, progress - wave * 0.15);
            if (waveProgress > 0) {
              waves.push({
                x: centerX,
                y: centerY,
                radius: waveProgress * 50, // Start from center with progress
                speed: 3 + (bass / 30) * finalIntensity,
                alpha: 0.5 * finalIntensity * waveProgress,
                hue: (bass * 2 + wave * 30 + time * 20) % 360,
              });
            }
          }
        }
        
        // Lightning effects
        if (treble > 120 && Math.random() > 0.95) {
          const lightningX = Math.random() * canvas.width;
          const branches: Array<{ x: number; y: number; vx: number; vy: number }> = [];
          for (let i = 0; i < 8; i++) {
            branches.push({
              x: lightningX,
              y: 0,
              vx: (Math.random() - 0.5) * 2,
              vy: 5 + Math.random() * 3,
            });
          }
          lightningBranchesRef.current.push({
            x: lightningX,
            y: 0,
            branches,
            life: 1.0,
            hue: (treble * 2 + time * 100) % 360,
          });
        }
      } else {
        // Reset wave progress when not in storm section
        screenEffectProgressRef.current.waves = Math.max(0, screenEffectProgressRef.current.waves - 0.05);
      }
      
      // Update and draw lightning
      for (let i = lightningBranchesRef.current.length - 1; i >= 0; i--) {
        const lightning = lightningBranchesRef.current[i];
        lightning.life -= 0.05;
        
        if (lightning.life <= 0) {
          lightningBranchesRef.current.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.strokeStyle = `hsl(${lightning.hue}, 100%, 90%)`;
        ctx.lineWidth = 2;
        ctx.globalAlpha = lightning.life * 0.9 * finalIntensity;
        
        lightning.branches.forEach(branch => {
          ctx.beginPath();
          ctx.moveTo(lightning.x, lightning.y);
          let x = lightning.x;
          let y = lightning.y;
          for (let step = 0; step < 20; step++) {
            x += branch.vx + (Math.random() - 0.5) * 10;
            y += branch.vy;
            ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
        
        ctx.restore();
      }
      
      // GUITAR EFFECTS (1:15) - String-like horizontal lines
      if (isGuitarSection && mid > 90) {
        // Update screen effect progress for guitar strings
        screenEffectProgressRef.current.guitar = Math.min(1, screenEffectProgressRef.current.guitar + 0.03);
        
        const guitarIntensity = mid / 255;
        const numStrings = 6;
        const progress = screenEffectProgressRef.current.guitar;
        
        for (let str = 0; str < numStrings; str++) {
          const stringY = canvas.height / 2 + (str - numStrings / 2) * 40;
          const stringHue = (mid * 2 + str * 30 + time * 30) % 360;
          
          // Vibrating string effect - animate from left to right
          ctx.save();
          ctx.strokeStyle = `hsl(${stringHue}, 100%, 60%)`;
          ctx.lineWidth = 2 + guitarIntensity * 2;
          ctx.globalAlpha = 0.6 * finalIntensity * progress;
          ctx.beginPath();
          const startX = 0;
          const endX = canvas.width * progress; // Animate across screen
          for (let x = startX; x < endX; x += 2) {
            const y = stringY + Math.sin(time * 5 + x * 0.01 + str) * (mid / 10) * finalIntensity;
            if (x === startX) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
          ctx.restore();
          
          // Chord visualization
          if (mid > 150 && progress > 0.5) {
            guitarStringsRef.current.push({
              x: Math.random() * canvas.width * progress,
              y: stringY,
              amplitude: mid / 5,
              frequency: 0.02 + str * 0.01,
              hue: stringHue,
              life: 1.0,
            });
          }
        }
      } else {
        // Reset guitar progress when not in guitar section
        screenEffectProgressRef.current.guitar = Math.max(0, screenEffectProgressRef.current.guitar - 0.05);
      }
      
      // Update and draw guitar string effects
      for (let i = guitarStringsRef.current.length - 1; i >= 0; i--) {
        const gs = guitarStringsRef.current[i];
        gs.life -= 0.02;
        
        if (gs.life <= 0) {
          guitarStringsRef.current.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.strokeStyle = `hsl(${gs.hue}, 100%, 70%)`;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = gs.life * 0.5 * finalIntensity;
        ctx.beginPath();
        for (let x = gs.x - 50; x < gs.x + 50; x += 2) {
          const y = gs.y + Math.sin(time * 10 + x * gs.frequency) * gs.amplitude * gs.life;
          if (x === gs.x - 50) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.restore();
      }
      
      // RAMP UP EFFECT (2:04-2:15) - Progressive intensity
      if (isRampUpSection) {
        // Expanding anticipation rings
        if (bass > 80) {
          for (let ring = 0; ring < 3; ring++) {
            pulsatingRingsRef.current.push({
              radius: 0,
              speed: 4 + ring * 2,
              alpha: 0.35 * finalIntensity, // Further dimmed (0.49 * 0.7 ≈ 0.35)
              hue: (bass * 2 + ring * 60 + time * 40) % 360,
              maxRadius: 500,
              shape: 'circle',
              waveOffset: 0,
            });
          }
        }
      }
      
      // LULL EFFECT (2:37) - Calm, reduced intensity
      if (isLullSection) {
        // Softer, slower waves
        if (mid > 60 && Math.random() > 0.7) {
          waves.push({
            x: centerX,
            y: centerY,
            radius: 0,
            speed: 1,
            alpha: 0.2 * finalIntensity,
            hue: (mid * 1.5 + time * 10) % 360,
          });
        }
      }
      
      // MUSIC POPS EFFECT (3:33) - Explosive effects (performance limit)
      if (isMusicPopsSection && bass > 100 && bursts.length < 50) {
        // Screen-wide explosions
        for (let pop = 0; pop < 5 && bursts.length < 50; pop++) {
          const popX = Math.random() * canvas.width;
          const popY = Math.random() * canvas.height;
          for (let i = 0; i < 20 && bursts.length < 50; i++) {
            const angle = (Math.PI * 2 * i) / 20;
            bursts.push({
              x: popX,
              y: popY,
              vx: Math.cos(angle) * (5 + Math.random() * 5),
              vy: Math.sin(angle) * (5 + Math.random() * 5),
              size: 3 + Math.random() * 5,
              hue: (angle * 57.3 + time * 100) % 360,
              life: 1.0,
              type: 'particle',
            });
          }
        }
      }
      
      // FINALE EFFECT (3:50-end) - Cube splitting crescendo
      // Calculate base cube size first (needed for splitting initialization)
      const pulseFactor = 1 + Math.sin(time * 0.5) * 0.15;
      const minCubeSize = 40;
      const baseCubeSize = Math.max(minCubeSize, (60 + (average / 15)) * pulseFactor * finalIntensity);
      
      if (isFinaleSection) {
        const finaleProgress = Math.min(1, (currentTime - 230) / Math.max(1, (audioRef.current?.duration || 240) - 230));
        
        // Initialize cube splitting phases - ensure we always have cubes during finale
        if (splitCubesRef.current.length === 0) {
          // Start with 1 cube at center
          splitCubesRef.current.push({
            x: centerX,
            y: centerY,
            rotationX: cubeRotationX,
            rotationY: cubeRotationY,
            rotationZ: cubeRotationZ,
            size: baseCubeSize,
            vx: 0,
            vy: 0,
            phase: 'splitting',
          });
          splitPhaseRef.current = 1;
        }
        
        // Phase-based splitting - more lenient conditions
        // Phase 1: Split into 2 cubes (around 5-20% of finale)
        if (splitPhaseRef.current === 1 && finaleProgress >= 0.05 && finaleProgress < 0.25) {
          const cube = splitCubesRef.current[0];
          if (cube && cube.phase === 'splitting') {
            splitCubesRef.current = [
              { ...cube, x: centerX - 50, vx: -0.5, phase: 'spread' },
              { ...cube, x: centerX + 50, vx: 0.5, phase: 'spread' },
            ];
            splitPhaseRef.current = 2;
          }
        }
        
        // Phase 2: Split into 4 cubes (around 20-55% of finale)
        if (splitPhaseRef.current === 2 && finaleProgress >= 0.2 && finaleProgress < 0.6) {
          const newCubes: typeof splitCubesRef.current = [];
          splitCubesRef.current.forEach(cube => {
            if (cube.phase === 'spread' && newCubes.length < 4) {
              newCubes.push(
                { ...cube, y: cube.y - 30, vy: -0.3, phase: 'spread' },
                { ...cube, y: cube.y + 30, vy: 0.3, phase: 'spread' }
              );
            }
          });
          if (newCubes.length === 4) {
            splitCubesRef.current = newCubes;
            splitPhaseRef.current = 4;
          }
        }
        
        // Phase 3: Split into 8 cubes (around 50-85% of finale)
        if (splitPhaseRef.current === 4 && finaleProgress >= 0.5 && finaleProgress < 0.9) {
          const newCubes: typeof splitCubesRef.current = [];
          splitCubesRef.current.forEach(cube => {
            if (cube.phase === 'spread' && newCubes.length < 8) {
              const angle = Math.atan2(cube.y - centerY, cube.x - centerX);
              newCubes.push(
                { ...cube, x: cube.x - Math.cos(angle) * 20, y: cube.y - Math.sin(angle) * 20, phase: 'spread' },
                { ...cube, x: cube.x + Math.cos(angle) * 20, y: cube.y + Math.sin(angle) * 20, phase: 'spread' }
              );
            }
          });
          if (newCubes.length === 8) {
            splitCubesRef.current = newCubes;
            splitPhaseRef.current = 8;
          }
        }
        
        // Update spread cubes movement
        splitCubesRef.current.forEach(cube => {
          if (cube.phase === 'spread') {
            cube.x += cube.vx;
            cube.y += cube.vy;
            // Slow down over time
            cube.vx *= 0.98;
            cube.vy *= 0.98;
          }
        });
        
        // Phase 4: Merge back together (around 85-100% of finale)
        if (splitPhaseRef.current !== null && splitPhaseRef.current > 1 && finaleProgress >= 0.85) {
          splitCubesRef.current.forEach(cube => {
            if (cube.phase === 'spread') {
              cube.phase = 'merging';
            }
            const dx = centerX - cube.x;
            const dy = centerY - cube.y;
            cube.vx = dx * 0.05;
            cube.vy = dy * 0.05;
            cube.x += cube.vx;
            cube.y += cube.vy;
          });
          
          // When all cubes are close enough, merge into one
          const allClose = splitCubesRef.current.every(cube => {
            const dx = centerX - cube.x;
            const dy = centerY - cube.y;
            return Math.sqrt(dx * dx + dy * dy) < 15;
          });
          
          if (allClose && splitCubesRef.current.length > 1) {
            splitCubesRef.current = [{
              x: centerX,
              y: centerY,
              rotationX: cubeRotationX,
              rotationY: cubeRotationY,
              rotationZ: cubeRotationZ,
              size: baseCubeSize,
              vx: 0,
              vy: 0,
              phase: 'splitting',
            }];
            splitPhaseRef.current = 1;
          }
        }
        
        // Continuous music notes from bottom during finale (reduced spawn rate)
        const chars = ['♪', '♫', '♬', '♭', '♮', '♯', '♪'];
        if (vocalParticlesRef.current.length < 200) {
          for (let i = 0; i < Math.floor(4 * finalIntensity); i++) { // Reduced from 8 to 4
            vocalParticlesRef.current.push({
              x: Math.random() * canvas.width,
              y: canvas.height + 20,
              vx: (Math.random() - 0.5) * 0.5,
              vy: -2 - Math.random() * 2,
              size: 12 + Math.random() * 8,
              hue: (mid * 2 + i * 30 + time * 40) % 360,
              life: 1.0,
              char: chars[Math.floor(Math.random() * chars.length)],
            });
          }
        }
        
        // Confetti (performance limit)
        if (Math.random() > 0.7 && confettiRef.current.length < 100) {
          for (let i = 0; i < 10; i++) {
            confettiRef.current.push({
              x: Math.random() * canvas.width,
              y: -10,
              vx: (Math.random() - 0.5) * 2,
              vy: 2 + Math.random() * 3,
              size: 4 + Math.random() * 6,
              hue: (Math.random() * 360),
              life: 1.0,
              rotation: Math.random() * Math.PI * 2,
              rotationSpeed: (Math.random() - 0.5) * 0.2,
            });
          }
        }
        
        // Stars
        if (starsRef.current.length < 50) {
          starsRef.current.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            size: 1 + Math.random() * 3,
            brightness: Math.random(),
            twinkle: Math.random() * Math.PI * 2,
          });
        }
        
        // Maximum intensity on all effects - 50% reduction, varied shapes, dimmed by another 30%
        if (bass > 80 && Math.random() > 0.5) { // 50% reduction in spawn rate
          const shapes: Array<'circle' | 'wavy' | 'star' | 'hexagon'> = ['circle', 'wavy', 'star', 'hexagon'];
          const shape = shapes[Math.floor(Math.random() * shapes.length)];
          
          pulsatingRingsRef.current.push({
            radius: 0,
            speed: 5 + Math.random() * 3,
            alpha: 0.196 * finalIntensity, // Dimmed by another 30% (0.28 * 0.7 = 0.196)
            hue: (bass * 2 + Math.random() * 360 + time * 50) % 360,
            maxRadius: 600,
            shape: shape,
            waveOffset: Math.random() * Math.PI * 2,
          });
        }
      }
      
      // Update and draw confetti
      for (let i = confettiRef.current.length - 1; i >= 0; i--) {
        const conf = confettiRef.current[i];
        conf.x += conf.vx;
        conf.y += conf.vy;
        conf.vy += 0.1; // Gravity
        conf.rotation += conf.rotationSpeed;
        conf.life -= 0.005;
        
        if (conf.life <= 0 || conf.y > canvas.height + 20) {
          confettiRef.current.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.translate(conf.x, conf.y);
        ctx.rotate(conf.rotation);
        ctx.globalAlpha = conf.life * 0.9 * finalIntensity;
        ctx.fillStyle = `hsl(${conf.hue}, 100%, 60%)`;
        ctx.fillRect(-conf.size / 2, -conf.size / 2, conf.size, conf.size);
        ctx.restore();
      }
      
      // Update and draw stars
      starsRef.current.forEach(star => {
        star.twinkle += 0.05;
        const brightness = 0.5 + Math.sin(star.twinkle) * 0.5;
        
        ctx.save();
        ctx.globalAlpha = brightness * 0.8 * finalIntensity;
        ctx.fillStyle = `hsl(${(time * 30) % 360}, 100%, ${50 + brightness * 50}%)`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Star spikes
        ctx.strokeStyle = `hsl(${(time * 30) % 360}, 100%, 80%)`;
        ctx.lineWidth = 1;
        for (let spike = 0; spike < 4; spike++) {
          const angle = (Math.PI * 2 * spike) / 4;
          ctx.beginPath();
          ctx.moveTo(star.x, star.y);
          ctx.lineTo(
            star.x + Math.cos(angle) * star.size * 2,
            star.y + Math.sin(angle) * star.size * 2
          );
          ctx.stroke();
        }
        ctx.restore();
      });
      
      // Pulsating rings around cube - audio reactive (further dimmed, reduced frequency by 25%)
      if (bass > 75 && effectIntensity > 0.2 && Math.random() > 0.25) { // Higher threshold + 25% reduction
        const ringIntensity = isLullSection ? 0.5 : finalIntensity;
        pulsatingRingsRef.current.push({
          radius: 0,
          speed: 2 + (bass / 40) * tempoMultiplier * timeIntensityMultiplier,
          alpha: 0.3 * ringIntensity, // Further dimmed (0.42 * 0.7 ≈ 0.3)
          hue: (bass * 2 + time * 30) % 360,
          maxRadius: 300 + (bass * 2) * timeIntensityMultiplier,
          shape: 'circle',
          waveOffset: 0,
        });
      }
      
      // Update and draw pulsating rings with varied shapes
      for (let i = pulsatingRingsRef.current.length - 1; i >= 0; i--) {
        const ring = pulsatingRingsRef.current[i];
        ring.radius += ring.speed;
        ring.alpha -= 0.01;
        
        if (ring.alpha <= 0 || ring.radius > ring.maxRadius) {
          pulsatingRingsRef.current.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = ring.alpha; // Already dimmed in creation
        ctx.strokeStyle = `hsl(${ring.hue}, 100%, 60%)`;
        ctx.lineWidth = 3;
        ctx.translate(centerX, centerY);
        
        ctx.beginPath();
        
        if (ring.shape === 'circle') {
          // Standard circle
          ctx.arc(0, 0, ring.radius, 0, Math.PI * 2);
        } else if (ring.shape === 'wavy') {
          // Wavy ring with sine wave modulation
          const points = 64;
          const waveAmplitude = 15;
          const waveFrequency = 8;
          for (let j = 0; j <= points; j++) {
            const angle = (j / points) * Math.PI * 2;
            const wave = Math.sin(angle * waveFrequency + ring.waveOffset + time * 2) * waveAmplitude;
            const r = ring.radius + wave;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        } else if (ring.shape === 'star') {
          // Star shape
          const points = 8;
          const outerRadius = ring.radius;
          const innerRadius = ring.radius * 0.6;
          for (let j = 0; j <= points * 2; j++) {
            const angle = (j / (points * 2)) * Math.PI * 2;
            const r = j % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle) * r;
            const y = Math.sin(angle) * r;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        } else if (ring.shape === 'hexagon') {
          // Hexagon shape
          const sides = 6;
          for (let j = 0; j <= sides; j++) {
            const angle = (j / sides) * Math.PI * 2;
            const x = Math.cos(angle) * ring.radius;
            const y = Math.sin(angle) * ring.radius;
            if (j === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
        }
        
        ctx.stroke();
        
        // Draw multiple concentric rings for better effect (also dimmed) - only for circles
        if (ring.shape === 'circle' && ring.radius > 20) {
          ctx.globalAlpha = ring.alpha * 0.5; // Dimmed inner ring
          ctx.beginPath();
          ctx.arc(0, 0, ring.radius - 15, 0, Math.PI * 2);
          ctx.stroke();
        }
        
        ctx.restore();
      }
      
      // Expanding circles/waves on beats - volume affected
      if (bass > 80 && effectIntensity > 0.2) {
        waves.push({
          x: centerX,
          y: centerY,
          radius: 0,
          speed: 2 + (bass / 50),
          alpha: 0.4 * effectIntensity,
          hue: (bass * 2 + time * 30) % 360,
        });
      }
      
      // Update and draw waves (performance: limit and cleanup)
      for (let i = waves.length - 1; i >= 0; i--) {
        const wave = waves[i];
        wave.radius += wave.speed;
        wave.alpha -= 0.015;
        
        if (wave.alpha <= 0 || wave.radius > Math.max(canvas.width, canvas.height) || waves.length > 30) {
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
        ctx.globalAlpha = p.life * 0.7 * effectIntensity;
        ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      
      // Additional effects: Starfield particles - volume affected
      if (treble > 100 && effectIntensity > 0.3) {
        for (let i = 0; i < Math.floor(3 * effectIntensity); i++) {
          const angle = Math.random() * Math.PI * 2;
          const distance = 50 + Math.random() * 100;
          const px = centerX + Math.cos(angle) * distance;
          const py = centerY + Math.sin(angle) * distance;
          
          ctx.save();
          ctx.globalAlpha = 0.6 * effectIntensity;
          ctx.fillStyle = `hsl(${(treble * 3 + time * 60) % 360}, 100%, 80%)`;
          ctx.beginPath();
          ctx.arc(px, py, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      
      // Rotating circles around center - volume affected
      if (mid > 90 && effectIntensity > 0.2) {
        const numCircles = 8;
        for (let i = 0; i < numCircles; i++) {
          const angle = (Math.PI * 2 * i) / numCircles + time * 0.3; // Slower rotation
          const distance = 100 + mid * effectIntensity;
          const px = canvas.width / 2 + Math.cos(angle) * distance;
          const py = canvas.height / 2 + Math.sin(angle) * distance;
          
          ctx.save();
          ctx.globalAlpha = 0.4 * effectIntensity;
          ctx.fillStyle = `hsl(${(mid * 2 + i * 45 + time * 40) % 360}, 100%, 60%)`;
          ctx.beginPath();
          ctx.arc(px, py, 8 + (mid / 20), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
      
      // Audio Wave Bars at Top and Bottom - FULL WIDTH coverage from edge to edge
      const barHeight = 100;
      // Increase numBars to ensure full coverage, especially for widescreen monitors
      const numBars = Math.max(bufferLength, Math.floor(canvas.width / 1.5));
      // Extend bars slightly beyond screen width (110% of canvas width)
      const extendedWidth = canvas.width * 1.1;
      
      // Top bars - extend DOWNWARD from top edge, full width coverage with extension
      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.floor((i / numBars) * bufferLength);
        const barValue = (dataArray[dataIndex] / 255) * barHeight * finalIntensity;
        const hue = (i / numBars) * 360 + time * 30;
        const pulse = 1 + Math.sin(time * 5 + i * 0.1) * 0.2;
        
        // Lower threshold to ensure visibility even at low audio values
        if (barValue > 1) {
          const x = (i / numBars) * extendedWidth; // Extended width coverage
          const nextX = ((i + 1) / numBars) * extendedWidth;
          const barW = Math.max(1, nextX - x); // Width to fill gap
          
          const gradient = ctx.createLinearGradient(x, 0, x, barValue * pulse);
          gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
          gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 60%, 0.7)`);
          gradient.addColorStop(1, `hsla(${hue + 60}, 100%, 50%, 0.5)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, 0, barW, barValue * pulse);
          
          // Glow effect around bars
          if (barValue > barHeight * 0.5) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.globalAlpha = 0.3 * finalIntensity;
            ctx.fillRect(x - 2, 0, barW + 3, barValue * pulse);
            ctx.restore();
          }
        }
      }
      
      // Bottom bars - extend UPWARD from bottom edge, full width coverage with extension
      for (let i = 0; i < numBars; i++) {
        const dataIndex = Math.floor((i / numBars) * bufferLength);
        const barValue = (dataArray[dataIndex] / 255) * barHeight * finalIntensity;
        const hue = (i / numBars) * 360 + time * 30;
        const pulse = 1 + Math.sin(time * 5 + i * 0.1) * 0.2;
        
        // Lower threshold to ensure visibility even at low audio values
        if (barValue > 1) {
          const x = (i / numBars) * extendedWidth; // Extended width coverage
          const nextX = ((i + 1) / numBars) * extendedWidth;
          const barW = Math.max(1, nextX - x); // Width to fill gap
          
          const gradient = ctx.createLinearGradient(x, canvas.height - barValue * pulse, x, canvas.height);
          gradient.addColorStop(0, `hsla(${hue}, 100%, 70%, 0.9)`);
          gradient.addColorStop(0.5, `hsla(${hue + 30}, 100%, 60%, 0.7)`);
          gradient.addColorStop(1, `hsla(${hue + 60}, 100%, 50%, 0.5)`);
          
          ctx.fillStyle = gradient;
          ctx.fillRect(x, canvas.height - barValue * pulse, barW, barValue * pulse);
          
          // Glow effect around bars
          if (barValue > barHeight * 0.5) {
            ctx.save();
            ctx.shadowBlur = 10;
            ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
            ctx.globalAlpha = 0.3 * finalIntensity;
            ctx.fillRect(x - 2, canvas.height - barValue * pulse, barW + 3, barValue * pulse);
            ctx.restore();
          }
        }
      }
      
      // 3D Rotating Cube(s) - Single cube or split cubes during finale
      const cubeRotationSpeed = isLullSection ? 0.5 : timeIntensityMultiplier;
      cubeRotationX += (0.002 + (mid / 5000)) * effectIntensity * cubeRotationSpeed;
      cubeRotationY += (0.003 + (bass / 5000)) * effectIntensity * cubeRotationSpeed;
      cubeRotationZ += (0.002 + (treble / 5000)) * effectIntensity * cubeRotationSpeed;
      
      const vertices = [
        [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
        [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
      ];
      
      // Draw cubes - always use split cubes during finale if available, otherwise single cube
      const cubesToDraw = isFinaleSection && splitCubesRef.current.length > 0 
        ? splitCubesRef.current 
        : [{
            x: centerX,
            y: centerY,
            rotationX: cubeRotationX,
            rotationY: cubeRotationY,
            rotationZ: cubeRotationZ,
            size: baseCubeSize,
            vx: 0,
            vy: 0,
            phase: 'splitting' as const,
          }];
      
      cubesToDraw.forEach((cubeData) => {
        const cubeSize = cubeData.size || baseCubeSize;
        const rotX = cubeData.rotationX !== undefined ? cubeData.rotationX : cubeRotationX;
        const rotY = cubeData.rotationY !== undefined ? cubeData.rotationY : cubeRotationY;
        const rotZ = cubeData.rotationZ !== undefined ? cubeData.rotationZ : cubeRotationZ;
        
        // Rotate vertices
        const rotatedVertices = vertices.map(v => {
          let [x, y, z] = v;
          
          // Rotate around X axis
          const y1 = y * Math.cos(rotX) - z * Math.sin(rotX);
          const z1 = y * Math.sin(rotX) + z * Math.cos(rotX);
          y = y1;
          z = z1;
          
          // Rotate around Y axis
          const x1 = x * Math.cos(rotY) + z * Math.sin(rotY);
          const z2 = -x * Math.sin(rotY) + z * Math.cos(rotY);
          x = x1;
          z = z2;
          
          // Rotate around Z axis
          const x2 = x * Math.cos(rotZ) - y * Math.sin(rotZ);
          const y2 = x * Math.sin(rotZ) + y * Math.cos(rotZ);
          x = x2;
          y = y2;
          
          return {
            x: cubeData.x + x * cubeSize,
            y: cubeData.y + y * cubeSize,
            z: z * cubeSize
          };
        });
        
        // Draw cube faces
        const faces = [
          [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4],
          [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5]
        ];
        
        ctx.save();
        ctx.globalAlpha = 0.7 * finalIntensity;
        
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
        
        // Update rotations for split cubes
        if (isFinaleSection && cubeData.phase !== 'merging') {
          cubeData.rotationX = (cubeData.rotationX !== undefined ? cubeData.rotationX : cubeRotationX) + (0.002 + (mid / 5000)) * effectIntensity * cubeRotationSpeed;
          cubeData.rotationY = (cubeData.rotationY !== undefined ? cubeData.rotationY : cubeRotationY) + (0.003 + (bass / 5000)) * effectIntensity * cubeRotationSpeed;
          cubeData.rotationZ = (cubeData.rotationZ !== undefined ? cubeData.rotationZ : cubeRotationZ) + (0.002 + (treble / 5000)) * effectIntensity * cubeRotationSpeed;
        }
      });
      
      // Update and draw click explosions (performance limit)
      for (let i = clickExplosionsRef.current.length - 1; i >= 0; i--) {
        const explosion = clickExplosionsRef.current[i];
        explosion.life -= 0.02;
        
        for (let j = explosion.particles.length - 1; j >= 0; j--) {
          const p = explosion.particles[j];
          p.x += p.vx;
          p.y += p.vy;
          p.vx *= 0.95;
          p.vy *= 0.95;
          p.life -= 0.02;
          
          // More aggressive cleanup
          if (p.life <= 0 || p.x < -100 || p.x > canvas.width + 100 || p.y < -100 || p.y > canvas.height + 100) {
            explosion.particles.splice(j, 1);
            continue;
          }
          
          ctx.save();
          ctx.globalAlpha = p.life * 0.8;
          ctx.fillStyle = `hsl(${p.hue}, 100%, 60%)`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
        
        if (explosion.life <= 0 || explosion.particles.length === 0 || clickExplosionsRef.current.length > 10) {
          clickExplosionsRef.current.splice(i, 1);
        }
      }
      
      // Update and draw borgs effects
      for (let i = borgsEffectsRef.current.length - 1; i >= 0; i--) {
        const borg = borgsEffectsRef.current[i];
        borg.radius += 3;
        borg.life -= 0.015;
        
        if (borg.life <= 0 || borg.radius > 400) {
          borgsEffectsRef.current.splice(i, 1);
          continue;
        }
        
        ctx.save();
        ctx.globalAlpha = borg.life * 0.7;
        ctx.strokeStyle = `hsl(${borg.hue}, 100%, 60%)`;
        ctx.lineWidth = 2;
        
        // Draw geometric pattern (hexagonal grid)
        for (let seg = 0; seg < borg.segments; seg++) {
          const angle = (Math.PI * 2 * seg) / borg.segments;
          const x1 = borg.x + Math.cos(angle) * borg.radius;
          const y1 = borg.y + Math.sin(angle) * borg.radius;
          const x2 = borg.x + Math.cos(angle + Math.PI / borg.segments) * borg.radius;
          const y2 = borg.y + Math.sin(angle + Math.PI / borg.segments) * borg.radius;
          
          ctx.beginPath();
          ctx.moveTo(borg.x, borg.y);
          ctx.lineTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.closePath();
          ctx.stroke();
        }
        
        // Draw inner hexagon
        ctx.beginPath();
        for (let seg = 0; seg < borg.segments; seg++) {
          const angle = (Math.PI * 2 * seg) / borg.segments;
          const x = borg.x + Math.cos(angle) * borg.radius * 0.6;
          const y = borg.y + Math.sin(angle) * borg.radius * 0.6;
          if (seg === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
        
        ctx.restore();
      }
      
      // Extended tempo-based flowing lines effect - Enhanced with time intensity and screen animation
      if (treble > 80 && effectIntensity > 0.2 && !isLullSection) {
        // Update screen effect progress for flowing lines
        screenEffectProgressRef.current.flowingLines = Math.min(1, screenEffectProgressRef.current.flowingLines + 0.02);
        
        ctx.save();
        const progress = screenEffectProgressRef.current.flowingLines;
        ctx.globalAlpha = 0.4 * finalIntensity * progress;
        ctx.strokeStyle = `hsl(${(treble * 3 + time * 50) % 360}, 100%, 70%)`;
        ctx.lineWidth = 2;
        
        // Multiple wave layers for depth - animate from left to right
        const numLayers = isFinaleSection ? 5 : 3;
        for (let layer = 0; layer < numLayers; layer++) {
          ctx.beginPath();
          const layerOffset = layer * 0.3;
          const amplitude = (treble / 3) * finalIntensity * tempoMultiplier * (1 + layer * 0.3);
          const frequency = 2 + (tempoMultiplier - 1) * 0.5;
          
          const startX = 0;
          const endX = canvas.width * progress; // Animate across screen
          let firstPoint = true;
          for (let i = startX; i < endX; i += 2) {
            const x = i;
            const y = canvas.height / 2 + Math.sin(time * frequency + i * 0.01 + layerOffset) * amplitude;
            if (firstPoint) {
              ctx.moveTo(x, y);
              firstPoint = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
        
        // Horizontal extension waves - animate from left to right
        const numWaves = isFinaleSection ? 4 : 2;
        for (let wave = 0; wave < numWaves; wave++) {
          ctx.beginPath();
          const waveY = canvas.height / 2 + (wave - numWaves / 2) * 100;
          const waveAmplitude = (treble / 4) * finalIntensity * tempoMultiplier;
          
          const startX = 0;
          const endX = canvas.width * progress; // Animate across screen
          let firstPoint = true;
          for (let i = startX; i < endX; i += 2) {
            const x = i;
            const y = waveY + Math.sin(time * tempoMultiplier + i * 0.015) * waveAmplitude;
            if (firstPoint) {
              ctx.moveTo(x, y);
              firstPoint = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
          ctx.stroke();
        }
        
        ctx.restore();
      } else {
        // Reset flowing lines progress when not active
        screenEffectProgressRef.current.flowingLines = Math.max(0, screenEffectProgressRef.current.flowingLines - 0.05);
      }
      
      // Custom rotating cube cursor
      if (mouse.x > 0 && mouse.y > 0) {
        // Update cursor cube rotation
        cursorCubeRotationRef.current.x += 0.02;
        cursorCubeRotationRef.current.y += 0.03;
        cursorCubeRotationRef.current.z += 0.015;
        
        const cursorCubeSize = 15;
        const cursorVertices = [
          [-1, -1, -1], [1, -1, -1], [1, 1, -1], [-1, 1, -1],
          [-1, -1, 1], [1, -1, 1], [1, 1, 1], [-1, 1, 1]
        ];
        
        // Rotate cursor cube vertices
        const rotatedCursorVertices = cursorVertices.map(v => {
          let [x, y, z] = v;
          
          // Rotate around X axis
          const y1 = y * Math.cos(cursorCubeRotationRef.current.x) - z * Math.sin(cursorCubeRotationRef.current.x);
          const z1 = y * Math.sin(cursorCubeRotationRef.current.x) + z * Math.cos(cursorCubeRotationRef.current.x);
          y = y1;
          z = z1;
          
          // Rotate around Y axis
          const x1 = x * Math.cos(cursorCubeRotationRef.current.y) + z * Math.sin(cursorCubeRotationRef.current.y);
          const z2 = -x * Math.sin(cursorCubeRotationRef.current.y) + z * Math.cos(cursorCubeRotationRef.current.y);
          x = x1;
          z = z2;
          
          // Rotate around Z axis
          const x2 = x * Math.cos(cursorCubeRotationRef.current.z) - y * Math.sin(cursorCubeRotationRef.current.z);
          const y2 = x * Math.sin(cursorCubeRotationRef.current.z) + y * Math.cos(cursorCubeRotationRef.current.z);
          x = x2;
          y = y2;
          
          return {
            x: mouse.x + x * cursorCubeSize,
            y: mouse.y + y * cursorCubeSize,
            z: z * cursorCubeSize
          };
        });
        
        // Draw cursor cube faces
        const cursorFaces = [
          [0, 1, 2, 3], [4, 5, 6, 7], [0, 1, 5, 4],
          [2, 3, 7, 6], [0, 3, 7, 4], [1, 2, 6, 5]
        ];
        
        ctx.save();
        ctx.globalAlpha = 0.8;
        
        cursorFaces.forEach((face, idx) => {
          const points = face.map(i => rotatedCursorVertices[i]);
          const avgZ = points.reduce((sum, p) => sum + p.z, 0) / points.length;
          
          if (avgZ > -cursorCubeSize) {
            const hue = (idx * 60 + time * 50) % 360;
            ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.6)`;
            ctx.strokeStyle = `hsl(${hue}, 100%, 70%)`;
            ctx.lineWidth = 1.5;
            
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
      }
      
      animationFrameRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('click', handleMouseClick);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (mouseIdleTimeoutRef.current) {
        clearTimeout(mouseIdleTimeoutRef.current);
      }
    };
  }, [analyser, isPlaying, volume, isMuted]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (newVolume === 0) {
      setIsMuted(true);
    } else if (isMuted) {
      setIsMuted(false);
    }
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

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
      <canvas
        ref={canvasRef}
        className="absolute inset-0 z-10"
        style={{ background: 'transparent', cursor: 'none' }}
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
      
      {/* Volume Slider - Vertical on right side, only visible on mouse movement */}
      <div 
        className={`absolute right-4 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-3 transition-opacity duration-300 ${
          showVolumeControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onMouseEnter={() => {
          // Keep visible when hovering over controls
          setShowVolumeControls(true);
          if (mouseIdleTimeoutRef.current) {
            clearTimeout(mouseIdleTimeoutRef.current);
          }
        }}
        onMouseLeave={() => {
          // Start fade-out timer when leaving controls
          if (mouseIdleTimeoutRef.current) {
            clearTimeout(mouseIdleTimeoutRef.current);
          }
          mouseIdleTimeoutRef.current = setTimeout(() => {
            setShowVolumeControls(false);
          }, 2000);
        }}
      >
        <button
          onClick={handleMuteToggle}
          className="w-10 h-10 rounded-full bg-gray-800/80 hover:bg-gray-700/90 text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all"
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              style={{
                writingMode: 'vertical-lr',
                direction: 'rtl',
                width: '8px',
                height: '200px',
                cursor: 'pointer',
                background: `linear-gradient(to top, 
                  rgba(59, 130, 246, 0.8) 0%, 
                  rgba(59, 130, 246, 0.8) ${(isMuted ? 0 : volume) * 100}%, 
                  rgba(75, 85, 99, 0.5) ${(isMuted ? 0 : volume) * 100}%, 
                  rgba(75, 85, 99, 0.5) 100%)`,
                borderRadius: '4px',
                outline: 'none',
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `linear-gradient(to top, 
                  rgba(59, 130, 246, 0.3) 0%, 
                  rgba(59, 130, 246, 0.3) ${(isMuted ? 0 : volume) * 100}%, 
                  transparent ${(isMuted ? 0 : volume) * 100}%)`,
                borderRadius: '4px',
                boxShadow: `0 0 10px rgba(59, 130, 246, ${(isMuted ? 0 : volume) * 0.5})`,
              }}
            />
          </div>
        </div>
        
        {/* Play/Pause button integrated */}
        {isPlaying && (
          <button
            onClick={handlePlay}
            className="w-10 h-10 rounded-full bg-blue-600/80 hover:bg-blue-700/90 text-white flex items-center justify-center shadow-lg backdrop-blur-sm transition-all"
            title="Pause"
          >
            <Pause className="w-5 h-5" />
          </button>
        )}
      </div>
      
      {/* Close button - only visible on mouse movement */}
      <button
        onClick={handleClose}
        className={`absolute top-4 right-4 z-20 text-white hover:text-gray-300 transition-opacity duration-300 ${
          showVolumeControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onMouseEnter={() => {
          // Keep visible when hovering over close button
          setShowVolumeControls(true);
          if (mouseIdleTimeoutRef.current) {
            clearTimeout(mouseIdleTimeoutRef.current);
          }
        }}
        onMouseLeave={() => {
          // Start fade-out timer when leaving close button
          if (mouseIdleTimeoutRef.current) {
            clearTimeout(mouseIdleTimeoutRef.current);
          }
          mouseIdleTimeoutRef.current = setTimeout(() => {
            setShowVolumeControls(false);
          }, 2000);
        }}
      >
        <X className="w-6 h-6" />
      </button>
      
      {/* End-of-Song Modal with Glitchy Text */}
      {showEndModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 z-30 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => {
            setShowEndModal(false);
            handleClose();
          }}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-900/95 border border-gray-700 rounded-lg p-8 max-w-md mx-4 text-center relative overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <GlitchyText text="Thanks for listening! Follow me on Suno. @MadXent" />
            <button
              onClick={() => {
                setShowEndModal(false);
                handleClose();
              }}
              className="mt-6 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  );
}

// Glitchy Text Component - glitches then transforms into actual text preserving spaces
function GlitchyText({ text }: { text: string }) {
  const [displayedText, setDisplayedText] = useState('');
  const [glitchChars, setGlitchChars] = useState<Array<{ char: string; glitch: boolean }>>([]);
  const [phase, setPhase] = useState<'glitching' | 'spelling'>('glitching');
  const [spellingIndex, setSpellingIndex] = useState(0);
  const glitchDurationRef = useRef(0);
  
  useEffect(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    const GLITCH_DURATION = 2000; // 2 seconds of glitching
    const SPELLING_DELAY = 80; // Delay between characters when spelling
    
    const interval = setInterval(() => {
      if (phase === 'glitching') {
        glitchDurationRef.current += 50;
        
        // Random glitch characters preserving structure (spaces stay as spaces)
        const glitchText = Array.from(text, (char, i) => {
          if (char === ' ') return ' ';
          return chars[Math.floor(Math.random() * chars.length)];
        }).join('');
        setDisplayedText(glitchText);
        
        // Add glitch effect
        setGlitchChars(Array.from(text, (char, i) => ({
          char: char === ' ' ? ' ' : '',
          glitch: char !== ' ' && Math.random() > 0.5,
        })));
        
        // After glitch duration, switch to spelling phase
        if (glitchDurationRef.current >= GLITCH_DURATION) {
          setPhase('spelling');
          setDisplayedText('');
          setSpellingIndex(0);
        }
      } else {
        // Spelling phase - slowly reveal actual text character by character, preserving spaces
        if (spellingIndex < text.length) {
          const newText = text.slice(0, spellingIndex + 1);
          setDisplayedText(newText);
          setGlitchChars(Array.from(newText, (char, i) => ({
            char: char,
            glitch: false,
          })));
          setSpellingIndex(prev => prev + 1);
        }
      }
    }, phase === 'glitching' ? 50 : SPELLING_DELAY);
    
    return () => clearInterval(interval);
  }, [text, phase, spellingIndex]);
  
  return (
    <div className="text-2xl font-bold text-white relative font-mono bg-gray-900/50 border border-gray-700 rounded px-4 py-3 inline-block">
      {Array.from(text).map((char, i) => {
        const displayedChar = i < displayedText.length ? displayedText[i] : '';
        const glitch = glitchChars[i]?.glitch || false;
        const isSpace = char === ' ';
        const glitchChar = glitch && phase === 'glitching' && !isSpace
          ? String.fromCharCode(33 + Math.floor(Math.random() * 94)) 
          : (displayedChar || (isSpace ? ' ' : ''));
        
        return (
          <span
            key={i}
            className={`inline-block ${glitch && phase === 'glitching' ? 'text-red-500' : 'text-white'}`}
            style={{
              transform: glitch && phase === 'glitching' 
                ? `translate(${Math.random() * 4 - 2}px, ${Math.random() * 4 - 2}px)` 
                : 'none',
              textShadow: glitch && phase === 'glitching'
                ? `2px 0 0 #ff0000, -2px 0 0 #00ffff`
                : 'none',
              transition: phase === 'spelling' ? 'all 0.2s ease' : 'all 0.1s',
              opacity: phase === 'spelling' && i < spellingIndex ? 1 : (glitch && phase === 'glitching' ? 0.7 : 1),
              fontFamily: "'Courier New', monospace",
            }}
          >
            {glitchChar}
          </span>
        );
      })}
    </div>
  );
}

