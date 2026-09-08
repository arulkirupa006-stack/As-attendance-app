import React, { useState } from 'react';
import { Download, Smartphone, Laptop, CheckCircle2, X, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  // If already installed and running standalone, suppress
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome) {
        setInstallSuccess(true);
        setTimeout(() => setInstallSuccess(false), 4000);
      }
    } else {
      setShowModal(true);
    }
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        title="Install EMIS Attendance Web App on Chrome Desktop & Android"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all border border-emerald-400/30 shrink-0"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span className="hidden sm:inline">Install App (PWA)</span>
        <span className="sm:hidden">Install</span>
      </button>

      {/* Guide Modal for Manual Chrome/Android/iOS installation */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">Install EMIS Attendance</h3>
                <p className="text-xs text-slate-400">Add to Desktop or Mobile Home Screen</p>
              </div>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4" />
                  <span>Google Chrome on Desktop</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Click the <strong>Install</strong> icon in the address bar (next to the bookmark star), or click the three dots menu <strong>(⋮) &gt; Save and share &gt; Install EMIS Attendance</strong>.
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4" />
                  <span>Chrome on Android</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Tap the three-dots menu <strong>(⋮)</strong> in Chrome and select <strong>"Add to Home screen"</strong> or <strong>"Install app"</strong>.
                </p>
              </div>

              {isIOS && (
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="font-bold text-indigo-400 flex items-center gap-1.5">
                    <Share className="w-4 h-4" />
                    <span>Safari on iPhone / iPad</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Tap the <strong>Share</strong> button at the bottom of the screen, scroll down, and tap <strong>"Add to Home Screen"</strong>.
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Success Notification */}
      {installSuccess && (
        <div className="fixed top-20 right-6 z-50 bg-emerald-600 text-white font-semibold text-xs sm:text-sm px-4 py-3 rounded-xl shadow-xl flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
          <span>EMIS Attendance installed successfully!</span>
        </div>
      )}
    </>
  );
};
