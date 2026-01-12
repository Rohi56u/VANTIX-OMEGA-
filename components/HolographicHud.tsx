import React, { useEffect, useRef, useState } from 'react';
import { Activity, Mic, MicOff, Globe, Wifi, Shield } from 'lucide-react';

interface HolographicHudProps {
  isActive: boolean;
  onToggle: () => void;
  volumeLevel: number; // 0 to 1
  systemStatus: string;
}

export const HolographicHud: React.FC<HolographicHudProps> = ({ isActive, onToggle, volumeLevel, systemStatus }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let time = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || 300;
      canvas.height = canvas.parentElement?.clientHeight || 300;
    };
    window.addEventListener('resize', resize);
    resize();

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      
      // Dynamic Radius based on Volume
      const baseRadius = 60;
      const dynamicRadius = baseRadius + (volumeLevel * 50);

      // Draw The Core
      ctx.beginPath();
      ctx.arc(centerX, centerY, dynamicRadius * 0.8, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(centerX, centerY, 10, centerX, centerY, dynamicRadius);
      gradient.addColorStop(0, isActive ? 'rgba(255, 255, 255, 0.9)' : 'rgba(100, 100, 100, 0.9)');
      gradient.addColorStop(0.5, isActive ? 'rgba(0, 240, 255, 0.5)' : 'rgba(100, 100, 100, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw Orbital Rings (Jarvis Style)
      if (isActive) {
          time += 0.05;
          ctx.strokeStyle = '#00f0ff';
          ctx.lineWidth = 2;
          
          for (let i = 0; i < 3; i++) {
              ctx.beginPath();
              // Elliptical orbits
              ctx.ellipse(
                  centerX, 
                  centerY, 
                  dynamicRadius + (i * 20) + Math.sin(time + i) * 5, 
                  (dynamicRadius + (i * 20)) * 0.6, 
                  time * (i % 2 === 0 ? 1 : -1), 
                  0, 
                  Math.PI * 2
              );
              ctx.stroke();
          }

          // Audio Waveform Ring
          ctx.beginPath();
          for (let i = 0; i < 360; i+=5) {
             const rad = (i * Math.PI) / 180;
             const r = dynamicRadius + 60 + (Math.sin(time * 10 + i) * volumeLevel * 30);
             const x = centerX + Math.cos(rad) * r;
             const y = centerY + Math.sin(rad) * r;
             if (i===0) ctx.moveTo(x,y);
             else ctx.lineTo(x,y);
          }
          ctx.closePath();
          ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
          ctx.stroke();
      }

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationId);
    };
  }, [isActive, volumeLevel]);

  return (
    <div className="relative flex flex-col items-center justify-center h-full w-full bg-black/40 rounded-xl border border-omega-border overflow-hidden">
        {/* HUD Data Overlay */}
        <div className="absolute top-4 left-4 text-[10px] font-mono text-omega-accent space-y-1 z-20">
            <div className="flex items-center gap-2">
                <Globe size={12} /> NET: ONLINE (SEARCH ENABLED)
            </div>
            <div className="flex items-center gap-2">
                <Shield size={12} /> SECURE: ACTIVE
            </div>
            <div className="flex items-center gap-2">
                <Wifi size={12} /> LATENCY: 12ms
            </div>
        </div>

        {/* Central Canvas */}
        <div className="relative w-full h-[60%] flex items-center justify-center">
            <canvas ref={canvasRef} className="z-10" />
        </div>

        {/* Interaction Controls */}
        <div className="absolute bottom-10 z-20 flex flex-col items-center gap-4">
            <div className="text-omega-accent font-mono text-sm tracking-widest uppercase animate-pulse">
                {isActive ? systemStatus : "SYSTEM STANDBY"}
            </div>
            
            <button 
                onClick={onToggle}
                className={`p-6 rounded-full border-2 transition-all duration-300 transform hover:scale-105 active:scale-95 ${
                    isActive 
                    ? 'border-omega-accent bg-omega-accent/10 shadow-[0_0_30px_rgba(0,240,255,0.4)]' 
                    : 'border-gray-600 bg-gray-800/50 hover:border-gray-400'
                }`}
            >
                {isActive ? <Mic size={32} className="text-white" /> : <MicOff size={32} className="text-gray-500" />}
            </button>
            
            <p className="text-gray-500 text-xs font-mono">
                {isActive ? "LISTENING // INTERRUPTIBLE" : "TAP TO INITIALIZE OMEGA LIVE"}
            </p>
        </div>

        {/* Decorative Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-20" 
             style={{ backgroundImage: 'linear-gradient(rgba(0, 240, 255, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 240, 255, 0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} 
        />
    </div>
  );
};