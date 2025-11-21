import React, { useState } from 'react';
import { analyzeImage, processImage } from '../services/geminiService';
import Button from '../components/Button';
import ImageUpload from '../components/ImageUpload';
import { ScanSearch, Sparkles } from 'lucide-react';

const ImageAnalyzer: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!selectedImage) return;
    
    setIsLoading(true);
    setError(null);
    setAnalysis('');

    try {
      const { data, mimeType } = await processImage(selectedImage);
      const result = await analyzeImage(data, customPrompt, mimeType);
      setAnalysis(result);
    } catch (err: any) {
      setError("Analysis failed. " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 animate-fade-in py-8">
      <div className="space-y-8 flex flex-col">
        <div className="space-y-2">
          <h2 className="text-5xl font-serif italic text-white">
            Vision
          </h2>
          <p className="text-zinc-500">Gemini 3 Pro Analysis.</p>
        </div>

        <div className="flex-1 flex flex-col gap-6">
           <ImageUpload 
              onImageSelect={setSelectedImage} 
              currentImage={selectedImage}
              onClear={() => {
                setSelectedImage(null);
                setAnalysis('');
              }}
            />
            
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Custom Inquiry</label>
              <textarea 
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="What is unusual about this image?"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-white placeholder-zinc-700 focus:ring-1 focus:ring-white focus:border-transparent focus:outline-none resize-none h-32 transition-all"
              />
            </div>

            <Button 
              onClick={handleAnalyze} 
              isLoading={isLoading}
              disabled={!selectedImage}
              className="w-full rounded-full py-4"
            >
              Analyze Image
            </Button>
        </div>
      </div>

      <div className="bg-zinc-900/30 rounded-3xl border border-zinc-800 p-8 overflow-y-auto relative min-h-[500px]">
        {error && (
          <div className="bg-red-900/10 border border-red-900/20 text-red-300 p-4 rounded-xl mb-4 text-sm">
            {error}
          </div>
        )}
        
        {analysis ? (
          <div className="prose prose-invert max-w-none">
            <h3 className="text-xl font-serif italic text-white mb-6 flex items-center gap-2 border-b border-zinc-800 pb-4">
              <Sparkles size={18} /> Gemini Findings
            </h3>
            <div className="whitespace-pre-wrap text-zinc-300 leading-relaxed font-light">
              {analysis}
            </div>
          </div>
        ) : (
           <div className="h-full flex flex-col items-center justify-center text-zinc-600 space-y-6">
             {isLoading ? (
               <>
                <div className="w-12 h-12 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                <p className="font-serif italic animate-pulse">Interpreting visual data...</p>
               </>
             ) : (
               <>
                <ScanSearch size={48} className="opacity-20" strokeWidth={1} />
                <p className="font-light text-sm tracking-wide">Awaiting Image Data</p>
               </>
             )}
           </div>
        )}
      </div>
    </div>
  );
};

export default ImageAnalyzer;