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

        const LIB_SHEET_ID = '17QoBogfBhJreypfQ8fm0Lk3Qs8H3ghAqC68bmUSmgpI';
        let libItems = null, libLoading = false;

        function driveImageUrl(id) { return 'https://lh3.googleusercontent.com/d/' + id; }

        function normalizeImageUrl(raw) {
            const u = String(raw || '').trim();
            if (!/^https?:\/\//i.test(u)) return null;
            let m = u.match(/drive\.google\.com\/file\/d\/([\w-]{10,})/);
            if (!m && /drive\.google\.com|docs\.google\.com/.test(u)) m = u.match(/[?&]id=([\w-]{10,})/);
            return m ? driveImageUrl(m[1]) : u;
        }

        async function fetchSheetCsv() {
            const res = await fetch(`https://docs.google.com/spreadsheets/d/${LIB_SHEET_ID}/gviz/tq?headers=0&tqx=out:csv`);
            const txt = await res.text();
            if (!res.ok || /^\s*</.test(txt)) throw new Error('csv');
            const first = l => { const m = l.match(/^"((?:[^"]|"")*)"/); return m ? m[1].replace(/""/g, '"') : l.split(',')[0]; };
            return txt.split(/\r?\n/).map(first);
        }

        function fetchSheetJsonp() {
            return new Promise((resolve, reject) => {
                const cb = '__libcb' + Date.now();
                const s = document.createElement('script');
                const done = () => { clearTimeout(timer); delete window[cb]; s.remove(); };
                const timer = setTimeout(() => { done(); reject(new Error('timeout')); }, 10000);
                window[cb] = (json) => {
                    done();
                    if (!json || json.status !== 'ok') return reject(new Error('status'));
                    resolve(json.table.rows.map(r => r.c && r.c[0] ? r.c[0].v : ''));
                };
                s.onerror = () => { done(); reject(new Error('load')); };
                s.src = `https://docs.google.com/spreadsheets/d/${LIB_SHEET_ID}/gviz/tq?headers=0&tqx=out:json;responseHandler:${cb}`;
                document.head.appendChild(s);
            });
        }

        function openLibrary() { openModal('libraryModal'); loadLibrary(false); }

        async function loadLibrary(force) {
            const st = document.getElementById('libStatus'), grid = document.getElementById('libGrid');
            if (libItems && !force) { renderLibrary(); return; }
            if (libLoading) return;
            libLoading = true;
            st.textContent = '⏳ 시트에서 이미지 주소를 불러오는 중...';
            grid.innerHTML = '';
            try {
                let cells;
                try { cells = await fetchSheetCsv(); } catch (e) { cells = await fetchSheetJsonp(); }
                libItems = [];
                cells.forEach(c => { const u = normalizeImageUrl(c); if (u && !libItems.includes(u)) libItems.push(u); });
                renderLibrary();
            } catch (err) {
                libItems = null;
                st.innerHTML = '⚠ 시트를 불러오지 못했어요.<br>인터넷 연결 및 시트 접근 설정을 확인 후 다시 시도해 주세요.';
            }
            libLoading = false;
        }

        function renderLibrary() {
            const st = document.getElementById('libStatus'), grid = document.getElementById('libGrid');
            grid.innerHTML = '';
            if (!libItems.length) { st.textContent = '시트 A열에 이미지 주소가 없어요.'; return; }
            st.textContent = `이미지 ${libItems.length}개 · 누르면 페이지에 들어가요`;
            const frag = document.createDocumentFragment();
            libItems.forEach((url, i) => {
                const item = document.createElement('div');
                item.className = 'lib-item';
                item.innerHTML = `<span class="lib-num">${i + 1}</span>`;
                const img = document.createElement('img');
                img.loading = 'lazy';
                img.src = url.includes('lh3.googleusercontent.com/d/') ? url + '=w240' : url;
                img.onerror = () => item.classList.add('bad');
                item.appendChild(img);
                item.onclick = () => { if (addImage(url)) closeModal('libraryModal'); };
                frag.appendChild(item);
            });
            grid.appendChild(frag);
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
                const item = {
                    t: textarea ? 't' : (img ? 'i' : 's'),
                    c: textarea ? textarea.value : (img ? (img.dataset.src || img.getAttribute('src')) : span.innerText),
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
                if (textarea) {
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
                showMsg('⚠ 구글 드라이브에 연결되어 있지 않아 저장되지 않았어요.<br>왼쪽 아래 ☁ 표시를 눌러 로그인해 주세요.');
                return;
            }
            const ok = await flushUpload({ force: true });   // 파일이 없으면 생성, 있으면 덮어쓰기
            showMsg(ok
                ? '💾 저장이 완료되었습니다!<br><span style="font-size:12px;color:#777;">☁ 구글 드라이브 · ' + dayPathText(currentDate) + '</span>'
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
            } else if (data.type === 'image') {
                const img = document.createElement('img');
                bindImage(img, data.content);
                el.appendChild(img);
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


/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['elements'] = true;
