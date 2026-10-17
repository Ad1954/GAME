# 《2048 RPG：王國遠征》黏土系列全資產 Prompt 典藏知識庫
> CLAY STYLE PROMPT REGISTRY & SPECIFICATION  
> 版本：v1.1.0 (C-STORY-086)  
> 建立/更新日期：2026-10-17  
> 說明：本文件完整收錄本作《2048 RPG：王國遠征》通過視覺審查的所有黏土（Clay Style）資產原始生成指令（Prompts）、防溢色光照隔離標準，以及前 3 章白底雜點重構 Backlog，作為後續資產修復、擴充章節與風格維持的唯一最高基準。

---

## 一、 核心風格錨點公式 (Core Style Anchor)

為確保所有資產呈現一致的「極致簡約、呆萌圓潤、幼兒陶土捏塑玩具」手感，所有生成指令必須強制繼承以下風格語句：

```text
Style: chunky minimalist polymer clay figurine, bold exaggerated shapes, smooth rounded clay surfaces, zero fine details, zero noisy textures, solid color blocking, highly legible silhouette at small sizes (48px). Tabletop toy figurine, bright studio lighting, isometric/front-facing 3/4 perspective.
```

### 🚨 絕對禁止之反向風格詞 (Negative Keywords)
- 嚴禁使用：`realistic`, `hyper-realistic`, `highly detailed`, `spiky crude armor`, `weathered metal`, `complex cracks`, `intricate filigree`, `sharp edges`, `gritty textures`, `photorealistic rendering`。

---

## 二、 特殊色背景去背與防溢色規範 (Chroma Key & Decoupling Protocol)

為徹底根除白底接觸陰影（Contact Shadows）發白、殘留硬色塊以及淺色獠牙/武器被誤挖問題，所有重構資產一律強制採用浮空特殊色背景，並遵守「光照硬隔離」規範：

### 1. 底色光譜波長互補方案
1. **綠幕方案 (`#00FF00`)**：適用於主色調為紅、橙、黃、褐、黑、紫之魔物與裝備。
   ```text
   ... perfectly isolated on a solid uniform pure chroma green screen (#00FF00) background, completely flat solid green, no floor, no ground, no pedestals, no cast shadows on background.
   ```
2. **桃紅幕方案 (`#FF00FF`)**：適用於主色調為綠、青、藍、純白、岩灰高光之魔物與裝備。
   ```text
   ... perfectly isolated on a solid uniform pure vibrant magenta screen (#FF00FF) background, completely flat solid magenta, no floor, no ground, no pedestals, no cast shadows on background.
   ```

### 2. 手段 A：提示詞「光照硬隔離」標準語句 (Prompt Lighting Decoupling)
AI 擴散模型具備真實物理全域光照（Global Illumination）特性，若僅指定純色背景，背景色會作為環境漫射光（Bounce Light / Color Spill）污染主體邊緣（例如：桃紅幕使橄欖綠皮膚因紅藍混色而偏暗褐）。因此後續算圖必須**強制在 Prompt 結尾追加以下光照隔離語句**：

```text
completely flat 2D cutout matte backdrop, zero color bleeding, zero ambient light bounce from backdrop onto subject, isolated studio three-point key lighting, sharp unlit contact boundary.
```

### 3. 環境色溢實戰經驗與警示
- **實測案例（第 I 章 32 督軍）**：使用 `#FF00FF` 桃紅底成功拯救了綠幕開洞的膝蓋，但洋紅反彈光使皮膚微泛咖啡暗褐色。後續重構綠色系魔物時，必須嚴格搭配上述「光照硬隔離」語句，杜絕色偏。

---

## 三、 第 I ~ VIII 章全章節魔物 Prompt 原始記錄

