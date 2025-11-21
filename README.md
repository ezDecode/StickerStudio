# SkieVision

SkieVision is an AI-powered sticker generation studio that turns text descriptions or uploaded images into funny, anime-style stickers. It leverages Google's Gemini 2.5 Flash and Imagen models to generate high-quality, expressive caricatures and stickers with automatic background removal.

## 🚀 Features

- **Text-to-Sticker**: Generate stickers from scratch using text prompts.
- **Image-to-Sticker**: Upload an image to transform it into a sticker while preserving the subject's identity.
- **AI-Powered Humor**: Automatically enhances prompts to make them funnier and more expressive using a "Comedy Doctor" system.
- **Smart Background Removal**: Custom client-side algorithm to remove backgrounds and create clean sticker outlines.
- **Gallery**: Save, view, and manage your generated stickers locally.
- **WhatsApp Ready**: Export stickers in WebP format ready for WhatsApp sharing.
- **BYOK (Bring Your Own Key)**: Users can use their own Gemini API key for unlimited generations after the free quota is exhausted.

## 🛠️ Tech Stack

- **Framework**: React 19
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (v4 via `@tailwindcss/vite`)
- **AI SDK**: Google GenAI SDK (`@google/genai`)
- **Fonts**: Inter Tight (Sans), Instrument Serif (Serif)
- **Icons**: Lucide React
- **Storage**: IndexedDB (via `idb` wrapper) for local persistence of stickers and keys.

## 📂 Project Structure

```
d:/Projects/skievision/
├── components/          # Reusable UI components
│   ├── ApiKeyModal.tsx  # Modal for API key management
│   ├── Layout.tsx       # Main application shell (Nav, Footer)
│   ├── ImageUpload.tsx  # Drag-and-drop image uploader
│   └── ...
├── services/            # Core business logic and API services
│   ├── geminiService.ts # Gemini API integration, prompt engineering, image processing
│   └── storage.ts       # IndexedDB wrapper for saving stickers and keys
├── views/               # Main page views
│   ├── StickerMaker.tsx # Main studio view (Create/Edit stickers)
│   └── Gallery.tsx      # Saved stickers gallery
├── App.tsx              # Main entry point, routing, and state management
├── index.css            # Global styles and Tailwind theme configuration
├── index.html           # HTML entry point
├── vite.config.ts       # Vite configuration
└── package.json         # Dependencies and scripts
```

## ⚡ Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- npm

### Installation

1.  Clone the repository (if applicable) or navigate to the project directory.
2.  Install dependencies:

    ```bash
    npm install
    ```

### Environment Setup

Create a `.env` file in the root directory if you want to provide a default developer API key (optional):

```env
GEMINI_API_KEY=your_api_key_here
```

### Running Locally

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

Build the project for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## 🧠 Key Services

### `geminiService.ts`
This is the heart of the application. It handles:
-   **`generateSticker`**: Orchestrates the generation process. It decides whether to use text-to-image (Imagen) or image-to-image (Gemini Flash) based on input.
-   **`enhancePromptForComedy`**: Uses a specialized system prompt to rewrite user inputs into funny, exaggerated sticker descriptions.
-   **`processImage`**: Prepares uploaded images (resizing, formatting) for the API.
-   **`removeSmartBackground`**: A canvas-based algorithm to remove backgrounds from generated images, assuming a black background from the generation step.

### `storage.ts`
Manages local persistence using IndexedDB:
-   Stores generated stickers (base64 data).
-   Manages the user's API key securely in the browser.
-   Tracks free usage quota.

## 🎨 Styling & Design

The project uses a custom dark mode aesthetic defined in `index.css` using Tailwind's `@theme` directive.
-   **Colors**: A Zinc-based palette (`#09090b` background) with white accents.
-   **Typography**: "Instrument Serif" for headings and "Inter Tight" for body text.
-   **Effects**: Glassmorphism (backdrop blur), subtle noise textures, and smooth CSS animations.

## 🤝 Contributing

1.  Fork the repository.
2.  Create a feature branch.
3.  Commit your changes.
4.  Push to the branch.
5.  Open a Pull Request.
