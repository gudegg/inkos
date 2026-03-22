export interface ChapterLengthRange {
  readonly min: number;
  readonly max: number;
}

export function resolveChapterLengthRange(target: number): ChapterLengthRange {
  const tolerance = Math.max(200, Math.round(target * 0.15));
  return {
    min: Math.max(1, target - tolerance),
    max: target + tolerance,
  };
}

export function countChapterUnits(content: string, language: "zh" | "en" = "zh"): number {
  if (language === "en") {
    const words = content.match(/\b[\p{L}\p{N}][\p{L}\p{N}'-]*\b/gu);
    return words?.length ?? 0;
  }

  return content.replace(/\s+/g, "").length;
}
