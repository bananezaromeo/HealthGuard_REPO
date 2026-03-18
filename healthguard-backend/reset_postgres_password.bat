@echo off
REM This script resets the PostgreSQL password for the postgres user

setlocal enabledelayedexpansion

REM New password to set
set NEW_PASSWORD=healthguard123

REM Try to connect and reset password
echo Attempting to reset PostgreSQL password...

REM Create a temporary SQL script
(
echo ALTER USER postgres WITH PASSWORD '%NEW_PASSWORD%';
) > reset_password.sql

REM Run the SQL script
psql -U postgres -f reset_password.sql

if !ERRORLEVEL! equ 0 (
    echo Password reset successful!
    echo New password: %NEW_PASSWORD%
    del reset_password.sql
) else (
    echo Password reset failed. You may need to use pgAdmin instead.
    echo Try opening pgAdmin and resetting the password through the GUI.
)

pause
