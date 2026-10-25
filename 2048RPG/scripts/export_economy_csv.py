# -*- coding: utf-8 -*-
import csv
import os
import math

def generate_economy_csv(output_paths):
    # 1. 24-Tier Tech Comparison
    tech_tiers = [
        # (tier, name, range_str, min_wpn, old_loose, old_high, new_sink, cycle_id)
        (1, "新兵武裝", "[2, 4, 8]", 0, 0, 0, 0, 1),
        (2, "巡邏獵備", "[2, 4, 8]", 0, 600, 800, 800, 1),
        (3, "鐵衛防具", "[2, 4, 8]", 0, 700, 900, 1000, 1),
        (4, "先鋒戰備", "[2, 4, 8]", 0, 800, 1100, 1400, 1),
        (5, "精鋼鍛造", "[2, 4, 8]", 0, 900, 1400, 1800, 1),
        (6, "【大突破】白銀軍備 (淘汰2)", "[4, 8, 16]", 4, 2700, 4500, 5000, 1),

        (7, "精銳配給", "[4, 8, 16]", 4, 1000, 1800, 2200, 2),
        (8, "戰陣重裝", "[4, 8, 16]", 4, 1100, 2100, 2600, 2),
        (9, "騎士鎧甲", "[4, 8, 16]", 4, 1200, 2400, 3000, 2),
        (10, "秘銀附魔", "[4, 8, 16]", 4, 1300, 2700, 3400, 2),
        (11, "皇家禮裝", "[4, 8, 16]", 4, 1400, 3000, 3800, 2),
        (12, "【大突破】黃金領主 (淘汰4)", "[8, 16, 32]", 8, 4200, 10000, 15000, 2),

        (13, "聖殿武裝", "[8, 16, 32]", 8, 1600, 4000, 5000, 3),
        (14, "光輝重刃", "[8, 16, 32]", 8, 1800, 4500, 6000, 3),
        (15, "神聖制式", "[8, 16, 32]", 8, 2000, 5000, 7000, 3),
        (16, "大師神匠", "[8, 16, 32]", 8, 2300, 5500, 8000, 3),
        (17, "泰坦鍛爐", "[8, 16, 32]", 8, 2600, 6000, 9000, 3),
        (18, "【大突破】屠龍戰狂 (淘汰8)", "[16, 32, 64]", 16, 7800, 20000, 35000, 3),

        (19, "炎息戰甲", "[16, 32, 64]", 16, 2900, 7000, 11000, 4),
        (20, "黑曜武具", "[16, 32, 64]", 16, 3300, 8000, 13000, 4),
        (21, "遠古龍骨", "[16, 32, 64]", 16, 3700, 9000, 15000, 4),
        (22, "神域符文", "[16, 32, 64]", 16, 4200, 10000, 17000, 4),
        (23, "終焉聖光", "[16, 32, 64]", 16, 4800, 11000, 19000, 4),
        (24, "【大突破】創世星辰 (淘汰16)", "[32, 64, 128]", 32, 14400, 40000, 80000, 4),
    ]

    # Chapters metadata
    chapters = [
        (1, "第 I 章：微風之境", 1, 5, 1.00, 150, 4, "武器 8~16 (轉蛋Lv.1)", "T1~T3"),
        (2, "第 II 章：灼熱熔岩", 6, 20, 0.90, 150, 4, "武器 32~64 (轉蛋Lv.2)", "T6 大突破 (淘汰2)"),
        (3, "第 III 章：孤峰岩地", 21, 50, 0.80, 150, 4, "武器 128~256 (轉蛋Lv.3~4)", "T7~T11"),
        (4, "第 IV 章：蛛魔荒漠", 51, 90, 0.60, 400, 2, "武器 512 (轉蛋Lv.5~6)", "T12 大突破 (淘汰4)"),
        (5, "第 V 章：遠古地宮", 91, 150, 0.50, 400, 2, "武器 1024 (轉蛋Lv.7)", "T18 大突破 (淘汰8)"),
        (6, "第 VI 章：滅世黑曜", 151, 220, 0.40, 400, 2, "武器 2048 (轉蛋Lv.8)", "T19~T21"),
        (7, "第 VII 章：神魔深淵", 221, 280, 0.30, 400, 2, "武器 4096 (轉蛋Lv.8)", "T22~T23"),
        (8, "第 VIII 章：終焉神域", 281, 350, 0.20, 400, 2, "武器 8192+ (神話合成)", "T24 終極突破 (淘汰16)")
    ]

    # Handcrafted stage names for 1..20
    stage_names_1_20 = {
        1: "第 1 關：微風平原", 2: "第 2 關：暗夜密林", 3: "第 3 關：孤峰岩地", 4: "第 4 關：獸人前哨", 5: "第 5 關：蛛魔地穴",
        6: "第 6 關：火鱗前哨", 7: "第 7 關：熔岩巢穴", 8: "第 8 關：赤炎隘口", 9: "第 9 關：熔火魔窟", 10: "第 10 關：終焉火山口",
        11: "第 11 關：熔岩走廊", 12: "第 12 關：熾熱石窟", 13: "第 13 關：灼熱熔泉", 14: "第 14 關：熔核裂隙", 15: "第 15 關：黑曜石階",
        16: "第 16 關：熔岩巨橋", 17: "第 17 關：地火祭壇", 18: "第 18 關：烈焰深淵", 19: "第 19 關：熔岩巨門", 20: "第 20 關：烈焰王座"
    }

    handcrafted_monsters_1_20 = {
        1: (2, 8, "[8, 2, 4]", 3, 40, 4),
        2: (4, 16, "[16, 4, 4]", 3, 50, 4),
        3: (4, 16, "[16, 4, 8]", 3, 60, 4),
        4: (8, 32, "[32, 8, 8]", 3, 70, 4),
        5: (16, 32, "[32, 8, 16, 16]", 4, 80, 4),
        6: (16, 64, "[64, 16, 32]", 3, 90, 4),
        7: (32, 64, "[64(分裂), 16, 32]", 3, 100, 4),
        8: (64, 128, "[128, 32, 64]", 3, 110, 4),
        9: (64, 128, "[128, 32, 32, 64]", 4, 120, 8),
        10: (128, 256, "[256, 32, 64, 64]", 4, 130, 8),
        11: (64, 128, "[128, 32, 64, 64]", 4, 140, 8),
        12: (64, 128, "[128, 32, 64, 64]", 4, 150, 8),
        13: (128, 256, "[256, 32, 64, 64]", 4, 160, 8),
        14: (128, 256, "[256(分裂), 32, 64, 64]", 4, 170, 8),
        15: (128, 256, "[256, 64, 64, 128]", 4, 180, 8),
        16: (128, 256, "[256, 64, 64, 128]", 4, 190, 8),
        17: (128, 256, "[256, 64, 64, 128]", 4, 200, 8),
        18: (128, 256, "[256, 64, 64, 128]", 4, 210, 8),
        19: (128, 256, "[256, 64, 64, 128]", 4, 220, 8),
        20: (256, 512, "[512, 64, 128, 256]", 4, 240, 16),
    }

    stages_data = []
    cum_base_gold = 0
    cum_double_gold = 0

    for s in range(1, 351):
        ch_id = 1
        ch_name = ""
        for cid, cname, r0, r1, *_ in chapters:
            if r0 <= s <= r1:
                ch_id = cid
                ch_name = cname
                break

        if s <= 20:
            reward_gold = 100 + (s - 1) * 5
        elif s <= 50:
            reward_gold = 195 + (s - 20) * 10
        elif s <= 90:
            reward_gold = 495 + (s - 50) * 20
        else:
            reward_gold = 1295 + (s - 90) * 30

        if s <= 20:
            sname = stage_names_1_20[s]
            rec_power, boss_val, m_str, m_cnt, gold_cap, gold_base = handcrafted_monsters_1_20[s]
        else:
            sname = f"第 {s} 關：遠征戰區 {s}"
            gold_cap = int(80 + s * 4)
            gold_base = 8 if s <= 35 else (16 if s <= 90 else (32 if s <= 180 else 64))
            if s <= 27: boss_exp = 9
            elif s <= 41: boss_exp = 10
            elif s <= 60: boss_exp = 11
            elif s <= 90: boss_exp = 12
            elif s <= 120: boss_exp = 13
            elif s <= 150: boss_exp = 14
            elif s <= 180: boss_exp = 15
            elif s <= 220: boss_exp = 16
            elif s <= 280: boss_exp = 17
            else: boss_exp = 18
            boss_val = 2 ** boss_exp
            rec_power = 2 ** max(1, boss_exp - 1)
            m1 = 2 ** max(1, boss_exp - 3)
            m2 = 2 ** max(1, boss_exp - 2)
            m3 = 2 ** max(1, boss_exp - 1)
            if 22 <= s <= 50:
                m_cnt = 5 if (s % 2 == 0) else 4
            elif 50 < s <= 150:
                m_cnt = 5
            else:
                m_cnt = 6
            m_str = f"[{boss_val}, {m3}, {m2}, {m1}...]"

        double_reward = reward_gold * 2
        fail_reward = int(reward_gold * 0.5)
        cum_base_gold += reward_gold
        cum_double_gold += double_reward

        stages_data.append({
            "id": s,
            "chapter_id": ch_id,
            "chapter_name": ch_name,
            "name": sname,
            "rec_power": rec_power,
            "boss_val": boss_val,
            "monsters_str": m_str,
            "monster_count": m_cnt,
            "reward_gold": reward_gold,
            "gold_cap": gold_cap,
            "gold_base": gold_base,
            "double_reward": double_reward,
            "fail_reward": fail_reward,
            "cum_base_gold": cum_base_gold,
            "cum_double_gold": cum_double_gold
        })

    for out_path in output_paths:
        with open(out_path, "w", encoding="utf-8-sig", newline="") as f:
            writer = csv.writer(f)

            # Section 1: 24-Tier Tech Comparison
            writer.writerow(["========================================================================="])
            writer.writerow(["【表一】24 階基地科技升階費用新舊版本對照表 (5小階 + 1大突破)"])
            writer.writerow(["========================================================================="])
            writer.writerow([
                "科技階級", "科技名稱", "局內基礎掉落池", "最低穿戴武器要求",
                "現行寬鬆版費用", "早期高消耗版費用", "C-STORY-102 深水庫版費用",
                "深水庫版循環小計", "深水庫版累計總花費"
            ])

            cum_loose = 0
            cum_old = 0
            cum_new = 0
            cycle_sums = {1: 0, 2: 0, 3: 0, 4: 0}
            for t in tech_tiers:
                cycle_sums[t[7]] += t[6]

            for tier, name, r_str, min_wpn, c_loose, c_old, c_new, cyc_id in tech_tiers:
                cum_loose += c_loose
                cum_old += c_old
                cum_new += c_new
                cyc_sub = cycle_sums[cyc_id] if (tier % 6 == 0) else ""
                writer.writerow([
                    f"Tier {tier}", name, r_str,
                    f"裝備 >= {min_wpn}" if min_wpn > 0 else "無限制",
                    c_loose, c_old, c_new,
                    cyc_sub, cum_new
                ])
            writer.writerow(["總計 (T1~T24)", "-", "-", "-", cum_loose, cum_old, cum_new, cum_new, cum_new])
            writer.writerow([])

            # Section 2: 8 Chapters Progression Summary
            writer.writerow(["========================================================================="])
            writer.writerow(["【表二】8 大章節每日 40 分鐘體驗、勝率、突破天數與收支推衍總表 (日常福利抓 3,500G/日)"])
            writer.writerow(["========================================================================="])
            writer.writerow([
                "章節ID", "章節名稱", "關卡範圍", "關卡數量", "設定勝率",
                "單場回合數", "每日可打場次", "每日推進關數", "突破本章天數", "累計總天數",
                "本章戰鬥總收入(含勝敗)", "本章日常福利總收入", "本章總收入合計", "累計總資金池",
                "預期裝備強度", "預期科技強度"
            ])

            cum_days = 0.0
            cum_total_gold = 300 # starter gold
            daily_welfare = 3500

            for cid, cname, r0, r1, win_rate, turns, plays_per_day, exp_wpn, exp_tech in chapters:
                stage_cnt = r1 - r0 + 1
                adv_per_day = plays_per_day * win_rate
                days_needed = round(stage_cnt / adv_per_day, 1)
                cum_days = round(cum_days + days_needed, 1)

                # Calculate chapter combat gold: sum of double_reward for cleared stages + fail_reward for failed attempts
                ch_stages = [st for st in stages_data if st["chapter_id"] == cid]
                win_gold_sum = sum(st["double_reward"] for st in ch_stages)
                avg_fail_gold = sum(st["fail_reward"] for st in ch_stages) / len(ch_stages)
                total_plays = stage_cnt / win_rate
                fail_plays = total_plays - stage_cnt
                fail_gold_sum = int(fail_plays * avg_fail_gold)

                combat_gold = win_gold_sum + fail_gold_sum
                welfare_gold = int(days_needed * daily_welfare)
                ch_total = combat_gold + welfare_gold
                cum_total_gold += ch_total

                writer.writerow([
                    f"第 {cid} 章", cname, f"Stage {r0}~{r1}", stage_cnt, f"{int(win_rate*100)}%",
                    turns, f"{plays_per_day} 場/日", f"{adv_per_day:.2f} 關/日",
                    f"{days_needed} 天", f"{cum_days} 天",
                    combat_gold, welfare_gold, ch_total, cum_total_gold,
                    exp_wpn, exp_tech
                ])
            writer.writerow([])

            # Section 3: All 350 Stages Detailed Table
            writer.writerow(["========================================================================="])
            writer.writerow(["【表三】全 350 關卡逐關詳細配置、通關獎勵與累計收益明細表"])
            writer.writerow(["========================================================================="])
            writer.writerow([
                "關卡ID", "章節ID", "所屬章節", "關卡名稱", "推薦戰力", "Boss戰力",
                "怪物數量", "怪物陣容配置", "過關基礎獎勵(G)", "盤面金幣上限(G)", "盤面金幣基礎面額",
                "過關預估總收益(基礎x2)", "敗戰預估收益(基礎x0.5)", "累計基礎過關金幣", "累計雙倍過關總金幣"
            ])

            for st in stages_data:
                writer.writerow([
                    st["id"], st["chapter_id"], st["chapter_name"], st["name"],
                    st["rec_power"], st["boss_val"], st["monster_count"], st["monsters_str"],
                    st["reward_gold"], st["gold_cap"], st["gold_base"],
                    st["double_reward"], st["fail_reward"],
                    st["cum_base_gold"], st["cum_double_gold"]
                ])

        print(f"[OK] Generated CSV: {out_path}")

if __name__ == "__main__":
    paths = [
        r"c:\Antigravity\2048RPG\Commercial_Edition\economy_350_stages.csv",
        r"c:\Antigravity\2048RPG\economy_350_stages.csv"
    ]
    generate_economy_csv(paths)
