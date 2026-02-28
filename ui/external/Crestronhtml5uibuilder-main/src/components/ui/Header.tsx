import { CrestronElement } from '../../types/crestron';
import { Home, Menu, Settings, User, Bell, Search } from 'lucide-react';

interface HeaderProps {
  element: CrestronElement;
  isPreview?: boolean;
  onDigitalJoin?: (join: number, value: boolean) => void;
}

export function Header({ element, isPreview = false, onDigitalJoin }: HeaderProps) {
  const config = element.config || {};
  const title = config.title || 'Header Title';
  const subtitle = config.subtitle || '';
  const showLogo = config.showLogo !== false;
  const showMenu = config.showMenu !== false;
  const showSettings = config.showSettings !== false;
  const showNotifications = config.showNotifications !== false;
  const showSearch = config.showSearch !== false;
  const backgroundColor = config.backgroundColor || '#18181b';
  const textColor = config.textColor || '#ffffff';
  const logoText = config.logoText || 'LOGO';
  const alignment = config.alignment || 'space-between';

  const handleMenuClick = () => {
    if (element.digitalJoin && onDigitalJoin) {
      onDigitalJoin(element.digitalJoin, true);
      setTimeout(() => onDigitalJoin(element.digitalJoin!, false), 200);
    }
  };

  const handleSettingsClick = () => {
    if (element.digitalJoin && onDigitalJoin) {
      onDigitalJoin(element.digitalJoin + 1, true);
      setTimeout(() => onDigitalJoin(element.digitalJoin! + 1, false), 200);
    }
  };

  const handleNotificationsClick = () => {
    if (element.digitalJoin && onDigitalJoin) {
      onDigitalJoin(element.digitalJoin + 2, true);
      setTimeout(() => onDigitalJoin(element.digitalJoin! + 2, false), 200);
    }
  };

  const handleSearchClick = () => {
    if (element.digitalJoin && onDigitalJoin) {
      onDigitalJoin(element.digitalJoin + 3, true);
      setTimeout(() => onDigitalJoin(element.digitalJoin! + 3, false), 200);
    }
  };

  return (
    <div
      className="w-full h-full flex items-center px-6 shadow-lg"
      style={{ 
        backgroundColor,
        justifyContent: alignment,
      }}
    >
      {/* Left Section */}
      <div className="flex items-center gap-4">
        {showMenu && (
          <button
            onClick={handleMenuClick}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            style={{ color: textColor }}
          >
            <Menu className="w-6 h-6" />
          </button>
        )}

        {showLogo && (
          <div 
            className="font-bold text-xl tracking-wide"
            style={{ color: textColor }}
          >
            {logoText}
          </div>
        )}

        <div>
          <div 
            className="font-semibold text-lg"
            style={{ color: textColor }}
          >
            {title}
          </div>
          {subtitle && (
            <div 
              className="text-sm opacity-70"
              style={{ color: textColor }}
            >
              {subtitle}
            </div>
          )}
        </div>
      </div>

      {/* Right Section */}
      <div className="flex items-center gap-2">
        {showSearch && (
          <button
            onClick={handleSearchClick}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            style={{ color: textColor }}
          >
            <Search className="w-5 h-5" />
          </button>
        )}

        {showNotifications && (
          <button
            onClick={handleNotificationsClick}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors relative"
            style={{ color: textColor }}
          >
            <Bell className="w-5 h-5" />
            {config.notificationCount && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        )}

        {showSettings && (
          <button
            onClick={handleSettingsClick}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            style={{ color: textColor }}
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}