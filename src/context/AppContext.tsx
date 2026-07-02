import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth, db } from '../lib/firebase';
import { onAuthStateChanged, signOut, updateProfile } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, onSnapshot } from 'firebase/firestore';
import { DeterministicExporter } from '../services/DeterministicExporter';

// Interfaces
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL?: string | null;
  isPro?: boolean;
}

export interface VideoMetadata {
  name: string;
  resolution: string;
  fps: number;
  duration: number; // in seconds
  size: string;
  url: string;
  file?: File;
}

export interface Project {
  id: string;
  name: string;
  updatedAt: string;
  video: VideoMetadata | null;
}

export interface BeautyValues {
  // Skin
  skinSmoothness: number;
  skinBlemish: number;
  skinAcne: number;
  skinWrinkle: number;
  skinOil: number;
  skinTone: number;
  
  // Teeth
  teethWhitening: number;
  teethBrightness: number;
  teethNatural: number;
  teethPremium: number;
  
  // Eyes
  eyeBrightening: number;
  eyeSharpening: number;
  eyeDarkCircle: number;
  eyeEnlargement: number;
  eyeIrisDetail: number;
  eyeIrisBrightness: number; // 0 to 100
  eyeColor: 'default' | 'blue' | 'green' | 'hazel' | 'gray' | 'violet';
  
  bodySkinRetouch: number;
  bodySkinColor: string;
  bodySkinTolerance: number;
  
  // Reshaping
  faceSlimming: number;
  faceJawline: number;
  faceCheek: number;
  faceChin: number;
  
  // Nose
  noseWidth: number;
  noseBridge: number;
  noseLength: number;
  
  // Lips
  lipFullness: number;
  lipColor: string;
  lipColorIntensity: number;
  lipGloss: number;
  lipDefinition: number;
  lipTexture: 'matte' | 'gloss' | 'sheen';

  // Digital Makeup
  makeupBlush: number;
  makeupBlushColor: string;
  makeupEyeshadow: number;
  makeupEyeshadowColor: string;
  makeupEyeliner: number;
  makeupEyelinerColor: string;
  makeupMascara: number;
  makeupContour: number;
  makeupEyebrows: number;
  makeupEyebrowsColor: string;

  // Color Grading (Global)
  cgExposure: number;
  cgContrast: number;
  cgHighlights: number;
  cgShadows: number;
  cgTemperature: number;
  cgTint: number;
  cgVibrance: number;
  cgSaturation: number;
  cgGlow: number;
  cgClarity: number;
  cgSharpening: number;
  cgVignette: number;
  cgCinematicFilter: 'none' | 'teal-orange' | 'vintage' | 'cyberpunk' | 'warm-gold' | 'monochrome';
  
  // Color Grading (Face Only)
  faceWarmth: number;
  faceTint: number;
  faceSaturation: number;
  faceContrast: number;
  faceBrightness: number;
  
  // G7X Camera Look
  g7xFlashIntensity: number; // 0 to 100
  g7xSubjectContrast: number; // 0 to 100
  g7xSubjectShadows: number; // -100 to 100
  g7xSubjectHighlights: number; // -100 to 100
  g7xBackgroundDim: number; // 0 to 100
  g7xColorShift: number; // 0 to 100
  g7xHighlightBloom: number; // 0 to 100
  g7xCoolShadows: number; // 0 to 100
  g7xGrainAmount: number; // 0 to 100

  // Detail & Clarity Engine (Proteus Parameters)
  lucidRevertCompression: number; // 0 to 100
  lucidRecoverDetails: number;    // 0 to 100
  lucidSharpen: number;           // 0 to 100
  lucidReduceNoise: number;       // 0 to 100
  lucidDehalo: number;            // 0 to 100
  lucidAntiAliasDeblur: number;   // -100 to 100
  lucidAddNoise: number;          // 0 to 100
}

export interface TimelineClip {
  id: string;
  start: number; // seconds in timeline
  end: number; // seconds in timeline
  sourceStart: number; // seconds in video
  sourceEnd: number; // seconds in video
}

