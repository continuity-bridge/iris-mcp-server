/**
 * Token Storage Layer
 * 
 * SQLite-based storage for OAuth tokens
 * Easy to swap out for PostgreSQL/etc later
 */

import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface StoredCredentials {
  userId: string;
  accessToken: string;
  refreshToken: string;
  scope: string;
  tokenType: string;
  expiryDate: number;
  createdAt: number;
  updatedAt: number;
}

class TokenStore {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const defaultPath = path.join(__dirname, "../../data/tokens.db");
    this.db = new Database(dbPath || defaultPath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_tokens (
        user_id TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT NOT NULL,
        scope TEXT NOT NULL,
        token_type TEXT NOT NULL,
        expiry_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
  }

  /**
   * Save or update user credentials
   */
  saveCredentials(userId: string, credentials: {
    accessToken: string;
    refreshToken: string;
    scope: string;
    tokenType: string;
    expiryDate: number;
  }): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO user_tokens (
        user_id, access_token, refresh_token, scope, token_type, expiry_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        access_token = excluded.access_token,
        refresh_token = excluded.refresh_token,
        scope = excluded.scope,
        token_type = excluded.token_type,
        expiry_date = excluded.expiry_date,
        updated_at = excluded.updated_at
    `);

    stmt.run(
      userId,
      credentials.accessToken,
      credentials.refreshToken,
      credentials.scope,
      credentials.tokenType,
      credentials.expiryDate,
      now,
      now
    );
  }

  /**
   * Get user credentials
   */
  getCredentials(userId: string): StoredCredentials | null {
    const stmt = this.db.prepare(`
      SELECT 
        user_id as userId,
        access_token as accessToken,
        refresh_token as refreshToken,
        scope,
        token_type as tokenType,
        expiry_date as expiryDate,
        created_at as createdAt,
        updated_at as updatedAt
      FROM user_tokens
      WHERE user_id = ?
    `);

    return stmt.get(userId) as StoredCredentials | null;
  }

  /**
   * Delete user credentials (logout)
   */
  deleteCredentials(userId: string): void {
    const stmt = this.db.prepare(`
      DELETE FROM user_tokens WHERE user_id = ?
    `);
    stmt.run(userId);
  }

  /**
   * Check if user has credentials
   */
  hasCredentials(userId: string): boolean {
    const stmt = this.db.prepare(`
      SELECT 1 FROM user_tokens WHERE user_id = ? LIMIT 1
    `);
    return stmt.get(userId) !== undefined;
  }

  /**
   * List all users with tokens (for admin)
   */
  listUsers(): string[] {
    const stmt = this.db.prepare(`
      SELECT user_id FROM user_tokens ORDER BY created_at DESC
    `);
    const rows = stmt.all() as Array<{ user_id: string }>;
    return rows.map(row => row.user_id);
  }

  close() {
    this.db.close();
  }
}

// Singleton instance
let instance: TokenStore | null = null;

export function getTokenStore(): TokenStore {
  if (!instance) {
    instance = new TokenStore();
  }
  return instance;
}

export function closeTokenStore() {
  if (instance) {
    instance.close();
    instance = null;
  }
}
