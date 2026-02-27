import { Lightbulb, Lamp, LampFloor, Sun, Sunset, Moon, Film } from 'lucide-react';
import { useState } from 'react';

interface LightZoneCardProps {
  width: number;
  height: number;
  zoneName: string;
  icon: string;
  color: string;
  initialValue?: number;
}

const iconMap: Record<string, any> = {
  'Lightbulb': Lightbulb,
  'Lamp': Lamp,
  'LampFloor': LampFloor,
  'Sun': Sun,
  'Sunset': Sunset,
  'Moon': Moon,
  'Film': Film,
};

export function LightZoneCard({ width, height, zoneName, icon, color, initialValue = 50 }: LightZoneCardProps) {
  const [value, setValue] = useState(initialValue);
  const [isPressed, setIsPressed] = useState(false);
  
  const IconComponent = iconMap[icon] || Lightbulb;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: 'rgba(30, 39, 73, 0.4)',
        backdropFilter: 'blur(10px)',
        border: `2px solid ${color}88`,
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        position: 'relative',
        boxShadow: `0 8px 32px ${color}33`,
        transition: 'all 0.3s ease',
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      {/* Icon and Name */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
      }}>
        <IconComponent 
          size={40} 
          style={{ 
            color: value > 0 ? color : 'rgba(255, 255, 255, 0.3)',
            filter: value > 0 ? `drop-shadow(0 0 12px ${color})` : 'none',
            transition: 'all 0.3s ease',
          }} 
        />
        <div style={{
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '16px',
          fontWeight: '500',
          textAlign: 'center',
        }}>
          {zoneName}
        </div>
      </div>

      {/* Slider Container */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '0 8px',
      }}>
        {/* Slider Track */}
        <div style={{
          flex: 1,
          height: '8px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '4px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Slider Fill */}
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            height: '100%',
            width: `${value}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            borderRadius: '4px',
            transition: 'width 0.2s ease',
            boxShadow: `0 0 12px ${color}66`,
          }} />
          
          {/* Slider Thumb */}
          <div style={{
            position: 'absolute',
            left: `${value}%`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '20px',
            height: '20px',
            background: color,
            borderRadius: '50%',
            border: '2px solid white',
            boxShadow: `0 0 16px ${color}, 0 2px 8px rgba(0,0,0,0.4)`,
            transition: 'left 0.2s ease',
          }} />
        </div>

        {/* Value Display */}
        <div style={{
          minWidth: '50px',
          textAlign: 'right',
          color: color,
          fontSize: '16px',
          fontWeight: '600',
          textShadow: `0 0 8px ${color}66`,
        }}>
          {value}%
        </div>
      </div>

      {/* Glow effect when active */}
      {value > 0 && (
        <div style={{
          position: 'absolute',
          inset: '-2px',
          background: `linear-gradient(135deg, ${color}33, transparent)`,
          borderRadius: '20px',
          pointerEvents: 'none',
          opacity: isPressed ? 1 : 0.5,
          transition: 'opacity 0.3s ease',
        }} />
      )}
    </div>
  );
}
