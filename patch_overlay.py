with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()

old = """onClick={()=>setSel(p)} className={'w-full text-left rounded-2xl border p-4 transition-all hover:border-blue-500/50 '+sc}><div className="flex items-start justify-between mb-2"><div><p className="text-white font-bold text-2xl font-mono">{fmtHora(null,leg?.horario_saida)}</p><p className="text-gray-500 text-xs">saida da garagem</p></div><span className={'text-xs px-2 py-1 rounded-full font-medium '+(p.status==='active'?'bg-green-900/50 text-green-300':p.status==='returning'?'bg-orange-900/50 text-orange-300':'bg-blue-900/50 text-blue-300')}>{STATUS_ROTA[p.status]||p.status}</span></div><div className="flex items-center justify-between text-xs text-gray-400"><span>{leg?.hospital?.nome||'Hospital'}</span><span>{p.veiculo?.modelo||p.veiculo?.placa}</span><span>{total} pax</span></div><div className="mt-2 text-right text-xs text-blue-400 font-medium">Ver rota &#8594;</div></button>"""

new = """onClick={()=>setSel(p)} className={'w-full text-left rounded-2xl border p-4 transition-all hover:border-blue-500/50 relative overflow-hidden '+sc}><div className="flex items-start justify-between mb-2"><div><p className="text-white font-bold text-2xl font-mono">{fmtHora(null,leg?.horario_saida)}</p><p className="text-gray-500 text-xs">saida da garagem</p>{p.codigo&&<p className="text-gray-600 text-xs font-mono mt-1">{p.codigo}</p>}</div><span className={'text-xs px-2 py-1 rounded-full font-medium '+(p.status==='active'?'bg-green-900/50 text-green-300':p.status==='returning'?'bg-orange-900/50 text-orange-300':'bg-blue-900/50 text-blue-300')}>{STATUS_ROTA[p.status]||p.status}</span></div><div className="flex items-center justify-between text-xs text-gray-400"><span>{leg?.hospital?.nome||'Hospital'}</span><span>{p.veiculo?.modelo||p.veiculo?.placa}</span><span>{total} pax</span></div>{p.status!=='completed'&&<div className="mt-2 text-right text-xs text-blue-400 font-medium">Ver rota &#8594;</div>}{p.status==='completed'&&<div className="absolute inset-0 bg-green-500/20 flex items-center justify-center"><div className="bg-green-500 rounded-full w-14 h-14 flex items-center justify-center text-white text-3xl font-bold">\u2713</div></div>}</button>"""

if old in src:
    with open(r'app\motorista\page.tsx', 'w', encoding='utf-8') as f:
        f.write(src.replace(old, new, 1))
    print('OK - overlay aplicado')
else:
    print('AVISO: nao encontrado')
