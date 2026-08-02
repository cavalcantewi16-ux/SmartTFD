'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Veiculo { id: string; placa: string; modelo: string; capacidade: number; ativo: boolean }
interface Manutencao {
  id: string; veiculo_id: string; motorista_id: string
  tipo: string; descricao: string; urgencia: string
  resolvido: boolean; created_at: string
  motorista?: { nome: string }
}
interface Localizacao { lat: number; lng: number; atualizado_em: string; motorista?: { nome: string } }

const URGENCIA_COR: Record<string, string> = {
  baixa:   'bg-gray-100 text-gray-600',
  normal:  'bg-blue-100 text-blue-700',
  alta:    'bg-orange-100 text-orange-700',
  critica: 'bg-red-100 text-red-700',
}
const TIPO_LABEL: Record<string, string> = {
  pneu: '🛞 Pneu', motor: '⚙️ Motor', freio: '🛑 Freio',
  'ar-condicionado': '❄️ Ar-cond.', carroceria: '🚐 Carroceria', outro: '📋 Outro',
}

export default function VeiculoDetalhe() {
  const params = useParams()
  const id = params.id as string
  const supabase = createClientComponentClient()

  const [veiculo, setVeiculo] = useState<Veiculo | null>(null)
  const [manutencoes, setManutencoes] = useState<Manutencao[]>([])
  const [localizacao, setLocalizacao] = useState<Localizacao | null>(null)
  const [loading, setLoading] = useState(true)
  const [abaAtiva, setAbaAtiva] = useState<'manutencao' | 'localização'>('manutencao')
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')

  const carregar = useCallback(async () => {
    setLoading(true)
    const { data: v } = await supabase.from('veiculos').select('*').eq('id', id).single()
    setVeiculo(v)

    // Buscar manutenções
    const { data: m } = await supabase
      .from('manutencao_veicular')
      .select('*, motorista:profiles(nome)')
      .eq('veiculo_id', id)
      .order('created_at', { ascending: false })
    setManutencoes(m || [])

    // Buscar localização atual — viagem ativa hoje com este veículo → motorista → gps
    const hoje = new Date().toISOString().slice(0, 10)
    const { data: viagem } = await supabase
      .from('viagens')
      .select('motorista_id')
      .eq('veiculo_id', id)
      .eq('data', hoje)
      .in('status', ['agendada', 'em_andamento'])
      .limit(1)
      .single()

    if (viagem?.motorista_id) {
      const { data: loc } = await supabase
        .from('motorista_localizacao')
        .select('lat, lng, atualizado_em, motorista:profiles(nome)')
        .eq('motorista_id', viagem.motorista_id)
        .single()
      if (loc) setLocalizacao({ lat: loc.lat, lng: loc.lng, atualizado_em: loc.atualizado_em, motorista: (loc as any).motorista })
    } else {
      setLocalizacao(null)
    }

    setLoading(false)
  }, [id, supabase])

  useEffect(() => { carregar() }, [carregar])

  async function resolverManutencao(mId: string) {
    await supabase.from('manutencao_veicular').update({ resolvido: true, resolvido_em: new Date().toISOString() }).eq('id', mId)
    carregar()
    setMsg('✅ Manutenção marcada como resolvida')
    setTimeout(() => setMsg(''), 2500)
  }

  async function excluirManutencao(mId: string) {
    if (!confirm('Excluir este registro?')) return
    await supabase.from('manutencao_veicular').delete().eq('id', mId)
    carregar()
  }

  const pendentes = manutencoes.filter(m => !m.resolvido)
  const resolvidas = manutencoes.filter(m => m.resolvido)

  if (loading) return <div className="p-8 text-center text-gray-400">Carregando…</div>
  if (!veiculo) return <div className="p-8 text-center text-gray-500">Veículo não encontrado</div>

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/gestor/veiculos" className="text-blue-600 hover:underline text-sm">← Veículos</Link>
        <h1 className="text-2xl font-bold text-gray-800 flex-1">🚐 {veiculo.placa}</h1>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${veiculo.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
          {veiculo.ativo ? 'Ativo' : 'Inativo'}
        </span>
        {pendentes.length > 0 && (
          <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-medium">
            ⚠️ {pendentes.length} alerta{pendentes.length > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-blue-700">{veiculo.placa}</div>
          <div className="text-xs text-gray-500 mt-1">Placa</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-lg font-bold text-gray-800">{veiculo.modelo}</div>
          <div className="text-xs text-gray-500 mt-1">Modelo</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-2xl font-bold text-gray-800">{veiculo.capacidade}</div>
          <div className="text-xs text-gray-500 mt-1">Capacidade</div>
        </div>
      </div>

      {/* Flash */}
      {msg && <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm">{msg}</div>}

      {/* Abas */}
      <div className="flex border-b gap-6">
        {(['manutencao', 'localização'] as const).map(aba => (
          <button key={aba} onClick={() => setAbaAtiva(aba)}
            className={`pb-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px
              ${abaAtiva === aba ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {aba === 'manutencao' ? `🔧 Manutenção ${pendentes.length > 0 ? `(${pendentes.length})` : ''}` : '📍 Localização Atual'}
          </button>
        ))}
      </div>

      {/* Aba Manutenção */}
      {abaAtiva === 'manutencao' && (
        <div className="space-y-4">
          {/* Alertas pendentes */}
          {pendentes.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold text-red-700 flex items-center gap-2">
                ⚠️ Alertas Pendentes ({pendentes.length})
              </h3>
              {pendentes.map(m => (
                <div key={m.id} className="bg-white rounded-xl shadow border-l-4 border-red-400 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-gray-800">{TIPO_LABEL[m.tipo] || m.tipo}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCIA_COR[m.urgencia]}`}>
                          {m.urgencia.charAt(0).toUpperCase() + m.urgencia.slice(1)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700">{m.descricao}</p>
                      <div className="text-xs text-gray-400 mt-1">
                        Reportado por {m.motorista?.nome || '—'} · {new Date(m.created_at).toLocaleString('pt-BR')}
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={() => resolverManutencao(m.id)}
                        className="bg-green-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-green-700">
                        ✅ Resolver
                      </button>
                      <button onClick={() => excluirManutencao(m.id)}
                        className="bg-red-50 text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-100">
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {pendentes.length === 0 && (
            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm">
              ✅ Nenhum alerta pendente — veículo em ordem
            </div>
          )}

          {/* Histórico resolvidos */}
          {resolvidas.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 select-none">
                📋 Histórico resolvido ({resolvidas.length})
              </summary>
              <div className="mt-3 space-y-2">
                {resolvidas.map(m => (
                  <div key={m.id} className="bg-gray-50 rounded-lg p-3 border opacity-70">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-medium text-gray-700 line-through">{TIPO_LABEL[m.tipo] || m.tipo}</span>
                      <span className="text-xs text-green-600 font-medium">✓ Resolvido</span>
                    </div>
                    <p className="text-xs text-gray-500">{m.descricao}</p>
                    <div className="text-xs text-gray-400 mt-1">
                      {m.motorista?.nome || '—'} · {new Date(m.created_at).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {manutencoes.length === 0 && (
            <div className="text-center py-8 text-gray-400 text-sm">
              Nenhum registro de manutenção ainda.<br/>
              Motoristas podem reportar problemas pelo app.
            </div>
          )}
        </div>
      )}

      {/* Aba Localização */}
      {abaAtiva === 'localização' && (
        <div className="space-y-4">
          {localizacao ? (
            <div className="bg-white rounded-xl shadow p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
                <div>
                  <div className="font-semibold text-gray-800">Veículo em rota</div>
                  <div className="text-sm text-gray-500">Motorista: {localizacao.motorista?.nome || '—'}</div>
                </div>
                <div className="ml-auto text-xs text-gray-400">
                  Atualizado: {new Date(localizacao.atualizado_em).toLocaleTimeString('pt-BR')}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-sm font-mono text-gray-700">{localizacao.lat.toFixed(6)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Latitude</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <div className="text-sm font-mono text-gray-700">{localizacao.lng.toFixed(6)}</div>
                  <div className="text-xs text-gray-400 mt-0.5">Longitude</div>
                </div>
              </div>
              <a
                href={`https://www.google.com/maps?q=${localizacao.lat},${localizacao.lng}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full bg-blue-600 text-white py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors">
                🗺️ Abrir no Google Maps
              </a>
              <a
                href={`/gestor`}
                className="flex items-center justify-center gap-2 w-full bg-gray-100 text-gray-700 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors">
                Ver no Painel de Rotas Ativas
              </a>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow p-8 text-center">
              <div className="text-4xl mb-3">📍</div>
              <div className="text-gray-600 font-medium">Veículo sem rota ativa hoje</div>
              <div className="text-gray-400 text-sm mt-1">
                A localização aparece quando o motorista está com GPS ativo em uma rota.
              </div>
              <Link href="/gestor" className="inline-block mt-4 text-blue-600 text-sm hover:underline">
                Ver todas as rotas ativas →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
