import { describe, it, expect } from "vitest";
import {
  stripMarkdown,
  numberToChinese,
  formatFanqieParagraphs,
} from "../utils/text-format.js";

// ---------------------------------------------------------------------------
// stripMarkdown
// ---------------------------------------------------------------------------

describe("stripMarkdown", () => {
  it("removes heading markers", () => {
    expect(stripMarkdown("# Title")).toBe("Title");
    expect(stripMarkdown("## Sub Title")).toBe("Sub Title");
    expect(stripMarkdown("### H3")).toBe("H3");
  });

  it("removes bold and italic markers", () => {
    expect(stripMarkdown("**bold** text")).toBe("bold text");
    expect(stripMarkdown("*italic* text")).toBe("italic text");
    expect(stripMarkdown("__bold__ text")).toBe("bold text");
  });

  it("removes strikethrough", () => {
    expect(stripMarkdown("~~deleted~~")).toBe("deleted");
  });

  it("removes inline code", () => {
    expect(stripMarkdown("use `console.log`")).toBe("use console.log");
  });

  it("removes code blocks", () => {
    expect(stripMarkdown("before\n```js\ncode\n```\nafter")).toBe(
      "before\n\nafter",
    );
  });

  it("removes links, keeps text", () => {
    expect(stripMarkdown("[click here](http://url)")).toBe("click here");
  });

  it("removes images", () => {
    expect(stripMarkdown("![alt](http://img.png)")).toBe("");
  });

  it("removes unordered list markers", () => {
    expect(stripMarkdown("- item1\n- item2")).toBe("item1\nitem2");
    expect(stripMarkdown("* item")).toBe("item");
  });

  it("removes ordered list markers", () => {
    expect(stripMarkdown("1. first\n2. second")).toBe("first\nsecond");
  });

  it("removes blockquote markers", () => {
    expect(stripMarkdown("> quoted text")).toBe("quoted text");
  });

  it("removes horizontal rules", () => {
    expect(stripMarkdown("before\n---\nafter")).toBe("before\n\nafter");
  });

  it("removes HTML tags", () => {
    expect(stripMarkdown("<b>bold</b>")).toBe("bold");
  });

  it("handles mixed markdown", () => {
    const input = "# 第1章 测试\n\n**他**站在门前，*犹豫*着。\n\n> 这是引用";
    const result = stripMarkdown(input);
    expect(result).toContain("他站在门前，犹豫着。");
    expect(result).toContain("这是引用");
    expect(result).not.toContain("#");
    expect(result).not.toContain("**");
    expect(result).not.toContain(">");
  });
});

// ---------------------------------------------------------------------------
// numberToChinese
// ---------------------------------------------------------------------------

describe("numberToChinese", () => {
  it("converts single digits", () => {
    expect(numberToChinese(1)).toBe("一");
    expect(numberToChinese(5)).toBe("五");
    expect(numberToChinese(9)).toBe("九");
  });

  it("converts teens (10-19)", () => {
    expect(numberToChinese(10)).toBe("十");
    expect(numberToChinese(11)).toBe("十一");
    expect(numberToChinese(15)).toBe("十五");
    expect(numberToChinese(19)).toBe("十九");
  });

  it("converts tens (20-99)", () => {
    expect(numberToChinese(20)).toBe("二十");
    expect(numberToChinese(23)).toBe("二十三");
    expect(numberToChinese(99)).toBe("九十九");
  });

  it("converts hundreds", () => {
    expect(numberToChinese(100)).toBe("一百");
    expect(numberToChinese(101)).toBe("一百零一");
    expect(numberToChinese(110)).toBe("一百一十");
    expect(numberToChinese(305)).toBe("三百零五");
    expect(numberToChinese(999)).toBe("九百九十九");
  });

  it("converts thousands", () => {
    expect(numberToChinese(1000)).toBe("一千");
    expect(numberToChinese(1001)).toBe("一千零一");
    expect(numberToChinese(2048)).toBe("二千零四十八");
    expect(numberToChinese(9999)).toBe("九千九百九十九");
  });

  it("falls back to string for out-of-range", () => {
    expect(numberToChinese(0)).toBe("0");
    expect(numberToChinese(-1)).toBe("-1");
    expect(numberToChinese(10000)).toBe("10000");
  });
});

// ---------------------------------------------------------------------------
// formatFanqieParagraphs
// ---------------------------------------------------------------------------

describe("formatFanqieParagraphs", () => {
  const INDENT = "\u3000\u3000";

  it("adds full-width space indent to paragraphs", () => {
    expect(formatFanqieParagraphs("Hello")).toBe(`${INDENT}Hello`);
  });

  it("preserves single blank lines between paragraphs", () => {
    const result = formatFanqieParagraphs("段落一\n\n段落二");
    expect(result).toBe(`${INDENT}段落一\n\n${INDENT}段落二`);
  });

  it("collapses multiple blank lines to one", () => {
    const result = formatFanqieParagraphs("A\n\n\n\nB");
    expect(result).toBe(`${INDENT}A\n\n${INDENT}B`);
  });

  it("trims leading/trailing whitespace from lines", () => {
    const result = formatFanqieParagraphs("  spaced  ");
    expect(result).toBe(`${INDENT}spaced`);
  });

  it("handles empty input", () => {
    expect(formatFanqieParagraphs("")).toBe("");
  });

  it("handles multiple paragraphs with various spacing", () => {
    const input = "第一段内容。\n\n  第二段内容。  \n\n\n\n第三段内容。";
    const result = formatFanqieParagraphs(input);
    expect(result).toBe(
      `${INDENT}第一段内容。\n\n${INDENT}第二段内容。\n\n${INDENT}第三段内容。`,
    );
  });
});
