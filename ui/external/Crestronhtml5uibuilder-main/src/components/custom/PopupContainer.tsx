import { X, AlertTriangle } from 'lucide-react';
import { CrestronElement } from '../../types/crestron';

interface PopupContainerProps {
  element: CrestronElement;
}

/**
 * POPUP CONTAINER - Crestron Custom Component
 * 
 * A modal/popup container that shows/hides via digital join.
 * Perfect for dialogs, alerts, settings panels, etc.
 * 
 * Digital Joins:
 * - Show: Toggle popup visibility (1 = show, 0 = hide)
 * - Close: Close button press feedback
 * 
 * Serial Joins:
 * - Title: Popup title text
 * - Message: Popup content/message
 */
export function PopupContainer({ element }: PopupContainerProps) {
  const width = element.width || 500;
  const height = element.height || 400;
  
  // Extract joins - with safe defaults
  const showJoin = element.joins?.digital || 100;
  const closeJoin = showJoin + 1;
  const titleJoin = element.joins?.serial || 100;
  const messageJoin = titleJoin + 1;
  
  // Extract config
  const title = element.config?.title || element.name || 'Alert';
  const message = element.config?.message || 'Popup content goes here';
  const variant = element.config?.variant || 'info'; // 'info', 'warning', 'error', 'success'
  
  // Variant styles
  const variantConfig = {
    info: {
      color: '#3b82f6',
      bg: '#1e3a8a',
      icon: AlertTriangle,
    },
    warning: {
      color: '#f59e0b',
      bg: '#78350f',
      icon: AlertTriangle,
    },
    error: {
      color: '#ef4444',
      bg: '#7f1d1d',
      icon: AlertTriangle,
    },
    success: {
      color: '#10b981',
      bg: '#064e3b',
      icon: AlertTriangle,
    },
  };
  
  const config = variantConfig[variant as keyof typeof variantConfig] || variantConfig.info;
  const Icon = config.icon;

  return (
    <div 
      className="relative flex items-center justify-center"
      style={{ width: `${width}px`, height: `${height}px`, background: '#09090b' }}
    >
      {/* Backdrop overlay effect */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Popup card */}
      <div 
        className="relative rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        style={{
          width: '90%',
          height: '80%',
          backgroundColor: '#18181b',
          border: `2px solid ${config.color}`,
          boxShadow: `0 0 40px ${config.color}40`,
        }}
      >
        {/* Header */}
        <div 
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ 
            borderColor: `${config.color}40`,
            background: `linear-gradient(to right, ${config.bg}40, transparent)`,
          }}
        >
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${config.color}20` }}
          >
            <Icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate">
              {title}
            </h3>
          </div>
          
          <div className="relative">
            <button
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
              style={{ color: config.color }}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="absolute -bottom-5 right-0 text-[9px] font-mono px-1 py-0.5 rounded bg-black/50 text-white whitespace-nowrap">
              D{closeJoin}
            </div>
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs text-zinc-300 leading-relaxed mb-3">
            {message}
          </p>
          
          {/* Join Info Box */}
          <div 
            className="p-3 rounded-lg border text-[10px] leading-relaxed space-y-1"
            style={{ 
              backgroundColor: `${config.color}10`,
              borderColor: `${config.color}30`,
              color: config.color,
            }}
          >
            <div><strong>D{showJoin}:</strong> Show/Hide (1=show, 0=hide)</div>
            <div><strong>D{closeJoin}:</strong> Close button press</div>
            <div><strong>S{titleJoin}:</strong> Title text</div>
            <div><strong>S{messageJoin}:</strong> Message text</div>
          </div>
        </div>
        
        {/* Top-right badge showing main join */}
        <div className="absolute top-2 right-2">
          <div 
            className="px-2 py-1 rounded text-[10px] font-mono font-bold shadow-lg"
            style={{ backgroundColor: config.color, color: 'white' }}
          >
            SHOW: D{showJoin}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export metadata for registry
export const PopupContainerMeta = {
  name: 'Popup Container',
  type: 'popup-container',
  icon: 'Box',
  description: 'Modal/popup container with show/hide control',
  category: 'Containers',
  defaultProps: {
    width: 500,
    height: 400,
    title: 'Popup Title',
    showOverlay: true,
    showCloseButton: true,
    backgroundColor: '#18181b',
    borderColor: '#3b82f6',
    overlayColor: 'rgba(0, 0, 0, 0.7)',
  },
  joins: {
    digital: {
      show: { offset: 0, label: 'Show/Hide Popup' },
      close: { offset: 1, label: 'Close Button Press' },
    },
    serial: {
      title: { offset: 0, label: 'Popup Title' },
      content: { offset: 1, label: 'Content Text' },
    },
  },
};