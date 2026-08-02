'use client'

import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export interface MotoristaAtivo {
  id: string
  nome: string
  lat: number
  lng: number
  veiculo: string
  capacidade: number
  pacientes: number
}

interface Props {
  motoristas: MotoristaAtivo[]
  centro?: [number, number]
}

// Corrige o ícone padrão do Leaflet no Next.js
function criarIcone(cor: string) {
  return L.divIcon({
    className: '',
    html: `
      <div style="
        background:${cor};
        width:36px;height:36px;
        border-radius:50% 50% 50% 0;
        transform:rotate(-45deg);
        border:3px solid #fff;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
        display:flex;align-items:center;justify-content:center;
      ">
        <span style="transform:rotate(45deg);font-size:16px;">🚐</span>
      </div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 36],
    popupAnchor: [0, -38],
  })
}

export default function MapMotoristas({ motoristas, centro = [-8.6847, -35.5928] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const marcadoresRef = useRef<Record<string, L.Marker>>({})

  // Inicializa o mapa uma vez
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: centro,
      zoom: 12,
      zoomControl: true,
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      marcadoresRef.current = {}
    }
  }, [])

  // Atualiza marcadores quando motoristas mudam
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const idsAtuais = new Set(motoristas.map(m => m.id))

    // Remove marcadores de motoristas que saíram
    for (const id of Object.keys(marcadoresRef.current)) {
      if (!idsAtuais.has(id)) {
        marcadoresRef.current[id].remove()
        delete marcadoresRef.current[id]
      }
    }

    // Adiciona ou move marcadores
    for (const m of motoristas) {
      const vagas = m.capacidade - m.pacientes
      const cor = vagas === 0 ? '#ef4444' : vagas <= 1 ? '#f97316' : '#2563eb'
      const icone = criarIcone(cor)

      const popup = `
        <div style="font-family:sans-serif;min-width:180px">
          <p style="font-weight:700;font-size:14px;margin:0 0 6px">${m.nome}</p>
          <p style="margin:2px 0;font-size:12px;color:#555">🚐 ${m.veiculo}</p>
          <p style="margin:2px 0;font-size:12px;color:#555">👥 ${m.pacientes} paciente${m.pacientes !== 1 ? 's' : ''} a bordo</p>
          <p style="margin:2px 0;font-size:12px;color:${cor};font-weight:600">🪑 ${vagas} vaga${vagas !== 1 ? 's' : ''} disponível${vagas !== 1 ? 'is' : ''}</p>
        </div>`

      if (marcadoresRef.current[m.id]) {
        marcadoresRef.current[m.id]
          .setLatLng([m.lat, m.lng])
          .setIcon(icone)
          .getPopup()?.setContent(popup)
      } else {
        const marker = L.marker([m.lat, m.lng], { icon: icone })
          .addTo(map)
          .bindPopup(popup)
        marcadoresRef.current[m.id] = marker
      }
    }
  }, [motoristas])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', minHeight: '400px' }}
    />
  )
}
