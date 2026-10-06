/* 말랑달콤 다이어리 - js/page.js
   글꼴 적용 · 글 꾸미기 패널 · 이모지 목록 · 날짜/페이지 넘기기 · 페이지 크기
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        function fillFontSelect(select) {
            if (!select) return;
            const currentVal = select.value;
            select.innerHTML = '';
            fontList.forEach(f => {
                const opt = document.createElement('option');
                opt.value = f.css;
                opt.textContent = f.name;
                opt.style.fontFamily = f.css;
                select.appendChild(opt);
            });
            if (currentVal && fontList.some(f => f.css === currentVal)) {
                select.value = currentVal;
            }
        }

        function setupFontSelects() {
            fillFontSelect(document.getElementById('uiFontSelect'));
            fillFontSelect(document.getElementById('textFontSelect'));
        }

        function applyUIFont(css, save) {
            if (!fontList.some(f => f.css === css)) css = DEFAULT_UI_FONT;
            document.documentElement.style.setProperty('--font-family', css);
            const sel = document.getElementById('uiFontSelect');
            if (sel) sel.value = css;
            if (save) store.setItem('diary_ui_font', JSON.stringify(css));
        }

        function loadUIFont() {
            let css = DEFAULT_UI_FONT;
            try {
                const saved = JSON.parse(store.getItem('diary_ui_font'));
                if (saved) css = saved;
            } catch (err) {}
            applyUIFont(css, false);
        }

        function styleTextarea(ta, font, color, size) {
            font = font || DEFAULT_TEXT_FONT;
            color = color || DEFAULT_TEXT_COLOR;
            size = parseInt(size) || DEFAULT_TEXT_SIZE;
            ta.dataset.font = font;
            ta.dataset.color = color;
            ta.dataset.size = size;
            ta.style.fontFamily = font;
            ta.style.color = color;
            ta.style.fontSize = size + 'px';
        }

        function getSelectedTextarea() {
            return selectedElement ? selectedElement.querySelector('textarea') : null;
        }

        /* 📷 사진 틀을 씌울 수 있는 사진 (SVG 그림 · 스티커 · 테이프 · 펜 그림은 제외) */
        function getSelectedPhoto() {
            const img = selectedElement && !selectedElement.querySelector('textarea') ? selectedElement.querySelector('img') : null;
            if (!img || typeof setFrame !== 'function') return null;
            if (typeof showRead === 'function' && showRead().photo === 0) return null;      // ⚙ 설정 → 👀 페이지에 보이는 것 → 📷 사진 꾸미기 창 (js/show.js)
            return /^data:image\/svg/i.test(img.dataset.src || '') ? null : img;
        }

        function updateTextPanel() {
            const panel = document.getElementById('textPanel');
            const ta = getSelectedTextarea();
            if (!ta && getSelectedPhoto()) {                 // 사진 → 사진 꾸미기 (틀 · 글씨)
                panel.dataset.mode = 'photo';
                document.getElementById('textPanelTitle').textContent = '✥ 사진 꾸미기';
                if (typeof updateFrameChips === 'function') updateFrameChips();
                panel.style.display = 'flex';
                positionTextPanel();
                return;
            }
            if (!ta) { panel.style.display = 'none'; return; }
            panel.dataset.mode = 'text';
            document.getElementById('textPanelTitle').textContent = '✥ 글 꾸미기';

            const fontSel = document.getElementById('textFontSelect');
            const font = ta.dataset.font || DEFAULT_TEXT_FONT;
            if (!fontList.some(f => f.css === font)) {
                fontSel.value = DEFAULT_TEXT_FONT;
            } else {
                fontSel.value = font;
            }
            document.getElementById('textColorInput').value = ta.dataset.color || DEFAULT_TEXT_COLOR;
            document.getElementById('textSizeInput').value = ta.dataset.size || DEFAULT_TEXT_SIZE;
            if (typeof updatePaperChips === 'function') updatePaperChips();
            panel.style.display = 'flex';
            positionTextPanel();
        }

        let panelOffset = null;

        function clampPanelPos(l, t, pw, ph) {
            const m = 6;
            l = Math.max(m, Math.min(l, window.innerWidth - pw - m));
            t = Math.max(m, Math.min(t, window.innerHeight - ph - m));
            return { l, t };
        }

        function positionTextPanel() {
            const panel = document.getElementById('textPanel');
            if (!selectedElement || !(getSelectedTextarea() || getSelectedPhoto()) || panel.style.display === 'none') return;

            const er = selectedElement.getBoundingClientRect();
            const pw = panel.offsetWidth, ph = panel.offsetHeight;
            let l, t;

            if (panelOffset) {
                l = er.left + panelOffset.dx;
                t = er.top + panelOffset.dy;
            } else {
                l = er.left + er.width / 2 - pw / 2;
                t = er.bottom + 22;
                if (t + ph > window.innerHeight - 6) {
                    t = er.top - ph - 34;
                }
            }
            const p = clampPanelPos(l, t, pw, ph);
            panel.style.left = p.l + 'px';
            panel.style.top = p.t + 'px';
        }

        function closeTextPanel() {
            if (selectedElement) selectedElement.classList.remove('selected');
            selectedElement = null;
            updateTextPanel();
        }

        function setupPanelDrag() {
            const panel = document.getElementById('textPanel');
            const handle = document.getElementById('textPanelHandle');
            let dragging = false, sx = 0, sy = 0, sl = 0, st = 0;

            handle.addEventListener('pointerdown', (e) => {
                if (e.target.closest('button')) return;
                dragging = true;
                const r = panel.getBoundingClientRect();
                sx = e.clientX; sy = e.clientY; sl = r.left; st = r.top;
                try { handle.setPointerCapture(e.pointerId); } catch (err) {}
                e.preventDefault();
                e.stopPropagation();
            });

            handle.addEventListener('pointermove', (e) => {
                if (!dragging) return;
                const p = clampPanelPos(sl + e.clientX - sx, st + e.clientY - sy, panel.offsetWidth, panel.offsetHeight);
                panel.style.left = p.l + 'px';
                panel.style.top = p.t + 'px';
                if (selectedElement) {
                    const er = selectedElement.getBoundingClientRect();
                    panelOffset = { dx: p.l - er.left, dy: p.t - er.top };
                }
            });

            const stop = () => { dragging = false; };
            handle.addEventListener('pointerup', stop);
            handle.addEventListener('pointercancel', stop);
            window.addEventListener('resize', positionTextPanel);
        }

        function applyTextStyle() {
            const ta = getSelectedTextarea();
            if (!ta) return;
            const font = document.getElementById('textFontSelect').value;
            const color = document.getElementById('textColorInput').value;
            let size = parseInt(document.getElementById('textSizeInput').value);
            if (isNaN(size)) return;
            size = Math.max(8, Math.min(120, size));
            styleTextarea(ta, font, color, size);
        }

        function loadEmojiCategory(category, btnElement) {
            if (btnElement) {
                document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
                btnElement.classList.add('active');
            }

            const grid = document.getElementById('stickerGrid');
            grid.innerHTML = '';

            const ranges = emojiRanges[category];
            if (!ranges) return;

            const fragment = document.createDocumentFragment();

            ranges.forEach(([start, end]) => {
                for (let code = start; code <= end; code++) {
                    const char = String.fromCodePoint(code);
                    const item = document.createElement('div');
                    item.className = 'sticker-item';
                    item.innerText = char;
                    item.onclick = () => addSticker(char);
                    fragment.appendChild(item);
                }
            });

            grid.appendChild(fragment);
        }

        function formatDate(date) {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const days = ['일', '월', '화', '수', '목', '금', '토'];
            return `${year}. ${month}. ${day} (${days[date.getDay()]})`;
        }

        function getDateKey(date) {
            return `diary_${date.getFullYear()}_${String(date.getMonth() + 1).padStart(2, '0')}_${String(date.getDate()).padStart(2, '0')}`;
        }

        let turn = null;
        let drag = null;

        /* =====================================================================
           🗜 그림 짧게 저장 : 코드로 그린 그림(테이프 · 캡슐 · 계절 스티커 · 운세 카드 · 손그림 등)은
           일기에 긴 data 주소 대신 짧은 이름표로 담아요 (불러올 때 똑같은 그림으로 되돌림)
             tp:id · cs:id · ss:계절:id  = 코드에 들어 있는 그림 → 이름표만 (수십 바이트)
             sv:<SVG 글자>              = 그 밖의 SVG → %XX 로 부풀린 글자를 원래 글자로 (약 30~50% 작아짐)
           ✔ 저장할 때 '되돌린 결과가 원래 주소와 똑같은지' 확인해서 똑같을 때만 줄여요 → 그림이 깨질 일 없음
           ✔ 사진(png · jpg · webp · gif)과 주소(https)는 그대로 */
        const SLIM_PFX = 'data:image/svg+xml;charset=utf-8,';
        let slimMap = null;
        function slimKnown() {
            if (slimMap) return slimMap;
            slimMap = new Map();
            const put = (svg, ref) => slimMap.set(SLIM_PFX + encodeURIComponent(svg), ref);
            try { if (typeof TAPES !== 'undefined') TAPES.forEach(t => slimMap.set(tapeUrl(t), 'tp:' + t.id)); } catch (e) {}
            try { if (typeof CAPSULE_STICKERS !== 'undefined') CAPSULE_STICKERS.forEach(k => put(k.svg, 'cs:' + k.id)); } catch (e) {}
            try { if (typeof SEASON_STICKERS !== 'undefined') Object.keys(SEASON_STICKERS).forEach(q => SEASON_STICKERS[q].forEach(s => put(s.svg, 'ss:' + q + ':' + s.id))); } catch (e) {}
            return slimMap;
        }
        function slimDec(c) {                                         // 이름표 → 원래 그림 주소 (이름표가 아니면 그대로)
            if (typeof c !== 'string') return c;
            const m = /^(tp|cs|ss|sv):/.exec(c); if (!m) return c;
            const body = c.slice(3);
            try {
                if (m[1] === 'sv') return SLIM_PFX + encodeURIComponent(body);
                if (m[1] === 'tp') { const t = TAPES.find(x => x.id === body); return t ? tapeUrl(t) : c; }
                if (m[1] === 'cs') { const k = CAPSULE_STICKERS.find(x => x.id === body); return k ? SLIM_PFX + encodeURIComponent(k.svg) : c; }
                const p = body.split(':'), s = (SEASON_STICKERS[p[0]] || []).find(x => x.id === p[1]);
                return s ? SLIM_PFX + encodeURIComponent(s.svg) : c;
            } catch (e) { return c; }
        }
        function slimEnc(src) {                                       // 그림 주소 → 짧은 이름표 (줄일 수 없으면 그대로)
            if (typeof src !== 'string' || src.length < 60) return src;
            const known = slimKnown().get(src);
            if (known && slimDec(known) === src) return known;
            if (src.startsWith(SLIM_PFX)) {
                try { const ref = 'sv:' + decodeURIComponent(src.slice(SLIM_PFX.length)); if (slimDec(ref) === src) return ref; } catch (e) {}
            }
            return src;
        }

        function normalizeItem(d) {
            const f = fontList.find(x => x.id === d.f);
            return { type: ({ i: 'image', t: 'text', s: 'sticker', d: 'doll' })[d.t] || 'sticker', content: d.t === 'i' ? slimDec(d.c) : d.c,
                posX: d.x || 0, posY: d.y || 0, scale: d.s || 1, rotation: d.r || 0,
                width: d.w ? d.w + 'px' : '', height: d.h ? d.h + 'px' : '', zIndex: d.z || 1,
                boxW: d.bw || 0, boxH: d.bh || 0, fontFamily: f ? f.css : undefined, color: d.k, fontSize: d.fs, paper: d.pp, frame: d.fr, caption: d.cp };
        }

        function readDayData(date) {
            let raw = null;
            try { raw = JSON.parse(store.getItem(getDateKey(date))); } catch (err) {}
            if (!raw) return [];
            const items = (Array.isArray(raw.i) ? raw.i : []).map(normalizeItem);
            const pw = raw.pw, ph = raw.ph;
            if (!(pw > 0 && ph > 0)) return items;
            const from = { w: pw, h: ph }, to = getPageSize();
            if (from.w === to.w && from.h === to.h) return items;
            return items.map(it => Object.assign({}, it, convertGeometry(it, from, to)));
        }

        function buildStaticPage(date) {
            const page = document.createElement('div');
            page.className = 'page inner-page';
            page.style.zIndex = 2;
            page.style.pointerEvents = 'none';
            page.innerHTML =
                `<div class="page-header">
                    <button type="button" class="page-nav-btn page-arrow" tabindex="-1"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                    <span class="page-date-wrap"><span class="page-date-btn">${formatDate(date)}</span><button type="button" class="page-search-btn" tabindex="-1">🔍</button></span>
                    <button type="button" class="page-nav-btn page-arrow" tabindex="-1"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                </div>
                <div class="canvas-area"></div>`;
            const canvas = page.querySelector('.canvas-area');
            if (typeof psStaticHtml === 'function') page.insertAdjacentHTML('beforeend', psStaticHtml(date));
            if (typeof ddStaticHtml === 'function') page.insertAdjacentHTML('beforeend', ddStaticHtml(date));
            readDayData(date).forEach(d => canvas.appendChild(createElementFromData(d, false)));
            return page;
        }

        function beginCurl(isCover, dir) {
            if (turn) return false;
            if (isCover && dir !== 1) return false;

            const book = document.getElementById('diaryBook');
            const W = book.clientWidth;
            const pageEl = document.getElementById(isCover ? 'coverPage' : 'innerPage');

            const targetDate = new Date(currentDate);
            if (!isCover) {
                saveData(false);
                targetDate.setDate(targetDate.getDate() + dir);
            }

            const under = buildStaticPage(targetDate);
            const shadow = document.createElement('div');
            shadow.className = 'under-shadow ' + (dir === 1 ? 'dir-next' : 'dir-prev');
            under.appendChild(shadow);
            book.appendChild(under);

            const flapLayer = document.createElement('div');
            flapLayer.className = 'flap-layer';
            const flap = document.createElement('div');
            flap.className = 'flap ' + (dir === 1 ? 'dir-next' : 'dir-prev') + ' ' + (isCover ? 'cover-back' : 'page-back');
            flapLayer.appendChild(flap);
            book.appendChild(flapLayer);

            if (selectedElement) { selectedElement.classList.remove('selected'); selectedElement = null; }
            updateTextPanel();

            turn = { isCover, dir, W, pageEl, under, shadow, flapLayer, flap, d: 0 };
            updateCurl(0);
            return true;
        }

        function updateCurl(d) {
            const t = turn;
            if (!t) return;
            const W = t.W;
            d = Math.max(0, Math.min(W, d));
            t.d = d;

            const show = d >= 1;
            t.flap.style.display = show ? 'block' : 'none';
            t.shadow.style.display = show ? 'block' : 'none';

            const sw = Math.min(90, d);
            t.flap.style.width = d + 'px';
            t.shadow.style.width = sw + 'px';

            if (t.dir === 1) {
                const fold = W - d;
                t.pageEl.style.clipPath = `inset(0 ${d}px 0 0)`;
                t.flap.style.left = (fold - d) + 'px';
                t.shadow.style.left = (fold - 4) + 'px';
            } else {
                const fold = d;
                t.pageEl.style.clipPath = `inset(0 0 0 ${d}px)`;
                t.flap.style.left = fold + 'px';
                t.shadow.style.left = (fold - sw - 4) + 'px';
            }
        }

        function animateCurlTo(target, complete) {
            const t = turn;
            if (!t) return;
            const from = t.d;
            const dist = Math.abs(target - from);
            const dur = 120 + 480 * (dist / t.W);
            const startTime = performance.now();

            function step(now) {
                if (turn !== t) return;
                const p = Math.min(1, (now - startTime) / dur);
                const eased = 1 - Math.pow(1 - p, 3);
                updateCurl(from + (target - from) * eased);
                if (p < 1) requestAnimationFrame(step);
                else endCurl(complete);
            }
            requestAnimationFrame(step);
        }

        function endCurl(complete) {
            const t = turn;
            if (!t) return;

            if (complete) {
                if (t.isCover) {
                    t.pageEl.style.display = 'none';
                    document.getElementById('innerPage').style.display = 'flex';
                    isCoverOpen = true;
                } else {
                    currentDate.setDate(currentDate.getDate() + t.dir);
                }
                selectedElement = null;
                document.getElementById('pageDateDisplay').innerText = formatDate(currentDate);
                loadData();
                if (t.isCover) prefetchInitial();          // 표지를 넘기면: 오늘 + 앞·뒤 3일치 (이미 읽었으면 바로 끝)
                else prefetchAfterTurn(t.dir);             // 한 장 넘기면: 넘긴 방향의 다음 하루치만
            }

            t.under.remove();
            t.flapLayer.remove();
            t.pageEl.style.clipPath = '';
            setTimeout(() => { if (layoutDirty) refreshLayout(); }, 0);
            turn = null;
            updateTextPanel();
        }

        /* 📅 원하는 날짜 페이지로 가기 (표지가 닫혀 있으면 열고, 다른 날짜면 저장한 뒤 그 날로) → 그날 일기를 다 불러온 뒤 done() */
        function goToDate(target, done) {
            const ready = () => {
                const key = getDateKey(currentDate); let n = 0;
                const w = () => {
                    if (!turn && (drive.guest || drive.loadedDays.has(key))) { if (done) done(); }
                    else if (n++ < 60) setTimeout(w, 150);
                };
                w();
            };
            const jump = () => {
                if (getDateKey(currentDate) !== getDateKey(target)) {
                    saveData(false);
                    currentDate.setTime(target.getTime());
                    selectedElement = null;
                    document.getElementById('pageDateDisplay').innerText = formatDate(currentDate);
                    loadData();
                    prefetchInitial();
                }
                ready();
            };
            if (isCoverOpen) { jump(); return; }
            if (getDateKey(currentDate) !== getDateKey(target)) currentDate.setTime(target.getTime());
            openCoverAnimated();
            let n = 0;
            const w = () => { if (isCoverOpen && !turn) jump(); else if (n++ < 40) setTimeout(w, 100); };
            setTimeout(w, 100);
        }
        function goToToday(done) { goToDate(new Date(), done); }

        function changeDate(delta) {
            if (!isCoverOpen || turn) return;
            if (beginCurl(false, delta > 0 ? 1 : -1)) animateCurlTo(turn.W, true);
        }

        function openCoverAnimated() {
            if (isCoverOpen || turn) return;
            if (beginCurl(true, 1)) animateCurlTo(turn.W, true);
        }

        /* 📖 페이지 넘기기 : 다이어리를 연 뒤에는 페이지 양쪽 끝(가장자리)을 잡고 밀 때만 넘어가요
           - 오른쪽 끝 → 왼쪽으로 밀면 다음 날 · 왼쪽 끝 → 오른쪽으로 밀면 전날 (가운데에서 그림 · 글을 만질 때는 안 넘어가요)
           - 겉표지는 어디를 잡아도 열려요 */
        const CURL_EDGE = { ratio: 0.15, min: 36, max: 80 };      // 끝 영역 너비 : 페이지 너비의 15% (36~80px)
        function curlEdgeAt(x, book) {
            const r = book.getBoundingClientRect(), z = clampNum(r.width * CURL_EDGE.ratio, CURL_EDGE.min, CURL_EDGE.max);
            return x >= r.right - z ? 1 : x <= r.left + z ? -1 : 0;
        }
        function setupCurlDrag() {
            const wrapper = document.getElementById('diaryWrapper');
            const book = document.getElementById('diaryBook');

            wrapper.addEventListener('pointerdown', (e) => {
                if (turn) return;
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (e.target.closest('.element-box, button, textarea, input, select')) return;
                const edge = isCoverOpen ? curlEdgeAt(e.clientX, book) : 0;
                if (isCoverOpen && !edge) return;
                drag = { id: e.pointerId, x: e.clientX, y: e.clientY, started: false, dir: 0, edge };
            });

            window.addEventListener('pointermove', (e) => {
                if (!drag || drag.id !== e.pointerId) return;
                const dx = e.clientX - drag.x;
                const dy = e.clientY - drag.y;

                if (!drag.started) {
                    if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
                    const dir = dx < 0 ? 1 : -1;
                    if (!isCoverOpen && dir === -1) { drag = null; return; }
                    if (drag.edge && dir !== drag.edge) { drag = null; return; }     // 오른쪽 끝은 다음 날만 · 왼쪽 끝은 전날만
                    if (!beginCurl(!isCoverOpen, dir)) { drag = null; return; }
                    drag.started = true;
                    drag.dir = dir;
                    try { wrapper.setPointerCapture(e.pointerId); } catch (err) {}
                }

                const moved = (drag.dir === 1 ? drag.x - e.clientX : e.clientX - drag.x) - 8;
                updateCurl(moved);

                const rect = book.getBoundingClientRect();
                const outside = drag.dir === 1 ? e.clientX <= rect.left : e.clientX >= rect.right;
                if (outside || moved >= turn.W) {
                    drag = null;
                    animateCurlTo(turn.W, true);
                }
            });

            const endDrag = (e) => {
                if (!drag || drag.id !== e.pointerId) return;
                const d = drag;
                drag = null;
                if (d.started && turn) {
                    const complete = turn.d > turn.W * 0.35;
                    animateCurlTo(complete ? turn.W : 0, complete);
                } else if (!d.started && !isCoverOpen && e.target.closest && e.target.closest('#coverPage')) {
                    openCoverAnimated();
                }
            };
            window.addEventListener('pointerup', endDrag);
            window.addEventListener('pointercancel', endDrag);
        }

        function clampNum(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

        function canvasOfPage(pw, ph) {
            return { w: pw - PAGE_BORDER * 2, h: ph - PAGE_BORDER * 2 - PAGE_HEADER_H };
        }
        function getPageSize() {
            const b = document.getElementById('diaryBook');
            return { w: b.clientWidth, h: b.clientHeight };
        }
        function fitFactor(c) {
            const ref = canvasOfPage(DEFAULT_PAGE_W, DEFAULT_PAGE_H);
            return Math.min(c.w / ref.w, c.h / ref.h);
        }

        function convertGeometry(g, fromPage, toPage) {
            const a = canvasOfPage(fromPage.w, fromPage.h), b = canvasOfPage(toPage.w, toPage.h);
            if (a.w <= 0 || a.h <= 0 || b.w <= 0 || b.h <= 0) return g;
            const px = parseFloat(g.posX) || 0, py = parseFloat(g.posY) || 0;
            const sc = parseFloat(g.scale) || 1;
            const w = g.boxW || 0, h = g.boxH || 0;
            const k = fitFactor(b) / fitFactor(a);
            const cx = (px + w / 2) * (b.w / a.w);
            const cy = (py + h / 2) * (b.h / a.h);
            return { posX: cx - w / 2, posY: cy - h / 2, scale: sc * k };
        }

        function rescaleLiveElements(fromPage, toPage) {
            document.querySelectorAll('#canvasArea .element-box').forEach(el => {
                const c = convertGeometry({ posX: el.dataset.posX, posY: el.dataset.posY, scale: el.dataset.scale,
                                            boxW: el.offsetWidth, boxH: el.offsetHeight }, fromPage, toPage);
                el.dataset.posX = c.posX; el.dataset.posY = c.posY; el.dataset.scale = c.scale;
                el.style.transform = `translate(${c.posX}px, ${c.posY}px) scale(${c.scale}) rotate(${el.dataset.rotation || 0}deg)`;
            });
        }

        function refreshLayout() {
            if (turn) { layoutDirty = true; return; }
            const ae = document.activeElement;
            if (ae && ae.tagName === 'TEXTAREA') return;
            layoutDirty = false;

            const wrapper = document.getElementById('diaryWrapper');
            const toolbar = document.querySelector('.toolbar');
            const maxW = Math.floor(window.innerWidth * 0.92);
            const maxH = Math.floor(window.innerHeight - toolbar.offsetHeight - 8 - 24);
            wrapper.style.width = Math.max(240, Math.min(pageSetting.w, maxW)) + 'px';
            wrapper.style.height = Math.max(240, Math.min(pageSetting.h, maxH)) + 'px';

            const now = getPageSize();
            if (isCoverOpen && liveSize && (liveSize.w !== now.w || liveSize.h !== now.h)) {
                rescaleLiveElements(liveSize, now);
                positionTextPanel();
            }
            liveSize = now;

            const info = document.getElementById('pageSizeInfo');
            if (info) info.textContent = `현재 표시 크기: 가로 ${now.w} · 세로 ${now.h}px` +
                ((now.w < pageSetting.w || now.h < pageSetting.h) ? ' (화면보다 커서 자동으로 줄였어요)' : '');
        }

        function setupLayout() {
            window.addEventListener('resize', refreshLayout);
            document.addEventListener('focusout', () => setTimeout(refreshLayout, 300));
            if (window.ResizeObserver) new ResizeObserver(refreshLayout).observe(document.querySelector('.toolbar'));
            refreshLayout();
        }

        function syncPageSizeInputs() {
            document.getElementById('pageWInput').value = pageSetting.w;
            document.getElementById('pageHInput').value = pageSetting.h;
        }
        function loadPageSize() {
            try {
                const v = JSON.parse(localStorage.getItem(PAGE_SIZE_KEY));
                if (v && v.w > 0 && v.h > 0) pageSetting = {
                    w: clampNum(Math.round(v.w), PAGE_W_MIN, PAGE_W_MAX),
                    h: clampNum(Math.round(v.h), PAGE_H_MIN, PAGE_H_MAX)
                };
            } catch (err) {}
            syncPageSizeInputs();
        }
        function applyPageSizeSetting() {
            let w = parseInt(document.getElementById('pageWInput').value);
            let h = parseInt(document.getElementById('pageHInput').value);
            if (isNaN(w)) w = pageSetting.w;
            if (isNaN(h)) h = pageSetting.h;
            pageSetting = { w: clampNum(w, PAGE_W_MIN, PAGE_W_MAX), h: clampNum(h, PAGE_H_MIN, PAGE_H_MAX) };
            syncPageSizeInputs();
            localStorage.setItem(PAGE_SIZE_KEY, JSON.stringify(pageSetting));
            refreshLayout();
        }
        /* 📐 − / ＋ 버튼 : 10px씩 */
        function stepPageSize(which, delta) {
            const el = document.getElementById(which === 'w' ? 'pageWInput' : 'pageHInput');
            el.value = (parseInt(el.value, 10) || pageSetting[which]) + delta;
            applyPageSizeSetting();
        }
        function resetPageSize() {
            document.getElementById('pageWInput').value = DEFAULT_PAGE_W;
            document.getElementById('pageHInput').value = DEFAULT_PAGE_H;
            applyPageSizeSetting();
        }


/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['page'] = true;
