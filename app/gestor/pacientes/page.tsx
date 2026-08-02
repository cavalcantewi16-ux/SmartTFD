'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Paciente } from '@/types/database'

type FormData = {
  nome: string
  cpf: string
  data_nascimento: string
  telefone: string
  endereco: string
  municipio: string
}

const FORM_VAZIO: FormData = {
  nome: '',
  cpf: '',
  data_nascimento: '',
  telefone: '',
  endereco: '',
  municipio: '',
}

function formatarCPF(valor: string) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

function formatarTelefone(valor: string) {
  return valor
    .replace(/\D/g, '')
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

async function geocodificar(endereco: string, municipio: string): Promise<{ lat: number; lng: number } | null> {
  const query = encodeURIComponent(`${endereco}, ${municipio}, Pernambuco, Brasil`)
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { 'Accept-Language': 'pt-BR' } }
    )
    const data = await res.json()
    if (data && data[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    return null
  } catch {
    return null
  }
}

export default function PacientesPage() {
  const supabase = createClientComponentClient<Database>()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [form, setForm] = useState<FormData>(FORM_VAZIO)
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [busca, setBusca] = useState('')
  const [modalAberto, setModalAberto] = useState(false)

  const carregarPacientes = useCallback(async () => {
    setCarregando(true)
    const { data } = await supabase
      .from('pacientes')
      .select('*')
      .order('nome')
    setPacientes(data ?? [])
    setCarregando(false)
  }, [supabase])

  useEffect(() => { carregarPacientes() }, [carregarPacientes])

  function abrirNovo() {
    setForm(FORM_VAZIO)
    setEditandoId(null)
    setErro('')
    setModalAberto(true)
  }

  function abrirEdicao(p: Paciente) {
    setForm({
      nome: p.nome,
      cpf: p.cpf,
      data_nascimento: p.data_nascimento,
      telefone: p.telefone ?? '',
      endereco: p.endereco,
      municipio: p.municipio,
    })
    setEditandoId(p.id)
    setErro('')
    setModalAberto(true)
  }

  function fecharModal() {
    setModalAberto(false)
    setErro('')
  }

  async function handleSalvar() {
    if (!form.nome || !form.cpf || !form.data_nascimento || !form.endereco || !form.municipio) {
      setErro('Preencha todos os campos obrigatórios.')
      return
    }

    setSalvando(true)
    setErro('')

    const coords = await geocodificar(form.endereco, form.municipio)
    const lat = coords?.lat ?? -8.6847
    const lng = coords?.lng ?? -35.5928

    const payload = {
      nome: form.nome.trim(),
      cpf: form.cpf.replace(/\D/g, ''),
      data_nascimento: form.data_nascimento,
      telefone: form.telefone || undefined,
      endereco: form.endereco.trim(),
      municipio: form.municipio.trim(),
      lat,
      lng,
    }

    if (editandoId) {
      const { error } = await supabase.from('pacientes').update(payload).eq('id', editandoId)
      if (error) { setErro(error.message); setSalvando(false); return }
    } else {
      const { error } = await supabase.from('pacientes').insert(payload)
      if (error) { setErro(error.message); setSalvando(false); return }
    }

    setSalvando(false)
    fecharModal()
    carregarPacientes()
  }

  async function handleExcluir(id: string) {
    if (!confirm('Excluir este paciente?')) return
    await supabase.from('pacientes').delete().eq('id', id)
    carregarPacientes()
  }

  const pacientesFiltrados = pacientes.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.municipio.toLowerCase().includes(busca.toLowerCase()) ||
    p.cpf.includes(busca.replace(/\D/g, ''))
  )

  function calcularIdade(dataNasc: string) {
    const hoje = new Date()
    const nasc = new Date(dataNasc)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    const m = hoje.getMonth() - nasc.getMonth()
    if (m < 0 || (m === 0 && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">

      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Pacientes</h2>
          <p className="text-sm text-gray-500">{pacientes.length} cadastrado{pacientes.length !== 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={abrirNovo}
          className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2"
        >
          <span className="text-base">+</span> Novo Paciente
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nome, município ou CPF…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {/* Lista */}
      {carregando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      ) : pacientesFiltrados.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <span className="text-4xl">👤</span>
          <p className="text-sm">{busca ? 'Nenhum paciente encontrado.' : 'Nenhum paciente cadastrado.'}</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {pacientesFiltrados.map(p => (
            <div
              key={p.id}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{p.nome}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {calcularIdade(p.data_nascimento)} anos · CPF {p.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}
                  </p>
                </div>
                <span className="flex-shrink-0 bg-blue-50 text-blue-700 text-xs font-medium px-2 py-0.5 rounded-full">
                  {p.municipio}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-xs text-gray-600">
                <p className="flex items-center gap-1.5">
                  <span>📍</span>
                  <span className="truncate">{p.endereco}</span>
                </p>
                {p.telefone && (
                  <p className="flex items-center gap-1.5">
                    <span>📞</span>
                    <span>{p.telefone}</span>
                  </p>
                )}
                {p.lat && p.lng && (
                  <p className="flex items-center gap-1.5 text-green-600">
                    <span>🗺️</span>
                    <span>Localização geocodificada</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => abrirEdicao(p)}
                  className="flex-1 text-xs text-blue-700 hover:bg-blue-50 py-1.5 rounded-md transition-colors font-medium"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleExcluir(p.id)}
                  className="flex-1 text-xs text-red-600 hover:bg-red-50 py-1.5 rounded-md transition-colors font-medium"
                >
                  🗑️ Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">
                {editandoId ? 'Editar Paciente' : 'Novo Paciente'}
              </h3>
              <button
                onClick={fecharModal}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Nome completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                  placeholder="Ex: João da Silva"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    CPF <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.cpf}
                    onChange={e => setForm(f => ({ ...f, cpf: formatarCPF(e.target.value) }))}
                    placeholder="000.000.000-00"
                    inputMode="numeric"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Data de nascimento <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={form.data_nascimento}
                    onChange={e => setForm(f => ({ ...f, data_nascimento: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Telefone / WhatsApp
                </label>
                <input
                  type="text"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: formatarTelefone(e.target.value) }))}
                  placeholder="(81) 99999-9999"
                  inputMode="tel"
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
                  placeholder="Ex: Palmares"
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
                  🗺️ O endereço será geocodificado automaticamente ao salvar.
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
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSalvar}
                disabled={salvando}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {salvando ? (
                  <>
                    <span className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Geocodificando…
                  </>
                ) : (
                  editandoId ? 'Salvar alterações' : 'Cadastrar paciente'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
