/* 말랑달콤 다이어리 - js/draw.js
   🖍️ 펜 · 형광펜 : 다이어리 위에 손으로 그리고 밑줄 긋기 (툴바 → 🖍️ 펜)
   - 펜 : 또렷한 선 · 형광펜 : 반투명한 굵은 선 (글 위에 그어도 글씨가 비쳐 보여요)
   - 지우개는 문지른 부분만 지워요 (굵기 3가지) · ↶ 는 방금 한 일(그리기 · 지우기) 되돌리기
   - ✓ 완료를 누르면 이번에 그린 선들이 그림 하나가 돼요 → 다른 그림처럼 옮기기 · 돌리기 · 크기 · 삭제
   - 그림은 SVG 로 일기에 담겨요 (파일 없음) · 선을 아주 많이 그리면 그날 일기 파일이 조금 커져요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (펜 버튼만 '준비 중') */

        const DRAW_PEN_COLORS = ['#333333', '#e2556f', '#ff8a3d', '#3d9be0', '#4caf7a', '#8a6be0', '#8a5a44', '#ffffff'];
        const DRAW_HI_COLORS = ['#ffe14d', '#ff9ec4', '#9be59b', '#9fd3ff', '#ffc078', '#cdb4ff'];
        const DRAW_SIZES = { pen: [2, 4, 7], hi: [12, 18, 26], erase: [12, 24, 40] };
        const dw = { on: false, tool: 'pen', color: { pen: DRAW_PEN_COLORS[0], hi: DRAW_HI_COLORS[0] }, size: { pen: 1, hi: 1, erase: 1 }, strokes: [], hist: [], cur: null, ring: null, svg: null, k: 1 };
        const drq = id => document.getElementById(id);
        const DRAW_NS = 'http://www.w3.org/2000/svg';

        function penPathD(pts) {                       // 점들을 부드러운 곡선으로
            const f = n => Math.round(n * 10) / 10;
            if (pts.length === 1) return `M${f(pts[0][0])} ${f(pts[0][1])}l0.1 0`;
            let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
            for (let i = 1; i < pts.length - 1; i++) {
                const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
                d += `Q${f(pts[i][0])} ${f(pts[i][1])} ${f(mx)} ${f(my)}`;
            }
            const l = pts[pts.length - 1];
            return d + `L${f(l[0])} ${f(l[1])}`;
        }
        function penAttrs(s) {
            return s.tool === 'hi'
                ? { stroke: s.color, 'stroke-width': s.w, 'stroke-opacity': .42, 'stroke-linecap': 'butt', 'stroke-linejoin': 'round', fill: 'none' }
                : { stroke: s.color, 'stroke-width': s.w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' };
        }
        function penRender() {
            const g = dw.svg && dw.svg.firstChild; if (!g) return;
            g.innerHTML = '';
            dw.strokes.concat(dw.cur ? [dw.cur] : []).forEach(s => {
                const p = document.createElementNS(DRAW_NS, 'path');
                p.setAttribute('d', penPathD(s.pts));
                const a = penAttrs(s); Object.keys(a).forEach(k => p.setAttribute(k, a[k]));
                g.appendChild(p);
            });
            drq('penUndo').disabled = !dw.hist.length;
        }

        /* ---------- 그리기 모드 ---------- */
        function openDraw() {
            if (dw.on) return;
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            if (selectedElement) { selectedElement.classList.remove('selected'); selectedElement = null; if (typeof updateTextPanel === 'function') updateTextPanel(); }
            penBuildBar();
            const canvas = drq('canvasArea');
            const svg = document.createElementNS(DRAW_NS, 'svg');
            svg.id = 'penLayer'; svg.setAttribute('class', 'draw-layer');
            svg.innerHTML = '<g></g><circle class="draw-ring" r="10" cx="-99" cy="-99"/>';
            canvas.appendChild(svg);
            dw.svg = svg; dw.ring = svg.lastChild; dw.strokes = []; dw.hist = []; dw.cur = null; dw.on = true;
            svg.addEventListener('pointerdown', penDown);
            svg.addEventListener('pointermove', penMove);
            svg.addEventListener('pointerup', penUp);
            svg.addEventListener('pointercancel', penUp);
            svg.addEventListener('pointerleave', () => penRing(null));
            document.body.classList.add('draw-on');
            drq('penBar').hidden = false;
            penSetTool(dw.tool);
            penRender();
        }
        function penPoint(e) {
            const c = drq('canvasArea'), r = c.getBoundingClientRect();
            dw.k = r.width / (c.offsetWidth || r.width) || 1;
            return [(e.clientX - r.left) / dw.k, (e.clientY - r.top) / dw.k];
        }
        function penDown(e) {
            e.preventDefault(); e.stopPropagation();
            try { dw.svg.setPointerCapture(e.pointerId); } catch (err) {}
            const pt = penPoint(e);
            if (dw.tool === 'erase') { dw.erasing = true; dw.hist.push(dw.strokes); dw.erased = false; penRing(pt); penEraseAt(pt); return; }
            dw.cur = { tool: dw.tool, color: dw.color[dw.tool], w: DRAW_SIZES[dw.tool][dw.size[dw.tool]], pts: [pt] };
            penRender();
        }
        function penMove(e) {
            if (dw.tool === 'erase' && !dw.erasing) penRing(penPoint(e));
            if (!dw.cur && !dw.erasing) return;
            e.preventDefault(); e.stopPropagation();
            const pt = penPoint(e);
            if (dw.erasing) penRing(pt);
            if (dw.erasing) { penEraseAt(pt); return; }
            const l = dw.cur.pts[dw.cur.pts.length - 1];
            if (Math.hypot(pt[0] - l[0], pt[1] - l[1]) < 1.5) return;
            if (dw.cur.tool === 'hi' && e.shiftKey) pt[1] = dw.cur.pts[0][1];      // PC : Shift 를 누르면 곧은 형광펜
            dw.cur.pts.push(pt);
            penRender();
        }
        function penUp(e) {
            if (e) e.stopPropagation();
            if (dw.erasing) { dw.erasing = false; if (!dw.erased) dw.hist.pop(); if (e && e.pointerType !== 'mouse') penRing(null); penRender(); }
            if (dw.cur) { dw.hist.push(dw.strokes); dw.strokes = dw.strokes.concat([dw.cur]); dw.cur = null; penRender(); }
        }
        /* 🧽 지우개 : 동그라미에 닿은 부분만 지우고, 선이 끊기면 두 개로 나눠요 */
        function penRing(pt) {
            const c = dw.ring; if (!c) return;
            c.setAttribute('r', DRAW_SIZES.erase[dw.size.erase] / 2);
            c.setAttribute('cx', pt ? pt[0] : -99); c.setAttribute('cy', pt ? pt[1] : -99);
        }
        function penDense(pts) {                       // 점 사이가 멀면 촘촘하게 (곧은 형광펜도 부분 지우기)
            const out = [pts[0]];
            for (let i = 1; i < pts.length; i++) {
                const a = pts[i - 1], b = pts[i], n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 2);
                for (let k = 1; k <= n; k++) out.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]);
            }
            return out;
        }
        function penEraseAt(pt) {
            const r = DRAW_SIZES.erase[dw.size.erase] / 2;
            const near = (p, s) => Math.hypot(p[0] - pt[0], p[1] - pt[1]) < r + s.w * .35;
            let hit = false;
            const out = [];
            dw.strokes.forEach(s => {
                const pts = penDense(s.pts);
                if (!pts.some(p => near(p, s))) { out.push(s); return; }
                hit = true;
                let run = [];
                const keep = () => { if (run.length > (s.tool === 'hi' ? 1 : 0)) out.push({ tool: s.tool, color: s.color, w: s.w, pts: run }); run = []; };
                pts.forEach(p => { if (near(p, s)) keep(); else run.push(p); });
                keep();
            });
            if (hit) { dw.strokes = out; dw.erased = true; penRender(); }
        }
        function penUndo() { if (dw.hist.length) { dw.strokes = dw.hist.pop(); penRender(); } }
        function penSetTool(t) {
            dw.tool = t;
            document.querySelectorAll('#penBar [data-tool]').forEach(b => b.classList.toggle('on', b.dataset.tool === t));
            const opt = drq('penOpts');
            drq('penLayer').classList.toggle('erasing', t === 'erase');
            if (t !== 'erase') penRing(null);
            if (t === 'erase') {
                opt.innerHTML = '<span class="draw-hint">지울 곳을 문질러요</span><span class="draw-sep"></span>'
                    + DRAW_SIZES.erase.map((w, i) => `<button type="button" class="draw-size${i === dw.size.erase ? ' on' : ''}" onclick="penSetSize(${i})" aria-label="지우개 크기"><i style="width:${w / 2 + 4}px;height:${w / 2 + 4}px;border-radius:50%;background:#fff;box-shadow:0 0 0 1.5px #c9a3b2"></i></button>`).join('');
                return;
            }
            const cols = t === 'hi' ? DRAW_HI_COLORS : DRAW_PEN_COLORS;
            opt.innerHTML = cols.map(c => `<button type="button" class="draw-col${c === dw.color[t] ? ' on' : ''}" style="--c:${c}" onclick="penSetColor('${c}')" aria-label="색"></button>`).join('')
                + '<span class="draw-sep"></span>'
                + DRAW_SIZES[t].map((w, i) => `<button type="button" class="draw-size${i === dw.size[t] ? ' on' : ''}" onclick="penSetSize(${i})" aria-label="굵기"><i style="width:${Math.min(22, w + 3)}px;height:${Math.min(t === 'hi' ? 10 : 22, w + 3)}px;border-radius:${t === 'hi' ? 2 : 50}px"></i></button>`).join('');
        }
        function penSetColor(c) { dw.color[dw.tool] = c; penSetTool(dw.tool); }
        function penSetSize(i) { dw.size[dw.tool] = i; penSetTool(dw.tool); }

        /* ✓ 완료 : 그린 선들 → 다이어리 그림 하나 */
        function penDone() {
            const strokes = dw.strokes.slice();
            penClose();
            if (!strokes.length) return;
            let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
            strokes.forEach(s => s.pts.forEach(p => { const r = s.w / 2 + 2; x0 = Math.min(x0, p[0] - r); y0 = Math.min(y0, p[1] - r); x1 = Math.max(x1, p[0] + r); y1 = Math.max(y1, p[1] + r); }));
            const bw = Math.max(10, Math.ceil(x1 - x0)), bh = Math.max(10, Math.ceil(y1 - y0));
            const paths = strokes.map(s => {
                const a = penAttrs(s);
                const d = penPathD(s.pts.map(p => [p[0] - x0, p[1] - y0]));
                return `<path d="${d}" ${Object.keys(a).map(k => `${k}="${a[k]}"`).join(' ')}/>`;
            }).join('');
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${bw} ${bh}" width="${bw}" height="${bh}"><!--malang-draw-->${paths}</svg>`;
            if (!addImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (!el) return;
            const img = el.querySelector('img');
            el.style.width = bw + 'px'; el.style.height = bh + 'px';
            el.dataset.posX = 0; el.dataset.posY = 0; el.dataset.scale = 1; el.dataset.rotation = 0;
            el.style.transform = 'translate(0px, 0px) scale(1) rotate(0deg)';
            // 그린 자리에 정확히 놓기 (화면 확대 · 여백까지 계산)
            const c = drq('canvasArea').getBoundingClientRect(), k = dw.k || 1, ir = img.getBoundingClientRect();
            const ew = bw + (bw - ir.width / k), eh = bh + (bh - ir.height / k);
            el.style.width = ew + 'px'; el.style.height = eh + 'px';
            const ir2 = img.getBoundingClientRect();
            const px = (c.left + x0 * k - ir2.left) / k, py = (c.top + y0 * k - ir2.top) / k;
            el.dataset.posX = px; el.dataset.posY = py;
            el.style.transform = `translate(${px}px, ${py}px) scale(1) rotate(0deg)`;
            if (selectedElement) selectedElement.classList.remove('selected');
            selectedElement = null; if (typeof updateTextPanel === 'function') updateTextPanel();
            saveData(false);
        }
        function penCancel() {
            if (dw.strokes.length) {
                showMsg('그린 선을 모두 지우고 나갈까요?', true).then(ok => { if (ok) penClose(); });
                return;
            }
            penClose();
        }
        function penClose() {
            dw.on = false; dw.cur = null; dw.strokes = []; dw.hist = []; dw.ring = null;
            const l = drq('penLayer'); if (l) l.remove();
            dw.svg = null;
            const bar = drq('penBar'); if (bar) bar.hidden = true;
            document.body.classList.remove('draw-on');
        }

        function penBuildBar() {
            if (drq('penBar')) return;
            const bar = document.createElement('div');
            bar.id = 'penBar'; bar.className = 'draw-bar'; bar.hidden = true;
            bar.innerHTML = `
              <div class="draw-row">
                <button type="button" data-tool="pen" onclick="penSetTool('pen')">🖊️ 펜</button>
                <button type="button" data-tool="hi" onclick="penSetTool('hi')">🖍️ 형광펜</button>
                <button type="button" data-tool="erase" onclick="penSetTool('erase')">🧽 지우개</button>
                <button type="button" id="penUndo" onclick="penUndo()" aria-label="되돌리기">↶</button>
              </div>
              <div class="draw-row draw-opts" id="penOpts"></div>
              <div class="draw-row">
                <button type="button" class="draw-cancel" onclick="penCancel()">✕ 취소</button>
                <button type="button" class="draw-done" onclick="penDone()">✓ 완료</button>
              </div>`;
            document.body.appendChild(bar);
        }
        /* 그리는 동안에는 페이지 넘기기(끌기)를 막아요 */
        document.getElementById('diaryWrapper').addEventListener('pointerdown', e => {
            if (dw.on && !e.target.closest('#penLayer')) e.stopPropagation();
        }, true);
        window.openDraw = openDraw;
