# Medical Chatbot Prompt Engineering Documentation

## Overview

This document describes the professional prompt engineering implementation for the Patient Portal medical chatbot powered by **DeepSeek AI**.

## System Architecture

- **AI Model**: DeepSeek Chat (`deepseek-chat`)
- **API Endpoint**: `https://api.deepseek.com/v1/chat/completions`
- **Implementation**: `backend/deepseek_service.py`
- **Temperature**: 0.7 (balanced creativity and consistency)
- **Max Tokens**: 1500 (comprehensive responses)

## Core System Prompt

The chatbot uses a comprehensive medical system prompt that defines its behavior, capabilities, and safety guidelines. The prompt is structured into several key sections:

### 1. Core Responsibilities

- **Understand Patient Complaints**: Process natural language symptom descriptions
- **Ask Smart Follow-up Questions**: Gather relevant information systematically
- **Assess Risk Levels**: Categorize situations into four risk tiers
- **Provide Educational Guidance**: Share evidence-based medical information
- **Guide Next Steps**: Direct patients to appropriate care levels

### 2. Risk Level Assessment Framework

The chatbot categorizes every interaction into one of four risk levels:

#### 🟢 LOW RISK
- **Examples**: Minor headache, common cold, minor cuts
- **Action**: Self-care guidance, monitor symptoms
- **Response**: Educational information + self-care tips

#### 🟡 MODERATE RISK
- **Examples**: Persistent symptoms (3-7 days), worsening conditions
- **Action**: Schedule appointment with primary care provider
- **Response**: Guidance + appointment scheduling assistance

#### 🟠 HIGH RISK
- **Examples**: Severe pain, high fever (>103°F), significant injury
- **Action**: Urgent care visit or same-day appointment
- **Response**: Strong recommendation for immediate medical attention

#### 🔴 EMERGENCY
- **Examples**: Chest pain, difficulty breathing, severe bleeding, stroke symptoms
- **Action**: Call 911 immediately or go to emergency room
- **Response**: Emergency directive + immediate action instructions

### 3. Comprehensive Symptom Coverage

The system prompt includes extensive symptom categories:

**Respiratory**: Cough, shortness of breath, wheezing, chest congestion, sore throat, runny/stuffy nose, sneezing

**Pain & Discomfort**: Headache (tension, migraine, cluster), back pain, joint pain, muscle aches, abdominal pain, chest pain, neck pain

**Digestive**: Nausea, vomiting, diarrhea, constipation, heartburn, loss of appetite, bloating

**Systemic**: Fever, chills, fatigue, weakness, dizziness, weight changes

**Skin**: Rash, itching, bruising, swelling, wounds/cuts

**Mental Health**: Anxiety, depression, sleep problems, stress, mood changes

**Other**: Vision changes, hearing problems, urinary issues, menstrual concerns, allergic reactions

### 4. Critical Safety Guidelines

#### ❌ NEVER DO:
- Provide specific diagnoses
- Prescribe medications or treatments
- Recommend changing prescribed medications
- Give definitive medical opinions
- Replace professional medical advice
- Minimize emergency symptoms

#### ✅ ALWAYS DO:
- Clarify you're an AI assistant, not a doctor
- Recommend consulting healthcare providers
- Direct emergencies to 911 immediately
- Provide evidence-based general information
- Be empathetic and supportive
- Ask clarifying questions
- Respect patient privacy
- Use patient-friendly language

### 5. HIPAA-Aware Behavior

The chatbot is designed with privacy awareness:

- Never requests sensitive personal health information
- Reminds patients that conversations may be logged
- Encourages secure messaging for sensitive topics
- Doesn't ask for: SSN, detailed medical history, insurance information
- Focuses on symptoms and guidance, not data collection

### 6. Smart Follow-up Questions

When patients describe symptoms, the chatbot asks:

- **Duration**: "How long have you been experiencing this?"
- **Severity**: "On a scale of 1-10, how would you rate the discomfort?"
- **Pattern**: "Is it constant or does it come and go?"
- **Triggers**: "Does anything make it better or worse?"
- **Associated Symptoms**: "Are you experiencing any other symptoms?"
- **Medical History**: "Do you have any relevant medical conditions?"
- **Medications**: "Are you currently taking any medications?"

### 7. Response Structure

For symptom inquiries, responses follow this structure:

