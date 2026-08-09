with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) adicionar prioridade ao PacRota
old1 = "destino_lat?:number|null; destino_lng?:number|null; destino_end?:string }"
new1 = "destino_lat?:number|null; destino_lng?:number|null; destino_end?:string; prioridade?:string }"

# 2) passar prioridade no selPac
old2 = "paciente_id:pac.id,nome:pac.nome,localizacao:loc,lat:pac.lat,lng:pac.lng,lat_gestor:pac.lat_gestor,lng_gestor:pac.lng_gestor})"
new2 = "paciente_id:pac.id,nome:pac.nome,localizacao:loc,lat:pac.lat,lng:pac.lng,lat_gestor:pac.lat_gestor,lng_gestor:pac.lng_gestor,prioridade:(pac as any).prioridade})"

# 3) badge de prioridade ao lado do nome no card
old3 = "{pac.nome||'\U0001f464 Paciente'}</button>"
new3 = "{pac.nome||'\U0001f464 Paciente'}</button>{pac.prioridade&&<span className={'text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-1 '+(pac.prioridade==='alta'?'bg-red-100 text-red-700':pac.prioridade==='baixa'?'bg-green-100 text-green-700':'bg-yellow-100 text-yellow-700')}>{pac.prioridade.charAt(0).toUpperCase()+pac.prioridade.slice(1)}</span>}"

r = src
for i,(o,n) in enumerate([(old1,new1),(old2,new2),(old3,new3)],1):
    if o in r: r=r.replace(o,n,1); print(f'{i} OK')
    else: print(f'{i} AVISO')

with open(r'app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r)
print('salvo')
