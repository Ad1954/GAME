/**
 * new_Xreader - TxtParser
 * Modular and smart TXT novel chapter parser with priority-based strategy detection.
 * Supports Markdown headings, traditional Simplified/Traditional Chinese numbering, and fallback single-chapter.
 */

import { TextSegmenter } from './segmenter.js';

export class TxtParser {
  /**
   * 智慧檔案編碼偵測與解碼 (支援 UTF-16LE, UTF-16BE, UTF-8 with BOM, Standard UTF-8, ANSI/GB18030/Big5)
   * @param {File|Blob} file
   * @returns {Promise<string>}
   */
  static async readTextFileWithEncoding(file) {
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // 1. BOM 標記判斷
    if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) {
      return new TextDecoder('utf-16le').decode(buffer);
    }
    if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) {
      return new TextDecoder('utf-16be').decode(buffer);
    }
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
      return new TextDecoder('utf-8').decode(buffer);
    }

    // 2. 優先嘗試 UTF-8 (若有非法字節則拋出錯誤進入繁簡中文 fallback)
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      return decoder.decode(buffer);
    } catch (_) {
      // 3. Fallback: 中文國標碼 GB18030 (兼容 GBK/GB2312)
      try {
        const decoder = new TextDecoder('gb18030');
        return decoder.decode(buffer);
      } catch (_) {
        return new TextDecoder('utf-8').decode(buffer);
      }
    }
  }

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

    // 消除開頭 BOM 標記 (U+FEFF)，防止產生空白序言
    const cleanedText = rawText.charCodeAt(0) === 0xFEFF ? rawText.slice(1) : rawText;
    const lines = cleanedText.split(/\r?\n/);

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

    // 2. Detect Strategy B: Traditional & Web Numbered Chapter Pattern
    // Supports Traditional & Simplified Chinese: 章, 回, 節, 节, 卷, 部, 話, 话, 集, 篇, 幕, 折
    // Supports English chapters: Chapter 1, Section 2
    // Supports digit list items: 1、 / 01. / 1.
    // Supports Syosetu / web novel dual-sequence: 191（652）標題, 191 (652) 標題
    let traditionalMatchCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (this.isChapterHeader(lines[i])) {
        traditionalMatchCount++;
      }
    }

    if (traditionalMatchCount >= 2) {
      return this._parseByTraditional(lines, bookId);
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
        currentBodyLines = [titleText]; // Story 35: 複製保留標題於內文首句以供 TTS 朗讀提醒
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
   * 智慧章節標題判定 (支援傳統中英文章節、數字清單、小說家 Syosetu 雙序號、純數字開頭)
   */
  static isChapterHeader(line) {
    if (!line || typeof line !== 'string') return false;
    const trimmed = line.trim();
    if (!trimmed || trimmed.length > 60) return false;

    // 1. 傳統中英文章節與雙序號 (第...章/回/節/部/話、Chapter 1、1. 標題、1、標題、Syosetu 雙序號 191（652）標題)
    const regex = /^\s*(?:第\s*[0-9一二三四五六七八九十百千萬零]+[章回節节卷部話话集篇幕折]|Chapter\s+[0-9]+|[0-9]+[、.．]\s*\S|[0-9]+\s*[（\(【\[]\s*[0-9]+\s*[）\)】\]]\s*\S)/i;
    if (regex.test(trimmed)) return true;

    // 2. 純數字 + 空格/分隔符 + 標題文字 (例: "191 標題")
    // 嚴格守衛：結尾不得為句子標點符號，長度 <= 45 字元
    if (/^[0-9]{1,5}\s+[\u4e00-\u9fa5a-zA-Z]/.test(trimmed)) {
      if (!/[。！？!?…，,、“”"'」』]$/.test(trimmed) && trimmed.length <= 45) {
        return true;
      }
    }

    return false;
  }

  /**
   * Strategy B: Parse by Traditional & Web Numbered Patterns
   */
  static _parseByTraditional(lines, bookId) {
    const rawChapters = [];
    let currentTitle = '序言 / 簡介';
    let currentBodyLines = [];
    let hasHitFirstChapter = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();
      const isHeader = this.isChapterHeader(trimmed);

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
        currentBodyLines = [trimmed]; // Story 35: 複製保留標題於內文首句以供 TTS 朗讀提醒
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
