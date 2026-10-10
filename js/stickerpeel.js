/* 말랑달콤 다이어리 - js/stickerpeel.js
   🏷️ 씰스티커 떼어 붙이기 : 내스티커에서 고르거나 만들기에서 📌 붙이기를 누르면 페이지 앞에 스티커가 나와요 (🧩 조각스티커는 봉투 연출 js/piecebag.js)
   - 🏷️ 씰 : 하얀 네모(스티커 종이) 위에 씰이 있어요 → 가장자리를 잡고 떼어 원하는 곳에 놓으면 붙어요
             종이는 배경(화면) 한가운데에 나와요 · 사진고르기로 여러 장을 고르면 한 장의 종이에 씰이 여러 개 붙어 나와요 → 마지막 씰을 떼면 하얀 종이가 사라져요
             하얀 종이의 빈 곳을 누른 채 끌면 종이째 화면 안에서 옮겨져요 · 종이 바깥 날짜바를 끌면 페이지가 옮겨져요
             소리 : 떼어 낼 때 '찌익' 소리만
   - pelBake(src) : 📸 포토부스 사진처럼 네모난 그림 둘레에 하얀 칼선 테두리를 둘러요 (긴 변 PEL_MAX 이하 PNG)
   - 소리는 ⚙ 설정의 '✨ 연출 소리'를 따라요 (js/sound.js)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (스티커가 바로 붙어요) */

        const PEL_GRAB = 28, PEL_GRAB_OUT = 10, PEL_PAD = 22, PEL_M = 7, PEL_EDGE = 6, PEL_MAX = 360;
        /* items : 종이 위 스티커들 [{ a, src, st }] · a · st · src 는 지금 손에 잡은 스티커 */
        const pelS = { on: false, cv: null, ctx: null, fl: null, items: [], a: null, st: null, drag: null, board: null, mv: { x: 0, y: 0 }, gone: 0, src: '', W: 0, H: 0, DPR: 1, raf: 0, hint: '' };
        const pelq = id => document.getElementById(id);
        const pelMk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w)); c.height = Math.max(1, Math.round(h)); return c; };
        const pelLoad = src => new Promise((ok, no) => { const im = new Image(); if (/^https?:/i.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = no; im.src = src; });   // 주소 그림은 하얀 테두리를 그리려고 CORS 로
        function pelTint(src, fill) { const c = pelMk(src.width, src.height), d = c.getContext('2d'); d.drawImage(src, 0, 0); d.globalCompositeOperation = 'source-in'; d.fillStyle = fill; d.fillRect(0, 0, c.width, c.height); return c; }
        function pelGrow(src, r, step) { const c = pelMk(src.width, src.height), d = c.getContext('2d'); for (const k of [1, .66, .33]) for (let a = 0; a < 360; a += step) d.drawImage(src, Math.cos(a * Math.PI / 180) * r * k, Math.sin(a * Math.PI / 180) * r * k); d.drawImage(src, 0, 0); return c; }

        /* ---------- 하얀 칼선 테두리 두르기 ---------- */
        async function pelBake(src) {
            const im = await pelLoad(src);
            const k = Math.min(1, PEL_MAX / Math.max(im.width, im.height)), iw = Math.round(im.width * k), ih = Math.round(im.height * k);
            const b = PEL_EDGE, c = pelMk(iw + b * 2 + 4, ih + b * 2 + 4), x = c.getContext('2d');
            const one = pelMk(c.width, c.height); one.getContext('2d').drawImage(im, b + 2, b + 2, iw, ih);
            x.drawImage(pelTint(pelGrow(pelTint(one, '#fff'), b, 10), '#fff'), 0, 0);
            x.drawImage(one, 0, 0);
            return c.toDataURL('image/png');
        }

        /* ---------- 떼기용 그림 (앞면 · 뒷면 · 가장자리 점) ---------- */
        function pelAsset(img) {
            const m = PEL_M, w = img.width + m * 2, h = img.height + m * 2;
            const front = pelMk(w, h); front.getContext('2d').drawImage(img, m, m);
            const back = pelTint(front, '#f4efe9'), bk = back.getContext('2d');
            bk.globalCompositeOperation = 'source-atop'; bk.globalAlpha = .25;
            for (let i = 0; i < w * h / 120; i++) { bk.fillStyle = Math.random() < .5 ? '#fff' : '#e4dcd3'; bk.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
            const data = front.getContext('2d').getImageData(0, 0, w, h).data, edge = [];
            const A = (x, y) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : data[(y * w + x) * 4 + 3];
            const st = Math.max(2, Math.round(Math.max(w, h) / 160));
            for (let y = 0; y < h; y += st) for (let x = 0; x < w; x += st)
                if (A(x, y) > 128 && (A(x - st, y) <= 128 || A(x + st, y) <= 128 || A(x, y - st) <= 128 || A(x, y + st) <= 128)) edge.push([x - w / 2, y - h / 2]);
            return { w, h, m, front, back, edge, alpha: (lx, ly) => A(Math.round(lx + w / 2), Math.round(ly + h / 2)) };
        }

        /* ---------- 화면 ---------- */
        function pelBuild() {
            if (pelq('pelRoom')) return;
            const el = document.createElement('div');
            el.id = 'pelRoom'; el.className = 'pel-room';
            el.innerHTML = `<canvas id="pelCv"></canvas><p class="pel-hint" id="pelHint"></p><button type="button" class="pel-x" onclick="closeStickerPeel()" aria-label="닫기">✕</button>`;
            document.body.appendChild(el);
            const cv = pelq('pelCv');
            cv.addEventListener('pointerdown', pelDown); cv.addEventListener('pointermove', pelMove);
            cv.addEventListener('pointerup', pelUp); cv.addEventListener('pointercancel', pelUp);
            window.addEventListener('resize', () => { if (pelS.on) pelLayout(); });
        }
        const pelPage = () => document.getElementById('canvasArea');
        function pelLayout() {
            const S = pelS, cv = S.cv;
            S.DPR = Math.min(window.devicePixelRatio || 1, 3); S.W = window.innerWidth; S.H = window.innerHeight;
            cv.width = S.W * S.DPR; cv.height = S.H * S.DPR; S.fl = pelMk(cv.width, cv.height);
            /* 배경(화면) 가운데 하얀 종이 한 장 (크기는 페이지에 맞춰요) : 한 장이면 그 크기, 여러 장이면 칸을 나눠 나란히 */
            const pg = pelPage(), r = pg ? pg.getBoundingClientRect() : { left: 0, top: 0, width: S.W, height: S.H };
            let cx = S.W / 2, cy = S.H / 2;
            cx += S.mv.x; cy += S.mv.y;                                          // 종이를 옮긴 만큼
            const it = S.items, n = it.length, pw = Math.min(r.width, S.W);
            if (n === 1) {
                const a = it[0].a, s = Math.min(pw * .42 / a.w, S.H * .4 / a.h, 1);
                if (it[0].st.state === 'on') Object.assign(it[0].st, { cx, cy, s, rot: 0 });
                S.board = { cx, cy, w: (a.w - a.m * 2) * s + PEL_PAD * 2, h: (a.h - a.m * 2) * s + PEL_PAD * 2 };
                return pelKeep();
            }
            const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), G = 12;
            const cs = Math.min(150, (pw * .86 - PEL_PAD * 2 - G * (cols - 1)) / cols, (S.H * .6 - PEL_PAD * 2 - G * (rows - 1)) / rows);
            S.board = { cx, cy, w: cols * cs + G * (cols - 1) + PEL_PAD * 2, h: rows * cs + G * (rows - 1) + PEL_PAD * 2 };
            it.forEach((o, i) => {
                if (o.st.state !== 'on') return;
                const a = o.a, s = Math.min(1, cs / Math.max(a.w - a.m * 2, a.h - a.m * 2));
                const inRow = Math.min(cols, n - Math.floor(i / cols) * cols), sx = (cols - inRow) * (cs + G) / 2;   // 마지막 줄은 가운데로
                Object.assign(o.st, { cx: cx - S.board.w / 2 + PEL_PAD + sx + (i % cols) * (cs + G) + cs / 2, cy: cy - S.board.h / 2 + PEL_PAD + Math.floor(i / cols) * (cs + G) + cs / 2, s, rot: 0 });
            });
            pelKeep();
        }
        /* 하얀 종이 옮기기 : 종이와 종이 위 스티커를 같이 dx · dy 만큼 (화면 밖으로 안 나가게) */
        function pelShift(dx, dy) {
            const S = pelS, B = S.board;
            dx = Math.max(B.w / 2 - B.cx, Math.min(S.W - B.w / 2 - B.cx, dx)); dy = Math.max(B.h / 2 - B.cy, Math.min(S.H - B.h / 2 - B.cy, dy));
            if (B.w > S.W) dx = S.W / 2 - B.cx; if (B.h > S.H) dy = S.H / 2 - B.cy;
            B.cx += dx; B.cy += dy; S.mv.x += dx; S.mv.y += dy;
            for (const o of S.items) if (o.st.state === 'on') { o.st.cx += dx; o.st.cy += dy; }
        }
        const pelKeep = () => pelShift(0, 0);
        /* 📱 폰 (화면 폭 700 미만) : 스티커 창 · 하얀 종이 · 페이지가 늘 겹쳐서, 뗀 스티커를 붙일 동안 하얀 종이가 비켜 줘요
           💻 PC · 아이패드는 하얀 종이가 그대로 있어요 (진짜처럼) · 도련 · 2026-10-10 */
        const pelPhone = () => innerWidth < 700;
        const pelLeft = () => pelS.items.filter(o => o.st.state === 'on').length;
        function pelPick(o) { const S = pelS; S.a = o.a; S.st = o.st; S.src = o.src; }

        /* src : 그림 하나 또는 여러 개 [src, …] */
        async function openStickerPeel(src, opt) {                       // opt.ts : 🔤 글씨스티커 (붙인 뒤 📷 사진 꾸미기 창이 안 떠요)
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return false; }
            const list = Array.isArray(src) ? src : [src];
            let imgs;
            try { imgs = await Promise.all(list.map(pelLoad)); } catch (e) { showMsg('스티커를 열지 못했어요.'); return false; }
            if (!imgs.length) return false;
            pelBuild();
            const S = pelS;
            S.cv = pelq('pelCv'); S.ctx = S.cv.getContext('2d');
            S.items = imgs.map((im, i) => ({ a: pelAsset(im), src: list[i], st: { state: 'on' } })); pelPick(S.items[0]);
            S.ts = !!(opt && opt.ts); S.drag = null; S.gone = 0; S.back = 0; S.mv = { x: 0, y: 0 }; S.on = true;
            pelLayout();
            pelq('pelRoom').classList.add('show'); document.body.classList.add('fc-lock');
            S.hint = '';
            pelSay(S.items.length > 1 ? `씰이 <b>${S.items.length}개</b> 있어요! <b>가장자리</b>를 집어 하나씩 떼어 보세요` : '스티커 <b>가장자리</b>를 손톱으로 집듯이 잡고 천천히 떼어 보세요');
            cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(pelFrame);
            return true;
        }
        function closeStickerPeel() {
            const S = pelS; S.on = false; S.drag = null; pelNoise(0); cancelAnimationFrame(S.raf);
            const r = pelq('pelRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
            if (window.stkReturn) stkReturn();                                // ✨ 스티커 창에서 왔으면 다시 떠요
        }
        function pelSay(h) { const e = pelq('pelHint'); if (!e || pelS.hint === h) return; pelS.hint = h; e.innerHTML = h; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }

        /* ---------- 좌표 ---------- */
        const pelToStage = (st, lx, ly) => { const c = Math.cos(st.rot), s = Math.sin(st.rot); return [st.cx + (lx * c - ly * s) * st.s, st.cy + (lx * s + ly * c) * st.s]; };
        const pelToLocal = (st, x, y) => { const dx = (x - st.cx) / st.s, dy = (y - st.cy) / st.s, c = Math.cos(-st.rot), s = Math.sin(-st.rot); return [dx * c - dy * s, dx * s + dy * c]; };

        /* ---------- 그리기 ---------- */
        function pelDraw(ctx, img, st, extra = 1, flip = 1, sh = null) {
            ctx.save();
            if (sh) { ctx.shadowColor = sh.c; ctx.shadowBlur = sh.b; ctx.shadowOffsetY = sh.y; ctx.shadowOffsetX = sh.x || 0; }
            ctx.translate(st.cx, st.cy); ctx.rotate(st.rot); ctx.scale(st.s * extra * flip, st.s * extra);
            ctx.drawImage(img, -img.width / 2, -img.height / 2); ctx.restore();
        }
        function pelHalf(c, M, n, sign) {
            const p = [-n[1], n[0]], L = 4000; c.beginPath();
            c.moveTo(M[0] + p[0] * L, M[1] + p[1] * L); c.lineTo(M[0] - p[0] * L, M[1] - p[1] * L);
            c.lineTo(M[0] - p[0] * L + n[0] * L * sign, M[1] - p[1] * L + n[1] * L * sign); c.lineTo(M[0] + p[0] * L + n[0] * L * sign, M[1] + p[1] * L + n[1] * L * sign); c.closePath();
        }
        const PEL_FLAT = { c: 'rgba(90,60,70,.12)', b: 2, y: 1 }, PEL_UP = { c: 'rgba(80,50,60,.25)', b: 18, y: 12 };
        /* 잡은 점(C)과 손가락(F) 사이를 접는 선으로, 들린 쪽은 뒤집어 뒷면을 그려요 (씰스티커 R&D 와 같은 방법) */
        function pelDrawPeel(ctx, o, C, F) {
            const S = pelS, a = o.a, st = o.st, base = PEL_FLAT;
            const dx = F[0] - C[0], dy = F[1] - C[1], len = Math.hypot(dx, dy);
            if (len < .5) { pelDraw(ctx, a.front, st, 1, 1, base); return; }
            const n = [dx / len, dy / len], M = [(C[0] + F[0]) / 2, (C[1] + F[1]) / 2];
            ctx.save(); pelHalf(ctx, M, n, 1); ctx.clip(); pelDraw(ctx, a.front, st, 1, 1, base); ctx.restore();
            const md = M[0] * n[0] + M[1] * n[1];
            const A = 1 - 2 * n[0] * n[0], B = -2 * n[0] * n[1], D = 1 - 2 * n[1] * n[1], E = 2 * md * n[0], Fv = 2 * md * n[1], R = S.DPR;
            const L = S.fl.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, S.fl.width, S.fl.height);
            L.setTransform(R * A, R * B, R * B, R * D, R * E, R * Fv);
            L.save(); pelHalf(L, M, n, -1); L.clip();
            L.translate(st.cx, st.cy); L.rotate(st.rot); L.scale(st.s, st.s); L.drawImage(a.back, -a.w / 2, -a.h / 2, a.w, a.h); L.restore();
            L.setTransform(R, 0, 0, R, 0, 0); L.globalCompositeOperation = 'source-atop';                               // 말린 느낌 음영
            const span = Math.max(20, len / 2), g = L.createLinearGradient(M[0], M[1], M[0] + n[0] * span, M[1] + n[1] * span);
            g.addColorStop(0, 'rgba(110,80,90,.35)'); g.addColorStop(.18, 'rgba(255,255,255,.25)'); g.addColorStop(.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(150,120,130,.15)');
            L.fillStyle = g; L.fillRect(0, 0, S.W, S.H); L.globalCompositeOperation = 'source-over';
            ctx.save(); ctx.shadowColor = 'rgba(80,50,60,.28)'; ctx.shadowBlur = 10 + Math.min(14, len / 12); ctx.shadowOffsetX = n[0] * 4; ctx.shadowOffsetY = 4 + n[1] * 3;
            ctx.drawImage(S.fl, 0, 0, S.W, S.H); ctx.restore();
        }
        function pelRR(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
        function pelFrame(t) {
            const S = pelS; if (!S.on) return;
            const ctx = S.ctx, st = S.st, a = S.a;
            ctx.setTransform(S.DPR, 0, 0, S.DPR, 0, 0); ctx.clearRect(0, 0, S.W, S.H);
            const bo = S.gone ? Math.max(0, 1 - (t - S.gone) / 260)              // 마지막 스티커를 떼어 내면 스르르 사라져요 (📱 폰은 뗄 때마다)
                : S.back ? Math.min(1, (t - S.back) / 260) : 1;                  // 📱 붙이고 나면 남은 스티커와 같이 다시 스르르
            if (bo > 0) {                                                        // 어둡게 깔기 + 🏷️ 하얀 네모 (스티커 종이)
                ctx.save(); ctx.globalAlpha = bo; ctx.fillStyle = 'rgba(90,60,70,.10)'; ctx.fillRect(0, 0, S.W, S.H); ctx.restore();
                const B = S.board, bx = B.cx - B.w / 2, by = B.cy - B.h / 2;
                ctx.save(); ctx.globalAlpha = bo; ctx.shadowColor = 'rgba(120,80,95,.25)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = 4;
                pelRR(ctx, bx, by, B.w, B.h, 14); const g = ctx.createLinearGradient(bx, by, bx + B.w, by + B.h);
                g.addColorStop(0, '#fdfdff'); g.addColorStop(.5, '#f4f6fb'); g.addColorStop(1, '#fbfcff'); ctx.fillStyle = g; ctx.fill(); ctx.restore();
            }
            const d = S.drag, cur = S.items.find(o => o.st === st);
            for (const o of S.items) {                                           // 종이 위에 남은 스티커들 (잡은 건 맨 위에)
                if (o.st.state !== 'on') continue;
                if (o === cur && ((d && d.mode === 'peel') || o.st.snap)) continue;
                if (bo < 1) { if (bo <= 0) continue; ctx.save(); ctx.globalAlpha = bo; }
                if (o.st.snap) pelSnap(ctx, o, t); else pelDraw(ctx, o.a.front, o.st, 1, 1, PEL_FLAT);
                if (bo < 1) ctx.restore();
            }
            if (cur && d && d.mode === 'peel') pelDrawPeel(ctx, cur, d.C, d.F);
            else if (cur && st.state === 'on' && st.snap) pelSnap(ctx, cur, t);
            else if (cur && st.state === 'free') {
                const fp = Math.min(1, (t - st.t0) / 220), flip = Math.cos(Math.PI * (1 - fp));                // 뒷면 → 앞면으로 뒤집혀요
                pelDraw(ctx, flip < 0 ? a.back : a.front, st, 1.07, Math.max(.05, Math.abs(flip)) * (flip < 0 ? -1 : 1), PEL_UP);
            }
            S.raf = requestAnimationFrame(pelFrame);
        }
        /* 덜 떼다 놓으면 제자리로 착 붙어요 */
        function pelSnap(ctx, o, t) {
            const sn = o.st.snap, q = Math.min(1, (t - sn.t0) / 260), e = 1 - Math.pow(1 - q, 3);
            pelDrawPeel(ctx, o, sn.C, [sn.F[0] + (sn.C[0] - sn.F[0]) * e, sn.F[1] + (sn.C[1] - sn.F[1]) * e]);
            if (q >= 1) o.st.snap = null;
        }

        /* ---------- 손가락 ---------- */
        function pelPeeled(st, C, F) {
            const dx = F[0] - C[0], dy = F[1] - C[1], len = Math.hypot(dx, dy); if (len < 1) return 0;
            const n = [dx / len, dy / len], M = [(C[0] + F[0]) / 2, (C[1] + F[1]) / 2]; let off = 0;
            for (const [lx, ly] of pelS.a.edge) { const [x, y] = pelToStage(st, lx, ly); if ((x - M[0]) * n[0] + (y - M[1]) * n[1] < 0) off++; }
            return off / pelS.a.edge.length;
        }
        function pelDown(e) {
            const S = pelS; if (!S.on || S.drag || S.st.state === 'free') return;
            e.preventDefault(); const P = [e.clientX, e.clientY];
            let best = 1e12, bp = null, bo = null, hit = null;                   // 손가락에서 가장 가까운 스티커 가장자리
            for (const o of S.items) {
                if (o.st.state !== 'on') continue;
                const [lx, ly] = pelToLocal(o.st, P[0], P[1]);
                for (const q of o.a.edge) { const dd = ((q[0] - lx) ** 2 + (q[1] - ly) ** 2) * o.st.s * o.st.s; if (dd < best) { best = dd; bp = q; bo = o; } }
                if (!hit && o.a.alpha(lx, ly) > 128) hit = o;
            }
            /* 스티커 안쪽 가장자리는 넉넉히(PEL_GRAB) · 바깥(종이 빈 곳)은 조금만(PEL_GRAB_OUT) → 나머지 빈 곳은 종이 옮기기 */
            if (bp && Math.sqrt(best) < (hit === bo ? PEL_GRAB : PEL_GRAB_OUT)) {
                pelPick(bo); const st = S.st, C = pelToStage(st, bp[0], bp[1]); st.snap = null;
                S.drag = { mode: 'peel', C, F: C.slice(), start: P, last: P, lt: performance.now() };
                try { S.cv.setPointerCapture(e.pointerId); } catch (er) {}
                pelSay('살살… 천천히 당겨요'); return;
            }
            if (hit) { pelSay('가운데 말고 <b>가장자리</b>를 집어야 떨어져요'); pelWiggle(hit.st); return; }
            const B = S.board;                                                   // 하얀 종이 빈 곳 → 종이 옮기기
            if (B && Math.abs(P[0] - B.cx) <= B.w / 2 && Math.abs(P[1] - B.cy) <= B.h / 2) {
                S.drag = { mode: 'board', last: P, lt: performance.now() };
                try { S.cv.setPointerCapture(e.pointerId); } catch (er) {}
                return;
            }
            if (window.pgmOnBar && pgmOnBar(P[0], P[1])) pgmBegin(e);                // 종이 바깥 날짜바 위 → 페이지 옮기기 (js/page.js)
        }
        function pelMove(e) {
            const S = pelS, d = S.drag; if (!d) return;
            const P = [e.clientX, e.clientY], now = performance.now();
            if (P[0] === d.last[0] && P[1] === d.last[1]) return;              // ✏️ 펜슬은 제자리에서 누르는 힘만 바뀌어도 움직임이 와요 → 무시 (소리가 끊기지 않게)
            if (d.mode === 'board') { pelShift(P[0] - d.last[0], P[1] - d.last[1]); d.last = P; return; }
            const sp = Math.hypot(P[0] - d.last[0], P[1] - d.last[1]) / Math.max(1, now - d.lt); d.last = P; d.lt = now;
            if (d.mode === 'peel') {
                const dx = P[0] - d.start[0], dy = P[1] - d.start[1], k = Math.min(1, .45 + Math.hypot(dx, dy) / 220);   // 끈적임
                d.F = [d.C[0] + dx * k, d.C[1] + dy * k];
                pelNoise(Math.min(.35, sp * .25));
                const fr = pelPeeled(S.st, d.C, d.F);
                if (fr > .55 && !d.half) { d.half = 1; pelSay('거의 다 됐어요… 조금만 더!'); }
                if (fr >= .78) pelDetach(P);
            } else {
                const st = S.st, nx = P[0] - d.off[0], ny = P[1] - d.off[1];
                st.rot = Math.max(-.35, Math.min(.35, st.rot + (nx - st.cx) * .004 - (st.rot - d.baseRot) * .08)); st.cx = nx; st.cy = ny;
            }
        }
        function pelDetach(P) {
            const S = pelS, st = S.st, d = S.drag, [lx, ly] = pelToLocal(st, d.C[0], d.C[1]);
            st.state = 'free'; st.t0 = performance.now();
            if (!pelLeft() || pelPhone()) { S.gone = performance.now(); S.back = 0; }   // 마지막 스티커면 하얀 종이도 사라져요 · 📱 폰은 페이지가 가려서 뗄 때마다 비켜 줘요
            const [gx, gy] = pelToStage(st, lx, ly);
            S.drag = { mode: 'free', off: [gx - st.cx, gy - st.cy], baseRot: st.rot, last: P, lt: performance.now() };
            st.cx = P[0] - S.drag.off[0]; st.cy = P[1] - S.drag.off[1];
            pelNoise(0); if (navigator.vibrate) navigator.vibrate(15);
            pelSay('톡! 떼어졌어요 ✨ 원하는 곳에 놓아 보세요');
        }
        function pelUp() {
            const S = pelS, d = S.drag; if (!d) return;
            const st = S.st; pelNoise(0); S.drag = null;
            if (d.mode === 'board') return;
            if (d.mode === 'peel') {
                st.snap = { C: d.C, F: d.F, t0: performance.now() };
                if (Math.hypot(d.F[0] - d.C[0], d.F[1] - d.C[1]) > 20) pelSay('앗, 다시 붙어버렸어요 🫣 가장자리를 잡고 다시 떼어 보세요');
                return;
            }
            if (navigator.vibrate) navigator.vibrate(8);
            pelStick();
        }
        function pelWiggle(st) { const r = st.rot, t0 = performance.now(); (function w() { const q = (performance.now() - t0) / 300; st.rot = r + Math.sin(q * Math.PI * 4) * .04 * (1 - q); if (q < 1) requestAnimationFrame(w); else st.rot = r; })(); }

        /* 놓은 자리에 붙이기 : 화면에 보이던 크기 · 기울기 그대로 페이지에 붙어요 */
        function pelStick() {
            const S = pelS, st = S.st, a = S.a, pg = pelPage();
            const r = pg.getBoundingClientRect(), k = r.width / (pg.offsetWidth || r.width) || 1;
            const cx = Math.min(r.right, Math.max(r.left, st.cx)), cy = Math.min(r.bottom, Math.max(r.top, st.cy));
            if (!addImage(S.src)) { closeStickerPeel(); return; }
            const el = pg.querySelector('.element-box:last-child');
            if (el && S.ts) el.dataset.ts = 1;
            if (el) {
                const w = (a.w - a.m * 2) * st.s / k, h = (a.h - a.m * 2) * st.s / k, PADB = 14;     // .element-box 안쪽 여백 6px · 테두리 1px (양쪽)
                const deg = Math.round(st.rot * 180 / Math.PI * 10) / 10;
                const put = (px, py) => { el.dataset.posX = px; el.dataset.posY = py; el.style.transform = `translate(${px}px, ${py}px) scale(1) rotate(${deg}deg)`; };
                el.style.width = w + 'px'; el.style.height = h + 'px'; el.dataset.rotation = deg;
                const x = Math.round((cx - r.left) / k - (w + PADB) / 2), y = Math.round((cy - r.top) / k - (h + PADB) / 2);
                put(x, y);
                const b = el.getBoundingClientRect();                                  // 페이지 안 다른 것들 때문에 생기는 차이까지 맞춰요
                put(Math.round(x + (cx - (b.left + b.width / 2)) / k), Math.round(y + (cy - (b.top + b.height / 2)) / k));
            }
            st.state = 'done';
            if (typeof saveData === 'function') saveData(false);
            const left = S.items.filter(o => o.st.state === 'on');
            if (!left.length) { closeStickerPeel(); return; }
            if (S.gone) { S.gone = 0; S.back = performance.now(); }              // 📱 하얀 종이가 남은 스티커와 다시 나타나요
            pelPick(left[0]);                                                    // 종이에 남은 스티커는 계속 떼어 붙여요
            S.hint = ''; pelSay(`붙었어요 ✨ 종이에 <b>${left.length}개</b> 남았어요`);
        }

        /* ---------- 소리 : 🏷️ 씰을 떼어 낼 때 '찌익'만 ---------- */
        let pelGain = null;
        function pelNoise(v) {
            if (!pelGain && !v) return;
            const ac = typeof sndFx === 'function' ? sndFx() : null;
            if (!ac) { if (pelGain) pelGain.gain.value = 0; return; }
            if (!pelGain) {
                const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
                for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .3 ? 1 : .3);
                const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
                const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = .7;
                pelGain = ac.createGain(); pelGain.gain.value = 0; src.connect(bp).connect(pelGain).connect(sndOut()); src.start();
            }
            pelGain.gain.setTargetAtTime(v, ac.currentTime, .03);
        }

        window.openStickerPeel = openStickerPeel; window.pelBake = pelBake; window.closeStickerPeel = closeStickerPeel;
