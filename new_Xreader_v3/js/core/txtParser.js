/**
 * new_Xreader - TxtParser
 * Modular and smart TXT novel chapter parser with priority-based strategy detection.
 * Supports Markdown headings, traditional Simplified/Traditional Chinese numbering, and fallback single-chapter.
 */

import { TextSegmenter } from './segmenter.js';

export class TxtParser {
  /**
   * Sniff and parse raw text into a standard list of chapter objects.
   * @param {string} rawText 
   * @param {string} bookId 
   * @returns {Array<{ id: string, bookId: string, index: number, title: string, content: string, paragraphs: any[], sentencesCount: number }>}
   */
  static parse(rawText, bookId) {
    if (!rawText || typeof rawText !== 'string') {
      return [];
    }

    const lines = rawText.split(/\r?\n/);

    // 1. Detect Strategy A: Markdown Heading Pattern
    // Matches lines starting with 1~3 hash marks, followed by space, followed by non-space text.
    // Specifically excludes decorative lines like '############' or '---'.
    const markdownRegex = /^#{1,3}\s+(\S.*)$/;
    let markdownMatchCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (markdownRegex.test(lines[i].trim())) {
        markdownMatchCount++;
      }
    }

    if (markdownMatchCount >= 2) {
      return this._parseByMarkdown(lines, bookId);
    }

    // 2. Detect Strategy B: Traditional Numbered Chapter Pattern
    // Supports Traditional & Simplified Chinese: 章, 回, 節, 节, 卷, 部, 話, 话, 集, 篇, 幕, 折
    // Supports English chapters: Chapter 1, Section 2
    // Supports digit list items: 1、 / 01. / 1.
    const traditionalRegex = /^\s*(?:第\s*[0-9一二三四五六七八九十百千萬零]+[章回節节卷部話话集篇幕折]|Chapter\s+[0-9]+|[0-9]+[、.．]\s*\S)[^\r\n]*/i;
    let traditionalMatchCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (traditionalRegex.test(lines[i].trim())) {
        traditionalMatchCount++;
      }
    }

    if (traditionalMatchCount >= 2) {
      return this._parseByTraditional(lines, bookId, traditionalRegex);
    }

    // 3. Strategy C: Single Whole Chapter Fallback (Preserve legacy behavior)
    return this._parseAsSingleChapter(rawText, bookId);
  }

  /**
   * Strategy A: Parse by Markdown # Headings
   */
  static _parseByMarkdown(lines, bookId) {
    const markdownRegex = /^#{1,3}\s+(\S.*)$/;
    const rawChapters = [];
    let currentTitle = '序言 / 簡介';
    let currentBodyLines = [];
    let hasHitFirstChapter = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const match = trimmed.match(markdownRegex);

      if (match) {
        const titleText = match[1].trim();
        if (!hasHitFirstChapter) {
          hasHitFirstChapter = true;
          const introBody = currentBodyLines.join('\n').trim();
          if (introBody.length > 0) {
            rawChapters.push({
              title: '序言 / 簡介',
              body: introBody
            });
          }
        } else {
          rawChapters.push({
            title: currentTitle,
            body: currentBodyLines.join('\n').trim()
          });
        }
        currentTitle = titleText;
        currentBodyLines = [];
      } else {
        currentBodyLines.push(line);
      }
    }

    if (hasHitFirstChapter) {
      rawChapters.push({
        title: currentTitle,
        body: currentBodyLines.join('\n').trim()
      });
    }

    return this._buildChapters(rawChapters, bookId);
  }

  /**
   * Strategy B: Parse by Traditional Numbered Patterns
   */
  static _parseByTraditional(lines, bookId, headerRegex) {
    const rawChapters = [];
    let currentTitle = '序言 / 簡介';
    let currentBodyLines = [];
    let hasHitFirstChapter = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const isHeader = headerRegex.test(trimmed);

      if (isHeader) {
        if (!hasHitFirstChapter) {
          hasHitFirstChapter = true;
          const introBody = currentBodyLines.join('\n').trim();
          if (introBody.length > 0) {
            rawChapters.push({
              title: '序言 / 簡介',
              body: introBody
            });
          }
        } else {
          rawChapters.push({
            title: currentTitle,
            body: currentBodyLines.join('\n').trim()
          });
        }
        currentTitle = trimmed;
        currentBodyLines = [];
      } else {
        currentBodyLines.push(line);
      }
    }

    if (hasHitFirstChapter) {
      rawChapters.push({
        title: currentTitle,
        body: currentBodyLines.join('\n').trim()
      });
    }

    return this._buildChapters(rawChapters, bookId);
  }

  /**
   * Strategy C: Fallback as single chapter
   */
  static _parseAsSingleChapter(rawText, bookId) {
    const { paragraphs, flatSentences } = TextSegmenter.segment(rawText);
    return [{
      id: `${bookId}_0`,
      bookId,
      index: 0,
      title: '全文',
      content: rawText,
      paragraphs,
      sentencesCount: flatSentences.length
    }];
  }

  /**
   * Helper: Convert raw chapter structs into finalized Xreader chapter entities with segmentation
   */
  static _buildChapters(rawChapters, bookId) {
    if (rawChapters.length === 0) {
      return [];
    }

    return rawChapters.map((chap, idx) => {
      const { paragraphs, flatSentences } = TextSegmenter.segment(chap.body);
      return {
        id: `${bookId}_${idx}`,
        bookId,
        index: idx,
        title: chap.title || `第 ${idx + 1} 章`,
        content: chap.body,
        paragraphs,
        sentencesCount: flatSentences.length
      };
    });
  }
}
