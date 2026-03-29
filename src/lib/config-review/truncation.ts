import { TruncationAnalysis } from './types';
import {
  BOOTSTRAP_MAX_CHARS_DEFAULT,
  TRUNCATION_HEAD_RATIO,
  TRUNCATION_TAIL_RATIO,
} from './thresholds';

/**
 * Calculate OpenClaw's 70/20/10 truncation split for a file.
 * When a file exceeds bootstrapMaxChars:
 *   - 70% from HEAD (TRUNCATION_HEAD_RATIO applied to limit)
 *   - 20% from TAIL (TRUNCATION_TAIL_RATIO applied to limit)
 *   - 10% reserved for truncation marker
 *   - The MIDDLE disappears silently.
 */
export function calculateTruncation(
  fileCharCount: number,
  bootstrapMaxChars: number = BOOTSTRAP_MAX_CHARS_DEFAULT,
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

  const headChars = Math.floor(bootstrapMaxChars * TRUNCATION_HEAD_RATIO);
  const tailChars = Math.floor(bootstrapMaxChars * TRUNCATION_TAIL_RATIO);
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
