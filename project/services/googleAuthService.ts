import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete the auth session for better UX
WebBrowser.maybeCompleteAuthSession();

// Google OAuth Configuration
const discovery = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

// For development, you can use a client ID from Google Cloud Console
// In production, this should be in environment variables
// Get your client ID from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '';

// For Expo Go, we need to use a different approach
// For standalone apps, configure the client ID in app.json

export interface GoogleAuthResult {
  idToken: string;
  accessToken?: string;
  user?: {
    email: string;
    name: string;
    picture?: string;
  };
}

class GoogleAuthService {
  private request: AuthSession.AuthRequest | null = null;

  /**
   * Get the redirect URI that should be configured in Google Cloud Console
   */
  getRedirectUri(): string {
    const isWeb = Platform.OS === 'web';
    return AuthSession.makeRedirectUri({
      scheme: isWeb ? undefined : 'exp',
      path: 'oauth',
    });
  }

  /**
   * Check if Google Sign-In is properly configured
   */
  isConfigured(): boolean {
    return !!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID' && GOOGLE_CLIENT_ID !== '');
  }

  /**
   * Initialize Google Sign-In
   * Returns an ID token that can be sent to the backend
   */
  async signIn(): Promise<GoogleAuthResult> {
    try {
      // Check if client ID is configured
      if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID' || GOOGLE_CLIENT_ID === '') {
        throw new Error(
          'Google Client ID is not configured. Please set EXPO_PUBLIC_GOOGLE_CLIENT_ID in your .env file or configure it in googleAuthService.ts. See GOOGLE_SIGNIN_SETUP.md for instructions.'
        );
      }

      // Configure redirect URI based on platform
      const isWeb = Platform.OS === 'web';
      const redirectUri = this.getRedirectUri();

      console.log('Google OAuth - Platform:', Platform.OS);
      console.log('Google OAuth - Redirect URI:', redirectUri);
      console.log('Google OAuth - Client ID configured:', this.isConfigured());

      // For web, we'll use the implicit flow with id_token
      // For mobile, we also use id_token
      const responseType = AuthSession.ResponseType.IdToken;

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID,
        scopes: ['openid', 'profile', 'email'],
        responseType,
        redirectUri,
        extraParams: {},
      });

      this.request = request;

      // Start the authentication
      const result = await request.promptAsync(discovery, {
        showInRecents: true,
      });

      if (result.type === 'success') {
        // For web, we get a code that needs to be exchanged for a token
        // For mobile, we get the ID token directly
        let idToken: string | undefined;
        
        // Get ID token from result
        idToken = result.params.id_token;
        
        if (!idToken) {
          console.error('OAuth result params:', result.params);
          throw new Error(
            'No ID token received from Google. ' +
            'Make sure your redirect URI (' + redirectUri + ') is added to your Google OAuth client\'s authorized redirect URIs in Google Cloud Console.'
          );
        }

        // Decode the ID token to get user info (optional, for display)
        let userInfo;
        try {
          // ID token is a JWT, we can decode it to get user info
          // In React Native, we use atob for base64 decoding
          const base64Url = idToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join('')
          );
          const payload = JSON.parse(jsonPayload);
          userInfo = {
            email: payload.email,
            name: payload.name || payload.email?.split('@')[0] || 'User',
            picture: payload.picture,
          };
        } catch (e) {
          console.warn('Could not decode ID token:', e);
        }

        return {
          idToken,
          accessToken: result.params.access_token,
          user: userInfo,
        };
      } else if (result.type === 'error') {
        const errorMsg = result.error?.message || (result.error as any)?.error_description || 'Google Sign-In failed';
        console.error('Google OAuth error:', result.error);
        throw new Error(
          `Google Sign-In error: ${errorMsg}. ` +
          'Please check that your Google Client ID is correct and the redirect URI is configured in Google Cloud Console.'
        );
      } else {
        throw new Error('Google Sign-In was cancelled');
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      // Don't wrap the error if it already has a helpful message
      if (error.message && (error.message.includes('not configured') || error.message.includes('redirect URI'))) {
        throw error;
      }
      throw new Error(error?.message || 'Failed to sign in with Google. Please check your configuration.');
    }
  }

  /**
   * Alternative method using a simpler web-based approach
   * This opens Google's OAuth page in a web browser
   */
  async signInWithWeb(): Promise<GoogleAuthResult> {
    try {
      const redirectUri = AuthSession.makeRedirectUri();

      const request = new AuthSession.AuthRequest({
        clientId: GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
        scopes: ['openid', 'profile', 'email'],
        responseType: AuthSession.ResponseType.IdToken,
        redirectUri,
      });

      const result = await request.promptAsync(discovery, {
        showInRecents: true,
      });

      if (result.type === 'success' && result.params.id_token) {
        return {
          idToken: result.params.id_token,
          accessToken: result.params.access_token,
        };
      } else {
        throw new Error('Google Sign-In failed or was cancelled');
      }
    } catch (error: any) {
      console.error('Google Sign-In error:', error);
      throw new Error(error?.message || 'Failed to sign in with Google');
    }
  }
}

export const googleAuthService = new GoogleAuthService();

