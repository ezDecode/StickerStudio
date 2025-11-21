import React, { useState, useEffect } from 'react';
import { generateImageFromPrompt } from '../services/geminiService';
import { ArrowRight, Download, Loader2, Settings } from 'lucide-react';

const ImageGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState<'idle' | 'processing' | 'finishing'>('idle');
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loadingState === 'processing') {
      const messages = [
        "Constructing geometry...",
        "Calculating light paths...",
        "Applying texture maps...",
        "Rendering final output..."
      ];
      let i = 0;
      setLoadingMessage(messages[0]);
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [loadingState]);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    
    setLoadingState('processing');
    setError(null);
    setGeneratedImage(null);

    try {
      const result = await generateImageFromPrompt(prompt);
      setLoadingState('finishing');
      // Artificial delay for "finishing" state to smooth UI transition
      setTimeout(() => {
        setGeneratedImage(result);
        setLoadingState('idle');
      }, 800);
    } catch (err: any) {
      setError("Generation failed. " + (err.message || "Please try again."));
      setLoadingState('idle');
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-12 md:py-20 space-y-16 px-4">
       {/* Custom Scan Animation Style */}
       <style>{`
         @keyframes scan {
           0% { top: 0%; opacity: 0; }
           10% { opacity: 1; }
           90% { opacity: 1; }
           100% { top: 100%; opacity: 0; }
         }
         .animate-scan {
           animation: scan 2s ease-in-out infinite;
           background: linear-gradient(to bottom, transparent, rgba(255,255,255,0.1), rgba(255,255,255,0.3), rgba(255,255,255,0.1), transparent);
           height: 20%;
           width: 100%;
           position: absolute;
           z-index: 10;
         }
       `}</style>

       <div className="text-center space-y-4">
        <h2 className="text-5xl md:text-7xl font-serif italic tracking-tight text-white">
          Imagine.
        </h2>
        <p className="text-zinc-500 text-lg font-light max-w-md mx-auto">
          Transform text into visual reality with Imagen 4.0.
        </p>
      </div>

      {/* Input Section - Minimal */}
      <div className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-zinc-800 to-zinc-700 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
        <div className="relative bg-zinc-900/80 backdrop-blur-xl rounded-xl border border-white/5 flex items-center p-2 shadow-2xl transition-all focus-within:ring-1 focus-within:ring-white/10">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A chrome sculpture of a cat in a desert..."
            className="flex-1 bg-transparent border-none px-4 py-4 text-white placeholder-zinc-700 focus:ring-0 text-lg font-light"
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            disabled={loadingState !== 'idle'}
            autoFocus
          />
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || loadingState !== 'idle'}
            className={`
                px-6 py-3 rounded-lg transition-all duration-300 flex items-center gap-2 font-medium
                ${prompt.trim() && loadingState === 'idle' 
                  ? 'bg-white text-black hover:bg-zinc-200' 
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'}
            `}
          >
             {loadingState !== 'idle' ? (
                 <>
                    <Loader2 size={18} className="animate-spin" />
                    <span className="hidden sm:inline">Processing</span>
                 </>
             ) : (
                 <>
                    Generate <ArrowRight size={18} />
                 </>
             )}
          </button>
        </div>
      </div>

      {error && (
          <div className="text-center text-red-400 bg-red-900/10 border border-red-900/20 p-4 rounded-xl text-sm">
            {error}
          </div>
      )}

      {/* Output Area */}
      <div className="relative w-full aspect-square md:aspect-[16/9] rounded-2xl flex items-center justify-center overflow-hidden min-h-[400px] bg-zinc-950 border border-zinc-900">
        
        {/* Empty State */}
        {!generatedImage && loadingState === 'idle' && !error && (
            <div className="flex flex-col items-center justify-center text-zinc-800">
                 <div className="w-px h-24 bg-gradient-to-b from-transparent via-zinc-800 to-transparent mb-6"></div>
                 <p className="font-serif italic text-2xl text-zinc-700">Canvas Empty</p>
            </div>
        )}

        {/* Loading State - Engaging Gear Metaphor with Holographic Scan */}
        {loadingState !== 'idle' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
                
                {/* Holographic Scan Line Overlay */}
                <div className="absolute inset-0 animate-scan pointer-events-none"></div>

                {/* Gear Animation Container */}
                <div className="relative w-32 h-32 mb-8">
                  {/* Large Gear */}
                  <Settings 
                    strokeWidth={1}
                    className="absolute top-0 right-2 text-zinc-600 w-20 h-20 animate-[spin_6s_linear_infinite]" 
                  />
                  {/* Small Gear - Interlocked */}
                  <Settings 
                    strokeWidth={1.5}
                    className="absolute bottom-2 left-2 text-white w-14 h-14 animate-[spin_3s_linear_reverse_infinite]" 
                  />
                  
                  {/* Subtle particle effects behind */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="w-24 h-24 bg-white/5 blur-3xl rounded-full animate-pulse"></div>
                  </div>
                </div>
                
                <div className="text-center space-y-2 relative z-10">
                  <p className="text-white font-serif text-3xl italic animate-in fade-in duration-1000">
                    {loadingState === 'finishing' ? "Final Polish..." : "Processing"}
                  </p>
                  <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono h-4">
                    {loadingMessage}
                  </p>
                </div>
            </div>
        )}

        {/* Result Image */}
        {generatedImage && (
          <div className="relative w-full h-full group animate-in fade-in duration-700">
            <img 
              src={generatedImage} 
              alt={prompt} 
              className="w-full h-full object-contain rounded-md shadow-2xl"
            />
            
            {/* Hover Actions */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4 backdrop-blur-[2px]">
               <a 
                href={generatedImage} 
                download={`skie-gen-${Date.now()}.jpg`}
                className="bg-white text-black px-6 py-3 rounded-full font-medium hover:scale-105 transition-transform flex items-center gap-2"
              >
                <Download size={18} /> 
                Download
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageGenerator;