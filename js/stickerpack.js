/* 말랑달콤 다이어리 - js/stickerpack.js
   🍭 미니시트 : ✨ 스티커 창 → 🍭 미니시트 → 위쪽 '🍭 미니시트' 칸 (첫 칸 · 😀 이모지는 둘째 칸)
   - 비슷한 것끼리 묶은 작은 스티커 모음 : 🔤 말랑 알파벳 A~Z · 🔢 말랑 숫자 0~9 · 💗 하트 모음
     그림 파일 없이 코드로 그려요 (말랑 버블 글씨 + 하얀 다이컷 테두리 · spkDraw) → 한 번 그린 건 기억해 둬요
   - 팩을 고르면 하얀 판에 스티커가 올려진 채 페이지 옆(자리가 없으면 아래쪽)에 떠 있어요
     1) 스티커를 톡 누르면 살짝 커지며 떠올라요 (말려 떼지는 연출 없이)
     2) 그대로 끌어서 페이지에 놓으면 작아지며 꾹 붙어요 → 빨간 점선이 생겨 옮기기 · 돌리기 · 크기 조절 (다른 스티커와 같아요)
        페이지 밖이나 판 위에 놓으면 제자리로 돌아가요 · 떠 있을 때 다른 곳을 누르면 제자리로
   - 판 위쪽 테이프(✋)를 끌면 판이 옮겨져요 · 오른쪽 위 끝 ✕ 로 닫아요 · 판 바깥은 그대로 페이지라 붙인 스티커를 바로 고칠 수 있어요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (미니시트 칸만 '준비 중') */

        const SPK_FONT = "'Fredoka', 'Jua', 'Arial Rounded MT Bold', sans-serif";
        const SPK_COLORS = [['#ff9ec1', '#e0628f'], ['#ffd36b', '#d9a12a'], ['#9fd3ff', '#4f9fd8'], ['#a8e3a0', '#5aa863'], ['#c7a8ff', '#8a63d9'], ['#ffb48a', '#e07a45'], ['#8fe0d2', '#3fae9c']];
        const SPK_PACKS = [
            { id: 'abc', icon: '🔤', name: '말랑 알파벳', sub: 'A ~ Z', items: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') },
            { id: 'num', icon: '🔢', name: '말랑 숫자', sub: '0 ~ 9 · ! ?', items: '0123456789!?'.split('') },
            { id: 'heart', icon: '💗', name: '하트 모음', sub: '하트 16가지', items: Array.from({ length: 16 }, (_, i) => 'h' + i) },
        ];
        const spkS = { cache: {}, pack: null, lift: null, mv: null, drag: null, press: null };
        const spkq = id => document.getElementById(id);
        const spkMk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

        /* ---------- 그리기 : 160 × 160 캔버스 → 빈 곳 잘라낸 PNG ---------- */
        function spkTrim(c) {
            const x = c.getContext('2d'), d = x.getImageData(0, 0, c.width, c.height).data;
            let x0 = c.width, y0 = c.height, x1 = 0, y1 = 0;
            for (let y = 0; y < c.height; y++) for (let i = 0; i < c.width; i++) if (d[(y * c.width + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            const o = spkMk(x1 - x0 + 3, y1 - y0 + 3); o.getContext('2d').drawImage(c, x0 - 1, y0 - 1, o.width, o.height, 0, 0, o.width, o.height);
            return o.toDataURL('image/png');
        }
        /* 글자 : 하얀 테두리 → 진한 테두리 → 파스텔 → 윗부분 반짝 */
        function spkGlyph(ch, i) {
            const c = spkMk(160, 160), x = c.getContext('2d'), [fill, line] = SPK_COLORS[i % SPK_COLORS.length];
            x.translate(80, 84); x.rotate([-.07, .05, -.03, .08, -.06, .03][i % 6]);
            x.font = `700 ${ch.length > 1 ? 80 : 108}px ${SPK_FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
            x.save(); x.shadowColor = 'rgba(120,80,95,.22)'; x.shadowBlur = 6; x.shadowOffsetY = 3; x.lineWidth = 26; x.strokeStyle = '#fff'; x.strokeText(ch, 0, 0); x.restore();
            x.lineWidth = 26; x.strokeStyle = '#fff'; x.strokeText(ch, 0, 0);
            x.lineWidth = 7; x.strokeStyle = line; x.strokeText(ch, 0, 0);
            x.fillStyle = fill; x.fillText(ch, 0, 0);
            const g = spkMk(160, 160), gx = g.getContext('2d');                   // 반짝 : 글자 안에서만
            gx.translate(80, 84); gx.rotate([-.07, .05, -.03, .08, -.06, .03][i % 6]); gx.font = x.font; gx.textAlign = 'center'; gx.textBaseline = 'middle';
            gx.fillStyle = '#000'; gx.fillText(ch, 0, 0); gx.globalCompositeOperation = 'source-in';
            gx.setTransform(1, 0, 0, 1, 0, 0); gx.fillStyle = 'rgba(255,255,255,.5)'; gx.beginPath(); gx.ellipse(66, 52, 30, 14, -.4, 0, 7); gx.fill();
            x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(g, 0, 0);
            return spkTrim(c);
        }
        function spkHeartPath(x, cx, cy, s) {
            x.beginPath(); x.moveTo(cx, cy + s * .82);
            x.bezierCurveTo(cx - s * 1.25, cy + s * .02, cx - s * .92, cy - s * .98, cx, cy - s * .4);
            x.bezierCurveTo(cx + s * .92, cy - s * .98, cx + s * 1.25, cy + s * .02, cx, cy + s * .82); x.closePath();
        }
        function spkStar(x, cx, cy, r, col) { x.beginPath(); for (let i = 0; i < 10; i++) { const q = i % 2 ? r * .45 : r, a = -Math.PI / 2 + i * Math.PI / 5; x.lineTo(cx + Math.cos(a) * q, cy + Math.sin(a) * q); } x.closePath(); x.fillStyle = col; x.fill(); }
        /* 하트 16가지 */
        const SPK_HEARTS = [
            { f: '#ff9ec1', l: '#e0628f' }, { f: '#ff6f8e', l: '#d23f62' }, { f: '#c7a8ff', l: '#8a63d9' }, { f: '#8fe0d2', l: '#3fae9c' },
            { f: '#ffd36b', l: '#d9a12a' }, { f: '#ffb3c8', l: '#e0628f', face: 1 }, { f: '#ff9ec1', l: '#e0628f', dots: '#fff' }, { f: '#9fd3ff', l: '#4f9fd8', stripe: '#fff' },
            { f: '#ff9ec1', l: '#e0628f', twin: '#c7a8ff' }, { f: '#fff', l: '#ff7fa3', ring: 1 }, { f: '#ffb48a', l: '#e07a45', spark: 1 }, { f: 'rainbow', l: '#c77fa0' },
            { f: '#ff8fab', l: '#d2577a', balloon: 1 }, { f: '#ffe0ec', l: '#ff8fab', wing: 1 }, { f: '#c7a8ff', l: '#8a63d9', bow: '#ff9ec1' }, { f: '#a8e3a0', l: '#5aa863', check: '#fff' },
        ];
        function spkHeart(i) {
            const h = SPK_HEARTS[i], c = spkMk(160, 160), x = c.getContext('2d'), cx = 80, cy = 82, s = h.twin ? 44 : 54;
            const body = (bx, by, bs, fill, line, rot) => {
                x.save(); x.translate(bx, by); x.rotate(rot || 0); x.translate(-bx, -by);
                x.save(); x.shadowColor = 'rgba(120,80,95,.22)'; x.shadowBlur = 6; x.shadowOffsetY = 3; spkHeartPath(x, bx, by, bs); x.lineWidth = 22; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.stroke(); x.restore();
                spkHeartPath(x, bx, by, bs); x.lineWidth = 22; x.strokeStyle = '#fff'; x.stroke();
                if (fill === 'rainbow') { const g = x.createLinearGradient(bx - bs, by - bs, bx + bs, by + bs); ['#ff9ec1', '#ffd36b', '#a8e3a0', '#9fd3ff', '#c7a8ff'].forEach((q, k) => g.addColorStop(k / 4, q)); x.fillStyle = g; } else x.fillStyle = fill;
                x.fill(); x.save(); x.clip();
                if (h.dots && !rot) { x.fillStyle = h.dots; for (let yy = by - bs; yy < by + bs; yy += 16) for (let xx = bx - bs + ((yy / 16) % 2) * 8; xx < bx + bs; xx += 16) { x.beginPath(); x.arc(xx, yy, 3.6, 0, 7); x.fill(); } }
                if (h.stripe) { x.strokeStyle = h.stripe; x.lineWidth = 6; for (let k = -bs * 2; k < bs * 2; k += 15) { x.beginPath(); x.moveTo(bx + k, by - bs); x.lineTo(bx + k + bs, by + bs); x.stroke(); } }
                if (h.check) { x.fillStyle = h.check; x.globalAlpha = .55; for (let yy = -4; yy < 8; yy++) for (let xx = -4; xx < 8; xx++) if ((xx + yy) % 2 === 0) x.fillRect(bx - bs + xx * 14, by - bs + yy * 14, 14, 14); x.globalAlpha = 1; }
                x.fillStyle = 'rgba(255,255,255,.5)'; x.beginPath(); x.ellipse(bx - bs * .45, by - bs * .38, bs * .2, bs * .11, -.6, 0, 7); x.fill();
                x.restore();
                spkHeartPath(x, bx, by, bs); x.lineWidth = h.ring ? 7 : 5; x.strokeStyle = line; x.stroke();
                x.restore();
            };
            if (h.wing) {                                                             // 날개
                for (const d of [-1, 1]) { x.save(); x.translate(cx + d * 50, cy - 10); x.scale(d, 1); x.beginPath(); x.moveTo(-6, 8); x.bezierCurveTo(10, -26, 34, -24, 30, -6); x.bezierCurveTo(40, -2, 30, 16, 14, 12); x.bezierCurveTo(16, 22, 0, 24, -6, 8); x.closePath();
                    x.lineWidth = 16; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 3.5; x.strokeStyle = '#9fc4e8'; x.stroke(); x.restore(); }
            }
            if (h.balloon) { x.save(); x.lineWidth = 9; x.strokeStyle = '#fff'; x.lineCap = 'round'; x.beginPath(); x.moveTo(cx, cy + 40); x.bezierCurveTo(cx - 12, cy + 56, cx + 12, cy + 64, cx - 2, cy + 74); x.stroke(); x.lineWidth = 2.5; x.strokeStyle = h.l; x.stroke(); x.restore(); }
            if (h.twin) body(cx + 22, cy - 14, 36, h.twin, '#8a63d9', .25);
            body(h.twin ? cx - 12 : cx, h.twin ? cy + 10 : h.balloon ? cy - 10 : cy, h.balloon ? 46 : s, h.f, h.l, h.twin ? -.15 : 0);
            if (h.face) {                                                             // 웃는 얼굴
                x.fillStyle = '#5a3d4a'; for (const d of [-1, 1]) { x.beginPath(); x.arc(cx + d * 17, cy - 4, 5, 0, 7); x.fill(); }
                x.fillStyle = '#fff'; for (const d of [-1, 1]) { x.beginPath(); x.arc(cx + d * 17 + 1.6, cy - 6, 1.7, 0, 7); x.fill(); }
                x.fillStyle = 'rgba(255,111,145,.5)'; for (const d of [-1, 1]) { x.beginPath(); x.ellipse(cx + d * 28, cy + 8, 7, 4.5, 0, 0, 7); x.fill(); }
                x.strokeStyle = '#5a3d4a'; x.lineWidth = 3; x.lineCap = 'round'; x.beginPath(); x.arc(cx, cy + 4, 6, .3, Math.PI - .3); x.stroke();
            }
            if (h.spark) { spkStar(x, cx + 46, cy - 40, 13, '#fff'); spkStar(x, cx + 46, cy - 40, 9, '#ffd36b'); spkStar(x, cx - 50, cy + 26, 9, '#fff'); spkStar(x, cx - 50, cy + 26, 6, '#ffd36b'); }
            if (h.bow) {                                                              // 리본
                x.save(); x.translate(cx + 26, cy - 34); x.rotate(.3);
                for (const d of [-1, 1]) { x.beginPath(); x.moveTo(0, 0); x.bezierCurveTo(d * 22, -16, d * 26, 14, 0, 0); x.closePath(); x.lineWidth = 10; x.lineJoin = 'round'; x.strokeStyle = '#fff'; x.stroke(); x.fillStyle = h.bow; x.fill(); x.lineWidth = 2.5; x.strokeStyle = '#e0628f'; x.stroke(); }
                x.beginPath(); x.arc(0, 0, 5, 0, 7); x.fillStyle = '#e0628f'; x.fill(); x.restore();
            }
            return spkTrim(c);
        }
        async function spkSrcs(pack) {
            if (spkS.cache[pack.id]) return spkS.cache[pack.id];
            if (pack.id !== 'heart' && document.fonts && document.fonts.load) await Promise.race([document.fonts.load(`700 100px ${SPK_FONT}`), new Promise(r => setTimeout(r, 1500))]).catch(() => {});
            return (spkS.cache[pack.id] = pack.items.map((it, i) => pack.id === 'heart' ? spkHeart(i) : spkGlyph(it, i)));
        }

        /* ---------- 🍭 미니시트 창 : 위쪽 '🍭 미니시트 · 😀 이모지' 두 칸 (js/stickermaker.js openStickerList) ---------- */
        function spkTabs() {
            const bar = spkq('stickerKindTabs'); if (!bar) return;
            bar.innerHTML = [['pack', '🍭 미니시트'], ['emoji', '😀 이모지']].map(([v, n]) => `<button type="button" class="stk-tab" data-tab="${v}" onclick="spkTab('${v}')">${n}</button>`).join('');
            bar.classList.add('two'); bar.hidden = false;
        }
        async function spkTab(tab) {
            document.querySelectorAll('#stickerKindTabs .stk-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
            const g = spkq('stickerGrid'); g.scrollTop = 0;
            if (tab === 'emoji') { const b = document.querySelector('#stickerCategories .em-cat'); if (b) b.click(); return; }
            g.innerHTML = '<div class="smk-empty">불러오는 중…</div>';
            const cards = [];
            for (const p of SPK_PACKS) { const s = await spkSrcs(p); cards.push(`<button type="button" class="spk-card" onclick="openStickerPack('${p.id}')"><span class="spk-prev">${s.slice(0, 4).map(u => `<img src="${u}" alt="">`).join('')}</span><b>${p.icon} ${p.name}</b><small>${p.sub}</small></button>`); }
            if (document.querySelector('#stickerKindTabs .stk-tab.on[data-tab="pack"]')) g.innerHTML = `<div class="spk-cards">${cards.join('')}</div>`;
        }

        /* ---------- 하얀 판 ---------- */
        function spkBuild() {
            if (spkq('spkRoom')) return;
            const el = document.createElement('div');
            el.id = 'spkRoom'; el.className = 'spk-room';
            el.innerHTML = `<div class="spk-board" id="spkBoard"><div class="spk-tape" id="spkTape">✋ 잡고 옮겨요</div><button type="button" class="pm-x spk-x" onclick="closeStickerPack()" aria-label="닫기">✕</button>
                <b class="spk-title" id="spkTitle"></b><div class="spk-grid" id="spkGrid"></div></div>`;
            document.body.appendChild(el);
            spkq('spkTape').addEventListener('pointerdown', e => {
                e.preventDefault(); spkPutBack(); try { e.target.setPointerCapture(e.pointerId); } catch (er) {}
                const b = spkq('spkBoard').getBoundingClientRect(); spkS.drag = { dx: e.clientX - b.left, dy: e.clientY - b.top };
            });
            spkq('spkTape').addEventListener('pointermove', e => { if (spkS.drag) spkPlace(e.clientX - spkS.drag.dx, e.clientY - spkS.drag.dy); });
            const end = () => { spkS.drag = null; }; spkq('spkTape').addEventListener('pointerup', end); spkq('spkTape').addEventListener('pointercancel', end);
            const g = spkq('spkGrid');
            g.addEventListener('pointerdown', spkDown); g.addEventListener('pointermove', spkGridMove);
            g.addEventListener('pointerup', spkGridUp); g.addEventListener('pointercancel', spkGridUp);
            spkq('spkBoard').addEventListener('pointerdown', e => { if (!e.target.closest('.spk-it, .spk-tape, .spk-x')) spkPutBack(); });
            window.addEventListener('resize', () => { const b = spkq('spkBoard'); if (spkq('spkRoom').classList.contains('show')) { const r = b.getBoundingClientRect(); spkPlace(r.left, r.top); } });
        }
        /* 판 자리 : 화면 안으로 */
        function spkPlace(x, y) {
            const b = spkq('spkBoard'), W = window.innerWidth, H = window.innerHeight;
            x = Math.max(6, Math.min(W - b.offsetWidth - 6, x)); y = Math.max(64, Math.min(H - b.offsetHeight - 6, y));
            b.style.left = x + 'px'; b.style.top = y + 'px'; spkS.mv = [x, y];
        }
        async function openStickerPack(id) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            const p = SPK_PACKS.find(q => q.id === id); if (!p) return;
            if (typeof closeModal === 'function') closeModal('stickerModal');
            spkBuild(); spkPutBack(); spkS.pack = p;
            const srcs = await spkSrcs(p);
            spkq('spkTitle').textContent = p.icon + ' ' + p.name;
            spkq('spkGrid').innerHTML = srcs.map((u, i) => `<span class="spk-it" data-i="${i}"><img src="${u}" alt="" draggable="false"></span>`).join('');
            spkq('spkRoom').classList.add('show');
            const b = spkq('spkBoard'), W = window.innerWidth, H = window.innerHeight, pg = spkq('diaryBook') || spkq('diaryWrapper'), r = pg.getBoundingClientRect();
            /* 페이지 옆에 자리가 있으면 오른쪽 옆 · 없으면 아래쪽 가운데 (하단메뉴 바로 위) */
            const nav = document.querySelector('.tb-sticker'), nt = nav ? nav.parentElement.getBoundingClientRect().top : H;
            if (W - r.right >= b.offsetWidth + 12) spkPlace(r.right + 8, Math.max(80, r.top + 40));
            else spkPlace((W - b.offsetWidth) / 2, nt - b.offsetHeight - 10);
        }
        function closeStickerPack() { spkPutBack(); const r = spkq('spkRoom'); if (r) r.classList.remove('show'); }

        /* ---------- 누르면 🏷️ 씰스티커처럼 떼어져서(js/peelfx.js) 떠오르기 · 끌기 → 붙이기 ---------- */
        /* 누른 채 끌면 🏷️ 씰스티커처럼 손가락을 따라 가장자리부터 떼어져요 (js/peelfx.js pfxSeal) · 톡 누르면 저절로 떼어져 떠올라요 */
        function spkDown(e) {
            const it = e.target.closest('.spk-it'); if (!it) return;
            e.preventDefault(); spkPutBack();
            spkS.press = { it, x: e.clientX, y: e.clientY, seal: null };
            try { spkq('spkGrid').setPointerCapture(e.pointerId); } catch (er) {}
        }
        function spkGridMove(e) {
            const p = spkS.press; if (!p) return;
            if (p.seal) { p.seal.move(e.clientX, e.clientY); return; }
            if (Math.hypot(e.clientX - p.x, e.clientY - p.y) < 5 || !window.pfxSeal) return;
            const img = p.it.querySelector('img'), r = img.getBoundingClientRect(), it = p.it;
            it.classList.add('out');
            p.seal = pfxSeal({ src: img, cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width, h: r.height, rot: 0, x: p.x, y: p.y,
                onCancel: () => it.classList.remove('out'),
                onDrop: (cx, cy, rot) => {                                                  // 페이지 위면 붙이고 · 판 위나 바깥이면 제자리로
                    const pg = spkq('canvasArea'), pr = pg && pg.getBoundingClientRect(), b = spkq('spkBoard').getBoundingClientRect();
                    const onBoard = cx > b.left && cx < b.right && cy > b.top && cy < b.bottom;
                    if (pr && !onBoard && cx > pr.left && cx < pr.right && cy > pr.top && cy < pr.bottom) spkStick({ it, src: img.src, w: r.width, h: r.height, cx, cy, rot });
                    else it.classList.remove('out');
                } });
            p.seal.move(e.clientX, e.clientY);
        }
        function spkGridUp(e) {
            const p = spkS.press; if (!p) return; spkS.press = null;
            if (p.seal) { p.seal.up(); return; }
            spkLift(p.it, p.x, p.y, e.pointerId);
        }
        /* 톡 : 저절로 떼어져서 떠 있어요 (다시 끌거나 다른 곳을 누르면 제자리) */
        function spkLift(it, ex, ey, pid) {
            const e = { clientX: ex, clientY: ey, pointerId: pid };
            const img = it.querySelector('img'), r = img.getBoundingClientRect();
            const f = img.cloneNode(); f.className = 'spk-fly'; f.style.width = r.width + 'px'; f.style.height = r.height + 'px';
            f.style.transform = `translate(${r.left}px, ${r.top}px)`; f.classList.add('flat'); document.body.appendChild(f); void f.offsetWidth; it.classList.add('out');
            const L = spkS.lift = { f, it, src: img.src, w: r.width, h: r.height, home: [r.left + r.width / 2, r.top + r.height / 2], off: [e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)], moved: false, start: [e.clientX, e.clientY], last: [e.clientX, e.clientY], s: 1, rot: 0 };
            L.cx = L.home[0]; L.cy = L.home[1];
            const up = () => {                                                        // 다 떼어지면 커지며 떠올라 손가락 자리로
                L.peel = null; if (spkS.lift !== L) return;
                f.classList.remove('flat', 'drag');
                const [x, y] = L.moved ? [L.last[0] - L.off[0], L.last[1] - L.off[1]] : L.home;
                spkFly(x, y, 1.3, (Math.random() - .5) * .2);
                if (L.upLater) setTimeout(() => { if (spkS.lift === L) spkDrop(L); }, 170);
            };
            if (window.pfxPeel) { L.peel = true; const stop = pfxPeel(f, e.clientX, e.clientY, .35, -1, 0, up); if (L.peel) L.peel = stop; } else up();
            f.addEventListener('pointermove', spkMove); f.addEventListener('pointerup', spkUp); f.addEventListener('pointercancel', spkUp);
            f.addEventListener('pointerdown', ev => { ev.preventDefault(); const q = spkS.lift; if (!q) return; q.off = [ev.clientX - q.cx, ev.clientY - q.cy]; q.start = [ev.clientX, ev.clientY]; q.moved = false; q.down = true; try { f.setPointerCapture(ev.pointerId); } catch (er) {} });
            L.down = false;
            if (navigator.vibrate) try { navigator.vibrate(6); } catch (er) {}
        }
        function spkFly(cx, cy, s, rot) {
            const L = spkS.lift; if (!L) return;
            L.cx = cx; L.cy = cy; if (s != null) L.s = s; if (rot != null) L.rot = rot;
            L.f.style.transform = `translate(${cx - L.w / 2}px, ${cy - L.h / 2}px) scale(${L.s}) rotate(${L.rot}rad)`;
        }
        function spkMove(e) {
            const L = spkS.lift; if (!L || !L.down) return;
            if (!L.moved && Math.hypot(e.clientX - L.start[0], e.clientY - L.start[1]) < 5) return;
            L.moved = true; L.last = [e.clientX, e.clientY];
            if (L.peel) return;                                                       // 떼어지는 동안은 제자리
            L.f.classList.add('drag'); spkFly(e.clientX - L.off[0], e.clientY - L.off[1]);
        }
        function spkUp() {
            const L = spkS.lift; if (!L || !L.down) return;
            L.down = false; L.f.classList.remove('drag');
            if (!L.moved) return;                                                     // 톡 : 떠 있는 채로 (다시 끌거나 다른 곳을 누르면 제자리)
            if (L.peel) { L.upLater = true; return; }                                 // 아직 떼어지는 중 → 다 떼어진 뒤 놓기
            spkDrop(L);
        }
        function spkDrop(L) {
            const pg = spkq('canvasArea'), r = pg && pg.getBoundingClientRect(), b = spkq('spkBoard').getBoundingClientRect();
            const onBoard = L.cx > b.left && L.cx < b.right && L.cy > b.top && L.cy < b.bottom;
            if (r && !onBoard && L.cx > r.left && L.cx < r.right && L.cy > r.top && L.cy < r.bottom) spkStick(L); else spkPutBack();
        }
        /* 제자리로 */
        function spkPutBack() {
            const L = spkS.lift; if (!L) return; spkS.lift = null;
            if (typeof L.peel === 'function') L.peel(); L.peel = null;
            L.f.classList.remove('flat'); L.f.classList.add('back'); L.s = 1; L.rot = 0; L.f.style.transform = `translate(${L.home[0] - L.w / 2}px, ${L.home[1] - L.h / 2}px) scale(1)`;
            setTimeout(() => { L.f.remove(); L.it.classList.remove('out'); }, 200);
        }
        /* 붙이기 : 작아지며 꾹 → 페이지 스티커가 돼요 (빨간 점선으로 골라 둬요) */
        function spkStick(L) {
            spkS.lift = null;
            if (L.f) { L.f.classList.add('back'); L.f.style.transform = `translate(${L.cx - L.w / 2}px, ${L.cy - L.h / 2}px) scale(1) rotate(${L.rot}rad)`; }
            setTimeout(() => {
                if (L.f) L.f.remove(); L.it.classList.remove('out');
                if (!addImage(L.src)) return;
                const pg = spkq('canvasArea'), r = pg.getBoundingClientRect(), k = r.width / (pg.offsetWidth || r.width) || 1, el = pg.querySelector('.element-box:last-child');
                if (el) {
                    const w = L.w / k, h = L.h / k, PADB = 14, deg = Math.round(L.rot * 180 / Math.PI * 10) / 10;
                    const put = (px, py) => { el.dataset.posX = px; el.dataset.posY = py; el.style.transform = `translate(${px}px, ${py}px) scale(1) rotate(${deg}deg)`; };
                    el.style.width = w + 'px'; el.style.height = h + 'px'; el.dataset.rotation = deg;
                    const x = Math.round((L.cx - r.left) / k - (w + PADB) / 2), y = Math.round((L.cy - r.top) / k - (h + PADB) / 2);
                    put(x, y); const bb = el.getBoundingClientRect();
                    put(Math.round(x + (L.cx - (bb.left + bb.width / 2)) / k), Math.round(y + (L.cy - (bb.top + bb.height / 2)) / k));
                    if (typeof selectElement === 'function') selectElement(el);
                }
                if (navigator.vibrate) try { navigator.vibrate(10); } catch (er) {}
                if (typeof saveData === 'function') saveData(false);
            }, 150);
        }
        document.addEventListener('pointerdown', e => { if (spkS.lift && !spkS.lift.down && !e.target.closest('.spk-fly, #spkBoard')) spkPutBack(); }, true);

        window.spkTab = spkTab; window.spkTabs = spkTabs; window.openStickerPack = openStickerPack; window.closeStickerPack = closeStickerPack;
