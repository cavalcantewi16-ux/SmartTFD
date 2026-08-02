'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

type StatusViagem = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'
type StatusParada = 'pendente' | 'embarcado' | 'concluido'

interface Parada {
  id: string
  ordem: number
  status: StatusParada
  hora_embarque?: string | null
  hora_chegada?: string | null
  paciente: { nome: string; municipio: string; endereco: string } | null
  hospital: { nome: string; municipio: string } | null
}

interface DadosViagem {
  id: string
  status: StatusViagem
  veiculoModelo: string
  veiculoCapacidade: number
  paradas: Parada[]
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
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'info' | 'erro' | 'ok' } | null>(null)
  const [salvandoParada, setSalvandoParada] = useState<string | null>(null)

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
          paciente:pacientes(nome, municipio, endereco),
          hospital:hospitais(nome, municipio)
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
      const paradas = ((v.viagem_paradas as any[]) ?? [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
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
        status: v.status as StatusViagem,
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
      setMensagem({ texto: 'GPS não disponível neste dispositivo.', tipo: 'erro' })
      return
    }
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
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
      () => {
        setGpsAtivo(false)
        setMensagem({ texto: 'Erro no GPS. Verifique as permissões.', tipo: 'erro' })
      },
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

  async function handleIniciarRota() {
    if (!viagem) return
    setMensagem(null)
    const { error } = await supabase.from('viagens').update({ status: 'em_andamento' }).eq('id', viagem.id)
    if (error) { setMensagem({ texto: 'Erro ao iniciar rota.', tipo: 'erro' }); return }
    setViagem(v => v ? { ...v, status: 'em_andamento' } : v)
    iniciarGPS(motoristaId)
    setMensagem({ texto: 'Rota iniciada! GPS ativado.', tipo: 'ok' })
    setTimeout(() => setMensagem(null), 3000)
  }

  async function handleEmbarque(parada: Parada) {
    if (!viagem || parada.status !== 'pendente') return
    setSalvandoParada(parada.id)
    const { error } = await supabase
      .from('viagem_paradas')
      .update({ status: 'embarcado', hora_embarque: new Date().toISOString() })
      .eq('id', parada.id)
    if (error) {
      setMensagem({ texto: 'Erro ao registrar embarque.', tipo: 'erro' })
    } else {
      setViagem(v => v ? {
        ...v,
        paradas: v.paradas.map(p => p.id === parada.id
          ? { ...p, status: 'embarcado', hora_embarque: new Date().toISOString() }
          : p
        )
      } : v)
      setMensagem({ texto: `${parada.paciente?.nome ?? 'Paciente'} embarcou!`, tipo: 'ok' })
      setTimeout(() => setMensagem(null), 2500)
    }
    setSalvandoParada(null)
  }

  async function handleConcluirParada(parada: Parada) {
    if (!viagem || parada.status !== 'embarcado') return
    setSalvandoParada(parada.id)
    const { error } = await supabase
      .from('viagem_paradas')
      .update({ status: 'concluido', hora_chegada: new Date().toISOString() })
      .eq('id', parada.id)
    if (error) {
      setMensagem({ texto: 'Erro ao concluir parada.', tipo: 'erro' })
    } else {
      setViagem(v => v ? {
        ...v,
        paradas: v.paradas.map(p => p.id === parada.id
          ? { ...p, status: 'concluido', hora_chegada: new Date().toISOString() }
          : p
        )
      } : v)
      setMensagem({ texto: `${parada.paciente?.nome ?? 'Paciente'} entregue!`, tipo: 'ok' })
      setTimeout(() => setMensagem(null), 2500)
    }
    setSalvandoParada(null)
  }

  async function handleFinalizar() {
    if (!viagem) return
    const todasConcluidas = viagem.paradas.every(p => p.status === 'concluido')
    if (!todasConcluidas) {
      const confirmar = window.confirm('Ainda há pacientes pendentes. Deseja finalizar mesmo assim?')
      if (!confirmar) return
    } else {
      if (!window.confirm('Confirmar finalização da rota?')) return
    }
    await supabase.from('viagens').update({ status: 'concluida' }).eq('id', viagem.id)
    pararGPS()
    setViagem(v => v ? { ...v, status: 'concluida' } : v)
    setMensagem({ texto: 'Rota finalizada! Bom trabalho! 🎉', tipo: 'ok' })
  }

  async function handleSair() {
    pararGPS()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const emAndamento = viagem?.status === 'em_andamento'
  const concluida = viagem?.status === 'concluida'
  const embarcados = viagem?.paradas.filter(p => p.status === 'embarcado').length ?? 0
  const concluidos = viagem?.paradas.filter(p => p.status === 'concluido').length ?? 0
  const totalParadas = viagem?.paradas.length ?? 0

  function formatarHora(iso?: string | null) {
    if (!iso) return null
    return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col max-w-md mx-auto">

      {/* Header */}
      <header className="bg-gray-900 px-5 py-4 flex items-center justify-between border-b border-gray-800">
        <div>
          <h1 className="font-extrabold text-xl">Smart<span className="text-blue-400">TFD</span></h1>
          <p className="text-gray-400 text-xs mt-0.5">{nomeMotorista || 'Motorista'}</p>
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
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p className="text-lg animate-pulse">Carregando…</p>
          </div>
        ) : !viagem ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-12">
            <span className="text-6xl">📋</span>
            <p className="text-gray-300 font-bold text-xl">Nenhuma rota hoje</p>
            <p className="text-gray-500 text-sm">O gestor ainda não criou sua rota para hoje.</p>
          </div>
        ) : (
          <>
            {/* Card veículo + progresso */}
            <div className="bg-gray-800 rounded-2xl p-4 border border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-gray-400 text-xs uppercase tracking-widest">Veículo</p>
                  <p className="font-bold text-lg">🚐 {viagem.veiculoModelo}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  emAndamento ? 'bg-blue-900 text-blue-300' :
                  concluida ? 'bg-green-900 text-green-300' :
                  'bg-gray-700 text-gray-300'
                }`}>
                  {emAndamento ? 'Em andamento' : concluida ? 'Concluída' : 'Pendente'}
                </div>
              </div>

              {/* Barra de progresso */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{concluidos} entregues · {embarcados} a bordo · {totalParadas - embarcados - concluidos} pendentes</span>
                  <span>{totalParadas} total</span>
                </div>
                <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                  <div className="bg-green-500 transition-all" style={{ width: `${(concluidos / Math.max(totalParadas, 1)) * 100}%` }} />
                  <div className="bg-blue-500 transition-all" style={{ width: `${(embarcados / Math.max(totalParadas, 1)) * 100}%` }} />
                </div>
                <div className="flex gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Entregue</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />A bordo</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-600 inline-block" />Pendente</span>
                </div>
              </div>

              {coordenadas && (
                <p className="text-gray-600 text-xs mt-2">
                  📍 {coordenadas.lat.toFixed(5)}, {coordenadas.lng.toFixed(5)}
                </p>
              )}
            </div>

            {/* Mensagem de feedback */}
            {mensagem && (
              <div className={`rounded-xl px-4 py-3 text-sm text-center font-medium border ${
                mensagem.tipo === 'ok' ? 'bg-green-900 border-green-700 text-green-300' :
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
            {!concluida && totalParadas > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Paradas da rota</p>
                {viagem.paradas.map((parada, i) => {
                  const isSalvando = salvandoParada === parada.id
                  const isPendente = parada.status === 'pendente'
                  const isEmbarcado = parada.status === 'embarcado'
                  const isConcluido = parada.status === 'concluido'

                  return (
                    <div key={parada.id} className={`rounded-2xl border p-4 transition-all ${
                      isConcluido ? 'bg-green-950 border-green-800 opacity-70' :
                      isEmbarcado ? 'bg-blue-950 border-blue-800' :
                      'bg-gray-800 border-gray-700'
                    }`}>
                      <div className="flex items-start gap-3">
                        {/* Número da parada */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isConcluido ? 'bg-green-700 text-green-200' :
                          isEmbarcado ? 'bg-blue-700 text-blue-200' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {isConcluido ? '✓' : isEmbarcado ? '→' : i + 1}
                        </div>

                        {/* Info da parada */}
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base leading-tight">
                            {parada.paciente?.nome ?? 'Paciente sem nome'}
                          </p>
                          <p className="text-gray-400 text-xs mt-0.5 truncate">
                            📍 {parada.paciente?.endereco ?? parada.paciente?.municipio ?? '—'}
                          </p>
                          <p className="text-xs mt-1">
                            <span className="text-gray-500">🏥 </span>
                            <span className={isEmbarcado ? 'text-blue-400' : isConcluido ? 'text-green-400' : 'text-gray-400'}>
                              {parada.hospital?.nome ?? 'Hospital não informado'}
                            </span>
                          </p>
                          {/* Horários */}
                          <div className="flex gap-3 mt-1.5 text-xs text-gray-500">
                            {parada.hora_embarque && (
                              <span>🕐 Embarque: {formatarHora(parada.hora_embarque)}</span>
                            )}
                            {parada.hora_chegada && (
                              <span>🏁 Chegada: {formatarHora(parada.hora_chegada)}</span>
                            )}
                          </div>
                        </div>

                        {/* Status badge */}
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${
                          isConcluido ? 'bg-green-800 text-green-300' :
                          isEmbarcado ? 'bg-blue-800 text-blue-300' :
                          'bg-gray-700 text-gray-400'
                        }`}>
                          {isConcluido ? 'Entregue' : isEmbarcado ? 'A bordo' : 'Pendente'}
                        </span>
                      </div>

                      {/* Botões de ação — só aparecem quando a rota está em andamento */}
                      {emAndamento && !isConcluido && (
                        <div className="mt-3 pt-3 border-t border-gray-700">
                          {isPendente && (
                            <button
                              onClick={() => handleEmbarque(parada)}
                              disabled={isSalvando}
                              className="w-full bg-blue-700 hover:bg-blue-600 active:scale-95 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-base transition-all flex items-center justify-center gap-2"
                            >
                              {isSalvando ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block" />
                              ) : (
                                '✅ Confirmar embarque'
                              )}
                            </button>
                          )}
                          {isEmbarcado && (
                            <button
                              onClick={() => handleConcluirParada(parada)}
                              disabled={isSalvando}
                              className="w-full bg-green-700 hover:bg-green-600 active:scale-95 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-base transition-all flex items-center justify-center gap-2"
                            >
                              {isSalvando ? (
                                <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white inline-block" />
                              ) : (
                                '🏥 Entregue no hospital'
                              )}
                            </button>
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
                  emAndamento
                    ? 'bg-orange-600 hover:bg-orange-500'
                    : 'bg-blue-600 hover:bg-blue-500'
                }`}
              >
                {emAndamento ? '🏁 Finalizar Rota' : '🚀 Iniciar Rota'}
              </button>
            )}
          </>
        )}
      </main>

      <footer className="px-5 py-4 border-t border-gray-800">
        <button onClick={handleSair} className="w-full text-gray-600 hover:text-gray-400 text-sm py-2 transition-colors">
          Sair da conta
        </button>
      </footer>
    </div>
  )
}
