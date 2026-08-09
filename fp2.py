with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
old = "from('pacientes').select('id,nome,endereco,bairro,lat,lng,lat_gestor,lng_gestor')"
new = "from('pacientes').select('id,nome,endereco,bairro,lat,lng,lat_gestor,lng_gestor,prioridade')"
if old in src:
    with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK')
else:
    print('AVISO')
