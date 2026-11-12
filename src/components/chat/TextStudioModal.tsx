import React, { useState } from 'react';
import {
  X,
  Type,
  Sparkles,
  Copy,
  Check,
  Send,
  Sliders,
  Palette,
  Sun,
  AlignCenter,
  AlignLeft,
  AlignRight,
} from 'lucide-react';

interface TextStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyToChat?: (styledText: string) => void;
  initialText?: string;
}

const FONTS = [
  { id: 'font-cyber', name: 'Cyberpunk Mono', className: 'font-mono tracking-wider' },
  { id: 'font-sans', name: 'Ultra Modern Sans', className: 'font-sans font-bold' },
  { id: 'font-serif', name: 'Classic Editorial', className: 'font-serif italic' },
  { id: 'font-display', name: 'Heavy Impact', className: 'uppercase tracking-widest font-black' },
];

const PRESET_EFFECTS = [
  {
    id: 'neon-emerald',
    name: 'Emerald Neon',
    color: '#00D68F',
    glow: '0 0 15px rgba(0, 214, 143, 0.8), 0 0 30px rgba(0, 214, 143, 0.4)',
    shadow: '2px 2px 4px rgba(0,0,0,0.8)',
  },
  {
    id: 'cyber-red',
    name: 'Cyber Crimson',
    color: '#FF1E44',
    glow: '0 0 15px rgba(255, 30, 68, 0.8), 0 0 30px rgba(255, 30, 68, 0.4)',
    shadow: '2px 2px 4px rgba(0,0,0,0.8)',
  },
  {
    id: 'cosmic-purple',
    name: 'Cosmic Violet',
    color: '#A855F7',
    glow: '0 0 15px rgba(168, 85, 247, 0.8), 0 0 30px rgba(168, 85, 247, 0.4)',
    shadow: '2px 2px 4px rgba(0,0,0,0.8)',
  },
  {
    id: 'solar-gold',
    name: 'Solar Flare',
    color: '#FBBF24',
    glow: '0 0 15px rgba(251, 191, 36, 0.8), 0 0 30px rgba(251, 191, 36, 0.4)',
    shadow: '2px 2px 4px rgba(0,0,0,0.8)',
  },
  {
    id: 'ice-cyan',
    name: 'Cryo Ice',
    color: '#38BDF8',
    glow: '0 0 15px rgba(56, 189, 248, 0.8), 0 0 30px rgba(56, 189, 248, 0.4)',
    shadow: '2px 2px 4px rgba(0,0,0,0.8)',
  },
];

