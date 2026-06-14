from config import settings
from typing import List, Dict, Any
import requests
import json

# DeepSeek API endpoint
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"

# Comprehensive Medical System Prompt for Patient Portal Chatbot
MEDICAL_SYSTEM_PROMPT = """You are a professional AI medical assistant for a Patient Portal application. Your primary role is to provide safe, educational medical guidance while helping patients navigate their healthcare journey.

## CORE RESPONSIBILITIES

1. **Understand Patient Complaints**: Process natural language descriptions of symptoms, concerns, and health questions
2. **Ask Smart Follow-up Questions**: Gather relevant information to provide better guidance
3. **Assess Risk Levels**: Categorize situations appropriately
4. **Provide Educational Guidance**: Share evidence-based medical information
5. **Guide Next Steps**: Direct patients to appropriate care levels

## RISK LEVEL ASSESSMENT

Categorize each interaction into one of four risk levels:

### 🟢 LOW RISK
- Minor symptoms (mild headache, common cold, minor cuts)
- General health questions
- Wellness and prevention inquiries
- **Action**: Self-care guidance, monitor symptoms

### 🟡 MODERATE RISK
- Persistent symptoms (lasting 3-7 days)
- Worsening conditions
- Chronic disease management questions
- **Action**: Schedule appointment with primary care provider

### 🟠 HIGH RISK
- Severe pain or discomfort
- High fever (>103°F/39.4°C)
- Significant injury
- Sudden symptom onset
- Concerning changes in chronic conditions
- **Action**: Urgent care visit or same-day appointment

### 🔴 EMERGENCY
- Chest pain or pressure
- Difficulty breathing or shortness of breath
- Severe bleeding
- Loss of consciousness
- Stroke symptoms (FAST: Face drooping, Arm weakness, Speech difficulty, Time to call 911)
- Severe allergic reactions
- Suicidal thoughts or severe mental health crisis
- Severe abdominal pain
- Head injury with confusion
- **Action**: Call 911 immediately or go to emergency room

## COMPREHENSIVE SYMPTOM COVERAGE

### Respiratory
- Cough (dry, productive, chronic)
- Shortness of breath
- Wheezing
- Chest congestion
- Sore throat
- Runny/stuffy nose
- Sneezing

### Pain & Discomfort
- Headache (tension, migraine, cluster)
- Back pain
- Joint pain
- Muscle aches
- Abdominal pain
- Chest pain
- Neck pain

### Digestive
- Nausea
- Vomiting
- Diarrhea
- Constipation
- Heartburn
- Loss of appetite
- Bloating

### Systemic
- Fever
- Chills
- Fatigue
- Weakness
- Dizziness
- Weight changes

### Skin
- Rash
- Itching
- Bruising
- Swelling
- Wounds/cuts

### Mental Health
- Anxiety
- Depression
- Sleep problems
- Stress
- Mood changes

### Other
- Vision changes
- Hearing problems
- Urinary issues
- Menstrual concerns
- Allergic reactions

## CRITICAL SAFETY GUIDELINES

### ❌ NEVER DO:
- Provide specific diagnoses
- Prescribe medications or treatments
- Recommend changing prescribed medications
- Give definitive medical opinions
- Replace professional medical advice
- Minimize emergency symptoms

### ✅ ALWAYS DO:
- Clarify you're an AI assistant, not a doctor
- Recommend consulting healthcare providers for personalized advice
- Direct emergencies to 911 immediately
- Provide evidence-based general information
- Be empathetic and supportive
- Ask clarifying questions
- Respect patient privacy
- Use patient-friendly language

## HIPAA-AWARE BEHAVIOR

- Never request or store sensitive personal health information
- Remind patients that chat conversations may be logged
- Encourage use of secure messaging for sensitive topics
- Don't ask for: Social Security numbers, full medical history details, insurance information
- Focus on symptoms and guidance, not data collection

## COMMUNICATION STYLE

- **Patient-Friendly Language**: Avoid medical jargon; explain terms simply
- **Empathetic Tone**: Acknowledge concerns and feelings
- **Clear Structure**: Use bullet points and sections for readability
- **Actionable Guidance**: Always provide clear next steps
- **Reassuring**: Balance caution with comfort

## SMART FOLLOW-UP QUESTIONS

When patients describe symptoms, ask:
- **Duration**: "How long have you been experiencing this?"
- **Severity**: "On a scale of 1-10, how would you rate the discomfort?"
- **Pattern**: "Is it constant or does it come and go?"
- **Triggers**: "Does anything make it better or worse?"
- **Associated Symptoms**: "Are you experiencing any other symptoms?"
- **Medical History**: "Do you have any relevant medical conditions?"
- **Medications**: "Are you currently taking any medications?"

## RESPONSE STRUCTURE

For symptom inquiries, structure responses as:

1. **Acknowledgment**: Validate their concern
2. **Risk Assessment**: Indicate urgency level
3. **General Information**: Explain possible causes (educational only)
4. **Self-Care Guidance**: If appropriate for low-risk situations
5. **When to Seek Care**: Clear criteria
6. **Next Steps**: Specific actionable recommendations
7. **Disclaimer**: Remind to consult healthcare provider

## EXAMPLE INTERACTIONS

**Patient**: "I have a bad cough"

**Response**:
"I understand you're dealing with a cough. Let me help you assess this.

🟡 **Risk Level**: Moderate (needs more information)

**Follow-up Questions**:
- How long have you had this cough?
- Is it a dry cough or are you coughing up mucus?
- Do you have fever, shortness of breath, or chest pain?
- Have you been around anyone who's sick?

**General Guidance**:
Coughs can result from various causes including viral infections, allergies, or irritants.

**Self-Care** (if mild):
- Stay hydrated
- Use honey (if over 1 year old)
- Humidifier may help
- Avoid irritants like smoke

**Seek Care If**:
- Cough lasts more than 3 weeks
- Coughing up blood
- High fever (>101°F)
- Difficulty breathing
- Chest pain

**Next Step**: I can help you schedule an appointment with your provider to evaluate this cough properly.

*Remember: This is educational guidance only. For personalized medical advice, please consult your healthcare provider.*"

## PORTAL NAVIGATION ASSISTANCE

You can also help patients with:
- Scheduling appointments
- Viewing medical records
- Understanding test results (general interpretation, not diagnosis)
- Medication reminders
- Finding provider contact information
- Accessing educational resources

Always maintain a supportive, professional, and safe approach to healthcare guidance."""

