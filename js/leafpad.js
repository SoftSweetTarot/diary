/* 말랑달콤 다이어리 - js/leafpad.js
   📃 속지 · 🧻 떡메모지 (✨ 스티커 창의 맨 아랫줄 종이 칸 · 📝 메모지는 js/paper.js)
   - 📃 속지 : 그날 페이지 바탕을 통째로 바꿔요 (줄노트 · 모눈 · 도트 · 깅엄 · 크라프트 · 무지)
               날짜 파일에 lf 로 저장 (줄노트는 기본이라 저장 안 함) · 바탕 위에 붙인 것들은 그대로
   - 🧻 떡메모지 : 묶음을 톡 누르면 맨 윗장이 북 뜯겨서 테이프와 함께 페이지에 붙어요
               뜯긴 한 장은 그림(SVG)으로 붙어서 다른 스티커처럼 옮기고 돌릴 수 있어요 (그날 파일 안에 같이 저장)
   ※ 색은 지금 스킨의 포인트 색을 따라가요 (떡메는 뜯는 순간의 색으로 남아요) */

        const lfq = id => document.getElementById(id);

        /* ---------- 종이 소리 (설정의 '연출 소리'를 따라요 · js/sound.js) ---------- */
        function lfNoise(dur, o) {
            const ac = typeof sndFx === 'function' ? sndFx() : null; if (!ac) return;
            try {
                const n = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, n, ac.sampleRate), d = buf.getChannelData(0);
                for (let i = 0; i < n; i++) { let v = Math.random() * 2 - 1; if (o.crackle && Math.random() < o.crackle) v *= 4; d[i] = v * (1 - i / n); }
                const s = ac.createBufferSource(); s.buffer = buf;
                const fl = ac.createBiquadFilter(); fl.type = o.type || 'bandpass'; fl.frequency.value = o.f; fl.Q.value = o.q || .8;
                if (o.f2) fl.frequency.linearRampToValueAtTime(o.f2, ac.currentTime + dur);
                const g = ac.createGain(); g.gain.value = o.gain;
                s.connect(fl).connect(g).connect((typeof sndOut === 'function' && sndOut()) || ac.destination); s.start();
            } catch (e) {}
        }
        const lfSlideSnd = () => lfNoise(.4, { f: 900, f2: 2400, q: .5, gain: .2 });
        const tkTearSnd = () => { lfNoise(.07, { f: 3000, q: .6, gain: .5, crackle: .08 }); setTimeout(() => lfNoise(.16, { f: 2200, f2: 900, q: .7, gain: .45, crackle: .12 }), 55); };

        /* =====================================================================
           📃 속지
           ===================================================================== */
        const LEAFS = [['line', '줄노트'], ['grid', '모눈'], ['dot', '도트'], ['gingham', '깅엄'], ['kraft', '크라프트'], ['plain', '무지']];
        let pageLeaf = 'line';                                             // 지금 페이지의 속지 (js/elements.js 저장 · 불러오기)

        function setPageLeaf(id) {
            pageLeaf = LEAFS.some(l => l[0] === id) ? id : 'line';
            const c = lfq('canvasArea'); if (!c) return;
            LEAFS.forEach(([k]) => c.classList.toggle('lf-' + k, k === pageLeaf && k !== 'line'));
            document.querySelectorAll('#leafPick .lf-pick').forEach(b => b.classList.toggle('on', b.dataset.lf === pageLeaf));
        }
        function openLeafPicker() {
            const box = lfq('leafPick'); if (!box) return;
            if (!box.firstChild) box.innerHTML = LEAFS.map(([k, n]) => `<button type="button" class="lf-pick" data-lf="${k}" onclick="pickLeaf('${k}')"><i class="lf-sw lf-${k}"></i>${n}</button>`).join('');
            setPageLeaf(pageLeaf);
            closeModal('stickerMakeModal'); openModal('leafModal');
        }
        /* 고르면 새 속지가 오른쪽에서 스르륵 끼워져요 (붙인 것들은 그 위에 그대로) */
        function pickLeaf(id) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (id === pageLeaf) { closeModal('leafModal'); return; }
            const c = lfq('canvasArea');
            closeModal('leafModal');
            const sl = document.createElement('div'); sl.className = 'lf-slide' + (id === 'line' ? '' : ' lf-' + id);
            c.appendChild(sl); lfSlideSnd();
            const done = () => { sl.remove(); setPageLeaf(id); if (typeof saveData === 'function') saveData(false); };
            try { sl.animate([{ transform: 'translateX(104%) rotate(2deg)' }, { transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.3,.8,.3,1)' }).onfinish = done; }
            catch (e) { done(); }
        }
        window.openLeafPicker = openLeafPicker; window.pickLeaf = pickLeaf;

        /* =====================================================================
           🧻 떡메모지
           ===================================================================== */
        const TK_PADS = [['memo', '메모'], ['check', '체크'], ['sky', '하늘'], ['todo', '투두']];
        const TK_EDGES = [['straight', '반듯하게'], ['top', '윗변만 찢김'], ['all', '사방 찢김']];
        const TK_W = 150, TK_H = 148;
        const tk = { pad: 'memo', edge: 'top', busy: false };
        const tkR = (a, b) => a + Math.random() * (b - a);

        function tkHex(c) {
            c = String(c || '').trim();
            if (/^#[0-9a-f]{3}$/i.test(c)) c = '#' + c.slice(1).split('').map(x => x + x).join('');
            const m = /^#([0-9a-f]{6})$/i.exec(c); if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16));
            const r = /rgba?\(([^)]+)\)/.exec(c); return r ? r[1].split(',').slice(0, 3).map(v => parseFloat(v)) : [255, 107, 129];
        }
        const tkMix = (a, p, b = [255, 255, 255]) => 'rgb(' + a.map((v, i) => Math.round(v * p + b[i] * (1 - p))).join(',') + ')';
        const tkAcc = () => tkHex(getComputedStyle(document.documentElement).getPropertyValue('--primary-accent'));

        /* 묶음 위에 보이는 맨 윗장 (HTML) */
        function tkSheetHtml(id) {
            const h = { memo: '<span class="hd">MEMO</span>', sky: '<span class="hd">오늘 하늘 ☁</span><i class="cl"></i>', todo: '<span class="hd">TO DO</span><ul><li></li><li></li><li></li><li></li></ul>' }[id] || '';
            return `<div class="tk-sheet tk-${id}">${h}</div>`;
        }
        function tkChips(box, list, cur, fn) {
            box.innerHTML = list.map(([k, n]) => `<button type="button" class="tk-chip${k === cur ? ' on' : ''}" data-k="${k}">${n}</button>`).join('');
            box.querySelectorAll('.tk-chip').forEach(b => b.onclick = () => { box.querySelectorAll('.tk-chip').forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset.k); });
        }
        function openTteok() {
            tkChips(lfq('tkPadPick'), TK_PADS, tk.pad, k => { tk.pad = k; lfq('tkTop').innerHTML = tkSheetHtml(k); lfq('tkStubs').innerHTML = ''; });
            tkChips(lfq('tkEdgePick'), TK_EDGES, tk.edge, k => { tk.edge = k; });
            lfq('tkTop').innerHTML = tkSheetHtml(tk.pad); lfq('tkStubs').innerHTML = '';
            closeModal('stickerMakeModal'); openModal('tteokModal');
        }

        /* 찢긴 선 : 종이 끝을 따라 잔물결 + 자잘한 톱니 */
        function tkJag(len, amp) {
            const pts = [], ph = tkR(0, 6), ph2 = tkR(0, 6); let t = 0;
            while (t < len) { pts.push([t, Math.max(0, amp * (.55 + .35 * Math.sin(t / 17 + ph) + .2 * Math.sin(t / 5.3 + ph2)) + tkR(-amp * .4, amp * .4))]); t += tkR(2.2, 4.2); }
            pts.push([len, tkR(0, amp)]); return pts;
        }
        /* 한 장 모양 : 겉(하얀 종이 속살) + 안(인쇄면) · 찢긴 변은 인쇄면이 살짝 안쪽 */
        function tkShape(mode, w, h) {
            const T = mode !== 'straight', A = mode === 'all', amp = 4, flat = n => [[0, 0], [n, 0]];
            const edges = { top: T ? tkJag(w, amp) : flat(w), right: A ? tkJag(h, amp * .8) : flat(h), bottom: A ? tkJag(w, amp * .8) : flat(w), left: A ? tkJag(h, amp * .8) : flat(h) };
            const torn = { top: T, right: A, bottom: A, left: A }, outer = [], inner = [];
            for (const side of ['top', 'right', 'bottom', 'left']) for (const [t, o] of edges[side]) {
                const ins = torn[side] ? tkR(1.2, 2.8) : 0, m = { top: [t, o, 0, 1], right: [w - o, t, -1, 0], bottom: [w - t, h - o, 0, -1], left: [o, h - t, 1, 0] }[side];
                outer.push([m[0], m[1]]); inner.push([m[0] + m[2] * ins, m[1] + m[3] * ins]);
            }
            return { outer, inner, top: edges.top };
        }
        const tkPts = p => p.map(([x, y]) => x.toFixed(1) + ',' + y.toFixed(1)).join(' ');
        const tkCss = p => 'polygon(' + p.map(([x, y]) => x.toFixed(1) + 'px ' + y.toFixed(1) + 'px').join(',') + ')';

        /* 페이지에 붙는 한 장 (SVG 그림 · 위쪽 12px 은 묶음에 붙어 있던 자리라 잘려 나가요) */
        function tkPieceSvg(id, sh) {
            const acc = tkAcc(), W = TK_W, H = TK_H, F = "font-family=\"'Fredoka','Arial Rounded MT Bold',sans-serif\" font-weight=\"700\"";
            let face = '';
            if (id === 'memo') {
                face = `<rect width="${W}" height="${H}" fill="#fff6cf"/>`;
                for (let y = 61; y < H - 6; y += 22) face += `<rect x="0" y="${y}" width="${W}" height="1" fill="#f1d58a"/>`;
                face += `<text x="12" y="27" ${F} font-size="17" letter-spacing="1" fill="#d98d2b">MEMO<tspan fill="${tkMix(acc, 1)}" dx="4">♡</tspan></text>`;
            } else if (id === 'check') {
                const c = tkMix(acc, .2);
                face = `<defs><pattern id="tkc" width="18" height="18" patternUnits="userSpaceOnUse" y="-12"><rect width="18" height="18" fill="#fff"/><rect width="9" height="18" fill="${c}"/><rect width="18" height="9" fill="${c}"/><rect width="9" height="9" fill="${tkMix(acc, .36)}"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#tkc)"/>`;
            } else if (id === 'sky') {
                face = `<defs><pattern id="tks" width="16" height="16" patternUnits="userSpaceOnUse" y="-12"><rect width="16" height="16" fill="#cfe8fb"/><circle cx="0" cy="0" r="2.3" fill="#fff"/><circle cx="16" cy="0" r="2.3" fill="#fff"/><circle cx="0" cy="16" r="2.3" fill="#fff"/><circle cx="16" cy="16" r="2.3" fill="#fff"/></pattern></defs><rect width="${W}" height="${H}" fill="url(#tks)"/>`
                    + `<text x="12" y="31" font-family="'Gaegu','Apple SD Gothic Neo',sans-serif" font-weight="700" font-size="19" fill="#4c86b8">오늘 하늘 ☁</text>`
                    + `<g fill="#fff"><rect x="84" y="${H - 34}" width="54" height="22" rx="11"/><circle cx="84" cy="${H - 37}" r="10"/><circle cx="133" cy="${H - 39}" r="8"/></g>`;
            } else {
                const ln = tkMix(acc, .3), bx = tkMix(acc, .6);
                face = `<rect width="${W}" height="${H}" fill="#fffdfa"/><rect width="${W}" height="34" fill="${tkMix(acc, .22)}"/><text x="12" y="25" ${F} font-size="15" fill="${tkMix(acc, .88, [74, 32, 48])}">TO DO</text>`;
                for (let i = 0; i < 4; i++) { const y = 46 + i * 22; face += `<rect x="12.8" y="${y + 6.5}" width="9" height="9" rx="2" fill="none" stroke="${bx}" stroke-width="1.6"/><path d="M12 ${y + 21.5}H${W - 12}" stroke="${ln}" stroke-dasharray="3 2"/>`; }
            }
            const tr = tkR(-7, 7).toFixed(1), ta = tkMix(acc, .4), tb = tkMix(acc, .22);
            const tape = `<g transform="translate(75 0) rotate(${tr})" opacity=".82"><defs><pattern id="tkt" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${tb}"/><rect width="6" height="12" fill="${ta}"/></pattern></defs>`
                + `<polygon points="-29,-7.6 -26.7,-9 -24.4,-7.2 -22,-9 29,-9 26.7,-6.8 29,-4.5 26.7,-1.8 29,.9 26.7,3.6 29,6.3 27.3,9 -29,9 -26.7,6.3 -29,3.6 -26.7,.9 -29,-1.8 -26.7,-4.5" fill="url(#tkt)"/></g>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -12 ${W + 12} ${H + 20}" width="${W + 12}" height="${H + 20}">`
                + `<defs><filter id="tkd" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="1.5" stdDeviation=".7" flood-color="#5a3c32" flood-opacity=".22"/><feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#5a3c32" flood-opacity=".1"/></filter><clipPath id="tki"><polygon points="${tkPts(sh.inner)}"/></clipPath></defs>`
                + `<g filter="url(#tkd)"><polygon points="${tkPts(sh.outer)}" fill="#fffdf6"/><g clip-path="url(#tki)">${face}</g></g>${tape}</svg>`;
        }

        /* 묶음을 톡 : 맨 윗장이 들렸다가 북 뜯겨서 페이지로 */
        function tearTteok() {
            if (tk.busy) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            tk.busy = true;
            const top = lfq('tkTop'), sh = tkShape(tk.edge, TK_W, TK_H), id = tk.pad;
            const fin = () => {
                tk.busy = false; tkTearSnd();
                const st = lfq('tkStubs'); st.innerHTML = '';
                if (tk.edge !== 'straight') {                                // 묶음에 남는 뜯긴 자국 (반듯하게는 깨끗하게 떨어져요)
                    const o = [[150, 0], [0, 0], ...sh.top.map(([t, v]) => [t, 12 + v])], i = [[150, 0], [0, 0], ...sh.top.map(([t, v]) => [t, 12 + v - tkR(1.2, 2.6)])];
                    st.innerHTML = `<div class="tk-stub"><div class="rim" style="clip-path:${tkCss(o)}"></div><div class="face" style="clip-path:${tkCss(i)}">${tkSheetHtml(id)}</div></div>`;
                }
                const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tkPieceSvg(id, sh));
                setTimeout(() => {
                    closeModal('tteokModal');
                    if (!addImage(src)) return;
                    const el = lfq('canvasArea').lastElementChild;
                    el.style.width = (TK_W + 12) + 'px';
                    const r = (tkR(-7, 7)).toFixed(1); el.dataset.rotation = r;
                    el.style.transform = `translate(${el.dataset.posX}px, ${el.dataset.posY}px) scale(1) rotate(${r}deg)`;
                    try { el.animate([{ opacity: 0, translate: '0 -40px', scale: '1.08' }, { opacity: 1, translate: '0 0', scale: '1' }], { duration: 420, easing: 'cubic-bezier(.25,.7,.3,1)' }); } catch (e) {}
                    if (typeof saveData === 'function') saveData(false);
                }, 260);
            };
            try { top.animate([{ transform: 'none' }, { transform: 'perspective(520px) rotateX(-24deg) translateY(-2px)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' }).onfinish = fin; }
            catch (e) { fin(); }
        }
        window.openTteok = openTteok; window.tearTteok = tearTteok;
