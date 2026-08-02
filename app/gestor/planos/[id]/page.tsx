'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import PlanTimeline from '@/components/PlanTimeline'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Hospital  { id: string; nome: string; cidade?: string }
interface Paciente  { id: string; nome: string; endereco?: string; bairro?: string; lat?: number; lng?: number; hospital_principal_id?: string; hospital_principal_nome?: string; hospital_principal_cidade?: string }
interface Passenger {
  id: string; paciente: Paciente; ordem: number; est_pickup_at?: string
}
interface Leg {
  id: string; hospital: Hospital; horario_saida: string; ordem: number
  passengers: Passenger[]
  est_departure_at?: string; est_hospital_at?: string; est_return_at?: string
  est_outbound_min?: number; est_return_min?: number; est_distance_km?: number
  conflict?: string
}
interface Plano {
  id: string; data: string; status: string
  veiculo: { placa: string; modelo?: string }
  motorista: { nome: string }
}

const TZ = 'America/Sao_Paulo'
const fmtHora = (iso?: string) => iso
  ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
  : '—'

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600', active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700', cancelled: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho', active: 'Ativo', completed: 'Concluído', cancelled: 'Cancelado',
}

// ─── SortablePaciente ─────────────────────────────────────────────────────────
function SortablePaciente({ pac }: { pac: Passenger }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pac.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style}
      className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 select-none">
      <span {...attributes} {...listeners}
        className="cursor-grab text-gray-300 hover:text-gray-500 text-lg leading-none">⠿</span>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm text-gray-800 truncate">{pac.paciente.nome}</div>
        {(pac.paciente.endereco || pac.paciente.bairro) && (
          <div className="text-xs text-gray-400 truncate">
            {[pac.paciente.endereco, pac.paciente.bairro].filter(Boolean).join(', ')}
          </div>
        )}
      </div>
      {pac.est_pickup_at ? (
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full whitespace-nowrap font-mono">
          🕐 {fmtHora(pac.est_pickup_at)}
        </span>
      ) : !pac.paciente.lat ? (
        <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full whitespace-nowrap">
          sem GPS
        </span>
      ) : null}
    </div>
  )
}

