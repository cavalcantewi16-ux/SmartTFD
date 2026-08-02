'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Profile  { id: string; nome: string }
interface Veiculo  { id: string; placa: string; modelo: string; capacidade: number }
interface Paciente { id: string; nome: string }
interface Hospital { id: string; nome: string }
interface Parada   { paciente_id: string; hospital_id: string }
interface Viagem {
  id: string; data: string; status: string; observacoes?: string
  motorista_id: string; veiculo_id: string
  motorista?: Profile; veiculo?: Veiculo
  paradas?: Array<{ id: string; ordem: number; status: string; paciente?: Paciente; hospital?: Hospital }>
}

const STATUS_COR: Record<string, string> = {
  agendada:    'bg-yellow-100 text-yellow-800',
  em_andamento:'bg-blue-100 text-blue-800',
  concluida:   'bg-green-100 text-green-800',
  cancelada:   'bg-red-100 text-red-700',
}

export default function Agendamento() {
  const supabase = createClientComponentClient()
  const [viagens, setViagens]     = useState<Viagem[]>([])
  const [motoristas, setMotoristas] = useState<Profile[]>([])
  const [veiculos, setVeiculos]   = useState<Veiculo[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [loading, setLoading]     = useState(true)
  const [salvando, setSalvando]   = useState(false)
  const [msg, setMsg]             = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [confirmModal, setConfirmModal] = useState(false)
  const [notificado, setNotificado] = useState(false)

  const hoje = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    data: hoje,
    motorista_id: '',
    veiculo_id: '',
    observacoes: '',
    paradas: [{ paciente_id: '', hospital_id: '' }] as Parada[],
  })

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data: vgs } = await supabase
      .from('viagens')
      .select('*, motorista:profiles!viagens_motorista_id_fkey(id,nome), veiculo:veiculos(id,placa,modelo,capacidade)')
      .order('data', { ascending: false })
      .order('created_at', { ascending: false })
    const ids = (vgs || []).map((v: any) => v.id)
    let paradasMap: Record<string, any[]> = {}
    if (ids.length) {
      const { data: ps } = await supabase
        .from('viagem_paradas')
        .select('*, paciente:pacientes(id,nome), hospital:hospitais(id,nome)')
        .in('viagem_id', ids)
        .order('ordem')
      ;(ps || []).forEach((p: any) => {
        if (!paradasMap[p.viagem_id]) paradasMap[p.viagem_id] = []
        paradasMap[p.viagem_id].push(p)
      })
    }
    setViagens((vgs || []).map((v: any) => ({ ...v, paradas: paradasMap[v.id] || [] })))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    carregar()
    supabase.from('profiles').select('id,nome').eq('role','motorista').order('nome').then(({ data }) => setMotoristas(data || []))
    supabase.from('veiculos').select('id,placa,modelo,capacidade').eq('ativo', true).order('placa').then(({ data }) => setVeiculos(data || []))
    supabase.from('pacientes').select('id,nome').order('nome').then(({ data }) => setPacientes(data || []))
    supabase.from('hospitais').select('id,nome').order('nome').then(({ data }) => setHospitais(data || []))
  }, [carregar, supabase])

  function addParada() {
    setForm(f => ({ ...f, paradas: [...f.paradas, { paciente_id: '', hospital_id: '' }] }))
  }

  function removeParada(i: number) {
    setForm(f => ({ ...f, paradas: f.paradas.filter((_, idx) => idx !== i) }))
  }

  function updateParada(i: number, field: keyof Parada, val: string) {
    setForm(f => {
      const ps = [...f.paradas]
      ps[i] = { ...ps[i], [field]: val }
      return { ...f, paradas: ps }
    })
  }

  function validarForm() {
    if (!form.motorista_id || !form.veiculo_id || !form.data) return false
    if (form.paradas.some(p => !p.paciente_id || !p.hospital_id)) return false
    const veiculo = veiculos.find(v => v.id === form.veiculo_id)
    if (veiculo && form.paradas.length > veiculo.capacidade) return false
    return true
  }

  async function salvar() {
    if (!validarForm() || salvando) return
    setSalvando(true)
    try {
      const { data: viagem, error: e1 } = await supabase
        .from('viagens')
        .insert({ data: form.data, motorista_id: form.motorista_id, veiculo_id: form.veiculo_id, observacoes: form.observacoes, status: 'agendada' })
        .select('id').single()
      if (e1) throw e1
      const paradaInserts = form.paradas.map((p, i) => ({
        viagem_id: viagem!.id, paciente_id: p.paciente_id, hospital_id: p.hospital_id, ordem: i + 1, status: 'pendente'
      }))
      const { error: e2 } = await supabase.from('viagem_paradas').insert(paradaInserts)
      if (e2) throw e2
      setForm({ data: hoje, motorista_id: '', veiculo_id: '', observacoes: '', paradas: [{ paciente_id: '', hospital_id: '' }] })
      setConfirmModal(false)
      setNotificado(true)
      setTimeout(() => setNotificado(false), 5000)
      await carregar()
    } catch (err: any) {
      setMsg(`Erro: ${err.message}`)
      setTimeout(() => setMsg(''), 4000)
    } finally {
      setSalvando(false)
    }
  }

  async function cancelarViagem(id: string) {
    if (!confirm('Cancelar esta viagem?')) return
    await supabase.from('viagens').update({ status: 'cancelada' }).eq('id', id)
    carregar()
  }

  const veiculo = veiculos.find(v => v.id === form.veiculo_id)
  const motorista = motoristas.find(m => m.id === form.motorista_id)
  const pacientesNaViagem = form.paradas.map(p => pacientes.find(pac => pac.id === p.paciente_id)?.nome).filter(Boolean)
  const hospitaisNaViagem = form.paradas.map(p => hospitais.find(h => h.id === p.hospital_id)?.nome).filter(Boolean)

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">📅 Agendamento</h1>

      {/* Notificação de sucesso */}
      {notificado && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-semibold text-green-800">Rota criada com sucesso!</div>
            <div className="text-sm text-green-700 mt-0.5">
              Motorista notificado — a viagem já aparece no app do motorista em tempo real.
            </div>
          </div>
        </div>
      )}

      {msg && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">➕ Novo Agendamento</h2>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Data *</label>
            <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Motorista *</label>
            <select value={form.motorista_id} onChange={e => setForm(f => ({ ...f, motorista_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Selecione…</option>
              {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Veículo *</label>
            <select value={form.veiculo_id} onChange={e => setForm(f => ({ ...f, veiculo_id: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Selecione…</option>
              {veiculos.map(v => <option key={v.id} value={v.id}>{v.placa} — {v.modelo} ({v.capacidade} lugares)</option>)}
            </select>
          </div>
        </div>

        {/* Capacidade warning */}
        {veiculo && form.paradas.length > veiculo.capacidade && (
          <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">
            ⚠️ Capacidade do veículo ({veiculo.capacidade}) excedida ({form.paradas.length} paradas)
          </div>
        )}

        {/* Paradas */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs text-gray-500 font-medium uppercase tracking-wide">Paradas</label>
            {veiculo && (
              <span className="text-xs text-gray-400">{form.paradas.length}/{veiculo.capacidade} vagas</span>
            )}
          </div>
          {form.paradas.map((p, i) => (
            <div key={i} className="flex gap-2 items-center bg-gray-50 rounded-lg p-3">
              <span className="text-xs font-bold text-gray-400 w-6 text-center">{i + 1}</span>
              <select value={p.paciente_id} onChange={e => updateParada(i, 'paciente_id', e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Paciente…</option>
                {pacientes.map(pac => <option key={pac.id} value={pac.id}>{pac.nome}</option>)}
              </select>
              <span className="text-gray-300">→</span>
              <select value={p.hospital_id} onChange={e => updateParada(i, 'hospital_id', e.target.value)}
                className="flex-1 border rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Hospital…</option>
                {hospitais.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
              </select>
              {form.paradas.length > 1 && (
                <button onClick={() => removeParada(i)} className="text-red-400 hover:text-red-600 text-lg">×</button>
              )}
            </div>
          ))}
          <button onClick={addParada} disabled={veiculo ? form.paradas.length >= veiculo.capacidade : false}
            className="text-sm text-blue-600 hover:text-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
            + Adicionar parada
          </button>
        </div>

        <div>
          <label className="text-xs text-gray-500 mb-1 block">Observações</label>
          <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
            rows={2} placeholder="Observações para o motorista…"
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
        </div>

        <div className="flex justify-end">
          <button
            onClick={() => { if (validarForm()) setConfirmModal(true) }}
            disabled={!validarForm()}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
            Agendar Viagem →
          </button>
        </div>
      </div>

      {/* Lista de viagens */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">📋 Viagens Agendadas</h2>
        {loading ? (
          <div className="text-center py-8 text-gray-400">Carregando…</div>
        ) : viagens.length === 0 ? (
          <div className="text-center py-8 text-gray-400">Nenhuma viagem agendada</div>
        ) : (
          viagens.map(v => (
            <div key={v.id} className="bg-white rounded-xl shadow overflow-hidden">
              <button className="w-full text-left p-4 flex items-center gap-4 hover:bg-gray-50"
                onClick={() => setExpandido(expandido === v.id ? null : v.id)}>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-gray-800">
                      {new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[v.status] || 'bg-gray-100 text-gray-600'}`}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">
                    🧑‍✈️ {v.motorista?.nome || '—'} · 🚐 {v.veiculo?.placa || '—'} · {v.paradas?.length || 0} paradas
                  </div>
                </div>
                <span className="text-gray-400">{expandido === v.id ? '▲' : '▼'}</span>
              </button>
              {expandido === v.id && (
                <div className="border-t px-4 pb-4 pt-3 space-y-3">
                  {(v.paradas || []).map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 text-sm">
                      <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                      <span className="font-medium text-gray-700">{p.paciente?.nome || '—'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="text-gray-600">{p.hospital?.nome || '—'}</span>
                      <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-medium
                        ${p.status === 'concluido' ? 'bg-green-100 text-green-700' :
                          p.status === 'embarcado' ? 'bg-blue-100 text-blue-700' :
                          p.status === 'ausente' ? 'bg-gray-100 text-gray-500' :
                          p.status === 'cancelou' ? 'bg-red-100 text-red-600' :
                          'bg-yellow-100 text-yellow-700'}`}>
                        {p.status}
                      </span>
                    </div>
                  ))}
                  {v.observacoes && (
                    <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">📝 {v.observacoes}</div>
                  )}
                  {v.status === 'agendada' && (
                    <button onClick={() => cancelarViagem(v.id)}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline mt-1">
                      ✕ Cancelar viagem
                    </button>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Modal de confirmação */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">Confirmar Agendamento</h2>

            <div className="space-y-3 text-sm">
              <div className="bg-blue-50 rounded-lg p-3 grid grid-cols-2 gap-2">
                <div>
                  <div className="text-xs text-gray-500">Data</div>
                  <div className="font-medium">{new Date(form.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Motorista</div>
                  <div className="font-medium">{motorista?.nome || '—'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Veículo</div>
                  <div className="font-medium">{veiculo?.placa} — {veiculo?.modelo}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Paradas</div>
                  <div className="font-medium">{form.paradas.length} pacientes</div>
                </div>
              </div>

              <div className="space-y-1.5">
                {form.paradas.map((p, i) => {
                  const pac = pacientes.find(x => x.id === p.paciente_id)
                  const hosp = hospitais.find(x => x.id === p.hospital_id)
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-gray-400">{i + 1}.</span>
                      <span className="font-medium text-gray-700">{pac?.nome}</span>
                      <span className="text-gray-300 mx-1">→</span>
                      <span className="text-gray-600">{hosp?.nome}</span>
                    </div>
                  )
                })}
              </div>

              <div className="bg-green-50 rounded-lg px-3 py-2 text-green-700 text-xs flex items-center gap-2">
                📱 O motorista será notificado automaticamente pelo app assim que a rota for criada.
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setConfirmModal(false)} disabled={salvando}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl hover:bg-gray-50 text-sm">
                Voltar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 text-sm font-semibold">
                {salvando ? '⏳ Criando rota…' : '✅ Confirmar e Criar Rota'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
