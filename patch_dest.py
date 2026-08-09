with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) PacRota interface
old1 = "hospital_id:string; horario:string }"
new1 = "hospital_id:string; horario:string; destino_lat?:number|null; destino_lng?:number|null; destino_end?:string }"

# 2) locModal type
old2 = "useState<{ru:string;pu:string;q:string;res:any[]}|null>(null)"
new2 = "useState<{ru:string;pu:string;q:string;res:any[];mode:'pickup'|'destino'}|null>(null)"

# 3) confirmarLoc - adicionar branch destino
old3 = "confirmarLoc(){\n    if(!locModal||!locPick) return\n    const q=locModal.q||locPick.lat.toFixed(5)+', '+locPick.lng.toFixed(5)\n    setPac(locModal.ru,locModal.pu,{localizacao:q,lat_gestor:locPick.lat,lng_gestor:locPick.lng})"
new3 = "confirmarLoc(){\n    if(!locModal||!locPick) return\n    if(locModal.mode==='destino'){\n      const qd=locModal.q||locPick.lat.toFixed(5)+', '+locPick.lng.toFixed(5)\n      setPac(locModal.ru,locModal.pu,{destino_lat:locPick.lat,destino_lng:locPick.lng,destino_end:qd})\n      setLocModal(null);setLocPick(null);return\n    }\n    const q=locModal.q||locPick.lat.toFixed(5)+', '+locPick.lng.toFixed(5)\n    setPac(locModal.ru,locModal.pu,{localizacao:q,lat_gestor:locPick.lat,lng_gestor:locPick.lng})"

# 4) abrir locModal para pickup (adicionar mode:'pickup')
old4 = "setLocModal({ru:rota._uid,pu:pac._uid,q:pac.localizacao,res:[]})"
new4 = "setLocModal({ru:rota._uid,pu:pac._uid,q:pac.localizacao,res:[],mode:'pickup'})"

# 5) apos select hospital: botao destino + mostrar destino salvo
old5 = "{hospitais.map(h=><option key={h.id} value={h.id}>{h.nome}</option>)}\n                    </select>\n                    <input type=\"time\" value={pac.horario}"
new5 = "{hospitais.map(h=><option key={h.id} value={h.id}>{h.nome}</option>)}\n                    </select>\n                    <div className=\"flex items-center gap-1 mt-1\">\n                      <button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.destino_end||'',res:[],mode:'destino'})} className=\"text-purple-500 hover:text-purple-700 text-xs px-2 py-1 border border-purple-200 rounded flex items-center gap-1\" title=\"Definir destino no mapa\">&#128205; Destino</button>\n                      {pac.destino_lat&&<span className=\"text-xs text-purple-600 truncate\">{pac.destino_lat.toFixed(4)}, {pac.destino_lng?.toFixed(4)}</span>}\n                      {pac.destino_end&&!pac.destino_lat&&<span className=\"text-xs text-purple-600 truncate\">{pac.destino_end}</span>}\n                      {pac.destino_lat&&<button onClick={()=>setPac(rota._uid,pac._uid,{destino_lat:null,destino_lng:null,destino_end:undefined})} className=\"text-red-400 hover:text-red-600 text-xs\">x</button>}\n                    </div>\n                    <input type=\"time\" value={pac.horario}"

# 6) leg_passengers insert incluir destino
old6 = "await sb.from('leg_passengers').insert({leg_id:leg.id,paciente_id:p.paciente_id,ordem:i+1,status:'aguardando'})"
new6 = "await sb.from('leg_passengers').insert({leg_id:leg.id,paciente_id:p.paciente_id,ordem:i+1,status:'aguardando',...(p.destino_lat?{destino_lat:p.destino_lat,destino_lng:p.destino_lng,destino_end:p.destino_end}:{})})"

r = src
for i,(o,n) in enumerate([(old1,new1),(old2,new2),(old3,new3),(old4,new4),(old5,new5),(old6,new6)],1):
    if o in r: r=r.replace(o,n,1); print(f'{i} OK')
    else: print(f'{i} AVISO')

with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r)
print('salvo')
