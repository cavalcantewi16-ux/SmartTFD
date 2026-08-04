'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────
interface Hospital { id: string; nome: string; cidade?: string; lat?: number; lng?: number }
interface Veiculo { id: string; placa: string; modelo?: string; capacidade: number }
interface Motorista { id: string; nome: string }

interface VeiculoDisponivel {
  veiculo_id: string
  motorista_id: string
  placa: string
  modelo?: string
  capacidade: number
  motorista_nome: string
}

interface PlanningItem {
  _uid: string // chave local para o React
  patient_name: string
  companions_count: number
  pickup_location: string
  hospital_id: string
  consultation_time: string
}

interface GrupoOtimizado {
  grupo_index: number
  hospital_id: string
  destination_name: string
  patients: (PlanningItem & { hospital_lat?: number; hospital_lng?: number; hospital_cidade?: string; destination_name: string })[]
  earliest_consultation: string
  latest_consultation: string
  total_pessoas: number
  tempo_viagem_min: number
  horario_saida: string
  horario_chegada_estimado: string
  horario_retorno_estimado: string
  veiculo_sugerido: {
    id: string; placa: string; modelo?: string; capacidade: number
    motorista_id: string; motorista_nome: string
  } | null
  aviso: string | null
  // Editável pelo gestor após otimização:
  veiculo_escolhido_id?: string
  motorista_escolhido_id?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function amanha() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function fmtData(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PlanejamentoPage() {
  const supabase = createClientComponentClient()

  // Dados base
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])

  // Estado do planejamento
  const [data, setData] = useState(amanha)
  const [disponiveis, setDisponiveis] = useState<VeiculoDisponivel[]>([])
  const [items, setItems] = useState<PlanningItem[]>([])
  const [grupos, setGrupos] = useState<GrupoOtimizado[] | null>(null)

