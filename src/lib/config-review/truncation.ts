import { TruncationAnalysis } from './types';

const DEFAULT_BOOTSTRAP_MAX_CHARS = 20_000;

/**
 * Calculate OpenClaw's 70/20/10 truncation split for a file.
 * When a file exceeds bootstrapMaxChars:
 *   - 70% from HEAD
 *   - 20% from TAIL
 *   - 10% reserved for truncation marker
 *   - The MIDDLE disappears silently.
 */
export function calculateTruncation(
  fileCharCount: number,
  bootstrapMaxChars: number = DEFAULT_BOOTSTRAP_MAX_CHARS,
): TruncationAnalysis {
  if (fileCharCount <= bootstrapMaxChars) {
    return {
      fileCharCount,
      bootstrapMaxChars,
      headChars: fileCharCount,
      tailChars: 0,
      hiddenChars: 0,
      hiddenRange: null,
    };
  }

  const headChars = Math.floor(bootstrapMaxChars * 0.70);
  const tailChars = Math.floor(bootstrapMaxChars * 0.20);
  const hiddenChars = fileCharCount - headChars - tailChars;

  return {
    fileCharCount,
    bootstrapMaxChars,
    headChars,
    tailChars,
    hiddenChars,
    hiddenRange: {
      start: headChars + 1,
      end: fileCharCount - tailChars,
    },
  };
}
