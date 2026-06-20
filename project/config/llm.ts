import { API_KEYS } from "./api-keys";

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

const HEALTHCARE_SYSTEM_PROMPT = `You are an experienced, board‑certified AI physician assistant embedded in a patient portal. You combine deep medical knowledge with a warm, empathetic bedside manner. Your goal is to make the user feel heard, understood, and safely guided—just as they would with a trusted doctor.

ALWAYS follow these rules:
1. Begin your first reply by acknowledging the user’s concern and expressing empathy (e.g., "I can see why that’s worrying you," or "That sounds uncomfortable—let’s work through it together.").
2. Clarify that you are an AI assistant, not a licensed physician, and your advice does not replace in‑person medical evaluation.
3. For any symptom discussion, gently ask focused, clinically relevant follow‑up questions (SOCRATES: Site, Onset, Character, Radiation, Associated symptoms, Timing, Exacerbating/relieving factors, Severity). Build a differential in your mind but do not overwhelm the user with medical jargon—explain terms in plain language when needed.
4. Always mention red‑flag symptoms that would warrant immediate emergency care. If the user reports any of them, instruct them to call 911 or go to the ER immediately.
5. For emergencies (chest pain, sudden severe headache, difficulty breathing, stroke signs, severe bleeding, anaphylaxis, suicidal thoughts, etc.), your very first sentence must be: “This sounds like it could be serious. Please call 911 or go to the nearest emergency room right now. I cannot provide emergency assistance.”
6. When discussing conditions, treatments, or medications, base your information on current, evidence‑based guidelines (mention sources like CDC, UpToDate, NHS, or major medical associations when appropriate).
7. Never diagnose. Instead, say “Possible explanations include…” or “This could be consistent with…” and always stress that only a personal doctor can make a definitive diagnosis.
8. Provide holistic advice: lifestyle modifications, preventive care, mental health support, and appropriate self‑care measures where safe.
9. If the user seems anxious or distressed, validate their feelings and encourage them to share more. Offer reassurance while maintaining clinical accuracy.
10. End every serious medical discussion with: “Please discuss this with your healthcare provider to get advice tailored to your personal health history. I’m here to help you prepare for that conversation.”
11. For medication questions, check for allergies, current prescriptions, and potential interactions—ask if you don’t know.
12. Always prioritize safety, privacy, and patient autonomy. If the user asks for information on harmful practices, gently refuse and redirect to healthier alternatives.

You are a master of medical communication: clear, compassionate, and thorough. You make complex topics understandable and help patients feel empowered to take the next right step.`;

function getFallbackResponse(userText: string): string {
  const text = userText.toLowerCase().trim();

  if (/(hello|hi|hey|good morning|good afternoon|good evening)/.test(text)) {
    return "Hello, and thank you for reaching out. I’m your AI physician assistant—here to listen, help you understand what might be going on, and guide you toward the right care. What can I help you with today?";
  }

  if (/(appointment|schedule|book|meeting|visit)/.test(text)) {
    return "Of course—I’d be glad to assist with appointments. You can check your upcoming visits, find an available slot, or reschedule if needed. Which provider or type of visit (e.g., primary care, specialist) are you looking for?";
  }

  if (/(record|report|result|lab|test|scan|x-ray|mri|ct)/.test(text)) {
    return "Your medical records are private and accessible in the Records section. I can help you understand what the results mean once you’ve viewed them. Do you have a specific test or date you’re looking for, or would you like a general explanation of how to read common lab values?";
  }

  if (
    /(medication|medicine|drug|prescription|pill|dose|dosage|refill)/.test(text)
  ) {
    return "I can walk you through your current medication list, explain what each drug is for, and highlight any important interactions or side effects. Would you like to review your active prescriptions, set up reminders, or ask about a specific medication?";
  }

  if (
    /(emergency|urgent|911|ambulance|hospital|chest pain|can't breathe|stroke|severe bleed|allergic reaction|suicidal)/.test(
      text,
    )
  ) {
    return "🚨 This sounds urgent. If you’re experiencing a medical emergency, please call 911 immediately or get to the nearest ER. I’m not able to provide emergency care. Once you’re safe, I can help you understand what might have happened—but right now, your safety comes first.";
  }

  if (/(pain|hurt|ache|sore|discomfort|cramp)/.test(text)) {
    return "I hear you—pain can be both physically and emotionally draining. While I’m not a doctor, I can help you think through possible causes. To narrow it down, could you tell me: where exactly is the pain? What does it feel like (sharp, dull, burning)? When did it start, and how bad is it on a scale of 1 to 10?";
  }

  if (
    /(symptom|feel|feeling|nauseous|dizzy|tired|fatigue|fever|cough|cold|flu)/.test(
      text,
    )
  ) {
    return "I’m sorry you’re not feeling well. I’d like to understand better so I can provide useful information. Can you describe your main symptoms, when they started, and anything that makes them better or worse? This will help me suggest possible explanations and when you might need to see a doctor.";
  }

  if (
    /(condition|disease|illness|diagnosis|diabetes|hypertension|asthma|arthritis|cancer|heart)/.test(
      text,
    )
  ) {
    return "That’s an important topic. I can explain what the condition is, typical treatment options, and lifestyle changes that often help. Keep in mind, I can’t diagnose, but I can give you a solid foundation to discuss with your own physician. Would you like me to start with an overview or focus on a specific aspect?";
  }

  return "I’m here to provide thoughtful, doctor‑level guidance in a safe, supportive way. Whether you’re dealing with a new symptom, managing a chronic condition, or just have a health question—please share what’s on your mind, and we’ll take it step by step.";
}

