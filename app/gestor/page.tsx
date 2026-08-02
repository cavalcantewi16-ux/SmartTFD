'use client'
import dynamic from 'next/dynamic'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const MapRotasAtivas = dynamic(() => import('@/components/MapRotasAtivas'), { ssr: false })

interface Paciente { id: string; nome: string }
interface Hospital { id: string; nome: string }
interface Profile  { id: string; nome: string }
interface Veiculo  { id: string; placa: string; capacidade: number }
interface Parada {
  id: string; viagem_id: string; ordem: number; status: string
  paciente?: Paciente; hospital?: Hospital
}
interface Viagem {
  id: string; status: string; motorista_id: string; observacoes?: string
  motorista?: Profile; veiculo?: Veiculo
  paradas: Parada[]
  localizacao?: { lat: number; lng: number; atualizado_em: string } | null
}

const STATUS_COR: Record<string, string> = {
  pendente:    'bg-yellow-100 text-yellow-800',
  embarcado:   'bg-blue-100 text-blue-800',
  concluido:   'bg-green-100 text-green-800',
  ausente:     'bg-gray-200 text-gray-500',
  cancelou:    'bg-red-100 text-red-600',
  desembarcou: 'bg-purple-100 text-purple-700',
}
const STATUS_EMOJI: Record<string, string> = {
  pendente: '⏳ Aguardando', embarcado: '🚌 No carro',
  concluido: '✅ Entregue', desembarcou: '🏥 Desembarcou',
  ausente: '⚠️ Ausente', cancelou: '✕ Cancelou',
}

