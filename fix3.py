f = r'C:\SmartTFD\app\api\otimizar-rotas\route.ts'
lines = open(f, encoding='utf-8').readlines()
lines = [l for i, l in enumerate(lines) if i not in (50, 51, 52)]
open(f, 'w', encoding='utf-8').writelines(lines)
print('OK, linhas removidas')
