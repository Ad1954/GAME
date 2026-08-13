/**
 * Xreader - Bookmarklet Generator Code
 * Produces the self-contained JS bookmarklet snippet which users drag to their bookmarks.
 * Bypasses CORS and CSP by utilizing cross-document postMessage handshake between target page and Xreader.
 */

export class BookmarkletGenerator {
  /**
   * Generates the raw bookmarklet JS string.
   * @param {string} appUrl - The current deployment URL of Xreader.
   * @returns {string} The javascript URI string.
   */
  static generate(appUrl) {
    // Ensure appUrl has a trailing slash for consistent parsing
    const normalizedAppUrl = appUrl.endsWith('/') ? appUrl : `${appUrl}/`;

    // Self-contained Bookmarklet code (minified & compressed)
    const code = `(function(){
      var title = document.title || '未命名網頁';
      var url = window.location.href;
      
      // 1. Clean HTML clone to extract content
      var clone = document.body.cloneNode(true);
      var noise = clone.querySelectorAll('script, style, iframe, nav, footer, header, noscript, .ads, .comments, #comments');
      noise.forEach(function(el) { el.remove(); });
      
      // 2. Extract paragraph text blocks
      var paragraphs = [];
      var elements = clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, pre, blockquote, li');
      if (elements.length > 5) {
        elements.forEach(function(el) {
          var txt = el.textContent.trim();
          if (txt.length > 10) paragraphs.push(txt);
        });
      }
      
      if (paragraphs.length === 0) {
        paragraphs = [clone.textContent.replace(/\\s+/g, '\\n')];
      }
      var content = paragraphs.join('\\n\\n');
      
      // 3. Detect if this is a directory/catalog page
      var isDirectory = false;
      var links = [];
      var urlPattern = /\\/Book\\/Read\\/|\\/read\\/|\\/chapter\\/|chapter/i;
      
      // Check if it's a known novel directory pattern or has chapter list container
      var hasCatalog = document.querySelector('#tbchapterlist, .chapter-list, .volume-list, .index-list');
      if (hasCatalog || url.indexOf('Chapter') !== -1 || url.indexOf('index') !== -1 || url.indexOf('catalog') !== -1) {
        var anchors = document.querySelectorAll('a');
        anchors.forEach(function(a) {
          var href = a.getAttribute('href');
          var txt = a.textContent.trim();
          if (href && txt && txt.length < 50) {
            var isChapterText = /第.+[章節回]|^\\d+$/i.test(txt) || txt.indexOf('章') !== -1 || txt.indexOf('節') !== -1;
            var isChapterRoute = urlPattern.test(href);
            
            if (isChapterText || isChapterRoute) {
              try {
                var fullUrl = new URL(href, url).href;
                if (!links.some(function(l) { return l.url === fullUrl; })) {
                  links.push({ title: txt, url: fullUrl });
                }
              } catch(e){}
            }
          }
        });
      }
      
      if (links.length > 3) {
        isDirectory = true;
      }
      
      // 4. Open Xreader in a new window/tab
      var targetOrigin = '${normalizedAppUrl}';
      var win = window.open(targetOrigin + '?bookmarklet=active', 'xreader');
      if (!win) {
        alert('書籤啟動失敗，請允許此網站彈出新視窗！');
        return;
      }
      
      // 5. Setup postMessage receiver to send payload once Xreader is loaded
      var listener = function(event) {
        // Clean URL to match origin
        var originURL = new URL(targetOrigin);
        if (event.origin === originURL.origin) {
          if (event.data === 'xreader-ready') {
            win.postMessage({
              type: 'xreader-import',
              title: title,
              url: url,
              content: content,
              isDirectory: isDirectory,
              links: links
            }, event.origin);
            window.removeEventListener('message', listener);
          }
        }
      };
      window.addEventListener('message', listener);
    })()`;

    // Minify whitespace and format as javascript: URI
    const minified = code
      .replace(/\s+/g, ' ')
      .replace(/; /g, ';')
      .trim();

    return `javascript:${encodeURIComponent(minified)}`;
  }
}

export default BookmarkletGenerator;
