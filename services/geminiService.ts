import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";

const getAiClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

// Helper to retry operations (handling flaky RPC/Network errors)
const retryOperation = async <T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    // Don't retry on client errors
    if (msg.includes("404") || msg.includes("not found") || msg.includes("Requested entity was not found") || msg.includes("403") || msg.includes("400")) {
      throw error;
    }

    if (retries <= 0) throw error;
    
    console.warn(`Operation failed, retrying... (${retries} attempts left)`, error);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, retries - 1, delay * 2);
  }
};

// --- STYLE ENGINE ---

export type StickerStyleKey = 'ANIME';

export const STICKER_STYLES: Record<StickerStyleKey, { label: string; prompt: string; description: string }> = {
  ANIME: { 
    label: "Anime", 
    prompt: "90s Anime Style, Cel-shaded, Thick speed lines, Exaggerated facial expressions, Vibrant flat colors, Sticker Outline. Typography: BOLD COMIC BOOK FONT / MANGA SFX.",
    description: "Expressive cel-shaded art with comic text"
  }
};

const SYSTEM_PROMPT = `You are a MAD GENIUS DIGITAL ARTIST specialized in "ROAST" Caricatures and WhatsApp Stickers.

*** THE "FUNNY" MANIFESTO ***

1. **COMICAL EXAGGERATION (The "Rubber Face" Rule)**:
   - **HEAD**: 200% larger than normal (Bobblehead).
   - **EYES**: Enormous, expressive, popping out (Tex Avery style) or intensely squinting.
   - **MOUTH**: Exaggerated emotions. If happy, show all teeth. If mad, show steam.
   - **BODY**: Tiny, shrunken, or contorted in a funny pose.

2. **UNEXPECTED SCENARIOS (The "Context Switch")**:
   - If the subject is an animal, give them a human job (e.g., a cat trading stocks).
   - If the subject is a person, put them in a ridiculous costume or situation.
   - Add **VISUAL GAGS**: A tiny sign saying "Help", a coffee mug that looks tired, a chaotic background detail.

3. **VISUAL STYLE FIDELITY**:
   - **STYLE**: 90s ANIME / MANGA. Cel-shaded.
   - **TEXT FONT**: **COMIC BOOK / MANGA STYLE**. Thick outlines, bold colors, action-oriented.
   - **BACKGROUND**: **PURE #000000 BLACK**. No gradients. No shadows on the floor.
   - **BORDER**: Thick white sticker border.

4. **TEXT INTEGRATION**:
   - Text MUST be integrated into the scene (e.g., on a sign, in a bubble, or as a sticker overlay).
   - **FONT**: Use BOLD COMIC FONT.
   - DO NOT put text floating in empty space. Anchor it to the sticker.
`;

/**
 * Processes an image file for API consumption.
 * Optimization: Uses OffscreenCanvas where available or standard Canvas with limit.
 */