export default function RotasAtivas() {
  const supabase = createClientComponentClient()
  const [viagens, setViagens]     = useState<Viagem[]>([])
  const [loading, setLoading]     = useState(true)
  const [data, setData]           = useState(() => new Date().toISOString().slice(0, 10))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dropTarget, setDropTarget] = useState<string | null>(null)
  const [confirmacao, setConfirmacao] = useState<{ parada: Parada; de: Viagem; para: Viagem } | null>(null)
  const [salvando, setSalvando]   = useState(false)
  const [msg, setMsg]             = useState('')
  const [abaMobile, setAbaMobile] = useState<'mapa' | 'rotas' | 'espera'>('rotas')

  const dragParadaRef = useRef<Parada | null>(null)
  const dragViagemRef = useRef<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true)
    try {
      const { data: vgs } = await supabase
        .from('viagens')
        .select('*, motorista:profiles!viagens_motorista_id_fkey(id,nome), veiculo:veiculos(id,placa,capacidade)')
        .eq('data', data)
        .in('status', ['agendada', 'em_andamento'])
        .order('created_at')

      const ids = (vgs || []).map((v: any) => v.id)
      const paradasMap: Record<string, Parada[]> = {}

      if (ids.length) {
        const { data: ps } = await supabase
          .from('viagem_paradas')
          .select('*, paciente:pacientes(id,nome), hospital:hospitais(id,nome)')
          .in('viagem_id', ids).order('ordem')
        ;(ps || []).forEach((p: any) => {
          if (!paradasMap[p.viagem_id]) paradasMap[p.viagem_id] = []
          paradasMap[p.viagem_id].push({ ...p, paciente: p.paciente, hospital: p.hospital })
        })
      }

      const mIds = (vgs || []).map((v: any) => v.motorista_id).filter(Boolean)
      const locsMap: Record<string, any> = {}
      if (mIds.length) {
        const { data: locs } = await supabase
          .from('motorista_localizacao')
          .select('motorista_id,lat,lng,atualizado_em')
          .in('motorista_id', mIds)
        ;(locs || []).forEach((l: any) => { locsMap[l.motorista_id] = l })
      }

      setViagens((vgs || []).map((v: any) => ({
        ...v,
        motorista: v.motorista,
        veiculo: v.veiculo,
        paradas: paradasMap[v.id] || [],
        localizacao: locsMap[v.motorista_id] || null,
      })))
    } finally {
      setLoading(false)
    }
  }, [data, supabase])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    const canal = supabase.channel('rotas-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viagem_paradas' }, () => carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_localizacao' }, () => carregar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, carregar])

  /* ── Drag & Drop ── */
  function onDragStart(e: React.DragEvent, parada: Parada, viagemId: string) {
    dragParadaRef.current = parada
    dragViagemRef.current = viagemId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', parada.id)
  }
  function onDragOver(e: React.DragEvent, targetId: string) {
    if (dragViagemRef.current === targetId) return
    e.preventDefault()
    setDropTarget(targetId)
  }
  function onDrop(e: React.DragEvent, targetViagem: Viagem) {
    e.preventDefault()
    setDropTarget(null)
    const parada = dragParadaRef.current
    const fromId = dragViagemRef.current
    if (!parada || !fromId || fromId === targetViagem.id) return
    const de = viagens.find(v => v.id === fromId)
    if (!de) return
    setConfirmacao({ parada, de, para: targetViagem })
  }

  async function confirmar() {
    if (!confirmacao || salvando) return
    setSalvando(true)
    try {
      const novaOrdem = confirmacao.para.paradas.length + 1
      const { error } = await supabase
        .from('viagem_paradas')
        .update({ viagem_id: confirmacao.para.id, ordem: novaOrdem })
        .eq('id', confirmacao.parada.id)
      if (error) throw error
      setMsg(`✅ ${confirmacao.parada.paciente?.nome} transferido para ${confirmacao.para.motorista?.nome}`)
      setTimeout(() => setMsg(''), 4000)
      setConfirmacao(null)
      await carregar()
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`)
    } finally {
      setSalvando(false)
    }
  }

  /* ── Computed stats ── */
  const totalPacientes = viagens.reduce((s, v) => s + v.paradas.length, 0)
  const aguardando = viagens.reduce((s, v) => s + v.paradas.filter(p => p.status === 'pendente').length, 0)
  const embarcados = viagens.reduce((s, v) => s + v.paradas.filter(p => p.status === 'embarcado').length, 0)
  const entregues  = viagens.reduce((s, v) => s + v.paradas.filter(p => ['concluido','desembarcou'].includes(p.status)).length, 0)

  // Fila de espera (pendente)
  const filaEspera = viagens.flatMap(v =>
    v.paradas
      .filter(p => p.status === 'pendente')
      .map(p => ({ ...p, motoristaNome: v.motorista?.nome || '—', placa: v.veiculo?.placa || '—' }))
  )

  const mapMarkers = viagens
    .filter(v => v.localizacao)
    .map(v => ({
      viagemId: v.id,
      motoristaNome: v.motorista?.nome || '—',
      lat: v.localizacao!.lat,
      lng: v.localizacao!.lng,
      pendentes:  v.paradas.filter(p => p.status === 'pendente').length,
      embarcados: v.paradas.filter(p => p.status === 'embarcado').length,
      entregues:  v.paradas.filter(p => ['concluido','desembarcou'].includes(p.status)).length,
      total: v.paradas.length,
      status: v.status,
      selected: v.id === selectedId,
    }))

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 56px)' }}>

      {/* ── Top bar ── */}
      <div className="bg-white border-b px-4 py-2.5 flex flex-wrap items-center gap-3 flex-shrink-0">
        <h1 className="font-bold text-gray-800">🗺️ Rotas Ativas</h1>
        <input type="date" value={data} onChange={e => setData(e.target.value)}
          className="border rounded px-2 py-1 text-sm" />
        <button onClick={carregar} className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700">🔄</button>
        <div className="flex gap-2 ml-auto flex-wrap text-xs">
          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">🚐 {viagens.length} rotas</span>
          <span className="bg-yellow-100 text-yellow-700 px-2.5 py-1 rounded-full">⏳ {aguardando} aguardando</span>
          <span className="bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">🚌 {embarcados} no carro</span>
          <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-full">✅ {entregues} entregues</span>
        </div>
      </div>

      {/* Flash */}
      {msg && (
        <div className={`mx-4 mt-2 flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium
          ${msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700'}`}>
          {msg}
        </div>
      )}

      {/* ── Mobile tabs ── */}
      <div className="md:hidden flex border-b bg-white flex-shrink-0">
        {(['mapa', 'rotas', 'espera'] as const).map(tab => (
          <button key={tab} onClick={() => setAbaMobile(tab)}
            className={`flex-1 py-2.5 text-xs font-medium capitalize transition
              ${abaMobile === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
            {tab === 'mapa' ? '🗺️ Mapa' : tab === 'rotas' ? '🚐 Rotas' : `⏳ Espera (${aguardando})`}
          </button>
        ))}
      </div>

      {/* ── Body ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* MAP — left 40% desktop | full mobile when tab=mapa */}
        <div className={`border-r bg-gray-100 relative
          ${abaMobile === 'mapa' ? 'flex' : 'hidden'} md:flex md:w-2/5`}
          style={{ minHeight: 0 }}>
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">Carregando mapa…</div>
          ) : (
            <MapRotasAtivas
              markers={mapMarkers}
              onSelect={id => setSelectedId(prev => prev === id ? null : id)}
              selectedId={selectedId}
            />
          )}
          {mapMarkers.length === 0 && !loading && (
            <div className="absolute bottom-4 left-0 right-0 text-center text-xs text-gray-400 bg-white/80 py-1.5 rounded mx-4">
              Nenhum GPS ativo — motoristas ainda não ligaram o rastreamento
            </div>
          )}
        </div>

        {/* RIGHT PANEL — 60% desktop */}
        <div className={`flex-1 flex flex-col overflow-hidden
          ${abaMobile === 'rotas' || abaMobile === 'espera' ? 'flex' : 'hidden'} md:flex`}>

          {/* Tip */}
          <div className="bg-blue-50 border-b border-blue-100 px-4 py-1.5 text-xs text-blue-600 flex-shrink-0">
            💡 Arraste qualquer paciente entre as colunas para redistribuir rotas em tempo real
          </div>

          {/* ── KANBAN ── */}
          <div className={`flex-1 overflow-auto p-4 ${abaMobile === 'espera' ? 'hidden md:block' : ''}`}>
            {loading ? (
              <div className="text-center py-16 text-gray-400">Carregando…</div>
            ) : viagens.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-4xl mb-3">🚐</div>
                <div className="font-medium">Nenhuma rota ativa em {data}</div>
                <div className="text-sm text-gray-400 mt-1">Crie agendamentos na aba Agendamento</div>
              </div>
            ) : (
              <div className="flex gap-3 items-start h-full">
                {viagens.map(viagem => {
                  const cap    = viagem.veiculo?.capacidade ?? 0
                  const ativos = viagem.paradas.filter(p => !['ausente','cancelou'].includes(p.status)).length
                  const pend   = viagem.paradas.filter(p => p.status === 'pendente').length
                  const pct    = cap > 0 ? Math.min(100, Math.round((ativos / cap) * 100)) : 0
                  const isSel  = selectedId === viagem.id
                  const isTgt  = dropTarget === viagem.id

                  return (
                    <div
                      key={viagem.id}
                      className={`w-64 flex-shrink-0 bg-white rounded-xl shadow flex flex-col transition-all
                        border-2 ${isSel ? 'border-blue-500 shadow-blue-100 shadow-lg ring-1 ring-blue-300' : isTgt ? 'border-green-400 bg-green-50/30' : 'border-transparent'}`}
                      onDragOver={e => onDragOver(e, viagem.id)}
                      onDragLeave={() => setDropTarget(null)}
                      onDrop={e => onDrop(e, viagem)}
                      onClick={() => setSelectedId(prev => prev === viagem.id ? null : viagem.id)}
                      style={{ cursor: 'pointer', minHeight: 200 }}
                    >
                      {/* Column header */}
                      <div className={`text-white rounded-t-xl px-4 py-3 transition-colors
                        ${viagem.status === 'em_andamento' ? 'bg-emerald-700' : 'bg-blue-700'}`}>
                        <div className="font-bold text-sm truncate">🧑‍✈️ {viagem.motorista?.nome || '—'}</div>
                        <div className="text-xs opacity-75 mt-0.5 flex items-center gap-2">
                          <span>{viagem.veiculo?.placa || '—'}</span>
                          {viagem.status === 'em_andamento' &&
                            <span className="bg-white/20 px-1.5 py-0.5 rounded text-[10px]">EM ROTA</span>}
                          {viagem.localizacao
                            ? <span className="text-[10px] opacity-70">📍 GPS ativo</span>
                            : <span className="text-[10px] opacity-40">📍 Sem GPS</span>}
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between text-[10px] opacity-70 mb-1">
                            <span>Capacidade</span>
                            <span>{ativos}/{cap}</span>
                          </div>
                          <div className="w-full bg-white/20 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full bg-white/80 transition-all" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      </div>

                      {/* Drop zone / patient list */}
                      <div className={`flex-1 p-3 space-y-2 transition-colors ${isTgt ? 'bg-green-50' : ''}`}
                        style={{ minHeight: 80 }}>
                        {viagem.paradas.length === 0 && (
                          <div className={`text-center text-xs py-5 border-2 border-dashed rounded-lg
                            ${isTgt ? 'border-green-400 text-green-500' : 'border-gray-200 text-gray-300'}`}>
                            {isTgt ? '⬇ Soltar aqui' : 'Sem pacientes'}
                          </div>
                        )}
                        {viagem.paradas.map(parada => (
                          <div
                            key={parada.id}
                            draggable
                            onDragStart={e => { e.stopPropagation(); onDragStart(e, parada, viagem.id) }}
                            onClick={e => e.stopPropagation()}
                            className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-xs
                              select-none cursor-grab active:cursor-grabbing
                              hover:border-blue-300 hover:shadow-sm transition-all"
                          >
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-semibold text-gray-800 truncate">
                                <span className="text-gray-300 mr-1">⠿</span>
                                {parada.paciente?.nome || '—'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1 mt-1">
                              <span className="text-gray-400 truncate text-[10px]">🏥 {parada.hospital?.nome || '—'}</span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap
                                ${STATUS_COR[parada.status] || 'bg-gray-100 text-gray-500'}`}>
                                {STATUS_EMOJI[parada.status] || parada.status}
                              </span>
                            </div>
                          </div>
                        ))}
                        {viagem.paradas.length > 0 && isTgt && (
                          <div className="border-2 border-dashed border-green-400 rounded-lg py-2 text-center text-green-500 text-xs">
                            ⬇ Soltar aqui
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="border-t px-4 py-2 text-[10px] text-gray-400 rounded-b-xl flex justify-between items-center">
                        <span>{viagem.paradas.length} paciente{viagem.paradas.length !== 1 ? 's' : ''}</span>
                        {pend > 0 && (
                          <span className="text-yellow-600 font-medium">⏳ {pend} aguardando</span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* ── FILA DE ESPERA (mobile tab / always visible on desktop as bottom bar) ── */}
          <div className={`
            ${abaMobile === 'espera' ? 'flex-1 overflow-auto' : 'hidden'}
            md:block md:flex-shrink-0 md:border-t md:max-h-48 md:overflow-auto
            bg-yellow-50 border-t border-yellow-200
          `}>
            <div className="px-4 py-2 sticky top-0 bg-yellow-50 border-b border-yellow-200">
              <h3 className="text-xs font-bold text-yellow-800 uppercase tracking-wide">
                ⏳ Fila de Espera — Pacientes aguardando embarque ({filaEspera.length})
              </h3>
            </div>
            {filaEspera.length === 0 ? (
              <div className="px-4 py-3 text-xs text-yellow-700">
                {viagens.length === 0 ? 'Nenhuma rota ativa.' : '✅ Todos os pacientes foram atendidos.'}
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 px-4 py-3">
                {filaEspera.map(p => (
                  <div key={p.id} className="bg-white border border-yellow-200 rounded-lg px-3 py-2 text-xs shadow-sm">
                    <div className="font-semibold text-gray-800">{p.paciente?.nome || '—'}</div>
                    <div className="text-gray-400 mt-0.5">🧑‍✈️ {p.motoristaNome} · {p.placa}</div>
                    <div className="text-gray-400 text-[10px]">🏥 {p.hospital?.nome || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Confirm modal ── */}
      {confirmacao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Confirmar Transferência</h2>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-xl p-3">
                <div className="text-xs text-gray-400 mb-1">Paciente</div>
                <div className="font-semibold text-gray-800">{confirmacao.parada.paciente?.nome}</div>
                <span className={`inline-block text-xs mt-1 px-2 py-0.5 rounded-full font-medium
                  ${STATUS_COR[confirmacao.parada.status] || 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_EMOJI[confirmacao.parada.status] || confirmacao.parada.status}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-red-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-red-400 mb-1">De</div>
                  <div className="font-semibold text-red-700 text-xs truncate">{confirmacao.de.motorista?.nome}</div>
                  <div className="text-red-400 text-[11px]">{confirmacao.de.veiculo?.placa}</div>
                </div>
                <div className="text-xl text-gray-300 font-light">→</div>
                <div className="flex-1 bg-green-50 rounded-xl p-3 text-center">
                  <div className="text-xs text-green-400 mb-1">Para</div>
                  <div className="font-semibold text-green-700 text-xs truncate">{confirmacao.para.motorista?.nome}</div>
                  <div className="text-green-400 text-[11px]">{confirmacao.para.veiculo?.placa}</div>
                </div>
              </div>
              {['embarcado','desembarcou'].includes(confirmacao.parada.status) && (
                <div className="bg-orange-50 text-orange-700 text-xs px-3 py-2 rounded-xl border border-orange-100">
                  ⚠️ Paciente já está no carro. A transferência moverá o registro para a nova rota.
                </div>
              )}
              <p className="text-[11px] text-gray-400 text-center">
                O motorista de destino verá a atualização em tempo real.
              </p>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmacao(null)}
                className="flex-1 border border-gray-200 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={confirmar} disabled={salvando}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Transferindo…' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
