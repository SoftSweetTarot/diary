/* 말랑달콤 다이어리 - js/pickgrid.js
   🗂 고르는 창 칸 (도련 · 2026-10-17) : 🏷️ 씰 · 🧩 조각 · 📄 모조지 · 🍭 포인트 기본 칸 (📒 수첩 창은 그대로)
   - 가로 = 한 줄에 보이는 스티커 수 · 세로 = 한 쪽의 줄 수 (⚙️ 설정 → 🗂 고르는 창 칸 정하기 · 이 기기에만 기억)
   - 낱장 줄 : 낱장을 가로 칸 수만큼 한 줄로 · 나머지는 다음 쪽 · 누르면 그 낱장 하나만
   - 묶음 줄 : 묶음 하나 = 한 줄 · 가로 칸보다 많으면 줄을 옆으로 밀어서 봐요 (필통 밴드처럼 · 끝에서 멈춰요) · 어디를 눌러도 묶음 전체
   - 한 쪽 = 낱장 1줄 + 묶음 (세로 - 1)줄 · 낱장이 다 끝나면 묶음이 모든 줄 · 묶음이 없으면 낱장이 모든 줄
   - 낱장 줄은 위(기본) · 아래 중에서 골라요
   그리는 곳 : js/stk-basic.js sbPage · js/elements.js renderLibrary */
