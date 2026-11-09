import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

with open('Commercial_Edition/proto_ui_logic.js', 'r', encoding='utf-8') as f:
    proto_js = f.read()

with open('Commercial_Edition/main_v2.js', 'r', encoding='utf-8') as f:
    main_js = f.read()

combined_js = proto_js + "\n" + main_js

with open('Commercial_Edition/index_v2.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Extract function names called in onclick/onchange
raw_calls = re.findall(r'(?:onclick|onchange)="([^"]+)"', html)
fn_names = set()
for call in raw_calls:
    # Match function call like myFunc(arg) or myFunc()
    matches = re.findall(r'([a-zA-Z0-9_$]+)\s*\(', call)
    for m in matches:
        if m not in ('alert', 'confirm', 'if', 'parseInt', 'Boolean', 'Number', 'String'):
            fn_names.add(m)

print(f"Total unique functions called from HTML: {len(fn_names)}")
for fn in sorted(fn_names):
    # Check if defined in proto_js or main_js (window.fn = or function fn( )
    is_defined = (
        f"window.{fn}" in combined_js or
        f"function {fn}" in combined_js or
        f"{fn} = (" in combined_js or
        f"window['{fn}']" in combined_js
    )
    status = "OK" if is_defined else "MISSING"
    print(f"[{status:7s}] {fn}")
