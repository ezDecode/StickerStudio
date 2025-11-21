
export interface GenerationResult {
  imageUri?: string;
  text?: string;
  error?: string;
  loading: boolean;
}

export interface StickerPackItem {
  id: string;
  url: string;
  createdAt: number;
}

export interface Sticker {
  id: string;
  url: string; // Base64 data URI or Blob URL
  prompt: string;
  timestamp: number;
}
