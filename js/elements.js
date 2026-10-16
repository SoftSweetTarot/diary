/* 말랑달콤 다이어리 - js/elements.js
   스티커/글/이미지 추가 · 라이브러리 · 요소 이동/회전/크기 · 페이지 내용 저장(saveData)/불러오기
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        function addSticker(emoji) {
            const el = document.createElement('div');
            el.className = 'element-box';
            el.innerHTML = `<span style="font-size:45px; display:inline-block;">${emoji}</span>`;
            makeTransformable(el);
            const at = window.tmPlace && tmPlace(el);
            document.getElementById('canvasArea').appendChild(el);
            if (!at) elCenter(el);
            if (window.stkBlink) stkBlink();
        }

        function addText() {
            const el = document.createElement('div');
            el.className = 'element-box';
            el.style.width = '160px';
            el.style.height = '80px';
            const ta = document.createElement('textarea');
            ta.placeholder = '글을 입력하세요...';
            styleTextarea(ta, DEFAULT_TEXT_FONT, DEFAULT_TEXT_COLOR, DEFAULT_TEXT_SIZE);
            el.appendChild(ta);
            makeTransformable(el);
            if (window.tmPlace) tmPlace(el);
            document.getElementById('canvasArea').appendChild(el);
            selectElement(el);
        }

        function resolveSrc(p) {
            return /^(https?:|data:|blob:)/i.test(p) ? p : p.split('/').map(encodeURIComponent).join('/');
        }

        function bindImage(img, src, fallback) {
            img.dataset.src = src;
            img.onerror = () => {
                if (fallback && img.src !== fallback) { img.src = fallback; }
                else { img.classList.add('broken'); img.alt = '⚠ ' + src; }
            };
            img.src = resolveSrc(src);
            inlineImage(img);
        }
        /* 🖼️ 페이지 그림은 주소가 아닌 그림 그대로(data) 일기 JSON에 담아요 (확정 원칙)
           → 불러올 때 개발자 구글 드라이브 · 앱스크립트 트래픽 0 · 주소로 붙은 그림은 한 번 그려서 바꾼 뒤 저장
           - 긴 변 최대 1000px · 투명한 곳이 있으면 PNG, 없으면 JPG */
        const INLINE_MAX = 1000;
        function inlineImage(img) {
            const src = img.dataset.src;
            if (!src || src.startsWith('data:')) return;
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => {
                if (img.dataset.src !== src || !im.naturalWidth) return;
                try {
                    const k = Math.min(1, INLINE_MAX / Math.max(im.naturalWidth, im.naturalHeight));
                    const w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
                    const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                    const x = cv.getContext('2d'); x.drawImage(im, 0, 0, w, h);
                    const a = x.getImageData(0, 0, w, h).data; let clear = false;
                    for (let i = 3; i < a.length; i += 16) if (a[i] < 255) { clear = true; break; }
                    const url = clear ? cv.toDataURL('image/png') : cv.toDataURL('image/jpeg', .9);
                    img.dataset.src = url; img.src = url;
                    if (img.isConnected && typeof saveData === 'function') saveData(false);
                } catch (e) {}
            };
            im.src = resolveSrc(src);
        }

        function addImage(src, fallback) {
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어주세요!'); return false; }
            const el = document.createElement('div');
            el.className = 'element-box';
            el.style.width = '150px';
            const img = document.createElement('img');
            bindImage(img, src, fallback);
            el.appendChild(img);
            makeTransformable(el);
            const at = window.tmPlace && tmPlace(el);
            document.getElementById('canvasArea').appendChild(el);
            if (!at) elCenter(el);
            return true;
        }
        /* 📍 꺼낸 스티커는 배경(화면) 한가운데에 놓여요 (화면 가운데가 페이지 밖이면 페이지 안에서 가장 가까운 곳)
           - 처음 자리(100, 100) 그대로일 때만 : 떼어 붙이기 · 필기구처럼 부른 곳에서 자리를 정했으면 그대로 둬요
           - 그림은 다 불러온 뒤 크기를 재서 맞춰요 */
        function elCenter(el) {
            const go = () => {
                if (!el.isConnected || el.dataset.posX !== '100' || el.dataset.posY !== '100') return;
                const pg = document.getElementById('canvasArea'), r = pg.getBoundingClientRect(), k = r.width / (pg.offsetWidth || r.width) || 1;
                const put = (x, y) => { el.dataset.posX = x; el.dataset.posY = y; el.style.transform = `translate(${x}px, ${y}px) scale(${el.dataset.scale || 1}) rotate(${el.dataset.rotation || 0}deg)`; };
                put(0, 0);
                const b = el.getBoundingClientRect(), hw = Math.min(b.width, r.width) / 2, hh = Math.min(b.height, r.height) / 2;
                const cx = Math.min(r.right - hw, Math.max(r.left + hw, window.innerWidth / 2)), cy = Math.min(r.bottom - hh, Math.max(r.top + hh, window.innerHeight / 2));
                put(Math.round((cx - (b.left + b.width / 2)) / k), Math.round((cy - (b.top + b.height / 2)) / k));
                if (selectedElement === el && typeof positionTextPanel === 'function') positionTextPanel();
                if (typeof saveData === 'function') saveData(false);
            };
            const img = el.querySelector('img');
            if (img && !img.complete) { img.addEventListener('load', () => requestAnimationFrame(go), { once: true }); img.addEventListener('error', () => requestAnimationFrame(go), { once: true }); }
            else requestAnimationFrame(go);
        }

        /* 📚 기본스티커 : 그림과 목록은 Cloudflare 그림 보관함(KIT_BASE)에 있어요 (도구/말랑달콤_포장기.html 로 만든 zip 을 올려요)
           - list.json : images [{ f, c }] 씰 낱장 · sheets [{ c, fs }] 씰 종이 · kits { 종류: [{ c, fs }] · [{ c, f }] } · t [미리보기가 있는 그림]
             f = 그림 파일 이름 (같은 그림은 늘 같은 이름) → 원본 KIT_BASE/k/이름 · 미리보기 KIT_BASE/t/지문.webp (작게 보여 줄 때)
           - 다이어리 안에서는 주소로 바꿔서 써요 : images [{ u, c }] · sheets [{ c, us }] · kits [{ c, us }] · [{ c, u }]
           - c = 기본스티커/씰스티커 아래 폴더 이름 = 카테고리 ('' 이면 '기본' 카테고리) · 나머지 종류는 js/stk-basic.js 가 각 창의 기본 칸에 제가 그린 그림과 섞어서 보여요
           - 카테고리만 이름이 보여요 ('1. 캐릭터' 처럼 앞 번호는 순서용 · 화면에는 '캐릭터') · 스티커 이름은 없어요
           - 목록은 앱을 켠 동안 한 번만 받아요 (basicKit) */
        const KIT_BASE = 'https://malang-img.pages.dev';                    // ← 🖼️ 그림 보관함 (Cloudflare Pages 주소 · 끝에 / 없이)
        let libItems = null, libLoading = false, libCats = [], libCat = '';
        const KIT_THUMB = new Set();                                         // 미리보기(t/)가 따로 있는 그림 지문
        const kitOk = f => typeof f === 'string' && /^[0-9a-f]{16}\.(png|jpg|gif|webp|svg)$/.test(f);
        const kitUrl = f => KIT_BASE + '/k/' + f;
        /* 보여 줄 크기에 맞는 주소 : 작게(400 이하)는 미리보기 · 크게는 원본 */
        function kitSize(u, w) {
            u = String(u || '');
            if (u.startsWith(KIT_BASE + '/k/')) { const f = u.slice(KIT_BASE.length + 3), h = f.split('.')[0]; return w <= 400 && KIT_THUMB.has(h) ? KIT_BASE + '/t/' + h + '.webp' : u; }
            return u;
        }
        const libCatName = c => c.replace(/^\d+\s*[.)_\-]?\s*/, '') || c;
        function libView() { return !libItems ? [] : libCat ? libItems.filter(x => x.c === libCat) : libItems; }

        async function fetchLibraryList() {
            if (!KIT_BASE) throw new Error('setup');
            const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), KT_WAIT_SLOW);   // 기다리는 시간은 keepTrying 이 정해요 (5초 · 느리면 10초)
            try {
                const res = await fetch(KIT_BASE + '/list.json', { signal: ctl.signal, cache: 'no-cache' });
                if (!res.ok) throw new Error('server');
                const d = await res.json();
                if (!d || !Array.isArray(d.images)) throw new Error('server');
                (Array.isArray(d.t) ? d.t : []).forEach(h => { if (/^[0-9a-f]{16}$/.test(h)) KIT_THUMB.add(h); });
                const us = fs => (Array.isArray(fs) ? fs : []).filter(kitOk).slice(0, 30).map(kitUrl);
                const kits = {};
                Object.keys(d.kits && typeof d.kits === 'object' ? d.kits : {}).forEach(k => {
                    kits[k] = (Array.isArray(d.kits[k]) ? d.kits[k] : []).map(x => !x ? null : Array.isArray(x.fs) ? { c: String(x.c || ''), us: us(x.fs) } : kitOk(x.f) ? { c: String(x.c || ''), u: kitUrl(x.f) } : null)
                        .filter(x => x && (x.u || (x.us && x.us.length)));
                });
                return {
                    images: d.images.filter(x => x && kitOk(x.f)).map(x => ({ u: kitUrl(x.f), c: String(x.c || '') })),
                    sheets: (Array.isArray(d.sheets) ? d.sheets : []).map(x => x && { c: String(x.c || ''), us: us(x.fs) }).filter(x => x && x.us.length),
                    kits
                };
            } finally { clearTimeout(timer); }
        }
        /* 기본스티커 목록 (앱을 켠 동안 한 번) : { images, sheets, kits }
           실패하면 받을 때까지 5초마다 알아서 다시 해요 (js/drive.js keepTrying · 창을 닫아도 뒤에서 계속)
           씰 · 포인트 · 조각 · 모조지스티커 · 테이프 · 메모지 · 떡메 · 속지 창이 모두 이 목록 하나를 같이 기다려요 */
        let basicKitP = null, basicKitTry = 0;
        async function basicKitLoop() {
            basicKitTry = 1;
            try {
                return await keepTrying(fetchLibraryList, {
                    stop: e => e && e.message === 'setup',                     // 서버 주소가 없으면 기다려도 소용없어요
                    onTry: n => { basicKitTry = n; document.dispatchEvent(new CustomEvent('basickit-retry', { detail: { n: n - 1 } })); }
                });
            } catch (e) { basicKitP = null; throw e; }
            finally { basicKitTry = 0; }
        }
        function basicKit(force) {
            if (!basicKitP || (force && !basicKitTry)) basicKitP = basicKitLoop();
            return basicKitP;
        }
        document.addEventListener('basickit-retry', e => {                 // 🏷️ 씰 창 안내 글씨 (다른 창은 받을 때까지 조용히 기다렸다가 채워요)
            const st = document.getElementById('libStatus');
            if (st && libLoading) st.textContent = `⏳ 목록을 다시 불러오는 중이에요… (${e.detail.n + 1}번째)`;
        });
        window.basicKit = basicKit; window.kitSize = kitSize; window.kitName = libCatName;

        /* ---------- 📚 라이브러리 페이지 넘기기 · 배치 설정 ----------
           - 한 페이지에 (몇 줄 × 한 줄에 몇 개)개씩 보여 주고, ◀ 이전 / 다음 ▶ 버튼(또는 옆으로 밀기)으로 넘김
           - 배치 설정(한 줄에 몇 개·몇 줄·크기)은 기기마다 화면 크기가 달라서 이 기기(localStorage)에만 기억
             → 구글 드라이브 저장(일기·설정.json)에는 전혀 영향 없음 */
        const LIB_LAYOUT_KEY = 'malang_lib_layout';
        const LIB_DEFAULT_LAYOUT = { rows: 3, cols: 5, size: 88 };
        const LIB_LAYOUT_LIMITS = { rows: [1, 10], cols: [1, 10], size: [50, 180] };
        const LIB_GAP = 8;
        let libLayout = loadLibLayout();
        let libPage = 0;
        let libSwiped = false;

        function loadLibLayout() {
            const out = Object.assign({}, LIB_DEFAULT_LAYOUT);
            let saved = null;
            try { saved = JSON.parse(localStorage.getItem(LIB_LAYOUT_KEY)); } catch (e) {}
            if (saved && typeof saved === 'object') {
                Object.keys(LIB_LAYOUT_LIMITS).forEach(k => {
                    const n = parseInt(saved[k], 10), lim = LIB_LAYOUT_LIMITS[k];
                    if (!isNaN(n)) out[k] = Math.max(lim[0], Math.min(lim[1], n));
                });
            }
            return out;
        }
        function saveLibLayout() {
            try { localStorage.setItem(LIB_LAYOUT_KEY, JSON.stringify(libLayout)); } catch (e) {}
        }
        function libPerPage() { return libLayout.rows * libLayout.cols; }
        /* 쪽 나누기 : 씰 1개 = 1칸 · 씰 종이(여러 개) = 옆으로 2칸 · 빈 곳은 뒤의 1칸짜리가 채워요 (CSS grid-auto-flow: dense 와 같은 순서)
           → [[item, …], …] 쪽마다 */
        const libSpan = x => x.s ? Math.min(2, libLayout.cols) : 1;
        function libPages() {
            const { rows, cols } = libLayout, out = [];
            let page = null, used = null;
            const fit = w => { for (let r = 0; r < rows; r++) for (let c = 0; c + w <= cols; c++) { let ok = true; for (let k = 0; k < w; k++) if (used[r * cols + c + k]) ok = false; if (ok) { for (let k = 0; k < w; k++) used[r * cols + c + k] = 1; return true; } } return false; };
            libView().forEach(x => {
                const w = libSpan(x);
                if (!page || !fit(w)) { page = []; used = new Array(rows * cols).fill(0); out.push(page); fit(w); }
                page.push(x);
            });
            return out;
        }
        function libPageCount() { return libPages().length; }

        /* 줄 수·한 줄 개수·크기 → 그리드 모양과 창 너비에 반영, 설정 칸 값도 맞춤 */
        function applyLibLayoutStyle() {
            const { rows, cols, size } = libLayout;
            document.getElementById('libGrid').style.gridTemplateColumns = `repeat(${cols}, minmax(0, ${size}px))`;
            document.getElementById('libContent').style.setProperty('--lib-w', (cols * size + (cols - 1) * LIB_GAP + 48) + 'px');
            const fill = (sel, max, val) => {
                if (sel.options.length !== max) {
                    sel.innerHTML = '';
                    for (let i = 1; i <= max; i++) sel.add(new Option(i, i));
                }
                sel.value = val;
            };
            fill(document.getElementById('libRowsInput'), LIB_LAYOUT_LIMITS.rows[1], rows);
            fill(document.getElementById('libColsInput'), LIB_LAYOUT_LIMITS.cols[1], cols);
            document.getElementById('libSizeInput').value = size;
            document.getElementById('libSizeVal').textContent = size + 'px';

            /* 한눈에 보이게 : 작은 칸 그림 + '= 한 페이지 N개' */
            const mini = document.getElementById('libLayoutMini');
            if (mini) {
                mini.style.gridTemplateColumns = `repeat(${cols}, 5px)`;
                if (mini.childElementCount !== rows * cols) { mini.innerHTML = '<i></i>'.repeat(rows * cols); }
            }
            const sum = document.getElementById('libLayoutSum');
            if (sum) sum.textContent = `= 한 페이지 ${rows * cols}개`;
        }

        function updateLibPager() {
            const pages = libPageCount();
            document.getElementById('libPageInfo').textContent = pages ? `${libPage + 1} / ${pages}` : '0 / 0';
            document.getElementById('libPrevBtn').disabled = !pages || libPage <= 0;
            document.getElementById('libNextBtn').disabled = !pages || libPage >= pages - 1;
        }

        function changeLibPage(delta) {
            const pages = libPageCount();
            if (!pages) return;
            const next = Math.max(0, Math.min(pages - 1, libPage + delta));
            if (next === libPage) return;
            libPage = next;
            renderLibrary();
        }

        function toggleLibLayout() {
            const panel = document.getElementById('libLayoutPanel');
            const open = panel.style.display === 'none';
            panel.style.display = open ? 'flex' : 'none';
            document.getElementById('libLayoutBtn').classList.toggle('on', open);
        }

        /* 설정을 바꿔도 지금 보고 있던 첫 번째 이미지가 들어 있는 페이지로 이동 */
        function setLibLayout(next) {
            const first = (libPages()[libPage] || [])[0];
            libLayout = next;
            libPage = Math.max(0, libPages().findIndex(p => p.includes(first)));
            saveLibLayout();
            if (libItems) renderLibrary(); else { applyLibLayoutStyle(); updateLibPager(); }
        }
        function onLibLayoutChange() {
            const num = (id, k) => {
                const n = parseInt(document.getElementById(id).value, 10), lim = LIB_LAYOUT_LIMITS[k];
                return isNaN(n) ? libLayout[k] : Math.max(lim[0], Math.min(lim[1], n));
            };
            setLibLayout({ rows: num('libRowsInput', 'rows'), cols: num('libColsInput', 'cols'), size: num('libSizeInput', 'size') });
        }
        function resetLibLayout() { setLibLayout(Object.assign({}, LIB_DEFAULT_LAYOUT)); }

        /* 스마트폰 : 이미지 목록을 옆으로 밀어서 페이지 넘기기 */
        (function setupLibSwipe() {
            const grid = document.getElementById('libGrid');
            let sx = 0, sy = 0, tracking = false;
            grid.addEventListener('touchstart', (e) => {
                if (e.touches.length !== 1) { tracking = false; return; }
                tracking = true; libSwiped = false;
                sx = e.touches[0].clientX; sy = e.touches[0].clientY;
            }, { passive: true });
            grid.addEventListener('touchend', (e) => {
                if (!tracking) return;
                tracking = false;
                const t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy;
                if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
                    libSwiped = true;                                  // 밀기 끝에 이미지가 눌리지 않도록
                    changeLibPage(dx < 0 ? 1 : -1);
                    setTimeout(() => { libSwiped = false; }, 400);
                }
            });
        })();

        /* ☕ 라이브러리 목록 미리 받아 두기 : 다이어리를 열고 잠시 뒤 조용히 받아 둬요 → 🏷️ 씰스티커 → 기본을 누르면 바로 보여요 */
        window.addEventListener('load', () => setTimeout(() => { if (!libItems && !libLoading) loadLibrary(false); }, 2500));


        async function loadLibrary(force) {
            const st = document.getElementById('libStatus'), grid = document.getElementById('libGrid');
            if (libItems && !force) { renderLibrary(); return; }
            if (libLoading) return;
            libLoading = true;
            st.textContent = '⏳ 이미지 목록을 불러오는 중...';
            grid.innerHTML = '';
            try {
                const kit = await basicKit(force), seen = new Set();
                libItems = [];
                kit.sheets.forEach(x => libItems.push({ u: x.us[0], s: x.us, c: x.c || '기본' }));   // 🏷️ 씰 종이 (폴더 1개 = 종이 1장) : 카테고리 맨 앞에
                kit.images.forEach(x => { if (!seen.has(x.u)) { seen.add(x.u); libItems.push({ u: x.u, c: x.c || '기본' }); } });   // 카테고리 폴더 밖 그림 = '기본'
                libCats = [...new Set(libItems.map(x => x.c).filter(Boolean))];
                if (!libCats.includes(libCat)) libCat = libCats[0] || '';      // '전체' 칸 없이 첫 카테고리부터 (한꺼번에 다 그리지 않아서 빨라요)
                libPage = 0;
                renderLibrary();
            } catch (err) {
                libItems = null;
                updateLibPager();
                st.innerHTML = err && err.message === 'setup' ? '🏷️ 그림 모음을 준비하고 있어요. 조금만 기다려 주세요!'
                    : '⚠ 이미지 목록을 불러오지 못했어요.<br>인터넷 연결을 확인한 뒤 다시 열어 주세요.';
            }
            libLoading = false;
        }

        /* 🗂 카테고리 칸 (카테고리가 하나뿐이면 숨겨요) · '전체' 칸은 없어요 */
        function renderLibCats() {
            const box = document.getElementById('libCats'); if (!box) return;
            box.hidden = libCats.length < 2;
            if (libCats.length < 2) { box.innerHTML = ''; return; }
            const btn = (c, label, n) => `<button type="button" class="lib-cat${c === libCat ? ' on' : ''}" data-c="${c.replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';')}">${label}<small>${n}</small></button>`;
            box.innerHTML = libCats.map(c => btn(c, libCatName(c).replace(/[&<>"']/g, ch => '&#' + ch.charCodeAt(0) + ';'), libItems.filter(x => x.c === c).length)).join('');
            box.querySelectorAll('.lib-cat').forEach(b => { b.onclick = () => setLibCat(b.dataset.c); });
            const on = box.querySelector('.lib-cat.on'); if (on) on.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        }
        function setLibCat(c) {
            if (c === libCat) return;
            libCat = c; libPage = 0;
            renderLibrary();
        }

        /* 그림 모음에서 고르면 : 🏷️ 씰스티커처럼 하얀 칼선 테두리를 둘러 하얀 종이째 나와요 → 떼어 붙여요 (js/stickerpeel.js)
           그림을 그릴 수 없으면(주소가 막힘) 예전처럼 페이지에 바로 붙어요 */
        /* 🏷️ 씰 종이 : 한 종이에 씰 여러 개 → 하나씩 떼어 붙여요 (js/stickerpeel.js) */
        async function libPickSheet(urls) {
            if (window.stkLeave) stkLeave();
            try { if (window.pelBake && window.openStickerPeel && await openStickerPeel(await Promise.all(urls.map(u => pelBake(kitSize(u, 600)))))) return; } catch (e) {}
            showMsg('⚠ 씰 종이를 열지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인해 주세요.</span>');
            if (window.stkReturn) stkReturn(700);
        }
        async function libPick(url) {
            if (window.stkLeave) stkLeave();
            try { if (window.pelBake && window.openStickerPeel && await openStickerPeel(await pelBake(url))) return; } catch (e) {}
            addImage(url); if (window.stkReturn) stkReturn(700);
        }
        function renderLibrary() {
            const st = document.getElementById('libStatus'), grid = document.getElementById('libGrid');
            grid.innerHTML = '';
            if (libCats.length && !libCats.includes(libCat)) libCat = libCats[0];   // '전체' 없이 늘 한 카테고리 (📒 수첩도 · 카테고리 칸은 제목 아래 js/stknote.js snbCatsSync)
            applyLibLayoutStyle();
            renderLibCats();
            const view = libView();
            if (!view.length) { st.textContent = '기본스티커 / 씰스티커 폴더에 그림이 없어요.'; updateLibPager(); return; }
            const per = libPerPage(), all = libPages(), pages = all.length;
            libPage = Math.max(0, Math.min(pages - 1, libPage));
            st.textContent = '';                                                // 안내 글은 없이 (공간 아끼기 · 도련 2026-10-15) · 불러오는 중 · 오류만 보여요
            const thumbW = libLayout.size > 120 ? 400 : 240;                    // 크게 볼 때는 조금 더 선명한 썸네일
            const frag = document.createDocumentFragment(), cur = all[libPage] || [];
            let usedSlots = 0;
            cur.forEach(x => {
                const { u: url, s: sheet } = x;
                const item = document.createElement('div');
                item.className = 'lib-item' + (sheet ? ' lib-sheet' : ''); item.dataset.u = url;   // 원본 주소 (📒 수첩이 붙일 때 써요)
                usedSlots += libSpan(x);
                if (sheet) {                                                       // 🏷️ 씰 종이 : 옆으로 2칸 · 안에 든 씰을 작게 최대한 많이 + 총 개수
                    item.style.gridColumn = 'span ' + libSpan(x);
                    item.title = '스티커 ' + sheet.length + '개';
                    item.innerHTML = sbThumbs(sheet.map(u => kitSize(u, 96))) + `<small class="lib-cnt">스티커 ${sheet.length}개</small>`;
                } else {
                    const img = document.createElement('img');
                    img.loading = 'lazy';
                    img.src = kitSize(url, thumbW);
                    img.onerror = () => item.classList.add('bad');
                    item.appendChild(img);
                }
                item.onclick = () => { if (!libSwiped) (sheet ? libPickSheet(sheet) : libPick(url)); };
                frag.appendChild(item);
            });
            /* 마지막 페이지가 덜 차도 창 크기가 흔들리지 않도록 빈칸 채우기 */
            for (let k = usedSlots; k < per && pages > 1; k++) {
                const empty = document.createElement('div');
                empty.className = 'lib-item empty';
                frag.appendChild(empty);
            }
            grid.appendChild(frag);
            updateLibPager();
        }

        function makeTransformable(el) {
            el.style.zIndex = zIndexCounter++;
            let posX = 100, posY = 100, scale = 1, rotation = 0;

            /* 네 꼭짓점 : 잡고 돌리면 회전 + 가운데로 당기면 작게 · 바깥으로 밀면 크게 (눈에 안 보이는 터치 칸 · 도련 · 2026-10-13)
               · 손가락 2개로 벌리면 확대/축소 + 비틀면 회전 · 마우스 휠로 확대/축소 */
            ['tl', 'tr', 'bl', 'br'].forEach(c => {
                const z = document.createElement('div');
                z.className = 'rot-zone rot-' + c;
                el.appendChild(z);
            });

            /* 🎀 마스킹테이프 (js/tape.js) : ↔ 손잡이로 길이만 늘이고 줄이기 */
            let stretchHandle = null, initialW = 0;
            const tapeImg = el.querySelector('img');
            if (tapeImg && typeof isTapeSrc === 'function' && isTapeSrc(tapeImg.dataset.src)) {
                stretchHandle = document.createElement('div');
                stretchHandle.className = 'handle stretch-handle';
                el.classList.add('is-tape');
                stretchHandle.innerHTML = '↔';
                el.appendChild(stretchHandle);
            }

            /* 🪶 끌어 옮기기 (맨 위 레이어로 · 놓은 뒤에도 맨 위)
               - 그림 스티커 · 이모지 : 🏷️ 씰스티커처럼 손가락을 따라 가장자리부터 떼어져요 (js/peelfx.js pfxSeal) → 다 떼면 떠서 따라오고, 놓으면 작아지며 붙어요 · 덜 떼고 놓으면 제자리에 다시 붙어요
               - 액자 사진 · 마스킹테이프 등 : 6% 커지고 그림자를 단 채 떠서 따라와요 */
            let lift = 1, liftRaf = 0, lifted = false, seal = null, peelStop = null;
            /* 스티커인지 : 그림 스티커 · 이모지 (액자 사진 · 테이프 · 글 쓰는 메모 · 움직이는 것은 아니에요) */
            function isStickerEl() {
                if (el.className.indexOf('fr-') >= 0 || el.dataset.float || el.querySelector('textarea')) return false;
                const img = el.querySelector(':scope > img');
                if (img) return img.complete && !!img.naturalWidth && !(typeof isTapeSrc === 'function' && isTapeSrc(img.dataset.src));
                return !!el.querySelector(':scope > span');
            }
            function liftTo(to) {
                cancelAnimationFrame(liftRaf);
                const from = lift, t0 = performance.now();
                const step = now => {
                    const k = Math.min(1, (now - t0) / 140), e = 1 - (1 - k) * (1 - k);
                    lift = from + (to - from) * e;
                    updateTransform();
                    if (k < 1) liftRaf = requestAnimationFrame(step);
                };
                liftRaf = requestAnimationFrame(step);
            }

            function updateTransform() {
                el.style.transform = `translate(${posX}px, ${posY}px) scale(${scale * lift}) rotate(${rotation}deg)`;
                el.style.setProperty('--inv', Math.min(5, 1 / (scale || 1)));
            }
            
            el.dataset.posX = posX; el.dataset.posY = posY;
            el.dataset.scale = scale; el.dataset.rotation = rotation;
            updateTransform();

            let actionType = null;
            let startX, startY, startAngle, initialX, initialY, pinch = null, rotD0 = 0, rotS0 = 1;

            function getClientPos(e) {
                if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                return { x: e.clientX, y: e.clientY };
            }

            const onStart = (e) => {
                /* 두 번째 손가락이 다른 것 위에 닿으면 고른 걸 바꾸지 않음 */
                if (e.touches && e.touches.length > 1 && selectedElement && selectedElement !== el) return;
                selectElement(el);
                const pos = getClientPos(e);
                startX = pos.x; startY = pos.y;
                posX = parseFloat(el.dataset.posX) || 0;
                posY = parseFloat(el.dataset.posY) || 0;
                scale = parseFloat(el.dataset.scale) || 1;
                rotation = parseFloat(el.dataset.rotation) || 0;

                pinch = null;
                if (e.touches && e.touches.length > 1) {
                    actionType = 'pinch';
                } else if (e.target.classList && e.target.classList.contains('rot-zone')) {
                    actionType = 'rotate';
                    const rect = el.getBoundingClientRect();
                    startAngle = Math.atan2(pos.y - (rect.top + rect.height / 2), pos.x - (rect.left + rect.width / 2)) * (180 / Math.PI) - rotation;
                    rotD0 = Math.hypot(pos.x - (rect.left + rect.width / 2), pos.y - (rect.top + rect.height / 2)); rotS0 = scale;   // 가운데(피봇)까지 거리 → 크기
                } else if (stretchHandle && e.target === stretchHandle) {
                    actionType = 'stretch';
                    initialW = parseFloat(el.style.width) || el.offsetWidth;
                } else {
                    actionType = 'move';
                    initialX = posX; initialY = posY;
                }
                e.stopPropagation();
            };

            const onMove = (e) => {
                if (!actionType) return;
                if (e.cancelable) e.preventDefault();
                if (e.touches && e.touches.length > 1) {
                    const a = e.touches[0], b = e.touches[1];
                    const d = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
                    const ang = Math.atan2(b.clientY - a.clientY, b.clientX - a.clientX) * (180 / Math.PI);
                    if (actionType !== 'pinch' || !pinch) {
                        actionType = 'pinch';
                        pinch = { d0: d || 1, a0: ang, s0: parseFloat(el.dataset.scale) || 1, r0: parseFloat(el.dataset.rotation) || 0 };
                        return;
                    }
                    scale = Math.max(0.2, Math.min(5, pinch.s0 * (d / pinch.d0)));
                    rotation = pinch.r0 + (ang - pinch.a0);
                    el.dataset.scale = scale; el.dataset.rotation = rotation;
                    updateTransform();
                    if (el === selectedElement) positionTextPanel();
                    return;
                }
                if (actionType === 'pinch') return;
                const pos = getClientPos(e);

                if (actionType === 'move') {
                    const ddx = pos.x - startX, ddy = pos.y - startY;
                    if (seal) { seal.move(pos.x, pos.y); return; }
                    if (!lifted && Math.hypot(ddx, ddy) > 6) {
                        lifted = true;
                        el.style.zIndex = zIndexCounter++;
                        /* 🏷️ 씰스티커처럼 떼었다 붙이기 : 지금은 꺼 뒀어요 (모든 것이 모조지스티커처럼 살짝 떠서 옮겨져요)
                           다시 켜려면 아래 두 줄의 // 를 지우고, 그 밑의 '살짝 떠서' 한 줄을 지우면 돼요 (sealStart 함수는 그대로 있어요)
                        if (!(seal = sealStart())) { el.classList.add('lifting'); liftTo(1.06); }   // 📝 메모지 · 🧻 떡메 · 📄 모조지스티커 · 테이프 : 살짝 떠서 옮겨요
                        else { seal.move(pos.x, pos.y); return; } */
                        el.classList.add('lifting'); liftTo(1.06);                      // 모두 살짝 떠서 옮겨요 (그림자 : css .lifting)
                        /* 🏷️ 스티커만 살짝 들렸다가 평평해지며 뜨기 (v373) : 지금은 꺼 뒀어요 (도련 · 2026-10-13 · 그냥 떠서 옮겨요)
                           다시 켜려면 아래 한 줄의 // 만 지우면 돼요 (js/peelfx.js pfxPeel · isStickerEl 는 그대로 있어요)
                           처음에 잡은 쪽 가장자리가 살짝(30%) 들렸다가 평평해지며 떠요 (0.3초 · 저절로) · 위치는 처음부터 손가락과 1:1 */
                        // if (window.pfxPeel && isStickerEl()) { if (peelStop) peelStop(); peelStop = pfxPeel(el, startX, startY, ddx, ddy, rotation, () => { peelStop = null; }, { upto: .3, ms: 160, flat: true, flatMs: 150 }); }
                    }
                    posX = initialX + ddx;
                    posY = initialY + ddy;
                    el.dataset.posX = posX; el.dataset.posY = posY;
                } else if (actionType === 'rotate') {
                    const rect = el.getBoundingClientRect();
                    const currentAngle = Math.atan2(pos.y - (rect.top + rect.height / 2), pos.x - (rect.left + rect.width / 2)) * (180 / Math.PI);
                    rotation = currentAngle - startAngle;
                    el.dataset.rotation = rotation;
                    const d = Math.hypot(pos.x - (rect.left + rect.width / 2), pos.y - (rect.top + rect.height / 2));
                    if (rotD0 > 8) { scale = Math.max(0.2, Math.min(5, rotS0 * d / rotD0)); el.dataset.scale = scale; }   // 가까이 → 작게 · 멀리 → 크게
                } else if (actionType === 'stretch') {
                    const a = rotation * Math.PI / 180;
                    const d = ((pos.x - startX) * Math.cos(a) + (pos.y - startY) * Math.sin(a)) / (scale || 1);
                    el.style.width = Math.round(Math.max(40, Math.min(1200, initialW + d))) + 'px';
                }
                updateTransform();
                if (el === selectedElement) positionTextPanel();
            };

            const onEnd = () => {
                actionType = null; pinch = null;
                if (seal) { lifted = false; seal.up(); return; }
                if (peelStop) { peelStop(); peelStop = null; }                  // 아주 빨리 놓으면 들린 쪽도 바로 평평하게
                if (lifted) { lifted = false; el.classList.remove('lifting'); land(); }
            };
            /* 내려앉기 : 살짝 눌렸다가(0.98) 제자리 크기로 */
            function land() {
                cancelAnimationFrame(liftRaf);
                const from = lift, t0 = performance.now();
                const step = now => {
                    const k = Math.min(1, (now - t0) / 260);
                    lift = k < .55 ? from + (.98 - from) * (1 - (1 - k / .55) ** 2) : .98 + .02 * Math.sin((k - .55) / .45 * Math.PI / 2);
                    updateTransform();
                    if (k < 1) liftRaf = requestAnimationFrame(step);
                };
                liftRaf = requestAnimationFrame(step);
            }

            /* 🏷️ 씰스티커처럼 떼기 시작 : 지금 보이는 모습 그대로 맨 위 캔버스에 옮겨 그리고, 페이지의 스티커는 잠깐 숨겨요 */
            function sealStart() {
                if (!window.pfxSeal || el.className.indexOf('fr-') >= 0 || el.dataset.float || el.querySelector('textarea')) return null;
                const img = el.querySelector(':scope > img'), span = !img && el.querySelector(':scope > span');
                if (img && (!img.complete || !img.naturalWidth || (typeof isTapeSrc === 'function' && isTapeSrc(img.dataset.src)))) return null;
                if (!img && !span) return null;
                const ca = document.getElementById('canvasArea'), k = (ca.getBoundingClientRect().width / (ca.offsetWidth || 1)) || 1, S = scale * k;
                const node = img || span, w = node.offsetWidth * S, h = node.offsetHeight * S;
                if (w < 4 || h < 4) return null;
                let src = img;
                if (!img) {                                                     // 이모지는 글자를 그림으로
                    const R = 3, c = document.createElement('canvas'), fs = parseFloat(getComputedStyle(span).fontSize) || 45;
                    c.width = Math.ceil(span.offsetWidth * R); c.height = Math.ceil(span.offsetHeight * R);
                    const g = c.getContext('2d'); g.font = `${fs * R}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
                    g.fillText(span.textContent, c.width / 2, c.height / 2 + fs * R * .06); src = c;
                }
                const r = el.getBoundingClientRect(), cx0 = r.left + r.width / 2, cy0 = r.top + r.height / 2;
                const x0 = initialX, y0 = initialY;
                el.style.visibility = 'hidden';
                return pfxSeal({ src, cx: cx0, cy: cy0, w, h, rot: rotation * Math.PI / 180, x: startX, y: startY,
                    onCancel: () => { seal = null; el.style.visibility = ''; },
                    onDrop: (cx, cy) => {                                       // 놓은 자리에 작아지며 붙어요
                        seal = null;
                        posX = x0 + (cx - cx0) / k; posY = y0 + (cy - cy0) / k;
                        el.dataset.posX = posX; el.dataset.posY = posY;
                        lift = 1.07; updateTransform(); el.style.visibility = ''; liftTo(1);
                        if (el === selectedElement) positionTextPanel();
                    } });
            }

            el.addEventListener('wheel', (e) => {
                e.preventDefault();
                scale = parseFloat(el.dataset.scale) || 1;
                posX = parseFloat(el.dataset.posX) || 0;
                posY = parseFloat(el.dataset.posY) || 0;
                rotation = parseFloat(el.dataset.rotation) || 0;
                scale += e.deltaY < 0 ? 0.05 : -0.05;
                scale = Math.max(0.2, Math.min(scale, 5));
                el.dataset.scale = scale;
                updateTransform();
                if (el === selectedElement) positionTextPanel();
            });

            el.addEventListener('mousedown', onStart);
            el.addEventListener('touchstart', onStart, { passive: false });
            window.addEventListener('mousemove', onMove);
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('mouseup', onEnd);
            window.addEventListener('touchend', onEnd);
            window.addEventListener('touchcancel', onEnd);                     // 끊겨도 (펜슬 등) 떼던 스티커를 제자리에 돌려놔요
        }

        function selectElement(el) {
            if (selectedElement !== el) panelOffset = null;
            if (selectedElement) selectedElement.classList.remove('selected');
            selectedElement = el;
            selectedElement.classList.add('selected');
            updateTextPanel();
            idleArm();
        }

        /* 👆 사진 · 스티커 같은 그림을 골라 놓고 3초 동안 이동 · 회전 · 크기 조절(손가락 · 마우스 · 창 누르기)을 안 하면 선택 풀기
           - 누르고 있는 동안은 기다리고, 뗀 뒤부터 다시 3초 · 사진 꾸미기 창의 글 입력 중이거나 순서 메뉴가 열려 있으면 끝날 때까지 기다려요
           - 글상자는 그대로 (쓰는 중에 풀리면 안 되니까요) */
        const idleMs = () => (window.clearSec ? clearSec() : 3) * 1000;   // 설정 '자동으로 사라지는 시간'(팝업메뉴와 같은 값)
        let idleTimer = 0, idleDown = false;
        function idleArm() {
            clearTimeout(idleTimer); idleTimer = 0;
            const el = selectedElement;
            if (!el || idleDown || el.querySelector('textarea')) return;
            idleTimer = setTimeout(() => {
                idleTimer = 0;
                if (selectedElement !== el || !el.isConnected || idleDown) return;
                const a = document.activeElement, typing = a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) && a.closest('#textPanel');
                if (typing || document.getElementById('layerMenu') || document.querySelector('.tap-menu.elem')) { idleArm(); return; }
                el.classList.remove('selected');
                selectedElement = null;
                updateTextPanel();
            }, idleMs());
        }
        const idleTouch = e => {
            idleDown = e.type === 'mousedown' || e.type === 'touchstart' ? true : !!(e.touches && e.touches.length);
            if (idleDown) { clearTimeout(idleTimer); idleTimer = 0; } else idleArm();
        };
        ['mousedown', 'touchstart', 'mouseup', 'touchend', 'touchcancel'].forEach(t => document.addEventListener(t, idleTouch, { capture: true, passive: true }));
        /* ✏️ 애플펜슬 : 아이패드는 펜슬로 끌자마자 그림 끌어 옮기기 · 글자 고르기를 시작해서 (손가락은 꾹 눌러야 시작) 끌기가 중간에 끊겨요
           → 페이지 스티커 · 🍭 포인트스티커 · 🏷️ 씰스티커 · 🧩 조각스티커(비닐 찢기) · 📄 모조지스티커 화면에서는 펜슬일 때 그 동작을 막아요 (글상자 · 버튼은 그대로) */
        document.addEventListener('touchstart', e => {
            const t = e.touches[0], tg = e.target;
            if (!e.cancelable || !t || t.touchType !== 'stylus' || !tg.closest) return;
            if (tg.closest('textarea, input, button, select')) return;
            if (tg.closest('#canvasArea .element-box, .spk-grid, .pel-room')) e.preventDefault();
        }, { capture: true, passive: false });

        document.getElementById('canvasArea').addEventListener('click', (e) => {
            if (e.target.id === 'canvasArea') {
                /* 고른 게 있으면 선택 해제가 먼저 · 해제된 상태에서 누르면 추가 메뉴 (js/tapmenu.js) */
                if (selectedElement) {
                    selectedElement.classList.remove('selected');
                    selectedElement = null;
                    updateTextPanel();
                    if (window.tmClose) tmClose();
                } else if (window.tmOpen) tmOpen(e);
            }
        });

        /* 📄 페이지 바깥(스킨 부분)을 눌러도 선택 풀기 · 메모(글상자)도 같이 (빨간 점선이 사라져요) */
        document.addEventListener('pointerdown', (e) => {
            const t = e.target;
            if (!selectedElement || !(t === document.body || t === document.documentElement || t.id === 'diaryWrapper' || t.id === 'diaryBook')) return;
            const a = document.activeElement;
            if (a && a.closest && a.closest('#canvasArea') && a.blur) a.blur();
            selectedElement.classList.remove('selected');
            selectedElement = null;
            updateTextPanel();
            if (window.tmClose) tmClose();
        }, true);

        /* ↕️ 순서 : 고른 것의 겹친 순서 바꾸기 (맨 앞 · 한 칸 앞 · 한 칸 뒤 · 맨 뒤) */
        function layerBoxes() {
            return [...document.querySelectorAll('#canvasArea > .element-box')].map((el, i) => [el, parseInt(el.style.zIndex) || 1, i])
                .sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(a => a[0]);
        }
        function openLayerMenu(anchor) {  // anchor = 버튼 · 또는 { left, width, bottom } 자리
            let m = document.getElementById('layerMenu');
            if (m) { m.remove(); return; }
            if (!selectedElement) { showMsg('순서를 바꿀 스티커 · 글 · 사진을<br>먼저 눌러서 골라 주세요.'); return; }
            m = document.createElement('div');
            m.id = 'layerMenu'; m.className = 'layer-menu';
            const A = (c, d, st) => `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.2" fill="${c}"/><path d="${d}" fill="none" stroke="${st}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
            const ICS = {
                top: A('#dbe8fc', 'M7 12l5-5 5 5M7 18l5-5 5 5', '#4a7fd6'), up: A('#d6f2cc', 'M12 18V7M7 11.5l5-5 5 5', '#3f9455'),
                down: A('#d6f2cc', 'M12 6v11M7 12.5l5 5 5-5', '#3f9455'), bottom: A('#dbe8fc', 'M7 6l5 5 5-5M7 12l5 5 5-5', '#4a7fd6')
            };
            m.innerHTML = [['top', '맨 앞'], ['up', '한 칸 앞'], ['down', '한 칸 뒤'], ['bottom', '맨 뒤']]
                .map(([k, t]) => `<button type="button" class="tap-menu-btn" data-k="${k}" onclick="layerMove('${k}')"><i class="tm-ic">${ICS[k]}</i><span>${t}</span></button>`).join('');
            document.body.appendChild(m);
            const r = anchor && anchor.getBoundingClientRect ? anchor.getBoundingClientRect() : anchor, w = m.offsetWidth, h = m.offsetHeight;
            m.style.left = Math.max(8, Math.min(innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + 'px';
            m.style.top = Math.max(8, Math.min(innerHeight - h - 8, r.bottom + 6)) + 'px';
            layerMark();
            setTimeout(() => document.addEventListener('pointerdown', layerAway, true), 0);
        }
        function layerAway(e) {
            const m = document.getElementById('layerMenu');
            if (m && m.contains(e.target)) return;
            document.removeEventListener('pointerdown', layerAway, true);
            if (m) m.remove();
        }
        function layerMark() {
            const m = document.getElementById('layerMenu'); if (!m) return;
            const L = layerBoxes(), i = L.indexOf(selectedElement), last = L.length - 1;
            m.querySelectorAll('button').forEach(b => { b.disabled = i < 0 || (/top|up/.test(b.dataset.k) ? i === last : i === 0); });
        }
        function layerMove(k) {
            const el = selectedElement; if (!el) return;
            const L = layerBoxes().filter(x => x !== el);
            let i = layerBoxes().indexOf(el);
            i = k === 'top' ? L.length : k === 'bottom' ? 0 : Math.max(0, Math.min(L.length, i + (k === 'up' ? 1 : -1)));
            L.splice(i, 0, el);
            L.forEach((x, n) => { x.style.zIndex = n + 1; });
            zIndexCounter = L.length + 1;
            layerMark();
        }
        /* 🎨 페이지에 붙인 것 다시 다듬기 (꾹 누르기 · 오른쪽 클릭 메뉴 · js/tapmenu.js) → js/stkedit.js · 종류마다 맞는 도구만 (도련 · 2026-10-15)
           - 스티커 · 사진 (씰 · 조각 · 포인트 · 내 스티커) : 전부
           - 📄 모조지스티커 · 🧻 떡메 · 📝 메모지(그림) : 글씨 빼고 (종이 위에는 원래 글을 써요) · 긴 변 1000 까지
           - 🎀 마테 : 색만 (무늬가 이어져 늘어나서 자르면 이음새가 어긋나요) → 테이프 SVG 에 색 행렬을 넣어요 (늘이기 그대로)
           - 빼요 : 사진틀 · 글 · 인형 · 움직이는 캡슐(svg) · 그림 없는 기본 메모지
           - 잘라서 작아지면 붙인 크기도 그만큼 작아지고 · 가운데는 그 자리 그대로 */
        const EL_ED_PAPER = ['color', 'flip', 'crop', 'erase', 'glit'];
        function elEditKind(el) {
            if (!window.openStickerEdit || !el || el.dataset.doll || el.dataset.frame || el.dataset.cm || el.dataset.sh) return null;   // 움직이는 그림(🪄 · ✨)은 다듬기 없음
            if (el.dataset.tk && el.dataset.tkSrc) { const b = el.querySelector(':scope > img.tk-bg'); return b && b.naturalWidth ? { k: 'note', img: b, src: el.dataset.tkSrc } : null; }
            if (el.querySelector('textarea')) return null;
            const img = el.querySelector(':scope > img'), s = img && (img.dataset.src || img.src);
            if (!img || !img.naturalWidth || img.classList.contains('broken')) return null;
            if (typeof isTapeSrc === 'function' && isTapeSrc(s)) return { k: 'tape', img, src: img.getAttribute('src') };   // dataset.src 는 줄인 모양(sv:)일 수 있어요
            if (/^data:image\/svg/.test(s)) return null;
            return { k: el.dataset.float ? 'paper' : 'sticker', img, src: img.src };
        }
        const elEditable = el => !!elEditKind(el);
        /* 🎀 테이프 SVG 에 색 행렬 넣기 (다시 다듬으면 앞의 색 위에 겹쳐요) */
        const elMx = v => v.trim().split(/\s+/).map(Number);
        function elMxMul(N, O) {                                               // 4×5 두 개 → N(O(색))
            const R = [];
            for (let i = 0; i < 4; i++) for (let j = 0; j < 5; j++) {
                let v = j === 4 ? N[i * 5 + 4] : 0;
                for (let t = 0; t < 4; t++) v += N[i * 5 + t] * O[t * 5 + j];
                R.push(Math.round(v * 10000) / 10000);
            }
            return R.join(' ');
        }
        function elTapeTint(src, vals) {
            let svg = decodeURIComponent(src.slice(src.indexOf(',') + 1));
            const old = svg.match(/<feColorMatrix id="mlc" type="matrix" values="([^"]+)"/);
            if (old) svg = svg.replace(old[0], `<feColorMatrix id="mlc" type="matrix" values="${elMxMul(elMx(vals), elMx(old[1]))}"`);
            else {
                const a = svg.indexOf('>', svg.indexOf('<svg')) + 1, z = svg.lastIndexOf('</svg>');
                svg = svg.slice(0, a) + `<filter id="mlcf" color-interpolation-filters="sRGB"><feColorMatrix id="mlc" type="matrix" values="${vals}"/></filter><g filter="url(#mlcf)">` + svg.slice(a, z) + '</g>' + svg.slice(z);
            }
            return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        }
        async function elEdit(el) {
            const K = elEditKind(el); if (!K) return;
            const img = K.img;
            if (K.k === 'tape') {                                                // 🎀 붙인 길이 그대로 미리 보기 → 색 행렬만 받아요
                const w = Math.max(40, Math.round(img.offsetWidth)), h = Math.max(10, Math.round(img.offsetHeight));
                const pv = K.src.replace(/width%3D%22100%25%22%20height%3D%22100%25%22/, `width%3D%22${w}%22%20height%3D%22${h}%22`);
                const vals = await openStickerEdit(pv, { tools: ['color'], matrix: true }); if (!vals || !el.isConnected) return;
                const out = elTapeTint(K.src, vals); img.dataset.src = out; img.src = out;
                if (typeof saveData === 'function') saveData(false);
                return;
            }
            const MAX = K.k === 'sticker' ? 600 : 1000, nw = img.naturalWidth, nh = img.naturalHeight, k = Math.min(1, MAX / Math.max(nw, nh));
            const out = await openStickerEdit(K.src, K.k === 'sticker' ? {} : { tools: EL_ED_PAPER, max: MAX }); if (!out || !el.isConnected) return;
            const im = new Image(); im.src = out; try { await im.decode(); } catch (e) { return; }
            const fw = im.naturalWidth / (nw * k), fh = im.naturalHeight / (nh * k);   // 다듬기 창은 긴 변 MAX 까지 줄여서 열어요
            const w0 = parseFloat(el.style.width) || el.offsetWidth, hs = parseFloat(el.style.height), h0 = hs || w0 * nh / nw;
            const w1 = Math.max(20, Math.round(w0 * fw)), h1 = hs ? Math.max(20, Math.round(h0 * fh)) : w1 * im.naturalHeight / im.naturalWidth;
            const x = Math.round((parseFloat(el.dataset.posX) || 0) + (w0 - w1) / 2), y = Math.round((parseFloat(el.dataset.posY) || 0) + (h0 - h1) / 2);
            el.dataset.posX = x; el.dataset.posY = y; el.style.width = w1 + 'px'; if (hs) el.style.height = h1 + 'px';
            el.style.transform = `translate(${x}px, ${y}px) scale(${el.dataset.scale || 1}) rotate(${el.dataset.rotation || 0}deg)`;
            if (K.k === 'note') el.dataset.tkSrc = out; else img.dataset.src = out;
            img.src = out;
            if (typeof saveData === 'function') saveData(false);
        }
        window.elEditable = elEditable; window.elEdit = elEdit;
        function deleteSelected() {
            if (selectedElement) { selectedElement.remove(); selectedElement = null; }
            updateTextPanel();
        }

        async function saveData(showAlert = false) {
            if (!isCoverOpen) return;
            const canvas = document.getElementById('canvasArea');
            const r1 = v => Math.round((parseFloat(v) || 0) * 10) / 10;
            const elementsData = [];

            canvas.querySelectorAll('.element-box').forEach(el => {
                const textarea = el.querySelector('textarea');
                const img = el.querySelector('img');
                const span = el.querySelector('span');
                let dollData = null;                                            // 👧 붙인 인형 (js/doll-room.js)
                if (el.dataset.doll) { try { dollData = JSON.parse(el.dataset.doll); } catch (e) { dollData = null; } }
                const item = {
                    t: dollData ? 'd' : (textarea ? 't' : (img ? 'i' : 's')),
                    c: dollData ? dollData : (textarea ? textarea.value : (img ? slimEnc(img.dataset.src || img.getAttribute('src')) : span.innerText)),
                    x: r1(el.dataset.posX), y: r1(el.dataset.posY)
                };
                const sc = Math.round((parseFloat(el.dataset.scale) || 1) * 1000) / 1000;
                if (sc !== 1) item.s = sc;
                const rot = r1(el.dataset.rotation);
                if (rot) item.r = rot;
                const w = parseFloat(el.style.width), h = parseFloat(el.style.height);
                if (w) item.w = Math.round(w);
                if (h) item.h = Math.round(h);
                item.z = parseInt(el.style.zIndex) || 1;
                item.bw = el.offsetWidth; item.bh = el.offsetHeight;
                if (img && el.dataset.float) item.fm = 1;
                if (img && el.dataset.cm) { try { item.cm = JSON.parse(el.dataset.cm); } catch (e) {} }   // 🪄 움직이는 캐릭터 : 칠한 곳 · 움직임 설정 (js/char-move.js)
                if (img && el.dataset.sh) { try { item.sh = JSON.parse(el.dataset.sh); } catch (e) {} }   // ✨ 셰이더 스티커 : 효과 이름 · GLSL 글자 · 속도 · 세기 (js/glrun.js)
                if (img && el.dataset.ts) item.ts = 1;                          // 🔤 글씨스티커 : 📷 사진 꾸미기 창이 안 떠요 (js/page.js getSelectedPhoto)                       // 📄 모조지스티커 : 옮길 때 떼지 않고 살짝 떠서 (아래 makeTransformable)
                if (img && el.dataset.frame) {                                  // 📷 사진 틀 (js/frame.js)
                    item.fr = el.dataset.frame;
                    if (el.dataset.caption) item.cp = el.dataset.caption;
                }
                if (textarea) {
                    if (el.dataset.paper) item.pp = el.dataset.paper;            // 📝 글상자 모양 (js/paper.js)
                    if (el.dataset.tk) { item.tk = el.dataset.tk; item.tb = slimEnc(el.dataset.tkSrc); }   // 🧻 떡메 메모 : 종류 + 그림 그대로 (js/leafpad.js)
                    const fid = fontIdOf(textarea.dataset.font);
                    if (fid !== 'sys') item.f = fid;
                    if ((textarea.dataset.color || DEFAULT_TEXT_COLOR) !== DEFAULT_TEXT_COLOR) item.k = textarea.dataset.color;
                    const fs = parseInt(textarea.dataset.size) || DEFAULT_TEXT_SIZE;
                    if (fs !== DEFAULT_TEXT_SIZE) item.fs = fs;
                    if (textarea.dataset.hl) item.hl = textarea.dataset.hl;      // ✏️ 📒 형광펜으로 칠한 메모 (js/draw.js mhl)
                    if (textarea.dataset.pn) item.pn = 1;                        // ✏️ 📒 색연필 느낌 글씨
                }
                elementsData.push(item);
            });

            const ps = getPageSize();
            const dayKey = getDateKey(currentDate);
            if (!drive.guest && !drive.loadedDays.has(dayKey)) {     // 아직 읽지 못한 날짜는 저장 금지 (빈 화면으로 덮어쓰기 방지)
                if (showAlert) showMsg('⏳ 이 날짜를 아직 드라이브에서 불러오는 중이에요.<br>잠시 후 다시 저장해 주세요.');
                return;
            }
            const day = { v: 3, pw: ps.w, ph: ps.h, i: elementsData };
            if (pageStamps.mo) day.mo = pageStamps.mo;                          // 😊 오늘의 기분 · ☀️ 날씨 도장 (js/stamp.js)
            if (pageStamps.we) day.we = pageStamps.we;
            if (typeof pageLeaf !== 'undefined' && pageLeaf !== 'line') { day.lf = pageLeaf; if (pageLeaf === 'my') day.lfi = pageLeafImg; }   // 📃 속지 (js/leafpad.js · 줄노트는 기본이라 저장 안 함)
            if (elementsData.length || day.mo || day.we || day.lf) store.setItem(dayKey, JSON.stringify(day));
            else store.removeItem(dayKey);   // 빈 페이지는 파일에 남기지 않음
            if (typeof searchTouch === 'function') searchTouch(dayKey);          // 🔍 검색 목록 고치기 (js/search.js)

            if (!showAlert) return;          // 자동 저장: 변경이 있으면 잠시 뒤 드라이브에 자동 업로드
            if (drive.guest || !drive.ready) {
                showMsg('⚠ 구글 드라이브에 연결되어 있지 않아 웹에 저장되지 않았어요.<br>왼쪽 아래 ☁ 표시를 눌러 로그인해 주세요.<br><span style="font-size:12px;color:#777;">사진으로 남기려면 💾 저장 → 🖼 내 기기에 사진(PNG)으로 저장을 눌러 주세요.</span>');
                return;
            }
            const ok = await flushUpload({ force: true });   // 파일이 없으면 생성, 있으면 덮어쓰기
            if (drive.local) { showMsg(ok ? '📁 ' + dvWhere() + '에 저장했어요!<br><span style="font-size:12px;color:#777;">' + dayPathText(currentDate) + '</span>' : '⚠ 폴더에 저장하지 못했어요.<br>잠시 후 자동으로 다시 시도합니다.'); return; }   // 📁 (js/devsave.js)
            showMsg(ok
                ? '☁ 구글 드라이브에 저장했어요!<br><span style="font-size:12px;color:#777;">' + dayPathText(currentDate) + '</span>'
                : '⚠ 구글 드라이브 저장에 실패했어요.<br>잠시 후 자동으로 다시 시도합니다.');
        }

        function createElementFromData(data, interactive) {
            const el = document.createElement('div');
            el.className = 'element-box';
            if (data.width) el.style.width = data.width;
            if (data.height) el.style.height = data.height;

            if (data.type === 'text') {
                const ta = document.createElement('textarea');
                ta.value = data.content || '';
                if (!interactive) ta.readOnly = true;
                styleTextarea(ta, data.fontFamily || SYSTEM_FONT, data.color, data.fontSize);   // 글씨체 기록이 없는 예전 메모 = 기기 기본 폰트 그대로
                el.appendChild(ta);
                if (data.paper && /^[a-z]{1,10}$/.test(data.paper)) { el.classList.add('pp-' + data.paper); el.dataset.paper = data.paper; }
                if (data.tk && data.tb && window.tkNoteDress) tkNoteDress(el, data.tk, data.tb);
                if (window.mhlLook) mhlLook(ta, data.hl, data.pn);             // ✏️ 📒 형광펜 띠 · 색연필 글씨 (js/draw.js)
            } else if (data.type === 'doll') {
                buildPlacedDoll(el, data.content, interactive);                // 👧 붙인 인형 (js/doll-room.js)
            } else if (data.type === 'image') {
                const img = document.createElement('img');
                bindImage(img, data.content);
                el.appendChild(img);
                if (data.float) el.dataset.float = 1;
                if (data.ts) el.dataset.ts = 1;
                if (data.cm && window.cmvDress) cmvDress(el, img, data.cm);    // 🪄 움직이는 캐릭터 (js/char-move.js) : 그림 위에 움직이는 캔버스를 겹쳐요
                else if (data.sh && window.glrDress) glrDress(el, img, data.sh); // ✨ 셰이더 스티커 (js/glrun.js) : 그림 위에 움직이는 캔버스를 겹쳐요
                if (data.frame && /^[a-z0-9]{1,10}$/.test(data.frame)) {
                    el.classList.add('fr-' + data.frame); el.dataset.frame = data.frame;
                    if (data.caption) el.dataset.caption = String(data.caption).slice(0, 40);
                }
            } else {
                const span = document.createElement('span');
                span.style.cssText = 'font-size:45px; display:inline-block;';
                span.textContent = data.content;
                el.appendChild(span);
            }

            if (interactive) makeTransformable(el);

            el.dataset.posX = data.posX || 0;
            el.dataset.posY = data.posY || 0;
            el.dataset.scale = data.scale || 1;
            el.dataset.rotation = data.rotation || 0;
            el.style.transform = `translate(${data.posX || 0}px, ${data.posY || 0}px) scale(${data.scale || 1}) rotate(${data.rotation || 0}deg)`;

            const z = parseInt(data.zIndex) || 1;
            el.style.zIndex = z;
            if (interactive) zIndexCounter = Math.max(zIndexCounter, z + 1);
            return el;
        }

        function setCanvasLoading(on) {
            const c = document.getElementById('canvasArea');
            c.style.pointerEvents = on ? 'none' : '';
            if (on) c.innerHTML = '<div style="padding:24px;text-align:center;color:var(--primary-accent);font-weight:bold;">☁ 불러오는 중…</div>';
        }

        function loadData() {
            liveSize = getPageSize();
            clearCanvas();
            pageStamps.mo = ''; pageStamps.we = '';
            if (typeof psRender === 'function') psRender();
            if (typeof setPageLeaf === 'function') setPageLeaf('line');
            const canvas = document.getElementById('canvasArea');
            const key = getDateKey(currentDate);
            /* 아직 드라이브에서 읽지 못한 날짜라면 읽어 온 뒤에 표시 (빈 화면으로 덮어쓰는 사고 방지) */
            if (!drive.guest && !drive.loadedDays.has(key)) {
                setCanvasLoading(true);
                ensureDayLoaded(currentDate).then(ok => {
                    if (getDateKey(currentDate) !== key) return;    // 그 사이 다른 날짜로 넘어감
                    if (ok) { loadData(); return; }
                    setCanvasLoading(false);
                    showMsg('⚠ 이 날짜의 일기를 불러오지 못했어요.<br><span style="font-size:12px;color:#777;">데이터 보호를 위해 이 날짜는 저장되지 않아요.<br>왼쪽 아래 ☁ 표시를 확인하거나 다른 날짜로 넘겼다가 다시 돌아와 주세요.</span>');
                });
                return;
            }
            setCanvasLoading(false);
            readDayData(currentDate).forEach(data => {
                canvas.appendChild(createElementFromData(data, true));
            });
            let raw = null; try { raw = JSON.parse(store.getItem(key)); } catch (e) {}
            pageStamps.mo = raw && raw.mo || ''; pageStamps.we = raw && raw.we || '';
            if (typeof psRender === 'function') psRender();
            if (typeof setPageLeaf === 'function') setPageLeaf(raw && raw.lf, raw && raw.lfi);  // 📃 그날 속지 (js/leafpad.js)
            if (typeof ddRefresh === 'function') ddRefresh();               // ⏳ 이 페이지 날짜 기준 D-day (js/dday.js)
        }
        const pageStamps = { mo: '', we: '' };            // 지금 페이지의 기분 · 날씨 도장

        /* ✍ 쓰거나 옮기고 손을 떼면 1.5초 뒤 화면 → 메모리 (그 3초 뒤 드라이브에 · js/drive.js)
           → 앱이 갑자기 꺼져도 잃는 게 적고, 다른 기기에도 금방 보여요
           - 바뀐 게 없으면 메모리 값이 같아서 드라이브에 올리지 않아요 · 아직 못 읽은 날짜는 saveData 가 저장하지 않아요 */
        let pageQuickTimer = 0;
        function pageQuickSave() {
            if (typeof isCoverOpen === 'undefined' || !isCoverOpen) return;
            clearTimeout(pageQuickTimer);
            pageQuickTimer = setTimeout(() => { try { if (isCoverOpen && !turn) saveData(false); } catch (e) { console.warn(e); } }, 1500);
        }
        ['input', 'change', 'pointerup', 'keyup'].forEach(t => document.addEventListener(t, pageQuickSave, true));

        function clearCanvas() { document.getElementById('canvasArea').innerHTML = ''; }


        /* =====================================================================
           💾 저장 버튼 : 어떤 저장을 할지 고르는 창
           - ☁ 웹에 저장      : 구글 드라이브에 저장 (다른 기기에서도 이어서 보기) → saveData(true)
           - 🖼 기기에 PNG 저장 : 지금 페이지를 사진 파일로 컴퓨터·폰에 내려받기 → exportToPNG()
           ===================================================================== */
        function openSaveChooser() {
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어주세요!'); return; }
            const web = document.getElementById('saveWebDesc');
            const L = !!drive.local, set = (id, t) => { const el = document.getElementById(id); if (el) el.textContent = t; };   // 📁 폴더(하드)로 쓰면 '폴더에 저장' (js/devsave.js)
            set('saveWebIcon', L ? '📁' : '☁');
            set('saveWebTitle', L ? '폴더에 저장 (이 기기)' : '웹에 저장 (구글 드라이브)');
            set('saveChooserNote', L ? '※ 일기는 쓰는 동안 몇 초마다 폴더에 자동 저장돼요.' : '※ 일기는 쓰는 동안 몇 초마다 웹에 자동 저장돼요.');
            if (web) web.textContent = L ? '이 기기 폴더에 저장해요. 기기를 바꿀 땐 ⚙ 설정 → 📦 백업 파일 받기.' : drive.ready && !drive.guest
                ? '내 구글 드라이브에 저장해요. 다른 기기에서 로그인해도 이어서 볼 수 있어요.'
                : '⚠ 지금은 로그인되어 있지 않아서 웹에 저장할 수 없어요.';
            openModal('saveChooser');
        }
        function chooseSave(kind) {
            closeModal('saveChooser');
            if (kind === 'web') saveData(true);
            if (kind === 'png') setTimeout(exportToPNG, 60);
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['elements'] = true;
