import React, { useCallback, useState, useEffect } from 'react';
import { Upload, X, Loader2, ImagePlus } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  currentImage: File | null;
  onClear: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({ onImageSelect, currentImage, onClear }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Reset processing state when currentImage changes (meaning parent received it) or is cleared
  useEffect(() => {
    if (currentImage) {
      setIsProcessing(false);
    }
  }, [currentImage]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setIsProcessing(true);
      const file = e.dataTransfer.files[0];
      // Artificial delay to ensure React renders the loader before heavy processing hooks fire
      setTimeout(() => {
        onImageSelect(file);
      }, 100);
    }
  }, [onImageSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsProcessing(true);
      const file = e.target.files[0];
      setTimeout(() => {
        onImageSelect(file);
      }, 100);
    }
  };

  const handleClear = () => {
    setIsProcessing(false);
    onClear();
  };

  // Render processing state
  if (isProcessing) {
     return (
        <div className="relative w-full h-56 bg-[#050505] rounded-xl border border-zinc-800 flex flex-col items-center justify-center gap-3 animate-pulse">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
            <p className="text-sm text-zinc-400 font-medium">Reading image...</p>
        </div>
     );
  }

  if (currentImage) {
    return (
      <div className="relative w-full h-56 bg-[#050505] rounded-xl overflow-hidden border border-zinc-800 group shadow-inner">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '16px 16px' }}></div>
        
        <div className="absolute inset-0 flex items-center justify-center p-4">
            <img 
              src={URL.createObjectURL(currentImage)} 
              alt="Preview" 
              className="w-full h-full object-contain relative z-10"
            />
        </div>

        <div className="absolute top-2 right-2 z-20 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={handleClear}
              className="p-1.5 bg-black/60 hover:bg-red-500/80 text-white rounded-full backdrop-blur-md transition-colors border border-white/10"
            >
              <X size={14} />
            </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full h-56 rounded-xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center gap-3 cursor-pointer group overflow-hidden
        ${isDragging 
            ? 'border-white bg-zinc-900 scale-[0.99]' 
            : 'border-zinc-800 bg-[#0a0a0a] hover:border-zinc-600 hover:bg-zinc-900/30'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input 
        type="file" 
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        accept="image/jpeg,image/png,image/webp,image/heic"
        onChange={handleFileChange}
      />
      
      <div className={`
          p-3 rounded-2xl bg-zinc-900 border border-zinc-800 transition-transform duration-500
          ${isDragging ? 'scale-110' : 'group-hover:scale-105 group-hover:-translate-y-1'}
      `}>
        <ImagePlus className="w-6 h-6 text-zinc-400 group-hover:text-white transition-colors" />
      </div>
      
      <div className="text-center px-4 z-0">
        <p className="text-sm font-medium text-zinc-300 font-sans">Click or drop image</p>
        <p className="text-xs text-zinc-600 mt-1">Optimized for SkieVision Crystal PNGs</p>
      </div>

      {/* Decorative background elements */}
      <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none group-hover:bg-white/10 transition-colors"></div>
    </div>
  );
};

export default ImageUpload;