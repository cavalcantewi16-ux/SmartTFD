'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

type ViagemHistorico = {
  id: string
  data: string
  status: string
  observacoes?: string
  motorista: { nome: string } | null
  veiculo: { modelo: string; capacidade: number } | null
  paradas: Array<{
    status: string
    ordem: number
    paciente: { nome: string; municipio: string } | null
    hospital: { nome: string } | null
  }>
}

const STATUS_CONFIG: Record<string, { label: string; cor: string; dot: string }> = {
  pendente:     { label: 'Pendente',     cor: 'bg-yellow-50 text-yellow-700 border-yellow-200', dot: 'bg-yellow-400' },
  em_andamento: { label: 'Em andamento', cor: 'bg-blue-50 text-blue-700 border-blue-200',       dot: 'bg-blue-500'   },
  concluida:    { label: 'Concluída',    cor: 'bg-green-50 text-green-700 border-green-200',    dot: 'bg-green-500'  },
  cancelada:    { label: 'Cancelada',    cor: 'bg-gray-100 text-gray-500 border-gray-200',      dot: 'bg-gray-400'   },
}

export default function HistoricoPage() {
  const supabase = createClientComponentClient<Database>()
  const [viagens, setViagens] = useState<ViagemHistorico[]>([])
  const [motoristas, setMotoristas] = useState<{ id: string; nome: string }[]>([])
  const [carregando, setCarregando] = useState(true)
  const [expandido, setExpandido] = useState<string | null>(null)

  // Filtros
  const hoje = new Date().toISOString().split('T')[0]
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30)
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(hoje)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [filtroMotorista, setFiltroMotorista] = useState('')
  const [busca, setBusca] = useState('')

  // Estatísticas
  const total = viagens.length
  const concluidas = viagens.filter(v => v.status === 'concluida').length
  const canceladas = viagens.filter(v => v.status === 'cancelada').length
  const pacientesTransportados = viagens
    .filter(v => v.status === 'concluida')
    .reduce((s, v) => s + (v.paradas?.length ?? 0), 0)

  const carregar = useCallback(async () => {
    setCarregando(true)

    let query = supabase
      .from('viagens')
      .select(`
        id, data, status, observacoes,
        motorista:profiles!motorista_id(nome),
        veiculo:veiculos!veiculo_id(modelo, capacidade),
        paradas:viagem_paradas(
          status, ordem,
          paciente:pacientes(nome, municipio),
          hospital:hospitais(nome)
        )
      `)
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: false })

    if (filtroStatus) query = query.eq('status', filtroStatus)
    if (filtroMotorista) query = query.eq('motorista_id', filtroMotorista)

    const { data } = await query
    setViagens((data as any) ?? [])
    setCarregando(false)
  }, [supabase, dataInicio, dataFim, filtroStatus, filtroMotorista])

  const carregarMotoristas = useCallback(async () => {
    const { data } = await supabase.from('profiles').select('id, nome').eq('role', 'motorista').order('nome')
    setMotoristas((data as any) ?? [])
  }, [supabase])

  useEffect(() => { carregarMotoristas() }, [carregarMotoristas])
  useEffect(() => { carregar() }, [carregar])

  const viagensFiltradas = viagens.filter(v => {
    if (!busca) return true
    const b = busca.toLowerCase()
  
  function exportarCSV() {
    const linhas = [
      ['Data', 'Status', 'Motorista', 'Veículo', 'Pacientes', 'Entregues'].join(';'),
      ...viagensFiltradas.map(v => [
        v.data,
        v.status,
        v.motorista?.nome ?? '—',
        v.veiculo?.modelo ?? '—',
        v.paradas?.length ?? 0,
        v.paradas?.filter(p => ['concluido','desembarcou'].includes(p.status)).length ?? 0,
      ].join(';'))
    ]
    const csv = linhas.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smarttfd_relatorio_${dataInicio}_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
      (v.motorista?.nome ?? '').toLowerCase().includes(b) ||
      (v.veiculo?.modelo ?? '').toLowerCase().includes(b) ||
      v.paradas?.some(p =>
        (p.paciente?.nome ?? '').toLowerCase().includes(b) ||
        (p.hospital?.nome ?? '').toLowerCase().includes(b)
      )
    )
  })

  function formatarData(data: string) {
    return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  function limparFiltros() {
    const d = new Date(); d.setDate(d.getDate() - 30)
    setDataInicio(d.toISOString().split('T')[0])
    setDataFim(hoje)
    setFiltroStatus('')
    setFiltroMotorista('')
    setBusca('')
  }

  const temFiltroAtivo = filtroStatus || filtroMotorista || busca


  function exportarCSV() {
    const linhas = [
      ['Data', 'Status', 'Motorista', 'Veículo', 'Pacientes', 'Entregues'].join(';'),
      ...viagensFiltradas.map(v => [
        v.data,
        v.status,
        v.motorista?.nome ?? '—',
        v.veiculo?.modelo ?? '—',
        v.paradas?.length ?? 0,
        v.paradas?.filter(p => ['concluido','desembarcou'].includes(p.status)).length ?? 0,
      ].join(';'))
    ]
    const csv = linhas.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smarttfd_relatorio_${dataInicio}_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Histórico de Viagens</h2>
          <p className="text-sm text-gray-500">{viagensFiltradas.length} viagem{viagensFiltradas.length !== 1 ? 's' : ''} encontrada{viagensFiltradas.length !== 1 ? 's' : ''}</p>
        </div>
          <div className="flex items-center gap-3">
          {temFiltroAtivo && (
            <button onClick={limparFiltros} className="text-xs text-blue-700 hover:underline">
              ✕ Limpar filtros
            </button>
          )}
          <button
            onClick={exportarCSV}
            className="bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-green-800 transition-colors flex items-center gap-1.5"
          >
            ⬇️ Exportar CSV
          </button>
        </div>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { emoji: '📋', label: 'Total', valor: total, cor: 'text-gray-800' },
          { emoji: '✅', label: 'Concluídas', valor: concluidas, cor: 'text-green-700' },
          { emoji: '✕',  label: 'Canceladas', valor: canceladas, cor: 'text-red-600' },
          { emoji: '👥', label: 'Pacientes', valor: pacientesTransportados, cor: 'text-blue-700' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm text-center">
            <p className="text-xl">{c.emoji}</p>
            <p className={`text-2xl font-bold ${c.cor}`}>{c.valor}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">De</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Até</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
            <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Todos</option>
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Motorista</label>
            <select value={filtroMotorista} onChange={e => setFiltroMotorista(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">Todos</option>
              {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3 relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input type="text" placeholder="Buscar por motorista, veículo, paciente ou hospital…"
            value={busca} onChange={e => setBusca(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      ) : viagensFiltradas.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 py-16">
          <span className="text-4xl">📋</span>
          <p className="text-sm">Nenhuma viagem encontrada para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {viagensFiltradas.map(v => {
            const cfg = STATUS_CONFIG[v.status] ?? STATUS_CONFIG.pendente
            const aberto = expandido === v.id
            const embarcados = v.paradas?.filter(p => p.status === 'embarcado').length ?? 0
            const concluidos = v.paradas?.filter(p => p.status === 'concluido').length ?? 0
            const total = v.paradas?.length ?? 0

          
  function exportarCSV() {
    const linhas = [
      ['Data', 'Status', 'Motorista', 'Veículo', 'Pacientes', 'Entregues'].join(';'),
      ...viagensFiltradas.map(v => [
        v.data,
        v.status,
        v.motorista?.nome ?? '—',
        v.veiculo?.modelo ?? '—',
        v.paradas?.length ?? 0,
        v.paradas?.filter(p => ['concluido','desembarcou'].includes(p.status)).length ?? 0,
      ].join(';'))
    ]
    const csv = linhas.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smarttfd_relatorio_${dataInicio}_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
              <div key={v.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                {/* Linha principal */}
                <button
                  onClick={() => setExpandido(aberto ? null : v.id)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.dot}`} />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-800 text-sm">{v.motorista?.nome ?? '—'}</p>
                          <span className="text-gray-400 text-xs">·</span>
                          <p className="text-xs text-gray-500">{v.veiculo?.modelo ?? '—'}</p>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatarData(v.data)}</p>
                        {v.observacoes && (
                          <p className="text-xs text-gray-500 mt-1 truncate">📝 {v.observacoes}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="text-right">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cor}`}>
                          {cfg.label}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">{total} paciente{total !== 1 ? 's' : ''}</p>
                      </div>
                      <span className={`text-gray-400 text-sm transition-transform ${aberto ? 'rotate-180' : ''}`}>▾</span>
                    </div>
                  </div>
                </button>

                {/* Detalhe expandido */}
                {aberto && (
                  <div className="border-t border-gray-100 px-4 pb-4 pt-3">
                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                      <span>🪑 Capacidade: {v.veiculo?.capacidade ?? '—'}</span>
                      {v.status === 'concluida' && (
                        <>
                          <span>✅ Concluídos: {concluidos}</span>
                          <span>👥 Embarcados: {embarcados}</span>
                        </>
                      )}
                    </div>

                    {total === 0 ? (
                      <p className="text-xs text-gray-400 italic">Nenhuma parada registrada.</p>
                    ) : (
                      <div className="space-y-2">
                        {v.paradas
                          ?.sort((a, b) => a.ordem - b.ordem)
                          .map((p, i) => {
                            const paradaStatus: Record<string, string> = {
                              pendente:  'bg-gray-200 text-gray-600',
                              embarcado: 'bg-blue-100 text-blue-700',
                              concluido: 'bg-green-100 text-green-700',
                            }
                          
  function exportarCSV() {
    const linhas = [
      ['Data', 'Status', 'Motorista', 'Veículo', 'Pacientes', 'Entregues'].join(';'),
      ...viagensFiltradas.map(v => [
        v.data,
        v.status,
        v.motorista?.nome ?? '—',
        v.veiculo?.modelo ?? '—',
        v.paradas?.length ?? 0,
        v.paradas?.filter(p => ['concluido','desembarcou'].includes(p.status)).length ?? 0,
      ].join(';'))
    ]
    const csv = linhas.join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `smarttfd_relatorio_${dataInicio}_${dataFim}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
                              <div key={i} className="flex items-center gap-3 text-xs">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold flex-shrink-0 ${paradaStatus[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                  {i + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <span className="font-medium text-gray-800 truncate block">
                                    {p.paciente?.nome ?? '—'}
                                    {p.paciente?.municipio && <span className="text-gray-400 font-normal"> · {p.paciente.municipio}</span>}
                                  </span>
                                </div>
                                <span className="text-gray-400">→</span>
                                <span className="text-gray-600 truncate max-w-[140px]">{p.hospital?.nome ?? '—'}</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${paradaStatus[p.status] ?? ''}`}>
                                  {p.status}
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
