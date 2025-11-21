
import React, { useState } from 'react';
import { Sticker } from '../types';
import { Trash2, Edit2, CheckCircle2, Circle, X, Grid } from 'lucide-react';
import Button from '../components/Button';

interface GalleryProps {
  stickers: Sticker[];
  onDelete: (ids: string[]) => void;
  onEdit: (sticker: Sticker) => void;
  onNavigateCreate: () => void;
}

const Gallery: React.FC<GalleryProps> = ({ stickers, onDelete, onEdit, onNavigateCreate }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleBulkDelete = () => {
    if (confirm(`Delete ${selectedIds.size} stickers?`)) {
      onDelete(Array.from(selectedIds));
      setSelectedIds(new Set());
      setIsSelectionMode(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === stickers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(stickers.map(s => s.id)));
    }
  };

  if (stickers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6 animate-fade-in">
        <div className="w-24 h-24 bg-zinc-900 rounded-full flex items-center justify-center border border-zinc-800">
          <Grid size={40} className="text-zinc-600" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-serif italic text-white">Gallery is Empty</h2>
          <p className="text-zinc-500">Create your first sticker to start your collection.</p>
        </div>
        <Button onClick={onNavigateCreate}>Go to Studio</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-serif italic text-white">Gallery</h2>
          <p className="text-zinc-500 text-sm mt-1">{stickers.length} Items</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setIsSelectionMode(!isSelectionMode);
              setSelectedIds(new Set());
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              isSelectionMode 
                ? 'bg-zinc-800 text-white' 
                : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
            }`}
          >
            {isSelectionMode ? 'Cancel Selection' : 'Select Multiple'}
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {stickers.map((sticker) => (
          <div 
            key={sticker.id}
            className={`
              group relative aspect-square bg-[#0c0c0e] rounded-2xl border overflow-hidden transition-all duration-200
              ${selectedIds.has(sticker.id) 
                ? 'border-white ring-1 ring-white' 
                : 'border-white/10 hover:border-white/30'}
            `}
            onClick={() => {
              if (isSelectionMode) toggleSelection(sticker.id);
            }}
          >
             {/* Transparent Grid BG */}
             <div className="absolute inset-0 opacity-20" style={{ 
                backgroundImage: 'linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%, #222), linear-gradient(45deg, #222 25%, transparent 25%, transparent 75%, #222 75%, #222)',
                backgroundPosition: '0 0, 10px 10px',
                backgroundSize: '20px 20px'
             }}></div>

             {/* Image */}
             <div className="absolute inset-4 flex items-center justify-center overflow-hidden">
                <img src={sticker.url} alt={sticker.prompt} className="w-full h-full object-contain drop-shadow-xl" />
             </div>

             {/* Selection Checkbox Overlay (Always visible in selection mode) */}
             {isSelectionMode && (
               <div className="absolute inset-0 bg-black/20 cursor-pointer flex items-start justify-end p-3">
                 <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all ${selectedIds.has(sticker.id) ? 'bg-white text-black scale-110' : 'bg-black/50 border border-white/30 text-transparent'}`}>
                    <CheckCircle2 size={14} />
                 </div>
               </div>
             )}

             {/* Action Overlay (Only visible on hover when NOT in selection mode) */}
             {!isSelectionMode && (
               <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px] flex flex-col items-center justify-center gap-3">
                  <Button 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); onEdit(sticker); }}
                    className="min-w-[100px]"
                  >
                    <Edit2 size={14} className="mr-2" /> Edit
                  </Button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete([sticker.id]); }}
                    className="p-2 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-full transition-colors border border-red-500/30"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="absolute bottom-3 px-4 text-center">
                    <p className="text-xs text-zinc-400 line-clamp-2">{sticker.prompt || "Untitled Sticker"}</p>
                  </div>
               </div>
             )}
          </div>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {isSelectionMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-50 animate-in slide-in-from-bottom-10">
          <div className="bg-zinc-900 border border-zinc-700 shadow-2xl rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
               <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-zinc-300 hover:text-white">
                 {selectedIds.size === stickers.length ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                 {selectedIds.size} Selected
               </button>
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="danger" 
                size="sm" 
                disabled={selectedIds.size === 0}
                onClick={handleBulkDelete}
              >
                <Trash2 size={14} className="mr-2" /> Delete Selected
              </Button>
              <button 
                onClick={() => setIsSelectionMode(false)}
                className="p-2 text-zinc-500 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
