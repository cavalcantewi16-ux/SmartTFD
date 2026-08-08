# Ler pacientes/page.tsx
with open(r'app\gestor\pacientes\page.tsx', encoding='utf-8') as f:
    lines = f.readlines()
print(f'=== pacientes/page.tsx ({len(lines)} linhas) ===')
for i, l in enumerate(lines, 1):
    if any(x in l for x in ['recorr','novoForm','useState','form','salvar','Cadastrar','insert','cpf','nome','bairro','telefone']):
        print(f'{i}: {l}', end='')
