import google.generativeai as genai
from config import settings
from typing import List, Dict, Any
import json

# Configure Gemini AI
if not settings.gemini_api_key:
    print("WARNING: GEMINI_API_KEY is not set in .env file. Gemini features will not work.")
    model = None
else:
    try:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel('gemini-1.5-flash-latest')
        print(f"Gemini AI configured successfully (API key length: {len(settings.gemini_api_key)})")
    except Exception as e:
        print(f"Error configuring Gemini AI: {e}")
        model = None

# Fallback responses when Gemini API is not available
def get_fallback_response(user_message: str) -> str:
    """Generate a helpful fallback response when Gemini API is unavailable"""
    message_lower = user_message.lower()
    
    if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
        return "Hello! I'm your healthcare assistant. I can help you with appointments, medications, medical records, and general health questions. How can I assist you today?"
    
    elif any(word in message_lower for word in ['appointment', 'schedule', 'book']):
        return "I can help you with appointments! You can schedule, reschedule, or view your appointments through the Appointments tab. Would you like me to guide you through the process?"
    
    elif any(word in message_lower for word in ['medication', 'medicine', 'pill', 'drug']):
        return "I can help you with your medications! You can view your current medications, set reminders, and track your medication schedule. Check the Medications section for more details."
    
    elif any(word in message_lower for word in ['record', 'report', 'test', 'lab']):
        return "I can help you access your medical records! You can view lab results, test reports, and other medical documents in the Records section. Is there something specific you're looking for?"
    
    elif any(word in message_lower for word in ['help', 'support', 'assistance']):
        return "I'm here to help! I can assist you with:\n• Scheduling appointments\n• Managing medications\n• Accessing medical records\n• General health questions\n\nWhat would you like help with?"
    
    elif any(word in message_lower for word in ['pain', 'hurt', 'ache', 'sick', 'ill']):
        return "I understand you're not feeling well. For medical concerns, please contact your healthcare provider directly or visit the nearest emergency room if it's urgent. I can help you schedule an appointment if needed."
    
    else:
        return "I'm here to help with your healthcare needs! I can assist you with appointments, medications, medical records, and general health questions. How can I help you today?"

def get_enhanced_fallback_response(user_message: str, user_context: Dict[str, Any] = None) -> str:
    """Enhanced fallback response with more intelligent context-aware replies"""
    message_lower = user_message.lower()
    
    # More sophisticated pattern matching
    if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'greetings']):
        return "Hello! I'm your healthcare assistant. I'm here to help you navigate your patient portal and answer questions about your health journey. You can access your appointments, view medical records, manage medications, and message your healthcare team. What would you like to do today?"
    
    elif any(word in message_lower for word in ['appointment', 'schedule', 'book', 'meeting', 'visit']):
        return "I can help you with appointments! Here's what you can do:\n\n• **Schedule New Appointments**: Use the Appointments tab to book with your healthcare providers\n• **View Upcoming**: Check your scheduled visits and their details\n• **Reschedule/Cancel**: Contact your provider directly or use the Messages tab\n\nWould you like me to guide you through any of these steps?"
    
    elif any(word in message_lower for word in ['medication', 'medicine', 'pill', 'drug', 'prescription', 'dosage']):
        return "I can help you with your medications! Here's what's available:\n\n• **Current Medications**: View your active prescriptions in the Records tab\n• **Medication Schedule**: Track when to take your medications\n• **Side Effects**: Contact your healthcare provider for any concerns\n• **Refills**: Request prescription refills through your provider\n\n**Important**: Never stop or change medications without consulting your doctor first!"
    
    elif any(word in message_lower for word in ['record', 'report', 'test', 'lab', 'result', 'medical']):
        return "Your medical records are easily accessible! Here's what you can do:\n\n• **View Test Results**: Check lab work, imaging, and other test results\n• **Download Reports**: Save copies of your medical documents\n• **Share Records**: Securely share information with other providers\n• **Request Corrections**: Contact your provider if you notice any errors\n\nAll your records are organized by date and type for easy navigation."
    
    elif any(word in message_lower for word in ['help', 'support', 'assistance', 'guide', 'how to']):
        return "I'm here to help! Here's what I can assist you with:\n\n🏥 **Appointments**: Schedule, view, and manage your visits\n💊 **Medications**: Track prescriptions and set reminders\n📋 **Medical Records**: Access test results and reports\n💬 **Messages**: Communicate with your healthcare team\n\n**Quick Actions**:\n• Tap any tab to explore that section\n• Use the search function to find specific information\n• Contact your provider for urgent medical questions\n\nWhat would you like help with today?"
    
    elif any(word in message_lower for word in ['pain', 'hurt', 'ache', 'sick', 'ill', 'unwell', 'symptoms']):
        return "I understand you're not feeling well. Here's what you should do:\n\n🚨 **Medical Emergency**: If you're experiencing severe symptoms, call 911 immediately\n🏥 **Urgent Care**: For non-emergency but urgent concerns, contact your healthcare provider\n📅 **Schedule Appointment**: Use the Appointments tab to book a visit\n💬 **Message Provider**: Send a message through the Messages tab for quick questions\n\n**Remember**: I can't provide medical advice, but I can help you connect with your healthcare team!"
    
    elif any(word in message_lower for word in ['emergency', 'urgent', 'critical', '911']):
        return "🚨 **MEDICAL EMERGENCY** 🚨\n\nIf you're experiencing a medical emergency:\n\n1. **Call 911 immediately**\n2. **Go to the nearest emergency room**\n3. **Don't wait** - seek immediate medical attention\n\nFor non-emergency urgent concerns, contact your healthcare provider directly or use the Messages tab to reach out quickly."
    
    else:
        return "I'm here to help with your healthcare needs! I can assist you with:\n\n• **Appointments**: Schedule and manage your visits\n• **Medical Records**: Access test results and reports\n• **Medications**: Track your prescriptions\n• **Messages**: Communicate with your healthcare team\n\nWhat would you like to do today? Feel free to ask me anything about using your patient portal!"

