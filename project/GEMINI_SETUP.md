# Gemini AI Integration Setup

This chatbot is now integrated with Google's Gemini AI API for intelligent healthcare assistance.

## Setup Instructions

### 1. Get Your Gemini API Key

1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key

### 2. Configure the API Key

**Option A: Environment Variable (Recommended)**
1. Create a `.env` file in the project root
2. Add your API key:
   ```
   EXPO_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
   ```
3. Restart your development server

**Option B: Direct Configuration**
1. Open `project/config/api-keys.ts`
2. Replace `'your_gemini_api_key_here'` with your actual API key
3. Save the file

### 3. Features

The enhanced chatbot now includes:

- **AI-Powered Responses**: Uses Gemini AI for intelligent, contextual responses
- **Healthcare-Specific**: Trained with healthcare context and guidelines
- **Smart Suggestions**: Generates follow-up questions and suggestions
- **Error Handling**: Graceful fallback to predefined responses if API fails
- **Connection Status**: Visual indicator of AI connection status
- **Retry Functionality**: Retry failed messages with a single tap
- **Safety Guidelines**: Always reminds users about medical limitations

### 4. Usage

1. Open the AI Assistant tab
2. Type your healthcare-related questions
3. Get intelligent responses with follow-up suggestions
4. Use quick actions for common tasks
5. Retry failed messages if needed

### 5. Safety Features

- **Medical Disclaimer**: Always reminds users that AI cannot provide medical diagnosis
- **Emergency Guidance**: Directs users to call 911 for emergencies
- **Provider Consultation**: Recommends consulting healthcare providers for specific concerns
- **Fallback System**: Uses predefined responses if AI is unavailable

### 6. Troubleshooting

**If you see "Using Fallback" status:**
- Check your internet connection
- Verify your API key is correct
- Check if you've exceeded API quotas
- Try the retry button on failed messages

**If you see "Connecting..." status:**
- The app is trying to connect to Gemini AI
- Wait a moment for the connection to establish
- Check your API key configuration

### 7. API Costs

- Gemini API has free tier with usage limits
- Check [Google AI Pricing](https://ai.google.dev/pricing) for current rates
- Monitor your usage in the Google AI Studio dashboard

## Security Notes

- Never commit your actual API key to version control
- Use environment variables for production deployments
- The API key is safe to use in client-side applications (it's designed for this)
- All conversations are processed by Google's servers (review their privacy policy)