export const processImage = async (file: File): Promise<{ data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const MAX_DIMENSION = 1024; 
      let width = img.width;
      let height = img.height;

      if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        if (width > height) {
          height = Math.round((height * MAX_DIMENSION) / width);
          width = MAX_DIMENSION;
        } else {
          width = Math.round((width * MAX_DIMENSION) / height);
          height = MAX_DIMENSION;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        reject(new Error("Canvas context missing"));
        return;
      }
      
      // Fill white background first to handle transparent PNGs
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      const mimeType = 'image/jpeg';
      const dataUrl = canvas.toDataURL(mimeType, 0.92); // Slightly lower quality for speed, visually identical
      
      URL.revokeObjectURL(img.src);

      resolve({
        data: dataUrl.split(',')[1],
        mimeType: mimeType
      });
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(img.src);
      reject(err);
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * ADVANCED BACKGROUND REMOVAL V5 (Matting against Black)
 * - Uses Flood Fill to isolate connected background regions.
 * - Implements "Luma Key" edge matting to remove black halos from anti-aliased edges.
 * - Handles fine details like hair/fur by preserving luminance as opacity on the fringe.
 */
const removeSmartBackground = (base64Image: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!ctx) {
        resolve(base64Image);
        return;
      }
      
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = canvas.width;
      const height = canvas.height;
      const totalPixels = width * height;
      
      // 1. FLOOD FILL: IDENTIFY DEFINITE BACKGROUND
      // 0 = Foreground/Unknown, 1 = Background
      const visited = new Uint8Array(totalPixels); 
      const queue = new Int32Array(totalPixels);   
      let head = 0;
      let tail = 0;

      // Tolerance for "Black" detection.
      // Generated images are usually pure black #000000, but compression adds noise.
      const TOLERANCE = 20; 
      const TOLERANCE_SQ = TOLERANCE * TOLERANCE;

      // Check if pixel at index is "Black"
      const isBlack = (idx: number) => {
        const offset = idx * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        return (r*r + g*g + b*b) <= TOLERANCE_SQ;
      };

      const push = (idx: number) => {
         if (idx >= 0 && idx < totalPixels && !visited[idx] && isBlack(idx)) { 
             visited[idx] = 1; 
             queue[tail++] = idx; 
         }
      };

      // Seed from corners
      push(0); 
      push(width - 1); 
      push((height - 1) * width); 
      push(totalPixels - 1);

      // If corners aren't black (rare), try edges
      if (tail === 0) {
         for (let i=0; i<width; i+=10) { push(i); push(totalPixels-1-i); }
         for (let i=0; i<height; i+=10) { push(i*width); push(i*width + width-1); }
      }

      // Run Flood Fill
      while (head < tail) {
        const idx = queue[head++];
        const x = idx % width;
        
        if (x > 0) push(idx - 1);
        if (x < width - 1) push(idx + 1);
        if (idx >= width) push(idx - width);
        if (idx < totalPixels - width) push(idx + width);
      }

      // 2. EDGE MATTING & ALPHA RECONSTRUCTION
      // We iterate all pixels.
      // If it's visited (Background) -> Transparent.
      // If it's NOT visited, check neighbors.
      // If a neighbor IS background, this is an EDGE pixel.
      // For Edge pixels, we calculate Alpha based on Brightness (Max RGB).
      // This converts the "fading to black" antialiasing into "fading to transparent".
      
      for (let i = 0; i < totalPixels; i++) {
          const offset = i * 4;

          if (visited[i]) {
              // Definite Background
              data[offset + 3] = 0;
          } else {
              // Check 4-way neighbors to detect edge
              let isEdge = false;
              const x = i % width;
              
              // Optimization: Unroll check
              if ((x > 0 && visited[i - 1]) || 
                  (x < width - 1 && visited[i + 1]) || 
                  (i >= width && visited[i - width]) || 
                  (i < totalPixels - width && visited[i + width])) {
                  isEdge = true;
              }

              if (isEdge) {
                  // This is a boundary pixel. It might be a dark halo.
                  // Calculate max channel value (Luminance approx for white border)
                  const r = data[offset];
                  const g = data[offset + 1];
                  const b = data[offset + 2];
                  
                  // Robust matting formula for black backgrounds:
                  // Alpha = max(r, g, b)
                  // Example: Black(0,0,0) -> Alpha 0
                  // Example: Gray(50,50,50) -> Alpha 50 (~20%)
                  // Example: White(255,255,255) -> Alpha 255
                  // Example: Red(255,0,0) -> Alpha 255
                  
                  // We boost it slightly to avoid overly soft edges on colored objects
                  let alpha = Math.max(r, Math.max(g, b));
                  
                  // Optional: Gamma correction or Gain to make it sharper
                  // alpha = Math.min(255, alpha * 1.2); 

                  data[offset + 3] = alpha;
              }
          }
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = (e) => {
      console.error("Background removal failed", e);
      resolve(base64Image);
    };
    img.src = base64Image;
  });
};

export interface EnhancedPromptResult {
  text: string;
  sources: { uri: string; title: string }[];
}

/**
 * Enhance prompt via Gemini Search - Tuned for COMEDY & UNEXPECTED SCENARIOS
 */
