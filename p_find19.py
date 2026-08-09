with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('Liberado')
print(repr(src[idx-500:idx+100]))
