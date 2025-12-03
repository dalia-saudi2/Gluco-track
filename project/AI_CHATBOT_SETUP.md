# AI Chatbot Setup Guide

This guide will help you set up a real AI-powered chatbot like ChatGPT or Grok for your healthcare app.

## 🤖 AI Providers Supported

1. **OpenAI (GPT-3.5-turbo)** - Primary choice (most reliable)
2. **Groq (Llama 3.1)** - Backup option (faster, free tier available)
3. **Fallback responses** - When APIs are unavailable

## 🔑 Getting API Keys

### Option 1: OpenAI (Recommended)
1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign up or log in
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)
5. Add to your `.env` file: `EXPO_PUBLIC_OPENAI_API_KEY=sk-your-key-here`

### Option 2: Groq (Free Alternative)
1. Go to [Groq Console](https://console.groq.com/)
2. Sign up or log in
3. Go to API Keys section
4. Create a new API key
5. Add to your `.env` file: `EXPO_PUBLIC_GROQ_API_KEY=your-groq-key-here`

## 📝 Environment Setup

Create a `.env` file in your project root:

```env
# OpenAI API Key (Primary)
EXPO_PUBLIC_OPENAI_API_KEY=sk-your-openai-key-here

# Groq API Key (Backup)
EXPO_PUBLIC_GROQ_API_KEY=your-groq-key-here

# Gemini API Key (Optional)
EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-key-here
```

## 🚀 Features

### Medical Knowledge
- Answer medical questions
- Explain conditions and treatments
- Discuss symptoms and causes
- Provide health guidance
- Explain medical terminology

### Safety Features
- Always recommends consulting healthcare providers
- Emergency guidance (calls 911)
- Clear AI disclaimer
- Evidence-based responses

### Smart Fallbacks
- Tries OpenAI first
- Falls back to Groq if OpenAI fails
- Uses local responses if both fail
- Contextual suggestions

## 💰 Pricing

### OpenAI
- GPT-3.5-turbo: ~$0.002 per 1K tokens
- Typical conversation: $0.01-0.05
- Free tier: $5 credit for new users

### Groq
- Free tier: 14,400 requests/day
- Fast responses
- Good for testing

## 🧪 Testing

Try these medical questions:
- "What is diabetes and how is it treated?"
- "What are the symptoms of high blood pressure?"
- "How does aspirin work?"
- "What should I do if I have chest pain?"
- "Explain my lab results"

## 🔧 Troubleshooting

### No API Key
- Chatbot will use fallback responses
- Still provides helpful guidance
- Shows "Using Fallback" status

### API Errors
- Automatically tries backup provider
- Logs errors to console
- Graceful degradation

### Rate Limits
- OpenAI: Check usage dashboard
- Groq: Wait for reset (daily)
- Fallback responses always work

## 📱 Usage

1. Open the app
2. Go to "AI Assistant" tab
3. Ask any medical question
4. Get intelligent, helpful responses
5. Use suggestions for follow-up questions

The chatbot will provide real medical knowledge while maintaining safety guidelines!

