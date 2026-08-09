with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

old = '<div className="flex items-center gap-1 mt-1">\n                      <button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.destino_end||\'\',res:[],mode:\'destino\'})} className="text-purple-500 hover:text-purple-700 text-xs px-2 py-1 border border-purple-200 rounded flex items-center gap-1" title="Definir destino no mapa">&#128205; Destino</button>\n                      {pac.destino_lat&&<span className="text-xs text-purple-600 truncate">{pac.destino_lat.toFixed(4)}, {pac.destino_lng?.toFixed(4)}</span>}\n                      {pac.destino_end&&!pac.destino_lat&&<span className="text-xs text-purple-600 truncate">{pac.destino_end}</span>}\n                      {pac.destino_lat&&<button onClick={()=>setPac(rota._uid,pac._uid,{destino_lat:null,destino_lng:null,destino_end:undefined})} className="text-red-400 hover:text-red-600 text-xs">x</button>}\n                    </div>'

new = '<div className="flex items-center gap-1 mt-1">\n                      <input readOnly value={pac.destino_end||\'\'} placeholder="Destino" onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.destino_end||\'\',res:[],mode:\'destino\'})} className="border rounded-lg px-2 py-1 text-xs flex-1 text-gray-600 bg-white cursor-pointer"/>\n                      <button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.destino_end||\'\',res:[],mode:\'destino\'})} className="text-red-500 hover:text-red-700 text-base px-1" title="Buscar destino no mapa">&#128205;</button>\n                    </div>'

if old in src:
    with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK')
else:
    print('AVISO')
