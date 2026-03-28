/**
 * OAuth Dashboard Routes
 * 
 * Simple HTML dashboard for managing OAuth connections
 */

import { Router, Request, Response } from "express";
import { getTokenStore } from "./token-store.js";

const router = Router();

/**
 * Dashboard home
 * GET /dashboard
 */
router.get("/", (req: Request, res: Response) => {
  const tokenStore = getTokenStore();
  const users = tokenStore.listUsers();

  const userRows = users.map(userId => {
    const creds = tokenStore.getCredentials(userId);
    const isExpired = creds ? creds.expiryDate < Date.now() : false;
    const createdDate = creds ? new Date(creds.createdAt).toLocaleString() : "Unknown";
    
    return `
      <tr>
        <td>${userId}</td>
        <td>
          <span class="status ${isExpired ? 'expired' : 'active'}">
            ${isExpired ? 'Expired' : 'Active'}
          </span>
        </td>
        <td>${createdDate}</td>
        <td>
          <button onclick="revokeAccess('${userId}')" class="btn-danger">
            Disconnect
          </button>
        </td>
      </tr>
    `;
  }).join('');

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Iris OAuth Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background: #f5f7fa;
            padding: 20px;
          }

          .container {
            max-width: 1000px;
            margin: 0 auto;
          }

          header {
            background: white;
            padding: 30px;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            margin-bottom: 30px;
          }

          h1 {
            color: #1a1a1a;
            font-size: 28px;
            margin-bottom: 10px;
          }

          .subtitle {
            color: #666;
            font-size: 14px;
          }

          .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            padding: 30px;
            margin-bottom: 20px;
          }

          h2 {
            font-size: 20px;
            margin-bottom: 20px;
            color: #1a1a1a;
          }

          .btn {
            display: inline-block;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            text-decoration: none;
            cursor: pointer;
            border: none;
            transition: all 0.2s;
          }

          .btn-primary {
            background: #1976d2;
            color: white;
          }

          .btn-primary:hover {
            background: #1565c0;
          }

          .btn-danger {
            background: #d32f2f;
            color: white;
            font-size: 12px;
            padding: 8px 16px;
          }

          .btn-danger:hover {
            background: #c62828;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            text-align: left;
            padding: 12px;
            background: #f5f7fa;
            color: #666;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }

          td {
            padding: 16px 12px;
            border-bottom: 1px solid #e0e0e0;
          }

          tr:last-child td {
            border-bottom: none;
          }

          .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
          }

          .status.active {
            background: #e8f5e9;
            color: #2e7d32;
          }

          .status.expired {
            background: #fff3e0;
            color: #f57c00;
          }

          .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: #666;
          }

          .empty-state svg {
            width: 80px;
            height: 80px;
            margin-bottom: 20px;
            opacity: 0.3;
          }

          .info-box {
            background: #e3f2fd;
            border-left: 4px solid #1976d2;
            padding: 16px;
            border-radius: 4px;
            margin-bottom: 20px;
          }

          .info-box p {
            color: #1565c0;
            font-size: 14px;
            line-height: 1.6;
          }

          @media (max-width: 768px) {
            .container {
              padding: 0;
            }

            header, .card {
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <header>
            <h1>🌈 Iris OAuth Dashboard</h1>
            <p class="subtitle">Manage Google Drive connections for Iris MCP Server</p>
          </header>

          <div class="card">
            <div class="info-box">
              <p>
                <strong>Getting Started:</strong> Connect your Google account to enable 
                Google Drive file operations through Iris MCP Server. Your tokens are stored 
                securely and only used for authorized Drive operations.
              </p>
            </div>

            <a href="/oauth/authorize" class="btn btn-primary">
              + Connect Google Drive
            </a>
          </div>

          <div class="card">
            <h2>Connected Accounts</h2>
            ${users.length > 0 ? `
              <table>
                <thead>
                  <tr>
                    <th>Account</th>
                    <th>Status</th>
                    <th>Connected</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${userRows}
                </tbody>
              </table>
            ` : `
              <div class="empty-state">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/>
                </svg>
                <p>No accounts connected yet</p>
              </div>
            `}
          </div>
        </div>

        <script>
          async function revokeAccess(userId) {
            if (!confirm(\`Disconnect account: \${userId}?\`)) return;

            try {
              const response = await fetch('/oauth/revoke', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId })
              });

              if (response.ok) {
                window.location.reload();
              } else {
                const error = await response.json();
                alert('Error: ' + error.error);
              }
            } catch (error) {
              alert('Error disconnecting account');
              console.error(error);
            }
          }
        </script>
      </body>
    </html>
  `);
});

export default router;
