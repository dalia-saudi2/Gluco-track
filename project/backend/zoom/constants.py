"""Zoom API constants."""

ZOOM_API_BASE_URL = "https://api.zoom.us/v2"
ZOOM_AUTHORIZE_URL = "https://zoom.us/oauth/authorize"
ZOOM_TOKEN_URL = "https://zoom.us/oauth/token"
ZOOM_REVOKE_URL = "https://zoom.us/oauth/revoke"

# User-managed OAuth scopes for creating and reading meetings.
ZOOM_OAUTH_SCOPES = "user:read meeting:write:meeting meeting:read:meeting"

DEFAULT_CONSULTATION_TOPIC = "Medical Consultation"
DEFAULT_CONSULTATION_DURATION_MIN = 30
