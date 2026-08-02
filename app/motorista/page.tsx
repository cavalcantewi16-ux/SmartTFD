'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database } from '@/types/database'

type StatusViagem = 'pendente' | 'em_andamento' | 'concluida' | 'cancelada'

interface DadosMotorista { id: string; nome: string }
interface DadosViagem {
  id: string; status: StatusViagem
  veiculoModelo: string; veiculoCapacidade: number
}

export default function MotoristaPage() {
  const supabase = createClientComponentClient<Database>()
  const router = useRouter()

  const [motorista, setMotorista] = useState<DadosMotorista | null>(null)
  const [viagem, setViagem] = useState<DadosViagem | null>(null)
  const [passageiros, setPassageiros] = useState(0)
  const [gpsAtivo, setGpsAtivo] = useState(false)
  const [coordenadas, setCoordenadas] = useState<{ lat: number; lng: number } | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')

  const watchIdRef = useRef<number | null>(null)
  const ultimoUpsertRef = useRef<number>(0)

  const carregarDados = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: perfil } = await supabase
      .from('profiles').select('id, nome').eq('id', user.id).single()
    if (!perfil) { setCarregando(false); return }
    setMotorista({ id: perfil.id, nome: perfil.nome })

    const hoje = new Date().toISOString().split('T')[0]
    const { data: v } = await supabase
      .from('viagens')
      .select('id, status, veiculos!veiculo_id(modelo, capacidade), viagem_paradas(status)')
      .eq('motorista_id', user.id)
      .eq('data', hoje)
      .in('status', ['pendente', 'em_andamento'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (v) {
      const veiculo = v.veiculos as any
      const paradas = (v.viagem_paradas as any[]) ?? []
      setViagem({
        id: v.id, status: v.status as StatusViagem,
        veiculoModelo: veiculo?.modelo ?? 'Veículo',
        veiculoCapacidade: veiculo?.capacidade ?? 4,
      })
      setPassageiros(paradas.filter((p: any) => p.status === 'embarcado').length)
    }
    setCarregando(false)
  }, [supabase, router])

  useEffect(() => {
    carregarDados()
    return () => pararGPS()
  }, [carregarDados])

  function iniciarGPS(motoristaId: string) {
    if (!navigator.geolocation) { setMensagem('GPS não suportado neste dispositivo.'); return }
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
          motorista_id: motoristaId, lat, lng,
          atualizado_em: new Date().toISOString(),
        })
      },
      () => { setGpsAtivo(false); setMensagem('Erro de GPS. Verifique as permissões.') },
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
    if (!viagem || !motorista) return
    setMensagem('')
    const { error } = await supabase.from('viagens').update({ status: 'em_andamento' }).eq('id', viagem.id)
    if (error) { setMensagem('Erro ao iniciar rota.'); return }
    setViagem(v => v ? { ...v, status: 'em_andamento' } : v)
    iniciarGPS(motorista.id)
  }

  async function handleEmbarque() {
    if (!viagem) return
    if (passageiros >= viagem.veiculoCapacidade) { setMensagem('Capacidade máxima atingida.'); return }
    setPassageiros(p => p + 1)
    setMensagem('')
    await supabase.from('viagem_paradas').insert({
      viagem_id: viagem.id, paciente_id: null as any, hospital_id: null as any,
      ordem: passageiros + 1, status: 'embarcado',
      hora_embarque: new Date().toISOString(),
    })
  }

  async function handleRemover() {
    if (!viagem || passageiros <= 0) return
    setPassageiros(p => p - 1)
    setMensagem('')
    const { data } = await supabase.from('viagem_paradas')
      .select('id').eq('viagem_id', viagem.id).eq('status', 'embarcado')
      .order('hora_embarque', { ascending: false }).limit(1).single()
    if (data) await supabase.from('viagem_paradas').delete().eq('id', data.id)
  }

  async function handleFinalizar() {
    if (!viagem || !window.confirm('Confirmar finalização da rota?')) return
    await supabase.from('viagens').update({ status: 'concluida' }).eq('id', viagem.id)
    pararGPS()
    setViagem(v => v ? { ...v, status: 'concluida' } : v)
    setPassageiros(0)
    setMensagem('Rota finalizada com sucesso!')
  }

  async function handleSair() {
    pararGPS()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const vagas = viagem ? viagem.veiculoCapacidade - passageiros : 0
  const emAndamento = viagem?.status === 'em_andamento'
  const concluida = viagem?.status === 'concluida'

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col max-w-md mx-auto">

      {/* Header */}
      <header className="bg-gray-900 px-5 py-4 flex items-center justify-between border-b border-gray-800">
        <div>
          <h1 className="font-extrabold text-xl">Smart<span className="text-blue-400">TFD</span></h1>
          <p className="text-gray-400 text-xs mt-0.5">App do Motorista</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full transition-colors ${gpsAtivo ? 'bg-green-400 animate-pulse' : 'bg-gray-600'}`} />
          <span className={`text-sm font-medium ${gpsAtivo ? 'text-green-400' : 'text-gray-500'}`}>
            {gpsAtivo ? 'GPS ativo' : 'GPS inativo'}
          </span>
        </div>
      </header>

      <main className="flex-1 flex flex-col gap-4 p-5">
        {carregando ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <p className="text-lg animate-pulse">Carregando…</p>
          </div>
        ) : (
          <>
            {/* Card do motorista */}
            <div className="bg-gray-800 rounded-2xl p-5 border border-gray-700">
              <p className="text-gray-400 text-xs uppercase tracking-widest mb-1">Motorista</p>
              <p className="font-bold text-2xl">{motorista?.nome ?? '—'}</p>
              <p className="text-blue-400 text-base mt-1">🚐 {viagem?.veiculoModelo ?? 'Nenhum veículo atribuído'}</p>
              {coordenadas && (
                <p className="text-gray-500 text-xs mt-2">
                  📍 {coordenadas.lat.toFixed(5)}, {coordenadas.lng.toFixed(5)}
                </p>
              )}
            </div>

            {/* Cards de status */}
            {viagem && (
              <div className="grid grid-cols-3 gap-3">
                <StatusCard valor={passageiros} label="Pacientes" cor="text-blue-400" bg="bg-blue-950" />
                <StatusCard
                  valor={vagas} label="Vagas"
                  cor={vagas === 0 ? 'text-red-400' : 'text-green-400'}
                  bg={vagas === 0 ? 'bg-red-950' : 'bg-green-950'}
                />
                <StatusCard valor={viagem.veiculoCapacidade} label="Capacidade" cor="text-gray-300" bg="bg-gray-800" />
              </div>
            )}

            {/* Sem viagem */}
            {!viagem && (
              <div className="bg-gray-800 rounded-2xl p-8 text-center border border-gray-700 flex-1 flex flex-col items-center justify-center gap-3">
                <span className="text-5xl">📋</span>
                <p className="text-gray-300 font-semibold text-lg">Nenhuma rota para hoje</p>
                <p className="text-gray-500 text-sm">O gestor ainda não criou sua rota.</p>
              </div>
            )}

            {/* Rota concluída */}
            {concluida && (
              <div className="bg-green-900 border border-green-700 rounded-2xl p-5 text-center">
                <p className="text-green-300 font-bold text-xl">✅ Rota finalizada!</p>
                <p className="text-green-400 text-sm mt-1">Bom trabalho!</p>
              </div>
            )}

            {/* Feedback */}
            {mensagem && (
              <div className="bg-yellow-900 border border-yellow-700 rounded-xl px-4 py-3 text-yellow-300 text-sm text-center">
                {mensagem}
              </div>
            )}

            {/* Botões embarque */}
            {emAndamento && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleEmbarque}
                  disabled={passageiros >= (viagem?.veiculoCapacidade ?? 0)}
                  className="bg-green-600 hover:bg-green-500 active:scale-95 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-6 rounded-2xl text-2xl transition-all"
                >
                  ＋ Embarque
                </button>
                <button
                  onClick={handleRemover}
                  disabled={passageiros <= 0}
                  className="bg-red-700 hover:bg-red-600 active:scale-95 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-6 rounded-2xl text-2xl transition-all"
                >
                  － Remover
                </button>
              </div>
            )}

            {/* Botão principal */}
            {viagem && !concluida && (
              <button
                onClick={emAndamento ? handleFinalizar : handleIniciarRota}
                className={`w-full font-extrabold py-6 rounded-2xl text-2xl tracking-wide active:scale-95 transition-all text-white ${
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
        <button onClick={handleSair} className="w-full text-gray-500 hover:text-gray-300 text-sm py-2 transition-colors">
          Sair da conta
        </button>
      </footer>
    </div>
  )
}

function StatusCard({ valor, label, cor, bg }: { valor: number; label: string; cor: string; bg: string }) {
  return (
    <div className={`${bg} rounded-2xl p-4 text-center border border-gray-700`}>
      <p className={`text-4xl font-extrabold ${cor}`}>{valor}</p>
      <p className="text-gray-400 text-xs mt-1 uppercase tracking-wide">{label}</p>
    </div>
  )
}
