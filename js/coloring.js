/* 말랑달콤 다이어리 - js/coloring.js
   🖍️ 색칠놀이 (놀이터 → 만들기·꾸미기 → 🖍️ 색칠놀이)
   - 그림 고르기 → 칸을 톡 누르면 고른 색으로 칠해져요 · 🧽 지우개 · ↶ 되돌리기 · 🪞 대칭 칠하기(만다라)
   - 칠하던 그림은 이 기기에 그대로 남아요 (다음에 이어서 칠하기)
   - 📌 다이어리에 붙이기 (안 칠한 바탕은 투명) · 💾 그림 저장 (PNG)
   ※ 그림은 js/coloring-data.js · 이 파일이 없어도 다이어리는 정상 동작 (색칠놀이만 '준비 중') */

        const CL_LOCAL = 'malang_coloring', CL_WHITE = '#ffffff', CL_LINE = '#4a3a40';
        const CL_COLORS = ['#ff8fab', '#ff5c8a', '#ffb4a2', '#ff9f43', '#ffd23f', '#fff3a0', '#c7f0a8', '#6fd08c', '#2fae7a', '#a8e6ef',
            '#5ec8f2', '#3d7be0', '#c3b5ff', '#9b6be0', '#f3c4ff', '#d9a066', '#8b5a3c', '#ffe4d0', '#b8b8c0', '#4a3a40'];
        const clS = { built: false, page: null, fills: [], hist: [], color: CL_COLORS[0], sym: true, all: null };
        const clq = id => document.getElementById(id);

        /* ---------- 저장 (이 기기) ---------- */
        function clAll() {
            if (!clS.all) { try { clS.all = JSON.parse(localStorage.getItem(CL_LOCAL) || '{}') || {}; } catch (e) { clS.all = {}; } }
            return clS.all;
        }
        function clKeep() {
            const all = clAll(), o = {};
            clS.fills.forEach((c, i) => { if (c && c !== CL_WHITE) o[i] = c; });
            if (Object.keys(o).length) all[clS.page.id] = o; else delete all[clS.page.id];
            try { localStorage.setItem(CL_LOCAL, JSON.stringify(all)); } catch (e) {}
        }

        /* ---------- 그림 SVG ---------- */
        const CL_STYLE = `<style>.c{stroke:${CL_LINE};stroke-width:3;stroke-linejoin:round}.k{fill:${CL_LINE};stroke:${CL_LINE};stroke-width:3;stroke-linecap:round;stroke-linejoin:round}.k[fill=none]{fill:none}</style>`;
        /* fills : 칸 번호 → 색 · clear : 안 칠한 바탕을 투명하게 (다이어리에 붙일 때) */
        function clSvg(page, fills, clear) {
            let i = 0;
            const body = page.svg.replace(/<(\w+) class="c"/g, (m, tag) => {
                const n = i++, f = fills[n] || CL_WHITE;
                return clear && n === 0 && page.svg.startsWith('\n<rect') && f === CL_WHITE ? `<${tag} data-i="0" fill="none" stroke="none"` : `<${tag} data-i="${n}" fill="${f}" class="c"`;
            });
            return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-4 -4 308 308">${CL_STYLE}${body}</svg>`;
        }
        const clUrl = (page, fills, clear) => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(clSvg(page, fills, clear));
        const clSaved = page => { const o = clAll()[page.id] || {}, f = []; Object.keys(o).forEach(k => { f[+k] = o[k]; }); return f; };

        /* ---------- 화면 ---------- */
        function clBuild() {
            if (clS.built) return;
            clS.built = true;
            const el = document.createElement('div');
            el.id = 'clRoom'; el.className = 'cl-room';
            el.innerHTML = `
              <div class="cl-bar"><button class="cl-x" type="button" id="clBack" onclick="clList()" aria-label="뒤로" hidden>←</button><span class="cl-sp" id="clSp"></span><b id="clTitle">🖍️ 색칠놀이</b><button class="cl-x" type="button" onclick="closeColoring()" aria-label="닫기">✕</button></div>
              <div class="cl-wrap">
                <section id="clStep1" class="cl-step">
                  <p class="cl-lead">어떤 그림을 칠해 볼까요?</p>
                  <div class="cl-pages" id="clPages"></div>
                  <p class="cl-note">칠하던 그림은 이 기기에 남아 있어서 다음에 이어서 칠할 수 있어요 🎨</p>
                </section>
                <section id="clStep2" class="cl-step" hidden>
                  <div class="cl-stage" id="clStage" onclick="clTap(event)"></div>
                  <div class="cl-colors" id="clColors"></div>
                  <div class="cl-tools">
                    <button type="button" id="clEraser" onclick="clPick('${CL_WHITE}')">🧽 지우개</button>
                    <button type="button" id="clUndo" onclick="clUndo()">↶ 되돌리기</button>
                    <button type="button" id="clSym" onclick="clToggleSym()" hidden>🪞 대칭 칠하기</button>
                    <button type="button" onclick="clReset()">🗑 처음부터</button>
                  </div>
                  <div class="cl-acts">
                    <button type="button" class="cl-main" onclick="clStick()">📌 다이어리에 붙이기</button>
                    <button type="button" onclick="clDownload()">💾 그림 저장</button>
                  </div>
                </section>
              </div>`;
            document.body.appendChild(el);
            clq('clColors').innerHTML = CL_COLORS.map(c => `<button type="button" style="--c:${c}" data-c="${c}" onclick="clPick('${c}')" aria-label="색"></button>`).join('');
        }
        function clList() {
            clq('clStep1').hidden = false; clq('clStep2').hidden = true;
            clq('clBack').hidden = true; clq('clSp').hidden = false; clq('clTitle').textContent = '🖍️ 색칠놀이';
            const all = clAll();
            clq('clPages').innerHTML = COLORING_PAGES.map((p, i) => `<button type="button" class="cl-page" onclick="clOpen(${i})"><img src="${clUrl(p, clSaved(p))}" alt="${p.name}">${all[p.id] ? '<i>칠하는 중</i>' : ''}<b>${p.name}</b></button>`).join('');
        }
        function clOpen(i) {
            const p = COLORING_PAGES[i]; if (!p) return;
            clS.page = p; clS.fills = clSaved(p); clS.hist = [];
            clq('clStep1').hidden = true; clq('clStep2').hidden = false;
            clq('clBack').hidden = false; clq('clSp').hidden = true; clq('clTitle').textContent = '🖍️ ' + p.name;
            clq('clStage').innerHTML = clSvg(p, clS.fills);
            clq('clSym').hidden = !p.sym; clSymMark();
            clPick(clS.color); clUndoMark();
            clq('clRoom').scrollTop = 0;
        }

        /* ---------- 칠하기 ---------- */
        function clPick(c) {
            clS.color = c;
            document.querySelectorAll('#clColors button').forEach(b => b.classList.toggle('on', b.dataset.c === c));
            clq('clEraser').classList.toggle('on', c === CL_WHITE);
        }
        function clTap(e) {
            const t = e.target.closest && e.target.closest('.c'); if (!t) return;
            const svg = clq('clStage').querySelector('svg');
            const g = clS.page.sym && clS.sym && t.dataset.g;
            const els = g ? [...svg.querySelectorAll(`.c[data-g="${g}"]`)] : [t];
            const ch = els.filter(x => (clS.fills[+x.dataset.i] || CL_WHITE) !== clS.color);
            if (!ch.length) return;
            clS.hist.push(ch.map(x => [+x.dataset.i, clS.fills[+x.dataset.i] || CL_WHITE]));
            if (clS.hist.length > 60) clS.hist.shift();
            ch.forEach(x => { clS.fills[+x.dataset.i] = clS.color; x.setAttribute('fill', clS.color); x.classList.remove('cl-pop'); void x.getBBox(); x.classList.add('cl-pop'); });
            clKeep(); clUndoMark();
        }
        function clUndo() {
            const h = clS.hist.pop(); if (!h) return;
            const svg = clq('clStage').querySelector('svg');
            h.forEach(([i, c]) => { clS.fills[i] = c; const x = svg.querySelector(`.c[data-i="${i}"]`); if (x) x.setAttribute('fill', c); });
            clKeep(); clUndoMark();
        }
        const clUndoMark = () => { clq('clUndo').disabled = !clS.hist.length; };
        function clToggleSym() { clS.sym = !clS.sym; clSymMark(); }
        const clSymMark = () => { const b = clq('clSym'); b.classList.toggle('on', clS.sym); b.textContent = clS.sym ? '🪞 대칭 칠하기 켜짐' : '🪞 대칭 칠하기 꺼짐'; };
        async function clReset() {
            if (!clS.fills.some(c => c && c !== CL_WHITE)) return;
            if (!(await showMsg('칠한 색을 모두 지우고 처음부터 칠할까요?', true))) return;
            clS.fills = []; clS.hist = []; clKeep();
            clq('clStage').innerHTML = clSvg(clS.page, clS.fills); clUndoMark();
        }

        /* ---------- 붙이기 · 저장 ---------- */
        function clStick() {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">칠한 그림은 그대로 남아 있어요.</span>'); return; }
            if (!addImage(clUrl(clS.page, clS.fills, true))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = '160px';
            closeColoring();
            if (typeof toast === 'function') toast('🖍️ 색칠한 그림을 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
        }
        function clDownload() {
            const img = new Image();
            img.onload = () => {
                const cv = document.createElement('canvas'); cv.width = cv.height = 900;
                const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 900, 900); x.drawImage(img, 0, 0, 900, 900);
                const a = document.createElement('a'), n = new Date(), p = v => String(v).padStart(2, '0');
                a.href = cv.toDataURL('image/png'); a.download = `말랑색칠_${clS.page.name.replace(/[^\w가-힣]/g, '')}_${n.getFullYear()}${p(n.getMonth() + 1)}${p(n.getDate())}.png`;
                document.body.appendChild(a); a.click(); a.remove();
            };
            img.src = clUrl(clS.page, clS.fills);
        }

        function openColoring() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            clBuild(); clList();
            clq('clRoom').classList.add('show');
            document.body.classList.add('fc-lock');
        }
        function closeColoring() {
            const r = clq('clRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openColoring = openColoring;
