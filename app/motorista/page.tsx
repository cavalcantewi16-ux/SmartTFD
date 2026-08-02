'use client'
import { useEffect, useState, useRef, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Parada {
  id: string; viagem_id: string; paciente_id: string; hospital_id: string
  ordem: number; status: string
  paciente?: { nome: string; telefone?: string }
  hospital?: { nome: string; lat?: number; lng?: number; endereco?: string }
}
interface Viagem {
  id: string; data: string; status: string; observacoes?: string
  veiculo?: { placa: string; modelo: string }
  paradas?: Parada[]
}

const STATUS_COR: Record<string, string> = {
  pendente:    'bg-yellow-100 text-yellow-800 border-yellow-200',
  embarcado:   'bg-blue-100 text-blue-800 border-blue-200',
  concluido:   'bg-green-100 text-green-800 border-green-200',
  ausente:     'bg-gray-100 text-gray-600 border-gray-200',
  cancelou:    'bg-red-100 text-red-600 border-red-200',
  desembarcou: 'bg-purple-100 text-purple-800 border-purple-200',
}
const STATUS_LABEL: Record<string, string> = {
  pendente: 'Pendente', embarcado: 'Embarcado', concluido: 'Concluído',
  ausente: 'Ausente', cancelou: 'Cancelou', desembarcou: 'Desembarcou',
}

export default function MotoristaApp() {
  const supabase = createClientComponentClient()
  const [userId, setUserId]   = useState<string | null>(null)
  const [viagem, setViagem]   = useState<Viagem | null>(null)
  const [loading, setLoading] = useState(true)
  const [paradaAberta, setParadaAberta] = useState<string | null>(null)
  const [gpsAtivo, setGpsAtivo] = useState(false)
  const [coords, setCoords]   = useState<{ lat: number; lng: number } | null>(null)
  const ultimoUpsertRef       = useRef<number>(0)
  const watchIdRef            = useRef<number | null>(null)
  const [manutencaoAberta, setManutencaoAberta] = useState(false)
  const [formMan, setFormMan] = useState({ tipo: 'outro', descricao: '', urgencia: 'normal' })
  const [enviandoMan, setEnviandoMan] = useState(false)
  const [msgMan, setMsgMan]   = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id || null))
  }, [supabase])

  const carregarViagem = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    const hoje = new Date().toISOString().slice(0, 10)
    const { data: vg } = await supabase
      .from('viagens')
      .select('*, veiculo:veiculos(placa,modelo)')
      .eq('motorista_id', userId)
      .eq('data', hoje)
      .in('status', ['agendada', 'em_andamento'])
      .order('created_at')
      .limit(1)
      .single()

    if (vg) {
      const { data: ps } = await supabase
        .from('viagem_paradas')
        .select('*, paciente:pacientes(nome,telefone), hospital:hospitais(nome,lat,lng,endereco)')
        .eq('viagem_id', vg.id)
        .order('ordem')
      setViagem({ ...vg, veiculo: (vg as any).veiculo, paradas: ps || [] })
    } else {
      setViagem(null)
    }
    setLoading(false)
  }, [userId, supabase])

  useEffect(() => { carregarViagem() }, [carregarViagem])

  useEffect(() => {
    if (!viagem) return
    const canal = supabase.channel('motorista-paradas')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'viagem_paradas', filter: `viagem_id=eq.${viagem.id}` },
        () => carregarViagem())
      .subscribe()
    return () => { supabase.removeChannel(canal) }
  }, [viagem?.id, supabase, carregarViagem])

  function iniciarGPS() {
    if (!navigator.geolocation || !userId) return
    setGpsAtivo(true)
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setCoords({ lat, lng })
        const agora = Date.now()
        if (agora - ultimoUpsertRef.current < 5000) return
        ultimoUpsertRef.current = agora
        await supabase.from('motorista_localizacao').upsert(
          { motorista_id: userId, lat, lng, atualizado_em: new Date().toISOString() },
          { onConflict: 'motorista_id' }
        )
      },
      null,
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
  }

  function pararGPS() {
    if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current)
    setGpsAtivo(false)
    setCoords(null)
  }

  async function atualizarStatus(paradaId: string, novoStatus: string) {
    const updates: Record<string, any> = { status: novoStatus }
    if (novoStatus === 'embarcado') updates.hora_embarque = new Date().toISOString()
    if (novoStatus === 'concluido' || novoStatus === 'desembarcou') updates.hora_chegada = new Date().toISOString()
    await supabase.from('viagem_paradas').update(updates).eq('id', paradaId)
    setParadaAberta(null)
    carregarViagem()
  }

  async function enviarManutencao() {
    if (!userId || !viagem || !formMan.descricao.trim() || enviandoMan) return
    setEnviandoMan(true)
    const { error } = await supabase.from('manutencao_veicular').insert({
      veiculo_id: (viagem as any).veiculo_id,
      motorista_id: userId,
      tipo: formMan.tipo,
      descricao: formMan.descricao.trim(),
      urgencia: formMan.urgencia,
    })
    setEnviandoMan(false)
    if (error) { setMsgMan('Erro ao enviar: ' + error.message); return }
    setMsgMan('✅ Problema reportado ao gestor!')
    setFormMan({ tipo: 'outro', descricao: '', urgencia: 'normal' })
    setTimeout(() => { setMsgMan(''); setManutencaoAberta(false) }, 2500)
  }

  const paradas = viagem?.paradas || []
  const entregues  = paradas.filter(p => p.status === 'concluido' || p.status === 'desembarcou').length
  const embarcados = paradas.filter(p => p.status === 'embarcado').length
  const pendentes  = paradas.filter(p => p.status === 'pendente').length
  const pctGreen   = paradas.length ? Math.round((entregues / paradas.length) * 100) : 0
  const pctBlue    = paradas.length ? Math.round((embarcados / paradas.length) * 100) : 0

  if (loading) return <div className="flex items-center justify-center min-h-screen text-gray-400">Carregando…</div>

  if (!viagem) return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="text-6xl mb-4">🚐</div>
      <h2 className="text-xl font-bold text-gray-700 mb-2">Nenhuma rota hoje</h2>
      <p className="text-gray-500 text-center text-sm">Aguarde o gestor agendar uma viagem para você.</p>
      <button onClick={carregarViagem} className="mt-6 bg-blue-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-blue-700">
        🔄 Atualizar
      </button>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-blue-700 text-white px-4 pt-6 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-xs text-blue-300 uppercase tracking-wide">Sua rota de hoje</div>
            <div className="font-bold text-lg">{viagem.veiculo?.placa} · {viagem.veiculo?.modelo}</div>
          </div>
          <button
            onClick={gpsAtivo ? pararGPS : iniciarGPS}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition ${gpsAtivo ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}>
            {gpsAtivo ? '⏸ GPS' : '▶ GPS'}
          </button>
        </div>
        {gpsAtivo && coords && (
          <div className="text-xs text-blue-300 mt-1">📍 {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}</div>
        )}

        {/* Barra de progresso */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-blue-200 mb-1">
            <span>{entregues} entregue{entregues !== 1 ? 's' : ''}</span>
            <span>{paradas.length} total</span>
          </div>
          <div className="w-full bg-blue-900 rounded-full h-2 flex overflow-hidden">
            <div className="bg-green-400 h-2 transition-all" style={{ width: `${pctGreen}%` }} />
            <div className="bg-blue-300 h-2 transition-all" style={{ width: `${pctBlue}%` }} />
          </div>
        </div>
      </div>

      {/* Observações */}
      {viagem.observacoes && (
        <div className="mx-4 mt-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-2.5 text-sm text-yellow-800">
          📝 {viagem.observacoes}
        </div>
      )}

      {/* Lista de paradas */}
      <div className="px-4 mt-4 space-y-3">
        {paradas.map((p, i) => (
          <div key={p.id} className={`bg-white rounded-2xl shadow-sm border overflow-hidden ${STATUS_COR[p.status]}`}>
            <button className="w-full text-left p-4" onClick={() => setParadaAberta(paradaAberta === p.id ? null : p.id)}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                    <span className="font-semibold text-gray-800">{p.paciente?.nome || '—'}</span>
                  </div>
                  <div className="text-sm text-gray-600 mt-0.5">🏥 {p.hospital?.nome || '—'}</div>
                  {p.hospital?.endereco && (
                    <div className="text-xs text-gray-400 mt-0.5">{p.hospital.endereco}</div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${STATUS_COR[p.status]}`}>
                    {STATUS_LABEL[p.status]}
                  </span>
                  <span className="text-gray-400 text-sm">{paradaAberta === p.id ? '▲' : '▼'}</span>
                </div>
              </div>
            </button>

            {paradaAberta === p.id && (
              <div className="border-t px-4 pb-4 pt-3 space-y-2">
                {/* Google Maps */}
                {p.hospital?.lat && p.hospital?.lng && (
                  <a href={`https://www.google.com/maps/dir/?api=1&destination=${p.hospital.lat},${p.hospital.lng}&travelmode=driving`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700">
                    🗺️ Abrir no Google Maps
                  </a>
                )}

                {/* Botões de status */}
                <div className="grid grid-cols-2 gap-2">
                  {p.status === 'pendente' && <>
                    <button onClick={() => atualizarStatus(p.id, 'embarcado')}
                      className="col-span-2 bg-blue-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-blue-700">
                      ✅ Confirmar embarque
                    </button>
                    <button onClick={() => atualizarStatus(p.id, 'ausente')}
                      className="bg-gray-200 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-300">
                      ⚠️ Ausente
                    </button>
                    <button onClick={() => atualizarStatus(p.id, 'cancelou')}
                      className="bg-red-100 text-red-700 py-2.5 rounded-xl text-sm hover:bg-red-200">
                      ✕ Cancelou
                    </button>
                  </>}
                  {p.status === 'embarcado' && <>
                    <button onClick={() => atualizarStatus(p.id, 'desembarcou')}
                      className="col-span-2 bg-purple-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-purple-700">
                      🏥 Desembarcou no hospital
                    </button>
                    <button onClick={() => atualizarStatus(p.id, 'concluido')}
                      className="col-span-2 bg-green-600 text-white py-2.5 rounded-xl text-sm hover:bg-green-700">
                      ✓ Entregue (concluído)
                    </button>
                  </>}
                  {p.status === 'desembarcou' && (
                    <button onClick={() => atualizarStatus(p.id, 'concluido')}
                      className="col-span-2 bg-green-600 text-white py-3 rounded-xl font-medium text-sm hover:bg-green-700">
                      ✓ Marcar como concluído
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Botão Reportar Problema */}
      {viagem && (
        <div className="px-4 mt-6">
          <button onClick={() => setManutencaoAberta(true)}
            className="w-full border-2 border-orange-300 bg-orange-50 text-orange-700 py-3 rounded-2xl font-medium text-sm hover:bg-orange-100 flex items-center justify-center gap-2">
            🔧 Reportar problema no veículo
          </button>
        </div>
      )}

      {/* Modal Manutenção */}
      {manutencaoAberta && (
        <div className="fixed inset-0 bg-black/40 flex items-end z-50 p-4">
          <div className="bg-white w-full rounded-2xl shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-800">🔧 Reportar Problema</h3>
              <button onClick={() => setManutencaoAberta(false)} className="text-gray-400 text-xl">✕</button>
            </div>

            {msgMan ? (
              <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm text-center font-medium">{msgMan}</div>
            ) : (
              <>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Tipo do problema</label>
                  <select value={formMan.tipo} onChange={e => setFormMan(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full border rounded-xl px-3 py-2.5 text-sm">
                    <option value="pneu">🛞 Pneu</option>
                    <option value="motor">⚙️ Motor</option>
                    <option value="freio">🛑 Freio</option>
                    <option value="ar-condicionado">❄️ Ar-condicionado</option>
                    <option value="carroceria">🚐 Carroceria</option>
                    <option value="outro">📋 Outro</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Urgência</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['baixa', 'normal', 'alta', 'critica'].map(u => (
                      <button key={u} onClick={() => setFormMan(f => ({ ...f, urgencia: u }))}
                        className={`py-2 rounded-xl text-xs font-medium border transition
                          ${formMan.urgencia === u
                            ? u === 'critica' ? 'bg-red-600 text-white border-red-600'
                            : u === 'alta' ? 'bg-orange-500 text-white border-orange-500'
                            : u === 'normal' ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-gray-600 text-white border-gray-600'
                            : 'bg-white text-gray-600 border-gray-300'}`}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Descrição *</label>
                  <textarea value={formMan.descricao} onChange={e => setFormMan(f => ({ ...f, descricao: e.target.value }))}
                    rows={3} placeholder="Descreva o problema observado…"
                    className="w-full border rounded-xl px-3 py-2.5 text-sm resize-none" />
                </div>
                <button onClick={enviarManutencao} disabled={!formMan.descricao.trim() || enviandoMan}
                  className="w-full bg-orange-500 text-white py-3 rounded-xl font-semibold hover:bg-orange-600 disabled:opacity-50">
                  {enviandoMan ? 'Enviando…' : '📤 Enviar Alerta'}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
