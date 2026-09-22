# 《星墜答問：神話機神》內容維護與擴充手冊 (CONTENT-MAINTENANCE)

本文件說明如何維護、新增題庫題目，以及如何調整 Boss 數值與擴充武器裝備。

---

## 1. 題庫維護指南

### 題庫資料格式規範 (`data/default-question-bank.csv`)
所有題目均具備固定的 23 個欄位：

| 欄位名稱 | 必填 | 說明與範例 |
|---|---|---|
| `question_id` | 是 | 永久唯一代號，格式如 `G1-PHO-0001`，修改題幹文字時不得變更此 ID |
| `enabled` | 是 | `TRUE` 或 `FALSE`，設為 FALSE 即不再抽出 |
| `grade` | 是 | 年級標籤，如 `國小一年級`、`國小四年級` |
| `subject` | 是 | 學科名稱，如 `國語文`、`自然科學`、`數學` |
| `unit` | 是 | 單元名稱，如 `注音符號`、`識字寫字`、`閱讀理解` |
| `skill` | 是 | 能力標籤，如 `聲調辨識`、`字形辨識`、`成語理解` |
| `question_type` | 是 | 題型，v1 預設為 `multiple_choice` |
| `difficulty` | 是 | 難度 `1` 至 `5`（1 最簡單、5 最困難） |
| `question` | 是 | 題目題幹文字 |
| `option_a` ～ `option_d` | 是 | 選項文字 |
| `answer` | 是 | 正確選項字母，固定填寫 `A`、`B`、`C`、`D` |
| `explanation_short` | 否 | 答題後戰場上顯示的 1–2 句短提示 |
| `explanation_detail` | 否 | 完整詳細解析 |
| `memory_tip` | 否 | 記憶口訣，適合錯題復仇時回饋 |
| `target_words` | 否 | 目標詞彙，以直線 `|` 分隔 |
| `concept_tags` | 否 | 概念標籤，以直線 `|` 分隔 |
| `error_pattern` | 否 | 常見錯誤類型分析 |
| `next_step` | 否 | 建議後續複習練習方向 |

### 題目新增建議步驟
1. 建議使用試算表軟體（Google Sheets 或 Excel）開啟 CSV 編輯。
2. 保持第一列標題名稱不變。
3. 存檔時務必選擇 **UTF-8 編碼**，避免中文字元亂碼。
4. 若已串接 Google Sheets，可直接在 Google Sheet 的 `Questions` 工作表新增，遊戲每次連線時皆會自動抓取新版。

---

## 2. 神話 Boss 維護與數值調整 (`data/boss-data.json`)

每個 Boss 採用資料驅動架構，以下是欄位說明：
```json
{
  "stage": 1,
  "id": "garuda",
  "name": "迦樓羅・裂空王",
  "title": "金黑機械神鳥",
  "asset": "assets/bosses/boss_1_garuda.png",
  "baseHp": 4800,
  "width": 190,
  "height": 190,
  "hitboxRadius": 48,
  "shieldType": "white",
  "introVoice": "裂空之翼，斬斷星河！",
  "phases": 2,
  "ultimates": [
    {
      "id": "skyward_dive",
      "name": "一飛沖天",
      "warningTime": 2.5,
      "voiceLine": "迦樓羅：一飛沖天！",
      "description": "收翼升空後高速俯衝突擊全場",
      "damage": 2
    }
  ]
}
```
- `baseHp`：基礎生命值，調整 Boss 耐打程度。
- `shieldType`：護盾極性，可選：
  - `none`：無護盾。
  - `blue`：偏轉實彈（玩家實彈傷害減半）。
  - `green`：轉化治療（受到傷害時轉為回血，玩家需停火）。
  - `orange`：吸收能量（能量光束傷害減半）。
  - `purple`：反彈元素。
  - `white`：全面無敵護盾。
- `ultimates`：大招列表，包含招式名稱、語音文本、預警時間（建議 2.0–3.0 秒）。

---

## 3. 武器與模組擴充 (`data/weapon-data.json`)

武器支援四種槽位：
- `main`：主武器（多重射擊、光束砲、靈丸）。
- `sub`：副武器（追蹤飛彈、榴彈砲、迴轉子彈）。
- `support`：支援系統（戰鬥僚機、稜鏡僚機）。
- `passive`：被動模組（超速彈藥、暴擊核心、量子護盾、時滯力場、元素附魔、爆破連鎖）。

每項武器定義 `ranks`（1 至 5 階），並可在 Rank 3 定義分支選擇 (`branches`)：
```json
"branches": {
  "A": { "name": "密集集束", "desc": "高射速正面窄角高傷穿甲機砲" },
  "B": { "name": "扇形壓制", "desc": "超廣角扇形壓制彈幕，橫掃全屏雜兵" }
}
```

---

## 4. 真融合配方管理 (`data/fusion-data.json`)

真融合需滿足兩把武器皆達到 Rank 3 以上：
```json
{
  "id": "comet_spirit",
  "name": "彗星靈丸",
  "ingredients": ["spirit_bullet", "grenade_launcher"],
  "minRank": 3,
  "slotType": "main",
  "description": "靈丸凝聚重型榴彈爆燃彈頭，命中引發連續巨型核爆！",
  "resonance": {
    "name": "靈爆共鳴",
    "effect": "靈丸命中附帶榴彈範圍爆炸"
  }
}
```
新增配方時只需指定兩個 `ingredients` ID，系統會在裝備升級結算時自動檢測並向玩家推薦真融合卡片。
