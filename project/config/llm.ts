import { API_KEYS } from './api-keys';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

const HEALTHCARE_SYSTEM_PROMPT = `You are a knowledgeable AI healthcare assistant for a patient portal app. You can provide medical information, explain conditions, discuss treatments, and answer health questions. However, you must always:

1. Clarify that you are an AI assistant, not a replacement for professional medical advice
2. Recommend consulting healthcare providers for personal medical decisions
3. For emergencies, always advise calling 911 immediately
4. Provide accurate, evidence-based medical information
5. Be empathetic and supportive in your responses
6. Ask clarifying questions when needed for better assistance

You can discuss:
- General medical knowledge and conditions
- Treatment options and medications
- Symptoms and their possible causes
- Preventive care and lifestyle advice
- Medical terminology explanations
- Health monitoring and management

Always end serious medical discussions with a reminder to consult healthcare providers for personalized advice.`;

// Fallback responses for when AI is unavailable
function getFallbackResponse(userText: string): string {
  const text = userText.toLowerCase().trim();
  
  if (/(hello|hi|hey|good morning|good afternoon|good evening)/.test(text)) {
    return "Hello! I'm your AI healthcare assistant. I can help answer medical questions, explain conditions, discuss treatments, and provide health guidance. How can I assist you today?";
  }
  
  if (/(appointment|schedule|book|meeting|visit)/.test(text)) {
    return "I can help you with appointments! You can view your upcoming appointments, schedule new ones, or reschedule existing appointments. Would you like to check your current appointments or schedule a new one?";
  }
  
  if (/(record|report|result|lab|test|scan|x-ray|mri|ct)/.test(text)) {
    return "Your medical records are available in the Records section. You can view lab results, imaging reports, and other medical documents. Is there a specific report you're looking for?";
  }
  
  if (/(medication|medicine|drug|prescription|pill|dose|dosage)/.test(text)) {
    return "I can help you with medication information! You can view your current medications, check dosages, and get reminders. Would you like to see your current medication list?";
  }
  
  if (/(emergency|urgent|911|ambulance|hospital)/.test(text)) {
    return "If this is a medical emergency, please call 911 immediately or go to your nearest emergency room. I cannot provide emergency medical assistance.";
  }
  
  return "I'm here to help with your healthcare needs! I can answer medical questions, explain conditions, discuss treatments, and provide health guidance. What would you like to know?";
}

// Groq API integration
async function callGroq(messages: ChatMessage[]): Promise<string> {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEYS.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [
        { role: 'system', content: HEALTHCARE_SYSTEM_PROMPT },
        ...messages,
      ],
      max_tokens: 1000,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || 'I apologize, but I could not generate a response.';
}

// Main AI chat function with fallbacks
export async function groqChat(messages: ChatMessage[]): Promise<string> {
  // Try Groq API
  if (API_KEYS.GROQ_API_KEY) {
    try {
      return await callGroq(messages);
    } catch (error) {
      console.log('Groq failed, using fallback:', error);
    }
  }

  // Use fallback response
  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    return "I'm here to help! What would you like to know about your healthcare?";
  }
  
  return getFallbackResponse(lastMessage.content);
}

// Generate contextual suggestions
export async function groqSuggestions(userText: string): Promise<string[]> {
  const text = userText.toLowerCase();
  
  if (/(appointment|schedule|book)/.test(text)) {
    return ['View my appointments', 'Schedule new appointment', 'Reschedule appointment'];
  }
  
  if (/(record|report|result|lab)/.test(text)) {
    return ['View medical records', 'Check lab results', 'Download reports'];
  }
  
  if (/(medication|medicine|drug)/.test(text)) {
    return ['View medications', 'Set reminders', 'Check interactions'];
  }
  
  if (/(pain|symptom|hurt|ache)/.test(text)) {
    return ['Describe your symptoms', 'When did it start?', 'Contact your doctor'];
  }
  
  if (/(condition|disease|illness)/.test(text)) {
    return ['Learn about this condition', 'Treatment options', 'Prevention tips'];
  }
  
  if (/(hello|hi|help)/.test(text)) {
    return ['Ask about symptoms', 'Check medications', 'View appointments'];
  }
  
  return ['Ask a medical question', 'Check my records', 'Schedule appointment'];
}


