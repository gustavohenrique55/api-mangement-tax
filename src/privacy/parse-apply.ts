import { BadRequestException } from "@nestjs/common";

// Rejects unrecognised values instead of silently defaulting to dry-run.
export function parseApply(value?: string): boolean {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower === "true") return true;
  if (lower === "false") return false;
  throw new BadRequestException(
    `apply must be 'true' or 'false' (case-insensitive); received: '${value}'`,
  );
}
