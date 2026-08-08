with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('onClick={()=>setSel(p)}')
print(repr(src[idx:idx+900]))
