with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()
# ver o card do paciente - hospital dropdown
idx = src.find('Hospital Municipal')
if idx<0: idx = src.find('hospital_id')
print(repr(src[idx-200:idx+400]))
