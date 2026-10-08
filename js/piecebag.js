/* 말랑달콤 다이어리 - js/piecebag.js
   🧩 조각스티커 봉투 : 내스티커(👜 내 봉투)에서 봉투를 누르면 배경(화면) 한가운데에 봉투가 나와요 (조각스티커 R&D 와 같은 연출)
   1) 봉투 윗부분 점선을 옆으로 쓱 밀어 뜯어요 → 조각들이 와르르 쏟아져요 (한 번 뜯은 봉투는 다음부터 뜯긴 채로 나와요)
   2) 조각을 톡 누르면 집어 올려요 → 가장자리를 손톱으로 밀어 뒷종이를 벗겨요 (가끔 반쯤에서 걸려요 · 놓으면 반쯤 벗겨진 채로 남아요)
   3) 벗긴 스티커는 손가락을 따라와요 → 페이지에 놓으면 붙어요 · 작은 봉투 위에 놓으면 봉투에 다시 쏙
   - 작은 봉투를 누르거나 ✕ 를 누르면 남은 조각은 봉투로 돌아가요 · 다 붙이면 저절로 닫혀요
   - 봉투를 잡고 끌면 봉투가 화면 안에서 옮겨져요 (쏟아진 조각은 그 자리에) · 조각이 없는 빈 곳을 끌면 페이지가 옮겨져요 (js/page.js pgmBegin)
   - 소리 : 봉투를 옆으로 뜯을 때 · 뒷종이를 벗길 때 '찌이익' (⚙ 설정의 '✨ 연출 소리' · js/sound.js)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (조각이 바로 붙어요 · js/stickermaker.js) */

        const PCB_PAD = 6, PCB_LINER = 3, PCB_GRAB = 30;
        const pcbS = { on: false, cv: null, ctx: null, fl: null, W: 0, H: 0, DPR: 1, raf: 0, hint: '', assets: [], pieces: [], fallers: [], drag: null, z: 10, bag: null,
            PR: null, BIG: null, SMALL: null, HOLD: null, SL: .5, SH: 1, SP: .5, opened: false, onOpen: null, closing: 0, used: null, mv: { x: 0, y: 0 } };   // mv : 봉투를 옮긴 만큼   // used : 이번에 붙인 조각 (봉투 속에 안 그려요)
        const pcbq = id => document.getElementById(id);
        const pcbMk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
        const pcbLoad = src => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
        function pcbTint(src, fill) { const c = pcbMk(src.width, src.height), d = c.getContext('2d'); d.drawImage(src, 0, 0); d.globalCompositeOperation = 'source-in'; d.fillStyle = fill; d.fillRect(0, 0, c.width, c.height); return c; }
        function pcbGrow(src, r, step) { const c = pcbMk(src.width, src.height), d = c.getContext('2d'); for (const k of [1, .66, .33]) for (let a = 0; a < 360; a += step) d.drawImage(src, Math.cos(a * Math.PI / 180) * r * k, Math.sin(a * Math.PI / 180) * r * k); d.drawImage(src, 0, 0); return c; }
        const pcbNow = () => performance.now();
        const pcbOut = q => 1 - Math.pow(1 - q, 3), pcbBack = q => { const c = 1.6; return 1 + (c + 1) * Math.pow(q - 1, 3) + c * Math.pow(q - 1, 2); };
        const pcbDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
        const pcbIn = (P, r, m = 0) => P[0] > r.x - m && P[0] < r.x + r.w + m && P[1] > r.y - m && P[1] < r.y + r.h + m;

        /* ---------- 그림 재료 : 앞면(유광) · 뒷면(접착면) · 뒷종이 · 봉투 속 모습 · 가장자리 점 ---------- */
        function pcbAsset(img) {
            const m = PCB_PAD, w = img.width + m * 2, h = img.height + m * 2;
            const front = pcbMk(w, h), f = front.getContext('2d'); f.drawImage(img, m, m);
            f.globalCompositeOperation = 'source-atop';
            const g = f.createLinearGradient(0, 0, w, h);
            g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.32, 'rgba(255,255,255,0)'); g.addColorStop(.40, 'rgba(255,255,255,.34)');
            g.addColorStop(.46, 'rgba(255,255,255,.08)'); g.addColorStop(.52, 'rgba(255,255,255,.2)'); g.addColorStop(.58, 'rgba(255,255,255,0)');
            f.fillStyle = g; f.fillRect(0, 0, w, h);
            const back = pcbTint(front, '#f2eee8'), bk = back.getContext('2d'); bk.globalCompositeOperation = 'source-atop'; bk.globalAlpha = .25;
            for (let i = 0; i < w * h / 120; i++) { bk.fillStyle = Math.random() < .5 ? '#fff' : '#e1d8ce'; bk.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
            const shape = pcbGrow(pcbTint(front, '#fff'), PCB_LINER, 15), liner = pcbMk(w, h), l = liner.getContext('2d');
            l.drawImage(pcbTint(pcbGrow(shape, 1.2, 30), 'rgba(175,150,160,.75)'), 0, 0);
            const lc = pcbTint(shape, '#fff'), lx = lc.getContext('2d'); lx.globalCompositeOperation = 'source-atop';
            const lg = lx.createLinearGradient(0, 0, w, h); lg.addColorStop(0, '#f3f6fb'); lg.addColorStop(.5, '#ffffff'); lg.addColorStop(1, '#e8edf5'); lx.fillStyle = lg; lx.fillRect(0, 0, w, h);
            l.drawImage(lc, 0, 0);
            const cut = pcbTint(pcbGrow(front, 1.5, 20), 'rgba(170,140,150,.45)'), cx = cut.getContext('2d'); cx.globalCompositeOperation = 'destination-out'; cx.drawImage(front, 0, 0);
            l.drawImage(cut, 0, 0);
            const piece = pcbMk(w, h), p = piece.getContext('2d'); p.drawImage(liner, 0, 0); p.drawImage(front, 0, 0);
            const data = front.getContext('2d').getImageData(0, 0, w, h).data, edge = [];
            const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : data[(y * w + x) * 4 + 3];
            const st = Math.max(2, Math.round(Math.max(w, h) / 160));
            for (let y = 0; y < h; y += st) for (let x = 0; x < w; x += st)
                if (A(x, y) > 128 && (A(x - st, y) <= 128 || A(x + st, y) <= 128 || A(x, y - st) <= 128 || A(x, y + st) <= 128)) edge.push([x - w / 2, y - h / 2]);
            return { w, h, m, front, back, liner, piece, edge, alpha: (x, y) => A(Math.round(x + w / 2), Math.round(y + h / 2)) };
        }

        /* ---------- 화면 ---------- */
        function pcbBuild() {
            if (pcbq('pcbRoom')) return;
            const el = document.createElement('div');
            el.id = 'pcbRoom'; el.className = 'pel-room';
            el.innerHTML = `<canvas id="pcbCv"></canvas><p class="pel-hint" id="pcbHint"></p><button type="button" class="pel-x" onclick="closePieceBag()" aria-label="닫기">✕</button>`;
            document.body.appendChild(el);
            const cv = pcbq('pcbCv');
            cv.addEventListener('pointerdown', pcbDown); cv.addEventListener('pointermove', pcbMove);
            cv.addEventListener('pointerup', pcbUp); cv.addEventListener('pointercancel', pcbUp);
            window.addEventListener('resize', () => { if (pcbS.on) { const o = pcbS.PR; pcbLayout(); pcbReflow(o); } });
        }
        function pcbLayout() {
            const S = pcbS, cv = S.cv;
            S.DPR = Math.min(window.devicePixelRatio || 1, 3); S.W = window.innerWidth; S.H = window.innerHeight;
            cv.width = S.W * S.DPR; cv.height = S.H * S.DPR; S.fl = pcbMk(cv.width, cv.height);
            /* 봉투는 배경(화면) 한가운데 · 조각은 그 둘레(PR)에 쏟아져요 · 붙일 크기(SP)는 페이지에 맞춰요 */
            const pg = pcbq('canvasArea'), r = pg ? pg.getBoundingClientRect() : { left: 0, top: 0, width: S.W, height: S.H };
            const pw = Math.min(S.W - 24, 520), ph = Math.min(S.H - 84, 720), PR = S.PR = { x: (S.W - pw) / 2, y: Math.max(70, (S.H - ph) / 2), w: pw, h: ph };
            const bw = Math.min(PR.w - 60, 230), bh = Math.min(PR.h - 40, bw * 1.13);
            S.BIG = { x: PR.x + PR.w / 2 - bw / 2, y: PR.y + (PR.h - bh) / 2, w: bw, h: bh };
            S.SMALL = { x: PR.x + PR.w - 14 - 62, y: PR.y + PR.h - 14 - 76, w: 62, h: 76 };
            S.HOLD = { cx: PR.x + PR.w / 2, cy: PR.y + PR.h * .46 };
            const m = Math.max(1, ...S.assets.map(a => Math.max(a.w, a.h)));
            S.SL = Math.max(.24, Math.min(.6, Math.min(PR.w, PR.h) * .24 / m));
            S.SH = Math.max(S.SL * 1.25, Math.min(1, PR.w * .44 / m, PR.h * .3 / m));   // 집으면 살짝만 커져요 (벗기다 손가락이 화면 끝에 닿지 않게)
            S.SP = Math.min(1, Math.min(r.width, S.W) * .32 / m);
            for (const q of [S.BIG, S.SMALL]) { q.x += S.mv.x; q.y += S.mv.y; pcbClampR(q); }
        }
        /* 화면이 바뀌면 (아이패드 돌리기 등) 흩어진 조각도 새 화면 안으로 : 같은 비율 자리로 옮기고, 화면 밖이면 안쪽으로 */
        function pcbReflow(o) {
            const S = pcbS, PR = S.PR; if (!o) return;
            for (const st of S.pieces) {
                if (st.state === 'free') continue;                                   // 손가락에 붙어 있는 건 그대로
                const a = S.assets[st.k], g = st.anim ? st.anim.to : st, half = Math.max(a.w, a.h) * g.s / 2;
                let nx, ny;
                if (st.state === 'held') { nx = S.HOLD.cx; ny = S.HOLD.cy; }
                else {
                    nx = PR.x + (g.cx - o.x) / o.w * PR.w; ny = PR.y + (g.cy - o.y) / o.h * PR.h;
                    nx = Math.max(PR.x + Math.min(half, PR.w / 2), Math.min(PR.x + PR.w - Math.min(half, PR.w / 2), nx));
                    ny = Math.max(PR.y + Math.min(half, PR.h / 2), Math.min(PR.y + PR.h - Math.min(half, PR.h / 2), ny));
                }
                const dx = nx - g.cx, dy = ny - g.cy, mv = q => { if (q) { q[0] += dx; q[1] += dy; } };
                st.cx += dx; st.cy += dy;
                if (st.anim) { st.anim.from.cx += dx; st.anim.from.cy += dy; st.anim.to.cx += dx; st.anim.to.cy += dy; }
                if (st.home) { st.home.cx = Math.max(PR.x, Math.min(PR.x + PR.w, PR.x + (st.home.cx - o.x) / o.w * PR.w)); st.home.cy = Math.max(PR.y, Math.min(PR.y + PR.h, PR.y + (st.home.cy - o.y) / o.h * PR.h)); }
                for (const h of [st.half, st.snap]) if (h) { mv(h.C); mv(h.F); }
            }
            const d = S.drag; if (d && d.mode === 'peel') S.drag = null;            // 벗기던 중이면 손을 뗀 것처럼
        }
        /* 봉투 옮기기 : 큰 봉투 · 작은 봉투가 같이 움직여요 (지금 보이는 봉투가 화면 밖으로 안 나가게) */
        function pcbClampR(q) { const M = 8; q.x = Math.max(M, Math.min(pcbS.W - M - q.w, q.x)); q.y = Math.max(M, Math.min(pcbS.H - M - q.h, q.y)); }
        function pcbShift(dx, dy) {
            const S = pcbS, r = S.bag.state === 'closed' ? S.BIG : S.SMALL, M = 8;
            dx = Math.max(M - r.x, Math.min(S.W - M - r.w - r.x, dx)); dy = Math.max(M - r.y, Math.min(S.H - M - r.h - r.y, dy));
            for (const q of [S.BIG, S.SMALL]) { q.x += dx; q.y += dy; pcbClampR(q); }
            S.mv.x += dx; S.mv.y += dy;
        }
        /* srcs : 봉투에 든 조각 그림들 · o.opened : 전에 뜯은 봉투 · o.onOpen : 처음 뜯었을 때 (내스티커에 '뜯음' 표시) */
        async function openPieceBag(srcs, o = {}) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return false; }
            let imgs;
            try { imgs = await Promise.all(srcs.map(pcbLoad)); } catch (e) { showMsg('조각스티커를 열지 못했어요.'); return false; }
            if (!imgs.length) return false;
            pcbBuild();
            const S = pcbS;
            S.cv = pcbq('pcbCv'); S.ctx = S.cv.getContext('2d');
            S.assets = imgs.map((im, i) => Object.assign(pcbAsset(im), { src: srcs[i] }));
            S.pieces = []; S.fallers = []; S.drag = null; S.closing = 0; S.used = new Set(); S.mv = { x: 0, y: 0 }; S.opened = !!o.opened; S.onOpen = o.onOpen || null; S.on = true;
            pcbLayout();
            const n = S.assets.length;
            S.bag = { state: S.opened ? 'open' : 'closed', tear: 0, dir: 1, wig: 0, move: null, strip: null, busy: false,
                preview: S.assets.map((a, k) => ({ k, u: .2 + Math.random() * .6, v: .42 + Math.random() * .42, rot: (Math.random() - .5) * 1.2 })) };
            pcbq('pcbRoom').classList.add('show'); document.body.classList.add('fc-lock');
            S.hint = '';
            if (S.opened) { S.bag.move = { t0: pcbNow() - 1000, dur: 1 }; pcbSpill([...Array(n).keys()], [S.SMALL.x + S.SMALL.w / 2, S.SMALL.y + S.SMALL.h * .6], 0); pcbSay('조각이 쏟아졌어요! 하나 <b>톡</b> 눌러서 집어 보세요'); }
            else pcbSay('봉투 윗부분 <b>점선</b>을 옆으로 쓱 밀어서 뜯어 보세요 ✂️');
            cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(pcbFrame);
            return true;
        }
        function closePieceBag() {
            const S = pcbS; S.on = false; S.drag = null; pcbNoise(0); cancelAnimationFrame(S.raf);
            const r = pcbq('pcbRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        function pcbSay(h) { const e = pcbq('pcbHint'); if (!e || pcbS.hint === h) return; pcbS.hint = h; e.innerHTML = h; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }

        /* ---------- 좌표 · 움직임 ---------- */
        const pcbToStage = (st, lx, ly) => { const c = Math.cos(st.rot), s = Math.sin(st.rot); return [st.cx + (lx * c - ly * s) * st.s, st.cy + (lx * s + ly * c) * st.s]; };
        const pcbToLocal = (st, x, y) => { const dx = (x - st.cx) / st.s, dy = (y - st.cy) / st.s, c = Math.cos(-st.rot), s = Math.sin(-st.rot); return [dx * c - dy * s, dx * s + dy * c]; };
        function pcbAnim(st, to, dur, o = {}) { st.anim = { from: { cx: st.cx, cy: st.cy, rot: st.rot, s: st.s }, to: Object.assign({ cx: st.cx, cy: st.cy, rot: st.rot, s: st.s }, to), t0: pcbNow() + (o.delay || 0), dur, ease: o.ease || pcbOut, arc: o.arc || 0, hide: o.hide, done: o.done }; }
        function pcbStep(st, t) {
            const a = st.anim; if (!a) return;
            const q = Math.max(0, Math.min(1, (t - a.t0) / a.dur)), e = a.ease(q);
            for (const k of ['cx', 'cy', 'rot', 's']) st[k] = a.from[k] + (a.to[k] - a.from[k]) * e;
            st.cy -= Math.sin(q * Math.PI) * a.arc; st.hidden = a.hide && t < a.t0;
            if (q >= 1) { st.anim = null; st.hidden = false; if (a.done) a.done(); }
        }
        function pcbBagRect(t) {
            const S = pcbS, b = S.bag;
            if (b.state === 'closed' || !b.move) return S.BIG;
            const q = pcbOut(Math.max(0, Math.min(1, (t - b.move.t0) / b.move.dur))), L = (x, y) => x + (y - x) * q;
            return { x: L(S.BIG.x, S.SMALL.x), y: L(S.BIG.y, S.SMALL.y), w: L(S.BIG.w, S.SMALL.w), h: L(S.BIG.h, S.SMALL.h) };
        }

        /* ---------- 그리기 ---------- */
        function pcbRR(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
        function pcbDrawBag(t) {
            const S = pcbS, ctx = S.ctx, b = S.bag, r = pcbBagRect(t), k = r.w / S.BIG.w, hh = r.h * .24, cut = r.y + hh * .34, open = b.state !== 'closed';
            const BC = getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() || '#ffb6c1', FONT = getComputedStyle(document.body).fontFamily;
            ctx.save();
            if (b.wig) { const q = (t - b.wig) / 420; if (q < 1) { const a = Math.sin(q * Math.PI * 5) * .05 * (1 - q); ctx.translate(r.x + r.w / 2, r.y + r.h); ctx.rotate(a); ctx.translate(-r.x - r.w / 2, -r.y - r.h); } else b.wig = 0; }
            const body = () => {
                ctx.beginPath();
                if (open) { ctx.moveTo(r.x, cut); for (let x = r.x, i = 0; x <= r.x + r.w; x += 6 * k, i++) ctx.lineTo(Math.min(x, r.x + r.w), cut + (i % 2 ? 2.5 : -1.5) * k); }
                else { ctx.moveTo(r.x + 6 * k, r.y); ctx.lineTo(r.x + r.w - 6 * k, r.y); ctx.quadraticCurveTo(r.x + r.w, r.y, r.x + r.w, r.y + 6 * k); }
                ctx.lineTo(r.x + r.w, r.y + r.h - 8 * k); ctx.quadraticCurveTo(r.x + r.w, r.y + r.h, r.x + r.w - 8 * k, r.y + r.h); ctx.lineTo(r.x + 8 * k, r.y + r.h); ctx.quadraticCurveTo(r.x, r.y + r.h, r.x, r.y + r.h - 8 * k);
                ctx.lineTo(r.x, open ? cut : r.y + 6 * k); if (!open) ctx.quadraticCurveTo(r.x, r.y, r.x + 6 * k, r.y); ctx.closePath();
            };
            ctx.save(); ctx.shadowColor = 'rgba(120,80,95,.18)'; ctx.shadowBlur = 10 * k; ctx.shadowOffsetY = 4 * k; body(); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill(); ctx.restore();
            ctx.save(); body(); ctx.clip();                                       // 안에 든 조각들
            const pv = open ? b.preview.filter(p => !S.used.has(p.k) && !S.pieces.some(q => q.k === p.k)) : b.preview;
            for (const p of pv) { const a = S.assets[p.k], s = S.SL * .92 * k; ctx.save(); ctx.translate(r.x + r.w * p.u, r.y + r.h * p.v); ctx.rotate(p.rot); ctx.scale(s, s); ctx.drawImage(a.piece, -a.w / 2, -a.h / 2); ctx.restore(); }
            ctx.fillStyle = 'rgba(255,255,255,.2)'; ctx.fillRect(r.x, r.y, r.w, r.h);                // 비닐 느낌
            const sg = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
            sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(.18, 'rgba(255,255,255,.55)'); sg.addColorStop(.24, 'rgba(255,255,255,0)');
            sg.addColorStop(.62, 'rgba(255,255,255,0)'); sg.addColorStop(.7, 'rgba(255,255,255,.4)'); sg.addColorStop(.74, 'rgba(255,255,255,0)'); ctx.fillStyle = sg; ctx.fillRect(r.x, r.y, r.w, r.h);
            ctx.restore();
            body(); ctx.strokeStyle = BC; ctx.lineWidth = 1.6; ctx.stroke();
            const lx = r.x + 10 * k, ly = cut + 8 * k, lw = r.w - 20 * k, lh = hh * .78;            // 라벨
            pcbRR(ctx, lx, ly, lw, lh, 6 * k); ctx.fillStyle = '#ffd9e4'; ctx.fill(); ctx.strokeStyle = BC; ctx.lineWidth = 1.2; ctx.stroke();
            if (k > .5) {
                ctx.fillStyle = '#9b6676'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
                ctx.font = `700 ${Math.round(16 * k)}px ${FONT}`; ctx.fillText('말랑 조각스티커', r.x + r.w / 2, ly + lh * .5);
                ctx.font = `${Math.round(12 * k)}px ${FONT}`; ctx.fillText('내가 만든 조각 · ' + S.assets.length + 'pcs', r.x + r.w / 2, ly + lh * .88); ctx.textAlign = 'left';
            }
            if (!open) {                                                         // 뜯는 띠 (점선 위쪽) · 오른쪽부터 뜯으면 거울처럼 뒤집어 그려요
                const flip = b.tear > 0 && b.dir < 0;
                if (flip) { ctx.save(); ctx.translate(r.x + r.w / 2, 0); ctx.scale(-1, 1); ctx.translate(-r.x - r.w / 2, 0); }
                const tx = r.x + r.w * b.tear;
                ctx.setLineDash([5, 4]); ctx.strokeStyle = 'rgba(170,130,145,.7)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(tx, cut); ctx.lineTo(r.x + r.w, cut); ctx.stroke(); ctx.setLineDash([]);
                ctx.fillStyle = 'rgba(243,223,230,.95)'; for (const x of [r.x, r.x + r.w]) { ctx.beginPath(); ctx.moveTo(x, cut - 5); ctx.lineTo(x + (x === r.x ? 6 : -6), cut); ctx.lineTo(x, cut + 5); ctx.fill(); }
                if (b.tear > 0) {
                    ctx.save(); ctx.beginPath(); ctx.rect(r.x - 30, r.y - 80, tx - r.x + 30, cut - r.y + 80); ctx.clip();
                    ctx.translate(tx, cut); ctx.rotate(-.12 - .25 * b.tear); ctx.translate(-tx, -cut - 3);
                    ctx.fillStyle = 'rgba(255,255,255,.8)'; ctx.fillRect(r.x, r.y, r.w, cut - r.y); ctx.strokeStyle = BC; ctx.strokeRect(r.x, r.y, r.w, cut - r.y); ctx.restore();
                    ctx.strokeStyle = 'rgba(170,130,145,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(r.x, cut);
                    for (let x = r.x, i = 0; x < tx; x += 5, i++) ctx.lineTo(x, cut + (i % 2 ? 2 : -1)); ctx.stroke();
                } else { ctx.fillStyle = '#b98a9a'; ctx.font = `12px ${FONT}`; ctx.textAlign = 'center'; ctx.fillText('◀ 여기를 쭉 뜯어요 ▶', r.x + r.w / 2, cut - 5); ctx.textAlign = 'left'; }
                if (flip) ctx.restore();
            }
            ctx.restore();
            if (b.strip) {                                                       // 날아가는 띠
                const q = (t - b.strip.t0) / 700;
                if (q < 1) { const s = b.strip; ctx.save(); ctx.globalAlpha = 1 - q; ctx.translate(s.x + s.w / 2 + q * 50 * b.dir, s.y - q * 40 + q * q * 160); ctx.rotate((-.4 - q * 1.2) * b.dir);
                    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(-s.w / 2, -s.h / 2, s.w, s.h); ctx.strokeStyle = BC; ctx.strokeRect(-s.w / 2, -s.h / 2, s.w, s.h); ctx.restore(); }
                else b.strip = null;
            }
        }
        function pcbImg(st, img, sh, extra = 1, flip = 1) {
            const ctx = pcbS.ctx; ctx.save();
            if (sh) { ctx.shadowColor = sh.c; ctx.shadowBlur = sh.b; ctx.shadowOffsetY = sh.y; ctx.shadowOffsetX = sh.x || 0; }
            ctx.translate(st.cx, st.cy); ctx.rotate(st.rot); ctx.scale(st.s * extra * flip, st.s * extra); ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
        }
        function pcbHalf(c, M, n, sign) {
            const p = [-n[1], n[0]], L = 4000; c.beginPath();
            c.moveTo(M[0] + p[0] * L, M[1] + p[1] * L); c.lineTo(M[0] - p[0] * L, M[1] - p[1] * L);
            c.lineTo(M[0] - p[0] * L + n[0] * L * sign, M[1] - p[1] * L + n[1] * L * sign); c.lineTo(M[0] + p[0] * L + n[0] * L * sign, M[1] + p[1] * L + n[1] * L * sign); c.closePath();
        }
        /* 잡은 점(C)과 손가락(F) 사이를 접는 선으로, 들린 쪽은 뒤집어 뒷면을 그려요 */
        function pcbPeel(st, C, F, sh) {
            const S = pcbS, ctx = S.ctx, a = S.assets[st.k], dx = F[0] - C[0], dy = F[1] - C[1], len = Math.hypot(dx, dy);
            if (len < .5) { pcbImg(st, a.front, sh); return; }
            const n = [dx / len, dy / len], M = [(C[0] + F[0]) / 2, (C[1] + F[1]) / 2];
            ctx.save(); pcbHalf(ctx, M, n, 1); ctx.clip(); pcbImg(st, a.front, sh); ctx.restore();
            const md = M[0] * n[0] + M[1] * n[1], A = 1 - 2 * n[0] * n[0], B = -2 * n[0] * n[1], D = 1 - 2 * n[1] * n[1], E = 2 * md * n[0], Fv = 2 * md * n[1], R = S.DPR;
            const L = S.fl.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, S.fl.width, S.fl.height);
            L.setTransform(R * A, R * B, R * B, R * D, R * E, R * Fv);
            L.save(); pcbHalf(L, M, n, -1); L.clip();
            L.translate(st.cx, st.cy); L.rotate(st.rot); L.scale(st.s, st.s); L.drawImage(a.back, -a.w / 2, -a.h / 2); L.restore();
            L.setTransform(R, 0, 0, R, 0, 0); L.globalCompositeOperation = 'source-atop';
            const span = Math.max(20, len / 2), g = L.createLinearGradient(M[0], M[1], M[0] + n[0] * span, M[1] + n[1] * span);
            g.addColorStop(0, 'rgba(110,80,90,.35)'); g.addColorStop(.18, 'rgba(255,255,255,.25)'); g.addColorStop(.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(150,120,130,.15)');
            L.fillStyle = g; L.fillRect(0, 0, S.W, S.H); L.globalCompositeOperation = 'source-over';
            ctx.save(); ctx.shadowColor = 'rgba(80,50,60,.28)'; ctx.shadowBlur = 10 + Math.min(14, len / 12); ctx.shadowOffsetX = n[0] * 4; ctx.shadowOffsetY = 4 + n[1] * 3;
            ctx.drawImage(S.fl, 0, 0, S.W, S.H); ctx.restore();
        }
        const PCB_DESK = { c: 'rgba(90,60,70,.2)', b: 3, y: 1.5 }, PCB_UP = { c: 'rgba(80,50,60,.3)', b: 18, y: 12 };
        function pcbDrawPiece(st, t) {
            if (st.hidden) return;
            const S = pcbS, a = S.assets[st.k], d = S.drag, peel = d && d.st === st && d.mode === 'peel';
            if (st.liner) {
                if (peel || st.half || st.snap) {
                    pcbImg(st, a.liner, PCB_UP);
                    if (peel) pcbPeel(st, d.C, d.F, null);
                    else if (st.half) pcbPeel(st, st.half.C, st.half.F, null);
                    else { const q = Math.min(1, (t - st.snap.t0) / 260), e = pcbOut(q), s = st.snap; pcbPeel(st, s.C, [s.F[0] + (s.C[0] - s.F[0]) * e, s.F[1] + (s.C[1] - s.F[1]) * e], null); if (q >= 1) st.snap = null; }
                    return;
                }
                pcbImg(st, a.piece, st.state === 'held' ? PCB_UP : PCB_DESK); return;
            }
            const fp = Math.min(1, (t - st.t0) / 220), flip = Math.cos(Math.PI * (1 - fp));               // 뒷면 → 앞면으로 뒤집혀요
            pcbImg(st, flip < 0 ? a.back : a.front, PCB_UP, 1.06, Math.max(.05, Math.abs(flip)) * (flip < 0 ? -1 : 1));
        }
        function pcbFallers(t) {
            const S = pcbS, ctx = S.ctx;
            S.fallers = S.fallers.filter(f => {
                const q = (t - f.t0) / 1100; if (q >= 1) return false;
                const a = S.assets[f.k]; ctx.save(); ctx.globalAlpha = 1 - q * q; ctx.translate(f.cx + f.vx * q * 120 + Math.sin(q * 7) * 10, f.cy + q * q * 260); ctx.rotate(f.rot + f.vr * q * 10);
                ctx.scale(f.s * Math.cos(q * 5) * (1 - q * .3), f.s * (1 - q * .3)); ctx.drawImage(a.liner, -a.w / 2, -a.h / 2); ctx.restore(); return true;
            });
        }
        const PCB_LAYER = { loose: 0, held: 3, free: 5 };
        const pcbHeld = () => pcbS.pieces.find(p => p.state === 'held');
        function pcbFrame() {
            const S = pcbS; if (!S.on) return;
            const t = pcbNow(), ctx = S.ctx;
            ctx.setTransform(S.DPR, 0, 0, S.DPR, 0, 0); ctx.clearRect(0, 0, S.W, S.H);
            const fade = S.closing ? Math.max(0, Math.min(1, 1 - (t - S.closing) / 260)) : 1;   // 닫힐 때 스르르
            if (S.closing && fade <= 0) { closePieceBag(); return; }
            ctx.globalAlpha = fade;
            ctx.fillStyle = 'rgba(90,60,70,.10)'; ctx.fillRect(0, 0, S.W, S.H);
            for (const st of S.pieces) { pcbStep(st, t); if (st.sGoal != null) { st.s += (st.sGoal - st.s) * .2; if (Math.abs(st.sGoal - st.s) < .002) { st.s = st.sGoal; st.sGoal = null; } } }
            if (S.drag && S.drag.mode === 'free') pcbAnchor(S.drag.st, S.drag.last);
            pcbDrawBag(t);
            const order = [...S.pieces].sort((a, b) => (PCB_LAYER[a.state] - PCB_LAYER[b.state]) || (a.z - b.z));
            let dim = false;
            for (const st of order) {
                if (!dim && PCB_LAYER[st.state] >= 3) {                          // 집으면 뒤가 살짝 어두워져요
                    dim = true; const h = pcbHeld();
                    if (h) { const q = h.anim ? Math.min(1, Math.max(0, (t - h.anim.t0) / h.anim.dur)) : 1; ctx.fillStyle = `rgba(90,55,70,${.16 * q})`; ctx.fillRect(0, 0, S.W, S.H); }
                }
                if (st.state === 'free') pcbFallers(t);
                pcbDrawPiece(st, t);
            }
            if (!S.pieces.some(p => p.state === 'free')) pcbFallers(t);
            ctx.globalAlpha = 1;
            S.raf = requestAnimationFrame(pcbFrame);
        }

        /* ---------- 손가락 ---------- */
        function pcbEdge(st, P) {
            const a = pcbS.assets[st.k], [lx, ly] = pcbToLocal(st, P[0], P[1]); let best = 1e12, bp = null;
            for (const q of a.edge) { const d = (q[0] - lx) ** 2 + (q[1] - ly) ** 2; if (d < best) { best = d; bp = q; } }
            return { bp, d: Math.sqrt(best) * st.s, inside: a.alpha(lx, ly) > 128 };
        }
        function pcbPeeled(st, C, F) {
            const dx = F[0] - C[0], dy = F[1] - C[1], len = Math.hypot(dx, dy); if (len < 1) return 0;
            const n = [dx / len, dy / len], M = [(C[0] + F[0]) / 2, (C[1] + F[1]) / 2], e = pcbS.assets[st.k].edge; let off = 0;
            for (const [lx, ly] of e) { const [x, y] = pcbToStage(st, lx, ly); if ((x - M[0]) * n[0] + (y - M[1]) * n[1] < 0) off++; }
            return off / e.length;
        }
        function pcbStartPeel(st, C, P, base, resumed) { const S = pcbS; st.z = ++S.z; st.snap = null; st.half = null; S.drag = { st, mode: 'peel', C, F: base.slice(), base, start: P, last: P, lt: pcbNow(), resumed }; }
        function pcbDown(e) {
            const S = pcbS; if (!S.on || S.drag || S.closing) return;
            e.preventDefault(); const P = [e.clientX, e.clientY];
            const cap = () => { try { S.cv.setPointerCapture(e.pointerId); } catch (er) {} };
            const h = pcbHeld();
            if (h && !h.anim) {                                                  // 1) 손에 든 조각 : 뒷종이 벗기기
                const ei = pcbEdge(h, P);
                if (h.half && (pcbDist(P, h.half.F) < 56 || ei.inside || ei.d < PCB_GRAB)) { cap(); pcbStartPeel(h, h.half.C, P, h.half.F, true); pcbSay('그대로 쭉~ 마저 벗겨요'); return; }
                if (ei.d < PCB_GRAB) { cap(); const C = pcbToStage(h, ei.bp[0], ei.bp[1]); pcbStartPeel(h, C, P, C, false); pcbSay('살살… 뒷종이에서 떼어내는 중'); return; }
                if (ei.inside) { pcbSay('가운데 말고 <b>가장자리</b>를 손톱으로 밀어요 💅'); pcbWiggle(h); return; }
            }
            const b = S.bag;                                                     // 2) 봉투
            if (b.state === 'closed') {
                const B = S.BIG, cut = B.y + B.h * .24 * .34;
                if (P[1] > B.y - 24 && P[1] < cut + 22 && P[0] > B.x - 24 && P[0] < B.x + B.w + 24) { cap(); S.drag = { mode: 'tear', lastX: P[0], last: P, lt: pcbNow() }; pcbSay('찌이익…'); return; }
                if (pcbIn(P, B)) { cap(); S.drag = { mode: 'bag', start: P, last: P }; return; }   // 누르면 안내 · 끌면 옮기기
            } else if (!b.busy && pcbIn(P, S.SMALL, 10)) { cap(); S.drag = { mode: 'bag', start: P, last: P }; return; }
            for (const st of S.pieces.filter(p => p.state === 'loose' && !p.anim).sort((x, y) => y.z - x.z)) {   // 3) 조각 집기
                const ei = pcbEdge(st, P); if (ei.inside || ei.d < 8) { pcbLift(st); return; }
            }
            if (h && !h.anim) { pcbPutBack(h); return; }                         // 4) 빈 곳 : 들고 있던 걸 내려놓기
            const w = pcbq('diaryWrapper'), wr = w && w.getBoundingClientRect();  // 5) 빈 페이지 위 → 페이지 옮기기 (js/page.js)
            if (wr && window.pgmBegin && P[0] >= wr.left && P[0] <= wr.right && P[1] >= wr.top && P[1] <= wr.bottom) pgmBegin(e);
        }
        function pcbMove(e) {
            const S = pcbS, d = S.drag; if (!d) return;
            const P = [e.clientX, e.clientY], t = pcbNow();
            if (d.mode === 'tear') {
                const sp = pcbDist(P, d.last) / Math.max(1, t - d.lt); d.lt = t;
                const b = S.bag, dx = P[0] - d.lastX;
                if (!b.tear && Math.abs(dx) < 3) return;                         // 처음 민 쪽이 뜯는 방향 (왼→오 · 오→왼 다 돼요)
                if (!b.tear) b.dir = dx > 0 ? 1 : -1;
                if (Math.abs(P[1] - (S.BIG.y + S.BIG.h * .08)) < 90 && dx * b.dir > 0) { b.tear = Math.min(1, b.tear + Math.abs(dx) / (S.BIG.w * .85)); pcbNoise(Math.min(.4, sp * .35)); }
                d.lastX = P[0]; d.last = P; if (S.bag.tear >= 1) pcbOpen(); return;
            }
            if (d.mode === 'bag') {
                if (!d.moved && pcbDist(P, d.start) > 8) { d.moved = true; pcbSay('봉투를 옮겨요 ✉️'); }
                if (d.moved) pcbShift(P[0] - d.last[0], P[1] - d.last[1]);
                d.last = P; return;
            }
            if (d.mode === 'free') { const st = d.st; st.rot += ((P[0] - d.last[0]) * .004 - (st.rot - d.baseRot) * .08); d.last = P; return; }
            const sp = pcbDist(P, d.last) / Math.max(1, t - d.lt); d.lt = t; d.last = P;
            const st = d.st, dx = P[0] - d.start[0], dy = P[1] - d.start[1], k = d.resumed ? 1 : Math.min(1, .45 + Math.hypot(dx, dy) / 220);   // 끈적임
            const Fr = [d.base[0] + dx * k, d.base[1] + dy * k];
            if (d.caught) {                                                      // 걸림 : 손가락은 가는데 스티커는 버텨요
                d.F = [d.catchF[0] + (Fr[0] - d.catchFr[0]) * .1, d.catchF[1] + (Fr[1] - d.catchFr[1]) * .1]; pcbNoise(Math.min(.12, sp * .08));
                if (pcbDist(Fr, d.catchFr) > 90) { d.caught = false; d.F = Fr; pcbBuzz(25); pcbSay('찌직! 넘어갔어요 ✨ 조금만 더!'); }
                return;
            }
            d.F = Fr; pcbNoise(Math.min(.35, sp * .25));
            const fr = pcbPeeled(st, d.C, d.F);
            if (st.liner && fr >= st.catchAt) { st.catchAt = 2; d.caught = true; d.catchF = Fr.slice(); d.catchFr = Fr.slice(); pcbBuzz(35); pcbSay('어? 걸렸어요! 🫣 <b>힘줘서 한 번 더</b> 당겨요'); return; }
            if (fr > .6 && !d.half) { d.half = 1; pcbSay('거의 다 됐어요… 조금만 더!'); }
            if (fr >= .9) pcbDetach(P);
        }
        function pcbDetach(P) {
            const S = pcbS, st = S.drag.st;
            if (st.liner) { S.fallers.push({ k: st.k, cx: st.cx, cy: st.cy, rot: st.rot, s: st.s, vx: Math.random() < .5 ? -1 : 1, vr: (Math.random() - .5) * .1, t0: pcbNow() }); st.liner = false; }
            const local = pcbToLocal(st, S.drag.C[0], S.drag.C[1]); pcbNoise(0);
            st.state = 'free'; st.t0 = pcbNow(); st.half = null; st.sGoal = S.SP; st.z = ++S.z;
            S.drag = { st, mode: 'free', local, baseRot: st.rot, last: P }; pcbAnchor(st, P);
            pcbBuzz(15); pcbSay('톡! 뒷종이가 벗겨졌어요 ✨ 원하는 곳에 붙여 보세요');
        }
        function pcbAnchor(st, P) { const [lx, ly] = pcbS.drag.local, c = Math.cos(st.rot), s = Math.sin(st.rot); st.cx = P[0] - (lx * c - ly * s) * st.s; st.cy = P[1] - (lx * s + ly * c) * st.s; }
        function pcbUp() {
            const S = pcbS, d = S.drag; if (!d) return;
            S.drag = null; pcbNoise(0);
            const st = d.st;
            if (d.mode === 'tear') { if (S.bag.state === 'closed' && S.bag.tear > 0) pcbSay('조금만 더 쭉~ 끝까지 뜯어요'); return; }
            if (d.mode === 'bag') {
                if (d.moved) pcbSay(S.bag.state === 'closed' ? '윗부분 <b>점선</b>을 옆으로 쓱 밀어서 뜯어요 ✂️' : '조각을 <b>톡</b> 눌러서 집어 보세요');
                else if (S.bag.state === 'closed') { pcbSay('윗부분 <b>점선</b>을 옆으로 쓱 밀어서 뜯어요 ✂️'); S.bag.wig = pcbNow(); }
                else if (!S.bag.busy) pcbShut('남은 조각은 봉투에 다시 넣었어요');
                return;
            }
            if (d.mode === 'peel') {
                const fr = pcbPeeled(st, d.C, d.F);
                if (st.liner && fr >= .12) { st.half = { C: d.C, F: [d.F[0] + (d.C[0] - d.F[0]) * .15, d.F[1] + (d.C[1] - d.F[1]) * .15] }; pcbSay('반쯤 벗겨졌어요. 들린 끝을 잡고 <b>마저</b> 당겨요'); }
                else { st.snap = { C: d.C, F: d.F, t0: pcbNow() }; if (pcbDist(d.F, d.C) > 20) pcbSay('앗, 다시 붙어버렸어요 🫣'); }
                return;
            }
            if (S.bag.state === 'open' && !S.bag.busy && pcbIn(d.last, S.SMALL, 14)) {   // 작은 봉투에 쏙
                st.liner = true; st.state = 'loose';
                pcbAnim(st, { cx: S.SMALL.x + S.SMALL.w / 2, cy: S.SMALL.y + S.SMALL.h * .6, s: .05 }, 260, { done: () => { S.pieces = S.pieces.filter(p => p !== st); pcbEnd(); } });
                pcbSay('봉투에 쏙 넣었어요'); return;
            }
            pcbBuzz(8); pcbStick(st);
        }
        function pcbWiggle(st) { const r = st.rot, t0 = pcbNow(); (function w() { const q = (pcbNow() - t0) / 300; st.rot = r + Math.sin(q * Math.PI * 4) * .04 * (1 - q); if (q < 1) requestAnimationFrame(w); else st.rot = r; })(); }
        function pcbBuzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

        /* ---------- 봉투 열기 · 쏟기 · 집기 ---------- */
        function pcbOpen() {
            const S = pcbS, b = S.bag, r = S.BIG, hh = r.h * .24;
            pcbNoise(0); S.drag = null; b.state = 'open'; b.busy = true; pcbBuzz(20);
            b.strip = { x: r.x, y: r.y, w: r.w, h: hh * .34, t0: pcbNow() };
            pcbSpill(S.assets.map((a, k) => k), [r.x + r.w / 2, r.y + r.h * .45], 150);
            const t0 = pcbNow() + 150 + S.assets.length * 70 + 250; b.move = { t0, dur: 480 }; setTimeout(() => { b.busy = false; }, t0 - pcbNow() + 500);
            if (!S.opened) { S.opened = true; if (S.onOpen) S.onOpen(); }
            pcbSay('와르르~ 하나 <b>톡</b> 눌러서 집어 보세요');
        }
        function pcbSpill(ks, from, delay) {
            const S = pcbS, PR = S.PR, half = Math.max(...S.assets.map(a => Math.max(a.w, a.h))) * S.SL / 2, placed = [];
            ks.forEach((k, i) => {
                let best = null, bs = -1;                                        // 살짝 겹치게 흩어지되, 한곳에 몰리지 않게
                for (let j = 0; j < 10; j++) {
                    const c = [PR.x + half + 10 + Math.random() * Math.max(1, PR.w - 2 * half - 20), PR.y + half + 12 + Math.random() * Math.max(1, PR.h - 2 * half - 24)];
                    if (pcbIn(c, S.SMALL, half * .7)) continue;
                    const m = Math.min(999, ...placed.map(p => pcbDist(p, c))); if (m > bs) { bs = m; best = c; }
                }
                best = best || [PR.x + PR.w / 2, PR.y + PR.h / 2]; placed.push(best);
                const st = { k, cx: from[0], cy: from[1], rot: Math.random() - .5, s: S.SL * .6, state: 'loose', liner: true, z: ++S.z, catchAt: 2, hidden: true };
                pcbAnim(st, { cx: best[0], cy: best[1], rot: (Math.random() - .5) * 1.3, s: S.SL }, 460, { delay: delay + i * 70, arc: 30 + Math.random() * 30, hide: true });
                S.pieces.push(st);
            });
        }
        function pcbLift(st) {
            const S = pcbS, h = pcbHeld(); if (h) pcbPutBack(h, true);
            st.state = 'held'; st.home = { cx: st.cx, cy: st.cy, rot: st.rot, s: st.s }; st.z = ++S.z; st.half = null; st.snap = null;
            st.catchAt = Math.random() < .55 ? .32 + Math.random() * .22 : 2;  // 가끔 반쯤에서 걸려요
            pcbAnim(st, { cx: S.HOLD.cx, cy: S.HOLD.cy, rot: (Math.random() - .5) * .14, s: S.SH }, 340, { ease: pcbBack });
            pcbBuzz(6); pcbSay('집었어요! <b>가장자리</b>를 손톱으로 밀어 뒷종이를 벗겨요');
        }
        function pcbPutBack(st, quiet) {
            st.state = 'loose'; st.half = null; st.snap = null;
            pcbAnim(st, st.home || { s: pcbS.SL }, 280); if (!quiet) pcbSay('다시 내려놨어요. 다른 조각도 골라 보세요');
        }
        /* 남은 조각을 봉투에 넣고 닫기 */
        function pcbShut(msg) {
            const S = pcbS, c = [S.SMALL.x + S.SMALL.w / 2, S.SMALL.y + S.SMALL.h * .6];
            S.bag.wig = pcbNow(); S.bag.busy = true;
            for (const st of S.pieces) { st.state = 'loose'; st.half = null; st.snap = null; pcbAnim(st, { cx: c[0], cy: c[1], s: .05 }, 300); }
            pcbSay(msg); setTimeout(() => { S.closing = pcbNow(); }, 340);
        }
        /* 조각이 다 없어지면 (다 붙이거나 봉투에 넣으면) 닫혀요 */
        function pcbEnd() { const S = pcbS; if (!S.pieces.length && S.bag.state === 'open' && !S.closing) S.closing = pcbNow() + 200; }

        /* 놓은 자리에 붙이기 : 화면에 보이던 크기 · 기울기 그대로 페이지에 붙어요 (js/stickerpeel.js 와 같은 방법) */
        function pcbStick(st) {
            const S = pcbS, a = S.assets[st.k], pg = pcbq('canvasArea');
            const r = pg.getBoundingClientRect(), k = r.width / (pg.offsetWidth || r.width) || 1;
            const cx = Math.min(r.right, Math.max(r.left, st.cx)), cy = Math.min(r.bottom, Math.max(r.top, st.cy));
            S.pieces = S.pieces.filter(p => p !== st); S.used.add(st.k);
            if (!addImage(a.src)) { pcbEnd(); return; }
            const el = pg.querySelector('.element-box:last-child');
            if (el) {
                const s = st.sGoal != null ? st.sGoal : st.s, w = (a.w - a.m * 2) * s / k, h = (a.h - a.m * 2) * s / k, PADB = 14;   // .element-box 안쪽 여백 6px · 테두리 1px (양쪽)
                const deg = Math.round(Math.max(-.5, Math.min(.5, st.rot)) * 180 / Math.PI * 10) / 10;
                const put = (px, py) => { el.dataset.posX = px; el.dataset.posY = py; el.style.transform = `translate(${px}px, ${py}px) scale(1) rotate(${deg}deg)`; };
                el.style.width = w + 'px'; el.style.height = h + 'px'; el.dataset.rotation = deg;
                const x = Math.round((cx - r.left) / k - (w + PADB) / 2), y = Math.round((cy - r.top) / k - (h + PADB) / 2);
                put(x, y);
                const b = el.getBoundingClientRect();
                put(Math.round(x + (cx - (b.left + b.width / 2)) / k), Math.round(y + (cy - (b.top + b.height / 2)) / k));
            }
            if (typeof saveData === 'function') saveData(false);
            if (S.pieces.length) pcbSay(`꾹! 붙였어요 ✨ 조각이 <b>${S.pieces.length}개</b> 남았어요`);
            else { pcbSay('꾹! 다 붙였어요 ✨'); pcbEnd(); }
        }

        /* ---------- 소리 : 봉투를 뜯을 때 · 뒷종이를 벗길 때 '찌이익' (js/stickerpeel.js 와 같은 소리) ---------- */
        let pcbGain = null;
        function pcbNoise(v) {
            if (!pcbGain && !v) return;
            const ac = typeof sndFx === 'function' ? sndFx() : null;
            if (!ac) { if (pcbGain) pcbGain.gain.value = 0; return; }
            if (!pcbGain) {
                const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .3 ? 1 : .3);
                const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
                const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = .7;
                pcbGain = ac.createGain(); pcbGain.gain.value = 0; src.connect(bp).connect(pcbGain).connect(sndOut()); src.start();
            }
            pcbGain.gain.setTargetAtTime(v, ac.currentTime, .03);
        }

        window.openPieceBag = openPieceBag; window.closePieceBag = closePieceBag;
