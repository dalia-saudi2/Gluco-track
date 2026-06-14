import { GoogleGenerativeAI } from '@google/generative-ai';
import { API_KEYS } from '../config/api-keys';

/**
 * Vision-capable models for generateContent. Aliases like `gemini-1.5-flash` often return 404 now.
 * Order: prefer lite first (often gentler quotas), then fuller Flash variants.
 * Set EXPO_PUBLIC_GEMINI_MEAL_MODEL to force a specific id first.
 */
const GEMINI_MEAL_MODEL_FALLBACKS = [
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.0-flash',
] as const;

function mealModelCandidates(): string[] {
  const explicit = process.env.EXPO_PUBLIC_GEMINI_MEAL_MODEL?.trim();
  if (explicit) {
    return [
      explicit,
      ...GEMINI_MEAL_MODEL_FALLBACKS.filter((m) => m !== explicit),
    ];
  }
  return [...GEMINI_MEAL_MODEL_FALLBACKS];
}

function shouldTryNextGeminiModel(errMsg: string): boolean {
  return /\b404\b|not found|not supported for generateContent|\b429\b|quota|RESOURCE_EXHAUSTED|rate limit/i.test(
    errMsg
  );
}

export const SYSTEM_PROMPT = [
  'You are an expert clinical AI for diabetes meal analysis integrated into a patient portal.',
  'You analyze meal photos and return structured JSON followed by a narrative explanation.',
  '',
  'RESPONSE FORMAT — always respond with valid JSON first inside <JSON> and </JSON> tags,',
  'then a blank line, then a short narrative for the patient.',
  '',
  'JSON schema (strict):',
  '{',
  '  "foods": [',
  '    { "name": "string", "portion": "e.g. 200g", "gi": "low|medium|high" }',
  '  ],',
  '  "nutrition": {',
  '    "carbs": number,',
  '    "calories": number,',
  '    "protein": number,',
  '    "fat": number',
  '  },',
  '  "glucose_delta": number,',
  '  "risk": "low|medium|high",',
  '  "risk_description": "one sentence explanation",',
  '  "recommendations": ["string", "string", "string"]',
  '}',
  '',
  'Field rules:',
  '- foods: list every distinct food item visible in the image',
  '- portion: estimate in grams or common units (e.g. "1 cup", "150g")',
  '- gi: glycemic index — low (<55), medium (56–69), high (≥70)',
  '- carbs: total grams of carbohydrates for the full meal',
  '- calories: total kcal for the full meal',
  '- protein: total grams of protein',
  '- fat: total grams of fat',
  '- glucose_delta: predicted mg/dL change over 2 hours (positive = rise)',
  '- risk: low = peak under 140, medium = 140–180, high = above 180',
  '- risk_description: one plain-language sentence',
  '- recommendations: exactly 3 actionable personalized tips',
  '',
  'After </JSON> write 3–4 sentences of plain patient-friendly explanation. No jargon.',
].join('\n');

export interface MealFoodItem {
  name: string;
  portion: string;
  gi: 'low' | 'medium' | 'high' | string;
}

export interface MealNutrition {
  carbs: number;
  calories: number;
  protein: number;
  fat: number;
}

export interface MealAnalysisParsed {
  foods: MealFoodItem[];
  nutrition: MealNutrition;
  glucose_delta: number;
  risk: 'low' | 'medium' | 'high' | string;
  risk_description: string;
  recommendations: string[];
}

export function buildUserMessage(params: {
  currentGlucose: number;
  diabetesType: string;
  mealTime: string;
  insulinUnits: number;
}): string {
  const { currentGlucose, diabetesType, mealTime, insulinUnits } = params;
  return `Patient context:
- Current blood glucose: ${currentGlucose} mg/dL
- Diabetes type: ${diabetesType}
- Meal time: ${mealTime}
- Recent insulin: ${insulinUnits} units

Please analyze the attached meal photo. Identify every food item, estimate portions,
calculate full nutritional values, and predict the 2-hour blood glucose response
based on this patient's current levels and insulin on board.
`;
}

export function mediaTypeFromMime(mime?: string | null): string {
  const t = (mime || '').toLowerCase();
  if (t === 'image/png') return 'image/png';
  if (t === 'image/webp') return 'image/webp';
  if (t === 'image/gif') return 'image/gif';
  return 'image/jpeg';
}

/** Strip data URL prefix if present */
export function normalizeBase64(raw: string): string {
  const idx = raw.indexOf(',');
  if (raw.startsWith('data:') && idx !== -1) return raw.slice(idx + 1);
  return raw;
}

export async function analyzeMeal(params: {
  imageBase64: string;
  mediaType: string;
  currentGlucose: number;
  diabetesType: string;
  mealTime: string;
  insulinUnits: number;
}): Promise<{ parsed: MealAnalysisParsed; narrative: string }> {
  const apiKey = API_KEYS.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Missing Gemini API key. Set EXPO_PUBLIC_GEMINI_API_KEY in project/.env and restart Expo.'
    );
  }

  const userMessage = buildUserMessage({
    currentGlucose: params.currentGlucose,
    diabetesType: params.diabetesType,
    mealTime: params.mealTime,
    insulinUnits: params.insulinUnits,
  });

  const genAI = new GoogleGenerativeAI(apiKey);
  const candidates = mealModelCandidates();

  let fullText: string | undefined;
  let lastError: Error | null = null;

  for (const modelId of candidates) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction: SYSTEM_PROMPT,
      });
      const result = await model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: params.mediaType,
                  data: normalizeBase64(params.imageBase64),
                },
              },
              { text: userMessage },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.35,
        },
      });
      fullText = result.response.text();
      lastError = null;
      break;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      lastError = new Error(msg || 'Gemini meal analysis failed.');
      if (!shouldTryNextGeminiModel(msg)) {
        throw lastError;
      }
    }
  }

  if (fullText === undefined) {
    throw new Error(
      `Gemini meal analysis failed after trying: ${candidates.join(', ')}. Last error: ${lastError?.message}`
    );
  }

  if (!fullText || typeof fullText !== 'string') {
    throw new Error('Unexpected response from Gemini.');
  }

  const jsonMatch = fullText.match(/<JSON>([\s\S]*?)<\/JSON>/);
  if (!jsonMatch) {
    throw new Error('Could not find JSON block in the AI response.');
  }

  let parsed: MealAnalysisParsed;
  try {
    parsed = JSON.parse(jsonMatch[1].trim()) as MealAnalysisParsed;
  } catch {
    throw new Error('AI returned malformed JSON.');
  }

  const narrative = fullText.replace(/<JSON>[\s\S]*?<\/JSON>/, '').trim();

  return { parsed, narrative };
}