### 1. 第 I 章：林地與洞窟 (Chapter 1)
- **雜兵 4 格拼盤 (Minions 2x2)**:
  ```text
  A neat 2x2 grid of 4 cute minimalist chunky polymer clay tabletop miniature RPG monster figurines on a pure solid white background. Clean, smooth clay surfaces, bold exaggerated silhouettes, large solid color blocking, zero tiny details or complex textures, optimized for extreme readability at small UI icons (48px).
  Top-Left: Cute Cave Bat with giant exaggerated round ears, simple outstretched small clay wings, chubby round body in deep purple-magenta clay.
  Top-Right: Forest Wolf Cub with prominent tall perky pointed wolf ears, solid warm grey-brown clay fur, clean cream-white chest clay patch, chubby tail, sitting pose.
  Bottom-Left: Goblin Scout with huge horizontal pointed goblin ears, big round eyes, round button nose, bright grass-green clay skin, holding a simple chunky wooden club.
  Bottom-Right: Wild Slime, a glossy vibrant lime-green smooth clay droplet, perfectly round teardrop shape with a tiny pointed tip on top, two simple black bead eyes, zero other decoration.
  Isometric tabletop toy perspective, bright studio lighting, subtle soft clay contact shadows under each figure, high color contrast.
  ```
- **首領 32 督軍 (Boss Orc Warlord)**:
  ```text
  A single cute minimalist chunky polymer clay tabletop miniature RPG Orc Warlord monster boss figurine on a pure solid white background. Clean, smooth clay surfaces, bold exaggerated silhouettes, large solid color blocking, zero tiny details, zero complex textures, optimized for extreme readability at small UI icons (48px). Chunky wide square jaw in olive-green polymer clay, two large prominent upward-pointing thick white tusks protruding from the mouth, small fierce black bead eyes, thick heavy clay shoulders and arms, wearing a simple solid crimson-red clay waistcloth. Tabletop toy figurine, standing pose, centered, bright studio lighting, subtle soft clay contact shadow underneath, high contrast, clean minimalist clay sculpting.
  ```

### 2. 第 II 章：熔岩地窟 (Chapter 2)
- **雜兵 4 格拼盤 (Minions 2x2)**:
  ```text
  A 2x2 grid displaying 4 distinct fantasy fire-themed tabletop miniature figurines made of smooth polymer clay, front-facing 3/4 view, clean pure white background, soft studio lighting. Style: chunky minimalist polymer clay figurine, bold exaggerated shapes, smooth rounded clay surfaces, zero fine details, zero noisy textures, solid color blocking, highly legible silhouette at small sizes.
  Top-Left: Spark Lizard, cute chunky lizard in bright orange-red clay, yellow rounded dorsal bumps on back, cute wide jaw, big dark round eyes.
  Top-Right: Lava Spirit, cute teardrop fire elemental in bright red flame body with bright yellow round face, two cute black eye dots.
  Bottom-Left: Lava Slime, bubbling split-ready puddle of dark red molten clay with glowing orange liquid heart.
  Bottom-Right: Flame Bruiser, burly humanoid brawler in dark ash-grey clay, glowing orange fists.
  ```
- **雙首領 (Magma Troll 256 & Obsidian Dragon 512)**:
  ```text
  Two cute minimalist chunky polymer clay tabletop miniature RPG fire-themed boss monster figurines side by side on a pure solid white background. Clean, smooth clay surfaces, bold exaggerated silhouettes, large solid color blocking, zero tiny details, optimized for extreme readability at small UI icons (48px).
  Left: Magma Troll, a chunky volcanic rock brute made of solid charcoal-grey clay with simple bold glowing-orange molten clay belly patch and heavy stone-pillar arms.
  Right: Obsidian Dragon, a chubby chibi volcanic dragon in glossy black-obsidian polymer clay with a pair of thick bright crimson-red clay horns, two simple fiery-red clay wings outstretched, and a sturdy cute tail.
  Isometric tabletop toy perspective, bright studio lighting, subtle soft clay contact shadows under each figure, high color contrast, clean minimalist clay sculpting.
  ```

