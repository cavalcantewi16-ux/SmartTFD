with open(r'app\gestor\pacientes\page.tsx', encoding='utf-8') as f:
    src = f.read()

old = '<div className="border-t pt-4 mt-2">\n            <div className="flex items-center justify-between mb-2">\n              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">\u2605 Paciente Recorrente</span>'

new = '<div className="border-t pt-4 mt-2">\n            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">Prioridade</label>\n            <div className="flex gap-2 mb-4">\n              {([\'alta\',\'media\',\'baixa\'] as const).map(p=><button key={p} type="button" onClick={()=>(setForm as any)(f=>({...f,prioridade:p}))} className={\'px-3 py-1 rounded-full text-xs font-bold border transition \'+(form.prioridade===p?(p===\'alta\'?\'bg-red-100 border-red-400 text-red-700\':p===\'media\'?\'bg-yellow-100 border-yellow-400 text-yellow-700\':\'bg-green-100 border-green-400 text-green-700\'):\'border-gray-300 text-gray-500\')}>{p.charAt(0).toUpperCase()+p.slice(1)}</button>)}\n            </div>\n          </div>\n          <div className="border-t pt-4 mt-2">\n            <div className="flex items-center justify-between mb-2">\n              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">\u2605 Paciente Recorrente</span>'

if old in src:
    with open(r'app\gestor\pacientes\page.tsx', 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK')
else:
    print('AVISO: nao encontrado')
