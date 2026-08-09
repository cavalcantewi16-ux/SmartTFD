with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) adicionar prioridade na interface Paciente
old1 = "endereco?:string;bairro?:string;lat?:number;lng?:number}"
new1 = "endereco?:string;bairro?:string;lat?:number;lng?:number;prioridade?:string}"

# 2) badge de prioridade apos nome do paciente
old2 = '<p className="text-white font-semibold text-sm">{pac?.nome||\'Paciente\'}</p>'
new2 = '<p className="text-white font-semibold text-sm">{pac?.nome||\'Paciente\'}</p>{pac?.prioridade&&<span className={\'text-[10px] font-bold px-2 py-0.5 rounded-full \'+(pac.prioridade===\'alta\'?\'bg-red-900/60 text-red-300\':pac.prioridade===\'baixa\'?\'bg-green-900/60 text-green-300\':\'bg-yellow-900/60 text-yellow-300\')}>{pac.prioridade.charAt(0).toUpperCase()+pac.prioridade.slice(1)}</span>}'

r = src
for i,(o,n) in enumerate([(old1,new1),(old2,new2)],1):
    if o in r: r=r.replace(o,n,1); print(f'{i} OK')
    else: print(f'{i} AVISO')

with open(r'app\motorista\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r)
print('salvo')
