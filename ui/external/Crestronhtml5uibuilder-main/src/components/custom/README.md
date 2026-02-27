# Custom Crestron Components

## 🎯 COME FUNZIONA

Metti **QUALSIASI componente JSX/TSX** in questa cartella e diventa automaticamente Crestron-compatible!

## 📋 STEPS

### 1. Crea il tuo componente UI (100% fedeltà - nessuna modifica!)

```tsx
// MediaPlayerUI.tsx
export function MediaPlayerUI({ 
  title = "Now Playing",
  artist = "Artist Name",
  onPlay,
  onPause,
  onNext,
  onPrev,
  volume = 50
}) {
  return (
    <div className="your-exact-design">
      {/* Il tuo JSX esattamente come lo hai progettato */}
    </div>
  );
}
```

### 2. Registralo in registry.ts

```tsx
import { MediaPlayerUI } from './MediaPlayerUI';

export const customComponents = [
  {
    type: 'custom-media-player',
    name: 'Media Player Pro',
    icon: 'Music',
    component: MediaPlayerUI,
    defaultProps: {
      width: 400,
      height: 300
    },
    joins: {
      digital: [
        { name: 'Play', defaultJoin: 20 },
        { name: 'Pause', defaultJoin: 21 },
        { name: 'Next', defaultJoin: 22 },
        { name: 'Prev', defaultJoin: 23 }
      ],
      analog: [
        { name: 'Volume', defaultJoin: 10 }
      ],
      serial: [
        { name: 'Title', defaultJoin: 5 },
        { name: 'Artist', defaultJoin: 6 }
      ]
    }
  }
];
```

### 3. FATTO! ✅

Il componente ora:
- ✅ Appare nella LibrarySidebar
- ✅ Drag & drop funziona
- ✅ Joins obbligatori visibili
- ✅ Properties panel completo
- ✅ Export HTML5 ready
- ✅ **UI identica al 100%!**

## 🎨 ESEMPI INCLUSI

- `MediaPlayerUI.tsx` - Media player professionale
- `ThermostatUI.tsx` - Termostato circolare
- `LightZoneCard.tsx` - Card controllo luci

## 🔥 FEATURES

- **Zero breaking changes** - Il tuo JSX rimane identico
- **Auto WebSocket** - Joins mappati automaticamente
- **Export ready** - HTML5 production-ready
- **Type-safe** - TypeScript completo
