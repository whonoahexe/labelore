/**
 * Matches Unicode emoji sequences, including:
 * - Keycaps (`1️⃣`, `#️⃣`, etc.)
 * - Pictographs, symbols with emoji presentation, and regional indicators (flags)
 * - Associated variation selectors (`\uFE0E`, `\uFE0F`), skin tone modifiers, and zero-width joiners (ZWJ)
 */
const EMOJI_PATTERN =
  /(?:[#*0-9]\uFE0F?\u20E3|(?:\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Regional_Indicator})(?:\uFE0F|\uFE0E|\u200D|\p{Emoji_Modifier}|\p{Extended_Pictographic}|\p{Emoji_Presentation}|\p{Regional_Indicator})*)/gu;

/**
 * Strips all emojis from the given text, normalising resulting whitespace and punctuation spacing.
 */
export function stripEmoji(text: string): string {
  if (!text) return '';
  return text
    .replace(EMOJI_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([.,!?:;])/g, '$1')
    .trim();
}
