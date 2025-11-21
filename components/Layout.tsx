import React, { useState } from 'react';
import Logo from './Logo';
import FeedbackModal from './FeedbackModal';
import { History, MessageSquarePlus, PlusCircle } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'create' | 'gallery';
  onNavigate: (view: 'create' | 'gallery') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentView, onNavigate }) => {
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#050505]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Brand - Mobile: Logo Only, Desktop: Logo + Text */}
            <div 
              className="flex items-center gap-3 cursor-pointer group" 
              onClick={() => onNavigate('create')}
            >
              <div className="group-hover:rotate-12 transition-transform duration-500 ease-in-out">
                <Logo className="w-8 h-8 sm:w-9 sm:h-9" />
              </div>
              <span className="hidden sm:block text-xl font-serif italic tracking-wide text-white group-hover:tracking-wider transition-all duration-300">
                SkieVision
              </span>
            </div>

            {/* Center Navigation - Mobile: Icons Only, Desktop: Icons + Text */}
            <nav className="flex items-center gap-1 bg-white/5 rounded-full p-1 border border-white/5">
               <button 
                 onClick={() => onNavigate('create')}
                 className={`
                   px-3 sm:px-4 py-2 sm:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-2
                   ${currentView === 'create' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                 `}
                 title="Studio"
               >
                 <PlusCircle size={18} className="sm:w-3.5 sm:h-3.5" /> 
                 <span className="hidden sm:inline">Studio</span>
               </button>
               <button 
                 onClick={() => onNavigate('gallery')}
                 className={`
                   px-3 sm:px-4 py-2 sm:py-1.5 text-sm font-medium rounded-full transition-all flex items-center gap-2
                   ${currentView === 'gallery' ? 'bg-white/10 text-white shadow-sm' : 'text-zinc-400 hover:text-white hover:bg-white/5'}
                 `}
                 title="Gallery"
               >
                 <History size={18} className="sm:w-3.5 sm:h-3.5" /> 
                 <span className="hidden sm:inline">Gallery</span>
               </button>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
               <button 
                 onClick={() => setIsFeedbackOpen(true)}
                 className="flex items-center gap-2 px-2 sm:px-3 py-2 sm:py-1.5 text-xs font-medium text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg transition-all"
                 title="Feedback"
               >
                 <MessageSquarePlus size={18} className="sm:w-3.5 sm:h-3.5" /> 
                 <span className="hidden sm:inline">Feedback</span>
               </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {children}
      </main>

      {/* Footer / Status Bar */}
      <footer className="border-t border-white/5 py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-4 justify-between items-center text-xs text-zinc-600 font-mono">
           <span>SYSTEM: SKIEVISION V1.2</span>
           <span>Powered by Gemini 2.5 Flash</span>
           <span>Made with ❤️ by ezDecode</span>
        </div>
      </footer>

      <FeedbackModal 
        isOpen={isFeedbackOpen} 
        onClose={() => setIsFeedbackOpen(false)} 
      />
    </div>
  );
};

export default Layout;