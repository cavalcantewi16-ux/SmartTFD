with open(r'app\gestor\pacientes\[id]\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) adicionar state prioridade
old1 = "const [salvandoRec, setSalvandoRec] = useState(false)"
new1 = "const [salvandoRec, setSalvandoRec] = useState(false)\n  const [prioridade, setPrioridade] = useState<string>('media')"

# 2) carregar prioridade do paciente
old2 = "setRecorrente((p as any)?.recorrente ?? false)\n    setDiasSemana((p as any)?.dias_semana ?? [])"
new2 = "setRecorrente((p as any)?.recorrente ?? false)\n    setDiasSemana((p as any)?.dias_semana ?? [])\n    setPrioridade((p as any)?.prioridade ?? 'media')"

# 3) salvar prioridade junto com recorrente
old3 = "await supabase.from('pacientes').update({ recorrente, dias_semana: diasSemana } as any).eq('id', id)"
new3 = "await supabase.from('pacientes').update({ recorrente, dias_semana: diasSemana, prioridade } as any).eq('id', id)"

r = src
for i,(o,n) in enumerate([(old1,new1),(old2,new2),(old3,new3)],1):
    if o in r: r=r.replace(o,n,1); print(f'{i} OK')
    else: print(f'{i} AVISO')

with open(r'app\gestor\pacientes\[id]\page.tsx', 'w', encoding='utf-8') as f:
    f.write(r)
print('salvo')
