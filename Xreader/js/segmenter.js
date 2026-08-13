/**
 * Xreader - Text Segmentation Utility
 * Parses raw text into structured paragraphs and sentences using modern Intl.Segmenter.
 * Preserves structural formatting for premium reader presentation.
 */

export class TextSegmenter {
  /**
   * Splits a long text string into paragraphs and individual sentences.
   * @param {string} text - The raw text content to split.
   * @param {string} [lang='zh-TW'] - Language locale (e.g. 'zh-TW', 'zh-CN', 'en', 'ja').
   * @returns {Array<{type: string, sentences: Array<string>}>} Structured paragraph/sentence nodes.
   */
  static segment(text, lang = 'zh-TW') {
    if (!text || typeof text !== 'string') return [];

    // 1. Split into paragraphs
    const rawParagraphs = text.split(/\r?\n/);
    const result = [];

    // 2. Setup Segmenter (fallback to regex if not supported)
    let segmenter = null;
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        segmenter = new Intl.Segmenter(lang, { granularity: 'sentence' });
      } catch (e) {
        console.warn('Locale not supported by Intl.Segmenter, falling back to default locales.');
        segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
      }
    }

    for (let rawPara of rawParagraphs) {
      const trimmedPara = rawPara.trim();
      if (!trimmedPara) continue; // Skip empty paragraphs

      const paragraphNode = {
        type: 'paragraph',
        sentences: []
      };

      if (segmenter) {
        // Use native Intl.Segmenter
        const segments = segmenter.segment(trimmedPara);
        for (const seg of segments) {
          const sentence = seg.segment.trim();
          if (sentence) {
            paragraphNode.sentences.push(sentence);
          }
        }
      } else {
        // Fallback: simple Regex sentence boundary detection
        // Splits after 。！？.!? optionally followed by quotes
        const sentenceRegex = /[^。！？.!?]+[。！？.!?]?[”」]?/g;
        const matches = trimmedPara.match(sentenceRegex) || [trimmedPara];
        for (const match of matches) {
          const sentence = match.trim();
          if (sentence) {
            paragraphNode.sentences.push(sentence);
          }
        }
      }

      if (paragraphNode.sentences.length > 0) {
        result.push(paragraphNode);
      }
    }

    return result;
  }

  /**
   * Flatten structured paragraphs into a flat array of sentences for linear indexing.
   * Useful for progress sliders and audio queues.
   * @param {Array<{type: string, sentences: Array<string>}>} segmentedDoc 
   * @returns {Array<string>} List of sentences.
   */
  static flatten(segmentedDoc) {
    const list = [];
    if (!segmentedDoc) return list;
    for (const paragraph of segmentedDoc) {
      if (paragraph.sentences) {
        list.push(...paragraph.sentences);
      }
    }
    return list;
  }
}

export default TextSegmenter;
