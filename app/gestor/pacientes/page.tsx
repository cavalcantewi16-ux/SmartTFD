'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'

interface Paciente {
  id: string; nome: string; cpf?: string; telefone?: string
  endereco?: string; bairro?: string; cidade?: string
  observacoes?: string; lat?: number; lng?: number
  created_at: string
}

const FORM_VAZIO = {
  nome: '', cpf: '', telefone: '',
  endereco: '', bairro: '', cidade: '',
  observacoes: '',
}

async function geocodificar(endereco: string, bairro: string, cidade: string) {
  const texto = [endereco, bairro, cidade, 'Brasil'].filter(Boolean).join(', ')

  // 1. OpenRouteService (se a chave estiver configurada)
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

  // 2. Nominatim (fallback gratuito)
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

export default function Pacientes() {
  const supabase = createClientComponentClient()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
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
    const { data } = await supabase.from('pacientes').select('*').order('nome')
    setPacientes(data || [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  function set(field: string, val: string) {
    setForm(f => ({ ...f, [field]: val }))
  }

  function limparForm() {
    setForm(FORM_VAZIO)
    setEditId(null)
  }

  function editarPaciente(p: Paciente) {
    setForm({
      nome:        p.nome        || '',
      cpf:         p.cpf         || '',
      telefone:    p.telefone    || '',
      endereco:    p.endereco    || '',
      bairro:      p.bairro      || '',
      cidade:      p.cidade      || '',
      observacoes: p.observacoes || '',
    })
    setEditId(p.id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function salvar() {
    if (!form.nome.trim()) { setMsg('Nome obrigatório'); return }
    setSalvando(true)

    // Geocodificar
    let lat: number | undefined
    let lng: number | undefined
    if (form.endereco || form.cidade) {
      setGeocodando(true)
      const coords = await geocodificar(form.endereco, form.bairro, form.cidade)
      setGeocodando(false)
      if (coords) { lat = coords.lat; lng = coords.lng }
    }

    const payload: any = {
      nome:        form.nome.trim(),
      cpf:         form.cpf.trim()      || null,
      telefone:    form.telefone.trim() || null,
      endereco:    form.endereco.trim() || null,
      bairro:      form.bairro.trim()   || null,
      cidade:      form.cidade.trim()   || null,
      observacoes: form.observacoes.trim() || null,
    }
    if (lat !== undefined) { payload.lat = lat; payload.lng = lng }

    if (editId) {
      const { error } = await supabase.from('pacientes').update(payload).eq('id', editId)
      if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
      setMsg(lat ? '✅ Atualizado com localização!' : '✅ Atualizado (endereço não geocodificado)')
    } else {
      const { error } = await supabase.from('pacientes').insert(payload)
      if (error) { setMsg('Erro: ' + error.message); setSalvando(false); return }
      setMsg(lat ? '✅ Paciente cadastrado com localização!' : '✅ Cadastrado (endereço não geocodificado)')
    }

    limparForm()
    setSalvando(false)
    setTimeout(() => setMsg(''), 4000)
    carregar()
  }

  async function excluir(id: string) {
    if (!confirm('Excluir paciente?')) return
    await supabase.from('pacientes').delete().eq('id', id)
    carregar()
  }

  function toggleAberto(id: string) {
    setAbertos(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const filtrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    (p.cidade || '').toLowerCase().includes(busca.toLowerCase()) ||
    (p.cpf || '').includes(busca)
  )

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">👤 Pacientes</h1>
        <span className="text-sm text-gray-500">{pacientes.length} cadastrados</span>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="font-semibold text-gray-700 text-lg">
          {editId ? '✏️ Editar Paciente' : '➕ Novo Paciente'}
        </h2>

        {msg && (
          <div className={`px-4 py-2 rounded-lg text-sm font-medium
            ${msg.startsWith('✅') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-700'}`}>
            {msg}
          </div>
        )}

        {/* Dados pessoais */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Dados Pessoais</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Nome completo *</label>
              <input value={form.nome} onChange={e => set('nome', e.target.value)}
                placeholder="Nome do paciente"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">CPF</label>
              <input value={form.cpf} onChange={e => set('cpf', e.target.value)}
                placeholder="000.000.000-00"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Telefone</label>
              <input value={form.telefone} onChange={e => set('telefone', e.target.value)}
                placeholder="(81) 99999-9999"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
            Endereço <span className="text-blue-400 normal-case font-normal">(usado para geocodificação automática)</span>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 mb-1 block">Endereço completo</label>
              <input value={form.endereco} onChange={e => set('endereco', e.target.value)}
                placeholder="Rua, número"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Bairro</label>
              <input value={form.bairro} onChange={e => set('bairro', e.target.value)}
                placeholder="Bairro"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
              <input value={form.cidade} onChange={e => set('cidade', e.target.value)}
                placeholder="Palmares, PE"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
            </div>
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Observações</label>
          <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)}
            rows={2} placeholder="Condições especiais, necessidades de acessibilidade, etc."
            className="w-full border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300" />
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

      {/* Lista */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b flex items-center gap-3">
          <input value={busca} onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, cidade ou CPF…"
            className="flex-1 border rounded-lg px-3 py-2 text-sm" />
          <span className="text-sm text-gray-400 whitespace-nowrap">{filtrados.length} result.</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Carregando…</div>
        ) : filtrados.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Nenhum paciente encontrado</div>
        ) : (
          <div className="divide-y">
            {filtrados.map(p => (
              <div key={p.id} className="hover:bg-gray-50 transition-colors">
                {/* Row summary */}
                <div className="px-4 py-3 flex items-center gap-3 cursor-pointer"
                  onClick={() => toggleAberto(p.id)}>
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                    {p.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">{p.nome}</div>
                    <div className="text-xs text-gray-400 truncate">
                      {[p.cidade, p.cpf].filter(Boolean).join(' · ') || 'Sem dados adicionais'}
                    </div>
                  </div>
                  {p.lat && (
                    <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full">📍 GPS</span>
                  )}
                  <span className="text-gray-300 text-xs">{abertos.has(p.id) ? '▲' : '▼'}</span>
                </div>

                {/* Expanded */}
                {abertos.has(p.id) && (
                  <div className="px-4 pb-4 pt-1 border-t border-gray-100 bg-gray-50">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm mb-4">
                      {p.telefone && (
                        <div>
                          <div className="text-xs text-gray-400">Telefone</div>
                          <div className="font-medium">{p.telefone}</div>
                        </div>
                      )}
                      {p.endereco && (
                        <div className="col-span-2">
                          <div className="text-xs text-gray-400">Endereço</div>
                          <div className="font-medium">
                            {[p.endereco, p.bairro, p.cidade].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      )}
                      {p.observacoes && (
                        <div className="col-span-3">
                          <div className="text-xs text-gray-400">Observações</div>
                          <div className="text-gray-700">{p.observacoes}</div>
                        </div>
                      )}
                      {p.lat && (
                        <div className="col-span-3">
                          <div className="text-xs text-gray-400">Localização</div>
                          <div className="text-xs font-mono text-gray-600">{p.lat.toFixed(5)}, {p.lng?.toFixed(5)}</div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Link href={`/gestor/pacientes/${p.id}`}
                        className="px-3 py-1.5 bg-blue-50 text-blue-700 text-xs rounded-lg hover:bg-blue-100 font-medium">
                        👁️ Ver Perfil
                      </Link>
                      {p.lat && (
                        <a href={`https://www.google.com/maps?q=${p.lat},${p.lng}`} target="_blank" rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-green-50 text-green-700 text-xs rounded-lg hover:bg-green-100 font-medium">
                          🗺️ Google Maps
                        </a>
                      )}
                      <button onClick={() => editarPaciente(p)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-xs rounded-lg hover:bg-gray-200 font-medium">
                        ✏️ Editar
                      </button>
                      <button onClick={() => excluir(p.id)}
                        className="px-3 py-1.5 bg-red-50 text-red-600 text-xs rounded-lg hover:bg-red-100 font-medium">
                        🗑️ Excluir
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