export const TextStudioModal: React.FC<TextStudioModalProps> = ({
  isOpen,
  onClose,
  onApplyToChat,
  initialText = 'Talksy Creative Vibes',
}) => {
  const [inputText, setInputText] = useState(initialText || 'Creative Typography');
  const [selectedFont, setSelectedFont] = useState(FONTS[0].id);
  const [fontSize, setFontSize] = useState<number>(24);
  const [isBold, setIsBold] = useState(true);
  const [isItalic, setIsItalic] = useState(false);
  const [textColor, setTextColor] = useState('#00D68F');
  const [letterSpacing, setLetterSpacing] = useState(2);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [enableGlow, setEnableGlow] = useState(true);
  const [glowIntensity, setGlowIntensity] = useState(15);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const currentFontObj = FONTS.find((f) => f.id === selectedFont) || FONTS[0];

  const textStyle: React.CSSProperties = {
    color: textColor,
    fontSize: `${fontSize}px`,
    fontWeight: isBold ? 800 : 400,
    fontStyle: isItalic ? 'italic' : 'normal',
    letterSpacing: `${letterSpacing}px`,
    textAlign,
    textShadow: enableGlow
      ? `0 0 ${glowIntensity}px ${textColor}, 0 0 ${glowIntensity * 2}px ${textColor}88, 2px 2px 4px rgba(0,0,0,0.8)`
      : '2px 2px 4px rgba(0,0,0,0.8)',
  };

  const handleCopyText = () => {
    // Generates formatted stylized text string with unicode aesthetic representation
    const textToCopy = `✨ [style:${currentFontObj.name}] ${inputText} ✨`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInsertChat = () => {
    if (onApplyToChat) {
      onApplyToChat(`✨ ${inputText} ✨`);
      onClose();
    }
  };

  const applyPreset = (preset: typeof PRESET_EFFECTS[0]) => {
    setTextColor(preset.color);
    setEnableGlow(true);
    setGlowIntensity(16);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-2xl bg-[#0D1B2A] border border-[#1E3042] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-[#1E3042] flex items-center justify-between bg-[#07111F]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-[#E8F0FA] text-sm">Creative Typography Studio</h3>
              <p className="text-[10px] text-[#94A3B8]">TextStudio-inspired generator for chat & prompts</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#94A3B8] hover:text-[#E8F0FA] hover:bg-[#111E2D] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Canvas Preview */}
        <div className="p-6 bg-[#070e1c] border-b border-[#1E3042] flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,214,143,0.06)_0%,transparent_70%)]" />
          <div className={`w-full max-w-lg break-words transition-all ${currentFontObj.className}`} style={textStyle}>
            {inputText || 'Type your message...'}
          </div>
        </div>

        {/* Studio Controls */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Text Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
              Source Text
            </label>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Enter text to style..."
              className="w-full px-4 py-2.5 bg-[#111E2D] border border-[#1E3042] rounded-xl text-sm text-[#E8F0FA] focus:outline-none focus:border-[#00D68F] transition-colors"
            />
          </div>

          {/* Preset Styles */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Glow & Color Presets</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {PRESET_EFFECTS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className="p-2 rounded-xl bg-[#111E2D] hover:bg-[#1A2C40] border border-[#1E3042] flex flex-col items-center gap-1.5 transition-all hover:scale-105 cursor-pointer"
                >
                  <div
                    className="w-5 h-5 rounded-full shadow-md"
                    style={{ backgroundColor: preset.color, boxShadow: `0 0 10px ${preset.color}` }}
                  />
                  <span className="text-[10px] font-semibold text-[#E8F0FA]">{preset.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Family Selection */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-[#94A3B8] mb-2">
              Typography Style
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.id}
                  onClick={() => setSelectedFont(font.id)}
                  className={`p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    selectedFont === font.id
                      ? 'bg-[#00D68F]/15 border-[#00D68F] text-[#00D68F]'
                      : 'bg-[#111E2D] border-[#1E3042] text-[#94A3B8] hover:text-[#E8F0FA]'
                  }`}
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          {/* Formatting Controls Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[#1E3042]">
            {/* Size & Letter Spacing */}
            <div>
              <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                <span>Font Size ({fontSize}px)</span>
              </div>
              <input
                type="range"
                min="16"
                max="48"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-[#00D68F] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                <span>Letter Spacing ({letterSpacing}px)</span>
              </div>
              <input
                type="range"
                min="0"
                max="10"
                value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))}
                className="w-full accent-[#00D68F] cursor-pointer"
              />
            </div>

            {/* Color & Glow */}
            <div>
              <div className="flex justify-between text-xs text-[#94A3B8] mb-1">
                <span>Custom Color</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={textColor}
                  onChange={(e) => setTextColor(e.target.value)}
                  className="w-8 h-8 rounded-lg bg-transparent border-0 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => setEnableGlow(!enableGlow)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors cursor-pointer ${
                    enableGlow
                      ? 'bg-[#00D68F]/20 text-[#00D68F] border-[#00D68F]/40'
                      : 'bg-[#111E2D] text-[#94A3B8] border-[#1E3042]'
                  }`}
                >
                  {enableGlow ? 'Glow On' : 'Glow Off'}
                </button>
              </div>
            </div>
          </div>

          {/* Weight & Alignment */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsBold(!isBold)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                isBold ? 'bg-[#00D68F]/20 text-[#00D68F] border-[#00D68F]/40' : 'bg-[#111E2D] text-[#94A3B8] border-[#1E3042]'
              }`}
            >
              Bold
            </button>
            <button
              type="button"
              onClick={() => setIsItalic(!isItalic)}
              className={`px-3 py-1.5 rounded-xl text-xs italic border transition-colors cursor-pointer ${
                isItalic ? 'bg-[#00D68F]/20 text-[#00D68F] border-[#00D68F]/40' : 'bg-[#111E2D] text-[#94A3B8] border-[#1E3042]'
              }`}
            >
              Italic
            </button>
            <div className="h-4 w-[1px] bg-[#1E3042] mx-1" />
            <button
              type="button"
              onClick={() => setTextAlign('left')}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                textAlign === 'left' ? 'bg-[#00D68F]/20 text-[#00D68F] border-[#00D68F]/40' : 'bg-[#111E2D] text-[#94A3B8] border-[#1E3042]'
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTextAlign('center')}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                textAlign === 'center' ? 'bg-[#00D68F]/20 text-[#00D68F] border-[#00D68F]/40' : 'bg-[#111E2D] text-[#94A3B8] border-[#1E3042]'
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setTextAlign('right')}
              className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
                textAlign === 'right' ? 'bg-[#00D68F]/20 text-[#00D68F] border-[#00D68F]/40' : 'bg-[#111E2D] text-[#94A3B8] border-[#1E3042]'
              }`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-[#1E3042] flex items-center justify-between bg-[#07111F]">
          <button
            onClick={handleCopyText}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#111E2D] hover:bg-[#1E3042] text-[#E8F0FA] text-xs font-bold transition-all cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00D68F]" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Styled Text!' : 'Copy Styled Text'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#94A3B8] hover:text-[#E8F0FA] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {onApplyToChat && (
              <button
                onClick={handleInsertChat}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#00D68F] hover:bg-[#00B87A] text-[#07111F] font-bold text-xs transition-all shadow-md cursor-pointer hover:scale-105"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Insert in Message</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
