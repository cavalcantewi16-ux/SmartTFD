path = r'app\gestor\pacientes\[id]\page.tsx'
with open(path, encoding='utf-8') as f:
    src = f.read()

# 1) Adicionar estados de recorrencia apos [carregando, setCarregando]
old_state = "  const [carregando, setCarregando] = useState(true)"
new_state = """  const [carregando, setCarregando] = useState(true)
  const [recorrente, setRecorrente] = useState(false)
  const [diasSemana, setDiasSemana] = useState<string[]>([])
  const [salvandoRec, setSalvandoRec] = useState(false)"""
src = src.replace(old_state, new_state, 1)

# 2) Inicializar estados quando paciente carrega
old_set = "    setPaciente(p)"
new_set = """    setPaciente(p)
    setRecorrente((p as any)?.recorrente ?? false)
    setDiasSemana((p as any)?.dias_semana ?? [])"""
src = src.replace(old_set, new_set, 1)

# 3) Adicionar funcao salvarRecorrente antes do return
old_ret = "  if (carregando)"
new_ret = """  async function salvarRecorrente() {
    setSalvandoRec(true)
    await supabase.from('pacientes').update({ recorrente, dias_semana: diasSemana } as any).eq('id', id)
    setSalvandoRec(false)
    alert('Salvo!')
  }

  function toggleDia(d: string) {
    setDiasSemana(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  if (carregando)"""
src = src.replace(old_ret, new_ret, 1)

# 4) Inserir secao de recorrencia entre o card do paciente e o historico
old_hist = "      {/* Histórico de viagens */}"
new_hist = """      {/* Recorrencia */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">\u2605 Paciente Recorrente</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-500">{recorrente ? 'Sim' : 'N\u00e3o'}</span>
            <div onClick={() => setRecorrente(v => !v)}
              className={'relative w-10 h-5 rounded-full transition-colors cursor-pointer ' + (recorrente ? 'bg-blue-600' : 'bg-gray-300')}>
              <div className={'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ' + (recorrente ? 'translate-x-5' : '')} />
            </div>
          </label>
        </div>
        {recorrente && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Dias fixos de transporte:</p>
            <div className="flex gap-2 flex-wrap">
              {['dom','seg','ter','qua','qui','sex','sab'].map(d => (
                <button key={d} onClick={() => toggleDia(d)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ' +
                    (diasSemana.includes(d) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}>
                  {d}
                </button>
              ))}
            </div>
            {diasSemana.length > 0 && (
              <p className="text-xs text-blue-600">Dias selecionados: {diasSemana.join(', ')}</p>
            )}
          </div>
        )}
        <button onClick={salvarRecorrente} disabled={salvandoRec}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
          {salvandoRec ? 'Salvando...' : 'Salvar Recorr\u00eancia'}
        </button>
      </div>

      {/* Hist\u00f3rico de viagens */}"""
src = src.replace(old_hist, new_hist, 1)

with open(path, 'w', encoding='utf-8') as f:
    f.write(src)
print('OK')
