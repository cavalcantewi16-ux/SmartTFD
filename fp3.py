with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) label "Local do paciente" antes do input de endereco
old1 = '<div className="flex gap-1"><input value={pac.localizacao}'
new1 = '<p className="text-[10px] text-gray-400 mb-0.5">Local do paciente</p><div className="flex gap-1"><input value={pac.localizacao}'

# 2) label "Destino" + icone pin ao lado do hospital select
old2 = '<select value={pac.hospital_id} onChange={e=>setPac(rota._uid,pac._uid,{hospital_id:e.target.value})} className="w-full border rounded px-1 py-1">\n                      <option value="">-- Hospital --</option>\n                      {hospitais.map(h=><option key={h.id} value={h.id}>{h.nome}</option>)}\n                    </select>'
new2 = '<p className="text-[10px] text-gray-400 mt-2 mb-0.5">Destino</p><div className="flex items-center gap-1"><select value={pac.hospital_id} onChange={e=>setPac(rota._uid,pac._uid,{hospital_id:e.target.value})} className="flex-1 border rounded px-1 py-1">\n                      <option value="">-- Hospital --</option>\n                      {hospitais.map(h=><option key={h.id} value={h.id}>{h.nome}</option>)}\n                    </select><button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.destino_end||\'\',res:[],mode:\'destino\'})} className="text-red-500 hover:text-red-700 text-base px-1" title="Buscar destino no mapa">&#128205;</button></div>'

# 3) remover o campo destino separado
old3 = '<div className="flex items-center gap-1 mt-1">\n                      <input readOnly value={pac.destino_end||\'\'} placeholder="Destino" onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.destino_end||\'\',res:[],mode:\'destino\'})} className="border rounded-lg px-2 py-1 text-xs flex-1 text-gray-600 bg-white cursor-pointer"/>\n                      <button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.destino_end||\'\',res:[],mode:\'destino\'})} className="text-red-500 hover:text-red-700 text-base px-1" title="Buscar destino no mapa">&#128205;</button>\n                    </div>'
new3 = ''

r = src
for i,(o,n) in enumerate([(old1,new1),(old2,new2),(old3,new3)],1):
    if o in r: r=r.replace(o,n,1); print(f'{i} OK')
    else: print(f'{i} AVISO')

with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r)
print('salvo')
