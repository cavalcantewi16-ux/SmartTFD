with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('<select')
while idx != -1:
    chunk = src[idx:idx+300]
    if 'hospital' in chunk.lower():
        print(repr(src[idx-50:idx+500]))
        break
    idx = src.find('<select', idx+1)
