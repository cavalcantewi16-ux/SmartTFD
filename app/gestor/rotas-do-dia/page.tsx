'use client'
import { useState, useEffect } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const GARAGEM = { lat: -7.4746, lng: -36.1365 }

interface Paciente { id:string; nome:string; endereco?:string; bairro?:string; lat?:number|null; lng?:number|null }
interface Hospital { id:string; nome:string; cidade?:string; lat?:number|null; lng?:number|null }
interface Veiculo { id:string; placa:string; modelo:string; capacidade:number }
interface Motorista { id:string; nome:string }
interface PacRota { _uid:string; paciente_id:string; nome:string; acomp:number; localizacao:string; lat?:number|null; lng?:number|null; hospital_id:string; horario:string }
interface Rota { _uid:string; motorista_id:string; motorista_nome:string; veiculo_id:string; veiculo_modelo:string; capacidade:number; pacs:PacRota[]; tempo_min:number|null; saida:string|null }

function uid() { return crypto.randomUUID() }
function hav(a1:number,g1:number,a2:number,g2:number){const R=6371,dA=(a2-a1)*Math.PI/180,dG=(g2-g1)*Math.PI/180,x=Math.sin(dA/2)**2+Math.cos(a1*Math.PI/180)*Math.cos(a2*Math.PI/180)*Math.sin(dG/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))}
function minToTime(m:number){const t=Math.max(0,m);return String(Math.floor(t/60)%24).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}
function timeToMin(t:string){const[h,m]=t.split(':').map(Number);return h*60+m}

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
  const [modal, setModal] = useState<{rotaUid:string;pacUid:string;q:string}|null>(null)
  const [locModal, setLocModal] = useState<{ru:string;pu:string;q:string;res:any[]}|null>(null)
  const [buscando, setBuscando] = useState(false)

  useEffect(() => {
    sb.from('hospitais').select('id,nome,cidade,lat,lng').order('nome').then(({data:d})=>setHospitais(d||[]))
    sb.from('veiculos').select('id,placa,modelo,capacidade').order('modelo').then(({data:d})=>setVeiculos(d||[]))
    sb.from('profiles').select('id,nome').eq('role','motorista').order('nome').then(({data:d})=>setMotoristas(d||[]))
    sb.from('pacientes').select('id,nome,endereco,bairro,lat,lng').order('nome').then(({data:d})=>setPacDB(d||[]))
  }, [sb])

  function addRota() {
    const m=motoristas[0], v=veiculos[0]
    setRotas(p=>[...p,{_uid:uid(),motorista_id:m?.id||'',motorista_nome:m?.nome||'',veiculo_id:v?.id||'',veiculo_modelo:v?.modelo||'',capacidade:v?.capacidade||0,pacs:[],tempo_min:null,saida:null}])
  }
  function setRota(u:string,patch:Partial<Rota>){setRotas(p=>p.map(r=>r._uid===u?{...r,...patch}:r))}
  function addPac(ru:string){setRotas(p=>p.map(r=>r._uid!==ru?r:{...r,pacs:[...r.pacs,{_uid:uid(),paciente_id:'',nome:'',acomp:0,localizacao:'',hospital_id:hospitais[0]?.id||'',horario:'08:00'}]}))}
  function setPac(ru:string,pu:string,patch:Partial<PacRota>){setRotas(p=>p.map(r=>r._uid!==ru?r:{...r,pacs:r.pacs.map(p=>p._uid!==pu?p:{...p,...patch})}))}
  function removePac(ru:string,pu:string){setRotas(p=>p.map(r=>r._uid!==ru?r:{...r,pacs:r.pacs.filter(p=>p._uid!==pu)}))}

  function calcTempo(ru:string) {
    const rota=rotas.find(r=>r._uid===ru); if(!rota||!rota.pacs.length) return
    let km=0,prev=GARAGEM
    for(const p of rota.pacs){const pl=p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;km+=hav(prev.lat,prev.lng,pl.lat,pl.lng);prev=pl}
    const h=hospitais.find(h=>h.id===rota.pacs[0]?.hospital_id)
    km+=h?.lat&&h?.lng?hav(prev.lat,prev.lng,h.lat,h.lng):95
    const pickup=rota.pacs.length*10
    const tempo=Math.ceil(km*1.6)+pickup
    const min=rota.pacs.reduce((m,p)=>Math.min(m,timeToMin(p.horario)),Infinity)
    setRota(ru,{tempo_min:tempo,saida:min===Infinity?null:minToTime(min-tempo-15)})
  }

  function selPac(pac:Paciente) {
    if(!modal) return
    const loc=[pac.endereco,pac.bairro].filter(Boolean).join(', ')
    setPac(modal.rotaUid,modal.pacUid,{paciente_id:pac.id,nome:pac.nome,localizacao:loc,lat:pac.lat,lng:pac.lng})
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

  async function salvar() {
    setSalvando(true); let ok=0
    for(const rota of rotas) {
      if(!rota.motorista_id||!rota.veiculo_id||!rota.pacs.length) continue
      const{data:plan}=await sb.from('route_plans').insert({data,motorista_id:rota.motorista_id,veiculo_id:rota.veiculo_id,status:'draft'}).select('id').single()
      if(!plan) continue
      const{data:leg}=await sb.from('route_legs').insert({route_plan_id:plan.id,hospital_id:rota.pacs[0]?.hospital_id,horario_saida:rota.saida||'06:00',ordem:1,status:'aguardando',est_outbound_min:rota.tempo_min}).select('id').single()
      if(!leg) continue
      for(let i=0;i<rota.pacs.length;i++){const p=rota.pacs[i];if(p.paciente_id)await sb.from('leg_passengers').insert({leg_id:leg.id,paciente_id:p.paciente_id,ordem:i+1,status:'aguardando'})}
      ok++
    }
    setSalvando(false); setMsg(`✅ ${ok} rota(s) salva(s)!`); setTimeout(()=>setMsg(''),4000)
  }

  const resultados = modal && modal.q.length>=2 ? pacDB.filter(p=>p.nome.toLowerCase().includes(modal.q.toLowerCase())).slice(0,8) : []

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">🗺️ Rotas do Dia</h1>
        <div className="flex gap-3 items-center">
          <input type="date" value={data} onChange={e=>setData(e.target.value)} className="border rounded-lg px-3 py-2 text-sm"/>
          {rotas.length>0&&<button onClick={salvar} disabled={salvando} className="bg-green-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-green-700 disabled:opacity-50">{salvando?'Salvando...':'💾 Salvar rotas'}</button>}
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
                  <div key={pac._uid} className="bg-white rounded-xl border border-gray-200 p-3 min-w-[170px] w-44 flex-shrink-0 space-y-2 text-xs">
                    <button onClick={()=>setModal({rotaUid:rota._uid,pacUid:pac._uid,q:pac.nome})} className="w-full text-left font-semibold text-gray-800 hover:text-blue-600 truncate">{pac.nome||'👤 Paciente'}</button>
                    <div className="flex items-center gap-1"><span className="text-red-500">Acomp:</span><input type="number" min="0" max="9" value={pac.acomp} onChange={e=>setPac(rota._uid,pac._uid,{acomp:parseInt(e.target.value)||0})} className="w-10 border rounded px-1 text-center"/></div>
                    <div className="flex gap-1"><input value={pac.localizacao} placeholder="📍 Localizacao" onChange={e=>setPac(rota._uid,pac._uid,{localizacao:e.target.value})} className="flex-1 min-w-0 border rounded px-1.5 py-1"/><button onClick={()=>setLocModal({ru:rota._uid,pu:pac._uid,q:pac.localizacao,res:[]})} className="text-blue-500 hover:text-blue-700 text-base px-1" title="Buscar no mapa">&#128205;</button></div>
                    <select value={pac.hospital_id} onChange={e=>setPac(rota._uid,pac._uid,{hospital_id:e.target.value})} className="w-full border rounded px-1 py-1">
                      <option value="">-- Hospital --</option>
                      {hospitais.map(h=><option key={h.id} value={h.id}>{h.nome}</option>)}
                    </select>
                    <input type="time" value={pac.horario} onChange={e=>setPac(rota._uid,pac._uid,{horario:e.target.value})} className="w-full border rounded px-1 py-1"/>
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
      <button onClick={addRota} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 font-semibold text-sm">+ Adicionar nova rota</button>
      {locModal&&(
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={()=>setLocModal(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-5 w-full max-w-md" onClick={e=>e.stopPropagation()}>
            <h3 className="font-bold text-gray-800 mb-3">&#128205; Buscar localização</h3>
            <div className="flex gap-2">
              <input autoFocus value={locModal.q} onChange={e=>setLocModal(m=>m?{...m,q:e.target.value}:null)} onKeyDown={e=>e.key==='Enter'&&buscarLoc(locModal.q)} placeholder="Ex: Rua das Flores, Boqueirão PB" className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"/>
              <button onClick={()=>buscarLoc(locModal.q)} disabled={buscando} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">{buscando?'...':'Buscar'}</button>
            </div>
            <div className="mt-2 space-y-1 max-h-64 overflow-y-auto">
              {locModal.res.map((r:any,i:number)=>(
                <button key={i} onClick={()=>selLoc(r)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-blue-50 text-sm border-b border-gray-100">
                  <div className="font-medium text-gray-800 truncate">{r.display_name.split(',').slice(0,3).join(',')}</div>
                  <div className="text-xs text-gray-400">{r.lat}, {r.lon}</div>
                </button>
              ))}
              {locModal.res.length===0&&locModal.q.length>=3&&!buscando&&<p className="text-sm text-gray-400 px-3 py-2">Clique em Buscar para pesquisar.</p>}
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
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
