with open(r'app\motorista\page.tsx', encoding='utf-8') as f:
    src = f.read()
idx = src.find('ps.map(')
if idx<0: idx = src.find('.map(ps=>')
if idx<0: idx = src.find('passengers.map')
print(idx, repr(src[idx:idx+400]))
