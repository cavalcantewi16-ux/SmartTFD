import re

# ─── PATCH 1: sidebar so mostra pacientes com dias selecionados ─────────────
path1 = r'app\gestor\rotas-do-dia\page.tsx'
with open(path1, encoding='utf-8') as f:
    s1 = f.read()

old_set = "      if (data) setPacientesFixos(data as any[])"
new_set = "      if (data) setPacientesFixos((data as any[]).filter((p:any) => (p.dias_semana||[]).length > 0))"
s1 = s1.replace(old_set, new_set, 1)

with open(path1, 'w', encoding='utf-8') as f:
    f.write(s1)
print('Patch 1 OK' if old_set not in open(path1,encoding='utf-8').read() else 'Patch 1 FALHOU')

# ─── PATCH 2: pacientes/page.tsx - form recorrente + dias ───────────────────
path2 = r'app\gestor\pacientes\page.tsx'
with open(path2, encoding='utf-8') as f:
    s2 = f.read()

# 2a) FORM_VAZIO: adicionar recorrente e dias_semana
old_fv = "  nome: '', cpf: '', telefone: ',"
new_fv = "  nome: '', cpf: '', telefone: ', recorrente: false, dias_semana: [] as string[],"
# Mais seguro: achar a linha inteira
old_fv2 = "  nome: '', cpf: '', telefone: '',\n  endereco: '', bairro: '', cidade: '',"
new_fv2 = "  nome: '', cpf: '', telefone: '', recorrente: false, dias_semana: [] as string[],\n  endereco: '', bairro: '', cidade: '',"
if old_fv2 in s2:
    s2 = s2.replace(old_fv2, new_fv2, 1); print('2a OK')
else:
    print('2a AVISO: nao encontrou FORM_VAZIO')

# 2b) No modo edicao, carregar recorrente e dias_semana
old_edit = "      cidade:      p.cidade      || '',"
new_edit = """      cidade:      p.cidade      || '',
      recorrente:  (p as any).recorrente  || false,
      dias_semana: (p as any).dias_semana || [],"""
if old_edit in s2:
    s2 = s2.replace(old_edit, new_edit, 1); print('2b OK')
else:
    print('2b AVISO')

# 2c) Payload: incluir recorrente e dias_semana
old_pay = "      hospital_principal_id: form.hospital_principal_id || null,"
new_pay = """      hospital_principal_id: form.hospital_principal_id || null,
      recorrente:  (form as any).recorrente || false,
      dias_semana: (form as any).dias_semana || [],"""
if old_pay in s2:
    s2 = s2.replace(old_pay, new_pay, 1); print('2c OK')
else:
    print('2c AVISO')

# 2d) JSX: adicionar secao recorrente antes do botao Cadastrar
old_btn = "          <button onClick={salvar}"
new_btn = """          {/* Recorrencia */}
          <div className="border-t pt-4 mt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">\u2605 Paciente Recorrente</span>
              <div onClick={() => (setForm as any)(f => ({...f, recorrente: !f.recorrente}))}
                className={'relative w-10 h-5 rounded-full cursor-pointer transition-colors ' + ((form as any).recorrente ? 'bg-blue-600' : 'bg-gray-300')}>
                <div className={'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ' + ((form as any).recorrente ? 'translate-x-5' : '')} />
              </div>
            </div>
            {(form as any).recorrente && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Dias fixos de transporte:</p>
                <div className="flex gap-2 flex-wrap">
                  {['dom','seg','ter','qua','qui','sex','sab'].map(d => {
                    const dias: string[] = (form as any).dias_semana || []
                    const ativo = dias.includes(d)
                    return (
                      <button key={d} type="button" onClick={() => (setForm as any)(f => {
                        const cur: string[] = (f as any).dias_semana || []
                        return {...f, dias_semana: ativo ? cur.filter((x:string) => x!==d) : [...cur, d]}
                      })}
                        className={'px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors ' + (ativo ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400 hover:bg-gray-200')}>
                        {d}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <button onClick={salvar}"""
if old_btn in s2:
    s2 = s2.replace(old_btn, new_btn, 1); print('2d OK')
else:
    print('2d AVISO')

with open(path2, 'w', encoding='utf-8') as f:
    f.write(s2)
print('Patch 2 gravado')
