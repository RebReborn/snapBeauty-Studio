import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { User, Palette, Trash2, Edit3, Share2, X, Check, Globe } from 'lucide-react';

const ProfileSettingsModal: React.FC = () => {
  const {
    user,
    customPresets,
    renamePreset,
    deletePreset,
    publishPresetToMarketplace,
    unpublishPresetFromMarketplace,
    publishedPresetNames,
    updateProfileName,
    showProfileSettings,
    setShowProfileSettings
  } = useApp();

  const [newName, setNewName] = useState(user?.displayName || '');
  const [isSavingName, setIsSavingName] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Rename preset inline states
  const [renamingPresetName, setRenamingPresetName] = useState<string | null>(null);
  const [newPresetNameInput, setNewPresetNameInput] = useState('');

  if (!showProfileSettings) return null;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setProfileMessage({ text: 'Display name cannot be empty.', type: 'error' });
      return;
    }
    setIsSavingName(true);
    setProfileMessage(null);
    try {
      await updateProfileName(newName.trim());
      setProfileMessage({ text: 'Profile updated successfully!', type: 'success' });
      setTimeout(() => setProfileMessage(null), 3000);
    } catch (err: any) {
      setProfileMessage({ text: err.message || 'Failed to update profile.', type: 'error' });
    } finally {
      setIsSavingName(false);
    }
  };

  const handleStartRename = (name: string) => {
    setRenamingPresetName(name);
    setNewPresetNameInput(name);
  };

  const handleSaveRename = async (oldName: string) => {
    if (!newPresetNameInput.trim() || newPresetNameInput === oldName) {
      setRenamingPresetName(null);
      return;
    }
    try {
      await renamePreset(oldName, newPresetNameInput.trim());
      setRenamingPresetName(null);
    } catch (error) {
      alert('Failed to rename preset.');
    }
  };

  return (
    <div 
      onClick={() => setShowProfileSettings(false)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 cursor-pointer"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-studio-dark border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden cursor-default flex flex-col max-h-[85vh] animate-fade-in font-sans"
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between shrink-0 bg-white/2">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Account Settings</h3>
              <p className="text-[10px] text-gray-400">Manage your profile and custom templates</p>
            </div>
          </div>
          <button 
            onClick={() => setShowProfileSettings(false)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Scroll Body */}
        <div className="p-6 overflow-y-auto space-y-8 flex-1 custom-scrollbar">
          
          {/* Section 1: Manage Profile */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white border-b border-white/5 pb-2">
              <User className="h-4 w-4 text-purple-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">User Profile</h4>
            </div>

            <form onSubmit={handleSaveName} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Email Address</label>
                <input 
                  type="text" 
                  value={user?.email || 'Not logged in'} 
                  disabled 
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/5 text-gray-400 text-xs cursor-not-allowed font-medium font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Display Name</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={newName} 
                    onChange={(e) => setNewName(e.target.value)} 
                    placeholder="Enter your name"
                    className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 focus:border-purple-500 text-white text-xs outline-none transition-all"
                  />
                  <button 
                    type="submit"
                    disabled={isSavingName}
                    className="px-4 py-2 rounded-xl bg-purple-500 hover:bg-purple-600 text-white text-xs font-bold transition-all disabled:opacity-50 active:scale-[0.97]"
                  >
                    {isSavingName ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </form>

            {profileMessage && (
              <p className={`text-[10px] font-bold px-3 py-1.5 rounded-lg ${
                profileMessage.type === 'success' 
                  ? 'bg-green-500/10 border border-green-500/20 text-green-400' 
                  : 'bg-red-500/10 border border-red-500/20 text-red-400'
              }`}>
                {profileMessage.text}
              </p>
            )}
          </div>

          {/* Section 2: Manage Presets */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white border-b border-white/5 pb-2">
              <Palette className="h-4 w-4 text-purple-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider">My Custom Presets ({Object.keys(customPresets).length})</h4>
            </div>

            {Object.keys(customPresets).length === 0 ? (
              <div className="py-6 text-center text-xs text-gray-500 bg-white/2 border border-white/5 border-dashed rounded-xl">
                You haven't saved any custom presets yet.
              </div>
            ) : (
              <div className="space-y-2.5">
                {Object.keys(customPresets).map((presetName) => {
                  const isRenaming = renamingPresetName === presetName;
                  const isPublished = publishedPresetNames.includes(presetName);
                  return (
                    <div 
                      key={presetName} 
                      className="p-3.5 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 flex items-center justify-between gap-4 transition-all"
                    >
                      {/* Name input / Label */}
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <div className="flex items-center gap-2 max-w-[280px]">
                            <input 
                              type="text" 
                              value={newPresetNameInput} 
                              onChange={(e) => setNewPresetNameInput(e.target.value)}
                              className="px-2.5 py-1 rounded bg-black/40 border border-purple-500 text-white text-xs outline-none focus:ring-1 focus:ring-purple-500/50 w-full"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(presetName);
                                if (e.key === 'Escape') setRenamingPresetName(null);
                              }}
                            />
                            <button 
                              onClick={() => handleSaveRename(presetName)}
                              className="h-6 w-6 rounded bg-purple-500 flex items-center justify-center text-white"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                            <button 
                              onClick={() => setRenamingPresetName(null)}
                              className="h-6 w-6 rounded bg-white/5 flex items-center justify-center text-gray-400 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <span className="text-xs font-bold text-white leading-tight block truncate">{presetName}</span>
                            <span className="text-[9px] text-gray-500">Custom Retouching Preset</span>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button 
                          onClick={() => handleStartRename(presetName)}
                          title="Rename Preset"
                          disabled={isRenaming}
                          className="h-7 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <Edit3 className="h-3 w-3 text-purple-400" />
                          <span>Rename</span>
                        </button>

                        {isPublished ? (
                          <button 
                            onClick={() => unpublishPresetFromMarketplace(presetName)}
                            title="Remove from Community Marketplace"
                            className="h-7 px-2.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-300 text-[10px] font-semibold flex items-center gap-1 border border-red-500/20 transition-all active:scale-[0.97]"
                          >
                            <Globe className="h-3 w-3 text-red-400" />
                            <span>Unpublish</span>
                          </button>
                        ) : (
                          <button 
                            onClick={() => publishPresetToMarketplace(presetName)}
                            title="Publish to Community Marketplace"
                            className="h-7 px-2.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] font-semibold flex items-center gap-1 border border-purple-500/20 transition-all active:scale-[0.97]"
                          >
                            <Share2 className="h-3 w-3 text-purple-400" />
                            <span>Publish</span>
                          </button>
                        )}

                        <button 
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${presetName}"?`)) {
                              deletePreset(presetName);
                            }
                          }}
                          title="Delete Preset"
                          className="h-7 w-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center transition-colors"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex justify-end shrink-0 bg-white/1">
          <button 
            onClick={() => setShowProfileSettings(false)}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-semibold transition-all active:scale-[0.97]"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;
