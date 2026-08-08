with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

txt = txt.replace(
    "const{data:plan}=await sb.from('route_plans').insert({data,motorista_id:rota.motorista_id,veiculo_id:rota.veiculo_id,status:'draft'}).select('id').single()\n      if(!plan) continue",
    "const{data:plan,error:e1}=await sb.from('route_plans').insert({data,motorista_id:rota.motorista_id,veiculo_id:rota.veiculo_id,status:'draft'}).select('id').single()\n      if(e1){console.error('route_plans error:',e1);continue}\n      if(!plan) continue"
)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK')
