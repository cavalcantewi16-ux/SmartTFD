with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    lines = f.readlines()
for i, l in enumerate(lines, 1):
    if any(x in l for x in ['novoForm','NovoForm','novo_form','Novo paciente','salvarNovo','insertNovo','setNovoForm','novoNome','novoBairro']):
        start = max(0,i-2); end = min(len(lines),i+3)
        for j in range(start,end): print(f'{j+1}: {lines[j]}',end='')
        print('---')
