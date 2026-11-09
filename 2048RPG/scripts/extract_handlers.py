import re
import sys

# Ensure UTF-8 output
sys.stdout.reconfigure(encoding='utf-8')

with open('Commercial_Edition/index_v2.html', 'r', encoding='utf-8') as f:
    text = f.read()

handlers = re.findall(r'(?:onclick|onchange)="([^"]+)"', text)
for h in sorted(set(handlers)):
    print(h)
