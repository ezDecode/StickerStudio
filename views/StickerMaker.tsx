import React, { useState, useEffect } from 'react';
import { generateSticker, processImage, detectSubject, editSticker, enhancePromptForComedy, convertToWhatsAppFormat, STICKER_STYLES, StickerStyleKey, ERROR_API_KEY_REQUIRED, ERROR_API_KEY_INVALID } from '../services/geminiService';
import { saveAutosave, getAutosave, clearAutosave, getFreeImageCount, getUserApiKey } from '../services/storage';
import Button from '../components/Button';
import ImageUpload from '../components/ImageUpload';
import ApiKeyModal from '../components/ApiKeyModal';
import { Sticker } from '../types';
import { Download, Sparkles, ScanEye, PenTool, Type, Share2, Trash2, Wand2, X, Check, ThumbsUp, ThumbsDown, AlertTriangle, Globe, ExternalLink, Search, Zap, MessageCircle, Loader2, Palette, ShieldCheck } from 'lucide-react';

interface StickerMakerProps {
  onStickerCreated: (sticker: Sticker) => void;
  initialSticker?: Sticker | null;
}

const StickerMaker: React.FC<StickerMakerProps> = ({ onStickerCreated, initialSticker }) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [generatedSticker, setGeneratedSticker] = useState<string | null>(null);

  const [prompt, setPrompt] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<StickerStyleKey>('ANIME');
  const [isLoading, setIsLoading] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [groundingSources, setGroundingSources] = useState<{ uri: string; title: string }[]>([]);

  const [error, setError] = useState<string | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("Initializing humor module...");
  const [feedbackSent, setFeedbackSent] = useState<'up' | 'down' | null>(null);

  const [hasDownloaded, setHasDownloaded] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompt, setEditPrompt] = useState('');

  // --- NEW: QUOTA & KEY STATE ---
  const [quotaUsed, setQuotaUsed] = useState<number>(0);
  const [hasUserKey, setHasUserKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [keyModalReason, setKeyModalReason] = useState<'quota' | 'invalid' | 'missing'>('quota');

  const refreshQuota = async () => {
    const count = await getFreeImageCount();
    const key = await getUserApiKey();
    setQuotaUsed(count);
    setHasUserKey(!!key && key.trim().length > 0);

    if (key) {
      console.log("🔑 Active Key Source: USER_PROVIDED_KEY");
    } else {
      console.log(`🔑 Active Key Source: SYSTEM_DEV_KEY (Usage: ${count}/5)`);
    }
  };

  useEffect(() => {
    refreshQuota();
  }, [generatedSticker]); // Refresh whenever a sticker is generated

  // 1. Load initial sticker OR Autosave
  useEffect(() => {
    const loadSession = async () => {
      await refreshQuota();
      if (initialSticker) {
        setGeneratedSticker(initialSticker.url);
        setPrompt(initialSticker.prompt || "Edited Sticker");
        setIsEditing(true);
        setHasDownloaded(true);
      } else {
        const saved = await getAutosave();
        if (saved && saved.generatedSticker) {
          setGeneratedSticker(saved.generatedSticker);
          setPrompt(saved.prompt);
          setCaption(saved.caption);
          setHasDownloaded(false);
        }
      }
    };
    loadSession();
  }, [initialSticker]);

  // 2. Autosave
  useEffect(() => {
    if (!isEditing && !isLoading && generatedSticker) {
      saveAutosave({
        generatedSticker,
        prompt,
        caption
      });
    }
  }, [generatedSticker, prompt, caption, isEditing, isLoading]);

  // 3. Prevent exit
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (generatedSticker && !hasDownloaded && !isLoading) {
        const message = "You have unsaved work! Download your sticker before leaving.";
        e.preventDefault();
        e.returnValue = message;
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [generatedSticker, hasDownloaded, isLoading]);

  const handleError = (err: any) => {
    const msg = err.message || "";
    if (msg === ERROR_API_KEY_REQUIRED) {
      setKeyModalReason(quotaUsed >= 5 ? 'quota' : 'missing');
      setShowKeyModal(true);
      return true; // Handled
    }
    if (msg === ERROR_API_KEY_INVALID) {
      setKeyModalReason('invalid');
      setShowKeyModal(true);
      return true; // Handled
    }
    setError("Failed to generate. " + (msg || "Please try again."));
    return false;
  };

  const handleAutoDetect = async () => {
    if (!selectedImage) return;
    setIsDetecting(true);
    try {
      const { data, mimeType } = await processImage(selectedImage);
      const detection = await detectSubject(data, mimeType);
      if (detection) {
        setPrompt(detection);
      }
    } catch (e) {
      console.error("Detection failed", e);
    } finally {
      setIsDetecting(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage && !prompt.trim()) {
      setError("Upload an image or enter a text prompt to start.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setGeneratedSticker(null);
    setIsEditing(false);
    setFeedbackSent(null);
    setHasDownloaded(false);
    setGroundingSources([]);

    setLoadingMsg("Scouring the internet for humor...");

    try {
      let finalPrompt = prompt;
      if (prompt.trim()) {
        try {
          setLoadingMsg("Applying 'Funny' filters...");
          const enhanced = await enhancePromptForComedy(prompt);
          if (enhanced.text !== prompt) finalPrompt = enhanced.text;
          if (enhanced.sources.length > 0) setGroundingSources(enhanced.sources);
        } catch (e) {
          console.warn("Enhancement skipped", e);
        }
      }

      setLoadingMsg(`Rendering in ${STICKER_STYLES[selectedStyle].label} style...`);

      let base64Data = null;
      let mimeType = 'image/jpeg';

      if (selectedImage) {
        const processed = await processImage(selectedImage);
        base64Data = processed.data;
        mimeType = processed.mimeType;
      }

      const result = await generateSticker(base64Data, finalPrompt, caption, mimeType, selectedStyle);

      setGeneratedSticker(result);

      const newSticker: Sticker = {
        id: Date.now().toString(),
        url: result,
        prompt: prompt || (caption ? `Caption: ${caption}` : "Generated Sticker"),
        timestamp: Date.now()
      };
      onStickerCreated(newSticker);

    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async () => {
    if (!generatedSticker || !editPrompt.trim()) return;

    setIsLoading(true);
    setError(null);
    setLoadingMsg("Applying edits...");

    try {
      const result = await editSticker(generatedSticker, editPrompt);
      setGeneratedSticker(result);
      setIsEditing(false);
      setEditPrompt('');
      setFeedbackSent(null);
      setHasDownloaded(false);

      const newSticker: Sticker = {
        id: Date.now().toString(),
        url: result,
        prompt: `Edit: ${editPrompt}`,
        timestamp: Date.now()
      };
      onStickerCreated(newSticker);

    } catch (err: any) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (generatedSticker) {
      try {
        const response = await fetch(generatedSticker);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `skievision-sticker-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setHasDownloaded(true);
      } catch (e) {
        const link = document.createElement('a');
        link.href = generatedSticker;
        link.download = `skievision-sticker-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setHasDownloaded(true);
      }
    }
  };

  const handleShare = async () => {
    if (!generatedSticker) return;
    setIsSharing(true);
    try {
      const blob = await convertToWhatsAppFormat(generatedSticker);
      const file = new File([blob], `sticker-${Date.now()}.webp`, { type: 'image/webp' });

      if (navigator.share && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
        });
        setHasDownloaded(true);
      } else {
        throw new Error("Native sharing not supported");
      }
    } catch (e) {
      try {
        const response = await fetch(generatedSticker);
        const blob = await response.blob();
        await navigator.clipboard.write([
          new ClipboardItem({ [blob.type]: blob })
        ]);
        alert("Sharing not supported on this device. Image copied to clipboard.");
      } catch (clipboardErr) {
        alert("Could not share. Please use the Download button.");
      }
    } finally {
      setIsSharing(false);
    }
  };

  const handleQuickFeedback = (type: 'up' | 'down') => {
    setFeedbackSent(type);
  };

  const resetAll = async () => {
    if (generatedSticker && !hasDownloaded) {
      if (!confirm("You haven't downloaded this sticker. Are you sure you want to discard it?")) {
        return;
      }
    }
    setSelectedImage(null);
    setGeneratedSticker(null);
    setPrompt('');
    setCaption('');
    setEditPrompt('');
    setIsEditing(false);
    setError(null);
    setFeedbackSent(null);
    setHasDownloaded(false);
    setGroundingSources([]);
    await clearAutosave();
  };

  return (
    <div className="h-full flex flex-col animate-fade-in gap-6 relative">
      <ApiKeyModal
        isOpen={showKeyModal}
        onClose={() => {
          setShowKeyModal(false);
          refreshQuota();
        }}
        reason={keyModalReason}
      />

      <style>{`
        @keyframes draw-circle {
          0% { stroke-dashoffset: 283; transform: rotate(-90deg); }
          50% { stroke-dashoffset: 0; transform: rotate(-90deg); }
          100% { stroke-dashoffset: -283; transform: rotate(-90deg); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(-12deg); }
          50% { transform: rotate(12deg); }
        }
        .animate-wiggle {
          animation: wiggle 1s ease-in-out infinite;
          transform-origin: bottom left;
        }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* TITLE SECTION */}
      <div className="flex flex-col md:flex-row items-end justify-between gap-4 mb-2 order-last lg:order-first pt-8 lg:pt-0 border-t lg:border-none border-white/10">
        <div className="w-full text-center lg:text-left">
          <h2 className="text-2xl md:text-5xl font-serif italic text-white tracking-tight leading-none">
            {isEditing && initialSticker ? 'Edit Studio' : 'Sticker Studio'}
          </h2>
          <p className="text-zinc-500 mt-2 text-xs md:text-sm font-light max-w-md mx-auto lg:mx-0">
            {isEditing && initialSticker ? 'Tweaking your masterpiece.' : 'Turn ideas into funny anime stickers.'}
          </p>
        </div>
      </div>

      {/* MAIN WORKSPACE GRID */}
      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 flex-1 min-h-0 order-1 lg:order-2">

        {/* PANEL 1: INPUT */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-[#0c0c0e] border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col gap-6">
            {/* Section Header with API Status */}
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <span className="text-xs font-mono text-zinc-400 tracking-widest uppercase">Input Source</span>

              {/* Quota Badge */}
              <button
                onClick={() => setShowKeyModal(true)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-medium border transition-all ${hasUserKey
                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20'
                  : (quotaUsed >= 5 ? 'bg-red-500/10 text-red-300 border-red-500/30' : 'bg-zinc-800 text-zinc-300 border-white/10 hover:bg-zinc-700')
                  }`}
                title={hasUserKey ? "Using your personal API Key" : "Using free system quota"}
              >
                {hasUserKey ? (
                  <><ShieldCheck size={10} /> BYOK Active</>
                ) : (
                  <>{quotaUsed}/5 Free Used</>
                )}
              </button>

              {(selectedImage || generatedSticker) && (
                <button onClick={resetAll} className="ml-2 text-xs text-red-400 hover:text-red-300 flex items-center gap-1 transition-colors">
                  <Trash2 size={12} /> Reset
                </button>
              )}
            </div>

            <div className="space-y-2">
              <ImageUpload
                onImageSelect={(file) => {
                  setSelectedImage(file);
                  setGeneratedSticker(null);
                  setIsEditing(false);
                  setFeedbackSent(null);
                  setHasDownloaded(false);
                  setGroundingSources([]);
                }}
                currentImage={selectedImage}
                onClear={async () => {
                  setSelectedImage(null);
                  setGeneratedSticker(null);
                  setIsEditing(false);
                  setFeedbackSent(null);
                  setHasDownloaded(false);
                  setGroundingSources([]);
                  await clearAutosave();
                }}
              />
            </div>

            <div className="space-y-5">
              {/* Style Indicator */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1 flex items-center gap-2">
                  <Palette size={12} /> Art Style
                </label>
                <div className="w-full bg-zinc-900/50 border border-zinc-800 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-white">Anime</span>
                    <span className="text-[10px] text-zinc-500">Comic Book Aesthetic</span>
                  </div>
                  <div className="px-2 py-1 bg-zinc-800 rounded text-[10px] text-zinc-400">Active</div>
                </div>
              </div>

              {/* Prompt Field */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">Description / Context</label>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-zinc-700 to-zinc-600 rounded-xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur-sm"></div>
                  <div className="relative flex items-center bg-[#151518] border border-white/10 rounded-xl overflow-hidden focus-within:bg-black transition-colors">
                    <input
                      type="text"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={selectedImage ? "E.g. 'A grumpy cat'" : "Describe sticker (Auto-Enhanced)"}
                      className="w-full bg-transparent border-none pl-4 pr-16 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none font-light"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />

                    <div className="absolute right-2 flex gap-1">
                      {selectedImage && (
                        <button
                          onClick={handleAutoDetect}
                          disabled={isDetecting}
                          className="p-2 text-zinc-500 hover:text-white transition-colors rounded-lg hover:bg-zinc-800"
                          title="AI Auto-detect"
                        >
                          {isDetecting ? <div className="w-4 h-4 border-2 border-zinc-500 border-t-white rounded-full animate-spin" /> : <ScanEye size={16} />}
                        </button>
                      )}
                      {!selectedImage && (
                        <div className="p-2 text-zinc-600 cursor-help" title="We will auto-enhance this with search!">
                          <Zap size={16} />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Grounding Sources */}
                  {groundingSources.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1 animate-in fade-in slide-in-from-top-2">
                      <span className="text-[10px] text-zinc-500 flex items-center gap-1 uppercase tracking-wider font-mono"><Globe size={10} /> Comedy Sources Used:</span>
                      <div className="flex flex-wrap gap-2">
                        {groundingSources.slice(0, 3).map((source, idx) => (
                          <a
                            key={idx}
                            href={source.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] bg-zinc-800 text-zinc-300 px-2 py-1 rounded-md border border-white/10 hover:bg-zinc-700 transition-colors flex items-center gap-1 max-w-[200px] truncate"
                          >
                            {source.title} <ExternalLink size={8} />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Caption Field */}
              <div className="space-y-2 animate-in fade-in">
                <div className="flex justify-between">
                  <label className="text-xs text-zinc-400 font-medium ml-1 flex items-center gap-2">
                    Overlay Text <span className="text-zinc-600 font-normal text-[10px]">(Optional - Auto-Generated if Empty)</span>
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/40 to-fuchsia-500/40 rounded-xl opacity-0 group-focus-within:opacity-100 transition duration-500 blur-sm"></div>

                  <div className="relative flex items-center bg-[#151518] border border-white/10 rounded-xl overflow-hidden focus-within:bg-black transition-colors">
                    <div className="pl-4 text-zinc-500"><Type size={16} /></div>
                    <input
                      type="text"
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Add funny text..."
                      className="w-full bg-transparent border-none pl-3 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:outline-none font-light"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Generate Action */}
            <div className="pt-4 mt-auto">
              {error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-200">
                  {error}
                </div>
              )}
              <Button
                className="w-full rounded-xl py-4 text-base shadow-lg shadow-white/5 transition-all active:scale-95"
                variant={(selectedImage || prompt.trim()) ? "primary" : "secondary"}
                onClick={handleGenerate}
                disabled={(!selectedImage && !prompt.trim())}
                isLoading={isLoading}
              >
                <span className="flex items-center gap-2">
                  <Sparkles size={18} />
                  {isLoading ? 'Processing...' : 'Generate Sticker'}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {/* PANEL 2: OUTPUT */}
        <div className="lg:col-span-8 aspect-square lg:aspect-auto lg:h-auto flex flex-col min-h-[350px]">
          <div className="flex-1 bg-[#121214] rounded-3xl border border-white/10 relative overflow-hidden flex flex-col shadow-2xl">

            <div className="absolute top-0 left-0 right-0 h-14 bg-gradient-to-b from-black/80 to-transparent z-20 flex items-center justify-between px-4">
              <div className="flex items-center gap-1">
                {generatedSticker && !hasDownloaded && !isLoading && (
                  <span className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-full flex items-center gap-1 animate-pulse">
                    <AlertTriangle size={10} /> Unsaved Changes
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {generatedSticker && !isLoading && (
                  <>
                    <div className="mr-2 flex items-center gap-1 border-r border-white/10 pr-3">
                      <button
                        onClick={() => handleQuickFeedback('up')}
                        disabled={feedbackSent !== null}
                        className={`p-2 backdrop-blur-md rounded-lg border transition-all ${feedbackSent === 'up'
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-black/50 border-white/10 text-zinc-400 hover:text-green-400'
                          }`}
                        title="Good Result"
                      >
                        <ThumbsUp size={16} />
                      </button>
                      <button
                        onClick={() => handleQuickFeedback('down')}
                        disabled={feedbackSent !== null}
                        className={`p-2 backdrop-blur-md rounded-lg border transition-all ${feedbackSent === 'down'
                          ? 'bg-red-500/20 border-red-500/50 text-red-400'
                          : 'bg-black/50 border-white/10 text-zinc-400 hover:text-red-400'
                          }`}
                        title="Poor Result"
                      >
                        <ThumbsDown size={16} />
                      </button>
                    </div>

                    <button
                      onClick={handleShare}
                      disabled={isSharing}
                      className="p-2 bg-black/50 backdrop-blur-md text-zinc-400 hover:text-white rounded-lg border border-white/10 transition-colors min-w-[36px] flex items-center justify-center"
                      title="Share as Sticker"
                    >
                      {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="absolute inset-0 z-0 opacity-20"
              style={{
                backgroundImage: `
                       linear-gradient(45deg, #1a1a1d 25%, transparent 25%, transparent 75%, #1a1a1d 75%, #1a1a1d), 
                       linear-gradient(45deg, #1a1a1d 25%, transparent 25%, transparent 75%, #1a1a1d 75%, #1a1a1d)
                     `,
                backgroundPosition: '0 0, 12px 12px',
                backgroundSize: '24px 24px'
              }}>
            </div>

            <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-10">
              {generatedSticker ? (
                <div className="relative group w-full h-full flex flex-col items-center justify-center animate-in zoom-in-95 duration-500">

                  <div className={`relative transition-all duration-500 ${isEditing ? 'scale-90 -translate-y-8' : ''}`}>
                    <img
                      src={generatedSticker}
                      alt="Generated Sticker"
                      className="max-w-full max-h-[280px] md:max-h-[350px] object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>

                  {isEditing && (
                    <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center justify-center animate-in slide-in-from-bottom-4 fade-in duration-300">
                      <div className="w-full max-w-md bg-black/80 backdrop-blur-xl border border-white/20 rounded-2xl p-2 shadow-2xl flex items-center gap-2">
                        <input
                          autoFocus
                          type="text"
                          value={editPrompt}
                          onChange={(e) => setEditPrompt(e.target.value)}
                          placeholder="Add sunglasses, remove person..."
                          className="flex-1 bg-transparent border-none text-white placeholder-zinc-500 px-3 focus:outline-none text-sm font-light"
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit()}
                        />
                        <button
                          onClick={() => setIsEditing(false)}
                          className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                        >
                          <X size={16} />
                        </button>
                        <button
                          onClick={handleEdit}
                          disabled={!editPrompt.trim()}
                          className="p-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors disabled:opacity-50"
                        >
                          <Check size={16} />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2 font-mono">Try: "Add a retro filter" or "Remove background person"</p>
                    </div>
                  )}

                  {!isEditing && !isLoading && (
                    <div className="absolute bottom-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300 translate-y-0 pb-6 flex gap-3 items-center">
                      <button
                        onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-zinc-800/80 backdrop-blur text-white border border-white/10 rounded-full font-medium hover:bg-zinc-700 transition-all hover:scale-105"
                      >
                        <PenTool size={14} />
                        Edit
                      </button>

                      <div className="flex bg-white rounded-full p-1 gap-1 shadow-lg shadow-purple-500/20">
                        <button
                          onClick={handleDownload}
                          className="flex items-center gap-2 px-5 py-2 rounded-full font-medium transition-all hover:bg-zinc-100 text-black"
                          title="Save High-Res PNG"
                        >
                          <Download size={16} />
                          Save
                        </button>
                        <button
                          onClick={handleShare}
                          disabled={isSharing}
                          className="flex items-center justify-center px-5 py-2 rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white transition-all hover:scale-105 gap-2"
                          title="Share as WhatsApp Sticker"
                        >
                          {isSharing ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              <span className="text-xs font-medium">Converting...</span>
                            </>
                          ) : (
                            <>
                              <MessageCircle size={18} />
                              <span className="text-xs font-medium">Share</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center max-w-sm mx-auto">
                  {isLoading ? (
                    <div className="flex flex-col items-center">
                      <div className="relative w-24 h-24 mb-6">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="2" />
                          <circle
                            cx="50" cy="50" r="45"
                            fill="none"
                            stroke="white"
                            strokeWidth="2"
                            strokeLinecap="round"
                            className="animate-[draw-circle_3s_ease-in-out_infinite]"
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center animate-wiggle">
                          <PenTool size={32} className="text-white drop-shadow-lg" />
                        </div>
                      </div>
                      <p className="text-white text-lg font-serif italic animate-pulse">{loadingMsg}</p>
                    </div>
                  ) : (
                    <div className="space-y-4 opacity-30">
                      <div className="w-20 h-20 border-2 border-dashed border-zinc-500 rounded-2xl mx-auto flex items-center justify-center">
                        <Wand2 className="text-zinc-500" size={24} />
                      </div>
                      <p className="text-zinc-400 text-sm font-light">
                        Configure your settings above and hit generate.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StickerMaker;