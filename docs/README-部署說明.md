# 《星墜答問：神話機神》部署與執行說明書

本文件說明如何在本機執行、測試，以及如何將遊戲部署至靜態網站託管平台，並透過手機／平板進行實機測試。

---

## 快速本機執行

因為本遊戲使用現代 Web API（`fetch` 讀取 JSON/CSV 資料、`IndexedDB`、`Web Audio API` 等），若直接以 `file://` 通訊協定雙擊打開，可能會受瀏覽器本機安全性原則（CORS）限制。建議透過任何簡單的本機 HTTP 伺服器開啟。

### 方法一：使用 Python 內建伺服器（推薦）
在專案根目錄開啟命令列（PowerShell 或 Terminal）：
```bash
cd starfall-quiz
python -m http.server 8080
```
開啟瀏覽器訪問：
```text
http://localhost:8080/starfall-quiz.html
```

### 方法二：使用 Node.js / npx
```bash
npx serve .
# 或
npx http-server -p 8080
```

### 方法三：使用 VS Code / Antigravity 擴充套件
- 安裝「Live Server」擴充套件。
- 在 `starfall-quiz.html` 點選右鍵，選擇 **"Open with Live Server"**。

---

## 手機與平板實機測試指南

為了驗收手機與平板的單指拖曳操控與右下角靈丸集氣手感：

1. **同區網連線**：
   - 確保電腦與手機連線至相同的 Wi-Fi 網路。
   - 於電腦終端機查詢電腦 IP（Windows 執行 `ipconfig`，例如 `192.168.1.100`）。
   - 在手機瀏覽器（Chrome 或 Safari）輸入：
     ```text
     http://192.168.1.100:8080/starfall-quiz.html
     ```
2. **手機操作驗收要點**：
   - 畫面是否自動適應直向螢幕，頂部 HUD 是否清晰可讀。
   - 單指在戰場任意處滑動，戰機能否平滑跟隨移動，手指不會遮擋戰機視線。
   - 穿過密集群彈時，機翼是否能安全擦過敵彈並累積「擦彈同步值」。
   - 右下角的「靈丸集氣區」按住時是否正常蓄力，放開時是否正常發射，且與左手移動戰機不發生手勢衝突。
   - 點擊「暫停」與「LAB」按鈕是否能即時觸發且容易點擊。

---

## 正式靜態網站部署（HTTPS）

依規格書規範，為了確保 IndexedDB 與 Google Apps Script API 連線穩定，建議部署到支援 HTTPS 的靜態網站平台。

### 1. GitHub Pages
1. 將 `starfall-quiz` 專案推送到 GitHub Repository。
2. 進入 Repository 的 **Settings -> Pages**。
3. Source 選擇 `Deploy from a branch`，選擇 `main` 分支與根目錄 `/`。
4. 儲存後數分鐘即可取得專屬 HTTPS 網址：`https://<username>.github.io/<repo-name>/starfall-quiz.html`。

### 2. Firebase Hosting
1. 安裝 Firebase CLI：
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init hosting
   ```
2. Public directory 選擇當前目錄。
3. 執行部署：
   ```bash
   firebase deploy --only hosting
   ```

### 3. Vercel / Netlify
- 直接將專案資料夾拖曳至 Netlify 儀表板，即可在數秒內取得免費 HTTPS 網域。

---

## 專案檔案結構概覽

```text
starfall-quiz/
├── starfall-quiz.html              # 主入口
├── game.js                          # 核心遊戲引擎
├── style.css                        # 機甲 UI 樣式
├── starfall-game-api-config.js      # API 設定檔
├── assets/                          # 正式美術圖集
│   ├── backgrounds/
│   ├── player/
│   ├── bosses/
│   ├── enemies/
│   └── icons/
├── data/
│   ├── default-question-bank.csv   # 150 題題庫
│   ├── boss-data.json              # 10 位 Boss 資料
│   ├── weapon-data.json            # 14 種武器資料
│   └── fusion-data.json            # 6 組真融合資料
├── docs/
│   ├── BUILD-LOG.md
│   ├── DELIVERY-CHECKLIST.md
│   ├── README-部署說明.md
│   ├── GS-SETUP.md
│   └── CONTENT-MAINTENANCE.md
└── apps-script/
    └── Code.gs                     # Google Apps Script 雲端後端
```
