# 《星墜答問：神話機神》Google Sheets 與 Apps Script 設定手冊

本手冊指導使用者如何利用個人 Google 帳號建立雲端試算表後端，串接遊戲題庫、作答紀錄與家長儀表板。

---

## 使用者操作邊界聲明

依規格書 13.5 節規定：
AI 開發工具已完成所有前端程式、後端程式碼 (`apps-script/Code.gs`) 與欄位契約。使用者必須親自：
1. 登入自己的 Google 雲端硬碟建立試算表。
2. 貼上 Apps Script 程式碼。
3. 自行同意 Google 帳號授權。
4. 部署為 Web App 並取得以 `/exec` 結尾的網址。
5. 將網址填入遊戲端的 `starfall-game-api-config.js`。

---

## 逐步建置指引

### 步驟 1：建立 Google 試算表
1. 開啟 [Google 試算表 (Google Sheets)](https://sheets.new)。
2. 將試算表命名為：`星墜答問_學習管理系統`。

### 步驟 2：開啟 Apps Script 編輯器
1. 點選試算表上方選單：**擴充功能 -> Apps Script**。
2. 將專案命名為：`StarfallQuizBackend`。
3. 刪除編輯器中預設的 `myFunction()` 內容。
4. 打開本專案中的 `apps-script/Code.gs` 檔案，複製全部程式碼，貼到 Apps Script 編輯器中。
5. 點擊上方的 **「儲存 (Ctrl+S)」** 圖示。

### 步驟 3：初始化試算表結構
1. 在 Apps Script 編輯器上方的函式下拉選單中，選擇 `setupStarfall`。
2. 點擊 **「執行」**。
3. 首次執行時，Google 會跳出「需要授權」提示：
   - 點擊「查看權限」。
   - 選擇你的 Google 帳號。
   - 點擊「進階 (Advanced)」->「前往 StarfallQuizBackend (不安全)」。
   - 點擊「允許」。
4. 執行完畢後，回到 Google 試算表，你會看到系統已自動建立下列工作表分頁與標題欄位：
   - `Questions`：題庫（23 個標準欄位）。
   - `Students`：學生名冊。
   - `Attempts`：作答紀錄明細。
   - `Settings`：自適應出題與遊戲參數。
   - `QuestionStats`、`WordStats`、`SkillStats`：統計快取。
   - `ParentDashboard`：家長儀表板。

### 步驟 4：匯入初始題庫
1. 開啟本專案的 `data/default-question-bank.csv`。
2. 在試算表點選 **檔案 -> 匯入 -> 上傳**，選擇此 CSV 檔案。
3. 匯入位置選擇 **「取代目前工作表」**（在 `Questions` 分頁下），即可快速匯入 150 題國語文標準題庫。

### 步驟 5：部署為 Web App
1. 在 Apps Script 編輯器右上角，點選 **「部署」->「新部署」**。
2. 點選左側齒輪圖示，選擇 **「網頁應用程式 (Web app)」**。
3. 設定參數：
   - **說明**：`Starfall v1.0`
   - **以何身分執行**：`我 (你的帳號)`
   - **誰可以存取**：`所有人 (Anyone)`（**非常重要！** 若設為「僅限自己」，遊戲前端將無法連線）
4. 點選 **「部署」**。
5. 複製生成的 **網頁應用程式網址**（結尾必須為 `/exec`），格式類似：
   ```text
   https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXX/exec
   ```

### 步驟 6：配置遊戲前端連線
1. 開啟專案根目錄的 `starfall-game-api-config.js`。
2. 將剛才複製的網址貼入 `apiBaseUrl`：
   ```javascript
   window.STARFALL_CONFIG = {
     apiBaseUrl: 'https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXX/exec',
     ...
   };
   ```
3. 儲存檔案。重新整理遊戲頁面，即可開始享受無縫雲端同步！

---

## 離線保護與容錯機制

- **離線優先**：若遊戲離線或網路不穩，作答資料會自動寫入 IndexedDB 本機隊列，遊戲完全不中斷。
- **背景補傳**：當網路恢復時，遊戲會依序自動將離線隊列上傳至 Google Sheet，確保學習數據零遺失。
