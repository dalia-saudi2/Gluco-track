// Polyfill structuredClone for Hermes (React Native JS engine doesn't support it)
// The 'ai' SDK uses structuredClone internally — this must come before any ai imports
if (typeof globalThis.structuredClone === 'undefined') {
  (globalThis as any).structuredClone = function structuredClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  };
}

// Static imports — Metro/Expo bundler does NOT support dynamic import() reliably
import { API_KEYS } from './api-keys';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

// ---------------------------------------------------------------------------
// Disclaimer (shown in UI below every AI response)
// ---------------------------------------------------------------------------

export const MEDICAL_DISCLAIMER =
  '⚠️ This AI provides general health information only — it is NOT a licensed physician. ' +
  'Always consult a qualified healthcare provider. In an emergency, call 911.';

// ---------------------------------------------------------------------------
// System Prompt
// ---------------------------------------------------------------------------

const HEALTHCARE_SYSTEM_PROMPT = `You are an experienced, board-certified AI physician assistant embedded in a patient portal. You combine deep medical knowledge with a warm, empathetic bedside manner. Your goal is to make the user feel heard, understood, and safely guided—just as they would with a trusted doctor.

ALWAYS follow these rules:
1. Begin your first reply by acknowledging the user's concern and expressing empathy (e.g., "I can see why that's worrying you," or "That sounds uncomfortable—let's work through it together.").
2. Clarify that you are an AI assistant, not a licensed physician, and your advice does not replace in-person medical evaluation.
3. For any symptom discussion, gently ask focused, clinically relevant follow-up questions (SOCRATES: Site, Onset, Character, Radiation, Associated symptoms, Timing, Exacerbating/relieving factors, Severity). Build a differential in your mind but do not overwhelm the user with medical jargon—explain terms in plain language when needed.
4. Always mention red-flag symptoms that would warrant immediate emergency care. If the user reports any of them, instruct them to call 911 or go to the ER immediately.
5. For emergencies (chest pain, sudden severe headache, difficulty breathing, stroke signs, severe bleeding, anaphylaxis, suicidal thoughts, etc.), your very first sentence must be: "This sounds like it could be serious. Please call 911 or go to the nearest emergency room right now. I cannot provide emergency assistance."
6. When discussing conditions, treatments, or medications, base your information on current, evidence-based guidelines (mention sources like CDC, UpToDate, NHS, or major medical associations when appropriate).
7. Never diagnose. Instead, say "Possible explanations include..." or "This could be consistent with..." and always stress that only a personal doctor can make a definitive diagnosis.
8. Provide holistic advice: lifestyle modifications, preventive care, mental health support, and appropriate self-care measures where safe.
9. If the user seems anxious or distressed, validate their feelings and encourage them to share more. Offer reassurance while maintaining clinical accuracy.
10. End every serious medical discussion with: "Please discuss this with your healthcare provider to get advice tailored to your personal health history. I'm here to help you prepare for that conversation."
11. For medication questions, check for allergies, current prescriptions, and potential interactions—ask if you don't know.
12. Always prioritize safety, privacy, and patient autonomy. If the user asks for information on harmful practices, gently refuse and redirect to healthier alternatives.

You are a master of medical communication: clear, compassionate, and thorough. You make complex topics understandable and help patients feel empowered to take the next right step.`;

// ---------------------------------------------------------------------------
// Fallback — keyword responses used only when AI call fails or key is missing
// ---------------------------------------------------------------------------

function getFallbackResponse(userText: string): string {
  const text = userText.toLowerCase().trim();

  if (/(hello|hi|hey|good morning|good afternoon|good evening)/.test(text)) {
    return "Hello! I'm your AI physician assistant. I'm here to help you understand health topics, discuss symptoms, and guide you toward the right care. What can I help you with today? (Note: currently in offline mode — check your connection for full AI capabilities.)";
  }
  if (/(appointment|schedule|book|meeting|visit)/.test(text)) {
    return "I'd be glad to help with appointments. You can check your upcoming visits or find a slot in the Appointments tab. (Currently in offline mode.)";
  }
  if (/(record|report|result|lab|test|scan|x-ray|mri|ct)/.test(text)) {
    return "Your medical records are accessible in the Records section. I can help you understand results once you've viewed them. (Currently in offline mode.)";
  }
  if (
    /(medication|medicine|drug|prescription|pill|dose|dosage|refill)/.test(text)
  ) {
    return 'I can walk you through your medication list and highlight important side effects or interactions. (Currently in offline mode.)';
  }
  if (
    /(emergency|urgent|911|ambulance|hospital|chest pain|can't breathe|stroke|severe bleed|allergic reaction|suicidal)/.test(
      text,
    )
  ) {
    return "🚨 If you're experiencing a medical emergency, please call 911 immediately or get to the nearest ER. Do not wait for AI assistance in an emergency.";
  }
  if (/(pain|hurt|ache|sore|discomfort|cramp)/.test(text)) {
    return "I hear you — pain can be very concerning. I'm in offline mode right now, but once reconnected I can ask detailed follow-up questions. For severe or sudden pain, please seek medical attention.";
  }
  if (
    /(symptom|feel|feeling|nauseous|dizzy|tired|fatigue|fever|cough|cold|flu)/.test(
      text,
    )
  ) {
    return "I'm sorry you're not feeling well. I'm currently in offline mode. Once reconnected, I can provide detailed guidance. If symptoms are severe, please consult a healthcare provider.";
  }
  if (
    /(condition|disease|illness|diagnosis|diabetes|hypertension|asthma|arthritis|cancer|heart)/.test(
      text,
    )
  ) {
    return "That's an important health topic. I'm currently in offline mode, but once reconnected I can explain conditions, treatments, and lifestyle changes in detail. For specific questions, please consult your physician.";
  }
  return "I'm currently in offline mode and my AI capabilities are limited. Please check your internet connection and try again. For urgent health concerns, contact your healthcare provider directly.";
}

