/**
 * Error handling utilities for Iris MCP Server
 * Provides actionable error messages that guide users toward solutions
 */

export class IrisError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly suggestion?: string
  ) {
    super(message);
    this.name = 'IrisError';
  }

  toJSON() {
    return {
      error: this.message,
      code: this.code,
      suggestion: this.suggestion,
    };
  }

  toString(): string {
    let msg = `Error: ${this.message}`;
    if (this.suggestion) {
      msg += `\n\nSuggestion: ${this.suggestion}`;
    }
    return msg;
  }
}

export class AuthenticationError extends IrisError {
  constructor(message: string) {
    super(
      message,
      'AUTH_ERROR',
      'Please reconnect Iris at https://iris.continuitybridge.io/dashboard'
    );
    this.name = 'AuthenticationError';
  }
}

export class FileNotFoundError extends IrisError {
  constructor(path: string, mode?: string) {
    const suggestion = mode === 'update' 
      ? `Use mode='create' to create new file or mode='upsert' to create or update.`
      : `Check that the path '${path}' is correct.`;
    
    super(
      `File not found at '${path}'`,
      'FILE_NOT_FOUND',
      suggestion
    );
    this.name = 'FileNotFoundError';
  }
}

export class FileExistsError extends IrisError {
  constructor(path: string) {
    super(
      `File already exists at '${path}'`,
      'FILE_EXISTS',
      `Use mode='update' to modify existing file or mode='upsert' to create or update.`
    );
    this.name = 'FileExistsError';
  }
}

export class InvalidPathError extends IrisError {
  constructor(path: string, reason: string) {
    super(
      `Invalid path '${path}': ${reason}`,
      'INVALID_PATH',
      'Check that the path uses forward slashes and contains no invalid characters.'
    );
    this.name = 'InvalidPathError';
  }
}

export function formatError(error: unknown): string {
  if (error instanceof IrisError) {
    return error.toString();
  }
  
  if (error instanceof Error) {
    return `Error: ${error.message}`;
  }
  
  return `Unknown error: ${String(error)}`;
}
