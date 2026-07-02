import React, { useState, useRef } from 'react';
import { useApp, VideoMetadata } from '../context/AppContext';
import { Camera, FolderPlus, Upload, Shield, LogOut, Video, Trash2, Clock, Sparkles, ShoppingBag, Eye } from 'lucide-react';
import LegalModal from './LegalModal';

const Dashboard: React.FC = () => {
  const { 
    user, 
    logout, 
    projects, 
    selectProject, 
    deleteProject, 
    createProject, 
    exportQueue 
  } = useApp();

  const [newProjName, setNewProjName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [importedVideo, setImportedVideo] = useState<VideoMetadata | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Legal Modal
  const [legalOpen, setLegalOpen] = useState(false);
  const [legalTab, setLegalTab] = useState<'terms' | 'privacy' | 'aup'>('terms');

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  // Process a real video file: create blob URL and read actual metadata
  const processVideoFile = (file: File) => {
    // Revoke previous blob URL to avoid memory leaks
    if (videoPreviewUrl) URL.revokeObjectURL(videoPreviewUrl);
    const blobUrl = URL.createObjectURL(file);
    setVideoPreviewUrl(blobUrl);

    // Read real video duration & dimensions via a hidden video element
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = blobUrl;
    tempVideo.onloadedmetadata = () => {
      const duration = Math.round(tempVideo.duration) || 0;
      const videoWidth = tempVideo.videoWidth || 1920;
      const videoHeight = tempVideo.videoHeight || 1080;
      const is4K = videoWidth >= 3840;
      const is1440p = videoWidth >= 2560;
      const resolution = is4K ? '3840×2160 (4K)' : is1440p ? '2560×1440 (1440p)' : `${videoWidth}×${videoHeight}`;
      const fps = duration > 0 && tempVideo.duration > 0 ? 30 : 30; // fps detection would need more APIs
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';

      const metadata: VideoMetadata = {
        name: file.name,
        resolution,
        fps,
        duration,
        size: sizeStr,
        url: blobUrl,
        file,
      };
      setImportedVideo(metadata);
      if (!newProjName) {
        setNewProjName(file.name.substring(0, file.name.lastIndexOf('.')) || file.name);
      }
    };
    tempVideo.onerror = () => {
      // Fallback if metadata can't be read
      const sizeStr = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
      setImportedVideo({ name: file.name, resolution: '1920×1080', fps: 30, duration: 0, size: sizeStr, url: blobUrl, file });
    };
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processVideoFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processVideoFile(e.target.files[0]);
    }
  };

  const handleCreateProject = () => {
    if (!importedVideo) return;
    createProject(newProjName || 'Untitled Project', importedVideo);
  };

  // Mock preset project templates
  const applyPresetTemplate = (name: string, videoName: string, duration: number) => {
    const videoData: VideoMetadata = {
      name: videoName,
      resolution: '1920×1080 (1080p)',
      fps: 30,
      duration,
      size: '1.8 MB',
      url: window.location.origin + '/videos/' + videoName
    };
    createProject(name, videoData);
  };

  return (
    <div className="h-screen w-screen flex flex-col font-sans relative overflow-hidden bg-studio-darker text-gray-200">
      
      {/* Top Header Bar */}
      <header className="h-16 border-b border-white/5 bg-studio-dark/85 backdrop-blur-md px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded bg-white flex items-center justify-center">
            <Camera className="text-black h-4 w-4" />
          </div>
          <span className="text-lg font-bold text-white tracking-wide flex items-center gap-2">
            SnapBeauty Studio
            <span className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-purple-500/30 translate-y-0.5">
              Beta
            </span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-semibold animate-pulse">
            <Shield className="h-3.5 w-3.5 fill-purple-500/10" />
            <span>Full Access Active</span>
          </div>

          <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right">
              <p className="text-xs text-white font-medium">{user?.email}</p>
              <p className="text-[10px] text-gray-400">Creator Account</p>
            </div>
            <button 
              onClick={logout}
              title="Sign Out"
              className="h-8 w-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard body */}
      <main className="flex-1 overflow-y-auto p-8 grid grid-cols-12 gap-8 relative z-10">
        
        {/* Left Section: Create and Templates (7 cols) */}
        <section className="col-span-12 lg:col-span-7 space-y-8">
          
          {/* Create Project / File Dropzone */}
          <div className="bg-studio-dark border border-white/5 p-6 rounded-xl space-y-6">
            <div className="flex items-center gap-2.5">
              <FolderPlus className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-bold text-white">Create New Project</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Drag and Drop Zone */}
              <div 
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                  isDragOver 
                    ? 'border-purple-400 bg-purple-500/5' 
                    : 'border-white/10 hover:border-white/20 bg-white/2 hover:bg-white/3'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/*"
                  className="hidden"
                />
                <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center text-gray-400 mb-4 shadow-inner">
                  <Upload className="h-8 w-8 text-gray-400 mb-3" />
                </div>
                <p className="text-sm font-medium text-white mb-1">Click to browse or drag video here</p>
                <p className="text-xs text-gray-400 mb-3">MP4, WebM up to 4K resolution</p>
                
                <div className="flex items-start gap-1.5 text-left bg-yellow-500/10 border border-yellow-500/20 rounded p-2 mt-2 w-full max-w-[280px]">
                  <Sparkles className="h-3 w-3 text-yellow-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-yellow-300/90 leading-tight">
                    <strong className="text-yellow-400">Beta Version:</strong> SnapBeauty works best with a single, well-lit subject in the frame. Extreme motion may cause tracking artifacts.
                  </p>
                </div>
              </div>

              {/* Project settings details */}
              <div className="flex flex-col justify-between space-y-4">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-400 font-medium">Project Name</label>
                    <input 
                      type="text"
                      placeholder="e.g. Beauty Vlog Vlog"
                      value={newProjName}
                      onChange={(e) => setNewProjName(e.target.value)}
                      className="w-full bg-studio-darker border border-white/10 rounded px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30 transition-colors"
                    />
                  </div>

                  {importedVideo && (
                    <div className="p-3 rounded-lg bg-white/3 border border-white/5 space-y-2">
                      <div className="flex items-center gap-2 text-xs text-white font-semibold truncate">
                        <Video className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                        <span>{importedVideo.name}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-y-1 gap-x-2 text-[10px] text-gray-400">
                        <div>Res: {importedVideo.resolution}</div>
                        <div>FPS: {importedVideo.fps} fps</div>
                        <div>Duration: {importedVideo.duration}s</div>
                        <div>Size: {importedVideo.size}</div>
                      </div>
                    </div>
                  )}
                </div>

                <button
                  onClick={handleCreateProject}
                  disabled={!importedVideo}
                  className={`w-full py-2.5 rounded text-black font-semibold text-xs flex items-center justify-center gap-2 transition-all ${
                    importedVideo 
                      ? 'bg-white hover:bg-gray-200 cursor-pointer' 
                      : 'bg-white/5 text-gray-500 cursor-not-allowed border border-white/5'
                  }`}
                >
                  <FolderPlus className="h-4 w-4" />
                  <span>Start Editing</span>
                </button>
              </div>
            </div>
          </div>

          {/* Quick Presets / Template Library */}
          <div className="bg-studio-dark border border-white/5 p-6 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Sparkles className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-bold text-white font-sans">Quick Start Beauty Presets</h2>
              </div>
              <span className="text-[10px] bg-white/5 text-gray-400 px-2 py-0.5 rounded border border-white/10 font-bold uppercase tracking-wider">Templates</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { name: 'Natural Beauty', video: 'natural_beauty.mp4', label: 'Daily Vlog', dur: 7 },
                { name: 'Bridal Glow', video: 'wedding_portrait.mp4', label: 'Wedding Shoot', dur: 7 },
                { name: 'TikTok Creator', video: 'dance_clip.mp4', label: 'Short Video', dur: 27 },
                { name: 'Snapchat Beauty', video: 'snap_lens.mp4', label: 'Extreme Smooth', dur: 7 }
              ].map((tpl) => (
                <div 
                  key={tpl.name}
                  onClick={() => applyPresetTemplate(tpl.name, tpl.video, tpl.dur)}
                  className="group relative rounded-xl overflow-hidden aspect-[3/4] bg-studio-dark border border-white/5 hover:border-purple-500/50 cursor-pointer flex flex-col justify-end p-3 transition-all"
                >
                  {/* Decorative Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent z-0 group-hover:scale-105 transition-transform" />
                  
                  {/* Aspect Icon Indicator */}
                  <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center text-white/75 border border-white/10">
                    <Eye className="h-3 w-3" />
                  </div>

                  <div className="relative z-10 space-y-1">
                    <span className="text-[9px] text-purple-400 font-bold tracking-wider uppercase">{tpl.label}</span>
                    <h3 className="text-xs font-bold text-white leading-tight group-hover:text-purple-300 transition-colors">{tpl.name}</h3>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Right Section: Recent Projects & Export Queue (5 cols) */}
        <section className="col-span-12 lg:col-span-5 space-y-8">
          
          {/* Recent Projects List */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col h-[340px]">
            <div className="flex items-center gap-2.5 mb-4 shrink-0">
              <Clock className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Recent Projects</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {projects.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-6 text-gray-500 border border-dashed border-white/5 rounded-xl">
                  <Video className="h-8 w-8 opacity-40 mb-2" />
                  <p className="text-xs">No recent projects found</p>
                  <p className="text-[10px] opacity-80">Import a video to get started</p>
                </div>
              ) : (
                projects.map((proj) => (
                  <div 
                    key={proj.id}
                    className="group flex items-center justify-between p-3 rounded-xl bg-white/2 hover:bg-white/4 border border-white/5 hover:border-white/10 transition-all cursor-pointer"
                  >
                    <div 
                      onClick={() => selectProject(proj.id)}
                      className="flex items-center gap-3 flex-1 min-w-0"
                    >
                      <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center shrink-0">
                        <Video className="h-5 w-5 text-purple-400" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-semibold text-white truncate group-hover:text-purple-300 transition-colors">{proj.name}</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">{proj.updatedAt} • {proj.video?.duration || 0}s duration</p>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); deleteProject(proj.id); }}
                      title="Delete Project"
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Export Queue Monitoring */}
          <div className="glass-panel p-6 rounded-2xl flex flex-col h-[200px]">
            <div className="flex items-center gap-2.5 mb-4 shrink-0">
              <ShoppingBag className="h-5 w-5 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Export & Rendering Queue</h2>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {exportQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center py-4 text-gray-500 border border-dashed border-white/5 rounded-xl">
                  <p className="text-xs">No active exports</p>
                  <p className="text-[10px] opacity-80">Renders will appear here in real-time</p>
                </div>
              ) : (
                exportQueue.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-white/2 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-white font-semibold truncate max-w-[150px]">{item.projectName}</span>
                      <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        item.status === 'completed' 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : item.status === 'processing'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20 animate-pulse'
                          : 'bg-gray-500/10 text-gray-400 border border-gray-500/20'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${item.progress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[9px] text-gray-400">
                        <span>{item.resolution} • {item.format.toUpperCase()}</span>
                        <span>{item.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </section>

      </main>

      {/* Footer Links */}
      <footer className="h-10 border-t border-white/5 bg-studio-darker flex items-center justify-center gap-6 text-[10px] text-gray-500 z-10 relative">
        <button onClick={() => { setLegalTab('terms'); setLegalOpen(true); }} className="hover:text-gray-300 transition-colors">Terms of Service</button>
        <button onClick={() => { setLegalTab('privacy'); setLegalOpen(true); }} className="hover:text-gray-300 transition-colors">Privacy Policy</button>
        <button onClick={() => { setLegalTab('aup'); setLegalOpen(true); }} className="hover:text-gray-300 transition-colors">Acceptable Use</button>
        <span className="opacity-50">© 2026 SnapBeauty Studio</span>
      </footer>

      <LegalModal 
        isOpen={legalOpen} 
        onClose={() => setLegalOpen(false)} 
        initialTab={legalTab} 
      />

    </div>
  );
};

export default Dashboard;
