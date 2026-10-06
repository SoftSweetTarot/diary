/* 말랑달콤 다이어리 - js/tapmenu.js
   📍 빈 곳을 누르면 그 자리에 추가 메뉴(🎨 스티커 · ✏ 글쓰기 · 🖍️ 펜 · 🖼 이미지 · 📚 그림모음 · 💾 저장)가 한 줄로 나와요.
   - 고른 것이 있으면(빨간 점선) 첫 번째 터치는 '선택 해제'만 (elements.js 의 canvasArea click 에서 불러요)
   - 메뉴에서 고른 것은 눌렀던 자리 근처에 놓여요 (tmPlace)
   📌 페이지에 놓은 그림 · 글을 폰 · 아이패드에서 꾹 누르면(0.5초) / 마우스로 오른쪽 클릭하면 ↕️ 순서 · 🗑️ 삭제 메뉴가 나와요 (tmOpenElem) */
        const TM_ITEMS = [
            { icon: '🎨', label: '스티커', nw: 'tape,caps', run: () => openModal('stickerModal') },
            { icon: '✏', label: '글쓰기', run: () => addText() },
            { icon: '🖍️', label: '펜', run: () => { tmAnchor = null; window.openDraw ? openDraw() : comingSoon('🖍️ 펜'); } },
            { icon: '🖼', label: '이미지', run: () => triggerImageUpload() },
            { icon: '📚', label: '그림모음', run: () => openLibrary() },
            { icon: '💾', label: '저장', run: () => { tmAnchor = null; openSaveChooser(); } }
        ];
        const TM_ANCHOR_MS = 120000;
        const TM_AUTO_CLOSE_MS = 3000;   // 메뉴가 나온 뒤 저절로 닫히는 시간
        const TM_ELEM_CLOSE_MS = 6000;   // 순서 · 삭제 메뉴는 조금 더 오래
        const TM_HOLD_MS = 500;          // 꾹 누르기 시간
        const TM_HOLD_MOVE = 10;         // 이만큼(px) 움직이면 꾹 누르기 취소 (끌어서 옮기는 중이니까요)
        let tmEl = null, tmAnchor = null, tmTimer = 0, tmAt = 0;

        function tmClose() { clearTimeout(tmTimer); if (tmEl) { tmEl.remove(); tmEl = null; } }

        /* 메뉴 그리기 · pos = { x, y, above } · above 면 손가락 위쪽에 (손가락이 가리지 않게) */
        function tmShow(items, pos, closeMs, cls) {
            tmClose();
            const m = document.createElement('div');
            m.className = 'tap-menu' + (cls ? ' ' + cls : '');
            items.forEach(it => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'tap-menu-btn';
                b.innerHTML = `<span>${it.icon}</span>${it.label}`;
                if (it.nw) { b.dataset.nwAny = it.nw; if (window.nwOn && it.nw.split(',').some(nwOn)) b.classList.add('nw-on'); }
                b.onclick = (ev) => {
                    ev.stopPropagation();
                    if (Date.now() - tmAt < 450) return;            // 꾹 누르고 뗄 때 딸려 오는 클릭 막기
                    const rect = b.getBoundingClientRect();
                    tmClose(); it.run(rect);
                };
                m.appendChild(b);
            });
            document.body.appendChild(m);
            const w = m.offsetWidth, h = m.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
            let x, y;
            if (pos.above) {
                x = Math.min(Math.max(6, pos.x - w / 2), vw - w - 6);
                y = pos.y - h - 28; if (y < 6) y = Math.min(pos.y + 28, vh - h - 6);
            } else {                /* 누른 곳이 메뉴의 한가운데(피봇) · 화면 밖으로 나가면 안쪽으로 밀기 */
                x = Math.min(Math.max(6, pos.x - w / 2), vw - w - 6);
                y = Math.min(Math.max(6, pos.y - h / 2), vh - h - 6);
            }
            y = Math.max(6, y);
            m.style.left = x + 'px';
            m.style.top = y + 'px';
            m.style.transformOrigin = (pos.x - x) + 'px ' + (pos.y - y) + 'px';
            tmEl = m; tmAt = Date.now();
            tmTimer = setTimeout(tmClose, closeMs || TM_AUTO_CLOSE_MS);
        }

        function tmOpen(e) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) return;
            if (typeof dw !== 'undefined' && dw.on) return;
            const canvas = document.getElementById('canvasArea'), r = canvas.getBoundingClientRect();
            const k = r.width / (canvas.offsetWidth || r.width) || 1;
            tmAnchor = { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, t: Date.now() };
            tmShow(TM_ITEMS, { x: e.clientX, y: e.clientY });
        }

        /* 📌 놓아 둔 그림 · 글 위에서 나오는 메뉴 : ↕️ 순서 · 🗑️ 삭제 */
        function tmOpenElem(el, x, y, byTouch) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) return;
            if (typeof dw !== 'undefined' && dw.on) return;
            if (!el || !el.isConnected) return;
            tmAnchor = null;
            selectElement(el);
            tmShow([
                { icon: '↕️', label: '순서', run: (rect) => { selectElement(el); openLayerMenu(rect); } },
                { icon: '🗑️', label: '삭제', run: () => { selectElement(el); deleteSelected(); } }
            ], { x, y, above: !!byTouch }, TM_ELEM_CLOSE_MS, 'elem');
        }

        /* 메뉴에서 고른 걸 눌렀던 자리에 놓기 (스티커 · 글 · 이미지를 넣는 함수가 불러요) */
        function tmPlace(el) {
            const a = tmAnchor; tmAnchor = null;
            if (!a || Date.now() - a.t > TM_ANCHOR_MS) return;
            const x = Math.round(a.x - 24), y = Math.round(a.y - 24);
            el.dataset.posX = x; el.dataset.posY = y;
            el.style.transform = `translate(${x}px, ${y}px) scale(1) rotate(0deg)`;
        }

        /* 위 도구 줄을 직접 누르면 예전 자리는 잊기 · 메뉴 바깥을 누르거나 스크롤 · 키 입력 · 창 크기 변경이면 닫기 */
        document.querySelector('.toolbar').addEventListener('click', () => { tmAnchor = null; tmClose(); }, true);
        document.addEventListener('pointerdown', (e) => { if (tmEl && !tmEl.contains(e.target)) tmClose(); }, true);
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') tmClose(); });
        window.addEventListener('resize', tmClose);
        window.addEventListener('scroll', tmClose, true);

        /* 🖱️ 마우스 : 놓아 둔 것 위에서 오른쪽 클릭 → 순서 · 삭제
           (글상자 안에서 글자를 골라 둔 채면 원래의 복사 · 붙여넣기 메뉴를 그대로 둬요) */
        let tmTouchAt = 0, tmHold = 0, tmHoldPos = null;
        document.addEventListener('contextmenu', (e) => {
            const box = e.target.closest && e.target.closest('#canvasArea > .element-box');
            if (!box) return;
            e.preventDefault();                                        // 꾹 누르기로 나온 기본 메뉴도 여기서 막아요
            if (Date.now() - tmTouchAt < 1500) return;                 // 손가락이면 아래 꾹 누르기가 맡아요
            const ta = e.target.tagName === 'TEXTAREA' ? e.target : null;
            if (ta && ta.selectionStart !== ta.selectionEnd) return;
            tmOpenElem(box, e.clientX, e.clientY, false);
        }, true);

        /* 👆 폰 · 아이패드 : 놓아 둔 것을 0.5초 꾹 누르기 */
        function tmHoldCancel() { clearTimeout(tmHold); tmHold = 0; tmHoldPos = null; }
        document.addEventListener('touchstart', (e) => {
            tmTouchAt = Date.now();
            tmHoldCancel();
            if (e.touches.length !== 1) return;
            const t = e.touches[0], box = e.target.closest && e.target.closest('#canvasArea > .element-box');
            if (!box || e.target.closest('.rot-zone, .handle')) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) return;
            if (typeof dw !== 'undefined' && dw.on) return;
            const ta = box.querySelector('textarea');
            if (ta && document.activeElement === ta) return;           // 글을 쓰는 중이면 기본 동작 (커서 · 글자 고르기)
            tmHoldPos = { x: t.clientX, y: t.clientY };
            tmHold = setTimeout(() => {
                const p = tmHoldPos; tmHold = 0; tmHoldPos = null;
                if (!p || !box.isConnected) return;
                if (document.activeElement && document.activeElement.tagName === 'TEXTAREA') document.activeElement.blur();
                tmOpenElem(box, p.x, p.y, true);
            }, TM_HOLD_MS);
        }, { capture: true, passive: true });
        document.addEventListener('touchmove', (e) => {
            tmTouchAt = Date.now();
            if (!tmHoldPos) return;
            const t = e.touches[0];
            if (e.touches.length > 1 || !t || Math.hypot(t.clientX - tmHoldPos.x, t.clientY - tmHoldPos.y) > TM_HOLD_MOVE) tmHoldCancel();
        }, { capture: true, passive: true });
        ['touchend', 'touchcancel'].forEach(t => document.addEventListener(t, () => { tmTouchAt = Date.now(); tmHoldCancel(); }, { capture: true, passive: true }));
