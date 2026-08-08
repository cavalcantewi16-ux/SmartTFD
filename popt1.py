with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

OLD = """  function calcTempo(ru:string) {
    const rota=rotas.find(r=>r._uid===ru); if(!rota||!rota.pacs.length) return
    let km=0,prev=GARAGEM
    for(const p of rota.pacs){const pl=p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;km+=hav(prev.lat,prev.lng,pl.lat,pl.lng);prev=pl}
    const h=hospitais.find(h=>h.id===rota.pacs[0]?.hospital_id)
    km+=h?.lat&&h?.lng?hav(prev.lat,prev.lng,h.lat,h.lng):95
    const pickup=rota.pacs.length*10
    const tempo=Math.ceil(km*1.6)+pickup
    const min=rota.pacs.reduce((m,p)=>Math.min(m,timeToMin(p.horario)),Infinity)
    setRota(ru,{tempo_min:tempo,saida:min===Infinity?null:minToTime(min-tempo-15)})
  }"""

NEW = """  function otimizarOrdem(pacs:PacRota[]):PacRota[]{
    if(pacs.length<=1) return pacs
    const left=[...pacs];const result:PacRota[]=[]
    let prev=GARAGEM
    while(left.length>0){
      let bi=0,bd=Infinity
      left.forEach((p,i)=>{const l=p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;const d=hav(prev.lat,prev.lng,l.lat,l.lng);if(d<bd){bd=d;bi=i}})
      const[picked]=left.splice(bi,1);result.push(picked)
      prev=picked.lat&&picked.lng?{lat:picked.lat,lng:picked.lng}:GARAGEM
    }
    return result
  }

  function calcTempo(ru:string) {
    const rota=rotas.find(r=>r._uid===ru); if(!rota||!rota.pacs.length) return
    const pacs=otimizarOrdem(rota.pacs)
    let km=0,prev=GARAGEM
    for(const p of pacs){const pl=p.lat&&p.lng?{lat:p.lat,lng:p.lng}:GARAGEM;km+=hav(prev.lat,prev.lng,pl.lat,pl.lng);prev=pl}
    const h=hospitais.find(h=>h.id===pacs[0]?.hospital_id)
    km+=h?.lat&&h?.lng?hav(prev.lat,prev.lng,h.lat,h.lng):95
    const pickup=pacs.length*10
    const tempo=Math.ceil(km*1.6)+pickup
    const min=pacs.reduce((m,p)=>Math.min(m,timeToMin(p.horario)),Infinity)
    setRota(ru,{pacs,tempo_min:tempo,saida:min===Infinity?null:minToTime(min-tempo-15)})
  }"""

txt = txt.replace(OLD, NEW)
with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK patchA')
