export default function HistoricoPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Histórico</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Rotas e viagens encerradas
          </p>
        </div>

        {/* Filtro de data */}
        <div className="flex gap-2 items-center">
          <input
            type="date"
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-4 py-1.5 rounded-lg transition-colors">
            Filtrar
          </button>
        </div>
      </div>

      {/* Tabela de histórico — será implementada com dados do Supabase */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">📋</div>
          <p className="font-medium">Histórico de rotas</p>
          <p className="text-sm">Será conectado ao Supabase no próximo passo</p>
        </div>
      </div>
    </div>
  )
}
