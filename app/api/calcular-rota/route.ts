import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

const ORS_URL = 'https://api.heigit.org/v2/directions/driving-car'
const TZ = 'America/Sao_Paulo'

function fmt(date: Date) {
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: TZ })
}

async function chamarORS(coords: [number, number][], key: string) {
  const res = await fetch(ORS_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ coordinates: coords }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`ORS ${res.status}: ${txt.slice(0, 200)}`)
  }
  return res.json()
}

export async function POST(req: NextRequest) {
  const supabase = createRouteHandlerClient({ cookies })

  let body: any
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { leg_id } = body
  if (!leg_id) return NextResponse.json({ error: 'leg_id obrigatório' }, { status: 400 })

  const orsKey = process.env.ORS_API_KEY
  if (!orsKey) return NextResponse.json({ error: 'ORS_API_KEY não configurada no servidor' }, { status: 500 })

  // Coordenadas de origem (município) via env var, default: Palmares-PE
  const origemLat = parseFloat(process.env.ORIGEM_LAT || '-8.6844')
  const origemLng = parseFloat(process.env.ORIGEM_LNG || '-35.5892')

  // ── Carregar leg completa ────────────────────────────────────────────────
  const { data: leg, error: legErr } = await supabase
    .from('route_legs')
    .select(`
      id, horario_saida, ordem, plan_id,
      hospital:hospitais(id, nome, lat, lng),
      leg_passengers(id, ordem, paciente:pacientes(id, nome, lat, lng)),
      route_plans!inner(id, data)
    `)
    .eq('id', leg_id)
    .single()

  if (legErr || !leg) {
    return NextResponse.json({ error: 'Viagem não encontrada' }, { status: 404 })
  }

  const hospital = leg.hospital as any
  const plan     = leg.route_plans as any
  const dataViagem = plan.data as string  // "YYYY-MM-DD"

  // Validar coordenadas do hospital
  if (!hospital?.lat || !hospital?.lng) {
    return NextResponse.json({
      error: `Hospital "${hospital?.nome}" sem coordenadas. Geocodifique o endereço em Hospitais primeiro.`
    }, { status: 422 })
  }

  // Ordenar passageiros e validar coordenadas
  const passengers: any[] = ((leg.leg_passengers as any[]) || [])
    .sort((a, b) => a.ordem - b.ordem)

  const semCoords = passengers.filter(p => !p.paciente?.lat || !p.paciente?.lng)
  if (semCoords.length > 0) {
    const nomes = semCoords.map((p: any) => p.paciente?.nome).join(', ')
    return NextResponse.json({
      error: `Paciente(s) sem coordenadas: ${nomes}. Geocodifique os endereços em Pacientes primeiro.`
    }, { status: 422 })
  }

  // ── Montar coordenadas de ida ─────────────────────────────────────────────
  // [origem, p1, p2, ..., hospital]
  const coordsIda: [number, number][] = [
    [origemLng, origemLat],
    ...passengers.map((p: any) => [p.paciente.lng, p.paciente.lat] as [number, number]),
    [hospital.lng, hospital.lat],
  ]

  // ── Chamar ORS — ida ─────────────────────────────────────────────────────
  let idaData: any
  try {
    idaData = await chamarORS(coordsIda, orsKey)
  } catch (e: any) {
    return NextResponse.json({ error: `Erro ORS (ida): ${e.message}` }, { status: 502 })
  }

  const rotaIda   = idaData.routes?.[0]
  if (!rotaIda) return NextResponse.json({ error: 'ORS não retornou rota de ida' }, { status: 502 })

  const segmentos: any[] = rotaIda.segments
  const distanciaTotal   = rotaIda.summary.distance  // metros
  const duracaoTotal     = rotaIda.summary.duration  // segundos

  // ── Calcular horários ─────────────────────────────────────────────────────
  const horario    = (leg.horario_saida as string).substring(0, 5)  // "08:00"
  const departureAt = new Date(`${dataViagem}T${horario}:00-03:00`)  // UTC-3 (Brasil)

  let acumulado = 0
  acumulado += segmentos[0].duration  // origem → primeiro ponto

  const pickupTimes: { id: string; est_pickup_at: Date }[] = []
  for (let i = 0; i < passengers.length; i++) {
    pickupTimes.push({
      id: passengers[i].id,
      est_pickup_at: new Date(departureAt.getTime() + acumulado * 1000),
    })
    if (i + 1 < segmentos.length) acumulado += segmentos[i + 1].duration
  }

  const hospitalAt = new Date(departureAt.getTime() + acumulado * 1000)

  // ── Chamar ORS — retorno ──────────────────────────────────────────────────
  let returnAt: Date
  let duracaoRetorno: number

  try {
    const voltaData = await chamarORS(
      [[hospital.lng, hospital.lat], [origemLng, origemLat]],
      orsKey
    )
    duracaoRetorno = voltaData.routes?.[0]?.summary?.duration || duracaoTotal
  } catch {
    duracaoRetorno = duracaoTotal  // fallback: mesmo tempo da ida
  }
  returnAt = new Date(hospitalAt.getTime() + duracaoRetorno * 1000)

  const outboundMin  = Math.round(duracaoTotal / 60)
  const returnMin    = Math.round(duracaoRetorno / 60)
  const distanciaKm  = Math.round(distanciaTotal / 100) / 10

  // ── Salvar em route_legs ─────────────────────────────────────────────────
  await supabase.from('route_legs').update({
    est_departure_at: departureAt.toISOString(),
    est_hospital_at:  hospitalAt.toISOString(),
    est_return_at:    returnAt.toISOString(),
    est_outbound_min: outboundMin,
    est_return_min:   returnMin,
    est_distance_km:  distanciaKm,
  }).eq('id', leg_id)

  // ── Salvar est_pickup_at por passageiro ───────────────────────────────────
  await Promise.all(
    pickupTimes.map(({ id, est_pickup_at }) =>
      supabase.from('leg_passengers')
        .update({ est_pickup_at: est_pickup_at.toISOString() })
        .eq('id', id)
    )
  )

  // ── Detectar conflito com próxima viagem ──────────────────────────────────
  const { data: nextLegs } = await supabase
    .from('route_legs')
    .select('id, horario_saida')
    .eq('plan_id', leg.plan_id)
    .gt('ordem', leg.ordem)
    .order('ordem')
    .limit(1)

  let conflict: string | null = null
  if (nextLegs && nextLegs.length > 0) {
    const nextHorario   = (nextLegs[0].horario_saida as string).substring(0, 5)
    const nextDeparture = new Date(`${dataViagem}T${nextHorario}:00-03:00`)
    if (returnAt > nextDeparture) {
      const diffMin = Math.round((returnAt.getTime() - nextDeparture.getTime()) / 60000)
      conflict = `⚠️ Conflito! Retorno previsto às ${fmt(returnAt)} mas a próxima viagem sai às ${fmt(nextDeparture)} (${diffMin} min de diferença). Ajuste os horários.`
    }
  }

  return NextResponse.json({
    success: true,
    est_departure_at: departureAt.toISOString(),
    est_hospital_at:  hospitalAt.toISOString(),
    est_return_at:    returnAt.toISOString(),
    est_outbound_min: outboundMin,
    est_return_min:   returnMin,
    est_distance_km:  distanciaKm,
    pickup_times: pickupTimes.map(p => ({ id: p.id, est_pickup_at: p.est_pickup_at.toISOString() })),
    conflict,
  })
}
