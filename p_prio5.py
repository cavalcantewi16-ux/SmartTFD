with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) tipo novoForm
old1 = "useState<{nome:string;end:string;bairro:string;tel:string;recorrente:boolean;dias_semana:string[]}|null>(null)"
new1 = "useState<{nome:string;end:string;bairro:string;tel:string;recorrente:boolean;dias_semana:string[];prioridade:string}|null>(null)"

# 2) init modal
old2 = "setNovoForm({nome:modal.q,end:'',bairro:'',tel:'',recorrente:false,dias_semana:[]})"
new2 = "setNovoForm({nome:modal.q,end:'',bairro:'',tel:'',recorrente:false,dias_semana:[],prioridade:'media'})"

# 3) insert payload
old3 = "recorrente:novoForm.recorrente,dias_semana:novoForm.dias_semana}).select('id,nome,endereco,bairro,lat,lng').single()"
new3 = "recorrente:novoForm.recorrente,dias_semana:novoForm.dias_semana,prioridade:novoForm.prioridade}).select('id,nome,endereco,bairro,lat,lng').single()"

# 4) UI - inserir botoes prioridade antes da secao recorrente no modal
old4 = '<div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold text-gray-500 uppercase">\u2605 Recorrente</span>'
new4 = '<div className="mb-2"><p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Prioridade</p><div className="flex gap-1">{(["alta","media","baixa"]).map(pv=><button key={pv} type="button" onClick={()=>setNovoForm(f=>f?{...f,prioridade:pv}:null)} className={"px-2 py-0.5 rounded-full text-[10px] font-bold border transition "+(novoForm.prioridade===pv?(pv==="alta"?"bg-red-100 border-red-400 text-red-700":pv==="media"?"bg-yellow-100 border-yellow-400 text-yellow-700":"bg-green-100 border-green-400 text-green-700"):"border-gray-300 text-gray-400")}>{pv.charAt(0).toUpperCase()+pv.slice(1)}</button>)}</div></div><div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold text-gray-500 uppercase">\u2605 Recorrente</span>'

r = src
for i,(o,n) in enumerate([(old1,new1),(old2,new2),(old3,new3),(old4,new4)],1):
    if o in r: r=r.replace(o,n,1); print(f'{i} OK')
    else: print(f'{i} AVISO: nao encontrado')

with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r)
print('salvo')
