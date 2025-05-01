@echo off
echo Demarrage de la stack LUMA API...

REM Verification de l'installation de Docker
where docker >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Docker n'est pas installe ou n'est pas dans le PATH.
    echo Veuillez installer Docker Desktop pour Windows et reessayer.
    exit /b 1
)

REM Verification de l'installation de Docker Compose
where docker-compose >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Docker Compose n'est pas installe ou n'est pas dans le PATH.
    echo Veuillez installer Docker Desktop pour Windows qui inclut Docker Compose.
    exit /b 1
)

REM Arreter les conteneurs existants si l'option --clean est fournie
if "%1"=="--clean" (
    echo Nettoyage des conteneurs existants...
    docker-compose -f docker-compose-simple.yml down
    echo Nettoyage termine.
)

REM Construire et demarrer les conteneurs
echo Construction et demarrage des conteneurs...
docker-compose -f docker-compose-simple.yml up -d

REM Attendre que les services soient prets
echo Attente du demarrage des services...
timeout /t 5 /nobreak > NUL

REM Afficher les logs
echo Logs de l'API LUMA:
docker-compose -f docker-compose-simple.yml logs -f api 