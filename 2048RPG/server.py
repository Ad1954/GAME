# server.py: Zero-Cache HTTP Server for Commercial Edition
import http.server
import socketserver
import sys
import os

# Fix Windows console encoding
if hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8081

class NoCacheHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_POST(self):
        if self.path == '/report_test_results':
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'test_results.json'), 'wb') as f:
                f.write(post_data)
            self.send_response(200)
            self.send_header('Content-Type', 'text/plain; charset=utf-8')
            self.end_headers()
            self.wfile.write(b'OK')
            return
        self.send_response(404)
        self.end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with http.server.ThreadingHTTPServer(("", PORT), NoCacheHTTPRequestHandler) as httpd:
    print("==================================================")
    print(f" 2048 RPG Commercial Edition Server Running!")
    print(f" URL: http://localhost:{PORT}")
    print(f" Cache-Control: no-cache, no-store")
    print("==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
