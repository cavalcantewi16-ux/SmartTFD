import Link from 'next/link'

const navItems = [
  { href: '/gestor',            label: '🗺️ Painel',     exact: true },
  { href: '/gestor/motoristas', label: '👤 Motoristas' },
  { href: '/gestor/veiculos',   label: '🚐 Veículos'   },
  { href: '/gestor/historico',  label: '📋 Histórico'  },
]

export default function GestorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior */}
      <header className="bg-blue-800 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
          <span className="font-extrabold text-lg tracking-tight">
            Smart<span className="text-blue-300">TFD</span>
            <span className="text-blue-400 font-normal text-sm ml-2">Gestor</span>
          </span>

          <nav className="flex gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-md text-sm font-medium text-blue-100 hover:bg-blue-700 hover:text-white transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <Link
            href="/login"
            className="text-blue-300 hover:text-white text-sm transition-colors"
          >
            Sair
          </Link>
        </div>
      </header>

      {/* Conteúdo da página */}
      <main className="flex-1 flex flex-col">
        {children}
      </main>
    </div>
  )
}
