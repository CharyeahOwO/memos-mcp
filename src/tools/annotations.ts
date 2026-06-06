import type { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";

export function readOnlyTool(title: string): ToolAnnotations {
  return {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  };
}

export function localReadOnlyTool(title: string): ToolAnnotations {
  return {
    title,
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: false,
  };
}

export function createTool(title: string): ToolAnnotations {
  return {
    title,
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  };
}

export function updateTool(title: string): ToolAnnotations {
  return {
    title,
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: false,
    openWorldHint: true,
  };
}

export function syncTool(title: string): ToolAnnotations {
  return {
    title,
    readOnlyHint: false,
    destructiveHint: false,
    idempotentHint: false,
    openWorldHint: true,
  };
}
