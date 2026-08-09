with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('Destino</p><div className="flex items-center gap-1">')
print(repr(src[idx:idx+400]))
