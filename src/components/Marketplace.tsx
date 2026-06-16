import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Download, Check, Star, Search } from 'lucide-react';

const Marketplace: React.FC = () => {
  const { marketplaceLenses, downloadLens, user, applyPreset } = useApp();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'featured' | 'trending' | 'new'>('featured');
  const [selectedLensReviews, setSelectedLensReviews] = useState<string | null>(null);

  // Filter lenses based on active tab & query
  const filteredLenses = marketplaceLenses
    .filter(lens => lens.category === filterTab)
    .filter(lens => lens.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const handleDownload = (lensId: string) => {
    downloadLens(lensId);
    // Automatically apply downloaded preset
    applyPreset('Natural Beauty');
  };

  return (
    <div className="p-4 flex-1 flex flex-col overflow-hidden h-full font-sans select-none">
      
      {/* Title */}
      <div className="shrink-0 mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">Lens Marketplace</h3>
          <span className="text-[9px] bg-purple-500/10 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/20 font-semibold">Store</span>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search community lenses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl glass-input text-[11px] text-white placeholder-gray-500"
          />
        </div>

        {/* Tabs Featured, Trending, New */}
        <div className="flex border-b border-white/5 pb-1 text-[10px] gap-2">
          {(['featured', 'trending', 'new'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setFilterTab(tab); setSelectedLensReviews(null); }}
              className={`px-2 py-1 capitalize font-bold transition-colors ${
                filterTab === tab
                  ? 'text-purple-400 border-b-2 border-purple-500'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Lenses List */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
        {filteredLenses.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-500">
            No lenses found in this category.
          </div>
        ) : (
          filteredLenses.map((lens) => (
            <div 
              key={lens.id}
              className="p-2.5 rounded-xl bg-white/2 border border-white/5 hover:border-white/10 transition-all flex gap-3 align-start"
            >
              {/* Thumbnail image */}
              <img 
                src={lens.imageUrl} 
                alt={lens.name} 
                className="w-16 h-20 rounded-lg object-cover border border-white/5 shrink-0"
              />

              {/* Lens info */}
              <div className="flex-1 min-w-0 flex flex-col justify-between h-20">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold text-white leading-tight truncate">{lens.name}</h4>
                  <p className="text-[9px] text-gray-400 truncate">by {lens.creator}</p>
                  
                  {/* Rating */}
                  <div 
                    onClick={() => setSelectedLensReviews(selectedLensReviews === lens.id ? null : lens.id)}
                    className="flex items-center gap-1 cursor-pointer hover:text-purple-300 transition-colors"
                  >
                    <Star className="h-2.5 w-2.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-[9px] font-bold text-white">{lens.rating}</span>
                    <span className="text-[8px] text-gray-500">({lens.reviewsCount})</span>
                  </div>
                </div>

                {/* Purchase / Download Button */}
                <div className="flex items-center justify-between mt-1 pt-1 border-t border-white/5">
                  <span className="text-[10px] font-extrabold text-white font-mono">{lens.price}</span>
                  
                  {lens.isDownloaded ? (
                    <div className="flex items-center gap-1 text-[9px] text-green-400 font-bold bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">
                      <Check className="h-3 w-3" />
                      <span>Active</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleDownload(lens.id)}
                      className={`px-3 py-1 rounded text-[9px] font-extrabold flex items-center gap-1 transition-all ${
                        lens.price === 'Free' 
                          ? 'bg-purple-500 hover:bg-purple-600 text-white' 
                          : user?.isPro 
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white' // Free for Pro members
                          : 'bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10'
                      }`}
                    >
                      <Download className="h-2.5 w-2.5" />
                      <span>{lens.price === 'Free' ? 'Install' : (user?.isPro ? 'Get (Pro)' : 'Buy')}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Selected Lens Reviews Panel (when clicked) */}
        {selectedLensReviews && (
          <div className="mt-4 p-3 rounded-xl bg-purple-950/20 border border-purple-500/20 animate-fade-in space-y-2.5 text-left">
            <h5 className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Recent Reviews</h5>
            <div className="space-y-2">
              <div className="space-y-0.5 text-[9px]">
                <div className="flex items-center justify-between text-gray-300 font-bold">
                  <span>@creativelisa</span>
                  <span className="text-yellow-400">★★★★★</span>
                </div>
                <p className="text-gray-400 leading-snug">Smooth skin works perfectly! Best lighting correct filter ever.</p>
              </div>
              <div className="space-y-0.5 text-[9px] pt-1.5 border-t border-white/5">
                <div className="flex items-center justify-between text-gray-300 font-bold">
                  <span>@vlogboy_steve</span>
                  <span className="text-yellow-400">★★★★☆</span>
                </div>
                <p className="text-gray-400 leading-snug">Very natural. A bit heavy on lips gloss but sliders fix it.</p>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default Marketplace;
