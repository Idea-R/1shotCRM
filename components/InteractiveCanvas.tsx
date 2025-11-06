'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
  pulse: number;
}

interface Connection {
  p1: number;
  p2: number;
  distance: number;
}

export default function InteractiveCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const particlesRef = useRef<Particle[]>([]);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Initialize particles
    const initParticles = () => {
      const particles: Particle[] = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 12000);
      
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2.5 + 1.5,
          color: `hsl(${Math.random() * 60 + 200}, ${60 + Math.random() * 20}%, ${50 + Math.random() * 20}%)`,
          life: Math.random(),
          maxLife: 1,
          pulse: Math.random() * Math.PI * 2,
        });
      }
      
      particlesRef.current = particles;
    };

    initParticles();

    // Mouse tracking
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Animation loop
    const animate = () => {
      timeRef.current += 0.01;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update and draw particles
      particles.forEach((particle, i) => {
        // Mouse interaction with stronger force
        const dx = mouse.x - particle.x;
        const dy = mouse.y - particle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance < 150 && mouse.x > 0) {
          const force = (150 - distance) / 150;
          const angle = Math.atan2(dy, dx);
          particle.vx -= Math.cos(angle) * force * 0.05;
          particle.vy -= Math.sin(angle) * force * 0.05;
        }

        // Gentle floating motion
        particle.pulse += 0.02;
        particle.vx += Math.sin(particle.pulse) * 0.001;
        particle.vy += Math.cos(particle.pulse) * 0.001;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Boundary bounce with damping
        if (particle.x < 0 || particle.x > canvas.width) {
          particle.vx *= -0.7;
          particle.x = Math.max(0, Math.min(canvas.width, particle.x));
        }
        if (particle.y < 0 || particle.y > canvas.height) {
          particle.vy *= -0.7;
          particle.y = Math.max(0, Math.min(canvas.height, particle.y));
        }

        // Friction
        particle.vx *= 0.98;
        particle.vy *= 0.98;

        // Pulsing size
        const pulseSize = particle.size + Math.sin(timeRef.current * 2 + particle.pulse) * 0.3;
        
        // Draw particle with enhanced glow
        ctx.save();
        const mouseDistance = mouse.x > 0 ? Math.min(1, distance / 200) : 0.3;
        const alpha = Math.max(0.2, mouseDistance);
        
        // Outer glow
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, pulseSize * 4
        );
        gradient.addColorStop(0, particle.color);
        // Convert HSL to RGBA for opacity
        const hslMatch = particle.color.match(/hsl\(([^)]+)\)/);
        if (hslMatch) {
          const [h, s, l] = hslMatch[1].split(',').map(v => parseFloat(v.trim()));
          gradient.addColorStop(0.5, `hsla(${h}, ${s}%, ${l}%, 0.5)`);
        } else {
          gradient.addColorStop(0.5, particle.color);
        }
        gradient.addColorStop(1, 'transparent');
        
        ctx.globalAlpha = alpha * 0.6;
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, pulseSize * 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Core particle with glow
        ctx.globalAlpha = alpha;
        ctx.shadowBlur = 10;
        ctx.shadowColor = particle.color;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, pulseSize, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      });

      // Draw connections with better visual
      const connections: Connection[] = [];
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 140) {
            connections.push({ p1: i, p2: j, distance });
          }
        }
      }

      // Draw connection lines with gradient
      connections.forEach(({ p1, p2, distance }) => {
        const alpha = (140 - distance) / 140 * 0.4;
        const gradient = ctx.createLinearGradient(
          particles[p1].x, particles[p1].y,
          particles[p2].x, particles[p2].y
        );
        gradient.addColorStop(0, particles[p1].color);
        gradient.addColorStop(1, particles[p2].color);
        
        ctx.strokeStyle = gradient;
        ctx.globalAlpha = alpha;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(particles[p1].x, particles[p1].y);
        ctx.lineTo(particles[p2].x, particles[p2].y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      });

      // Enhanced mouse cursor effect
      if (mouse.x > 0 && mouse.y > 0) {
        // Outer ring
        const outerGradient = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 200
        );
        outerGradient.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
        outerGradient.addColorStop(0.5, 'rgba(139, 92, 246, 0.08)');
        outerGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = outerGradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 200, 0, Math.PI * 2);
        ctx.fill();
        
        // Inner ring
        const innerGradient = ctx.createRadialGradient(
          mouse.x, mouse.y, 0,
          mouse.x, mouse.y, 100
        );
        innerGradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
        innerGradient.addColorStop(1, 'transparent');
        ctx.fillStyle = innerGradient;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 100, 0, Math.PI * 2);
        ctx.fill();
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-auto z-0"
      style={{ background: 'transparent' }}
    />
  );
}

