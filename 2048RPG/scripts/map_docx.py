import docx
import sys

sys.stdout.reconfigure(encoding='utf-8')
doc = docx.Document(r'C:\Antigravity\2048RPG\TEMP\2048RPG製品版V2_修改意見001.docx')

for i, p in enumerate(doc.paragraphs):
    imgs = p._element.xpath('.//a:blip/@r:embed')
    txt = p.text.strip()
    if txt or imgs:
        img_names = [doc.part.rels[r].target_ref for r in imgs]
        print(f"P{i:02d}: text='{txt}' | images={img_names}")
