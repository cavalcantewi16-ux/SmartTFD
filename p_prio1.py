with open(r'app\gestor\pacientes\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) Adicionar prioridade ao FORM_VAZIO
old1 = "recorrente: false, dias_semana: [] as string[]}"
new1 = "recorrente: false, dias_semana: [] as string[], prioridade: 'media'}"
# 2) Carregar prioridade no edit
old2 = "recorrente: (p as any).recorrente || false, dias_semana: (p as any).dias_semana || []"
new2 = "recorrente: (p as any).recorrente || false, dias_semana: (p as any).dias_semana || [], prioridade: (p as any).prioridade || 'media'"
# 3) Incluir prioridade no payload do upsert
old3 = "recorrente: form.recorrente, dias_semana: form.dias_semana"
new3 = "recorrente: form.recorrente, dias_semana: form.dias_semana, prioridade: form.prioridade"

r1 = src.replace(old1, new1, 1)
r2 = r1.replace(old2, new2, 1)
r3 = r2.replace(old3, new3, 1)

checks = [('FORM_VAZIO prioridade', old1, r1), ('edit prioridade', old2, r2), ('payload prioridade', old3, r3)]
for name, old, res in checks:
    print(name, 'OK' if old not in res or (old in src) else 'AVISO')

with open(r'app\gestor\pacientes\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r3)
print('salvo')
