/* 말랑달콤 다이어리 - js/peelfx.js
   🏷️ 씰스티커처럼 떼어지는 연출 (짧게 저절로) : 🍭 미니시트에서 뗄 때(js/stickerpack.js) · 페이지에 붙은 스티커를 옮길 때(js/elements.js makeTransformable)
   - 끄는 방향 뒤쪽 가장자리가 먼저 들려서 앞으로 접혀 넘어가요 (접힌 쪽은 크림색 뒷면 + 그림자)
   - pfxPeel(el, x, y, dx, dy, rotDeg, done) : 화면 좌표 (x, y)를 잡고 (dx, dy) 방향으로 떼기 · 끝나면 done() · 돌려준 함수를 부르면 바로 멈춰요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (연출 없이 바로 떠요) */

        const PFX_MS = 190, PFX_UPTO = .72;
        function pfxPeel(el, x, y, dx, dy, rotDeg, done) {
            const w = el.offsetWidth, h = el.offsetHeight, len = Math.hypot(dx, dy);
            if (!w || !h || !len) { done(); return () => {}; }
            /* 화면 → 스티커 안쪽 좌표 (회전 · 크기 되돌리기) */
            const r = el.getBoundingClientRect(), a = (rotDeg || 0) * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
            const S = r.width / (w * Math.abs(c) + h * Math.abs(s)) || 1;
            const qx = (x - (r.left + r.width / 2)) / S, qy = (y - (r.top + r.height / 2)) / S;
            const G = [w / 2 + qx * c + qy * s, h / 2 - qx * s + qy * c];
            const n = [(dx * c + dy * s) / len, (-dx * s + dy * c) / len];
            /* 잡은 곳에서 끄는 반대쪽으로 가장 먼 가장자리 = 처음 들리는 곳(C) · 그 맞은편까지 길이(span) */
            const hit = (p, d) => { let t = 1e9; if (d[0]) t = Math.min(t, ((d[0] > 0 ? w : 0) - p[0]) / d[0]); if (d[1]) t = Math.min(t, ((d[1] > 0 ? h : 0) - p[1]) / d[1]); return Math.max(0, t); };
            const P = [Math.min(w, Math.max(0, G[0])), Math.min(h, Math.max(0, G[1]))];
            const back = hit(P, [-n[0], -n[1]]), C = [P[0] - n[0] * back, P[1] - n[1] * back], span = hit(C, n);

            /* 접혀 넘어간 뒷면 : 감싸는 상자(뒤집기 + 그림자) 안에 똑같이 생긴 복사본(크림색 · 반쪽만) */
            const wrap = document.createElement('div'), cs = getComputedStyle(el);
            wrap.className = 'pfx-flap';
            Object.assign(wrap.style, { position: cs.position === 'fixed' ? 'fixed' : 'absolute', left: el.offsetLeft + 'px', top: el.offsetTop + 'px', width: w + 'px', height: h + 'px', zIndex: cs.zIndex });
            const cp = el.cloneNode(true);
            cp.querySelectorAll('.handle, .rot-zone').forEach(q => q.remove());
            cp.classList.remove('selected', 'lifting', 'drag', 'back');
            Object.assign(cp.style, { position: 'absolute', left: '0', top: '0', margin: '0', transform: 'none', width: w + 'px', height: h + 'px', boxSizing: 'border-box' });
            cp.classList.add('pfx-back');
            wrap.appendChild(cp);
            el.parentNode.insertBefore(wrap, el.nextSibling);

            const half = (M, sg) => { const p = [-n[1] * 4000, n[0] * 4000], q = [n[0] * 4000 * sg, n[1] * 4000 * sg];
                return `polygon(${M[0] + p[0]}px ${M[1] + p[1]}px, ${M[0] - p[0]}px ${M[1] - p[1]}px, ${M[0] - p[0] + q[0]}px ${M[1] - p[1] + q[1]}px, ${M[0] + p[0] + q[0]}px ${M[1] + p[1] + q[1]}px)`; };
            const base = el.style.transform, t0 = performance.now();
            let raf = 0, over = false;
            const frame = now => {
                if (over) return;
                const k = Math.min(1, (now - t0) / PFX_MS), e = 1 - Math.pow(1 - k, 2), d = Math.max(.5, span * 2 * PFX_UPTO * e);
                const M = [C[0] + n[0] * d / 2, C[1] + n[1] * d / 2], md = M[0] * n[0] + M[1] * n[1];
                el.style.clipPath = half(M, 1);                                       // 아직 붙어 있는 쪽
                cp.style.clipPath = half(M, -1);                                      // 들린 쪽 → 접는 선으로 뒤집어요
                const A = 1 - 2 * n[0] * n[0], B = -2 * n[0] * n[1], D = 1 - 2 * n[1] * n[1];
                wrap.style.transform = `${base} translate(${-w / 2}px, ${-h / 2}px) matrix(${A}, ${B}, ${B}, ${D}, ${2 * md * n[0]}, ${2 * md * n[1]}) translate(${w / 2}px, ${h / 2}px)`;
                if (k < 1) raf = requestAnimationFrame(frame); else { stop(); done(); }
            };
            const stop = () => { if (over) return; over = true; cancelAnimationFrame(raf); el.style.clipPath = ''; wrap.remove(); };
            frame(t0);
            return stop;
        }
        window.pfxPeel = pfxPeel;

