with open(r'app\gestor\rotas-do-dia\page.tsx','r',encoding='utf-8') as f:
    c=f.read()
if 'async function salvar()' not in c:
    print('NAO ENCONTRADO'); exit()
insert="""  useEffect(()=>{
    if(!motoristas.length||!veiculos.length)return
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
    load()
  },[data,motoristas,veiculos])
  """
import re
c=re.sub(r'(\s*async function salvar\(\))',insert+r'\1',c,count=1)
with open(r'app\gestor\rotas-do-dia\page.tsx','w',encoding='utf-8') as f:
    f.write(c)
print('OK')
