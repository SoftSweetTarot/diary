/* 📏 자 (도련 · 2026-10-17) : 📒 연필꽂이(js/draw.js)에 칼과 같이 꽂혀 있어요 → 위로 쏙 뽑으면 페이지 위에 내려놓아요
   - 자는 '깔아 두는 도구' · 손에는 지금처럼 필기구(또는 칼) 하나만 들어요 → 자 + 칼 · 자 + 색연필 · 자만 모두 돼요
   - 몸통을 끌면 옮기기 · 양 끝 동그란 손잡이로 돌리기(0 · 45 · 90° 근처에서 살짝 붙어요) · 두 손가락으로도 옮기고 돌려요
   - 가장자리에 대고 칼 · 색연필 · 형광펜을 그으면 자에 착 붙어 반듯하게 · 그은 길이가 cm 로 보여요
   - 아무것도 안 들고 자 가장자리를 따라 쓸면 길이만 재요
   - 눈금은 화면에 보이는 진짜 cm · 기기마다 화면이 달라서 ⚙ 설정 → 📏 자 맞추기(카드 대고 한 번)로 맞춰요 (이 기기에만 저장 · malang_ruler_ppc)
   - 자는 일기에 저장되지 않아요 (PNG 저장에도 안 찍혀요) · 다 쓰면 구석 연필꽂이를 톡 (칼 · 필기구와 같이 들어가요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (연필꽂이에 자만 안 꽂혀요) */
