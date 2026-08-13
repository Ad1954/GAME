import re
import sys

sys.stdout.reconfigure(encoding='utf-8')

file_path = r"C:\Users\sugas\.gemini\antigravity\brain\0efcf658-d9f4-4780-8b1b-3dda9b82e1d1\.system_generated\steps\22\content.md"

with open(file_path, "r", encoding="utf-8") as f:
    html = f.read()

matches = re.findall(r'<a\s+[^>]*href=["\']([^"\']+)["\'][^>]*>(.*?)</a>', html, re.DOTALL)

parsed_chapters = []
url_pattern = re.compile(r'/Book/Read/|/read/|/chapter/|chapter', re.IGNORECASE)
chapter_text_pattern = re.compile(r'第.+[章節回]|\d+|Chapter|Part', re.IGNORECASE)

for href, text in matches:
    text = re.sub(r'<[^>]+>', '', text).strip()
    if not text:
        continue
    is_chapter_text = bool(chapter_text_pattern.search(text))
    matches_route = bool(url_pattern.search(href))
    if (is_chapter_text or matches_route) and len(text) < 50:
        if not any(c['url'] == href for c in parsed_chapters):
            parsed_chapters.append({
                'title': text,
                'url': href
            })

# Let's parse Chinese chapter numbers to integers and find where indices shift
def cn_to_int(cn):
    # Very simple parser for numbers like "第一", "第一百一"
    # We can just extract the digits or words.
    # Since we just want to debug, we can use regex to find digits first.
    digits = re.findall(r'\d+', cn)
    if digits:
        return int(digits[0])
    
    # Simple Chinese number conversion for "第一百二十三" or "第123"
    cn_chars = {'零':0, '一':1, '二':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9, '十':10, '百':100, '千':1000}
    
    match = re.search(r'第\s*([零一二三四五六七八九十百千]+)\s*[章節回]', cn)
    if not match:
        return None
    val_str = match.group(1)
    
    # Simplified parser for Chinese numbers up to 2000
    res = 0
    temp = 0
    for char in val_str:
        if char == '千':
            res += (temp or 1) * 1000
            temp = 0
        elif char == '百':
            res += (temp or 1) * 100
            temp = 0
        elif char == '十':
            res += (temp or 1) * 10
            temp = 0
        else:
            temp = cn_chars.get(char, 0)
    res += temp
    return res

print("Scanning for index shifts:")
last_num = 0
for i, c in enumerate(parsed_chapters):
    num = cn_to_int(c['title'])
    if num is not None:
        diff = i - num
        # If the difference shifts, print it!
        if num != last_num + 1 and last_num != 0:
            print(f"Index {i}: title='{c['title']}', parsed_num={num}, expected={last_num + 1} (Discontinuity!)")
        last_num = num
