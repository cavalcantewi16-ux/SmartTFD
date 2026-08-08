import re

path = r'app\gestor\rotas-do-dia\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# 1) Adicionar estado pacientesFixos logo apos o bloco de useState existente
# Procura pelo ultimo useState antes do useEffect
old = "const loadedDate=useRef('')"
new = """const [pacientesFixos, setPacientesFixos] = useState<any[]>([])
  const [fixosAberto, setFixosAberto] = useState(true)
  const loadedDate=useRef('')"""
src = src.replace(old, new, 1)

# 2) Adicionar carregamento dos fixos no useEffect de auth ou criar novo useEffect
# Procura o useEffect de auth (que chama carregar ou load)
# Vamos inserir um useEffect novo logo apos o useEffect do loadedDate

target = "},[data,motoristas,veiculos])"
insert = """
  // Carregar pacientes recorrentes
  useEffect(() => {
    sb.from('pacientes').select('id,nome,bairro,endereco,hospital_frequente:hospitais(id,nome)').eq('recorrente', true).order('nome').then(({ data }) => {
      if (data) setPacientesFixos(data as any[])
    })
  }, [sb])"""

src = src.replace(target, target + insert, 1)

# 3) Inserir o painel de fixos logo antes do botao "+ Adicionar nova rota"
old_btn = '+ Adicionar nova rota'
panel = """{/* ── Pacientes Fixos Semanais ── */}
        {pacientesFixos.length > 0 && (
          <div className="mb-4 border border-amber-200 rounded-2xl overflow-hidden">
            <button onClick={() => setFixosAberto(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-amber-50 hover:bg-amber-100 transition-colors">
              <div className="flex items-center gap-2">
                <span className="text-amber-600 font-bold text-sm">&#9733; Pacientes Recorrentes</span>
                <span className="text-xs bg-amber-200 text-amber-700 rounded-full px-2 py-0.5">{pacientesFixos.length}</span>
              </div>
              <span className="text-amber-500 text-xs">{fixosAberto ? '&#9650;' : '&#9660;'}</span>
            </button>
            {fixosAberto && (
              <div className="bg-white divide-y divide-amber-50">
                {pacientesFixos.map(p => {
                  const jaIncluido = rotas.some(r => r.pacs.some((pp: any) => pp.paciente_id === p.id))
                  return (
                    <div key={p.id} className="flex items-center justify-between px-4 py-2.5">
                      <div>
                        <p className="font-medium text-gray-800 text-sm">{p.nome}</p>
                        <p className="text-xs text-gray-400">{[p.bairro, p.hospital_frequente?.nome].filter(Boolean).join(' \u2192 ')}</p>
                      </div>
                      {jaIncluido
                        ? <span className="text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">&#10003; Na rota</span>
                        : <span className="text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">Nao incluido</span>
                      }
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
        """
src = src.replace(old_btn, panel + old_btn, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('OK')
