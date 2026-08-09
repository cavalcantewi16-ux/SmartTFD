with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('Recorrente')
while idx != -1:
    print(idx, repr(src[idx:idx+80]))
    idx = src.find('Recorrente', idx+1)