1. **Acknowledgment**: Validate their concern
2. **Risk Assessment**: Indicate urgency level with emoji
3. **General Information**: Explain possible causes (educational only)
4. **Self-Care Guidance**: If appropriate for low-risk situations
5. **When to Seek Care**: Clear criteria
6. **Next Steps**: Specific actionable recommendations
7. **Disclaimer**: Remind to consult healthcare provider

## Example Interaction

**Patient Input**: "I have a bad cough"

**Chatbot Response**:
```
I understand you're dealing with a cough. Let me help you assess this.

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

*Remember: This is educational guidance only. For personalized medical advice, please consult your healthcare provider.*
```

## Communication Style

- **Patient-Friendly Language**: Avoids medical jargon; explains terms simply
- **Empathetic Tone**: Acknowledges concerns and feelings
- **Clear Structure**: Uses bullet points and sections for readability
- **Actionable Guidance**: Always provides clear next steps
- **Reassuring**: Balances caution with comfort

## Portal Navigation Assistance

Beyond medical guidance, the chatbot helps with:
- Scheduling appointments
- Viewing medical records
- Understanding test results (general interpretation, not diagnosis)
- Medication reminders
- Finding provider contact information
- Accessing educational resources

## API Configuration

### Request Format
```json
{
  "model": "deepseek-chat",
  "messages": [
    {
      "role": "system",
      "content": "[MEDICAL_SYSTEM_PROMPT + patient_context]"
    },
    {
      "role": "user",
      "content": "[patient_message]"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 1500,
  "stream": false
}
```

### Patient Context
The system includes relevant patient context when available:
- Patient name
- Age
- Chronic conditions flag (without details)

### Fallback Behavior
If the DeepSeek API is unavailable, the system provides intelligent fallback responses based on keyword matching for:
- Greetings
- Emergency situations
- Appointment requests
- Symptom reports
- Medication questions
- Medical records

## Safety & Compliance

### Medical Disclaimer
Every response includes appropriate disclaimers:
- "This is educational guidance only"
- "For personalized medical advice, please consult your healthcare provider"
- "I'm an AI assistant, not a doctor"

### Emergency Handling
Emergency keywords trigger immediate escalation:
- Chest pain → Call 911
- Difficulty breathing → Call 911
- Severe bleeding → Call 911
- Stroke symptoms → Call 911
- Suicidal thoughts → Crisis resources + 911

### Privacy Protection
- No collection of PHI (Protected Health Information)
- Conversations logged for quality/safety only
- Secure messaging recommended for sensitive topics
- HIPAA-compliant behavior patterns

## Testing & Validation

### Test Scenarios
1. **Low-risk symptoms**: Common cold, minor headache
2. **Moderate-risk symptoms**: Persistent cough, mild fever
3. **High-risk symptoms**: Severe pain, high fever
4. **Emergency symptoms**: Chest pain, difficulty breathing
5. **General questions**: Medication info, appointment scheduling
6. **Mental health**: Anxiety, depression support

### Expected Behaviors
- Appropriate risk level assessment
- Clear next steps
- Empathetic responses
- Safety disclaimers
- Emergency escalation when needed

## Maintenance & Updates

### Prompt Updates
The system prompt can be updated in `deepseek_service.py` under `MEDICAL_SYSTEM_PROMPT`.

### Adding New Symptoms
To add symptom coverage, update the "Comprehensive Symptom Coverage" section of the prompt.

### Adjusting Risk Levels
Risk assessment criteria can be refined in the "Risk Level Assessment" section.

## API Key Management

**Security**: The DeepSeek API key is stored in `backend/.env`:
```
DEEPSEEK_API_KEY=your_deepseek_api_key_here
```

**Important**: Never commit the `.env` file to version control. Use `.gitignore` to exclude it.

## Performance Metrics

- **Response Time**: Typically 2-5 seconds
- **Token Usage**: Average 500-1000 tokens per response
- **Fallback Rate**: <5% (when API is available)
- **User Satisfaction**: Measured through feedback

## Future Enhancements

1. **Multi-turn Context**: Maintain conversation history for better follow-ups
2. **Symptom Checker**: Structured symptom assessment flow
3. **Risk Scoring**: Numerical risk scores for better triage
4. **Language Support**: Multi-language medical guidance
5. **Voice Integration**: Voice-to-text symptom reporting
6. **Provider Integration**: Direct handoff to healthcare providers

---

**Document Version**: 1.0  
**Last Updated**: January 27, 2026  
**AI Model**: DeepSeek Chat  
**Compliance**: HIPAA-aware, Medical Disclaimer Compliant
