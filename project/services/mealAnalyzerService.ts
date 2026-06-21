import { z } from 'zod';
import { generateText, Output, createGateway } from 'ai';
import { API_KEYS } from '../config/api-keys';

export const SYSTEM_PROMPT = [
  'You are an expert clinical AI for diabetes meal analysis integrated into a patient portal.',
  'You analyze meal photos and return a structured JSON response.',
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
  '- narrative: 3–4 sentences of plain patient-friendly explanation. No jargon.',
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

export const mealFoodItemSchema = z.object({
  name: z.string().describe('Name of the food item'),
  portion: z.string().describe('Estimated portion size, e.g. 200g or 1 cup'),
  gi: z.enum(['low', 'medium', 'high']).describe('Glycemic index category'),
});

export const mealNutritionSchema = z.object({
  carbs: z.number().describe('Total carbohydrates in grams'),
  calories: z.number().describe('Total calories in kcal'),
  protein: z.number().describe('Total protein in grams'),
  fat: z.number().describe('Total fat in grams'),
});

export const mealAnalysisSchema = z.object({
  foods: z.array(mealFoodItemSchema).describe('List of food items identified in the image'),
  nutrition: mealNutritionSchema.describe('Nutritional summary of the meal'),
  glucose_delta: z.number().describe('Predicted blood glucose change over 2 hours in mg/dL (e.g. +30)'),
  risk: z.enum(['low', 'medium', 'high']).describe('Glycemic risk level'),
  risk_description: z.string().describe('A single-sentence explanation of glycemic risk'),
  recommendations: z.array(z.string()).length(3).describe('Exactly 3 actionable, personalized tips for the patient'),
  narrative: z.string().describe('3-4 sentences of plain, patient-friendly explanation. No jargon.'),
});

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
  // Polyfill structuredClone for Hermes (React Native JS engine doesn't support it)
  if (typeof globalThis.structuredClone === 'undefined') {
    (globalThis as any).structuredClone = function structuredClone<T>(obj: T): T {
      return JSON.parse(JSON.stringify(obj));
    };
  }

  const apiKey = API_KEYS.AI_GATEWAY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'Missing Vercel AI Gateway API key. Set EXPO_PUBLIC_AI_GATEWAY_API_KEY in project/.env.local and restart.'
    );
  }

  const userMessage = buildUserMessage({
    currentGlucose: params.currentGlucose,
    diabetesType: params.diabetesType,
    mealTime: params.mealTime,
    insulinUnits: params.insulinUnits,
  });

  const gatewayInstance = createGateway({
    apiKey,
  });

  try {
    const result = await generateText({
      model: gatewayInstance('google/gemini-2.5-flash-lite'),
      output: Output.object({ schema: mealAnalysisSchema }),
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              image: normalizeBase64(params.imageBase64),
              mediaType: params.mediaType,
            },
            {
              type: 'text',
              text: userMessage,
            },
          ],
        },
      ],
      temperature: 0.35,
    });

    const parsedData = result.output;
    if (!parsedData) {
      throw new Error('AI failed to return structured meal data.');
    }

    const { narrative, ...parsed } = parsedData;

    return {
      parsed: parsed as MealAnalysisParsed,
      narrative: narrative || '',
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('Meal analysis error:', e);
    throw new Error(`Meal analysis failed: ${msg}`);
  }
}
