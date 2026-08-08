import re
with open(r'C:\SmartTFD\write_page.py', 'r', encoding='utf-8') as f:
    txt = f.read()
def fix(s):
    def r(m):
        h = int(m.group(1), 16)
        l = int(m.group(2), 16)
        return chr((h - 0xD800) * 0x400 + (l - 0xDC00) + 0x10000)
    return re.sub(r'\\u([Dd][89AaBb][0-9A-Fa-f]{2})\\u([Dd][C-Fc-f][0-9A-Fa-f]{2})', r, s)
txt = fix(txt)
with open(r'C:\SmartTFD\write_page.py', 'w', encoding='utf-8') as f:
    f.write(txt)
print('fixed')
