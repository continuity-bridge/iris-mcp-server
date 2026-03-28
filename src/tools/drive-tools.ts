/**
 * Google Drive Tools for Iris MCP Server
 * 
 * Implements all 6 Google Drive tools:
 * - iris_drive_write
 * - iris_drive_read
 * - iris_drive_create_folder
 * - iris_drive_list
 * - iris_drive_move
 * - iris_drive_delete
 */

import { Readable } from "stream";
import { getAuthenticatedDriveClient } from "../backends/google-drive.js";
import {
  resolvePath,
  ensureParentFolders,
  getFileName,
  getParentPath,
  listFilesAtPath,
  findFileByName,
} from "../utils/drive-paths.js";

/**
 * Tool definitions for MCP SDK
 */
export const driveTools = [
  {
    name: "iris_drive_write",
    description: "Create or update a file in Google Drive. Creates parent folders if needed.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path where file should be saved (e.g., 'corvids/poe/memory.md')",
        },
        content: {
          type: "string",
          description: "File contents to write",
        },
        mimeType: {
          type: "string",
          description: "MIME type. Default: text/plain. Use text/markdown for .md, application/json for .json",
          default: "text/plain",
        },
        mode: {
          type: "string",
          enum: ["create", "update", "upsert"],
          description: "create: fail if exists, update: fail if doesn't exist, upsert: create or update",
          default: "upsert",
        },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "iris_drive_read",
    description: "Read a file from Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to file (e.g., 'corvids/poe/memory.md')",
        },
        asText: {
          type: "boolean",
          description: "Return as text (true) or base64 (false)",
          default: true,
        },
      },
      required: ["path"],
    },
  },
  {
    name: "iris_drive_create_folder",
    description: "Create a folder in Google Drive. Creates all parent folders if needed.",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Folder path to create (e.g., 'corvids/rook/health-tracking')",
        },
      },
      required: ["path"],
    },
  },
  {
    name: "iris_drive_list",
    description: "List files and folders in Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to list (e.g., 'corvids/poe'). Omit to list root.",
        },
        recursive: {
          type: "boolean",
          description: "List recursively (true) or just immediate children (false)",
          default: false,
        },
        type: {
          type: "string",
          enum: ["files", "folders", "both"],
          description: "Filter by type",
          default: "both",
        },
      },
    },
  },
  {
    name: "iris_drive_move",
    description: "Move or rename a file/folder in Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        sourcePath: {
          type: "string",
          description: "Current path of file/folder",
        },
        destinationPath: {
          type: "string",
          description: "New path for file/folder",
        },
      },
      required: ["sourcePath", "destinationPath"],
    },
  },
  {
    name: "iris_drive_delete",
    description: "Delete a file or folder from Google Drive",
    inputSchema: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Path to delete",
        },
        confirm: {
          type: "boolean",
          description: "Must be true to confirm deletion. Safety check.",
        },
        permanent: {
          type: "boolean",
          description: "Permanently delete (true) or move to trash (false)",
          default: false,
        },
      },
      required: ["path", "confirm"],
    },
  },
];

/**
 * Handle tool execution
 */
