with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
# interface PacRota
idx = src.find('PacRota')
print(repr(src[idx:idx+250]))
print()
# onde nome aparece no card JSX
idx2 = src.find('pac.nome')
print(repr(src[idx2-50:idx2+200]))
