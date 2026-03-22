/**
 * Strip all Markdown syntax from text, returning plain text.
 */
export function stripMarkdown(text: string): string {
  let result = text;

  // Remove code blocks: ```...```
  result = result.replace(/```[\s\S]*?```/g, "");

  // Remove images: ![alt](url)
  result = result.replace(/!\[[^\]]*\]\([^)]+\)/g, "");

  // Remove links: [text](url) -> text
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Remove heading markers: # ## ### etc.
  result = result.replace(/^#{1,6}\s+/gm, "");

  // Remove bold/italic: **text**, *text*, __text__, _text_
  result = result.replace(/\*\*(.+?)\*\*/g, "$1");
  result = result.replace(/\*(.+?)\*/g, "$1");
  result = result.replace(/__(.+?)__/g, "$1");
  result = result.replace(/(?<!\w)_(.+?)_(?!\w)/g, "$1");

  // Remove strikethrough: ~~text~~
  result = result.replace(/~~(.+?)~~/g, "$1");

  // Remove inline code: `code`
  result = result.replace(/`([^`]+)`/g, "$1");

  // Remove unordered list markers: - item, * item, + item
  result = result.replace(/^[\s]*[-*+]\s+/gm, "");

  // Remove ordered list markers: 1. item
  result = result.replace(/^[\s]*\d+\.\s+/gm, "");

  // Remove blockquote markers: > text
  result = result.replace(/^>\s?/gm, "");

  // Remove horizontal rules: ---, ***, ___
  result = result.replace(/^[-*_]{3,}\s*$/gm, "");

  // Remove HTML tags
  result = result.replace(/<[^>]+>/g, "");

  return result;
}

/**
 * Convert an Arabic number to Chinese number string.
 * Supports numbers from 1 to 9999.
 */
export function numberToChinese(num: number): string {
  const digits = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
  const units = ["", "十", "百", "千"];

  if (num <= 0 || num > 9999) return String(num);
  if (num < 10) return digits[num]!;

  const str = String(num);
  const len = str.length;
  let result = "";

  for (let i = 0; i < len; i++) {
    const digit = Number(str[i]);
    const unitIndex = len - 1 - i;

    if (digit === 0) {
      if (result && !result.endsWith("零") && i < len - 1) {
        result += "零";
      }
    } else {
      result += digits[digit]! + units[unitIndex]!;
    }
  }

  // Remove trailing 零
  if (result.endsWith("零")) {
    result = result.slice(0, -1);
  }

  // 一十 -> 十 (for numbers 10-19)
  if (result.startsWith("一十")) {
    result = result.slice(1);
  }

  return result;
}

/**
 * Format text paragraphs for Fanqie novel platform:
 * - Two full-width spaces indent at start of each paragraph
 * - Single blank line between paragraphs
 * - Remove extra whitespace
 */
export function formatFanqieParagraphs(text: string): string {
  const INDENT = "\u3000\u3000";

  const lines = text.split(/\n/).map((line) => line.trim());

  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    // Collapse consecutive blank lines
    if (line === "" && i > 0 && lines[i - 1]?.trim() === "") continue;

    if (line === "") {
      result.push("");
    } else {
      result.push(INDENT + line);
    }
  }

  return result.join("\n");
}
