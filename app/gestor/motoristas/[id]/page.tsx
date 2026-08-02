'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Profile } from '@/types/database'

type ViagemHistorico = {
  id: string; data: string; status: string; observacoes?: string
  veiculo: { modelo: string; capacidade: number } | null
  paradas: Array<{ status: string }>
}

const STATUS_COR: Record<string, string> = {
  concluida: 'bg-green-50 text-green-700', em_andamento: 'bg-blue-50 text-blue-700',
  pendente: 'bg-yellow-50 text-yellow-700', cancelada: 'bg-gray-100 text-gray-500',
}

export default function MotoristaPerfilPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClientComponentClient<Database>()
  const [motorista, setMotorista] = useState<Profile | null>(null)
  const [viagens, setViagens] = useState<ViagemHistorico[]>([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    const [{ data: m }, { data: vs }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('viagens').select(`
        id, data, status, observacoes,
        veiculo:veiculos!veiculo_id(modelo, capacidade),
        paradas:viagem_paradas(status)
      `).eq('motorista_id', id).order('data', { ascending: false }).limit(50),
    ])
    setMotorista(m)
    setViagens((vs as any) ?? [])
    setCarregando(false)
  }, [supabase, id])

  useEffect(() => { carregar() }, [carregar])

  const totalViagens = viagens.length
  const concluidas = viagens.filter(v => v.status === 'concluida').length
  const totalPacientes = viagens.filter(v => v.status === 'concluida')
    .reduce((s, v) => s + (v.paradas?.filter((p: any) => ['concluido','desembarcou'].includes(p.status)).length ?? 0), 0)

  if (carregando) return <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" /></div>
  if (!motorista) return <div className="flex-1 flex items-center justify-center text-gray-400">Motorista não encontrado.</div>

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 text-sm">← Voltar</button>
        <h2 className="text-lg font-bold text-gray-800">Perfil do Motorista</h2>
      </div>

      {/* Card do motorista */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl flex-shrink-0">
            {motorista.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">{motorista.nome}</h3>
            <p className="text-gray-500 text-sm">{motorista.email}</p>
            {motorista.telefone && <p className="text-gray-500 text-sm">📞 {motorista.telefone}</p>}
          </div>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Viagens', valor: totalViagens, cor: 'text-gray-800' },
          { label: 'Concluídas', valor: concluidas, cor: 'text-green-700' },
          { label: 'Pacientes', valor: totalPacientes, cor: 'text-blue-700' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-gray-200 rounded-xl p-3 text-center shadow-sm">
            <p className={`text-2xl font-bold ${c.cor}`}>{c.valor}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Histórico */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-3">Histórico de Viagens</h4>
        {viagens.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-8 text-center text-gray-400 text-sm">
            Nenhuma viagem registrada.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {viagens.map(v => {
              const entregues = v.paradas?.filter((p: any) => ['concluido','desembarcou'].includes(p.status)).length ?? 0
              const total = v.paradas?.length ?? 0
              return (
                <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800">
                        {new Date(v.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COR[v.status] ?? ''}`}>
                        {v.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">🚐 {(v.veiculo as any)?.modelo ?? '—'} · 👥 {entregues}/{total} pacientes</p>
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
