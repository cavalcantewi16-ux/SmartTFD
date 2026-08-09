with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

old = 'Destino</p><div className="flex items-center gap-1"><select value={pac.hospital_id} onChange={e=>setPac(rota._uid,pac._uid,{hospital_id:e.target.value})} className="flex-1 border rounded px-1 py-1">'
new = 'Destino</p><div className="flex items-center gap-1 w-full overflow-hidden"><select value={pac.hospital_id} onChange={e=>setPac(rota._uid,pac._uid,{hospital_id:e.target.value})} className="min-w-0 flex-1 border rounded px-1 py-1 truncate">'

if old in src:
    with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK')
else:
    print('AVISO')
