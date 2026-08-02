'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useParams, useRouter } from 'next/navigation'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ─── Types ───────────────────────────────────────────────────────────────────
interface Hospital  { id: string; nome: string; cidade?: string }
interface Paciente  { id: string; nome: string; endereco?: string; bairro?: string }
interface Passenger { id: string; paciente: Paciente; ordem: number }
interface Leg {
  id: string; hospital: Hospital; horario_saida: string; ordem: number
  passengers: Passenger[]
}
interface Plano {
  id: string; data: string; status: string
  veiculo: { placa: string; modelo?: string }
  motorista: { nome: string }
}

const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho', active: 'Ativo', completed: 'Concluído', cancelled: 'Cancelado'
}

// ─── SortableItem ─────────────────────────────────────────────────────────────
function SortablePaciente({ pac }: { pac: Passenger }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: pac.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }
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
    </div>
  )
}

// ─── LegCard ──────────────────────────────────────────────────────────────────
function LegCard({
  leg, onDelete, onReorder
}: {
  leg: Leg
  onDelete: (id: string) => void
  onReorder: (legId: string, passengers: Passenger[]) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIdx = leg.passengers.findIndex(p => p.id === active.id)
    const newIdx = leg.passengers.findIndex(p => p.id === over.id)
    onReorder(leg.id, arrayMove(leg.passengers, oldIdx, newIdx))
  }

  return (
    <div className="bg-white rounded-xl shadow border border-gray-100">
      <div className="flex items-center justify-between px-5 py-4 border-b">
        <div>
          <div className="font-semibold text-gray-800">
            🏥 {leg.hospital.nome}
            {leg.hospital.cidade && <span className="font-normal text-gray-400 text-sm ml-1">— {leg.hospital.cidade}</span>}
          </div>
          <div className="text-sm text-gray-500 mt-0.5">🕐 Saída: {leg.horario_saida}</div>
        </div>
        <button onClick={() => onDelete(leg.id)}
          className="text-red-400 hover:text-red-600 text-sm px-2 py-1 rounded hover:bg-red-50">
          🗑️ Remover
        </button>
      </div>

      <div className="p-4 space-y-2">
        {leg.passengers.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-2">Nenhum paciente nesta viagem</p>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={leg.passengers.map(p => p.id)}
              strategy={verticalListSortingStrategy}>
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
  const supabase   = createClientComponentClient()
  const { id }     = useParams<{ id: string }>()
  const router     = useRouter()

  const [plano,      setPlano]      = useState<Plano | null>(null)
  const [legs,       setLegs]       = useState<Leg[]>([])
  const [hospitais,  setHospitais]  = useState<Hospital[]>([])
  const [pacientes,  setPacientes]  = useState<Paciente[]>([])
  const [loading,    setLoading]    = useState(true)
  const [painelAberto, setPainelAberto] = useState(false)
  const [salvandoLeg,  setSalvandoLeg]  = useState(false)
  const [salvandoOrdem,setSalvandoOrdem]= useState(false)
  const [msg,        setMsg]        = useState('')

  // Form do painel lateral
  const [formHospital,  setFormHospital]  = useState('')
  const [formHorario,   setFormHorario]   = useState('08:00')
  const [buscaPac,      setBuscaPac]      = useState('')
  const [selecionados,  setSelecionados]  = useState<Set<string>>(new Set())
  const [loadingPacs,   setLoadingPacs]   = useState(false)

  // Carregar plano + legs
  const carregar = useCallback(async () => {
    setLoading(true)
    const { data: p } = await supabase
      .from('route_plans')
      .select('id,data,status,veiculo:veiculos(placa,modelo),motorista:profiles(nome)')
      .eq('id', id).single()
    setPlano(p as any)

    const { data: ls } = await supabase
      .from('route_legs')
      .select(`id,horario_saida,ordem,hospital:hospitais(id,nome,cidade),
               leg_passengers(id,ordem,paciente:pacientes(id,nome,endereco,bairro))`)
      .eq('plan_id', id)
      .order('ordem')
    const mapeado: Leg[] = (ls || []).map((l: any) => ({
      id: l.id,
      hospital: l.hospital,
      horario_saida: l.horario_saida,
      ordem: l.ordem,
      passengers: (l.leg_passengers || [])
        .sort((a: any, b: any) => a.ordem - b.ordem)
        .map((lp: any) => ({ id: lp.id, paciente: lp.paciente, ordem: lp.ordem }))
    }))
    setLegs(mapeado)
    setLoading(false)
  }, [supabase, id])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    supabase.from('hospitais').select('id,nome,cidade').order('nome')
      .then(({ data }) => setHospitais(data || []))
  }, [supabase])

  // Carregar pacientes quando muda hospital no painel
  useEffect(() => {
    if (!formHospital) { setPacientes([]); return }
    setLoadingPacs(true)
    supabase.from('pacientes').select('id,nome,endereco,bairro').order('nome')
      .then(({ data }) => { setPacientes(data || []); setLoadingPacs(false) })
  }, [supabase, formHospital])

  // Filtro de busca de pacientes
  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(buscaPac.toLowerCase())
  )

  // IDs já adicionados em qualquer leg
  const jaAdicionados = new Set(legs.flatMap(l => l.passengers.map(p => p.paciente.id)))

  function togglePaciente(id: string) {
    setSelecionados(prev => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
    })
  }

  async function adicionarViagem() {
    if (!formHospital) { setMsg('Selecione o hospital destino'); return }
    setSalvandoLeg(true)
    setMsg('')
    const novaOrdem = legs.length

    const { data: leg, error } = await supabase
      .from('route_legs')
      .insert({ plan_id: id, hospital_id: formHospital, horario_saida: formHorario, ordem: novaOrdem })
      .select('id').single()

    if (error) { setMsg('Erro: ' + error.message); setSalvandoLeg(false); return }

    if (selecionados.size > 0) {
      const passengers = Array.from(selecionados).map((pid, i) => ({
        leg_id: leg.id, paciente_id: pid, ordem: i
      }))
      await supabase.from('leg_passengers').insert(passengers)
    }

    setSalvandoLeg(false)
    setPainelAberto(false)
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
    await Promise.all(
      newPassengers.map((p, i) =>
        supabase.from('leg_passengers').update({ ordem: i }).eq('id', p.id)
      )
    )
    setSalvandoOrdem(false)
  }

  async function mudarStatus(novoStatus: string) {
    await supabase.from('route_plans').update({ status: novoStatus }).eq('id', id)
    setPlano(prev => prev ? { ...prev, status: novoStatus } : prev)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Carregando…</div>
  )
  if (!plano) return (
    <div className="flex items-center justify-center h-64 text-gray-400">Plano não encontrado</div>
  )

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push('/gestor/planos')}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none">←</button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-800">
              🚐 {plano.veiculo?.placa}
            </h1>
            {plano.veiculo?.modelo && <span className="text-gray-400 text-sm">{plano.veiculo.modelo}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[plano.status]}`}>
              {STATUS_LABEL[plano.status]}
            </span>
            {salvandoOrdem && <span className="text-xs text-gray-400 animate-pulse">Salvando ordem…</span>}
          </div>
          <div className="text-sm text-gray-500">
            👤 {plano.motorista?.nome} · 📅 {new Date(plano.data + 'T12:00').toLocaleDateString('pt-BR')}
          </div>
        </div>
        {/* Mudar status */}
        <select value={plano.status} onChange={e => mudarStatus(e.target.value)}
          className="border rounded-lg px-2 py-1.5 text-xs text-gray-700">
          <option value="draft">Rascunho</option>
          <option value="active">Ativo</option>
          <option value="completed">Concluído</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

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

      {/* Botão adicionar viagem */}
      <button onClick={() => { setPainelAberto(true); setMsg('') }}
        className="w-full border-2 border-dashed border-blue-200 text-blue-600 rounded-xl py-3 text-sm font-medium
                   hover:border-blue-400 hover:bg-blue-50 transition-colors">
        ➕ Adicionar Viagem
      </button>

      {/* Lista de legs */}
      {legs.length === 0 ? (
        <div className="text-center text-gray-400 py-8">Nenhuma viagem adicionada ainda</div>
      ) : (
        <div className="space-y-4">
          {legs.map(l => (
            <LegCard key={l.id} leg={l} onDelete={excluirLeg} onReorder={handleReorder} />
          ))}
        </div>
      )}

      {/* Painel lateral */}
      {painelAberto && (
        <div className="fixed inset-0 z-50 flex">
          {/* Overlay */}
          <div className="flex-1 bg-black/30" onClick={() => setPainelAberto(false)} />
          {/* Drawer */}
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
                    placeholder="Buscar paciente…"
                    className="w-full border rounded-lg px-3 py-2 text-sm mb-2" />

                  {loadingPacs ? (
                    <div className="text-center text-gray-400 text-sm py-4">Carregando…</div>
                  ) : pacientesFiltrados.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">Nenhum paciente encontrado</div>
                  ) : (
                    <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                      {pacientesFiltrados.map(p => {
                        const jaEsta = jaAdicionados.has(p.id)
                        const sel = selecionados.has(p.id)
                        return (
                          <label key={p.id}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer transition-colors
                              ${jaEsta ? 'opacity-40 cursor-not-allowed' : sel ? 'bg-blue-50 border border-blue-200' : 'border border-transparent hover:bg-gray-50'}`}>
                            <input type="checkbox" checked={sel} disabled={jaEsta}
                              onChange={() => !jaEsta && togglePaciente(p.id)}
                              className="accent-blue-600" />
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-800 truncate">{p.nome}</div>
                              {(p.endereco || p.bairro) && (
                                <div className="text-xs text-gray-400 truncate">
                                  {[p.endereco, p.bairro].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                            {jaEsta && <span className="text-xs text-gray-400 whitespace-nowrap">já adicionado</span>}
                          </label>
                        )
                      })}
                    </div>
                  )}
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
                {salvandoLeg ? 'Salvando…' : '✓ Adicionar Viagem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
