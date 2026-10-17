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

        if self.path == '/api/save_visual_tuning' or self.path == '/api/reset_visual_tuning':
            import json
            content_length = int(self.headers.get('Content-Length', 0))
            post_data = self.rfile.read(content_length)
            try:
                if self.path == '/api/reset_visual_tuning':
                    config = {
                        "hero": {"scale": 1.40, "transY": -3, "outline": "white", "spotlight": "on"},
                        "equip": {"scale": 1.20, "transY": 0, "shadow": "sharp"},
                        "monster": {"scale": 1.35, "transY": 0, "aura": "blood"}
                    }
                else:
                    payload = json.loads(post_data.decode('utf-8'))
                    # Strict validation & clamping
                    h = payload.get('hero', {})
                    e = payload.get('equip', {})
                    m = payload.get('monster', {})

                    h_scale = max(0.5, min(2.5, float(h.get('scale', 1.40))))
                    h_trans = max(-50, min(50, int(h.get('transY', -3))))
                    h_outline = h.get('outline', 'white') if h.get('outline') in ['none', 'white', 'blue', 'gold'] else 'white'
                    h_spot = 'on' if h.get('spotlight') == 'on' else 'off'

                    e_scale = max(0.5, min(2.5, float(e.get('scale', 1.20))))
                    e_trans = max(-50, min(50, int(e.get('transY', 0))))
                    e_shadow = e.get('shadow', 'sharp') if e.get('shadow') in ['soft', 'medium', 'sharp', 'gold'] else 'sharp'

                    m_scale = max(0.5, min(2.5, float(m.get('scale', 1.35))))
                    m_trans = max(-50, min(50, int(m.get('transY', 0))))
                    m_aura = m.get('aura', 'blood') if m.get('aura') in ['none', 'blood', 'purple', 'toxic', 'white'] else 'blood'

                    config = {
                        "hero": {"scale": round(h_scale, 2), "transY": h_trans, "outline": h_outline, "spotlight": h_spot},
                        "equip": {"scale": round(e_scale, 2), "transY": e_trans, "shadow": e_shadow},
                        "monster": {"scale": round(m_scale, 2), "transY": m_trans, "aura": m_aura}
                    }

                base_dir = os.path.dirname(os.path.abspath(__file__))
                # 1. Save JSON config
                json_path = os.path.join(base_dir, 'visual_tuning.json')
                with open(json_path, 'w', encoding='utf-8') as f:
                    json.dump(config, f, indent=2, ensure_ascii=False)

                # 2. Generate CSS
                hero_filters = {
                    'none': 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                    'white': 'drop-shadow(0 0 1.5px rgba(255,255,255,0.95)) drop-shadow(0 2px 5px rgba(0,0,0,0.85))',
                    'blue': 'drop-shadow(0 0 2px rgba(56,189,248,0.95)) drop-shadow(0 2px 5px rgba(0,0,0,0.85))',
                    'gold': 'drop-shadow(0 0 2px rgba(250,204,21,0.95)) drop-shadow(0 2px 5px rgba(0,0,0,0.85))'
                }
                equip_filters = {
                    'soft': 'drop-shadow(0 2px 3px rgba(0,0,0,0.4))',
                    'medium': 'drop-shadow(0 2px 5px rgba(0,0,0,0.7))',
                    'sharp': 'drop-shadow(0 3px 6px rgba(0,0,0,0.9))',
                    'gold': 'drop-shadow(0 0 2px rgba(250,204,21,0.9)) drop-shadow(0 2px 5px rgba(0,0,0,0.8))'
                }
                monster_filters = {
                    'none': 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
                    'blood': 'drop-shadow(0 0 2.5px rgba(239,68,68,0.95)) drop-shadow(0 3px 6px rgba(0,0,0,0.85))',
                    'purple': 'drop-shadow(0 0 2.5px rgba(168,85,247,0.95)) drop-shadow(0 3px 6px rgba(0,0,0,0.85))',
                    'toxic': 'drop-shadow(0 0 2.5px rgba(34,197,94,0.95)) drop-shadow(0 3px 6px rgba(0,0,0,0.85))',
                    'white': 'drop-shadow(0 0 1.5px rgba(255,255,255,0.95)) drop-shadow(0 2px 5px rgba(0,0,0,0.85))'
                }

                h_val = config['hero']
                e_val = config['equip']
                m_val = config['monster']

                css_content = f"""/* ========================================================
   2048 RPG: Visual Tuning Configuration (C-STORY-064)
   Autogenerated by Visual Tuning Studio. Do not edit manually.
   ======================================================== */

:root {{
  --hero-scale: {h_val['scale']:.2f};
  --hero-trans-y: {h_val['transY']}px;
  --hero-filter: {hero_filters[h_val['outline']]};
  --hero-spotlight-display: {'block' if h_val['spotlight'] == 'on' else 'none'};

  --equip-scale: {e_val['scale']:.2f};
  --equip-trans-y: {e_val['transY']}px;
  --equip-filter: {equip_filters[e_val['shadow']]};

  --monster-scale: {m_val['scale']:.2f};
  --monster-trans-y: {m_val['transY']}px;
  --monster-filter: {monster_filters[m_val['aura']]};
}}

/* 1. Hero Tiles (In-Game Board & Studio Matrix) */
.tile.tile-hero .tile-icon-img,
.tile-hero .tile-icon-img,
.sim-tile.type-hero .hero-dynamic-img {{
  transform: scale(var(--hero-scale)) translateY(var(--hero-trans-y)) !important;
  filter: var(--hero-filter) !important;
  transform-origin: center center !important;
}}

.tile.tile-hero .tile-badge::before,
.tile-hero .tile-badge::before,
.hero-spotlight {{
  display: var(--hero-spotlight-display) !important;
}}

/* 2. Equipment Tiles (In-Game Board & Studio Matrix) */
.tile.tile-equipment .tile-icon-img,
.tile-equipment .tile-icon-img,
.sim-tile.type-equip .equip-dynamic-img {{
  transform: scale(var(--equip-scale)) translateY(var(--equip-trans-y)) !important;
  filter: var(--equip-filter) !important;
  transform-origin: center center !important;
}}

/* 3. Monster Tiles (In-Game Board & Studio Matrix) */
.tile.tile-monster .tile-badge:not(.has-tile-img),
.tile-monster .tile-badge:not(.has-tile-img),
.tile.tile-monster .tile-icon-img,
.tile-monster .tile-icon-img,
.sim-tile.type-monster .monster-dynamic-target,
.sim-tile.type-monster .monster-clay-img {{
  transform: scale(var(--monster-scale)) translateY(var(--monster-trans-y)) !important;
  filter: var(--monster-filter) !important;
  transform-origin: center center !important;
}}
"""
                css_path = os.path.join(base_dir, 'visual_tuning.css')
                with open(css_path, 'w', encoding='utf-8') as f:
                    f.write(css_content)

                self.send_response(200)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": True, "config": config}).encode('utf-8'))
                return
            except Exception as ex:
                self.send_response(500)
                self.send_header('Content-Type', 'application/json; charset=utf-8')
                self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(ex)}).encode('utf-8'))
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
