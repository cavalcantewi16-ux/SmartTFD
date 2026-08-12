'use client'
import { useState, useEffect, useRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const GARAGEM = { lat: -7.4746, lng: -36.1365 }

interface Paciente { id:string; nome:string; endereco?:string; bairro?:string; lat?:number|null; lng?:number|null; lat_gestor?:number|null; lng_gestor?:number|null }
interface Hospital { id:string; nome:string; cidade?:string; lat?:number|null; lng?:number|null }
interface Veiculo { id:string; placa:string; modelo:string; capacidade:number }
interface Motorista { id:string; nome:string }
interface PacRota { _uid:string; paciente_id:string; nome:string; acomp:number; localizacao:string; lat?:number|null; lng?:number|null; lat_gestor?:number|null; lng_gestor?:number|null; hospital_id:string; horario:string; destino_lat?:number|null; destino_lng?:number|null; destino_end?:string; prioridade?:string }
interface Rota { _uid:string; motorista_id:string; motorista_nome:string; veiculo_id:string; veiculo_modelo:string; capacidade:number; pacs:PacRota[]; tempo_min:number|null; saida:string|null }

function uid() { return crypto.randomUUID() }
function hav(a1:number,g1:number,a2:number,g2:number){const R=6371,dA=(a2-a1)*Math.PI/180,dG=(g2-g1)*Math.PI/180,x=Math.sin(dA/2)**2+Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(dG/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function minToTime(m:number){const t=Math.max(0,m);return String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function timeToMin(t:string){const[h,m]=t.split(':').map(Number);return h*60+m}


function DateCarousel({ data, onChange }: { data: string; onChange: (d: string) => void }) {
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sab']
  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const dates: Date[] = []
  const base = new Date(data + 'T12:00:00')
  for (let i = -3; i <= 3; i++) {
    const d = new Date(base); d.setDate(base.getDate() + i); dates.push(d)
  }
  function toISO(d: Date) {
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0')
  }
  const hoje = toISO(new Date())
  function shift(n: number) {
    const d = new Date(base); d.setDate(base.getDate() + n); onChange(toISO(d))
  }
  return (
    <div className="flex items-center gap-1 my-3 justify-center select-none">
      <button onClick={() => shift(-7)} className="px-2 py-1 text-gray-500 hover:text-blue-600 text-lg font-bold">&#171;</button>
      <button onClick={() => shift(-1)} className="px-2 py-1 text-gray-500 hover:text-blue-600 text-lg font-bold">&#8249;</button>
      <div className="flex gap-1">
        {dates.map((d, i) => {
          const iso = toISO(d)
          const sel = iso === data
          const isHoje = iso === hoje
          return (
            <button key={i} onClick={() => onChange(iso)}
              className={`flex flex-col items-center px-2.5 py-1.5 rounded-xl text-xs transition-all
                ${sel ? 'bg-blue-600 text-white font-bold shadow-md scale-105'
                : isHoje ? 'bg-blue-50 text-blue-700 border border-blue-300 font-semibold'
                : 'text-gray-500 hover:bg-gray-100'}`}>
              <span className="text-[10px] uppercase">{dias[d.getDay()]}</span>
              <span className="text-base font-bold leading-tight">{d.getDate()}</span>
              <span className="text-[9px]">{meses[d.getMonth()]}</span>
            </button>
          )
        })}
      </div>
      <button onClick={() => shift(1)} className="px-2 py-1 text-gray-500 hover:text-blue-600 text-lg font-bold">&#8250;</button>
      <button onClick={() => shift(7)} className="px-2 py-1 text-gray-500 hover:text-blue-600 text-lg font-bold">&#187;</button>
      <button onClick={() => onChange(hoje)} className="ml-2 px-2 py-1 text-xs text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50">Hoje</button>
    </div>
  )
}

export default function RotasDoDia() {
  const sb = createClientComponentClient()
  const [hospitais, setHospitais] = useState<Hospital[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [motoristas, setMotoristas] = useState<Motorista[]>([])
  const [pacDB, setPacDB] = useState<Paciente[]>([])
  const [data, setData] = useState(()=>{ const d=new Date(); d.setDate(d.getDate()+1); return d.toISOString().split('T')[0] })
  const [rotas, setRotas] = useState<Rota[]>([])
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState('')
  const [despachoAberto, setDespachoAberto] = useState(false)
  const [analise, setAnalise] = useState<any[]>([])
  const [analisando, setAnalisando] = useState(false)
  const [modal, setModal] = useState<{rotaUid:string;pacUid:string;q:string}|null>(null)
  const [locModal, setLocModal] = useState<{ru:string;pu:string;q:string;res:any[];mode:'pickup'|'destino'}|null>(null)
  const [buscando, setBuscando] = useState(false)
  const [gmLoaded, setGmLoaded] = useState(false)
  const [locPick, setLocPick] = useState<{lat:number;lng:number}|null>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const [dragging, setDragging] = useState<{ru:string;pu:string}|null>(null)
  const [dragOver, setDragOver] = useState<{ru:string;pu:string}|null>(null)
  const [novoForm, setNovoForm] = useState<{nome:string;end:string;bairro:string;tel:string;recorrente:boolean;dias_semana:string[];prioridade:string}|null>(null)

  useEffect(() => {
    sb.from('hospitais').select('id,nome,cidade,lat,lng').order('nome').then(({data:d})=>setHospitais(d||[]))
    sb.from('veiculos').select('id,placa,modelo,capacidade').order('modelo').then(({data:d})=>setVeiculos(d||[]))
    sb.from('profiles').select('id,nome').eq('role','motorista').order('nome').then(({data:d})=>setMotoristas(d||[]))
    sb.from('pacientes').select('id,nome,endereco,bairro,lat,lng,lat_gestor,lng_gestor,prioridade').order('nome').then(({data:d})=>setPacDB(d||[]))
  }, [sb])

  useEffect(()=>{ if(!modal) setNovoForm(null) },[modal])

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
  },[locModal,gmLoaded])

  function addRota() {
    const m=motoristas[0], v=veiculos[0]
    setRotas(p=>[...p,{_uid:uid(),motorista_id:m?.id||'',motorista_nome:m?.nome||'',veiculo_id:v?.id||'',veiculo_modelo:v?.modelo||'',capacidade:v?.capacidade||0,pacs:[],tempo_min:null,saida:null}])
  }
  function setRota(u:string,patch:Partial<Rota>){setRotas(p=>p.map(r=>r._uid===u?{...r,...patch}:r))}
  function addPac(ru:string){setRotas(p=>p.map(r=>r._uid!==ru?r:{...r,pacs:[...r.pacs,{_uid:uid(),paciente_id:'',nome:'',acomp:0,localizacao:'',hospital_id:hospitais[0]?.id||'',horario:'08:00'}]}))}
  function setPac(ru:string,pu:string,patch:Partial<PacRota>){setRotas(p=>p.map(r=>r._uid!==ru?r:{...r,pacs:r.pacs.map(p=>p._uid!==pu?p:{...p,...patch})}))}
  function removePac(ru:string,pu:string){setRotas(p=>p.map(r=>r._uid!==ru?r:{...r,pacs:r.pacs.filter(p=>p._uid!==pu)}))}

  function otimizarOrdem(pacs:PacRota[]):PacRota[]{
    if(pacs.length<=1) return pacs
    const left=[...pacs];const result:PacRota[]=[]
    let prev=GARAGEM
    while(left.length>0){
      let bi=0,bd=Infinity
      left.forEach((p,i)=>{const l=p.lat_gestor&&p.lng_gestor?{lat:p.lat_gestor,lng:p.lng_gestor}:p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;const d=hav(prev.lat,prev.lng,l.lat,l.lng);if(d<bd){bd=d;bi=i}})
      const[picked]=left.splice(bi,1);result.push(picked)
      prev=picked.lat_gestor&&picked.lng_gestor?{lat:picked.lat_gestor,lng:picked.lng_gestor}:picked.lat&&picked.lng?{lat:picked.lat,lng:picked.lng}:GARAGEM
    }
    return result
  }

  function calcTempo(ru:string) {
    const rota=rotas.find(r=>r._uid===ru); if(!rota||!rota.pacs.length) return
    const pacs=otimizarOrdem(rota.pacs)
    let km=0,prev=GARAGEM
    for(const p of pacs){const pl=p.lat_gestor&&p.lng_gestor?{lat:p.lat_gestor,lng:p.lng_gestor}:p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;km+=hav(prev.lat,prev.lng,pl.lat,pl.lng);prev=pl}
    const h=hospitais.find(h=>h.id===pacs[0]?.hospital_id)
    km+=h?.lat&&h?.lng?hav(prev.lat,prev.lng,h.lat,h.lng):95
    const pickup=pacs.length*10
    const tempo=Math.ceil(km*1.6)+pickup
    const min=pacs.reduce((m,p)=>Math.min(m,timeToMin(p.horario)),Infinity)
    setRota(ru,{pacs,tempo_min:tempo,saida:min===Infinity?null:minToTime(min-tempo-15)})
  }

  function selPac(pac:Paciente) {
    if(!modal) return
    const loc=[pac.endereco,pac.bairro].filter(Boolean).join(', ')
    setPac(modal.rotaUid,modal.pacUid,{paciente_id:pac.id,nome:pac.nome,localizacao:loc,lat:pac.lat,lng:pac.lng,lat_gestor:pac.lat_gestor,lng_gestor:pac.lng_gestor,prioridade:(pac as any).prioridade})
    setModal(null)
  }

  async function buscarLoc(q:string) {
    if(q.length<3) return
    setBuscando(true)
    try {
      const r = await fetch('https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=br&q='+encodeURIComponent(q), {headers:{'Accept-Language':'pt-BR'}})
      const d = await r.json()
      setLocModal(m=>m?{...m,res:d}:null)
    } finally { setBuscando(false) }
  }

  function selLoc(r:any) {
    if(!locModal) return
    setPac(locModal.ru,locModal.pu,{localizacao:r.display_name.split(',').slice(0,2).join(',').trim(),lat:parseFloat(r.lat),lng:parseFloat(r.lon)})
    setLocModal(null)
  }

  function onDropOnPac(targetRu:string,targetPu:string){
    if(!dragging) return
    if(dragging.ru===targetRu&&dragging.pu===targetPu){setDragging(null);return}
    setRotas(prev=>{
      let moved:PacRota|undefined
      const step1=prev.map(r=>{
        if(r._uid!==dragging.ru) return r
        moved=r.pacs.find(p=>p._uid===dragging.pu)
        return{...r,pacs:r.pacs.filter(p=>p._uid!==dragging.pu)}
      })
      if(!moved) return prev
      return step1.map(r=>{
        if(r._uid!==targetRu) return r
        const pacs=[...r.pacs]
        const toIdx=pacs.findIndex(p=>p._uid===targetPu)
        pacs.splice(toIdx>=0?toIdx:pacs.length,0,moved!)
        return{...r,pacs}
      })
    })
    setDragging(null);setDragOver(null)
  }

  async function confirmarLoc(){
    if(!locModal||!locPick) return
    if(locModal.mode==='destino'){
      const qd=locModal.q||locPick.lat.toFixed(5)+', '+locPick.lng.toFixed(5)
      setPac(locModal.ru,locModal.pu,{destino_lat:locPick.lat,destino_lng:locPick.lng,destino_end:qd})
      setLocModal(null);setLocPick(null);return
    }
    const q=locModal.q||locPick.lat.toFixed(5)+', '+locPick.lng.toFixed(5)
    setPac(locModal.ru,locModal.pu,{localizacao:q,lat_gestor:locPick.lat,lng_gestor:locPick.lng})
    const rota=rotas.find(r=>r._uid===locModal.ru)
    const pac=rota?.pacs.find(p=>p._uid===locModal.pu)
    if(pac?.paciente_id){
      await sb.from('pacientes').update({lat_gestor:locPick.lat,lng_gestor:locPick.lng}).eq('id',pac.paciente_id)
    }
    setLocModal(null);setLocPick(null)
  }

  async function analisarDisponibilidade() {
    setAnalisando(true); setDespachoAberto(true)
    const { data: plans } = await sb.from('route_plans').select(`id,status,motorista_id,veiculo_id,profiles:motorista_id(nome),veiculos:veiculo_id(modelo,placa,capacidade),route_legs(id,horario_saida,est_outbound_min,leg_passengers(status))`).eq('data', data)
    const { data: allProf } = await sb.from('profiles').select('id,nome').eq('papel','motorista')
    const { data: allVeic } = await sb.from('veiculos').select('id,modelo,placa,capacidade')
    const now = new Date(); const results: any[] = []
    for (const plan of plans||[]) {
      const leg = (plan.route_legs as any[])?.[0]
      const pax = leg?.leg_passengers||[]; const total=pax.length
      const feitos=pax.filter((p:any)=>['liberado','outro_motorista','desistiu','ausente'].includes(p.status)).length
      const rest=total-feitos
      let minutosAte=0,statusDesc='',disponivel=false
      if(plan.status==='completed'){disponivel=true;statusDesc='Disponivel';minutosAte=0}
      else if(plan.status==='returning'){const mins=(leg?.est_outbound_min||60);minutosAte=Math.max(0,Math.round(mins*0.5-(now.getHours()*60+now.getMinutes()-(()=>{const[h,m]=(leg?.horario_saida||'06:00').split(':').map(Number);return h*60+m})())));statusDesc=`Retornando (~${minutosAte}min)`}
      else if(plan.status==='active'){const avg=(leg?.est_outbound_min||60)/Math.max(total,1);minutosAte=Math.round(rest*avg);statusDesc=`Em rota (${rest} restantes, ~${minutosAte}min)`}
      else{minutosAte=999;statusDesc='Programado'}
      const score=Math.max(0,100-minutosAte*2)
      results.push({motorista:(plan.profiles as any)?.nome||'?',veiculo:(plan.veiculos as any)?.modelo||'',placa:(plan.veiculos as any)?.placa||'',capacidade:(plan.veiculos as any)?.capacidade||0,status:plan.status,statusDesc,minutosAte,score,disponivel})
    }
    const usedM=new Set((plans||[]).map((p:any)=>p.motorista_id))
    const usedV=new Set((plans||[]).map((p:any)=>p.veiculo_id))
    for(const pr of allProf||[]){
      if(usedM.has(pr.id))continue
      const fv=(allVeic||[]).find((v:any)=>!usedV.has(v.id))
      results.push({motorista:pr.nome,veiculo:fv?.modelo||'—',placa:fv?.placa||'',capacidade:fv?.capacidade||0,status:'livre',statusDesc:'Sem rota — disponivel agora',minutosAte:0,score:100,disponivel:true})
      if(fv)usedV.add(fv.id)
    }
    results.sort((a,b)=>b.score-a.score)
    setAnalise(results); setAnalisando(false)
  }

  async function salvarNovoPac() {
    if(!modal||!novoForm||!novoForm.nome.trim()) return
    const{data:novo}=await sb.from('pacientes').insert({nome:novoForm.nome.trim(),endereco:novoForm.end.trim()||null,bairro:novoForm.bairro.trim()||null,telefone:novoForm.tel.trim()||null,recorrente:novoForm.recorrente,dias_semana:novoForm.dias_semana,prioridade:novoForm.prioridade}).select('id,nome,endereco,bairro,lat,lng').single()
    if(!novo) return
    setPacDB(p=>[...p,novo])
    selPac(novo)
    setNovoForm(null)
  }  const [pacientesFixos, setPacientesFixos] = useState<any[]>([])
  const [fixosAberto, setFixosAberto] = useState(true)
  const loadedDate=useRef('');useEffect(()=>{
    if(!motoristas.length||!veiculos.length)return
    if(loadedDate.current===data)return
    async function load(){
      const{data:plans}=await sb.from('route_plans').select('id,motorista_id,veiculo_id,route_legs(id,hospital_id,horario_saida,est_outbound_min,leg_passengers(paciente_id,ordem,pacientes(id,nome,endereco,bairro,lat,lng,lat_gestor,lng_gestor)))').eq('data',data)
      if(!plans?.length){setRotas([]);return}
      setRotas(plans.map((plan:any)=>{
        const mot=motoristas.find(m=>m.id===plan.motorista_id)
        const vei=veiculos.find(v=>v.id===plan.veiculo_id)
        const leg=(plan.route_legs||[])[0]
        const pacs:PacRota[]=((leg?.leg_passengers||[])).sort((a:any,b:any)=>a.ordem-b.ordem).map((lp:any)=>{
          const p=lp.pacientes||{}
          return{_uid:crypto.randomUUID(),paciente_id:p.id||lp.paciente_id,nome:p.nome||'',acomp:0,localizacao:p.bairro||p.endereco||'',lat:p.lat??null,lng:p.lng??null,lat_gestor:p.lat_gestor??null,lng_gestor:p.lng_gestor??null,hospital_id:leg?.hospital_id||'',horario:'08:00'}
        })
        return{_uid:crypto.randomUUID(),motorista_id:plan.motorista_id||'',motorista_nome:mot?.nome||'',veiculo_id:plan.veiculo_id||'',veiculo_modelo:vei?.modelo||'',capacidade:vei?.capacidade||0,pacs,tempo_min:leg?.est_outbound_min??null,saida:leg?.horario_saida?.slice(0,5)??null}
      }))
    }
    load();loadedDate.current=data
  },[data,motoristas,veiculos])
  // Carregar pacientes recorrentes
  useEffect(() => {
    sb.from('pacientes').select('id,nome,bairro,dias_semana').eq('recorrente', true).order('nome').then(({ data }) => {
      if (data) setPacientesFixos((data as any[]).filter((p:any) => (p.dias_semana||[]).length > 0))
    })
  }, [sb])
  

  async function salvar() {
    setSalvando(true); let ok=0
    await sb.from('route_plans').delete().eq('data',data)
    for(const rota of rotas) {
      if(!rota.motorista_id||!rota.veiculo_id||!rota.pacs.length) continue
      const{data:plan,error:e1}=await sb.from('route_plans').insert({data,motorista_id:rota.motorista_id,veiculo_id:rota.veiculo_id,status:'draft',codigo:'TFD-'+data.replace(/-/g,'')+'-'+Math.random().toString(36).toUpperCase().slice(2,6)}).select('id').single()
      if(e1){console.error('route_plans error:',e1);continue}
      if(!plan) continue
      const{data:leg}=await sb.from('route_legs').insert({plan_id:plan.id,hospital_id:rota.pacs[0]?.hospital_id,horario_saida:rota.saida||'06:00',ordem:1,status:'aguardando',est_outbound_min:rota.tempo_min}).select('id').single()
      if(!leg) continue
      for(let i=0;i<rota.pacs.length;i++){const p=rota.pacs[i];if(p.paciente_id)await sb.from('leg_passengers').insert({leg_id:leg.id,paciente_id:p.paciente_id,ordem:i+1,status:'aguardando',...(p.destino_lat?{destino_lat:p.destino_lat,destino_lng:p.destino_lng,destino_end:p.destino_end}:{})})}
      ok++
    }
    setSalvando(false); setMsg('Salvo: '+String(ok)+' rota(s)!'); setTimeout(()=>setMsg(''),4000)
  }

  const resultados = modal && modal.q.length>=2 ? pacDB.filter(p=>p.nome.toLowerCase().includes(modal.q.toLowerCase())).slice(0,8) : []

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">🗺️ Rotas do Dia</h1>
        <div className="flex gap-3 items-center">
          <DateCarousel data={data} onChange={setData} />
          {rotas.length>0&&<button onClick={salvar} disabled={salvando} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">{salvando?'Salvando...':'💾 Salvar rotas'}</button>}<button onClick={analisarDisponibilidade} className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700">🤖 Despacho</button>
        </div>
      </div>
      {msg&&<div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">{msg}</div>}
      {rotas.map(rota=>{
        const total=rota.pacs.reduce((s,p)=>s+1+p.acomp,0)
        return(
        <div key={rota._uid} className="border border-gray-200 rounded-xl overflow-hidden shadow">
          <div className="flex min-h-[140px]">
            <div className="bg-gray-900 text-white p-4 w-52 flex-shrink-0 flex flex-col justify-between">
              <div>
                <div className="text-4xl font-bold font-mono">{rota.saida||'--:--'}</div>
                <div className="text-xs text-gray-400">saida da garagem</div>
                {rota.tempo_min&&<div className="text-xs text-blue-300 mt-1">⏱ ~{rota.tempo_min} min</div>}
              </div>
              <div className="space-y-1.5 mt-3">
                <select value={rota.motorista_id} onChange={e=>{const m=motoristas.find(m=>m.id===e.target.value);setRota(rota._uid,{motorista_id:e.target.value,motorista_nome:m?.nome||''})}} className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5">
                  <option value="">-- Motorista --</option>
                  {motoristas.map(m=><option key={m.id} value={m.id}>{m.nome}</option>)}
                </select>
                <select value={rota.veiculo_id} onChange={e=>{const v=veiculos.find(v=>v.id===e.target.value);setRota(rota._uid,{veiculo_id:e.target.value,veiculo_modelo:v?.modelo||'',capacidade:v?.capacidade||0})}} className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5">
                  <option value="">-- Veiculo --</option>
                  {veiculos.map(v=><option key={v.id} value={v.id}>{v.modelo} ({v.capacidade}p)</option>)}
                </select>
                <div className="text-xs text-gray-300">👥 {total}/{rota.capacidade} pessoas</div>
              </div>
            </div>
            <div className="flex-1 bg-gray-50 p-4">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {rota.pacs.map(pac=>(
                  <div key={pac._uid} draggable onDragStart={()=>setDragging({ru:rota._uid,pu:pac._uid})} onDragOver={e=>{e.preventDefault();setDragOver({ru:rota._uid,pu:pac._uid})}} onDrop={e=>{e.preventDefault();onDropOnPac(rota._uid,pac._uid)}} onDragEnd={()=>{setDragging(null);setDragOver(null)}} className={`bg-white rounded-xl border p-3 min-w-[170px] w-44 flex-shrink-0 space-y-2 text-xs cursor-grab transition-opacity ${dragOver?.pu===pac._uid&&dragging?.pu!==pac._uid?"border-blue-400 border-2":"border-gray-200"} ${dragging?.pu===pac._uid?"opacity-40":""}`}>
                    <button onClick={()=>setModal({rotaUid:rota._uid,pacUid:pac._uid,q:pac.nome})} className="w-full text-left font-semibold text-gray-800 hover:text-blue-600 truncate">{pac.nome||'👤 Paciente'}</button>
                    <div className="flex items-center gap-1"><span className="text-red-500">Acomp:</span><input type="number" min="0" max="9" value={pac.acomp} onChange={e=>setPac(rota._uid,pac._uid,{acomp:parseInt(e.target.value)||0})} className="w-10 border rounded px-1 text-center"/></div>
                    <p className="text-[10px] text-gray-400 mb-0.5">Local do paciente</p><div className="flex gap-1"><input value={pac.localizacao} placeholder="📍 Localizacao" onChange={e=>setPac(rota._uid,pac._uid,{localizacao:e.target.value})} className="flex-1 min-w-0 border rounded px-1.5 py-1"/><button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.localizacao,res:[],mode:'pickup'})} className="hover:opacity-80 px-1" title="Buscar no mapa"><img src="/icone-google-maps.webp.png" className="w-5 h-5" alt="Maps"/></button></div>
                    {pac.lat_gestor&&pac.lng_gestor&&(<div className="bg-blue-50 border border-blue-200 rounded px-1.5 py-1 text-xs text-blue-700 flex items-center justify-between gap-1"><span>Loc. salva pelo gestor</span><span className="font-mono opacity-70">{pac.lat_gestor?.toFixed(4)}, {pac.lng_gestor?.toFixed(4)}</span></div>)}{pac.lat&&pac.lng&&(<div className="bg-green-50 border border-green-200 rounded px-1.5 py-1 text-xs text-green-700 flex items-center justify-between gap-1"><span>Loc. salva pelo motorista</span><span className="font-mono opacity-70">{pac.lat?.toFixed(4)}, {pac.lng?.toFixed(4)}</span></div>)}<p className="text-[10px] text-gray-400 mt-2 mb-0.5">Destino</p><div className="flex items-center gap-1 w-full overflow-hidden"><select value={pac.hospital_id} onChange={e=>setPac(rota._uid,pac._uid,{hospital_id:e.target.value})} className="min-w-0 flex-1 border rounded px-1 py-1 truncate">
                      <option value="">-- Hospital --</option>
                      {hospitais.map(h=><option key={h.id} value={h.id}>{h.nome}</option>)}
                    </select><button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.destino_end||'',res:[],mode:'destino'})} className="hover:opacity-80 px-1" title="Buscar destino no mapa"><img src="/icone-google-maps.webp.png" className="w-5 h-5" alt="Maps"/></button></div>
                    
                    <p className="text-[10px] text-gray-400 mt-2 mb-0.5">Horário de consulta</p><input type="time" value={pac.horario} onChange={e=>setPac(rota._uid,pac._uid,{horario:e.target.value})} className="w-full border rounded px-1 py-1"/>{pac.prioridade&&<div className={"mt-1 inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full "+(pac.prioridade==="alta"?"bg-red-100 text-red-700":pac.prioridade==="baixa"?"bg-green-100 text-green-700":"bg-yellow-100 text-yellow-700")}>Prioridade: {pac.prioridade.charAt(0).toUpperCase()+pac.prioridade.slice(1)}</div>}
                    <button onClick={()=>removePac(rota._uid,pac._uid)} className="text-red-400 hover:text-red-600 w-full text-right">✕ remover</button>
                  </div>
                ))}
                <button onClick={()=>addPac(rota._uid)} className="min-w-[44px] w-11 border-2 border-dashed border-gray-300 rounded-xl text-gray-400 hover:border-blue-400 hover:text-blue-500 text-2xl flex items-center justify-center flex-shrink-0">+</button>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={()=>calcTempo(rota._uid)} disabled={!rota.pacs.length} className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-40">⏱ Calcular tempo de rota</button>
                <button onClick={()=>setRotas(p=>p.filter(r=>r._uid!==rota._uid))} className="text-xs text-gray-400 hover:text-red-500 px-2">🗑 Remover rota</button>
              </div>
            </div>
          </div>
        </div>
      )})}
      {(()=>{const _ds=new Date(data+'T12:00:00');const _di=_ds.getDay();const _dn=['dom','seg','ter','qua','qui','sex','sab'][_di];const _fx=pacientesFixos.filter((p:any)=>(p.dias_semana||[]).includes(_dn));return _fx.length>0&&(
        <div className="fixed right-3 top-20 w-56 max-h-[calc(100vh-5.5rem)] overflow-y-auto z-20 shadow-xl">
          <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden">
            <button onClick={() => setFixosAberto(v => !v)}
              className="w-full flex items-center justify-between px-3 py-2.5 bg-amber-50 hover:bg-amber-100">
              <div className="flex items-center gap-1.5">
                <span className="text-amber-600 font-bold text-xs">★ Recorrentes</span>
                <span className="text-[10px] bg-amber-200 text-amber-700 rounded-full px-1.5">{pacientesFixos.length}</span>
              </div>
              <span className="text-amber-400 text-[10px]">{fixosAberto ? '▲' : '▼'}</span>
            </button>
            {fixosAberto && (
              <div className="divide-y divide-amber-50 max-h-96 overflow-y-auto">
                {_fx.map((p:any) => {
                  const jaIncluido = rotas.some((r:any) => r.pacs.some((pp:any) => pp.paciente_id === p.id))
                  const hojeIdx = new Date().getDay()
                  const dias: string[] = p.dias_semana || []
                  const dMap: Record<string,number> = {dom:0,seg:1,ter:2,qua:3,qui:4,sex:5,sab:6}
                  return (
                    <div key={p.id} className="px-3 py-2">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <p className="font-semibold text-gray-800 text-[11px] leading-tight truncate">{p.nome}</p>
                        {jaIncluido
                          ? <span className="shrink-0 text-[9px] text-green-600 bg-green-50 border border-green-200 px-1 rounded-full">✓ ok</span>
                          : <span className="shrink-0 text-[9px] text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded-full">falta</span>}
                      </div>
                      <div className="flex gap-0.5">
                        {['dom','seg','ter','qua','qui','sex','sab'].map((d:string) => (
                          <span key={d} className={'text-[8px] px-0.5 py-0.5 rounded font-bold uppercase '+(dias.includes(d)&&dMap[d]===hojeIdx?'bg-blue-600 text-white':dias.includes(d)?'bg-amber-100 text-amber-700':'text-gray-200')}>
                            {d.charAt(0)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )})()}
      <button onClick={addRota} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 font-semibold text-sm">+ Adicionar nova rota</button>
      {locModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>{setLocModal(null);setLocPick(null)}}>
          <div className="bg-white rounded-2xl shadow-xl p-4 w-full max-w-2xl" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-3">&#128205; Localizar paciente</h3>
            <input id="gmap-search" autoFocus defaultValue={locModal.q} placeholder="Buscar endereco no Google Maps..." className="w-full border rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-300"/>
            {!gmLoaded&&<div style={{height:'300px'}} className="flex items-center justify-center text-gray-400 text-sm border rounded-xl">Carregando mapa...</div>}
            {gmLoaded&&<div id="gmap-loc" style={{height:'300px',width:'100%',borderRadius:'12px'}}/>}
            <div className="flex gap-2 mt-3 items-center">
              {locPick&&<span className="text-xs text-gray-500 flex-1">&#128205; {locPick.lat.toFixed(5)}, {locPick.lng.toFixed(5)}</span>}
              <button onClick={()=>{setLocModal(null);setLocPick(null)}} className="px-4 py-2 rounded-lg border text-sm">Cancelar</button>
              <button onClick={confirmarLoc} disabled={!locPick} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 disabled:opacity-40">Confirmar localizacao</button>
            </div>
          </div>
        </div>
      )}
      {modal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-3">🔍 Buscar paciente</h3>
            <input autoFocus value={modal.q} onChange={e=>setModal(m=>m?{...m,q:e.target.value}:null)} placeholder="Digite o nome..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
            <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
              {resultados.map(p=>(
                <button key={p.id} onClick={()=>selPac(p)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm">
                  <div className="font-medium">{p.nome}</div>
                  {(p.endereco||p.bairro)&&<div className="text-xs text-gray-400">{[p.endereco,p.bairro].filter(Boolean).join(', ')}</div>}
                </button>
              ))}
              {modal.q.length>=2&&!resultados.length&&<p className="text-sm text-gray-400 px-3 py-2">Nenhum paciente encontrado.</p>}
              {!novoForm&&<button onClick={()=>setNovoForm({nome:modal.q,end:'',bairro:'',tel:'',recorrente:false,dias_semana:[],prioridade:'media'})} className="w-full text-left px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 font-semibold border-t mt-1">+ Adicionar novo paciente</button>}
              {novoForm&&(<div className="border-t pt-3 mt-1 space-y-2 px-1"><p className="text-xs font-bold text-gray-600 mb-1">Novo paciente</p><input value={novoForm.nome} onChange={e=>setNovoForm(f=>f?{...f,nome:e.target.value}:null)} placeholder="Nome completo *" className="w-full border rounded px-2 py-1.5 text-sm"/><input value={novoForm.end} onChange={e=>setNovoForm(f=>f?{...f,end:e.target.value}:null)} placeholder="Endereco" className="w-full border rounded px-2 py-1.5 text-sm"/><input value={novoForm.bairro} onChange={e=>setNovoForm(f=>f?{...f,bairro:e.target.value}:null)} placeholder="Bairro" className="w-full border rounded px-2 py-1.5 text-sm"/><input value={novoForm.tel} onChange={e=>setNovoForm(f=>f?{...f,tel:e.target.value}:null)} placeholder="Telefone" className="w-full border rounded px-2 py-1.5 text-sm"/><div className="border-t pt-2 mt-1"><div className="mb-2"><p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Prioridade</p><div className="flex gap-1">{(["alta","media","baixa"]).map(pv=><button key={pv} type="button" onClick={()=>setNovoForm(f=>f?{...f,prioridade:pv}:null)} className={"px-2 py-0.5 rounded-full text-[10px] font-bold border transition "+(novoForm.prioridade===pv?(pv==="alta"?"bg-red-100 border-red-400 text-red-700":pv==="media"?"bg-yellow-100 border-yellow-400 text-yellow-700":"bg-green-100 border-green-400 text-green-700"):"border-gray-300 text-gray-400")}>{pv.charAt(0).toUpperCase()+pv.slice(1)}</button>)}</div></div><div className="flex items-center justify-between mb-1"><span className="text-[10px] font-bold text-gray-500 uppercase">★ Recorrente</span><div onClick={()=>setNovoForm(f=>f?{...f,recorrente:!f.recorrente}:null)} className={'relative w-8 h-4 rounded-full cursor-pointer '+(novoForm.recorrente?'bg-blue-600':'bg-gray-300')}><div className={'absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform '+(novoForm.recorrente?'translate-x-4':'')} /></div></div>{novoForm.recorrente&&(<div className="flex gap-1 flex-wrap mb-2">{['dom','seg','ter','qua','qui','sex','sab'].map(d=>{const a=novoForm.dias_semana.includes(d);return(<button key={d} type="button" onClick={()=>setNovoForm(f=>f?{...f,dias_semana:a?f.dias_semana.filter(x=>x!==d):[...f.dias_semana,d]}:null)} className={'px-1.5 py-0.5 rounded text-[10px] font-bold uppercase '+(a?'bg-blue-600 text-white':'bg-gray-100 text-gray-400')}>{d}</button>)})}</div>)}</div><div className="flex gap-2"><button onClick={salvarNovoPac} className="flex-1 bg-blue-600 text-white py-1.5 rounded text-sm hover:bg-blue-700">Salvar</button><button onClick={()=>setNovoForm(null)} className="px-3 py-1.5 rounded text-sm border hover:bg-gray-50">Cancelar</button></div></div>)}
            </div>
          </div>
        </div>
      )}
      {despachoAberto&&(
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setDespachoAberto(false)}/>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-purple-700 text-white px-4 py-3 flex items-center justify-between">
              <div><p className="font-bold text-lg">🤖 Despacho Inteligente</p><p className="text-xs text-purple-200">Disponibilidade de motoristas — {data}</p></div>
              <button onClick={()=>setDespachoAberto(false)} className="text-white hover:text-purple-200 text-xl font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {analisando&&<div className="text-center text-purple-600 py-8">Analisando rotas...</div>}
              {!analisando&&analise.length===0&&<div className="text-center text-gray-400 py-8">Nenhum dado encontrado</div>}
              {analise.map((a,i)=>(
                <div key={i} className={"rounded-xl border p-3 "+(a.disponivel?'border-green-300 bg-green-50':a.minutosAte<30?'border-yellow-300 bg-yellow-50':'border-red-200 bg-red-50')}>
                  <div className="flex items-center justify-between mb-1">
                    <div><p className="font-bold text-sm text-gray-800">{a.motorista}</p><p className="text-xs text-gray-500">{a.veiculo} · {a.placa} · {a.capacidade}p</p></div>
                    <div className="text-right"><span className={"text-xs font-bold px-2 py-0.5 rounded-full "+(a.disponivel?'bg-green-600 text-white':a.minutosAte<30?'bg-yellow-500 text-white':'bg-red-500 text-white')}>{a.disponivel?'Disponível':a.minutosAte+'min'}</span><p className="text-xs text-gray-500 mt-1">Score: {a.score}</p></div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full bg-purple-500" style={{width:a.score+'%'}}/></div>
                  <p className="text-xs text-gray-500 mt-1">{a.statusDesc}</p>
                  {i===0&&<p className="text-xs font-bold text-purple-700 mt-1">⭐ Melhor opção</p>}
                </div>
              ))}
            </div>
            <div className="border-t p-3"><button onClick={analisarDisponibilidade} className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700">🔄 Atualizar análise</button></div>
          </div>
        </div>
      )}
      {despachoAberto&&(
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={()=>setDespachoAberto(false)}/>
          <div className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col overflow-hidden">
            <div className="bg-purple-700 text-white px-4 py-3 flex items-center justify-between">
              <div><p className="font-bold text-lg">🤖 Despacho Inteligente</p><p className="text-xs text-purple-200">Disponibilidade de motoristas — {data}</p></div>
              <button onClick={()=>setDespachoAberto(false)} className="text-white hover:text-purple-200 text-xl font-bold">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {analisando&&<div className="text-center text-purple-600 py-8">Analisando rotas...</div>}
              {!analisando&&analise.length===0&&<div className="text-center text-gray-400 py-8">Nenhum dado encontrado</div>}
              {analise.map((a,i)=>(
                <div key={i} className={"rounded-xl border p-3 "+(a.disponivel?'border-green-300 bg-green-50':a.minutosAte<30?'border-yellow-300 bg-yellow-50':'border-red-200 bg-red-50')}>
                  <div className="flex items-center justify-between mb-1">
                    <div><p className="font-bold text-sm text-gray-800">{a.motorista}</p><p className="text-xs text-gray-500">{a.veiculo} · {a.placa} · {a.capacidade}p</p></div>
                    <div className="text-right"><span className={"text-xs font-bold px-2 py-0.5 rounded-full "+(a.disponivel?'bg-green-600 text-white':a.minutosAte<30?'bg-yellow-500 text-white':'bg-red-500 text-white')}>{a.disponivel?'Disponível':a.minutosAte+'min'}</span><p className="text-xs text-gray-500 mt-1">Score: {a.score}</p></div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1"><div className="h-1.5 rounded-full bg-purple-500" style={{width:a.score+'%'}}/></div>
                  <p className="text-xs text-gray-500 mt-1">{a.statusDesc}</p>
                  {i===0&&<p className="text-xs font-bold text-purple-700 mt-1">⭐ Melhor opção</p>}
                </div>
              ))}
            </div>
            <div className="border-t p-3"><button onClick={analisarDisponibilidade} className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-purple-700">🔄 Atualizar análise</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
