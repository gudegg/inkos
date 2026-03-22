import { Command } from "commander";
import { StateManager } from "@actalk/inkos-core";
import { readFile, readdir, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { findProjectRoot, resolveBookId, log, logError } from "../utils.js";

export const exportCommand = new Command("export")
  .description("Export book chapters to a single file")
  .argument("[book-id]", "Book ID (auto-detected if only one book)")
  .option("--format <format>", "Output format (txt, md, epub, fanqie)", "txt")
  .option("--output <path>", "Output file path")
  .option("--approved-only", "Only export approved chapters")
  .option("--split", "Split chapters into separate files (fanqie format only)")
  .option("--json", "Output JSON metadata")
  .action(async (bookIdArg: string | undefined, opts) => {
    try {
      const root = findProjectRoot();
      const bookId = await resolveBookId(bookIdArg, root);
      const state = new StateManager(root);

      const book = await state.loadBookConfig(bookId);
      const index = await state.loadChapterIndex(bookId);
      const bookDir = state.bookDir(bookId);
      const chaptersDir = join(bookDir, "chapters");

      const chapters = opts.approvedOnly
        ? index.filter((ch) => ch.status === "approved")
        : index;

      if (chapters.length === 0) {
        throw new Error("No chapters to export.");
      }

      if (opts.format === "epub") {
        await exportEpub(book, chapters, chaptersDir, bookId, root, opts);
        return;
      }

      if (opts.format === "fanqie") {
        await exportFanqie(book, chapters, chaptersDir, bookId, root, opts);
        return;
      }

      if (opts.split) {
        throw new Error("--split flag is only supported with --format fanqie");
      }

      const parts: string[] = [];

      if (opts.format === "md") {
        parts.push(`# ${book.title}\n`);
        parts.push(`---\n`);
      } else {
        parts.push(`${book.title}\n\n`);
      }

      for (const ch of chapters) {
        const paddedNum = String(ch.number).padStart(4, "0");
        const files = await readdir(chaptersDir);
        const match = files.find((f) => f.startsWith(paddedNum));
        if (!match) continue;

        const content = await readFile(join(chaptersDir, match), "utf-8");
        parts.push(content);
        parts.push("\n\n");
      }

      const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

      const outputPath =
        opts.output ?? join(root, `${bookId}_export.${opts.format}`);
      await writeFile(outputPath, parts.join("\n"), "utf-8");

      if (opts.json) {
        log(JSON.stringify({
          bookId,
          chaptersExported: chapters.length,
          totalWords,
          format: opts.format,
          outputPath,
        }, null, 2));
      } else {
        log(`Exported ${chapters.length} chapters (${totalWords} words)`);
        log(`Output: ${outputPath}`);
      }
    } catch (e) {
      if (opts.json) {
        log(JSON.stringify({ error: String(e) }));
      } else {
        logError(`Failed to export: ${e}`);
      }
      process.exit(1);
    }
  });

async function exportEpub(
  book: { readonly title: string; readonly language?: string },
  chapters: ReadonlyArray<{ readonly number: number; readonly wordCount: number }>,
  chaptersDir: string,
  bookId: string,
  root: string,
  opts: { readonly output?: string; readonly json?: boolean },
): Promise<void> {
  const { marked } = await import("marked");
  const { EPub } = await import("epub-gen-memory");

  const epubChapters: Array<{ title: string; content: string }> = [];

  for (const ch of chapters) {
    const paddedNum = String(ch.number).padStart(4, "0");
    const files = await readdir(chaptersDir);
    const match = files.find((f) => f.startsWith(paddedNum));
    if (!match) continue;

    const markdown = await readFile(join(chaptersDir, match), "utf-8");
    const html = await marked.parse(markdown);
    // Extract title from first heading or fall back to filename
    const titleMatch = markdown.match(/^#\s+(.+)/m);
    const title = titleMatch?.[1] ?? match.replace(/\.md$/, "");

    epubChapters.push({ title, content: html });
  }

  const epubInstance = new EPub(
    { title: book.title, lang: book.language === "en" ? "en" : "zh-CN" },
    epubChapters,
  );
  const epubBuffer: Buffer = await epubInstance.genEpub();

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);
  const outputPath = opts.output ?? join(root, `${bookId}.epub`);
  await writeFile(outputPath, epubBuffer);

  if (opts.json) {
    log(JSON.stringify({
      bookId,
      chaptersExported: chapters.length,
      totalWords,
      format: "epub",
      outputPath,
    }, null, 2));
  } else {
    log(`Exported ${chapters.length} chapters (${totalWords} words) to EPUB`);
    log(`Output: ${outputPath}`);
  }
}

async function exportFanqie(
  book: { readonly title: string },
  chapters: ReadonlyArray<{ readonly number: number; readonly wordCount: number }>,
  chaptersDir: string,
  bookId: string,
  root: string,
  opts: { readonly output?: string; readonly split?: boolean; readonly json?: boolean },
): Promise<void> {
  const { stripMarkdown, numberToChinese, formatFanqieParagraphs } =
    await import("@actalk/inkos-core");

  const totalWords = chapters.reduce((sum, ch) => sum + ch.wordCount, 0);

  if (opts.split) {
    // Multi-file mode: each chapter as a separate .txt file
    const outputDir = opts.output ?? join(root, `${bookId}_fanqie`);
    await mkdir(outputDir, { recursive: true });

    for (const ch of chapters) {
      const paddedNum = String(ch.number).padStart(4, "0");
      const files = await readdir(chaptersDir);
      const match = files.find((f) => f.startsWith(paddedNum));
      if (!match) continue;

      const markdown = await readFile(join(chaptersDir, match), "utf-8");
      const { title, body } = extractChapterParts(markdown, ch.number);

      const chineseNum = numberToChinese(ch.number);
      const header = `第${chineseNum}章 ${title}`;
      const plainText = stripMarkdown(body);
      const formattedBody = formatFanqieParagraphs(plainText);

      const chapterContent = `${header}\n\n${formattedBody}`;
      const sanitizedTitle = title
        .replace(/[/\\?%*:|"<>]/g, "")
        .replace(/\s+/g, "_")
        .slice(0, 50);
      const chapterFile = join(outputDir, `${paddedNum}_${sanitizedTitle}.txt`);
      await writeFile(chapterFile, chapterContent, "utf-8");
    }

    if (opts.json) {
      log(JSON.stringify({
        bookId,
        chaptersExported: chapters.length,
        totalWords,
        format: "fanqie",
        split: true,
        outputPath: outputDir,
      }, null, 2));
    } else {
      log(`Exported ${chapters.length} chapters (${totalWords} words) to fanqie format`);
      log(`Output directory: ${outputDir}`);
    }
  } else {
    // Single file mode: all chapters in one .txt
    const parts: string[] = [book.title, "\n\n"];

    for (const ch of chapters) {
      const paddedNum = String(ch.number).padStart(4, "0");
      const files = await readdir(chaptersDir);
      const match = files.find((f) => f.startsWith(paddedNum));
      if (!match) continue;

      const markdown = await readFile(join(chaptersDir, match), "utf-8");
      const { title, body } = extractChapterParts(markdown, ch.number);

      const chineseNum = numberToChinese(ch.number);
      const header = `第${chineseNum}章 ${title}`;
      const plainText = stripMarkdown(body);
      const formattedBody = formatFanqieParagraphs(plainText);

      parts.push(header, "\n\n", formattedBody, "\n\n");
    }

    const outputPath = opts.output ?? join(root, `${bookId}_fanqie.txt`);
    await writeFile(outputPath, parts.join(""), "utf-8");

    if (opts.json) {
      log(JSON.stringify({
        bookId,
        chaptersExported: chapters.length,
        totalWords,
        format: "fanqie",
        split: false,
        outputPath,
      }, null, 2));
    } else {
      log(`Exported ${chapters.length} chapters (${totalWords} words) to fanqie format`);
      log(`Output: ${outputPath}`);
    }
  }
}

/** Extract title and body from a chapter markdown file. */
function extractChapterParts(
  markdown: string,
  chapterNumber: number,
): { title: string; body: string } {
  // Chapter heading format: # 第X章 标题 (see runner.ts:293)
  const titleMatch = markdown.match(/^#\s+(?:第\d+章\s+)?(.+)/m);
  const title = titleMatch?.[1]?.trim() ?? `第${chapterNumber}章`;
  const body = markdown.replace(/^#\s+.+\n*/m, "");
  return { title, body };
}
