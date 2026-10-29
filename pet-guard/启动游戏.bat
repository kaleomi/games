@echo off
chcp 65001 >nul
title 萌宠保卫战 本地运行
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0serve.ps1"
if errorlevel 1 pause
