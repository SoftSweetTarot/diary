/* ✂️ 스티커 칼 (도련 · 2026-10-17) : 📒 연필통(js/draw.js)에 색연필과 같이 꽂혀 있어요 → 위로 쏙 뽑으면 스티커 칼
   - 귀여운 스티커 칼이 글쓰기 필기구처럼 기울어진 채 마우스 · 손가락을 따라가요 (칼끝 = 닿은 자리)
   - 페이지의 아무 스티커나 끝에서 끝까지 가로질러 그으면 그 선(분단선)으로 두 조각이 돼요 · 동그랗게 오려 내는 게 아니라 '나누는 선'
   - 선이 여러 스티커와 겹치면 맨 위에 있는 스티커 하나만 잘라요 · 스티커를 먼저 고를 필요 없어요
   - 칼은 ✕ · Esc · 구석 연필통을 톡 할 때까지 남아 있어서 여러 번 연달아 자를 수 있어요
   - 조각은 각각 옮기기 · 꾹 눌러 🗑️ 삭제 (원하지 않는 부분을 잘라서 버려요)
   - 되는 것 : 포인트 · 씰 · 조각 · 모조지스티커 · 🎀 마스킹테이프 · 🧻 떡메모지 (글상자 · 인형 · 액자 · 움직이는 그림은 안 돼요)
   - 자른 조각은 PNG 그림이 돼요 (떡메에 쓴 글씨도 그림 속에 같이 · 테이프는 늘이기 손잡이가 없어져요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (연필통에 칼만 안 꽂혀요) */