export const enhancePromptForComedy = async (userPrompt: string): Promise<EnhancedPromptResult> => {
  const ai = getAiClient();
  try {
    // The "Comedy Doctor" System
    const searchPrompt = `
      You are a Comedy Scriptwriter.
      User Input: "${userPrompt}".
      
      MISSION: Rewrite this into a description for a funny sticker.
      
      STRATEGY (Pick one based on input):
      1. **The Twist**: Add a contrasting element. (e.g. "Shark" -> "Shark wearing braces and smiling").
      2. **The Hyperbole**: Maximize the emotion. (e.g. "Tired" -> "Melting into a puddle of coffee").
      3. **The Roast**: If it's a person/face, describe a caricature. (e.g. "My boss" -> "A suit with a megaphone for a head").
      
      Constraint: Keep it visual. Mention "Anime Sticker style".
    `;

    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 1.5, // High creativity
      },
    }));

    const text = response.text?.trim() || userPrompt;
    
    // Extract search sources if any (often used for pop culture references)
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = groundingChunks
      .filter((chunk: any) => chunk.web?.uri && chunk.web?.title)
      .map((chunk: any) => ({
        uri: chunk.web.uri,
        title: chunk.web.title
      }));

    const uniqueSources = Array.from(new Map(sources.map((s: any) => [s.uri, s])).values()) as { uri: string; title: string }[];

    return { text, sources: uniqueSources };
  } catch (error) {
    console.warn("Comedy enhancement skipped", error);
    return { text: userPrompt, sources: [] };
  }
};

export const enhancePromptWithContext = enhancePromptForComedy;

/**
 * Generates a sticker using SkieVision logic.
 */
export const generateSticker = async (
  base64Image: string | null, 
  userPrompt: string = "",
  customCaption: string = "",
  mimeType: string = 'image/jpeg',
  styleKey: StickerStyleKey = 'ANIME'
): Promise<string> => {
  const ai = getAiClient();
  let rawImageBase64 = "";
  
  const bgInstruction = "Background MUST be PURE #000000 BLACK for removal. No gradients.";
  
  // Get style config or default
  const styleConfig = STICKER_STYLES[styleKey] || STICKER_STYLES.ANIME;
  const stylePrompt = styleConfig.prompt;

  // Robust Caption Logic
  let captionPrompt = "";
  if (customCaption.trim()) {
    captionPrompt = `Include text integrated into the design: "${customCaption}". Font MUST be BOLD COMIC BOOK STYLE / MANGA SFX.`;
  } else {
    // If no caption, sometimes ask for a sound effect text
    if (Math.random() > 0.7) {
      captionPrompt = `Include a comic sound effect text like "POW!", "LOL", or "NANI?!" styled in BOLD MANGA FONT.`;
    }
  }

  // --- Scenario 1: Text-to-Sticker (Imagen) ---
  if (!base64Image) {
    let prompt = `A hilarious WhatsApp sticker of ${userPrompt}.
    
    VISUAL DIRECTIVES:
    - STYLE: ${stylePrompt}
    - FONT: BOLD COMIC BOOK STYLE.
    - EXAGGERATION: Big head, expressive face, small body.
    - SCENARIO: Make it funny/chaotic.
    - ${bgInstruction}
    - ${captionPrompt}
    `;
    
    try {
      const response = await retryOperation<any>(() => ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      }));
      
      const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
      if (base64ImageBytes) {
        rawImageBase64 = `data:image/jpeg;base64,${base64ImageBytes}`;
      } else {
        throw new Error("No sticker generated.");
      }
    } catch (error) {
      console.error("Text-to-Sticker error:", error);
      throw error;
    }
  } 
  
  // --- Scenario 2: Image-to-Sticker (Gemini 2.5 Flash Image) ---
  else {
    // Instruction to TRANSFORM the image
    let prompt = `TRANSFORM this image into a FUNNY ANIME STICKER.
    
    STEPS:
    1. Identify the main subject.
    2. APPLY STYLE: ${stylePrompt}
    3. **CARICATURE IT**: Make the head 50% bigger. Make expressions 200% more intense.
    4. **SITUATION**: If they look boring, add a funny prop.
    5. **TEXT**: Use BOLD COMIC FONT for any text.
    6. ${bgInstruction}
    7. ${captionPrompt}
    `;

    if (userPrompt) prompt += ` Context/Idea: ${userPrompt}.`;

    try {
      const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: mimeType } },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 1.2, // Sweet spot for creativity vs adherence
          responseModalities: [Modality.IMAGE],
        },
      }));

      const part = response.candidates?.[0]?.content?.parts?.[0];
      if (part && part.inlineData) {
        rawImageBase64 = `data:image/png;base64,${part.inlineData.data}`;
      } else {
        throw new Error("No sticker generated from image.");
      }
    } catch (error) {
      console.error("Image-to-Sticker error:", error);
      throw error;
    }
  }

  // --- Post-Processing ---
  try {
    if (rawImageBase64) {
      return await removeSmartBackground(rawImageBase64);
    }
    throw new Error("Generation failed during processing.");
  } catch (e) {
    console.warn("Background removal failed, returning raw image", e);
    return rawImageBase64;
  }
};

