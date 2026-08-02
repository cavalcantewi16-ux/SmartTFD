'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Profile } from '@/types/database'

export default function ConfiguracoesPage() {
  const supabase = createClientComponentClient<Database>()
  const [perfil, setPerfil] = useState<Profile | null>(null)
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [stats, setStats] = useState({ pacientes: 0, motoristas: 0, veiculos: 0, hospitais: 0 })

  const carregar = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (p) { setPerfil(p); setNome(p.nome); setTelefone(p.telefone ?? '') }

    const [{ count: pac }, { count: mot }, { count: vei }, { count: hos }] = await Promise.all([
      supabase.from('pacientes').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'motorista'),
      supabase.from('veiculos').select('*', { count: 'exact', head: true }).eq('ativo', true),
      supabase.from('hospitais').select('*', { count: 'exact', head: true }),
    ])
    setStats({ pacientes: pac ?? 0, motoristas: mot ?? 0, veiculos: vei ?? 0, hospitais: hos ?? 0 })
  }, [supabase])

  useEffect(() => { carregar() }, [carregar])

  async function handleSalvar() {
    if (!perfil) return
    setSalvando(true)
    const { error } = await supabase.from('profiles').update({ nome: nome.trim(), telefone: telefone || undefined }).eq('id', perfil.id)
    if (error) setMensagem('Erro ao salvar.')
    else { setMensagem('Salvo com sucesso!'); carregar() }
    setSalvando(false)
    setTimeout(() => setMensagem(''), 3000)
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-6 max-w-2xl mx-auto w-full">
      <h2 className="text-lg font-bold text-gray-800">Configurações</h2>

      {/* Meu perfil */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Meu Perfil</h3>
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xl">
            {(nome || 'G').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-gray-800">{perfil?.nome ?? '—'}</p>
            <p className="text-sm text-gray-500">{perfil?.email ?? '—'}</p>
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Gestor</span>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Nome</label>
            <input type="text" value={nome} onChange={e => setNome(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
            <input type="text" value={telefone} onChange={e => setTelefone(e.target.value)}
              placeholder="(81) 99999-9999"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {mensagem && <p className={`text-sm ${mensagem.includes('Erro') ? 'text-red-600' : 'text-green-600'}`}>{mensagem}</p>}
          <button onClick={handleSalvar} disabled={salvando}
            className="bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-60 transition-colors">
            {salvando ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      </div>

      {/* Resumo do sistema */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Resumo do Sistema</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { emoji: '👤', label: 'Pacientes',   valor: stats.pacientes  },
            { emoji: '🧑‍✈️', label: 'Motoristas', valor: stats.motoristas },
            { emoji: '🚐', label: 'Veículos',    valor: stats.veiculos   },
            { emoji: '🏥', label: 'Hospitais',   valor: stats.hospitais  },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-100">
              <p className="text-2xl">{s.emoji}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{s.valor}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Info do sistema */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Informações</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex justify-between"><span className="text-gray-400">Sistema</span><span>SmartTFD MVP 1.0</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Tecnologia</span><span>Next.js + Supabase</span></div>
          <div className="flex justify-between"><span className="text-gray-400">Supabase Realtime</span><span className="text-green-600">● Ativo</span></div>
        </div>
      </div>
    </div>
  )
}
