'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, StatusParada } from '@/types/database'

interface Parada {
  id: string
  ordem: number
  status: StatusParada
  hora_embarque?: string | null
  hora_chegada?: string | null
  paciente: { nome: string; municipio: string; endereco: string; lat: number; lng: number } | null
  hospital: { nome: string; municipio: string; lat: number; lng: number } | null
}

interface DadosViagem {
  id: string
  status: 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
  veiculoModelo: string
  veiculoCapacidade: number
  paradas: Parada[]
}

const STATUS_COR: Record<StatusParada, string> = {
  pendente:    'bg-gray-700 text-gray-300',
  embarcado:   'bg-blue-800 text-blue-200',
  concluido:   'bg-green-800 text-green-200',
  desembarcou: 'bg-green-800 text-green-200',
  ausente:     'bg-yellow-800 text-yellow-200',
  cancelou:    'bg-red-900 text-red-300',
}

const STATUS_LABEL: Record<StatusParada, string> = {
  pendente:    'Pendente',
  embarcado:   'A bordo',
  concluido:   'Entregue',
  desembarcou: 'Desembarcou',
  ausente:     'Ausente',
  cancelou:    'Cancelou',
}

export default function MotoristaPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  const [nomeMotorista, setNomeMotorista] = useState('')
  const [motoristaId, setMotoristaId] = useState('')
  const [viagem, setViagem] = useState<DadosViagem | null>(null)
  const [gpsAtivo, setGpsAtivo] = useState(false)
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'ok' | 'erro' | 'info' } | null>(null)
  const [salvandoParada, setSalvandoParada] = useState<string | null>(null)
  const [paradaExpandida, setParadaExpandida] = useState<string | null>(null)

  const watchIdRef = useRef<number | null>(null)
  const ultimoUpsertRef = useRef<number>(0)

  const carregarDados = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: perfil } = await supabase
      .from('profiles').select('id, nome').eq('id', user.id).single()
    if (!perfil) { setCarregando(false); return }
    setNomeMotorista(perfil.nome)
    setMotoristaId(perfil.id)

    const hoje = new Date().toISOString().split('T')[0]
    const { data: v } = await supabase
      .from('viagens')
      .select(`
        id, status,
        veiculos!veiculo_id(modelo, capacidade),
        viagem_paradas(
          id, ordem, status, hora_embarque, hora_chegada,
          paciente:pacientes(nome, municipio, endereco, lat, lng),
          hospital:hospitais(nome, municipio, lat, lng)
        )
      `)
      .eq('motorista_id', user.id)
      .eq('data', hoje)
      .in('status', ['pendente', 'em_andamento'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (v) {
      const veiculo = v.veiculos as any
      const paradas: Parada[] = ((v.viagem_paradas as any[]) ?? [])
        .sort((a, b) => a.ordem - b.ordem)
        .map((p: any) => ({
          id: p.id,
          ordem: p.ordem,
          status: p.status as StatusParada,
          hora_embarque: p.hora_embarque,
          hora_chegada: p.hora_chegada,
          paciente: p.paciente ?? null,
          hospital: p.hospital ?? null,
        }))
      setViagem({
        id: v.id,
        status: v.status as any,
        veiculoModelo: veiculo?.modelo ?? 'Veículo',
        veiculoCapacidade: veiculo?.capacidade ?? 4,
        paradas,
      })
    }
    setCarregando(false)
  }, [supabase, router])

  useEffect(() => {
    carregarDados()
    return () => pararGPS()
  }, [carregarDados])

  function iniciarGPS(id: string) {
    if (!navigator.geolocation) {
      setMensagem({ texto: 'GPS não disponível.', tipo: 'erro' })
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        setCoordenadas({ lat, lng })
        setGpsAtivo(true)
        const agora = Date.now()
        if (agora - ultimoUpsertRef.current < 5000) return
        ultimoUpsertRef.current = agora
        await supabase.from('motorista_localizacao').upsert({
          motorista_id: id, lat, lng,
          atualizado_em: new Date().toISOString(),
        })
      },
      () => { setGpsAtivo(false); setMensagem({ texto: 'Erro no GPS. Verifique as permissões.', tipo: 'erro' }) },
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }

  function pararGPS() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setGpsAtivo(false)
  }

  function abrirGoogleMaps(lat?: number, lng?: number, nome?: string) {
    if (!lat || !lng) return
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${encodeURIComponent(nome ?? '')}&travelmode=driving`
    window.open(url, '_blank')
  }

  function mostrarMsg(texto: string, tipo: 'ok' | 'erro' | 'info' = 'ok') {
    setMensagem({ texto, tipo })
    setTimeout(() => setMensagem(null), 3000)
  }

  async function atualizarParada(paradaId: string, status: StatusParada, extra?: { hora_embarque?: string; hora_chegada?: string }) {
    setSalvandoParada(paradaId)
    const { error } = await supabase
      .from('viagem_paradas')
      .update({ status, ...extra })
      .eq('id', paradaId)
    if (error) {
      mostrarMsg('Erro ao atualizar status.', 'erro')
    } else {
      setViagem(v => v ? {
        ...v,
        paradas: v.paradas.map(p => p.id === paradaId ? { ...p, status, ...extra } : p)
      } : v)
    }
    setSalvandoParada(null)
  }

  async function handleIniciarRota() {
    if (!viagem) return
    const { error } = await supabase.from('viagens').update({ status: 'em_andamento' }).eq('id', viagem.id)
    if (error) { mostrarMsg('Erro ao iniciar rota.', 'erro'); return }
    setViagem(v => v ? { ...v, status: 'em_andamento' } : v)
    iniciarGPS(motoristaId)
    mostrarMsg('Rota iniciada! GPS ativado.', 'ok')
  }

  async function handleFinalizar() {
    if (!viagem) return
    const pendentes = viagem.paradas.filter(p => p.status === 'pendente' || p.status === 'embarcado')
    if (pendentes.length > 0) {
      if (!window.confirm(`Ainda há ${pendentes.length} parada(s) pendente(s). Finalizar mesmo assim?`)) return
    } else {
      if (!window.confirm('Confirmar finalização da rota?')) return
    }
    await supabase.from('viagens').update({ status: 'concluida' }).eq('id', viagem.id)
    pararGPS()
    setViagem(v => v ? { ...v, status: 'concluida' } : v)
    mostrarMsg('Rota finalizada! Bom trabalho! 🎉', 'ok')
  }

  const emAndamento = viagem?.status === 'em_andamento'
  const concluida = viagem?.status === 'concluida'
  const embarcados = viagem?.paradas.filter(p => p.status === 'embarcado').length ?? 0
  const entregues = viagem?.paradas.filter(p => ['concluido','desembarcou'].includes(p.status)).length ?? 0
  const totalAtivos = viagem?.paradas.filter(p => !['ausente','cancelou'].includes(p.status)).length ?? 0

  function formatarHora(iso?: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col max-w-md mx-auto">

      {/* Header */}
      <header className="bg-gray-900 px-5 py-4 flex items-center justify-between border-b border-gray-800 sticky top-0 z-10">
        <div>
          <h1 className="font-extrabold text-xl">Smart<span className="text-blue-400">TFD</span></h1>
          <p className="text-gray-400 text-xs">{nomeMotorista || 'Motorista'}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${gpsAtivo ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-xs font-medium ${gpsAtivo ? 'text-green-400' : 'text-gray-500'}`}>
            {gpsAtivo ? 'GPS ativo' : 'GPS off'}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 p-4 pb-6">
        {carregando ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-gray-500 animate-pulse text-lg">Carregando…</p>
          </div>
        ) : !viagem ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center py-16">
            <span className="text-6xl">📋</span>
            <p className="text-gray-300 font-bold text-xl">Nenhuma rota hoje</p>
            <p className="text-gray-500 text-sm">O gestor ainda não criou sua rota.</p>
          </div>
        ) : (
          <>
            {/* Card da viagem */}
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-widest">Veículo</p>
                  <p className="font-bold text-lg">🚐 {viagem.veiculoModelo}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  emAndamento ? 'bg-blue-900 text-blue-300' :
                  concluida ? 'bg-green-900 text-green-300' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {emAndamento ? 'Em andamento' : concluida ? 'Concluída' : 'Pendente'}
                </span>
              </div>

              {/* Barra de progresso */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{entregues} entregues · {embarcados} a bordo · {totalAtivos - entregues - embarcados} pendentes</span>
                  <span>{viagem.paradas.length} paradas</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                  <div className="bg-green-500 transition-all duration-500" style={{ width: `${(entregues / Math.max(totalAtivos, 1)) * 100}%` }} />
                  <div className="bg-blue-500 transition-all duration-500" style={{ width: `${(embarcados / Math.max(totalAtivos, 1)) * 100}%` }} />
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Entregue</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />A bordo</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600" />Pendente</span>
                </div>
              </div>

              {coordenadas && (
                <p className="text-gray-600 text-xs mt-2">📍 {coordenadas.lat.toFixed(5)}, {coordenadas.lng.toFixed(5)}</p>
              )}
            </div>

            {/* Feedback */}
            {mensagem && (
              <div className={`rounded-xl px-4 py-3 text-sm text-center font-medium border ${
                mensagem.tipo === 'ok'   ? 'bg-green-900 border-green-700 text-green-300' :
                mensagem.tipo === 'erro' ? 'bg-red-900 border-red-700 text-red-300' :
                'bg-yellow-900 border-yellow-700 text-yellow-300'
              }`}>
                {mensagem.texto}
              </div>
            )}

            {/* Rota concluída */}
            {concluida && (
              <div className="bg-green-900 border border-green-700 rounded-2xl p-6 text-center">
                <p className="text-4xl mb-2">🎉</p>
                <p className="text-green-300 font-bold text-xl">Rota finalizada!</p>
                <p className="text-green-500 text-sm mt-1">Bom trabalho hoje!</p>
              </div>
            )}

            {/* Lista de paradas */}
            {viagem.paradas.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paradas da rota</p>

                {viagem.paradas.map((parada, i) => {
                  const isSalvando = salvandoParada === parada.id
                  const isExpandida = paradaExpandida === parada.id
                  const isFinalizado = ['concluido','desembarcou','ausente','cancelou'].includes(parada.status)
                  const isEmbarcado = parada.status === 'embarcado'
                  const isPendente = parada.status === 'pendente'

                  return (
                    <div key={parada.id} className={`rounded-2xl border overflow-hidden transition-all ${
                      parada.status === 'cancelou' ? 'border-red-900 bg-red-950 opacity-70' :
                      parada.status === 'ausente'  ? 'border-yellow-900 bg-yellow-950 opacity-80' :
                      isFinalizado                  ? 'border-green-900 bg-green-950 opacity-75' :
                      isEmbarcado                   ? 'border-blue-800 bg-blue-950' :
                      'border-gray-700 bg-gray-800'
                    }`}>
                      {/* Linha principal — clicável para expandir */}
                      <button
                        className="w-full text-left p-4"
                        onClick={() => setParadaExpandida(isExpandida ? null : parada.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${STATUS_COR[parada.status]}`}>
                            {parada.status === 'concluido' || parada.status === 'desembarcou' ? '✓' :
                             parada.status === 'ausente'  ? '!' :
                             parada.status === 'cancelou' ? '✕' :
                             isEmbarcado ? '→' : i + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-base leading-tight truncate">
                              {parada.paciente?.nome ?? 'Sem nome'}
                            </p>
                            <p className="text-gray-400 text-xs mt-0.5 truncate">
                              📍 {parada.paciente?.endereco ?? parada.paciente?.municipio ?? '—'}
                            </p>
                            <p className="text-xs mt-0.5 truncate">
                              <span className="text-gray-500">🏥 </span>
                              <span className="text-gray-300">{parada.hospital?.nome ?? '—'}</span>
                            </p>
                            {(parada.hora_embarque || parada.hora_chegada) && (
                              <div className="flex gap-3 mt-1 text-xs text-gray-500">
                                {parada.hora_embarque && <span>🕐 {formatarHora(parada.hora_embarque)}</span>}
                                {parada.hora_chegada  && <span>🏁 {formatarHora(parada.hora_chegada)}</span>}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${STATUS_COR[parada.status]}`}>
                              {STATUS_LABEL[parada.status]}
                            </span>
                            <span className="text-gray-600 text-xs">{isExpandida ? '▲' : '▼'}</span>
                          </div>
                        </div>
                      </button>

                      {/* Botões — expandido */}
                      {isExpandida && (
                        <div className="px-4 pb-4 border-t border-gray-700 pt-3 space-y-2">

                          {/* Google Maps — sempre disponível */}
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => abrirGoogleMaps(parada.paciente?.lat, parada.paciente?.lng, parada.paciente?.nome ?? '')}
                              className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                            >
                              🗺️ Ver endereço
                            </button>
                            <button
                              onClick={() => abrirGoogleMaps(parada.hospital?.lat, parada.hospital?.lng, parada.hospital?.nome ?? '')}
                              className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-medium py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                            >
                              🏥 Ver hospital
                            </button>
                          </div>

                          {/* Ações de status — só quando em andamento e não finalizado */}
                          {emAndamento && !isFinalizado && (
                            <>
                              {isPendente && (
                                <div className="grid grid-cols-3 gap-2">
                                  <button
                                    onClick={() => atualizarParada(parada.id, 'embarcado', { hora_embarque: new Date().toISOString() })}
                                    disabled={isSalvando}
                                    className="col-span-3 bg-blue-700 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all"
                                  >
                                    {isSalvando ? '…' : '✅ Confirmar embarque'}
                                  </button>
                                  <button
                                    onClick={() => atualizarParada(parada.id, 'ausente')}
                                    disabled={isSalvando}
                                    className="bg-yellow-800 hover:bg-yellow-700 active:scale-95 disabled:opacity-50 text-yellow-200 font-semibold py-2.5 rounded-xl text-xs transition-all"
                                  >
                                    ⚠️ Ausente
                                  </button>
                                  <button
                                    onClick={() => atualizarParada(parada.id, 'cancelou')}
                                    disabled={isSalvando}
                                    className="bg-red-900 hover:bg-red-800 active:scale-95 disabled:opacity-50 text-red-300 font-semibold py-2.5 rounded-xl text-xs transition-all"
                                  >
                                    ✕ Cancelou
                                  </button>
                                  <button
                                    onClick={() => atualizarParada(parada.id, 'pendente')}
                                    disabled={isSalvando}
                                    className="bg-gray-700 hover:bg-gray-600 active:scale-95 disabled:opacity-50 text-gray-300 font-semibold py-2.5 rounded-xl text-xs transition-all"
                                  >
                                    ↩ Voltar
                                  </button>
                                </div>
                              )}
                              {isEmbarcado && (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    onClick={() => atualizarParada(parada.id, 'desembarcou', { hora_chegada: new Date().toISOString() })}
                                    disabled={isSalvando}
                                    className="bg-green-700 hover:bg-green-600 active:scale-95 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all"
                                  >
                                    {isSalvando ? '…' : '🏥 Desembarcou'}
                                  </button>
                                  <button
                                    onClick={() => atualizarParada(parada.id, 'concluido', { hora_chegada: new Date().toISOString() })}
                                    disabled={isSalvando}
                                    className="bg-teal-800 hover:bg-teal-700 active:scale-95 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm transition-all"
                                  >
                                    {isSalvando ? '…' : '✓ Entregue'}
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Botão principal */}
            {!concluida && (
              <button
                onClick={emAndamento ? handleFinalizar : handleIniciarRota}
                className={`w-full font-extrabold py-5 rounded-2xl text-xl tracking-wide active:scale-95 transition-all text-white mt-2 ${
                  emAndamento ? 'bg-orange-600 hover:bg-orange-500' : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {emAndamento ? '🏁 Finalizar Rota' : '🚀 Iniciar Rota'}
              </button>
            )}
          </>
        )}
      </main>

      <footer className="px-5 py-4 border-t border-gray-800">
        <button
          onClick={async () => { pararGPS(); await supabase.auth.signOut(); router.push('/login') }}
          className="w-full text-gray-600 hover:text-gray-400 text-sm py-2 transition-colors"
        >
          Sair da conta
        </button>
      </footer>
    </div>
  )
}
