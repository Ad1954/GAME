import os
import shutil
import sys

# Force UTF-8 encoding for standard output on Windows
if sys.platform.startswith('win'):
    sys.stdout.reconfigure(encoding='utf-8')

"""
=============================================================================
 2048 RPG Commercial Edition - Official Release & Backup Pipeline
 嚴格遵循 docs/BACKUP_AND_SYNC_SOP.md 標準流程：
 1. 驗證版本提示（由開發者於 index.html / SPEC 檢核）
 2. 建立主要備份：Commercial_Edition/backup/[TAG]
 3. 建立次要備份：c:/Antigravity/2048RPG/Backup/[TAG]
 4. 純淨刷入 GitHub：C:/GitHub/GAME/2048RPG (自動排除 TEMP、PSD、ATN、backup 等)
=============================================================================
"""

SRC_ROOT = r"c:\Antigravity\2048RPG\Commercial_Edition"
GITHUB_ROOT = r"C:\GitHub\GAME\2048RPG"
EXTERNAL_BACKUP_POOL = r"c:\Antigravity\2048RPG\Backup"

# 1. 忽略於實體備份的項目 (避免遞迴自身備份)
BACKUP_IGNORE = shutil.ignore_patterns(
    '__pycache__', '*.tmp', '*.pyc', 'node_modules', '.git', 'backup', 'Backup'
)

# 2. 忽略於 GitHub 雲端上傳版的黑名單 (確保倉庫純淨，絕不上傳未採用圖與大檔)
GITHUB_IGNORE = shutil.ignore_patterns(
    '__pycache__', '*.tmp', '*.pyc', 'node_modules', '.git', 
    'backup', 'Backup', 'TEMP', '*.psd', '*.atn'
)

def run_pipeline(tag):
    print("=" * 65)
    print(f">> [Pipeline] Starting 2048 RPG Release & Backup Pipeline: [{tag}]")
    print("=" * 65)

    # -------------------------------------------------------------
    # 步驟 2: 主要備份 (Commercial_Edition/backup)
    # -------------------------------------------------------------
    internal_backup_path = os.path.join(SRC_ROOT, "backup", tag)
    print(f"\n[Step 2] Creating Primary Backup (Internal): {internal_backup_path}")
    if os.path.exists(internal_backup_path):
        shutil.rmtree(internal_backup_path)
    shutil.copytree(SRC_ROOT, internal_backup_path, ignore=BACKUP_IGNORE)
    print("  --> [OK] Primary internal backup created successfully!")

    # -------------------------------------------------------------
    # 步驟 3: 次要備份 (外部安全池)
    # -------------------------------------------------------------
    external_backup_path = os.path.join(EXTERNAL_BACKUP_POOL, tag)
    print(f"\n[Step 3] Creating Secondary Backup (External): {external_backup_path}")
    if os.path.exists(external_backup_path):
        shutil.rmtree(external_backup_path)
    shutil.copytree(internal_backup_path, external_backup_path)
    print("  --> [OK] Secondary external mirror backup synchronized successfully!")

    # -------------------------------------------------------------
    # 步驟 4: 純淨刷入 GitHub 倉庫 (排除未採用圖片、TEMP、PSD)
    # -------------------------------------------------------------
    print(f"\n[Step 4] Refreshing Clean GitHub Cloud Release: {GITHUB_ROOT}")
    os.makedirs(GITHUB_ROOT, exist_ok=True)

    include_dirs = ["assets", "docs", "scripts", "src"]
    include_files = [
        "index.html", "main.js", "README.md", "runner.html", "run_gwt_tests.py",
        "server.py", "style.css", "visual_tuning.css", "visual_tuning.json",
        "review_equip_evolution.html", "review_knight_evolution.html",
        "review_samurai_evolution.html", "review_style_matrix_512.html",
        "review_style_tests.html", "review_tiles_matrix.html", "review_weapons.html",
        "啟動全要素展廳.bat", "啟動製品版.bat", "啟動遊戲.bat"
    ]

    # 複製檔案
    for fname in include_files:
        s_file = os.path.join(SRC_ROOT, fname)
        if os.path.exists(s_file):
            d_file = os.path.join(GITHUB_ROOT, fname)
            shutil.copy2(s_file, d_file)

    # 複製目錄 (強制套用 GITHUB_IGNORE，徹底排除 TEMP、psd、atn)
    for dname in include_dirs:
        s_dir = os.path.join(SRC_ROOT, dname)
        if os.path.exists(s_dir):
            d_dir = os.path.join(GITHUB_ROOT, dname)
            shutil.copytree(s_dir, d_dir, dirs_exist_ok=True, ignore=GITHUB_IGNORE)

    # 清理 pycache
    for dirpath, dirnames, filenames in os.walk(GITHUB_ROOT):
        if "__pycache__" in dirnames:
            p = os.path.join(dirpath, "__pycache__")
            try:
                shutil.rmtree(p)
            except Exception:
                pass

    print("  --> [OK] GitHub Cloud Release refreshed cleanly (TEMP, PSD, ATN, and local backups excluded)!")

    print("\n" + "=" * 65)
    print(">> [Pipeline] All steps completed successfully with 100% standard compliance!")
    print("=" * 65 + "\n")

if __name__ == "__main__":
    tag_arg = sys.argv[1] if len(sys.argv) > 1 else "C-STORY-095_v5.4.0_Stable_CutinBaseline"
    run_pipeline(tag_arg)
