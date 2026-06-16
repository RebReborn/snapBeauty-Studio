import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { X, Shield, Lock, Cpu, Sparkles } from 'lucide-react';

const ExportModal: React.FC = () => {
  const { 
    activeProject, 
    user, 
    upgradeToPro, 
    startExportRecording,
    setShowExportModal 
  } = useApp();

  const [resolution, setResolution] = useState('1080p');
  const [format, setFormat] = useState('mp4');
  const [bitrate, setBitrate] = useState('high');
  const [hardwareEncoding, setHardwareEncoding] = useState(true);
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [batchExport, setBatchExport] = useState(false);

  const isPro = user?.isPro || false;

  const handleExportClick = () => {
    const isProFeature = resolution === '4K' || resolution === '1440p' || removeWatermark || batchExport;
    if (isProFeature && !isPro) {
      alert('This setting requires a PRO Subscription. Upgrading account...');
      upgradeToPro();
      return;
    }
    // Kick off real canvas-stream recording
    startExportRecording(resolution, format, bitrate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans select-none bg-black/75 backdrop-blur-sm">
      
      {/* Modal Card */}
      <div className="w-full max-w-lg rounded-2xl overflow-hidden glass-panel-heavy shadow-2xl relative border border-white/10 animate-slide-up">
        
        {/* Header */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-studio-dark/60">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-purple-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Render & Export Settings</h3>
          </div>
          <button 
            onClick={() => setShowExportModal(false)}
            className="h-7 w-7 rounded-lg hover:bg-white/5 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          
          {/* Active project header info */}
          <div className="p-3 rounded-xl bg-white/2 border border-white/5 flex justify-between items-center text-xs">
            <div>
              <p className="font-bold text-white truncate max-w-[200px]">{activeProject?.name}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">Duration: {activeProject?.video?.duration} seconds</p>
            </div>
            <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">Ready</span>
          </div>

          {/* Settings Grid */}
          <div className="space-y-4">
            
            {/* Resolution Row */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Output Resolution</label>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {[
                  { id: '720p', label: '720p HD', isProOnly: false },
                  { id: '1080p', label: '1080p FHD', isProOnly: false },
                  { id: '1440p', label: '1440p QHD', isProOnly: true },
                  { id: '4K', label: '4K UltraHD', isProOnly: true }
                ].map((res) => (
                  <button
                    key={res.id}
                    onClick={() => setResolution(res.id)}
                    className={`py-2 px-1 rounded-xl font-semibold border flex flex-col items-center justify-center gap-1 transition-all ${
                      resolution === res.id
                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-300'
                        : 'bg-white/2 border-white/5 text-gray-400 hover:bg-white/4'
                    }`}
                  >
                    <span>{res.label}</span>
                    {res.isProOnly && (
                      <div className="flex items-center gap-0.5 text-[8px] text-yellow-400 font-bold bg-yellow-500/10 px-1 py-0.2 rounded">
                        {isPro ? 'Pro' : <Lock className="h-2 w-2" />}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Container for format & bitrate side-by-side */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Format selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">File Format</label>
                <div className="flex bg-white/3 border border-white/5 rounded-xl p-1 text-xs">
                  {['mp4', 'mov'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={`flex-1 py-1.5 rounded-lg uppercase font-bold transition-all ${
                        format === f
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bitrate selection */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bitrate Quality</label>
                <div className="flex bg-white/3 border border-white/5 rounded-xl p-1 text-xs">
                  {['medium', 'high'].map((b) => (
                    <button
                      key={b}
                      onClick={() => setBitrate(b)}
                      className={`flex-1 py-1.5 rounded-lg capitalize font-bold transition-all ${
                        bitrate === b
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

            </div>

            {/* Extra toggles (watermark, GPU, batch) */}
            <div className="space-y-2.5 pt-2 border-t border-white/5">
              
              {/* Hardware encoding */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-400" />
                  <div>
                    <p className="font-semibold text-white">GPU Hardware Encoding</p>
                    <p className="text-[9px] text-gray-400">Uses NVIDIA CUDA / DirectML acceleration</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={hardwareEncoding} 
                  onChange={(e) => setHardwareEncoding(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 accent-purple-500"
                />
              </div>

              {/* Watermark toggle */}
              <div className="flex items-center justify-between text-xs pt-1.5">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-white">Remove SnapBeauty Watermark</p>
                      {!isPro && (
                        <div className="flex items-center gap-0.5 text-[8px] text-yellow-400 font-bold bg-yellow-500/10 px-1 py-0.2 rounded">
                          <Lock className="h-2 w-2" />
                          <span>Pro</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400">Export clean files without logos</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={removeWatermark} 
                  disabled={false} // Allow check, triggers upgrade logic on click
                  onChange={(e) => setRemoveWatermark(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 accent-purple-500"
                />
              </div>

              {/* Batch Export */}
              <div className="flex items-center justify-between text-xs pt-1.5">
                <div className="flex items-center gap-2">
                  <Cpu className="h-4 w-4 text-purple-400" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-semibold text-white">Batch Export Clips</p>
                      {!isPro && (
                        <div className="flex items-center gap-0.5 text-[8px] text-yellow-400 font-bold bg-yellow-500/10 px-1 py-0.2 rounded">
                          <Lock className="h-2 w-2" />
                          <span>Pro</span>
                        </div>
                      )}
                    </div>
                    <p className="text-[9px] text-gray-400">Render all timeline sequences at once</p>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={batchExport} 
                  onChange={(e) => setBatchExport(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-white/10 accent-purple-500"
                />
              </div>

            </div>

          </div>

          {/* Export Action Button */}
          <button
            onClick={handleExportClick}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-purple-500/20 active:scale-[0.98] transition-all"
          >
            <span>▶ Start Recording Export</span>
          </button>
          <p className="text-center text-[9px] text-gray-500 pt-1">
            Output format: <span className="text-purple-400">WebM (VP9)</span> — captured live from beauty canvas
          </p>
        </div>

      </div>

    </div>
  );
};

export default ExportModal;
