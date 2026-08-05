'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Paciente { id: string; nome: string; endereco?: string; bairro?: string; lat?: number; lng?: number }
interface Passenger { id: string; paciente: Paciente; ordem: number; status: string; est_pickup_at?: string }
interface Hospital { id: string; nome: string; cidade?: string; lat?: number; lng?: number }
interface Leg {
  id: string; hospital: Hospital; horario_saida: string; ordem: number; status: string
  passengers: Passenger[]
  est_departure_at?: string; est_hospital_at?: string; est_return_at?: string
  est_outbound_min?: number; est_return_min?: number
}
interface Plan {
  id: string; data: string; status: string
  veiculo: { id: string; placa: string; modelo?: string }
  motorista: { id: string; nome: string }
  legs: Leg[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const TZ = 'America/Sao_Paulo'

function fmtHora(iso?: string | null, fallback?: string) {
  if (iso) return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  if (fallback) return fallback.substring(0, 5)
  return '—'
}

function mapsUrl(p: Paciente) {
  if (p.lat && p.lng) return `https://www.google.com/maps?q=${p.lat},${p.lng}`
  const addr = [p.endereco, p.bairro].filter(Boolean).join(', ')
  return addr ? `https://www.google.com/maps/search/${encodeURIComponent(addr)}` : '#'
}

function Countdown({ targetIso }: { targetIso: string }) {
  const [diff, setDiff] = useState(0)
  useEffect(() => {
    const target = new Date(targetIso).getTime()
    const tick = () => setDiff(Math.max(0, Math.floor((target - Date.now()) / 1000)))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetIso])
  if (diff <= 0) return <span className="text-green-500 font-bold text-2xl">Hora de sair!</span>
  const h = Math.floor(diff / 3600)
  const m = Math.floor((diff % 3600) / 60)
  const s = diff % 60
  return (
    <span className="font-mono font-bold text-3xl text-blue-700 tracking-widest">
      {h > 0 && `${h}:`}{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'embarcou') return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">✒ Embarcou</span>
  if (status === 'ausente') return <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">✗ Ausente</span>
  return <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Aguardando</span>
}

export default function MotoristaPage() {
  const supabase = createClientComponentClient()
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [nomePerfil, setNomePerfil] = useState('')
  const [plan, setPlan] = useState<Plan | null>(null)
  const [loading, setLoading] = useState(true)
  const [gpsAtivo, setGpsAtivo] = useState(false)
  const [atualizando, setAtualizando] = useState(false)
  const [modalProblema, setModalProblema] = useState(false)
  const [formProblema, setFormProblema] = useState({ tipo: 'outro', urgencia: 'normal', descricao: '' })
  const [enviandoProbl, setEnviandoProbl] = useState(false)
  const posAtual = useRef<GeolocationPosition | null>(null)
  const ultimoGps = useRef(0)
  const [salvandoLoc, setSalvandoLoc] = useState<Record<string, 'loading' | 'ok' | 'err'>>({})

  const carregar = useCallback(async (uid?: string) => {
    const userId = uid || user?.id
    if (!userId) return
    const hoje = new Date().toLocaleDateString('svSE')
    let data:any=null
    try{
    const {data:d} = await supabase
      .from('route_plans')
      .select(`id, data, status,veiculo:veiculos(id,placa,modelo),motorista:profiles(id,nome),route_legs(id,horario_saida,ordem,status,est_departure_at,est_hospital_at,est_return_at,est_outbound_min,est_return_min,hospital:hospitais(id,nome,cidade,lat,lng),leg_passengers(id,ordem,status,est_pickup_at,paciente:pacientes(id,nome,endereco,bairro,lat,lng)))`)
      .eq('data', hoje)
      .eq('motorista_id', userId)
      .in('status', ['draft', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (d) { const data=d;
      const legsOrdenados: Leg[] = ((data.route_legs as any[]) || [])
        .sort((a, b) => a.ordem - b.ordem)
        .map((l: any) => ({ ...l, passengers: (l.leg_passengers || []).sort((a: any, b: any) => a.ordem - b.ordem) }))
      setPlan({ ...(data as any), legs: legsOrdenados })
    } else { setPlan(null) }
    }catch(e){console.error('carregar error:',e)}
    setLoading(false)
  }, [supabase, user?.id])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUser(user)
      const { data: perfil } = await supabase.from('profiles').select('nome').eq('id', user.id).single()
      setNomePerfil((perfil as any).nome || '')
      carregar(user.id)
    })
  }, [supabase, carregar])

  useEffect(() => {
    if (!user) return
    const ch = supabase.channel('motorista-plan-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leg_passengers' }, () => carregar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'route_legs' }, () => carregar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [supabase, user, carregar])

  useEffect(() => {
    if (!user) return
    const watchId = navigator.geolocation.watchPosition(async pos => {
      posAtual.current = pos
      const now = Date.now()
      if (now - ultimoGps.current < 5000) return
      ultimoGps.current = now
      setGpsAtivo(true)
      await supabase.from('motorista_localizacao').upsert({
        motorista_id: user.id, lat: pos.coords.latitude,
        lng: pos.coords.longitude, atualizado_em: new Date().toISOString(),
      }, { onConflict: 'motorista_id' })
    }, () => setGpsAtivo(false), { enableHighAccuracy: true, maximumAge: 5000 })
    return () => navigator.geolocation.clearWatch(watchId)
  }, [user, supabase])

  async function setLegStatus(legId: string, status: string) {
    setAtualizando(true)
    await supabase.from('route_legs').update({ status }).eq('id', legId)
    await carregar()
    setAtualizando(false)
  }

  async function setPassStatus(passId: string, status: string) {
    setAtualizando(true)
    await supabase.from('leg_passengers').update({ status }).eq('id', passId)
    await carregar()
    setAtualizando(false)
  }

  async function salvarLocalizacaoPaciente(pacienteId: string, nomePaciente: string) {
    if (!user) return
    const pos = posAtual.current
    if (!pos) {
      setSalvandoLoc(prev => ({ ...prev, [pacienteId]: 'loading' }))
      navigator.geolocation.getCurrentPosition(
        async (p) => { await gravarCoordenadas(pacienteId, p.coords.latitude, p.coords.longitude) },
        () => {
          setSalvandoLoc(prev => ({ ...prev, [pacienteId]: 'err' }))
          setTimeout(() => setSalvandoLoc(prev => { const n = { ...prev }; delete n[pacienteId]; return n }), 3000)
        },
        { enableHighAccuracy: true, timeout: 8000 }
      )
      return
    }
    await gravarCoordenadas(pacienteId, pos.coords.latitude, pos.coords.longitude)
  }

  async function gravarCoordenadas(pacienteId: string, lat: number, lng: number) {
    setSalvandoLoc(prev => ({ ...prev, [pacienteId]: 'loading' }))
    const { error } = await supabase
      .from('pacientes')
      .update({ lat, lng, location_source: 'driver_gps', location_captured_by: user.id, location_captured_at: new Date().toISOString() })
      .eq('id', pacienteId)
    if (error) {
      setSalvandoLoc(prev => ({ ...prev, [pacienteId]: 'err' }))
      setTimeout(() => setSalvandoLoc(prev => { const n = { ...prev }; delete n[pacienteId]; return n }), 3000)
    } else {
      setSalvandoLoc(prev => ({ ...prev, [pacienteId]: 'ok' }))
      await carregar()
      setTimeout(() => setSalvandoLoc(prev => { const n = { ...prev }; delete n[pacienteId]; return n }), 3000)
    }
  }

  async function enviarProblema() {
    if (!plan || !formProblema.descricao.trim()) return
    setEnviandoProbl(true)
    await supabase.from('manutencao_veicular').insert({
      veiculo_id: (plan.veiculo as any).id, motorista_id: user.id,
      tipo: formProblema.tipo, urgencia: formProblema.urgencia, descricao: formProblema.descricao,
    })
    setEnviandoProbl(false)
    setModalProblema(false)
    setFormProblema({ tipo: 'outro', urgencia: 'normal', descricao: '' })
    alert('✅ Problema reportado ao gestor.')
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const legs = plan?.legs || []
  const todoConcluido = legs.length > 0 && legs.every(l => l.status === 'concluida')
  const legAtual = legs.find(l => l.status !== 'concluida') ?? null
  const legIdx = legAtual ? legs.indexOf(legAtual) : -1
  const proxLeg = legAtual && legIdx < legs.length - 1 ? legs[legIdx + 1] : null
  const passeiroAtual = legAtual?.passengers.find(p => p.status === 'aguardando') ?? null
  const todosHandled = (legAtual?.passengers.length ?? 0) > 0 && legAtual!.passengers.every(p => p.status !== 'aguardando')

  function Header() {
    return (
      <div className="bg-blue-800 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <span className="font-bold text-sm">SmartTFD</span>
          <span className="text-blue-300 text-xs ml-2">Motorista</span>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className={gpsAtivo ? 'text-green-300' : 'text-gray-400'}>
            {gpsAtivo ? '📍 GPS ativo' : '📍 sem GPS'}
          </span>
          {nomePerfil && <span className="text-blue-200">{nomePerfil}</span>}
          <button onClick={logout} className="text-blue-300 hover:text-white text-xs border border-blue-600 px-2 py-0.5 rounded-md transition-colors">Sair</button>
        </div>
      </div>
    )
  }

  function BotaoLocalizacao({ passenger }: { passenger: Passenger }) {
    const estado = salvandoLoc[passenger.paciente.id]
    const temGps = !!passenger.paciente.lat
    if (estado === 'loading') return <span className="text-xs bg-blue-50 text-blue-500 px-2 py-1 rounded-lg animate-pulse">📍 Salvando…</span>
    if (estado === 'ok') return <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-lg">✅ Local salvo!</span>
    if (estado === 'err') return <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-lg">❌ Sem GPS</span>
    return (
      <button onClick={() => salvarLocalizacaoPaciente(passenger.paciente.id, passenger.paciente.nome)}
        className={`text-xs px-2 py-1 rounded-lg transition-colors ${temGps ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-blue-50 text-blue-600 hover:bg-blue-100'}`}>
        {temGps ? '🍍 Atualizar local' : '🍍 Salvar local'}
      </button>
    )
  }

  if (!loading && !plan) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="text-5xl">🋋</div>
        <h2 className="font-bold text-gray-700 text-lg">Sem plano para hoje</h2>
        <p className="text-gray-400 text-sm">Aguarde o gestor criar e ativar o plano do dia.</p>
        <button onClick={() => carregar()} className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">🔄 Verificar novamente</button>
      </div>
    </div>
  )

  if (!loading && todoConcluido) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-4">
        <div className="text-5xl">🏁</div>
        <h2 className="font-bold text-gray-700 text-lg">Dia encerrado!</h2>
        <p className="text-gray-400 text-sm">
          Você concluiu {legs.length} viagem(ns) hoje.<br /> Bom descanso! 👏
        </p>
        <div className="bg-white rounded-xl shadow p-4 text-left w-full max-w-xs space-y-2 mt-2">
          {legs.map((l, i) => (
            <div key={l.id} className="flex items-center gap-2 text-sm">
              <span className="text-green-500">✒</span>
              <span className="text-gray-700">Viagem {i + 1} — {l.hospital.nome}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />
      <div className="flex-1 flex items-center justify-center text-gray-400">Carregando plano…</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-24">
      <Header />
      {legAtual && (
        <div className="bg-blue-700 text-white px-4 py-2 text-sm flex items-center justify-between">
          <span className="font-semibold">Viagem {legIdx + 1} de {legs.length} · {legAtual.hospital.nome}</span>
          <span className="text-blue-200 text-xs capitalize">{legAtual.status.replace('_', ' ')}</span>
        </div>
      )}
      <div className="flex-1 p-4 space-y-4">
        {legAtual?.status === 'aguardando' && (
          <>
            <div className="bg-white rounded-2xl shadow p-5 text-center space-y-3">
              <div className="text-gray-400 text-sm">{legIdx === 0 ? 'Primeira saída em' : 'Próxima saída em'}</div>
              {legAtual.est_departure_at ? (
                <Countdown targetIso={legAtual.est_departure_at} />
              ) : (
                <div className="text-2xl font-bold text-blue-700">{fmtHora(null, legAtual.horario_saida)}</div>
              )}
              <div className="text-sm text-gray-600">🏥 {legAtual.hospital.nome}{legAtual.hospital.cidade && ` — ${legAtual.hospital.cidade}`}</div>
              {legAtual.est_outbound_min && <div className="text-xs text-gray-400">~{legAtual.est_outbound_min} min de viagem</div>}
              <button onClick={() => setLegStatus(legAtual.id, 'em_andamento')} disabled={atualizando}
                className="w-full mt-2 bg-blue-600 text-white py-3 rounded-xl font-bold text-base hover:bg-blue-700 active:scale-95 transition-transform disabled:opacity-50">
                🚀 Iniciar Viagem
              </button>
            </div>
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">👥 {legAtual.passengers.length} parada(s) nesta viagem</h3>
              <div className="space-y-2">
                {legAtual.passengers.map((p, i) => (
                  <div key={p.id} className="flex items-start gap-3 text-sm">
                    <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                    <div>
                      <div className="font-medium text-gray-800">{p.paciente.nome}</div>
                      {p.paciente.endereco && <div className="text-xs text-gray-400">{[p.paciente.endereco, p.paciente.bairro].filter(Boolean).join(', ')}</div>}
                      {p.est_pickup_at && <div className="text-xs text-blue-600">🕐 {fmtHora(p.est_pickup_at)}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {legAtual?.status === 'em_andamento' && (
          <>
            {passeiroAtual && !todosHandled && (
              <div className="bg-blue-600 text-white rounded-2xl shadow p-5 space-y-3">
                <div className="text-blue-200 text-xs font-medium uppercase tracking-wide">Próxima parada</div>
                <div className="font-bold text-xl">{passeiroAtual.paciente.nome}</div>
                {(passeiroAtual.paciente.endereco || passeiroAtual.paciente.bairro) && (
                  <div className="text-blue-100 text-sm">📍 {[passeiroAtual.paciente.endereco, passeiroAtual.paciente.bairro].filter(Boolean).join(', ')}</div>
                )}
                {passeiroAtual.est_pickup_at && <div className="text-blue-200 text-sm">🕐 Estimado: {fmtHora(passeiroAtual.est_pickup_at)}</div>}
                <div className="flex gap-2 mt-2">
                  <a href={mapsUrl(passeiroAtual.paciente)} target="_blank" rel="noopener noreferrer"
                    className="flex-1 bg-white/20 text-white text-center py-2.5 rounded-xl text-sm font-medium hover:bg-white/30 active:scale-95 transition-transform">
                     🗺️ Abrir Maps
                  </a>
                  <button onClick={() => setPassStatus(passeiroAtual.id, 'embarcou')} disabled={atualizando}
                    className="flex-1 bg-green-500 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-green-600 active:scale-95 transition-transform disabled:opacity-50">
                    ✅ Embarcou
                  </button>
                  <button onClick={() => setPassStatus(passeiroAtual.id, 'ausente')} disabled={atualizando}
                    className="flex-1 bg-red-400 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-red-500 active:scale-95 transition-transform disabled:opacity-50">
                    ✗ Ausente
                  </button>
                </div>
                <div className="pt-1 border-t border-white/20">
                  <div className="text-blue-200 text-xs mb-1.5">Você está em frente à casa do paciente?</div>
                  <BotaoLocalizacao passenger={passeiroAtual} />
                </div>
              </div>
            )}
            <div className="bg-white rounded-2xl shadow p-4">
              <h3 className="font-semibold text-gray-700 text-sm mb-3">Todas as paradas</h3>
              <div className="space-y-3">
                {legAtual.passengers.map((p, i) => {
                  const isCurrent = p.id === passeiroAtual?.id
                  return (
                    <div key={p.id} className={`flex items-start gap-3 p-3 rounded-xl transition-colors ${isCurrent ? 'bg-blue-50 border border-blue-200' : ''} ${p.status === 'embarcou' ? 'opacity-60' : ''} ${p.status === 'ausente' ? 'opacity-40' : ''}`}>
                      <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold ${p.status === 'embarcou' ? 'bg-green-100 text-green-700' : p.status === 'ausente' ? 'bg-red-100 text-red-600' : isCurrent ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                        {p.status === 'embarcou' ? '✒' : p.status === 'ausente' ? '✗' : i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm text-gray-800">{p.paciente.nome}</div>
                        {(p.paciente.endereco || p.paciente.bairro) && <div className="text-xs text-gray-400 truncate">{[p.paciente.endereco, p.paciente.bairro].filter(Boolean).join(', ')}</div>}
                        {p.est_pickup_at && <div className="text-xs text-blue-600">🕐 {fmtHora(p.est_pickup_at)}</div>}
                        <div className="mt-1.5"><BotaoLocalizacao passenger={p} /></div>
                      </div>
                      <StatusBadge status={p.status} />
                    </div>
                  )
                })}
              </div>
              {todosHandled && (
                <button onClick={() => setLegStatus(legAtual.id, 'no_hospital')} disabled={atualizando}
                  className="w5full mt-4 bg-red-600 text-white py-3 rounded-xl font-bold text-base hover:bg-red-700 active:scale-95 transition-transform disabled:opacity-50">
                  🏥 Cheguei ao Hospital
                </button>
              )}
            </div>
          </>
        )}

        {legAtual?.status === 'no_hospital' && (
          <div className="bg-white rounded-2xl shadow p-5 space-y-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🏥</div>
              <h2 className="font-bold text-gray-800 text-lg">{legAtual.hospital.nome}</h2>
              {legAtual.est_hospital_at && <div className="text-sm text-gray-400">Chegada: {fmtHora(legAtual.est_hospital_at)}</div>}
            </div>
            {legAtual.passengers.filter(p => p.status === 'embarcou').length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Para desembarcar</div>
                {legAtual.passengers.filter(p => p.status === 'embarcou').map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm bg-green-50 rounded-lg px-3 py-2">
                    <span className="text-green-600">✒</span><span className="text-gray-700">{p.paciente.nome}</span>
                  </div>
                ))}
              </div>
            )}
            {legAtual.passengers.filter(p => p.status === 'ausente').length > 0 && (
              <div className="space-y-1.5">
                <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">Ausentes</div>
                {legAtual.passengers.filter(p => p.status === 'ausente').map(p => (
                  <div key={p.id} className="flex items-center gap-2 text-sm bg-red-50 rounded-lg px-3 py-2">
                    <span className="text-red-500">✗</span><span className="text-gray-500">{p.paciente.nome}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={() => setLegStatus(legAtual.id, 'retornando')} disabled={atualizando}
              className="w5full bg-blue-600 text-white py-3 rounded-xl font-bold text-base hover:bg-blue-700 active:scale-95 transition-transform disabled:opacity-50">
              🔄 Saindo para Retorno
            </button>
          </div>
        )}

        {legAtual?.status === 'retornando' && (
          <div className="space-y-4">
            <div className="bg-white rounded-2xl shadow p-5 text-center space-y-3">
              <div className="text-4xl">🔄</div>
              <h2 className="font-bold text-gray-800">Retornando à cidade</h2>
              {legAtual.est_return_at && (
                <>
                  <div className="text-xs text-gray-400">Chegada prevista</div>
                  <div className="text-3xl font-bold text-blue-700 font-mono">{fmtHora(legAtual.est_return_at)}</div>
                </>
              )}
              {legAtual.est_return_min && <div className="text-sm text-gray-400">~{legAtual.est_return_min} min de viagem</div>}
              <button onClick={() => setLegStatus(legAtual.id, 'concluida')} disabled={atualizando}
                className="w-full mt-2 bg-green-600 text-white py-3 rounded-xl font-bold text-base hover:bg-green-700 active:scale-95 transition-transform disabled:opacity-50">
                🏠 Cheguei de Volta
              </button>
            </div>
            {proxLeg && (
              <div className="bg-blue-50 rounded-2xl p-4 space-y-2 border border-blue-100">
                <div className="text-xs text-blue-500 font-semibold uppercase tracking-wide">Próxima viagem (Viagem {legIdx + 2})</div>
                <div className="font-semibold text-gray-800 text-sm">🏥 {proxLeg.hospital.nome}</div>
                <div className="text-xs text-gray-500">Saída: {fmtHora(proxLeg.est_departure_at, proxLeg.horario_saida)}{proxLeg.est_outbound_min && ` · ~${proxLeg.est_outbound_min} min`}</div>
                <div className="text-xs text-gray-400">{proxLeg.passengers.length} passageiro(s)</div>
              </div>
            )}
          </div>
        )}

        {legs.filter(l => l.status === 'concluida').length > 0 && legAtual && (
          <div className="bg-white rounded-2xl shadow p-4">
            <h3 className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-2">Concluídas</h3>
            {legs.filter(l => l.status === 'concluida').map((l, i) => (
              <div key={l.id} className="flex items-center gap-2 text-sm py-1.5 border-b last:border-0">
                <span className="text-green-500 text-base">✒</span>
                <span className="text-gray-600">Viagem {i + 1} — {l.hospital.nome}</span>
                {l.est_return_at && <span className="ml-auto text-xs text-gray-400">{fmtHora(l.est_return_at)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {plan && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-3">
          <button onClick={() => setModalProblema(true)}
            className="w-full border border-orange-300 text-orange-600 py-2.5 rounded-xl text-sm font-medium hover:bg-orange-50 active:scale-95 transition-transform">
            🔧 Reportar problema no veículo
          </button>
        </div>
      )}

      {modalProblema && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
          <div className="bg-white w-full rounded-t-2xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">🔧 Problema no Veículo</h3>
              <button onClick={() => setModalProblema(false)} className="text-gray-400 text-xl">┕</button>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
              <select value={formProblema.tipo} onChange={e => setFormProblema(f => ({ ...f, tipo: e.target.value }))} className="w-full border rounded-xl px-3 py-2.5 text-sm">
                <option value="pneu">Pneu</option>
                <option value="motor">Motor</option>
                <option value="freio">Freio</option>
                <option value="ar-cond">Ar-condicionado</option>
                <option value="carroceria">Carroceria</option>
                <option value="outro">Outro</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Urgência</label>
              <div className="grid grid-cols-4 gap-2">
                {(['baixa', 'normal', 'alta', 'critica'] as const).map(u => (
                  <button key={u} onClick={() => setFormProblema(f => ({ ...f, urgencia: u }))}
                    className={`py-2 rounded-xl text-xs font-medium capitalize transition-colors ${formProblema.urgencia === u ? u === 'critica' ? 'bg-red-600 text-white' : u === 'alta' ? 'bg-orange-500 text-white' : u === 'normal' ? 'bg-yellow-400 text-white' : 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {u}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Descrição</label>
              <textarea value={formProblema.descricao} rows={3} onChange={e => setFormProblema(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o problema…" className="w5full border rounded-xl px-3 py-2.5 text-sm resize-none" />
            </div>
            <button onClick={enviarProblema} disabled={enviandoProbl || !formProblema.descricao.trim()} className="w5full bg-orange-500 text-white py-3 rounded-xl font-bold disabled:opacity-40 active:scale-95 transition-transform">
              {enviandoProbl ? 'Enviando…' : '🌄 Reportar ao Gestor'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
