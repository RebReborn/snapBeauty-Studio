import React, { useState } from 'react';
import { useApp, BeautyValues } from '../context/AppContext';
import { Sparkles, Smile, Eye, User, Brush, Compass, ChevronDown, ChevronUp, Palette } from 'lucide-react';

const BeautyControls: React.FC = () => {
  const { beautyValues, updateBeautyValue } = useApp();
  
  // Accordion Expand States
  const [expandedSection, setExpandedSection] = useState<string | null>('skin');

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  // Slider Component Helper
  const SliderRow = ({ 
    label, 
    valueKey, 
    min = 0, 
    max = 100 
  }: { 
    label: string; 
    valueKey: keyof BeautyValues; 
    min?: number; 
    max?: number;
  }) => {
    const val = beautyValues[valueKey] as number;
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-[11px] font-medium text-gray-300">
          <span>{label}</span>
          <span className="text-purple-300 font-mono text-[10px] font-bold">{val}%</span>
        </div>
        <input
          type="range"
          min={min}
          max={max}
          value={val}
          onChange={(e) => updateBeautyValue(valueKey, parseInt(e.target.value))}
          className="w-full"
        />
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col font-sans select-none overflow-hidden h-full">
      
      {/* Title */}
      <div className="p-4 border-b border-white/5 bg-studio-dark/50 shrink-0">
        <h2 className="text-xs font-bold text-white uppercase tracking-wider">Beauty Enhancements</h2>
        <p className="text-[10px] text-gray-400 mt-0.5">Refine appearance elements realistically</p>
      </div>

      {/* Accordions container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        
        {/* SECTION: Skin Smoothing */}
        <div className="rounded-xl border border-white/5 overflow-hidden bg-white/1">
          <button 
            onClick={() => toggleSection('skin')}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Skin Retouching</span>
            </div>
            {expandedSection === 'skin' ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          
          {expandedSection === 'skin' && (
            <div className="p-3 border-t border-white/5 bg-studio-dark/30 space-y-4 animate-fade-in">
              <SliderRow label="Skin Smoothness" valueKey="skinSmoothness" />
              <SliderRow label="Blemish Removal" valueKey="skinBlemish" />
              <SliderRow label="Acne Correction" valueKey="skinAcne" />
              <SliderRow label="Wrinkle Reduction" valueKey="skinWrinkle" />
              <SliderRow label="Oil & Shine Reduction" valueKey="skinOil" />
              <SliderRow label="Skin Tone Warmth" valueKey="skinTone" />
            </div>
          )}
        </div>

        {/* SECTION: Teeth Whitening */}
        <div className="rounded-xl border border-white/5 overflow-hidden bg-white/1">
          <button 
            onClick={() => toggleSection('teeth')}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Smile className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Teeth Whitening</span>
            </div>
            {expandedSection === 'teeth' ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          
          {expandedSection === 'teeth' && (
            <div className="p-3 border-t border-white/5 bg-studio-dark/30 space-y-4 animate-fade-in">
              <SliderRow label="Whitening Strength" valueKey="teethWhitening" />
              <SliderRow label="Brightening Intensity" valueKey="teethBrightness" />
              <SliderRow label="Natural Teeth Shine" valueKey="teethNatural" />
              <SliderRow label="Premium Enamel Gloss" valueKey="teethPremium" />
            </div>
          )}
        </div>

        {/* SECTION: Eye Enhancement */}
        <div className="rounded-xl border border-white/5 overflow-hidden bg-white/1">
          <button 
            onClick={() => toggleSection('eyes')}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Eye className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Eye Enhancements</span>
            </div>
            {expandedSection === 'eyes' ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          
          {expandedSection === 'eyes' && (
            <div className="p-3 border-t border-white/5 bg-studio-dark/30 space-y-4 animate-fade-in">
              <SliderRow label="Eye Brightening" valueKey="eyeBrightening" />
              <SliderRow label="Lash & Iris Sharpening" valueKey="eyeSharpening" />
              <SliderRow label="Dark Circle Removal" valueKey="eyeDarkCircle" />
              <SliderRow label="Eye Enlargement" valueKey="eyeEnlargement" />
              <SliderRow label="Iris Highlight Detail" valueKey="eyeIrisDetail" />
              
              {/* Eye Color selector */}
              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-medium text-gray-300">Custom Iris Color</span>
                <div className="flex items-center gap-2.5">
                  {[
                    { id: 'default', color: 'bg-amber-900 border-white/20', label: 'Brown' },
                    { id: 'blue', color: 'bg-blue-600 border-blue-400/30', label: 'Blue' },
                    { id: 'green', color: 'bg-emerald-600 border-emerald-400/30', label: 'Green' },
                    { id: 'hazel', color: 'bg-amber-600 border-amber-400/30', label: 'Hazel' },
                    { id: 'gray', color: 'bg-gray-500 border-gray-400/30', label: 'Gray' },
                    { id: 'violet', color: 'bg-violet-600 border-violet-400/30', label: 'Violet' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => updateBeautyValue('eyeColor', item.id)}
                      title={item.label}
                      className={`h-6 w-6 rounded-full border-2 transition-all hover:scale-110 active:scale-95 ${item.color} ${
                        beautyValues.eyeColor === item.id 
                          ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-studio-dark' 
                          : 'scale-90 opacity-75'
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION: Face Reshaping */}
        <div className="rounded-xl border border-white/5 overflow-hidden bg-white/1">
          <button 
            onClick={() => toggleSection('face')}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <User className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Face Reshaping</span>
            </div>
            {expandedSection === 'face' ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          
          {expandedSection === 'face' && (
            <div className="p-3 border-t border-white/5 bg-studio-dark/30 space-y-4 animate-fade-in">
              <SliderRow label="Face Slimming" valueKey="faceSlimming" />
              <SliderRow label="Jawline Sculpting" valueKey="faceJawline" />
              <SliderRow label="Cheekbone Refinement" valueKey="faceCheek" />
              <SliderRow label="Chin Adjustment" valueKey="faceChin" />
            </div>
          )}
        </div>

        {/* SECTION: Nose Refinement */}
        <div className="rounded-xl border border-white/5 overflow-hidden bg-white/1">
          <button 
            onClick={() => toggleSection('nose')}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Compass className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Nose Refinement</span>
            </div>
            {expandedSection === 'nose' ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          
          {expandedSection === 'nose' && (
            <div className="p-3 border-t border-white/5 bg-studio-dark/30 space-y-4 animate-fade-in">
              <SliderRow label="Nose Slimming" valueKey="noseWidth" />
              <SliderRow label="Nose Bridge Lift" valueKey="noseBridge" />
              <SliderRow label="Nose Length Adjustment" valueKey="noseLength" />
            </div>
          )}
        </div>

        {/* SECTION: Lip Enhancement */}
        <div className="rounded-xl border border-white/5 overflow-hidden bg-white/1">
          <button 
            onClick={() => toggleSection('lips')}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Brush className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Lip Enhancements</span>
            </div>
            {expandedSection === 'lips' ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          
          {expandedSection === 'lips' && (
            <div className="p-3 border-t border-white/5 bg-studio-dark/30 space-y-4 animate-fade-in">
              <SliderRow label="Lip Plumpness" valueKey="lipFullness" />
              <SliderRow label="Lip Gloss Intensity" valueKey="lipGloss" />
              <SliderRow label="Lip Definition Contour" valueKey="lipDefinition" />
              
              {/* Color swatches */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-gray-300">Lipstick Tint Color</span>
                </div>
                <SliderRow label="Tint Opacity" valueKey="lipColorIntensity" />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => updateBeautyValue('lipColor', '')}
                      className={`relative h-6 w-6 rounded-full border border-white/20 transition-all hover:scale-110 active:scale-95 bg-white/5`}
                      style={{ 
                        boxShadow: beautyValues.lipColor === '' ? '0 0 6px rgba(255,255,255,0.5)' : 'none',
                        transform: beautyValues.lipColor === '' ? 'scale(1.15)' : 'scale(1)'
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-[1px] h-full bg-red-500 rotate-45" />
                      </div>
                    </button>
                    {[
                      '#ff4d6d', // classic red
                      '#ff758f', // soft pink
                      '#c77dff', // lilac
                      '#e36414', // bronze orange
                      '#b7094c'  // ruby wine
                    ].map((c) => (
                      <button
                        key={c}
                        onClick={() => updateBeautyValue('lipColor', c)}
                        className={`h-6 w-6 rounded-full border border-white/20 transition-all hover:scale-110 active:scale-95`}
                        style={{ 
                          backgroundColor: c,
                          boxShadow: beautyValues.lipColor === c ? '0 0 6px ' + c : 'none',
                          transform: beautyValues.lipColor === c ? 'scale(1.15)' : 'scale(1)'
                        }}
                      />
                    ))}
                  </div>

                  <input
                    type="color"
                    value={beautyValues.lipColor}
                    onChange={(e) => updateBeautyValue('lipColor', e.target.value)}
                    className="h-6 w-8 bg-transparent border-0 cursor-pointer overflow-hidden p-0 rounded"
                  />
                </div>
              </div>

              {/* Texture Finish toggle */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-medium text-gray-300">Lip Texture Finish</span>
                <div className="flex bg-white/3 border border-white/5 rounded-xl p-1 text-xs">
                  {(['matte', 'sheen', 'gloss'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => updateBeautyValue('lipTexture', t)}
                      className={`flex-1 py-1.5 rounded-lg capitalize font-bold transition-all ${
                        beautyValues.lipTexture === t
                          ? 'bg-purple-500/15 text-purple-300'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION: Digital Makeup */}
        <div className="rounded-xl border border-white/5 overflow-hidden bg-white/1">
          <button 
            onClick={() => toggleSection('makeup')}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Digital Makeup Suite</span>
            </div>
            {expandedSection === 'makeup' ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          
          {expandedSection === 'makeup' && (
            <div className="p-3 border-t border-white/5 bg-studio-dark/30 space-y-4 animate-fade-in max-h-[400px] overflow-y-auto">
              <SliderRow label="Eyeliner Intensity" valueKey="makeupEyeliner" />
              <SliderRow label="Mascara & Lashes" valueKey="makeupMascara" />
              <SliderRow label="Contour Definition" valueKey="makeupContour" />
              
              <div className="space-y-3 pt-2 border-t border-white/5">
                <SliderRow label="Blush Rouge" valueKey="makeupBlush" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Blush Tint</span>
                  <div className="flex items-center gap-1.5">
                    {['#f43f5e', '#fb923c', '#fb7185', '#d81b60'].map((c) => (
                      <button
                        key={c} onClick={() => updateBeautyValue('makeupBlushColor', c)}
                        className="h-5 w-5 rounded-full border border-white/20 transition-all hover:scale-110"
                        style={{ backgroundColor: c, transform: beautyValues.makeupBlushColor === c ? 'scale(1.15)' : 'scale(1)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/5">
                <SliderRow label="Eyeshadow" valueKey="makeupEyeshadow" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Shadow Tint</span>
                  <div className="flex items-center gap-1.5">
                    {['#d97706', '#9333ea', '#be185d', '#1e3a8a'].map((c) => (
                      <button
                        key={c} onClick={() => updateBeautyValue('makeupEyeshadowColor', c)}
                        className="h-5 w-5 rounded-full border border-white/20 transition-all hover:scale-110"
                        style={{ backgroundColor: c, transform: beautyValues.makeupEyeshadowColor === c ? 'scale(1.15)' : 'scale(1)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-white/5">
                <SliderRow label="Eyebrow Fill" valueKey="makeupEyebrows" />
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-gray-400 uppercase font-bold">Brow Tint</span>
                  <div className="flex items-center gap-1.5">
                    {['#1c1917', '#451a03', '#78350f', '#92400e'].map((c) => (
                      <button
                        key={c} onClick={() => updateBeautyValue('makeupEyebrowsColor', c)}
                        className="h-5 w-5 rounded-full border border-white/20 transition-all hover:scale-110"
                        style={{ backgroundColor: c, transform: beautyValues.makeupEyebrowsColor === c ? 'scale(1.15)' : 'scale(1)' }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION: Face Color Aesthetics */}
        <div className="rounded-xl border border-white/5 overflow-hidden bg-white/1">
          <button 
            onClick={() => toggleSection('face-color')}
            className="w-full p-3 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Palette className="h-4 w-4 text-purple-400" />
              <span className="text-xs font-bold text-white">Face Color Aesthetics</span>
            </div>
            {expandedSection === 'face-color' ? <ChevronUp className="h-3.5 w-3.5 text-gray-400" /> : <ChevronDown className="h-3.5 w-3.5 text-gray-400" />}
          </button>
          
          {expandedSection === 'face-color' && (
            <div className="p-3 border-t border-white/5 bg-studio-dark/30 space-y-4 animate-fade-in">
              <SliderRow label="Face Warmth" valueKey="faceWarmth" min={-100} max={100} />
              <SliderRow label="Face Tint" valueKey="faceTint" min={-100} max={100} />
              <SliderRow label="Face Saturation" valueKey="faceSaturation" min={-100} max={100} />
              <SliderRow label="Face Contrast" valueKey="faceContrast" min={-50} max={100} />
              <SliderRow label="Face Brightness" valueKey="faceBrightness" min={-50} max={100} />
            </div>
          )}
        </div>

      </div>

    </div>
  );
};

export default BeautyControls;
