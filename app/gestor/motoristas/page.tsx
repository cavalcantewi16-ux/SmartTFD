'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Database, Profile } from '@/types/database'

type FormData = { nome: string; email: string; telefone: string; senha: string }
const FORM_VAZIO: FormData = { nome: '', email: '', telefone: '', senha: '' }

function formatarTelefone(v: string) {
return v.replace(/\D/g, '').slice(0, 11)
.replace(/(\d{2})(\d)/, '($1) $2')
.replace(/(\d{5})(\d{1,4})$/, '$1-$2')
}

export default function MotoristasPage() {
const supabase = createClientComponentClient<Database>()
const [motoristas, setMotoristas] = useState<Profile[]>([])
const [form, setForm] = useState<FormData>(FORM_VAZIO)
const [editandoId, setEditandoId] = useState<string | null>(null)
const [carregando, setCarregando] = useState(true)
const [salvando, setSalvando] = useState(false)
const [erro, setErro] = useState('')
const [modalAberto, setModalAberto] = useState(false)
const [busca, setBusca] = useState('')
const [modalSenha, setModalSenha] = useState(false)
const [senhaMotoristaId, setSenhaMotoristaId] = useState<string | null>(null)
const [senhaMotoristaEmail, setSenhaMotoristaEmail] = useState('')
const [novaSenha, setNovaSenha] = useState('')
const [confirmSenha, setConfirmSenha] = useState('')
const [salvandoSenha,setSalvandoSenha]= useState(false)
const [erroSenha, setErroSenha] = useState('')
const [okSenha, setOkSenha] = useState('')

const carregar = useCallback(async () => {
setCarregando(true)
const { data } = await supabase.from('profiles').select('*').eq('role', 'motorista').order('nome')
setMotoristas(data ?? [])
setCarregando(false)
}, [supabase])

useEffect(() => { carregar() }, [carregar])

function abrirNovo() {
setForm(FORM_VAZIO)
setEditandoId(null)
setErro('')
setModalAberto(true)
}

function abrirEdicao(m: Profile) {
setForm({ nome: m.nome, email: m.email, telefone: m.telefone ?? '', senha: '' })
setEditandoId(m.id)
setErro('')
setModalAberto(true)
}

async function handleSalvar() {
if (!form.nome || !form.email) { setErro('Nome e e-mail são obrigatórios.'); return }
if (!editandoId && !form.senha) { setErro('Defina uma senha para o novo motorista.'); return }
setSalvando(true)
setErro('')

if (editandoId) {
const { error } = await supabase.from('profiles').update({
nome: form.nome.trim(),
telefone: form.telefone || undefined,
}).eq('id', editandoId)
if (error) { setErro(error.message); setSalvando(false); return }
} else {
// Criar via API route para usar service role
const res = await fetch('/api/criar-motorista', {
method: 'POST',
headers: { 'Content-Type': 'application/json' },
body: JSON.stringify({ nome: form.nome.trim(), email: form.email.trim(), senha: form.senha, telefone: form.telefone }),
})
const json = await res.json()
if (!res.ok) { setErro(json.error ?? 'Erro ao criar motorista.'); setSalvando(false); return }
}

setSalvando(false)
setModalAberto(false)
carregar()
}

async function handleResetSenha() {
if (!senhaMotoristaId) return
if (novaSenha.length < 6) { setErroSenha('Mínimo 6 caracteres'); return }
if (novaSenha !== confirmSenha) { setErroSenha('As senhas não coincidem'); return }
setSalvandoSenha(true); setErroSenha(''); setOkSenha('')
try {
const { data: { session } } = await supabase.auth.getSession()
const token = session?.access_token
if (!token) { setErroSenha('Sessão expirada — faça login novamente'); setSalvandoSenha(false); return }
const res = await fetch('/api/admin/reset-senha', {
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${token}`,
},
body: JSON.stringify({ motorista_id: senhaMotoristaId, nova_senha: novaSenha }),
})
let data: any = {}
try { data = await res.json() } catch { /* resposta não-JSON */ }
if (!res.ok) {
setErroSenha(data.error || `Erro ${res.status}`)
return
}
setOkSenha('✅ Senha alterada com sucesso!')
setNovaSenha(''); setConfirmSenha('')
setTimeout(() => { setModalSenha(false); setOkSenha('') }, 1800)
} catch (e: any) {
setErroSenha('Falha de conexão: ' + (e.message || 'erro desconhecido'))
} finally {
setSalvandoSenha(false)
}
}

function abrirModalSenha(id: string, email: string) {
setSenhaMotoristaId(id); setSenhaMotoristaEmail(email)
setNovaSenha(''); setConfirmSenha(''); setErroSenha(''); setOkSenha('')
setModalSenha(true)
}

const filtrados = motoristas.filter(m =>
m.nome.toLowerCase().includes(busca.toLowerCase()) ||
m.email.toLowerCase().includes(busca.toLowerCase())
)

return (
<div className="flex-1 flex flex-col p-4 gap-4">
<div className="flex items-center justify-between">
<div>
<h2 className="text-lg font-bold text-gray-800">Motoristas</h2>
<p className="text-sm text-gray-500">{motoristas.length} cadastrado{motoristas.length !== 1 ? 's' : ''}</p>
</div>
<button onClick={abrirNovo} className="bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors flex items-center gap-2">
<span>+</span> Novo Motorista
</button>
</div>

<div className="relative">
<span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
<input type="text" placeholder="Buscar por nome ou e-mail…" value={busca} onChange={e => setBusca(e.target.value)}
className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
</div>

{carregando ? (
<div className="flex-1 flex items-center justify-center">
<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-700" />
</div>
) : filtrados.length === 0 ? (
<div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-2">
<span className="text-4xl">🧑‍✈️</span>
<p className="text-sm">{busca ? 'Nenhum motorista encontrado.' : 'Nenhum motorista cadastrado.'}</p>
</div>
) : (
<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
{filtrados.map(m => (
<div key={m.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
<div className="flex items-center gap-3">
<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
{m.nome.charAt(0).toUpperCase()}
</div>
<div className="min-w-0">
<p className="font-semibold text-gray-800 truncate">{m.nome}</p>
<p className="text-xs text-gray-500 truncate">{m.email}</p>
</div>
</div>
{m.telefone && (
<p className="mt-2 text-xs text-gray-600 flex items-center gap-1.5">
<span>📞</span>{m.telefone}
</p>
)}
<div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
<a href={`/gestor/motoristas/${m.id}`}
className="flex-1 text-xs text-gray-600 hover:bg-gray-50 py-1.5 rounded-md transition-colors font-medium text-center">
👁️ Perfil
</a>
<button onClick={() => abrirEdicao(m)}
className="flex-1 text-xs text-blue-700 hover:bg-blue-50 py-1.5 rounded-md transition-colors font-medium">
✏️ Editar
</button>
<button onClick={() => abrirModalSenha(m.id, m.email)}
className="flex-1 text-xs text-orange-600 hover:bg-orange-50 py-1.5 rounded-md transition-colors font-medium">
🔑 Senha
</button>
</div>
</div>
))}
</div>
)}

{/* Modal de redefinição de senha */}
{modalSenha && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
<div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
<div className="flex items-center justify-between p-6 border-b border-gray-100">
<h3 className="text-base font-bold text-gray-800">🔑 Redefinir Senha</h3>
<button onClick={() => setModalSenha(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
</div>
<div className="p-6 space-y-4">
<p className="text-sm text-gray-500">
Motorista: <span className="font-medium text-gray-700">{senhaMotoristaEmail}</span>
</p>
<div>
<label className="block text-xs font-medium text-gray-700 mb-1">Nova senha <span className="text-red-500">*</span></label>
<input type="password" value={novaSenha} onChange={e => setNovaSenha(e.target.value)}
placeholder="Mín. 6 caracteres"
className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
</div>
<div>
<label className="block text-xs font-medium text-gray-700 mb-1">Confirmar senha <span className="text-red-500">*</span></label>
<input type="password" value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)}
placeholder="Repita a senha"
className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
</div>
{erroSenha && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{erroSenha}</div>}
{okSenha && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-3 py-2 text-sm">{okSenha}</div>}
</div>
<div className="flex gap-3 p-6 pt-0">
<button onClick={() => setModalSenha(false)}
className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
Cancelar
</button>
<button onClick={handleResetSenha} disabled={salvandoSenha}
className="flex-1 bg-orange-500 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-60 flex items-center justify-center gap-2">
{salvandoSenha ? 'Salvando…' : '🔑 Salvar Senha'}
</button>
</div>
</div>
</div>
)}

{modalAberto && (
<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
<div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
<div className="flex items-center justify-between p-6 border-b border-gray-100">
<h3 className="text-base font-bold text-gray-800">{editandoId ? 'Editar Motorista' : 'Novo Motorista'}</h3>
<button onClick={() => setModalAberto(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
</div>
<div className="p-6 space-y-4">
<div>
<label className="block text-xs font-medium text-gray-700 mb-1">Nome completo <span className="text-red-500">*</span></label>
<input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
placeholder="Ex: Carlos Silva" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
</div>
<div>
<label className="block text-xs font-medium text-gray-700 mb-1">E-mail <span className="text-red-500">*</span></label>
<input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
disabled={!!editandoId} placeholder="motorista@email.com"
className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400" />
</div>
<div>
<label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
<input type="text" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: formatarTelefone(e.target.value) }))}
placeholder="(81) 99999-9999" inputMode="tel"
className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
</div>
{!editandoId && (
<div>
<label className="block text-xs font-medium text-gray-700 mb-1">Senha inicial <span className="text-red-500">*</span></label>
<input type="password" value={form.senha} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
placeholder="Mín. 6 caracteres"
className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
</div>
)}
{erro && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">{erro}</div>}
</div>
<div className="flex gap-3 p-6 pt-0">
<button onClick={() => setModalAberto(false)}
className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">Cancelar</button>
<button onClick={handleSalvar} disabled={salvando}
className="flex-1 bg-blue-700 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-800 disabled:opacity-60 flex items-center justify-center gap-2">
{salvando ? <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block" /> Salvando…</> : editandoId ? 'Salvar' : 'Criar motorista'}
</button>
</div>
</div>
</div>
)}
</div>
)
                     }
