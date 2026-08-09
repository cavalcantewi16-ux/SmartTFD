with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('novoForm.recorrente')
print(repr(src[idx-100:idx+300]))
