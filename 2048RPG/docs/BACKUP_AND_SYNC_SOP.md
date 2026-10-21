# 🛡️《2048 RPG：王國遠征》專案備份與 GitHub 雲端同步標準作業程序 (Backup & GitHub Sync SOP)

## 📌 核心架構原則
本專案已全面統一「本機開發」、「實體封存備份」與「GitHub 雲端版本控管」之分工職責，徹底淘汰歷史過渡子目錄 `Commercial_Edition\2048RPG`：

| 目錄路徑 | 角色定位 | 處理方式 |
| :--- | :--- | :--- |
| `c:\Antigravity\2048RPG\Commercial_Edition\` | **主開發源碼區** | 日常功能開發、測試與維護的核心工作區 |
| `c:\Antigravity\2048RPG\Commercial_Edition\backup\[標籤]` | **軌道一：內部實體封存** | 本地即時封存，用於快速比對或熱還原 |
| `c:\Antigravity\2048RPG\Backup\[標籤]` | **軌道二：外部安全池** | 脫離工作目錄的獨立安全池，防止本機誤刪 |
| `C:\GitHub\GAME\2048RPG\` | **GitHub 雲端發布區** | **雲端上傳專用版本**。直接將乾淨源碼刷入本目錄，透過 GitHub Desktop 進行 Commit & Push |

> ⚠️ **【重要架構決策】**：
> 1. `C:\Antigravity\2048RPG\Commercial_Edition\2048RPG` 為早期過渡鏡像目錄，現已全面淘汰廢棄，所有雲端同步直接由 `C:\GitHub\GAME\2048RPG` 承接。
> 2. `C:\GitHub\GAME\2048RPG` 作為 Git 儲存庫，自身即具備完整雲端版本歷史，嚴禁在其中建立冗餘的 `backup/` 子目錄，以保持遠端儲存庫之純淨。

---

## 🏷️ 備份標籤命名嚴格規範 (Naming Convention)

所有實體封存備份資料夾名稱必須嚴格遵循以下格式：
```
[Story編號]_[版本號]_[功能或基線簡稱]
```
- **範例**：
  - `C-STORY-085_v5.2.0_Stable_魔物圖資修復與縮放錨點對齊`
  - `C-STORY-095_v5.4.0_Stable_CutinBaseline`

---

## 📜 強制發布檢核：遊戲內版本更新提示文字 (In-Game Changelog Protocol)

在任何版本號遞增或功能交付時，**必須強制檢核並同步更新遊戲內版本提示**，嚴禁遺漏：

1. **開場標題版本號**：
   - 更新 `index.html` 的 `#view-title-screen .title-version`（例如 `v5.4.0 · 350 Stages Commercial Version`）。
2. **設定彈窗版本標籤**：
   - 更新 `index.html` 設定彈窗中「📜 版本更新履歷」右上角的小黃標籤（例如 `v5.4.0`）。
3. **最新版本履歷卡片**：
   - 於 `index.html` 的 `#version-changelog-box` 最頂部插入最新 Story 履歷卡片，必須標註 `(最新)`。
   - 將上一項舊履歷的 `(最新)` 標記移除。
   - 履歷卡片內必須條列 3~5 點清晰、具體的繁體中文玩家功能說明。
4. **核心規格文件對齊**：
   - 於 `docs/COMMERCIAL_STORY_SPEC.md` 末尾完整登錄該 Story 的 User Story 與 GWT 驗收條目，標記為 `(Completed)`。

---

## ⚙️ 標準化自動化工具 (One-Click Automation)

為避免人為失誤與規則漂移，一律禁止手動零散複製，調用官方標準腳本：

```bash
# 1. 執行標準雙軌實體封存
python scripts/create_backup.py [備份標籤名稱]

# 2. 執行乾淨源碼同步至 GitHub 倉庫
python scratch/do_sync_and_backup.py
```

---
本規範自 2026 年 10 月 19 日（v5.4.0）起正式生效，為本專案不可逾越之品質防線。
