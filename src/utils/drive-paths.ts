/**
 * Google Drive Path Resolution Utilities
 * 
 * Handles converting simple paths like "corvids/poe/memory.md"
 * to Google Drive file IDs
 */

import { drive_v3 } from "googleapis";

/**
 * Resolve a path to a Google Drive file ID
 * 
 * @param path - Path like "corvids/poe/memory.md"
 * @param drive - Authenticated Drive client
 * @returns File ID or null if not found
 */
export async function resolvePath(
  path: string,
  drive: drive_v3.Drive
): Promise<string | null> {
  const parts = path.split("/").filter(Boolean);
  let parentId = "root";
  
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const isLastPart = i === parts.length - 1;
    
    const file = await findFileByName(part, parentId, drive, !isLastPart);
    
    if (!file) {
      return null;
    }
    
    parentId = file.id!;
  }
  
  return parentId;
}

/**
 * Find a file/folder by name within a parent
 * 
 * @param name - File or folder name
 * @param parentId - Parent folder ID
 * @param drive - Authenticated Drive client
 * @param foldersOnly - Only search for folders
 * @returns File metadata or null
 */
export async function findFileByName(
  name: string,
  parentId: string,
  drive: drive_v3.Drive,
  foldersOnly: boolean = false
): Promise<drive_v3.Schema$File | null> {
  const mimeTypeFilter = foldersOnly
    ? " and mimeType='application/vnd.google-apps.folder'"
    : "";
  
  const response = await drive.files.list({
    q: `name='${escapeName(name)}' and '${parentId}' in parents and trashed=false${mimeTypeFilter}`,
    fields: "files(id, name, mimeType)",
    spaces: "drive",
  });
  
  const files = response.data.files || [];
  return files.length > 0 ? files[0] : null;
}

/**
 * Ensure parent folders exist for a path
 * 
 * @param path - Path like "corvids/poe/memory.md"
 * @param drive - Authenticated Drive client
 * @returns Parent folder ID for the file
 */
export async function ensureParentFolders(
  path: string,
  drive: drive_v3.Drive
): Promise<string> {
  const parts = path.split("/").filter(Boolean);
  const folderParts = parts.slice(0, -1); // Remove filename
  
  let parentId = "root";
  
  for (const part of folderParts) {
    let folder = await findFileByName(part, parentId, drive, true);
    
    if (!folder) {
      // Create folder
      const response = await drive.files.create({
        requestBody: {
          name: part,
          mimeType: "application/vnd.google-apps.folder",
          parents: [parentId],
        },
        fields: "id",
      });
      
      folder = response.data;
    }
    
    parentId = folder.id!;
  }
  
  return parentId;
}

/**
 * Get filename from path
 */
export function getFileName(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

/**
 * Get parent path from path
 */
export function getParentPath(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts.slice(0, -1).join("/");
}

/**
 * Escape single quotes in file names for Drive queries
 */
function escapeName(name: string): string {
  return name.replace(/'/g, "\\'");
}

/**
 * List files in a path
 */
export async function listFilesAtPath(
  path: string,
  drive: drive_v3.Drive,
  recursive: boolean = false,
  type: "files" | "folders" | "both" = "both"
): Promise<Array<{
  name: string;
  path: string;
  type: "file" | "folder";
  size?: number;
  modifiedTime?: string;
  id: string;
}>> {
  const parentId = path ? await resolvePath(path, drive) : "root";
  
  if (!parentId) {
    throw new Error(`Path not found: ${path}`);
  }
  
  let query = `'${parentId}' in parents and trashed=false`;
  
  if (type === "files") {
    query += " and mimeType!='application/vnd.google-apps.folder'";
  } else if (type === "folders") {
    query += " and mimeType='application/vnd.google-apps.folder'";
  }
  
  const response = await drive.files.list({
    q: query,
    fields: "files(id, name, mimeType, size, modifiedTime)",
    spaces: "drive",
  });
  
  const files = response.data.files || [];
  const results: Array<any> = [];
  
  for (const file of files) {
    const isFolder = file.mimeType === "application/vnd.google-apps.folder";
    const filePath = path ? `${path}/${file.name}` : file.name!;
    
    results.push({
      name: file.name!,
      path: filePath,
      type: isFolder ? "folder" : "file",
      size: file.size ? parseInt(file.size) : undefined,
      modifiedTime: file.modifiedTime,
      id: file.id!,
    });
    
    // Recursive listing
    if (recursive && isFolder) {
      const children = await listFilesAtPath(filePath, drive, true, type);
      results.push(...children);
    }
  }
  
  return results;
}
