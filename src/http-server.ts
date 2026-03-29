/**
 * Iris HTTP Server - Browser Mode
 * 
 * Exposes Iris MCP tools via HTTP REST API for browser-based claude.ai access.
 * Uses CORS origin validation (only claude.ai can connect).
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Readable } from 'stream';
import { getAuthenticatedDriveClient } from './backends/google-drive.js';
import {
  resolvePath,
  ensureParentFolders,
  getFileName,
  getParentPath,
  listFilesAtPath,
  findFileByName,
} from './utils/drive-paths.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.HTTP_PORT || 3001;

// Session config
interface ClaudeSession {
  organization_id: string;
  cookie_string: string;
  user_email?: string;
}

function loadSessionConfig(): ClaudeSession | null {
  try {
    const instanceHome = process.env.INSTANCE_HOME || process.env.CLAUDE_HOME || path.join(process.env.HOME || '', '.claude');
    const configPath = path.join(instanceHome, 'config', 'iris-browser-session.json');
    
    if (!fs.existsSync(configPath)) {
      console.error('No browser session configured. Run: npm run setup:browser');
      return null;
    }
    
    const data = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Failed to load session config:', error);
    return null;
  }
}

// Middleware
app.use(cors({
  origin: ['https://claude.ai', 'http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' })); // Support larger file uploads

// Load session config
const sessionConfig = loadSessionConfig();

// Auth middleware - just check session is configured
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  
  if (!sessionConfig) {
    return res.status(503).json({
      error: 'Browser session not configured',
      setup: 'Run: npm run setup:browser'
    });
  }
  
  next();
});

// Helper to get user email
function getUserEmail(): string {
  return sessionConfig?.user_email || process.env.DEFAULT_USER_EMAIL || 'default';
}

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'iris-http',
    mode: 'browser',
    version: '0.2.0',
    session_configured: !!sessionConfig
  });
});

// ============================================================================
// DRIVE ENDPOINTS
// ============================================================================

/**
 * POST /api/drive/write
 * Create or update a file
 */
