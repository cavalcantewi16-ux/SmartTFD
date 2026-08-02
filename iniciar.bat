@echo off
title SmartTFD - Iniciando...
echo.
echo  ====================================
echo   SmartTFD - Sistema de Transporte
echo  ====================================
echo.

set "DEST=C:\SmartTFD"

:: Se ja estamos em C:\SmartTFD, vai direto
if /i "%~dp0"=="%DEST%\" goto :iniciar

:: Cria pasta destino se nao existir
if not exist "%DEST%" mkdir "%DEST%"

:: 1. Copia arquivos fonte (exclui node_modules e .next)
echo  [1/3] Copiando arquivos do projeto...
robocopy "%~dp0." "%DEST%" /E /XD node_modules .next /NFL /NJH /NJS /NP

if %errorlevel% GEQ 8 (
    echo ERRO ao copiar arquivos. Tente como Administrador.
    pause & exit /b 1
)

:: 2. Copia node_modules (robocopy trata caminhos longos)
if not exist "%DEST%\node_modules" (
    echo  [2/3] Copiando node_modules (pode demorar)...
    robocopy "%~dp0node_modules" "%DEST%\node_modules" /E /NFL /NJH /NJS /NP
    if %errorlevel% GEQ 8 (
        echo ERRO ao copiar node_modules.
        pause & exit /b 1
    )
) else (
    echo  [2/3] node_modules ja existe em %DEST%
)

:: 3. Inicia servidor de C:\SmartTFD
echo.
echo  [3/3] Iniciando servidor de %DEST%...
echo  Acesse: http://localhost:3000
echo.
cd /d "%DEST%"
start "" "http://localhost:3000"
call npm run dev
pause
exit

:iniciar
echo  Rodando de caminho curto: %~dp0
echo.
echo  Iniciando servidor...
echo  Acesse: http://localhost:3000
echo.
start "" "http://localhost:3000"
call npm run dev
pause