(function () {
    const KEY = 'malang_pick_grid', LIM = { c: [3, 10], r: [2, 8] }, GAP = 6;
    const pgDef = () => innerWidth < 600 ? { c: 4, r: 4, top: 1 } : { c: 6, r: 4, top: 1 };   // 폰 4 × 4 · 컴퓨터 6 × 4
    const clamp = (k, v) => Math.max(LIM[k][0], Math.min(LIM[k][1], v));
    function pgGrid() {
        const g = pgDef();
        try {
            const s = JSON.parse(localStorage.getItem(KEY));
            if (s && typeof s === 'object') {
                ['c', 'r'].forEach(k => { const n = parseInt(s[k], 10); if (!isNaN(n)) g[k] = clamp(k, n); });
                if ('top' in s) g.top = s.top ? 1 : 0;
            }
        } catch (e) {}
        return g;
    }
    function pgSave(g) {
        try { if (g) localStorage.setItem(KEY, JSON.stringify(g)); else localStorage.removeItem(KEY); } catch (e) {}
        document.dispatchEvent(new CustomEvent('pickgrid'));
    }

    /* 쪽 나누기 : ns = 칸마다 스티커 수 (1 = 낱장) → [[번호, …], …] */
    function pgPages(ns, g) {
        const S = [], B = [], out = [];
        ns.forEach((n, i) => (n > 1 ? B : S).push(i));
        let s = 0, b = 0;
        while (s < S.length || b < B.length) {
            const pg = []; let rows = g.r;
            if (s < S.length) {
                const k = b < B.length ? g.c : g.c * g.r;                    // 묶음이 남아 있으면 낱장은 한 줄만
                pg.push(...S.slice(s, s + k)); s += k; rows = b < B.length ? rows - 1 : 0;
            }
            pg.push(...B.slice(b, b + rows)); b += rows;
            out.push(pg);
        }
        return out;
    }
    /* 낱장 줄 글씨 : 몇 번째부터 몇 번째까지 / 모두 몇 개 */
    function pgOneTxt(ps, ns, cur) {
        const one = i => ns[i] <= 1;
        let a = 0; for (let p = 0; p < cur; p++) a += ps[p].filter(one).length;
        const k = (ps[cur] || []).filter(one).length, t = ns.filter(n => n <= 1).length;
        if (!k) return '';
        return t > k ? `낱장 스티커 · ${a + 1}–${a + k} / ${t}` : `낱장 스티커 ${t}개`;
    }

    /* 한 쪽 그리기 : els = 이 쪽 칸들 (순서대로) · ns = 칸마다 스티커 수 */
    function pgLay(box, els, ns, g, txt) {
        box.classList.add('pg-on');
        const cs = getComputedStyle(box), W = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
        const cw = Math.max(24, Math.floor((W - 4 - GAP * (g.c - 1)) / g.c * 10) / 10);
        box.style.setProperty('--pg-c', g.c); box.style.setProperty('--pg-cw', cw + 'px'); box.style.setProperty('--pg-r', g.r);
        let lab = box.querySelector(':scope > .pg-lab');
        if (!lab) { lab = document.createElement('div'); lab.className = 'pg-lab'; box.appendChild(lab); }
        lab.textContent = txt || ''; lab.hidden = !txt; lab.style.order = g.top ? 1 : 5;
        els.forEach((el, i) => {
            const n = ns[i], bun = n > 1;
            el.classList.toggle('pg-one', !bun); el.classList.toggle('pg-bun', bun);
            el.style.order = bun ? 3 : g.top ? 2 : 6;
            if (bun) pgBand(el, n, g.c, cw);
            else { el.classList.remove('pg-mv', 'pg-l', 'pg-r'); const p = el.querySelector('.pg-pos'); if (p) p.remove(); }
        });
    }
    /* 📒 수첩으로 바꾸면 예전 모양으로 */
    function pgOff(box, els) {
        if (!box.classList.contains('pg-on')) return;
        box.classList.remove('pg-on'); box.style.removeProperty('--pg-cw');
        const lab = box.querySelector(':scope > .pg-lab'); if (lab) lab.remove();
        els.forEach(el => {
            el.classList.remove('pg-one', 'pg-bun', 'pg-mv', 'pg-l', 'pg-r'); el.style.order = '';
            const s = el.querySelector('.sb-thumbs'); if (s) s.style.transform = '';
            const p = el.querySelector('.pg-pos'); if (p) p.remove();
        });
    }

    /* ↔ 묶음 줄 밀기 : 끌기 · 휠 · ← → 키 · 놓으면 칸에 딱 맞춰 멈춰요 · 밀고 난 뒤에는 눌리지 않아요 */
    function pgBand(el, n, c, cw) {
        const strip = el.querySelector('.sb-thumbs'); if (!strip) return;
        el._pgN = n; el._pgC = c; el._pgMax = Math.max(0, n - c); el._pgStep = cw + GAP;
        el.classList.toggle('pg-mv', el._pgMax > 0);
        if (!el.querySelector('.pg-pos')) { const p = document.createElement('span'); p.className = 'pg-pos'; el.appendChild(p); }
        pgGo(el, Math.round(Math.min(el._pgX || 0, el._pgMax)));
        if (el._pgOn) return; el._pgOn = 1;
        let sx = 0, x0 = 0, on = false, moved = false, id = null, wt = 0;
        el.addEventListener('pointerdown', e => {
            if (!el.classList.contains('pg-mv') || (e.button && e.pointerType === 'mouse')) return;
            sx = e.clientX; x0 = el._pgX || 0; on = true; moved = false; id = e.pointerId;
        });
        el.addEventListener('pointermove', e => {
            if (!on || e.pointerId !== id) return;
            const dx = e.clientX - sx;
            if (!moved) { if (Math.abs(dx) < 6) return; moved = true; el.classList.add('pg-drag'); try { el.setPointerCapture(id); } catch (er) {} }
            pgGo(el, x0 - dx / el._pgStep);
        });
        const up = () => {
            if (!on) return; on = false;
            if (moved) { el.classList.remove('pg-drag'); pgGo(el, Math.round(el._pgX)); el._pgNo = Date.now(); }
        };
        el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
        el.addEventListener('lostpointercapture', e => { if (e.target === el) up(); });   // 손가락이 처음 닿은 그림이 놓는 것은 빼고
        el.addEventListener('click', e => { if (Date.now() - (el._pgNo || 0) < 400) { e.stopImmediatePropagation(); e.preventDefault(); } }, true);
        el.addEventListener('wheel', e => {
            if (!el.classList.contains('pg-mv')) return;
            const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.shiftKey ? e.deltaY : 0; if (!d) return;
            e.preventDefault(); el.classList.add('pg-drag'); pgGo(el, (el._pgX || 0) + d / el._pgStep);
            clearTimeout(wt); wt = setTimeout(() => { el.classList.remove('pg-drag'); pgGo(el, Math.round(el._pgX)); }, 140);
        }, { passive: false });
        el.addEventListener('keydown', e => {
            if (!el.classList.contains('pg-mv') || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
            e.preventDefault(); pgGo(el, Math.round(el._pgX || 0) + (e.key === 'ArrowRight' ? 1 : -1));
        });
    }
    function pgGo(el, x) {
        x = Math.max(0, Math.min(el._pgMax || 0, x)); el._pgX = x;
        const s = el.querySelector('.sb-thumbs'); if (s) s.style.transform = `translateX(${(-x * el._pgStep).toFixed(1)}px)`;
        el.classList.toggle('pg-l', x > .02); el.classList.toggle('pg-r', x < el._pgMax - .02);
        const p = el.querySelector('.pg-pos'), a = Math.round(x);
        if (p) p.textContent = el._pgMax ? `↔ ${a + 1}–${a + el._pgC} / ${el._pgN}` : '';
    }

    /* ---------- ⚙️ 설정 → 🗂 고르는 창 칸 정하기 : 더미 칸을 보면서 정해요 ---------- */
    const DUMMY = [10, 6, 12, 3, 8, 9, 5, 7];                                // 더미 묶음 스티커 수
    let pgTry = null;
    function pgOpen() {
        let c = document.getElementById('pgSet');
        if (!c) {
            c = document.createElement('div'); c.id = 'pgSet'; c.className = 'pg-set';
            c.innerHTML = '<div class="pg-set-box" role="dialog" aria-label="고르는 창 칸 정하기"><div class="pg-set-t">🗂 고르는 창 칸 정하기</div>'
                + '<p class="pg-set-p">가로는 한 줄에 보이는 스티커 수, 세로는 한 쪽에 보이는 줄 수예요.<br>묶음이 가로보다 많으면 그 줄을 옆으로 밀어서 봐요.</p>'
                + '<div class="pg-set-row"><span>↔ 가로</span><button type="button" class="btn" data-k="c" data-d="-1">－</button><b id="pgSetC"></b><button type="button" class="btn" data-k="c" data-d="1">＋</button></div>'
                + '<div class="pg-set-row"><span>↕ 세로</span><button type="button" class="btn" data-k="r" data-d="-1">－</button><b id="pgSetR"></b><button type="button" class="btn" data-k="r" data-d="1">＋</button></div>'
                + '<div class="pg-set-row"><span>낱장 줄</span><div class="pg-set-seg"><button type="button" class="btn" data-top="1">맨 위</button><button type="button" class="btn" data-top="0">맨 아래</button></div></div>'
                + '<div class="pg-set-dm" id="pgSetDm" aria-hidden="true"></div>'
                + '<small class="pg-set-s">이 기기에만 저장돼요 (폰과 컴퓨터를 따로 정해요)</small>'
                + '<div class="pg-set-btns"><button type="button" class="btn" id="pgSetReset">처음대로</button><button type="button" class="btn" id="pgSetNo">닫기</button><button type="button" class="btn pg-set-ok" id="pgSetOk">저장</button></div></div>';
            document.body.appendChild(c);
            c.querySelectorAll('[data-k]').forEach(b => b.addEventListener('click', () => { pgTry[b.dataset.k] = clamp(b.dataset.k, pgTry[b.dataset.k] + +b.dataset.d); pgDummy(); }));
            c.querySelectorAll('[data-top]').forEach(b => b.addEventListener('click', () => { pgTry.top = +b.dataset.top; pgDummy(); }));
            document.getElementById('pgSetNo').onclick = () => { c.hidden = true; };
            document.getElementById('pgSetReset').onclick = () => { pgTry = pgDef(); pgDummy(); };
            document.getElementById('pgSetOk').onclick = () => { pgSave(pgTry); c.hidden = true; showMsg('🗂 고르는 창 칸을 바꿨어요'); };
            c.addEventListener('click', e => { if (e.target === c) c.hidden = true; });
        }
        pgTry = pgGrid(); c.hidden = false; pgDummy();
    }
    /* 더미 : 낱장 12개 + 묶음 여러 개로 첫 쪽 모양 */
    function pgDummy() {
        const g = pgTry, dm = document.getElementById('pgSetDm'); if (!dm) return;
        document.getElementById('pgSetC').textContent = g.c + '칸';
        document.getElementById('pgSetR').textContent = g.r + '줄';
        document.querySelectorAll('#pgSet [data-top]').forEach(b => b.classList.toggle('on', +b.dataset.top === g.top));
        document.querySelectorAll('#pgSet [data-k]').forEach(b => { const k = b.dataset.k; b.disabled = +b.dataset.d < 0 ? g[k] <= LIM[k][0] : g[k] >= LIM[k][1]; });
        const dot = n => '<i></i>'.repeat(n);
        const one = `<div class="pg-dm-lab">낱장 스티커 · 1–${g.c} / 12</div><div class="pg-dm-one">${dot(g.c)}</div>`;
        const buns = DUMMY.slice(0, g.r - 1).map(n => `<div class="pg-dm-bun${n > g.c ? ' more' : ''}"><div><span>묶음 ${n}개</span><span>${n > g.c ? `↔ 1–${g.c} / ${n}` : ''}</span></div><p>${dot(Math.min(n, g.c))}</p></div>`).join('');
        dm.style.setProperty('--c', g.c);
        dm.innerHTML = g.top ? one + buns : buns + one;
    }

    window.pgGrid = pgGrid; window.pgPages = pgPages; window.pgOneTxt = pgOneTxt; window.pgLay = pgLay; window.pgOff = pgOff; window.pgOpen = pgOpen;
})();

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['pickgrid'] = true;
