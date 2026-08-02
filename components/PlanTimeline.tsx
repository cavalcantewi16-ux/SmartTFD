'use client'

const TZ = 'America/Sao_Paulo'

function fmtHora(iso?: string | null) {
  if (!iso) return null
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

function diffMin(isoA?: string | null, isoB?: string | null) {
  if (!isoA || !isoB) return null
  return Math.round((new Date(isoB).getTime() - new Date(isoA).getTime()) / 60000)
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Paciente  { nome: string; endereco?: string; bairro?: string }
interface Passenger { id: string; paciente: Paciente; ordem: number; est_pickup_at?: string }
interface Hospital  { nome: string; cidade?: string }
interface Leg {
  id: string
  horario_saida: string
  hospital: Hospital
  passengers: Passenger[]
  est_departure_at?: string
  est_hospital_at?: string
  est_return_at?: string
  est_outbound_min?: number
  est_return_min?: number
  est_distance_km?: number
}

interface Props {
  data: string        // "YYYY-MM-DD"
  legs: Leg[]
}

// ─── Dot ─────────────────────────────────────────────────────────────────────
function Dot({ icon, color }: { icon: string; color: string }) {
  return (
    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${color}`}>
      {icon}
    </div>
  )
}

// ─── Linha vertical ──────────────────────────────────────────────────────────
function Line({ dashed = false, color = 'bg-gray-200' }: { dashed?: boolean; color?: string }) {
  if (dashed) {
    return (
      <div className="flex flex-col items-center w-9 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={`w-0.5 h-2 my-0.5 rounded-full ${color}`} />
        ))}
      </div>
    )
  }
  return <div className={`w-0.5 mx-auto flex-shrink-0 self-stretch min-h-4 ${color}`} style={{ width: 2 }} />
}

// ─── Bloco de intervalo ───────────────────────────────────────────────────────
function BlocoIntervalo({ returnAt, nextDepartureAt, data }: {
  returnAt?: string; nextDepartureAt?: string; data: string
}) {
  // Se não tem retorno estimado, monta horário da próxima saída
  let minutos: number | null = null

  if (returnAt && nextDepartureAt) {
    minutos = diffMin(returnAt, nextDepartureAt)
  } else if (!returnAt && nextDepartureAt) {
    // sem estimativa, não calcula
    minutos = null
  }

  const insuficiente = minutos !== null && minutos < 30
  const bgColor   = minutos === null ? 'bg-gray-50 border-gray-200'
                  : insuficiente     ? 'bg-red-50 border-red-300'
                  :                    'bg-green-50 border-green-200'
  const txtColor  = minutos === null ? 'text-gray-400'
                  : insuficiente     ? 'text-red-700'
                  :                    'text-green-700'

  return (
    <div className="flex gap-3 items-center my-1">
      <div className="w-9 flex-shrink-0" />
      <div className={`flex-1 border rounded-lg px-4 py-2 ${bgColor}`}>
        <div className={`text-xs font-semibold ${txtColor} flex items-center gap-2`}>
          {minutos !== null ? (
            <>
              <span>⏱</span>
              <span>Intervalo: {minutos} min</span>
              {insuficiente && <span className="ml-1 font-bold">— Tempo insuficiente entre viagens!</span>}
            </>
          ) : (
            <span>⏸ Intervalo entre viagens</span>
          )}
        </div>
        {returnAt && nextDepartureAt && (
          <div className={`text-xs mt-0.5 ${insuficiente ? 'text-red-500' : 'text-green-600'}`}>
            {fmtHora(returnAt)} → {fmtHora(nextDepartureAt)}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── PlanTimeline ─────────────────────────────────────────────────────────────
export default function PlanTimeline({ data, legs }: Props) {
  if (legs.length === 0) {
    return (
      <div className="text-center text-gray-400 py-8 text-sm">
        Adicione viagens ao plano para ver a linha do tempo
      </div>
    )
  }

  // ── Resumo do topo ─────────────────────────────────────────────────────────
  const totalPacientes  = legs.reduce((acc, l) => acc + l.passengers.length, 0)
  const totalKm         = legs.reduce((acc, l) => acc + (l.est_distance_km || 0), 0)
  const encerramentoIso = legs.at(-1)?.est_return_at
  const encerramentoHr  = fmtHora(encerramentoIso)

  return (
    <div className="space-y-4">
      {/* Resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Viagens',    valor: legs.length,                       icon: '🗺️', cor: 'bg-blue-50 text-blue-700'   },
          { label: 'Pacientes',  valor: totalPacientes,                    icon: '👥', cor: 'bg-purple-50 text-purple-700'},
          { label: 'Distância',  valor: totalKm > 0 ? `${totalKm} km` : '—', icon: '📏', cor: 'bg-orange-50 text-orange-700'},
          { label: 'Encerramento', valor: encerramentoHr || '—',           icon: '🏁', cor: 'bg-green-50 text-green-700' },
        ].map(item => (
          <div key={item.label} className={`rounded-xl p-3 ${item.cor}`}>
            <div className="text-lg">{item.icon}</div>
            <div className="font-bold text-lg mt-1">{item.valor}</div>
            <div className="text-xs opacity-70">{item.label}</div>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-xl shadow p-5">
        <h3 className="font-semibold text-gray-700 mb-5 text-sm uppercase tracking-wide">
          📅 Linha do Tempo — {new Date(data + 'T12:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
        </h3>

        {legs.map((leg, legIdx) => {
          const saidaHr    = leg.est_departure_at ? fmtHora(leg.est_departure_at) : leg.horario_saida.substring(0, 5)
          const hospitalHr = fmtHora(leg.est_hospital_at)
          const retornoHr  = fmtHora(leg.est_return_at)
          const proxLeg    = legs[legIdx + 1]

          return (
            <div key={leg.id}>
              {/* ── Número da viagem ── */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 flex-shrink-0" />
                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                  Viagem {legIdx + 1} — {leg.hospital.nome}
                  {leg.hospital.cidade ? `, ${leg.hospital.cidade}` : ''}
                </div>
              </div>

              {/* ── Saída ── */}
              <div className="flex gap-3 items-start">
                <Dot icon="🚗" color="bg-blue-100 text-blue-700" />
                <div className="flex-1 pb-1">
                  <div className="font-semibold text-sm text-gray-800">Saída da cidade</div>
                  <div className="text-xs text-blue-600 font-mono">{saidaHr}</div>
                  {leg.est_distance_km && (
                    <div className="text-xs text-gray-400 mt-0.5">
                      {leg.est_outbound_min} min de viagem · {leg.est_distance_km} km
                    </div>
                  )}
                </div>
              </div>

              {/* ── Paradas por paciente ── */}
              {leg.passengers.map((p, pIdx) => {
                const pickupHr = fmtHora(p.est_pickup_at)
                return (
                  <div key={p.id}>
                    <div className="flex gap-0 items-stretch" style={{ minHeight: 24 }}>
                      <div className="w-9 flex-shrink-0 flex justify-center">
                        <div className="w-0.5 bg-gray-200 flex-1" />
                      </div>
                    </div>
                    <div className="flex gap-3 items-start">
                      <Dot icon="👤" color="bg-gray-100 text-gray-600" />
                      <div className="flex-1 pb-1">
                        <div className="font-medium text-sm text-gray-800">
                          {p.paciente.nome}
                          <span className="text-gray-400 font-normal ml-1.5 text-xs">
                            parada {pIdx + 1}
                          </span>
                        </div>
                        {(p.paciente.endereco || p.paciente.bairro) && (
                          <div className="text-xs text-gray-400">
                            {[p.paciente.endereco, p.paciente.bairro].filter(Boolean).join(', ')}
                          </div>
                        )}
                        {pickupHr ? (
                          <div className="text-xs text-blue-600 font-mono mt-0.5">
                            Embarque estimado: {pickupHr}
                          </div>
                        ) : (
                          <div className="text-xs text-orange-400 mt-0.5">
                            Sem horário estimado (calcule a rota)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}

              {/* ── Linha antes do hospital ── */}
              <div className="flex gap-0 items-stretch" style={{ minHeight: 24 }}>
                <div className="w-9 flex-shrink-0 flex justify-center">
                  <div className="w-0.5 bg-gray-200 flex-1" />
                </div>
              </div>

              {/* ── Hospital ── */}
              <div className="flex gap-3 items-start">
                <Dot icon="🏥" color="bg-red-100 text-red-700" />
                <div className="flex-1 pb-1">
                  <div className="font-semibold text-sm text-gray-800">{leg.hospital.nome}</div>
                  {leg.hospital.cidade && (
                    <div className="text-xs text-gray-400">{leg.hospital.cidade}</div>
                  )}
                  {hospitalHr ? (
                    <div className="text-xs text-red-600 font-mono mt-0.5">Chegada estimada: {hospitalHr}</div>
                  ) : (
                    <div className="text-xs text-gray-400 mt-0.5">Calcule a rota para ver horário</div>
                  )}
                </div>
              </div>

              {/* ── Linha antes do retorno ── */}
              <div className="flex gap-0 items-stretch" style={{ minHeight: 24 }}>
                <div className="w-9 flex-shrink-0 flex justify-center">
                  <div className="w-0.5 bg-gray-200 flex-1" />
                </div>
              </div>

              {/* ── Retorno ── */}
              <div className="flex gap-3 items-start">
                <Dot icon="🔄" color="bg-green-100 text-green-700" />
                <div className="flex-1 pb-1">
                  <div className="font-semibold text-sm text-gray-800">Retorno à cidade</div>
                  {retornoHr ? (
                    <>
                      <div className="text-xs text-green-600 font-mono">{retornoHr}</div>
                      {leg.est_return_min && (
                        <div className="text-xs text-gray-400">{leg.est_return_min} min de volta</div>
                      )}
                    </>
                  ) : (
                    <div className="text-xs text-gray-400">Calcule a rota para ver horário</div>
                  )}
                </div>
              </div>

              {/* ── Intervalo entre viagens ── */}
              {proxLeg && (
                <>
                  <div className="flex gap-0 items-stretch" style={{ minHeight: 8 }}>
                    <div className="w-9 flex-shrink-0 flex justify-center">
                      <div className="w-0.5 bg-gray-100 flex-1" />
                    </div>
                  </div>
                  <BlocoIntervalo
                    returnAt={leg.est_return_at}
                    nextDepartureAt={proxLeg.est_departure_at || `${data}T${proxLeg.horario_saida.substring(0,5)}:00-03:00`}
                    data={data}
                  />
                  <div className="flex gap-0 items-stretch" style={{ minHeight: 8 }}>
                    <div className="w-9 flex-shrink-0 flex justify-center">
                      <div className="w-0.5 bg-gray-100 flex-1" />
                    </div>
                  </div>
                </>
              )}

              {/* ── Separador entre viagens ── */}
              {proxLeg && <div className="my-4 border-t border-dashed border-gray-100" />}

              {/* ── Encerramento (última viagem) ── */}
              {!proxLeg && (
                <>
                  <div className="flex gap-0 items-stretch" style={{ minHeight: 24 }}>
                    <div className="w-9 flex-shrink-0 flex justify-center">
                      <div className="w-0.5 bg-gray-200 flex-1" />
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <Dot icon="🏁" color="bg-gray-800 text-white" />
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-800">Encerramento do dia</div>
                      {encerramentoHr ? (
                        <div className="text-xs text-gray-600 font-mono">{encerramentoHr}</div>
                      ) : (
                        <div className="text-xs text-gray-400">Calcule as rotas para ver o horário</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
