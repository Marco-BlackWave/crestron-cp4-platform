import { X, Download, Upload, Plus } from 'lucide-react';
import { Project, Template } from '../types/crestron';
import { useState } from 'react';
import { createFullSystemTemplate } from '../utils/fullSystemTemplate';
import { createPremiumFullTemplate } from '../utils/premiumTemplate';
import { createRealLuxuryApartmentTemplate } from '../utils/realTemplate';
import { createCompleteSmartHomeTemplate } from '../utils/completeRealTemplate';
import { createCrestronProTemplate } from '../utils/crestronProTemplate';
import { createCrestronProV2Template } from '../utils/crestronProV2Template';
import { createUltraFullTemplate } from '../utils/ultraFullTemplate';
import { smartHomeDashboardTemplate } from '../utils/smartHomeDashboardTemplate';
import { figmaSmartHomeDashboardTemplate } from '../utils/figmaSmartHomeDashboardTemplate';
import { createCrestronEliteTemplate } from '../utils/crestronEliteTemplate';

interface TemplatesModalProps {
  project: Project;
  setProject: (project: Project) => void;
  onClose: () => void;
}

export function TemplatesModal({ project, setProject, onClose }: TemplatesModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const handleImportTemplate = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,.crestron-template';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const template = JSON.parse(event.target?.result as string);
          setProject({
            ...project,
            templates: [...project.templates, template],
          });
        } catch (error) {
          alert('Error importing template');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExportTemplate = (template: Template) => {
    const templateData = JSON.stringify(template, null, 2);
    const blob = new Blob([templateData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.name.replace(/\s+/g, '_')}.crestron-template`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateTemplate = () => {
    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    const newTemplate: Template = {
      id: `template_${Date.now()}`,
      name: templateName,
      description: 'Custom template',
      pages: project.pages.map((page) => ({
        ...page,
        id: `page_${Date.now()}_${Math.random()}`,
      })),
    };

    setProject({
      ...project,
      templates: [...project.templates, newTemplate],
    });
  };

  const handleApplyTemplate = (template: Template) => {
    // Auto-save handles the previous state, apply template directly
    setProject({
      ...project,
      pages: template.pages.map((page) => ({
        ...page,
        id: `page_${Date.now()}_${Math.random()}`,
        elements: page.elements.map((el) => ({
          ...el,
          id: `element_${Date.now()}_${Math.random()}`,
        })),
      })),
    });
    onClose();
  };

  const handleDeleteTemplate = (templateId: string) => {
    // Delete template directly
    setProject({
      ...project,
      templates: project.templates.filter((t) => t.id !== templateId),
    });
  };

  const handleGenerateFullTemplate = (device: { name: string; width: number; height: number }) => {
    const template = createFullSystemTemplate(device.width, device.height, device.name);
    setProject({
      ...project,
      templates: [...project.templates, template],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template "${template.name}" generated successfully!\n\nIncludes:\n• Home dashboard with room navigation\n• ${template.pages.length} total pages\n• 10 room lighting controls\n• Climate/HVAC control\n• Audio/Video zones\n• Security system\n• 6 CCTV cameras\n\nClick on the template below to apply it to your project.`);
    }, 100);
  };

  const handleGeneratePremiumTemplate = (device: { name: string; width: number; height: number }) => {
    const template = createPremiumFullTemplate(device.width, device.height, device.name);
    setProject({
      ...project,
      templates: [...project.templates, template],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template "${template.name}" generated successfully!\n\nIncludes:\n• Home dashboard with room navigation\n• ${template.pages.length} total pages\n• 10 room lighting controls\n• Climate/HVAC control\n• Audio/Video zones\n• Security system\n• 6 CCTV cameras\n\nClick on the template below to apply it to your project.`);
    }, 100);
  };

  const handleGenerateRealLuxuryApartmentTemplate = (device: { name: string; width: number; height: number }) => {
    const template = createRealLuxuryApartmentTemplate(device.width, device.height, device.name);
    setProject({
      ...project,
      templates: [...project.templates, template],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template "${template.name}" generated successfully!\n\n🏢 MODERN LUXURY APARTMENT\n\nIncludes:\n• Home dashboard with quick room access\n• ${template.pages.length} total pages (fully editable!)\n�� Living Room with 4 light zones\n• Bedroom with 3 light zones\n• Kitchen with 3 light zones\n• Quick Scenes page (6 scenes)\n• All with premium glassmorphism design\n\n💡 FULLY EDITABLE: Double-click any element to customize!\n🎨 All Crestron joins pre-configured!\n\nClick on the template below to apply it to your project.`);
    }, 100);
  };

  const handleGenerateCompleteSmartHomeTemplate = (device: { name: string; width: number; height: number }) => {
    const template = createCompleteSmartHomeTemplate(device.width, device.height, device.name);
    setProject({
      ...project,
      templates: [...project.templates, template],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template "${template.name}" generated successfully!\n\n🏠 COMPLETE SMART HOME SYSTEM\n\nIncludes:\n• ${template.pages.length} total pages with sidebar navigation\n• Home dashboard\n• Living Room + Bedroom (lighting controls)\n• Audio/Video (media player + 3 zones)\n• Security (panel + door locks)\n• CCTV Surveillance (6 cameras)\n• Climate Control (3 thermostats)\n• Quick Scenes (6 scenes)\n\n✅ SIDEBAR NAVIGATION: Always visible on iPad!\n💡 FULLY EDITABLE: Double-click any element!\n🎨 ALL JOINS EDITABLE: Every component fully configurable!\n\nClick the template below to apply it to your project.`);
    }, 100);
  };

  const handleGenerateCrestronProTemplate = (device: { name: string; width: number; height: number }) => {
    const template = createCrestronProTemplate(device.width, device.height, device.name);
    setProject({
      ...project,
      templates: [...project.templates, template],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template "${template.name}" generated successfully!\n\n⚡ CRESTRON PRO STYLE INTERFACE\n\nBASED ON REAL CRESTRON DESIGNS!\n\nIncludes:\n• ${template.pages.length} pages with professional sidebar\n• Home Dashboard with room cards\n• Climate Control (circular thermostat with glow)\n• Audio/Video (media player with album art)\n• Pool Control (switches + temperature display)\n• Lighting Control (light zones)\n• Security (camera grid)\n\n✨ PROFESSIONAL FEATURES:\n• Radial gradient backgrounds\n• Modern typography & spacing\n• Glow effects on controls\n• Real Crestron color schemes\n\n💡 FULLY EDITABLE: Double-click any element!\n🎨 ALL JOINS PRE-CONFIGURED!\n\nClick the template below to apply it to your project.`);
    }, 100);
  };

  const handleGenerateCrestronProV2Template = (device: { name: string; width: number; height: number }) => {
    const template = createCrestronProV2Template(device.width, device.height, device.name);
    setProject({
      ...project,
      templates: [...project.templates, template],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template "${template.name}" generated successfully!\n\n⚡ CRESTRON PRO V2 — CSS ADAPTIVE\n\nBased on REAL Crestron Wenner Home screenshots. CSS-adaptive layout that works in both Portrait &amp; Landscape.\nPool/Spa toggles, Climate thermostat ring, Audio player with album art, Lighting zones, Security cameras with real images.\nUse the Rotate button next to the device selector to switch orientation!\n\nClick the template below to apply it to your project.`);
    }, 100);
  };

  const handleGenerateUltraFullTemplate = (device: { name: string; width: number; height: number }) => {
    const template = createUltraFullTemplate(device);
    setProject({
      ...project,
      templates: [...project.templates, template],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template \"${template.name}\" generated successfully!\\n\\n🌟 ULTRA FULL LANDSCAPE TEMPLATE\\n\\nIncludes:\\n• ${template.pages.length} professional landscape pages\\n• Sidebar navigation (HOME, ROOMS, SCENES)\\n• Media Player page with giant player + volume\\n• Lighting Control (4 light zones in 2×2 grid)\\n• Climate Control (large thermostat)\\n• Scenes page (6 scene buttons)\\n\\n✨ FORCED LANDSCAPE: Automatically converts to horizontal!\\n💡 REAL COMPONENTS: Uses actual Crestron components!\\n🎨 ALL JOINS PRE-CONFIGURED!\\n\\nClick the template below to apply it to your project.`);
    }, 100);
  };

  const handleApplySmartHomeDashboard = () => {
    setProject({
      ...project,
      templates: [...project.templates, smartHomeDashboardTemplate],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template "Smart Home Dashboard" added!\\n\\n🏠 COMPLETE CH5 DASHBOARD\\n\\nIncludes:\\n• Home dashboard page (1024×768)\\n• 6 Lighting zones with sliders\\n• Climate control with mode buttons\\n• Audio multiroom (2 zones)\\n• Security panel with arm/disarm\\n• 4 CCTV cameras\\n• All master controls\\n\\n✨ ALL CH5 JOINS PRE-CONFIGURED!\\n💡 READY TO USE: Apply directly to your project!\\n🎨 PROFESSIONAL DESIGN: Dark theme with gradients!\\n\\nClick the template below to apply it to your project.`);
    }, 100);
  };

  const handleApplyFigmaSmartHomeDashboard = () => {
    setProject({
      ...project,
      templates: [...project.templates, figmaSmartHomeDashboardTemplate],
    });
    
    // Show success message
    setTimeout(() => {
      alert(`✅ Template "Figma Smart Home Dashboard" added!\\n\\n🏠 COMPLETE CH5 DASHBOARD\\n\\nIncludes:\\n• Home dashboard page (1024×768)\\n• 6 Lighting zones with sliders\\n• Climate control with mode buttons\\n• Audio multiroom (2 zones)\\n• Security panel with arm/disarm\\n• 4 CCTV cameras\\n• All master controls\\n\\n✨ ALL CH5 JOINS PRE-CONFIGURED!\\n💡 READY TO USE: Apply directly to your project!\\n🎨 PROFESSIONAL DESIGN: Dark theme with gradients!\\n\\nClick the template below to apply it to your project.`);
    }, 100);
  };

  const handleApplyCrestronEliteTemplate = (device: { name: string; width: number; height: number }) => {
    const template = createCrestronEliteTemplate(device.width, device.height, device.name);
    setProject({
      ...project,
      templates: [...project.templates, template],
    });
    
    setTimeout(() => {
      alert(`✅ Template "${template.name}" generated!\n\nCRESTRON ELITE — Percentage-Based Adaptive\n\nIncludes:\n• ${template.pages.length} pages: Home, Climate, Lighting, Audio, Pool/Spa, Security\n• ALL elements use percentage-based positioning\n• Fully resizable — adapts to any resolution\n• Compact glass card design (96px zone cards)\n• Gradient sliders, responsive icons\n• ALL Crestron joins pre-configured\n\nClick the template below to apply it to your project.`);
    }, 100);
  };

  // Template device configurations
  const deviceConfigs = [
    { name: 'iPad Pro 12.9"', width: 1024, height: 1366, type: 'ipad' },
    { name: 'iPad Pro 11"', width: 834, height: 1194, type: 'ipad' },
    { name: 'iPad Air', width: 820, height: 1180, type: 'ipad' },
    { name: 'iPad Mini', width: 744, height: 1133, type: 'ipad' },
    { name: 'iPhone 15 Pro Max', width: 430, height: 932, type: 'iphone' },
    { name: 'iPhone 15 Pro', width: 393, height: 852, type: 'iphone' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in duration-300">
      <div className="bg-gradient-to-br from-zinc-900/95 via-zinc-900/90 to-zinc-800/95 border-2 border-blue-500/30 rounded-2xl w-[700px] max-h-[80vh] flex flex-col shadow-2xl shadow-blue-500/20 backdrop-blur-xl animate-in zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-6 border-b border-zinc-700/50 bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-blue-500/10">
          <h3 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Templates</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-all duration-200 hover:scale-110">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Generate Full System Templates */}
          <div className="mb-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <h4 className="mb-3 text-sm">🎯 Generate Complete System Template</h4>
            <p className="text-xs text-zinc-400 mb-4">
              Generate a full home automation template with 10 rooms, lighting control, HVAC, audio/video, security, and CCTV cameras - optimized for your device.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {deviceConfigs.map((device) => (
                <button
                  key={`full-${device.name}`}
                  onClick={() => handleGenerateFullTemplate(device)}
                  className={`px-3 py-2 ${device.type === 'ipad' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'} rounded text-sm flex flex-col items-start`}
                >
                  <span className="font-semibold">{device.name}</span>
                  <span className="text-xs opacity-80">{device.width}×{device.height}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Premium System Templates */}
          <div className="mb-6 p-4 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-purple-900/30 rounded-lg border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⭐</span>
              <h4 className="text-sm">PREMIUM CUTTING-EDGE TEMPLATE</h4>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              🎨 Ultra-premium with glassmorphism effects, animated gradients, modern CSS, and professional design. 
              Includes 10 rooms, full lighting, HVAC, audio/video, security, CCTV. 100% Crestron-ready!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {deviceConfigs.map((device) => (
                <button
                  key={`premium-${device.name}`}
                  onClick={() => handleGeneratePremiumTemplate(device)}
                  className={`px-3 py-2 ${device.type === 'ipad' ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'} rounded text-sm flex flex-col items-start shadow-md`}
                >
                  <span className="font-semibold">⭐ {device.name}</span>
                  <span className="text-xs opacity-90">{device.width}×{device.height} Premium</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Real Luxury Apartment Templates */}
          <div className="mb-6 p-4 bg-gradient-to-br from-emerald-900/30 via-cyan-900/30 to-emerald-900/30 rounded-lg border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏢</span>
              <h4 className="text-sm">REAL LUXURY APARTMENT - FULLY EDITABLE</h4>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              🎨 Modern apartment interface with premium components. SMALLER & FOCUSED: 5 pages, 3 rooms, lighting zones. 
              Perfect for real-world projects. Double-click any element to edit. 100% production-ready!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {deviceConfigs.map((device) => (
                <button
                  key={`luxury-${device.name}`}
                  onClick={() => handleGenerateRealLuxuryApartmentTemplate(device)}
                  className={`px-3 py-2 ${device.type === 'ipad' ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'} rounded text-sm flex flex-col items-start shadow-md`}
                >
                  <span className="font-semibold">⭐ {device.name}</span>
                  <span className="text-xs opacity-90">{device.width}×{device.height} Premium</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Complete Smart Home Templates */}
          <div className="mb-6 p-4 bg-gradient-to-br from-emerald-900/30 via-cyan-900/30 to-emerald-900/30 rounded-lg border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏠</span>
              <h4 className="text-sm">COMPLETE SMART HOME - FULLY EDITABLE</h4>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              🎨 Modern smart home interface with premium components. SMALLER & FOCUSED: 5 pages, 3 rooms, lighting zones. 
              Perfect for real-world projects. Double-click any element to edit. 100% production-ready!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {deviceConfigs.map((device) => (
                <button
                  key={`complete-${device.name}`}
                  onClick={() => handleGenerateCompleteSmartHomeTemplate(device)}
                  className={`px-3 py-2 ${device.type === 'ipad' ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'} rounded text-sm flex flex-col items-start shadow-md`}
                >
                  <span className="font-semibold">⭐ {device.name}</span>
                  <span className="text-xs opacity-90">{device.width}×{device.height} Premium</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Crestron Pro Smart Home Templates */}
          <div className="mb-6 p-4 bg-gradient-to-br from-yellow-900/30 via-orange-900/30 to-red-900/30 rounded-lg border-2 border-yellow-500/50 shadow-lg shadow-yellow-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚡</span>
              <h4 className="text-sm">CRESTRON PRO - OFFICIAL STYLE</h4>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              🎨 BASED ON REAL CRESTRON DESIGNS! Radial gradients, circular thermostat with glow, media player with album art, pool control with switches. 
              Professional sidebar navigation, modern typography. The MOST REALISTIC Crestron template!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {deviceConfigs.map((device) => (
                <button
                  key={`crestron-${device.name}`}
                  onClick={() => handleGenerateCrestronProTemplate(device)}
                  className={`px-3 py-2 ${device.type === 'ipad' ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'} rounded text-sm flex flex-col items-start shadow-md`}
                >
                  <span className="font-semibold"> {device.name}</span>
                  <span className="text-xs opacity-90">{device.width}×{device.height} Premium</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Crestron Pro V2 Smart Home Templates */}
          <div className="mb-6 p-4 bg-gradient-to-br from-cyan-900/30 via-blue-900/30 to-purple-900/30 rounded-lg border-2 border-cyan-500/50 shadow-lg shadow-cyan-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚡</span>
              <h4 className="text-sm">CRESTRON PRO V2 — CSS ADAPTIVE</h4>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              Based on REAL Crestron Wenner Home screenshots. CSS-adaptive layout that works in both Portrait &amp; Landscape.
              Pool/Spa toggles, Climate thermostat ring, Audio player with album art, Lighting zones, Security cameras with real images.
              Use the Rotate button next to the device selector to switch orientation!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {deviceConfigs.map((device) => (
                <button
                  key={`crestronv2-${device.name}`}
                  onClick={() => handleGenerateCrestronProV2Template(device)}
                  className={`px-3 py-2 ${device.type === 'ipad' ? 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'} rounded text-sm flex flex-col items-start shadow-md`}
                >
                  <span className="font-semibold">{device.name}</span>
                  <span className="text-xs opacity-90">{device.width}x{device.height} Adaptive</span>
                </button>
              ))}
            </div>
          </div>

          {/* Generate Ultra Full Templates */}
          <div className="mb-6 p-4 bg-gradient-to-br from-purple-900/30 via-blue-900/30 to-purple-900/30 rounded-lg border-2 border-purple-500/50 shadow-lg shadow-purple-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🌟</span>
              <h4 className="text-sm">ULTRA FULL TEMPLATE</h4>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              🎨 Ultra-premium with glassmorphism effects, animated gradients, modern CSS, and professional design. 
              Includes 10 rooms, full lighting, HVAC, audio/video, security, CCTV. 100% Crestron-ready!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {deviceConfigs.map((device) => (
                <button
                  key={`ultra-${device.name}`}
                  onClick={() => handleGenerateUltraFullTemplate(device)}
                  className={`px-3 py-2 ${device.type === 'ipad' ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700' : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-700 hover:to-purple-700'} rounded text-sm flex flex-col items-start shadow-md`}
                >
                  <span className="font-semibold">🌟 {device.name}</span>
                  <span className="text-xs opacity-90">{device.width}×{device.height} Premium</span>
                </button>
              ))}
            </div>
          </div>

          {/* CRESTRON ELITE — Percentage-Based Adaptive */}
          <div className="mb-6 p-4 bg-gradient-to-br from-indigo-900/30 via-violet-900/30 to-fuchsia-900/30 rounded-lg border-2 border-indigo-500/50 shadow-lg shadow-indigo-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">💎</span>
              <h4 className="text-sm">CRESTRON ELITE — FULLY RESIZABLE</h4>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              Percentage-based adaptive layout. ALL elements positioned with % of device resolution — fully resizable and resolution-independent.
              Compact 96px glass cards, gradient sliders, responsive icons. 6 pages: Home, Climate, Lighting, Audio, Pool/Spa, Security.
              Replace the stub file with an AI-generated version for a cutting-edge design!
            </p>
            <div className="grid grid-cols-2 gap-2">
              {deviceConfigs.map((device) => (
                <button
                  key={`elite-${device.name}`}
                  onClick={() => handleApplyCrestronEliteTemplate(device)}
                  className={`px-3 py-2 ${device.type === 'ipad' ? 'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700' : 'bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-700 hover:to-purple-700'} rounded text-sm flex flex-col items-start shadow-md`}
                >
                  <span className="font-semibold">💎 {device.name}</span>
                  <span className="text-xs opacity-90">{device.width}x{device.height} Elite</span>
                </button>
              ))}
            </div>
          </div>

          {/* Add Smart Home Dashboard Template */}
          <div className="mb-6 p-4 bg-gradient-to-br from-emerald-900/30 via-cyan-900/30 to-emerald-900/30 rounded-lg border-2 border-emerald-500/50 shadow-lg shadow-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🏠</span>
              <h4 className="text-sm">SMART HOME DASHBOARD - FULLY EDITABLE</h4>
            </div>
            <p className="text-xs text-zinc-300 mb-4">
              🎨 Modern smart home interface with premium components. SMALLER & FOCUSED: 5 pages, 3 rooms, lighting zones. 
              Perfect for real-world projects. Double-click any element to edit. 100% production-ready!
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleApplySmartHomeDashboard}
                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded text-sm flex flex-col items-start shadow-md"
              >
                <span className="font-semibold">🏠 Smart Home Dashboard</span>
                <span className="text-xs opacity-90">1024×768 Premium</span>
              </button>
              <button
                onClick={handleApplyFigmaSmartHomeDashboard}
                className="px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 rounded text-sm flex flex-col items-start shadow-md"
              >
                <span className="font-semibold">🏠 Figma Smart Home Dashboard</span>
                <span className="text-xs opacity-90">1024×768 Premium</span>
              </button>
            </div>
          </div>

          {/* Import/Export Section */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={handleImportTemplate}
              className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded flex items-center gap-2 text-sm"
            >
              <Upload className="w-4 h-4" />
              Import Template
            </button>
            <button
              onClick={handleCreateTemplate}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" />
              Save Current as Template
            </button>
          </div>

          {project.templates.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="mb-2">No templates yet</p>
              <p className="text-sm">Import a template or save your current project as a template</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {project.templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border-2 rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate?.id === template.id
                      ? 'border-blue-600 bg-blue-950/20'
                      : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                  }`}
                  onClick={() => setSelectedTemplate(template)}
                >
                  <div className="mb-2">
                    <h4 className="mb-1">{template.name}</h4>
                    <p className="text-sm text-zinc-400">{template.description}</p>
                  </div>

                  <div className="text-xs text-zinc-500 mb-3">
                    {template.pages.length} page{template.pages.length !== 1 ? 's' : ''}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleApplyTemplate(template);
                      }}
                      className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-xs"
                    >
                      Apply
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExportTemplate(template);
                      }}
                      className="px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                      title="Export"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTemplate(template.id);
                      }}
                      className="px-2 py-1 bg-zinc-700 hover:bg-red-600 rounded text-xs"
                      title="Delete"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}