/* =====================================================================
   🏷️ 손가락을 따라 떼어지는 씰스티커 (씰스티커_RnD/seal-sticker-test.html 의 drawPeel · peeledInfo · detach 를 그대로 옮겼어요)
   pfxSeal({ src, cx, cy, w, h, rot, x, y, onDetach, onDrop, onCancel })
   - src : img · canvas (그림) · cx, cy : 화면에 보이는 가운데 · w, h : 화면에 보이는 크기 · rot : 라디안 · (x, y) : 처음 누른 자리
   - 누른 자리에서 가장 가까운 가장자리(C)가 먼저 들려요 → 끄는 손가락(F)을 끈적하게 따라 접혀 넘어가요 (뒷면 크림색 + 말린 음영 + 그림자)
   - 가장자리가 78% 넘게 들리면 '톡' 떼어져서(onDetach) 뒷면 → 앞면으로 뒤집히며 1.07배로 떠서 손가락을 따라와요
   - 놓으면 : 다 뗐으면 onDrop(cx, cy, rot) · 덜 뗐으면 제자리로 착 다시 붙고 onCancel()
   - 돌려준 { move(x, y), up(), kill() } 로 손가락 움직임을 넘겨 줘요 (화면 맨 위 투명 캔버스에 그려요)
   ===================================================================== */
        const PFX_DETACH = .78;
        function pfxMk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
        /* 앞면 · 뒷면(누런 흰 종이) · 가장자리 점들 */
        function pfxAsset(src, w, h) {
            const R = Math.min(3, window.devicePixelRatio || 1), m = 2, W = Math.ceil((w + m * 2) * R), H = Math.ceil((h + m * 2) * R);
            const front = pfxMk(W, H), f = front.getContext('2d'); f.drawImage(src, m * R, m * R, w * R, h * R);
            const back = pfxMk(W, H), bk = back.getContext('2d');
            bk.drawImage(front, 0, 0); bk.globalCompositeOperation = 'source-in'; bk.fillStyle = '#f4efe9'; bk.fillRect(0, 0, W, H);
            bk.globalCompositeOperation = 'source-atop'; bk.globalAlpha = .25;
            for (let i = 0; i < W * H / 300; i++) { bk.fillStyle = Math.random() < .5 ? '#fff' : '#e4dcd3'; bk.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
            const aw = w + m * 2, ah = h + m * 2, edge = [];
            let A = null;
            try { const d = f.getImageData(0, 0, W, H).data; A = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? 0 : d[(y * W + x) * 4 + 3]; } catch (e) { A = null; }   // 다른 곳 그림이라 못 읽으면 네모 가장자리
            if (A) {
                const st = Math.max(2, Math.round(Math.max(W, H) / 120));
                for (let y = 0; y < H; y += st) for (let x = 0; x < W; x += st)
                    if (A(x, y) > 128 && (A(x - st, y) <= 128 || A(x + st, y) <= 128 || A(x, y - st) <= 128 || A(x, y + st) <= 128)) edge.push([x / R - aw / 2, y / R - ah / 2]);
            }
            if (edge.length < 8) for (let i = 0; i <= 40; i++) { const q = i / 40; edge.push([-w / 2 + w * q, -h / 2], [-w / 2 + w * q, h / 2], [-w / 2, -h / 2 + h * q], [w / 2, -h / 2 + h * q]); }
            return { w: aw, h: ah, front, back, edge };
        }
        /* 찌익 · 톡 소리 (씰스티커 시트와 같은 소리 · 설정의 '연출 소리'를 따라요 · js/sound.js) */
        const pfxSnd = { ac: null, g: null };
        function pfxNoise(v) {
            if (!v && !pfxSnd.g) return;
            const ac = typeof sndFx === 'function' ? sndFx() : null; if (!ac) return;
            try {
                if (pfxSnd.ac !== ac) {
                    const buf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate), d = buf.getChannelData(0);
                    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (Math.random() < .3 ? 1 : .3);
                    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
                    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = .7;
                    pfxSnd.g = ac.createGain(); pfxSnd.g.gain.value = 0; src.connect(bp).connect(pfxSnd.g).connect(sndOut() || ac.destination); src.start(); pfxSnd.ac = ac;
                }
                pfxSnd.g.gain.setTargetAtTime(v, ac.currentTime, .03);
            } catch (e) {}
        }
        function pfxPop(f1, f2, v) {
            const ac = typeof sndFx === 'function' ? sndFx() : null; if (!ac) return;
            try {
                const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
                o.frequency.setValueAtTime(f1, t); o.frequency.exponentialRampToValueAtTime(f2, t + .09); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .12);
                o.connect(g).connect(sndOut() || ac.destination); o.start(t); o.stop(t + .13);
            } catch (e) {}
        }
        function pfxSeal(o) {
            const DPR = Math.min(window.devicePixelRatio || 1, 3), VW = window.innerWidth, VH = window.innerHeight;
            const cv = pfxMk(VW * DPR, VH * DPR); cv.className = 'pfx-stage'; document.body.appendChild(cv);
            const ctx = cv.getContext('2d'), fl = pfxMk(VW * DPR, VH * DPR);
            const asset = pfxAsset(o.src, o.w, o.h), st = { cx: o.cx, cy: o.cy, rot: o.rot || 0, s: 1, state: 'on' };
            const toStage = (lx, ly) => { const c = Math.cos(st.rot), s = Math.sin(st.rot); return [st.cx + (lx * c - ly * s) * st.s, st.cy + (lx * s + ly * c) * st.s]; };
            const toLocal = (x, y) => { const dx = (x - st.cx) / st.s, dy = (y - st.cy) / st.s, c = Math.cos(-st.rot), s = Math.sin(-st.rot); return [dx * c - dy * s, dx * s + dy * c]; };
            /* 들리는 가장자리 : 끄는 방향의 반대쪽 끝(손가락 줄 위)에서부터 접혀 넘어와요 · 스티커가 커도 손가락 한 뼘이면 떨어지게 */
            const pickEdge = (vx, vy) => {
                const v = Math.hypot(vx, vy) || 1, ux = vx / v, uy = vy / v; let best = 1e12, bp = null, lo = 1e9, hi = -1e9;
                const pts = asset.edge.map(q => toStage(q[0], q[1]));
                for (const [x, y] of pts) { const pr = x * ux + y * uy; lo = Math.min(lo, pr); hi = Math.max(hi, pr); }
                for (const [x, y] of pts) { const pr = (x - o.x) * ux + (y - o.y) * uy, pp = Math.abs((x - o.x) * -uy + (y - o.y) * ux), sc = pr + pp * .6; if (sc < best) { best = sc; bp = [x, y]; } }
                return { C: bp, gain: Math.max(1, (hi - lo) / 95) };
            };
            let drag = { mode: 'peel', C: null, F: null, start: [o.x, o.y], last: [o.x, o.y], lt: performance.now() }, snap = null, raf = 0, dead = false;

            const applyT = (c, extraS = 1, flipX = 1) => { c.translate(st.cx, st.cy); c.rotate(st.rot); c.scale(st.s * extraS * flipX, st.s * extraS); };
            const halfPlane = (c, M, n, sign) => { const p = [-n[1], n[0]], L = 4000; c.beginPath();
                c.moveTo(M[0] + p[0] * L, M[1] + p[1] * L); c.lineTo(M[0] - p[0] * L, M[1] - p[1] * L);
                c.lineTo(M[0] - p[0] * L + n[0] * L * sign, M[1] - p[1] * L + n[1] * L * sign); c.lineTo(M[0] + p[0] * L + n[0] * L * sign, M[1] + p[1] * L + n[1] * L * sign); c.closePath(); };
            function drawSticker(img, extra = 1, flip = 1, shadow = null) {
                ctx.save();
                if (shadow) { ctx.shadowColor = shadow.c; ctx.shadowBlur = shadow.b; ctx.shadowOffsetY = shadow.y; ctx.shadowOffsetX = shadow.x || 0; }
                applyT(ctx, extra, flip); ctx.drawImage(img, -asset.w / 2, -asset.h / 2, asset.w, asset.h); ctx.restore();
            }
            function drawPeel(img, C, F) {
                const dx = F[0] - C[0], dy = F[1] - C[1], len = Math.hypot(dx, dy);
                if (len < .5) { drawSticker(img, 1, 1, { c: 'rgba(90,60,70,.12)', b: 2, y: 1 }); return; }
                const n = [dx / len, dy / len], M = [(C[0] + F[0]) / 2, (C[1] + F[1]) / 2];
                // 붙어 있는 부분
                ctx.save(); halfPlane(ctx, M, n, 1); ctx.clip(); drawSticker(img, 1, 1, { c: 'rgba(90,60,70,.12)', b: 2, y: 1 }); ctx.restore();
                // 들린 부분(뒷면) = 접힌 선을 기준으로 뒤집어 그림
                const md = M[0] * n[0] + M[1] * n[1];
                const a = 1 - 2 * n[0] * n[0], b = -2 * n[0] * n[1], d = 1 - 2 * n[1] * n[1], e = 2 * md * n[0], f = 2 * md * n[1];
                const L = fl.getContext('2d'); L.setTransform(1, 0, 0, 1, 0, 0); L.clearRect(0, 0, fl.width, fl.height);
                L.setTransform(DPR * a, DPR * b, DPR * b, DPR * d, DPR * e, DPR * f);
                L.save(); halfPlane(L, M, n, -1); L.clip();
                L.translate(st.cx, st.cy); L.rotate(st.rot); L.scale(st.s, st.s); L.drawImage(asset.back, -asset.w / 2, -asset.h / 2, asset.w, asset.h); L.restore();
                // 말린 느낌 음영 : 접힌 선 근처는 어둡고, 가운데는 밝게
                L.setTransform(DPR, 0, 0, DPR, 0, 0); L.globalCompositeOperation = 'source-atop';
                const span = Math.max(20, len / 2), g = L.createLinearGradient(M[0], M[1], M[0] + n[0] * span, M[1] + n[1] * span);
                g.addColorStop(0, 'rgba(110,80,90,.35)'); g.addColorStop(.18, 'rgba(255,255,255,.25)'); g.addColorStop(.45, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(150,120,130,.15)');
                L.fillStyle = g; L.fillRect(0, 0, VW, VH); L.globalCompositeOperation = 'source-over';
                // 들린 부분이 드리우는 그림자
                ctx.save(); ctx.shadowColor = 'rgba(80,50,60,.28)'; ctx.shadowBlur = 10 + Math.min(14, len / 12); ctx.shadowOffsetX = n[0] * 4; ctx.shadowOffsetY = 4 + n[1] * 3;
                ctx.drawImage(fl, 0, 0, VW, VH); ctx.restore();
            }
            function peeledInfo(C, F) {
                const dx = F[0] - C[0], dy = F[1] - C[1], len = Math.hypot(dx, dy); if (len < 1) return 0;
                const n = [dx / len, dy / len], M = [(C[0] + F[0]) / 2, (C[1] + F[1]) / 2]; let off = 0;
                for (const [lx, ly] of asset.edge) { const [x, y] = toStage(lx, ly); if ((x - M[0]) * n[0] + (y - M[1]) * n[1] < 0) off++; }
                return off / asset.edge.length;
            }
            function frame(t) {
                if (dead) return;
                ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, VW, VH);
                if (drag && drag.mode === 'peel') { if (drag.C) drawPeel(asset.front, drag.C, drag.F); else drawSticker(asset.front, 1, 1, { c: 'rgba(90,60,70,.12)', b: 2, y: 1 }); }
                else if (snap) {
                    const q = Math.min(1, (t - snap.t0) / 260), e = 1 - Math.pow(1 - q, 3);
                    drawPeel(asset.front, snap.C, [snap.F[0] + (snap.C[0] - snap.F[0]) * e, snap.F[1] + (snap.C[1] - snap.F[1]) * e]);
                    if (q >= 1) { kill(); if (o.onCancel) o.onCancel(); return; }
                } else if (st.state === 'free') {
                    const fp = Math.min(1, (t - st.t0) / 220), flip = Math.cos(Math.PI * (1 - fp));          // 뒷면 → 앞면 뒤집기
                    drawSticker(flip < 0 ? asset.back : asset.front, 1.07, Math.max(.05, Math.abs(flip)) * (flip < 0 ? -1 : 1), { c: 'rgba(80,50,60,.25)', b: 18, y: 12 });
                }
                raf = requestAnimationFrame(frame);
            }
            function detach(P) {
                const [lx, ly] = toLocal(drag.C[0], drag.C[1]);
                st.state = 'free'; st.t0 = performance.now();
                const [gx, gy] = toStage(lx, ly);                                                           // 손가락 끝에 잡은 지점이 오도록
                drag = { mode: 'free', off: [gx - st.cx, gy - st.cy], baseRot: st.rot, last: P, lt: performance.now() };
                st.cx = P[0] - drag.off[0]; st.cy = P[1] - drag.off[1];
                pfxNoise(0); pfxPop(660, 180, .18);
                try { if (navigator.vibrate) navigator.vibrate(15); } catch (e) {}
                if (o.onDetach) o.onDetach();
            }
            function move(x, y) {
                if (!drag || dead) return; const P = [x, y], now = performance.now();
                const sp = Math.hypot(P[0] - drag.last[0], P[1] - drag.last[1]) / Math.max(1, now - drag.lt); drag.last = P; drag.lt = now;
                if (drag.mode === 'peel') {
                    pfxNoise(Math.min(.35, sp * .25));
                    // 끈적임 : 처음엔 손가락보다 덜 따라오다가 점점 같이 움직여요
                    const dx = P[0] - drag.start[0], dy = P[1] - drag.start[1], L = Math.hypot(dx, dy), k = Math.min(1, .45 + L / 220);
                    if (!drag.C) { if (L < 2) return; const e = pickEdge(dx, dy); drag.C = e.C; drag.gain = e.gain; }
                    drag.F = [drag.C[0] + dx * k * drag.gain, drag.C[1] + dy * k * drag.gain];
                    if (peeledInfo(drag.C, drag.F) >= PFX_DETACH) detach(P);
                } else if (drag.mode === 'free') {
                    const nx = P[0] - drag.off[0], ny = P[1] - drag.off[1];
                    st.rot += (nx - st.cx) * .004 - (st.rot - drag.baseRot) * .08; st.cx = nx; st.cy = ny;
                }
            }
            function up() {
                if (!drag || dead) return; const d = drag; drag = null;
                if (d.mode === 'peel') { pfxNoise(0); if (!d.C) { kill(); if (o.onCancel) o.onCancel(); return; } snap = { C: d.C, F: d.F, t0: performance.now() };
                    if (Math.hypot(d.F[0] - d.C[0], d.F[1] - d.C[1]) > 20) pfxPop(300, 200, .06); return; }      // 덜 뗐으면 착 다시 붙어요
                const r = Math.max(-.5, Math.min(.5, st.rot));
                pfxPop(420, 140, .12); try { if (navigator.vibrate) navigator.vibrate(8); } catch (e) {}
                kill(); if (o.onDrop) o.onDrop(st.cx, st.cy, r, d.baseRot);
            }
            function kill() { if (dead) return; dead = true; pfxNoise(0); cancelAnimationFrame(raf); cv.remove(); }
            raf = requestAnimationFrame(frame);
            return { move, up, kill, get free() { return st.state === 'free'; } };
        }
        window.pfxSeal = pfxSeal;
