with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('pac.nome')
print(repr(src[idx-50:idx+300]))
