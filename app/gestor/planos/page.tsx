'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface Veiculo   { id: string; placa: string; modelo?: string }
interface Motorista { id: string; nome: string }
interface Plano {
  id: string; data: string; status: string
  veiculo: Veiculo; motorista: Motorista
  legs_count?: number; passengers_count?: number
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho', active: 'Ativo', completed: 'Concluído', cancelled: 'Cancelado'
}
const STATUS_COLOR: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-600',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
}

const hoje = new Date().toISOString().slice(0, 10)

export default function Planos() {
  const supabase = createClientComponentClient()
  const router   = useRouter()

  const [planos,    setPlanos]    = useState<Plano[]>([])
  const [veiculos,  setVeiculos]  = useState<Veiculo[]>([])
  const [motoristas,setMotoristas]= useState<Motorista[]>([])
  const [loading,   setLoading]   = useState(true)
  const [dataBusca, setDataBusca] = useState(hoje)
  const [modal,     setModal]     = useState(false)
  const [salvando,  setSalvando]  = useState(false)
  const [msg,       setMsg]       = useState('')
  const [form, setForm] = useState({ data: hoje, veiculo_id: '', motorista_id: '' })

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('route_plans')
      .select(`
        id, data, status,
        veiculo:veiculos(id, placa, modelo),
        motorista:profiles(id, nome),
        route_legs(id, leg_passengers(id))
      `)
      .eq('data', dataBusca)
      .order('created_at')
    const mapeado = (data || []).map((p: any) => ({
      id: p.id, data: p.data, status: p.status,
      veiculo: p.veiculo, motorista: p.motorista,
      legs_count: p.route_legs?.length || 0,
      passengers_count: (p.route_legs || []).reduce(
        (acc: number, l: any) => acc + (l.leg_passengers?.length || 0), 0
      ),
    }))
    setPlanos(mapeado)
    setLoading(false)
  }, [supabase, dataBusca])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    supabase.from('veiculos').select('id,placa,modelo').order('placa').then(({ data }) => setVeiculos(data || []))
    supabase.from('profiles').select('id,nome').eq('role', 'motorista').order('nome').then(({ data }) => setMotoristas(data || []))
  }, [supabase])

  async function criarPlano() {
    if (!form.veiculo_id || !form.motorista_id) { setMsg('Selecione veículo e motorista'); return }
    setSalvando(true)
    const { data, error } = await supabase
      .from('route_plans')
      .insert({ data: form.data, veiculo_id: form.veiculo_id, motorista_id: form.motorista_id, status: 'draft' })
      .select('id')
      .single()
    if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
    setSalvando(false)
    setModal(false)
    router.push(`/gestor/planos/${data.id}`)
  }

  async function excluir(id: string) {
    if (!confirm('Excluir plano?')) return
    await supabase.from('route_plans').delete().eq('id', id)
    carregar()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">📋 Planos Diários</h1>
        <button onClick={() => { setModal(true); setMsg('') }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          ➕ Novo Plano
        </button>
      </div>

      {/* Filtro de data */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-gray-500">Data:</label>
        <input type="date" value={dataBusca} onChange={e => setDataBusca(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm" />
        <button onClick={() => setDataBusca(hoje)}
          className="text-xs text-blue-600 hover:underline">Hoje</button>
        <span className="text-sm text-gray-400 ml-auto">{planos.length} plano(s)</span>
      </div>

      {/* Cards */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">Carregando…</div>
      ) : planos.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl shadow">
          <div className="text-4xl mb-2">📋</div>
          <p>Nenhum plano para essa data</p>
          <button onClick={() => setModal(true)}
            className="mt-3 text-blue-600 text-sm hover:underline">Criar primeiro plano</button>
        </div>
      ) : (
        <div className="grid gap-4">
          {planos.map(p => (
            <div key={p.id} className="bg-white rounded-xl shadow hover:shadow-md transition-shadow">
              <div className="p-5 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl flex-shrink-0">
                  🚐
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-gray-800">{p.veiculo?.placa}</span>
                    {p.veiculo?.modelo && <span className="text-gray-400 text-sm">{p.veiculo.modelo}</span>}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[p.status]}`}>
                      {STATUS_LABEL[p.status]}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 mt-0.5">👤 {p.motorista?.nome}</div>
                  <div className="flex gap-4 mt-1.5 text-xs text-gray-400">
                    <span>🗺️ {p.legs_count} viagem(ns)</span>
                    <span>🧑‍🤝‍🧑 {p.passengers_count} paciente(s)</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 items-end">
                  <button onClick={() => router.push(`/gestor/planos/${p.id}`)}
                    className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg hover:bg-blue-100 font-medium">
                    ✏️ Editar
                  </button>
                  <button onClick={() => excluir(p.id)}
                    className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 font-medium">
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal novo plano */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h2 className="text-lg font-bold text-gray-800">➕ Novo Plano Diário</h2>
            {msg && <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg">{msg}</div>}
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Data</label>
                <input type="date" value={form.data}
                  onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Veículo</label>
                <select value={form.veiculo_id}
                  onChange={e => setForm(f => ({ ...f, veiculo_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione…</option>
                  {veiculos.map(v => (
                    <option key={v.id} value={v.id}>{v.placa}{v.modelo ? ` — ${v.modelo}` : ''}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Motorista</label>
                <select value={form.motorista_id}
                  onChange={e => setForm(f => ({ ...f, motorista_id: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm">
                  <option value="">Selecione…</option>
                  {motoristas.map(m => (
                    <option key={m.id} value={m.id}>{m.nome}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => { setModal(false); setMsg('') }}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button onClick={criarPlano} disabled={salvando}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {salvando ? 'Criando…' : 'Criar e Editar →'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
