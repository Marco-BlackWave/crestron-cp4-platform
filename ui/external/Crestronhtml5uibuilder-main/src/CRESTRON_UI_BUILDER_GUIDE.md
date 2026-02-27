# Crestron UI Builder - Professional HTML5 Interface Designer

A complete, production-ready visual editor for creating Crestron HTML5 touchpanel interfaces with full join management and code export capabilities.

## ⚡ NEW FEATURES - Enhanced Edition

### 🎯 Multi-Selection & Alignment
- **Rectangle Selection**: Drag on canvas to select multiple elements
- **Ctrl+Click**: Toggle individual elements in/out of selection
- **Alignment Tools**: Left, Right, Top, Bottom, Center (H/V)
- **Distribution**: Even spacing horizontally or vertically
- **Floating Toolbar**: Appears when elements are selected

### 🔄 Undo/Redo System
- **Full History**: Complete undo/redo for all operations
- **Keyboard Shortcuts**: Ctrl+Z (undo), Ctrl+Y (redo)
- **Toolbar Buttons**: Visual undo/redo controls
- **Smart History**: Tracks all changes to project state

### 📋 Copy/Paste/Duplicate
- **Copy**: Ctrl+C to copy selected elements
- **Paste**: Ctrl+V to paste with offset
- **Duplicate**: Ctrl+D for quick duplication
- **Preserves**: All properties, joins, and styles

### 📱 Device/Panel Presets
- **Crestron Panels**: TST-700, TST-1000, TST-1500, TSX-1060, CHR-70
- **Apple Devices**: iPhone SE/14/15, iPad Mini/Air/Pro (all sizes)
- **Android Tablets**: 7", 10", Samsung Tab S9
- **Auto-Scale**: Intelligent element scaling when changing devices
- **Custom Sizes**: Define your own panel dimensions

### 🎨 Canvas Enhancements
- **Snap to Grid**: Toggle with 'S' key, configurable grid size
- **Grid Display**: Toggle with 'G' key, visual alignment aid
- **Enhanced Zoom**: 10%-300% zoom range with controls
- **Selection Rectangle**: Visual feedback during multi-select

### 🔍 Join Inspector
- **Join Analysis**: View all joins used across entire project
- **Duplicate Detection**: Identify joins used multiple times
- **Filtering**: Filter by Digital, Analog, or Serial
- **Statistics**: Total join count by type
- **Page Context**: See which page/element uses each join

### ⚡ Layer Management
- **Bring to Front**: Move selected elements to top
- **Send to Back**: Move selected elements to bottom
- **Z-Index Control**: Manage element stacking order
- **Visual Feedback**: See layer changes in real-time

### ⌨️ Enhanced Keyboard Shortcuts
- **Select All**: Ctrl+A to select all elements on page
- **Deselect**: Escape to clear selection
- **Multi-Select**: Ctrl+Click to toggle selection
- **Quick Actions**: Copy, paste, duplicate all via keyboard

## 🎯 Overview

This application provides a comprehensive suite for designing and building Crestron HTML5 user interfaces with:
- Visual drag-and-drop interface design
- Complete Crestron join configuration (Digital, Analog, Serial)
- Multi-page project management
- Template and library systems
- Professional HTML5 code export with runtime

## 🚀 Quick Start

1. **Create Elements**: Drag components from the Library panel onto the Canvas
2. **Configure Properties**: Select elements to edit position, size, and appearance
3. **Set Joins**: Configure Crestron joins in the Properties panel
4. **Export**: Generate production-ready HTML5 code

## 📋 Features

### Visual Editor
- **Canvas**: Infinite canvas with zoom (10%-300%) and pan controls
- **Grid System**: Visual grid for alignment with snap-to-grid
- **Real-time Preview**: See your UI as you build it
- **Multi-selection**: Rectangle drag + Ctrl+Click selection
- **Alignment Tools**: 8 alignment options (left, right, top, bottom, center H/V, distribute H/V)

### Component Library
Built-in components:
- **Button**: Interactive buttons with press/release/feedback joins
- **Slider**: Horizontal/vertical sliders with analog value joins
- **Gauge**: Visual feedback gauges for analog values
- **Text**: Dynamic text labels with serial joins
- **Image**: Static or dynamic images
- **Keypad**: Numeric keypad interface
- **List**: Scrollable list views
- **Subpage**: Nested page containers

### Join Configuration

#### Digital Joins (Boolean)
- Button press/release
- Feedback states
- On/off indicators
- Range: true/false

