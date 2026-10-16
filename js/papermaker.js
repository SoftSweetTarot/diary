/* 말랑달콤 다이어리 - js/papermaker.js
   📄 모조지스티커 (도톰한 미색 종이에 인쇄된 스티커 · 원하는 모양대로 칼집을 내서 떼어 써요)
   만들기 : 스티커 만들기 결과창(📷 · 🖼️ 한 장 · 여러 장) · 📸 포토부스 → 📄 모조지스티커 만들기 / 📄 모조지스티커로 다이어리에 붙이기
     → 고른 모양대로 오린 사진들이 모조지스티커 한 장에 알아서 나란히 인쇄돼요 (pmMakeSheet) → 📄 내스티커에 '모조지스티커 한 장'으로 저장
   쓰기 : 내스티커에서 모조지스티커를 누르면 (또는 붙이기 버튼) 배경(화면) 한가운데에 스티커 종이가 나와요 (openPaperSheet)
     1) 🔪 커터칼로 칼집 내기 : 원하는 그림 둘레를 손가락으로 한 바퀴 따라 그리면 그 모양대로 칼집이 나요 (처음 자리까지 돌아와야 해요 · 종이에서 떨어지지 않아요)
     2) 칼집 낸 스티커를 누른 채 끌면 🏷️ 씰스티커처럼 가장자리부터 말려 떼어져요 (js/peelfx.js pfxSeal) → 다 떼면 손가락을 따라와요
        → 페이지에 놓으면 그 자리 · 그 각도로 붙어요 · 덜 떼고 놓거나 페이지 밖에 놓으면 종이의 제자리로 착 돌아가요
     3) 칼집 낸 스티커 : 톡 = ✍️ 글씨 쓰기 (스티커 위에만 써져요) · 꾹 = 구김
   - 종이 위쪽 마스킹테이프(✋ 잡고 옮겨요)를 끌면 종이가 화면 안에서 옮겨져요 (칼집 낸 스티커도 같이)
   - 종이 오른쪽 위 끝 ✕ 를 누르면 닫혀요 (떼지 않은 스티커는 사라져요 · 내스티커의 모조지스티커는 늘 새 종이로 다시 나와요)
   - 종이 바깥은 그대로 페이지라서, 종이를 띄운 채로 날짜바를 끌어 페이지를 옮기거나 붙인 스티커를 눌러 옮기기 · 돌리기 · 크기 바꾸기를 해요
     (화면 전체를 덮지 않고 종이 자리에만 손가락을 받는 칸(#pmHit .pm-z)을 둬요 · 글씨 쓰는 중에는 화면 전체)
   - 📒 수첩이면 수첩 시트의 종이 그림 위에 꼭 맞게 겹쳐서 바로 칼집을 내요 (openPaperSheet(src, { el }) · S.note · 도련 · 2026-10-16)
     수첩을 옮기면 따라가요 · 장을 넘기거나 수첩이 뒤로 가거나 닫히면 사라져요 (떼지 않은 칼집은 없어져요) · 테이프 · ✕ 없음 · 수첩 위에 놓으면 안 붙어요
   - 소리는 뗄 때 '찌익'만 (⚙ 설정의 '✨ 연출 소리' · js/peelfx.js)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (모조지스티커만 '준비 중') */

        const PM_W = 360, PM_HR = 2, PM_OUT = 420;
        const PM_PENS = ['#2f2a2c', '#7a4b3a', '#d0566b', '#3f6fb5'];
        const pmS = { on: false, cv: null, ctx: null, W: 0, H: 0, DPR: 1, raf: 0, hint: '', sheet: null, SH: 0, SC: 1, X: 0, Y: 0, mv: { x: 0, y: 0 },
            pieces: [], fades: [], drag: null, edit: null, z: 1, pen: PM_PENS[0] };
        const pmq = id => document.getElementById(id);
        const pmMk = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; };
        const pmR = (a, b) => a + Math.random() * (b - a);
        const pmDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
        const pmNow = () => performance.now();
        const pmEase = q => 1 - Math.pow(1 - q, 3);
        const pmLoad = src => new Promise(ok => { const im = new Image(); if (/^https?:/i.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = () => ok(null); im.src = src; });   // 주소 그림은 종이에 인쇄하려고 CORS 로
        function pmPoly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
        function pmRR(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
        function pmSpark(c, x, y, r, col) { c.beginPath(); for (let i = 0; i < 8; i++) { const q = i % 2 ? r * .35 : r, a = i * Math.PI / 4; c.lineTo(x + Math.cos(a) * q, y + Math.sin(a) * q); } c.closePath(); c.fillStyle = col; c.fill(); }

        /* ---------- 만들기 : 그림들 → 모조지스티커 한 장 (JPEG · 모서리 · 결은 쓸 때 입혀요) ---------- */
        async function pmMakeSheet(srcs) {
            const ims = (await Promise.all(srcs.map(pmLoad))).filter(Boolean);
            if (!ims.length) throw new Error('no image');
            const n = ims.length, cols = n < 2 ? 1 : n < 5 ? 2 : 3, rows = Math.ceil(n / cols), P = 14, top = 10, foot = 24, W = PM_W;
            const cw = (W - P * 2) / cols, ch = n === 1 ? cw * Math.max(.7, Math.min(1.4, ims[0].height / ims[0].width)) : cw;
            const H = Math.round(top + P + rows * ch + foot);
            const pr = pmMk(W * PM_HR, H * PM_HR), p = pr.getContext('2d'); p.scale(PM_HR, PM_HR);
            const cols4 = ['#ffc7d6', '#ffe08a', '#bfe3ff', '#c9ecc9'];
            for (let i = 0; i < 16; i++) { p.fillStyle = cols4[i % 4]; p.beginPath(); p.arc(pmR(8, W - 8), pmR(8, H - foot), pmR(1.2, 2.2), 0, 7); p.fill(); }   // 자잘한 땡땡이 (그림 밑에)
            for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) if ((r + c) % 2 === 0) pmSpark(p, P + cw * c + pmR(-4, 4), top + P / 2 + ch * r + pmR(-4, 4), pmR(3.5, 6), cols4[(r + c) % 4]);
            ims.forEach((im, i) => {
                const r = Math.floor(i / cols), inRow = Math.min(cols, n - r * cols), c = i % cols + (cols - inRow) / 2;   // 마지막 줄은 가운데로
                const cx = P + cw * (c + .5) + pmR(-3, 3), cy = top + P / 2 + ch * (r + .5) + pmR(-3, 3);
                const k = Math.min(cw * .88 / im.width, ch * .88 / im.height), dw = im.width * k, dh = im.height * k;
                p.save(); p.translate(cx, cy); p.rotate(n === 1 ? pmR(-.04, .04) : pmR(-.12, .12)); p.drawImage(im, -dw / 2, -dh / 2, dw, dh); p.restore();
            });
            const o = pmMk(W * PM_HR, H * PM_HR), s = o.getContext('2d'); s.scale(PM_HR, PM_HR);
            s.fillStyle = '#fdfaf2'; s.fillRect(0, 0, W, H);
            s.globalAlpha = .88; s.drawImage(pr, 0, 0, W, H); s.globalAlpha = 1;                                        // 살짝 바랜 인쇄
            s.fillStyle = 'rgba(240,228,206,.16)'; s.fillRect(0, 0, W, H);
            s.fillStyle = 'rgba(155,110,120,.55)'; s.font = "13px 'Gaegu', 'Jua', sans-serif"; s.textAlign = 'right'; s.textBaseline = 'alphabetic';
            s.fillText('모조지스티커 · 말랑달콤', W - 10, H - 8);
            return o.toDataURL('image/jpeg', .88);
        }

        /* ---------- 쓰기 : 화면 ---------- */
        function pmBuild() {
            if (pmq('pmRoom')) return;
            const el = document.createElement('div');
            el.id = 'pmRoom'; el.className = 'pel-room pm-room';
            el.innerHTML = `<canvas id="pmCv"></canvas><div id="pmHit"></div><p class="pel-hint" id="pmHint"></p><button type="button" class="pm-x" id="pmX" onclick="closePaperSheet()" aria-label="닫기">✕</button>
              <div class="pm-pens" id="pmPens" hidden>${PM_PENS.map(c => `<button type="button" data-c="${c}" style="--c:${c}" onclick="pmSetPen('${c}')" aria-label="펜 색"></button>`).join('')}
                <button type="button" class="pm-undo" onclick="pmUndo()">↩️ 지우기</button><button type="button" class="pm-undo" onclick="pmExitEdit()">✅ 다 썼어요</button></div>`;
            document.body.appendChild(el);
            const hit = pmq('pmHit');
            hit.addEventListener('pointerdown', pmDown); hit.addEventListener('pointermove', pmMove);
            hit.addEventListener('pointerup', pmUp); hit.addEventListener('pointercancel', pmUp);
            window.addEventListener('resize', () => { if (pmS.on) pmLayout(); });
        }
        /* src : 내스티커의 모조지스티커 한 장 · o.el : 📒 수첩 시트의 종이 그림 (그 위에 겹쳐요) · o.down : 누른 채로 열었으면 그 손가락으로 바로 칼집 */
        async function openPaperSheet(src, o) {
            o = o || {};
            const dn = o.down; if (dn) { const f = e => { if (e.pointerId === dn.id) { dn.done = 1; window.removeEventListener('pointerup', f, true); } }; window.addEventListener('pointerup', f, true); }   // 종이를 펼치기 전에 손을 뗐는지
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return false; }
            const im = await pmLoad(src);
            if (!im) { showMsg('모조지스티커를 열지 못했어요.'); return false; }
            pmBuild();
            const S = pmS;
            S.cv = pmq('pmCv'); S.ctx = S.cv.getContext('2d');
            S.SH = Math.round(PM_W * im.height / im.width);
            S.sheet = pmMk(PM_W * PM_HR, S.SH * PM_HR); const s = S.sheet.getContext('2d'); s.scale(PM_HR, PM_HR);
            pmRR(s, 0, 0, PM_W, S.SH, 6); s.save(); s.clip(); s.drawImage(im, 0, 0, PM_W, S.SH); s.restore();
            pmGrain(s, PM_W, S.SH);
            S.pieces = []; S.fades = []; S.drag = null; S.edit = null; S.mv = { x: 0, y: 0 }; S.gone = 0; S.back = 0; S.on = true;
            S.note = o.el && o.el.isConnected ? o.el : null;
            pmLayout();
            pmq('pmPens').hidden = true;
            const room = pmq('pmRoom'); room.classList.toggle('pm-note', !!S.note); room.classList.add('show');
            if (!S.note) document.body.classList.add('fc-lock');
            S.hint = ''; pmSay(S.note ? '원하는 그림 둘레를 손가락으로 <b>한 바퀴</b> 따라 그리면 칼집이 나요' : '원하는 그림 둘레를 손가락으로 <b>한 바퀴</b> 따라 그리면 칼집이 나요 · 위쪽 <b>테이프</b>를 끌면 옮겨져요');
            cancelAnimationFrame(S.raf); S.raf = requestAnimationFrame(pmFrame);
            if (S.note && dn && !dn.done) {                                          // 누른 채 그대로 그리면 바로 칼집이 나요
                pmZones(); const z = pmq('pmHit').firstChild;
                if (z) pmDown({ clientX: dn.x, clientY: dn.y, pointerId: dn.id, target: z, preventDefault() {} });
            }
            return true;
        }
        function closePaperSheet() {
            const S = pmS; if (S.drag && S.drag.seal) S.drag.seal.kill();
            const note = S.note; S.note = null;
            S.on = false; S.drag = null; S.edit = null; cancelAnimationFrame(S.raf);
            const r = pmq('pmRoom'); if (r) r.classList.remove('show', 'pm-note');
            if (note) return;
            document.body.classList.remove('fc-lock');
            if (window.stkReturn) stkReturn();                                // ✨ 스티커 창에서 왔으면 다시 떠요
        }
        /* 📒 수첩 : 시트의 종이 그림이 보이는 동안만 · 그 자리 그대로 (뗀 스티커를 들고 있거나 글씨를 쓰는 중에는 그대로) */
        function pmNoteKeep() {
            const S = pmS, n = S.note; if (!n) return true;
            if (S.drag || S.edit || S.pieces.some(st => st.peel)) return true;
            const m = n.closest('.modal'), body = n.closest('.snb-body'), r = n.getBoundingClientRect(), b = body && body.getBoundingClientRect(), st = window.snbState ? snbState() : {};
            const cy = r.top + Math.min(r.height, 60) / 2;
            if (!n.isConnected || !m || m.style.display !== 'flex' || m.classList.contains('snb-back') || st.curl || !b || !r.width || cy < b.top || r.top > b.bottom - 20) { closePaperSheet(); return false; }
            pmLayout(); return true;
        }
        /* 종이는 배경(화면) 한가운데 · 화면이 바뀌어도 (아이패드 돌리기 등) 가운데에 화면 안 크기로 */
        function pmLayout() {
            const S = pmS, cv = S.cv;
            S.DPR = Math.min(window.devicePixelRatio || 1, 3); S.W = window.innerWidth; S.H = window.innerHeight;
            if (cv.width !== S.W * S.DPR || cv.height !== S.H * S.DPR) { cv.width = S.W * S.DPR; cv.height = S.H * S.DPR; }
            if (S.note) { const r = S.note.getBoundingClientRect(); S.SC = r.width / PM_W || 1; S.X = r.left; S.Y = r.top; return; }   // 📒 수첩 시트의 종이 그림 위에 꼭 맞게
            S.SC = Math.min((S.W - 32) / PM_W, (S.H - 150) / S.SH, 1);   // 아이패드에서도 너무 크지 않게 (둘레에 붙일 페이지가 보이게)
            S.X = (S.W - PM_W * S.SC) / 2; S.Y = Math.max(64, (S.H - S.SH * S.SC) / 2 + 8);
            pmShift(S.mv.x, S.mv.y, true);
        }
        /* 종이 옮기기 : 위쪽 테이프를 잡고 끌어요 (화면 밖으로 안 나가게 · ✕ 도 같이 · 칼집 낸 스티커는 종이에 붙어 있어서 같이 가요) */
        function pmShift(dx, dy, base) {
            const S = pmS, w = PM_W * S.SC, h = S.SH * S.SC;
            const x = Math.max(8, Math.min(S.W - 8 - w, S.X + dx)), y = Math.max(64, Math.min(S.H - 8 - h, S.Y + dy));
            if (base) S.mv = { x: S.mv.x + x - S.X - dx, y: S.mv.y + y - S.Y - dy }; else { S.mv.x += x - S.X; S.mv.y += y - S.Y; }
            S.X = x; S.Y = y;
            const b = pmq('pmX'); if (b) { b.style.left = (S.X + w - 32) + 'px'; b.style.top = S.Y + 'px'; }   // 종이 오른쪽 위 끝 (안쪽)
        }
        /* 손가락 받는 칸 : 종이(테이프 포함) 자리만 (나머지는 페이지가 받아요) · 글씨 쓰는 중에는 화면 전체 */
        function pmZones() {
            const S = pmS, hit = pmq('pmHit'), m = 14, z = [];
            if (S.drag) return;                                                          // 끄는 중에는 그대로 (손가락은 누른 칸이 끝까지 받아요)
            if (S.edit) z.push([0, 0, S.W, S.H]);
            else if (S.note) { if (!S.gone) z.push([S.X, S.Y, PM_W * S.SC, S.SH * S.SC]); }   // 📒 수첩 : 종이 자리만 (둘레는 수첩이 받아요)
            else if (!S.gone) z.push([S.X - m, S.Y - 24, PM_W * S.SC + m * 2, S.SH * S.SC + 24 + m]);
            while (hit.children.length < z.length) { const d = document.createElement('div'); d.className = 'pm-z'; hit.appendChild(d); }
            [...hit.children].forEach((d, i) => {
                const q = z[i]; d.hidden = !q; if (!q) return;
                const css = `left:${q[0]}px;top:${q[1]}px;width:${q[2]}px;height:${q[3]}px`; if (d.dataset.css !== css) { d.dataset.css = css; d.style.cssText = css; }
            });
        }
        const pmTape = () => { const S = pmS; return { x: S.X + PM_W * S.SC / 2 - 58, y: S.Y - 15, w: 116, h: 28 }; };
        /* 칼집 낸 스티커는 종이의 제자리에 (종이를 옮기거나 화면이 바뀌어도 같이) */
        function pmSeat(st) { const S = pmS; st.cx = S.X + st.home[0] * S.SC; st.cy = S.Y + st.home[1] * S.SC; st.s = S.SC; st.rot = 0; }
        function pmSay(h) { const e = pmq('pmHint'); if (!e || pmS.hint === h) return; pmS.hint = h; e.innerHTML = h; e.classList.remove('pop'); void e.offsetWidth; e.classList.add('pop'); }
        function pmBuzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }
        /* 종이 결 : 자잘한 알갱이 + 섬유 */
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

        /* ---------- 칼집 내기 (종이 좌표) ---------- */
        const pmToSheet = P => [(P[0] - pmS.X) / pmS.SC, (P[1] - pmS.Y) / pmS.SC];
        const pmPhone = () => innerWidth < 700;                                          // 📱 폰 : 종이가 페이지를 거의 가려서, 뗀 스티커를 붙이는 동안 종이가 비켜 줘요 (씰 종이와 같아요)
        const pmInSheet = (P, m = 0) => { const S = pmS; if (S.gone) return false; return P[0] > S.X - m && P[0] < S.X + PM_W * S.SC + m && P[1] > S.Y - m && P[1] < S.Y + S.SH * S.SC + m; };
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
            const S = pmS, pts = path.map(P => { const q = pmToSheet(P); return [q[0] + pmR(-.5, .5), q[1] + pmR(-.5, .5)]; });
            let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
            for (const [x, y] of pts) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
            x0 = Math.max(Math.floor(x0 - 3), -2); y0 = Math.max(Math.floor(y0 - 3), -2); x1 = Math.min(Math.ceil(x1 + 3), PM_W + 2); y1 = Math.min(Math.ceil(y1 + 3), S.SH + 2);
            const w = x1 - x0, h = y1 - y0; if (w < 14 || h < 14) return null;
            const c = pmMk(w * PM_HR, h * PM_HR), g = c.getContext('2d'); g.scale(PM_HR, PM_HR); g.translate(-x0, -y0);
            g.save(); pmPoly(g, pts); g.clip(); g.drawImage(S.sheet, 0, 0, PM_W, S.SH); g.restore();
            let A = g.getImageData(0, 0, c.width, c.height).data, cnt = 0;
            for (let i = 3; i < A.length; i += 16) if (A[i] > 100) cnt++;
            if (cnt * 4 < 220 * PM_HR * PM_HR) return null;
            g.save(); g.globalCompositeOperation = 'source-atop'; pmPoly(g, pts); g.strokeStyle = 'rgba(255,251,243,.9)'; g.lineWidth = 1.4; g.lineJoin = 'round'; g.stroke(); g.restore();   // 하얗게 드러난 단면
            pmFibers(g, pts, A, c.width, x0, y0);
            A = g.getImageData(0, 0, c.width, c.height).data;
            const s = S.sheet.getContext('2d'); s.save(); s.setTransform(PM_HR, 0, 0, PM_HR, 0, 0);                          // 종이의 스티커 자리는 비우고 스티커는 그 자리에 따로 그려요
            pmPoly(s, pts); s.globalCompositeOperation = 'destination-out'; s.fillStyle = '#000'; s.fill(); s.restore();   // 비운 자리 밑에는 뒷종이(이형지)가 보여요 (pmFrame)
            const st = { img: c, w, h, A, AW: c.width, AH: c.height, home: [x0 + w / 2, y0 + h / 2], pts, rot: 0, s: S.SC, z: ++S.z, lift: 0, squish: 0, born: pmNow(), peel: false };
            pmSeat(st); return st;
        }
        const pmToLocal = (st, x, y) => { const dx = (x - st.cx) / st.s, dy = (y - st.cy) / st.s, c = Math.cos(-st.rot), s = Math.sin(-st.rot); return [dx * c - dy * s, dx * s + dy * c]; };
        function pmHit(st, P) {
            for (const [ox, oy] of [[0, 0], [5, 0], [-5, 0], [0, 5], [0, -5]]) {
                const [lx, ly] = pmToLocal(st, P[0] + ox, P[1] + oy), px = Math.round((lx + st.w / 2) * PM_HR), py = Math.round((ly + st.h / 2) * PM_HR);
                if (px >= 0 && py >= 0 && px < st.AW && py < st.AH && st.A[(py * st.AW + px) * 4 + 3] > 60) return true;
            }
            return false;
        }

        /* ---------- 글씨 · 구김 ---------- */
        function pmEditPose(st) { const S = pmS, E = Math.min((S.W - 48) / st.w, (S.H * .55) / st.h, 4.2); return { cx: S.W / 2, cy: S.H * .44, rot: 0, s: E }; }
        function pmPoseAt(t) {
            const e = pmS.edit, st = e.st, to = pmEditPose(st); let q = pmEase(Math.min(1, (t - e.t0) / 280)); if (e.closing) q = 1 - q;
            return { cx: st.cx + (to.cx - st.cx) * q, cy: st.cy + (to.cy - st.cy) * q, rot: st.rot * (1 - q), s: st.s + (to.s - st.s) * q, q };
        }
        function pmHexA(h, a) { const n = parseInt(h.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
        function pmInk(st, a, b, v) {
            const g = st.img.getContext('2d'), pen = pmS.pen; g.save(); g.setTransform(PM_HR, 0, 0, PM_HR, st.w / 2 * PM_HR, st.h / 2 * PM_HR);
            g.globalCompositeOperation = 'source-atop'; g.lineCap = 'round'; g.lineJoin = 'round';
            const slow = 1 - Math.min(1, v * 1.6), lw = 1.05 + slow * .45;                 // 천천히 쓸수록 잉크가 더 배어 나와요
            g.shadowColor = pmHexA(pen, .42); g.shadowBlur = (.6 + slow * 1.4) * PM_HR;
            g.strokeStyle = pen; g.lineWidth = lw; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
            g.shadowBlur = 0;
            if (Math.random() < .3) { g.fillStyle = pmHexA(pen, .28); const an = Math.random() * 7, d = lw * pmR(.7, 1.5); g.beginPath(); g.arc(b[0] + Math.cos(an) * d, b[1] + Math.sin(an) * d, pmR(.2, .45), 0, 7); g.fill(); }
            g.restore();
        }
        function pmCrumple(st) {
            const g = st.img.getContext('2d'); g.save(); g.setTransform(PM_HR, 0, 0, PM_HR, st.w / 2 * PM_HR, st.h / 2 * PM_HR); g.globalCompositeOperation = 'source-atop';
            const Rr = Math.max(st.w, st.h) * .6;
            for (let k = 0; k < 3; k++) {
                const a = Math.random() * Math.PI, ox = pmR(-.25, .25) * st.w, oy = pmR(-.25, .25) * st.h, d = [Math.cos(a), Math.sin(a)], n = [-d[1], d[0]], pts = [];
                for (let i = -3; i <= 3; i++) { const t = i / 3 * Rr, j = pmR(-1, 1) * Rr * .06; pts.push([ox + d[0] * t + n[0] * j, oy + d[1] * t + n[1] * j]); }
                g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); for (const p of pts) g.lineTo(p[0], p[1]);
                g.lineTo(pts[6][0] + n[0] * Rr, pts[6][1] + n[1] * Rr); g.lineTo(pts[0][0] + n[0] * Rr, pts[0][1] + n[1] * Rr); g.closePath();
                g.fillStyle = `rgba(95,75,65,${pmR(.03, .06)})`; g.fill();
                const line = (dx, dy, col, lw) => { g.beginPath(); g.moveTo(pts[0][0] + dx, pts[0][1] + dy); for (const p of pts) g.lineTo(p[0] + dx, p[1] + dy); g.strokeStyle = col; g.lineWidth = lw; g.stroke(); };
                line(n[0] * .6, n[1] * .6, 'rgba(255,255,255,.6)', .8); line(0, 0, 'rgba(110,90,80,.25)', .6);
            }
            g.restore(); st.lift = Math.min(3, st.lift + 1); st.squish = pmNow();
        }
        function pmEnterEdit(st) {
            const S = pmS, snap = pmMk(st.img.width, st.img.height); snap.getContext('2d').drawImage(st.img, 0, 0);
            S.edit = { st, t0: pmNow(), closing: false, snap }; st.z = ++S.z;
            pmq('pmPens').hidden = false; pmSetPen(S.pen); pmBuzz(6);
            pmSay('스티커 <b>위에만</b> 써져요 ✍️ 다 쓰면 바깥을 톡');
        }
        function pmExitEdit() {
            const S = pmS; if (!S.edit || S.edit.closing) return;
            S.edit.closing = true; S.edit.t0 = pmNow();
            setTimeout(() => { S.edit = null; }, 300);
            pmq('pmPens').hidden = true;
            pmSay('다 썼어요 📝 페이지로 끌어서 붙여요');
        }
        function pmSetPen(c) { pmS.pen = c; document.querySelectorAll('#pmPens button[data-c]').forEach(b => b.classList.toggle('on', b.dataset.c === c)); }
        function pmUndo() { const e = pmS.edit; if (!e) return; const g = e.st.img.getContext('2d'); g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, e.st.img.width, e.st.img.height); g.drawImage(e.snap, 0, 0); g.restore(); pmSay('지웠어요. 다시 써 보세요'); }

        /* ---------- 손가락 ---------- */
        function pmDown(e) {
            const S = pmS; if (!S.on || S.drag) return;
            e.preventDefault(); const P = [e.clientX, e.clientY];
            const cap = () => { try { e.target.setPointerCapture(e.pointerId); } catch (er) {} };
            if (S.edit) {                                                                  // 글씨 쓰는 중
                if (S.edit.closing || pmNow() - S.edit.t0 < 280) return;
                const st = S.edit.st, E = pmEditPose(st), L = [(P[0] - E.cx) / E.s, (P[1] - E.cy) / E.s]; cap();
                if (Math.abs(L[0]) < st.w / 2 + 4 && Math.abs(L[1]) < st.h / 2 + 4) { S.drag = { mode: 'ink', last: L, lt: pmNow() }; pmInk(st, L, L, 0); }
                else S.drag = { mode: 'edittap', start: P };
                return;
            }
            for (const st of [...S.pieces].sort((a, b) => b.z - a.z)) {                    // 칼집 낸 스티커 : 톡 = 글씨 · 끌기 = 떼기 · 꾹 = 구김
                if (st.peel || !pmHit(st, P)) continue;
                cap(); const d = { mode: 'piece', st, start: P, t0: pmNow(), moved: false }; S.drag = d; st.z = ++S.z;
                d.lp = setTimeout(() => { if (S.drag === d && !d.moved) { pmCrumple(st); d.crumpled = true; pmBuzz(30); pmSay(st.lift >= 3 ? '구깃구깃… 가장자리가 많이 들떴어요 😵' : '꾸깃! 구겨진 자국이 남았어요'); } }, 520);
                return;
            }
            const tp = pmTape();                                                           // 위쪽 테이프 : 종이 옮기기 (📒 수첩에는 없어요)
            if (!S.note && P[0] > tp.x - 8 && P[0] < tp.x + tp.w + 8 && P[1] > tp.y - 8 && P[1] < tp.y + tp.h + 8) { cap(); S.drag = { mode: 'sheet', last: P }; pmSay('종이를 옮기는 중… ✋'); return; }
            if (pmInSheet(P, 14)) { cap(); S.drag = { mode: 'cut', pts: [P], len: 0, acc: 0, ang: 0, lt: pmNow() }; pmSay('스윽스윽… <b>처음 자리</b>까지 한 바퀴 돌아와요'); return; }
        }
        function pmMove(e) {
            const S = pmS, d = S.drag; if (!d) return;
            const P = [e.clientX, e.clientY];
            if (d.mode === 'sheet') { pmShift(P[0] - d.last[0], P[1] - d.last[1]); d.last = P; return; }
            if (d.mode === 'cut') {
                const L = d.pts[d.pts.length - 1], l = pmDist(P, L); if (l < 2.5) return;
                d.pts.push(P); d.len += l; d.acc += l; d.ang = Math.atan2(P[1] - L[1], P[0] - L[0]);
                if (d.len > 90 && d.pts.length > 14 && pmDist(P, d.pts[0]) < 20) pmFinishCut();
                return;
            }
            if (d.mode === 'ink') {
                const st = S.edit.st, E = pmEditPose(st), L = [(P[0] - E.cx) / E.s, (P[1] - E.cy) / E.s], t = pmNow(), l = pmDist(L, d.last);
                if (l < .25) return;
                const v = l / Math.max(1, t - d.lt); pmInk(st, d.last, L, v);
                d.last = L; d.lt = t; return;
            }
            if (d.mode === 'piece') {
                if (d.seal) { d.seal.move(P[0], P[1]); return; }
                if (pmDist(P, d.start) < 7 || d.crumpled) return;
                d.moved = true; clearTimeout(d.lp);
                d.seal = pmPeel(d.st, d.start);
                if (d.seal) d.seal.move(P[0], P[1]); else S.drag = null;
            }
        }
        /* 🏷️ 씰스티커처럼 가장자리부터 떼기 (js/peelfx.js pfxSeal) : 다 떼면 손가락을 따라와요 · 페이지에 놓으면 붙고 아니면 종이의 제자리로 */
        function pmPeel(st, at) {
            const S = pmS; if (!window.pfxSeal) return null;
            pmSeat(st); st.peel = true;
            const back = msg => { st.peel = false; st.squish = pmNow(); if (S.gone) { S.gone = 0; S.back = pmNow(); } if (msg) pmSay(msg); };
            pmSay('찌익… 끝까지 <b>떼어</b> 내요');
            const seal = pfxSeal({ src: st.img, cx: st.cx, cy: st.cy, w: st.w * st.s, h: st.h * st.s, rot: 0, x: at[0], y: at[1],
                onDetach: () => { if (pmPhone()) { S.gone = pmNow(); S.back = 0; } if (S.note && window.snbAway) snbAway(true); pmBuzz(15); pmSay('톡! 떼어졌어요 ✨ <b>페이지</b>에 놓으면 붙어요'); },   // 📱 종이는 스르르 비켜요 (놓으면 다시)
                onCancel: () => { if (S.note && window.snbAway) snbAway(false); back('조금만 더! 끝까지 떼어야 해요'); },
                onDrop: (cx, cy, rot) => {
                    if (!S.on) return;
                    const away = !!S.gone, pg = pmq('canvasArea'), r = pg && pg.getBoundingClientRect();
                    if (away) { S.gone = 0; S.back = pmNow(); }
                    if (S.note) { if (window.snbAway) snbAway(false); if (window.snbOver && snbOver(cx, cy)) { st.cx = cx; st.cy = cy; st.rot = rot; st.s = S.SC; pmStick(st); return; } back('<b>페이지 위</b>에 놓아야 붙어요 · 종이에 다시 붙여 뒀어요'); return; }   // 📒 수첩 위에 놓으면 안 붙어요
                    if (r && (away || !pmInSheet([cx, cy])) && cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) { st.cx = cx; st.cy = cy; st.rot = rot; st.s = S.SC; pmStick(st); return; }
                    back('페이지 위에 놓아야 붙어요 · 종이에 다시 붙여 뒀어요');
                } });
            const stage = document.querySelector('body > .pfx-stage:last-of-type'); if (stage && S.note) stage.classList.add('snb-top');   // 📒 수첩 위에서 떼어져요
            return seal;
        }
        /* 한 바퀴 다 그리면 그 모양대로 칼집 : 스티커는 종이에 그대로 붙어 있어요 (떨어지지 않아요) */
        function pmFinishCut() {
            const S = pmS, d = S.drag; S.drag = null;
            const st = pmCutOut(d.pts);
            if (!st) { S.fades.push({ pts: d.pts, len: d.len, t0: pmNow() }); pmSay('여긴 종이가 거의 없어요. 남은 그림에 칼집을 내 보세요'); return; }
            S.pieces.push(st); st.squish = pmNow(); pmBuzz(18);
            pmSay('스윽! 칼집이 났어요 ✂️ 스티커를 <b>누른 채 끌어서</b> 떼어 내요 · 톡 = ✍️ 글씨');
        }
        function pmUp(e) {
            const S = pmS, d = S.drag; if (!d) return;
            S.drag = null;
            if (d.mode === 'sheet') { pmSay('원하는 그림 둘레를 손가락으로 <b>한 바퀴</b> 따라 그리면 칼집이 나요'); return; }
            if (d.mode === 'cut') {
                if (d.len > 90 && pmDist(d.pts[d.pts.length - 1], d.pts[0]) < 44) { S.drag = d; pmFinishCut(); return; }
                S.fades.push({ pts: d.pts, len: d.len, t0: pmNow() });
                pmSay(d.len < 60 ? '그림 둘레를 <b>쭉 이어서</b> 따라 그려요' : '아쉬워요! <b>처음 자리</b>까지 돌아와야 칼집이 나요'); return;
            }
            if (d.mode === 'edittap') { if (pmDist([e.clientX, e.clientY], d.start) < 12) pmExitEdit(); return; }
            if (d.mode === 'piece') {
                clearTimeout(d.lp);
                if (d.seal) { d.seal.up(); return; }                                               // 떼던 중 : 다 뗐으면 놓은 자리에 · 아니면 제자리로 (pmPeel)
                if (!d.crumpled) pmEnterEdit(d.st);
            }
        }

        /* 놓은 자리에 붙이기 : 화면에 보이던 크기 · 기울기 그대로 (js/piecebag.js 와 같은 방법) */
        function pmStick(st) {
            const S = pmS, pg = pmq('canvasArea'), r = pg.getBoundingClientRect(), k = r.width / (pg.offsetWidth || r.width) || 1;
            const q = Math.min(1, PM_OUT / Math.max(st.img.width, st.img.height)), o = pmMk(st.img.width * q, st.img.height * q);
            o.getContext('2d').drawImage(st.img, 0, 0, o.width, o.height);
            S.pieces = S.pieces.filter(p => p !== st);
            if (!addImage(o.toDataURL('image/png'))) return;
            const el = pg.querySelector('.element-box:last-child');
            if (el) {
                el.dataset.float = 1;                                                          // 📄 모조지스티커 표시 (다듬기 종류 · 옮길 때 살짝 떠요)
                const w = st.w * st.s / k, h = st.h * st.s / k, PADB = 14;                     // .element-box 안쪽 여백 6px · 테두리 1px (양쪽)
                const deg = Math.round(Math.max(-.5, Math.min(.5, st.rot)) * 180 / Math.PI * 10) / 10;
                const put = (px, py) => { el.dataset.posX = px; el.dataset.posY = py; el.style.transform = `translate(${px}px, ${py}px) scale(1) rotate(${deg}deg)`; };
                el.style.width = w + 'px'; el.style.height = h + 'px'; el.dataset.rotation = deg;
                const x = Math.round((st.cx - r.left) / k - (w + PADB) / 2), y = Math.round((st.cy - r.top) / k - (h + PADB) / 2);
                put(x, y);
                const b = el.getBoundingClientRect();
                put(Math.round(x + (st.cx - (b.left + b.width / 2)) / k), Math.round(y + (st.cy - (b.top + b.height / 2)) / k));
            }
            if (typeof saveData === 'function') saveData(false);
            pmBuzz(8);
            pmSay('꾹! 붙였어요 ✨ 다른 그림에도 칼집을 내 보세요');
        }

        /* ---------- 그리기 ---------- */
        /* 칼집 낸 스티커 : 종이 제자리에 납작하게 + 칼집 선 · ✍️ 글씨 쓸 때(pose)는 크게 들어 올려서 */
        function pmDrawPiece(c, st, t, pose) {
            const S = pmS, p = pose || st, d = S.drag;
            let sc = p.s;
            if (st.squish) { const q = Math.min(1, (t - st.squish) / 280); sc *= 1 + Math.sin(q * Math.PI * 2) * (1 - q) * .035; if (q >= 1) st.squish = 0; }
            if (d && d.mode === 'piece' && d.st === st && !d.moved && !d.crumpled) sc *= 1 - .035 * Math.min(1, (t - d.t0) / 520);
            c.save();
            if (pose) { c.shadowColor = 'rgba(60,40,50,.28)'; c.shadowBlur = 18; c.shadowOffsetY = 8; }
            else if (st.lift) { c.shadowColor = `rgba(80,50,60,${.12 + st.lift * .04})`; c.shadowBlur = 1 + st.lift * 1.5; c.shadowOffsetY = st.lift * .5; }   // 구겨지면 가장자리가 살짝 들떠요
            c.translate(p.cx, p.cy); c.rotate(p.rot); c.scale(sc, sc); c.drawImage(st.img, -st.w / 2, -st.h / 2, st.w, st.h); c.restore();
            if (pose) return;
            const born = Math.min(1, (t - st.born) / 320);                                       // ✂️ 칼집 선 (종이 좌표 → 화면)
            c.save(); c.translate(S.X, S.Y); c.scale(S.SC, S.SC); pmPoly(c, st.pts); c.lineJoin = 'round';
            c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = 1.6 / S.SC; c.stroke();
            c.strokeStyle = `rgba(95,70,72,${.35 + (1 - born) * .4})`; c.lineWidth = .8 / S.SC; c.stroke(); c.restore();
        }
        function pmDrawCut(c, d, alpha, t) {
            const pts = d.pts; if (pts.length < 2) return;
            c.save(); c.globalAlpha = alpha; c.lineJoin = 'round'; c.lineCap = 'round';
            c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (const p of pts) c.lineTo(p[0], p[1]);
            c.strokeStyle = 'rgba(255,255,255,.7)'; c.lineWidth = 2.4; c.stroke(); c.strokeStyle = 'rgba(70,52,58,.75)'; c.lineWidth = 1.1; c.stroke();
            if (alpha === 1) {
                const S0 = pts[0], L = pts[pts.length - 1];
                if (d.len > 50) { const pu = .5 + .5 * Math.sin(t / 160); c.setLineDash([4, 4]); c.strokeStyle = `rgba(210,90,120,${.45 + pu * .4})`; c.lineWidth = 1.6; c.beginPath(); c.arc(S0[0], S0[1], 20 + pu * 3, 0, 7); c.stroke(); c.setLineDash([]); }
                c.translate(L[0], L[1]); c.rotate(d.ang + Math.PI - .5); pmKnife(c);
            }
            c.restore();
        }
        /* 커터칼 : 칼끝이 (0, 0) · 손잡이는 +x 쪽 */
        function pmKnife(c) {
            c.shadowColor = 'rgba(80,50,60,.25)'; c.shadowBlur = 4; c.shadowOffsetY = 2;
            c.beginPath(); c.moveTo(0, 0); c.lineTo(13, -4.5); c.lineTo(13, 3.5); c.closePath();                       // 칼날
            c.fillStyle = '#e9edf3'; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0; c.strokeStyle = '#a8b0bd'; c.lineWidth = .8; c.stroke();
            c.strokeStyle = 'rgba(150,158,170,.7)'; c.lineWidth = .6; c.beginPath(); c.moveTo(6, -2.2); c.lineTo(6, 1.8); c.stroke();
            pmRR(c, 12, -5.5, 30, 11, 5); c.fillStyle = '#ffb3c8'; c.fill(); c.strokeStyle = '#e88aa4'; c.lineWidth = 1; c.stroke();   // 분홍 손잡이
            c.fillStyle = '#fff'; c.beginPath(); c.arc(22, -1.5, 2.2, 0, 7); c.fill();                                // 밀개
            c.fillStyle = 'rgba(255,255,255,.55)'; pmRR(c, 26, -4, 13, 2.4, 1.2); c.fill();
        }
        /* 종이 위쪽 마스킹테이프 (잡고 옮기는 손잡이) */
        function pmDrawTape(c) {
            const t = pmTape(); c.save(); c.translate(t.x + t.w / 2, t.y + t.h / 2); c.rotate(-.03);
            const w = t.w / 2, h = t.h / 2; c.beginPath(); c.moveTo(-w, -h);
            for (let i = 0; i <= 6; i++) c.lineTo(w - (i % 2) * 4, -h + i * t.h / 6);
            for (let i = 0; i <= 6; i++) c.lineTo(-w + ((i + 1) % 2) * 4, h - i * t.h / 6);
            c.closePath(); c.shadowColor = 'rgba(90,60,70,.18)'; c.shadowBlur = 3; c.shadowOffsetY = 1;
            c.fillStyle = 'rgba(255,198,214,.88)'; c.fill(); c.shadowBlur = 0; c.shadowOffsetY = 0;
            c.fillStyle = 'rgba(255,255,255,.35)'; for (let x = -w + 8; x < w - 4; x += 12) c.fillRect(x, -h, 5, t.h);
            c.fillStyle = '#9b5a6e'; c.font = "700 12px 'Jua', sans-serif"; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✋ 잡고 옮겨요', 0, 1);
            c.restore();
        }
        function pmFrame() {
            const S = pmS; if (!S.on || !pmNoteKeep()) return;
            const c = S.ctx, t = pmNow();
            c.setTransform(S.DPR, 0, 0, S.DPR, 0, 0); c.clearRect(0, 0, S.W, S.H);
            const bo = S.gone ? Math.max(0, 1 - (t - S.gone) / 220) : S.back ? Math.min(1, (t - S.back) / 260) : 1;   // 📱 비켜 줄 때 스르르
            if (bo > 0) {
                c.save(); c.globalAlpha = bo; c.shadowColor = 'rgba(90,60,70,.2)'; c.shadowBlur = 6; c.shadowOffsetY = 2;
                pmRR(c, S.X, S.Y, PM_W * S.SC, S.SH * S.SC, 6 * S.SC); c.fillStyle = '#ebe2d0'; c.fill(); c.restore();   // 뒷종이(이형지) : 스티커를 떼면 보여요
                c.save(); c.globalAlpha = bo; c.drawImage(S.sheet, S.X, S.Y, PM_W * S.SC, S.SH * S.SC); c.restore();
                if (!S.note) { c.save(); c.globalAlpha = bo; pmDrawTape(c); c.restore(); }
            }
            const bx = pmq('pmX'); if (bx) { bx.style.opacity = bo; bx.style.visibility = bo > 0 ? 'visible' : 'hidden'; }
            S.pieces.forEach(pmSeat);
            if (bo > 0) { c.save(); c.globalAlpha = bo; for (const st of [...S.pieces].sort((a, b) => a.z - b.z)) if (!st.peel && (!S.edit || S.edit.st !== st)) pmDrawPiece(c, st, t); c.restore(); }
            S.fades = S.fades.filter(f => { const q = (t - f.t0) / 600; if (q >= 1) return false; pmDrawCut(c, f, 1 - q, t); return true; });
            if (S.drag && S.drag.mode === 'cut') pmDrawCut(c, S.drag, 1, t);
            pmZones();
            if (S.edit) { const p = pmPoseAt(t); c.fillStyle = `rgba(80,50,62,${.32 * p.q})`; c.fillRect(0, 0, S.W, S.H); pmDrawPiece(c, S.edit.st, t, p); }
            S.raf = requestAnimationFrame(pmFrame);
        }

        window.pmMakeSheet = pmMakeSheet; window.openPaperSheet = openPaperSheet; window.closePaperSheet = closePaperSheet;
        window.pmSetPen = pmSetPen; window.pmUndo = pmUndo; window.pmExitEdit = pmExitEdit;