  // UI
  const [fase, setFase] = useState<'entrada' | 'resultado'>('entrada')
  const [otimizando, setOtimizando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [erroMsg, setErroMsg] = useState('')

  // ── Carregar dados base ───────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('hospitais').select('id,nome,cidade,lat,lng').order('nome')
      .then(({ data: d }) => setHospitais(d || []))
    supabase.from('veiculos').select('id,placa,modelo,capacidade').order('placa')
      .then(({ data: d }) => setVeiculos(d || []))
    supabase.from('profiles').select('id,nome').eq('role', 'motorista').order('nome')
      .then(({ data: d }) => setMotoristas(d || []))
  }, [supabase])

  // ── Inicializar disponíveis com todos os veículos ────────────────────────
  useEffect(() => {
    if (!veiculos.length || !motoristas.length) return
    setDisponiveis(veiculos.map((v, i) => ({
      veiculo_id: v.id,
      motorista_id: motoristas[i % motoristas.length]?.id || '',
      placa: v.placa,
      modelo: v.modelo,
      capacidade: v.capacidade,
      motorista_nome: motoristas[i % motoristas.length]?.nome || '',
    })))
  }, [veiculos, motoristas])

  // ── Itens ──────────────────────────────────────────────────────────────────
  function addItem() {
    setItems(prev => [...prev, {
      _uid: crypto.randomUUID(),
      patient_name: '',
      companions_count: 0,
      pickup_location: '',
      hospital_id: hospitais[0]?.id || '',
      consultation_time: '09:00',
    }])
    setGrupos(null)
    setFase('entrada')
  }

  function setItem(uid: string, field: keyof PlanningItem, val: string | number) {
    setItems(prev => prev.map(i => i._uid === uid ? { ...i, [field]: val } : i))
    setGrupos(null)
    setFase('entrada')
  }

  function removeItem(uid: string) {
    setItems(prev => prev.filter(i => i._uid !== uid))
    setGrupos(null)
  }

  // ── Veículos disponíveis ───────────────────────────────────────────────────
  function setDisp(idx: number, field: keyof VeiculoDisponivel, val: string) {
    setDisponiveis(prev => {
      const next = [...prev]
      const updated = { ...next[idx], [field]: val }
      if (field === 'motorista_id') {
        const m = motoristas.find(m => m.id === val)
        if (m) updated.motorista_nome = m.nome
      }
      if (field === 'veiculo_id') {
        const v = veiculos.find(v => v.id === val)
        if (v) { updated.placa = v.placa; updated.modelo = v.modelo; updated.capacidade = v.capacidade }
      }
      next[idx] = updated
      return next
    })
  }

  function addDisp() {
    const v = veiculos[0]
    const m = motoristas[0]
    if (!v || !m) return
    setDisponiveis(prev => [...prev, {
      veiculo_id: v.id, motorista_id: m.id,
      placa: v.placa, modelo: v.modelo, capacidade: v.capacidade, motorista_nome: m.nome,
    }])
  }

  function removeDisp(idx: number) {
    setDisponiveis(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Otimizar ───────────────────────────────────────────────────────────────
  async function otimizar() {
    setErroMsg('')
    const invalidos = items.filter(i => !i.patient_name.trim() || !i.hospital_id)
    if (invalidos.length > 0) { setErroMsg('Preencha nome e hospital de todos os pacientes.'); return }
    if (items.length === 0) { setErroMsg('Adicione ao menos um paciente.'); return }
    if (disponiveis.length === 0) { setErroMsg('Configure ao menos um veículo disponível.'); return }

    const itemsEnriquecidos = items.map(item => {
      const h = hospitais.find(h => h.id === item.hospital_id)
      return {
        ...item,
        id: item._uid,
        hospital_lat: h?.lat,
        hospital_lng: h?.lng,
        hospital_cidade: h?.cidade,
        destination_name: h ? `${h.nome}${h.cidade ? ` — ${h.cidade}` : ''}` : 'Destino',
      }
    })

    const vehicles = disponiveis.map(d => ({
      id: d.veiculo_id,
      placa: d.placa,
      modelo: d.modelo,
      capacidade: d.capacidade,
      motorista_id: d.motorista_id,
      motorista_nome: d.motorista_nome,
    }))

    setOtimizando(true)
    const res = await fetch('/api/otimizar-rotas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: itemsEnriquecidos, vehicles }),
    })
    const json = await res.json()
    setOtimizando(false)

    if (!res.ok) { setErroMsg(json.error || 'Erro na otimização'); return }

    setGrupos(json.grupos.map((g: GrupoOtimizado) => ({
      ...g,
      veiculo_escolhido_id: g.veiculo_sugerido?.id || '',
      motorista_escolhido_id: g.veiculo_sugerido?.motorista_id || '',
    })))
    setFase('resultado')
  }

  // ── Atualizar escolha de veículo/motorista por grupo ──────────────────────
  function setGrupoVeiculo(idx: number, veiculo_id: string) {
    const v = veiculos.find(v => v.id === veiculo_id)
    setGrupos(prev => prev!.map((g, i) =>
      i !== idx ? g : { ...g, veiculo_escolhido_id: veiculo_id,
        veiculo_sugerido: g.veiculo_sugerido ? { ...g.veiculo_sugerido, id: veiculo_id,
          placa: v?.placa || '', modelo: v?.modelo, capacidade: v?.capacidade || 0 } : null }
    ))
  }

  function setGrupoMotorista(idx: number, motorista_id: string) {
    const m = motoristas.find(m => m.id === motorista_id)
    setGrupos(prev => prev!.map((g, i) =>
      i !== idx ? g : { ...g, motorista_escolhido_id: motorista_id,
        veiculo_sugerido: g.veiculo_sugerido ? { ...g.veiculo_sugerido,
          motorista_id, motorista_nome: m?.nome || '' } : null }
    ))
  }

  // ── Salvar como planos no DB ───────────────────────────────────────────────
  async function salvarPlanos() {
    if (!grupos) return
    setSalvando(true)
    setErroMsg('')
    let criados = 0

    for (const grupo of grupos) {
      const vId = grupo.veiculo_escolhido_id || grupo.veiculo_sugerido?.id
      const mId = grupo.motorista_escolhido_id || grupo.veiculo_sugerido?.motorista_id
      if (!vId || !mId) continue

      // Criar route_plan
      const { data: plan, error: planErr } = await supabase
        .from('route_plans')
        .insert({ data, veiculo_id: vId, motorista_id: mId, status: 'draft' })
        .select('id').single()
      if (planErr || !plan) continue

      // Criar route_leg
      const { data: leg, error: legErr } = await supabase
        .from('route_legs')
        .insert({
          route_plan_id: plan.id,
          hospital_id: grupo.hospital_id,
          horario_saida: grupo.horario_saida,
          ordem: 1,
          status: 'aguardando',
          est_departure_at: `${data}T${grupo.horario_saida}:00`,
          est_hospital_at: `${data}T${grupo.horario_chegada_estimado}:00`,
          est_return_at: `${data}T${grupo.horario_retorno_estimado}:00`,
          est_outbound_min: grupo.tempo_viagem_min,
          est_return_min: grupo.tempo_viagem_min,
        })
        .select('id').single()
      if (legErr || !leg) continue

      // Criar leg_passengers (busca paciente pelo nome)
      for (let i = 0; i < grupo.patients.length; i++) {
        const p = grupo.patients[i]
        const { data: pacs } = await supabase
          .from('pacientes').select('id').ilike('nome', `%${p.patient_name.trim()}%`).limit(1)
        const pacId = pacs?.[0]?.id
        if (pacId) {
          await supabase.from('leg_passengers').insert({
            leg_id: leg.id, paciente_id: pacId,
            ordem: i + 1, status: 'aguardando',
          })
        }
      }
      criados++
    }

    setSalvando(false)
    setMsg(`✅ ${criados} plano(s) criados! Acesse Planos para ativar.`)
    setTimeout(() => setMsg(''), 5000)
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📅 Planejamento Diário</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Crie todas as rotas de amanhã antecipadamente
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={data} onChange={e => { setData(e.target.value); setGrupos(null); setFase('entrada') }}
            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          {fase === 'resultado' && (
            <button onClick={() => setFase('entrada')}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
              ← Editar entradas
            </button>
          )}
        </div>
      </div>

      {/* Data selecionada */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2 text-sm text-blue-800 font-medium">
        📌 Planejando para: {fmtData(data)}
      </div>

      {/* Mensagens */}
      {msg && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800 font-medium">
          {msg} <Link href="/gestor/planos" className="underline ml-1">Ver planos →</Link>
        </div>
      )}
      {erroMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          ⚠️ {erroMsg}
        </div>
      )}

      {/* FASE: ENTRADA */}
      {fase === 'entrada' && (
        <>
          {/* Veículos disponíveis no dia */}
          <div className="bg-white rounded-xl shadow p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">🚐 Veículos disponíveis para o dia</h2>
              <button onClick={addDisp} className="text-sm text-blue-600 hover:text-blue-800 font-medium">
                + Adicionar veículo
              </button>
            </div>
            {disponiveis.length === 0 && <p className="text-sm text-gray-400">Nenhum veículo selecionado.</p>}
            <div className="space-y-2">
              {disponiveis.map((d, idx) => (
                <div key={idx} className="flex items-center gap-2 flex-wrap">
                  <select value={d.veiculo_id} onChange={e => setDisp(idx, 'veiculo_id', e.target.value)}
                    className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-0">
                    {veiculos.map(v => (
                      <option key={v.id} value={v.id}>{v.placa} — {v.modelo || 'Ve­culo'} ({v.capacidade} lugares)</option>
                    ))}
                  </select>
                  <select value={d.motorista_id} onChange={e => setDisp(idx, 'motorista_id', e.target.value)}
                    className="border rounded-lg px-2 py-1.5 text-sm flex-1 min-w-0">
                    {motoristas.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                  <button onClick={() => removeDisp(idx)}
                    className="text-red-400 hover:text-red-600 px-2 py-1.5 text-sm flex-shrink-0">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela de pacientes */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-700">👥 Pacientes e destinos</h2>
              <button onClick={addItem}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
                + Adicionar paciente
              </button>
            </div>

            {items.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <div className="text-3xl mb-2">🋋</div>
                <p className="text-sm">Adicione os pacientes que serão transportados amanhã.</p>
                <button onClick={addItem} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium">
                  + Adicionar primeiro paciente
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="text-left px-3 py-2.5 text-xs text-gray-500 font-medium min-w-[160px]">Paciente</th>
                      <th className="text-left px-3 py-2.5 text-xs text-gray-500 font-medium w-24">Acompan.</th>
                      <th className="text-left px-3 py-2.5 text-xs text-gray-500 font-medium min-w-[200px]">Local de busca</th>
                      <th className="text-left px-3 py-2.5 text-xs text-gray-500 font-medium min-w-[180px]">Destino (hospital)</th>
                      <th className="text-left px-3 py-2.5 text-xs text-gray-500 font-medium w-28">Consulta</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item._uid} className="border-b hover:bg-gray-50 transition-colors">
                        <td className="px-3 py-2">
                          <input value={item.patient_name} onChange={e => setItem(item._uid, 'patient_name', e.target.value)}
                            placeholder="Nome do paciente" className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <input type="number" min="0" max="6" value={item.companions_count} onChange={e => setItem(item._uid, 'companions_count', parseInt(e.target.value) || 0)}
                            className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-sm text-center" />
                        </td>
                        <td className="px-3 py-2">
                          <input value={item.pickup_location} onChange={e => setItem(item._uid, 'pickup_location', e.target.value)}
                            placeholder="Rua, número — Boqueirão" className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-sm" />
                        </td>
                        <td className="px-3 py-2">
                          <select value={item.hospital_id} onChange={e => setItem(item._uid, 'hospital_id', e.target.value)}
                            className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-sm">
                            <option value="">— Selecione —</option>
                            {hospitais.map(h => (
                              <option key={h.id} value={h.id}>{h.nome}{h.cidade ? ` (${h.cidade})` : ''}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input type="time" value={item.consultation_time} onChange={e => setItem(item._uid, 'consultation_time', e.target.value)}
                            className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-300 rounded px-1 py-0.5 text-sm" />
                        </td>
                        <td className="px-2 py-2">
                          <button onClick={() => removeItem(item._uid)} className="text-gray-300 hover:text-red-500 transition-colors">
✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {items.length > 0 && (
              <div className="p-4 border-t bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {items.length} paciente(s) · {items.reduce((s, i) => s + 1 + i.companions_count, 0)} pessoas total
                </span>
                <button onClick={otimizar} disabled={otimizando}
                  className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
                  {otimizando ? (<><span className="animate-spin">⏳</span> Otimizando…</>) : (<>🧠 Otimizar rotas →</>)}
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {fase === 'resultado' && grupos && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-sm text-gray-600">
              <span className="font-semibold">{grupos.length} rota(s) otimizada(s)</span>
              {items.length} paciente(s) · {items.reduce((s, i) => s + 1 + i.companions_count, 0)} pessoas
            </div>
            <button onClick={salvarPlanos} disabled={salvando}
              className="bg-green-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
              {salvando ? '⏳ Criando planos …' : '💾 Salvar como Planos'}
            </button>
          </div>

          <div className="grid gap-4">
            {grupos.map((grupo, idx) => {
              const corBorder = grupo.aviso?.includes('⚠️') ? 'border-orange-300' : 'border-green-300'
              const corHeader = grupo.aviso?.includes('⚠️') ? 'bg-orange-50 border-b border-orange-200' : 'bg-green-50 border-b border-green-200'
              return (
                <div key={idx} className={`bg-white rounded-xl shadow border ${corBorder} overflow-hidden`}>
                  <div className={`${corHeader} px-5 py-4 flex items-center justify-between flex-wrap gap-3`}>
                    <div>
                      <div className="font-bold text-gray-800 text-base">Rota {idx + 1} — {grupo.destination_name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {grupo.patients.length} paciente(s) · {grupo.total_pessoas} pessoa(s)
                        {grupo.earliest_consultation !== grupo.latest_consultation
                          ? ` · Consultas ${grupo.earliest_consultation}–${grupo.latest_consultation}`
                          : ` · Consulta ${grupo.earliest_consultation}`}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="font-bold text-gray-800">🚀 Saída: {grupo.horario_saida}</div>
                      <div className="text-xs text-gray-500">Chegada ~{grupo.horario_chegada_estimado} · Retorno ~{grupo.horario_retorno_estimado}</div>
                      <div className="text-xs text-gray-400">~{grupo.tempo_viagem_min} min de viagem</div>
                    </div>
                  </div>
                  <div className="p-5 grid md:grid-cols-2 gap-5">
                    <div>
                      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Passageiros na ordem de busca</div>
                      <div className="space-y-2">
                        {grupo.patients.map((p, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <span className="w%wh-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">{i + 1}</span>
                            <div>
                              <div className="font-medium text-gray-800">{p.patient_name}</div>
                              {p.companions_count > 0 && <div className="text-xs text-gray-400">+{p.companions_count} acompanhante(s)</div>}
                              {p.pickup_location && <div className="text-xs text-gray-400">📍 {p.pickup_location}</div>}
                              {p.consultation_time !== grupo.earliest_consultation && <div className="text-xs text-amber-600">⏰ Consulta {p.consultation_time} (agrupada)</div>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Veículo</div>
                        <select value={grupo.veiculo_escolhido_id || ''} onChange={e => setGrupoVeiculo(idx, e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                          <option value="">— Selecione —</option>
                          {veiculos.map(v => (
                            <option key={v.id} value={v.id}>{v.placa} — {v.modelo || 'Ve­culo'} ({v.capacidade} lugares)</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Motorista</div>
                        <select value={grupo.motorista_escolhido_id || ''} onChange={e => setGrupoMotorista(idx, e.target.value)}
                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                          <option value="">— Selecione —</option>
                          {motoristas.map(m => (
                            <option key={m.id} value={m.id}>{m.nome}</option>
                          ))}
                        </select>
                      </div>
                      {grupo.aviso && (
                        <div className={`text-xs rounded-lg px-3 py-2 ${grupo.aviso.includes('⚠️') ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-blue-50 text-blue-700 border border-blue-200'}`}>
                          {grupo.aviso}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex justify-end pt-2">
            <button onClick={salvarPlanos} disabled={salvando}
              className="bg-green-600 text-white px-8 py-3 rounded-xl text-base font-bold hover:bg-green-700 disabled:opacity-50">
              {salvando ? '⏳ Criando planos …' : '💾 Salvar todos os planos'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
