import { Sun, Sunset, Moon, Film, Sparkles, type LucideIcon } from 'lucide-react';
import { useState } from 'react';

interface SceneButtonProps {
  width: number;
  height: number;
  sceneName: string;
  icon: string;
  color: string;
}

const iconMap: Record<string, LucideIcon> = {
  'Sun': Sun,
  'Sunset': Sunset,
  'Moon': Moon,
  'Film': Film,
  'Sparkles': Sparkles,
};

export function SceneButton({ width, height, sceneName, icon, color }: SceneButtonProps) {
  const [isActive, setIsActive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  const IconComponent = iconMap[icon] || Sparkles;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: isActive ? `${color}44` : 'rgba(30, 39, 73, 0.4)',
        backdropFilter: 'blur(10px)',
        border: `2px solid ${isActive ? color : `${color}66`}`,
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: isActive ? `0 8px 32px ${color}66` : `0 4px 16px ${color}22`,
        transition: 'all 0.3s ease',
        transform: isPressed ? 'scale(0.95)' : 'scale(1)',
      }}
      onClick={() => setIsActive(!isActive)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <IconComponent 
        size={32} 
        style={{ 
          color: isActive ? color : 'rgba(255, 255, 255, 0.6)',
          filter: isActive ? `drop-shadow(0 0 12px ${color})` : 'none',
          transition: 'all 0.3s ease',
        }} 
      />
      <div style={{
        color: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.7)',
        fontSize: '15px',
        fontWeight: '600',
        textAlign: 'center',
        transition: 'color 0.3s ease',
      }}>
        {sceneName}
      </div>

      {/* Active indicator glow */}
      {isActive && (
        <div style={{
          position: 'absolute',
          inset: '-2px',
          background: `linear-gradient(135deg, ${color}44, transparent)`,
          borderRadius: '16px',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
