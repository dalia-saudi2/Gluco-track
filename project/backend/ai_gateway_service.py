"""Server-side proxy for Vercel AI Gateway (avoids browser CORS on custom headers)."""

from __future__ import annotations

from typing import Any

import requests
from dotenv import dotenv_values

from config import ENV_FILE, settings

AI_GATEWAY_URL = "https://ai-gateway.vercel.sh/v3/ai/language-model"

HEALTHCARE_SYSTEM_PROMPT = """You are an experienced, board-certified AI physician assistant embedded in a patient portal. You combine deep medical knowledge with a warm, empathetic bedside manner. Your goal is to make the user feel heard, understood, and safely guided—just as they would with a trusted doctor.

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

You are a master of medical communication: clear, compassionate, and thorough. You make complex topics understandable and help patients feel empowered to take the next right step."""


def _resolve_api_key() -> str:
    """Read gateway key from backend/.env (uvicorn does not reload .env-only changes)."""
    file_key = (dotenv_values(ENV_FILE).get("AI_GATEWAY_API_KEY") or "").strip()
    if file_key:
        return file_key
    return (settings.ai_gateway_api_key or "").strip()


class AiGatewayService:
    @staticmethod
    def chat(messages: list[dict[str, str]]) -> str:
        api_key = _resolve_api_key()
        if not api_key:
            raise RuntimeError("AI_GATEWAY_API_KEY is not configured in backend/.env.")
        if not api_key.startswith("vck_"):
            raise RuntimeError(
                "AI_GATEWAY_API_KEY must be a Vercel AI Gateway key (starts with vck_), "
                "not a Gemini/Google key. Update backend/.env and restart the server."
            )

        mapped_messages = [
            {"role": m["role"], "content": [{"type": "text", "text": m["content"]}]}
            for m in messages
            if m.get("role") in ("user", "assistant", "system") and m.get("content")
        ]

        response = requests.post(
            AI_GATEWAY_URL,
            headers={
                "Authorization": f"Bearer {api_key}",
                "ai-gateway-protocol-version": "0.0.1",
                "x-ai-gateway-auth-method": "api-key",
                "ai-language-model-specification-version": "3",
                "ai-model-id": "deepseek/deepseek-v3.2",
                "Content-Type": "application/json",
            },
            json={
                "system": HEALTHCARE_SYSTEM_PROMPT,
                "prompt": mapped_messages,
                "temperature": 0.7,
                "maxTokens": 1200,
                "providerOptions": {
                    "deepseek": {
                        "reasoning": False,
                        "thinking": False,
                        "maxOutputTokens": 1200,
                    }
                },
            },
            timeout=60,
        )

        if response.status_code != 200:
            hint = ""
            if response.status_code == 401:
                hint = f" (key prefix sent: {api_key[:8]}… — restart backend after updating backend/.env)"
            raise RuntimeError(f"AI Gateway HTTP {response.status_code}{hint}: {response.text}")

        data: dict[str, Any] = response.json()
        content = data.get("content") or []
        for part in content:
            if part.get("type") == "text" and part.get("text"):
                return str(part["text"]).strip()

        raise RuntimeError("AI Gateway returned no text content.")
