/* 말랑달콤 다이어리 - js/tapmenu.js
   📍 빈 곳을 누르면 그 자리에 추가 메뉴(🎨 스티커 · ✏ 메모 · 🖍️ 필통 · 🖼 이미지 · 📚 그림모음 · 💾 저장)가 한 줄로 나와요.
   - 고른 것이 있으면(빨간 점선) 첫 번째 터치는 '선택 해제'만 (elements.js 의 canvasArea click 에서 불러요)
   - 메뉴에서 고른 것은 눌렀던 자리 근처에 놓여요 (tmPlace)
   📌 페이지에 놓은 그림 · 글을 폰 · 아이패드에서 꾹 누르면(0.5초) / 마우스로 오른쪽 클릭하면 ↕️ 순서 · 🗑️ 삭제 메뉴가 나와요 (tmOpenElem) */
        /* 🎨 서브메뉴 아이콘 : 하단 메뉴(스티커 · 스킨 · 카페 · 설정)와 같은 말랑한 단색 면 스타일 */
        const TM_SVG = (b) => `<svg viewBox="0 0 24 24" aria-hidden="true">${b}</svg>`;
        const TM_ICONS = {
            sticker: TM_SVG('<circle cx="12" cy="12" r="9.2" fill="#ee7f9f"/><path d="M21 14c-2.8.2-5.6 2.8-6 6 3-.5 5.4-3 6-6z" fill="#fbc3d2"/><circle cx="8.7" cy="10.2" r="1.4" fill="#fff"/><circle cx="15.3" cy="10.2" r="1.4" fill="#fff"/><path d="M8.4 13.8c1 1.9 2.4 2.7 3.6 2.7s2.6-.8 3.6-2.7" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'),
            write: TM_SVG('<g transform="rotate(45 12 12)"><rect x="9.2" y="2.5" width="5.6" height="4" rx="1.2" fill="#ee7f9f"/><rect x="9.2" y="6.5" width="5.6" height="10" fill="#f2a12a"/><rect x="11.1" y="6.5" width="1.8" height="10" fill="#fff" opacity=".45"/><path d="M9.2 16.5h5.6L12 21.5z" fill="#ffe0b0"/><path d="M11 19.3h2L12 21.5z" fill="#8a5a3a"/></g>'),
            pen: TM_SVG('<g transform="rotate(45 12 12)"><rect x="9.4" y="2.5" width="5.2" height="9" rx="1.4" fill="#6c9be8"/><rect x="9" y="11" width="6" height="2" rx=".8" fill="#3f6fc4"/><path d="M9.8 13h4.4l-1.3 5.6L12 21l-.9-2.4z" fill="#f6c445"/><path d="M12 15.2v3" stroke="#8a5a3a" stroke-width="1" stroke-linecap="round"/></g>'),
            image: TM_SVG('<rect x="2.8" y="4.5" width="18.4" height="15" rx="3" fill="#4fa860"/><circle cx="16.5" cy="9.5" r="2" fill="#fff3b0"/><path d="M4 18.8l4.8-5.8 3.7 4.2 2.4-2.6 4.9 4.2z" fill="#d6f2cc"/>'),
            lib: TM_SVG('<rect x="3.2" y="3.2" width="13.4" height="13.4" rx="3.2" fill="#cdbcf2"/><rect x="7.4" y="7.4" width="13.4" height="13.4" rx="3.2" fill="#8e6fd6"/><path d="M14.1 18.4l-3-2.9a1.9 1.9 0 0 1 3-2.3 1.9 1.9 0 0 1 3 2.3z" fill="#fff"/>'),
            save: TM_SVG('<path d="M4 6a2.5 2.5 0 0 1 2.5-2.5H17l3.5 3.5v10.5A2.5 2.5 0 0 1 18 20H6.5A2.5 2.5 0 0 1 4 17.5z" fill="#5b8fe0"/><rect x="7.5" y="3.5" width="8" height="5" rx="1" fill="#fff"/><rect x="12.4" y="4.6" width="1.9" height="2.8" rx=".5" fill="#5b8fe0"/><rect x="7" y="12.5" width="10" height="7.5" rx="1.5" fill="#dbe8fc"/>'),
            order: TM_SVG('<path d="M3.5 16.6L12 20.8l8.5-4.2" fill="none" stroke="#cdbcf2" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 12.2L12 16.4l8.5-4.2" fill="none" stroke="#b39ae8" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 3l9 4.6-9 4.6-9-4.6z" fill="#8e6fd6"/>'),
            trash: TM_SVG('<path d="M9.5 5.2V4a1.2 1.2 0 0 1 1.2-1.2h2.6A1.2 1.2 0 0 1 14.5 4v1.2" fill="none" stroke="#d9577a" stroke-width="1.8"/><path d="M6 9h12l-.9 10a2 2 0 0 1-2 1.8H8.9a2 2 0 0 1-2-1.8z" fill="#ee7f9f"/><rect x="4.5" y="5.2" width="15" height="2.8" rx="1.4" fill="#d9577a"/><path d="M10 11.5v6M14 11.5v6" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>')
        };
        const TM_ITEMS = [
            { key: 'p_sticker', icon: TM_ICONS.sticker, label: '스티커', nw: 'tape,caps', run: () => openModal('stickerModal') },
            { key: 'p_write', icon: TM_ICONS.write, label: '메모', run: () => addText() },
            { key: 'p_pen', icon: TM_ICONS.pen, label: '필통', run: () => { tmAnchor = null; window.openDraw ? openDraw() : comingSoon('🖍️ 필통'); } },
            { key: 'p_image', icon: TM_ICONS.image, label: '이미지', run: () => triggerImageUpload() },
            { key: 'p_lib', icon: TM_ICONS.lib, label: '그림모음', run: () => openLibrary() },
            { key: 'p_save', icon: TM_ICONS.save, label: '저장', run: () => { tmAnchor = null; openSaveChooser(); } }
        ];
        const TM_ANCHOR_MS = 120000;
        /* ⏲ 자동으로 사라지는 시간 (설정에서 정해요) : 팝업메뉴가 닫히는 시간 = 그림 선택이 풀리는 시간 (한 값으로 통일)
           저장: 'diary_clear_sec'(settings.json) · 게스트는 이 기기 'malang_clear_sec' */
        const CLR_KEY = 'diary_clear_sec', CLR_LOCAL = 'malang_clear_sec', CLR_DEF = 3, CLR_MIN = 1, CLR_MAX = 15;
        function clearSec() {
            let v = null;
            try { v = (typeof drive !== 'undefined' && drive.ready && !drive.guest) ? store.getItem(CLR_KEY) : localStorage.getItem(CLR_LOCAL); } catch (e) {}
            let n = NaN; try { n = Number(JSON.parse(v)); } catch (e) {}
            return isFinite(n) && n >= CLR_MIN ? Math.min(CLR_MAX, n) : CLR_DEF;
        }
        function clearSecSet(n) {
            n = Math.max(CLR_MIN, Math.min(CLR_MAX, Math.round(Number(n)) || CLR_DEF));
            const t = JSON.stringify(n);
            try { if (typeof drive !== 'undefined' && drive.ready && !drive.guest) store.setItem(CLR_KEY, t); } catch (e) {}
            try { localStorage.setItem(CLR_LOCAL, t); } catch (e) {}
            const b = document.getElementById('clearSecVal'); if (b) b.textContent = n + '초';
        }
        function clearSecRender() {
            const r = document.getElementById('clearSecRange'); if (!r) return;
            const n = clearSec(); r.min = CLR_MIN; r.max = CLR_MAX; r.value = n;
            const b = document.getElementById('clearSecVal'); if (b) b.textContent = n + '초';
        }
        window.clearSec = clearSec; window.clearSecSet = clearSecSet; window.clearSecRender = clearSecRender;
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
                b.innerHTML = `<i class="tm-ic">${(window.stuIcon && it.key && stuIcon(it.key)) || it.icon}</i><span>${it.label}</span>`;   // 🎀 페이지에서 바꾼 아이콘이 있으면 그것으로
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
            if (window.stuMount) stuMount('pop', m);        // 🎀 페이지에서 놓은 팝업메뉴 꾸밈
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
            tmTimer = setTimeout(tmClose, clearSec() * 1000);
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
                { key: 'p_order', icon: TM_ICONS.order, label: '순서', run: (rect) => { selectElement(el); openLayerMenu(rect); } },
                { key: 'p_trash', icon: TM_ICONS.trash, label: '삭제', run: () => { selectElement(el); deleteSelected(); } }
            ], { x, y, above: !!byTouch }, 0, 'elem');
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
