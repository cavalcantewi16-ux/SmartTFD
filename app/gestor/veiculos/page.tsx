'use client'
import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

interface Veiculo {
  id: string; placa: string; modelo: string; capacidade: number; ativo: boolean
}

export default function Veiculos() {
  const supabase = createClientComponentClient()
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ placa: '', modelo: '', capacidade: '4', ativo: true })
  const [editId, setEditId] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [busca, setBusca] = useState('')

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('veiculos').select('*').order('placa')
    setVeiculos(data || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  async function salvar() {
    if (!form.placa.trim() || !form.modelo.trim()) return
    setSalvando(true)
    const payload = { placa: form.placa.trim().toUpperCase(), modelo: form.modelo.trim(), capacidade: Number(form.capacidade), ativo: form.ativo }
    if (editId) {
      await supabase.from('veiculos').update(payload).eq('id', editId)
    } else {
      await supabase.from('veiculos').insert(payload)
    }
    setForm({ placa: '', modelo: '', capacidade: '4', ativo: true })
    setEditId(null)
    setSalvando(false)
    carregar()
  }

  async function toggleAtivo(v: Veiculo) {
    await supabase.from('veiculos').update({ ativo: !v.ativo }).eq('id', v.id)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir veículo?')) return
    await supabase.from('veiculos').delete().eq('id', id)
    carregar()
  }

  function editar(v: Veiculo) {
    setForm({ placa: v.placa, modelo: v.modelo, capacidade: String(v.capacidade), ativo: v.ativo })
    setEditId(v.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtrados = veiculos.filter(v =>
    v.placa.toLowerCase().includes(busca.toLowerCase()) ||
    v.modelo.toLowerCase().includes(busca.toLowerCase())
  )

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🚐 Veículos</h1>
        <span className="text-sm text-gray-500">{veiculos.length} cadastrados</span>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">{editId ? '✏️ Editar Veículo' : '➕ Novo Veículo'}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Placa *</label>
            <input value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value }))}
              placeholder="ABC-1234" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Modelo *</label>
            <input value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
              placeholder="Ex: Sprinter 415" className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Capacidade</label>
            <input type="number" min="1" max="20" value={form.capacidade}
              onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.ativo} onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))} />
            Veículo ativo
          </label>
          <div className="flex gap-2 ml-auto">
            {editId && (
              <button onClick={() => { setEditId(null); setForm({ placa: '', modelo: '', capacidade: '4', ativo: true }) }}
                className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
                Cancelar
              </button>
            )}
            <button onClick={salvar} disabled={salvando}
              className="bg-blue-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {salvando ? 'Salvando…' : editId ? '💾 Atualizar' : '➕ Adicionar'}
            </button>
          </div>
        </div>
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por placa ou modelo…"
            className="w-full border rounded-lg px-3 py-2 text-sm" />
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando…</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum veículo encontrado</div>
        ) : (
          <div className="divide-y">
            {filtrados.map(v => {
              const pct = 0
              return (
                <div key={v.id} className="p-4 flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full flex-shrink-0 ${v.ativo ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-gray-800">{v.modelo}</span>
                      {!v.ativo && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inativo</span>}
                    </div>
                    <div className="text-sm text-gray-500">{v.placa} · {v.modelo} · {v.capacidade} passageiros</div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <Link href={`/gestor/veiculos/${v.id}`}
                      className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg hover:bg-blue-100 font-medium">
                      👁️ Detalhes
                    </Link>
                    <button onClick={() => toggleAtivo(v)}
                      className={`px-3 py-1.5 text-xs rounded-lg font-medium ${v.ativo ? 'bg-orange-50 text-orange-700 hover:bg-orange-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
                      {v.ativo ? '⏸ Inativar' : '▶ Ativar'}
                    </button>
                    <button onClick={() => editar(v)}
                      className="px-3 py-1.5 bg-gray-50 text-gray-700 text-xs rounded-lg hover:bg-gray-100 font-medium">
                      ✏️ Editar
                    </button>
                    <button onClick={() => excluir(v.id)}
                      className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 font-medium">
                      🗑️
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
