'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import dynamic from 'next/dynamic'
import type { Database } from '@/types/database'
import type { MotoristaAtivo } from '@/components/MapMotoristas'

const MapMotoristas = dynamic(() => import('@/components/MapMotoristas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-xl">
      <p className="text-gray-400 text-sm">Carregando mapa…</p>
    </div>
  ),
})

export default function GestorPage() {
  const supabase = createClientComponentClient<Database>()
  const [motoristas, setMotoristas] = useState<MotoristaAtivo[]>([])
  const [resumo, setResumo] = useState({ veiculosAtivos: 0, totalPacientes: 0, vagasDisponiveis: 0 })
  const [carregando, setCarregando] = useState(true)

  const carregarDados = useCallback(async () => {
    const hoje = new Date().toISOString().split('T')[0]

    const { data: viagens } = await supabase
      .from('viagens')
      .select(`
        motorista_id,
        profiles!motorista_id(nome),
        veiculos!veiculo_id(modelo, capacidade),
        viagem_paradas(status)
      `)
      .eq('data', hoje)
      .in('status', ['pendente', 'em_andamento'])

    const { data: locsRaw } = await supabase.from('motorista_localizacao').select('*')
    const locs = locsRaw as Array<{ motorista_id: string; lat: number; lng: number }> | null

    const lista: MotoristaAtivo[] = (viagens ?? []).map(v => {
      const loc = locs?.find(l => l.motorista_id === v.motorista_id)
      const profile = v.profiles as any
      const veiculo = v.veiculos as any
      const paradas = (v.viagem_paradas as any[]) ?? []
      const pacientes = paradas.filter(p => p.status === 'embarcado').length
      return {
        id: v.motorista_id ?? '',
        nome: profile?.nome ?? 'Motorista',
        lat: loc?.lat ?? -8.6847,
        lng: loc?.lng ?? -35.5928,
        veiculo: veiculo?.modelo ?? 'Veículo',
        capacidade: veiculo?.capacidade ?? 4,
        pacientes,
      }
    }).filter(m => m.id)

    setMotoristas(lista)
    setResumo({
      veiculosAtivos: lista.length,
      totalPacientes: lista.reduce((s, m) => s + m.pacientes, 0),
      vagasDisponiveis: lista.reduce((s, m) => s + (m.capacidade - m.pacientes), 0),
    })
    setCarregando(false)
  }, [supabase])

  useEffect(() => {
    carregarDados()

    const channel = supabase
      .channel('mapa_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'motorista_localizacao' }, payload => {
        const n = payload.new as any
        if (!n?.motorista_id) return
        setMotoristas(prev =>
          prev.map(m => m.id === n.motorista_id ? { ...m, lat: n.lat, lng: n.lng } : m)
        )
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [carregarDados, supabase])

  return (
    <div className="flex-1 flex flex-col p-4 gap-4 min-h-0">

      {/* Título da seção */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Rotas Ativas</h2>
        <button
          onClick={carregarDados}
          className="text-xs text-blue-600 hover:underline"
        >
          ↻ Atualizar
        </button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-3 gap-3 flex-shrink-0">
        <CardResumo emoji="🚐" titulo="Veículos Ativos"    valor={resumo.veiculosAtivos}    cor="blue"   carregando={carregando} />
        <CardResumo emoji="👥" titulo="Total de Pacientes" valor={resumo.totalPacientes}    cor="green"  carregando={carregando} />
        <CardResumo emoji="🪑" titulo="Vagas Disponíveis"  valor={resumo.vagasDisponiveis}  cor="orange" carregando={carregando} />
      </div>

      {/* Mapa Leaflet */}
      <div className="flex-1 min-h-[400px] rounded-xl overflow-hidden border border-gray-200 shadow-sm">
        <MapMotoristas motoristas={motoristas} />
      </div>
    </div>
  )
}

function CardResumo({ emoji, titulo, valor, cor, carregando }: {
  emoji: string; titulo: string; valor: number
  cor: 'blue' | 'green' | 'orange'; carregando: boolean
}) {
  const estilos = {
    blue:   'bg-blue-50   border-blue-200   text-blue-800',
    green:  'bg-green-50  border-green-200  text-green-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
  }
  return (
    <div className={`border rounded-xl p-4 flex items-center gap-3 shadow-sm ${estilos[cor]}`}>
      <span className="text-2xl">{emoji}</span>
      <div>
        <p className="text-xs font-medium opacity-60 uppercase tracking-wide">{titulo}</p>
        {carregando
          ? <div className="h-7 w-8 bg-current opacity-20 rounded animate-pulse mt-1" />
          : <p className="text-2xl font-bold">{valor}</p>
        }
      </div>
    </div>
  )
}
