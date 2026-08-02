'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MarkerData {
  viagemId: string
  motoristaNome: string
  lat: number
  lng: number
  pendentes: number
  embarcados: number
  entregues: number
  total: number
  status: string
  selected: boolean
}

interface Props {
  markers: MarkerData[]
  onSelect: (id: string) => void
  selectedId: string | null
}

function createIcon(m: MarkerData) {
  const bg     = m.selected ? '#1d4ed8' : m.status === 'em_andamento' ? '#15803d' : '#2563eb'
  const border = m.selected ? '#93c5fd' : 'white'
  const primeiroNome = m.motoristaNome.split(' ')[0]
  const html = `
    <div style="
      background:${bg};color:white;border-radius:12px;padding:5px 10px;
      font-size:11px;font-weight:700;white-space:nowrap;
      box-shadow:0 3px 10px rgba(0,0,0,.35);border:2px solid ${border};
      display:flex;align-items:center;gap:5px;cursor:pointer;
    ">
      <span>🚐</span>
      <span>${primeiroNome}</span>
      <span style="background:rgba(255,255,255,.25);border-radius:8px;padding:1px 6px;">
        ${m.pendentes}⏳ ${m.embarcados}🚌
      </span>
    </div>`
  return L.divIcon({ html, className: '', iconAnchor: [0, 12] })
}

function AutoCenter({ markers }: { markers: MarkerData[] }) {
  const map = useMap()
  useEffect(() => {
    if (!markers.length) return
    const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]))
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 })
  }, [markers.length])
  return null
}

const DEFAULT_CENTER: [number, number] = [-8.8, -36.5]

export default function MapRotasAtivas({ markers, onSelect, selectedId }: Props) {
  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={9}
      style={{ width: '100%', height: '100%', zIndex: 1 }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap"
      />
      {markers.length > 0 && <AutoCenter markers={markers} />}
      {markers.map(m => (
        <Marker
          key={m.viagemId}
          position={[m.lat, m.lng]}
          icon={createIcon(m)}
          eventHandlers={{ click: () => onSelect(m.viagemId) }}
        >
          <Popup>
            <div style={{ minWidth: 140 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{m.motoristaNome}</div>
              <div style={{ fontSize: 12, color: '#555' }}>
                ⏳ {m.pendentes} aguardando<br/>
                🚌 {m.embarcados} no carro<br/>
                ✅ {m.entregues} entregues
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
