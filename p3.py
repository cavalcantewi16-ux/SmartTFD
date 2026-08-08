with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

OLD = '<select value={pac.hospital_id} onChange={e=>setPac(rota._uid,pac._uid,{hospital_id:e.target.value})} className="w-full border rounded px-1 py-1">'
NEW = (
    '{pac.lat&&pac.lng&&('
    '<div className="bg-green-50 border border-green-200 rounded px-1.5 py-1 text-xs text-green-700 flex items-center justify-between gap-1">'
    '<span>[GPS] Loc. salva pelo motorista</span>'
    '<span className="font-mono opacity-70">{pac.lat?.toFixed(4)}, {pac.lng?.toFixed(4)}</span>'
    '</div>'
    ')}'
    '<select value={pac.hospital_id} onChange={e=>setPac(rota._uid,pac._uid,{hospital_id:e.target.value})} className="w-full border rounded px-1 py-1">'
)
txt = txt.replace(OLD, NEW)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK')
