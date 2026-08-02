'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Paciente { id: string; nome: string; cpf?: string }
interface Hospital  { id: string; nome: string }
interface Profile   { id: string; nome: string }
interface Veiculo   { id: string; placa: string; capacidade: number }

interface Parada {
  id: string
  viagem_id: string
  paciente_id: string
  hospital_id: string
  ordem: number
  status: string
  paciente?: Paciente
  hospital?: Hospital
}

interface Viagem {
  id: string
  data_viagem: string
  status: string
  motorista_id: string
  veiculo_id: string
  motorista?: Profile
  veiculo?: Veiculo
  paradas: Parada[]
}

const STATUS_COR: Record<string, string> = {
  pendente:    'bg-yellow-100 text-yellow-800',
  embarcado:   'bg-blue-100 text-blue-800',
  concluido:   'bg-green-100 text-green-800',
  ausente:     'bg-gray-200 text-gray-600',
  cancelou:    'bg-red-100 text-red-600',
  desembarcou: 'bg-purple-100 text-purple-800',
}
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', embarcado: 'Embarcado', concluido: 'Concluído',
  ausente: 'Ausente', cancelou: 'Cancelou', desembarcou: 'Desembarcou',
}

export default function Redistribuicao() {
  const supabase = createClientComponentClient()
  const [viagens, setViagens] = useState<Viagem[]>([])
  const [loading, setLoading] = useState(true)
  const [erro, setErro] = useState('')
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10))
  const [confirmacao, setConfirmacao] = useState<{
    parada: Parada; deViagem: Viagem; paraViagem: Viagem
  } | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [dropTarget, setDropTarget] = useState<string | null>(null)

  const dragParadaRef = useRef<Parada | null>(null)
  const dragViagemRef = useRef<string | null>(null)

  const carregar = useCallback(async () => {
    setLoading(true); setErro('')
    try {
      const { data: vgs, error: e1 } = await supabase
        .from('viagens')
        .select('*, motorista:profiles!viagens_motorista_id_fkey(id,nome), veiculo:veiculos(id,placa,capacidade)')
        .eq('data_viagem', data)
        .in('status', ['agendada', 'em_andamento'])
        .order('created_at')
      if (e1) throw e1

      const ids = (vgs || []).map((v: any) => v.id)
      const paradasMap: Record<string, Parada[]> = {}

      if (ids.length) {
        const { data: ps, error: e2 } = await supabase
          .from('viagem_paradas')
          .select('*, paciente:pacientes(id,nome,cpf), hospital:hospitais(id,nome)')
          .in('viagem_id', ids)
          .order('ordem')
        if (e2) throw e2
        ;(ps || []).forEach((p: any) => {
          if (!paradasMap[p.viagem_id]) paradasMap[p.viagem_id] = []
          paradasMap[p.viagem_id].push({ ...p, paciente: p.paciente, hospital: p.hospital })
        })
      }

      setViagens((vgs || []).map((v: any) => ({
        ...v,
        motorista: v.motorista,
        veiculo: v.veiculo,
        paradas: paradasMap[v.id] || [],
      })))
    } catch (err: any) {
      setErro(err.message || 'Erro ao carregar viagens')
    } finally {
      setLoading(false)
    }
  }, [data, supabase])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    const canal = supabase
      .channel('redistribuicao-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viagem_paradas' }, () => carregar())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [supabase, carregar])

  function handleDragStart(e: React.DragEvent, parada: Parada, viagemId: string) {
    dragParadaRef.current = parada
    dragViagemRef.current = viagemId
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', parada.id)
  }

  function handleDragOver(e: React.DragEvent, targetViagemId: string) {
    if (dragViagemRef.current === targetViagemId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDropTarget(targetViagemId)
  }

  function handleDragLeave(targetViagemId: string) {
    setDropTarget(prev => prev === targetViagemId ? null : prev)
  }

  function handleDrop(e: React.DragEvent, targetViagem: Viagem) {
    e.preventDefault()
    setDropTarget(null)
    const parada  = dragParadaRef.current
    const fromId  = dragViagemRef.current
    if (!parada || !fromId || fromId === targetViagem.id) return

    const deViagem = viagens.find(v => v.id === fromId)
    if (!deViagem) return

    const ocupacao = targetViagem.paradas.filter(
      p => !['ausente','cancelou','concluido'].includes(p.status)
    ).length
    const cap = targetViagem.veiculo?.capacidade ?? 999

    if (ocupacao >= cap) {
      setMsg(`⚠️ Veículo ${targetViagem.veiculo?.placa} está cheio (${cap} passageiros)`)
      setTimeout(() => setMsg(''), 3500)
      return
    }

    if (['embarcado','desembarcou'].includes(parada.status)) {
      setMsg('⚠️ Não é possível mover um paciente que já embarcou')
      setTimeout(() => setMsg(''), 3500)
      return
    }

    setConfirmacao({ parada, deViagem, paraViagem: targetViagem })
  }

  async function confirmarTransferencia() {
    if (!confirmacao || salvando) return
    setSalvando(true)
    try {
      const novaOrdem = confirmacao.paraViagem.paradas.length + 1
      const { error } = await supabase
        .from('viagem_paradas')
        .update({ viagem_id: confirmacao.paraViagem.id, ordem: novaOrdem })
        .eq('id', confirmacao.parada.id)
      if (error) throw error
      setMsg(`✅ ${confirmacao.parada.paciente?.nome} transferido com sucesso`)
      setTimeout(() => setMsg(''), 3000)
      setConfirmacao(null)
      await carregar()
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`)
    } finally {
      setSalvando(false)
    }
  }

  const paradasAtivas = (v: Viagem) =>
    v.paradas.filter(p => !['ausente','cancelou','concluido'].includes(p.status)).length

  return (
    <div className="flex-1 flex flex-col bg-gray-50 min-h-0">
      {/* Header */}
      <div className="bg-white border-b px-6 py-3 flex flex-wrap items-center gap-4">
        <h1 className="text-lg font-bold text-gray-800">🔀 Redistribuição de Rotas</h1>
        <div className="flex items-center gap-2 ml-auto">
          <label className="text-sm text-gray-600">Data:</label>
          <input
            type="date"
            value={data}
            onChange={e => setData(e.target.value)}
            className="border rounded px-2 py-1 text-sm"
          />
          <button
            onClick={carregar}
            className="bg-blue-600 text-white text-sm px-3 py-1 rounded hover:bg-blue-700"
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Flash message */}
      {msg && (
        <div className={`mx-6 mt-3 px-4 py-2 rounded text-sm font-medium
          ${msg.startsWith('✅') ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
          {msg}
        </div>
      )}

      {/* Dica */}
      <div className="mx-6 mt-3 px-4 py-2 rounded bg-blue-50 text-blue-700 text-sm">
        💡 Arraste o card de um paciente para outra coluna para transferi-lo.
        Apenas pacientes com status <strong>Pendente</strong> podem ser movidos.
      </div>

      {/* Board */}
      <div className="flex-1 overflow-auto p-6">
        {loading ? (
          <div className="text-center py-16 text-gray-400">Carregando viagens…</div>
        ) : erro ? (
          <div className="text-center py-16 text-red-500">{erro}</div>
        ) : viagens.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            Nenhuma viagem ativa em {data}
          </div>
        ) : (
          <div className="flex gap-4 items-start">
            {viagens.map(viagem => {
              const cap  = viagem.veiculo?.capacidade ?? 0
              const ocup = paradasAtivas(viagem)
              const pct  = cap > 0 ? Math.min(100, Math.round((ocup / cap) * 100)) : 0
              const cheio = ocup >= cap
              const isTarget = dropTarget === viagem.id

              return (
                <div
                  key={viagem.id}
                  className={`w-72 flex-shrink-0 bg-white rounded-xl shadow flex flex-col transition-all
                    border-2 ${isTarget ? 'border-blue-400 shadow-blue-200 shadow-lg' : cheio ? 'border-red-300' : 'border-transparent'}`}
                  onDragOver={e => handleDragOver(e, viagem.id)}
                  onDragLeave={() => handleDragLeave(viagem.id)}
                  onDrop={e => handleDrop(e, viagem)}
                >
                  {/* Coluna header */}
                  <div className="bg-blue-700 text-white rounded-t-xl px-4 py-3">
                    <div className="font-bold truncate">🚐 {viagem.motorista?.nome ?? '—'}</div>
                    <div className="text-blue-200 text-xs mt-0.5 flex items-center gap-2">
                      {viagem.veiculo?.placa ?? '—'}
                      {viagem.status === 'em_andamento' &&
                        <span className="bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">EM ROTA</span>}
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-[11px] text-blue-200 mb-1">
                        <span>Capacidade</span>
                        <span className={cheio ? 'text-red-300 font-semibold' : ''}>{ocup}/{cap}</span>
                      </div>
                      <div className="w-full bg-blue-900 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${cheio ? 'bg-red-400' : 'bg-green-400'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <div className={`flex-1 p-3 space-y-2 min-h-[120px] transition-colors
                    ${isTarget ? 'bg-blue-50' : ''}`}>
                    {viagem.paradas.length === 0 && (
                      <div className={`text-center text-xs py-6 border-2 border-dashed rounded-lg
                        ${isTarget ? 'border-blue-400 text-blue-400' : 'border-gray-200 text-gray-300'}`}>
                        {isTarget ? 'Soltar aqui' : 'Sem pacientes'}
                      </div>
                    )}
                    {viagem.paradas.map(parada => {
                      const arrastavel = parada.status === 'pendente'
                      return (
                        <div
                          key={parada.id}
                          draggable={arrastavel}
                          onDragStart={arrastavel ? e => handleDragStart(e, parada, viagem.id) : undefined}
                          className={`rounded-lg border px-3 py-2 text-sm select-none transition-all
                            ${arrastavel
                              ? 'cursor-grab active:cursor-grabbing hover:shadow-md hover:border-blue-400 bg-white'
                              : 'bg-gray-50 opacity-70 cursor-default border-gray-100'}`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <div className="font-medium text-gray-800 truncate flex-1">
                              {arrastavel && <span className="mr-1 text-gray-300 text-base">⠿</span>}
                              {parada.paciente?.nome ?? '—'}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold whitespace-nowrap
                              ${STATUS_COR[parada.status] ?? 'bg-gray-100 text-gray-600'}`}>
                              {STATUS_LABEL[parada.status] ?? parada.status}
                            </span>
                          </div>
                          <div className="text-gray-400 text-xs mt-0.5 truncate">
                            🏥 {parada.hospital?.nome ?? '—'}
                          </div>
                        </div>
                      )
                    })}

                    {viagem.paradas.length > 0 && isTarget && (
                      <div className="border-2 border-dashed border-blue-400 rounded-lg py-3 text-center text-blue-400 text-xs">
                        Soltar aqui
                      </div>
                    )}
                  </div>

                  {/* Rodapé */}
                  <div className="border-t px-4 py-2 text-xs text-gray-400 rounded-b-xl">
                    {viagem.paradas.length} parada{viagem.paradas.length !== 1 ? 's' : ''}
                    {cheio && <span className="ml-2 text-red-400 font-semibold">• CHEIO</span>}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      {confirmacao && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">Confirmar transferência</h2>
            <div className="space-y-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <div className="text-gray-500 text-xs uppercase tracking-wide mb-1">Paciente</div>
                <div className="font-semibold text-gray-800">{confirmacao.parada.paciente?.nome}</div>
                <div className="text-gray-400 text-xs">{confirmacao.parada.paciente?.cpf}</div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-red-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-red-400 uppercase tracking-wide mb-1">De</div>
                  <div className="font-medium text-red-700 text-xs truncate">
                    {confirmacao.deViagem.motorista?.nome}
                  </div>
                  <div className="text-red-400 text-[11px]">{confirmacao.deViagem.veiculo?.placa}</div>
                </div>
                <div className="text-2xl text-gray-400">→</div>
                <div className="flex-1 bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-green-400 uppercase tracking-wide mb-1">Para</div>
                  <div className="font-medium text-green-700 text-xs truncate">
                    {confirmacao.paraViagem.motorista?.nome}
                  </div>
                  <div className="text-green-400 text-[11px]">{confirmacao.paraViagem.veiculo?.placa}</div>
                </div>
              </div>
              <p className="text-gray-400 text-xs text-center">
                O motorista de destino verá a atualização em tempo real no app.
              </p>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setConfirmacao(null)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarTransferencia}
                disabled={salvando}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {salvando ? 'Transferindo…' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
 
