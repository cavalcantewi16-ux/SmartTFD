content = r"""'use client'
import{useEffect,useState,useCallback,useRef}from'react'
import{createClientComponentClient}from'@supabase/auth-helpers-nextjs'
import{useRouter}from'next/navigation'
interface Paciente{id:string;nome:string;endereco?:string;bairro?:string;lat?:number;lng?:number}
interface Passenger{id:string;paciente:Paciente;ordem:number;status:string;est_pickup_at?:string}
interface Hospital{id:string;nome:string;cidade?:string;lat?:number;lng?:number}
interface Leg{id:string;hospital:Hospital;horario_saida:string;ordem:number;status:string;passengers:Passenger[];est_departure_at?:string;est_outbound_min?:number;est_return_min?:number}
interface Plan{id:string;data:string;status:string;veiculo:{id:string;placa:string;modelo?:string;capacidade?:number};motorista:{id:string;nome:string};legs:Leg[]}
const TZ='America/Sao_Paulo'
function fmtHora(iso?:string|null,fb?:string){if(iso)return new Date(iso).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit',timeZone:TZ});if(fb)return fb.substring(0,5);return'--:--'}
function mapsUrl(p:Paciente){if(p.lat&&p.lng)return`https://www.google.com/maps?q=${p.lat},${p.lng}`;const a=[p.endereco,p.bairro].filter(Boolean).join(', ');return a?`https://www.google.com/maps/search/${encodeURIComponent(a)}`:'#'}
function Countdown({targetIso}:{targetIso:string}){
  const[diff,setDiff]=useState(0)
  useEffect(()=>{const t=new Date(targetIso).getTime();const tick=()=>setDiff(Math.max(0,Math.floor((t-Date.now())/1000)));tick();const id=setInterval(tick,1000);return()=>clearInterval(id)},[targetIso])
  if(diff<=0)return<span className="text-green-400 font-bold text-3xl animate-pulse">Hora de sair!</span>
  const h=Math.floor(diff/3600),m=Math.floor((diff%3600)/60),s=diff%60
  return<span className="font-mono font-bold text-4xl text-blue-300 tracking-widest">{h>0&&`${h}:`}{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
}
const STATUS_CONFIG:Record<string,{label:string;color:string;bg:string}> = {
  aguardando:{label:'Aguardando',color:'text-yellow-400',bg:'bg-yellow-400/10 border-yellow-400/30'},
  embarcou:{label:'Embarcou',color:'text-green-400',bg:'bg-green-400/10 border-green-400/30'},
  liberado:{label:'Liberado',color:'text-blue-400',bg:'bg-blue-400/10 border-blue-400/30'},
  outro_motorista:{label:'Outro Motorista',color:'text-orange-400',bg:'bg-orange-400/10 border-orange-400/30'},
  desistiu:{label:'Desistiu',color:'text-red-400',bg:'bg-red-400/10 border-red-400/30'},
  ausente:{label:'Ausente',color:'text-gray-400',bg:'bg-gray-400/10 border-gray-400/30'},
}
export default function MotoristaPage(){
  const sb=createClientComponentClient()
  const router=useRouter()
  const[user,setUser]=useState<any>(null)
  const[nomePerfil,setNomePerfil]=useState('')
  const[plan,setPlan]=useState<Plan|null>(null)
  const[loading,setLoading]=useState(true)
  const[gpsAtivo,setGpsAtivo]=useState(false)
  const[atualizando,setAtualizando]=useState<Record<string,boolean>>({})
  const[ultimoCmd,setUltimoCmd]=useState<{passId:string;statusAnt:string}|null>(null)
  const[salvandoLoc,setSalvandoLoc]=useState<Record<string,boolean>>({})
  const[modalProblema,setModalProblema]=useState(false)
  const[formProblema,setFormProblema]=useState({tipo:'outro',urgencia:'normal',descricao:''})
  const[enviandoProbl,setEnviandoProbl]=useState(false)
  const posAtual=useRef<GeolocationPosition|null>(null)
  const carregar=useCallback(async(uid?:string)=>{
    const userId=uid||user?.id
    if(!userId){setLoading(false);return}
    const d=new Date();const hoje=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')
    let data:any=null
    try{
      const{data:d2}=await sb.from('route_plans').select(`id,data,status,veiculo:veiculos(id,placa,modelo,capacidade),motorista:profiles(id,nome),route_legs(id,horario_saida,ordem,status,est_departure_at,est_hospital_at,est_return_at,est_outbound_min,est_return_min,hospital:hospitais(id,nome,cidade,lat,lng),leg_passengers(id,ordem,status,est_pickup_at,paciente:pacientes(id,nome,endereco,bairro,lat,lng)))`).eq('data',hoje).eq('motorista_id',userId).in('status',['draft','active','returning']).order('created_at',{ascending:false}).limit(1).maybeSingle()
      data=d2
    }catch(e){console.error('carregar error:',e)}
    if(data){
      const legs:Leg[]=((data.route_legs as any[])||[]).sort((a:any,b:any)=>a.ordem-b.ordem).map((l:any)=>({...l,passengers:(l.leg_passengers||[]).sort((a:any,b:any)=>a.ordem-b.ordem)}))
      setPlan({...(data as any),legs})
    }else{setPlan(null)}
    setLoading(false)
  },[sb,user?.id])
  useEffect(()=>{
    sb.auth.getUser().then(async({data:{user}})=>{
      if(!user){setLoading(false);return}
      setUser(user)
      const{data:p}=await sb.from('profiles').select('nome').eq('id',user.id).single()
      if(p)setNomePerfil(p.nome||'')
      carregar(user.id)
    })
  },[sb,carregar])
  useEffect(()=>{
    if(!user)return
    const ch=sb.channel('motorista-rt').on('postgres_changes',{event:'*',schema:'public',table:'leg_passengers'},()=>carregar()).on('postgres_changes',{event:'*',schema:'public',table:'route_legs'},()=>carregar()).on('postgres_changes',{event:'*',schema:'public',table:'route_plans'},()=>carregar()).subscribe()
    return()=>{sb.removeChannel(ch)}
  },[sb,user,carregar])
  useEffect(()=>{
    if(!navigator.geolocation)return
    const id=navigator.geolocation.watchPosition(pos=>{posAtual.current=pos;setGpsAtivo(true)},()=>setGpsAtivo(false),{enableHighAccuracy:true,maximumAge:10000})
    return()=>navigator.geolocation.clearWatch(id)
  },[])
  const setStatus=async(passId:string,newStatus:string,oldStatus:string)=>{
    setAtualizando(p=>({...p,[passId]:true}))
    setUltimoCmd({passId,statusAnt:oldStatus})
    await sb.from('leg_passengers').update({status:newStatus}).eq('id',passId)
    setAtualizando(p=>({...p,[passId]:false}))
    carregar()
  }
  const desfazer=async()=>{
    if(!ultimoCmd)return
    setAtualizando(p=>({...p,[ultimoCmd.passId]:true}))
    await sb.from('leg_passengers').update({status:ultimoCmd.statusAnt}).eq('id',ultimoCmd.passId)
    setAtualizando(p=>({...p,[ultimoCmd.passId]:false}))
    setUltimoCmd(null)
    carregar()
  }
  const salvarLoc=async(passId:string,pacId:string)=>{
    if(!posAtual.current)return alert('GPS nao disponivel')
    setSalvandoLoc(p=>({...p,[passId]:true}))
    const{latitude:lat,longitude:lng}=posAtual.current.coords
    await sb.from('pacientes').update({lat,lng}).eq('id',pacId)
    setSalvandoLoc(p=>({...p,[passId]:false}))
    alert('Localizacao salva!')
  }
  const setRotaStatus=async(s:string)=>{
    if(!plan)return
    await sb.from('route_plans').update({status:s}).eq('id',plan.id)
    carregar()
  }
  const enviarProblema=async()=>{
    if(!plan||!user)return
    setEnviandoProbl(true)
    await sb.from('route_problems').insert({plan_id:plan.id,motorista_id:user.id,...formProblema})
    setEnviandoProbl(false);setModalProblema(false)
    alert('Problema reportado!')
  }
  const leg=plan?.legs?.[0]
  const totalPax=leg?.passengers?.length||0
  const embarcados=leg?.passengers?.filter(p=>p.status==='embarcou').length||0
  if(loading)return(
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center gap-4">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"/>
      <p className="text-gray-400 text-sm">Carregando plano...</p>
    </div>
  )
  const Header=()=>(
    <header className="bg-gray-900 border-b border-gray-700/50 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div className="flex items-center gap-3">
        <span className="text-white font-bold text-lg tracking-wide">Smart<span className="text-blue-400">TFD</span></span>
        <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded">Motorista</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className={`flex items-center gap-1 ${gpsAtivo?'text-green-400':'text-red-400'}`}>
          <span className={`w-2 h-2 rounded-full ${gpsAtivo?'bg-green-400 animate-pulse':'bg-red-400'}`}/>
          {gpsAtivo?'GPS ativo':'sem GPS'}
        </span>
        <span className="text-gray-300">{nomePerfil}</span>
        <button onClick={()=>sb.auth.signOut().then(()=>router.push('/login'))} className="text-gray-500 hover:text-red-400 transition-colors">Sair</button>
      </div>
    </header>
  )
  if(!plan||!leg)return(
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Header/>
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-4xl">🗺️</div>
        <div className="text-center">
          <h2 className="text-white font-bold text-xl mb-2">Sem plano para hoje</h2>
          <p className="text-gray-400 text-sm">Nenhuma rota foi atribuida a voce.</p>
        </div>
        <button onClick={()=>carregar()} className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-medium transition-colors">Verificar novamente</button>
      </div>
    </div>
  )
  const allDone=leg.passengers.every(p=>['liberado','desistiu','ausente'].includes(p.status))
  return(
    <div className="min-h-screen bg-gray-950 flex flex-col pb-32">
      <Header/>
      {/* Route Status Banner */}
      <div className={`px-4 py-2 text-xs font-semibold flex items-center justify-between ${plan.status==='active'?'bg-green-900/50 text-green-300':plan.status==='returning'?'bg-orange-900/50 text-orange-300':'bg-blue-900/50 text-blue-300'}`}>
        <span>{plan.status==='draft'?'🔵 Aguardando inicio':plan.status==='active'?'🟢 Rota em andamento':plan.status==='returning'?'🟠 Retornando a base':'✅ Rota finalizada'}</span>
        <span className="opacity-70">{plan.veiculo?.placa}</span>
      </div>
      {/* Main Panel */}
      <div className="p-4 space-y-4">
        {/* Departure Card */}
        <div className="bg-gray-900 rounded-2xl border border-gray-700/50 p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Saida da garagem</p>
              {leg.est_departure_at?<Countdown targetIso={leg.est_departure_at}/>:<div className="text-4xl font-bold font-mono text-blue-300">{fmtHora(null,leg.horario_saida)}</div>}
              {leg.est_outbound_min&&<p className="text-gray-500 text-xs mt-1">~{leg.est_outbound_min} min de viagem</p>}
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">Veiculo</p>
              <p className="text-white font-bold text-lg">{plan.veiculo?.modelo||plan.veiculo?.placa}</p>
              <p className="text-gray-400 text-xs">{plan.veiculo?.placa}</p>
              <div className="mt-1 flex items-center justify-end gap-1">
                <span className="text-blue-400 text-sm font-bold">{embarcados}</span>
                <span className="text-gray-500 text-xs">/ {totalPax} pax</span>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-700/50 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs">Local de consulta</p>
              <p className="text-white text-sm font-medium">{leg.hospital?.nome}</p>
              <p className="text-gray-400 text-xs">{leg.hospital?.cidade}</p>
            </div>
            <div className="text-right">
              <p className="text-gray-500 text-xs">Horario previsto</p>
              <p className="text-blue-300 text-lg font-bold font-mono">{fmtHora(leg.est_hospital_at,leg.horario_saida)}</p>
            </div>
          </div>
        </div>
        {/* Patients */}
        <div>
          <p className="text-gray-500 text-xs uppercase tracking-wider mb-3 px-1">Pacientes ({totalPax})</p>
          <div className="space-y-3">
            {leg.passengers.map((pass,idx)=>{
              const sc=STATUS_CONFIG[pass.status]||STATUS_CONFIG['aguardando']
              const pac=pass.paciente
              const busy=atualizando[pass.id]
              return(
                <div key={pass.id} className={`rounded-2xl border p-4 transition-all ${sc.bg}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600/30 border border-blue-500/30 flex items-center justify-center text-blue-300 font-bold text-sm">{idx+1}</div>
                      <div>
                        <p className="text-white font-semibold text-sm">{pac?.nome||'Paciente'}</p>
                        <span className={`text-xs font-medium ${sc.color}`}>{sc.label}</span>
                      </div>
                    </div>
                    <a href={mapsUrl(pac)} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:text-blue-300 border border-blue-500/30 rounded-lg px-2 py-1">Ver mapa</a>
                  </div>
                  <div className="text-xs text-gray-400 mb-3 space-y-0.5">
                    {pac?.bairro&&<p>📍 {pac.bairro}</p>}
                    {pac?.endereco&&<p>🏠 {pac.endereco}</p>}
                    {pass.est_pickup_at&&<p>⏰ Pickup: {fmtHora(pass.est_pickup_at)}</p>}
                  </div>
                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <button disabled={busy||pass.status==='embarcou'} onClick={()=>setStatus(pass.id,'embarcou',pass.status)} className="py-2 rounded-xl text-xs font-medium bg-green-600/20 border border-green-500/30 text-green-300 hover:bg-green-600/40 disabled:opacity-40 transition-all">✓ Embarcou</button>
                    <button disabled={busy} onClick={()=>salvarLoc(pass.id,pac?.id||'')} className={`py-2 rounded-xl text-xs font-medium bg-blue-600/20 border border-blue-500/30 text-blue-300 hover:bg-blue-600/40 disabled:opacity-40 transition-all ${salvandoLoc[pass.id]?'animate-pulse':''}`}>📍 Salvar GPS</button>
                    <button disabled={busy||pass.status==='liberado'} onClick={()=>setStatus(pass.id,'liberado',pass.status)} className="py-2 rounded-xl text-xs font-medium bg-teal-600/20 border border-teal-500/30 text-teal-300 hover:bg-teal-600/40 disabled:opacity-40 transition-all">🏥 Liberado</button>
                    <button disabled={busy} onClick={()=>setStatus(pass.id,'outro_motorista',pass.status)} className="py-2 rounded-xl text-xs font-medium bg-orange-600/20 border border-orange-500/30 text-orange-300 hover:bg-orange-600/40 disabled:opacity-40 transition-all">🚗 Outro Mot.</button>
                    <button disabled={busy} onClick={()=>setStatus(pass.id,'desistiu',pass.status)} className="py-2 rounded-xl text-xs font-medium bg-red-600/20 border border-red-500/30 text-red-300 hover:bg-red-600/40 disabled:opacity-40 col-span-2 transition-all">✕ Desistiu</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur border-t border-gray-700/50 p-3 space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <button disabled={plan.status!=='draft'} onClick={()=>setRotaStatus('active')} className="py-3 rounded-xl text-xs font-bold bg-green-600 hover:bg-green-700 text-white disabled:opacity-40 transition-all">▶ Iniciar Rota</button>
          <button disabled={plan.status!=='active'} onClick={()=>setRotaStatus('returning')} className="py-3 rounded-xl text-xs font-bold bg-orange-600 hover:bg-orange-700 text-white disabled:opacity-40 transition-all">↩ Retornar Base</button>
          <button disabled={plan.status==='completed'||!allDone} onClick={()=>setRotaStatus('completed')} className="py-3 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 transition-all">✓ Finalizar</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button onClick={()=>setModalProblema(true)} className="py-2 rounded-xl text-xs font-medium bg-red-900/40 border border-red-500/30 text-red-300 hover:bg-red-900/60 transition-all">🔧 Reportar Problema</button>
          <button disabled={!ultimoCmd} onClick={desfazer} className="py-2 rounded-xl text-xs font-medium bg-gray-700/60 border border-gray-600/30 text-gray-300 hover:bg-gray-700 disabled:opacity-40 transition-all">↩ Desfazer</button>
        </div>
      </div>
      {/* Problema Modal */}
      {modalProblema&&(
        <div className="fixed inset-0 bg-black/80 flex items-end z-50" onClick={()=>setModalProblema(false)}>
          <div className="bg-gray-900 rounded-t-3xl w-full p-6 space-y-4" onClick={e=>e.stopPropagation()}>
            <h3 className="text-white font-bold text-lg">Reportar Problema</h3>
            <select value={formProblema.tipo} onChange={e=>setFormProblema(p=>({...p,tipo:e.target.value}))} className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700">
              <option value="mecanico">Problema mecanico</option>
              <option value="acidente">Acidente</option>
              <option value="pneu">Pneu furado</option>
              <option value="combustivel">Sem combustivel</option>
              <option value="outro">Outro</option>
            </select>
            <select value={formProblema.urgencia} onChange={e=>setFormProblema(p=>({...p,urgencia:e.target.value}))} className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700">
              <option value="baixa">Urgencia baixa</option>
              <option value="normal">Urgencia normal</option>
              <option value="alta">URGENCIA ALTA</option>
            </select>
            <textarea value={formProblema.descricao} onChange={e=>setFormProblema(p=>({...p,descricao:e.target.value}))} placeholder="Descreva o problema..." rows={3} className="w-full bg-gray-800 text-white rounded-xl px-4 py-3 text-sm border border-gray-700 resize-none"/>
            <button disabled={enviandoProbl} onClick={enviarProblema} className="w-full py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold disabled:opacity-50">{enviandoProbl?'Enviando...':'Enviar Alerta'}</button>
          </div>
        </div>
      )}
    </div>
  )
}"""
with open(r'app\motorista\page.tsx','w',encoding='utf-8') as f:
    f.write(content)
print('OK')