// ---------------------------------------------------------------------------
// Main chat function
// ---------------------------------------------------------------------------

export async function groqChat(messages: ChatMessage[]): Promise<string> {
  const apiKey = API_KEYS.AI_GATEWAY_API_KEY;

  console.log('[LLM] groqChat called. Key present:', !!apiKey, '| Key starts:', apiKey ? apiKey.slice(0, 8) : 'NONE');

  if (apiKey) {
    try {
      console.log('[LLM] Calling DeepSeek v3.2 via AI Gateway REST API...');

      const mappedMessages = messages.map(m => ({
        role: m.role,
        content: [{ type: 'text' as const, text: m.content }]
      }));

      const response = await fetch('https://ai-gateway.vercel.sh/v3/ai/language-model', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'ai-gateway-protocol-version': '0.0.1',
          'x-ai-gateway-auth-method': 'api-key',
          'ai-language-model-specification-version': '3',
          'ai-model-id': 'deepseek/deepseek-v3.2',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          system: HEALTHCARE_SYSTEM_PROMPT,
          prompt: mappedMessages,
          temperature: 0.7,
          maxTokens: 1200,
          providerOptions: {
            deepseek: {
              reasoning: false,
              thinking: false,
              maxOutputTokens: 1200
            }
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[LLM] Raw response data:', JSON.stringify(data));
      const textPart = data.content?.find((part: any) => part.type === 'text');
      const text = textPart?.text?.trim();

      console.log('[LLM] Response received, length:', text?.length);
      if (text) return text;

      return "I apologize — I couldn't generate a response right now. Please try again.";
    } catch (error: any) {
      console.error('[LLM] REST call FAILED:', error?.message || error);
    }
  } else {
    console.warn('[LLM] No EXPO_PUBLIC_AI_GATEWAY_API_KEY — using fallback.');
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== 'user') {
    return "I'm here and ready to help. What health matter would you like to discuss?";
  }
  return getFallbackResponse(lastMessage.content);
}

// ---------------------------------------------------------------------------
// Suggestions helper
// ---------------------------------------------------------------------------

export async function groqSuggestions(userText: string): Promise<string[]> {
  const text = userText.toLowerCase();

  if (/(appointment|schedule|book)/.test(text)) {
    return [
      'View upcoming appointments',
      'Book a new visit',
      'Reschedule an existing appointment',
    ];
  }
  if (/(record|report|result|lab|test|x-ray|mri|scan)/.test(text)) {
    return [
      'Explain my last lab results',
      'Download a report',
      'Understand normal vs. abnormal values',
    ];
  }
  if (/(medication|medicine|drug|prescription|pill|dose)/.test(text)) {
    return [
      'Review my current medications',
      'Check for interactions',
      'Set a refill reminder',
    ];
  }
  if (/(pain|hurt|ache|sore|burning|stabbing)/.test(text)) {
    return [
      'Describe the pain in detail',
      'What makes it better or worse?',
      'Any other symptoms with it?',
    ];
  }
  if (
    /(symptom|feel|nauseous|dizzy|fatigue|fever|cough|shortness of breath)/.test(
      text,
    )
  ) {
    return [
      'When did this start?',
      'Rate your discomfort (1-10)',
      'Have you taken anything for it?',
    ];
  }
  if (
    /(condition|disease|illness|diabetes|hypertension|asthma|arthritis|thyroid|cancer)/.test(
      text,
    )
  ) {
    return [
      'Explain the condition clearly',
      'Treatment options & side effects',
      'Lifestyle changes that help',
    ];
  }
  if (/(hello|hi|help|what can you do|how do I)/.test(text)) {
    return [
      'Discuss a new symptom',
      'Review my medications',
      'Prepare for an upcoming visit',
    ];
  }
  return [
    'Tell me about your symptoms',
    'Ask about a specific condition',
    'When to see a doctor',
    'Check medication side effects',
  ];
}
