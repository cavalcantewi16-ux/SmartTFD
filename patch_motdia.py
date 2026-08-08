path = r'app\motorista\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# 1) Adicionar estado dataVis (inicializado com hoje)
old_plans = "const[plans,setPlans]=useState<Plan[]>([]);const[sel,setSel]=useState<Plan|null>(null)"
new_plans = """const _d0=new Date();const _t0=_d0.getFullYear()+'-'+String(_d0.getMonth()+1).padStart(2,'0')+'-'+String(_d0.getDate()).padStart(2,'0')
  const[dataVis,setDataVis]=useState(_t0)
  const[plans,setPlans]=useState<Plan[]>([]);const[sel,setSel]=useState<Plan|null>(null)"""
src = src.replace(old_plans, new_plans, 1)
print('1 OK' if 'dataVis' in src else '1 AVISO')

# 2) Adicionar parametro dataParam ao carregar
old_carr = "const carregar=useCallback(async(uid?:string)=>{"
new_carr = "const carregar=useCallback(async(uid?:string,dataParam?:string)=>{"
src = src.replace(old_carr, new_carr, 1)
print('2 OK' if 'dataParam' in src else '2 AVISO')

# 3) Usar dataParam na query de data
old_hoje = "const d=new Date();const hoje=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')"
new_hoje = "const hoje=dataParam||(()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')})()"
src = src.replace(old_hoje, new_hoje, 1)
print('3 OK' if 'dataParam||' in src else '3 AVISO')

# 4) useEffect para recarregar quando dataVis muda
old_rt = "useEffect(()=>{if(!user)return;const ch=sb.channel('mot-rt')"
new_rt = """useEffect(()=>{if(user)carregar(undefined,dataVis)},[dataVis,user])
  useEffect(()=>{if(!user)return;const ch=sb.channel('mot-rt')"""
src = src.replace(old_rt, new_rt, 1)
print('4 OK' if 'carregar(undefined,dataVis)' in src else '4 AVISO')

# 5) Adicionar navegador de datas na lista de rotas (antes do texto "Rotas de hoje")
old_header = '<p className="text-gray-500 text-xs uppercase tracking-wider px-1">Rotas de hoje</p>'
nav = """<div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-3 flex items-center justify-between mb-1">
        <button onClick={()=>{const d=new Date(dataVis+'T12:00:00');d.setDate(d.getDate()-1);setDataVis(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))}} className="text-blue-400 hover:text-blue-300 text-2xl px-3 py-1">&#8249;</button>
        <div className="text-center">
          <p className="text-white font-bold text-sm">{new Date(dataVis+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long',day:'2-digit',month:'short'})}</p>
          {dataVis===_t0&&<p className="text-blue-400 text-xs">Hoje</p>}
          {dataVis!==_t0&&<button onClick={()=>setDataVis(_t0)} className="text-blue-400 text-xs hover:underline">Ir para hoje</button>}
        </div>
        <button onClick={()=>{const d=new Date(dataVis+'T12:00:00');d.setDate(d.getDate()+1);setDataVis(d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'))}} className="text-blue-400 hover:text-blue-300 text-2xl px-3 py-1">&#8250;</button>
      </div>
      <p className="text-gray-500 text-xs uppercase tracking-wider px-1">Rotas de hoje</p>"""
src = src.replace(old_header, nav, 1)
print('5 OK' if '&#8249;' in src else '5 AVISO')

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('Gravado')