export interface ExportItem {
  id: string;
  projectName: string;
  progress: number;
  status: 'pending' | 'processing' | 'encoding' | 'completed' | 'failed';
  resolution: string;
  format: string;
  downloadUrl?: string;
}

export interface Lens {
  id: string;
  name: string;
  creator: string;
  rating: number;
  reviewsCount: number;
  downloads: string;
  price: 'Free' | string;
  category: 'featured' | 'trending' | 'new';
  imageUrl: string;
  isDownloaded: boolean;
  values?: BeautyValues;
}

interface AppContextType {
  user: User | null;
  currentView: 'auth' | 'dashboard' | 'editor' | 'marketplace';
  projects: Project[];
  activeProject: Project | null;
  beautyValues: BeautyValues;
  isAutoBeautifyActive: boolean;
  activePreset: string;
  timelineClips: TimelineClip[];
  audioTrackClips: TimelineClip[];
  selectedClipId: string | null;
  setSelectedClipId: (id: string | null) => void;
  deleteClip: (clipId: string, ripple?: boolean) => void;
  showShortcutsHelp: boolean;
  setShowShortcutsHelp: (show: boolean) => void;
  useTransitions: boolean;
  setUseTransitions: (active: boolean) => void;
  playheadPosition: number; // seconds
  isPlaying: boolean;
  zoomLevel: number;
  exportQueue: ExportItem[];
  updateExportProgress: (id: string, progress: number, status?: ExportItem['status'], url?: string) => void;
  showExportModal: boolean;
  marketplaceLenses: Lens[];
  
