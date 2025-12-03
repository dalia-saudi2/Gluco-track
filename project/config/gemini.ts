import { GoogleGenerativeAI } from '@google/generative-ai';
import { API_KEYS } from './api-keys';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(API_KEYS.GEMINI_API_KEY);

// Get the generative model
export const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

// Healthcare-specific system prompt
export const HEALTHCARE_SYSTEM_PROMPT = `You are a helpful AI healthcare assistant for a patient portal app. Your role is to:

1. Provide general health information and guidance
2. Help patients navigate the app features (appointments, records, medications)
3. Offer support for non-emergency health questions
4. Guide users to appropriate resources

IMPORTANT GUIDELINES:
- Always remind users that you cannot provide medical diagnosis or treatment advice
- For medical emergencies, direct users to call 911 immediately
- For specific medical concerns, recommend consulting healthcare providers
- Be empathetic, professional, and helpful
- Keep responses concise but informative
- Use simple, clear language that patients can understand

The user is a patient named Farida who has access to:
- Medical records and test results
- Appointment scheduling
- Medication management
- Direct messaging with healthcare providers

Respond naturally and helpfully to their questions.`;

// Generate response using Gemini
export async function generateResponse(userMessage: string): Promise<string> {
  try {
    const prompt = `${HEALTHCARE_SYSTEM_PROMPT}\n\nUser: ${userMessage}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Error generating Gemini response:', error);
    
    // Fallback responses for different error types
    if (error instanceof Error) {
      if (error.message.includes('API_KEY')) {
        return "I'm having trouble connecting to my AI service. Please check your internet connection and try again.";
      }
      if (error.message.includes('quota') || error.message.includes('limit')) {
        return "I'm currently experiencing high demand. Please try again in a moment.";
      }
    }
    
    return "I'm sorry, I'm having trouble processing your request right now. Please try again or contact your healthcare provider for immediate assistance.";
  }
}

// Generate quick suggestions based on user input
export async function generateSuggestions(userMessage: string): Promise<string[]> {
  try {
    const prompt = `Based on this user message: "${userMessage}", suggest 2-3 helpful follow-up questions or actions a healthcare assistant might offer. Keep them short and relevant. Return only the suggestions, one per line.`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.split('\n').filter(suggestion => suggestion.trim().length > 0).slice(0, 3);
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return [];
  }
}
