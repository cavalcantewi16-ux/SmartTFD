'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

interface Hospital {
  id: string; nome: string; cidade?: string; endereco?: string
  bairro?: string; telefone?: string; lat?: number; lng?: number
}

const FORM_VAZIO = { nome: '', cidade: '', endereco: '', bairro: '', telefone: '' }

async function geocodificar(nome: string, endereco: string, bairro: string, cidade: string) {
  const texto = [endereco || nome, bairro, cidade, 'Brasil'].filter(Boolean).join(', ')

  const orsKey = process.env.NEXT_PUBLIC_ORS_API_KEY
  if (orsKey) {
    try {
      const r = await fetch(
        `https://api.openrouteservice.org/geocode/search?api_key=${orsKey}` +
        `&text=${encodeURIComponent(texto)}&size=1&boundary.country=BRA`
      )
      const d = await r.json()
      if (d.features?.length > 0) {
        const [lng, lat] = d.features[0].geometry.coordinates
        return { lat, lng }
      }
    } catch { /* fallback */ }
  }

  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(texto)}&limit=1&countrycodes=br`,
      { headers: { 'User-Agent': 'SmartTFD/1.0' } }
    )
    const d = await r.json()
    if (d.length > 0) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) }
  } catch { /* sem geocoding */ }

  return null
}

export default function Hospitais() {
  const supabase = createClientComponentClient()
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [loading, setLoading]     = useState(true)
  const [form, setForm]           = useState(FORM_VAZIO)
  const [editId, setEditId]       = useState<string | null>(null)
  const [salvando, setSalvando]   = useState(false)
  const [geocodando, setGeocodando] = useState(false)
  const [msg, setMsg]             = useState('')
  const [busca, setBusca]         = useState('')
  const [abertos, setAbertos]     = useState<Set<string>>(new Set())

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('hospitais').select('*').order('nome')
    setHospitais(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  function set(field: string, val: string) { setForm(f => ({ ...f, [field]: val })) }

  function limparForm() { setForm(FORM_VAZIO); setEditId(null) }

  function editarHospital(h: Hospital) {
    setForm({
      nome:     h.nome     || '',
      cidade:   h.cidade   || '',
      endereco: h.endereco || '',
      bairro:   h.bairro   || '',
      telefone: h.telefone || '',
    })
    setEditId(h.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar() {
    if (!form.nome.trim()) { setMsg('Nome obrigatório'); return }
    setSalvando(true)

    let lat: number | undefined
    let lng: number | undefined
    if (form.endereco || form.cidade) {
      setGeocodando(true)
      const coords = await geocodificar(form.nome, form.endereco, form.bairro, form.cidade)
      setGeocodando(false)
      if (coords) { lat = coords.lat; lng = coords.lng }
    }

    const payload: any = {
      nome:     form.nome.trim(),
      cidade:   form.cidade.trim()   || null,
      endereco: form.endereco.trim() || null,
      bairro:   form.bairro.trim()   || null,
      telefone: form.telefone.trim() || null,
    }
    if (lat !== undefined) { payload.lat = lat; payload.lng = lng }

    if (editId) {
      const { error } = await supabase.from('hospitais').update(payload).eq('id', editId)
      if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
      setMsg(lat ? '✅ Atualizado com localização!' : '✅ Atualizado')
    } else {
      const { error } = await supabase.from('hospitais').insert(payload)
      if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
      setMsg(lat ? '✅ Hospital cadastrado com localização!' : '✅ Cadastrado')
    }

    limparForm()
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir hospital?')) return
    await supabase.from('hospitais').delete().eq('id', id)
    carregar()
  }

  function toggleAberto(id: string) {
    setAbertos(prev => {
      const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n
    })
  }

  // Agrupar por cidade
  const filtrados = hospitais.filter(h =>
    h.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (h.cidade || '').toLowerCase().includes(busca.toLowerCase())
  )
  const porCidade = filtrados.reduce<Record<string, Hospital[]>>((acc, h) => {
    const cidade = h.cidade || 'Sem cidade'
    if (!acc[cidade]) acc[cidade] = []
    acc[cidade].push(h)
    return acc
  }, {})

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">🏥 Hospitais</h1>
        <span className="text-sm text-gray-500">{hospitais.length} cadastrados</span>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-700 text-lg">
          {editId ? '✏️ Editar Hospital' : '➕ Novo Hospital'}
        </h2>

        {msg && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium
            ${msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700'}`}>
            {msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">Nome do hospital / clínica *</label>
            <input value={form.nome} onChange={e => set('nome', e.target.value)}
              placeholder="Ex: Hospital Regional de Palmares"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
            <input value={form.telefone} onChange={e => set('telefone', e.target.value)}
              placeholder="(81) 3661-0000"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
            <input value={form.cidade} onChange={e => set('cidade', e.target.value)}
              placeholder="Palmares, PE"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 mb-1 block">
              Endereço completo <span className="text-blue-400">(usado para localização no mapa)</span>
            </label>
            <input value={form.endereco} onChange={e => set('endereco', e.target.value)}
              placeholder="Rua, número"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Bairro</label>
            <input value={form.bairro} onChange={e => set('bairro', e.target.value)}
              placeholder="Centro"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        </div>

        <div className="flex gap-3 justify-end pt-1">
          {editId && (
            <button onClick={limparForm}
              className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50">
              Cancelar
            </button>
          )}
          <button onClick={salvar} disabled={salvando || geocodando}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {geocodando ? '📍 Geocodificando…' : salvando ? '⏳ Salvando…' : editId ? '💾 Atualizar' : '➕ Cadastrar'}
          </button>
        </div>
      </div>

      {/* Lista agrupada por cidade */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome ou cidade…"
            className="flex-1 border rounded-lg px-3 py-2 text-sm" />
          <span className="text-sm text-gray-400 whitespace-nowrap">{filtrados.length} result.</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando…</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum hospital encontrado</div>
        ) : (
          Object.entries(porCidade).sort(([a], [b]) => a.localeCompare(b)).map(([cidade, lista]) => (
            <div key={cidade}>
              <div className="px-4 py-2 bg-gray-50 border-y text-xs font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                📍 {cidade}
                <span className="font-normal normal-case text-gray-400">({lista.length})</span>
              </div>
              {lista.map(h => (
                <div key={h.id} className="hover:bg-gray-50 transition-colors">
                  <div className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleAberto(h.id)}>
                    <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-lg flex-shrink-0">
                      🏥
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-800 truncate">{h.nome}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {[h.endereco, h.bairro].filter(Boolean).join(', ') || 'Sem endereço'}
                        {h.telefone ? ` · ${h.telefone}` : ''}
                      </div>
                    </div>
                    {h.lat && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">📍 GPS</span>
                    )}
                    <span className="text-gray-300 text-xs">{abertos.has(h.id) ? '▲' : '▼'}</span>
                  </div>

                  {abertos.has(h.id) && (
                    <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                      <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                        {h.telefone && (
                          <div>
                            <div className="text-xs text-gray-400">Telefone</div>
                            <div className="font-medium">{h.telefone}</div>
                          </div>
                        )}
                        {(h.endereco || h.bairro) && (
                          <div className="col-span-2">
                            <div className="text-xs text-gray-400">Endereço</div>
                            <div className="font-medium">
                              {[h.endereco, h.bairro, h.cidade].filter(Boolean).join(', ')}
                            </div>
                          </div>
                        )}
                        {h.lat && (
                          <div className="col-span-2">
                            <div className="text-xs text-gray-400">Coordenadas</div>
                            <div className="text-xs font-mono text-gray-600">{h.lat.toFixed(5)}, {h.lng?.toFixed(5)}</div>
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {h.lat && (
                          <a href={`https://www.google.com/maps?q=${h.lat},${h.lng}`} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg hover:bg-green-100 font-medium">
                            🗺️ Google Maps
                          </a>
                        )}
                        <button onClick={() => editarHospital(h)}
                          className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 font-medium">
                          ✏️ Editar
                        </button>
                        <button onClick={() => excluir(h.id)}
                          className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 font-medium">
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