#### Analog Joins (Numeric)
- Slider values
- Volume levels
- Position indicators
- Range: 0-65535

#### Serial Joins (Text)
- Dynamic text content
- Labels and displays
- Data strings
- Image URLs

### Project Management

#### Pages
- Create multiple pages
- Organize pages in tree structure
- Page-specific settings (size, background)
- Quick navigation between pages

#### Templates
- Save current project as template
- Import/export templates (.crestron-template)
- Apply templates to new projects
- Pre-built template library (expandable)

#### Libraries
- Create custom component libraries
- Save frequently used elements
- Import/export libraries
- Share components across projects

### File Operations

#### Save/Load
- **Save**: Quick save to .crestron file
- **Save As**: Save with new name
- **Load**: Open existing projects
- Auto-save capability (in settings)

#### Export HTML5
- Clean, production-ready HTML5 code
- Optional Crestron WebSocket runtime
- Page selection for export
- Embedded CSS and JavaScript
- Code preview before export

## 🎮 Controls

### Keyboard Shortcuts
- `Delete` / `Backspace`: Delete selected element(s)
- `Ctrl+Z` / `Cmd+Z`: Undo
- `Ctrl+Y` / `Cmd+Y`: Redo
- `Ctrl+C` / `Cmd+C`: Copy selected elements
- `Ctrl+V` / `Cmd+V`: Paste elements
- `Ctrl+D` / `Cmd+D`: Duplicate selected elements
- `Ctrl+A` / `Cmd+A`: Select all elements on current page
- `Escape`: Deselect all
- `G`: Toggle grid visibility
- `S`: Toggle snap to grid

### Mouse Controls
- **Click**: Select element
- **Ctrl+Click**: Toggle element selection (multi-select)
- **Drag on Canvas**: Draw selection rectangle (multi-select)
- **Drag Element**: Move element
- **Shift + Drag** or **Middle Mouse + Drag**: Pan canvas
- **Corner Handle**: Resize element
- **Zoom Controls**: Use toolbar buttons

## 🔧 Properties Panel

### Basic Properties
- Name (for identification)
- Position (X, Y)
- Size (Width, Height)
- Type-specific properties (text, orientation, min/max)

### Join Configuration
Per component type:
- Press Join (digital)
- Release Join (digital)
- Feedback Join (digital/analog)
- Value Join (analog)
- Text Join (serial)

Each join includes:
- Join type selection
- Join number (1-65535)
- Optional description

### Style Properties
- Background color
- Text color
- Border (color, width, radius)
- Font (size, family)
- Opacity

## 📤 Export Details

### HTML5 Export Options

**Include Crestron Runtime**: Generates complete WebSocket integration
```javascript
// Auto-generated runtime includes:
- WebSocket connection management
- Join state management (digital, analog, serial)
- Event handling
- Auto-reconnect on disconnect
- Message parsing and routing
```

**Generated Code Structure**:
```html
<!DOCTYPE html>
<html>
  <head>
    <style>/* Embedded styles */</style>
  </head>
  <body>
    <!-- Pages and elements -->
    <script>
      // Crestron runtime
      class CrestronBridge { ... }
      // Element interaction handlers
    </script>
  </body>
</html>
```

### WebSocket Integration

