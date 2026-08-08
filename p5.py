with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'r', encoding='utf-8') as f:
    txt = f.read()

# 1. Adicionar tel no tipo do estado
txt = txt.replace(
    "useState<{nome:string;end:string;bairro:string}|null>(null)",
    "useState<{nome:string;end:string;bairro:string;tel:string}|null>(null)"
)

# 2. Inicializar tel vazio ao abrir o form
txt = txt.replace(
    "setNovoForm({nome:modal.q,end:'',bairro:''})",
    "setNovoForm({nome:modal.q,end:'',bairro:'',tel:''})"
)

# 3. Input de telefone apos bairro
txt = txt.replace(
    'placeholder="Bairro" className="w-full border rounded px-2 py-1.5 text-sm"/>',
    'placeholder="Bairro" className="w-full border rounded px-2 py-1.5 text-sm"/><input value={novoForm.tel} onChange={e=>setNovoForm(f=>f?{...f,tel:e.target.value}:null)} placeholder="Telefone" className="w-full border rounded px-2 py-1.5 text-sm"/>'
)

# 4. Incluir telefone no insert
txt = txt.replace(
    "sb.from('pacientes').insert({nome:novoForm.nome.trim(),endereco:novoForm.end.trim()||null,bairro:novoForm.bairro.trim()||null})",
    "sb.from('pacientes').insert({nome:novoForm.nome.trim(),endereco:novoForm.end.trim()||null,bairro:novoForm.bairro.trim()||null,telefone:novoForm.tel.trim()||null})"
)

with open(r'C:\SmartTFD\app\gestor\rotas-do-dia\page.tsx', 'w', encoding='utf-8') as f:
    f.write(txt)
print('OK')
