# OAuth Dashboard Setup

## Quick Start

### 1. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/oauth/callback`

### 2. Configure Environment

Create `.env` file:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3000/oauth/callback

# Optional
OAUTH_PORT=3000
DASHBOARD_URL=http://localhost:3000/dashboard
```

### 3. Build and Run

```bash
# Install dependencies (if not already)
npm install

# Build TypeScript
npm run build

# Start OAuth server
npm run oauth

# Or for development (rebuild + start)
npm run dev:oauth
```

### 4. Connect Your Account

1. Open http://localhost:3000/dashboard
2. Click "Connect Google Drive"
3. Authorize the application
4. Done! Your MCP server can now access Google Drive

## Architecture

```
┌─────────────────┐
│  OAuth Server   │  Port 3000 (Express)
│                 │
│  /dashboard     │  ← UI for managing connections
│  /oauth/...     │  ← OAuth flow endpoints
└─────────────────┘
        │
        ↓
┌─────────────────┐
│  Token Store    │  SQLite (data/tokens.db)
│                 │
│  - User tokens  │  ← Encrypted credentials
│  - Auto-refresh │  ← Token refresh handling
└─────────────────┘
        │
        ↓
┌─────────────────┐
│   MCP Server    │  Stdio (runs separately)
│                 │
│  Google Drive   │  ← Uses stored tokens
│  Tools          │  ← 6 core tools
└─────────────────┘
```

## Security Notes

- Tokens stored in SQLite at `data/tokens.db`
- Database file is gitignored
- Refresh tokens enable persistent access
- Revocation supported via dashboard

## Usage

Once connected, your MCP server tools will automatically use the stored credentials.

Example MCP call:
```typescript
{
  "tool": "gdrive_search",
  "params": {
    "query": "my-file.txt"
  }
}
```

The backend will:
1. Look up stored credentials for the user
2. Auto-refresh if expired
3. Execute the Google Drive API call
4. Return results

## Troubleshooting

**"User not authenticated" error:**
- Connect your account via the dashboard first
- Check that `.env` has correct credentials
- Verify redirect URI matches Google Cloud Console

**Token expired:**
- Tokens auto-refresh
- If refresh fails, disconnect and reconnect via dashboard

**Can't access dashboard:**
- Check OAuth server is running (`npm run oauth`)
- Verify port 3000 is available
- Check console for any startup errors

## Next Steps

- [ ] Add user selection in MCP calls (currently uses first user)
- [ ] Implement encryption for stored tokens
- [ ] Add token expiry monitoring/alerts
- [ ] Support multiple OAuth providers (Notion, etc.)
