with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('type="time" value={pac.horario}')
print(repr(src[idx-50:idx+300]))
