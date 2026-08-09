with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()
# procurar onde paciente eh exibido no detalhe da rota
for kw in ['paciente.nome','lp.paciente','nome do pac','endereco','bairro']:
    idx = src.find(kw)
    if idx >= 0:
        print(f'--- {kw} @ {idx} ---')
        print(repr(src[idx:idx+200]))
        break
