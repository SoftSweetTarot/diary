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
            lfTabs('leaf', 'free');
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
        const tk = { pad: 'memo', edge: 'top' };
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
            tkChips(lfq('tkPadPick'), TK_PADS, tk.pad, k => { tk.pad = k; lfq('tkTop').innerHTML = tkSheetHtml(k); });
            tkChips(lfq('tkEdgePick'), TK_EDGES, tk.edge, k => { tk.edge = k; });
            lfq('tkTop').innerHTML = tkSheetHtml(tk.pad);
            lfTabs('tk', 'free');
            closeModal('stickerMakeModal'); openModal('tteokModal');
        }

        /* 📃 속지 · 🧻 떡메 창 위 카테고리 4칸 (다른 스티커 창과 같은 모양) · 기본 = 지금 고르는 판, 문구점 = 🛍️ 그 칸, 나머지는 '준비 중' */
        const LF_TABS = {
            leaf: ['속지', ['내속지', '공유속지', '기본속지', '문구점속지']],
            tk: ['떡메모지', ['내떡메모지', '공유떡메모지', '기본떡메모지', '문구점떡메모지']],
        };
        function lfTabs(w, tab) {
            const [name, ns] = LF_TABS[w], bar = lfq(w + 'Tabs'), other = lfq(w + 'Other');
            if (!bar.firstChild) bar.innerHTML = ['mine', 'share', 'free', 'shop'].map((v, i) => `<button type="button" class="stk-tab" data-tab="${v}" onclick="lfTabs('${w}','${v}')">${ns[i]}</button>`).join('');
            bar.querySelectorAll('.stk-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
            lfq(w + 'Free').hidden = tab !== 'free'; other.hidden = tab === 'free';
            if (tab === 'shop') other.innerHTML = `<button type="button" class="stk-go" onclick="openShop('#/c/${encodeURIComponent(name)}')"><span>🛍️</span><b>문구점에서 ${name} 보기</b><small>새 창으로 열려요</small></button>`;
            else if (tab !== 'free') other.innerHTML = `<div class="cs-empty">🛠️ ${bar.querySelector('.on').textContent}는 준비 중이에요.<br>조금만 기다려 주세요!</div>`;
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
        function tkPieceSvg(id, sh, tape = true) {
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
            const tp = `<g transform="translate(75 0) rotate(${tr})" opacity=".82"><defs><pattern id="tkt" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="12" height="12" fill="${tb}"/><rect width="6" height="12" fill="${ta}"/></pattern></defs>`
                + `<polygon points="-29,-7.6 -26.7,-9 -24.4,-7.2 -22,-9 29,-9 26.7,-6.8 29,-4.5 26.7,-1.8 29,.9 26.7,3.6 29,6.3 27.3,9 -29,9 -26.7,6.3 -29,3.6 -26.7,.9 -29,-1.8 -26.7,-4.5" fill="url(#tkt)"/></g>`;
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -12 ${W + 12} ${H + 20}" width="${W + 12}" height="${H + 20}">`
                + `<defs><filter id="tkd" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="1.5" stdDeviation=".7" flood-color="#5a3c32" flood-opacity=".22"/><feDropShadow dx="0" dy="3" stdDeviation="2.4" flood-color="#5a3c32" flood-opacity=".1"/></filter><clipPath id="tki"><polygon points="${tkPts(sh.inner)}"/></clipPath></defs>`
                + `<g filter="url(#tkd)"><polygon points="${tkPts(sh.outer)}" fill="#fffdf6"/><g clip-path="url(#tki)">${face}</g></g>${tape ? tp : ''}</svg>`;
        }

        /* =====================================================================
           🧻 떡메 뜯어 붙이기 : 🏷️ 씰스티커처럼 페이지 앞(배경 한가운데)에 묶음이 나와요
           - 맨 윗장을 잡고 왼쪽→오른쪽(또는 오른쪽→왼쪽)으로 쭉 당기면 풀칠된 윗변이 그쪽으로 찢겨 나가요
             (반대쪽 윗모서리에 매달린 채 따라오다가 끝까지 찢기면 손에 들려요) → 원하는 곳에 놓으면 테이프로 붙어요
           - 덜 당기고 놓으면 제자리로 · 분홍 풀칠 띠를 끌면 묶음째 옮겨져요 · 날짜바를 끌면 페이지가 옮겨져요
           - 묶음은 ✕ 를 누를 때까지 남아 있어서 여러 장 뜯을 수 있어요 · 소리 : 찢는 동안 '찌이익'만
           ===================================================================== */
        const TK_PULL = 120;                                                  // 이만큼(화면 px) 옆으로 당기면 다 찢겨요
        const tkS = { on: false, k: 1, mv: [0, 0], drag: null, fly: null, hint: '' };
        function tkBuild() {
            if (lfq('tkRoom')) return;
            const el = document.createElement('div');
            el.id = 'tkRoom'; el.className = 'pel-room tk-room';
            el.innerHTML = `<div class="tk-rpad" id="tkRPad"><div class="tk-stack"></div><div class="tk-top" id="tkRTop"></div><div class="tk-stubs" id="tkRStubs"></div><div class="tk-glue"></div></div>`
                + `<p class="pel-hint" id="tkHint"></p><button type="button" class="pel-x" onclick="closeTteokRoom()" aria-label="닫기">✕</button>`;
            document.body.appendChild(el);
            el.addEventListener('pointerdown', tkDown); el.addEventListener('pointermove', tkMove);
            el.addEventListener('pointerup', tkUp); el.addEventListener('pointercancel', tkUp);
            window.addEventListener('resize', () => { if (tkS.on) tkLayout(); });
        }
        /* 묶음 자리 : 배경(화면) 한가운데 + 옮긴 만큼 · 크기는 페이지에 붙을 크기 그대로 (페이지 확대 · 축소 비율 k) */
        function tkLayout() {
            const pg = lfq('canvasArea'), pad = lfq('tkRPad');
            tkS.k = pg && pg.offsetWidth ? pg.getBoundingClientRect().width / pg.offsetWidth : 1;
            const k = tkS.k, W = 150 * k, H = 172 * k, VW = window.innerWidth, VH = window.innerHeight;
            tkS.mv[0] = Math.max(W / 2 - VW / 2, Math.min(VW / 2 - W / 2, tkS.mv[0])); tkS.mv[1] = Math.max(H / 2 - VH / 2, Math.min(VH / 2 - H / 2, tkS.mv[1]));
            tkS.x = VW / 2 + tkS.mv[0] - W / 2; tkS.y = VH / 2 + tkS.mv[1] - H / 2;
            pad.style.transform = `translate(${tkS.x}px, ${tkS.y}px) scale(${k})`;
        }
        function spawnTteok() {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            closeModal('tteokModal'); tkBuild();
            lfq('tkRTop').innerHTML = tkSheetHtml(tk.pad); lfq('tkRStubs').innerHTML = '';
            Object.assign(tkS, { on: true, mv: [0, 0], drag: null, hint: '' });
            tkLayout();
            lfq('tkRoom').classList.add('show'); document.body.classList.add('fc-lock');
            try { lfq('tkRPad').animate([{ opacity: 0, translate: '0 30px' }, { opacity: 1, translate: '0 0' }], { duration: 320, easing: 'cubic-bezier(.25,.7,.3,1)' }); } catch (e) {}
            tkSay('맨 윗장을 잡고 <b>옆으로 쭉</b> 당겨서 뜯어 보세요');
        }
        function closeTteokRoom() {
            tkS.on = false; tkS.drag = null; tkNoise(0); if (tkS.fly) { tkS.fly.remove(); tkS.fly = null; }
            const r = lfq('tkRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        function tkSay(h) { const e = lfq('tkHint'); if (!e || tkS.hint === h) return; tkS.hint = h; e.innerHTML = h; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
        /* 화면 → 묶음 안 좌표 (150 × 172 기준) */
        const tkLocal = P => [(P[0] - tkS.x) / tkS.k, (P[1] - tkS.y) / tkS.k];

        function tkDown(e) {
            if (!tkS.on || tkS.drag || e.target.closest('.pel-x')) return;
            const P = [e.clientX, e.clientY], [lx, ly] = tkLocal(P);
            const cap = () => { try { lfq('tkRoom').setPointerCapture(e.pointerId); } catch (er) {} };
            if (lx >= -4 && lx <= 154 && ly >= -6 && ly <= 16) { tkS.drag = { mode: 'pad', last: P }; cap(); return; }          // 분홍 풀칠 띠 → 묶음 옮기기
            if (lx >= 0 && lx <= 150 && ly > 16 && ly <= 168) { tkS.drag = { mode: 'tear', start: P, last: P, lt: performance.now(), p: 0 }; cap(); tkSay('살살… 옆으로 쭉 당겨요'); return; }
            if (window.pgmOnBar && pgmOnBar(P[0], P[1])) pgmBegin(e);                // 날짜바 → 페이지 옮기기 (js/page.js)
        }
        /* 당기기 시작한 쪽이 정해지면 : 떼어질 한 장(테이프 없는 그림)을 묶음 위에 똑같이 겹쳐 띄워요 · 아래엔 다음 장이 그대로 */
        function tkLift(d, dir) {
            const k = tkS.k, sh = tkShape(tk.edge, TK_W, TK_H), im = new Image();
            im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tkPieceSvg(tk.pad, sh, false));
            im.className = 'tk-fly'; im.draggable = false;
            const px = dir > 0 ? 150 : 0;                                        // 매달린 쪽 윗모서리 (찢김이 끝나는 쪽)
            Object.assign(im.style, { width: (TK_W + 12) * k + 'px', left: tkS.x + -6 * k + 'px', top: tkS.y + 0 * k + 'px', transformOrigin: `${(px + 6) * k}px ${12 * k}px` });
            lfq('tkRoom').insertBefore(im, lfq('tkHint'));
            tkS.fly = im; tkS.sh = sh; d.dir = dir;
            const st = lfq('tkRStubs'); st.innerHTML = ''; st.style.clipPath = dir > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
            if (tk.edge !== 'straight') {                                        // 묶음에 남는 뜯긴 자국 (찢긴 만큼만 보여요)
                const o = [[150, 0], [0, 0], ...sh.top.map(([t, v]) => [t, 12 + v])], i = [[150, 0], [0, 0], ...sh.top.map(([t, v]) => [t, 12 + v - tkR(1.2, 2.6)])];
                st.innerHTML = `<div class="tk-stub"><div class="rim" style="clip-path:${tkCss(o)}"></div><div class="face" style="clip-path:${tkCss(i)}">${tkSheetHtml(tk.pad)}</div></div>`;
            }
        }
        function tkMove(e) {
            const d = tkS.drag; if (!d) return;
            const P = [e.clientX, e.clientY], now = performance.now();
            if (d.mode === 'pad') { tkS.mv[0] += P[0] - d.last[0]; tkS.mv[1] += P[1] - d.last[1]; d.last = P; tkLayout(); return; }
            const sp = Math.hypot(P[0] - d.last[0], P[1] - d.last[1]) / Math.max(1, now - d.lt); d.last = P; d.lt = now;
            if (d.mode === 'free') {
                const f = tkS.fly; d.rot += ((P[0] - d.px) * .25 - (d.rot - d.base)) * .2; d.px = P[0];
                f.style.left = P[0] - d.off[0] + 'px'; f.style.top = P[1] - d.off[1] + 'px';
                f.style.transform = `rotate(${Math.max(-25, Math.min(25, d.rot))}deg)`; return;
            }
            const dx = P[0] - d.start[0], dy = P[1] - d.start[1];
            if (!d.dir) { if (Math.abs(dx) < 6) return; tkLift(d, Math.sign(dx)); }
            const p = Math.max(0, Math.min(1, d.dir * dx / TK_PULL));
            if (p > d.p) tkNoise(Math.min(.4, .08 + sp * .3)); else tkNoise(0);
            d.p = p;
            const rot = -d.dir * p * 24, ty = Math.max(-10, Math.min(24, dy * .25)) + p * 8, tx = d.dir * p * 14;
            tkS.fly.style.transform = `translate(${tx}px, ${ty}px) rotate(${rot}deg)`;
            lfq('tkRStubs').style.clipPath = d.dir > 0 ? `inset(0 ${(1 - p) * 100}% 0 0)` : `inset(0 0 0 ${(1 - p) * 100}%)`;
            if (p > .6 && !d.half) { d.half = 1; tkSay('거의 다 찢겼어요… 조금만 더!'); }
            if (p >= 1) tkFree(P, rot);
        }
        /* 끝까지 찢김 → 손에 들려요 (가운데 기준으로 바꿔서 손가락을 따라와요) */
        function tkFree(P, rot) {
            const f = tkS.fly, b = f.getBoundingClientRect(), w = f.offsetWidth, h = f.offsetHeight;
            const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
            f.style.transformOrigin = '50% 50%'; f.style.left = cx - w / 2 + 'px'; f.style.top = cy - h / 2 + 'px'; f.style.transform = `rotate(${rot}deg)`;
            tkS.drag = { mode: 'free', off: [P[0] - (cx - w / 2), P[1] - (cy - h / 2)], rot, base: -tkS.drag.dir * 6, px: P[0], last: P, lt: performance.now() };
            tkNoise(0); if (navigator.vibrate) navigator.vibrate(15);
            tkSay('북! 뜯겼어요 ✨ 원하는 곳에 놓아 보세요');
        }
        function tkUp() {
            const d = tkS.drag; if (!d) return;
            tkS.drag = null; tkNoise(0);
            if (d.mode === 'pad') return;
            const f = tkS.fly;
            if (d.mode === 'tear') {
                if (!d.dir) { tkSay('톡 누르면 안 뜯겨요 · <b>옆으로 쭉</b> 당겨 보세요'); try { lfq('tkRTop').animate([{ rotate: '0deg' }, { rotate: '1.5deg' }, { rotate: '-1.5deg' }, { rotate: '0deg' }], { duration: 300 }); } catch (e) {} return; }
                tkS.fly = null; const st = lfq('tkRStubs');                      // 덜 찢겼으면 제자리로 붙어요
                f.style.transition = 'transform .22s ease-out'; f.style.transform = 'none'; st.style.transition = 'clip-path .22s ease-out'; st.style.clipPath = d.dir > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';
                setTimeout(() => { f.remove(); st.style.transition = ''; st.innerHTML = ''; }, 240);
                if (d.p > .15) tkSay('앗, 다시 붙어 버렸어요 🫣 끝까지 쭉 당겨 보세요');
                return;
            }
            if (navigator.vibrate) navigator.vibrate(8);
            tkStick(f, Math.max(-25, Math.min(25, d.rot)));
        }
        /* 놓은 자리에 붙이기 : 화면에 보이던 크기 · 기울기 그대로 · 테이프가 붙은 그림으로 */
        function tkStick(f, rot) {
            const pg = lfq('canvasArea'), r = pg.getBoundingClientRect(), k = tkS.k || 1, b = f.getBoundingClientRect();
            const cx = Math.min(r.right, Math.max(r.left, b.left + b.width / 2)), cy = Math.min(r.bottom, Math.max(r.top, b.top + b.height / 2));
            tkS.fly = null; f.remove();
            const src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tkPieceSvg(tk.pad, tkS.sh));
            if (!addImage(src)) { closeTteokRoom(); return; }
            const el = pg.querySelector('.element-box:last-child'); if (!el) return;
            el.dataset.float = 1;                                                // 옮길 때 떼지 않고 살짝 떠서 (js/elements.js)
            const w = TK_W + 12, h = TK_H + 20, PADB = 14, deg = Math.round(rot * 10) / 10;   // .element-box 안쪽 여백 6px · 테두리 1px (양쪽)
            const put = (px, py) => { el.dataset.posX = px; el.dataset.posY = py; el.style.transform = `translate(${px}px, ${py}px) scale(1) rotate(${deg}deg)`; };
            el.style.width = w + 'px'; el.style.height = h + 'px'; el.dataset.rotation = deg;
            const x = Math.round((cx - r.left) / k - (w + PADB) / 2), y = Math.round((cy - r.top) / k - (h + PADB) / 2);
            put(x, y);
            const bb = el.getBoundingClientRect();
            put(Math.round(x + (cx - (bb.left + bb.width / 2)) / k), Math.round(y + (cy - (bb.top + bb.height / 2)) / k));
            if (typeof saveData === 'function') saveData(false);
            tkSay('붙었어요 ✨ 한 장 더 뜯어도 돼요');
        }

        /* ---------- 소리 : 찢는 동안 '찌이익'만 (당기는 빠르기만큼) ---------- */
        let tkGain = null;
        function tkNoise(v) {
            if (!tkGain && !v) return;
            const ac = typeof sndFx === 'function' ? sndFx() : null;
            if (!ac) { if (tkGain) tkGain.gain.value = 0; return; }
            if (!tkGain) {
                const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .12 ? 1 : .25);
                const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
                const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2100; bp.Q.value = .8;
                tkGain = ac.createGain(); tkGain.gain.value = 0; src.connect(bp).connect(tkGain).connect(sndOut()); src.start();
            }
            tkGain.gain.setTargetAtTime(v, ac.currentTime, .03);
        }
        window.openTteok = openTteok; window.spawnTteok = spawnTteok; window.closeTteokRoom = closeTteokRoom; window.lfTabs = lfTabs;