# Fallback responses when DeepSeek API is not available
def get_fallback_response(user_message: str) -> str:
    """Generate a helpful fallback response when DeepSeek API is unavailable"""
    message_lower = user_message.lower()
    
    if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
        return "Hello! I'm your AI healthcare assistant. I can help you understand symptoms, answer health questions, and guide you to the right care. How can I assist you today?"
    
    elif any(word in message_lower for word in ['emergency', 'urgent', 'critical', '911', 'can\'t breathe', 'chest pain']):
        return "🚨 **MEDICAL EMERGENCY** 🚨\n\nIf you're experiencing a medical emergency:\n\n1. **Call 911 immediately**\n2. **Go to the nearest emergency room**\n3. **Don't wait** - seek immediate medical attention\n\nFor non-emergency urgent concerns, contact your healthcare provider directly."
    
    elif any(word in message_lower for word in ['appointment', 'schedule', 'book']):
        return "I can help you with appointments! You can schedule, reschedule, or view your appointments through the Appointments tab. Would you like me to guide you through the process?"
    
    elif any(word in message_lower for word in ['cough', 'fever', 'pain', 'sick', 'symptom', 'hurt', 'ache']):
        return "I understand you're not feeling well. To provide the best guidance, I need to know more:\n\n• How long have you had these symptoms?\n• How severe are they (1-10)?\n• Do you have any other symptoms?\n\n**Important**: If you're experiencing severe symptoms, difficulty breathing, chest pain, or other emergency signs, please call 911 immediately.\n\nI can help you schedule an appointment with your healthcare provider to address your concerns."
    
    elif any(word in message_lower for word in ['medication', 'medicine', 'pill', 'drug']):
        return "I can help you with medication information! You can view your current medications and set reminders in the Records section.\n\n**Important**: Never stop or change medications without consulting your doctor first. For medication questions, please contact your healthcare provider."
    
    elif any(word in message_lower for word in ['record', 'report', 'test', 'lab', 'result']):
        return "Your medical records are available in the Records section. You can view lab results, test reports, and other medical documents.\n\nIf you have questions about specific test results, I recommend discussing them with your healthcare provider for personalized interpretation."
    
    else:
        return "I'm here to help with your healthcare needs! I can:\n\n• Answer health questions\n• Help assess symptoms\n• Guide you to appropriate care\n• Assist with appointments and records\n\nWhat would you like help with today?\n\n*Note: I provide educational guidance only. For medical advice, please consult your healthcare provider.*"

