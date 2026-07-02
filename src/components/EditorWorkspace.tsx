import React, { useState } from 'react';
import { useApp, BeautyValues } from '../context/AppContext';
import Visualizer from './Visualizer';
import BeautyControls from './BeautyControls';
import Timeline from './Timeline';
import Marketplace from './Marketplace';
import { 
  ArrowLeft, Undo2, Redo2, Sparkles, Download, 
  Video, Folder, ShoppingBag, Palette,
  Loader2, CheckCircle, XCircle, Keyboard, Settings, Type,
  ChevronDown, ChevronRight
} from 'lucide-react';

const EditorWorkspace: React.FC = () => {
  const { 
    setView, 
    activeProject, 
    undo, 
    redo, 
    canUndo, 
    canRedo, 
    isAutoBeautifyActive, 
    toggleAutoBeautify, 
    setShowExportModal,
    exportQueue,
    timelineClips,
    splitClip,
    deleteClip,
    selectedClipId,
    playheadPosition,
    setPlayheadPosition,
    isPlaying,
    setIsPlaying,
    showShortcutsHelp,
    setShowShortcutsHelp,
    setShowProfileSettings,
    overlayClips,
    selectedOverlayId,
    setSelectedOverlayId,
    addOverlayClip,
    updateOverlayClip,
    deleteOverlayClip,
  } = useApp();

  const [activeTab, setActiveTab] = useState<'media' | 'presets' | 'marketplace' | 'color' | 'text'>('color');

  // Keyboard Shortcuts Hook
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if the user is typing in a text input or textarea
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement || 
        (e.target instanceof HTMLElement && e.target.getAttribute('contenteditable') === 'true')
      ) {
        return;
      }

      const key = e.key.toLowerCase();

      // Undo / Redo (Ctrl+Z / Ctrl+Y)
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          if (canRedo) redo();
        } else {
          if (canUndo) undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && key === 'y') {
        e.preventDefault();
        if (canRedo) redo();
      }

      // Play / Pause (Space)
      else if (e.key === ' ') {
        e.preventDefault();
        setIsPlaying(!isPlaying);
      }

      // Split Clip (C or c)
      else if (key === 'c') {
        e.preventDefault();
        splitClip();
      }

      // Delete Clip (Delete or Backspace)
      else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedClipId) {
          e.preventDefault();
          // Default to normal delete
          deleteClip(selectedClipId, false);
        }
      }

      // Frame Nudge Left (Arrow Left: -1 frame = -1/30th sec)
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const nextTime = Math.max(0, playheadPosition - 1 / 30);
        setPlayheadPosition(nextTime);
      }

      // Frame Nudge Right (Arrow Right: +1 frame = +1/30th sec)
      else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const maxDuration = timelineClips.length > 0 
          ? Math.max(...timelineClips.map(c => c.end)) 
          : (activeProject?.video?.duration || 0);
        const nextTime = Math.min(maxDuration, playheadPosition + 1 / 30);
        setPlayheadPosition(nextTime);
      }

      // Help Modal (H or h or ?)
      else if (key === 'h' || e.key === '?') {
        e.preventDefault();
        setShowShortcutsHelp(!showShortcutsHelp);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlaying,
    setIsPlaying,
    splitClip,
    selectedClipId,
    deleteClip,
    playheadPosition,
    setPlayheadPosition,
    timelineClips,
    activeProject,
    showShortcutsHelp,
    setShowShortcutsHelp,
    canUndo,
    canRedo,
    undo,
    redo
  ]);

  return (
    <div className="h-screen w-screen flex flex-col bg-studio-darker overflow-hidden text-gray-200 select-none font-sans relative">
      
      {/* Top Header Bar */}
      <header className="h-14 bg-studio-dark border-b border-white/5 px-4 flex items-center justify-between z-20 shrink-0">
        
        {/* Left Side: Back & Project Title */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>
          
          <div className="h-4 w-[1px] bg-white/10" />
          
          <div className="flex items-center gap-2">
            <Video className="h-4 w-4 text-purple-400" />
            <span className="text-xs font-bold text-white max-w-[200px] truncate">
              {activeProject?.name || 'Project Workspace'}
            </span>
            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border border-purple-500/30">
              Beta
            </span>
            {activeProject?.video?.resolution && (
              <span className="text-[9px] bg-white/5 px-1.5 py-0.5 rounded text-gray-400 font-medium">
                {activeProject.video.resolution.includes('4K') ? '4K UHD' : 'FHD 1080p'}
              </span>
            )}
          </div>
        </div>

        {/* Center: Undo / Redo & AI Auto */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-white/3 rounded-lg p-0.5 border border-white/5">
            <button 
              onClick={undo}
              disabled={!canUndo}
              title="Undo (Ctrl+Z)"
              className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
            >
              <Undo2 className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={redo}
              disabled={!canRedo}
              title="Redo (Ctrl+Y)"
              className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-white disabled:opacity-40 disabled:hover:text-gray-400 transition-colors"
            >
              <Redo2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            onClick={toggleAutoBeautify}
            className={`h-8 px-4 rounded-lg flex items-center gap-1.5 font-bold text-xs transition-all active:scale-[0.97] ${
              isAutoBeautifyActive 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 border border-purple-400/20' 
                : 'bg-white/5 hover:bg-white/10 text-purple-300 border border-purple-500/20'
            }`}
          >
            <Sparkles className={`h-3.5 w-3.5 ${isAutoBeautifyActive ? 'animate-spin' : ''}`} style={{ animationDuration: '3s' }} />
            <span>{isAutoBeautifyActive ? 'AI Enabled' : 'Auto Beautify'}</span>
          </button>
        </div>

        {/* Right Side: Pro badge and Export */}
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowShortcutsHelp(true)}
            title="Keyboard Shortcuts Guide (H)"
            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-[0.97]"
          >
            <Keyboard className="h-4 w-4" />
          </button>

          <button 
            onClick={() => setShowProfileSettings(true)}
            title="Profile & Presets Settings"
            className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all active:scale-[0.97]"
          >
            <Settings className="h-4 w-4" />
          </button>

          <span className="text-[9px] bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
            Premium Mode
          </span>
          <button 
            onClick={() => setShowExportModal(true)}
            className="h-8 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg shadow-purple-500/10 active:scale-[0.97] transition-all"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Video</span>
          </button>
        </div>

      </header>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex overflow-hidden min-h-0 z-10">
        
        {/* Left Toolbar (Tabs switcher) */}
        <nav className="w-14 bg-studio-dark/95 border-r border-white/5 flex flex-col items-center py-4 gap-4 shrink-0">
          {[
            { id: 'color', icon: Palette, label: 'Color' },
            { id: 'presets', icon: Sparkles, label: 'Lenses' },
            { id: 'text', icon: Type, label: 'Text' },
            { id: 'marketplace', icon: ShoppingBag, label: 'Market' },
            { id: 'media', icon: Folder, label: 'Assets' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              title={tab.label}
              className={`h-10 w-10 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all ${
                activeTab === tab.id
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/25'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/3 border border-transparent'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="text-[8px] font-bold">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* Left Sidebar Content Panel (300px width) */}
        <aside className="w-[280px] bg-studio-dark/40 border-r border-white/5 flex flex-col shrink-0 panel-transition">
          {activeTab === 'color' && (
            <VideoColorGradingPanel />
          )}

          {activeTab === 'text' && (
            <div className="p-4 flex-1 flex flex-col overflow-y-auto space-y-4">
              <div className="flex items-center justify-between shrink-0">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">Text Overlays</h3>
                <button
                  onClick={() => addOverlayClip("New Subtitle", playheadPosition, 4.0)}
                  className="px-2.5 py-1 rounded bg-purple-500 hover:bg-purple-600 text-[10px] font-bold text-white active:scale-95 transition-all"
                >
                  + Add Text
                </button>
              </div>

              {/* Text list */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {overlayClips.length === 0 ? (
                  <div className="py-6 text-center text-[11px] text-gray-500 border border-dashed border-white/5 rounded-xl">
                    No text overlays added yet.<br/>
                    Click "+ Add Text" to insert subtitles.
                  </div>
                ) : (
                  overlayClips.map((ov) => {
                    const isSelected = selectedOverlayId === ov.id;
                    return (
                      <div
                        key={ov.id}
                        onClick={() => setSelectedOverlayId(ov.id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-950/20 border-purple-500/50 shadow-md shadow-purple-500/5'
                            : 'bg-white/2 border-white/5 hover:border-white/10'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] text-purple-400 font-mono font-bold">
                            {ov.start.toFixed(1)}s - {ov.end.toFixed(1)}s
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteOverlayClip(ov.id); }}
                            className="text-gray-500 hover:text-red-400 p-0.5"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-white font-medium truncate mt-1">"{ov.text}"</p>
                        
                        {/* Editor Controls if selected */}
                        {isSelected && (
                          <div className="mt-3 space-y-3 pt-3 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                            {/* Text String Input */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Text Content</label>
                              <input
                                type="text"
                                value={ov.text}
                                onChange={(e) => updateOverlayClip(ov.id, { text: e.target.value })}
                                className="w-full bg-studio-darker border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            {/* Position Sliders */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase">
                                <span>Horizontal Position (X)</span>
                                <span className="text-white font-mono">{ov.x}%</span>
                              </div>
                              <input
                                type="range"
                                min="5" max="95" step="1"
                                value={ov.x}
                                onChange={(e) => updateOverlayClip(ov.id, { x: parseInt(e.target.value) })}
                                className="w-full accent-purple-500"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase">
                                <span>Vertical Position (Y)</span>
                                <span className="text-white font-mono">{ov.y}%</span>
                              </div>
                              <input
                                type="range"
                                min="5" max="95" step="1"
                                value={ov.y}
                                onChange={(e) => updateOverlayClip(ov.id, { y: parseInt(e.target.value) })}
                                className="w-full accent-purple-500"
                              />
                            </div>

                            {/* Font Size & Styling */}
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Size</label>
                                <input
                                  type="number"
                                  min="12" max="72"
                                  value={ov.fontSize}
                                  onChange={(e) => updateOverlayClip(ov.id, { fontSize: parseInt(e.target.value) || 24 })}
                                  className="w-full bg-studio-darker border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[9px] font-bold text-gray-400 uppercase">Style</label>
                                <select
                                  value={ov.style}
                                  onChange={(e) => updateOverlayClip(ov.id, { style: e.target.value as any })}
                                  className="w-full bg-studio-darker border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none"
                                >
                                  <option value="normal">Normal</option>
                                  <option value="shadow">Shadow</option>
                                  <option value="background">Box BG</option>
                                </select>
                              </div>
                            </div>

                            {/* Color Selector */}
                            <div className="space-y-1">
                              <label className="text-[9px] font-bold text-gray-400 uppercase">Text Color</label>
                              <div className="flex items-center gap-2">
                                <input
                                  type="color"
                                  value={ov.color}
                                  onChange={(e) => updateOverlayClip(ov.id, { color: e.target.value })}
                                  className="h-6 w-10 bg-transparent border-0 cursor-pointer outline-none shrink-0"
                                />
                                <input
                                  type="text"
                                  value={ov.color.toUpperCase()}
                                  onChange={(e) => updateOverlayClip(ov.id, { color: e.target.value })}
                                  className="w-full bg-studio-darker border border-white/10 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {activeTab === 'media' && (
            <div className="p-4 flex-1 flex flex-col overflow-y-auto space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">Project Assets</h3>
              {activeProject?.video ? (
                <div className="p-3 rounded-xl bg-white/2 border border-white/5 space-y-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-white truncate">
                    <Video className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>{activeProject.video.name}</span>
                  </div>
                  <div className="space-y-1.5 text-[10px] text-gray-400">
                    <div className="flex justify-between">
                      <span>Resolution:</span>
                      <span className="text-white font-medium">{activeProject.video.resolution}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Frame Rate:</span>
                      <span className="text-white font-medium">{activeProject.video.fps} FPS</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Duration:</span>
                      <span className="text-white font-medium">{activeProject.video.duration}s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>File Size:</span>
                      <span className="text-white font-medium">{activeProject.video.size}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-500 text-center py-6">No media imported</p>
              )}
            </div>
          )}

          {activeTab === 'presets' && (
            <BeautyPresetsList />
          )}

          {activeTab === 'marketplace' && (
            <Marketplace />
          )}
        </aside>

        {/* Center Canvas Area & Timeline (Flexible) */}
        <section className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top: Video Visualizer preview */}
          <div className="flex-1 relative bg-black flex items-center justify-center overflow-hidden min-h-0">
            <Visualizer />
          </div>

          {/* Bottom: Timeline Editor */}
          <div className="h-[240px] border-t border-white/5 bg-studio-dark/80 shrink-0 flex flex-col">
            <Timeline />
          </div>
        </section>

        {/* Right Sidebar: Face Tuning Sliders */}
        <aside className="w-[320px] bg-studio-dark/85 border-l border-white/5 overflow-y-auto shrink-0 z-10 flex flex-col">
          <BeautyControls />
        </aside>

      </div>

      {/* Export Queue Floating Panel */}
      {exportQueue.length > 0 && (
        <div className="absolute bottom-6 right-6 z-50 flex flex-col gap-3 w-72 pointer-events-none">
          {exportQueue.map(item => (
            <div key={item.id} className="bg-studio-dark border border-white/10 rounded-xl p-3 shadow-2xl backdrop-blur-xl pointer-events-auto animate-fade-in slide-in-from-right-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-white truncate pr-2">{item.projectName}</span>
                {item.status === 'processing' && <Loader2 className="h-3.5 w-3.5 text-purple-400 animate-spin" />}
                {item.status === 'completed' && <CheckCircle className="h-3.5 w-3.5 text-green-400" />}
                {item.status === 'failed' && <XCircle className="h-3.5 w-3.5 text-red-400" />}
              </div>
              
              {item.status === 'processing' && (
                <>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden mb-1.5">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 ease-out"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-medium text-gray-400">
                    <span>Encoding {item.resolution}</span>
                    <span className="font-mono text-white">{item.progress}%</span>
                  </div>
                </>
              )}

              {item.status === 'completed' && item.downloadUrl && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-[10px] text-green-400 font-medium">Export Complete!</span>
                  <a 
                    href={item.downloadUrl}
                    download={`${item.projectName.replace(/\s+/g, '_')}_${item.resolution}.mp4`}
                    className="px-2.5 py-1 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded border border-green-500/20 text-[10px] font-bold transition-all hover:scale-105 active:scale-95"
                  >
                    Save File
                  </a>
                </div>
              )}

              {item.status === 'failed' && (
                <span className="text-[10px] text-red-400 font-medium block mt-1">Export failed. Please try again.</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Keyboard Shortcuts Help Modal */}
      {showShortcutsHelp && (
        <div 
          onClick={() => setShowShortcutsHelp(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()} // Prevent closing
            className="bg-studio-dark border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-fade-in cursor-default"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5 text-purple-400" />
                <h3 className="text-white font-bold text-base font-sans">Keyboard Shortcuts</h3>
              </div>
              <button 
                onClick={() => setShowShortcutsHelp(false)}
                className="text-gray-400 hover:text-white text-sm font-bold bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-md transition-colors"
              >
                ✕
              </button>
            </div>
            
            <p className="text-gray-400 text-[11px] mb-5">Speed up your workflow using SnapBeauty editor shortcuts:</p>
            
            <div className="space-y-3 font-sans">
              {[
                { keys: ['Space'], desc: 'Play / Pause video playback' },
                { keys: ['C'], desc: 'Split / Cut active clip at playhead' },
                { keys: ['Delete', 'Backspace'], desc: 'Delete currently selected clip' },
                { keys: ['←', '→'], desc: 'Nudge playhead frame-by-frame (1/30s)' },
                { keys: ['Ctrl', 'Z'], desc: 'Undo last action' },
                { keys: ['Ctrl', 'Y'], desc: 'Redo last undone action' },
                { keys: ['H'], desc: 'Toggle this Shortcuts Guide' }
              ].map((shortcut, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5">
                  <span className="text-gray-300 font-medium">{shortcut.desc}</span>
                  <div className="flex gap-1.5">
                    {shortcut.keys.map((k) => (
                      <kbd key={k} className="px-2 py-0.5 bg-black/60 border border-white/10 rounded text-[10px] text-purple-300 font-bold font-mono">
                        {k}
                      </kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

// Internal Subcomponent for Preset filters sidebar
const BeautyPresetsList: React.FC = () => {
  const { applyPreset, activePreset } = useApp();

  const presetsArray = [
    { name: 'None', desc: 'Original unaltered recording' },
    { name: 'Natural Beauty', desc: 'Subtle enhancement, smooth skin, eye glow' },
    { name: 'Soft Glam', desc: 'Vibrant highlight, pink lips, reshaping' },
    { name: 'Bridal Glow', desc: 'Clear brightening, bright smile, rose hue' },
    { name: 'Fashion Model', desc: 'Sharp details, high cheekbones, dark lips' },
    { name: 'Korean Beauty', desc: 'Glass-skin effect, baby face proportions' },
    { name: 'TikTok Creator', desc: 'Contoured chin, shiny lips, cute enlarge eyes' },
    { name: 'Snapchat Beauty', desc: 'Max skin correction, extreme doll eyes' },
    { name: 'Golden Hour Glow', desc: 'Sunset filter tones, golden eyes highlight' }
  ];

  return (
    <div className="p-4 flex-1 flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 shrink-0">One-Click Beauty Lenses</h3>
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {presetsArray.map((preset) => (
          <div
            key={preset.name}
            onClick={() => applyPreset(preset.name)}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              activePreset === preset.name
                ? 'bg-purple-500/10 border-purple-500/40'
                : 'bg-white/2 border-white/5 hover:bg-white/4 hover:border-white/10'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className={`text-xs font-bold ${activePreset === preset.name ? 'text-purple-300' : 'text-white'}`}>
                {preset.name}
              </span>
              {activePreset === preset.name && (
                <span className="h-2 w-2 rounded-full bg-purple-400 shadow-md shadow-purple-500" />
              )}
            </div>
            <p className="text-[10px] text-gray-400 mt-1 leading-snug">{preset.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

// Internal Subcomponent for Color Grading
const VideoColorGradingPanel: React.FC = () => {
  const { beautyValues, updateBeautyValue } = useApp();
  const [collapsedGroups, setCollapsedGroups] = React.useState<Record<string, boolean>>({
    'Effects': true,
    'Detail': true,
  });

  const toggleGroup = (groupTitle: string) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [groupTitle]: !prev[groupTitle]
    }));
  };

  const SliderGroup = ({ title, children }: { title: string, children: React.ReactNode }) => {
    const isCollapsed = !!collapsedGroups[title];
    return (
      <div className="mb-4 bg-white/2 border border-white/5 rounded-xl p-3 hover:border-white/10 transition-colors">
        <button
          onClick={() => toggleGroup(title)}
          className="w-full flex items-center justify-between text-left select-none focus:outline-none"
        >
          <span className="text-[10px] font-black text-purple-300 uppercase tracking-widest">
            {title}
          </span>
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5 text-gray-500 hover:text-white" />
          ) : (
            <ChevronDown className="h-3.5 w-3.5 text-gray-400 hover:text-white" />
          )}
        </button>
        
        {!isCollapsed && (
          <div className="space-y-4 mt-3">
            {children}
          </div>
        )}
      </div>
    );
  };

  const ColorSlider = ({ label, valueKey, min = -100, max = 100, isPercent = false }: { label: string, valueKey: keyof BeautyValues, min?: number, max?: number, isPercent?: boolean }) => {
    const val = beautyValues[valueKey] as number;
    return (
      <div className="space-y-1.5">
        <div className="flex justify-between text-[11px] font-medium text-gray-300">
          <span>{label}</span>
          <span className="text-purple-300 font-mono text-[10px] font-bold">
            {val > 0 && min < 0 ? '+' : ''}{val}{isPercent ? '%' : ''}
          </span>
        </div>
        <input 
          type="range" 
          min={min} 
          max={max} 
          value={val} 
          onChange={(e) => updateBeautyValue(valueKey, parseInt(e.target.value))} 
          className="w-full h-1.5 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer accent-purple-500" 
        />
      </div>
    );
  };

  return (
    <div className="p-4 flex-1 flex flex-col overflow-hidden">
      <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-6 shrink-0 flex items-center gap-2">
        <Palette className="h-4 w-4 text-purple-400" />
        Global Color Grade
      </h3>
      
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        <SliderGroup title="Light">
          <ColorSlider label="Exposure" valueKey="cgExposure" min={-50} max={100} isPercent />
          <ColorSlider label="Contrast" valueKey="cgContrast" min={-50} max={100} isPercent />
          <ColorSlider label="Highlights" valueKey="cgHighlights" min={-100} max={100} />
          <ColorSlider label="Shadows" valueKey="cgShadows" min={-100} max={100} />
        </SliderGroup>

        <SliderGroup title="Color">
          <ColorSlider label="Temperature" valueKey="cgTemperature" min={-100} max={100} />
          <ColorSlider label="Tint" valueKey="cgTint" min={-100} max={100} />
          <ColorSlider label="Vibrance" valueKey="cgVibrance" min={-100} max={100} isPercent />
          <ColorSlider label="Saturation" valueKey="cgSaturation" min={-100} max={100} isPercent />
        </SliderGroup>

        <SliderGroup title="Effects">
          <ColorSlider label="Glow (Bloom)" valueKey="cgGlow" min={0} max={100} isPercent />
          <ColorSlider label="Clarity" valueKey="cgClarity" min={0} max={100} />
          <ColorSlider label="Vignette" valueKey="cgVignette" min={0} max={100} isPercent />
        </SliderGroup>

        <SliderGroup title="Detail">
          <ColorSlider label="Sharpening" valueKey="cgSharpening" min={0} max={100} />
        </SliderGroup>
      </div>
    </div>
  );
};

export default EditorWorkspace;
