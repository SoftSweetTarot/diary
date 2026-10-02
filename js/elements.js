/* 말랑달콤 다이어리 - js/elements.js
   스티커/글/이미지 추가 · 라이브러리 · 요소 이동/회전/크기 · 페이지 내용 저장(saveData)/불러오기
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        function addSticker(emoji) {
            const el = document.createElement('div');
            el.className = 'element-box';
            el.innerHTML = `<span style="font-size:45px; display:inline-block;">${emoji}</span>`;
            makeTransformable(el);
            document.getElementById('canvasArea').appendChild(el);
            closeModal('stickerModal');
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
            document.getElementById('canvasArea').appendChild(el);
            selectElement(el);
        }

        function triggerImageUpload() { document.getElementById('imgInput').click(); }

        function toast(msg) {
            const t = document.getElementById('toast');
            t.textContent = msg; t.style.display = 'block';
            clearTimeout(t._t); t._t = setTimeout(() => { t.style.display = 'none'; }, 4000);
        }

        function resolveSrc(p) {
            return /^(https?:|data:|blob:)/i.test(p) ? p : p.split('/').map(encodeURIComponent).join('/');
        }

        function bindImage(img, src, fallback) {
            img.dataset.src = src;
            img.onerror = () => {
                if (fallback && img.src !== fallback) { img.src = fallback; toast('⚠ ' + src + ' 을(를) 못 찾았어요. images 폴더에 넣어 주세요.'); }
                else { img.classList.add('broken'); img.alt = '⚠ ' + src; }
            };
            img.src = resolveSrc(src);
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
            document.getElementById('canvasArea').appendChild(el);
            return true;
        }

        /* 🖼 이미지 : 어느 폴더의 이미지든 가져올 수 있도록 파일 내용 자체를 다이어리에 담아 저장 (data URL)
           - GIF(움직이는 이미지)·SVG는 원본 그대로 보관
           - 그 외 큰 사진은 저장 용량을 줄이려고 긴 변 IMG_MAX_SIDE px 이하로 줄여서 보관 (투명 배경 유지) */
        const IMG_MAX_SIDE = 1200;
        const IMG_KEEP_ORIGINAL_BYTES = 300 * 1024;   // 이보다 작고 크기도 작으면 원본 그대로

        function readFileAsDataURL(file) {
            return new Promise((resolve, reject) => {
                const fr = new FileReader();
                fr.onload = () => resolve(fr.result);
                fr.onerror = () => reject(fr.error);
                fr.readAsDataURL(file);
            });
        }

        function loadImageEl(src) {
            return new Promise((resolve, reject) => {
                const im = new Image();
                im.onload = () => resolve(im);
                im.onerror = reject;
                im.src = src;
            });
        }

        async function fileToDiaryImage(file) {
            const original = await readFileAsDataURL(file);
            const type = (file.type || '').toLowerCase();
            if (type === 'image/gif' || type === 'image/svg+xml') return original;     // 움직이는 GIF 등은 원본 유지
            let im;
            try { im = await loadImageEl(original); } catch (e) { return original; }
            const w = im.naturalWidth, h = im.naturalHeight;
            const scale = Math.min(1, IMG_MAX_SIDE / Math.max(w, h || 1));
            if (scale === 1 && file.size <= IMG_KEEP_ORIGINAL_BYTES) return original;
            const cv = document.createElement('canvas');
            cv.width = Math.max(1, Math.round(w * scale));
            cv.height = Math.max(1, Math.round(h * scale));
            cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
            let out = cv.toDataURL('image/webp', 0.85);
            if (!out.startsWith('data:image/webp')) out = cv.toDataURL(type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.85);
            return out.length < original.length ? out : original;
        }

        async function handleImageUpload(e) {
            const file = e.target.files[0];
            e.target.value = '';
            if (!file) return;
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어주세요!'); return; }
            if (file.type && !file.type.startsWith('image/')) { showMsg('이미지 파일만 가져올 수 있어요.'); return; }
            try {
                toast('🖼 이미지를 불러오는 중…');
                const src = await fileToDiaryImage(file);
                if (addImage(src)) {
                    toast('🖼 이미지를 넣었어요.');
                    saveData(false);
                }
            } catch (err) {
                console.error('이미지 불러오기 오류:', err);
                showMsg('이미지를 불러오지 못했어요.<br>다른 이미지로 다시 시도해 주세요.');
            }
        }

        /* 📚 라이브러리 : 라이브러리 시트(나만 보기)에 붙은 앱스크립트가 이미지 링크 목록을 보내 줘요
           서버 코드 : 라이브러리_앱스크립트.gs · 시트 맨 왼쪽 탭의 A열 = 이미지 링크 */
        const LIB_API_URL = 'https://script.google.com/macros/s/AKfycbzpe6ZEbSpety1CASpu6whbYRNp5JE5P_PBCL9_fkCTSBXlXMfKem4vBTeRGyUtE4p5uA/exec';                        // ← 라이브러리 앱스크립트 웹 앱 주소 (…/exec)
        let libItems = null, libLoading = false;

        function driveImageUrl(id) { return 'https://lh3.googleusercontent.com/d/' + id; }

        function normalizeImageUrl(raw) {
            const u = String(raw || '').trim();
            if (!/^https?:\/\//i.test(u)) return null;
            let m = u.match(/drive\.google\.com\/file\/d\/([\w-]{10,})/);
            if (!m && /drive\.google\.com|docs\.google\.com/.test(u)) m = u.match(/[?&]id=([\w-]{10,})/);
            return m ? driveImageUrl(m[1]) : u;
        }

        async function fetchLibraryList() {
            if (!LIB_API_URL) throw new Error('setup');
            const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), 15000);
            try {
                const res = await fetch(LIB_API_URL, { signal: ctl.signal });
                const data = await res.json();
                if (!data || !data.ok || !Array.isArray(data.images)) throw new Error('server');
                return data.images;
            } finally { clearTimeout(timer); }
        }

        /* ---------- 📚 라이브러리 페이지 넘기기 · 배치 설정 ----------
           - 한 페이지에 (몇 줄 × 한 줄에 몇 개)개씩 보여 주고, ◀ 이전 / 다음 ▶ 버튼(또는 옆으로 밀기)으로 넘김
           - 배치 설정(한 줄에 몇 개·몇 줄·크기)은 기기마다 화면 크기가 달라서 이 기기(localStorage)에만 기억
             → 구글 드라이브 저장(일기·settings.json)에는 전혀 영향 없음 */
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
        function libPageCount() { return libItems && libItems.length ? Math.ceil(libItems.length / libPerPage()) : 0; }

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
            const firstIndex = libPage * libPerPage();
            libLayout = next;
            libPage = Math.floor(firstIndex / libPerPage());
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

        /* ☕ 라이브러리 목록 미리 받아 두기 : 다이어리를 열고 잠시 뒤 조용히 받아 둬요 → 📚 그림모음을 누르면 바로 보여요 */
        window.addEventListener('load', () => setTimeout(() => { if (!libItems && !libLoading) loadLibrary(false); }, 2500));

        function openLibrary() { applyLibLayoutStyle(); updateLibPager(); openModal('libraryModal'); loadLibrary(false); }

        async function loadLibrary(force) {
            const st = document.getElementById('libStatus'), grid = document.getElementById('libGrid');
            if (libItems && !force) { renderLibrary(); return; }
            if (libLoading) return;
            libLoading = true;
            st.textContent = '⏳ 이미지 목록을 불러오는 중...';
            grid.innerHTML = '';
            try {
                const cells = await fetchLibraryList();
                libItems = [];
                cells.forEach(c => { const u = normalizeImageUrl(c); if (u && !libItems.includes(u)) libItems.push(u); });
                libPage = 0;
                renderLibrary();
            } catch (err) {
                libItems = null;
                updateLibPager();
                st.innerHTML = err && err.message === 'setup' ? '📚 그림모음을 준비하고 있어요. 조금만 기다려 주세요!'
                    : '⚠ 이미지 목록을 불러오지 못했어요.<br>인터넷 연결을 확인한 뒤 다시 열어 주세요.';
            }
            libLoading = false;
        }

        function renderLibrary() {
            const st = document.getElementById('libStatus'), grid = document.getElementById('libGrid');
            grid.innerHTML = '';
            applyLibLayoutStyle();
            if (!libItems.length) { st.textContent = '시트 A열에 이미지 주소가 없어요.'; updateLibPager(); return; }
            const per = libPerPage(), pages = libPageCount();
            libPage = Math.max(0, Math.min(pages - 1, libPage));
            st.textContent = `이미지 ${libItems.length}개 · 누르면 페이지에 들어가요`;
            const start = libPage * per;
            const thumbW = libLayout.size > 120 ? 400 : 240;                    // 크게 볼 때는 조금 더 선명한 썸네일
            const frag = document.createDocumentFragment();
            libItems.slice(start, start + per).forEach((url, j) => {
                const i = start + j;
                const item = document.createElement('div');
                item.className = 'lib-item';
                item.innerHTML = `<span class="lib-num">${i + 1}</span>`;
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.src = url.includes('lh3.googleusercontent.com/d/') ? url + '=w' + thumbW : url;
                img.onerror = () => item.classList.add('bad');
                item.appendChild(img);
                item.onclick = () => { if (libSwiped) return; if (addImage(url)) closeModal('libraryModal'); };
                frag.appendChild(item);
            });
            /* 마지막 페이지가 덜 차도 창 크기가 흔들리지 않도록 빈칸 채우기 */
            for (let k = libItems.length - start; k < per && pages > 1; k++) {
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

            const rotateHandle = document.createElement('div');
            rotateHandle.className = 'handle rotate-handle';
            rotateHandle.innerHTML = '🔄';
            el.appendChild(rotateHandle);

            const scaleHandle = document.createElement('div');
            scaleHandle.className = 'handle scale-handle';
            scaleHandle.innerHTML = '↘';
            el.appendChild(scaleHandle);

            /* 🎀 마스킹테이프 (js/tape.js) : ↔ 손잡이로 길이만 늘이고 줄이기 */
            let stretchHandle = null, initialW = 0;
            const tapeImg = el.querySelector('img');
            if (tapeImg && typeof isTapeSrc === 'function' && isTapeSrc(tapeImg.dataset.src)) {
                stretchHandle = document.createElement('div');
                stretchHandle.className = 'handle stretch-handle';
                stretchHandle.innerHTML = '↔';
                el.appendChild(stretchHandle);
            }

            function updateTransform() {
                el.style.transform = `translate(${posX}px, ${posY}px) scale(${scale}) rotate(${rotation}deg)`;
            }
            
            el.dataset.posX = posX; el.dataset.posY = posY;
            el.dataset.scale = scale; el.dataset.rotation = rotation;
            updateTransform();

            let actionType = null;
            let startX, startY, startDist, startAngle, initialScale, initialX, initialY;

            function getClientPos(e) {
                if (e.touches && e.touches.length > 0) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
                return { x: e.clientX, y: e.clientY };
            }

            const onStart = (e) => {
                selectElement(el);
                const pos = getClientPos(e);
                startX = pos.x; startY = pos.y;
                posX = parseFloat(el.dataset.posX) || 0;
                posY = parseFloat(el.dataset.posY) || 0;
                scale = parseFloat(el.dataset.scale) || 1;
                rotation = parseFloat(el.dataset.rotation) || 0;

                if (e.target === rotateHandle) {
                    actionType = 'rotate';
                    const rect = el.getBoundingClientRect();
                    startAngle = Math.atan2(pos.y - (rect.top + rect.height / 2), pos.x - (rect.left + rect.width / 2)) * (180 / Math.PI) - rotation;
                } else if (e.target === scaleHandle) {
                    actionType = 'scale';
                    const rect = el.getBoundingClientRect();
                    startDist = Math.hypot(pos.x - (rect.left + rect.width / 2), pos.y - (rect.top + rect.height / 2));
                    initialScale = scale;
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
                const pos = getClientPos(e);

                if (actionType === 'move') {
                    posX = initialX + (pos.x - startX);
                    posY = initialY + (pos.y - startY);
                    el.dataset.posX = posX; el.dataset.posY = posY;
                } else if (actionType === 'rotate') {
                    const rect = el.getBoundingClientRect();
                    const currentAngle = Math.atan2(pos.y - (rect.top + rect.height / 2), pos.x - (rect.left + rect.width / 2)) * (180 / Math.PI);
                    rotation = currentAngle - startAngle;
                    el.dataset.rotation = rotation;
                } else if (actionType === 'stretch') {
                    const a = rotation * Math.PI / 180;
                    const d = ((pos.x - startX) * Math.cos(a) + (pos.y - startY) * Math.sin(a)) / (scale || 1);
                    el.style.width = Math.round(Math.max(40, Math.min(1200, initialW + d))) + 'px';
                } else if (actionType === 'scale') {
                    const rect = el.getBoundingClientRect();
                    const currentDist = Math.hypot(pos.x - (rect.left + rect.width / 2), pos.y - (rect.top + rect.height / 2));
                    if (startDist > 0) {
                        scale = Math.max(0.2, initialScale * (currentDist / startDist));
                        el.dataset.scale = scale;
                    }
                }
                updateTransform();
                if (el === selectedElement) positionTextPanel();
            };

            const onEnd = () => { actionType = null; };

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
        }

        function selectElement(el) {
            if (selectedElement !== el) panelOffset = null;
            if (selectedElement) selectedElement.classList.remove('selected');
            selectedElement = el;
            selectedElement.classList.add('selected');
            updateTextPanel();
        }

        document.getElementById('canvasArea').addEventListener('click', (e) => {
            if (e.target.id === 'canvasArea') {
                if (selectedElement) selectedElement.classList.remove('selected');
                selectedElement = null;
                updateTextPanel();
            }
        });

        function bringToFront() { if (selectedElement) selectedElement.style.zIndex = ++zIndexCounter; }
        function sendToBack() { if (selectedElement) selectedElement.style.zIndex = 1; }
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
                    c: dollData ? dollData : (textarea ? textarea.value : (img ? (img.dataset.src || img.getAttribute('src')) : span.innerText)),
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
                if (img && el.dataset.frame) {                                  // 📷 사진 틀 (js/frame.js)
                    item.fr = el.dataset.frame;
                    if (el.dataset.caption) item.cp = el.dataset.caption;
                }
                if (textarea) {
                    if (el.dataset.paper) item.pp = el.dataset.paper;            // 📝 글상자 모양 (js/paper.js)
                    const fid = fontIdOf(textarea.dataset.font);
                    if (fid !== 'sys') item.f = fid;
                    if ((textarea.dataset.color || DEFAULT_TEXT_COLOR) !== DEFAULT_TEXT_COLOR) item.k = textarea.dataset.color;
                    const fs = parseInt(textarea.dataset.size) || DEFAULT_TEXT_SIZE;
                    if (fs !== DEFAULT_TEXT_SIZE) item.fs = fs;
                }
                elementsData.push(item);
            });

            const ps = getPageSize();
            const dayKey = getDateKey(currentDate);
            if (!drive.guest && !drive.loadedDays.has(dayKey)) {     // 아직 읽지 못한 날짜는 저장 금지 (빈 화면으로 덮어쓰기 방지)
                if (showAlert) showMsg('⏳ 이 날짜를 아직 드라이브에서 불러오는 중이에요.<br>잠시 후 다시 저장해 주세요.');
                return;
            }
            if (elementsData.length) store.setItem(dayKey, JSON.stringify({ v: 3, pw: ps.w, ph: ps.h, i: elementsData }));
            else store.removeItem(dayKey);   // 빈 페이지는 파일에 남기지 않음

            if (!showAlert) return;          // 자동 저장: 변경이 있으면 잠시 뒤 드라이브에 자동 업로드
            if (drive.guest || !drive.ready) {
                showMsg('⚠ 구글 드라이브에 연결되어 있지 않아 웹에 저장되지 않았어요.<br>왼쪽 아래 ☁ 표시를 눌러 로그인해 주세요.<br><span style="font-size:12px;color:#777;">사진으로 남기려면 💾 저장 → 🖼 내 기기에 사진(PNG)으로 저장을 눌러 주세요.</span>');
                return;
            }
            const ok = await flushUpload({ force: true });   // 파일이 없으면 생성, 있으면 덮어쓰기
            showMsg(ok
                ? '☁ 웹(구글 드라이브)에 저장했어요!<br><span style="font-size:12px;color:#777;">' + dayPathText(currentDate) + '</span>'
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
                styleTextarea(ta, data.fontFamily, data.color, data.fontSize);
                el.appendChild(ta);
                if (data.paper && /^[a-z]{1,10}$/.test(data.paper)) { el.classList.add('pp-' + data.paper); el.dataset.paper = data.paper; }
            } else if (data.type === 'doll') {
                buildPlacedDoll(el, data.content, interactive);                // 👧 붙인 인형 (js/doll-room.js)
            } else if (data.type === 'image') {
                const img = document.createElement('img');
                bindImage(img, data.content);
                el.appendChild(img);
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
        }

        function clearCanvas() { document.getElementById('canvasArea').innerHTML = ''; }


        /* =====================================================================
           💾 저장 버튼 : 어떤 저장을 할지 고르는 창
           - ☁ 웹에 저장      : 구글 드라이브에 저장 (다른 기기에서도 이어서 보기) → saveData(true)
           - 🖼 기기에 PNG 저장 : 지금 페이지를 사진 파일로 컴퓨터·폰에 내려받기 → exportToPNG()
           ===================================================================== */
        function openSaveChooser() {
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어주세요!'); return; }
            const web = document.getElementById('saveWebDesc');
            if (web) web.textContent = drive.ready && !drive.guest
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
