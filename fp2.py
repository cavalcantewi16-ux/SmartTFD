with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('value={pac.hospital_id}')
print(repr(src[idx-80:idx+350]))
