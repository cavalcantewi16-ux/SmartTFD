'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Hospital } from '@/types/database'

type FormData = { nome: string; endereco: string; municipio: string }
const FORM_VAZIO: FormData = { nome: '', endereco: '', municipio: '' }

async function geocodificar(endereco: string, municipio: string): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${endereco}, ${municipio}, Pernambuco, Brasil`)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    )
    const data = await res.json()
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    return null
  } catch { return null }
}

export default function HospitaisPage() {
  const supabase = createClientComponentClient<Database>()
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase.from('hospitais').select('*').order('nome')
    setHospitais(data ?? [])
    setCarregando(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setErro('')
    setModalAberto(true)
  }

  function abrirEdicao(h: Hospital) {
    setForm({ nome: h.nome, endereco: h.endereco, municipio: h.municipio })
    setEditandoId(h.id)
    setErro('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setErro('')
  }

  async function handleSalvar() {
    if (!form.nome || !form.endereco || !form.municipio) {
      setErro('Preencha todos os campos.')
      return
    }
    setSalvando(true)
    setErro('')

    const coords = await geocodificar(form.endereco, form.municipio)
    const lat = coords?.lat ?? -8.6847
    const lng = coords?.lng ?? -35.5928

    const payload = {
      nome: form.nome.trim(),
      endereco: form.endereco.trim(),
      municipio: form.municipio.trim(),
      lat,
      lng,
    }

    if (editandoId) {
      const { error } = await supabase.from('hospitais').update(payload).eq('id', editandoId)
      if (error) { setErro(error.message); setSalvando(false); return }
    } else {
      const { error } = await supabase.from('hospitais').insert(payload)
      if (error) { setErro(error.message); setSalvando(false); return }
    }

    setSalvando(false)
    fecharModal()
    carregar()
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este hospital?')) return
    await supabase.from('hospitais').delete().eq('id', id)
    carregar()
  }

  const filtrados = hospitais.filter(h =>
    h.nome.toLowerCase().includes(busca.toLowerCase()) ||
    h.municipio.toLowerCase().includes(busca.toLowerCase())
  )

  // Agrupar por município
  const porMunicipio = filtrados.reduce<Record<string, Hospital[]>>((acc, h) => {
    const m = h.municipio || 'Outros'
    if (!acc[m]) acc[m] = []
    acc[m].push(h)
    return acc
  }, {})

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Hospitais</h2>
          <p className="text-sm text-gray-500">
            {hospitais.length} cadastrado{hospitais.length !== 1 ? 's' : ''} · {Object.keys(porMunicipio).length} município{Object.keys(porMunicipio).length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={abrirNovo}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <span>+</span> Novo Hospital
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nome ou município…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Lista agrupada por município */}
      {carregando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      ) : filtrados.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2 py-16">
          <span className="text-4xl">🏥</span>
          <p className="text-sm">{busca ? 'Nenhum hospital encontrado.' : 'Nenhum hospital cadastrado.'}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(porMunicipio).sort(([a], [b]) => a.localeCompare(b)).map(([municipio, lista]) => (
            <div key={municipio}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{municipio}</span>
                <span className="text-xs text-gray-400">({lista.length})</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {lista.map(h => (
                  <div
                    key={h.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center text-lg flex-shrink-0">
                        🏥
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{h.nome}</p>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {h.endereco}</p>
                        {h.lat && h.lng && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                            <span>🗺️</span>
                            <span>{h.lat.toFixed(4)}, {h.lng.toFixed(4)}</span>
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => abrirEdicao(h)}
                        className="flex-1 text-xs text-blue-700 hover:bg-blue-50 py-1.5 rounded-md transition-colors font-medium"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => handleExcluir(h.id)}
                        className="flex-1 text-xs text-red-600 hover:bg-red-50 py-1.5 rounded-md transition-colors font-medium"
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">
                {editandoId ? 'Editar Hospital' : 'Novo Hospital'}
              </h3>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nome do hospital <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: Hospital Regional do Agreste"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Município <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.municipio}
                  onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))}
                  placeholder="Ex: Caruaru"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Endereço completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.endereco}
                  onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                  placeholder="Rua, número, bairro"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  🗺️ Coordenadas geradas automaticamente ao salvar.
                </p>
              </div>

              {erro && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
                  {erro}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 pt-0">
              <button
                onClick={fecharModal}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> Geocodificando…</>
                ) : (
                  editandoId ? 'Salvar' : 'Cadastrar hospital'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