(() => {
    'use strict';
    const q = id => document.getElementById(id);
    const KNIFE = '<svg viewBox="0 0 40 120" width="40" height="120" aria-hidden="true">'
        + '<defs><linearGradient id="skBl" x1="0" x2="1"><stop offset="0" stop-color="#f4f7fb"/><stop offset=".55" stop-color="#cfd7e3"/><stop offset="1" stop-color="#aab5c6"/></linearGradient>'
        + '<linearGradient id="skHd" x1="0" x2="1"><stop offset="0" stop-color="#ffb3cb"/><stop offset=".5" stop-color="#ff8fb1"/><stop offset="1" stop-color="#f06f97"/></linearGradient></defs>'
        + '<path d="M13 4h14v30l-7 0-7-8z" fill="url(#skBl)" stroke="#8f9bb0" stroke-width="1"/>'                       // 칼날 (끝이 비스듬)
        + '<path d="M13 4l7 0-7 8z" fill="#fff" opacity=".7"/><path d="M15 14h10M15 22h10" stroke="#9aa6ba" stroke-width=".8" stroke-dasharray="2 2"/>'   // 꺾는 칼날 줄
        + '<rect x="8" y="32" width="24" height="84" rx="10" fill="url(#skHd)" stroke="#d95a84" stroke-width="1.2"/>'      // 말랑한 손잡이
        + '<rect x="11" y="36" width="6" height="72" rx="3" fill="#fff" opacity=".45"/>'
        + '<rect x="16" y="44" width="8" height="18" rx="4" fill="#ffe27a" stroke="#e7b93d" stroke-width="1"/>'            // 칼날 밀개
        + '<path d="M20 86c-3-4-8-2-7 2 1 3 7 7 7 7s6-4 7-7c1-4-4-6-7-2z" fill="#fff"/>'                                   // 하트
        + '<circle cx="20" cy="106" r="3" fill="#fff" opacity=".85"/></svg>';
    const KN_TIP = [13, 4], KN_ANG = 215;              // 칼끝(그림 안 좌표) · 기울기 (칼끝이 왼쪽 아래 · 손잡이는 오른쪽 위 = 글쓰기 필기구와 같은 방향)
    const S = { on: false, room: null, cv: null, kn: null, pts: null, down: false, id: null, busy: false };

    /* 자를 수 있는 것 : 그림이 있는 스티커 · 테이프 · 떡메 */
    function cutKind(el) {
        if (!el || !el.isConnected || el.dataset.doll || el.dataset.frame || el.dataset.cm || el.dataset.sh) return null;
        if (el.dataset.tk) { const b = el.querySelector(':scope > img.tk-bg'); return b && b.naturalWidth ? 'note' : null; }
        if (el.querySelector('textarea')) return null;
        const img = el.querySelector(':scope > img'); if (!img || !img.naturalWidth || img.classList.contains('broken')) return null;
        const s = img.getAttribute('src') || '';
        if (typeof isTapeSrc === 'function' && isTapeSrc(img.dataset.src || s)) return 'tape';
        return /^data:image\/svg/.test(s) ? 'svg' : 'img';
    }
    const elCuttable = el => !!cutKind(el);

    /* ---------- 칼 방 : 화면 전체를 덮는 투명한 판 (그 위에서만 그어요) ---------- */
    function build() {
        let r = q('skRoom'); if (r) return r;
        r = document.createElement('div'); r.id = 'skRoom'; r.className = 'sk-room'; r.hidden = true;
        r.innerHTML = '<canvas class="sk-line" id="skLine"></canvas>'
            + '<div class="sk-tip" id="skTip"><b>✂️ 스티커 칼</b> 자를 스티커를 <b>끝에서 끝까지</b> 가로질러 그어요 · 다 자르면 <b>구석 연필통</b>을 톡<button type="button" class="sk-x" id="skX" aria-label="그만두기">✕</button></div>'
            + '<button type="button" class="pc-mini sk-cup" id="skCup" aria-label="연필통 (칼 꽂기 = 끝)"><span class="pc-mini-tops"><i style="--c:#e2556f"></i><i style="--c:#3d9be0"></i><i style="--c:#ffe14d"></i></span><span class="pc-mini-cup"></span></button>'
            + '<div class="sk-knife" id="skKnife">' + KNIFE + '</div>';
        document.body.appendChild(r);
        ['skX', 'skCup'].forEach(id => { q(id).addEventListener('click', e => { e.stopPropagation(); close(true); }); q(id).addEventListener('pointerdown', e => e.stopPropagation()); });
        r.addEventListener('pointerdown', down); r.addEventListener('pointermove', move);
        r.addEventListener('pointerup', up); r.addEventListener('pointercancel', () => { S.down = false; S.pts = null; paint(); });
        addEventListener('keydown', e => { if (e.key === 'Escape' && S.on) close(); });
        addEventListener('resize', () => { if (S.on) size(); });
        return r;
    }
    function size() {
        const c = S.cv, d = Math.min(2, window.devicePixelRatio || 1);
        c.width = Math.round(innerWidth * d); c.height = Math.round(innerHeight * d); c.style.width = innerWidth + 'px'; c.style.height = innerHeight + 'px';
        c.getContext('2d').setTransform(d, 0, 0, d, 0, 0); paint();
        const pg = q('canvasArea'), cup = q('skCup');                     // 구석 연필통 : 페이지 오른쪽 아래 (글쓰기 연필통과 같은 자리)
        if (pg && cup) { const r = pg.getBoundingClientRect(), vv = window.visualViewport, bot = Math.min(r.bottom, vv ? vv.offsetTop + vv.height : innerHeight); cup.style.left = Math.round(r.right - 62 - 12) + 'px'; cup.style.top = Math.round(bot - 84 - 12) + 'px'; }
    }
    function knifeAt(x, y) {
        const k = S.kn; if (!k) return;
        k.style.transform = `translate(${x - KN_TIP[0]}px, ${y - KN_TIP[1]}px) rotate(${KN_ANG}deg)`;
    }
    function paint() {                                 // 그은 칼선 : 하얀 테두리 + 회색 점선 (칼집 느낌)
        const c = S.cv; if (!c) return; const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
        const p = S.pts; if (!p || p.length < 2) return;
        const path = () => { x.beginPath(); x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) x.lineTo(p[i][0], p[i][1]); };
        x.lineCap = 'round'; x.lineJoin = 'round';
        path(); x.strokeStyle = 'rgba(255,255,255,.95)'; x.lineWidth = 4; x.setLineDash([]); x.stroke();
        path(); x.strokeStyle = '#7d6a78'; x.lineWidth = 1.6; x.setLineDash([5, 3]); x.stroke();
    }
    /* 🖐 연필통에서 칼을 뽑으면 (js/draw.js pcPick) : 뽑은 손 자리에서 칼을 들고 시작 */
    function open(x, y) {
        if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) return;
        if (window.tmClose) tmClose();
        if (typeof selectedElement !== 'undefined' && selectedElement) { selectedElement.classList.remove('selected'); selectedElement = null; if (typeof updateTextPanel === 'function') updateTextPanel(); }
        const r = build(); S.room = r; S.cv = q('skLine'); S.kn = q('skKnife'); S.on = true; S.pts = null; S.down = false;
        r.hidden = false; S.kn.classList.remove('gone', 'in'); size();
        if (x == null) { const b = q('canvasArea').getBoundingClientRect(); x = b.left + b.width / 2; y = b.top + b.height / 2; }
        knifeAt(x, y);
        const t = q('skTip'), say = t.querySelector('.sk-say'); if (say) say.remove();
        if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) {}
    }
    function close(put) {                              // put = 구석 연필통에 쏙 꽂고 끝
        if (!S.on) return;
        S.on = false; S.pts = null; S.down = false; paint();
        const fin = () => { if (S.room) S.room.hidden = true; if (S.kn) S.kn.classList.remove('in'); };
        if (put && S.kn) {
            const m = q('skCup').getBoundingClientRect();
            S.kn.classList.add('in'); S.kn.style.transform = `translate(${m.left + m.width / 2 - KN_TIP[0]}px, ${m.top + 6 - KN_TIP[1]}px) rotate(180deg) scale(.35)`;
            setTimeout(fin, 280);
        } else fin();
    }
    function down(e) {
        if (e.button > 0 || S.busy) return;
        e.preventDefault(); S.down = true; S.id = e.pointerId; S.pts = [[e.clientX, e.clientY]];
        try { S.room.setPointerCapture(e.pointerId); } catch (er) {}
        knifeAt(e.clientX, e.clientY); paint();
    }
    function move(e) {
        knifeAt(e.clientX, e.clientY);                 // 🖱 마우스는 누르지 않아도 칼이 따라와요
        if (!S.down || e.pointerId !== S.id) return;
        const p = S.pts, l = p[p.length - 1];
        if (Math.hypot(e.clientX - l[0], e.clientY - l[1]) >= 3) { p.push([e.clientX, e.clientY]); paint(); }
    }
    /* 그은 선이 지나간 스티커 중 맨 위부터 하나씩 잘라 봐요 → 처음 잘린 것 하나만 */
    function crossed(pts) {
        const ca = q('canvasArea'); if (!ca) return [];
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); });
        const all = [...ca.querySelectorAll(':scope > .element-box')];
        return all.map((el, i) => ({ el, i, z: parseInt(el.style.zIndex) || 0 }))
            .filter(o => { if (!cutKind(o.el)) return false; const r = o.el.getBoundingClientRect(); return r.right > x0 && r.left < x1 && r.bottom > y0 && r.top < y1; })
            .sort((a, b) => b.z - a.z || b.i - a.i).map(o => o.el);
    }
    async function up(e) {
        if (!S.down || e.pointerId !== S.id) return;
        S.down = false;
        const pts = S.pts; if (!pts || pts.length < 2) { S.pts = null; paint(); return; }
        S.busy = true; let ok = false;
        try { for (const el of crossed(pts)) { if (await split(el, pts)) { ok = true; break; } } } catch (er) { console.warn('자르기', er); }
        S.busy = false; S.pts = null; paint();
        if (!ok) { hint('스티커를 <b>끝에서 끝까지</b> 가로질러야 나뉘어요 ✂️'); return; }
        const say = q('skTip').querySelector('.sk-say'); if (say) say.remove();
        if (navigator.vibrate) try { navigator.vibrate(8); } catch (er) {}
    }
    function hint(h) { const t = q('skTip'); if (!t) return; const b = t.querySelector('.sk-say') || t.appendChild(Object.assign(document.createElement('span'), { className: 'sk-say' })); b.innerHTML = h; t.classList.remove('shake'); void t.offsetWidth; t.classList.add('shake'); }

    /* ---------- 그림 준비 : 스티커 안쪽(테두리 · 여백 뺀 칸)을 캔버스에 그대로 그려요 ---------- */
    const load = src => new Promise((ok, no) => { const i = new Image(); if (!/^(data|blob):/.test(src)) i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = no; i.src = src; });
    function wrapLines(x, text, w) {                    // 떡메 글씨 : 칸 너비에 맞춰 줄바꿈
        const out = [];
        String(text).split('\n').forEach(par => {
            let line = '';
            for (const ch of par) { const t = line + ch; if (x.measureText(t).width > w && line) { out.push(line); line = ch; } else line = t; }
            out.push(line);
        });
        return out;
    }
    async function render(el, kind) {
        const W = el.offsetWidth, H = el.offsetHeight, B = 1, P = 6, cw = W - 2 * (B + P), ch = H - 2 * (B + P);   // .element-box : 테두리 1 · 여백 6
        const img = el.querySelector(kind === 'note' ? ':scope > img.tk-bg' : ':scope > img');
        let R = 2;
        if (kind === 'img') R = Math.max(1, Math.min(4, img.naturalWidth / (img.offsetWidth || 1)));   // 원본 해상도 그대로
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(cw * R)); c.height = Math.max(1, Math.round(ch * R));
        const x = c.getContext('2d'); x.scale(R, R);
        const ox = img.offsetLeft - P, oy = img.offsetTop - P, iw = img.offsetWidth, ih = img.offsetHeight;
        if (kind === 'tape') {                          // 🎀 SVG 테이프는 붙인 길이 그대로 다시 그려요
            const s = img.getAttribute('src').replace(/width%3D%22100%25%22%20height%3D%22100%25%22/, `width%3D%22${Math.round(iw)}%22%20height%3D%22${Math.round(ih)}%22`);   // 무늬 크기는 붙인 그대로 (캔버스가 R배로 그려요)
            x.drawImage(await load(s), ox, oy, iw, ih);
        } else {
            x.drawImage(await load(kind === 'note' ? (el.dataset.tkSrc || img.src) : (img.currentSrc || img.src)), ox, oy, iw, ih);
        }
        if (kind === 'note') {                          // 🧻 떡메에 쓴 글씨도 그림 속으로
            const ta = el.querySelector('textarea');
            if (ta && ta.value.trim()) {
                const cs = getComputedStyle(ta), pl = parseFloat(cs.paddingLeft) || 0, pr = parseFloat(cs.paddingRight) || 0, pt = parseFloat(cs.paddingTop) || 0;
                const fs = parseFloat(cs.fontSize) || 16, lh = parseFloat(cs.lineHeight) || fs * 1.3;
                x.font = `${cs.fontStyle} ${cs.fontWeight} ${fs}px ${cs.fontFamily}`; x.fillStyle = cs.color; x.textBaseline = 'middle';
                const tx = ta.offsetLeft - P + pl, ty = ta.offsetTop - P + pt, tw = ta.clientWidth - pl - pr;
                const al = cs.textAlign;
                wrapLines(x, ta.value, tw).forEach((ln, i) => {
                    const lw = x.measureText(ln).width, lx = al === 'center' ? tx + (tw - lw) / 2 : al === 'right' || al === 'end' ? tx + tw - lw : tx;
                    x.fillText(ln, lx, ty + lh * i + lh / 2);
                });
            }
        }
        return { c, R, cw, ch, W, H, B, P };
    }

    /* ---------- 자르기 : 그은 선을 양 끝으로 길게 늘여 그림을 두 쪽으로 ---------- */
    async function split(el, pts) {
        const kind = cutKind(el); if (!kind) return false;
        const g = await render(el, kind), { c, R, W, H, B, P } = g;
        const ca = q('canvasArea'), car = ca.getBoundingClientRect(), k = car.width / (ca.offsetWidth || car.width) || 1;
        const s = parseFloat(el.dataset.scale) || 1, rot = (parseFloat(el.dataset.rotation) || 0) * Math.PI / 180;
        const px = parseFloat(el.dataset.posX) || 0, py = parseFloat(el.dataset.posY) || 0, cx = px + W / 2, cy = py + H / 2;
        const toLocal = ([X, Y]) => {                   // 화면 → 스티커 그림 좌표 (캔버스 px)
            const ux = (X - car.left) / k - cx, uy = (Y - car.top) / k - cy;
            const lx = (ux * Math.cos(-rot) - uy * Math.sin(-rot)) / s + W / 2, ly = (ux * Math.sin(-rot) + uy * Math.cos(-rot)) / s + H / 2;
            return [(lx - B - P) * R, (ly - B - P) * R];
        };
        const L = pts.map(toLocal), n = L.length, cwR = c.width, chR = c.height, BIG = 4 * (cwR + chR);
        const cd = c.getContext('2d').getImageData(0, 0, cwR, chR).data;
        const solid = ([X, Y]) => { const xi = Math.round(X), yi = Math.round(Y); return xi >= 0 && yi >= 0 && xi < cwR && yi < chR && cd[(yi * cwR + xi) * 4 + 3] > 24; };
        if (solid(L[0]) || solid(L[n - 1])) return false;                       // 시작 · 끝이 스티커 밖이어야 '가로지른' 거예요 (안에서만 그으면 안 잘려요)
        const unit = (a, b) => { const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1; return [(a[0] - b[0]) / d, (a[1] - b[1]) / d]; };
        const back = Math.min(n - 1, 3), dS = unit(L[0], L[back]), dE = unit(L[n - 1], L[n - 1 - back]);
        const S0 = [L[0][0] + dS[0] * BIG, L[0][1] + dS[1] * BIG], E0 = [L[n - 1][0] + dE[0] * BIG, L[n - 1][1] + dE[1] * BIG];
        const ax = unit(E0, S0), nv = [-ax[1], ax[0]];
        const poly = [S0, ...L, E0, [E0[0] + nv[0] * BIG * 2, E0[1] + nv[1] * BIG * 2], [S0[0] + nv[0] * BIG * 2, S0[1] + nv[1] * BIG * 2]];
        const half = keep => {                          // keep = true : 다각형 안쪽 · false : 바깥쪽
            const o = document.createElement('canvas'); o.width = cwR; o.height = chR; const x = o.getContext('2d');
            x.drawImage(c, 0, 0);
            x.globalCompositeOperation = keep ? 'destination-in' : 'destination-out';
            x.beginPath(); x.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) x.lineTo(poly[i][0], poly[i][1]); x.closePath(); x.fill();
            return o;
        };
        const A = half(true), Bc = half(false);
        const trim = cv => {                            // 투명한 가장자리 잘라내기 + 남은 칸 수
            const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let x0 = cv.width, y0 = cv.height, x1 = -1, y1 = -1, cnt = 0;
            for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) if (d[(y * cv.width + x) * 4 + 3] > 24) { cnt++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            return cnt ? { x0, y0, x1, y1, cnt } : null;
        };
        const ta = trim(A), tb = trim(Bc);
        if (!ta || !tb) return false;
        const tot = ta.cnt + tb.cnt, min = Math.max(30 * R * R, tot * .004);
        if (ta.cnt < min || tb.cnt < min) return false;   // 가장자리만 살짝 스친 건 자른 게 아니에요
        const z = parseInt(el.style.zIndex) || 1, float = el.dataset.float, rotDeg = parseFloat(el.dataset.rotation) || 0;
        const made = [];
        for (const [cv, t, side] of [[A, ta, 1], [Bc, tb, -1]]) {
            const w = t.x1 - t.x0 + 1, h = t.y1 - t.y0 + 1, o = document.createElement('canvas'); o.width = w; o.height = h;
            o.getContext('2d').drawImage(cv, t.x0, t.y0, w, h, 0, 0, w, h);
            const url = o.toDataURL('image/png');
            const lcx = (t.x0 + w / 2) / R + B + P - W / 2, lcy = (t.y0 + h / 2) / R + B + P - H / 2;   // 조각 가운데 (스티커 가운데 기준 · 돌리기 전)
            const gap = 2.5;                                                                         // 칼선 틈 : 두 조각이 살짝 벌어져요
            const pcx = cx + s * (lcx * Math.cos(rot) - lcy * Math.sin(rot)) + side * nv[0] * gap, pcy = cy + s * (lcx * Math.sin(rot) + lcy * Math.cos(rot)) + side * nv[1] * gap;
            if (!addImage(url)) return false;
            const ne = ca.querySelector(':scope > .element-box:last-child'), im = ne.querySelector(':scope > img');
            ne.style.width = Math.max(4, Math.round(w / R * 10) / 10) + 'px';
            if (float) ne.dataset.float = float;
            ne.dataset.cut = 1;
            if (!(im.complete && im.naturalWidth)) await new Promise(r => { im.addEventListener('load', r, { once: true }); im.addEventListener('error', r, { once: true }); });
            const nx = Math.round(pcx - ne.offsetWidth / 2), ny = Math.round(pcy - ne.offsetHeight / 2);
            ne.dataset.posX = nx; ne.dataset.posY = ny; ne.dataset.scale = s; ne.dataset.rotation = rotDeg; ne.style.zIndex = z;
            ne.style.transform = `translate(${nx}px, ${ny}px) scale(${s}) rotate(${rotDeg}deg)`;
            ne.classList.remove('selected'); made.push(ne);
        }
        el.remove();
        if (typeof selectedElement !== 'undefined') { selectedElement = null; if (typeof updateTextPanel === 'function') updateTextPanel(); }
        made.forEach(e => { e.classList.add('sk-new'); setTimeout(() => e.classList.remove('sk-new'), 700); });
        if (typeof saveData === 'function') saveData(false);
        return true;
    }

    window.elCuttable = elCuttable; window.skKnife = open; window.skClose = close; window.skKnifeSvg = () => KNIFE;
})();
