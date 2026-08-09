with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('salvarNovoPac')
print(repr(src[idx:idx+400]))
