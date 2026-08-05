f = r'C:\SmartTFD\app\gestor\veiculos\page.tsx'
lines = open(f, encoding='utf-8').readlines()
lines[133] = lines[133].replace('{v.placa}', '{v.modelo}')
lines[136] = lines[136].replace('{v.modelo} · {v.capacidade} passageiros', '{v.placa} · {v.modelo} · {v.capacidade} passageiros')
open(f, 'w', encoding='utf-8').writelines(lines)
print('OK')
