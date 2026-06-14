# How to Test Backend Endpoints

## Method 1: FastAPI Swagger UI (Easiest)

1. Make sure your backend is running:
   ```bash
   cd backend
   python run.py
   ```

2. Open your browser and go to:
   ```
   http://localhost:8000/docs
   ```

3. You'll see an interactive API documentation where you can:
   - See all available endpoints
   - Test endpoints directly
   - See request/response formats
   - Authenticate using the "Authorize" button

## Method 2: Using Browser (Simple GET requests)

For endpoints that don't require authentication or have public access:

```
http://localhost:8000/docs          # API Documentation
http://localhost:8000/redoc         # Alternative documentation
http://localhost:8000/              # Root endpoint (if exists)
```

**Note:** Most endpoints require authentication. Use Swagger UI for those.

## Method 3: Using curl (Command Line)

### Test Dashboard Endpoint (requires auth token):
```bash
# First, login to get a token
curl -X POST "http://localhost:8000/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=your_email@example.com&password=your_password"

# Then use the token to access dashboard
curl -X GET "http://localhost:8000/dashboard" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Appointments:
```bash
curl -X GET "http://localhost:8000/appointments" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Medical Records:
```bash
curl -X GET "http://localhost:8000/medical-records" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Medications:
```bash
curl -X GET "http://localhost:8000/medications" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Method 4: Using Postman or Insomnia

1. Download Postman: https://www.postman.com/downloads/
2. Create a new request
3. Set method (GET, POST, etc.)
4. Enter URL: `http://localhost:8000/dashboard`
5. In Headers, add:
   - Key: `Authorization`
   - Value: `Bearer YOUR_TOKEN_HERE`
6. Click Send

## Method 5: Check Backend Logs

When you run the backend, you'll see logs for each request:

```bash
INFO:     127.0.0.1:59727 - "GET /dashboard HTTP/1.1" 200 OK
```

This shows:
- IP address
- Endpoint accessed
- HTTP method
- Status code (200 = success, 404 = not found, 500 = server error)

## Quick Test Checklist

1. ✅ Backend is running (check terminal for "Uvicorn running on http://0.0.0.0:8000")
2. ✅ Open http://localhost:8000/docs in browser
3. ✅ Click "Authorize" button in Swagger UI
4. ✅ Enter your credentials to get a token
5. ✅ Try the `/dashboard` endpoint
6. ✅ Check the response data

## Common Issues

**Connection Refused:**
- Backend is not running
- Wrong port (should be 8000)
- Firewall blocking the connection

**401 Unauthorized:**
- Need to authenticate first
- Token expired
- Invalid credentials

**404 Not Found:**
- Wrong endpoint URL
- Endpoint doesn't exist
- Check the `/docs` page for correct paths

**500 Internal Server Error:**
- Check backend terminal for error messages
- Database connection issue
- Missing environment variables
