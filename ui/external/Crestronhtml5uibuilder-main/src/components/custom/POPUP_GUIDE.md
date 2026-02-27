# 🎯 Crestron Popup Guide

## Come creare Popup in Crestron HTML5

Le **popup** sono elementi essenziali nelle interfacce Crestron professionali. Ecco come funzionano:

---

## 📦 Componente: Popup Container

### Caratteristiche:
✅ Show/Hide tramite **Digital Join**  
✅ **Overlay scuro** semi-trasparente  
✅ **Pulsante Close** con feedback join  
✅ **4 varianti** di stile (info, warning, error, success)  
✅ **Titolo e messaggio** tramite Serial Join  

---

## 🎮 Join Configuration

### Digital Joins:
- **D100**: Show/Hide (1 = mostra, 0 = nascondi)
- **D101**: Close button press (feedback al processore)

### Serial Joins:
- **S100**: Titolo del popup
- **S101**: Messaggio/contenuto

---

## 💡 Come usarlo:

### 1️⃣ Trascina il componente sul canvas
- Vai in **Components** > **🎨 Custom Components**
- Trascina **"Popup Container"** sul canvas

### 2️⃣ Configura i Join
- Doppio click sul componente
- Imposta i join numbers (default: D100, S100)

### 3️⃣ Nel tuo programma Crestron (SIMPL+/C#):

```csharp
// Mostra popup
DigitalOutput[100] = 1;

// Imposta titolo
SerialOutput[100] = "Attenzione!";

// Imposta messaggio
SerialOutput[101] = "Temperatura troppo alta";

// Quando l'utente clicca X, ricevi:
if (DigitalInput[101] == 1) {
    // User pressed close
    DigitalOutput[100] = 0; // Hide popup
}
```

---

## 🎨 Varianti disponibili:

### Info (blu):
```javascript
config: { variant: 'info' }
```

### Warning (giallo):
```javascript
config: { variant: 'warning' }
```

### Error (rosso):
```javascript
config: { variant: 'error' }
```

### Success (verde):
```javascript
config: { variant: 'success' }
```

---

## 🔥 Esempi pratici:

### Alert temperatura
```
Digital Join 100: Show/Hide
Serial Join 100: "Temperature Alert"
Serial Join 101: "Room temperature is 85°F"
```

### Conferma azione
```
Digital Join 200: Show/Hide  
Serial Join 200: "Confirm Action"
Serial Join 201: "Are you sure you want to turn off all lights?"
```

### Notifica sistema
```
Digital Join 300: Show/Hide
Serial Join 300: "System Status"
Serial Join 301: "All systems operational"
```

---

## 🎯 Best Practices:

1. **Usa join numbers alti** (es. 100+) per evitare conflitti
2. **Nascondi sempre dopo azione** per non bloccare l'interfaccia
3. **Usa varianti appropriate**: error per errori, warning per avvisi
4. **Testa su dispositivo reale** prima del deploy

---

## 📱 Export HTML5:

Quando esporti, il codice include:
- ✅ Gestione WebSocket Crestron
- ✅ Show/hide automatico via digital join
- ✅ Aggiornamento testo real-time
- ✅ Feedback pulsante close

---

**Fatto! Ora hai popup professionali per le tue interfacce Crestron! 🚀**
