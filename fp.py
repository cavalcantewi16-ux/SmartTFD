with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find("mode:'destino'")
print(repr(src[idx-200:idx+300]))