app.post('/api/drive/write', async (req, res) => {
  try {
    const { path: drivePath, content, mimeType = 'text/plain', mode = 'upsert' } = req.body;
    
    if (!drivePath || content === undefined) {
      return res.status(400).json({ error: 'path and content required' });
    }
    
    const drive = await getAuthenticatedDriveClient(getUserEmail());
    const fileId = await resolvePath(drivePath, drive);
    
    if (mode === 'create' && fileId) {
      return res.status(409).json({
        error: `File already exists at '${drivePath}'`,
        hint: 'Use mode=update or mode=upsert'
      });
    }
    
    if (mode === 'update' && !fileId) {
      return res.status(404).json({
        error: `File not found at '${drivePath}'`,
        hint: 'Use mode=create or mode=upsert'
      });
    }
    
    let result;
    if (fileId) {
      // Update existing
      const stream = Readable.from([content]);
      result = await drive.files.update({
        fileId,
        media: { mimeType, body: stream },
        fields: 'id, name, webViewLink, modifiedTime'
      });
    } else {
      // Create new
      const parentId = await ensureParentFolders(drivePath, drive);
      const stream = Readable.from([content]);
      
      result = await drive.files.create({
        requestBody: {
          name: getFileName(drivePath),
          parents: [parentId],
          mimeType
        },
        media: { mimeType, body: stream },
        fields: 'id, name, webViewLink, createdTime'
      });
    }
    
    res.json({
      success: true,
      fileId: result.data.id,
      webViewLink: result.data.webViewLink,
      created: !fileId,
      updated: !!fileId,
      path: drivePath
    });
    
  } catch (error) {
    console.error('Drive write error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/drive/read?path=...&asText=true
 * Read a file
 */
app.get('/api/drive/read', async (req, res) => {
  try {
    const { path: drivePath, asText = 'true' } = req.query;
    
    if (!drivePath) {
      return res.status(400).json({ error: 'path required' });
    }
    
    const drive = await getAuthenticatedDriveClient(getUserEmail());
    const fileId = await resolvePath(drivePath as string, drive);
    
    if (!fileId) {
      return res.status(404).json({ error: `File not found: ${drivePath}` });
    }
    
    const metadata = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size, modifiedTime'
    });
    
    const response = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );
    
    const chunks: Buffer[] = [];
    for await (const chunk of response.data) {
      chunks.push(Buffer.from(chunk));
    }
    const buffer = Buffer.concat(chunks);
    
    const content = asText === 'true' ? buffer.toString('utf-8') : buffer.toString('base64');
    
    res.json({
      content,
      fileId: metadata.data.id,
      mimeType: metadata.data.mimeType,
      size: metadata.data.size ? parseInt(metadata.data.size) : 0,
      modifiedTime: metadata.data.modifiedTime
    });
    
  } catch (error) {
    console.error('Drive read error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /api/drive/list?path=...&recursive=false&type=both
 * List files/folders
 */
app.get('/api/drive/list', async (req, res) => {
  try {
    const { path: drivePath = '', recursive = 'false', type = 'both' } = req.query;
    
    const drive = await getAuthenticatedDriveClient(getUserEmail());
    const items = await listFilesAtPath(
      drivePath as string,
      drive,
      recursive === 'true',
      type as ('files' | 'folders' | 'both')
    );
    
    res.json({
      path: drivePath,
      items,
      totalCount: items.length
    });
    
  } catch (error) {
    console.error('Drive list error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/drive/create-folder
 * Create a folder (and parents if needed)
 */
app.post('/api/drive/create-folder', async (req, res) => {
  try {
    const { path: drivePath } = req.body;
    
    if (!drivePath) {
      return res.status(400).json({ error: 'path required' });
    }
    
    const drive = await getAuthenticatedDriveClient(getUserEmail());
    const parts = drivePath.split('/').filter(Boolean);
    let parentId = 'root';
    const created: string[] = [];
    const existed: string[] = [];
    
    for (const part of parts) {
      let folder = await findFileByName(part, parentId, drive, true);
      
      if (folder) {
        existed.push(part);
        parentId = folder.id!;
      } else {
        const response = await drive.files.create({
          requestBody: {
            name: part,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [parentId]
          },
          fields: 'id, webViewLink'
        });
        created.push(part);
        parentId = response.data.id!;
      }
    }
    
    const finalFolder = await drive.files.get({
      fileId: parentId,
      fields: 'webViewLink'
    });
    
    res.json({
      success: true,
      folderId: parentId,
      webViewLink: finalFolder.data.webViewLink,
      created,
      existed
    });
    
  } catch (error) {
    console.error('Drive create-folder error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /api/drive/move
 * Move or rename a file/folder
 */
app.post('/api/drive/move', async (req, res) => {
  try {
    const { sourcePath, destinationPath } = req.body;
    
    if (!sourcePath || !destinationPath) {
      return res.status(400).json({ error: 'sourcePath and destinationPath required' });
    }
    
    const drive = await getAuthenticatedDriveClient(getUserEmail());
    const fileId = await resolvePath(sourcePath, drive);
    
    if (!fileId) {
      return res.status(404).json({ error: `Source not found: ${sourcePath}` });
    }
    
    const newName = getFileName(destinationPath);
    const newParentPath = getParentPath(destinationPath);
    const newParentId = newParentPath
      ? await ensureParentFolders(destinationPath, drive)
      : 'root';
    
    const file = await drive.files.get({ fileId, fields: 'parents' });
    const previousParents = file.data.parents?.join(',') || '';
    
    const result = await drive.files.update({
      fileId,
      addParents: newParentId,
      removeParents: previousParents,
      requestBody: { name: newName },
      fields: 'id, name, webViewLink'
    });
    
    res.json({
      success: true,
      fileId: result.data.id,
      newPath: destinationPath,
      webViewLink: result.data.webViewLink
    });
    
  } catch (error) {
    console.error('Drive move error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * DELETE /api/drive/delete
 * Delete a file or folder
 */
app.delete('/api/drive/delete', async (req, res) => {
  try {
    const { path: drivePath, confirm, permanent = false } = req.body;
    
    if (!drivePath) {
      return res.status(400).json({ error: 'path required' });
    }
    
    if (!confirm) {
      return res.status(400).json({
        error: 'Deletion not confirmed',
        hint: 'Set confirm=true to proceed'
      });
    }
    
    const drive = await getAuthenticatedDriveClient(getUserEmail());
    const fileId = await resolvePath(drivePath, drive);
    
    if (!fileId) {
      return res.status(404).json({ error: `File not found: ${drivePath}` });
    }
    
    if (permanent) {
      await drive.files.delete({ fileId });
    } else {
      await drive.files.update({
        fileId,
        requestBody: { trashed: true }
      });
    }
    
    res.json({
      success: true,
      path: drivePath,
      deleted: true,
      permanent
    });
    
  } catch (error) {
    console.error('Drive delete error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🌈 Iris HTTP Server (Browser Mode) v0.2.0\n`);
  console.log(`Running at: http://localhost:${PORT}\n`);
  console.log(`Session configured: ${!!sessionConfig ? '✓' : '✗'}`);
  if (sessionConfig) {
    console.log(`  Organization: ${sessionConfig.organization_id.substring(0, 8)}...`);
    console.log(`  User: ${sessionConfig.user_email || 'Not set'}\n`);
  } else {
    console.log(`\n⚠️  No session configured. Run: npm run setup:browser\n`);
  }
  console.log(`Security:`);
  console.log(`  - CORS: claude.ai, localhost:3000, localhost:3001`);
  console.log(`  - Auth: Stored session (httpOnly cookie workaround)\n`);
  console.log(`Endpoints:`);
  console.log(`  POST   /api/drive/write`);
  console.log(`  GET    /api/drive/read`);
  console.log(`  GET    /api/drive/list`);
  console.log(`  POST   /api/drive/create-folder`);
  console.log(`  POST   /api/drive/move`);
  console.log(`  DELETE /api/drive/delete`);
  console.log(`  GET    /health\n`);
  console.log(`Ready for browser testing! 🚀\n`);
});

export default app;
