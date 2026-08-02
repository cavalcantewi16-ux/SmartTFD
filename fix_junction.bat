@echo off
title SmartTFD - Fix Junction
set "LOG=%USERPROFILE%\Desktop\fix_log.log"
set "DEST=C:\SmartTFD"
set "NM_LOCAL=C:\Users\willi\AppData\Local\Packages\Claude_pzs8sxrjxfjjc\LocalCache\Roaming\Claude\local-agent-mode-sessions\95aa13ae-ba49-41c8-bf6d-6efa6a642c91\75e7893c-3ee7-41f2-8898-b3aded6d689d\local_a804ed8f-032c-42b0-81dc-5af5dd502f34\outputs\smarttfd\node_modules"

echo === Fix Junction SmartTFD === > "%LOG%"
echo. >> "%LOG%"

echo [1] Testando acesso ao caminho Local\Packages... >> "%LOG%"
dir "%NM_LOCAL%" /b /a > nul 2>&1
if errorlevel 1 (
    echo  [FALHOU] Local\Packages nao acessivel via CMD >> "%LOG%"
    echo  Tentando npm install em C:\SmartTFD... >> "%LOG%"

    rem Remove junction quebrada
    rmdir "%DEST%\node_modules" 2>>"%LOG%"

    cd /d "%DEST%"
    echo Rodando npm install... >> "%LOG%"
    npm install --legacy-peer-deps > "%USERPROFILE%\Desktop\npm_install.log" 2>&1
    echo Exit code npm install: %errorlevel% >> "%LOG%"
    echo Primeiras linhas do npm install: >> "%LOG%"
    type "%USERPROFILE%\Desktop\npm_install.log" >> "%LOG%"
) else (
    echo  [OK] Local\Packages acessivel >> "%LOG%"

    rem Remove junction antiga
    echo Removendo junction antiga... >> "%LOG%"
    rmdir "%DEST%\node_modules" 2>>"%LOG%"

    rem Cria intermediario curto em C:\snm
    echo Criando junction intermediaria C:\snm... >> "%LOG%"
    if exist C:\snm rmdir C:\snm 2>>"%LOG%"
    mklink /J C:\snm "%NM_LOCAL%" >> "%LOG%" 2>&1

    if exist C:\snm (
        echo  [OK] C:\snm criada >> "%LOG%"
        echo Criando junction C:\SmartTFD\node_modules -^> C:\snm... >> "%LOG%"
        mklink /J "%DEST%\node_modules" C:\snm >> "%LOG%" 2>&1
    ) else (
        echo  [ERRO] C:\snm falhou, tentando direto... >> "%LOG%"
        mklink /J "%DEST%\node_modules" "%NM_LOCAL%" >> "%LOG%" 2>&1
    )
)

echo. >> "%LOG%"
echo [2] Verificando next.cmd... >> "%LOG%"
if exist "%DEST%\node_modules\.bin\next.cmd" (
    echo  [OK] next.cmd encontrado >> "%LOG%"
    echo. >> "%LOG%"
    echo [3] Iniciando npm run dev... >> "%LOG%"
    cd /d "%DEST%"
    start cmd /k "cd /d C:\SmartTFD && npm run dev"
    echo Servidor iniciado em janela separada >> "%LOG%"
) else (
    echo  [ERRO] next.cmd ainda nao encontrado >> "%LOG%"
    dir /b "%DEST%\node_modules" >> "%LOG%" 2>&1
)

notepad "%LOG%"
pause
