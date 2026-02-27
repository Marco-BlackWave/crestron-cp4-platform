import { useEffect, useRef } from 'react';

export type BackgroundType = 
  | 'none'
  | 'aurora'
  | 'floating-blobs'
  | 'gradient-mesh'
  | 'cosmic-dust'
  | 'soft-waves';

interface AnimatedBackgroundProps {
  type: BackgroundType;
  speed?: number;
  intensity?: number;
}

export function AnimatedBackground({ type, speed = 1.0, intensity = 1.0 }: AnimatedBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    // CLEANUP: Clear all global particle states when component unmounts or type changes
    return () => {
      (window as any).__particleFlowParticles = [];
      (window as any).__neuralNodes = [];
    };
  }, [type]);

  useEffect(() => {
    if (type === 'none') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationId: number;
    let isRunning = true;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      
      // Clear on resize
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };
    
    resize();
    window.addEventListener('resize', resize);

    let time = 0;

    const animate = () => {
      if (!isRunning) return;
      
      time += 0.01 * speed;

      switch (type) {
        case 'cosmic-dust':
          renderCosmicDust(ctx, canvas.width, canvas.height, time, intensity);
          break;
      }

      animationId = requestAnimationFrame(animate);
    };

    const canvasTypes = [
      'cosmic-dust',
    ];
    
    if (canvasTypes.includes(type)) {
      animate();
    }

    return () => {
      isRunning = false;
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      
      // Clear canvas on cleanup
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // Clear global states
      (window as any).__particleFlowParticles = [];
      (window as any).__neuralNodes = [];
    };
  }, [type, speed, intensity]);

  if (type === 'none') return null;

  // CSS-based backgrounds
  if (type === 'aurora') {
    const duration = 15 / speed;
    const opacity = 0.3 * intensity;
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="aurora-bg" />
        <style>{`
          .aurora-bg {
            position: absolute;
            inset: 0;
            background: 
              radial-gradient(ellipse 80% 50% at 50% -20%, rgba(120, 119, 198, ${opacity}), transparent),
              radial-gradient(ellipse 60% 50% at 0% 50%, rgba(255, 119, 204, ${opacity * 0.7}), transparent),
              radial-gradient(ellipse 60% 50% at 100% 50%, rgba(120, 200, 255, ${opacity * 0.7}), transparent);
            animation: aurora-shift ${duration}s ease-in-out infinite;
          }
          
          @keyframes aurora-shift {
            0%, 100% { 
              filter: hue-rotate(0deg) brightness(1);
              transform: scale(1);
            }
            33% { 
              filter: hue-rotate(30deg) brightness(1.1);
              transform: scale(1.05);
            }
            66% { 
              filter: hue-rotate(-20deg) brightness(0.95);
              transform: scale(1.02);
            }
          }
        `}</style>
      </div>
    );
  }

  if (type === 'floating-blobs') {
    const duration = 20 / speed;
    const opacity = 0.4 * intensity;
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="blob blob-1" />
        <div className="blob blob-2" />
        <div className="blob blob-3" />
        <div className="blob blob-4" />
        <style>{`
          .blob {
            position: absolute;
            border-radius: 50%;
            filter: blur(${40 + 20 * intensity}px);
            opacity: ${opacity};
            animation: float ${duration}s ease-in-out infinite;
          }
          
          .blob-1 {
            width: 400px;
            height: 400px;
            background: radial-gradient(circle, rgba(139, 92, 246, 0.6), transparent);
            top: 10%;
            left: 10%;
            animation-delay: 0s;
          }
          
          .blob-2 {
            width: 500px;
            height: 500px;
            background: radial-gradient(circle, rgba(236, 72, 153, 0.5), transparent);
            top: 60%;
            right: 10%;
            animation-delay: ${duration * 0.25}s;
          }
          
          .blob-3 {
            width: 350px;
            height: 350px;
            background: radial-gradient(circle, rgba(59, 130, 246, 0.5), transparent);
            bottom: 10%;
            left: 50%;
            animation-delay: ${duration * 0.5}s;
          }
          
          .blob-4 {
            width: 300px;
            height: 300px;
            background: radial-gradient(circle, rgba(167, 139, 250, 0.4), transparent);
            top: 40%;
            left: 30%;
            animation-delay: ${duration * 0.75}s;
          }
          
          @keyframes float {
            0%, 100% {
              transform: translate(0, 0) scale(1);
            }
            25% {
              transform: translate(30px, -30px) scale(1.1);
            }
            50% {
              transform: translate(-20px, 20px) scale(0.9);
            }
            75% {
              transform: translate(40px, 10px) scale(1.05);
            }
          }
        `}</style>
      </div>
    );
  }

  if (type === 'gradient-mesh') {
    const duration = 20 / speed;
    const opacity = 0.25 * intensity;
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="gradient-mesh" />
        <style>{`
          .gradient-mesh {
            position: absolute;
            inset: -50%;
            background: 
              radial-gradient(at 20% 30%, rgba(124, 58, 237, ${opacity}) 0px, transparent 50%),
              radial-gradient(at 80% 20%, rgba(219, 39, 119, ${opacity}) 0px, transparent 50%),
              radial-gradient(at 50% 80%, rgba(59, 130, 246, ${opacity}) 0px, transparent 50%),
              radial-gradient(at 90% 70%, rgba(168, 85, 247, ${opacity * 0.8}) 0px, transparent 50%),
              radial-gradient(at 10% 80%, rgba(236, 72, 153, ${opacity * 0.8}) 0px, transparent 50%);
            animation: gradient-mesh-move ${duration}s ease-in-out infinite;
          }
          
          @keyframes gradient-mesh-move {
            0%, 100% {
              transform: translate(0, 0) rotate(0deg);
            }
            33% {
              transform: translate(2%, -2%) rotate(1deg);
            }
            66% {
              transform: translate(-2%, 2%) rotate(-1deg);
            }
          }
        `}</style>
      </div>
    );
  }

  if (type === 'soft-waves') {
    const duration = 15 / speed;
    const opacity = 0.3 * intensity;
    
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="wave-gradient-1" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={`rgba(139, 92, 246, ${opacity})`} />
              <stop offset="100%" stopColor={`rgba(59, 130, 246, ${opacity * 0.7})`} />
            </linearGradient>
            <linearGradient id="wave-gradient-2" x1="100%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={`rgba(236, 72, 153, ${opacity * 0.8})`} />
              <stop offset="100%" stopColor={`rgba(219, 39, 119, ${opacity * 0.5})`} />
            </linearGradient>
            <linearGradient id="wave-gradient-3" x1="50%" y1="0%" x2="50%" y2="100%">
              <stop offset="0%" stopColor={`rgba(168, 85, 247, ${opacity * 0.7})`} />
              <stop offset="100%" stopColor={`rgba(124, 58, 237, ${opacity * 0.3})`} />
            </linearGradient>
          </defs>
          
          <path className="wave-path wave-1" fill="url(#wave-gradient-1)" />
          <path className="wave-path wave-2" fill="url(#wave-gradient-2)" />
          <path className="wave-path wave-3" fill="url(#wave-gradient-3)" />
        </svg>
        
        <style>{`
          .wave-path {
            animation: wave-move ${duration}s ease-in-out infinite;
          }
          
          .wave-1 {
            d: path("M0,100 Q250,50 500,100 T1000,100 T1500,100 T2000,100 L2000,300 L0,300 Z");
            animation-delay: 0s;
          }
          
          .wave-2 {
            d: path("M0,150 Q300,100 600,150 T1200,150 T1800,150 T2400,150 L2400,400 L0,400 Z");
            animation-delay: ${duration * 0.33}s;
            opacity: 0.7;
          }
          
          .wave-3 {
            d: path("M0,200 Q350,150 700,200 T1400,200 T2100,200 T2800,200 L2800,500 L0,500 Z");
            animation-delay: ${duration * 0.66}s;
            opacity: 0.5;
          }
          
          @keyframes wave-move {
            0%, 100% {
              transform: translateX(0) translateY(0);
            }
            50% {
              transform: translateX(-5%) translateY(-2%);
            }
          }
        `}</style>
      </div>
    );
  }

  // Canvas-based backgrounds
  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ pointerEvents: 'none' }}
    />
  );
}

