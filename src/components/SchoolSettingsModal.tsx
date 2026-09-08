import React, { useState, useRef } from 'react';
import { 
  Building, 
  Upload, 
  Check, 
  X, 
  RotateCcw, 
  Image as ImageIcon,
  Link2
} from 'lucide-react';
import { SchoolConfig } from '../types';
import { DEFAULT_SCHOOL_CONFIG, saveSchoolConfig } from '../utils/schoolStorage';

interface SchoolSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig: SchoolConfig;
  onUpdateConfig: (newConfig: SchoolConfig) => void;
}

export const SchoolSettingsModal: React.FC<SchoolSettingsModalProps> = ({
  isOpen,
  onClose,
  currentConfig,
  onUpdateConfig,
}) => {
  const initialLine1 = currentConfig.nameLine1 || currentConfig.name.split('\n')[0] || '';
  const initialLine2 = currentConfig.nameLine2 !== undefined ? currentConfig.nameLine2 : (currentConfig.name.split('\n')[1] || '');

  const [nameLine1, setNameLine1] = useState(initialLine1);
  const [nameLine2, setNameLine2] = useState(initialLine2);
  const [tagline, setTagline] = useState(currentConfig.tagline || '');
  const [logo, setLogo] = useState(currentConfig.logo);
  const [urlInput, setUrlInput] = useState('');
  const [isUrlMode, setIsUrlMode] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size exceeds 2MB limit. Please choose a smaller logo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        setLogo(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleApplyUrl = () => {
    if (!urlInput.trim()) return;
    setLogo(urlInput.trim());
    setUrlInput('');
    setIsUrlMode(false);
  };

  const handleReset = () => {
    if (confirm('Reset school branding to the default configuration?')) {
      setNameLine1(DEFAULT_SCHOOL_CONFIG.nameLine1 || 'Student Attendance App');
      setNameLine2(DEFAULT_SCHOOL_CONFIG.nameLine2 || '');
      setTagline(DEFAULT_SCHOOL_CONFIG.tagline || '');
      setLogo(DEFAULT_SCHOOL_CONFIG.logo);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedLine1 = nameLine1.trim() || (DEFAULT_SCHOOL_CONFIG.nameLine1 || 'Student Attendance App');
    const trimmedLine2 = nameLine2.trim();
    const combinedName = trimmedLine2 ? `${trimmedLine1}\n${trimmedLine2}` : trimmedLine1;

    const updated: SchoolConfig = {
      name: combinedName,
      nameLine1: trimmedLine1,
      nameLine2: trimmedLine2,
      tagline: tagline.trim() || DEFAULT_SCHOOL_CONFIG.tagline,
      logo: logo || DEFAULT_SCHOOL_CONFIG.logo
    };
    saveSchoolConfig(updated);
    onUpdateConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-white">School Profile</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-6 scrollbar-thin">
          
          {/* Live Preview Box */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
            <span className="text-[10px] font-bold tracking-wider uppercase text-slate-500">Live Header Preview</span>
            <div className="flex items-center gap-3.5 p-3 rounded-xl bg-slate-900 border border-slate-800">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-950 border border-slate-700 flex items-center justify-center shrink-0 shadow-inner">
                {logo ? (
                  <img src={logo} alt="School Logo" className="w-full h-full object-contain p-1" referrerPolicy="no-referrer" />
                ) : (
                  <Building className="w-6 h-6 text-indigo-400" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-white text-base tracking-tight leading-tight">
                  {nameLine1 || 'School Name (First Line)'}
                </div>
                {nameLine2 ? (
                  <div className="text-xs text-indigo-300 font-medium leading-tight mt-0.5">
                    {nameLine2}
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 italic mt-0.5">
                    (Second line empty)
                  </div>
                )}
                {tagline && (
                  <div className="text-[11px] text-slate-400 truncate mt-1">
                    {tagline}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* School Name First Line & Second Line */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                School Name — First Line <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={nameLine1}
                onChange={(e) => setNameLine1(e.target.value)}
                placeholder="e.g. Student Attendance App"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Primary line displayed in the top header and registers.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                School Name — Second Line (Campus, Department or Subtitle)
              </label>
              <input
                type="text"
                value={nameLine2}
                onChange={(e) => setNameLine2(e.target.value)}
                placeholder="e.g. Student Attendance Tracker or North Campus"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Secondary line displayed directly below the main school name.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                School Tagline / Subtitle (Optional)
              </label>
              <input
                type="text"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="e.g. Center for Academic Excellence"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>
          </div>

          {/* School Logo Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-300">
                School Logo / Crest
              </label>
              <button
                type="button"
                onClick={() => setIsUrlMode(!isUrlMode)}
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
              >
                <Link2 className="w-3.5 h-3.5" />
                {isUrlMode ? 'Upload File Instead' : 'Use Image URL'}
              </button>
            </div>

            {/* URL Input Mode */}
            {isUrlMode ? (
              <div className="flex gap-2">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/school-logo.png"
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors"
                >
                  Apply
                </button>
              </div>
            ) : (
              /* Drag & Drop Upload Zone */
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={(e) => e.target.files && e.target.files[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                    <Upload className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-indigo-300">Click to upload</span>
                    <span className="text-xs text-slate-400"> or drag and drop</span>
                  </div>
                  <p className="text-[10px] text-slate-500">PNG, JPG, SVG or WebP (Max 2MB)</p>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to Default
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saveSuccess}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-600/30"
              >
                {saveSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    Saved!
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save School Branding
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
