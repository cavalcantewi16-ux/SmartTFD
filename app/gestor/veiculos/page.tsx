'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Veiculo } from '@/types/database'

type FormData = { placa: string; modelo: string; capacidade: string }
const FORM_VAZIO: FormData = { placa: '', modelo: '', capacidade: '4' }

export default function VeiculosPage() {
  const supabase = createClientComponentClient<Database>()
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [busca, setBusca] = useState('')

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase.from('veiculos').select('*').order('modelo')
    setVeiculos(data ?? [])
    setCarregando(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setErro('')
    setModalAberto(true)
  }

  function abrirEdicao(v: Veiculo) {
    setForm({ placa: v.placa, modelo: v.modelo, capacidade: String(v.capacidade) })
    setEditandoId(v.id)
    setErro('')
    setModalAberto(true)
  }

  async function handleSalvar() {
    if (!form.placa || !form.modelo || !form.capacidade) { setErro('Preencha todos os campos.'); return }
    const cap = parseInt(form.capacidade)
    if (isNaN(cap) || cap < 1 || cap > 20) { setErro('Capacidade deve ser entre 1 e 20.'); return }
    setSalvando(true)
    setErro('')

    const payload = {
      placa: form.placa.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7),
      modelo: form.modelo.trim(),
      capacidade: cap,
    }

    if (editandoId) {
      const { error } = await supabase.from('veiculos').update(payload).eq('id', editandoId)
      if (error) { setErro(error.message); setSalvando(false); return }
    } else {
      const { error } = await supabase.from('veiculos').insert({ ...payload, ativo: true })
      if (error) { setErro(error.message); setSalvando(false); return }
    }

    setSalvando(false)
    setModalAberto(false)
    carregar()
  }

  async function toggleAtivo(v: Veiculo) {
    await supabase.from('veiculos').update({ ativo: !v.ativo }).eq('id', v.id)
    carregar()
  }

  const filtrados = veiculos.filter(v =>
    v.modelo.toLowerCase().includes(busca.toLowerCase()) ||
    v.placa.toLowerCase().includes(busca.toLowerCase())
  )

  function formatarPlaca(placa: string) {
    // Mercosul: ABC1D23 → ABC1D23, old: ABC1234 → ABC-1234
    if (placa.length === 7 && /[A-Z]{3}\d[A-Z]\d{2}/.test(placa)) return placa
    return placa.length === 7 ? `${placa.slice(0, 3)}-${placa.slice(3)}` : placa
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Veículos</h2>
          <p className="text-sm text-gray-500">{veiculos.filter(v => v.ativo).length} ativo{veiculos.filter(v => v.ativo).length !== 1 ? 's' : ''} de {veiculos.length}</p>
        </div>
        <button onClick={abrirNovo} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2">
          <span>+</span> Novo Veículo
        </button>
      </div>

      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input type="text" placeholder="Buscar por modelo ou placa…" value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
      </div>

      {carregando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <span className="text-4xl">🚐</span>
          <p className="text-sm">{busca ? 'Nenhum veículo encontrado.' : 'Nenhum veículo cadastrado.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filtrados.map(v => (
            <div key={v.id} className={`bg-white border rounded-xl p-4 shadow-sm transition-shadow hover:shadow-md ${v.ativo ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800">{v.modelo}</p>
                  <p className="text-xs text-gray-500 mt-0.5 font-mono tracking-wider">{formatarPlaca(v.placa)}</p>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${v.ativo ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {v.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <span>🪑</span>
                <span className="text-xs">{v.capacidade} lugares</span>
                <div className="flex gap-0.5 ml-1">
                  {Array.from({ length: v.capacidade }).map((_, i) => (
                    <div key={i} className="w-2 h-3 rounded-sm bg-blue-200" />
                  ))}
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                <button onClick={() => abrirEdicao(v)}
                  className="flex-1 text-xs text-blue-700 hover:bg-blue-50 py-1.5 rounded-md transition-colors font-medium">
                  ✏️ Editar
                </button>
                <button onClick={() => toggleAtivo(v)}
                  className={`flex-1 text-xs py-1.5 rounded-md transition-colors font-medium ${v.ativo ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}>
                  {v.ativo ? '⏸ Desativar' : '▶ Ativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">{editandoId ? 'Editar Veículo' : 'Novo Veículo'}</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Placa <span className="text-red-500">*</span></label>
                <input type="text" value={form.placa} onChange={e => setForm(f => ({ ...f, placa: e.target.value.toUpperCase() }))}
                  placeholder="ABC1D23 ou ABC1234" maxLength={8}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Modelo <span className="text-red-500">*</span></label>
                <input type="text" value={form.modelo} onChange={e => setForm(f => ({ ...f, modelo: e.target.value }))}
                  placeholder="Ex: Fiat Ducato 2023"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Capacidade (lugares) <span className="text-red-500">*</span></label>
                <input type="number" value={form.capacidade} onChange={e => setForm(f => ({ ...f, capacidade: e.target.value }))}
                  min="1" max="20" inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{erro}</div>}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-60 flex items-center justify-center gap-2">
                {salvando ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> Salvando…</> : editandoId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
