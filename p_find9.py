with open(r'app\gestor\rotas-do-dia\page.tsx', encoding='utf-8') as f:
    src = f.read()

# 1) tipo + valor inicial
old1 = "useState<{nome:string;end:string;bairro:string;tel:string;recorrente:boolean;dias_semana:string[]}|null>(null)"
new1 = "useState<{nome:string;end:string;bairro:string;tel:string;recorrente:boolean;dias_semana:string[];prioridade:string}|null>(null)"

# 2) onde novoForm eh inicializado ao abrir modal - buscar
idx2 = src.find("setNovoForm({nome:'',end:'',bairro:'',tel:'',recorrente:false,dias_semana:[]")
print('init modal at', idx2)
if idx2>=0: print(repr(src[idx2:idx2+120]))
