/**
 * OAuth Flow Routes
 * 
 * Handles Google OAuth 2.0 authorization flow
 */

import { Router, Request, Response } from "express";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import { getTokenStore } from "./token-store.js";

const router = Router();

// OAuth2 client
function getOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/oauth/callback"
  );
}

/**
 * Step 1: Initiate OAuth flow
 * GET /oauth/authorize
 */
router.get("/authorize", (req: Request, res: Response) => {
  const oauth2Client = getOAuth2Client();

  // Generate authorization URL
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline", // Get refresh token
    scope: [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/drive.readonly",
      "https://www.googleapis.com/auth/userinfo.profile",
      "https://www.googleapis.com/auth/userinfo.email",
    ],
    prompt: "consent", // Force consent screen to get refresh token
  });

  res.redirect(authUrl);
});

/**
 * Step 2: OAuth callback
 * GET /oauth/callback?code=...
 */
router.get("/callback", async (req: Request, res: Response) => {
  const { code, error } = req.query;

  if (error) {
    return res.status(400).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Failed</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Authorization Failed</h2>
            <p>Error: ${error}</p>
            <a href="/dashboard">Return to Dashboard</a>
          </div>
        </body>
      </html>
    `);
  }

  if (!code || typeof code !== "string") {
    return res.status(400).send("Missing authorization code");
  }

  try {
    const oauth2Client = getOAuth2Client();
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code);
    
    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error("Failed to obtain tokens");
    }

    // Get user info to create userId
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();
    
    const userId = userInfo.data.email || userInfo.data.id || "default";

    // Store tokens
    const tokenStore = getTokenStore();
    tokenStore.saveCredentials(userId, {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scope: tokens.scope || "",
      tokenType: tokens.token_type || "Bearer",
      expiryDate: tokens.expiry_date || Date.now() + 3600000,
    });

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Successful</title>
          <style>
            body { 
              font-family: system-ui; 
              max-width: 600px; 
              margin: 50px auto; 
              padding: 20px; 
            }
            .success { 
              color: #2e7d32; 
              background: #e8f5e9; 
              padding: 20px; 
              border-radius: 8px; 
            }
            .info {
              margin-top: 20px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 4px;
            }
            a {
              display: inline-block;
              margin-top: 15px;
              padding: 10px 20px;
              background: #1976d2;
              color: white;
              text-decoration: none;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="success">
            <h2>✓ Authorization Successful!</h2>
            <p>Your Google Drive account has been connected.</p>
            <div class="info">
              <strong>Account:</strong> ${userId}
            </div>
            <a href="/dashboard">Go to Dashboard</a>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error("OAuth callback error:", error);
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Authorization Error</title>
          <style>
            body { font-family: system-ui; max-width: 600px; margin: 50px auto; padding: 20px; }
            .error { color: #d32f2f; background: #ffebee; padding: 20px; border-radius: 8px; }
          </style>
        </head>
        <body>
          <div class="error">
            <h2>Authorization Error</h2>
            <p>${error instanceof Error ? error.message : "Unknown error"}</p>
            <a href="/dashboard">Return to Dashboard</a>
          </div>
        </body>
      </html>
    `);
  }
});

/**
 * Revoke authorization (logout)
 * POST /oauth/revoke
 */
router.post("/revoke", async (req: Request, res: Response) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: "Missing userId" });
  }

  try {
    const tokenStore = getTokenStore();
    const credentials = tokenStore.getCredentials(userId);

    if (credentials) {
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials({
        access_token: credentials.accessToken,
        refresh_token: credentials.refreshToken,
      });
      
      await oauth2Client.revokeCredentials();
    }

    tokenStore.deleteCredentials(userId);

    res.json({ success: true, message: "Authorization revoked" });
  } catch (error) {
    console.error("Revoke error:", error);
    res.status(500).json({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    });
  }
});

export default router;
