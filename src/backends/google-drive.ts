/**
 * Google Drive Backend
 * 
 * Handles Google Drive API authentication and client creation
 */

import { google, drive_v3 } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getTokenStore } from "../oauth/token-store.js";

/**
 * User credentials interface
 */
export interface UserCredentials {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expiry_date: number;
}

/**
 * Get authenticated Google Drive client for a user
 * 
 * @param userId - User ID (from MCP context or email)
 * @returns Authenticated Drive client
 */
export async function getAuthenticatedDriveClient(
  userId: string
): Promise<drive_v3.Drive> {
  const credentials = await getUserCredentials(userId);
  
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  
  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token,
    scope: credentials.scope,
    token_type: credentials.token_type,
    expiry_date: credentials.expiry_date,
  });
  
  // Auto-refresh token if expired
  if (credentials.expiry_date && credentials.expiry_date < Date.now()) {
    const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
    
    if (newCredentials.access_token && newCredentials.refresh_token) {
      await saveUserCredentials(userId, {
        access_token: newCredentials.access_token,
        refresh_token: newCredentials.refresh_token,
        scope: newCredentials.scope || credentials.scope,
        token_type: newCredentials.token_type || credentials.token_type,
        expiry_date: newCredentials.expiry_date || Date.now() + 3600000,
      });
      
      oauth2Client.setCredentials(newCredentials);
    }
  }
  
  return google.drive({ version: "v3", auth: oauth2Client });
}

/**
 * Get user credentials from storage
 */
async function getUserCredentials(userId: string): Promise<UserCredentials> {
  const tokenStore = getTokenStore();
  const stored = tokenStore.getCredentials(userId);
  
  if (!stored) {
    throw new Error(
      `User not authenticated. Please connect Google Drive at ${process.env.DASHBOARD_URL || 'http://localhost:3000/dashboard'}`
    );
  }
  
  return {
    access_token: stored.accessToken,
    refresh_token: stored.refreshToken,
    scope: stored.scope,
    token_type: stored.tokenType,
    expiry_date: stored.expiryDate,
  };
}

/**
 * Save user credentials to storage
 */
async function saveUserCredentials(
  userId: string,
  credentials: UserCredentials
): Promise<void> {
  const tokenStore = getTokenStore();
  tokenStore.saveCredentials(userId, {
    accessToken: credentials.access_token,
    refreshToken: credentials.refresh_token,
    scope: credentials.scope,
    tokenType: credentials.token_type,
    expiryDate: credentials.expiry_date,
  });
}

/**
 * Revoke user credentials (logout)
 */
export async function revokeUserCredentials(userId: string): Promise<void> {
  try {
    const credentials = await getUserCredentials(userId);
    const oauth2Client = new OAuth2Client(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    
    oauth2Client.setCredentials(credentials);
    await oauth2Client.revokeCredentials();
  } catch (error) {
    // Ignore errors if credentials don't exist
    console.error("Error revoking credentials:", error);
  }
  
  const tokenStore = getTokenStore();
  tokenStore.deleteCredentials(userId);
}
