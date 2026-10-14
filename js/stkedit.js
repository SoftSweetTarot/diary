/* 말랑달콤 다이어리 - js/stkedit.js
   🎨 스티커 다듬기 (도련 · 2026-10-15) : 페이지에 붙인 뒤 꾹 누르기(오른쪽 클릭) 메뉴의 🎨 다듬기 (js/elements.js elEdit · js/leafpad.js 속지)
   - 붙이기 전 창(씰 · 포인트 · 📒 수첩)에는 없어요 : 다듬기는 붙인 뒤 고를 것을 골라 고치는 것 (도련 · 2026-10-15)
   - 🎨 색 : 색 돌리기 · 진하기 · 밝기 · 원래 / 흑백 / 빈티지 / 파스텔 / 쨍하게
   - ↔ 뒤집기 : 좌우 · 상하
   - ✂️ 자르기 : 손가락 · 네모 · 둥근 네모 · 동그라미 · 하트 · 별 · 꽃 모양 (끌어서 그리고, 안쪽을 끌면 옮겨요)
   - 🧽 지우개 : 손가락으로 문질러 지워요 (굵기)
   - ✏️ 글씨 : 쓰고 → 그림을 누른 자리에 놓여요 (끌면 옮겨요) · 색 · 크기
   - ✨ 반짝이 : 금 · 은 · 무지개 가루를 뿌려요 (그림 위에만)
   - ↶ 되돌리기 · 처음으로 · ✓ 다듬기 끝 → PNG 그림 (투명한 가장자리는 잘라내요)
   - 색 계산은 직접 해요 (캔버스 filter 를 못 쓰는 예전 사파리에서도 같은 결과)
   openStickerEdit(src, opt) → Promise<'data:image/png…' | null(그만두기)>
     opt.tools : 쓸 도구만 ['color', 'flip', …] (하나뿐이면 도구 줄을 숨겨요) · opt.max : 긴 변 (기본 600)
     opt.trim === false : 투명한 가장자리를 자르지 않아요 · opt.jpeg : JPG 로 · opt.matrix : 그림 대신 SVG feColorMatrix 값 (🎀 마테)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (🎨 다듬기 버튼만 안 보여요) */

        const SE_MAX = 600, SE_UNDO = 25;
        const SE_TOOLS = [['color', '🎨', '색'], ['flip', '↔', '뒤집기'], ['crop', '✂️', '자르기'], ['erase', '🧽', '지우개'], ['text', '✏️', '글씨'], ['glit', '✨', '반짝이']];
        const SE_LOOKS = [['원래', { s: 100, b: 100, sep: 0, pas: 0 }], ['흑백', { s: 0, b: 100, sep: 0, pas: 0 }], ['빈티지', { s: 80, b: 104, sep: 60, pas: 0 }], ['파스텔', { s: 70, b: 110, sep: 0, pas: 30 }], ['쨍하게', { s: 150, b: 102, sep: 0, pas: 0 }]];
        const SE_HUES = [['원래', 0, '#ff8fb2'], ['보라', 40, '#b48cf2'], ['파랑', 100, '#6fb0ff'], ['민트', 160, '#5fd1b0'], ['노랑', -130, '#ffd166'], ['주황', -60, '#ffa36c']];
        const SE_INK = ['#5a3a48', '#ffffff', '#ff5c8a', '#9b74ff', '#3f9df5', '#22a67f'];
        const SE_CROPS = [['free', '✍️', '손가락'], ['rect', '⬜', '네모'], ['round', '▢', '둥근 네모'], ['circle', '⚪', '동그라미'], ['heart', '🤍', '하트'], ['star', '⭐', '별'], ['flower', '🌸', '꽃']];
        const SE_GLIT = [['', '없음'], ['gold', '금'], ['silver', '은'], ['rainbow', '무지개']];
        const se = { on: false, done: null, opt: {}, tool: 'color', cshape: 'free', W: 0, H: 0, src: null, mask: null, out: null, colored: null, ckey: '', st: null, undo: [], view: null, vk: 1, drag: null, textSel: -1 };
        const seq = id => document.getElementById(id);
        const seMk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
        const seFresh = () => ({ hue: 0, s: 100, b: 100, sep: 0, pas: 0, fx: 1, fy: 1, crop: null, glit: '', gd: 50, texts: [] });

        /* ---------- 색 : 3×3 색 행렬 (CSS hue-rotate · saturate · sepia 와 같은 식) ---------- */
        function seMul(A, B) { const R = []; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j]; return R; }
        function seMatrix(st) {
            const a = st.hue * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), k = st.s / 100, p = st.sep / 100;
            const H = [.213 + c * .787 - s * .213, .715 - c * .715 - s * .715, .072 - c * .072 + s * .928, .213 - c * .213 + s * .143, .715 + c * .285 + s * .140, .072 - c * .072 - s * .283, .213 - c * .213 - s * .787, .715 - c * .715 + s * .715, .072 + c * .928 + s * .072];
            const S = [.213 + .787 * k, .715 - .715 * k, .072 - .072 * k, .213 - .213 * k, .715 + .285 * k, .072 - .072 * k, .213 - .213 * k, .715 - .715 * k, .072 + .928 * k];
            const P = [1 - .607 * p, .769 * p, .189 * p, .349 * p, 1 - .314 * p, .168 * p, .272 * p, .534 * p, 1 - .869 * p];
            return seMul(P, seMul(S, H));
        }
        function seColored() {
            const st = se.st, key = [st.hue, st.s, st.b, st.sep, st.pas].join(',');
            if (se.colored && se.ckey === key) return se.colored;
            const c = seMk(se.W, se.H), x = c.getContext('2d'); x.drawImage(se.src, 0, 0);
            if (key !== '0,100,100,0,0') {
                const id = x.getImageData(0, 0, se.W, se.H), d = id.data, M = seMatrix(st), br = st.b / 100, pa = st.pas / 100;
                for (let i = 0; i < d.length; i += 4) {
                    if (!d[i + 3]) continue;
                    const r = d[i], g = d[i + 1], b = d[i + 2];
                    let R = (M[0] * r + M[1] * g + M[2] * b) * br, G = (M[3] * r + M[4] * g + M[5] * b) * br, B = (M[6] * r + M[7] * g + M[8] * b) * br;
                    if (pa) { R += (255 - R) * pa; G += (255 - G) * pa; B += (255 - B) * pa; }
                    d[i] = R; d[i + 1] = G; d[i + 2] = B;                       // Uint8ClampedArray 가 0~255 로 맞춰요
                }
                x.putImageData(id, 0, 0);
            }
            se.colored = c; se.ckey = key; return c;
        }

        /* ---------- 반짝이 가루 (그림 위에만 · 같은 설정이면 늘 같은 자리) ---------- */
        function seRand(seed) { let t = seed >>> 0; return () => { t += 0x6D2B79F5; let r = Math.imul(t ^ t >>> 15, 1 | t); r ^= r + Math.imul(r ^ r >>> 7, 61 | r); return ((r ^ r >>> 14) >>> 0) / 4294967296; }; }
        function seGlitter(x, kind, dens) {
            const rnd = seRand(dens * 7919 + kind.length), n = Math.round(se.W * se.H / 900 * dens / 50), u = Math.max(1.2, se.W / 260);
            x.save(); x.globalCompositeOperation = 'source-atop';
            for (let i = 0; i < n; i++) {
                const px = rnd() * se.W, py = rnd() * se.H, r = u * (.6 + rnd() * 1.4), star = rnd() < .18;
                x.globalAlpha = .55 + rnd() * .45;
                x.fillStyle = kind === 'gold' ? ['#fff3b0', '#f2c14e', '#ffffff'][i % 3] : kind === 'silver' ? ['#ffffff', '#dfe6f0', '#c9d3e0'][i % 3] : `hsl(${Math.floor(rnd() * 360)},90%,${75 + rnd() * 15}%)`;
                if (star) { const R = r * 3; x.beginPath(); x.moveTo(px, py - R); x.quadraticCurveTo(px, py, px + R, py); x.quadraticCurveTo(px, py, px, py + R); x.quadraticCurveTo(px, py, px - R, py); x.quadraticCurveTo(px, py, px, py - R); x.fill(); }
                else { x.beginPath(); x.arc(px, py, r, 0, Math.PI * 2); x.fill(); }
            }
            x.restore();
        }

        /* ---------- 합치기 : 색 → 뒤집기 → 지우개 → 반짝이 → 글씨 ---------- */
        function seCompose() {
            const st = se.st, c = se.out, x = c.getContext('2d');
            x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, se.W, se.H);
            x.save(); x.translate(st.fx < 0 ? se.W : 0, st.fy < 0 ? se.H : 0); x.scale(st.fx, st.fy); x.drawImage(seColored(), 0, 0); x.restore();
            x.save(); x.globalCompositeOperation = 'destination-out'; x.drawImage(se.mask, 0, 0); x.restore();
            if (st.glit) seGlitter(x, st.glit, st.gd);
            st.texts.forEach(t => {
                x.save(); x.font = `700 ${t.size}px 'Gaegu', 'Jua', cursive`; x.textAlign = 'center'; x.textBaseline = 'middle';
                x.lineJoin = 'round'; x.lineWidth = Math.max(3, t.size / 6); x.strokeStyle = t.color === '#ffffff' ? '#5a3a48' : '#ffffff';
                x.strokeText(t.t, t.x, t.y); x.fillStyle = t.color; x.fillText(t.t, t.x, t.y); x.restore();
            });
            return c;
        }
        /* ---------- ✂️ 자르기 모양 (그림 좌표로 길을 그려요) ---------- */
        function seCropPath(x, c) {
            const { x: X, y: Y, w: W, h: H } = c, cx = X + W / 2, cy = Y + H / 2;
            x.beginPath();
            if (c.sh === 'free') { const p = c.pts; x.moveTo(p[0][0], p[0][1]); for (let i = 1; i < p.length; i++) { const m = [(p[i - 1][0] + p[i][0]) / 2, (p[i - 1][1] + p[i][1]) / 2]; x.quadraticCurveTo(p[i - 1][0], p[i - 1][1], m[0], m[1]); } x.lineTo(p[p.length - 1][0], p[p.length - 1][1]); }
            else if (c.sh === 'rect') x.rect(X, Y, W, H);
            else if (c.sh === 'round') { const r = Math.min(W, H) * .22; x.moveTo(X + r, Y); x.arcTo(X + W, Y, X + W, Y + H, r); x.arcTo(X + W, Y + H, X, Y + H, r); x.arcTo(X, Y + H, X, Y, r); x.arcTo(X, Y, X + W, Y, r); }
            else if (c.sh === 'circle') x.ellipse(cx, cy, W / 2, H / 2, 0, 0, Math.PI * 2);
            else if (c.sh === 'heart') {
                const P = (u, v) => [X + u * W, Y + (v - .15) / .85 * H];
                const cv = (a, b, d) => { const A = P(...a), B = P(...b), D = P(...d); x.bezierCurveTo(A[0], A[1], B[0], B[1], D[0], D[1]); };
                const s0 = P(.5, .3); x.moveTo(s0[0], s0[1]);
                cv([.5, .27], [.45, .15], [.25, .15]); cv([0, .15], [0, .45], [0, .45]); cv([0, .62], [.2, .82], [.5, 1]);
                cv([.8, .82], [1, .62], [1, .45]); cv([1, .45], [1, .15], [.75, .15]); cv([.6, .15], [.5, .27], [.5, .3]);
            } else {                                                            // 별 · 꽃 : 가운데에서 도는 모양
                const n = c.sh === 'star' ? 10 : 120;
                for (let i = 0; i <= n; i++) {
                    const a = -Math.PI / 2 + i / n * Math.PI * 2;
                    const r = c.sh === 'star' ? (i % 2 ? .42 : 1) : .68 + .32 * Math.abs(Math.cos(a * 3 - Math.PI * 1.5));
                    const px = c.sh === 'star' ? cx + Math.cos(a) * r * W / 1.902 : cx + Math.cos(a) * r * W / 2;
                    const py = c.sh === 'star' ? Y + (Math.sin(a) * r + 1) / 1.809 * H : cy + Math.sin(a) * r * H / 2;   // 별은 꼭짓점이 네모에 꼭 맞게
                    if (i) x.lineTo(px, py); else x.moveTo(px, py);
                }
            }
            x.closePath();
        }
        const seBox = pts => { let l = 1e9, t = 1e9, r = -1e9, b = -1e9; pts.forEach(([a, c]) => { l = Math.min(l, a); r = Math.max(r, a); t = Math.min(t, c); b = Math.max(b, c); }); return { x: l, y: t, w: r - l, h: b - t }; };
        function seDraw() {
            if (!se.on) return;
            const out = seCompose(), v = se.view, x = v.getContext('2d'), k = se.vk, dpr = v.width / v.clientWidth || 1;
            x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, v.width, v.height);
            x.setTransform(dpr * k, 0, 0, dpr * k, 0, 0); x.drawImage(out, 0, 0);
            const cr = se.st.crop;
            if (cr) {                                                            // 남길 곳 바깥은 어둡게
                x.fillStyle = 'rgba(60,30,45,.5)'; x.fillRect(0, 0, se.W, se.H);
                x.save(); seCropPath(x, cr); x.clip(); x.clearRect(0, 0, se.W, se.H); x.drawImage(out, 0, 0); x.restore();
                seCropPath(x, cr); x.setLineDash([6 / k, 4 / k]); x.lineWidth = 2 / k; x.strokeStyle = '#fff'; x.stroke(); x.setLineDash([]);
            }
            const d = se.drag;
            if (d && d.pts && d.pts.length > 1) {                               // ✍️ 손가락으로 그리는 중
                x.beginPath(); x.moveTo(d.pts[0][0], d.pts[0][1]); d.pts.forEach(q => x.lineTo(q[0], q[1]));
                x.lineWidth = 3 / k; x.lineCap = x.lineJoin = 'round'; x.strokeStyle = '#ff5c8a'; x.stroke();
            }
            if (se.tool === 'text' && se.textSel >= 0 && se.st.texts[se.textSel]) {
                const t = se.st.texts[se.textSel], ox = out.getContext('2d'); ox.font = `700 ${t.size}px 'Gaegu', 'Jua', cursive`;
                const w = ox.measureText(t.t).width + 12, h = t.size + 10;
                x.setLineDash([5 / k, 4 / k]); x.lineWidth = 1.5 / k; x.strokeStyle = '#c2385c'; x.strokeRect(t.x - w / 2, t.y - h / 2, w, h); x.setLineDash([]);
            }
        }
        let seRaf = 0;
        const seLater = () => { cancelAnimationFrame(seRaf); seRaf = requestAnimationFrame(seDraw); };

        /* ---------- 되돌리기 ---------- */
        function seSnap() {
            se.undo.push({ st: JSON.parse(JSON.stringify(se.st)), mask: se.mask.getContext('2d').getImageData(0, 0, se.W, se.H) });
            if (se.undo.length > SE_UNDO) se.undo.shift();
            seBtns();
        }
        function seUndo() {
            const u = se.undo.pop(); if (!u) return;
            se.st = u.st; se.mask.getContext('2d').putImageData(u.mask, 0, 0); se.textSel = -1;
            sePanel(); seBtns(); seLater();
        }
        function seReset() {
            seSnap(); se.st = seFresh(); se.mask.getContext('2d').clearRect(0, 0, se.W, se.H); se.textSel = -1;
            sePanel(); seLater();
        }
        function seBtns() { const u = seq('seUndo'); if (u) u.disabled = !se.undo.length; }

        /* ---------- 화면 ---------- */
        function seBuild() {
            if (seq('seRoom')) return;
            const el = document.createElement('div'); el.id = 'seRoom'; el.className = 'se-room'; el.hidden = true;
            el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', '스티커 다듬기');
            el.innerHTML = `<div class="se-box">
                <div class="se-top"><b>🎨 스티커 다듬기</b><button type="button" class="se-x" id="seX" aria-label="그만두기">✕</button></div>
                <div class="se-stage" id="seStage"><canvas id="seView"></canvas></div>
                <div class="se-tools" id="seTools" role="tablist"></div>
                <div class="se-panel" id="sePanel"></div>
                <div class="se-foot"><button type="button" class="se-b" id="seUndo">↶ 되돌리기</button><button type="button" class="se-b" id="seReset">처음으로</button><button type="button" class="se-b se-ok" id="seOk">✓ 다듬기 끝</button></div>
            </div>`;
            document.body.appendChild(el);
            seq('seX').onclick = () => seClose(null);
            seq('seUndo').onclick = seUndo; seq('seReset').onclick = seReset;
            seq('seOk').onclick = () => { const r = seExport(); if (!r) { showMsg('그림이 다 지워졌어요.<br><span style="font-size:12px;color:#777;">↶ 되돌리기로 살려 주세요.</span>'); return; } se.undo = []; seClose(r); };
            seq('seTools').onclick = e => { const b = e.target.closest('[data-t]'); if (b) { se.tool = b.dataset.t; se.textSel = -1; sePanel(); seLater(); } };
            const v = seq('seView');
            v.addEventListener('pointerdown', seDown); v.addEventListener('pointermove', seMove);
            v.addEventListener('pointerup', seUp); v.addEventListener('pointercancel', seUp);
            el.addEventListener('keydown', e => { if (e.key === 'Escape') seClose(null); });
            window.addEventListener('resize', () => { if (se.on) seFit(); });
            if (window.ResizeObserver) new ResizeObserver(() => { if (se.on) seFit(); }).observe(seq('seStage'));   // 아래 칸이 늘거나 줄면 그림도 맞춰요
        }
        function seFit() {
            const v = se.view, box = seq('seStage'), dpr = Math.min(window.devicePixelRatio || 1, 2);
            const mw = box.clientWidth - 16, mh = box.clientHeight - 16;
            se.vk = Math.min(mw / se.W, mh / se.H, 2);
            v.style.width = Math.round(se.W * se.vk) + 'px'; v.style.height = Math.round(se.H * se.vk) + 'px';
            v.width = Math.round(se.W * se.vk * dpr); v.height = Math.round(se.H * se.vk * dpr);
            seLater();
        }
        const seRange = (id, label, min, max, val, unit) => `<label class="se-r" for="${id}"><span>${label}</span><input type="range" id="${id}" min="${min}" max="${max}" value="${val}"><output id="${id}O">${val}${unit || ''}</output></label>`;
        function sePanel() {
            const p = seq('sePanel'), st = se.st, t = se.tool;
            seq('seTools').querySelectorAll('[data-t]').forEach(b => b.setAttribute('aria-selected', b.dataset.t === t));
            seq('seView').dataset.tool = t;
            if (t === 'color') {
                p.innerHTML = `<div class="se-chips">${SE_HUES.map(([n, h, c]) => `<button type="button" class="se-c${st.hue === h ? ' on' : ''}" data-hue="${h}"><i style="background:${c}"></i>${n}</button>`).join('')}</div>
                    <div class="se-chips">${SE_LOOKS.map(([n, o]) => `<button type="button" class="se-c${o.s === st.s && o.b === st.b && o.sep === st.sep && o.pas === st.pas ? ' on' : ''}" data-look="${n}">${n}</button>`).join('')}</div>
                    ${seRange('seHue', '색 돌리기', -180, 180, st.hue, '°')}${seRange('seSat', '진하기', 0, 200, st.s, '%')}${seRange('seBri', '밝기', 50, 150, st.b, '%')}`;
                p.querySelectorAll('[data-hue]').forEach(b => b.onclick = () => { seSnap(); st.hue = +b.dataset.hue; sePanel(); seLater(); });
                p.querySelectorAll('[data-look]').forEach(b => b.onclick = () => { seSnap(); Object.assign(st, SE_LOOKS.find(l => l[0] === b.dataset.look)[1]); sePanel(); seLater(); });
                [['seHue', 'hue', '°'], ['seSat', 's', '%'], ['seBri', 'b', '%']].forEach(([id, k, u]) => {
                    const r = seq(id); r.addEventListener('pointerdown', seSnap, { once: true }); r.addEventListener('keydown', seSnap, { once: true });
                    r.oninput = () => { st[k] = +r.value; seq(id + 'O').textContent = r.value + u; seLater(); };
                    r.onchange = () => sePanel();
                });
            } else if (t === 'flip') {
                p.innerHTML = `<div class="se-chips"><button type="button" class="se-c se-big" data-f="x">↔ 좌우 뒤집기</button><button type="button" class="se-c se-big" data-f="y">↕ 위아래 뒤집기</button></div>`;
                p.querySelectorAll('[data-f]').forEach(b => b.onclick = () => { seSnap(); if (b.dataset.f === 'x') st.fx *= -1; else st.fy *= -1; seLater(); });
            } else if (t === 'crop') {
                const free = se.cshape === 'free';
                p.innerHTML = `<div class="se-chips">${SE_CROPS.map(([k, ic, n]) => `<button type="button" class="se-c${se.cshape === k ? ' on' : ''}" data-cs="${k}" aria-pressed="${se.cshape === k}">${ic} ${n}</button>`).join('')}</div>
                    <p class="se-tip">${free ? '남길 곳을 손가락으로 <b>빙 둘러</b> 그려요' : '그림 위를 끌어서 <b>남길 곳</b>을 그려요'}${st.crop ? ' · 안쪽을 끌면 옮겨요' : ''}</p>
                    <div class="se-chips"><button type="button" class="se-c" id="seCropNo"${st.crop ? '' : ' disabled'}>자르기 없애기</button></div>`;
                p.querySelectorAll('[data-cs]').forEach(b => b.onclick = () => {
                    se.cshape = b.dataset.cs;
                    if (st.crop && se.cshape !== 'free' && st.crop.sh !== se.cshape) { seSnap(); st.crop = { sh: se.cshape, x: st.crop.x, y: st.crop.y, w: st.crop.w, h: st.crop.h }; }   // 그린 자리 그대로 모양만 바꿔요
                    sePanel(); seLater();
                });
                seq('seCropNo').onclick = () => { seSnap(); st.crop = null; sePanel(); seLater(); };
            } else if (t === 'erase') {
                p.innerHTML = `<p class="se-tip">지울 곳을 손가락으로 문질러요</p>${seRange('seEr', '지우개 굵기', 4, 60, se.er || 18, 'px')}`;
                const r = seq('seEr'); r.oninput = () => { se.er = +r.value; seq('seErO').textContent = r.value + 'px'; };
            } else if (t === 'text') {
                const cur = st.texts[se.textSel];
                p.innerHTML = `<div class="se-row"><label for="seTxt" class="se-vh">글씨</label><input id="seTxt" maxlength="20" placeholder="글씨를 쓰고 그림을 눌러요" value="${cur ? cur.t.replace(/"/g, '&quot;') : ''}"><button type="button" class="se-c" id="seTxtDel"${cur ? '' : ' disabled'}>지우기</button></div>
                    <div class="se-chips">${SE_INK.map(c => `<button type="button" class="se-c se-ink${(cur ? cur.color : se.ink || SE_INK[0]) === c ? ' on' : ''}" data-ink="${c}" aria-label="글씨 색 ${c}"><i style="background:${c}"></i></button>`).join('')}</div>
                    ${seRange('seTsz', '크기', 14, 120, cur ? cur.size : se.tsz || 44, 'px')}`;
                const inp = seq('seTxt');
                inp.oninput = () => { const c = st.texts[se.textSel]; if (c) { c.t = inp.value; seLater(); } };
                inp.addEventListener('focus', () => { if (st.texts[se.textSel]) seSnap(); }, { once: true });
                seq('seTxtDel').onclick = () => { seSnap(); st.texts.splice(se.textSel, 1); se.textSel = -1; sePanel(); seLater(); };
                p.querySelectorAll('[data-ink]').forEach(b => b.onclick = () => { se.ink = b.dataset.ink; const c = st.texts[se.textSel]; if (c) { seSnap(); c.color = se.ink; } sePanel(); seLater(); });
                const r = seq('seTsz'); r.oninput = () => { se.tsz = +r.value; seq('seTszO').textContent = r.value + 'px'; const c = st.texts[se.textSel]; if (c) { c.size = se.tsz; seLater(); } };
                r.addEventListener('pointerdown', () => { if (st.texts[se.textSel]) seSnap(); }, { once: true });
            } else if (t === 'glit') {
                p.innerHTML = `<div class="se-chips">${SE_GLIT.map(([k, n]) => `<button type="button" class="se-c${st.glit === k ? ' on' : ''}" data-g="${k}">${n}</button>`).join('')}</div>${st.glit ? seRange('seGd', '가루 양', 10, 100, st.gd, '') : ''}`;
                p.querySelectorAll('[data-g]').forEach(b => b.onclick = () => { seSnap(); st.glit = b.dataset.g; sePanel(); seLater(); });
                const r = seq('seGd'); if (r) { r.addEventListener('pointerdown', seSnap, { once: true }); r.oninput = () => { st.gd = +r.value; seq('seGdO').textContent = r.value; seLater(); }; r.onchange = () => sePanel(); }
            }
        }

        /* ---------- 손가락 (그림 좌표) ---------- */
        const sePt = e => { const r = se.view.getBoundingClientRect(); return [(e.clientX - r.left) / se.vk, (e.clientY - r.top) / se.vk]; };
        function seErase(a, b) {
            const x = se.mask.getContext('2d'); x.strokeStyle = '#000'; x.fillStyle = '#000'; x.lineCap = 'round'; x.lineWidth = (se.er || 18) / se.vk;
            x.beginPath(); x.moveTo(a[0], a[1]); x.lineTo(b[0], b[1]); x.stroke();
        }
        function seTextAt(P) {
            const x = se.out.getContext('2d');
            for (let i = se.st.texts.length - 1; i >= 0; i--) {
                const t = se.st.texts[i]; x.font = `700 ${t.size}px 'Gaegu', 'Jua', cursive`;
                const w = x.measureText(t.t).width / 2 + 10, h = t.size / 2 + 8;
                if (Math.abs(P[0] - t.x) < w && Math.abs(P[1] - t.y) < h) return i;
            }
            return -1;
        }
        function seDown(e) {
            e.preventDefault(); const P = sePt(e), t = se.tool;
            try { se.view.setPointerCapture(e.pointerId); } catch (x) {}
            if (t === 'erase') { seSnap(); se.drag = { last: P }; seErase(P, P); seLater(); }
            else if (t === 'crop') {
                seSnap(); const c = se.st.crop, x = se.out.getContext('2d');
                if (c) { seCropPath(x, c); if (x.isPointInPath(P[0], P[1])) { se.drag = { mv: P, o: JSON.parse(JSON.stringify(c)) }; return; } }   // 안쪽 → 옮기기
                se.drag = se.cshape === 'free' ? { pts: [P] } : { a: P };
            }
            else if (t === 'text') {
                const i = seTextAt(P);
                if (i >= 0) { se.textSel = i; seSnap(); se.drag = { off: [P[0] - se.st.texts[i].x, P[1] - se.st.texts[i].y] }; sePanel(); seLater(); return; }
                const v = (seq('seTxt') && seq('seTxt').value.trim()) || '';
                if (!v) { const inp = seq('seTxt'); if (inp) { inp.focus(); inp.classList.remove('se-need'); void inp.offsetWidth; inp.classList.add('se-need'); } return; }
                seSnap(); se.st.texts.push({ t: v, x: P[0], y: P[1], size: se.tsz || Math.round(Math.min(se.W, se.H) / 7), color: se.ink || SE_INK[0] });
                se.textSel = se.st.texts.length - 1; sePanel(); seLater();
            }
        }
        function seMove(e) {
            const d = se.drag; if (!d) return; const P = sePt(e), t = se.tool;
            if (t === 'erase') { seErase(d.last, P); d.last = P; seLater(); }
            else if (t === 'crop' && d.mv) {
                const o = d.o, dx = Math.max(-o.x - o.w * .8, Math.min(se.W - o.x - o.w * .2, P[0] - d.mv[0])), dy = Math.max(-o.y - o.h * .8, Math.min(se.H - o.y - o.h * .2, P[1] - d.mv[1]));
                const c = Object.assign({}, o, { x: o.x + dx, y: o.y + dy }); if (o.pts) c.pts = o.pts.map(q => [q[0] + dx, q[1] + dy]);
                se.st.crop = c; seLater();
            } else if (t === 'crop' && d.pts) {
                const L = d.pts[d.pts.length - 1]; if (Math.hypot(P[0] - L[0], P[1] - L[1]) * se.vk < 4) return;
                d.pts.push([Math.max(0, Math.min(se.W, P[0])), Math.max(0, Math.min(se.H, P[1]))]); seLater();
            } else if (t === 'crop') {
                const x0 = Math.max(0, Math.min(d.a[0], P[0])), y0 = Math.max(0, Math.min(d.a[1], P[1])), x1 = Math.min(se.W, Math.max(d.a[0], P[0])), y1 = Math.min(se.H, Math.max(d.a[1], P[1]));
                se.st.crop = x1 - x0 > 8 && y1 - y0 > 8 ? { sh: se.cshape, x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null; seLater();
            } else if (t === 'text' && se.textSel >= 0) { const tx = se.st.texts[se.textSel]; tx.x = P[0] - d.off[0]; tx.y = P[1] - d.off[1]; seLater(); }
        }
        function seUp() {
            const d = se.drag; se.drag = null;
            if (!d || se.tool !== 'crop') return;
            if (d.pts) { const b = seBox(d.pts); se.st.crop = d.pts.length > 3 && b.w > 8 && b.h > 8 ? Object.assign({ sh: 'free', pts: d.pts }, b) : se.st.crop; }
            const u = se.undo[se.undo.length - 1];
            if (u && JSON.stringify(u.st) === JSON.stringify(se.st)) { se.undo.pop(); seBtns(); }   // 바뀐 게 없으면 되돌리기 칸을 안 써요
            sePanel(); seLater();
        }

        /* 🎀 마테 : 그림 대신 SVG 색 행렬 (sRGB · 4×5) = 다듬기 창의 색 계산과 같아요 */
        function seFeMatrix() {
            const st = se.st, M = seMatrix(st), br = st.b / 100, pa = st.pas / 100, k = br * (1 - pa), r = v => Math.round(v * 10000) / 10000;
            return [0, 1, 2].map(i => [M[i * 3] * k, M[i * 3 + 1] * k, M[i * 3 + 2] * k, 0, pa].map(r).join(' ')).join(' ') + ' 0 0 0 1 0';
        }
        /* ---------- 내보내기 : 자르기 모양만 남기기 → 투명한 가장자리 잘라내기 ---------- */
        function seExport() {
            if (se.opt.matrix) return seFeMatrix();
            const out = seCompose(), c = seMk(se.W, se.H), x = c.getContext('2d'); x.drawImage(out, 0, 0);
            if (se.st.crop) { x.globalCompositeOperation = 'destination-in'; seCropPath(x, se.st.crop); x.fill(); x.globalCompositeOperation = 'source-over'; }
            if (se.opt.trim === false) return se.opt.jpeg ? seJpeg(c) : c.toDataURL('image/png');   // 📃 속지 : 크기 그대로
            const d = x.getImageData(0, 0, c.width, c.height).data; let l = c.width, t = c.height, r = -1, b = -1;
            for (let y = 0; y < c.height; y++) for (let xx = 0; xx < c.width; xx++) if (d[(y * c.width + xx) * 4 + 3] > 8) { if (xx < l) l = xx; if (xx > r) r = xx; if (y < t) t = y; if (y > b) b = y; }
            if (r < 0) return null;                                              // 다 지웠어요
            const f = seMk(r - l + 1, b - t + 1); f.getContext('2d').drawImage(c, -l, -t);
            return f.toDataURL('image/png');
        }
        function seJpeg(c) { const j = seMk(c.width, c.height), x = j.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, j.width, j.height); x.drawImage(c, 0, 0); return j.toDataURL('image/jpeg', .9); }

        /* ---------- 열기 · 닫기 ---------- */
        function openStickerEdit(src, opt) {
            return new Promise(async ok => {
                let im;
                try { im = await new Promise((y, n) => { const i = new Image(); if (/^https?:/i.test(src)) i.crossOrigin = 'anonymous'; i.onload = () => y(i); i.onerror = n; i.src = src; }); }
                catch (e) { showMsg('그림을 열지 못했어요.'); ok(null); return; }
                seBuild();
                se.opt = opt || {};
                const tools = SE_TOOLS.filter(t => !se.opt.tools || se.opt.tools.includes(t[0])), tb = seq('seTools');
                tb.innerHTML = tools.map(([id, ic, n]) => `<button type="button" role="tab" data-t="${id}"><span>${ic}</span>${n}</button>`).join('');
                tb.hidden = tools.length < 2;
                const k = Math.min(1, (se.opt.max || SE_MAX) / Math.max(im.naturalWidth, im.naturalHeight));
                se.W = Math.max(1, Math.round(im.naturalWidth * k)); se.H = Math.max(1, Math.round(im.naturalHeight * k));
                se.src = seMk(se.W, se.H); se.src.getContext('2d').drawImage(im, 0, 0, se.W, se.H);
                se.mask = seMk(se.W, se.H); se.out = seMk(se.W, se.H); se.colored = null; se.ckey = '';
                se.st = seFresh(); se.undo = []; se.tool = tools[0][0]; se.textSel = -1; se.view = seq('seView'); se.done = ok; se.on = true;
                const room = seq('seRoom'); room.hidden = false;
                sePanel(); seBtns(); requestAnimationFrame(seFit);
                if (document.fonts && document.fonts.load) document.fonts.load("700 40px 'Gaegu'").then(seLater).catch(() => {});
                seq('seOk').focus();
            });
        }
        function seClose(res) {
            if (!se.on) return;
            if (res === null && se.undo.length && seq('seRoom').dataset.ask !== '1') {          // 고친 게 있으면 한 번 물어봐요
                seq('seRoom').dataset.ask = '1';
                showMsg('다듬은 것을 버리고 그만둘까요?', true).then(y => { seq('seRoom').dataset.ask = ''; if (y) { se.undo = []; seClose(null); } });
                return;
            }
            se.on = false; seq('seRoom').hidden = true;
            const f = se.done; se.done = null; if (f) f(res);
        }

        window.openStickerEdit = openStickerEdit;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['stkedit'] = true;
