import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot, addDoc, updateDoc, doc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';
import { ArrowLeft, Lightbulb, ThumbsUp, Send, Trash2, Search, MessageSquare } from 'lucide-react';

interface IdeaItem {
  id: string;
  title: string;
  description: string;
  category: 'Feature Request' | 'Filter Idea' | 'UI Improvement' | 'Performance';
  creator: string;
  creatorId: string;
  upvotes: number;
  upvotedBy: string[];
  createdAt: any;
}

const IdeasBoard: React.FC = () => {
  const { user, setView } = useApp();

  const [ideas, setIdeas] = useState<IdeaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'feature' | 'filter' | 'ui'>('all');

  // Submit form states
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Feature Request' | 'Filter Idea' | 'UI Improvement' | 'Performance'>('Feature Request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);

  // Firestore Sync Listener
  useEffect(() => {
    const ideasRef = collection(db, 'ideas');
    const unsubscribe = onSnapshot(ideasRef, (snapshot) => {
      const loadedIdeas: IdeaItem[] = [];
      snapshot.forEach((doc) => {
        loadedIdeas.push({ id: doc.id, ...doc.data() } as IdeaItem);
      });
      // Sort ideas by upvotes descending, then by creation date descending
      loadedIdeas.sort((a, b) => {
        if (b.upvotes !== a.upvotes) return b.upvotes - a.upvotes;
        return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
      });
      setIdeas(loadedIdeas);
    }, (error) => {
      console.error("Failed to load community ideas:", error);
    });
    return unsubscribe;
  }, []);

  const handleCreateIdea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !description.trim()) {
      setFormMessage('Please enter a title and description.');
      return;
    }
    setIsSubmitting(true);
    setFormMessage(null);

    const newIdea = {
      title: title.trim(),
      description: description.trim(),
      category,
      creator: user.displayName || user.email?.split('@')[0] || 'Anonymous',
      creatorId: user.uid,
      upvotes: 1,
      upvotedBy: [user.uid],
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'ideas'), newIdea);
      setTitle('');
      setDescription('');
      setCategory('Feature Request');
      setFormMessage('Idea shared with the community successfully!');
      setTimeout(() => setFormMessage(null), 3000);
    } catch (error: any) {
      console.error("Failed to share idea:", error);
      setFormMessage('Failed to share idea. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleUpvote = async (idea: IdeaItem) => {
    if (!user) {
      alert("Please log in to upvote community ideas.");
      return;
    }
    const ideaRef = doc(db, 'ideas', idea.id);
    const hasUpvoted = idea.upvotedBy?.includes(user.uid);

    try {
      if (hasUpvoted) {
        // Remove upvote
        await updateDoc(ideaRef, {
          upvotes: Math.max(0, idea.upvotes - 1),
          upvotedBy: arrayRemove(user.uid)
        });
      } else {
        // Add upvote
        await updateDoc(ideaRef, {
          upvotes: idea.upvotes + 1,
          upvotedBy: arrayUnion(user.uid)
        });
      }
    } catch (error) {
      console.error("Failed to toggle upvote:", error);
    }
  };

  const handleDeleteIdea = async (ideaId: string) => {
    if (!confirm("Are you sure you want to delete this suggestion?")) return;
    try {
      await deleteDoc(doc(db, 'ideas', ideaId));
    } catch (error) {
      console.error("Failed to delete idea:", error);
      alert("Failed to delete idea.");
    }
  };

  // Filter ideas
  const filteredIdeas = ideas.filter((idea) => {
    const matchesSearch = 
      idea.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      idea.description.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'feature') return idea.category === 'Feature Request';
    if (activeTab === 'filter') return idea.category === 'Filter Idea';
    if (activeTab === 'ui') return idea.category === 'UI Improvement';
    return true;
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-studio-darker overflow-hidden text-gray-200 select-none font-sans relative">
      
      {/* Top Header Bar */}
      <header className="h-16 border-b border-white/5 bg-studio-dark/85 px-6 flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setView('dashboard')}
            className="h-8 px-3 rounded-lg bg-white/5 hover:bg-white/10 flex items-center gap-2 text-xs font-semibold text-gray-300 hover:text-white transition-all active:scale-[0.97]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Dashboard</span>
          </button>
          
          <div className="h-4 w-[1px] bg-white/10" />
          
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
              <Lightbulb className="h-4.5 w-4.5" />
            </div>
            <div>
              <span className="text-sm font-bold text-white tracking-wide block uppercase leading-none">Community Board</span>
              <span className="text-[9px] text-gray-400">Share ideas and feature requests</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[9px] bg-purple-500/15 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider">
            Feedback Portal
          </span>
        </div>
      </header>

      {/* Main Layout body */}
      <main className="flex-1 overflow-hidden p-6 grid grid-cols-12 gap-6 relative z-10 max-h-[calc(100vh-64px)]">
        
        {/* Left Section: Browse & Vote (8 cols) */}
        <section className="col-span-12 lg:col-span-8 flex flex-col h-full overflow-hidden space-y-4">
          
          {/* Controls Bar */}
          <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-studio-dark border border-white/5 p-4 rounded-xl">
            {/* Search Input */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
              <input
                type="text"
                placeholder="Search requests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl glass-input text-xs text-white placeholder-gray-500 outline-none"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 text-xs bg-black/30 p-1 rounded-xl border border-white/5 shrink-0">
              {[
                { id: 'all', label: 'All Ideas' },
                { id: 'feature', label: 'Features' },
                { id: 'filter', label: 'Lenses' },
                { id: 'ui', label: 'UI' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/10'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Ideas List Container */}
          <div className="flex-1 overflow-y-auto space-y-3.5 pr-1.5 custom-scrollbar pb-6">
            {filteredIdeas.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-center text-gray-500 border border-dashed border-white/5 rounded-2xl bg-studio-dark/40">
                <Lightbulb className="h-10 w-10 opacity-30 mb-2" />
                <p className="text-sm font-semibold">No feedback suggestions found</p>
                <p className="text-xs opacity-80 mt-1">Be the first to submit a feature request on the right!</p>
              </div>
            ) : (
              filteredIdeas.map((idea) => {
                const hasUpvoted = idea.upvotedBy?.includes(user?.uid || '');
                return (
                  <div 
                    key={idea.id} 
                    className="p-4 rounded-2xl bg-studio-dark border border-white/5 hover:border-white/10 flex items-start justify-between gap-5 transition-all shadow-lg"
                  >
                    {/* Vote button on the left */}
                    <button
                      onClick={() => handleToggleUpvote(idea)}
                      className={`flex flex-col items-center justify-center h-16 w-12 rounded-xl border shrink-0 transition-all ${
                        hasUpvoted
                          ? 'bg-purple-500/20 border-purple-400 text-purple-300 shadow-md shadow-purple-500/5'
                          : 'bg-black/40 border-white/5 text-gray-400 hover:text-white hover:border-white/10'
                      }`}
                    >
                      <ThumbsUp className={`h-4 w-4 mb-1.5 ${hasUpvoted ? 'fill-purple-400/20' : ''}`} />
                      <span className="text-xs font-black font-mono">{idea.upvotes || 0}</span>
                    </button>

                    {/* Idea Details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[9px] font-extrabold uppercase tracking-wide px-2 py-0.5 rounded ${
                          idea.category === 'Feature Request' ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20' :
                          idea.category === 'Filter Idea' ? 'bg-pink-500/10 text-pink-300 border border-pink-500/20' :
                          idea.category === 'UI Improvement' ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20' :
                          'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                        }`}>
                          {idea.category}
                        </span>
                        <span className="text-[10px] text-gray-500">Suggested by @{idea.creator}</span>
                      </div>
                      <h4 className="text-sm font-bold text-white leading-snug">{idea.title}</h4>
                      <p className="text-[11px] text-gray-300 leading-relaxed font-sans">{idea.description}</p>
                    </div>

                    {/* Admin/Creator actions */}
                    {user && (user.uid === idea.creatorId) && (
                      <button 
                        onClick={() => handleDeleteIdea(idea.id)}
                        className="h-8 w-8 rounded-lg bg-red-500/5 hover:bg-red-500/15 text-red-400 flex items-center justify-center shrink-0 self-start transition-colors"
                        title="Delete Idea"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </section>

        {/* Right Section: Submit Suggestion Form (4 cols) */}
        <section className="col-span-12 lg:col-span-4 h-full flex flex-col shrink-0">
          <div className="bg-studio-dark border border-white/5 p-5 rounded-2xl flex flex-col max-h-full overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-purple-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Submit Suggestion</h3>
            </div>

            <form onSubmit={handleCreateIdea} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-studio-darker border border-white/10 hover:border-white/20 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-purple-500 transition-colors"
                >
                  <option value="Feature Request">Feature Request</option>
                  <option value="Filter Idea">Filter / Lens Option</option>
                  <option value="UI Improvement">UI/UX Improvement</option>
                  <option value="Performance">Performance Boost</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Title</label>
                <input
                  type="text"
                  placeholder="e.g. Add 3D Makeup Presets"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-studio-darker border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">Description</label>
                <textarea
                  placeholder="Describe your idea or what changes you want us to improve on..."
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-studio-darker border border-white/10 hover:border-white/20 focus:border-purple-500 rounded-xl px-3 py-2 text-xs text-white outline-none transition-colors resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-500/10 active:scale-[0.97] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{isSubmitting ? 'Submitting...' : 'Share Idea'}</span>
              </button>
            </form>

            {formMessage && (
              <p className="text-[10px] font-bold mt-4 text-purple-300 text-center bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-xl">
                {formMessage}
              </p>
            )}
          </div>
        </section>

      </main>

    </div>
  );
};

export default IdeasBoard;
