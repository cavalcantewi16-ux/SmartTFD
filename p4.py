with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# 1. Estado novoForm
txt = txt.replace(
    "const [buscando, setBuscando] = useState(false)",
    "const [buscando, setBuscando] = useState(false)\n  const [novoForm, setNovoForm] = useState<{nome:string;end:string;bairro:string}|null>(null)"
)

# 2. Resetar novoForm quando modal fecha
txt = txt.replace(
    "  }, [sb])",
    "  }, [sb])\n\n  useEffect(()=>{ if(!modal) setNovoForm(null) },[modal])"
)

# 3. Funcao salvarNovoPac antes de salvar()
OLD3 = "  async function salvar() {"
NEW3 = """  async function salvarNovoPac() {
    if(!modal||!novoForm||!novoForm.nome.trim()) return
    const{data:novo}=await sb.from('pacientes').insert({nome:novoForm.nome.trim(),endereco:novoForm.end.trim()||null,bairro:novoForm.bairro.trim()||null}).select('id,nome,endereco,bairro,lat,lng').single()
    if(!novo) return
    setPacDB(p=>[...p,novo])
    selPac(novo)
    setNovoForm(null)
  }

  async function salvar() {"""
txt = txt.replace(OLD3, NEW3)

# 4. Adicionar botao e form no modal de busca
OLD4 = "{modal.q.length>=2&&!resultados.length&&<p className=\"text-sm text-gray-400 px-3 py-2\">Nenhum paciente encontrado.</p>}"
NEW4 = """{modal.q.length>=2&&!resultados.length&&<p className="text-sm text-gray-400 px-3 py-2">Nenhum paciente encontrado.</p>}
              {!novoForm&&<button onClick={()=>setNovoForm({nome:modal.q,end:'',bairro:''})} className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-semibold border-t mt-1">+ Adicionar novo paciente</button>}
              {novoForm&&(<div className="border-t pt-3 mt-1 space-y-2 px-1"><p className="text-xs font-bold text-gray-600 mb-1">Novo paciente</p><input value={novoForm.nome} onChange={e=>setNovoForm(f=>f?{...f,nome:e.target.value}:null)} placeholder="Nome completo *" className="w-full border rounded px-2 py-1.5 text-sm"/><input value={novoForm.end} onChange={e=>setNovoForm(f=>f?{...f,end:e.target.value}:null)} placeholder="Endereco" className="w-full border rounded px-2 py-1.5 text-sm"/><input value={novoForm.bairro} onChange={e=>setNovoForm(f=>f?{...f,bairro:e.target.value}:null)} placeholder="Bairro" className="w-full border rounded px-2 py-1.5 text-sm"/><div className="flex gap-2"><button onClick={salvarNovoPac} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700">Salvar</button><button onClick={()=>setNovoForm(null)} className="px-3 py-1.5 rounded text-sm border hover:bg-gray-50">Cancelar</button></div></div>)}"""
txt = txt.replace(OLD4, NEW4)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK')
