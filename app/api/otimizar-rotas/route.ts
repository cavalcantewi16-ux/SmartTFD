import { NextRequest, NextResponse } from 'next/server'

const BOQUEIRAO = { lat: -7.4746, lng: -36.1365 }
const BUFFER_MIN = 3
const JANELA_AGRUP_MIN = 30

const TEMPOS_CIDADE: Record<string, number> = {
  'campina grande': 120, 'campina': 120,
  'joao pessoa': 190, 'joÃ£o pessoa': 190, 'jp': 190,
  'recife': 250, 'caruaru': 155, 'patos': 140,
  'sousa': 195, 'cajazeiras': 220, 'guarabira': 130,
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLng/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}

function tempoEstimadoMin(distKm: number) { return Math.ceil((distKm * 1.45) / 68 * 60) }

function tempoParaHospital(h: { lat?: number|null; lng?: number|null; cidade?: string|null }): number {
  if (h.lat && h.lng) return tempoEstimadoMin(haversineKm(BOQUEIRAO.lat, BOQUEIRAO.lng, h.lat, h.lng))
  if (h.cidade) {
    const key = h.cidade.toLowerCase()
    for (const [nome, tempo] of Object.entries(TEMPOS_CIDADE)) if (key.includes(nome.trim())) return tempo
  }
  return 120
}

function timeToMin(t: string) { const [h,m] = t.split(':').map(Number); return h*60+m }
function minToTime(m: number) {
  const h = Math.floor(Math.max(0,m)/60)%24; const min = Math.max(0,m)%60
  return `${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`
}

interface PlanningItem {
  id: string; patient_name: string; companions_count: number
  pickup_location?: string; pickup_lat?: number|null; pickup_lng?: number|null
  hospital_id: string; destination_name: string; consultation_time: string
  hospital_lat?: number|null; hospital_lng?: number|null; hospital_cidade?: string|null
}
interface Vehicle {
  id: string; placa: string; modelo?: string; capacidade: number
  motorista_id: string; motorista_nome: string
}

export async function POST(req: NextRequest) {

  const { items, vehicles } = await req.json() as { items: PlanningItem[]; vehicles: Vehicle[] }
  if (!items?.length) return NextResponse.json({ error: 'Nenhum item' }, { status: 400 })
  if (!vehicles?.length) return NextResponse.json({ error: 'Nenhum veiculo' }, { status: 400 })

  const invalidos = items.filter(i => !i.patient_name?.trim() || !i.hospital_id || !i.consultation_time)
  if (invalidos.length) return NextResponse.json({ error: `${invalidos.length} item(s) incompleto(s)` }, { status: 400 })

  const porHospital = new Map<string, PlanningItem[]>()
  for (const item of items) {
    if (!porHospital.has(item.hospital_id)) porHospital.set(item.hospital_id, [])
    porHospital.get(item.hospital_id)!.push(item)
  }

  type Grupo = {
    hospital_id: string; destination_name: string
    hospital_lat?: number|null; hospital_lng?: number|null; hospital_cidade?: string|null
    items: PlanningItem[]; earliest_time: string; latest_time: string; total_pessoas: number
  }

  function buildGrupo(hospId: string, janela: PlanningItem[]): Grupo {
    const ref = janela[0]
    return {
      hospital_id: hospId, destination_name: ref.destination_name,
      hospital_lat: ref.hospital_lat, hospital_lng: ref.hospital_lng, hospital_cidade: ref.hospital_cidade,
      items: janela, earliest_time: janela[0].consultation_time,
      latest_time: janela[janela.length-1].consultation_time,
      total_pessoas: janela.reduce((s,p) => s+1+(p.companions_count||0), 0),
    }
  }

  const grupos: Grupo[] = []
  for (const [hospId, hospItems] of porHospital) {
    const sorted = [...hospItems].sort((a,b) => timeToMin(a.consultation_time)-timeToMin(b.consultation_time))
    let janela: PlanningItem[] = [sorted[0]]
    const anchorMin = timeToMin(sorted[0].consultation_time)
    for (let i=1; i<sorted.length; i++) {
      if (timeToMin(sorted[i].consultation_time)-anchorMin <= JANELA_AGRUP_MIN) janela.push(sorted[i])
      else { grupos.push(buildGrupo(hospId, janela)); janela = [sorted[i]] }
    }
    grupos.push(buildGrupo(hospId, janela))
  }

  const gruposComTempo = grupos.map(g => {
    const tempoViagem = tempoParaHospital({ lat: g.hospital_lat, lng: g.hospital_lng, cidade: g.hospital_cidade })
    return { ...g, tempoViagem, saidaMin: timeToMin(g.earliest_time)-tempoViagem-BUFFER_MIN }
  }).sort((a,b) => a.saidaMin-b.saidaMin)

  const veiculosOrdenados = [...vehicles].sort((a,b) => a.capacidade-b.capacidade)
  const ocupadoAte: Record<string, number> = {}
  for (const v of veiculosOrdenados) ocupadoAte[v.id] = 0

  const resultado = gruposComTempo.map(({ tempoViagem, saidaMin, ...g }) => {
    let veiculo = veiculosOrdenados.find(v => v.capacidade >= g.total_pessoas && ocupadoAte[v.id] <= saidaMin)
    if (!veiculo) veiculo = veiculosOrdenados.find(v => v.capacidade >= g.total_pessoas)
    if (!veiculo) veiculo = veiculosOrdenados[veiculosOrdenados.length-1]

    const consultaMin = timeToMin(g.earliest_time)
    const retornoMin = consultaMin+30+tempoViagem
    if (veiculo) ocupadoAte[veiculo.id] = retornoMin

    const avisos: string[] = []
    if (g.items.some(i => i.consultation_time !== g.earliest_time))
      avisos.push(`Consultas agrupadas: ${g.earliest_time}â€“${g.latest_time} (janela ${JANELA_AGRUP_MIN} min)`)
    if (veiculo && g.total_pessoas > veiculo.capacidade)
      avisos.push(`Grupo tem ${g.total_pessoas} pessoas, veiculo tem ${veiculo.capacidade} lugares`)

    return {
      hospital_id: g.hospital_id, destination_name: g.destination_name,
      patients: g.items, earliest_consultation: g.earliest_time, latest_consultation: g.latest_time,
      total_pessoas: g.total_pessoas, tempo_viagem_min: tempoViagem,
      horario_saida: minToTime(saidaMin),
      horario_chegada_estimado: minToTime(consultaMin-BUFFER_MIN),
      horario_retorno_estimado: minToTime(retornoMin),
      veiculo_sugerido: veiculo ? {
        id: veiculo.id, placa: veiculo.placa, modelo: veiculo.modelo,
        capacidade: veiculo.capacidade, motorista_id: veiculo.motorista_id, motorista_nome: veiculo.motorista_nome,
      } : null,
      aviso: avisos.length ? avisos.join(' Â· ') : null,
    }
  })

  return NextResponse.json({ grupos: resultado })
  }
