@echo off
chcp 65001 >nul
title 星墜答問 - 一鍵部署更新至公開網頁版 (GitHub Pages)

echo ==============================================================
echo 🚀 正在將《星墜答問：神話機神》更新同步至公開網頁版...
echo ==============================================================
echo.

git status --porcelain >nul 2>&1
if errorlevel 1 (
    echo [1/3] 尚未初始化 Git 倉庫，正在進行首次初始化...
    git init
    git branch -M main
    git add .
    git commit -m "Release Starfall Quiz"
    echo [2/3] 正在透過 GitHub CLI 建立遠端公開倉庫並推送...
    gh repo create starfall-quiz --public --source=. --remote=origin --push
) else (
    echo [1/3] 正在暫存變更檔案...
    git add .
    echo [2/3] 正在提交最新版本...
    git commit -m "Update Starfall Quiz: %date% %time%"
    echo [3/3] 正在推送至 GitHub 遠端倉庫...
    git push origin main
)

echo.
echo ==============================================================
echo ✅ 部署完成！
echo.
echo 🌐 遊戲公網正式網址 (跨網域 / 4G / 5G / 異地 Wi-Fi 皆可遊玩)：
echo    👉 https://r98921080.github.io/starfall-quiz/
echo.
echo 提示：若為首次發布，GitHub Pages 通常需要 1~2 分鐘建立快取。
echo ==============================================================
pause
