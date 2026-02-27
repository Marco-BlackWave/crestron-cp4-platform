# 🚀 CUSTOM COMPONENTS - QUICK START

## ✨ SISTEMA UNIVERSALE - 120% UI FIDELITY

Drop **QUALSIASI componente JSX/TSX** in `/components/custom/` e diventa automaticamente Crestron-compatible!

---

## 📦 COSA È INCLUSO

### 3 Esempi Pronti:
1. **MediaPlayerUI.tsx** - Media player con play/pause, volume, progress
2. **ThermostatUI.tsx** - Termostato circolare con controllo temperatura
3. **LightZoneCard.tsx** - Card per controllo luci con slider

### Sistema Auto-Registration:
- `registry.ts` - Registra i componenti e mappa i joins Crestron
- Appare automaticamente in LibrarySidebar (categoria "🎨 Custom Components")
- Drag & drop funziona out-of-the-box!

---

## 🎯 COME AGGIUNGERE IL TUO COMPONENTE

### STEP 1: Crea il componente UI (100% fedeltà)

```tsx
// /components/custom/MyAwesomeComponent.tsx

export interface MyAwesomeComponentProps {
  title?: string;
  value?: number;
  onButtonClick?: () => void;
}

export function MyAwesomeComponent({
  title = 'Hello',
  value = 50,
  onButtonClick
}: MyAwesomeComponentProps) {
  return (
    <div className="w-full h-full bg-gradient-to-br from-blue-900 to-purple-900 rounded-3xl p-8">
      <h1 className="text-white text-2xl mb-4">{title}</h1>
      <div className="text-4xl text-white">{value}%</div>
      <button
        onClick={onButtonClick}
        className="mt-6 px-6 py-3 bg-white text-blue-900 rounded-lg"
      >
        Click Me!
      </button>
    </div>
  );
}
```

### STEP 2: Registra in registry.ts

```tsx
// Aggiungi all'array customComponents:

{
  type: 'custom-my-awesome',  // Must start with 'custom-'
  name: 'My Awesome Component',
  icon: 'Zap',  // Lucide icon name
  component: MyAwesomeComponent,
  defaultProps: {
    width: 400,
    height: 300,
  },
  joins: {
    digital: [
      { name: 'Button Click', defaultJoin: 100 }
    ],
    analog: [
      { name: 'Value', defaultJoin: 50 }
    ],
    serial: [
      { name: 'Title', defaultJoin: 25 }
    ]
  },
  category: 'Custom'
}
```

### STEP 3: DONE! ✅

Il componente ora:
- ✅ Appare nella sidebar "🎨 Custom Components"
- ✅ Drag & drop funziona
- ✅ Joins configurabili (digital 100, analog 50, serial 25)
- ✅ Properties panel automatico
- ✅ Export HTML5 con WebSocket Crestron
- ✅ **UI IDENTICA AL 100%!**

---

## 🔥 FEATURES

### 1. Zero Breaking Changes
Il tuo JSX/TSX rimane **identico** - nessuna modifica richiesta!

### 2. Auto WebSocket Integration
I joins vengono mappati automaticamente:
```html
<!-- Export HTML5 -->
<div data-digital-join="100" data-analog-join="50" data-serial-join="25">
  <MyAwesomeComponent ... />
</div>
```

### 3. Type-Safe
TypeScript completo con props interfaces

### 4. Production Ready
Export HTML5 + Crestron CH5 ready!

---

## 📋 PROPS MAPPING

| UI Prop | Crestron Join | Type |
|---------|---------------|------|
| `onButtonClick` | digital | Button press |
| `value` | analog | Slider value 0-100 |
| `title` | serial | Text string |

---

## 🎨 BEST PRACTICES

### ✅ DO:
- Use Tailwind CSS for styling (già supportato!)
- Keep components pure UI (no business logic)
- Use TypeScript interfaces for props
- Add descriptions to joins in registry

### ❌ DON'T:
- Don't hard-code Crestron logic in UI component
- Don't use external state management (keep it simple!)
- Don't forget to export your component

---

## 🚀 EXAMPLES

### Media Player
```tsx
<MediaPlayerUI 
  title="Song Name"
  artist="Artist"
  isPlaying={true}
  volume={75}
  onPlay={() => console.log('Play')}
/>
```

### Thermostat
```tsx
<ThermostatUI
  currentTemp={72}
  targetTemp={74}
  mode="COOLING"
  onTempUp={() => console.log('+1°')}
/>
```

### Light Zone
```tsx
<LightZoneCard
  zoneName="Living Room"
  brightness={80}
  isOn={true}
  onToggle={() => console.log('Toggle')}
/>
```

---

## 🎯 NEXT STEPS

1. **Crea il tuo componente** in `/components/custom/YourComponent.tsx`
2. **Registralo** in `registry.ts`
3. **Ricarica l'app** - compare automaticamente!
4. **Drag nel canvas** e customizza joins!

---

## 💡 TIPS

- **Icons**: Usa qualsiasi icona da [Lucide React](https://lucide.dev)
- **Sizes**: defaultProps definisce width/height iniziale
- **Joins**: Numeri joins devono essere univoci nel progetto
- **Category**: Organizza componenti per tipo (Audio, Video, Climate, etc.)

---

## 🆘 TROUBLESHOOTING

**Componente non appare in sidebar?**
- Check che `type` inizi con `custom-`
- Verifica export del componente
- Ricarica la pagina

**Joins non funzionano?**
- Verifica che i numeri join siano univoci
- Check la configurazione in registry.ts
- Guarda la console per errori

**UI diversa dal design?**
- Il componente è 100% tuo - zero modifiche!
- Check Tailwind classes
- Verifica che le props siano passate

---

**🎉 ENJOY! Ora puoi usare QUALSIASI componente JSX/TSX per Crestron!**
