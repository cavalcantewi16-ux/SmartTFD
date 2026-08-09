with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('confirmarLoc()')
print(repr(src[idx:idx+600]))
