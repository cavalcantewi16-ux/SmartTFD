'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const navItems = [
{ href: '/gestor', label: '🗺️ Rotas Ativas' },
{ href: '/gestor/pacientes', label: '👤 Pacientes' },
{ href: '/gestor/motoristas', label: '🧑‍✈️ Motoristas' },
{ href: '/gestor/veiculos', label: '🚐 Veículos' },
{ href: '/gestor/hospitais', label: '🏥 Hospitais' },
{ href: '/gestor/planos', label: '📋 Planos' },
{ href: '/gestor/viagens', label: '📅 Agendamento' },
{ href: '/gestor/historico', label: '📋 Histórico' },
{ href: '/gestor/configuracoes', label: '⚙️ Config' },
]

export default function GestorLayout({ children }: { children: React.ReactNode }) {
const supabase = createClientComponentClient()
const router = useRouter()

async function handleLogout() {
await supabase.auth.signOut()
router.push('/login')
}

return (
<div className="min-h-screen flex flex-col">
<header className="bg-blue-800 text-white shadow-md">
<div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14 gap-4">
<span className="font-extrabold text-lg tracking-tight whitespace-nowrap">
Smart<span className="text-blue-300">TFD</span>
<span className="text-blue-400 font-normal text-sm ml-2">Gestor</span>
</span>
<nav className="flex gap-0.5 overflow-x-auto flex-1">
{navItems.map(item => (
<Link key={item.href} href={item.href}
className="px-2.5 py-1.5 rounded-md text-xs font-medium text-blue-100 hover:bg-blue-700 hover:text-white transition-colors whitespace-nowrap">
{item.label}
</Link>
))}
</nav>
<button onClick={handleLogout} className="text-blue-300 hover:text-white text-sm transition-colors whitespace-nowrap">
Sair
</button>
</div>
</header>
<main className="flex-1 flex flex-col">{children}</main>
</div>
)
}