### 3. 第 III 章：蒼藍高山 (Chapter 3)
- **雙首領 (Mountain Colossus 1024 & Peak Overlord 2048)**:
  ```text
  A side-by-side 1x2 panel displaying 2 distinct fantasy tabletop miniature figurines made of smooth polymer clay, front-facing 3/4 view, clean pure white background, soft studio lighting. Style: chunky minimalist polymer clay figurine, bold exaggerated shapes, smooth rounded clay surfaces, zero fine details, zero noisy textures, solid color blocking, highly legible silhouette at small sizes.
  Left Panel: Mountain Colossus (giant rock titan miniature), massive rounded boulder shoulders, moss-green clay patches on chest, powerful hunched stance with two giant boulder fists, tiny glowing amber eye slit, extreme chunky silhouette.
  Right Panel: Peak Overlord (epic rock king Boss miniature), towering dark basalt rock physique, crowned with an impressive jagged golden-yellow mineral crown, chest embedded with a large glowing molten-orange magma core rune, thick rocky stone mantle draped behind, imposing boss silhouette. Both figurines evenly spaced, isolated on seamless pure white background.
  ```

### 4. 第 IV 章：毒蛛荒漠 (Chapter 4)
- **雜兵 4 格拼盤 (Minions 2x2)**:
  ```text
  A 2x2 grid displaying 4 distinct fantasy desert tabletop miniature figurines made of smooth polymer clay, front-facing 3/4 view, clean pure white background, soft studio lighting. Style: chunky minimalist polymer clay figurine, bold exaggerated shapes, smooth rounded clay surfaces, zero fine details, zero noisy textures, solid color blocking, highly legible silhouette at small sizes.
  Top-Left: Dune Scorpion (chunky desert scorpion), warm sandy-mustard yellow clay, big plump rounded pincers, oversized curved tail arching forward with glowing emerald-green venom droplet at tip, big dark round eyes.
  Top-Right: Stinger Broodmother (plump spider broodmother), huge round bulbous abdomen in desert-tan clay with bold bright-violet round spots, 4 thick stubby clay legs, glossy black bead eyes.
  Bottom-Left: Desert Tarantula (chunky round tarantula), rich caramel-brown clay, bold bright-orange warning chevron on back, 4 chunky stubby legs, glossy eye dots.
  Bottom-Right: Arachnid Shaman (spider cultist), wearing dark violet hooded robe over clay spider centaur body, holding a chunky gnarled staff with a glowing bright-green orb, mysterious glowing yellow eye dots under hood. The 4 figurines are evenly spaced in a 2x2 layout, isolated on seamless solid pure white background.
  ```
- **首領 (Spider Queen 2048)**:
  ```text
  A standalone fantasy tabletop miniature figurine made of smooth polymer clay, front-facing 3/4 view, clean pure white background, soft studio lighting. Style: chunky minimalist polymer clay figurine, bold exaggerated shapes, smooth rounded clay surfaces, zero fine details, zero noisy textures, solid color blocking, highly legible silhouette at small sizes.
  Subject: Ancient Spider Queen (epic spider boss miniature), towering and wide imposing presence, massive rounded obsidian-black and deep-crimson clay abdomen emblazoned with a large glowing crimson-red hypnotic eye sigil, carapace crowned with a sharp ivory-white spiked bone crown, several large glowing red eye dots on head, thick powerful clay legs. Imposing boss silhouette filling 85% of the frame, isolated on seamless pure white background.
  ```

### 5. 第 V ~ VIII 章魔物 Prompt 規範
- **第 V 章 死靈黑夜 (Undead Night)**:
  - 骨犬、骷髏狂戰士、幽魂、死靈法師、巫妖王。統一採用 `#00FF00` 綠幕背景。
- **第 VI 章 黑曜龍窟 (Obsidian Cavern)**:
  - 熔岩石像鬼、黑曜巨龍。統一採用 `#00FF00` 綠幕背景。