export async function handleDriveToolCall(
  name: string,
  args: Record<string, any>
): Promise<any> {
  // Default userId - in production this would come from MCP context
  const userId = process.env.DEFAULT_USER_EMAIL || "ohmytallest@gmail.com";
  
  try {
    const drive = await getAuthenticatedDriveClient(userId);
    
    switch (name) {
      case "iris_drive_write":
        return await handleWrite(drive, args);
      case "iris_drive_read":
        return await handleRead(drive, args);
      case "iris_drive_create_folder":
        return await handleCreateFolder(drive, args);
      case "iris_drive_list":
        return await handleList(drive, args);
      case "iris_drive_move":
        return await handleMove(drive, args);
      case "iris_drive_delete":
        return await handleDelete(drive, args);
      default:
        throw new Error(`Unknown Drive tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}

async function handleWrite(drive: any, args: any) {
  const { path, content, mimeType = "text/plain", mode = "upsert" } = args;
  
  const fileId = await resolvePath(path, drive);
  
  if (mode === "create" && fileId) {
    throw new Error(
      `File already exists at '${path}'. Use mode='update' to modify existing file or mode='upsert' to create or update.`
    );
  }
  
  if (mode === "update" && !fileId) {
    throw new Error(
      `File not found at '${path}'. Use mode='create' to create new file or mode='upsert' to create or update.`
    );
  }
  
  let result;
  if (fileId) {
    const stream = Readable.from([content]);
    result = await drive.files.update({
      fileId,
      media: {
        mimeType,
        body: stream,
      },
      fields: "id, name, webViewLink, modifiedTime",
    });
  } else {
    const parentId = await ensureParentFolders(path, drive);
    const stream = Readable.from([content]);
    
    result = await drive.files.create({
      requestBody: {
        name: getFileName(path),
        parents: [parentId],
        mimeType,
      },
      media: {
        mimeType,
        body: stream,
      },
      fields: "id, name, webViewLink, createdTime",
    });
  }
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            fileId: result.data.id,
            webViewLink: result.data.webViewLink,
            created: !fileId,
            updated: !!fileId,
            path,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleRead(drive: any, args: any) {
  const { path, asText = true } = args;
  
  const fileId = await resolvePath(path, drive);
  
  if (!fileId) {
    throw new Error(`File not found: ${path}`);
  }
  
  const metadata = await drive.files.get({
    fileId,
    fields: "id, name, mimeType, size, modifiedTime",
  });
  
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  
  const chunks: Buffer[] = [];
  for await (const chunk of response.data) {
    chunks.push(Buffer.from(chunk));
  }
  const buffer = Buffer.concat(chunks);
  
  const content = asText ? buffer.toString("utf-8") : buffer.toString("base64");
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            content,
            fileId: metadata.data.id,
            mimeType: metadata.data.mimeType,
            size: metadata.data.size ? parseInt(metadata.data.size) : 0,
            modifiedTime: metadata.data.modifiedTime,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleCreateFolder(drive: any, args: any) {
  const { path } = args;
  
  const parts = path.split("/").filter(Boolean);
  let parentId = "root";
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
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id, webViewLink",
      });
      created.push(part);
      parentId = response.data.id!;
    }
  }
  
  const finalFolder = await drive.files.get({
    fileId: parentId,
    fields: "webViewLink",
  });
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            folderId: parentId,
            webViewLink: finalFolder.data.webViewLink,
            created,
            existed,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleList(drive: any, args: any) {
  const { path = "", recursive = false, type = "both" } = args;
  
  const items = await listFilesAtPath(path, drive, recursive, type);
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            items,
            totalCount: items.length,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleMove(drive: any, args: any) {
  const { sourcePath, destinationPath } = args;
  
  const fileId = await resolvePath(sourcePath, drive);
  
  if (!fileId) {
    throw new Error(`Source not found: ${sourcePath}`);
  }
  
  const newName = getFileName(destinationPath);
  const newParentPath = getParentPath(destinationPath);
  const newParentId = newParentPath
    ? await ensureParentFolders(destinationPath, drive)
    : "root";
  
  const file = await drive.files.get({
    fileId,
    fields: "parents",
  });
  
  const previousParents = file.data.parents?.join(",") || "";
  
  const result = await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: previousParents,
    requestBody: {
      name: newName,
    },
    fields: "id, name, webViewLink",
  });
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            fileId: result.data.id,
            newPath: destinationPath,
            webViewLink: result.data.webViewLink,
          },
          null,
          2
        ),
      },
    ],
  };
}

async function handleDelete(drive: any, args: any) {
  const { path, confirm, permanent = false } = args;
  
  if (!confirm) {
    throw new Error("Deletion not confirmed. Set confirm=true to proceed.");
  }
  
  const fileId = await resolvePath(path, drive);
  
  if (!fileId) {
    throw new Error(`File not found: ${path}`);
  }
  
  if (permanent) {
    await drive.files.delete({ fileId });
  } else {
    await drive.files.update({
      fileId,
      requestBody: {
        trashed: true,
      },
    });
  }
  
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(
          {
            success: true,
            path,
            deleted: true,
            permanent,
          },
          null,
          2
        ),
      },
    ],
  };
}
