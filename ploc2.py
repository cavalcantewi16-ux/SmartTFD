with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# Dois badges separados
OLD_BADGE = '{pac.lat&&pac.lng&&(<div className="bg-green-50 border border-green-200 rounded px-1.5 py-1 text-xs text-green-700 flex items-center justify-between gap-1"><span>[GPS] Loc. salva pelo motorista</span><span className="font-mono opacity-70">{pac.lat?.toFixed(4)}, {pac.lng?.toFixed(4)}</span></div>)}'
NEW_BADGE = (
    '{pac.lat_gestor&&pac.lng_gestor&&(<div className="bg-blue-50 border border-blue-200 rounded px-1.5 py-1 text-xs text-blue-700 flex items-center justify-between gap-1"><span>Loc. salva pelo gestor</span><span className="font-mono opacity-70">{pac.lat_gestor?.toFixed(4)}, {pac.lng_gestor?.toFixed(4)}</span></div>)}'
    '{pac.lat&&pac.lng&&(<div className="bg-green-50 border border-green-200 rounded px-1.5 py-1 text-xs text-green-700 flex items-center justify-between gap-1"><span>Loc. salva pelo motorista</span><span className="font-mono opacity-70">{pac.lat?.toFixed(4)}, {pac.lng?.toFixed(4)}</span></div>)}'
)
txt = txt.replace(OLD_BADGE, NEW_BADGE)

# otimizarOrdem - preferir lat_gestor
txt = txt.replace(
    "left.forEach((p,i)=>{const l=p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;const d=hav(prev.lat,prev.lng,l.lat,l.lng);if(d<bd){bd=d;bi=i}})",
    "left.forEach((p,i)=>{const l=p.lat_gestor&&p.lng_gestor?{lat:p.lat_gestor,lng:p.lng_gestor}:p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;const d=hav(prev.lat,prev.lng,l.lat,l.lng);if(d<bd){bd=d;bi=i}})"
)
txt = txt.replace(
    "prev=picked.lat&&picked.lng?{lat:picked.lat,lng:picked.lng}:GARAGEM",
    "prev=picked.lat_gestor&&picked.lng_gestor?{lat:picked.lat_gestor,lng:picked.lng_gestor}:picked.lat&&picked.lng?{lat:picked.lat,lng:picked.lng}:GARAGEM"
)

# calcTempo - preferir lat_gestor
txt = txt.replace(
    "for(const p of pacs){const pl=p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;km+=hav(prev.lat,prev.lng,pl.lat,pl.lng);prev=pl}",
    "for(const p of pacs){const pl=p.lat_gestor&&p.lng_gestor?{lat:p.lat_gestor,lng:p.lng_gestor}:p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;km+=hav(prev.lat,prev.lng,pl.lat,pl.lng);prev=pl}"
)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK patchB')
