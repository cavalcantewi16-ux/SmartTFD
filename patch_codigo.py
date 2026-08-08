# ── PATCH 1: gestor - gerar codigo ao salvar rota ───────────────────────────
path1 = r'app\gestor\rotas-do-dia\page.tsx'
with open(path1, encoding='utf-8') as f:
    s1 = f.read()

old_ins = "await sb.from('route_plans').insert({data,motorista_id:rota.motorista_id,veiculo_id:rota.veiculo_id,status:'draft'}).select('id').single()"
new_ins = """await sb.from('route_plans').insert({data,motorista_id:rota.motorista_id,veiculo_id:rota.veiculo_id,status:'draft',codigo:'TFD-'+data.replace(/-/g,'')+'-'+Math.random().toString(36).toUpperCase().slice(2,6)}).select('id').single()"""
s1 = s1.replace(old_ins, new_ins, 1)
print('1a OK' if 'codigo' in s1 else '1a AVISO')

with open(path1,'w',encoding='utf-8') as f:
    f.write(s1)

# ── PATCH 2: motorista - select+filtro incluir completed, mostrar codigo ─────
path2 = r'app\motorista\page.tsx'
with open(path2, encoding='utf-8') as f:
    s2 = f.read()

# 2a) Adicionar codigo ao select
old_sel = "sb.from('route_plans').select('id,data,status,veiculo:veiculos(id,placa,modelo),motorista:profiles(id,nome)"
new_sel = "sb.from('route_plans').select('id,data,status,codigo,veiculo:veiculos(id,placa,modelo),motorista:profiles(id,nome)"
s2 = s2.replace(old_sel, new_sel, 1)
print('2a OK' if 'codigo,' in s2 else '2a AVISO')

# 2b) Incluir 'completed' no filtro de status
old_status = ".in('status',['draft','active','returning'])"
new_status = ".in('status',['draft','active','returning','completed'])"
s2 = s2.replace(old_status, new_status, 1)
print('2b OK' if "'completed'" in s2 else '2b AVISO')

# 2c) Adicionar codigo na interface Plan
old_iface = "interface Plan{id:string;data:string;status:string;"
new_iface = "interface Plan{id:string;data:string;status:string;codigo?:string;"
s2 = s2.replace(old_iface, new_iface, 1)
print('2c OK' if 'codigo?:string' in s2 else '2c AVISO')

# 2d) Card da lista: mostrar codigo + overlay verde para completed
old_card = """<button key={p.id} onClick={()=>setSel(p)} className={'w-full text-left rounded-2xl border p-4 transition-all hover:border-blue-500/50 '+sc}>
            <div className="flex items-start justify-between mb-2">
              <div><p className="text-white font-bold text-2xl font-mono">{fmtHora(null,leg?.horario_saida)}</p><p className="text-gray-500 text-xs">saida da garagem</p></div>
              <span className={'text-xs px-2 py-1 rounded-full font-medium '+(p.status==='active'?'bg-green-900/50 text-green-300':p.status==='returning'?'bg-orange-900/50 text-orange-300':'bg-blue-900/50 text-blue-300')}>{STATUS_ROTA[p.status]||p.status}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{leg?.hospital?.nome||'Hospital'}</span>
              <span>{p.veiculo?.modelo||p.veiculo?.placa}</span>
              <span>{total} pax</span>
            </div>
            <div className="mt-2 text-right text-xs text-blue-400 font-medium">Ver rota &#8594;</div>
          </button>"""
new_card = """<button key={p.id} onClick={()=>setSel(p)} className={'relative w-full text-left rounded-2xl border p-4 transition-all overflow-hidden '+(p.status==='completed'?'border-green-500/50 bg-green-900/10':sc)}>
            {p.status==='completed'&&(<div className="absolute inset-0 bg-green-900/60 flex flex-col items-center justify-center gap-2 z-10 backdrop-blur-[1px]"><div className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center text-white text-3xl font-bold shadow-lg">\u2713</div><p className="text-green-300 font-bold text-sm">Concluida</p>{p.codigo&&<p className="text-green-400/70 text-xs font-mono">{p.codigo}</p>}</div>)}
            <div className="flex items-start justify-between mb-2">
              <div><p className="text-white font-bold text-2xl font-mono">{fmtHora(null,leg?.horario_saida)}</p>{p.codigo&&<p className="text-gray-500 text-[10px] font-mono">{p.codigo}</p>}</div>
              <span className={'text-xs px-2 py-1 rounded-full font-medium '+(p.status==='active'?'bg-green-900/50 text-green-300':p.status==='returning'?'bg-orange-900/50 text-orange-300':p.status==='completed'?'bg-green-800/50 text-green-400':'bg-blue-900/50 text-blue-300')}>{STATUS_ROTA[p.status]||p.status}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span>{leg?.hospital?.nome||'Hospital'}</span>
              <span>{p.veiculo?.modelo||p.veiculo?.placa}</span>
              <span>{total} pax</span>
            </div>
            {p.status!=='completed'&&<div className="mt-2 text-right text-xs text-blue-400 font-medium">Ver rota &#8594;</div>}
          </button>"""
s2 = s2.replace(old_card, new_card, 1)
print('2d OK' if 'Concluida' in s2 else '2d AVISO')

with open(path2,'w',encoding='utf-8') as f:
    f.write(s2)
print('Gravado')
