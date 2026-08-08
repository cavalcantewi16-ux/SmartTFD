path = r'app\gestor\rotas-do-dia\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# 1) Tipo do novoForm: adicionar recorrente e dias_semana
old_type = '{nome:string;end:string;bairro:string;tel:string}'
new_type = '{nome:string;end:string;bairro:string;tel:string;recorrente:boolean;dias_semana:string[]}'
src = src.replace(old_type, new_type, 1)
print('1 tipo OK' if new_type in src else '1 AVISO')

# 2) Inicializacao do novoForm com os novos campos
old_init = "{nome:modal.q,end:'',bairro:'',tel:''}"
new_init = "{nome:modal.q,end:'',bairro:'',tel:'',recorrente:false,dias_semana:[]}"
src = src.replace(old_init, new_init, 1)
print('2 init OK' if new_init in src else '2 AVISO')

# 3) Insert: adicionar recorrente e dias_semana
old_ins = "bairro:novoForm.bairro.trim()||null,telefone:novoForm.tel.trim()||null}"
new_ins = "bairro:novoForm.bairro.trim()||null,telefone:novoForm.tel.trim()||null,recorrente:novoForm.recorrente,dias_semana:novoForm.dias_semana}"
src = src.replace(old_ins, new_ins, 1)
print('3 insert OK' if new_ins in src else '3 AVISO')

# 4) UI: adicionar toggle recorrente + dias antes dos botoes Salvar/Cancelar
old_btns = '<div className="flex gap-2"><button onClick={salvarNovoPac} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700">Salvar</button>'
new_btns = """<div className="border-t pt-2 mt-1"><div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold text-gray-500 uppercase">\u2605 Recorrente</span><div onClick={()=>setNovoForm(f=>f?{...f,recorrente:!f.recorrente}:null)} className={'relative w-8 h-4 rounded-full cursor-pointer '+(novoForm.recorrente?'bg-blue-600':'bg-gray-300')}><div className={'absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform '+(novoForm.recorrente?'translate-x-4':'')} /></div></div>{novoForm.recorrente&&(<div className="flex gap-1 flex-wrap mb-2">{['dom','seg','ter','qua','qui','sex','sab'].map(d=>{const a=novoForm.dias_semana.includes(d);return(<button key={d} type="button" onClick={()=>setNovoForm(f=>f?{...f,dias_semana:a?f.dias_semana.filter(x=>x!==d):[...f.dias_semana,d]}:null)} className={'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase '+(a?'bg-blue-600 text-white':'bg-gray-100 text-gray-400')}>{d}</button>)})}</div>)}</div><div className="flex gap-2"><button onClick={salvarNovoPac} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700">Salvar</button>"""
src = src.replace(old_btns, new_btns, 1)
print('4 UI OK' if 'Recorrente' in src else '4 AVISO')

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('Gravado')