export async function groqChat(messages: ChatMessage[]): Promise<string> {
  if (API_KEYS.GROQ_API_KEY) {
    try {
      const response = await fetch(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEYS.GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: HEALTHCARE_SYSTEM_PROMPT },
              ...messages,
            ],
            max_tokens: 1000,
            temperature: 0.7,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = await response.json();
      return (
        data.choices?.[0]?.message?.content?.trim() ||
        "I apologize—I couldn’t generate a response. Could you rephrase that?"
      );
    } catch (error) {
      console.log("Groq failed, using fallback:", error);
    }
  }

  const lastMessage = messages[messages.length - 1];
  if (!lastMessage || lastMessage.role !== "user") {
    return "I’m here and ready to help. What health matter would you like to discuss?";
  }

  return getFallbackResponse(lastMessage.content);
}

export async function groqSuggestions(userText: string): Promise<string[]> {
  const text = userText.toLowerCase();

  if (/(appointment|schedule|book)/.test(text)) {
    return [
      "View upcoming appointments",
      "Book a new visit",
      "Reschedule an existing appointment",
    ];
  }

  if (/(record|report|result|lab|test|x-ray|mri|scan)/.test(text)) {
    return [
      "Explain my last lab results",
      "Download a report",
      "Understand normal vs. abnormal values",
    ];
  }

  if (/(medication|medicine|drug|prescription|pill|dose)/.test(text)) {
    return [
      "Review my current medications",
      "Check for interactions",
      "Set a refill reminder",
    ];
  }

  if (/(pain|hurt|ache|sore|burning|stabbing)/.test(text)) {
    return [
      "Describe the pain in detail",
      "What makes it better or worse?",
      "Any other symptoms with it?",
    ];
  }

  if (
    /(symptom|feel|nauseous|dizzy|fatigue|fever|cough|shortness of breath)/.test(
      text,
    )
  ) {
    return [
      "When did this start?",
      "Rate your discomfort (1‑10)",
      "Have you taken anything for it?",
    ];
  }

  if (
    /(condition|disease|illness|diabetes|hypertension|asthma|arthritis|thyroid|cancer)/.test(
      text,
    )
  ) {
    return [
      "Explain the condition clearly",
      "Treatment options & side effects",
      "Lifestyle changes that help",
    ];
  }

  if (/(hello|hi|help|what can you do|how do I)/.test(text)) {
    return [
      "Discuss a new symptom",
      "Review my medications",
      "Prepare for an upcoming visit",
    ];
  }

  // Default doctor‑like prompts
  return [
    "Tell me about your symptoms",
    "Ask about a specific condition",
    "When to see a doctor",
    "Check medication side effects",
  ];
}
