with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) remover badge ao lado do nome (estava truncando)
old1 = "{pac.nome||'\U0001f464 Paciente'}</button>{pac.prioridade&&<span className={'text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 '+(pac.prioridade==='alta'?'bg-red-100 text-red-700':pac.prioridade==='baixa'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700')}>{pac.prioridade.charAt(0).toUpperCase()+pac.prioridade.slice(1)}</span>}"
new1 = "{pac.nome||'\U0001f464 Paciente'}</button>"

# 2) label "horario de consulta" + badge de prioridade apos o input de horario
old2 = '<input type="time" value={pac.horario} onChange={e=>setPac(rota._uid,pac._uid,{horario:e.target.value})} className="w-full border rounded px-1 py-1"/>\n                    <button onClick={()=>removePac(rota._uid,pac._uid)}'
new2 = '<p className="text-[10px] text-gray-400 mt-2 mb-0.5">Hor\u00e1rio de consulta</p><input type="time" value={pac.horario} onChange={e=>setPac(rota._uid,pac._uid,{horario:e.target.value})} className="w-full border rounded px-1 py-1"/>{pac.prioridade&&<div className={"mt-1 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full "+(pac.prioridade==="alta"?"bg-red-100 text-red-700":pac.prioridade==="baixa"?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700")}>Prioridade: {pac.prioridade.charAt(0).toUpperCase()+pac.prioridade.slice(1)}</div>}\n                    <button onClick={()=>removePac(rota._uid,pac._uid)}'

r = src
for i,(o,n) in enumerate([(old1,new1),(old2,new2)],1):
    if o in r: r=r.replace(o,n,1); print(f'{i} OK')
    else: print(f'{i} AVISO')

with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r)
print('salvo')