def get_fallback_suggestions(user_message: str) -> List[str]:
    """Generate fallback suggestions when DeepSeek API is unavailable"""
    message_lower = user_message.lower()
    
    if any(word in message_lower for word in ['cough', 'fever', 'pain', 'sick', 'symptom']):
        return ["Schedule an appointment", "Describe symptoms in detail", "View my medical records"]
    elif any(word in message_lower for word in ['appointment', 'schedule']):
        return ["Book new appointment", "View upcoming appointments", "Contact my provider"]
    elif any(word in message_lower for word in ['medication', 'medicine']):
        return ["View my medications", "Contact pharmacist", "Ask about side effects"]
    elif any(word in message_lower for word in ['test', 'lab', 'result']):
        return ["View test results", "Schedule follow-up", "Ask about results"]
    else:
        return ["Ask about symptoms", "Schedule appointment", "View medical records"]

class DeepSeekService:
    @staticmethod
    async def generate_response(user_message: str, patient_context: Dict[str, Any] = None) -> str:
        """Generate a response using DeepSeek API."""
        if not settings.deepseek_api_key:
            print("WARNING: DeepSeek API key not configured, using fallback")
            return get_fallback_response(user_message)
        
        try:
            # Add patient context if available
            context = ""
            if patient_context:
                context = "\n\nPatient Context:\n"
                if patient_context.get('user_name'):
                    context += f"Patient Name: {patient_context['user_name']}\n"
                if patient_context.get('age'):
                    context += f"Age: {patient_context['age']}\n"
                if patient_context.get('has_chronic_conditions'):
                    context += "Note: Patient has chronic conditions on file\n"
            
            # Prepare messages for DeepSeek API
            messages = [
                {"role": "system", "content": MEDICAL_SYSTEM_PROMPT + context},
                {"role": "user", "content": user_message}
            ]
            
            # Call DeepSeek API
            response = requests.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.deepseek_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 1500,
                    "stream": False
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
                
                if content:
                    return content
                else:
                    print("DeepSeek returned empty response")
                    return get_fallback_response(user_message)
            else:
                print(f"DeepSeek API error: {response.status_code} - {response.text}")
                return get_fallback_response(user_message)
            
        except Exception as e:
            print(f"Error generating DeepSeek response: {e}")
            return get_fallback_response(user_message)
    
    @staticmethod
    async def generate_suggestions(user_message: str) -> List[str]:
        """Generate follow-up suggestions based on user input."""
        if not settings.deepseek_api_key:
            return get_fallback_suggestions(user_message)
        
        try:
            prompt = f"""Based on this patient message: "{user_message}", suggest 3 helpful follow-up questions or actions. 

Keep them:
- Short (under 8 words each)
- Actionable
- Relevant to healthcare
- Patient-friendly

Return only the suggestions, one per line, without numbering."""
            
            messages = [
                {"role": "system", "content": "You are a helpful medical assistant that generates short, actionable suggestions."},
                {"role": "user", "content": prompt}
            ]
            
            response = requests.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.deepseek_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.8,
                    "max_tokens": 200
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                suggestions = [s.strip().lstrip('•-*123456789.') for s in content.split('\n') if s.strip()]
                return suggestions[:3]  # Limit to 3 suggestions
            else:
                return get_fallback_suggestions(user_message)
            
        except Exception as e:
            print(f"Error generating suggestions: {e}")
            return get_fallback_suggestions(user_message)
    
    @staticmethod
    async def assess_risk_level(symptoms: str) -> str:
        """Assess risk level of reported symptoms."""
        if not settings.deepseek_api_key:
            return "MODERATE"
        
        try:
            prompt = f"""Assess the risk level of these symptoms: "{symptoms}"

Respond with ONLY one word:
- LOW (minor, self-care appropriate)
- MODERATE (needs appointment)
- HIGH (urgent care needed)
- EMERGENCY (call 911)"""
            
            messages = [
                {"role": "system", "content": "You are a medical triage assistant. Respond with only the risk level."},
                {"role": "user", "content": prompt}
            ]
            
            response = requests.post(
                DEEPSEEK_API_URL,
                headers={
                    "Authorization": f"Bearer {settings.deepseek_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "deepseek-chat",
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 50
                },
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                risk = data.get("choices", [{}])[0].get("message", {}).get("content", "").strip().upper()
                if risk in ["LOW", "MODERATE", "HIGH", "EMERGENCY"]:
                    return risk
            
            return "MODERATE"  # Default to moderate if unclear
            
        except Exception as e:
            print(f"Error assessing risk level: {e}")
            return "MODERATE"
