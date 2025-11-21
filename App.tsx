import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import StickerMaker from './views/StickerMaker';
import Gallery from './views/Gallery';
import { Sticker } from './types';
import { getStickers, saveSticker, deleteStickers } from './services/storage';

const App: React.FC = () => {
  const [view, setView] = useState<'create' | 'gallery'>('create');
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [stickerToEdit, setStickerToEdit] = useState<Sticker | null>(null);

  // Load stickers on mount (Async for IndexedDB)
  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await getStickers();
        setStickers(data);
      } catch (error) {
        console.error("Failed to load gallery:", error);
      }
    };
    loadData();
  }, []);

  const handleStickerCreated = async (newSticker: Sticker) => {
    try {
      const updated = await saveSticker(newSticker);
      setStickers(updated);
    } catch (error) {
      console.error("Failed to save sticker:", error);
      alert("Could not save to gallery.");
    }
  };

  const handleDeleteStickers = async (ids: string[]) => {
    try {
      const updated = await deleteStickers(ids);
      setStickers(updated);
    } catch (error) {
      console.error("Failed to delete stickers:", error);
    }
  };

  const handleEditSticker = (sticker: Sticker) => {
    setStickerToEdit(sticker);
    setView('create');
  };

  const handleNavigate = (newView: 'create' | 'gallery') => {
    if (newView === 'create') {
      // Clear edit state if navigating manually
      setStickerToEdit(null);
    }
    setView(newView);
  };

  return (
    <Layout currentView={view} onNavigate={handleNavigate}>
      {view === 'create' ? (
        <StickerMaker 
          onStickerCreated={handleStickerCreated}
          initialSticker={stickerToEdit}
        />
      ) : (
        <Gallery 
          stickers={stickers}
          onDelete={handleDeleteStickers}
          onEdit={handleEditSticker}
          onNavigateCreate={() => handleNavigate('create')}
        />
      )}
    </Layout>
  );
};

export default App;