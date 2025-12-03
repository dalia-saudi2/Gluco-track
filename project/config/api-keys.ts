// API Keys Configuration
// Replace with your actual API keys

export const API_KEYS = {
  // Get your Gemini API key from: https://makersuite.google.com/app/apikey
  // In development, set EXPO_PUBLIC_GEMINI_API_KEY in a local .env file (never commit real keys)
  GEMINI_API_KEY: process.env.EXPO_PUBLIC_GEMINI_API_KEY || '',
  // OpenAI API key (from https://platform.openai.com/api-keys)
  OPENAI_API_KEY: process.env.EXPO_PUBLIC_OPENAI_API_KEY || '',
  // Groq API key (from https://console.groq.com/)
  GROQ_API_KEY: process.env.EXPO_PUBLIC_GROQ_API_KEY || '',
} as const;

// Instructions for setting up API keys:
// 1. Get your Gemini API key from: https://makersuite.google.com/app/apikey
// 2. Create a .env file in the project root
// 3. Add: EXPO_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
// 4. Restart your development server
