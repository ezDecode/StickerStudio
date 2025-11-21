import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { getUserApiKey, getFreeImageCount, incrementFreeImageCount, clearUserApiKey, saveUserApiKey } from './storage';

// Error constant for UI to detect
export const ERROR_API_KEY_REQUIRED = "API_KEY_REQUIRED";
export const ERROR_API_KEY_INVALID = "API_KEY_INVALID";

/**
 * VALIDATES a user-provided API Key by making a lightweight call.
 */
export const validateUserKey = async (apiKey: string): Promise<boolean> => {
  try {
    const client = new GoogleGenAI({ apiKey });
    // Minimal token count request to verify auth
    await client.models.countTokens({
      model: 'gemini-2.5-flash',
      contents: [{ parts: [{ text: 'ping' }] }]
    });
    return true;
  } catch (e) {
    console.error("Key Validation Failed:", e);
    return false;
  }
};

/**
 * CORE API EXECUTOR
 * Handles: Key Selection (User vs Dev), Quota Checking, Error Handling
 */
async function callGemini<T>(
  operation: (ai: GoogleGenAI) => Promise<T>,
  consumeQuota: boolean = false
): Promise<T> {
  // 1. Check for User Key first
  const userKey = await getUserApiKey();
  let ai: GoogleGenAI;
  let usingDevKey = false;

  if (userKey) {
    ai = new GoogleGenAI({ apiKey: userKey });
  } else {
    // 2. Fallback to Developer Key if Quota allows
    const count = await getFreeImageCount();
    // Support both variable names for safety, prioritizing the one from .env
    const devKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;

    if (!devKey) {
      console.error("Dev Key missing in environment");
      // Config error or intentional missing key -> Force User Key
      throw new Error(ERROR_API_KEY_REQUIRED);
    }

    if (count >= 5) {
      // Quota exceeded -> Force User Key
      throw new Error(ERROR_API_KEY_REQUIRED);
    }

    ai = new GoogleGenAI({ apiKey: devKey });
    usingDevKey = true;
  }

  // 3. Execute Operation
  try {
    return await retryOperation(() => operation(ai));
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);

    // Check for specific API Key errors (User or Dev key)
    if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') ||
      (userKey && (msg.includes('403') || msg.includes('API key') || msg.includes('PERMISSION_DENIED')))) {

      if (userKey) {
        await clearUserApiKey();
        throw new Error(ERROR_API_KEY_INVALID);
      }

      // If Dev Key failed, we now REQUIRE a user key
      throw new Error(ERROR_API_KEY_REQUIRED);
    }
    throw error;
  } finally {
    // 4. Increment Quota only if using Dev Key AND operation was "consumable" (successful image gen)
    if (usingDevKey && consumeQuota) {
      await incrementFreeImageCount();
    }
  }
}