- **第 VII 章 聖堂神衛 (Celestial Vanguard)**:
  - 光翼侍從、聖輝大主教、六翼座天使、神聖審判官。統一採用 `#FF00FF` 桃紅幕背景。
- **第 VIII 章 終焉神域 (Final Domain)**:
  - 血日古神、黑曜破壞神、終焉萬象之王。統一採用 `#00FF00` 綠幕背景。

---

## 四、 英雄（Hero）與裝備（Equipment）Prompt 典藏

### 1. 英雄 4 個時代 (Eras 1~4) 黏土進化線
- **Prompt 範本 (以桃紅幕 `#FF00FF` 隔離)**:
  ```text
  A 1x4 panel displaying 4 distinct fantasy hero tabletop miniature figurines made of smooth polymer clay, front-facing 3/4 view, isolated on solid flat uniform pure vibrant magenta screen (#FF00FF), completely isolated, no floor cast shadows, no pedestals.
  Style: chunky minimalist polymer clay figurine, bold exaggerated shapes, smooth rounded clay surfaces, zero fine details, zero noisy textures, solid color blocking, highly legible silhouette at small sizes.
  Tier 1: Peasant Militia (simple brown cloth tunics, pitchfork, straw hat).
  Tier 2: Footman Recruit (iron round helm, simple leather vest, short sword).
  Tier 3: Bronze Guard (bronze armor plate, kite shield, broadsword).
  Tier 4: Iron Knight (full plate cuirass, visored helm, knightly longsword).
  ```

### 2. 裝備品 (Equipment Tiers 1~16)
- **Prompt 範本 (以桃紅幕 `#FF00FF` 隔離)**:
  ```text
  A 1x4 grid displaying 4 distinct fantasy weapon and shield tabletop miniature props made of smooth polymer clay, front-facing view, on solid flat hot magenta background, no floor shadows, no pedestals.
  Style: chunky minimalist polymer clay model, bold shapes, smooth clay surfaces, solid color blocking.
  ```

---

## 五、 後續優化 Backlog：前 3 章魔物白底雜點特殊色重構計畫

### 1. 待辦重構目標清單 (Backlog Scope)
目前前 3 章部分魔物圖資最初是以白色背景生成，周邊略帶輕微白底抗鋸齒過渡像素或微小接觸雜點，列為後續視覺純化優化項目：
- **第 I 章 (序章平原)**：史萊姆 (2)、哥布林 (4)、野狼 (8)、強盜 (16)。
- **第 II 章 (綠野奇遇)**：毒蜘蛛 (8)、毒蜂 (16)、樹精 (32)、巨型甲蟲 (64)、林地守護者 (128)。
- **第 III 章 (迷霧森林)**：迷霧蝙蝠 (32)、影子蜥蜴 (64)、鬼火妖精 (128)、幻影狼 (256)、迷霧幻獸 (512)。

### 2. 重構執行原則與防走樣規範 (Anti-Distortion Guidelines)
由於目前第一版造型深受好評、極具呆萌手作微縮玩具感，為避免單體重新生成導致「細節膨脹、過度寫實、比例走樣」，後續重構時必須嚴格遵守：
1. **堅持 4 格拼盤（2x2 Layout）同批生成**：
   - 絕不單體重新單獨發散生成，強制以 2x2 四格拼盤進行約束，保持一致的比例與呆萌大頭短身體積。
2. **底色強制搭配「光照硬隔離」**：
   - 採用純綠幕或純桃紅幕，並附帶 `completely flat 2D cutout matte backdrop, zero color bleeding...` 語句，徹底阻絕背景反彈色溢。
3. **優先順序決策**：
   - 由於目前遊戲內 40 隻魔物已 100% 圓滿閉環且視覺表現優異，本項重構作為後續視覺精修項目暫存，優先推進遊戲玩法與數值系統（如角色特殊能力系統）。

