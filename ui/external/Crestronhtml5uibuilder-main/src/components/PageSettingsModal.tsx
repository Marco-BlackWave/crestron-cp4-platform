import { useState, useRef } from 'react';
import { X, Image as ImageIcon, Upload, Trash2, Sparkles } from 'lucide-react';
import { Page } from '../types/crestron';

interface PageSettingsModalProps {
  page: Page;
  onClose: () => void;
  onUpdate: (updates: Partial<Page>) => void;
}

export function PageSettingsModal({ page, onClose, onUpdate }: PageSettingsModalProps) {
  const [bgColor, setBgColor] = useState(page.backgroundColor || '#18181b');
  const [bgImage, setBgImage] = useState(page.backgroundImage || '');
  const [bgAnimation, setBgAnimation] = useState(page.backgroundAnimation || 'none');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    onUpdate({
      backgroundColor: bgColor,
      backgroundImage: bgImage,
      backgroundAnimation: bgAnimation as any,
    });
    onClose();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = () => {
      setBgImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleImageUrlChange = (url: string) => {
    setBgImage(url);
  };

  const clearImage = () => {
    setBgImage('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[10000] p-4">
      <div className="bg-zinc-900 rounded-2xl border border-zinc-700 w-full max-w-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-semibold text-white">Page Settings</h2>
            <p className="text-sm text-zinc-400 mt-1">{page.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Background Color */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Background Color
            </label>
            <div className="flex gap-3 items-center">
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-16 h-10 rounded border border-zinc-700 cursor-pointer bg-zinc-800"
              />
              <input
                type="text"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                placeholder="#18181b"
              />
            </div>
          </div>

          {/* Background Image */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              <ImageIcon className="w-4 h-4 inline mr-1" />
              Background Image
            </label>

            {/* Image Preview */}
            {bgImage && (
              <div className="mb-3 relative rounded-lg overflow-hidden border border-zinc-700 bg-zinc-800">
                <img
                  src={bgImage}
                  alt="Background preview"
                  className="w-full h-48 object-cover"
                />
                <button
                  onClick={clearImage}
                  className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                  title="Remove image"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            )}

            {/* Upload Button */}
            <div className="space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center justify-center gap-2 text-white font-medium"
              >
                <Upload className="w-4 h-4" />
                Upload Image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />

              {/* Or URL Input */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-zinc-700"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-zinc-900 text-zinc-500">or use URL</span>
                </div>
              </div>

              <input
                type="text"
                value={bgImage.startsWith('data:') ? '' : bgImage}
                onChange={(e) => handleImageUrlChange(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
              />
            </div>

            <p className="text-xs text-zinc-500 mt-2">
              Upload an image or paste a URL. The image will be used as the page background.
            </p>
          </div>

          {/* Background Animation */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              <Sparkles className="w-4 h-4 inline mr-1" />
              Animated Background
            </label>
            <select
              value={bgAnimation}
              onChange={(e) => setBgAnimation(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
            >
              <option value="none">None</option>
              <option value="waves">🌊 Waves</option>
              <option value="particles">✨ Particles</option>
              <option value="smoke">💨 Smoke</option>
              <option value="matrix">🟢 Matrix Rain</option>
              <option value="aurora">🌌 Aurora Borealis</option>
              <option value="bubbles">🫧 Bubbles</option>
              <option value="gradient-shift">🌈 Gradient Shift</option>
            </select>
            <p className="text-xs text-zinc-500 mt-2">
              Choose an animated background effect. Animations run at 60fps and overlay the background color/image.
            </p>
          </div>

          {/* Preview */}
          <div>
            <label className="block text-sm font-semibold text-zinc-300 mb-2">
              Preview
            </label>
            <div
              className="w-full h-32 rounded-lg border border-zinc-700"
              style={{
                backgroundColor: bgColor,
                backgroundImage: bgImage ? `url(${bgImage})` : 'none',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors text-white font-medium"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}