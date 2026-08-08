'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Paciente } from '@/types/database'

type ViagemHistorico = {
  id: string; data: string; status: string
  motorista: { nome: string } | null
  veiculo: { modelo: string } | null
  parada: { status: string; hora_embarque?: string; hora_chegada?: string; hospital: { nome: string } | null } | null
}

const STATUS_COR: Record<string, string> = {
  concluida: 'bg-green-50 text-green-700', em_andamento: 'bg-blue-50 text-blue-700',
  pendente: 'bg-yellow-50 text-yellow-700', cancelada: 'bg-gray-100 text-gray-500',
}

export default function PacientePerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [paciente, setPaciente] = useState<Paciente | null>(null)
  const [viagens, setViagens] = useState<ViagemHistorico[]>([])
  const [carregando, setCarregando] = useState(true)
  const [recorrente, setRecorrente] = useState(false)
  const [diasSemana, setDiasSemana] = useState<string[]>([])
  const [salvandoRec, setSalvandoRec] = useState(false)

  const carregar = useCallback(async () => {
    const [{ data: p }, { data: vs }] = await Promise.all([
      supabase.from('pacientes').select('*').eq('id', id).single(),
      supabase.from('viagens').select(`
        id, data, status,
        motorista:profiles!motorista_id(nome),
        veiculo:veiculos!veiculo_id(modelo),
        parada:viagem_paradas!inner(status, hora_embarque, hora_chegada, hospital:hospitais(nome))
      `).eq('viagem_paradas.paciente_id', id).order('data', { ascending: false }),
    ])
    setPaciente(p)
    setRecorrente((p as any)?.recorrente ?? false)
    setDiasSemana((p as any)?.dias_semana ?? [])
    setViagens((vs as any) ?? [])
    setCarregando(false)
  }, [supabase, id])

  useEffect(() => { carregar() }, [carregar])

  function calcularIdade(data: string) {
    const hoje = new Date(); const nasc = new Date(data)
    let idade = hoje.getFullYear() - nasc.getFullYear()
    if (hoje.getMonth() - nasc.getMonth() < 0 || (hoje.getMonth() === nasc.getMonth() && hoje.getDate() < nasc.getDate())) idade--
    return idade
  }

  async function salvarRecorrente() {
    setSalvandoRec(true)
    await supabase.from('pacientes').update({ recorrente, dias_semana: diasSemana } as any).eq('id', id)
    setSalvandoRec(false)
    alert('Salvo!')
  }

  function toggleDia(d: string) {
    setDiasSemana(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])
  }

  if (carregando) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>
  if (!paciente) return <div className="flex-1 flex items-center justify-center text-gray-400">Paciente não encontrado.</div>

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</button>
        <h2 className="text-lg font-bold text-gray-800">Perfil do Paciente</h2>
      </div>

      {/* Card do paciente */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0">
            {paciente.nome.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xl font-bold text-gray-800">{paciente.nome}</h3>
            <p className="text-gray-500 text-sm">{calcularIdade(paciente.data_nascimento)} anos · {paciente.municipio}</p>
          </div>
          <Link href={`/gestor/pacientes`} className="text-xs text-blue-700 hover:underline">← Lista</Link>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          {[
            ['CPF', paciente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')],
            ['Nascimento', new Date(paciente.data_nascimento + 'T12:00:00').toLocaleDateString('pt-BR')],
            ['Telefone', paciente.telefone ?? '—'],
            ['Endereço', paciente.endereco],
          ].map(([l, v]) => (
            <div key={l}>
              <p className="text-xs text-gray-400 uppercase tracking-wide">{l}</p>
              <p className="text-gray-700 font-medium">{v}</p>
            </div>
          ))}
        </div>
        {paciente.lat && paciente.lng && (
          <a
            href={`https://www.google.com/maps?q=${paciente.lat},${paciente.lng}`}
            target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1.5 text-xs text-blue-700 hover:underline"
          >
            🗺️ Ver no mapa — {paciente.lat.toFixed(5)}, {paciente.lng.toFixed(5)}
          </a>
        )}
      </div>

      {/* Recorrencia */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-gray-700">★ Paciente Recorrente</h4>
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="text-xs text-gray-500">{recorrente ? 'Sim' : 'Não'}</span>
            <div onClick={() => setRecorrente(v => !v)}
              className={'relative w-10 h-5 rounded-full transition-colors cursor-pointer ' + (recorrente ? 'bg-blue-600' : 'bg-gray-300')}>
              <div className={'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ' + (recorrente ? 'translate-x-5' : '')} />
            </div>
          </label>
        </div>
        {recorrente && (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">Dias fixos de transporte:</p>
            <div className="flex gap-2 flex-wrap">
              {['dom','seg','ter','qua','qui','sex','sab'].map(d => (
                <button key={d} onClick={() => toggleDia(d)}
                  className={'px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ' +
                    (diasSemana.includes(d) ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}>
                  {d}
                </button>
              ))}
            </div>
            {diasSemana.length > 0 && (
              <p className="text-xs text-blue-600">Dias selecionados: {diasSemana.join(', ')}</p>
            )}
          </div>
        )}
        <button onClick={salvarRecorrente} disabled={salvandoRec}
          className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg disabled:opacity-50">
          {salvandoRec ? 'Salvando...' : 'Salvar Recorrência'}
        </button>
      </div>

      {/* Histórico de viagens */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Viagens ({viagens.length})</h4>
        {viagens.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-400 text-sm">
            Nenhuma viagem registrada para este paciente.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {viagens.map(v => (
              <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-800">
                      {new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[v.status] ?? ''}`}>
                      {v.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">🧑‍✈️ {(v.motorista as any)?.nome ?? '—'} · 🚐 {(v.veiculo as any)?.modelo ?? '—'}</p>
                  {(v.parada as any)?.hospital && (
                    <p className="text-xs text-gray-500">🏥 {(v.parada as any).hospital.nome}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
