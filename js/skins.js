/* 말랑달콤 다이어리 - js/skins.js
   🎨 페이지 메뉴 (기본페이지 · 말랑배경지) · 전체 배경지 적용/저장/불러오기
   - 고른 배경지는 설정값 'diary_bg_pattern' 으로 저장 → 구글 드라이브 설정.json 에 함께 저장돼요
       예) "diary_bg_pattern": {"id":"tomato","scale":1}
   - 배경지 해제 시 이 값을 지워요 (설정.json 에서도 빠짐)
   - 목록 배치(한 줄에 몇 개·몇 줄·크기)는 기기마다 화면이 달라서 이 기기(localStorage)에만 기억
   - 배경지 출처 : 기본 제공(js/patterns.js) · 내 배경지('my:번호') · 등록된 사용자 배경지('cm:번호', 관리자가 승인한 것)
       등록된 사용자 배경지는 레시피를 함께 저장해서 {"id":"cm:3","scale":1,"r":{...}} 처럼 기록 → 목록에서 빠져도 배경은 유지
   - 🌟 모두의 페이지(js/community-skins.js) 목록도 여기서 읽어요. 페이지 고르기·저장은 js/settings.js
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → patterns → community-patterns → community-skins → pattern-recipe → skins → pattern-maker → service */

        const BG_PATTERN_KEY = 'diary_bg_pattern';
        const PATTERN_SCALE_MIN = 0.5, PATTERN_SCALE_MAX = 2;

        let bgPattern = null;              // 지금 적용된 배경지 { id, scale, r? } (없으면 null)

        /* id로 패턴 찾기 → { id, tier, name, css, by? } */
        function findBgPattern(id, inlineRecipe) {
            if (typeof id !== 'string') return null;
            if (id.startsWith('my:')) {
                return (typeof getMyPatternItems === 'function' ? getMyPatternItems() : []).find(p => p.id === id) || null;
            }
            if (id.startsWith('cm:')) {
                const hit = (typeof getCommunityItems === 'function' ? getCommunityItems() : []).find(p => p.id === id);
                if (hit) return hit;
                const css = inlineRecipe ? recipeToCss(inlineRecipe) : null;   // 목록을 아직 못 받았으면 저장된 레시피로 그리기
                return css ? { id, tier: 'free', name: '사용자 배경지', css } : null;
            }
            return BG_PATTERNS.find(p => p.id === id) || null;
        }
        function currentBgPattern() { return bgPattern ? findBgPattern(bgPattern.id, bgPattern.r) : null; }
        function clampPatternScale(v) {
            const n = parseFloat(v);
            return isNaN(n) ? 1 : Math.max(PATTERN_SCALE_MIN, Math.min(PATTERN_SCALE_MAX, Math.round(n * 100) / 100));
        }

        /* ---------- 화면에 그리기 (저장은 하지 않음) ---------- */
        function paintPatternInto(el, p) {
            el.style.backgroundColor = ''; el.style.backgroundImage = '';
            el.style.backgroundSize = ''; el.style.backgroundPosition = '';
            if (p) Object.assign(el.style, p.css);
        }

        function renderBgPattern() {
            const layer = document.getElementById('bgPatternLayer');
            const inner = document.getElementById('bgPatternInner');
            const p = currentBgPattern();
            paintPatternInto(inner, p);
            layer.style.setProperty('--pat-s', p ? bgPattern.scale : 1);
            document.documentElement.classList.toggle('bg-pattern-on', !!p);
            updatePatternUI();
        }

        /* ---------- 저장 : 설정(설정.json)에 id와 크기만 저장 ---------- */
        function saveBgPattern() {
            if (bgPattern) {
                const v = { id: bgPattern.id, scale: bgPattern.scale };
                if (bgPattern.r) v.r = bgPattern.r;
                if (bgPattern.g) v.g = 1;                                      // 받은배경지 칸 것 (다음에 열 때 어디서 읽을지 · js/pattern-maker.js)
                store.setItem(BG_PATTERN_KEY, JSON.stringify(v));
            }
            else if (store.getItem(BG_PATTERN_KEY) !== null) store.removeItem(BG_PATTERN_KEY);
        }

        /* ---------- 불러오기 : 드라이브 설정을 읽은 뒤 / PC 백업 불러온 뒤 호출 ----------
           값이 없거나, 깨졌거나, 목록에 없는 배경지가면 배경지 없이 표시 (저장된 값은 건드리지 않음) */
        function loadBgPattern() {
            if (typeof loadMyPatterns === 'function') loadMyPatterns();      // 내 배경지 목록 먼저 (js/pattern-maker.js)
            let v = null;
            try { v = JSON.parse(store.getItem(BG_PATTERN_KEY)); } catch (e) { v = null; }
            const r = v && v.r ? sanitizeRecipe(v.r) : null;
            bgPattern = (v && typeof v === 'object' && findBgPattern(v.id, r))
                ? { id: v.id, scale: clampPatternScale(v.scale) } : null;
            if (bgPattern && r) bgPattern.r = r;
            renderBgPattern();
        }

        async function selectBgPattern(id, got) {
            if (id.startsWith('my:') && !findBgPattern(id) && !(typeof patEnsure === 'function' && await patEnsure(id.slice(3), got == null ? null : !!got))) {
                showMsg('⚠ 이 배경지를 불러오지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인해 주세요.</span>'); return;
            }
            const p = findBgPattern(id);
            if (!p) return;
            bgPattern = { id, scale: bgPattern ? bgPattern.scale : 1 };
            if (p.recipe && id.startsWith('cm:')) bgPattern.r = p.recipe;      // 등록된 사용자 배경지는 레시피도 같이 저장
            if (p.got) bgPattern.g = 1;
            renderBgPattern();
            saveBgPattern();
            renderPatternList();
        }

        function clearBgPattern() {
            if (!bgPattern) return;
            bgPattern = null;
            renderBgPattern();
            saveBgPattern();
            renderPatternList();
        }

        /* 패턴 크기 : 움직이는 동안은 미리보기만, 손을 떼면 저장 */
        function onPatternScaleInput(save) {
            if (!bgPattern) return;
            bgPattern.scale = clampPatternScale(document.getElementById('patScaleInput').value);
            renderBgPattern();
            if (save) saveBgPattern();
        }

        /* ---------- 스킨 메뉴 ---------- */
        function openSkinBasic() {
            closeModal('skinModal');
            updatePatternUI();
            openModal('skinBasicModal');
        }

        /* ---------- 🌟 모두의 스킨 (카페에서 받아 관리자가 등록 : js/community-skins.js) ----------
           목록 한 줄 : {"no":1,"name":"봄날","by":"닉네임","skin":{색 5개}}  →  id 'cs:번호'
           파일이 없거나 깨져도 다이어리는 정상 동작 (모두의 페이지만 안 보임) */
        let communitySkinItems = null;
        function getCommunitySkins() {
            if (communitySkinItems) return communitySkinItems;
            communitySkinItems = [];
            const list = (typeof COMMUNITY_SKINS !== 'undefined' && Array.isArray(COMMUNITY_SKINS)) ? COMMUNITY_SKINS : [];
            list.forEach(row => {
                const no = parseInt(row && row.no, 10);
                const skin = row && sanitizeSkin(row.skin);
                if (!no || !skin || communitySkinItems.some(x => x.id === 'cs:' + no)) return;
                communitySkinItems.push({
                    id: 'cs:' + no, no,
                    name: recipeText(row.name, 20) || '모두의 페이지', by: recipeText(row.by, 12), skin
                });
            });
            return communitySkinItems;
        }

        /* ---------- 스킨 창 : 제목을 끌어서 옮기기 · 👀 꾹 눌러 다이어리 보기 ----------
           페이지 색을 바꾸면서 뒤의 다이어리가 어떻게 바뀌는지 볼 수 있게 */
        (function setupSkinWindows() {
            const posOf = {};
            const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
            document.querySelectorAll('.modal.skin-float').forEach(modal => {
                const box = modal.querySelector('.modal-content');
                const title = box && box.querySelector('.modal-title');
                if (!title) return;
                title.classList.add('drag-title');
                title.title = '끌어서 창을 옮길 수 있어요';
                let start = null;
                title.addEventListener('pointerdown', e => {
                    if (e.button > 0 || e.target.closest('button')) return;      // 제목 줄의 ← · ✕ · 👀 버튼은 끌기 아님
                    const p = posOf[modal.id] || { x: 0, y: 0 };
                    start = { x: e.clientX, y: e.clientY, ox: p.x, oy: p.y };
                    title.setPointerCapture(e.pointerId);
                    e.preventDefault();
                });
                title.addEventListener('pointermove', e => {
                    if (!start) return;
                    const r = box.getBoundingClientRect(), p = posOf[modal.id] || { x: 0, y: 0 };
                    /* 창이 화면 밖으로 나가지 않게 (창 전체가 화면 안에) */
                    const baseL = r.left - p.x, baseT = r.top - p.y;
                    const x = clamp(start.ox + e.clientX - start.x, -baseL, Math.max(-baseL, window.innerWidth - r.width - baseL));
                    const y = clamp(start.oy + e.clientY - start.y, -baseT, Math.max(-baseT, window.innerHeight - r.height - baseT));
                    posOf[modal.id] = { x, y };
                    box.style.position = 'relative'; box.style.left = x + 'px'; box.style.top = y + 'px';   // transform 이 아니라 left · top : 창이 따로 겹 층을 만들지 않아야 ← · ✕ 버튼이 테이프 위에 나와요
                    box.dispatchEvent(new Event('dk-move'));                   // 모서리 테이프도 창을 따라가게 (js/dakku.js dkTapes)
                });
                const end = () => { start = null; };
                title.addEventListener('pointerup', end);
                title.addEventListener('pointercancel', end);
            });
            /* 화면 크기가 바뀌면(폰 돌리기 등) 옮겨 둔 창은 가운데로 */
            window.addEventListener('resize', () => {
                Object.keys(posOf).forEach(id => { delete posOf[id]; const b = document.querySelector('#' + id + ' .modal-content'); if (b) { b.style.left = b.style.top = ''; b.dispatchEvent(new Event('dk-move')); } });
            });
            /* 👀 버튼 : 누르고 있는 동안 창을 투명하게 */
            document.querySelectorAll('.skin-peek-btn').forEach(btn => {
                const box = btn.closest('.modal-content');
                const on = e => { e.preventDefault(); box.classList.add('peeking'); };
                const off = () => box.classList.remove('peeking');
                btn.addEventListener('pointerdown', on);
                ['pointerup', 'pointerleave', 'pointercancel'].forEach(t => btn.addEventListener(t, off));
                btn.addEventListener('contextmenu', e => e.preventDefault());
            });
        })();
        function backToSkinMenu(fromId) {
            closeModal(fromId);
            openModal('skinModal');
        }

        /* ---------- 📔 페이지 목록 (썸네일만 · 스티커 창과 같은 칸 5개) ----------
           기본 = 기본 페이지 4종 · 내가만든 = 🎨 색상설정 · 🎀 꾸미기에서 저장한 것 · 공유받은 = 📥 파일로 받은 것 + 🌟 모두의 페이지
           이벤트 = 🌸 계절 테마 등 · 문구점 = 🎁 테마 페이지 + 🛍️ 문구점 가기
           썸네일은 따로 저장하지 않고, 페이지에 저장된 색 5개 · 꾸밈 위치로 작은 다이어리를 바로 그려요 (요청 없음) */
        let sklTab = 'free';
        function openPageList(tab) {
            closeModal('skinModal');
            const bar = document.getElementById('pageTabs');
            bar.innerHTML = stkTabsOn(v => sklItems(v).length).map(([v, n]) => `<button type="button" class="stk-tab" data-tab="${v}" onclick="sklSetTab('${v}')">${n}</button>`).join('');   // 🆓 이벤트 · 문구점은 받은 게 있을 때만 (js/stickermaker.js STK_HIDE)
            sklTab = tab || sklTabOf(currentSkinId);
            if (!bar.querySelector(`[data-tab="${sklTab}"]`)) sklTab = 'free';
            renderPageList();
            openModal('pageListModal');
        }
        /* 지금 쓰는 페이지가 들어 있는 칸 */
        function sklTabOf(id) {
            if (hasOwn(skinPresets, id)) return 'free';
            if (String(id).startsWith('cs:')) return 'share';
            if (String(id).startsWith('th:')) return 'shop';
            if (hasOwn(customSkins, id)) return customSkins[id].got ? 'share' : 'mine';
            return 'free';
        }
        function sklSetTab(tab) { sklTab = tab; renderPageList(); const g = document.getElementById('pageGrid'); if (g) g.scrollTop = 0; }
        function sklIsOpen() { const m = document.getElementById('pageListModal'); return !!m && m.style.display === 'flex'; }
        /* 칸에 보일 페이지들 [{ id, skin, own(지울 수 있음) }] */
        function sklItems(tab) {
            if (tab === 'free') return Object.keys(skinPresets).map(k => ({ id: k, skin: skinPresets[k] }));
            if (tab === 'share') return skinCommunity().map(c => ({ id: c.id, skin: c.skin }));     // 📥 받은페이지는 모음에서 따로 (renderPageList)
            if (tab === 'shop') return (typeof stuThemeList === 'function' ? stuThemeList() : []).filter(t => stuHasTheme(t.id))
                .map(t => { const th = themeSkinOf(t.id); return th ? { id: 'th:' + t.id, skin: th.skin } : null; }).filter(Boolean);
            return [];
        }
        function renderPageList() {
            const g = document.getElementById('pageGrid');
            if (!g) return;
            document.querySelectorAll('#pageTabs .stk-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === sklTab));
            const items = sklItems(sklTab);
            let head = '';
            if (sklTab === 'share') head = '<div class="shx-bar in"><button type="button" class="shx-btn go" onclick="document.getElementById(\'skinFileInput\').click()">📥 파일 불러오기</button><small>카페에서 받은 페이지 파일을 골라요</small></div>';
            if (sklTab === 'event' && typeof SEASON_OPEN !== 'undefined' && SEASON_OPEN) head = '<div class="season-card skl-wide" id="seasonCard"></div>';
            const empty = {
                mine: '아직 만든 페이지가 없어요.<br>🎨 페이지 색상설정이나 🎀 페이지 꾸미기에서 저장해 보세요!',
                share: '아직 공유받은 페이지가 없어요.<br>카페에서 받은 파일을 📥 파일 불러오기로 넣어 보세요.',
                event: '🎁 아직 받은 이벤트 페이지가 없어요.<br>이벤트 페이지가 오면 여기에 들어와요!'
            }[sklTab];
            const shop = sklTab === 'shop' ? `<button type="button" class="stk-go" onclick="openShop('#/c/페이지')"><span>🛍️</span><b>문구점에서 페이지 보기</b><small>새 창으로 열려요</small></button>` : '';
            const cell = (it, got, by) => {
                const on = it.id === currentSkinId, safe = String(it.id).replace(/[\\'"<>&]/g, c => '&#' + c.charCodeAt(0) + ';');
                const acts = it.own ? `<span class="skl-acts">${got ? '' : `<button type="button" title="파일로 저장 (카페에 올리기용)" onclick="downloadSkinFile('${safe}')">💾</button>`}<button type="button" title="지우기" onclick="deleteSkin('${safe}', ${got ? 1 : 0})">🗑</button></span>` : '';
                return `<div class="skl-it${on ? ' on' : ''}" data-id="${safe}"><button type="button" class="skl-pick" aria-pressed="${on}" onclick="sklPick('${safe}'${it.own ? (got ? ', 1' : ', 0') : ''})">${sklThumb(it.skin)}${on ? '<span class="skl-on">✔ 사용 중</span>' : ''}</button>${by ? `<small class="shx-by">by ${String(by).replace(/[<>&"']/g, c => '&#' + c.charCodeAt(0) + ';')}</small>` : ''}${acts}</div>`;
            };
            const coll = sklTab === 'mine' || sklTab === 'share';                    // 🎨 내가만든 · 📥 받은 페이지 : 모음에서 작은 그림으로 (js/coll.js)
            g.innerHTML = head + (coll ? '<div class="cg-host"></div>' : '') + items.map(it => cell(it)).join('')
                + (!coll && !items.length && !shop && empty && !(sklTab === 'event' && head) ? `<div class="cs-empty">${empty}</div>` : '') + shop;
            if (coll) {
                const got = sklTab === 'share', C = pgColl(got), tab = sklTab;
                C.onChange = () => { if (sklIsOpen() && sklTab === tab) renderPageList(); };
                collGrid(g.querySelector('.cg-host'), C, e => cell({ id: e.id, skin: e.th, own: true }, got, got && e.x && e.x.by), got && items.length ? '' : `<div class="cs-empty">${empty}</div>`);
            }
            if (head.includes('seasonCard') && typeof seasonRenderCard === 'function') seasonRenderCard();
        }
        /* 고르기 : 내 페이지는 원본을 읽은 뒤에 (got : 받은페이지 칸) */
        async function sklPick(id, got) {
            if ((got != null) && !hasOwn(customSkins, id) && !(await pgEnsure(id, !!got))) { showMsg('⚠ 이 페이지를 불러오지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인해 주세요.</span>'); return; }
            if (applySkinPreset(id)) renderPageList();
        }
        /* 작은 다이어리 그림 : 바탕 · 겉표지 · 속지(테두리) · 하단메뉴 + 놓아 둔 꾸밈 (속지 · 머리 · 하단메뉴 자리) */
        function sklThumb(skin) {
            /* 기본 페이지 겉표지는 그라데이션이라 sanitizeSkin(색 #rrggbb 만)을 지나도록 잠깐 바꿨다가 돌려놓아요 */
            const okCol = v => typeof v === 'string' && /^(#[0-9a-f]{3,8}|linear-gradient\([#0-9a-z%,.\s]+\))$/i.test(v);
            const raw = skin && typeof skin === 'object' ? skin : {}, tmp = Object.assign({}, raw);
            ['bg', 'cover', 'page', 'border', 'accent'].forEach(k => { if (okCol(raw[k]) && !/^#[0-9a-f]{6}$/i.test(raw[k])) tmp[k] = '#ffffff'; });
            const c = typeof sanitizeSkin === 'function' ? sanitizeSkin(tmp) : null;
            if (!c) return '<span class="skl-mini"></span>';
            ['bg', 'cover', 'page', 'border', 'accent'].forEach(k => { if (okCol(raw[k])) c[k] = raw[k]; });
            const pw = (document.getElementById('innerPage') || {}).offsetWidth || 340;
            const bw = (document.querySelector('.toolbar') || {}).offsetWidth || 340;
            const deco = where => (c.deco || []).filter(d => where.includes(d.a)).map(d => {
                const ref = d.a === 'paper' || d.a === 'pill' ? pw : bw;
                const x = /^b[1-4]$/.test(d.a) ? (+d.a[1] - .5) * 25 : d.x;
                const w = Math.max(4, d.s / ref * 100);
                return `<span class="skl-d" style="left:${x}%;top:${/^b[1-4]$/.test(d.a) ? 50 : d.y}%;width:${w}%;font-size:${(w * .8).toFixed(1)}cqw;transform:translate(-50%,-50%) rotate(${d.r || 0}deg)${d.f ? ' scaleX(-1)' : ''}">${typeof stuImgHtml === 'function' ? stuImgHtml(d.i, c.imgs || {}) : ''}</span>`;
            }).join('');
            return `<span class="skl-mini" style="background:${c.bg}">
                <span class="skl-cv" style="background:${c.cover}"><span class="skl-pp" style="background:${c.page};border-color:${c.border}"><i class="skl-pill" style="background:${c.accent}"></i>${deco(['paper', 'pill'])}</span></span>
                <span class="skl-bar" style="background:${c.page};border-color:${c.menu || c.border}">${[1, 2, 3, 4].map(n => `<i style="background:${c['mf' + n] || c.accent}"></i>`).join('')}${deco(['bar', 'b1', 'b2', 'b3', 'b4'])}</span></span>`;
        }
        window.openPageList = openPageList; window.sklSetTab = sklSetTab; window.sklPick = sklPick;

        /* ---------- 🌈 배경지 목록 (라이브러리처럼 페이지 넘기기 + 배치 설정) ---------- */
        const PAT_LAYOUT_KEY = 'malang_pattern_layout';
        const PAT_DEFAULT_LAYOUT = { rows: 3, cols: 3, size: 100 };
        const PAT_LAYOUT_LIMITS = { rows: [1, 8], cols: [1, 8], size: [60, 180] };
        const PAT_GAP = 10;
        let patLayout = loadPatLayout();
        let patTier = 'free';
        let patPage = 0;
        let patSwiped = false;

        function loadPatLayout() {
            const out = Object.assign({}, PAT_DEFAULT_LAYOUT);
            let saved = null;
            try { saved = JSON.parse(localStorage.getItem(PAT_LAYOUT_KEY)); } catch (e) {}
            if (saved && typeof saved === 'object') {
                Object.keys(PAT_LAYOUT_LIMITS).forEach(k => {
                    const n = parseInt(saved[k], 10), lim = PAT_LAYOUT_LIMITS[k];
                    if (!isNaN(n)) out[k] = Math.max(lim[0], Math.min(lim[1], n));
                });
            }
            return out;
        }
        function savePatLayout() { try { localStorage.setItem(PAT_LAYOUT_KEY, JSON.stringify(patLayout)); } catch (e) {} }

        /* 배경지 칸 5개 (스티커 창과 같은 이름) : 기본 = ☁️ 말랑배경지 · 내가만든 · 공유받은 = 📥 파일로 받은 것 + 🌟 등록된 사용자 배경지
           이벤트 = 앞으로 이벤트로 나눠 줄 배경지 (아직 없어서 칸이 숨어 있어요) · 문구점 = 🛍️ 문구점 가기 */
        function patItems() {
            const cm = typeof getCommunityItems === 'function' ? getCommunityItems() : [];
            const my = tab => typeof patListItems === 'function' ? patListItems(tab).items : [];   // 🌈 내가만든 · 받은 : 모음의 작은 그림 (js/pattern-maker.js)
            if (patTier === 'mine') return my('mine');
            if (patTier === 'share') return my('share').concat(cm);
            if (patTier === 'free') return BG_PATTERNS.filter(p => p.tier === 'free');
            return [];
        }
        function patPerPage() { return patLayout.rows * patLayout.cols; }
        /* 내가만든 · 공유받은 칸 : 아직 안 읽은 묶음이 있어요 */
        function patMore() { return (patTier === 'mine' || patTier === 'share') && typeof patListItems === 'function' && patListItems(patTier).more; }
        function patPageCount() { const n = patItems().length; return n ? Math.ceil(n / patPerPage()) : 0; }

        function openPatternList(tier) {
            tier = { my: 'mine' }[tier] || tier;
            if (!STK_TABS.some(t => t[0] === tier)) {                                  // 칸을 안 정했으면 지금 쓰는 배경지가 있는 칸부터
                const id = bgPattern ? String(bgPattern.id) : '';
                const mine = id.startsWith('my:') && (getMyPatternItems().find(p => p.id === id) || {});
                tier = id.startsWith('cm:') ? 'share' : mine ? (mine.got ? 'share' : 'mine') : 'free';
            }
            const bar = document.getElementById('patTabs');
            if (bar) bar.innerHTML = stkTabsOn().map(([v, n]) => `<button type="button" class="stk-tab" data-tab="${v}" onclick="setPatTab('${v}')">${n}</button>`).join('');   // 🆓 이벤트 · 문구점은 받은 게 있을 때만 (js/stickermaker.js STK_HIDE)
            if (bar && !bar.querySelector(`[data-tab="${tier}"]`)) tier = 'free';
            closeModal('skinModal');
            setPatTab(tier);
            openModal('patternModal');
        }
        function setPatTab(tier) {
            patTier = tier;
            document.querySelectorAll('#patTabs .stk-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tier));
            /* 지금 쓰는 패턴이 이 목록에 있으면 그 페이지부터 보여 주기 */
            const idx = bgPattern ? patItems().findIndex(p => p.id === bgPattern.id) : -1;
            patPage = idx >= 0 ? Math.floor(idx / patPerPage()) : 0;
            renderPatternList();
        }
        window.setPatTab = setPatTab;

        function applyPatLayoutStyle() {
            const { rows, cols, size } = patLayout;
            document.getElementById('patGrid').style.gridTemplateColumns = `repeat(${cols}, minmax(0, ${size}px))`;
            document.getElementById('patContent').style.setProperty('--pat-w', (cols * size + (cols - 1) * PAT_GAP + 48) + 'px');
            const fill = (sel, max, val) => {
                if (sel.options.length !== max) { sel.innerHTML = ''; for (let i = 1; i <= max; i++) sel.add(new Option(i, i)); }
                sel.value = val;
            };
            fill(document.getElementById('patRowsInput'), PAT_LAYOUT_LIMITS.rows[1], rows);
            fill(document.getElementById('patColsInput'), PAT_LAYOUT_LIMITS.cols[1], cols);
            document.getElementById('patSizeInput').value = size;
            document.getElementById('patSizeVal').textContent = size + 'px';

            /* 한눈에 보이게 : 작은 칸 그림 + '= 한 페이지 N개' */
            const mini = document.getElementById('patLayoutMini');
            if (mini) {
                mini.style.gridTemplateColumns = `repeat(${cols}, 5px)`;
                if (mini.childElementCount !== rows * cols) { mini.innerHTML = '<i></i>'.repeat(rows * cols); }
            }
            const sum = document.getElementById('patLayoutSum');
            if (sum) sum.textContent = `= 한 페이지 ${rows * cols}개`;
        }

        function renderPatternList() {
            const grid = document.getElementById('patGrid');
            if (!grid) return;
            applyPatLayoutStyle();
            updatePatternUI();
            grid.innerHTML = '';
            const items = patItems(), per = patPerPage(), pages = patPageCount(), more = patMore();
            if (more && items.length < (patPage + 1) * per) {                 // 이 쪽을 채울 만큼 아직 안 읽었으면 다음 묶음을 읽고 다시 그려요
                const tier = patTier;
                patListMore(tier).then(() => { if (patTier === tier) renderPatternList(); });
            }
            const nickRow = document.getElementById('patNickRow');
            if (nickRow) {
                nickRow.style.display = patTier === 'share' && window.pickPatternFile ? 'flex' : 'none';   // 📥 파일 불러오기 (js/pattern-maker.js)
            }
            document.getElementById('patStatus').textContent = items.length
                ? `배경지 ${items.length}${more ? '개 넘게' : '개'} · 누르면 전체 배경에 적용돼요`
                : more ? '불러오는 중…'
                : ({ mine: '아직 만든 배경지가 없어요. 🖼️ 이미지로 · 🖌️ 그려서 배경지에서 만들어 보세요!', share: '아직 공유받은 배경지가 없어요.', event: '🎁 아직 받은 이벤트 배경지가 없어요.', shop: '' }[patTier] ?? '아직 준비된 배경지가 없어요.');
            patPage = pages ? Math.max(0, Math.min(pages - (more ? 0 : 1), patPage)) : 0;
            const start = patPage * per;
            const frag = document.createDocumentFragment();
            items.slice(start, start + per).forEach(p => {
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'pat-item' + (bgPattern && bgPattern.id === p.id ? ' sel' : '');
                const sw = document.createElement('div');
                sw.className = 'pat-swatch';
                const inner = document.createElement('div');
                inner.className = 'pat-swatch-inner';
                paintPatternInto(inner, p);
                sw.appendChild(inner);
                if (bgPattern && bgPattern.id === p.id) { const c = document.createElement('span'); c.className = 'pat-check'; c.textContent = '✔ 사용 중'; sw.appendChild(c); }
                card.title = p.name || '';
                card.append(sw);                                               // 썸네일 (+ 공유받은 것은 by 만든 사람)
                if (p.by) { const by = document.createElement('small'); by.className = 'shx-by'; by.textContent = 'by ' + p.by; card.append(by); }
                card.onclick = () => { if (!patSwiped) selectBgPattern(p.id, p.tier === 'my' ? p.got : null); };
                if (p.tier === 'my') {                                         // 내가만든 · 공유받은 : 파일 저장(내가만든만) · 삭제
                    const wrap = document.createElement('div');
                    wrap.className = 'pat-item-wrap';
                    const acts = document.createElement('div');
                    acts.className = 'pat-actions';
                    const send = document.createElement('button');
                    send.type = 'button'; send.className = 'btn'; send.textContent = '💾'; send.title = '파일로 저장 (카페에 올리기용)';
                    send.onclick = () => downloadMyPattern(p.uid);
                    const del = document.createElement('button');
                    del.type = 'button'; del.className = 'btn'; del.textContent = '🗑'; del.title = '삭제';
                    del.onclick = () => deleteMyPattern(p.uid, p.got);
                    if (p.got) acts.append(del); else acts.append(send, del);
                    wrap.append(card, acts);
                    frag.appendChild(wrap);
                } else frag.appendChild(card);
            });
            for (let k = items.length - start; k < per && pages > 1; k++) {        // 마지막 페이지 빈칸 채우기
                const empty = document.createElement('div');
                empty.className = 'pat-item empty';
                frag.appendChild(empty);
            }
            if (patTier === 'shop') {                                          // 🛍️ 문구점 칸
                const go = document.createElement('button');
                go.type = 'button'; go.className = 'stk-go';
                go.innerHTML = '<span>🛍️</span><b>문구점에서 배경지 보기</b><small>새 창으로 열려요</small>';
                go.onclick = () => openShop('#/c/배경지');
                frag.appendChild(go);
            }
            grid.appendChild(frag);
            document.getElementById('patPageInfo').textContent = pages ? `${patPage + 1} / ${pages}${more ? '+' : ''}` : '0 / 0';
            document.getElementById('patPrevBtn').disabled = !pages || patPage <= 0;
            document.getElementById('patNextBtn').disabled = !pages || (patPage >= pages - 1 && !more);
        }

        function changePatPage(delta) {
            const pages = patPageCount();
            if (!pages) return;
            const next = Math.max(0, Math.min(pages - (patMore() ? 0 : 1), patPage + delta));   // 아직 안 읽은 묶음이 있으면 한 쪽 더 (그리면서 읽어요)
            if (next === patPage) return;
            patPage = next;
            renderPatternList();
        }

        function togglePatLayout() {
            const panel = document.getElementById('patLayoutPanel');
            const open = panel.style.display === 'none';
            panel.style.display = open ? 'flex' : 'none';
            document.getElementById('patLayoutBtn').classList.toggle('on', open);
        }

        function setPatLayout(next) {
            const firstIndex = patPage * patPerPage();
            patLayout = next;
            patPage = Math.floor(firstIndex / patPerPage());
            savePatLayout();
            renderPatternList();
        }
        function onPatLayoutChange() {
            const num = (id, k) => {
                const n = parseInt(document.getElementById(id).value, 10), lim = PAT_LAYOUT_LIMITS[k];
                return isNaN(n) ? patLayout[k] : Math.max(lim[0], Math.min(lim[1], n));
            };
            setPatLayout({ rows: num('patRowsInput', 'rows'), cols: num('patColsInput', 'cols'), size: num('patSizeInput', 'size') });
        }
        function resetPatLayout() { setPatLayout(Object.assign({}, PAT_DEFAULT_LAYOUT)); }

        /* 지금 쓰는 패턴 이름 · 패턴 크기 · 해제 버튼 · 기본스킨 창 안내문 */
        function updatePatternUI() {
            const p = currentBgPattern();
            const cur = document.getElementById('patCurrent');
            if (cur) { cur.hidden = !p; paintPatternInto(cur, p || null); }                 // 지금 배경지 : 이름 대신 작은 그림
            const none = document.getElementById('patCurrentNone');
            if (none) none.hidden = !!p;
            const sc = document.getElementById('patScaleInput');
            if (sc) {
                sc.disabled = !p;
                sc.value = p ? bgPattern.scale : 1;
                document.getElementById('patScaleVal').textContent = Math.round((p ? bgPattern.scale : 1) * 100) + '%';
            }
            const clr = document.getElementById('patClearBtn');
            if (clr) clr.disabled = !p;
            const note = document.getElementById('skinPatternNote');
            if (note) note.style.display = p ? 'flex' : 'none';
        }

        /* 스마트폰 : 패턴 목록을 옆으로 밀어서 페이지 넘기기 */
        (function setupPatSwipe() {
            const grid = document.getElementById('patGrid');
            let sx = 0, sy = 0, tracking = false;
            grid.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) { tracking = false; return; }
                tracking = true; patSwiped = false;
                sx = e.touches[0].clientX; sy = e.touches[0].clientY;
            }, { passive: true });
            grid.addEventListener('touchend', (e) => {
                if (!tracking) return;
                tracking = false;
                const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    patSwiped = true;
                    changePatPage(dx < 0 ? 1 : -1);
                    setTimeout(() => { patSwiped = false; }, 400);
                }
            });
        })();

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['skins'] = true;
