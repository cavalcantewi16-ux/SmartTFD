with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# Tipo Paciente
txt = txt.replace(
    "interface Paciente { id:string; nome:string; endereco?:string; bairro?:string; lat?:number|null; lng?:number|null }",
    "interface Paciente { id:string; nome:string; endereco?:string; bairro?:string; lat?:number|null; lng?:number|null; lat_gestor?:number|null; lng_gestor?:number|null }"
)

# Tipo PacRota
txt = txt.replace(
    "interface PacRota { _uid:string; paciente_id:string; nome:string; acomp:number; localizacao:string; lat?:number|null; lng?:number|null; hospital_id:string; horario:string }",
    "interface PacRota { _uid:string; paciente_id:string; nome:string; acomp:number; localizacao:string; lat?:number|null; lng?:number|null; lat_gestor?:number|null; lng_gestor?:number|null; hospital_id:string; horario:string }"
)

# Query pacientes - incluir lat_gestor/lng_gestor
txt = txt.replace(
    "sb.from('pacientes').select('id,nome,endereco,bairro,lat,lng').order('nome')",
    "sb.from('pacientes').select('id,nome,endereco,bairro,lat,lng,lat_gestor,lng_gestor').order('nome')"
)

# selPac - copiar lat_gestor/lng_gestor
txt = txt.replace(
    "setPac(modal.rotaUid,modal.pacUid,{paciente_id:pac.id,nome:pac.nome,localizacao:loc,lat:pac.lat,lng:pac.lng})",
    "setPac(modal.rotaUid,modal.pacUid,{paciente_id:pac.id,nome:pac.nome,localizacao:loc,lat:pac.lat,lng:pac.lng,lat_gestor:pac.lat_gestor,lng_gestor:pac.lng_gestor})"
)

# confirmarLoc - salvar lat_gestor no banco e nao sobrescrever lat do motorista
txt = txt.replace(
    """  function confirmarLoc(){
    if(!locModal||!locPick) return
    const q=locModal.q||locPick.lat.toFixed(5)+', '+locPick.lng.toFixed(5)
    setPac(locModal.ru,locModal.pu,{localizacao:q,lat:locPick.lat,lng:locPick.lng})
    setLocModal(null);setLocPick(null)
  }""",
    """  async function confirmarLoc(){
    if(!locModal||!locPick) return
    const q=locModal.q||locPick.lat.toFixed(5)+', '+locPick.lng.toFixed(5)
    setPac(locModal.ru,locModal.pu,{localizacao:q,lat_gestor:locPick.lat,lng_gestor:locPick.lng})
    const rota=rotas.find(r=>r._uid===locModal.ru)
    const pac=rota?.pacs.find(p=>p._uid===locModal.pu)
    if(pac?.paciente_id){
      await sb.from('pacientes').update({lat_gestor:locPick.lat,lng_gestor:locPick.lng}).eq('id',pac.paciente_id)
    }
    setLocModal(null);setLocPick(null)
  }"""
)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK patchA')
