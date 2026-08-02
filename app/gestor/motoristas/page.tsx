export default function MotoristasPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Motoristas</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Cadastro e gerenciamento de motoristas
          </p>
        </div>
        <button className="bg-blue-700 hover:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
          + Novo Motorista
        </button>
      </div>

      {/* Tabela — será implementada com dados do Supabase */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="p-8 text-center text-gray-400">
          <div className="text-3xl mb-2">👤</div>
          <p className="font-medium">Lista de motoristas</p>
          <p className="text-sm">Será conectada ao Supabase no próximo passo</p>
        </div>
      </div>
    </div>
  )
}
