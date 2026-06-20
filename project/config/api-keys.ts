// API Keys Configuration
// Replace with your actual API keys

export const API_KEYS = {
  // Get your Gemini API key from: https://makersuite.google.com/app/apikey
  // In development, set EXPO_PUBLIC_GEMINI_API_KEY in a local .env file (never commit real keys)
  /** Used by GlucoScan meal analyzer (vision) and other Gemini features. */
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  // Groq API key (from https://console.groq.com/)
  // IMPORTANT: Never hardcode API keys. Always use environment variables.
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
  // Vercel AI Gateway API key (from https://vercel.com/~/ai-gateway/api-keys)
  // Used by the AI physician chat assistant (DeepSeek v3.2 via Vercel AI SDK)
  AI_GATEWAY_API_KEY: process.env.EXPO_PUBLIC_AI_GATEWAY_API_KEY || '',
} as const;

// Instructions for setting up API keys:
// 1. Get your Gemini API key from: https://makersuite.google.com/app/apikey
// 2. Get your AI Gateway API key from: https://vercel.com/~/ai-gateway/api-keys
// 3. Create a .env file in the project root (copy from .env.example if it exists)
// 4. Add: EXPO_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here (required for GlucoScan)
// 5. Add: EXPO_PUBLIC_AI_GATEWAY_API_KEY=your_actual_key_here (required for AI Chat)
// 6. Restart your development server
