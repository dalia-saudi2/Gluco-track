# Healthcare Patient Portal - FastAPI Backend

A comprehensive FastAPI backend for the healthcare patient portal mobile application.

## Features

- **Authentication & Authorization**: JWT-based user authentication
- **User Management**: Patient registration, profile management
- **Appointments**: Schedule and manage medical appointments
- **Medical Records**: Store and retrieve medical records, test results
- **Medications**: Track current medications and prescriptions
- **Messaging**: Patient-provider communication system
- **AI Chatbot**: Gemini AI integration for intelligent assistance
- **Dashboard**: Comprehensive patient dashboard data

## Tech Stack

- **FastAPI**: Modern, fast web framework
- **SQLAlchemy**: ORM for database operations
- **PostgreSQL/SQLite**: Database (configurable)
- **JWT**: Authentication tokens
- **Google Gemini AI**: AI-powered chatbot
- **Pydantic**: Data validation and serialization

## Quick Start

### 1. Install Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment

Create a `.env` file in the backend directory:

```env
# Database (SQLite for development)
DATABASE_URL=sqlite:///./healthcare.db

# Security
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Gemini AI
GEMINI_API_KEY=your_gemini_api_key_here

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,http://localhost:8082
```

### 3. Run the Server

```bash
python run.py
```

The API will be available at `http://localhost:8000`

### 4. API Documentation

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get token

### User Management
- `GET /users/me` - Get current user info
- `PUT /users/me` - Update user profile

### Dashboard
- `GET /dashboard` - Get comprehensive dashboard data

### Appointments
- `GET /appointments` - Get user appointments
- `POST /appointments` - Create new appointment
- `PUT /appointments/{id}` - Update appointment
- `DELETE /appointments/{id}` - Cancel appointment

### Medical Records
- `GET /medical-records` - Get user records
- `POST /medical-records` - Create new record
- `PUT /medical-records/{id}` - Update record

### Medications
- `GET /medications` - Get user medications
- `POST /medications` - Add new medication
- `PUT /medications/{id}` - Update medication

### Chat/AI
- `POST /chat/sessions` - Create chat session
- `POST /chat/messages` - Send message to AI

## Database Models

### User
- Personal information, contact details, medical info

### Appointment
- Doctor, date/time, location, status, notes

### MedicalRecord
- Type, title, date, provider, content, metadata

### Medication
- Name, dosage, frequency, dates, category

### Message
- Patient-provider communication

### ChatSession/ChatMessage
- AI chatbot conversations

## Security Features

- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt password encryption
- **CORS Protection**: Configurable origin restrictions
- **Input Validation**: Pydantic schema validation
- **SQL Injection Protection**: SQLAlchemy ORM

## AI Integration

The backend integrates with Google Gemini AI for:
- Intelligent chatbot responses
- Medical record analysis
- Medication reminders
- Appointment summaries
- Follow-up suggestions

## Development

### Database Migrations
```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migration
alembic upgrade head
```

### Testing
```bash
pytest
```

### Code Quality
```bash
# Format code
black .

# Lint code
flake8 .
```

## Production Deployment

1. **Database**: Use PostgreSQL in production
2. **Environment**: Set proper environment variables
3. **Security**: Use strong secret keys and HTTPS
4. **Monitoring**: Add logging and monitoring
5. **Scaling**: Use ASGI server like Gunicorn

## Integration with React Native App

The backend provides RESTful APIs that the React Native app can consume:

1. **Authentication**: Login/register users
2. **Data Sync**: Sync appointments, records, medications
3. **Real-time Updates**: WebSocket support for live updates
4. **File Upload**: Handle medical document uploads
5. **AI Chat**: Power the chatbot with backend AI

## Health & Safety

- **HIPAA Compliance**: Designed with healthcare data protection in mind
- **Data Encryption**: Sensitive data encrypted at rest
- **Audit Logging**: Track all data access and modifications
- **Access Control**: Role-based permissions system

## Support

For issues or questions:
1. Check the API documentation at `/docs`
2. Review the logs for error details
3. Ensure all environment variables are set correctly
4. Verify database connection and permissions