/**
 * Edits an existing sticker.
 */
export const editSticker = async (
  currentStickerBase64: string,
  editInstruction: string
): Promise<string> => {
  const ai = getAiClient();
  const cleanBase64 = currentStickerBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");
  
  const prompt = `Edit this sticker. 
  Request: "${editInstruction}".
  Keep it funny. Keep the Anime style. Ensure text is in COMIC FONT.
  Background must be BLACK #000000.
  `;

  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: cleanBase64, mimeType: 'image/png' } },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseModalities: [Modality.IMAGE],
      },
    }));

    const part = response.candidates?.[0]?.content?.parts?.[0];
    if (part && part.inlineData) {
      const raw = `data:image/png;base64,${part.inlineData.data}`;
      return await removeSmartBackground(raw);
    }
    throw new Error("Failed to edit sticker.");
  } catch (error) {
    console.error("Edit Sticker error:", error);
    throw error;
  }
};

export const detectSubject = async (base64Image: string, mimeType: string = 'image/jpeg'): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: "Identify the main subject and suggest a ROAST caption. Make it mean but funny." },
        ],
      },
    }));
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Vision detection error:", error);
    return "";
  }
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  try {
    const response = await retryOperation<any>(() => ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    }));
    const base64ImageBytes = response.generatedImages?.[0]?.image?.imageBytes;
    if (base64ImageBytes) {
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image generated.");
    }
  } catch (error) {
    console.error("generateImageFromPrompt error:", error);
    throw error;
  }
};

export const analyzeImage = async (base64Image: string, prompt: string, mimeType: string = 'image/jpeg'): Promise<string> => {
  const ai = getAiClient();
  const userPrompt = prompt || "Roast this image. Find the funniest flaw.";
  try {
    const response = await retryOperation<GenerateContentResponse>(() => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
            { inlineData: { data: base64Image, mimeType: mimeType } },
            { text: userPrompt },
        ]
      },
    }));
    return response.text?.trim() || "No analysis generated.";
  } catch (error) {
    console.error("analyzeImage error:", error);
    throw error;
  }
};

/**
 * Converts a base64 PNG to a WhatsApp-compliant WebP Blob.
 * Rules: 512x512, WebP, < 100KB, No Metadata.
 */
export const convertToWhatsAppFormat = async (base64Image: string): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error("Canvas context failed"));
        return;
      }
      
      // Clear canvas
      ctx.clearRect(0, 0, 512, 512);
      
      // Aspect Fit with padding
      const SAFE_SIZE = 512; 
      const scale = Math.min(SAFE_SIZE / img.width, SAFE_SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (512 - w) / 2;
      const y = (512 - h) / 2;
      
      ctx.drawImage(img, x, y, w, h);
      
      // Recursive function to ensure size < 100KB by adjusting quality
      const attemptConversion = (quality: number) => {
          canvas.toBlob((blob) => {
            if (!blob) {
                reject(new Error("WebP encoding failed"));
                return;
            }
            
            // WhatsApp strict limit is 100KB
            if (blob.size > 99 * 1024 && quality > 0.1) {
                attemptConversion(quality - 0.1);
            } else {
                resolve(blob);
            }
          }, 'image/webp', quality);
      };

      attemptConversion(0.9); // Start high
    };
    img.onerror = (e) => reject(e);
    img.src = base64Image;
  });
};