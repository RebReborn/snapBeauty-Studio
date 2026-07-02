import React, { useRef, useEffect, useState } from 'react';
import { useApp } from '../context/AppContext';
import { 
  Scissors, ZoomIn, ZoomOut, Play, Pause, 
  Volume2, Video, Sparkles, Trash2 
} from 'lucide-react';

const Timeline: React.FC = () => {
  const { 
    activeProject, 
    timelineClips, 
    audioTrackClips,
    playheadPosition, 
    setPlayheadPosition, 
    isPlaying, 
    setIsPlaying, 
    splitClip, 
    trimClip,
    moveClip,
    zoomLevel, 
    setZoomLevel,
    selectedClipId,
    setSelectedClipId,
    deleteClip,
    useTransitions,
    setUseTransitions
  } = useApp();

  const rulerRef = useRef<HTMLDivElement>(null);
  const [isScrubbing, setIsScrubbing] = useState(false);

  // Calculate width factors based on zoom
  // Base scale: 1 second = zoomLevel * 0.15 pixels (e.g., 50 * 0.15 = 7.5px/sec, max 100 * 0.15 = 15px/sec)
  const pxPerSec = zoomLevel * 0.25 + 5; 
  const totalDuration = activeProject?.video?.duration || 42;
  const timelineWidth = totalDuration * pxPerSec;

  // Format time (seconds) to human-readable text
  const formatTimeText = (sec: number) => {
    const s = Math.floor(sec);
    const ms = Math.floor((sec % 1) * 10);
    return `${s}.${ms}s`;
  };

  // Scrubber action
  const handleScrub = (clientX: number) => {
    if (!rulerRef.current) return;
    const rect = rulerRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const seconds = Math.max(0, Math.min(totalDuration, relativeX / pxPerSec));
    setPlayheadPosition(seconds);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsScrubbing(true);
    handleScrub(e.clientX);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isScrubbing) return;
      handleScrub(e.clientX);
    };

    const handleMouseUp = () => {
      setIsScrubbing(false);
    };

    if (isScrubbing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isScrubbing, pxPerSec]);

  // Mock clip trim drag handles
  const handleTrimStart = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / pxPerSec;
      trimClip(clipId, 'start', deltaSec);
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleTrimEnd = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const startX = e.clientX;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / pxPerSec;
      trimClip(clipId, 'end', deltaSec);
    };
    
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleClipDrag = (clipId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    
    const startX = e.clientX;
    const clip = timelineClips.find(c => c.id === clipId);
    if (!clip) return;
    const initialStart = clip.start;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaPx = moveEvent.clientX - startX;
      const deltaSec = deltaPx / pxPerSec;
      moveClip(clipId, initialStart + deltaSec);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  // Build vertical ruler markers (ticks every 1, 5 or 10 seconds depending on zoom)
  const renderRulerTicks = () => {
    const ticks = [];
    const interval = pxPerSec > 20 ? 2 : 5; // spacing ticks
    for (let i = 0; i <= totalDuration; i += interval) {
      ticks.push(
        <div 
          key={i} 
          className="absolute top-0 flex flex-col items-center justify-between h-full border-l border-white/10"
          style={{ left: `${i * pxPerSec}px` }}
        >
          <span className="text-[9px] font-mono text-gray-500 font-bold select-none pl-1 mt-1">
            {formatTimeText(i)}
          </span>
          <div className="h-1.5 w-[1px] bg-white/20" />
        </div>
      );
    }
    return ticks;
  };

  return (
    <div className="flex-1 flex flex-col font-sans select-none overflow-hidden h-full bg-studio-dark border-t border-white/5">
      
      {/* Timeline Control Bar */}
      <div className="h-10 px-4 bg-[#0e0e12] border-b border-white/5 flex items-center justify-between shrink-0">
        
        {/* Playback Actions */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="h-7 px-3.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-bold flex items-center gap-1.5 active:scale-[0.97] transition-all"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>
          
          <button
            onClick={splitClip}
            className="h-7 px-3.5 rounded-lg bg-white/5 hover:bg-white/10 text-white border border-white/5 text-xs font-bold flex items-center gap-1.5 active:scale-[0.97] transition-all"
          >
            <Scissors className="h-3.5 w-3.5 text-gray-400" />
            <span>Split Clip</span>
          </button>

          {/* Transitions Toggle */}
          <button
            onClick={() => setUseTransitions(!useTransitions)}
            className={`h-7 px-3.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 active:scale-[0.97] transition-all ${
              useTransitions 
                ? 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border-purple-500/30' 
                : 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'
            }`}
            title="Toggle automatic dip-to-black transitions on clip cuts"
          >
            <Sparkles className={`h-3.5 w-3.5 ${useTransitions ? 'text-purple-400' : 'text-gray-500'}`} />
            <span>Transitions: {useTransitions ? 'ON' : 'OFF'}</span>
          </button>

          {/* Delete selected clip */}
          {selectedClipId && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteClip(selectedClipId, false); }}
              className="h-7 px-3 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/20 text-xs font-bold flex items-center gap-1.5 active:scale-[0.97] transition-all"
              title="Delete clip (leaves a gap)"
            >
              <Trash2 className="h-3.5 w-3.5 text-red-400" />
              <span>Delete</span>
            </button>
          )}

          {/* Ripple Delete selected clip */}
          {selectedClipId && (
            <button
              onClick={(e) => { e.stopPropagation(); deleteClip(selectedClipId, true); }}
              className="h-7 px-3 rounded-lg bg-orange-500/15 hover:bg-orange-500/25 text-orange-300 border border-orange-500/20 text-xs font-bold flex items-center gap-1.5 active:scale-[0.97] transition-all"
              title="Ripple delete (closes the gap)"
            >
              <Sparkles className="h-3.5 w-3.5 text-orange-400" />
              <span>Ripple Delete</span>
            </button>
          )}
        </div>

        {/* Zoom Scrubber controls */}
        <div className="flex items-center gap-3">
          <ZoomOut 
            onClick={() => setZoomLevel(Math.max(10, zoomLevel - 10))}
            className="h-3.5 w-3.5 text-gray-400 hover:text-white cursor-pointer transition-colors" 
          />
          <input
            type="range"
            min="10"
            max="100"
            value={zoomLevel}
            onChange={(e) => setZoomLevel(parseInt(e.target.value))}
            className="w-32 accent-purple-400"
          />
          <ZoomIn 
            onClick={() => setZoomLevel(Math.min(100, zoomLevel + 10))}
            className="h-3.5 w-3.5 text-gray-400 hover:text-white cursor-pointer transition-colors" 
          />
        </div>

      </div>

      {/* Main Timeline Workspace (Split columns) */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Column: Fixed Track Headers (Sidebar) */}
        <div className="w-12 bg-[#0e0e12]/95 border-r border-white/5 flex flex-col shrink-0 select-none">
          {/* Ruler Corner Spacer */}
          <div className="h-6 bg-[#0f0f13] border-b border-white/5 shrink-0" />
          
          {/* Tracks Labels Container (vertical matching) */}
          <div className="flex-1 flex flex-col justify-center py-2 min-h-0">
            {/* Video Label */}
            <div className="h-[60px] border-b border-white/5 flex items-center justify-center text-gray-400">
              <Video className="h-4 w-4" />
            </div>
            {/* Audio Label */}
            <div className="h-[45px] flex items-center justify-center text-gray-400">
              <Volume2 className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* Right Column: Scrollable Tracks & Ruler */}
        <div 
          onClick={() => setSelectedClipId(null)}
          className="flex-1 overflow-x-auto overflow-y-hidden flex flex-col relative"
        >
          
          {/* Grid Background */}
          <div 
            className="absolute inset-0 timeline-track-bg pointer-events-none"
            style={{ width: `${timelineWidth}px` }}
          />

          {/* 1. Time Ruler Header */}
          <div 
            ref={rulerRef}
            onMouseDown={handleMouseDown}
            className="h-6 bg-[#0f0f13] border-b border-white/5 relative cursor-ew-resize select-none shrink-0"
            style={{ width: `${timelineWidth}px` }}
          >
            {renderRulerTicks()}
          </div>

          {/* Tracks Content Box */}
          <div className="flex-1 flex flex-col justify-center py-2 relative min-h-0">
            
            {/* Track 1: Video */}
            <div className="h-[60px] border-b border-white/5 relative py-1 bg-black/10">
              {/* Video Clips layout */}
              <div className="h-full relative w-full">
                {timelineClips.map((clip) => {
                  const isSelected = selectedClipId === clip.id;
                  return (
                    <div
                      key={clip.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); }}
                      onMouseDown={(e) => handleClipDrag(clip.id, e)}
                      className={`absolute h-full rounded-lg overflow-hidden flex items-center justify-between p-2 select-none group cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-gradient-to-r from-purple-800/80 to-pink-800/80 border-2 border-purple-400 shadow-lg shadow-purple-500/20 z-20 scale-[0.98]' 
                          : 'bg-gradient-to-r from-purple-900/50 to-pink-900/50 border border-purple-500/20 hover:border-purple-500/40 z-10'
                      }`}
                      style={{
                        left: `${clip.start * pxPerSec}px`,
                        width: `${(clip.end - clip.start) * pxPerSec}px`,
                      }}
                    >
                      {/* Left Trim Handle */}
                      <div 
                        onMouseDown={(e) => handleTrimStart(clip.id, e)}
                        className="absolute left-0 top-0 bottom-0 w-2.5 bg-purple-500/70 cursor-w-resize rounded-l-md hover:bg-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      />

                      {/* Clip Label */}
                      <div className="text-[10px] font-semibold text-white px-2 truncate leading-tight select-none">
                        {activeProject?.video?.name || 'video_layer.mp4'} 
                        <span className="text-gray-400 font-normal ml-1">
                          [src: {formatTimeText(clip.sourceStart)} - {formatTimeText(clip.sourceEnd)}]
                        </span>
                      </div>

                      {/* Right Trim Handle */}
                      <div 
                        onMouseDown={(e) => handleTrimEnd(clip.id, e)}
                        className="absolute right-0 top-0 bottom-0 w-2.5 bg-purple-500/70 cursor-e-resize rounded-r-md hover:bg-purple-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Track 2: Audio */}
            <div className="h-[45px] relative py-1 bg-black/10">
              {/* Audio Clips layout (Waveform simulation) */}
              <div className="h-full relative w-full">
                {audioTrackClips.map((clip) => (
                  <div
                    key={clip.id}
                    className="absolute h-[32px] top-1 rounded-lg bg-teal-950/40 border border-teal-500/20 overflow-hidden flex items-center justify-between p-1 select-none"
                    style={{
                      left: `${clip.start * pxPerSec}px`,
                      width: `${(clip.end - clip.start) * pxPerSec}px`,
                    }}
                  >
                    {/* Simulated Waveform SVG */}
                    <div className="w-full h-full flex items-center gap-[2px] px-2 opacity-50">
                      {Array.from({ length: Math.ceil((clip.end - clip.start) * pxPerSec / 8) }).map((_, i) => (
                        <div 
                          key={i} 
                          className="w-[3px] bg-teal-400 rounded-full" 
                          style={{ height: `${20 + Math.sin(i * 0.4) * 12 + (i % 3 === 0 ? 5 : 0)}%` }}
                        />
                      ))}
                    </div>

                    <div className="absolute left-3 text-[8px] font-semibold text-teal-300 select-none">
                      Audio Track (Stereo)
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 3. Scrubbing Vertical Playhead */}
          <div 
            className="absolute top-0 bottom-0 w-[2px] bg-purple-500 z-30 pointer-events-none"
            style={{ left: `${playheadPosition * pxPerSec}px` }}
          >
            {/* Scrubber pin top handle */}
            <div className="absolute top-0 -left-[5px] h-3 w-3 rounded-full bg-purple-500 border border-white shadow shadow-purple-500/80" />
          </div>

        </div>

      </div>

    </div>
  );
};

export default Timeline;
