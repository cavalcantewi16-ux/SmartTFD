with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# 1. useRef no import
txt = txt.replace(
    "import { useState, useEffect } from 'react'",
    "import { useState, useEffect, useRef } from 'react'"
)

# 2. Estados e refs apos buscando
txt = txt.replace(
    "const [buscando, setBuscando] = useState(false)",
    "const [buscando, setBuscando] = useState(false)\n  const [gmLoaded, setGmLoaded] = useState(false)\n  const [locPick, setLocPick] = useState<{lat:number;lng:number}|null>(null)\n  const mapRef = useRef<any>(null)\n  const markerRef = useRef<any>(null)"
)

# 3. Script loader + map init apos useEffect do modal
ANCHOR = "  useEffect(()=>{ if(!modal) setNovoForm(null) },[modal])"
ADDITIONS = """

  useEffect(()=>{
    if(typeof window==='undefined') return
    if((window as any).google?.maps){setGmLoaded(true);return}
    if(document.getElementById('gmap-script')) return
    const s=document.createElement('script')
    s.id='gmap-script'
    s.src=`https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places&language=pt-BR`
    s.async=true; s.onload=()=>setGmLoaded(true)
    document.head.appendChild(s)
  },[])

  useEffect(()=>{
    if(!locModal||!gmLoaded) return
    mapRef.current=null
    const t=setTimeout(()=>{
      const div=document.getElementById('gmap-loc')
      if(!div) return
      const g=(window as any).google.maps
      const center={lat:-7.4746,lng:-36.1365}
      const map=new g.Map(div,{center,zoom:13,mapTypeControl:false,streetViewControl:false,fullscreenControl:false})
      const marker=new g.Marker({map,position:center,draggable:true})
      const onPos=(lat:number,lng:number)=>{marker.setPosition({lat,lng});setLocPick({lat,lng})}
      map.addListener('click',(e:any)=>onPos(e.latLng.lat(),e.latLng.lng()))
      marker.addListener('dragend',(e:any)=>onPos(e.latLng.lat(),e.latLng.lng()))
      const inp=document.getElementById('gmap-search') as HTMLInputElement
      if(inp){
        const ac=new g.places.Autocomplete(inp,{componentRestrictions:{country:'br'}})
        ac.addListener('place_changed',()=>{
          const p=ac.getPlace();if(!p.geometry) return
          const lat=p.geometry.location.lat(),lng=p.geometry.location.lng()
          map.panTo({lat,lng});map.setZoom(17);onPos(lat,lng)
          setLocModal(m=>m?{...m,q:p.formatted_address||inp.value}:null)
        })
      }
      mapRef.current=map;markerRef.current=marker
    },150)
    return()=>{clearTimeout(t);mapRef.current=null}
  },[locModal,gmLoaded])"""
txt = txt.replace(ANCHOR, ANCHOR + ADDITIONS)

# 4. confirmarLoc antes de salvarNovoPac
txt = txt.replace(
    "  async function salvarNovoPac() {",
    "  function confirmarLoc(){\n    if(!locModal||!locPick) return\n    const q=locModal.q||locPick.lat.toFixed(5)+', '+locPick.lng.toFixed(5)\n    setPac(locModal.ru,locModal.pu,{localizacao:q,lat:locPick.lat,lng:locPick.lng})\n    setLocModal(null);setLocPick(null)\n  }\n\n  async function salvarNovoPac() {"
)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK patchA')
