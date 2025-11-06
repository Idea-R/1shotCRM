'use client';

import { useState, useEffect, useRef } from 'react';
import { Cookie, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  targetX: number;
  targetY: number;
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      setTimeout(() => {
        setShowBanner(true);
        setTimeout(() => createParticles(), 300);
      }, 1000);
    }
  }, []);

  const createParticles = () => {
    if (!bannerRef.current) return;
    
    const rect = bannerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const newParticles: Particle[] = [];
    const colors = ['#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#06B6D4'];
    
    // Create particles from all sides
    for (let i = 0; i < 80; i++) {
      const side = Math.floor(Math.random() * 4);
      let x = 0, y = 0;
      
      if (side === 0) { // Top
        x = Math.random() * window.innerWidth;
        y = -30;
      } else if (side === 1) { // Right
        x = window.innerWidth + 30;
        y = Math.random() * window.innerHeight;
      } else if (side === 2) { // Bottom
        x = Math.random() * window.innerWidth;
        y = window.innerHeight + 30;
      } else { // Left
        x = -30;
        y = Math.random() * window.innerHeight;
      }
      
      const angle = Math.atan2(centerY - y, centerX - x);
      const speed = 3 + Math.random() * 4;
      
      newParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 4 + Math.random() * 5,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        targetX: centerX + (Math.random() - 0.5) * rect.width,
        targetY: centerY + (Math.random() - 0.5) * rect.height,
      });
    }
    
    setParticles(newParticles);
    animateParticles(newParticles, centerX, centerY);
  };

  const animateParticles = (initialParticles: Particle[], centerX: number, centerY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    let currentParticles = [...initialParticles];
    let phase = 0; // 0: moving to center, 1: forming banner
    
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      if (phase === 0) {
        // Phase 1: Particles move toward banner center
        currentParticles = currentParticles.map(particle => {
          const dx = particle.targetX - particle.x;
          const dy = particle.targetY - particle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          if (distance > 5) {
            particle.vx += dx * 0.02;
            particle.vy += dy * 0.02;
            particle.vx *= 0.95;
            particle.vy *= 0.95;
          } else {
            phase = 1;
          }
          
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.life = Math.min(1, distance / 200);
          
          // Draw with trail effect
          ctx.save();
          ctx.globalAlpha = particle.life * 0.6;
          ctx.fillStyle = particle.color;
          ctx.shadowBlur = 10;
          ctx.shadowColor = particle.color;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
          
          return particle;
        });
        
        if (currentParticles.every(p => {
          const dx = p.targetX - p.x;
          const dy = p.targetY - p.y;
          return Math.sqrt(dx * dx + dy * dy) < 5;
        })) {
          phase = 1;
        }
      } else {
        // Phase 2: Particles fade out
        currentParticles = currentParticles.map(particle => {
          particle.life -= 0.02;
          
          if (particle.life > 0) {
            ctx.save();
            ctx.globalAlpha = particle.life * 0.4;
            ctx.fillStyle = particle.color;
            ctx.shadowBlur = 8;
            ctx.shadowColor = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
          
          return particle;
        }).filter(p => p.life > 0);
      }
      
      if (currentParticles.length > 0 || phase === 0) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };
    
    animate();
  };

  const handleAccept = () => {
    localStorage.setItem('cookie-consent', 'accepted');
    setShowBanner(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  const handleDeny = () => {
    localStorage.setItem('cookie-consent', 'denied');
    setShowBanner(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current) {
        canvasRef.current.width = window.innerWidth;
        canvasRef.current.height = window.innerHeight;
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-40"
        style={{ background: 'transparent' }}
      />
      <AnimatePresence>
        {showBanner && (
          <>
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 p-4"
            >
              <div
                ref={bannerRef}
                className="max-w-4xl mx-auto bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border-2 border-blue-500 dark:border-blue-600 p-6 relative overflow-hidden"
              >
                {/* Animated background gradient */}
                <motion.div
                  animate={{
                    backgroundPosition: ['0% 0%', '100% 100%'],
                  }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: 'linear-gradient(45deg, #3B82F6, #8B5CF6, #EC4899, #F59E0B)',
                    backgroundSize: '400% 400%',
                  }}
                />
                
                {/* Sparkle effects */}
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-blue-400 rounded-full"
                    style={{
                      left: `${10 + i * 15}%`,
                      top: `${20 + (i % 2) * 60}%`,
                    }}
                    animate={{
                      scale: [0, 1, 0],
                      opacity: [0, 1, 0],
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      delay: i * 0.3,
                    }}
                  />
                ))}
                
                <div className="relative flex items-start gap-4">
                  <motion.div
                    animate={{ 
                      rotate: [0, 10, -10, 0],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ 
                      duration: 3, 
                      repeat: Infinity, 
                      ease: 'easeInOut' 
                    }}
                    className="flex-shrink-0"
                  >
                    <Cookie className="w-12 h-12 text-blue-600 dark:text-blue-400 drop-shadow-lg" />
                  </motion.div>
                  
                  <div className="flex-1">
                    <motion.h3
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-lg font-bold text-gray-900 dark:text-white mb-2"
                    >
                      Cookie Consent
                    </motion.h3>
                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-sm text-gray-600 dark:text-gray-400 mb-4"
                    >
                      We use cookies to enhance your experience, analyze site usage, and assist in our marketing efforts. 
                      By clicking "Accept", you consent to our use of cookies.
                    </motion.p>
                    
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex gap-3"
                    >
                      <motion.button
                        whileHover={{ scale: 1.05, boxShadow: '0 10px 25px rgba(59, 130, 246, 0.3)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAccept}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg relative overflow-hidden"
                      >
                        <motion.div
                          className="absolute inset-0 bg-white opacity-0"
                          whileHover={{ opacity: 0.2 }}
                        />
                        Accept
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleDeny}
                        className="px-6 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg font-medium transition-colors"
                      >
                        Deny
                      </motion.button>
                    </motion.div>
                  </div>
                  
                  <motion.button
                    whileHover={{ rotate: 90, scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={handleDeny}
                    className="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

