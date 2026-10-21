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
   * 智慧書籍檔頭中繼資料解析 (提取書名、作者、來源等)
   * @param {string} rawText
   * @returns {{ title: string|null, author: string|null, sourceUrl: string|null }}
   */
  static parseMetadata(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return { title: null, author: null, sourceUrl: null };
    }
    const lines = rawText.slice(0, 3000).split(/\r?\n/).slice(0, 25);
    let title = null;
    let author = null;
    let sourceUrl = null;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // 《書名》
      const bookTitleMatch = trimmed.match(/^《\s*([^》]+)\s*》$/);
      if (bookTitleMatch && !title) {
        title = bookTitleMatch[1].trim();
      }
      // 書名: XXX
      const titlePrefixMatch = trimmed.match(/^(?:書名|书名|Title)\s*[:：]\s*(\S.*)$/i);
      if (titlePrefixMatch && !title) {
        title = titlePrefixMatch[1].replace(/^《|》$/g, '').trim();
      }
      // 作者: XXX
      const authorMatch = trimmed.match(/^(?:作者|Author)\s*[:：]\s*(\S.*)$/i);
      if (authorMatch && !author) {
        const rawAuth = authorMatch[1].trim();
        if (rawAuth && rawAuth !== '未知') {
          author = rawAuth;
        }
      }
      // 來源: XXX
      const sourceMatch = trimmed.match(/^(?:來源|来源|網址|网址|Source)\s*[:：]\s*(https?:\/\/\S+)$/i);
      if (sourceMatch && !sourceUrl) {
        sourceUrl = sourceMatch[1].trim();
      }
    }

    return { title, author, sourceUrl };
  }

  /**
   * 判定是否為 Xreader 專屬章節標籤行 (Story 56)
   */
  static isXreaderTag(line) {
    if (!line || typeof line !== 'string') return false;
    return /^\s*\[XREADER_CHAPTER(?::|\]|\s)/i.test(line.trim());
  }

  /**
   * 自標籤行提取章節標題
   */
  static extractXreaderTagTitle(line) {
    if (!line) return '';
    const trimmed = line.trim();
    const m = trimmed.match(/^\[XREADER_CHAPTER(?:\]|:)?\s*(.*?)(?:\])?$/i);
    if (m && m[1]) {
      return m[1].trim();
    }
    return '';
  }

  /**
   * Sniff and parse raw text into a standard list of chapter objects.
   * Priority:
   * 0A: Explicit Xreader chapter tags [XREADER_CHAPTER] (Story 56: 100% 精準無歧義)
   * 0B: Delimiter blocks (====\nTitle\n====) (Story 56: 舊版 Xreader 雙分隔線向下相容)
   * A: Markdown # Headings
   * B: Traditional & Web Numbered Chapter Pattern
   * C: Fallback single chapter
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

    // 1. Detect Strategy 0A: Explicit Xreader Chapter Markers [XREADER_CHAPTER]
    let xreaderTagCount = 0;
    for (let i = 0; i < lines.length; i++) {
      if (this.isXreaderTag(lines[i])) {
        xreaderTagCount++;
      }
    }
    if (xreaderTagCount >= 1) {
      return this._parseByXreaderTag(lines, bookId);
    }

    // 2. Detect Strategy 0B: Delimiter Blocks (====\nTitle\n====) (Backward compatibility)
    const delimiterBlocks = this._detectDelimiterBlocks(lines);
    if (delimiterBlocks.length >= 2) {
      return this._parseByDelimiterBlocks(lines, delimiterBlocks, bookId);
    }

    // 3. Detect Strategy A: Markdown Heading Pattern
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

    // 4. Detect Strategy B: Traditional & Web Numbered Chapter Pattern
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

    // 5. Strategy C: Single Whole Chapter Fallback (Preserve legacy behavior)
    return this._parseAsSingleChapter(rawText, bookId);
  }

  /**
   * Strategy 0A: Parse by Explicit Xreader Tags [XREADER_CHAPTER] (Story 56)
   */
  static _parseByXreaderTag(lines, bookId) {
    const rawChapters = [];
    let currentTitle = '序言 / 簡介';
    let currentBodyLines = [];
    let hasHitFirstChapter = false;
    const isDividerLine = (str) => /^\s*[=\-_*]{6,}\s*$/.test(str);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (this.isXreaderTag(line)) {
        let title = this.extractXreaderTagTitle(line);
        // 若該標籤行未附帶標題，且下一行非分隔線與標籤，嘗試取下一行作為標題
        if (!title && i + 1 < lines.length && !isDividerLine(lines[i + 1]) && !this.isXreaderTag(lines[i + 1])) {
          title = lines[i + 1].trim();
          i++;
        }
        if (!title) {
          title = `第 ${rawChapters.length + 1} 章`;
        }

        if (!hasHitFirstChapter) {
          hasHitFirstChapter = true;
          const introLines = currentBodyLines.filter(l => !isDividerLine(l));
          const introBody = introLines.join('\n').trim();
          const meta = this.parseMetadata(introBody);
          let cleanIntro = introBody;
          if (meta.title) cleanIntro = cleanIntro.replace(new RegExp(`《?${meta.title}》?`), '');
          if (meta.author) cleanIntro = cleanIntro.replace(new RegExp(`作者\\s*[:：]\\s*${meta.author}`), '');
          cleanIntro = cleanIntro.replace(/來源\s*[:：]\s*\S+/g, '')
                                 .replace(/章節數\s*[:：]\s*\d+/g, '')
                                 .replace(/匯出工具\s*[:：]\s*\S+/g, '')
                                 .trim();
          if (cleanIntro.length > 50) {
            rawChapters.push({
              title: '序言 / 簡介',
              body: cleanIntro
            });
          }
        } else {
          const body = currentBodyLines.filter(l => !isDividerLine(l)).join('\n').trim();
          rawChapters.push({
            title: currentTitle,
            body
          });
        }

        currentTitle = title;
        currentBodyLines = [];
      } else {
        currentBodyLines.push(line);
      }
    }

    if (hasHitFirstChapter) {
      const body = currentBodyLines.filter(l => !isDividerLine(l)).join('\n').trim();
      rawChapters.push({
        title: currentTitle,
        body
      });
    }

    return this._buildChapters(rawChapters, bookId);
  }

  /**
   * 偵測雙分隔線章節區塊 (舊版 Xreader 匯出相容模式 - Strategy 0B)
   * 格式:
   * ==================== (10+ 個 =)
   * 章節標題
   * ==================== (10+ 個 =)
   */
  static _detectDelimiterBlocks(lines) {
    const isDivider = (str) => /^\s*[=\-_*]{10,}\s*$/.test(str);
    const blocks = [];

    for (let i = 0; i < lines.length - 2; i++) {
      if (isDivider(lines[i])) {
        const candidateTitle = lines[i + 1].trim();
        if (candidateTitle && candidateTitle.length <= 80 && !isDivider(lines[i + 1])) {
          if (isDivider(lines[i + 2])) {
            blocks.push({
              startIndex: i,
              endIndex: i + 2,
              title: candidateTitle
            });
            i += 2; // Jump past this block
          }
        }
      }
    }
    return blocks;
  }

  /**
   * Strategy 0B: Parse by Delimiter Blocks (Backward Compatibility)
   */
  static _parseByDelimiterBlocks(lines, blocks, bookId) {
    const isDivider = (str) => /^\s*[=\-_*]{10,}\s*$/.test(str);
    const rawChapters = [];

    // 檢查首個區塊前是否有前言或中繼資訊
    const firstBlock = blocks[0];
    if (firstBlock.startIndex > 0) {
      const introLines = lines.slice(0, firstBlock.startIndex).filter(l => !isDivider(l));
      const introBody = introLines.join('\n').trim();
      const meta = this.parseMetadata(introBody);
      let cleanIntro = introBody;
      if (meta.title) cleanIntro = cleanIntro.replace(new RegExp(`《?${meta.title}》?`), '');
      if (meta.author) cleanIntro = cleanIntro.replace(new RegExp(`作者\\s*[:：]\\s*${meta.author}`), '');
      cleanIntro = cleanIntro.replace(/來源\s*[:：]\s*\S+/g, '')
                             .replace(/章節數\s*[:：]\s*\d+/g, '')
                             .replace(/匯出工具\s*[:：]\s*\S+/g, '')
                             .trim();
      if (cleanIntro.length > 50) {
        rawChapters.push({
          title: '序言 / 簡介',
          body: cleanIntro
        });
      }
    }

    for (let b = 0; b < blocks.length; b++) {
      const cur = blocks[b];
      const nextStart = (b + 1 < blocks.length) ? blocks[b + 1].startIndex : lines.length;
      const bodyLines = lines.slice(cur.endIndex + 1, nextStart).filter(l => !isDivider(l));
      rawChapters.push({
        title: cur.title,
        body: bodyLines.join('\n').trim()
      });
    }

    return this._buildChapters(rawChapters, bookId);
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

    const normTitle = (t) => (t || '').replace(/[\s\-_=—【】《》「」『』()（）]/g, '').toLowerCase();

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
          currentTitle = trimmed;
          currentBodyLines = [trimmed]; // Story 35: 複製保留標題於內文首句以供 TTS 朗讀提醒
        } else {
          // Story 57: 內容句子數 <= 5 句防早切守衛
          const contentLines = currentBodyLines.filter(l => !/^\s*[=\-_*]{4,}\s*$/.test(l));
          const contentText = contentLines.join('\n').trim();
          const seg = TextSegmenter.segment(contentText);
          const normCurrent = normTitle(currentTitle);
          const normNext = normTitle(trimmed);

          // 判斷是否為「相鄰同名重複標題」或「有效句子數 <= 5 句且無實質正文（純標題/裝飾符）」
          const isSameTitle = (normCurrent === normNext || (normCurrent && normNext && (normCurrent.includes(normNext) || normNext.includes(normCurrent))));
          const isStub = (seg.flatSentences.length <= 5 && contentText.length < 60);

          if (isSameTitle || isStub) {
            // 不結案舊章節，更新為更完整的標題，繼續收集內文
            if (trimmed.length > currentTitle.length) {
              currentTitle = trimmed;
            }
            currentBodyLines.push(line);
            continue;
          }

          rawChapters.push({
            title: currentTitle,
            body: currentBodyLines.join('\n').trim()
          });
          currentTitle = trimmed;
          currentBodyLines = [trimmed]; // Story 35: 複製保留標題於內文首句以供 TTS 朗讀提醒
        }
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
   * 智慧癒合極短章節殘片與相鄰同名重複標題 (Story 57)
   * @param {Array<{ title: string, body: string }>} rawChapters
   * @param {number} thresholdSentences - 判定為殘片的句子數上限 (預設 5 句)
   * @returns {Array<{ title: string, body: string }>}
   */
  static _healChapterFragments(rawChapters, thresholdSentences = 5) {
    if (!Array.isArray(rawChapters) || rawChapters.length <= 1) {
      return rawChapters;
    }

    const normTitle = (t) => (t || '').replace(/[\s\-_=—【】《》「」『』()（）]/g, '').toLowerCase();
    const isDividerLine = (str) => /^\s*[=\-_*]{4,}\s*$/.test(str);

    const healed = [];

    for (let i = 0; i < rawChapters.length; i++) {
      const cur = rawChapters[i];
      // Clean body to count real sentences
      const cleanBody = (cur.body || '')
        .split(/\r?\n/)
        .filter(l => !isDividerLine(l))
        .join('\n')
        .trim();
      const seg = TextSegmenter.segment(cleanBody);
      const sentencesCount = seg.flatSentences.length;

      // Check if Chapter 0 is a stub "序言 / 簡介" containing only book title/author/metadata
      if (i === 0 && (cur.title.includes('序言') || cur.title.includes('簡介')) && i + 1 < rawChapters.length) {
        const meta = this.parseMetadata(cleanBody);
        let remText = cleanBody;
        if (meta.title) remText = remText.replace(new RegExp(`《?${meta.title}》?`, 'g'), '');
        if (meta.author) remText = remText.replace(new RegExp(`作者\\s*[:：]\\s*${meta.author}`, 'g'), '');
        remText = remText.replace(/[\s\-_=—【】《》「」『』()（）:：]/g, '').trim();
        if (remText.length < 25) {
          // This "序言 / 簡介" is merely a book title banner, not a real chapter!
          continue;
        }
      }

      // Check if this chapter is a candidate for healing with the next chapter
      if (i + 1 < rawChapters.length) {
        const next = rawChapters[i + 1];
        const isSameTitle = normTitle(cur.title) === normTitle(next.title);

        // 條件 1: 相鄰同名，且當前章節句子數 <= thresholdSentences (例如先前被切碎的空標題殘片)
        // 條件 2: 當前章節實質完全為空 (sentencesCount === 0 且字數 < 15)
        if ((isSameTitle && sentencesCount <= thresholdSentences) || (sentencesCount === 0 && cleanBody.length < 15)) {
          // If cur has any actual body lines beyond just repeating the title and dividers, append to next
          const titleLine = cur.title.trim();
          const extraLines = cleanBody
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l && l !== titleLine && !isDividerLine(l));

          if (extraLines.length > 0) {
            next.body = extraLines.join('\n') + '\n\n' + (next.body || '');
          }
          // Merge cur into next by continuing without adding cur to healed
          continue;
        }
      }

      healed.push(cur);
    }

    return healed;
  }

  /**
   * Helper: Convert raw chapter structs into finalized Xreader chapter entities with segmentation
   */
  static _buildChapters(rawChapters, bookId) {
    if (!Array.isArray(rawChapters) || rawChapters.length === 0) {
      return [];
    }

    // Story 57: 先執行極短章節殘片與相鄰同名重複標題之智慧癒合 (門檻 <= 5 句)
    const healed = this._healChapterFragments(rawChapters, 5);

    return healed.map((chap, idx) => {
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
