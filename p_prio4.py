with open(r'app\gestor\pacientes\[id]\page.tsx', encoding='utf-8') as f:
    src = f.read()

old = '<div className="flex items-center justify-between mb-3">\n          <h4 className="text-sm font-semibold text-gray-700">\u2605 Paciente Recorrente</h4>'

new = '<div className="mb-4">\n          <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Prioridade</p>\n          <div className="flex gap-2">\n            {([\'alta\',\'media\',\'baixa\'] as const).map(p=><button key={p} type="button" onClick={()=>setPrioridade(p)} className={\'px-3 py-1 rounded-full text-xs font-bold border transition \'+(prioridade===p?(p===\'alta\'?\'bg-red-100 border-red-400 text-red-700\':p===\'media\'?\'bg-yellow-100 border-yellow-400 text-yellow-700\':\'bg-green-100 border-green-400 text-green-700\'):\'border-gray-300 text-gray-500\')}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>)}\n          </div>\n        </div>\n        <div className="flex items-center justify-between mb-3">\n          <h4 className="text-sm font-semibold text-gray-700">\u2605 Paciente Recorrente</h4>'

if old in src:
    with open(r'app\gestor\pacientes\[id]\page.tsx', 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK')
else:
    print('AVISO')
