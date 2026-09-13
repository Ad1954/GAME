import http.server
import socketserver
import os
import sys
import urllib.request
import urllib.parse
import urllib.error
import json

PORT = 8000

class EnhancedHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/log':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length).decode('utf-8')
            try:
                data = json.loads(post_data)
                tag = data.get('tag', 'App')
                msg = data.get('message', '')
                level = data.get('level', 'info').upper()
                print(f"[{level}][{tag}] {msg}", flush=True)
            except Exception as e:
                print(f"[Log Error] {e}: {post_data}", flush=True)

            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            return

        super().do_POST()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        
        # Local CORS proxy endpoint (Residential IP direct fetch)
        if parsed.path == '/proxy':
            query = urllib.parse.parse_qs(parsed.query)
            target_url = query.get('url', [None])[0]
            
            if not target_url:
                self.send_response(400)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(b"Missing 'url' parameter")
                return

            try:
                headers = {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
                    "Accept-Language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7",
                    "Cache-Control": "no-cache",
                    "Pragma": "no-cache"
                }
                
                req = urllib.request.Request(target_url, headers=headers)
                with urllib.request.urlopen(req, timeout=15) as response:
                    content = response.read()
                    content_type = response.headers.get('Content-Type', 'text/html; charset=utf-8')
                    
                    self.send_response(response.status)
                    self.send_header('Content-Type', content_type)
                    self.end_headers()
                    self.wfile.write(content)
                    print(f"[Proxy 200] Successfully fetched: {target_url}", flush=True)
            except urllib.error.HTTPError as e:
                err_body = e.read()
                self.send_response(e.code)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.end_headers()
                self.wfile.write(err_body)
                print(f"[Proxy {e.code}] Error fetching {target_url}: {e.reason}", flush=True)
            except Exception as e:
                self.send_response(500)
                self.send_header('Content-Type', 'text/plain; charset=utf-8')
                self.end_headers()
                self.wfile.write(f"Proxy Error: {str(e)}".encode('utf-8'))
                print(f"[Proxy 500] Exception: {e}", flush=True)
            return

        super().do_GET()

def run():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), EnhancedHTTPRequestHandler) as httpd:
        print("=" * 60)
        print(" [new_Xreader] Zero-Cache & Direct-Proxy Server Running!")
        print(f" URL: http://localhost:{PORT}")
        print(" Features:")
        print("  - Cache Policy: NO-CACHE / NO-STORE (Always live latest code)")
        print("  - Local Proxy Endpoint: http://localhost:8000/proxy?url=...")
        print("  - Live Console Logger:  POST /api/log")
        print("=" * 60, flush=True)
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer shutting down gracefully.")

if __name__ == '__main__':
    run()