(() => {
    'use strict';
    const q = id => document.getElementById(id);
    const PPC_KEY = 'malang_ruler_ppc', CARD_CM = 8.56, CARD_CM2 = 5.398;   // 신용카드 · 교통카드 (ISO 규격)
    const SNAP_OUT = 24, SNAP_IN = 10;                    // 가장자리 바깥 24px · 안쪽 10px 안에서 그으면 자에 붙어요
    const R = { on: false, el: null, svg: null, cx: 0, cy: 0, ang: 0, L: 15, W: 0, H: 0, ppc: 37.8, drag: null, touch: new Map(), meas: null, sayTm: null };

    /* ---------- cm 크기 : 맞춘 값이 없으면 기기로 짐작 ---------- */
    function rlGuess() {
        const coarse = matchMedia('(pointer: coarse)').matches;
        return !coarse ? 96 / 2.54 : innerWidth < 700 ? 58 : 46;    // PC = CSS cm · 폰 · 아이패드는 흔한 화면으로 짐작
    }
    function rlSaved() { try { const v = parseFloat(localStorage.getItem(PPC_KEY)); return v > 15 && v < 200 ? v : 0; } catch (e) { return 0; } }
    const rlPpc = () => rlSaved() || rlGuess();

    /* ---------- 📏 자 종류 (👝 필통에서 골라 연필꽂이에 꽂아요 · js/pencase.js) : 몸통 · 테두리 · 눈금 색 · 새 자 = 한 줄 추가 (id 는 바꾸지 않기) ---------- */
    const RL_KINDS = [
        { id: 'pink', name: '딸기 자', bd: ['rgba(255,214,228,.78)', 'rgba(255,182,206,.62)'], ln: '#ee8fb0', ink: '#8a4a63', ht: '#ff7fa8', cup: 'rgba(255,196,216,.85)' },
        { id: 'mint', name: '민트 자', bd: ['rgba(214,247,233,.8)', 'rgba(166,228,203,.64)'], ln: '#6cc7a3', ink: '#2f6e58', ht: '#ff8fb1', cup: 'rgba(186,238,215,.9)' },
        { id: 'lav', name: '라벤더 자', bd: ['rgba(236,226,255,.8)', 'rgba(208,190,250,.64)'], ln: '#a78be8', ink: '#5a3f8f', ht: '#ff8fb1', cup: 'rgba(222,206,255,.9)' },
        { id: 'clear', name: '투명 자', bd: ['rgba(255,255,255,.5)', 'rgba(236,244,255,.42)'], ln: '#aebbd0', ink: '#55607a', ht: '#ffb3c8', cup: 'rgba(240,246,255,.85)' }
    ];
    const rlKind = id => RL_KINDS.find(k => k.id === id) || RL_KINDS[0];
    R.kind = RL_KINDS[0].id;

    /* ---------- 자 그림 ---------- */
    function rlDraw() {
        const K = rlKind(R.kind);
        const p = R.ppc, L = R.L, pad = .6 * p, W = Math.round(L * p + pad * 2), H = Math.round(Math.max(52, Math.min(92, 1.45 * p)));
        R.W = W; R.H = H;
        let tk = '', nm = '';
        for (let i = 0; i <= L * 10; i++) {
            const x = (pad + i * p / 10).toFixed(2), cm = i % 10 === 0, len = cm ? H * .34 : i % 5 === 0 ? H * .24 : H * .14;
            tk += `<line x1="${x}" y1="0" x2="${x}" y2="${len.toFixed(1)}" stroke-width="${cm ? 1.3 : .8}"/>`;
            if (cm) nm += `<text x="${x}" y="${(H * .34 + 12).toFixed(1)}">${i / 10}</text>`;
        }
        let gl = '';                                       // 반짝이 (늘 같은 자리)
        for (let i = 0; i < 26; i++) { const x = (i * 97 % 1000) / 1000 * (W - 20) + 10, y = H * .55 + ((i * 53) % 100) / 100 * (H * .3); gl += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(i % 3) * .5 + .7}"/>`; }
        const heart = `<path transform="translate(${(pad - 1).toFixed(1)} ${(H * .7).toFixed(1)}) scale(.9)" d="M0 3c-2-3-6-1-5 2 1 2 5 5 5 5s4-3 5-5c1-3-3-5-5-2z" fill="${K.ht}"/>`;
        return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" aria-hidden="true">`
            + `<defs><linearGradient id="rlMet" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f8fb"/><stop offset=".5" stop-color="#c9d1dd"/><stop offset="1" stop-color="#a9b3c2"/></linearGradient>`
            + `<linearGradient id="rlBody" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${K.bd[0]}"/><stop offset="1" stop-color="${K.bd[1]}"/></linearGradient></defs>`
            + `<rect x=".75" y=".75" width="${W - 1.5}" height="${H - 1.5}" rx="9" fill="url(#rlBody)" stroke="${K.ln}" stroke-width="1.5"/>`
            + `<rect x="6" y="${(H * .5).toFixed(1)}" width="${W - 12}" height="${(H * .14).toFixed(1)}" rx="3" fill="#fff" opacity=".35"/>`
            + `<g fill="#fff" opacity=".85">${gl}</g>`
            + `<rect x="1.5" y="${H - 9}" width="${W - 3}" height="7.5" rx="3" fill="url(#rlMet)" stroke="#9aa4b4" stroke-width=".6"/>`   // 칼이 미끄러지는 쇠 띠
            + `<g stroke="${K.ink}">${tk}</g><g fill="${K.ink}" font-size="10.5" font-family="sans-serif" font-weight="bold" text-anchor="middle">${nm}</g>`
            + heart + `<text x="${(W * .25).toFixed(1)}" y="${(H - 14).toFixed(1)}" font-size="9.5" font-family="sans-serif" font-style="italic" fill="${K.ink}" opacity=".6" text-anchor="middle">mallang ♡ ruler · cm</text></svg>`;
    }
    /* 연필꽂이 · 필통에 꽂힌 작은 자 (30 × h · 위가 0 · 연필꽂이 300 · 필통 150) */
    function rlCupSvg(id, h) {
        const K = rlKind(id); h = h || 300;
        let tk = '';
        for (let i = 0, y = 14; y < h - 22; i++, y += 5) { const l = i % 10 === 0 ? 11 : i % 5 === 0 ? 8 : 5; tk += `<line x1="1.5" y1="${y}" x2="${1.5 + l}" y2="${y}"/>`; }
        return `<svg viewBox="0 0 30 ${h}" aria-hidden="true"><rect x=".75" y=".75" width="28.5" height="${h - 1.5}" rx="6" fill="${K.cup}" stroke="${K.ln}" stroke-width="1.5"/>`
            + `<rect x="23" y="2" width="5.5" height="${h - 4}" rx="2" fill="#cdd5e0"/><g stroke="${K.ink}" stroke-width=".9">${tk}</g>`
            + `<path transform="translate(15 ${h - 14})" d="M0 3c-2-3-6-1-5 2 1 2 5 5 5 5s4-3 5-5c1-3-3-5-5-2z" fill="${K.ht}"/></svg>`;
    }

    /* ---------- 자 놓기 ---------- */
    function rlBuild() {
        if (R.el) return R.el;
        const el = document.createElement('div'); el.className = 'rl-ruler'; el.id = 'rlRuler'; el.hidden = true;
        el.innerHTML = '<div class="rl-svg"></div><i class="rl-h l" aria-hidden="true"></i><i class="rl-h r" aria-hidden="true"></i><button type="button" class="rl-fit" hidden>📏 cm 맞추기</button>';
        document.body.appendChild(el);
        el.addEventListener('pointerdown', e => { if (!rlGrab(e)) e.stopPropagation(); });
        el.addEventListener('pointermove', rlMove); el.addEventListener('pointerup', rlUp); el.addEventListener('pointercancel', rlUp);
        const fit = el.querySelector('.rl-fit');
        fit.addEventListener('pointerdown', e => e.stopPropagation()); fit.addEventListener('click', e => { e.stopPropagation(); rlCalOpen(); });
        const say = document.createElement('div'); say.className = 'rl-say'; say.id = 'rlSay'; say.hidden = true; document.body.appendChild(say);
        const mz = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); mz.setAttribute('class', 'rl-meas'); mz.id = 'rlMeas'; mz.innerHTML = '<line/>'; document.body.appendChild(mz);
        addEventListener('resize', () => { if (R.on) { rlSize(); rlKeep(); rlPlace(); } });
        R.el = el; return el;
    }
    function rlSize() {
        R.ppc = rlPpc(); R.L = innerWidth < 700 ? 10 : 15;
        R.el.querySelector('.rl-svg').innerHTML = rlDraw();
        R.el.style.width = R.W + 'px'; R.el.style.height = R.H + 'px';
        R.el.querySelector('.rl-fit').hidden = !!rlSaved();
    }
    function rlPlace() { R.el.style.transform = `translate(${R.cx - R.W / 2}px, ${R.cy - R.H / 2}px) rotate(${R.ang}deg)`; }
    function rlKeep() {                                   // 가운데는 늘 화면 안
        R.cx = Math.max(10, Math.min(innerWidth - 10, R.cx)); R.cy = Math.max(10, Math.min(innerHeight - 10, R.cy));
    }
    function rlShow(x, y, kind) {
        R.kind = rlKind(kind || rlFirst() || R.kind).id;
        rlBuild(); R.on = true; R.el.hidden = false; R.el.classList.remove('rl-in', 'rl-off');
        rlSize(); R.cx = x; R.cy = y; rlKeep(); rlPlace();
        document.body.classList.add('rl-out');
        document.dispatchEvent(new CustomEvent('rl-change'));
    }
    /* 끝 : put = 구석 연필꽂이에 쏙 넣으며 */
    function rlEnd(put) {
        if (!R.on) return;
        R.on = false; R.drag = null; R.meas = null; R.touch.clear(); rlSay(null); rlMeasDraw(null);
        document.body.classList.remove('rl-out');
        const el = R.el, m = put && rlMiniRect();
        if (m) { el.classList.add('rl-in'); el.style.transform = `translate(${m.left + m.width / 2 - R.W / 2}px, ${m.top - R.H / 2}px) rotate(-90deg) scale(.12)`; }
        else el.classList.add('rl-off');
        setTimeout(() => { if (!R.on) { el.hidden = true; el.classList.remove('rl-in', 'rl-off'); } }, 300);
        document.dispatchEvent(new CustomEvent('rl-change'));
    }
    const rlOn = () => R.on;

    /* ---------- 좌표 : 화면 ↔ 자 (자 가운데 기준 · 돌리기 전) ---------- */
    function rlLocal(x, y) { const a = R.ang * Math.PI / 180, dx = x - R.cx, dy = y - R.cy; return [dx * Math.cos(a) + dy * Math.sin(a), -dx * Math.sin(a) + dy * Math.cos(a)]; }
    function rlScreen(lx, ly) { const a = R.ang * Math.PI / 180; return [R.cx + lx * Math.cos(a) - ly * Math.sin(a), R.cy + lx * Math.sin(a) + ly * Math.cos(a)]; }
    const rlHit = (x, y) => { if (!R.on) return false; const [lx, ly] = rlLocal(x, y); return Math.abs(lx) <= R.W / 2 + 14 && Math.abs(ly) <= R.H / 2; };

    /* 가장자리 가까이서 시작했는지 → { s: -1 위(눈금) | 1 아래(쇠 띠) } */
    function rlSnap(x, y) {
        if (!R.on) return null;
        const [lx, ly] = rlLocal(x, y); if (Math.abs(lx) > R.W / 2 + 10) return null;
        const up = -R.H / 2 - ly, dn = ly - R.H / 2;    // + = 자 바깥
        const ok = d => d > -SNAP_IN && d < SNAP_OUT;
        if (ok(up) && (!ok(dn) || Math.abs(up) <= Math.abs(dn))) return { s: -1 };
        if (ok(dn)) return { s: 1 };
        return null;
    }
    /* 그 가장자리 위로 붙이기 (자 길이 밖으로는 안 나가요) · gap = 가장자리에서 띄우는 거리 */
    function rlProj(sn, x, y, gap) {
        const [lx] = rlLocal(x, y), l = Math.max(-R.W / 2, Math.min(R.W / 2, lx));
        return rlScreen(l, sn.s * (R.H / 2 + (gap == null ? 1.5 : gap)));
    }
    /* 두 점 사이 길이 말풍선 (cm) · a = null 이면 숨김 */
    function rlTell(a, b) {
        if (!a) { rlSay(null); return; }
        const cm = Math.hypot(b[0] - a[0], b[1] - a[1]) / R.ppc;
        rlSay(cm.toFixed(1) + ' cm', b[0], b[1] - 34);
    }
    function rlSay(t, x, y, keep) {
        const s = q('rlSay'); if (!s) return; clearTimeout(R.sayTm);
        if (t == null) { s.hidden = true; return; }
        s.textContent = t; s.hidden = false;
        s.style.left = Math.round(Math.max(40, Math.min(innerWidth - 40, x))) + 'px'; s.style.top = Math.round(Math.max(24, y)) + 'px';
        if (keep) R.sayTm = setTimeout(() => { s.hidden = true; }, keep);
    }

    /* ---------- 끌기 · 돌리기 · 두 손가락 ---------- */
    function rlGrab(e) {
        if (!R.on || e.button > 0 || !rlHit(e.clientX, e.clientY)) return false;
        e.preventDefault(); e.stopPropagation();
        try { R.el.setPointerCapture(e.pointerId); } catch (er) {}
        R.touch.set(e.pointerId, [e.clientX, e.clientY]);
        if (R.touch.size === 2) { rlTwoStart(); return true; }
        const [lx] = rlLocal(e.clientX, e.clientY), rot = Math.abs(lx) > R.W / 2 - 16;
        R.drag = rot
            ? { id: e.pointerId, rot: true, a0: Math.atan2(e.clientY - R.cy, e.clientX - R.cx) * 180 / Math.PI - R.ang }
            : { id: e.pointerId, off: [R.cx - e.clientX, R.cy - e.clientY] };
        R.el.classList.add('grab');
        document.dispatchEvent(new CustomEvent('rl-use'));          // 자를 쓰기 시작 → 큰 연필꽂이는 구석으로 (js/draw.js)
        return true;
    }
    function rlTwoStart() {
        const [a, b] = [...R.touch.values()];
        R.drag = { two: true, a0: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI, ang0: R.ang, m0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], c0: [R.cx, R.cy] };
    }
    const rlSnapAng = d => { d = ((d % 360) + 360) % 360; for (let k = 0; k <= 360; k += 45) if (Math.abs(d - k) < 3) return k % 360; return d; };
    function rlMove(e) {
        if (R.meas && R.meas.id === e.pointerId) { rlMeasMove(e); return; }
        if (R.touch.has(e.pointerId)) R.touch.set(e.pointerId, [e.clientX, e.clientY]);
        const d = R.drag; if (!d) return;
        e.preventDefault();
        if (d.two) {
            if (R.touch.size < 2) return;
            const [a, b] = [...R.touch.values()], an = Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI;
            R.ang = rlSnapAng(d.ang0 + an - d.a0); R.cx = d.c0[0] + (a[0] + b[0]) / 2 - d.m0[0]; R.cy = d.c0[1] + (a[1] + b[1]) / 2 - d.m0[1];
            rlSay(Math.round(R.ang) + '°', R.cx, R.cy - R.H / 2 - 30);
        } else if (d.id !== e.pointerId) return;
        else if (d.rot) {
            R.ang = rlSnapAng(Math.atan2(e.clientY - R.cy, e.clientX - R.cx) * 180 / Math.PI - d.a0);
            rlSay(Math.round(R.ang) + '°', R.cx, R.cy - R.H / 2 - 30);
        } else { R.cx = e.clientX + d.off[0]; R.cy = e.clientY + d.off[1]; }
        rlKeep(); rlPlace();
        document.querySelectorAll('.pc-mini').forEach(m => m.classList.toggle('over', !d.two && !d.rot && rlOverMini(e.clientX, e.clientY) === m));
    }
    function rlUp(e) {
        if (R.meas && R.meas.id === e.pointerId) { rlMeasEnd(); return; }
        R.touch.delete(e.pointerId);
        const d = R.drag; if (!d) return;
        if (d.two) { if (R.touch.size < 2) { R.drag = null; R.touch.clear(); R.el.classList.remove('grab'); rlSay(null); } return; }
        if (d.id !== e.pointerId) return;
        R.drag = null; R.el.classList.remove('grab'); rlSay(null);
        document.querySelectorAll('.pc-mini.over').forEach(m => m.classList.remove('over'));
        if (!d.rot && e.type !== 'pointercancel' && rlOverMini(e.clientX, e.clientY)) rlEnd(true);   // 자를 구석 연필꽂이에 넣으면 자만 정리
    }
    /* 보이는 구석 연필꽂이 (📒 연필꽂이 · ✂️ 칼 방) */
    function rlMiniRect() { const m = [...document.querySelectorAll('.pc-mini')].find(v => !v.hidden && v.offsetParent && !v.closest('[hidden]')); return m ? m.getBoundingClientRect() : null; }
    function rlOverMini(x, y) {
        return [...document.querySelectorAll('.pc-mini')].find(m => { if (m.hidden || !m.offsetParent || m.closest('[hidden]')) return false; const r = m.getBoundingClientRect(); return x > r.left - 16 && x < r.right + 16 && y > r.top - 24 && y < r.bottom + 16; }) || null;
    }

    /* ---------- 아무것도 안 들고 가장자리를 쓸면 길이 재기 (js/draw.js penDown 이 불러요) ---------- */
    function rlMeasure(e) {
        const sn = rlSnap(e.clientX, e.clientY); if (!sn) return false;
        try { R.el.setPointerCapture(e.pointerId); } catch (er) {}
        const p = rlProj(sn, e.clientX, e.clientY, 0);
        R.meas = { id: e.pointerId, sn, a: p, b: p };
        rlMeasDraw(R.meas); rlTell(p, p);
        document.dispatchEvent(new CustomEvent('rl-use'));
        return true;
    }
    function rlMeasMove(e) { const m = R.meas; m.b = rlProj(m.sn, e.clientX, e.clientY, 0); rlMeasDraw(m); rlTell(m.a, m.b); }
    function rlMeasEnd() {
        const m = R.meas; R.meas = null;
        const cm = Math.hypot(m.b[0] - m.a[0], m.b[1] - m.a[1]) / R.ppc;
        if (cm >= .05) { rlSay(cm.toFixed(1) + ' cm', m.b[0], m.b[1] - 34, 1800); setTimeout(() => { if (!R.meas) rlMeasDraw(null); }, 1800); }
        else { rlSay(null); rlMeasDraw(null); }
    }
    function rlMeasDraw(m) {
        const s = q('rlMeas'); if (!s) return; const l = s.firstChild;
        if (!m) { s.classList.remove('on'); return; }
        s.classList.add('on');
        l.setAttribute('x1', m.a[0]); l.setAttribute('y1', m.a[1]); l.setAttribute('x2', m.b[0]); l.setAttribute('y2', m.b[1]);
    }

    /* ---------- 연필꽂이에서 뽑기 : 손가락에 자를 들고 → 놓은 자리에 내려놓아요 ---------- */
    function rlCarry(e, kind) {
        rlShow(e.clientX, e.clientY, kind);
        try { R.el.setPointerCapture(e.pointerId); } catch (er) {}
        R.touch.set(e.pointerId, [e.clientX, e.clientY]);
        R.drag = { id: e.pointerId, off: [0, 0] }; R.el.classList.add('grab');
        if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) {}
    }
    /* 구석 연필꽂이에서 뽑을 자 : 👝 필통에서 고른 자 중 첫 번째 (하나도 안 골랐으면 없음 → 작은 자 머리도 숨겨요) */
    function rlFirst() { return window.pkFirst ? pkFirst('ruler') : RL_KINDS[0].id; }
    function rlTopSync() {
        const id = rlFirst(); document.body.classList.toggle('rl-none', !id);
        if (id) document.querySelectorAll('.rl-top').forEach(t => { const K = rlKind(id); t.style.setProperty('--rl-c', K.cup); t.style.setProperty('--rl-l', K.ln); t.style.setProperty('--rl-i', K.ink); });
    }
    /* 구석 연필꽂이에 꽂힌 작은 자 머리 : 위로 끌면 뽑아요 · 톡은 원래대로(끝) */
    function rlMiniAttach(mini) {
        if (!mini || mini.querySelector('.rl-top')) return;
        const t = document.createElement('span'); t.className = 'rl-top'; t.setAttribute('aria-hidden', 'true');
        mini.insertBefore(t, mini.querySelector('.pc-mini-cup')); rlTopSync();
        let st = null;
        t.addEventListener('pointerdown', e => { if (R.on || e.button > 0 || !rlFirst()) return; e.stopPropagation(); st = { id: e.pointerId, y: e.clientY, done: false }; try { t.setPointerCapture(e.pointerId); } catch (er) {} });
        t.addEventListener('pointermove', e => {
            if (!st || st.id !== e.pointerId || st.done) return;
            if (st.y - e.clientY > 28) { st.done = true; e.preventDefault(); rlCarry(e); }
        });
        const end = e => { if (st && st.id === e.pointerId && !st.done) st = null; };
        t.addEventListener('pointerup', end); t.addEventListener('pointercancel', end);
        mini.addEventListener('click', e => { if (st && st.done) { e.stopImmediatePropagation(); e.preventDefault(); } st = null; }, true);   // 뽑은 손을 뗄 때 '끝'이 되지 않게
    }

    /* ---------- ⚙ 📏 자 맞추기 : 카드를 화면에 대고 분홍 카드 크기를 맞춰요 ---------- */
    function rlCalOpen() {
        let c = q('rlCal');
        if (!c) {
            c = document.createElement('div'); c.id = 'rlCal'; c.className = 'rl-cal';
            c.innerHTML = '<div class="rl-cal-box"><div class="rl-cal-t">📏 자 맞추기</div>'
                + '<p class="rl-cal-p">신용카드나 교통카드를 화면에 대고, 분홍 카드가 <b>진짜 카드와 똑같은 크기</b>가 되게 맞춰요.</p>'
                + '<div class="rl-cal-area"><div class="rl-cal-card" id="rlCalCard"><span>💳</span></div></div>'
                + '<div class="rl-cal-row"><button type="button" class="btn" data-d="-1">－</button><input type="range" id="rlCalRange" min="20" max="120" step="0.1"><button type="button" class="btn" data-d="1">＋</button></div>'
                + '<small class="rl-cal-s">이 기기에만 저장돼요 · 화면 확대를 바꾸면 다시 맞춰요</small>'
                + '<div class="rl-cal-btns"><button type="button" class="btn" id="rlCalReset">처음대로</button><button type="button" class="btn" id="rlCalNo">닫기</button><button type="button" class="btn rl-cal-ok" id="rlCalOk">저장</button></div></div>';
            document.body.appendChild(c);
            const rg = q('rlCalRange');
            rg.addEventListener('input', () => rlCalPaint(+rg.value));
            c.querySelectorAll('[data-d]').forEach(b => b.addEventListener('click', () => { rg.value = (+rg.value + b.dataset.d * .2).toFixed(1); rlCalPaint(+rg.value); }));
            q('rlCalNo').onclick = () => { c.hidden = true; };
            q('rlCalReset').onclick = () => { try { localStorage.removeItem(PPC_KEY); } catch (e) {} rg.value = rlGuess().toFixed(1); rlCalPaint(+rg.value); rlCalDone(); };
            q('rlCalOk').onclick = () => { try { localStorage.setItem(PPC_KEY, (+rg.value).toFixed(2)); } catch (e) {} rlCalDone(); };
        }
        c.hidden = false;
        q('rlCalRange').value = rlPpc().toFixed(1); rlCalPaint(rlPpc());
    }
    function rlCalPaint(p) {
        const card = q('rlCalCard'), area = card.parentElement, wide = CARD_CM * p <= area.clientWidth - 8;   // 화면이 좁으면 카드를 세워요
        card.style.width = (wide ? CARD_CM : CARD_CM2) * p + 'px'; card.style.height = (wide ? CARD_CM2 : CARD_CM) * p + 'px';
        area.style.height = Math.min(innerHeight * .55, (wide ? CARD_CM2 : CARD_CM) * p + 16) + 'px';
    }
    function rlCalDone() {
        q('rlCal').hidden = true;
        if (R.on) { rlSize(); rlPlace(); }
        if (typeof showMsg === 'function') showMsg('📏 자를 맞췄어요!');
    }

    window.rlShow = rlShow; window.rlEnd = rlEnd; window.rlOn = rlOn; window.rlGrab = rlGrab; window.rlHit = rlHit;
    window.rlSnap = rlSnap; window.rlProj = rlProj; window.rlTell = rlTell; window.rlMeasure = rlMeasure;
    window.rlCarry = rlCarry; window.rlMiniAttach = rlMiniAttach; window.rlCupSvg = rlCupSvg; window.rlCalOpen = rlCalOpen;
    window.rlKinds = () => RL_KINDS.map(k => ({ id: k.id, name: k.name })); window.rlKindNow = () => R.on ? R.kind : null; window.rlTopSync = rlTopSync;
})();