// ============================================================================
// CANVAS RENDERING FUNCTIONS - OPTIMIZED & CLEAN
// ============================================================================

function renderCosmicDust(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number,
  intensity: number
) {
  ctx.clearRect(0, 0, width, height);

  const particleCount = Math.floor(80 * intensity);
  
  for (let i = 0; i < particleCount; i++) {
    const seed = i * 0.1;
    const x = (Math.sin(time * 0.3 + seed) * 0.4 + 0.5) * width;
    const y = (Math.cos(time * 0.2 + seed * 1.5) * 0.4 + 0.5) * height;
    const size = (Math.sin(time + seed) * 1 + 2) * intensity;
    const alpha = (Math.sin(time * 2 + seed) * 0.15 + 0.3) * intensity;

    const hue = (time * 5 + seed * 50) % 360;
    
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 2);
    gradient.addColorStop(0, `hsla(${hue}, 70%, 70%, ${alpha})`);
    gradient.addColorStop(0.5, `hsla(${hue}, 70%, 60%, ${alpha * 0.5})`);
    gradient.addColorStop(1, `hsla(${hue}, 70%, 50%, 0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, size * 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const BACKGROUND_PRESETS = [
  {
    id: 'none',
    name: 'None',
    description: 'No animated background',
    preview: '#18181b',
    category: 'basic',
  },
  {
    id: 'aurora',
    name: 'Aurora Dreams',
    description: 'Soft aurora borealis glow',
    preview: 'linear-gradient(135deg, rgba(120, 119, 198, 0.3), rgba(255, 119, 204, 0.2))',
    category: 'soft',
  },
  {
    id: 'floating-blobs',
    name: 'Floating Blobs',
    description: 'Gentle floating color blobs',
    preview: 'radial-gradient(circle at 30% 30%, rgba(139, 92, 246, 0.4), transparent)',
    category: 'soft',
  },
  {
    id: 'gradient-mesh',
    name: 'Gradient Mesh',
    description: 'Smooth gradient mesh movement',
    preview: 'radial-gradient(at 50% 50%, rgba(124, 58, 237, 0.3), rgba(59, 130, 246, 0.2))',
    category: 'soft',
  },
  {
    id: 'cosmic-dust',
    name: 'Cosmic Dust',
    description: 'Floating particles and stars',
    preview: 'radial-gradient(circle, rgba(168, 85, 247, 0.3), rgba(59, 130, 246, 0.2))',
    category: 'soft',
  },
  {
    id: 'soft-waves',
    name: 'Soft Waves',
    description: 'Gentle wave motion',
    preview: 'linear-gradient(180deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2))',
    category: 'soft',
  },
] as const;