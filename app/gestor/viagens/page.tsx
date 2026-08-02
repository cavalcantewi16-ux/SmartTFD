'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Viagem, Profile, Veiculo, Paciente, Hospital } from '@/types/database'

type ViagemCompleta = Viagem & {
  motorista: Profile | null
  veiculo: Veiculo | null
  paradas: Array<{ paciente: Paciente | null; hospital: Hospital | null; status: string; ordem: number }>
}

type ParadaForm = { paciente_id: string; hospital_id: string }

export default function ViagensPage() {
  const supabase = createClientComponentClient<Database>()
  const [viagens, setViagens] = useState<ViagemCompleta[]>([])
  const [motoristas, setMotoristas] = useState<Profile[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [dataSelecionada, setDataSelecionada] = useState(() => new Date().toISOString().split('T')[0])

  // Form state
  const [fData, setFData] = useState(dataSelecionada)
  const [fMotorista, setFMotorista] = useState('')
  const [fVeiculo, setFVeiculo] = useState('')
  const [fObs, setFObs] = useState('')
  const [fParadas, setFParadas] = useState<ParadaForm[]>([{ paciente_id: '', hospital_id: '' }])

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [{ data: vs }, { data: ms }, { data: vc }, { data: ps }, { data: hs }] = await Promise.all([
      supabase.from('viagens').select(`
        *,
        motorista:profiles!motorista_id(id, nome, email, role, created_at),
        veiculo:veiculos!veiculo_id(*),
        paradas:viagem_paradas(
          status, ordem,
          paciente:pacientes(*),
          hospital:hospitais(*)
        )
      `).eq('data', dataSelecionada).order('created_at'),
      supabase.from('profiles').select('*').eq('role', 'motorista').order('nome'),
      supabase.from('veiculos').select('*').eq('ativo', true).order('modelo'),
      supabase.from('pacientes').select('*').order('nome'),
      supabase.from('hospitais').select('*').order('nome'),
    ])
    setViagens((vs as any) ?? [])
    setMotoristas(ms ?? [])
    setVeiculos(vc ?? [])
    setPacientes(ps ?? [])
    setHospitais(hs ?? [])
    setCarregando(false)
  }, [supabase, dataSelecionada])

  useEffect(() => { carregar() }, [carregar])

  function abrirNovo() {
    setFData(dataSelecionada)
    setFMotorista('')
    setFVeiculo('')
    setFObs('')
    setFParadas([{ paciente_id: '', hospital_id: '' }])
    setErro('')
    setModalAberto(true)
  }

  function addParada() {
    setFParadas(p => [...p, { paciente_id: '', hospital_id: '' }])
  }

  function removeParada(i: number) {
    setFParadas(p => p.filter((_, idx) => idx !== i))
  }

  function setParada(i: number, field: keyof ParadaForm, val: string) {
    setFParadas(p => p.map((x, idx) => idx === i ? { ...x, [field]: val } : x))
  }

  async function handleSalvar() {
    if (!fMotorista || !fVeiculo || !fData) { setErro('Selecione data, motorista e veículo.'); return }
    const paradasValidas = fParadas.filter(p => p.paciente_id && p.hospital_id)
    if (paradasValidas.length === 0) { setErro('Adicione pelo menos um paciente com hospital destino.'); return }
    setSalvando(true)
    setErro('')

    const { data: viagem, error: errV } = await supabase.from('viagens').insert({
      motorista_id: fMotorista,
      veiculo_id: fVeiculo,
      data: fData,
      status: 'pendente',
      observacoes: fObs || undefined,
    }).select().single()

    if (errV || !viagem) { setErro(errV?.message ?? 'Erro ao criar viagem.'); setSalvando(false); return }

    const paradasInsert = paradasValidas.map((p, i) => ({
      viagem_id: viagem.id,
      paciente_id: p.paciente_id,
      hospital_id: p.hospital_id,
      ordem: i + 1,
      status: 'pendente' as const,
    }))

    const { error: errP } = await supabase.from('viagem_paradas').insert(paradasInsert)
    if (errP) { setErro(errP.message); setSalvando(false); return }

    setSalvando(false)
    setModalAberto(false)
    carregar()
  }

  async function cancelarViagem(id: string) {
    if (!confirm('Cancelar esta viagem?')) return
    await supabase.from('viagens').update({ status: 'cancelada' }).eq('id', id)
    carregar()
  }

  const statusConfig: Record<string, { label: string; cor: string }> = {
    pendente:     { label: 'Pendente',     cor: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
    em_andamento: { label: 'Em andamento', cor: 'bg-blue-50 text-blue-700 border-blue-200' },
    concluida:    { label: 'Concluída',    cor: 'bg-green-50 text-green-700 border-green-200' },
    cancelada:    { label: 'Cancelada',    cor: 'bg-gray-100 text-gray-500 border-gray-200' },
  }

  const veiculo = veiculos.find(v => v.id === fVeiculo)
  const vagasDisponiveis = veiculo ? veiculo.capacidade - fParadas.filter(p => p.paciente_id).length : null

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Viagens</h2>
          <p className="text-sm text-gray-500">{viagens.length} agendada{viagens.length !== 1 ? 's' : ''} para {new Date(dataSelecionada + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="date" value={dataSelecionada} onChange={e => setDataSelecionada(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button onClick={abrirNovo}
            className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2">
            <span>+</span> Nova Viagem
          </button>
        </div>
      </div>

      {carregando ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
        </div>
      ) : viagens.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
          <span className="text-4xl">🚐</span>
          <p className="text-sm">Nenhuma viagem para este dia.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {viagens.map(v => {
            const cfg = statusConfig[v.status] ?? statusConfig.pendente
            const pac = v.paradas?.filter(p => p.status === 'embarcado').length ?? 0
            const total = v.paradas?.length ?? 0
            return (
              <div key={v.id} className={`bg-white border rounded-xl p-4 shadow-sm ${v.status === 'cancelada' ? 'opacity-50' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-800">{v.motorista?.nome ?? '—'}</p>
                    <p className="text-xs text-gray-500">{v.veiculo?.modelo ?? '—'} · {v.veiculo?.capacidade} lugares</p>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cor}`}>{cfg.label}</span>
                </div>

                <div className="mt-3 space-y-1.5">
                  {v.paradas?.sort((a, b) => a.ordem - b.ordem).map((p, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 ${
                        p.status === 'embarcado' ? 'bg-green-500' : p.status === 'concluido' ? 'bg-blue-500' : 'bg-gray-300'
                      }`}>{i + 1}</span>
                      <span className="truncate">{p.paciente?.nome ?? '—'}</span>
                      <span className="text-gray-400">→</span>
                      <span className="truncate text-gray-500">{p.hospital?.nome ?? '—'}</span>
                    </div>
                  ))}
                </div>

                {total > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>👥 {pac}/{total} embarcados</span>
                    {v.observacoes && <span className="truncate max-w-[160px] text-gray-400">📝 {v.observacoes}</span>}
                  </div>
                )}

                {v.status === 'pendente' && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <button onClick={() => cancelarViagem(v.id)}
                      className="w-full text-xs text-red-600 hover:bg-red-50 py-1.5 rounded-md transition-colors font-medium">
                      ✕ Cancelar viagem
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {modalAberto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-800">Nova Viagem</h3>
              <button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6 space-y-4">

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data <span className="text-red-500">*</span></label>
                  <input type="date" value={fData} onChange={e => setFData(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Veículo <span className="text-red-500">*</span></label>
                  <select value={fVeiculo} onChange={e => setFVeiculo(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                    <option value="">Selecione…</option>
                    {veiculos.map(v => <option key={v.id} value={v.id}>{v.modelo} ({v.capacidade} lug.)</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Motorista <span className="text-red-500">*</span></label>
                <select value={fMotorista} onChange={e => setFMotorista(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  <option value="">Selecione…</option>
                  {motoristas.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-700">
                    Pacientes <span className="text-red-500">*</span>
                    {vagasDisponiveis !== null && (
                      <span className={`ml-2 font-normal ${vagasDisponiveis < 0 ? 'text-red-500' : 'text-gray-400'}`}>
                        ({vagasDisponiveis} vaga{vagasDisponiveis !== 1 ? 's' : ''} disponível{vagasDisponiveis !== 1 ? 'is' : ''})
                      </span>
                    )}
                  </label>
                  <button onClick={addParada} className="text-xs text-blue-700 hover:underline font-medium">+ Adicionar</button>
                </div>
                <div className="space-y-2">
                  {fParadas.map((p, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-xs text-gray-400 w-4 flex-shrink-0">{i + 1}.</span>
                      <select value={p.paciente_id} onChange={e => setParada(i, 'paciente_id', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-0">
                        <option value="">Paciente…</option>
                        {pacientes.map(pac => <option key={pac.id} value={pac.id}>{pac.nome}</option>)}
                      </select>
                      <select value={p.hospital_id} onChange={e => setParada(i, 'hospital_id', e.target.value)}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-0">
                        <option value="">Hospital…</option>
                        {hospitais.map(h => <option key={h.id} value={h.id}>{h.nome}</option>)}
                      </select>
                      {fParadas.length > 1 && (
                        <button onClick={() => removeParada(i)} className="text-gray-400 hover:text-red-500 flex-shrink-0 text-lg leading-none">×</button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Observações</label>
                <textarea value={fObs} onChange={e => setFObs(e.target.value)} rows={2}
                  placeholder="Ex: Paciente cadeirante, levar rampa"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              {erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{erro}</div>}
            </div>
            <div className="flex gap-3 p-6 pt-0">
              <button onClick={() => setModalAberto(false)}
                className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
              <button onClick={handleSalvar} disabled={salvando}
                className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-60 flex items-center justify-center gap-2">
                {salvando ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> Salvando…</> : 'Agendar viagem'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
