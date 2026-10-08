/* 말랑달콤 다이어리 - js/papermaker.js
   📄 모조지스티커 만들기 (📸 포토부스 · 📷 사진찍기 · 🖼️ 사진고르기 결과창 → 📄 모조지스티커 만들기)
   1) 그 결과 그림이 모조지(도톰한 종이)에 인쇄돼요 · 종이 결과 살짝 바랜 색
   2) ✂️ 오리기 : 오리고 싶은 둘레를 손가락으로 한 바퀴 따라 그리면 싹둑 (처음 자리까지 돌아와야 오려져요)
   3) ✍️ 글씨 : 오린 스티커 위에 펜으로 글씨를 써요 (스티커 위에만 써져요)
   4) 📌 다이어리에 붙이기 · 💾 내 스티커에 저장만 → 📄 모조지스티커 → 내스티커
   - 소리는 없어요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (모조지스티커 만들기만 '준비 중') */

        const PM_W = 340, PM_HR = 2, PM_OUT = 360;
        const PM_PENS = ['#2f2a2c', '#7a4b3a', '#d0566b', '#3f6fb5'];
        const pmS = { built: false, H: 340, sheet: null, photo: null, piece: null, snap: null, step: 'cut', drag: null, pen: PM_PENS[0], raf: 0 };
        const pmq = id => document.getElementById(id);
        const pmMk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
        const pmR = (a, b) => a + Math.random() * (b - a);
        const pmDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
        function pmPoly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
        function pmRR(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

        /* ---------- 화면 ---------- */
        function pmBuild() {
            if (pmS.built) return;
            pmS.built = true;
            const el = document.createElement('div');
            el.id = 'pmRoom'; el.className = 'smk-room pm-room';
            el.innerHTML = `
              <div class="smk-bar"><span class="smk-x"></span><b>📄 모조지스티커 만들기</b><button class="smk-x" type="button" onclick="closePaperMaker()" aria-label="닫기">✕</button></div>
              <div class="smk-wrap">
                <section class="smk-step">
                  <div class="smk-stage"><canvas id="pmCanvas"></canvas></div>
                  <p class="smk-hint" id="pmHint"></p>
                  <div id="pmWrite" class="smk-col" hidden>
                    <div class="pm-pens">${PM_PENS.map(c => `<button type="button" data-c="${c}" style="--c:${c}" onclick="pmSetPen('${c}')" aria-label="펜 색"></button>`).join('')}
                      <button type="button" class="pm-undo" onclick="pmUndo()">↩️ 글씨 지우기</button></div>
                    <button type="button" class="smk-go" onclick="pmFinish(true,this)">📌 다이어리에 붙이기</button>
                    <button type="button" class="smk-go smk-sub" onclick="pmFinish(false,this)">💾 내 스티커에 저장만</button>
                    <button type="button" class="smk-go smk-sub" onclick="pmRecut()">✂️ 다시 오리기</button>
                  </div>
                </section>
              </div>`;
            document.body.appendChild(el);
            const cv = pmq('pmCanvas');
            cv.addEventListener('pointerdown', pmDown); cv.addEventListener('pointermove', pmMove);
            cv.addEventListener('pointerup', pmUp); cv.addEventListener('pointercancel', pmUp);
        }
        function openPaperMaker(src) {
            pmBuild();
            const im = new Image();
            im.onload = () => pmStart(im);
            im.onerror = () => showMsg('그림을 열지 못했어요. 다시 해 주세요.');
            im.src = src;
        }
        function closePaperMaker() {
            cancelAnimationFrame(pmS.raf); pmS.drag = null;
            const r = pmq('pmRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }

        /* ---------- 1. 그림 → 모조지에 인쇄 ---------- */
        function pmStart(im) {
            pmS.photo = im; pmS.H = Math.round(PM_W * Math.max(.75, Math.min(1.35, im.height / im.width)));
            const cv = pmq('pmCanvas'); cv.width = PM_W * PM_HR; cv.height = pmS.H * PM_HR; cv.style.aspectRatio = PM_W + ' / ' + pmS.H;
            pmSheet(); pmCutStep();
            pmq('pmRoom').classList.add('show'); pmq('pmRoom').scrollTop = 0; document.body.classList.add('fc-lock');
            cancelAnimationFrame(pmS.raf); pmS.raf = requestAnimationFrame(pmFrame);
        }
        /* 모조지 결 : 자잘한 알갱이 + 섬유 */
        function pmGrain(c, w, h) {
            c.save(); c.globalCompositeOperation = 'source-atop';
            for (let i = 0; i < w * h / 5; i++) { c.fillStyle = Math.random() < .55 ? 'rgba(130,110,90,.07)' : 'rgba(255,255,255,.4)'; c.fillRect(Math.random() * w, Math.random() * h, .7, .7); }
            c.lineWidth = .45;
            for (let i = 0; i < w * h / 220; i++) {
                const x = Math.random() * w, y = Math.random() * h, a = Math.random() * 7, l = pmR(3, 9);
                c.strokeStyle = Math.random() < .5 ? 'rgba(150,130,110,.09)' : 'rgba(255,255,255,.5)';
                c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + Math.cos(a + .6) * l * .5, y + Math.sin(a + .6) * l * .5, x + Math.cos(a) * l, y + Math.sin(a) * l); c.stroke();
            }
            c.restore();
        }
        function pmSheet() {
            const w = PM_W, h = pmS.H, im = pmS.photo;
            pmS.sheet = pmMk(w * PM_HR, h * PM_HR); const s = pmS.sheet.getContext('2d'); s.scale(PM_HR, PM_HR);
            pmRR(s, 0, 0, w, h, 6); s.fillStyle = '#fdfaf2'; s.fill();
            const m = 14, k = Math.min((w - m * 2) / im.width, (h - m * 2) / im.height), dw = im.width * k, dh = im.height * k;     // 그림 전체가 보이게
            s.save(); pmRR(s, m, m, w - m * 2, h - m * 2, 4); s.clip();
            s.globalAlpha = .88; s.drawImage(im, (w - dw) / 2, (h - dh) / 2, dw, dh); s.restore();                     // 살짝 바랜 인쇄
            s.save(); s.globalCompositeOperation = 'source-atop'; s.fillStyle = 'rgba(240,228,206,.16)'; s.fillRect(0, 0, w, h); s.restore();
            pmGrain(s, w, h);
        }

        /* ---------- 2. 오리기 ---------- */
        function pmCutStep() {
            pmS.step = 'cut'; pmS.piece = null; pmS.drag = null;
            pmq('pmWrite').hidden = true;
            pmHint('✂️ 오리고 싶은 둘레를 손가락으로 <b>한 바퀴</b> 따라 그려요');
        }
        function pmRecut() { pmSheet(); pmCutStep(); }
        function pmHint(h) { const e = pmq('pmHint'); if (e) e.innerHTML = h; }
        function pmPt(e) { const cv = pmq('pmCanvas'), r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * PM_W / r.width, (e.clientY - r.top) * pmS.H / r.height]; }
        /* 잘린 단면의 보풀 : 종이가 있는 곳에서만 바깥으로 짧게 삐죽 */
        function pmFibers(g, pts, A, AW, ox, oy) {
            g.save(); g.lineWidth = .5; g.lineCap = 'round';
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length], L = pmDist(a, b);
                for (let t = 0; t < L; t += 1.4) {
                    if (Math.random() < .45) continue;
                    const x = a[0] + (b[0] - a[0]) * t / L, y = a[1] + (b[1] - a[1]) * t / L;
                    const px = Math.round((x - ox) * PM_HR), py = Math.round((y - oy) * PM_HR);
                    if (px < 0 || py < 0 || px >= AW || py >= A.length / AW / 4 || A[(py * AW + px) * 4 + 3] < 40) continue;
                    const an = Math.random() * 7, l = pmR(.4, 1.5);
                    g.strokeStyle = Math.random() < .7 ? 'rgba(255,251,242,.9)' : 'rgba(220,205,190,.6)';
                    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(an) * l, y + Math.sin(an) * l); g.stroke();
                }
            }
            g.restore();
        }
        function pmCutOut(path) {
            const pts = path.map(p => [p[0] + pmR(-.5, .5), p[1] + pmR(-.5, .5)]);
            let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
            for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
            x0 = Math.max(Math.floor(x0 - 3), 0); y0 = Math.max(Math.floor(y0 - 3), 0); x1 = Math.min(Math.ceil(x1 + 3), PM_W); y1 = Math.min(Math.ceil(y1 + 3), pmS.H);
            const w = x1 - x0, h = y1 - y0; if (w < 14 || h < 14) return null;
            const c = pmMk(w * PM_HR, h * PM_HR), g = c.getContext('2d'); g.scale(PM_HR, PM_HR); g.translate(-x0, -y0);
            g.save(); pmPoly(g, pts); g.clip(); g.drawImage(pmS.sheet, 0, 0, PM_W, pmS.H); g.restore();
            const A = g.getImageData(0, 0, c.width, c.height).data; let cnt = 0;
            for (let i = 3; i < A.length; i += 16) if (A[i] > 100) cnt++;
            if (cnt * 4 < 220 * PM_HR * PM_HR) return null;
            g.save(); g.globalCompositeOperation = 'source-atop'; pmPoly(g, pts); g.strokeStyle = 'rgba(255,251,243,.9)'; g.lineWidth = 1.4; g.lineJoin = 'round'; g.stroke(); g.restore();   // 하얗게 드러난 단면
            pmFibers(g, pts, A, c.width, x0, y0);
            return { img: c, w, h };
        }
        function pmWriteStep(piece) {
            pmS.step = 'write'; pmS.piece = piece;
            pmS.snap = pmMk(piece.img.width, piece.img.height); pmS.snap.getContext('2d').drawImage(piece.img, 0, 0);
            pmq('pmWrite').hidden = false; pmSetPen(pmS.pen);
            pmHint('싹둑! 오려졌어요 ✨ 스티커 <b>위에</b> 글씨를 써 보세요 ✍️');
        }
        /* 글씨 쓰는 화면 : 오린 조각을 가운데에 크게 */
        function pmPose() { const p = pmS.piece, E = Math.min((PM_W - 40) / p.w, (pmS.H - 40) / p.h, 3.2); return { cx: PM_W / 2, cy: pmS.H / 2, s: E }; }

        /* ---------- 3. 글씨 ---------- */
        function pmSetPen(c) { pmS.pen = c; document.querySelectorAll('#pmWrite .pm-pens button[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === c)); }
        function pmUndo() { const p = pmS.piece; if (!p) return; const g = p.img.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, p.img.width, p.img.height); g.drawImage(pmS.snap, 0, 0); g.restore(); }
        function pmHexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
        function pmInk(a, b, v) {
            const p = pmS.piece, g = p.img.getContext('2d');
            g.save(); g.setTransform(PM_HR, 0, 0, PM_HR, p.w / 2 * PM_HR, p.h / 2 * PM_HR);
            g.globalCompositeOperation = 'source-atop'; g.lineCap = 'round'; g.lineJoin = 'round';
            const slow = 1 - Math.min(1, v * 1.6), lw = 1.05 + slow * .45;               // 천천히 쓸수록 잉크가 더 배어 나와요
            g.shadowColor = pmHexA(pmS.pen, .42); g.shadowBlur = (.6 + slow * 1.4) * PM_HR;
            g.strokeStyle = pmS.pen; g.lineWidth = lw; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
            g.restore();
        }

        /* ---------- 손가락 ---------- */
        function pmDown(e) {
            e.preventDefault(); const P = pmPt(e);
            try { pmq('pmCanvas').setPointerCapture(e.pointerId); } catch (er) {}
            if (pmS.step === 'cut') { pmS.drag = { pts: [P], len: 0, acc: 0, ang: 0, blade: 0 }; pmHint('사각사각… <b>처음 자리</b>까지 한 바퀴 돌아와요'); return; }
            const E = pmPose(), L = [(P[0] - E.cx) / E.s, (P[1] - E.cy) / E.s];
            pmS.drag = { ink: true, last: L, lt: performance.now() }; pmInk(L, L, 0);
        }
        function pmMove(e) {
            const d = pmS.drag; if (!d) return;
            const P = pmPt(e);
            if (d.ink) {
                const E = pmPose(), L = [(P[0] - E.cx) / E.s, (P[1] - E.cy) / E.s], t = performance.now(), l = pmDist(L, d.last);
                if (l < .25) return;
                pmInk(d.last, L, l / Math.max(1, t - d.lt)); d.last = L; d.lt = t; return;
            }
            const L = d.pts[d.pts.length - 1], l = pmDist(P, L); if (l < 2.5) return;
            d.pts.push(P); d.len += l; d.acc += l; d.ang = Math.atan2(P[1] - L[1], P[0] - L[0]);
            if (d.acc > 14) { d.acc = 0; d.blade ^= 1; }
            if (d.len > 90 && d.pts.length > 14 && pmDist(P, d.pts[0]) < 20) pmFinishCut();
        }
        function pmUp() {
            const d = pmS.drag; if (!d) return;
            if (d.ink) { pmS.drag = null; return; }
            if (d.len > 90 && pmDist(d.pts[d.pts.length - 1], d.pts[0]) < 44) { pmFinishCut(); return; }
            pmS.drag = null;
            pmHint(d.len < 60 ? '오리고 싶은 둘레를 <b>쭉 이어서</b> 따라 그려요' : '아쉬워요! <b>처음 자리</b>까지 돌아와야 오려져요 ✂️');
        }
        function pmFinishCut() {
            const d = pmS.drag; pmS.drag = null;
            const p = pmCutOut(d.pts);
            if (!p) { pmHint('너무 작아요. 조금 더 크게 둘러 그려 주세요 ✂️'); return; }
            if (navigator.vibrate) navigator.vibrate(18);
            pmWriteStep(p);
        }

        /* ---------- 그리기 ---------- */
        function pmFrame() {
            const cv = pmq('pmCanvas'); if (!cv || !pmq('pmRoom').classList.contains('show')) return;
            const c = cv.getContext('2d'), W = PM_W, H = pmS.H;
            c.setTransform(PM_HR, 0, 0, PM_HR, 0, 0); c.clearRect(0, 0, W, H);
            if (pmS.step === 'cut') {
                c.drawImage(pmS.sheet, 0, 0, W, H);
                const d = pmS.drag;
                if (d && d.pts.length > 1) {
                    const pts = d.pts; c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
                    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]);
                    c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = 'rgba(70,52,58,.75)'; c.lineWidth = 1.1; c.stroke();
                    if (d.len > 50) { const pu = .5 + .5 * Math.sin(performance.now() / 160); c.setLineDash([4, 4]); c.strokeStyle = `rgba(210,90,120,${.45 + pu * .4})`; c.lineWidth = 1.6; c.beginPath(); c.arc(pts[0][0], pts[0][1], 20 + pu * 3, 0, 7); c.stroke(); c.setLineDash([]); }
                    const L = pts[pts.length - 1]; c.translate(L[0], L[1]); c.rotate(d.ang + Math.PI); c.scale(1, d.blade ? .78 : 1);
                    c.font = '30px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✂️', 0, 0);
                    c.restore();
                }
            } else if (pmS.piece) {
                const p = pmS.piece, E = pmPose();
                c.fillStyle = '#f6eef0'; pmRR(c, 0, 0, W, H, 8); c.fill();
                c.save(); c.shadowColor = 'rgba(90,60,70,.22)'; c.shadowBlur = 8; c.shadowOffsetY = 3;
                c.translate(E.cx, E.cy); c.scale(E.s, E.s); c.drawImage(p.img, -p.w / 2, -p.h / 2, p.w, p.h); c.restore();
            }
            pmS.raf = requestAnimationFrame(pmFrame);
        }

        /* ---------- 4. 저장 · 붙이기 ---------- */
        function pmOut() {                                             // 투명 바탕 PNG (긴 변 PM_OUT 이하)
            const p = pmS.piece, k = Math.min(1, PM_OUT / Math.max(p.img.width, p.img.height));
            const o = pmMk(p.img.width * k, p.img.height * k); o.getContext('2d').drawImage(p.img, 0, 0, o.width, o.height);
            return o.toDataURL('image/png');
        }
        let pmLock = false;
        async function pmFinish(stick, btn) {
            if (pmLock || !pmS.piece) return;
            if (stick && typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">💾 내 스티커에 저장해 두었다가 붙여도 돼요.</span>'); return; }
            if (typeof smAdd !== 'function') { comingSoon('📄 모조지스티커'); return; }
            pmLock = true;
            const all = [...document.querySelectorAll('#pmRoom .smk-go')], old = btn ? btn.textContent : '';
            all.forEach(b => { b.disabled = true; }); if (btn) { btn.classList.add('busy'); btn.textContent = stick ? '📌 붙이는 중…' : '💾 저장하는 중…'; }
            try {
                const src = pmOut(), w = pmS.piece.w, r = await smAdd(src, 'paper');
                if (!stick) { if (r === 'ok') closePaperMaker(); smAddMsg(r, 'paper', false); return; }
                smAddMsg(r, 'paper', true);
                if (!addImage(src)) return;
                const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = Math.round(Math.min(160, Math.max(70, w * .7))) + 'px';
                closePaperMaker();
                if (typeof saveData === 'function') saveData(false);
            } finally { pmLock = false; all.forEach(b => { b.disabled = false; }); if (btn) { btn.classList.remove('busy'); btn.textContent = old; } }
        }

        window.openPaperMaker = openPaperMaker; window.closePaperMaker = closePaperMaker;
