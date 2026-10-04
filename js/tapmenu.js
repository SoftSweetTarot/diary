/* 말랑달콤 다이어리 - js/tapmenu.js
   📍 빈 곳을 누르면 그 자리에 추가 메뉴(🎨 스티커 · ✏ 글쓰기 · 🖍️ 펜 · 🖼 이미지 · 📚 그림모음)가 한 줄로 나와요.
   - 고른 것이 있으면(빨간 점선) 첫 번째 터치는 '선택 해제'만 (elements.js 의 canvasArea click 에서 불러요)
   - 메뉴에서 고른 것은 눌렀던 자리 근처에 놓여요 (tmPlace) */
        const TM_ITEMS = [
            { icon: '🎨', label: '스티커', run: () => openModal('stickerModal') },
            { icon: '✏', label: '글쓰기', run: () => addText() },
            { icon: '🖍️', label: '펜', run: () => { tmAnchor = null; window.openDraw ? openDraw() : comingSoon('🖍️ 펜'); } },
            { icon: '🖼', label: '이미지', run: () => triggerImageUpload() },
            { icon: '📚', label: '그림모음', run: () => openLibrary() }
        ];
        const TM_ANCHOR_MS = 120000;
        let tmEl = null, tmAnchor = null;

        function tmClose() { if (tmEl) { tmEl.remove(); tmEl = null; } }

        function tmOpen(e) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) return;
            if (typeof dw !== 'undefined' && dw.on) return;
            tmClose();
            const canvas = document.getElementById('canvasArea'), r = canvas.getBoundingClientRect();
            const k = r.width / (canvas.offsetWidth || r.width) || 1;
            tmAnchor = { x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k, t: Date.now() };

            const m = document.createElement('div');
            m.className = 'tap-menu';
            TM_ITEMS.forEach(it => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'tap-menu-btn';
                b.innerHTML = `<span>${it.icon}</span>${it.label}`;
                b.onclick = (ev) => { ev.stopPropagation(); tmClose(); it.run(); };
                m.appendChild(b);
            });
            document.body.appendChild(m);
            const w = m.offsetWidth, h = m.offsetHeight, vw = window.innerWidth, vh = window.innerHeight;
            let x = e.clientX + 6, y = e.clientY + 6;
            if (x + w > vw - 6) x = e.clientX - w - 6;
            if (y + h > vh - 6) y = e.clientY - h - 6;
            m.style.left = Math.max(6, x) + 'px';
            m.style.top = Math.max(6, y) + 'px';
            tmEl = m;
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