def get_fallback_suggestions(user_message: str) -> List[str]:
    """Generate fallback suggestions when Gemini API is unavailable"""
    message_lower = user_message.lower()
    
    if any(word in message_lower for word in ['hello', 'hi', 'hey']):
        return ["Schedule an appointment", "View my medications", "Check my records"]
    elif any(word in message_lower for word in ['appointment', 'schedule']):
        return ["Book new appointment", "Reschedule existing", "View upcoming appointments"]
    elif any(word in message_lower for word in ['medication', 'medicine']):
        return ["View current medications", "Set medication reminder", "Check medication history"]
    elif any(word in message_lower for word in ['record', 'report', 'test']):
        return ["View lab results", "Download reports", "Check recent tests"]
    else:
        return ["Schedule appointment", "View medications", "Check records"]

# Healthcare-specific system prompt
HEALTHCARE_SYSTEM_PROMPT = """You are a helpful AI healthcare assistant for a patient portal app. Your role is to:

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

The user is a patient who has access to:
- Medical records and test results
- Appointment scheduling
- Medication management
- Direct messaging with healthcare providers

Respond naturally and helpfully to their questions."""

class GeminiService:
    @staticmethod
    async def generate_response(user_message: str, patient_context: Dict[str, Any] = None) -> str:
        """Generate a response using Gemini AI."""
        if model is None:
            return get_enhanced_fallback_response(user_message, patient_context)
        
        try:
            # Add patient context if available
            context = ""
            if patient_context:
                context = f"\n\nPatient Context:\n"
                if patient_context.get('current_medications'):
                    context += f"Current Medications: {', '.join([med['name'] for med in patient_context['current_medications']])}\n"
                if patient_context.get('upcoming_appointments'):
                    context += f"Upcoming Appointments: {len(patient_context['upcoming_appointments'])} scheduled\n"
                if patient_context.get('recent_conditions'):
                    context += f"Recent Conditions: {', '.join(patient_context['recent_conditions'])}\n"
            
            prompt = f"{HEALTHCARE_SYSTEM_PROMPT}{context}\n\nUser: {user_message}"
            
            response = model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error generating Gemini response: {e}")
            # Return an enhanced fallback response based on the user's message
            return get_enhanced_fallback_response(user_message, patient_context)
    
    @staticmethod
    async def generate_suggestions(user_message: str) -> List[str]:
        """Generate follow-up suggestions based on user input."""
        if model is None:
            return get_fallback_suggestions(user_message)
        
        try:
            prompt = f"""Based on this user message: "{user_message}", suggest 2-3 helpful follow-up questions or actions a healthcare assistant might offer. Keep them short and relevant. Return only the suggestions, one per line."""
            
            response = model.generate_content(prompt)
            suggestions = [s.strip() for s in response.text.split('\n') if s.strip()]
            return suggestions[:3]  # Limit to 3 suggestions
            
        except Exception as e:
            print(f"Error generating suggestions: {e}")
            return get_fallback_suggestions(user_message)
    
    @staticmethod
    async def analyze_medical_record(record_content: str, record_type: str) -> Dict[str, Any]:
        """Analyze medical record content for insights."""
        try:
            prompt = f"""Analyze this {record_type} medical record and provide insights:
            
            Record Content: {record_content}
            
            Please provide:
            1. Key findings or important values
            2. Any concerning indicators
            3. General interpretation (remember you cannot diagnose)
            4. Recommended follow-up actions
            
            Format as JSON with keys: findings, concerns, interpretation, recommendations"""
            
            response = model.generate_content(prompt)
            # Try to parse as JSON, fallback to text
            try:
                return json.loads(response.text)
            except:
                return {"interpretation": response.text}
                
        except Exception as e:
            print(f"Error analyzing medical record: {e}")
            return {"error": "Unable to analyze record at this time"}
    
    @staticmethod
    async def generate_medication_reminder(medication: Dict[str, Any]) -> str:
        """Generate a personalized medication reminder."""
        try:
            prompt = f"""Generate a friendly medication reminder for:
            Medication: {medication.get('name', 'Unknown')}
            Dosage: {medication.get('dosage', 'Unknown')}
            Frequency: {medication.get('frequency', 'Unknown')}
            Time: {medication.get('time', 'Unknown')}
            
            Make it encouraging and include any important notes about the medication."""
            
            response = model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error generating medication reminder: {e}")
            return f"Time to take your {medication.get('name', 'medication')}!"
    
    @staticmethod
    async def generate_appointment_summary(appointment: Dict[str, Any]) -> str:
        """Generate a summary of an upcoming appointment."""
        try:
            prompt = f"""Generate a helpful appointment summary for:
            Doctor: {appointment.get('doctor_name', 'Unknown')}
            Date: {appointment.get('appointment_date', 'Unknown')}
            Duration: {appointment.get('duration', 30)} minutes
            Location: {appointment.get('location', 'Unknown')}
            Type: {appointment.get('appointment_type', 'consultation')}
            
            Include preparation tips and what to bring."""
            
            response = model.generate_content(prompt)
            return response.text
            
        except Exception as e:
            print(f"Error generating appointment summary: {e}")
            return f"Appointment with {appointment.get('doctor_name', 'your doctor')} is coming up!"