Default connection settings (configurable in Settings):
- Host: localhost
- Port: 49200
- Protocol: WebSocket (ws://)

Message format:
```json
{
  "type": "digital|analog|serial",
  "join": 1,
  "value": true|123|"text"
}
```

## 🎨 Workflow Example

### Creating a Volume Control UI

1. **Add Slider**:
   - Drag slider from library
   - Position at desired location
   - Set width: 300, height: 60

2. **Configure Joins**:
   - Value Join: Analog #1 (volume level)
   - Feedback Join: Analog #1 (position feedback)

3. **Add Text Display**:
   - Drag text component
   - Position above slider
   - Text Join: Serial #1 (volume percentage)

4. **Add Mute Button**:
   - Drag button component
   - Set text: "Mute"
   - Press Join: Digital #1
   - Feedback Join: Digital #1 (mute state)

5. **Export**:
   - Click "Export HTML5"
   - Select page
   - Enable runtime
   - Download HTML file

## 🔌 Integration with Crestron

### SIMPL/SIMPL+ Integration

In your Crestron program:
1. Add HTML5 WebSocket server module
2. Configure port (default 49200)
3. Map joins to your HTML5 UI:
   - Digital joins → buttons, switches
   - Analog joins → sliders, gauges
   - Serial joins → text displays

### Testing

1. Export HTML5 file
2. Host on Crestron processor or web server
3. Open in browser
4. WebSocket will auto-connect to processor
5. Test join interactions

## 📁 File Formats

### .crestron (Project Files)
JSON format containing:
- Project metadata
- All pages and elements
- Templates
- Libraries
- Settings

### .crestron-template (Template Files)
JSON format containing:
- Template metadata
- Pages structure
- Element configurations

### .crestron-library (Library Files)
JSON format containing:
- Library metadata
- Component definitions

### .html (Exported UI)
Complete HTML5 file with embedded:
- Styles (CSS)
- Structure (HTML)
- Runtime (JavaScript)

## 🛠️ Settings

Access via Settings button in toolbar:

- **General**:
  - Auto-save
  - Grid visibility
  - Snap to grid
  
- **Crestron Connection**:
  - Default host
  - Default port
  
- **Canvas**:
  - Default page size
  - Background color

## 💡 Tips & Best Practices

### Organization
- Use descriptive element names
- Group related elements on same page
- Create subpages for complex interfaces
- Utilize templates for repeated layouts

### Join Management
- Document join numbers in descriptions
- Use consistent join numbering scheme
- Test joins incrementally
- Keep join numbers within your system's limits

### Performance
- Optimize page sizes for target devices
- Minimize complex graphics
- Test on actual hardware when possible
- Use appropriate image formats

### Templates
- Save common layouts as templates
- Document template usage
- Share templates with team
- Version control your templates

## 🔍 Troubleshooting

### Element Not Responding
- Check join configuration
- Verify join numbers match processor
- Test WebSocket connection
- Check browser console for errors

### Export Issues
- Ensure all elements have valid properties
- Check for special characters in text
- Verify page dimensions
- Review generated code in preview

### WebSocket Connection
- Verify processor IP/hostname
- Check port configuration
- Ensure firewall allows connection
- Test with browser developer tools

## 📚 Component Reference

### Button
- **Joins**: Press (D), Release (D), Feedback (D)
- **States**: Default, Pressed, Active
- **Properties**: Text, Icon, Colors

### Slider
- **Joins**: Value (A), Feedback (A)
- **Properties**: Min, Max, Orientation
- **Range**: 0-65535

### Gauge
- **Joins**: Value (A)
- **Properties**: Min, Max
- **Visual**: Circular or linear fill

### Text
- **Joins**: Text (S)
- **Properties**: Font, Color, Alignment
- **Use**: Dynamic labels, status displays

### Image
- **Joins**: URL (S)
- **Properties**: Source URL
- **Formats**: PNG, JPG, SVG

## 🎯 Advanced Features

### Custom Components
- Save configured elements to libraries
- Reuse across projects
- Share with team

### Multi-Page Navigation
- Link buttons to page changes
- Create navigation structures
- Implement subpage popups

### Responsive Design
- Configure for different resolutions
- Test on multiple devices
- Use percentage-based sizing (coming soon)

## 🔄 Updates & Roadmap

Current Version: 2.0 - Enhanced Edition

**✅ Completed Features (v2.0)**:
- ✅ Multi-element selection (rectangle drag + Ctrl+Click)
- ✅ Copy/paste/duplicate elements
- ✅ Undo/redo system with full history
- ✅ Grid snapping (toggle with 'S')
- ✅ Alignment tools (8 alignment options)
- ✅ Layer management (bring to front/send to back)
- ✅ Device/Panel presets with auto-scaling
- ✅ Join Inspector with duplicate detection
- ✅ Enhanced keyboard shortcuts
- ✅ Visual selection feedback

**🔮 Planned Features (v3.0)**:
- [ ] Component grouping/ungrouping
- [ ] Element locking
- [ ] Animation support
- [ ] Theme system with presets
- [ ] Cloud sync
- [ ] Collaboration features
- [ ] More device presets
- [ ] Custom color palettes
- [ ] Component preview mode
- [ ] Advanced grid/ruler system

## 📞 Support

For issues, feature requests, or questions:
- Check Help modal (? button in toolbar)
- Review this documentation
- Test with simple configurations first
- Verify Crestron processor configuration

## 📄 License

Professional Crestron UI Builder
Created for rapid HTML5 touchpanel development

---

**Note**: This tool generates standard HTML5/CSS/JavaScript. The exported files are compatible with Crestron HTML5 capable devices and can be hosted on Crestron processors or web servers.