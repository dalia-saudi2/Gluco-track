import { apiClient } from '../config/api';
import type { CallDoctorResult, ZoomOAuthStatus } from '../types/zoom';

export async function getZoomOAuthStatus(): Promise<ZoomOAuthStatus> {
  return apiClient.getZoomOAuthStatus();
}

export async function getZoomAuthorizeUrl(): Promise<{ authorize_url: string }> {
  return apiClient.getZoomAuthorizeUrl();
}

export async function callDoctor(): Promise<CallDoctorResult> {
  return apiClient.callDoctorZoom();
}

export async function disconnectZoom(): Promise<void> {
  await apiClient.disconnectZoomOAuth();
}
