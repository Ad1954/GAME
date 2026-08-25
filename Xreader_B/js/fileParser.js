/**
 * Xreader - File Parsing Utility (IndexedDB + Native Client-side Processing)
 * Dynamic loads parser libraries from CDN on demand to maintain light core footprints.
 */

import { TextSegmenter } from './segmenter.js';

// CDN URLs for heavy parsers
const CDN_JSZIP = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
const CDN_MAMMOTH = 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js';
const CDN_PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const CDN_PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

/**
 * Dynamically loads an external script via CDN.
 */
function loadScript(url) {
  return new Promise((resolve, reject) => {
    // Check if script is already in document
    const existing = document.querySelector(`script[src="${url}"]`);
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`無法載入組件：${url}`));
    document.head.appendChild(script);
  });
}

export class FileParser {
  /**
   * Reads a plain text file.
   */
  static async parseTXT(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const segmented = TextSegmenter.segment(text);
        
        resolve({
          title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
          author: '本機上傳',
          chapters: [{
            chapterIndex: 0,
            title: '全文書內容',
            content: segmented
          }]
        });
      };
      reader.onerror = () => reject(new Error('讀取 TXT 檔案失敗'));
      reader.readAsText(file, 'UTF-8');
    });
  }

  /**
   * Reads and parses a DOCX file using mammoth.js.
   */
  static async parseDOCX(file, onProgress = () => {}) {
    onProgress('正在加載 Word 解析組件...');
    await loadScript(CDN_MAMMOTH);
    
    if (typeof window.mammoth === 'undefined') {
      throw new Error('Word 解析組件載入錯誤');
    }

    onProgress('正在解析 Word 內容...');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const arrayBuffer = event.target.result;
        try {
          // Mammoth extracts HTML directly, preserving headings and paragraphs
          const result = await window.mammoth.extractRawText({ arrayBuffer: arrayBuffer });
          const text = result.value;
          const segmented = TextSegmenter.segment(text);

          resolve({
            title: file.name.replace(/\.[^/.]+$/, ""),
            author: '本機上傳',
            chapters: [{
              chapterIndex: 0,
              title: '文件全文',
              content: segmented
            }]
          });
        } catch (err) {
          reject(new Error(`DOCX 解析失敗: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('讀取 DOCX 檔案失敗'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Reads and parses a PDF file page-by-page.
   */
  static async parsePDF(file, onProgress = () => {}) {
    onProgress('正在加載 PDF 解析組件...');
    await loadScript(CDN_PDFJS);

    if (typeof window.pdfjsLib === 'undefined') {
      throw new Error('PDF 解析組件載入錯誤');
    }

    // Configure PDF.js Worker
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN_PDFJS_WORKER;

    onProgress('正在分析 PDF 結構...');
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const typedarray = new Uint8Array(event.target.result);
        try {
          const pdf = await window.pdfjsLib.getDocument({ data: typedarray }).promise;
          const numPages = pdf.numPages;
          let fullText = '';

          for (let i = 1; i <= numPages; i++) {
            onProgress(`正在讀取 PDF 內容：第 ${i}/${numPages} 頁`);
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Reconstruct page text lines
            const pageText = textContent.items.map(item => item.str).join(' ');
            fullText += pageText + '\n\n';
          }

          const segmented = TextSegmenter.segment(fullText);

          resolve({
            title: file.name.replace(/\.[^/.]+$/, ""),
            author: '本機上傳',
            chapters: [{
              chapterIndex: 0,
              title: 'PDF 全文',
              content: segmented
            }]
          });
        } catch (err) {
          reject(new Error(`PDF 解析失敗: ${err.message}`));
        }
      };
      reader.onerror = () => reject(new Error('讀取 PDF 檔案失敗'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Parses an EPUB eBook by decomposing the zip file, extracting spine XML,
   * and splitting text content into distinct chapters.
   */
  static async parseEPUB(file, onProgress = () => {}) {
    onProgress('正在加載 EPUB 解析組件...');
    await loadScript(CDN_JSZIP);

    if (typeof window.JSZip === 'undefined') {
      throw new Error('JSZip 載入失敗');
    }

    onProgress('正在分析電子書結構...');
    const arrayBuffer = await file.arrayBuffer();
    const zip = await window.JSZip.loadAsync(arrayBuffer);

    // 1. Locate container.xml to find the primary OPF file path
    const containerXml = await zip.file('META-INF/container.xml').async('text');
    const parser = new DOMParser();
    const containerDoc = parser.parseFromString(containerXml, 'text/xml');
    const rootfilePath = containerDoc.querySelector('rootfile').getAttribute('full-path');

    // Get the base path directory of the OPF
    const opfDir = rootfilePath.includes('/') 
      ? rootfilePath.substring(0, rootfilePath.lastIndexOf('/') + 1)
      : '';

    // 2. Read OPF file
    onProgress('正在讀取書籍清單...');
    const opfXml = await zip.file(rootfilePath).async('text');
    const opfDoc = parser.parseFromString(opfXml, 'text/xml');

    // Read metadata
    let bookTitle = file.name.replace(/\.[^/.]+$/, "");
    const titleNode = opfDoc.querySelector('title') || opfDoc.querySelector('dc\\:title');
    if (titleNode) bookTitle = titleNode.textContent.trim();

    let bookAuthor = '未知作者';
    const creatorNode = opfDoc.querySelector('creator') || opfDoc.querySelector('dc\\:creator');
    if (creatorNode) bookAuthor = creatorNode.textContent.trim();

    // Read manifest (file dictionary)
    const manifestItems = {};
    opfDoc.querySelectorAll('manifest > item').forEach(item => {
      manifestItems[item.getAttribute('id')] = {
        href: item.getAttribute('href'),
        mediaType: item.getAttribute('media-type')
      };
    });

    // Read spine (reading order of items)
    const spineIds = Array.from(opfDoc.querySelectorAll('spine > itemref'))
      .map(ref => ref.getAttribute('idref'));

    const chapterFiles = spineIds
      .map(id => manifestItems[id])
      .filter(item => item && item.mediaType.includes('xml')); // Keep XHTML/XML content

    // 3. Extract text from each chapter file
    const parsedChapters = [];
    for (let index = 0; index < chapterFiles.length; index++) {
      const chapFile = chapterFiles[index];
      onProgress(`正在解析電子書章節：第 ${index + 1}/${chapterFiles.length} 章`);
      
      const fullPath = opfDir + chapFile.href;
      
      // Handle potential path resolution bugs inside epub zips
      let zipFile = zip.file(fullPath);
      if (!zipFile) {
        // Fallback: search by filename in manifest
        const filename = chapFile.href.split('/').pop();
        zipFile = Object.values(zip.files).find(f => f.name.endsWith(filename));
      }

      if (!zipFile) continue;

      const htmlContent = await zipFile.async('text');
      const chapDoc = parser.parseFromString(htmlContent, 'text/html');

      // Guess chapter title
      let chapTitle = '';
      const hTag = chapDoc.querySelector('h1, h2, h3, h4');
      if (hTag) {
        chapTitle = hTag.textContent.trim();
      } else {
        const titleTag = chapDoc.querySelector('title');
        chapTitle = titleTag ? titleTag.textContent.trim() : `第 ${index + 1} 章`;
      }
      
      if (!chapTitle || chapTitle.length > 50) {
        chapTitle = `第 ${index + 1} 章`;
      }

      // Extract core text and clean html tags
      const bodyNode = chapDoc.querySelector('body') || chapDoc.documentElement;
      const bodyClone = bodyNode.cloneNode(true);
      // Strip script / style tags
      bodyClone.querySelectorAll('script, style, iframe').forEach(el => el.remove());
      
      const rawText = bodyClone.textContent;
      const segmented = TextSegmenter.segment(rawText);

      parsedChapters.push({
        chapterIndex: index,
        title: chapTitle,
        content: segmented
      });
    }

    if (parsedChapters.length === 0) {
      throw new Error('未能在 EPUB 中解析出任何有效章節文字');
    }

    return {
      title: bookTitle,
      author: bookAuthor,
      chapters: parsedChapters
    };
  }
}

export default FileParser;
