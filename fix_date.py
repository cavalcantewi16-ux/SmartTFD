with open(r'app\motorista\page.tsx','r',encoding='utf-8') as f:
    c=f.read()
old="const hoje = new Date().toLocaleDateString('svSE')"
new="const d=new Date();const hoje=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')"
if old in c:
    c=c.replace(old,new,1); print('OK')
else:
    print('NAO ENCONTRADO')
with open(r'app\motorista\page.tsx','w',encoding='utf-8') as f:
    f.write(c)
