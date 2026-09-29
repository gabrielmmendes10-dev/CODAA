@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title Coda v10.5.0 - Inicializador seguro

echo.
echo CODA 10.5.0 - VERIFICANDO O COMPUTADOR
echo ========================================

set "CODA_NODE="
for /f "delims=" %%N in ('where node 2^>nul') do if not defined CODA_NODE set "CODA_NODE=%%N"
if not defined CODA_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "CODA_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined CODA_NODE if exist "%ProgramFiles(x86)%\nodejs\node.exe" set "CODA_NODE=%ProgramFiles(x86)%\nodejs\node.exe"
if not defined CODA_NODE if exist "%LocalAppData%\Programs\nodejs\node.exe" set "CODA_NODE=%LocalAppData%\Programs\nodejs\node.exe"

if not defined CODA_NODE goto NODE_MISSING

"%CODA_NODE%" -e "import('node:sqlite').then(function(){process.exit(0)}).catch(function(){process.exit(1)})" >nul 2>nul
if errorlevel 1 goto NODE_INCOMPATIBLE

if not exist "data" mkdir "data" >nul 2>nul

echo Node encontrado. Iniciando o servidor local...
start "Coda - Servidor local" /min "%CODA_NODE%" "%~dp0server.mjs"

set /a CODA_TRIES=0
:WAIT_SERVER
"%CODA_NODE%" -e "fetch('http://127.0.0.1:8080/api/health').then(function(r){return r.json()}).then(function(d){process.exit(d.version==='10.5.0'?0:1)}).catch(function(){process.exit(1)})" >nul 2>nul
if not errorlevel 1 goto OPEN_CODA
set /a CODA_TRIES+=1
if %CODA_TRIES% GEQ 12 goto START_FAILED
timeout /t 1 /nobreak >nul
goto WAIT_SERVER

:OPEN_CODA
echo Coda iniciado com sucesso.
start "" "http://127.0.0.1:8080"
exit /b 0

:NODE_MISSING
echo.
echo O Node.js nao foi encontrado neste computador.
echo O Coda nao tentara instalar nada automaticamente.
echo Instale o Node.js 22 ou mais recente pelo site oficial:
echo https://nodejs.org/
echo.
echo Se este for um computador da escola ou empresa, peca a instalacao ao administrador.
echo Consulte tambem: LEIA-SE-O-WINDOWS-BLOQUEAR.txt
pause
exit /b 1

:NODE_INCOMPATIBLE
echo.
echo O Node.js instalado e antigo ou nao possui o SQLite necessario.
echo Atualize para o Node.js 22 ou mais recente pelo site oficial:
echo https://nodejs.org/
echo.
echo Se este computador for administrado pela escola ou empresa, peca ajuda ao responsavel.
pause
exit /b 1

:START_FAILED
echo.
echo O servidor local nao iniciou em ate 12 segundos.
echo Feche outras janelas antigas do Coda e tente novamente.
echo Se aparecer uma mensagem de bloqueio do administrador, nao tente contornar a protecao.
echo Entregue o arquivo LEIA-SE-O-WINDOWS-BLOQUEAR.txt ao responsavel pelo computador.
pause
exit /b 1