// ─── LegCard ─────────────────────────────────────────────────────────────────
function LegCard({
  leg, onDelete, onReorder, onCalcRoute,
}: {
  leg: Leg
  onDelete: (id: string) => void
  onReorder: (legId: string, passengers: Passenger[]) => void
  onCalcRoute: (legId: string) => Promise<void>
}) {
  const sensors = useSensors(useSensor(PointerSensor))
  const [calculando, setCalculando] = useState(false)
  const [erro, setErro] = useState('')

  async function calcular() {
    setCalculando(true); setErro('')
    try { await onCalcRoute(leg.id) }
    catch (e: any) { setErro(e.message) }
    finally { setCalculando(false) }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = leg.passengers.findIndex(p => p.id === active.id)
    const newIdx = leg.passengers.findIndex(p => p.id === over.id)
    onReorder(leg.id, arrayMove(leg.passengers, oldIdx, newIdx))
  }

  const temEstimativas = !!leg.est_hospital_at

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-gray-800">
            🏥 {leg.hospital.nome}
            {leg.hospital.cidade && (
              <span className="font-normal text-gray-400 text-sm ml-1">— {leg.hospital.cidade}</span>
            )}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">🕐 Saída: {leg.horario_saida.substring(0,5)}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={calcular} disabled={calculando}
            className="px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 
                       disabled:opacity-50 font-medium flex items-center gap-1">
            {calculando ? <><span className="animate-spin">⏳</span> Calculando…</> : '🧮 Calcular Rota'}
          </button>
          <button onClick={() => onDelete(leg.id)}
            className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50">
            🗑️
          </button>
        </div>
      </div>

      {/* Erro de cálculo */}
      {erro && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
          {erro}
        </div>
      )}

      {/* Alerta de conflito */}
      {leg.conflict && (
        <div className="mx-4 mt-3 px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 font-medium">
          {leg.conflict}
        </div>
      )}

      {/* Estimativas */}
      {temEstimativas && (
        <div className="mx-4 mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-50 rounded-lg p-2">
            <div className="text-xs text-blue-400 mb-0.5">Chegada hospital</div>
            <div className="font-bold text-blue-700 text-sm">{fmtHora(leg.est_hospital_at)}</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-2">
            <div className="text-xs text-purple-400 mb-0.5">Retorno cidade</div>
            <div className="font-bold text-purple-700 text-sm">{fmtHora(leg.est_return_at)}</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-2">
            <div className="text-xs text-gray-400 mb-0.5">Distância</div>
            <div className="font-bold text-gray-700 text-sm">{leg.est_distance_km} km</div>
          </div>
          <div className="bg-green-50 rounded-lg p-2 col-span-3 flex justify-around">
            <span className="text-xs text-green-700">🚗 Ida: <strong>{leg.est_outbound_min} min</strong></span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-green-700">🔄 Volta: <strong>{leg.est_return_min} min</strong></span>
            <span className="text-xs text-gray-400">|</span>
            <span className="text-xs text-green-700">⏱ Total: <strong>{(leg.est_outbound_min || 0) + (leg.est_return_min || 0)} min</strong></span>
          </div>
        </div>
      )}

      {/* Passageiros */}
      <div className="p-4 space-y-2 mt-1">
        {leg.passengers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">Nenhum paciente nesta viagem</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={leg.passengers.map(p => p.id)} strategy={verticalListSortingStrategy}>
              {leg.passengers.map(p => <SortablePaciente key={p.id} pac={p} />)}
            </SortableContext>
          </DndContext>
        )}
        <p className="text-xs text-gray-300 text-center">⠿ Arraste para reordenar</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function EditarPlano() {
  const supabase = createClientComponentClient()
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()

  const [plano,        setPlano]        = useState<Plano | null>(null)
  const [legs,         setLegs]         = useState<Leg[]>([])
  const [hospitais,    setHospitais]    = useState<Hospital[]>([])
  const [pacientes,    setPacientes]    = useState<Paciente[]>([])
  const [loading,      setLoading]      = useState(true)
  const [painelAberto, setPainelAberto] = useState(false)
  const [salvandoLeg,  setSalvandoLeg]  = useState(false)
  const [salvandoOrdem,setSalvandoOrdem]= useState(false)
  const [msg,          setMsg]          = useState('')
  const [aba,          setAba]          = useState<'editar'|'timeline'>('editar')

  const [formHospital, setFormHospital] = useState('')
  const [formHorario,  setFormHorario]  = useState('08:00')
  const [buscaPac,     setBuscaPac]     = useState('')
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())
  const [loadingPacs,  setLoadingPacs]  = useState(false)
  const [jaEmViagem,   setJaEmViagem]   = useState<Record<string, string>>({})

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data: p } = await supabase
      .from('route_plans')
      .select('id,data,status,veiculo:veiculos(placa,modelo),motorista:profiles(nome)')
      .eq('id', id).single()
    setPlano(p as any)

    const { data: ls } = await supabase
      .from('route_legs')
      .select(`
        id, horario_saida, ordem,
        est_departure_at, est_hospital_at, est_return_at,
        est_outbound_min, est_return_min, est_distance_km,
        hospital:hospitais(id,nome,cidade),
        leg_passengers(id,ordem,est_pickup_at,paciente:pacientes(id,nome,endereco,bairro,lat,lng))
      `)
      .eq('plan_id', id)
      .order('ordem')

    setLegs((ls || []).map((l: any) => ({
      id: l.id, hospital: l.hospital, horario_saida: l.horario_saida, ordem: l.ordem,
      est_departure_at: l.est_departure_at, est_hospital_at: l.est_hospital_at,
      est_return_at: l.est_return_at, est_outbound_min: l.est_outbound_min,
      est_return_min: l.est_return_min, est_distance_km: l.est_distance_km,
      passengers: (l.leg_passengers || [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((lp: any) => ({ id: lp.id, paciente: lp.paciente, ordem: lp.ordem, est_pickup_at: lp.est_pickup_at })),
    })))
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    supabase.from('hospitais').select('id,nome,cidade').order('nome').then(({ data }) => setHospitais(data || []))
  }, [supabase])

  useEffect(() => {
    if (!formHospital || !plano) { setPacientes([]); setJaEmViagem({}); return }
    setLoadingPacs(true)

    Promise.all([
      supabase
        .from('pacientes')
        .select('id,nome,endereco,bairro,lat,lng,hospital_principal_id,hospital_principal:hospitais!hospital_principal_id(nome,cidade)')
        .order('nome'),
      supabase
        .from('route_plans')
        .select('id,route_legs(id,ordem,leg_passengers(paciente_id))')
        .eq('data', plano.data),
    ]).then(([pacsRes, plansRes]) => {
      // Mapear pacientes já agendados hoje
      const mapa: Record<string, string> = {}
      ;(plansRes.data || []).forEach((plan: any) => {
        ;(plan.route_legs || []).forEach((leg: any) => {
          ;(leg.leg_passengers || []).forEach((lp: any) => {
            if (!mapa[lp.paciente_id]) {
              mapa[lp.paciente_id] = `Viagem ${leg.ordem + 1}`
            }
          })
        })
      })
      setJaEmViagem(mapa)

      // Enriquecer pacientes com info do hospital principal
      const pacs: Paciente[] = (pacsRes.data || []).map((p: any) => ({
        ...p,
        hospital_principal_nome:   p.hospital_principal?.nome,
        hospital_principal_cidade: p.hospital_principal?.cidade,
      }))
      setPacientes(pacs)
      setLoadingPacs(false)
    })
  }, [supabase, formHospital, plano])

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(buscaPac.toLowerCase())
  )
  const jaAdicionados = new Set(legs.flatMap(l => l.passengers.map(p => p.paciente.id)))

  function togglePaciente(pid: string) {
    setSelecionados(prev => { const n = new Set(prev); n.has(pid) ? n.delete(pid) : n.add(pid); return n })
  }

  async function adicionarViagem() {
    if (!formHospital) { setMsg('Selecione o hospital destino'); return }
    setSalvandoLeg(true); setMsg('')
    const { data: leg, error } = await supabase
      .from('route_legs')
      .insert({ plan_id: id, hospital_id: formHospital, horario_saida: formHorario, ordem: legs.length })
      .select('id').single()
    if (error) { setMsg('Erro: ' + error.message); setSalvandoLeg(false); return }
    if (selecionados.size > 0) {
      await supabase.from('leg_passengers').insert(
        Array.from(selecionados).map((pid, i) => ({ leg_id: leg.id, paciente_id: pid, ordem: i }))
      )
    }
    setSalvandoLeg(false); setPainelAberto(false)
    setFormHospital(''); setFormHorario('08:00'); setBuscaPac(''); setSelecionados(new Set())
    carregar()
  }

  async function excluirLeg(legId: string) {
    if (!confirm('Remover esta viagem e seus passageiros?')) return
    await supabase.from('route_legs').delete().eq('id', legId)
    setLegs(prev => prev.filter(l => l.id !== legId))
  }

  async function handleReorder(legId: string, newPassengers: Passenger[]) {
    setLegs(prev => prev.map(l => l.id === legId ? { ...l, passengers: newPassengers } : l))
    setSalvandoOrdem(true)
    await Promise.all(newPassengers.map((p, i) =>
      supabase.from('leg_passengers').update({ ordem: i }).eq('id', p.id)
    ))
    setSalvandoOrdem(false)
  }

  async function calcularRota(legId: string) {
    const res = await fetch('/api/calcular-rota', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leg_id: legId }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Erro desconhecido')

    // Atualizar leg no estado local (sem recarregar tudo)
    setLegs(prev => prev.map(l => {
      if (l.id !== legId) return l
      const pickupMap = Object.fromEntries(data.pickup_times.map((p: any) => [p.id, p.est_pickup_at]))
      return {
        ...l,
        est_departure_at: data.est_departure_at,
        est_hospital_at:  data.est_hospital_at,
        est_return_at:    data.est_return_at,
        est_outbound_min: data.est_outbound_min,
        est_return_min:   data.est_return_min,
        est_distance_km:  data.est_distance_km,
        conflict: data.conflict || undefined,
        passengers: l.passengers.map(p => ({
          ...p, est_pickup_at: pickupMap[p.id] || p.est_pickup_at
        })),
      }
    }))
  }

  async function mudarStatus(novoStatus: string) {
    await supabase.from('route_plans').update({ status: novoStatus }).eq('id', id)
    setPlano(prev => prev ? { ...prev, status: novoStatus } : prev)
  }

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Carregando…</div>
  if (!plano)  return <div className="flex items-center justify-center h-64 text-gray-400">Plano não encontrado</div>

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/gestor/planos')} className="text-gray-400 hover:text-gray-600 text-xl">←</button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800">🚐 {plano.veiculo?.placa}</h1>
            {plano.veiculo?.modelo && <span className="text-gray-400 text-sm">{plano.veiculo.modelo}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[plano.status]}`}>
              {STATUS_LABEL[plano.status]}
            </span>
            {salvandoOrdem && <span className="text-xs text-gray-400 animate-pulse">Salvando…</span>}
          </div>
          <div className="text-sm text-gray-500">
            👤 {plano.motorista?.nome} · 📅 {new Date(plano.data + 'T12:00').toLocaleDateString('pt-BR')}
          </div>
        </div>
        <select value={plano.status} onChange={e => mudarStatus(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs text-gray-700">
          <option value="draft">Rascunho</option>
          <option value="active">Ativo</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {/* Abas */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        <button onClick={() => setAba('editar')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
            ${aba === 'editar' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          ✏️ Editar Plano
        </button>
        <button onClick={() => setAba('timeline')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
            ${aba === 'timeline' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
          📅 Linha do Tempo
        </button>
      </div>

      {aba === 'timeline' && (
        <PlanTimeline data={plano.data} legs={legs} />
      )}

      {aba === 'editar' && <>
      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{legs.length}</div>
          <div className="text-xs text-blue-500 mt-1">Viagem(ns)</div>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-purple-700">
            {legs.reduce((acc, l) => acc + l.passengers.length, 0)}
          </div>
          <div className="text-xs text-purple-500 mt-1">Paciente(s)</div>
        </div>
      </div>

      <button onClick={() => { setPainelAberto(true); setMsg('') }}
        className="w-full border-2 border-dashed border-blue-200 text-blue-600 rounded-xl py-3 text-sm font-medium
                   hover:border-blue-400 hover:bg-blue-50 transition-colors">
        ➕ Adicionar Viagem
      </button>

      {legs.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Nenhuma viagem adicionada ainda</div>
      ) : (
        <div className="space-y-4">
          {legs.map(l => (
            <LegCard key={l.id} leg={l}
              onDelete={excluirLeg}
              onReorder={handleReorder}
              onCalcRoute={calcularRota} />
          ))}
        </div>
      )}

      </> }

      {/* Painel lateral */}
      {painelAberto && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30" onClick={() => setPainelAberto(false)} />
          <div className="w-full max-w-md bg-white shadow-2xl flex flex-col h-full overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="font-bold text-gray-800">🗺️ Nova Viagem</h2>
              <button onClick={() => setPainelAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {msg && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{msg}</div>}
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Hospital destino *</label>
                <select value={formHospital} onChange={e => { setFormHospital(e.target.value); setSelecionados(new Set()) }}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione…</option>
                  {hospitais.map(h => (
                    <option key={h.id} value={h.id}>{h.nome}{h.cidade ? ` — ${h.cidade}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Horário de saída *</label>
                <input type="time" value={formHorario} onChange={e => setFormHorario(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              {formHospital && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs text-gray-500">Pacientes</label>
                    <span className="text-xs text-blue-600">{selecionados.size} selecionado(s)</span>
                  </div>
                  <input value={buscaPac} onChange={e => setBuscaPac(e.target.value)}
                    placeholder="Buscar paciente…" className="w-full border rounded-lg px-3 py-2 text-sm mb-2" />
                  {loadingPacs ? (
                    <div className="text-center text-gray-400 text-sm py-4">Carregando…</div>
                  ) : pacientesFiltrados.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">Nenhum paciente encontrado</div>
                  ) : (() => {
                    const hospSel = hospitais.find(h => h.id === formHospital)
                    const cidadeSel = (hospSel as any)?.cidade

                    // Agrupar pacientes
                    const g1 = pacientesFiltrados.filter(p => p.hospital_principal_id === formHospital)
                    const g2 = pacientesFiltrados.filter(p =>
                      p.hospital_principal_id !== formHospital &&
                      cidadeSel && p.hospital_principal_cidade === cidadeSel
                    )
                    const g3 = pacientesFiltrados.filter(p =>
                      p.hospital_principal_id !== formHospital &&
                      !(cidadeSel && p.hospital_principal_cidade === cidadeSel)
                    )

                    function PacCard({ p, grupo }: { p: Paciente; grupo: 1 | 2 | 3 }) {
                      const jaEsta   = jaAdicionados.has(p.id)
                      const sel      = selecionados.has(p.id)
                      const avisoViagem = jaEmViagem[p.id]
                      const baseBg =
                        sel      ? 'bg-blue-50 border-blue-300' :
                        grupo===1 ? 'bg-green-50 border-green-200' :
                        grupo===2 ? 'bg-yellow-50 border-yellow-200' :
                                    'bg-gray-50 border-gray-100'
                      return (
                        <label className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors
                          ${jaEsta ? 'opacity-50 cursor-not-allowed' : 'hover:brightness-95'} ${baseBg}`}>
                          <input type="checkbox" checked={sel} disabled={jaEsta}
                            onChange={() => !jaEsta && togglePaciente(p.id)}
                            className="accent-blue-600 mt-0.5 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-800 truncate">{p.nome}</div>
                            {(p.endereco || p.bairro) && (
                              <div className="text-xs text-gray-500 truncate">
                                📍 {[p.endereco, p.bairro].filter(Boolean).join(', ')}
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {grupo === 1 && (
                                <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                                  🏥 Hospital principal
                                </span>
                              )}
                              {grupo === 2 && (
                                <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-medium">
                                  📍 Mesma cidade · {p.hospital_principal_nome || 'outro hospital'}
                                </span>
                              )}
                              {grupo === 3 && p.hospital_principal_nome && (
                                <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">
                                  {p.hospital_principal_nome}
                                </span>
                              )}
                              {avisoViagem && !jaEsta && (
                                <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full font-medium">
                                  ⚠️ Já em {avisoViagem}
                                </span>
                              )}
                              {!p.lat && (
                                <span className="text-[10px] bg-gray-100 text-gray-400 px-1.5 py-0.5 rounded-full">
                                  sem GPS
                                </span>
                              )}
                              {jaEsta && (
                                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">
                                  já adicionado
                                </span>
                              )}
                            </div>
                          </div>
                        </label>
                      )
                    }

                    return (
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                        {g1.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold text-green-700 uppercase tracking-widest mb-1.5 px-1">
                              ✅ Hospital principal ({g1.length})
                            </div>
                            <div className="space-y-1.5">
                              {g1.map(p => <PacCard key={p.id} p={p} grupo={1} />)}
                            </div>
                          </div>
                        )}
                        {g2.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold text-yellow-700 uppercase tracking-widest mb-1.5 px-1">
                              📍 Mesma cidade ({g2.length})
                            </div>
                            <div className="space-y-1.5">
                              {g2.map(p => <PacCard key={p.id} p={p} grupo={2} />)}
                            </div>
                          </div>
                        )}
                        {g3.length > 0 && (
                          <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 px-1">
                              Outros ({g3.length})
                            </div>
                            <div className="space-y-1.5">
                              {g3.map(p => <PacCard key={p.id} p={p} grupo={3} />)}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex gap-3">
              <button onClick={() => setPainelAberto(false)}
                className="flex-1 border border-gray-300 text-gray-600 rounded-lg py-2 text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={adicionarViagem} disabled={salvandoLeg}
                className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {salvandoLeg ? 'Salvando…' : '✓ Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
