/**
 * new_Xreader - TextSegmenter
 * Smart paragraph preservation & Chinese/English sentence segmentation (ADR 0005)
 */

export class TextSegmenter {
  /**
   * Splits raw chapter text into structured paragraphs and flattened sentences.
   * @param {string} rawText 
   * @returns {{ paragraphs: Array<{ id: number, sentences: Array<{ globalIndex: number, text: string }> }>, flatSentences: string[] }}
   */
  static segment(rawText) {
    if (!rawText) {
      return { paragraphs: [], flatSentences: [] };
    }

    // 1. Split into paragraphs by newline
    const rawParagraphs = rawText
      .split(/\r?\n/)
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const paragraphs = [];
    const flatSentences = [];
    let globalIndex = 0;

    // Punctuation delimiter regex for sentence boundary: 。！？!?；;…\n
    // Preserves quote pairings if possible
    const sentenceRegex = /([^。！？!?；;…\n]+[。！？!?；;…\n]*)/g;

    rawParagraphs.forEach((paraText, pIdx) => {
      const pSentences = [];
      const matches = paraText.match(sentenceRegex);

      if (matches && matches.length > 0) {
        matches.forEach(chunk => {
          const trimmed = chunk.trim();
          if (trimmed.length > 0) {
            pSentences.push({
              globalIndex,
              text: trimmed
            });
            flatSentences.push(trimmed);
            globalIndex++;
          }
        });
      } else {
        // Fallback for paragraph with no terminating punctuation
        pSentences.push({
          globalIndex,
          text: paraText
        });
        flatSentences.push(paraText);
        globalIndex++;
      }

      paragraphs.push({
        id: pIdx,
        sentences: pSentences
      });
    });

    return { paragraphs, flatSentences };
  }
}
