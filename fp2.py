with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('setLocModal({ru:rota._uid,pu:pac._uid,q:pac.localizacao')
print(repr(src[idx+60:idx+200]))
