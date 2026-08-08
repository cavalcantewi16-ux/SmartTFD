with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()
# Mostrar trecho do card da lista
idx = src.find('onClick={()=>setSel(p)}')
if idx >= 0:
    print(repr(src[idx:idx+400]))
else:
    print('NAO ENCONTROU setSel(p)')
