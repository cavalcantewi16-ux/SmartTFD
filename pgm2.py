with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

start = txt.index('      {locModal&&(')
end   = txt.index('\n      {modal&&(', start)

new_block = """      {locModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>{setLocModal(null);setLocPick(null)}}>
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-3">&#128205; Localizar paciente</h3>
            <input id="gmap-search" autoFocus defaultValue={locModal.q} placeholder="Buscar endereco no Google Maps..." className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300"/>
            {!gmLoaded&&<div style={{height:'300px'}} className="flex items-center justify-center text-gray-400 text-sm border rounded-xl">Carregando mapa...</div>}
            {gmLoaded&&<div id="gmap-loc" style={{height:'300px',width:'100%',borderRadius:'12px'}}/>}
            <div className="flex gap-2 mt-3 items-center">
              {locPick&&<span className="text-xs text-gray-500 flex-1">&#128205; {locPick.lat.toFixed(5)}, {locPick.lng.toFixed(5)}</span>}
              <button onClick={()=>{setLocModal(null);setLocPick(null)}} className="px-4 py-2 rounded-lg border text-sm">Cancelar</button>
              <button onClick={confirmarLoc} disabled={!locPick} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-40">Confirmar localizacao</button>
            </div>
          </div>
        </div>
      )}"""

txt = txt[:start] + new_block + txt[end:]

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK patchB')
