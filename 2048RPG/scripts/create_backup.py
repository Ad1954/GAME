import os
import shutil
import sys

def create_dual_track_backup(tag="C-STORY-095_v5.4.0_Stable_CutinBaseline"):
    src_root = r"c:\Antigravity\2048RPG\Commercial_Edition"
    
    # Track 1: Internal Backup in Commercial_Edition
    internal_dst = os.path.join(src_root, "backup", tag)
    # Track 2: External Safe Pool
    external_dst = os.path.join(r"c:\Antigravity\2048RPG\Backup", tag)

    targets = [internal_dst, external_dst]
    
    ignore_patterns = shutil.ignore_patterns(
        '__pycache__', '*.tmp', '*.pyc', 'node_modules', '.git', 'backup', 'Backup'
    )

    for target in targets:
        print(f"[Backup SOP] Backing up to: {target} ...")
        if os.path.exists(target):
            shutil.rmtree(target)
        shutil.copytree(src_root, target, ignore=ignore_patterns)
        print(f"  --> Successfully created: {target}")

    print(f"\n[Backup SOP] Dual-track backup successfully completed for tag: {tag}!\n")

if __name__ == "__main__":
    tag = sys.argv[1] if len(sys.argv) > 1 else "C-STORY-095_v5.4.0_Stable_CutinBaseline"
    create_dual_track_backup(tag)
