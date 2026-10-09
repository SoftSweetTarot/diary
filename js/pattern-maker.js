/* 말랑달콤 다이어리 - js/pattern-maker.js
   ✏️ 배경지 만들기 3종 · 📂 내 배경지 · 💾 배경지 파일 저장 · 🌟 카페에서 받아 등록한 사용자 배경지
   - 🧵 무늬 메이커     : 줄무늬 · 도트 · 깅엄 체크 · 격자 · 물결 (색 · 굵기 · 간격 · 기울기)
   - 🖼 이미지 배경지     : 내 사진/그림을 바둑판 · 엇갈림으로 반복
   - 🖌 그려서 만들기   : 한 칸을 그리면 이어 붙인 모습이 바로 보임 (이어그리기로 경계가 자연스럽게 연결)
   - 내 배경지는 설정값 'diary_my_patterns' 로 저장 → 말랑달콤 / 다이어리 / 내배경지.json 파일 하나 (js/drive.js)
       [{"uid":"k3x9","name":"딸기 사선","r":{레시피},"at":1759300000000}, ...]
   - 💾 파일로 저장 : 파일 이름 · 만든 사람을 쓰면 '이름.json' 파일 하나(이미지 포함)를 내려받아요 → 사용자가 카페 글에 첨부 (js/sharebox.js shxAsk)
   - 📥 파일 불러오기 : 내 배경지 칸 맨 위 · 카페에서 받은 배경지 파일을 내 배경지에 넣어요 (by 닉네임 표시 · 사용자끼리 주고받기, 개발자 등록 없음)
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → patterns → pattern-recipe → skins → pattern-maker → service */

        /* =====================================================================
           📂 내 배경지 (저장 · 불러오기 · 삭제)
           ===================================================================== */
        const MY_PATTERN_KEY = 'diary_my_patterns';
        const MY_PATTERN_MAX = 30;                 // 최대 개수
        const MY_PATTERN_MAX_CHARS = 400000;       // 내 배경지 전체 최대 글자 수 (여는 시간이 길어지지 않도록)
        let myPatterns = [];

        function loadMyPatterns() {
            let arr = null;
            try { arr = JSON.parse(store.getItem(MY_PATTERN_KEY)); } catch (e) { arr = null; }
            myPatterns = [];
            if (!Array.isArray(arr)) return;
            arr.forEach(it => {
                if (!it || typeof it !== 'object') return;
                const r = sanitizeRecipe(it.r);
                const uid = typeof it.uid === 'string' && /^[a-z0-9]{1,24}$/.test(it.uid) ? it.uid : null;
                if (r && uid && !myPatterns.some(m => m.uid === uid)) {
                    const by = recipeText(it.by, 12);
                    myPatterns.push(Object.assign({ uid, name: recipeText(it.name, 20) || '내 배경지', r, at: +it.at || 0 }, by ? { by } : {}));
                }
            });
        }

        function saveMyPatterns() {
            if (myPatterns.length) store.setItem(MY_PATTERN_KEY, JSON.stringify(myPatterns));
            else if (store.getItem(MY_PATTERN_KEY) !== null) store.removeItem(MY_PATTERN_KEY);
        }

        function getMyPatternItems() {
            return myPatterns.map(m => ({ id: 'my:' + m.uid, uid: m.uid, tier: 'my', name: m.name, by: m.by || '', css: recipeToCss(m.r), recipe: m.r }))
                .filter(p => p.css);
        }

        function addMyPattern(name, r, by, file) {                     // by · file : 📥 파일로 불러온 배경지 (만든 사람 · 이미 있으면 'same')
            const clean = sanitizeRecipe(r);
            if (!clean) { showMsg('⚠ 배경지를 저장하지 못했어요.<br>다시 만들어 주세요.'); return null; }
            const nm = recipeText(name, 20) || '내 배경지';
            const same = myPatterns.find(m => m.name === nm && JSON.stringify(m.r) === JSON.stringify(clean));
            if (same) return file ? 'same' : same.uid;                    // 같은 배경지를 두 번 누르면 하나만
            if (myPatterns.length >= MY_PATTERN_MAX) { showMsg(`📂 내 배경지는 최대 ${MY_PATTERN_MAX}개까지 저장할 수 있어요.<br>안 쓰는 배경지를 지운 뒤 다시 저장해 주세요.`); return null; }
            const total = JSON.stringify(myPatterns).length + JSON.stringify(clean).length;
            if (total > MY_PATTERN_MAX_CHARS) { showMsg('📂 내 배경지 저장 공간이 가득 찼어요.<br>이미지·그림 배경지를 몇 개 지운 뒤 다시 저장해 주세요.'); return null; }
            const uid = (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).slice(0, 24);
            const who = recipeText(by, 12);
            myPatterns.push(Object.assign({ uid, name: nm, r: clean, at: Date.now() }, who ? { by: who } : {}));
            saveMyPatterns();
            return uid;
        }

        async function deleteMyPattern(uid) {
            const m = myPatterns.find(x => x.uid === uid);
            if (!m) return;
            if (!(await showMsg(`'${m.name}' 배경지를 내 배경지에서 지울까요?`, true))) return;
            myPatterns = myPatterns.filter(x => x.uid !== uid);
            saveMyPatterns();
            if (bgPattern && bgPattern.id === 'my:' + uid) clearBgPattern();
            renderPatternList();
        }

        /* =====================================================================
           🌟 등록된 사용자 배경지 (js/community-patterns.js 의 COMMUNITY_PATTERNS)
           - 이 파일이 없거나 깨져 있어도 다이어리는 그대로 동작 (목록에만 안 보임)
           ===================================================================== */
        let communityItems = null;

        function getCommunityItems() {
            if (communityItems) return communityItems;
            communityItems = [];
            const list = (typeof COMMUNITY_PATTERNS !== 'undefined' && Array.isArray(COMMUNITY_PATTERNS)) ? COMMUNITY_PATTERNS : [];
            list.forEach(row => {
                const no = parseInt(row && row.no, 10);
                const r = row && sanitizeRecipe(row.recipe);
                const css = r && recipeToCss(r);
                if (!no || !css || communityItems.some(x => x.id === 'cm:' + no)) return;
                communityItems.push({
                    id: 'cm:' + no, tier: 'free',
                    name: recipeText(row.name, 20) || '사용자 배경지', by: recipeText(row.by, 12), css, recipe: r
                });
            });
            return communityItems;
        }

        /* =====================================================================
           ✏️ 만들기 창 공통
           ===================================================================== */
        let makerMode = 'weave';
        let makerRecipe = null;          // 지금 미리보기 중인 레시피 (이미지·그림은 미리보기용 큰 이미지)
        let makerTimer = null;

        const MAKER_TITLES = { weave: '🧵 무늬 메이커', image: '🖼 내 이미지로 배경지', draw: '🖌 그려서 만들기' };
        const MAKER_DEFAULT_NAMES = { weave: '나의 무늬', image: '나의 이미지 배경지', draw: '나의 그림 배경지' };

        function openMaker(mode) {
            makerMode = ['weave', 'image', 'draw'].includes(mode) ? mode : 'weave';
            closeModal('skinModal');
            document.getElementById('makerTitle').textContent = MAKER_TITLES[makerMode];
            ['weave', 'image', 'draw'].forEach(m => { document.getElementById('maker-' + m).style.display = m === makerMode ? 'block' : 'none'; });
            const nameInput = document.getElementById('makerName');
            if (!nameInput.value || Object.values(MAKER_DEFAULT_NAMES).includes(nameInput.value)) nameInput.value = MAKER_DEFAULT_NAMES[makerMode];
            openModal('makerModal');
            loadPatternNick();
            if (makerMode === 'weave') { setupWeaveUI(); updateWeave(); }
            if (makerMode === 'image') { setupImageUI(); updateImagePattern(); }
            if (makerMode === 'draw') { setupDrawUI(); updateDrawPreview(); }
        }

        function backToSkinMenuFromMaker() { closeModal('makerModal'); openModal('skinModal'); }

        function showMakerPreview(recipe) {
            makerRecipe = recipe;
            const el = document.getElementById('makerPreview');
            const css = recipe && recipeToCss(recipe);
            paintPatternInto(el, css ? { css } : null);
            document.getElementById('makerPreviewEmpty').style.display = css ? 'none' : 'flex';
        }

        /* 저장·보내기용 최종 레시피 (이미지·그림은 용량에 맞게 다시 압축) */
        function finalMakerRecipe() {
            if (makerMode === 'weave') return sanitizeRecipe(weaveRecipe());
            if (makerMode === 'image') {
                if (!imgState.img) { showMsg('🖼 먼저 이미지를 골라 주세요.'); return null; }
                const t = buildImageTile(2);
                const src = encodeTile(t.canvas, imgState.bg, t.scale);
                if (!src) { showMsg('⚠ 이미지가 너무 복잡해서 저장할 수 없어요.<br>이미지 크기를 줄이거나 간격을 줄여 주세요.'); return null; }
                return sanitizeRecipe({ v: 1, kind: 'tile', src, w: t.w, h: t.h, bg: imgState.bg, from: 'image' });
            }
            if (makerMode === 'draw') {
                if (!drawState.drawn) { showMsg('🖌 먼저 칸 안에 그림을 그려 주세요.'); return null; }
                const src = encodeTile(drawBoard(), drawState.bg, 2);
                if (!src) { showMsg('⚠ 그림이 너무 복잡해서 저장할 수 없어요.<br>칸 크기를 줄여서 다시 그려 주세요.'); return null; }
                return sanitizeRecipe({ v: 1, kind: 'tile', src, w: drawState.tile, h: drawState.tile, bg: drawState.bg, from: 'draw' });
            }
            return null;
        }

        function makerSave(apply) {
            const r = finalMakerRecipe();
            if (!r) return;
            const uid = addMyPattern(document.getElementById('makerName').value, r);
            if (!uid) return;
            if (apply) selectBgPattern('my:' + uid);
        }

        function makerDownload() {
            const r = finalMakerRecipe();
            if (!r) return;
            downloadPatternFile(document.getElementById('makerName').value, r, 'makerBy');
        }

        /* ---------- 💾 패턴 파일 : 카페에 첨부해서 올리는 파일 (이미지까지 파일 하나에 들어 있음) ---------- */
        const PATTERN_NICK_KEY = 'malang_pattern_nick';

        /* 닉네임 : 만들기 창(makerBy)에 적거나 💾 저장 창에서 적어요 · 이 기기에 기억 */
        function patternNick(fromId) {
            const ids = fromId ? [fromId] : ['makerBy'];
            let v = '';
            ids.forEach(id => { const el = document.getElementById(id); if (!v && el) v = recipeText(el.value, 12); });
            try { if (v) localStorage.setItem(PATTERN_NICK_KEY, v); } catch (e) {}
            return v;
        }
        function loadPatternNick() {
            let saved = '';
            try { saved = localStorage.getItem(PATTERN_NICK_KEY) || ''; } catch (e) {}
            ['makerBy'].forEach(id => { const el = document.getElementById(id); if (el && !el.value) el.value = saved; });
        }

        async function downloadPatternFile(name, r, nickFrom) {
            const nm = recipeText(name, 20) || '내 배경지';
            if (!window.shxAsk) return;
            const a = await shxAsk('💾 배경지 파일로 저장', nm, patternNick(nickFrom));
            if (!a) return;
            shxDownload({ malang_pattern: 1, name: nm, by: a.by, recipe: r }, a.name);
            showMsg('💾 <b>' + recipeText(a.name, 40) + '.json</b> 파일을 저장했어요!<br><br>말랑달콤 카페의 <b>배경지 게시판</b>에 첨부해서 올려 주세요.<br><span style="font-size:12px;color:#777;">받은 사람은 페이지 → 배경지 → 내 배경지의 📥 파일 불러오기로 넣어요.<br>아이패드 · 아이폰은 \'파일\' 앱 → 다운로드 폴더에 있어요.</span>');
        }

        function downloadMyPattern(uid) {
            const m = myPatterns.find(x => x.uid === uid);
            if (m) downloadPatternFile(m.name, m.r);
        }

        /* 📥 내 배경지 → 파일 불러오기 : 카페에서 받은 배경지 파일 (.json · 예전 .malang.txt 도 속은 같아요) */
        function pickPatternFile() {
            let inp = document.getElementById('patFileIn');
            if (!inp) {
                inp = document.createElement('input');
                inp.type = 'file'; inp.id = 'patFileIn'; inp.hidden = true;
                inp.accept = '.json,.txt,application/json,text/plain';
                inp.onchange = () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) importPatternFile(f); };
                document.body.appendChild(inp);
            }
            inp.click();
        }
        async function importPatternFile(f) {
            if (f.size > 5 * 1024 * 1024) { showMsg('⚠ 파일이 너무 커요.'); return; }
            let o = null;
            try { o = JSON.parse(await f.text()); } catch (e) {}
            if (o && o.malang_sticker) { showMsg('✨ 스티커 파일이에요.<br><b>✨ 스티커 → 그 종류 → 공유받은</b> 칸의 📥 파일 불러오기로 넣어 주세요.'); return; }
            if (!o || o.malang_pattern !== 1 || !o.recipe) { showMsg('⚠ 말랑달콤 배경지 파일이 아니에요.<br><span style="font-size:12px;color:#777;">카페에서 받은 배경지 파일을 골라 주세요.</span>'); return; }
            if (!sanitizeRecipe(o.recipe)) { showMsg('⚠ 배경지 파일을 읽을 수 없어요.'); return; }
            const uid = addMyPattern(o.name, o.recipe, o.by, true);
            if (!uid) return;
            if (uid === 'same') { showMsg('📂 이미 내 배경지에 있는 배경지예요.'); return; }
            if (typeof renderPatternList === 'function') renderPatternList();
            showMsg(`🎉 '${recipeText(o.name, 20) || '내 배경지'}' 배경지를 내 배경지에 넣었어요!` + (recipeText(o.by, 12) ? `<br><small>by ${recipeText(o.by, 12).replace(/[<>&]/g, '')}</small>` : ''));
        }
        window.pickPatternFile = pickPatternFile;

        /* 이미지·그림 한 칸을 레시피 용량(RECIPE_MAX_SRC) 안에 들어가도록 압축
           PNG(투명 유지) → WEBP(투명 유지) → JPEG(바탕색을 칠해서) 순서로, 안 되면 해상도를 낮춰 다시 시도 */
        function encodeTile(canvas, bg, scale) {
            const tries = [canvas];
            if (scale > 1) {
                const small = document.createElement('canvas');
                small.width = Math.max(1, Math.round(canvas.width / scale));
                small.height = Math.max(1, Math.round(canvas.height / scale));
                small.getContext('2d').drawImage(canvas, 0, 0, small.width, small.height);
                tries.push(small);
            }
            const ok = s => s && s.length <= RECIPE_MAX_SRC;
            for (const c of tries) {
                const png = c.toDataURL('image/png');
                if (ok(png)) return png;
                for (const q of [0.92, 0.85, 0.75, 0.6, 0.45]) {
                    const w = c.toDataURL('image/webp', q);
                    if (w.startsWith('data:image/webp') && ok(w)) return w;
                }
            }
            for (const c of tries) {
                const flat = document.createElement('canvas');
                flat.width = c.width; flat.height = c.height;
                const fx = flat.getContext('2d');
                fx.fillStyle = bg || '#ffffff'; fx.fillRect(0, 0, flat.width, flat.height);
                fx.drawImage(c, 0, 0);
                for (const q of [0.9, 0.8, 0.65, 0.5, 0.4]) {
                    const j = flat.toDataURL('image/jpeg', q);
                    if (ok(j)) return j;
                }
            }
            return null;
        }

        function bindRange(id, onInput) {
            const el = document.getElementById(id);
            if (!el || el._bound) return;
            el._bound = true;
            el.addEventListener('input', onInput);
        }

        /* =====================================================================
           🧵 무늬 메이커 : 줄무늬 · 도트 · 깅엄 체크 · 격자 · 물결
           ===================================================================== */
        const WEAVE_PRESETS = {
            stripe:  { w: 14, g: 14, angle: 45, bg: '#fff0f5', c1: '#f7b8ca', a: 1 },
            dot:     { w: 5,  g: 18, stagger: true, bg: '#ffe7ee', c1: '#ffffff', a: 1 },
            check:   { w: 16, bg: '#eef4fc', c1: '#85a6dc', a: 0.36 },
            grid:    { w: 2,  g: 24, bg: '#fffdf7', c1: '#78aad2', a: 0.45 },
            scallop: { w: 13, bg: '#d6ebf6', c1: '#ffffff', a: 1 }
        };
        const WEAVE_LABELS = {
            stripe:  { w: '줄 굵기', g: '줄 간격' },
            dot:     { w: '점 크기', g: '점 간격' },
            check:   { w: '칸 크기' },
            grid:    { w: '선 굵기', g: '칸 크기' },
            scallop: { w: '물결 크기' }
        };
        let weave = Object.assign({ kind: 'stripe' }, WEAVE_PRESETS.stripe);

        function setupWeaveUI() {
            document.querySelectorAll('#weaveKinds .cat-btn').forEach(b => b.classList.toggle('active', b.dataset.kind === weave.kind));
            const lab = WEAVE_LABELS[weave.kind];
            const show = (id, on) => { document.getElementById(id).style.display = on ? 'flex' : 'none'; };
            document.getElementById('weaveWLabel').textContent = lab.w;
            show('weaveGRow', !!lab.g);
            if (lab.g) document.getElementById('weaveGLabel').textContent = lab.g;
            show('weaveAngleRow', weave.kind === 'stripe');
            show('weaveStaggerRow', weave.kind === 'dot');
            document.getElementById('weaveBg').value = weave.bg;
            document.getElementById('weaveC1').value = weave.c1;
            document.getElementById('weaveA').value = weave.a;
            document.getElementById('weaveW').value = weave.w;
            document.getElementById('weaveG').value = weave.g != null ? weave.g : 12;
            document.getElementById('weaveAngle').value = weave.angle != null ? weave.angle : 45;
            document.getElementById('weaveStagger').checked = !!weave.stagger;
            ['weaveBg', 'weaveC1', 'weaveA', 'weaveW', 'weaveG', 'weaveAngle'].forEach(id => bindRange(id, readWeaveUI));
            const st = document.getElementById('weaveStagger');
            if (!st._bound) { st._bound = true; st.addEventListener('change', readWeaveUI); }
        }

        function setWeaveKind(kind) {
            if (!WEAVE_PRESETS[kind]) return;
            weave = Object.assign({ kind }, WEAVE_PRESETS[kind]);
            setupWeaveUI();
            updateWeave();
        }

        function readWeaveUI() {
            weave.bg = document.getElementById('weaveBg').value;
            weave.c1 = document.getElementById('weaveC1').value;
            weave.a = parseFloat(document.getElementById('weaveA').value);
            weave.w = parseFloat(document.getElementById('weaveW').value);
            weave.g = parseFloat(document.getElementById('weaveG').value);
            weave.angle = parseFloat(document.getElementById('weaveAngle').value);
            weave.stagger = document.getElementById('weaveStagger').checked;
            updateWeave();
        }

        function weaveRecipe() { return Object.assign({ v: 1 }, weave); }

        function updateWeave() {
            document.getElementById('weaveAVal').textContent = Math.round(weave.a * 100) + '%';
            document.getElementById('weaveWVal').textContent = weave.w + 'px';
            document.getElementById('weaveGVal').textContent = (weave.g != null ? weave.g : 12) + 'px';
            document.getElementById('weaveAngleVal').textContent = (weave.angle != null ? weave.angle : 45) + '°';
            showMakerPreview(sanitizeRecipe(weaveRecipe()));
        }

        /* =====================================================================
           🖼 내 이미지로 배경지 : 크기 · 간격 · 배치(바둑판/엇갈림) · 투명도 · 바탕색
           ===================================================================== */
        const imgState = { img: null, size: 70, gap: 24, layout: 'brick', alpha: 1, bg: '#fff8fb' };

        function setupImageUI() {
            document.getElementById('imgPatSize').value = imgState.size;
            document.getElementById('imgPatGap').value = imgState.gap;
            document.getElementById('imgPatAlpha').value = imgState.alpha;
            document.getElementById('imgPatBg').value = imgState.bg;
            document.querySelectorAll('#imgPatLayout .cat-btn').forEach(b => b.classList.toggle('active', b.dataset.layout === imgState.layout));
            ['imgPatSize', 'imgPatGap', 'imgPatAlpha', 'imgPatBg'].forEach(id => bindRange(id, readImageUI));
        }

        function readImageUI() {
            imgState.size = parseInt(document.getElementById('imgPatSize').value, 10);
            imgState.gap = parseInt(document.getElementById('imgPatGap').value, 10);
            imgState.alpha = parseFloat(document.getElementById('imgPatAlpha').value);
            imgState.bg = document.getElementById('imgPatBg').value;
            clearTimeout(makerTimer);
            makerTimer = setTimeout(updateImagePattern, 60);
        }

        function setImageLayout(layout) {
            imgState.layout = layout === 'grid' ? 'grid' : 'brick';
            setupImageUI();
            updateImagePattern();
        }

        function pickPatternImage(e) {
            const file = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!file) return;
            if (file.type && !file.type.startsWith('image/')) { showMsg('이미지 파일만 쓸 수 있어요.'); return; }
            const url = URL.createObjectURL(file);
            const im = new Image();
            im.onload = () => {
                /* 너무 큰 사진은 미리 줄여 두기 (이후 계산을 가볍게) */
                const max = 600, k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
                const c = document.createElement('canvas');
                c.width = Math.max(1, Math.round(im.naturalWidth * k));
                c.height = Math.max(1, Math.round(im.naturalHeight * k));
                c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                URL.revokeObjectURL(url);
                imgState.img = c;
                document.getElementById('imgPatFileName').textContent = file.name;
                updateImagePattern();
            };
            im.onerror = () => { URL.revokeObjectURL(url); showMsg('이미지를 열지 못했어요. 다른 이미지로 해 보세요.'); };
            im.src = url;
        }

        /* 한 칸 만들기 : scale 배 해상도의 캔버스 + CSS 크기(w, h) */
        function buildImageTile(scale) {
            const { img, size, gap, layout, alpha } = imgState;
            const cellW = size + gap, cellH = size + gap;
            const w = cellW, h = layout === 'brick' ? cellH * 2 : cellH;
            const c = document.createElement('canvas');
            c.width = Math.round(w * scale); c.height = Math.round(h * scale);
            const ctx = c.getContext('2d');
            ctx.scale(scale, scale);
            ctx.globalAlpha = alpha;
            const k = Math.min(size / img.width, size / img.height);
            const dw = img.width * k, dh = img.height * k;
            const put = (cx, cy) => ctx.drawImage(img, cx - dw / 2, cy - dh / 2, dw, dh);
            put(cellW / 2, cellH / 2);
            if (layout === 'brick') { put(0, cellH * 1.5); put(cellW, cellH * 1.5); }
            return { canvas: c, w, h, scale };
        }

        function updateImagePattern() {
            document.getElementById('imgPatSizeVal').textContent = imgState.size + 'px';
            document.getElementById('imgPatGapVal').textContent = imgState.gap + 'px';
            document.getElementById('imgPatAlphaVal').textContent = Math.round(imgState.alpha * 100) + '%';
            if (!imgState.img) { showMakerPreview(null); return; }
            const t = buildImageTile(2);
            /* 미리보기는 용량 제한 없이 선명하게 (저장할 때 압축) */
            makerRecipe = { v: 1, kind: 'tile', w: t.w, h: t.h, bg: imgState.bg, from: 'image' };
            const el = document.getElementById('makerPreview');
            paintPatternInto(el, { css: { backgroundColor: imgState.bg, backgroundImage: `url("${t.canvas.toDataURL('image/png')}")`, backgroundSize: `${t.w}px ${t.h}px` } });
            document.getElementById('makerPreviewEmpty').style.display = 'none';
        }

        /* =====================================================================
           🖌 그려서 만들기 : 펜 · 지우개 · 도장 · 이어그리기 · 되돌리기
           ===================================================================== */
        const DRAW_SCALE = 2;
        const DRAW_STAMPS = ['🌸', '⭐', '💖', '🍓', '🍀', '🎀', '🐰', '☁️', '🌙', '🍒', '🌷', '🐾'];
        const drawState = { tile: 80, tool: 'pen', color: '#ff6b81', brush: 4, stamp: '🌸', wrap: true, bg: '#fff8fb', drawn: false, undo: [] };
        let drawing = null;

        function drawBoard() { return document.getElementById('drawBoard'); }

        function setupDrawUI() {
            const board = drawBoard();
            if (!board._ready) {
                board._ready = true;
                board.width = board.height = drawState.tile * DRAW_SCALE;
                board.addEventListener('pointerdown', drawStart);
                board.addEventListener('pointermove', drawMove);
                ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => board.addEventListener(t, drawEnd));
                const st = document.getElementById('drawStamps');
                DRAW_STAMPS.forEach(s => {
                    const b = document.createElement('button');
                    b.type = 'button'; b.className = 'cat-btn'; b.textContent = s; b.dataset.stamp = s;
                    b.onclick = () => { drawState.stamp = s; setDrawTool('stamp'); };
                    st.appendChild(b);
                });
                ['drawColor', 'drawBrush', 'drawBg'].forEach(id => bindRange(id, readDrawUI));
                document.getElementById('drawWrap').addEventListener('change', readDrawUI);
            }
            document.getElementById('drawColor').value = drawState.color;
            document.getElementById('drawBrush').value = drawState.brush;
            document.getElementById('drawBg').value = drawState.bg;
            document.getElementById('drawWrap').checked = drawState.wrap;
            document.getElementById('drawTile').value = drawState.tile;
            board.parentElement.style.backgroundColor = drawState.bg;
            document.querySelectorAll('#drawTools .cat-btn').forEach(b => b.classList.toggle('active', b.dataset.tool === drawState.tool));
            document.querySelectorAll('#drawStamps .cat-btn').forEach(b => b.classList.toggle('active', drawState.tool === 'stamp' && b.dataset.stamp === drawState.stamp));
            document.getElementById('drawBrushVal').textContent = drawState.brush;
        }

        function readDrawUI() {
            drawState.color = document.getElementById('drawColor').value;
            drawState.brush = parseInt(document.getElementById('drawBrush').value, 10);
            drawState.bg = document.getElementById('drawBg').value;
            drawState.wrap = document.getElementById('drawWrap').checked;
            drawBoard().parentElement.style.backgroundColor = drawState.bg;
            document.getElementById('drawBrushVal').textContent = drawState.brush;
            updateDrawPreview();
        }

        function setDrawTool(tool) {
            drawState.tool = ['pen', 'eraser', 'stamp'].includes(tool) ? tool : 'pen';
            setupDrawUI();
        }

        /* 칸 크기를 바꾸면 지금 그림을 새 크기에 맞춰 늘리거나 줄임 */
        function changeDrawTile(v) {
            const size = Math.max(30, Math.min(200, parseInt(v, 10) || 80));
            if (size === drawState.tile) return;
            const board = drawBoard();
            const old = document.createElement('canvas');
            old.width = board.width; old.height = board.height;
            old.getContext('2d').drawImage(board, 0, 0);
            drawState.tile = size;
            board.width = board.height = size * DRAW_SCALE;
            board.getContext('2d').drawImage(old, 0, 0, board.width, board.height);
            drawState.undo = [];
            updateDrawPreview();
        }

        function boardPoint(e) {
            const b = drawBoard(), r = b.getBoundingClientRect();
            return { x: (e.clientX - r.left) / r.width * b.width, y: (e.clientY - r.top) / r.height * b.height };
        }

        /* 이어그리기 : 칸 밖으로 나간 부분이 반대쪽에서 이어지도록 9군데에 같이 그림 */
        function paintWrapped(fn) {
            const b = drawBoard(), ctx = b.getContext('2d'), T = b.width;
            const offs = drawState.wrap ? [-T, 0, T] : [0];
            ctx.save();
            ctx.globalCompositeOperation = drawState.tool === 'eraser' ? 'destination-out' : 'source-over';
            offs.forEach(dx => offs.forEach(dy => { ctx.save(); ctx.translate(dx, dy); fn(ctx); ctx.restore(); }));
            ctx.restore();
        }

        function pushUndo() {
            const b = drawBoard();
            drawState.undo.push(b.getContext('2d').getImageData(0, 0, b.width, b.height));
            if (drawState.undo.length > 20) drawState.undo.shift();
        }

        function drawStart(e) {
            e.preventDefault();
            const board = drawBoard();
            try { board.setPointerCapture(e.pointerId); } catch (err) {}
            pushUndo();
            const p = boardPoint(e);
            if (drawState.tool === 'stamp') {
                const fs = (drawState.brush * 3 + 14) * DRAW_SCALE;
                paintWrapped(ctx => {
                    ctx.font = `${fs}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
                    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                    ctx.fillText(drawState.stamp, p.x, p.y);
                });
                drawState.drawn = true;
                updateDrawPreview();
                return;
            }
            drawing = { x: p.x, y: p.y };
            const lw = drawState.brush * DRAW_SCALE;
            paintWrapped(ctx => {
                ctx.fillStyle = drawState.color;
                ctx.beginPath(); ctx.arc(p.x, p.y, lw / 2, 0, Math.PI * 2); ctx.fill();
            });
            drawState.drawn = true;
        }

        function drawMove(e) {
            if (!drawing) return;
            e.preventDefault();
            const p = boardPoint(e), from = drawing;
            const lw = drawState.brush * DRAW_SCALE;
            paintWrapped(ctx => {
                ctx.strokeStyle = drawState.color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.beginPath(); ctx.moveTo(from.x, from.y); ctx.lineTo(p.x, p.y); ctx.stroke();
            });
            drawing = p;
            clearTimeout(makerTimer);
            makerTimer = setTimeout(updateDrawPreview, 120);
        }

        function drawEnd() {
            if (!drawing) return;
            drawing = null;
            updateDrawPreview();
        }

        function drawUndo() {
            const img = drawState.undo.pop();
            if (!img) return;
            drawBoard().getContext('2d').putImageData(img, 0, 0);
            updateDrawPreview();
        }

        async function drawClear() {
            if (!drawState.drawn) return;
            if (!(await showMsg('그린 그림을 모두 지울까요?', true))) return;
            pushUndo();
            const b = drawBoard();
            b.getContext('2d').clearRect(0, 0, b.width, b.height);
            drawState.drawn = false;
            updateDrawPreview();
        }

        function updateDrawPreview() {
            const b = drawBoard();
            const css = { backgroundColor: drawState.bg, backgroundImage: `url("${b.toDataURL('image/png')}")`, backgroundSize: `${drawState.tile}px ${drawState.tile}px` };
            paintPatternInto(document.getElementById('makerPreview'), { css });
            document.getElementById('makerPreviewEmpty').style.display = 'none';
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['pattern-maker'] = true;