  // Methods
  login: (email: string) => void;
  logout: () => void;
  register: (email: string) => void;
  upgradeToPro: () => void;
  setView: (view: 'auth' | 'dashboard' | 'editor' | 'marketplace') => void;
  createProject: (name: string, video: VideoMetadata | null) => Project;
  selectProject: (projectId: string) => void;
  deleteProject: (projectId: string) => void;
  updateBeautyValue: (key: keyof BeautyValues, value: any) => void;
  applyPreset: (presetName: string) => void;
  savePreset: (presetName: string) => void;
  deletePreset: (presetName: string) => void;
  publishPresetToMarketplace: (presetName: string) => void;
  customPresets: Record<string, BeautyValues>;
  toggleAutoBeautify: () => void;
  splitClip: () => void;
  trimClip: (clipId: string, side: 'start' | 'end', delta: number) => void;
  setPlayheadPosition: (seconds: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setZoomLevel: (level: number) => void;
  undo: () => void;
  redo: () => void;
  addToExportQueue: (resolution: string, format: string) => void;
  startExportRecording: (resolution: string, format: string, bitrateLevel?: string) => void;
  setShowExportModal: (show: boolean) => void;
  downloadLens: (lensId: string) => Promise<void> | void;
  showProfileSettings: boolean;
  setShowProfileSettings: (show: boolean) => void;
  renamePreset: (oldName: string, newName: string) => Promise<void>;
  updateProfileName: (newName: string) => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
  exportCanvasRef: React.MutableRefObject<HTMLCanvasElement | null>;
  exportVideoRef: React.MutableRefObject<HTMLVideoElement | null>;
  isExporting: boolean;
  exportResolution: string;
}

const defaultBeautyValues: BeautyValues = {
  skinSmoothness: 0,
  skinBlemish: 0,
  skinAcne: 0,
  skinWrinkle: 0,
  skinOil: 0,
  skinTone: 50,
  teethWhitening: 0,
  teethBrightness: 0,
  teethNatural: 0,
  teethPremium: 0,
  eyeBrightening: 0,
  eyeSharpening: 0,
  eyeDarkCircle: 0,
  eyeEnlargement: 0,
  eyeIrisDetail: 0,
  eyeIrisBrightness: 0,
  eyeColor: 'default',
  bodySkinRetouch: 0,
  bodySkinColor: '#d29985',
  bodySkinTolerance: 50,
  faceSlimming: 0,
  faceJawline: 0,
  faceCheek: 0,
  faceChin: 0,
  noseWidth: 0,
  noseBridge: 0,
  noseLength: 0,
  lipFullness: 0,
  lipColor: '',
  lipColorIntensity: 50,
  lipGloss: 0,
  lipDefinition: 0,
  lipTexture: 'sheen',
  makeupBlush: 0,
  makeupBlushColor: '#f43f5e',
  makeupEyeshadow: 0,
  makeupEyeshadowColor: '#d97706',
  makeupEyeliner: 0,
  makeupEyelinerColor: '#000000',
  makeupMascara: 0,
  makeupContour: 0,
  makeupEyebrows: 0,
  makeupEyebrowsColor: '#451a03',
  cgExposure: 0,
  cgContrast: 0,
  cgHighlights: 0,
  cgShadows: 0,
  cgTemperature: 0,
  cgTint: 0,
  cgVibrance: 0,
  cgSaturation: 0,
  cgGlow: 0,
  cgClarity: 0,
  cgSharpening: 0,
  cgVignette: 0,
  faceWarmth: 0,
  faceTint: 0,
  faceSaturation: 0,
  faceContrast: 0,
  faceBrightness: 0,
  g7xFlashIntensity: 0,
  g7xSubjectContrast: 0,
  g7xSubjectShadows: 0,
  g7xSubjectHighlights: 0,
  g7xBackgroundDim: 0,
  g7xColorShift: 0,
  g7xHighlightBloom: 0,
  g7xCoolShadows: 0,
  g7xGrainAmount: 0,
  
  lucidRevertCompression: 0,
  lucidRecoverDetails: 0,
  lucidSharpen: 0,
  lucidReduceNoise: 0,
  lucidDehalo: 0,
  lucidAntiAliasDeblur: 0,
  lucidAddNoise: 0,
  cgCinematicFilter: 'none',
};

const presets: Record<string, Partial<BeautyValues>> = {
  'Natural Beauty': {
    skinSmoothness: 40,
    skinBlemish: 50,
    teethWhitening: 30,
    eyeBrightening: 35,
    eyeEnlargement: 10,
    lipFullness: 15,
    lipGloss: 25,
    lipColor: '#ffa6c9'
  },
  'Soft Glam': {
    skinSmoothness: 65,
    skinBlemish: 75,
    skinTone: 60,
    teethWhitening: 50,
    eyeBrightening: 60,
    eyeEnlargement: 15,
    eyeIrisDetail: 40,
    faceSlimming: 20,
    lipFullness: 35,
    lipGloss: 50,
    lipColor: '#d946ef'
  },
  'Bridal Glow': {
    skinSmoothness: 55,
    skinBlemish: 80,
    teethWhitening: 60,
    eyeBrightening: 50,
    eyeEnlargement: 10,
    lipFullness: 25,
    lipGloss: 40,
    lipColor: '#f43f5e'
  },
  'Fashion Model': {
    skinSmoothness: 45,
    skinBlemish: 90,
    skinOil: 60,
    teethWhitening: 45,
    eyeBrightening: 40,
    eyeSharpening: 60,
    faceSlimming: 35,
    faceJawline: 40,
    faceCheek: 30,
    noseWidth: 25,
    lipFullness: 20,
    lipColor: '#b91c1c'
  },
  'Korean Beauty': {
    skinSmoothness: 80,
    skinBlemish: 80,
    skinTone: 75,
    teethWhitening: 40,
    eyeBrightening: 45,
    eyeEnlargement: 25,
    faceSlimming: 30,
    faceChin: 20,
    lipFullness: 30,
    lipGloss: 70,
    lipColor: '#ff8fab'
  },
  'TikTok Creator': {
    skinSmoothness: 70,
    skinBlemish: 70,
    teethWhitening: 65,
    eyeBrightening: 55,
    eyeEnlargement: 20,
    faceSlimming: 25,
    lipFullness: 40,
    lipGloss: 60,
    lipColor: '#ec4899'
  },
  'Snapchat Beauty': {
    skinSmoothness: 90,
    skinBlemish: 95,
    teethWhitening: 70,
    eyeBrightening: 70,
    eyeEnlargement: 40,
    faceSlimming: 40,
    noseWidth: 35,
    lipFullness: 50,
    lipGloss: 80,
    lipColor: '#ff007f'
  },
  'Golden Hour Glow': {
    skinSmoothness: 50,
    skinBlemish: 60,
    skinTone: 40,
    teethWhitening: 35,
    eyeBrightening: 45,
    eyeIrisDetail: 50,
    lipFullness: 20,
    lipGloss: 35,
    lipColor: '#eab308'
  }
};

const initialLenses: Lens[] = [
  { id: '1', name: 'Angelic Glow', creator: 'Sophia Rose', rating: 4.8, reviewsCount: 342, downloads: '12.4K', price: 'Free', category: 'featured', imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80', isDownloaded: true },
  { id: '2', name: 'Cyberpunk Neon', creator: 'X-Studio', rating: 4.9, reviewsCount: 189, downloads: '8.2K', price: 'Free', category: 'featured', imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80', isDownloaded: false },
  { id: '3', name: 'Korean Dewy Skin', creator: 'Park Ji-Woo', rating: 4.7, reviewsCount: 890, downloads: '45.1K', price: 'Free', category: 'trending', imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80', isDownloaded: false },
  { id: '4', name: 'Hollywood Matte', creator: 'Elite Lenses', rating: 4.6, reviewsCount: 145, downloads: '5.1K', price: 'Free', category: 'trending', imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80', isDownloaded: false },
  { id: '5', name: 'Sunset Bronze', creator: 'Clara Bella', rating: 4.9, reviewsCount: 52, downloads: '1.2K', price: 'Free', category: 'new', imageUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80', isDownloaded: false },
  { id: '6', name: 'Vampire Glint', creator: 'GothTech', rating: 4.4, reviewsCount: 28, downloads: '680', price: 'Free', category: 'new', imageUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=300&q=80', isDownloaded: false },
];

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Authentication States
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<'auth' | 'dashboard' | 'editor' | 'marketplace'>('auth');

  // Projects State
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Beauty Settings State
  const [beautyValues, setBeautyValues] = useState<BeautyValues>(defaultBeautyValues);
  const [isAutoBeautifyActive, setIsAutoBeautifyActive] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string>('None');

  // Custom Presets State
  const [customPresets, setCustomPresets] = useState<Record<string, BeautyValues>>({});

  // Timeline States
  const [timelineClips, setTimelineClips] = useState<TimelineClip[]>([]);
  const [audioTrackClips, setAudioTrackClips] = useState<TimelineClip[]>([]);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState<boolean>(false);
  const [showProfileSettings, setShowProfileSettings] = useState<boolean>(false);
  const [useTransitions, setUseTransitions] = useState<boolean>(true);
  const [playheadPosition, setPlayheadPosition] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(50);

  // History for Undo/Redo
  const [history, setHistory] = useState<{ beauty: BeautyValues; clips: TimelineClip[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);

  // Export State
  const [exportQueue, setExportQueue] = useState<ExportItem[]>([]);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);

  // Marketplace Lenses
  const [marketplaceLenses, setMarketplaceLenses] = useState<Lens[]>(initialLenses);

  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportResolution, setExportResolution] = useState('720p');
  const exportCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const exportVideoRef = useRef<HTMLVideoElement | null>(null);

  // Auth & Firestore Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, isPro: true });
        setCurrentView('dashboard');
        
        // Sync presets from Firestore
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists() && docSnap.data().customPresets) {
            setCustomPresets(docSnap.data().customPresets);
          }
        } catch (error) {
          console.warn("Failed to sync presets from Firestore (client offline):", error);
        }
      } else {
        setUser(null);
        setCurrentView('auth');
        setCustomPresets({});
      }
    });
  }, []);

  // Global Marketplace Listener
  useEffect(() => {
    const q = collection(db, 'lenses');
    return onSnapshot(q, (snapshot) => {
      const lenses: Lens[] = [];
      snapshot.forEach((doc) => {
        lenses.push({ id: doc.id, ...doc.data() } as Lens);
      });
      // Merge with initialLenses if firestore is empty, otherwise use firestore
      if (lenses.length > 0) {
        setMarketplaceLenses(lenses);
      }
    }, (error) => {
      console.error("Failed to load marketplace lenses", error);
    });
  }, []);

  // Initialize history when active project changes
  useEffect(() => {
    if (activeProject) {
      setBeautyValues(defaultBeautyValues);
      setIsAutoBeautifyActive(false);
      setActivePreset('None');
      const initialClips = activeProject.video 
        ? [{ id: 'c1', start: 0, end: activeProject.video.duration, sourceStart: 0, sourceEnd: activeProject.video.duration }]
        : [];
      setTimelineClips(initialClips);
      const initialAudio = activeProject.video 
        ? [{ id: 'a1', start: 0, end: activeProject.video.duration, sourceStart: 0, sourceEnd: activeProject.video.duration }]
        : [];
      setAudioTrackClips(initialAudio);
      setPlayheadPosition(0);
      setIsPlaying(false);
      
      setHistory([{ beauty: defaultBeautyValues, clips: initialClips }]);
      setHistoryIndex(0);
    }
  }, [activeProject]);

  // Push state to history (debounced helper for sliders)
  const pushToHistory = (newBeauty: BeautyValues, newClips: TimelineClip[]) => {
    const updatedHistory = history.slice(0, historyIndex + 1);
    updatedHistory.push({ beauty: { ...newBeauty }, clips: [...newClips] });
    if (updatedHistory.length > 50) {
      updatedHistory.shift();
      setHistoryIndex(updatedHistory.length - 1);
    } else {
      setHistoryIndex(updatedHistory.length - 1);
    }
    setHistory(updatedHistory);
  };

  // Authentication Operations
  const login = (_email: string) => { /* Logic integrated via Firebase */ };
  const register = (_email: string) => { /* Logic integrated via Firebase */ };
  const logout = () => { signOut(auth); };
  const upgradeToPro = () => { if (user) setUser({ ...user, isPro: true }); };

  // Project Operations
  const createProject = (name: string, video: VideoMetadata | null) => {
    const newProject: Project = {
      id: 'p_' + Math.random().toString(36).substr(2, 9),
      name: name || 'Untitled Project',
      updatedAt: 'Just now',
      video
    };
    setProjects([newProject, ...projects]);
    setActiveProject(newProject);
    setCurrentView('editor');
    return newProject;
  };

  const selectProject = (projectId: string) => {
    const proj = projects.find(p => p.id === projectId);
    if (proj) {
      setActiveProject(proj);
      setCurrentView('editor');
    }
  };

  const deleteProject = (projectId: string) => {
    setProjects(projects.filter(p => p.id !== projectId));
    if (activeProject?.id === projectId) {
      setActiveProject(null);
    }
  };

  // Editor Sliders
  const updateBeautyValue = (key: keyof BeautyValues, value: any) => {
    const newValues = { ...beautyValues, [key]: value };
    setBeautyValues(newValues);
    setIsAutoBeautifyActive(false);
    setActivePreset('None');
    pushToHistory(newValues, timelineClips);
  };

  // Presets Application
  const applyPreset = (presetName: string) => {
    setActivePreset(presetName);
    setIsAutoBeautifyActive(false);
    if (presetName === 'None') {
      setBeautyValues(defaultBeautyValues);
      pushToHistory(defaultBeautyValues, timelineClips);
    } else {
      const presetData = presets[presetName] || customPresets[presetName];
      if (presetData) {
        const newValues = { ...defaultBeautyValues, ...presetData };
        setBeautyValues(newValues);
        pushToHistory(newValues, timelineClips);
      }
    }
  };

  const savePreset = async (presetName: string) => {
    const newPresets = { ...customPresets, [presetName]: { ...beautyValues } };
    setCustomPresets(newPresets);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { customPresets: newPresets }, { merge: true });
      } catch (error) {
        console.warn("Failed to save preset to Firestore (offline mode active):", error);
      }
    }
  };

  const deletePreset = async (presetName: string) => {
    const newPresets = { ...customPresets };
    delete newPresets[presetName];
    setCustomPresets(newPresets);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { customPresets: newPresets }, { merge: true });
      } catch (error) {
        console.warn("Failed to delete preset from Firestore (offline mode active):", error);
      }
    }
    if (activePreset === presetName) {
      setActivePreset('None');
    }
  };

  const renamePreset = async (oldName: string, newName: string) => {
    if (!newName || oldName === newName) return;
    const presetValues = customPresets[oldName];
    if (!presetValues) return;
    
    const newPresets = { ...customPresets };
    delete newPresets[oldName];
    newPresets[newName] = presetValues;
    
    setCustomPresets(newPresets);
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), { customPresets: newPresets }, { merge: true });
      } catch (error) {
        console.warn("Failed to rename preset in Firestore:", error);
      }
    }
    if (activePreset === oldName) {
      setActivePreset(newName);
    }
  };

  const updateProfileName = async (newName: string) => {
    if (!auth.currentUser) return;
    try {
      await updateProfile(auth.currentUser, { displayName: newName });
      setUser(prev => prev ? { ...prev, displayName: newName } : null);
    } catch (error) {
      console.error("Failed to update profile name:", error);
      throw error;
    }
  };

  const publishPresetToMarketplace = async (presetName: string) => {
    if (!user) return;
    const presetValues = customPresets[presetName];
    if (!presetValues) return;
    
    // Add to lenses collection
    const newLens = {
      name: presetName,
      creator: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      creatorId: user.uid,
      rating: 5.0,
      reviewsCount: 1,
      downloads: '0',
      price: 'Free',
      category: 'new',
      imageUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=300&q=80', // generic thumbnail
      isDownloaded: false,
      values: presetValues
    };
    
    try {
      await setDoc(doc(collection(db, 'lenses')), newLens);
      alert(`Successfully published "${presetName}" to the global marketplace!`);
    } catch (error) {
      console.error("Failed to publish preset to marketplace:", error);
      alert(`Failed to publish "${presetName}" (please check your network connection).`);
    }
  };

  // Auto Beautify AI Toggle
  const toggleAutoBeautify = () => {
    if (isAutoBeautifyActive) {
      setBeautyValues(defaultBeautyValues);
      setIsAutoBeautifyActive(false);
      setActivePreset('None');
      pushToHistory(defaultBeautyValues, timelineClips);
    } else {
      const autoValues: BeautyValues = {
        ...defaultBeautyValues,
        skinSmoothness: 75,
        skinBlemish: 80,
        teethWhitening: 60,
        eyeBrightening: 55,
        eyeEnlargement: 15,
        lipFullness: 25,
        lipGloss: 40,
        lipColor: '#f43f5e',
        faceSlimming: 15,
        noseWidth: 10,
      };
      setBeautyValues(autoValues);
      setIsAutoBeautifyActive(true);
      setActivePreset('AI Auto Beautified');
      pushToHistory(autoValues, timelineClips);
    }
  };

  // Undo / Redo
  const undo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      setBeautyValues({ ...history[prevIdx].beauty });
      setTimelineClips([...history[prevIdx].clips]);
      setAudioTrackClips([...history[prevIdx].clips]);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setBeautyValues({ ...history[nextIdx].beauty });
      setTimelineClips([...history[nextIdx].clips]);
      setAudioTrackClips([...history[nextIdx].clips]);
    }
  };

  // Timeline Operations
  const splitClip = () => {
    if (!activeProject?.video) return;
    const clipIdx = timelineClips.findIndex(
      c => playheadPosition > c.start && playheadPosition < c.end
    );
    if (clipIdx !== -1) {
      const clip = timelineClips[clipIdx];
      const splitPoint = playheadPosition;
      
      const firstClip: TimelineClip = {
        id: clip.id + '_1',
        start: clip.start,
        end: splitPoint,
        sourceStart: clip.sourceStart,
        sourceEnd: clip.sourceStart + (splitPoint - clip.start),
      };

      const secondClip: TimelineClip = {
        id: clip.id + '_2',
        start: splitPoint,
        end: clip.end,
        sourceStart: clip.sourceStart + (splitPoint - clip.start),
        sourceEnd: clip.sourceEnd,
      };

      const newClips = [
        ...timelineClips.slice(0, clipIdx),
        firstClip,
        secondClip,
        ...timelineClips.slice(clipIdx + 1),
      ];

      setTimelineClips(newClips);
      setAudioTrackClips(newClips);
      pushToHistory(beautyValues, newClips);
    }
  };

  const trimClip = (clipId: string, side: 'start' | 'end', delta: number) => {
    const newClips = timelineClips.map(clip => {
      if (clip.id === clipId) {
        if (side === 'start') {
          const newStart = Math.max(0, clip.start + delta);
          const timeDiff = newStart - clip.start;
          return {
            ...clip,
            start: newStart,
            sourceStart: clip.sourceStart + timeDiff
          };
        } else {
          const newEnd = Math.max(clip.start + 0.5, clip.end + delta);
          const timeDiff = newEnd - clip.end;
          return {
            ...clip,
            end: newEnd,
            sourceEnd: clip.sourceEnd + timeDiff
          };
        }
      }
      return clip;
    });

    setTimelineClips(newClips);
    setAudioTrackClips(newClips);
    pushToHistory(beautyValues, newClips);
  };

  const deleteClip = (clipId: string, ripple = false) => {
    const clipIdx = timelineClips.findIndex(c => c.id === clipId);
    if (clipIdx === -1) return;

    const deleted = timelineClips[clipIdx];
    const duration = deleted.end - deleted.start;

    let newClips: TimelineClip[] = [];
    if (ripple) {
      // Ripple delete: remove clip and shift all subsequent clips left to close the gap
      newClips = timelineClips
        .filter(c => c.id !== clipId)
        .map(c => c.start > deleted.start 
          ? { ...c, start: c.start - duration, end: c.end - duration } 
          : c
        );
    } else {
      // Standard delete: leave a blank gap
      newClips = timelineClips.filter(c => c.id !== clipId);
    }

    setTimelineClips(newClips);
    setAudioTrackClips(newClips);
    setSelectedClipId(null);
    pushToHistory(beautyValues, newClips);
  };

  // Export Action
  const addToExportQueue = (resolution: string, format: string) => {
    if (!activeProject) return;
    const newExport: ExportItem = {
      id: 'exp_' + Math.random().toString(36).substr(2, 9),
      projectName: activeProject.name,
      progress: 0,
      status: 'pending',
      resolution,
      format,
    };
    setExportQueue(prev => [newExport, ...prev]);
    setShowExportModal(false);

    let currentProgress = 0;
    const interval = setInterval(() => {
      setExportQueue(prev => 
        prev.map(item => {
          if (item.id === newExport.id) {
            currentProgress += Math.floor(Math.random() * 10) + 5;
            if (currentProgress >= 100) {
              clearInterval(interval);
              return { ...item, progress: 100, status: 'completed' };
            }
            return { ...item, progress: currentProgress, status: 'processing' };
          }
          return item;
        })
      );
    }, 500);
  };

  const updateExportProgress = (id: string, progress: number, status?: ExportItem['status'], url?: string) => {
    setExportQueue(prev =>
      prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            progress,
            status: status || item.status,
            downloadUrl: url !== undefined ? url : item.downloadUrl
          };
        }
        return item;
      })
    );
  };

  // Lens Marketplace download
  const downloadLens = async (lensId: string) => {
    const lens = marketplaceLenses.find(l => l.id === lensId);
    if (!lens) return;

    setMarketplaceLenses(prev => 
      prev.map(l => l.id === lensId ? { ...l, isDownloaded: true } : l)
    );

    // Copy the lens values to user's customPresets in Firestore for cross-session access
    if (lens.values) {
      const newPresets = { ...customPresets, [lens.name]: lens.values };
      setCustomPresets(newPresets);
      if (user) {
        try {
          await setDoc(doc(db, 'users', user.uid), { customPresets: newPresets }, { merge: true });
        } catch (error) {
          console.warn("Failed to persist downloaded marketplace preset to Firestore:", error);
        }
      }
    }
  };

  // Real export: captures deterministic video using WebCodecs
  const startExportRecording = (resolution: string, format: string, _bitrateLevel: string = 'high') => {
    if (!activeProject) return;
    const video = exportVideoRef.current;

    if (!video || !video.src || !video.duration) {
      addToExportQueue(resolution, format);
      return;
    }

    setIsExporting(true);
    setExportResolution(resolution);
    setIsPlaying(false);

    const projectName = activeProject.name;
    const newExport: ExportItem = {
      id: 'exp_' + Math.random().toString(36).substr(2, 9),
      projectName,
      progress: 0,
      status: 'processing',
      resolution,
      format,
    };
    setExportQueue(prev => [newExport, ...prev]);
    setShowExportModal(false);

    // Give state time to update so Visualizer can pause its RAF loop
    setTimeout(() => {
      const originalTime = video.currentTime;
      const originalPaused = video.paused;
      
      video.pause();

      DeterministicExporter.exportVideo({
        videoElement: video,
        beautyValues: beautyValues,
        resolution: resolution,
        projectName: projectName,
        fps: 30, // Locked to 30fps for stable quality
        timelineClips: timelineClips,
        useTransitions: useTransitions,
        sourceFile: activeProject.video?.file,
        onProgress: (pct) => {
          setExportQueue(prev =>
            prev.map(item => item.id === newExport.id ? { ...item, progress: Math.floor(pct) } : item)
          );
        },
        onComplete: (downloadUrl, fileName) => {
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(downloadUrl);
          }, 1000);
          
          setExportQueue(prev =>
            prev.map(item => item.id === newExport.id ? { ...item, progress: 100, status: 'completed' } : item)
          );
          
          // Cleanup video state
          setIsExporting(false);
          video.currentTime = originalTime;
          if (!originalPaused) video.play();
        },
        onError: (err) => {
          console.error("Export failure:", err);
          setExportQueue(prev =>
            prev.map(item => item.id === newExport.id ? { ...item, status: 'failed' } : item)
          );
          setIsExporting(false);
          video.currentTime = originalTime;
          if (!originalPaused) video.play();
          alert('Export failed. Check console for details.');
        }
      });
    }, 100);
  };

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return (
    <AppContext.Provider value={{
      user,
      currentView,
      projects,
      activeProject,
      beautyValues,
      isAutoBeautifyActive,
      activePreset,
      timelineClips,
      audioTrackClips,
      selectedClipId,
      setSelectedClipId,
      deleteClip,
      showShortcutsHelp,
      setShowShortcutsHelp,
      showProfileSettings,
      setShowProfileSettings,
      useTransitions,
      setUseTransitions,
      playheadPosition,
      isPlaying,
      zoomLevel,
      exportQueue,
      showExportModal,
      marketplaceLenses,
      logout,
      setView: setCurrentView,
      createProject,
      selectProject,
      deleteProject,
      updateBeautyValue,
      applyPreset,
      savePreset,
      deletePreset,
      renamePreset,
      updateProfileName,
      publishPresetToMarketplace,
      customPresets,
      toggleAutoBeautify,
      splitClip,
      trimClip,
      setPlayheadPosition,
      setIsPlaying,
      setZoomLevel,
      undo,
      redo,
      addToExportQueue,
      startExportRecording,
      setShowExportModal,
      downloadLens,
      canUndo,
      canRedo,
      exportCanvasRef,
      exportVideoRef,
      isExporting,
      exportResolution,
      updateExportProgress,
      login,
      register,
      upgradeToPro,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
