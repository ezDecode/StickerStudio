import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { getUserApiKey, clearUserApiKey, saveUserApiKey } from './storage';

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
 * Requires user to provide their own API key
 */
async function callGemini<T>(
  operation: (ai: GoogleGenAI) => Promise<T>
): Promise<T> {
  // Always require user API key - no free quota
  const userKey = await getUserApiKey();

  if (!userKey) {
    throw new Error(ERROR_API_KEY_REQUIRED);
  }

  const ai = new GoogleGenAI({ apiKey: userKey });

  // Execute Operation
  try {
    return await retryOperation(() => operation(ai));
  } catch (error: any) {
    const msg = error?.message || JSON.stringify(error);
    console.error("Gemini API Error:", msg);

    // Check for API key errors
    if (msg.includes('API key not valid') || msg.includes('API_KEY_INVALID') ||
      msg.includes('403') || msg.includes('API key') || msg.includes('PERMISSION_DENIED')) {
      await clearUserApiKey();
      throw new Error(ERROR_API_KEY_INVALID);
    }
    throw error;
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
Your MISSION: Create stickers so funny they make people SNORT with laughter.

*** THE "PEAK COMEDY" MANIFESTO ***

1. **NUCLEAR EXAGGERATION (The "Cartoon Physics" Rule)**:
   HEAD PROPORTIONS:
   - Make the head 250-300% larger than normal (MEGA bobblehead)
   - If subject is angry, make the head PULSE with visible steam/veins
   - If subject is sad, make the head DROOP like melting ice cream
   
   EYES:
   - Happy/Excited: Eyes POPPING out on springs (Looney Tunes style)
   - Shocked: Eyes literally falling out with visible motion lines
   - Tired: Eyes as heavy sandbags with visible ZZZ particles
   - Crazy: Spiral hypnotic eyes with stars orbiting
   
   MOUTH:
   - Happy: Teeth so big they need their own gravitational field
   - Angry: Mouth stretched to show ALL teeth like a shark
   - Eating: Mouth comically unhinged like a snake
   - Screaming: Sound waves VISIBLE emanating from mouth
   
   BODY:
   - Shrink to 40% normal size (like a chibi character)
   - Add noodle arms that wave around chaotically
   - Legs should be tiny sticks that barely support the massive head

2. **ABSURD SCENARIOS (The "What If?" Engine)**:
   USE THESE COMEDY FORMULAS:
   
   Formula A - "Wrong Job":
   - Animal subject? Give them a high-stress human job
     Examples: Cat as a stressed CEO, Dog as a burnt-out developer, Bird as air traffic controller
   
   Formula B - "Extreme Mood Amplification":
   - Tired? Show them AS a puddle of coffee/melted wax
   - Happy? Show them LITERALLY floating with joy hearts everywhere
   - Angry? Show them as a cartoon bomb about to explode
   
   Formula C - "Cosplay Chaos":
   - Random subject? Put them in RIDICULOUS costumes
     Examples: Ninja outfit while eating noodles, Astronaut suit at a coffee shop, Superhero cape doing taxes
   
   Formula D - "Physical Comedy":
   - Show gravity failing (floating upside down)
   - Show physics breaking (running in mid-air like Wile E. Coyote)
   - Show proportions inverted (tiny head, massive body)

3. **VISUAL GAGS (The "Easter Egg" Layer)**:
   ADD 1-2 background details (VARY based on context, not the same every time):
   
   CATEGORIES (pick what fits):
   - Tiny contextual sign (e.g., "Send Help", relevant warning)
   - Object with personality (tired items, worried items)
   - Impossible physics moment (floating, reversed gravity)
   - Small background character doing something absurd
   - Environmental joke (broken clock, weird poster, etc.)
   - Anime emotion symbols (sweat drops, stress marks, hearts)
   
   RULE: Make it RELEVANT to the sticker's situation, not random.

4. **TEXT INTEGRATION (The "Comic Book" Rule)**:
   TEXT PLACEMENT OPTIONS:
   - Speech bubble (classic comic style with tail pointing to subject)
   - Thought bubble (cloud shaped for internal monologue)
   - Action text (explosive style like "KAPOW!" or "BOOM!")
   - Sign held by character (protest sign, name tag, warning sign)
   - On clothing (t-shirt text, hat text, badge)
   - Background poster/billboard in the scene
   
   FONT STYLE - MANDATORY:
   - THICK BLACK OUTLINES (3-5px stroke)
   - WHITE or YELLOW fill for visibility on any background
   - BOLD, condensed comic sans or manga-style font
   - Slightly rotated (5-10°) for dynamic energy
   - Add small impact lines around text for emphasis
   
   TEXT CONTENT GUIDELINES:
   - Keep it SHORT (1-5 words max)
   - VARY the text based on emotion/situation (don't repeat same phrases)
   - Examples by context:
     * Tired: "NEED SLEEP", "Send Coffee", "Buffering..."
     * Happy: "YEET!", "LET'S GO!", "VIBING"
     * Angry: "NOT OK", "SERIOUSLY?!", "WHY THO"
     * Confused: "HUH?!", "ERROR 404", "BRAIN.exe STOPPED"
     * Shocked: "WHAT?!", "NO WAY", "OMG"
     * Action sounds: "POW!", "ZOOM!", "BONK!", "SWOOSH!"
   - Use CAPS for impact
   - Keep it contextually relevant (not random)

5. **VISUAL STYLE FIDELITY (Non-Negotiable)**:
   STYLE: 90s ANIME / MANGA aesthetic:
   - Cel-shaded (flat colors with sharp shadows)
   - Thick black outlines on EVERYTHING
   - Add speed lines for any action/emotion
   - Chibi proportions (big head, small body)
   - Expressive emotion symbols (sweat drops, anger marks, love hearts)
   
   BACKGROUND: 
   - PURE #000000 BLACK (for easy removal)
   - NO gradients, NO shadows on the floor
   - NO texture, NO gray tones
   - Think "green screen but black"
   
   BORDER:
   - Thick WHITE sticker outline (8-12px)
   - Should look like a die-cut sticker

6. **HUMOR AMPLIFICATION (The "Extra Spice" Layer)**:
   PICK 2-3 OF THESE (not all, VARY each time):
   - Unexpected prop IF it fits the context (choose contextually appropriate items)
     * Office/work context: Coffee spill, broken keyboard, tangled cables
     * Food context: Flying pizza, exploding burger, spilled drink
     * Sports context: Deflated ball, broken racket, trophy
     * Emotion context: Stress meter, emoji cloud, thought spiral
   - Physics violation (impossible angle, floating object, etc.)
   - Facial feature pushed to 200% extreme
   - Text element that adds context/punchline
   - Background gag that rewards close inspection
   
   IMPORTANT: Don't add ALL of these. Choose what FITS BEST for the specific sticker.

7. **FORBIDDEN PATTERNS (NEVER DO THIS)**:
   ❌ Generic expressions (normal smile, normal frown)
   ❌ Realistic proportions (we want CARTOON)
   ❌ Boring poses (standing straight, arms at sides)
   ❌ Empty backgrounds (always add SOMETHING funny)
   ❌ Subtle humor (GO BIG OR GO HOME)
   ❌ Small text that's hard to read
   ❌ Text floating in void (anchor it to SOMETHING)

*** EXECUTION CHECKLIST ***
Before finalizing ANY sticker, verify:
☑ Is the head comically oversized?
☑ Are the expressions EXTREME (not just mild)?
☑ Is there an unexpected element/prop/situation?
☑ Is the background PURE BLACK?
☑ Is there text in BOLD COMIC FONT?
☑ Would this make someone laugh OUT LOUD?

REMEMBER: We're making COMEDY, not ART. Prioritize FUNNY over PRETTY.
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
      You are a COMEDY SCRIPTWRITER specialized in VISUAL HUMOR for stickers.
      User Input: "${userPrompt}".
      
      MISSION: Transform this into a HILARIOUS sticker description that will make people LAUGH OUT LOUD.
      
      COMEDY FORMULAS (Pick the FUNNIEST one for this input):
      
      1. **The Twist** (Unexpected Combination):
         - Add a CONTRASTING element that doesn't belong
         - Examples: 
           * "Shark" → "Shark at a dental office getting braces, looking terrified"
           * "Cat" → "Cat as a stressed stock trader with charts everywhere"
           * "Coffee" → "Coffee mug with arms desperately running late"
      
      2. **The Hyperbole** (Extreme Amplification):
         - Take the emotion/state to its ABSOLUTE EXTREME
         - Examples:
           * "Tired" → "Literally melting into a puddle of exhaustion with ZZZ particles"
           * "Happy" → "Floating 3 feet in the air with hearts and rainbows exploding"
           * "Angry" → "Head turning red like a cartoon bomb about to explode"
      
      3. **The Physical Comedy** (Cartoon Physics):
         - Make physics do something IMPOSSIBLE
         - Examples:
           * "Running" → "Legs spinning so fast they're a blur, running in mid-air"
           * "Surprised" → "Eyes popping out on springs, jaw hitting the floor literally"
           * "Confused" → "Head spinning 360° with question marks orbiting"
      
      4. **The Wrong Context** (Fish Out of Water):
         - Put subject in the MOST INAPPROPRIATE situation
         - Examples:
           * "Dog" → "Dog in a business suit presenting a sales pitch, sweating profusely"
           * "Baby" → "Baby dressed as a kung fu master doing impossible kicks"
           * "Grandma" → "Grandma as a DJ at a rave with giant headphones"
      
      5. **The Roast** (Caricature Comedy):
         - Exaggerate the MOST OBVIOUS feature to ridiculous levels
         - Examples:
           * "Big eyes" → "Eyes so huge they need their own gravitational field"
           * "Small person" → "So tiny they're standing on a stack of books"
           * "Tall person" → "Head in the clouds literally, with birds flying around"
      
      REQUIREMENTS:
      - Must be VISUAL (describe what you SEE, not what you feel)
      - Include at least ONE specific prop or detail
      - Mention the EMOTION or ACTION clearly
      - Add "in 90s anime sticker style with extreme chibi proportions"
      - Make it ABSURD enough to be memorable
      
      OUTPUT FORMAT: A single sentence (15-30 words) that's vivid, specific, and FUNNY.
    `;

    const response = await callGemini(ai => ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: searchPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        temperature: 1.5,
      },
    }));

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
      captionPrompt = `Include contextually relevant text (choose based on emotion/action): excited="YEET!", tired="NEED SLEEP", shocked="WHAT?!", angry="NOT OK", happy="LET'S GO!", or similar. BOLD MANGA FONT. VARY the text, don't repeat same phrases.`;
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
      const response = await callGemini(ai => ai.models.generateImages({
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
  const cleanBase64 = currentStickerBase64.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

  const prompt = `Edit this sticker. 
  Request: "${editInstruction}".
  Keep it funny. Keep the Anime style. Ensure text is in COMIC FONT.
  Background must be BLACK #000000.
  `;

  try {
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
  try {
    const response = await callGemini(ai => ai.models.generateContent({
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
  try {
    const response = await callGemini(ai => ai.models.generateImages({
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
  const userPrompt = prompt || "Roast this image. Find the funniest flaw.";
  try {
    const response = await callGemini(ai => ai.models.generateContent({
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