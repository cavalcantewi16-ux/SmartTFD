with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()
# buscar onde o nome do paciente aparece no JSX
idx = src.find('.paciente.nome')
print(repr(src[idx-100:idx+400]))
