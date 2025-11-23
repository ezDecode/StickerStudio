
import React, { useState } from 'react';
import { X, Star, MessageSquare, Send, Loader2, CheckCircle2 } from 'lucide-react';
import Button from './Button';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [category, setCategory] = useState('quality');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (rating === 0) return;

    setIsSubmitting(true);

    try {
      const sheetUrl = import.meta.env.VITE_FEEDBACK_SHEET_URL;

      if (sheetUrl) {
        // Send to Google Sheets
        await fetch(sheetUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rating,
            category,
            comment: comment || '(No comment)',
                      origin: window.location.origin, // Add origin for security validation
          }),
        });
      } else {
        // Fallback - just log if no sheet URL configured
        console.log('📊 Feedback (no sheet configured):', { rating, category, comment });
      }

      setIsSubmitting(false);
      setIsSuccess(true);

      // Close after success
      setTimeout(() => {
        setIsSuccess(false);
        setRating(0);
        setComment('');
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Still show success to user (graceful degradation)
      setIsSubmitting(false);
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        setRating(0);
        setComment('');
        onClose();
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-[#0c0c0e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-900 rounded-lg border border-white/5">
              <MessageSquare size={18} className="text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white">Feedback</h3>
              <p className="text-xs text-zinc-500">Help us improve SkieVision</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {isSuccess ? (
            <div className="py-10 flex flex-col items-center text-center space-y-3 animate-in fade-in slide-in-from-bottom-4">
              <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h4 className="text-xl font-serif italic text-white">Feedback Received!</h4>
              <p className="text-zinc-500 text-sm">We are training the hamsters to do better next time.</p>
            </div>
          ) : (
            <>
              {/* Rating Stars */}
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs text-zinc-400 font-medium uppercase tracking-widest">Rate Experience</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(star)}
                      className="focus:outline-none transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        fill={(hoverRating || rating) >= star ? "#fbbf24" : "transparent"}
                        className={(hoverRating || rating) >= star ? "text-amber-400" : "text-zinc-700"}
                        strokeWidth={1.5}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Quality', 'Bug', 'Feature'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat.toLowerCase())}
                      className={`px-3 py-2 text-xs rounded-lg border transition-all ${category === cat.toLowerCase()
                        ? 'bg-zinc-100 text-black border-transparent font-medium'
                        : 'bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600'
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comment */}
              <div className="space-y-2">
                <label className="text-xs text-zinc-400 font-medium ml-1">Details</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us what happened..."
                  className="w-full h-24 bg-[#151518] border border-white/10 rounded-xl p-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-zinc-500 resize-none"
                />
              </div>

              <Button
                className="w-full py-3"
                onClick={handleSubmit}
                disabled={rating === 0 || isSubmitting}
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="animate-spin" size={16} /> Sending...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Send Feedback <Send size={14} />
                  </span>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;
