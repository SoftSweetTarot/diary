/* 말랑달콤 다이어리 - js/skins.js
   👗 스킨 메뉴 (기본스킨 · 무료패턴 · 유료패턴) · 전체 배경 패턴 적용/저장/불러오기
   - 고른 패턴은 설정값 'diary_bg_pattern' 으로 저장 → 구글 드라이브 settings.json 에 함께 저장돼요
       예) "diary_bg_pattern": {"id":"tomato","scale":1}
   - 패턴 해제 시 이 값을 지워요 (settings.json 에서도 빠짐)
   - 목록 배치(행·열·크기)는 기기마다 화면이 달라서 이 기기(localStorage)에만 기억
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → patterns → skins → service (index.html 참고) */

        const BG_PATTERN_KEY = 'diary_bg_pattern';
        const PAID_PATTERNS_OPEN = true;   // 임시: 유료 패턴도 모두 사용 가능 (결제 기능을 붙이면 false로)
        const PATTERN_SCALE_MIN = 0.5, PATTERN_SCALE_MAX = 2;

        let bgPattern = null;              // 지금 적용된 패턴 { id, scale } (없으면 null)

        function findBgPattern(id) { return BG_PATTERNS.find(p => p.id === id) || null; }
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
            const p = bgPattern && findBgPattern(bgPattern.id);
            paintPatternInto(inner, p);
            layer.style.setProperty('--pat-s', p ? bgPattern.scale : 1);
            document.documentElement.classList.toggle('bg-pattern-on', !!p);
            updatePatternUI();
        }

        /* ---------- 저장 : 설정(settings.json)에 id와 크기만 저장 ---------- */
        function saveBgPattern() {
            if (bgPattern) store.setItem(BG_PATTERN_KEY, JSON.stringify({ id: bgPattern.id, scale: bgPattern.scale }));
            else if (store.getItem(BG_PATTERN_KEY) !== null) store.removeItem(BG_PATTERN_KEY);
        }

        /* ---------- 불러오기 : 드라이브 설정을 읽은 뒤 / PC 백업 불러온 뒤 호출 ----------
           값이 없거나, 깨졌거나, 목록에 없는 패턴이면 패턴 없이 표시 (저장된 값은 건드리지 않음) */
        function loadBgPattern() {
            let v = null;
            try { v = JSON.parse(store.getItem(BG_PATTERN_KEY)); } catch (e) { v = null; }
            bgPattern = (v && typeof v === 'object' && findBgPattern(v.id))
                ? { id: v.id, scale: clampPatternScale(v.scale) } : null;
            renderBgPattern();
        }

        function selectBgPattern(id) {
            const p = findBgPattern(id);
            if (!p) return;
            if (p.tier === 'paid' && !PAID_PATTERNS_OPEN) { showMsg('💎 유료 패턴은 준비 중이에요.<br>조금만 기다려 주세요!'); return; }
            bgPattern = { id, scale: bgPattern ? bgPattern.scale : 1 };
            renderBgPattern();
            saveBgPattern();
            renderPatternList();
            toast('🎨 배경을 \'' + p.name + '\' 패턴으로 바꿨어요.');
        }

        function clearBgPattern() {
            if (!bgPattern) return;
            bgPattern = null;
            renderBgPattern();
            saveBgPattern();
            renderPatternList();
            toast('배경 패턴을 해제했어요. 기본스킨의 전체 배경색이 보여요.');
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
        function backToSkinMenu(fromId) {
            closeModal(fromId);
            openModal('skinModal');
        }

        /* ---------- 무료 / 유료 패턴 목록 (라이브러리처럼 페이지 넘기기 + 배치 설정) ---------- */
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

        function patItems() { return BG_PATTERNS.filter(p => p.tier === patTier); }
        function patPerPage() { return patLayout.rows * patLayout.cols; }
        function patPageCount() { const n = patItems().length; return n ? Math.ceil(n / patPerPage()) : 0; }

        function openPatternList(tier) {
            patTier = tier === 'paid' ? 'paid' : 'free';
            /* 지금 쓰는 패턴이 이 목록에 있으면 그 페이지부터 보여 주기 */
            const idx = bgPattern ? patItems().findIndex(p => p.id === bgPattern.id) : -1;
            patPage = idx >= 0 ? Math.floor(idx / patPerPage()) : 0;
            document.getElementById('patTitle').textContent = patTier === 'paid' ? '💎 유료 패턴' : '🆓 무료 패턴';
            closeModal('skinModal');
            renderPatternList();
            openModal('patternModal');
        }

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
        }

        function renderPatternList() {
            const grid = document.getElementById('patGrid');
            if (!grid) return;
            applyPatLayoutStyle();
            updatePatternUI();
            grid.innerHTML = '';
            const items = patItems(), per = patPerPage(), pages = patPageCount();
            document.getElementById('patStatus').textContent = items.length
                ? `패턴 ${items.length}개 · 누르면 전체 배경에 적용돼요` : '아직 준비된 패턴이 없어요.';
            patPage = pages ? Math.max(0, Math.min(pages - 1, patPage)) : 0;
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
                if (p.tier === 'paid') { const b = document.createElement('span'); b.className = 'pat-badge'; b.textContent = '💎'; sw.appendChild(b); }
                if (bgPattern && bgPattern.id === p.id) { const c = document.createElement('span'); c.className = 'pat-check'; c.textContent = '✔ 사용 중'; sw.appendChild(c); }
                const name = document.createElement('span');
                name.className = 'pat-name';
                name.textContent = p.name;
                card.append(sw, name);
                card.onclick = () => { if (!patSwiped) selectBgPattern(p.id); };
                frag.appendChild(card);
            });
            for (let k = items.length - start; k < per && pages > 1; k++) {        // 마지막 페이지 빈칸 채우기
                const empty = document.createElement('div');
                empty.className = 'pat-item empty';
                frag.appendChild(empty);
            }
            grid.appendChild(frag);
            document.getElementById('patPageInfo').textContent = pages ? `${patPage + 1} / ${pages}` : '0 / 0';
            document.getElementById('patPrevBtn').disabled = !pages || patPage <= 0;
            document.getElementById('patNextBtn').disabled = !pages || patPage >= pages - 1;
        }

        function changePatPage(delta) {
            const pages = patPageCount();
            if (!pages) return;
            const next = Math.max(0, Math.min(pages - 1, patPage + delta));
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
            const p = bgPattern && findBgPattern(bgPattern.id);
            const cur = document.getElementById('patCurrent');
            if (cur) cur.textContent = p ? p.name : '없음 (기본스킨 배경색)';
            const sc = document.getElementById('patScaleInput');
            if (sc) {
                sc.disabled = !p;
                sc.value = p ? bgPattern.scale : 1;
                document.getElementById('patScaleVal').textContent = Math.round((p ? bgPattern.scale : 1) * 100) + '%';
            }
            const clr = document.getElementById('patClearBtn');
            if (clr) clr.disabled = !p;
            const note = document.getElementById('skinPatternNote');
            if (note) {
                note.style.display = p ? 'flex' : 'none';
                const nm = document.getElementById('skinPatternName');
                if (nm) nm.textContent = p ? p.name : '';
            }
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