// Helper to retry operations (handling flaky RPC/Network errors)
const retryOperation = async <T>(operation: () => Promise<T>, retries = 2, delay = 1000): Promise<T> => {
  try {
    return await operation();
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    // Don't retry on client errors
    if (msg.includes("404") || msg.includes("not found") || msg.includes("Requested entity was not found") || msg.includes("403") || msg.includes("400") || msg.includes("API key")) {
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

      const visited = new Uint8Array(totalPixels);
      const queue = new Int32Array(totalPixels);
      let head = 0;
      let tail = 0;

      const TOLERANCE = 20;
      const TOLERANCE_SQ = TOLERANCE * TOLERANCE;

      const isBlack = (idx: number) => {
        const offset = idx * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        return (r * r + g * g + b * b) <= TOLERANCE_SQ;
      };

      const push = (idx: number) => {
        if (idx >= 0 && idx < totalPixels && !visited[idx] && isBlack(idx)) {
          visited[idx] = 1;
          queue[tail++] = idx;
        }
      };

      push(0);
      push(width - 1);
      push((height - 1) * width);
      push(totalPixels - 1);

      if (tail === 0) {
        for (let i = 0; i < width; i += 10) { push(i); push(totalPixels - 1 - i); }
        for (let i = 0; i < height; i += 10) { push(i * width); push(i * width + width - 1); }
      }

      while (head < tail) {
        const idx = queue[head++];
        const x = idx % width;

        if (x > 0) push(idx - 1);
        if (x < width - 1) push(idx + 1);
        if (idx >= width) push(idx - width);
        if (idx < totalPixels - width) push(idx + width);
      }

      for (let i = 0; i < totalPixels; i++) {
        const offset = i * 4;

        if (visited[i]) {
          data[offset + 3] = 0;
        } else {
          let isEdge = false;
          const x = i % width;

          if ((x > 0 && visited[i - 1]) ||
            (x < width - 1 && visited[i + 1]) ||
            (i >= width && visited[i - width]) ||
            (i < totalPixels - width && visited[i + width])) {
            isEdge = true;
          }

          if (isEdge) {
            const r = data[offset];
            const g = data[offset + 1];
            const b = data[offset + 2];
            let alpha = Math.max(r, Math.max(g, b));
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

    // NOTE: We do NOT consume quota for prompt enhancement
    const response = await callGemini(ai => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 1.5,
      },
    }), false);

    const text = response.text?.trim() || userPrompt;

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
  let rawImageBase64 = "";

  const bgInstruction = "Background MUST be PURE #000000 BLACK for removal. No gradients.";
  const styleConfig = STICKER_STYLES[styleKey] || STICKER_STYLES.ANIME;
  const stylePrompt = styleConfig.prompt;

  let captionPrompt = "";
  if (customCaption.trim()) {
    captionPrompt = `Include text integrated into the design: "${customCaption}". Font MUST be BOLD COMIC BOOK STYLE / MANGA SFX.`;
  } else {
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
      // NOTE: Consumes Quota
      const response = await callGemini(ai => ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '1:1',
        },
      }), true);

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
      // NOTE: Consumes Quota
      const response = await callGemini(ai => ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { inlineData: { data: base64Image, mimeType: mimeType } },
            { text: prompt },
          ],
        },
        config: {
          systemInstruction: SYSTEM_PROMPT,
          temperature: 1.2,
          responseModalities: [Modality.IMAGE],
        },
      }), true);

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
  const cleanBase64 = currentStickerBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

  const prompt = `Edit this sticker. 
  Request: "${editInstruction}".
  Keep it funny. Keep the Anime style. Ensure text is in COMIC FONT.
  Background must be BLACK #000000.
  `;

  try {
    // NOTE: Consumes Quota
    const response = await callGemini(ai => ai.models.generateContent({
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
    }), true);

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
  try {
    // NOTE: Detection is free (no quota consumed)
    const response = await callGemini(ai => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: "Identify the main subject and suggest a ROAST caption. Make it mean but funny." },
        ],
      },
    }), false);
    return response.text?.trim() || "";
  } catch (error) {
    console.error("Vision detection error:", error);
    return "";
  }
};

export const generateImageFromPrompt = async (prompt: string): Promise<string> => {
  try {
    // NOTE: Consumes Quota
    const response = await callGemini(ai => ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    }), true);
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
  const userPrompt = prompt || "Roast this image. Find the funniest flaw.";
  try {
    // NOTE: Analysis is free (no quota)
    const response = await callGemini(ai => ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: mimeType } },
          { text: userPrompt },
        ]
      },
    }), false);
    return response.text?.trim() || "No analysis generated.";
  } catch (error) {
    console.error("analyzeImage error:", error);
    throw error;
  }
};

/**
 * Converts a base64 PNG to a WhatsApp-compliant WebP Blob.
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

      ctx.clearRect(0, 0, 512, 512);

      const SAFE_SIZE = 512;
      const scale = Math.min(SAFE_SIZE / img.width, SAFE_SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (512 - w) / 2;
      const y = (512 - h) / 2;

      ctx.drawImage(img, x, y, w, h);

      const attemptConversion = (quality: number) => {
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("WebP encoding failed"));
            return;
          }
          if (blob.size > 99 * 1024 && quality > 0.1) {
            attemptConversion(quality - 0.1);
          } else {
            resolve(blob);
          }
        }, 'image/webp', quality);
      };

      attemptConversion(0.9);
    };
    img.onerror = (e) => reject(e);
    img.src = base64Image;
  });
};