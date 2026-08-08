with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# 3. Adicionar botao mapa ao lado do input localizacao
OLD = '<input value={pac.localizacao} placeholder='
NEW = '<div className="flex gap-1"><input value={pac.localizacao} placeholder='

txt = txt.replace(OLD, NEW)

OLD = 'onChange={e=>setPac(rota._uid,pac._uid,{localizacao:e.target.value})} className="w-full border rounded px-1.5 py-1 truncate"/>'
NEW = 'onChange={e=>setPac(rota._uid,pac._uid,{localizacao:e.target.value})} className="flex-1 min-w-0 border rounded px-1.5 py-1"/><button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.localizacao,res:[]})} className="text-blue-500 hover:text-blue-700 text-base px-1" title="Buscar no mapa">&#128205;</button></div>'
txt = txt.replace(OLD, NEW)

# 4. Adicionar modal de busca de localizacao antes do modal de paciente
OLD = '      {modal&&('
NEW = """      {locModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setLocModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-3">&#128205; Buscar localização</h3>
            <div className="flex gap-2">
              <input autoFocus value={locModal.q} onChange={e=>setLocModal(m=>m?{...m,q:e.target.value}:null)} onKeyDown={e=>e.key==='Enter'&&buscarLoc(locModal.q)} placeholder="Ex: Rua das Flores, Boqueirão PB" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
              <button onClick={()=>buscarLoc(locModal.q)} disabled={buscando} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{buscando?'...':'Buscar'}</button>
            </div>
            <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
              {locModal.res.map((r:any,i:number)=>(
                <button key={i} onClick={()=>selLoc(r)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm border-b border-gray-100">
                  <div className="font-medium text-gray-800 truncate">{r.display_name.split(',').slice(0,3).join(',')}</div>
                  <div className="text-xs text-gray-400">{r.lat}, {r.lon}</div>
                </button>
              ))}
              {locModal.res.length===0&&locModal.q.length>=3&&!buscando&&<p className="text-sm text-gray-400 px-3 py-2">Clique em Buscar para pesquisar.</p>}
            </div>
          </div>
        </div>
      )}
      {modal&&("""
txt = txt.replace(OLD, NEW)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK patch2')
