import { 
  Home, Sofa, ChefHat, Bed, Baby, Bath, Briefcase, 
  UtensilsCrossed, Car, Trees, type LucideIcon 
} from 'lucide-react';
import { useState } from 'react';

interface RoomCardProps {
  width: number;
  height: number;
  roomName: string;
  icon: string;
  color: string;
}

const iconMap: Record<string, LucideIcon> = {
  'Home': Home,
  'Sofa': Sofa,
  'ChefHat': ChefHat,
  'Bed': Bed,
  'Baby': Baby,
  'Bath': Bath,
  'Briefcase': Briefcase,
  'UtensilsCrossed': UtensilsCrossed,
  'Car': Car,
  'Trees': Trees,
};

export function RoomCard({ width, height, roomName, icon, color }: RoomCardProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  
  const IconComponent = iconMap[icon] || Home;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
        background: `linear-gradient(135deg, ${color}22, ${color}11)`,
        backdropFilter: 'blur(10px)',
        border: `2px solid ${color}66`,
        borderRadius: '20px',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        cursor: 'pointer',
        position: 'relative',
        boxShadow: isHovered ? `0 12px 40px ${color}44` : `0 8px 24px ${color}22`,
        transition: 'all 0.3s ease',
        transform: isPressed ? 'scale(0.95)' : isHovered ? 'scale(1.03)' : 'scale(1)',
      }}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsPressed(false);
        setIsHovered(false);
      }}
    >
      <IconComponent 
        size={48} 
        style={{ 
          color: color,
          filter: `drop-shadow(0 0 16px ${color}88)`,
          transition: 'all 0.3s ease',
        }} 
      />
      <div style={{
        color: '#ffffff',
        fontSize: '16px',
        fontWeight: '600',
        textAlign: 'center',
        textShadow: `0 2px 8px ${color}66`,
      }}>
        {roomName}
      </div>

      {/* Hover glow effect */}
      {isHovered && (
        <div style={{
          position: 'absolute',
          inset: '-2px',
          background: `linear-gradient(135deg, ${color}55, transparent)`,
          borderRadius: '20px',
          pointerEvents: 'none',
        }} />
      )}
    </div>
  );
}
