import React, { useState, useEffect } from 'react';
import { Key, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { validateUserKey } from '../services/geminiService';
import { saveUserApiKey, clearUserApiKey } from '../services/storage';
import Button from './Button';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  reason: 'invalid' | 'missing';
}

const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, reason }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setApiKey('');
      setError(null);
      setSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!apiKey.trim()) return;

    setIsValidating(true);
    setError(null);

    try {
      const isValid = await validateUserKey(apiKey.trim());
      if (isValid) {
        await saveUserApiKey(apiKey.trim());
        setSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError("Invalid API Key. Please check and try again.");
      }
    } catch (e) {
      setError("Validation failed. Check internet connection.");
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveKey = async () => {
    await clearUserApiKey();
    setApiKey('');
    setSuccess(false);
    onClose();
  };

  const getTitle = () => {
    if (reason === 'invalid') return "Invalid API Key";
    return "Setup Required";
  };

  const getDescription = () => {
    if (reason === 'invalid') return "The provided API Key didn't work. Please enter a valid key to continue.";
    return "To start creating stickers, please provide your Gemini API Key.";
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

      <div className="relative w-full max-w-md bg-[#0c0c0e] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-6 space-y-6">

          {/* Header */}
          <div className="flex flex-col items-center text-center space-y-3">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${success ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
              {success ? <CheckCircle2 className="w-8 h-8 text-green-500" /> : <Key className="w-8 h-8 text-amber-500" />}
            </div>
            <div>
              <h3 className="text-xl font-serif italic text-white">{getTitle()}</h3>
              <p className="text-sm text-zinc-400 mt-2 leading-relaxed">{getDescription()}</p>
            </div>
          </div>

          {/* Input */}
          {!success && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-zinc-500 font-medium uppercase tracking-wider ml-1">Gemini API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full bg-black border border-zinc-800 rounded-xl p-3 text-white focus:border-white/30 focus:outline-none transition-colors font-mono text-sm"
                />
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-xs bg-red-900/10 p-2 rounded-lg border border-red-900/20">
                    <AlertTriangle size={12} /> {error}
                  </div>
                )}
              </div>

              <Button
                className="w-full py-3 rounded-xl"
                onClick={handleSave}
                disabled={!apiKey.trim() || isValidating}
              >
                {isValidating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} /> Validating...
                  </span>
                ) : "Validate & Save Key"}
              </Button>


              <div className="text-center mt-4">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-zinc-500 hover:text-zinc-300 underline decoration-zinc-700"
                >
                  Get your free Gemini API Key →
                </a>
              </div>
            </div>
          )}

          {success && (
            <div className="text-center pb-4">
              <p className="text-green-400 font-medium">Key Saved! You are ready to go.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiKeyModal;