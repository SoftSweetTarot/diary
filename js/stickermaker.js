/* 말랑달콤 다이어리 - js/stickermaker.js
   ✂️ 스티커 만들기 : 내 사진이나 글씨로 하얀 테두리 '다이컷 스티커'를 만들어요 (하단메뉴 ✨ 스티커 → 📷 사진 찍기 · 🖼️ 사진 고르기 · 🔤 글씨 스티커)
   - 사진 스티커 : 📷 찍기 · 🖼 고르기 → 모양(동그라미 · 하트 · 별 · 둥근네모 · 구름) 또는 ✂️ 손으로 오리기 → 끌어서 자리 · 크기 조절
   - 글씨 스티커 : 1단계 글자 쓰기 → (다음 단계) 2단계 글꼴 · 색 · 하얀 테두리 고르고 붙이기
   - 💾 내 스티커에 저장 : ✏️ 스티커 창 → ✂️ 내 스티커 에서 언제든 다시 붙여요 (최대 40개)
     저장 위치 : 내 드라이브 말랑달콤 / 다이어리 / 내스티커.json (게스트는 이 기기에만)
   ※ 사진은 이 기기에서만 오려서, 완성한 스티커 그림만 저장돼요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (세 버튼만 '준비 중') */

        const SM_FILE = '내스티커.json', SM_LOCAL = 'malang_my_stickers', SM_MAX = 40, SM_SIZE = 300, SM_OUT = 260;
        const SM_SHAPES = [['circle', '동그라미'], ['heart', '하트'], ['star', '별'], ['round', '둥근네모'], ['cloud', '구름'], ['free', '✂️ 손으로']];
        const SM_DEF_FONT = "'Jua', sans-serif";                      // 처음 글꼴 (고르는 목록은 설정창과 같은 fontList · js/app.js)
        const SM_COLORS = ['#ff6b8b', '#ff9f43', '#ffd23f', '#4caf7a', '#3d9be0', '#8a6be0', '#5a3d4a', '#ffffff'];
        const smS = { built: false, mode: 'photo', img: null, shape: 'circle', zoom: 1, ox: 0, oy: 0, path: [], drawing: false, border: true,
            text: '', step: 1, font: SM_DEF_FONT, color: SM_COLORS[0], list: null, fileId: null, loading: null, out: '' };
        const smq = id => document.getElementById(id);
        const smSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;

        /* ---------- 내 스티커 목록 (드라이브) ---------- */
        async function smLoad() {
            if (smS.list) return smS.list;
            if (smS.loading) return smS.loading;
            smS.loading = (async () => {
                let arr = [];
                try {
                    if (smSync()) {
                        const rootId = await getFolder(ROOT_PATH, false);
                        if (rootId) { const f = (await driveList(`name='${SM_FILE}' and '${rootId}' in parents and trashed=false`, 'id,name'))[0]; if (f) { smS.fileId = f.id; const o = JSON.parse(await readFileText(f.id) || '{}'); arr = Array.isArray(o.s) ? o.s : []; } }
                    } else { const o = JSON.parse(localStorage.getItem(SM_LOCAL) || '{}'); arr = Array.isArray(o.s) ? o.s : []; }
                } catch (e) {}
                smS.list = arr.filter(x => x && /^data:image\/(png|webp|jpeg)/.test(x.src || ''));
                smS.loading = null;
                return smS.list;
            })();
            return smS.loading;
        }
        async function smSave() {
            const body = JSON.stringify({ v: 1, s: smS.list });
            if (smSync()) {
                const rootId = await getFolder(ROOT_PATH, true);
                try { const r = await driveUpsert(rootId, SM_FILE, smS.fileId, body); smS.fileId = r.id; }
                catch (e) { if (e && e.code === 'gone') { smS.fileId = null; const r = await driveUpsert(rootId, SM_FILE, null, body); smS.fileId = r.id; } else throw e; }
            } else localStorage.setItem(SM_LOCAL, body);
        }

        /* ---------- 화면 ---------- */
        function smBuild() {
            if (smS.built) return;
            smS.built = true;
            const el = document.createElement('div');
            el.id = 'smRoom'; el.className = 'smk-room';
            el.innerHTML = `
              <div class="smk-bar"><span class="smk-x"></span><b>✂️ 스티커 만들기</b><button class="smk-x" type="button" onclick="closeStickerMaker()" aria-label="닫기">✕</button></div>
              <div class="smk-wrap">
                <input type="file" id="smCam" accept="image/*" capture="environment" hidden onchange="smPickFile(this)">
                <input type="file" id="smFile" accept="image/*" hidden onchange="smPickFile(this)">
                <section id="smStep2" class="smk-step">
                  <div class="smk-stage"><canvas id="smCanvas" width="${SM_SIZE}" height="${SM_SIZE}"></canvas></div>
                  <p class="smk-hint" id="smHint"></p>
                  <div id="smPhotoOpts">
                    <div class="smk-chips" id="smShapes">${SM_SHAPES.map(s => `<button type="button" data-s="${s[0]}" onclick="smSetShape('${s[0]}')">${s[1]}</button>`).join('')}</div>
                    <label class="smk-zoom">🔍 <input type="range" id="smZoom" min="0.4" max="3" step="0.02" value="1" oninput="smS.zoom=+this.value;smDraw()"></label>
                  </div>
                  <div id="smTextA" class="smk-col" hidden>
                    <input id="smText" maxlength="12" placeholder="스티커 글씨 (예: 오늘도 화이팅!)" oninput="smS.text=this.value;smDraw()" onkeydown="if(event.key==='Enter'){event.preventDefault();smTextNext()}">
                    <button type="button" class="smk-go" onclick="smTextNext()">다음 단계 ▶</button>
                  </div>
                  <div id="smTextB" class="smk-col" hidden>
                    <div class="smk-chips smk-fonts" id="smFonts"></div>
                    <div class="smk-colors" id="smColors">${SM_COLORS.map(c => `<button type="button" data-c="${c}" style="--c:${c}" onclick="smSetColor('${c}')" aria-label="색"></button>`).join('')}</div>
                  </div>
                  <div id="smFinal" class="smk-col">
                    <label class="smk-border"><input type="checkbox" id="smBorder" checked onchange="smS.border=this.checked;smDraw()"> 하얀 테두리</label>
                    <button type="button" class="smk-go" onclick="smFinish(true)">📌 다이어리에 붙이기</button>
                    <button type="button" class="smk-go smk-sub" onclick="smFinish(false)">💾 내 스티커에 저장만</button>
                    <button type="button" class="smk-go smk-sub" id="smTextBack" onclick="smTextPrev()" hidden>◀ 이전 단계</button>
                  </div>
                </section>
              </div>`;
            document.body.appendChild(el);
            /* 📱 글을 쓰는 중에 버튼을 누르면 입력칸이 포커스를 잃으면서 키보드가 접히고 화면이 움직여서(아이패드) 누른 버튼 밑의 버튼이 눌렸어요
               → 버튼을 눌러도 입력칸이 포커스를 그대로 가지게 해서 화면이 안 움직이게 해요 (눌림 자체는 그대로 동작) */
            el.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('button')) e.preventDefault(); });
            /* 📱 손가락으로 누르면 '누르기 시작한 버튼'을 직접 눌러 줘요 (키보드가 접히며 화면이 움직여도 옆 · 아래 버튼이 눌리지 않게)
               브라우저가 따로 보내는 터치 클릭은 막고, 아래 button.click() 이 보내는 클릭만 통과시켜요 */
            let tdown = null, tlast = 0;
            el.addEventListener('pointerdown', e => { const b = e.pointerType !== 'mouse' && e.target.closest && e.target.closest('button'); tdown = b ? { b, x: e.clientX, y: e.clientY } : null; });
            el.addEventListener('pointerup', e => {
                const d = tdown; tdown = null; if (!d || e.pointerType === 'mouse') return;
                if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return;          // 끌었으면(스크롤) 누른 게 아니에요
                tlast = Date.now(); d.b.click();
            });
            el.addEventListener('click', e => {
                if (e.isTrusted && e.detail > 0 && Date.now() - tlast < 800 && e.target.closest && e.target.closest('button')) { e.stopPropagation(); e.preventDefault(); }
            }, true);
            const cv = smq('smCanvas');
            cv.addEventListener('pointerdown', smDown); cv.addEventListener('pointermove', smMove);
            cv.addEventListener('pointerup', smUp); cv.addEventListener('pointercancel', smUp);
            cv.addEventListener('wheel', e => { if (smS.mode !== 'photo') return; e.preventDefault(); smS.zoom = Math.max(.4, Math.min(3, smS.zoom * (e.deltaY < 0 ? 1.06 : .94))); smq('smZoom').value = smS.zoom; smDraw(); }, { passive: false });
        }

        /* ---------- 사진 ---------- */
        function smPickFile(inp) {
            const f = inp.files && inp.files[0]; inp.value = '';
            if (!f || !/^image\//.test(f.type)) return;
            const im = new Image();
            im.onload = () => {
                const c = document.createElement('canvas'), k = Math.min(1, 1000 / Math.max(im.width, im.height));
                c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
                c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src);
                smS.mode = 'photo'; smS.img = c; smS.zoom = 1; smS.ox = 0; smS.oy = 0; smS.path = [];
                smq('smZoom').value = 1; smS.step = 1; smPhase();
                smShow(); smSetShape(smS.shape === 'free' ? 'circle' : smS.shape);
            };
            im.onerror = () => showMsg('사진을 열지 못했어요. 다른 사진을 골라 주세요.');
            im.src = URL.createObjectURL(f);
        }
        function smSetShape(s) {
            smS.shape = s; smS.path = [];
            document.querySelectorAll('#smShapes button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
            smq('smHint').textContent = s === 'free' ? '✂️ 손가락(마우스)으로 오리고 싶은 모양을 한 번에 빙 둘러 그려요' : '사진을 끌어서 자리를 맞추고, 🔍 막대로 크기를 바꿔요';
            smDraw();
        }
        /* 모양 길 (가운데 기준, 반지름 r) */
        function smShapePath(ctx, s, cx, cy, r) {
            ctx.beginPath();
            if (s === 'circle') ctx.arc(cx, cy, r, 0, Math.PI * 2);
            else if (s === 'heart') { ctx.moveTo(cx, cy + r * .9); ctx.bezierCurveTo(cx - r * 1.35, cy + r * .05, cx - r * .95, cy - r * 1.05, cx, cy - r * .42); ctx.bezierCurveTo(cx + r * .95, cy - r * 1.05, cx + r * 1.35, cy + r * .05, cx, cy + r * .9); }
            else if (s === 'star') { for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .5 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } }
            else if (s === 'round') { const w = r * 1.7, h = r * 1.7, x = cx - w / 2, y = cy - h / 2, q = r * .35; ctx.moveTo(x + q, y); ctx.arcTo(x + w, y, x + w, y + h, q); ctx.arcTo(x + w, y + h, x, y + h, q); ctx.arcTo(x, y + h, x, y, q); ctx.arcTo(x, y, x + w, y, q); }
            else if (s === 'cloud') { [[-.5, .15, .45], [0, -.2, .58], [.5, .1, .48], [-.15, .35, .5], [.3, .38, .45]].forEach(([a, b, c]) => { ctx.moveTo(cx + a * r + c * r, cy + b * r); ctx.arc(cx + a * r, cy + b * r, c * r, 0, Math.PI * 2); }); }
            ctx.closePath();
        }
        function smFreePath(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
        function smPhotoRect() {
            const im = smS.img, base = SM_SIZE / Math.min(im.width, im.height), k = base * smS.zoom;
            const w = im.width * k, h = im.height * k;
            return { x: (SM_SIZE - w) / 2 + smS.ox, y: (SM_SIZE - h) / 2 + smS.oy, w, h };
        }
        /* 스티커 한 장 그리기 (ctx : SM_SIZE 크기) · guide = 편집 중 안내선 */
        function smRender(ctx, guide) {
            const S = SM_SIZE, c = S / 2, r = S * .42;
            ctx.clearRect(0, 0, S, S);
            if (smS.mode === 'text') { smRenderText(ctx); return; }
            const R = smPhotoRect();
            const free = smS.shape === 'free', pts = smS.path, closed = free && pts.length > 8 && !smS.drawing;
            const clip = () => free ? smFreePath(ctx, pts) : smShapePath(ctx, smS.shape, c, c, r);
            if (free && !closed) {                                      // 오리기 전 : 사진 전체 + 그리는 선
                ctx.globalAlpha = .9; ctx.drawImage(smS.img, R.x, R.y, R.w, R.h); ctx.globalAlpha = 1;
                if (pts.length > 1) { ctx.save(); ctx.setLineDash([6, 5]); ctx.lineWidth = 3; ctx.strokeStyle = '#ff6b8b'; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore(); }
                return;
            }
            if (guide) { ctx.save(); ctx.globalAlpha = .22; ctx.drawImage(smS.img, R.x, R.y, R.w, R.h); ctx.restore(); }
            if (smS.border) { ctx.save(); clip(); ctx.lineJoin = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore(); }
            ctx.save(); clip(); ctx.clip(); ctx.drawImage(smS.img, R.x, R.y, R.w, R.h); ctx.restore();
        }
        function smRenderText(ctx) {
            const S = SM_SIZE, t = smS.text || '오늘도 말랑!';
            let size = 64; ctx.font = `${size}px ${smS.font}`;
            while (size > 22 && ctx.measureText(t).width > S - 50) { size -= 2; ctx.font = `${size}px ${smS.font}`; }
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
            if (smS.border) { ctx.save(); ctx.lineWidth = size * .42; ctx.strokeStyle = '#fff'; ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; ctx.strokeText(t, S / 2, S / 2); ctx.restore(); }
            ctx.lineWidth = size * .12; ctx.strokeStyle = smS.color === '#ffffff' ? '#ff9ab3' : 'rgba(0,0,0,.18)'; ctx.strokeText(t, S / 2, S / 2);
            ctx.fillStyle = smS.color; ctx.fillText(t, S / 2, S / 2);
        }
        function smDraw() { const cv = smq('smCanvas'); if (cv) smRender(cv.getContext('2d'), true); smS.out = ''; }

        /* 끌기 : 사진 옮기기 · 손으로 오리기 */
        function smPt(e) { const cv = smq('smCanvas'), r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * SM_SIZE / r.width, (e.clientY - r.top) * SM_SIZE / r.height]; }
        function smDown(e) {
            if (smS.mode !== 'photo') return;
            e.preventDefault(); try { smq('smCanvas').setPointerCapture(e.pointerId); } catch (er) {}
            const p = smPt(e);
            if (smS.shape === 'free') { smS.drawing = true; smS.path = [p]; }
            else smS.drag = { x: p[0], y: p[1], ox: smS.ox, oy: smS.oy };
            smDraw();
        }
        function smMove(e) {
            if (!smS.drawing && !smS.drag) return;
            const p = smPt(e);
            if (smS.drawing) { const l = smS.path[smS.path.length - 1]; if (Math.hypot(p[0] - l[0], p[1] - l[1]) > 2) smS.path.push(p); }
            else { smS.ox = smS.drag.ox + p[0] - smS.drag.x; smS.oy = smS.drag.oy + p[1] - smS.drag.y; }
            smDraw();
        }
        function smUp() {
            if (smS.drawing) { smS.drawing = false; if (smS.path.length < 9) { smS.path = []; smq('smHint').textContent = '✂️ 조금 더 크게 빙 둘러 그려 주세요'; } else smq('smHint').textContent = '✂️ 다시 그리면 새로 오려요'; }
            smS.drag = null; smDraw();
        }

        /* ---------- 글씨 스티커 ---------- */
        function smStartText() {
            smS.mode = 'text'; smS.step = 1; smPhase();
            smq('smText').value = smS.text;
            smFillFonts();
            smShow(); smSetFont(smS.font); smSetColor(smS.color);
            setTimeout(() => smq('smText').focus(), 50);
        }
        /* 글씨 스티커는 두 단계 : 1) 글만 쓰기 → 2) 글꼴 · 색 · 테두리 고르고 붙이기 (사진 스티커는 한 화면 그대로) */
        function smPhase() {
            const t = smS.mode === 'text', one = t && smS.step === 1;
            smq('smPhotoOpts').hidden = t;
            smq('smTextA').hidden = !one;
            smq('smTextB').hidden = !t || one;
            smq('smFinal').hidden = one;
            smq('smTextBack').hidden = !t || one;
            if (t) smq('smHint').textContent = one ? '✏️ 스티커에 쓸 글자를 써요' : '글꼴 · 색 · 테두리를 골라요';
        }
        function smTextNext() {
            if (!(smS.text || '').trim()) { showMsg('스티커에 쓸 글씨를 먼저 써 주세요.'); return; }
            smS.step = 2; smPhase(); smq('smText').blur(); smq('smRoom').scrollTop = 0;
        }
        function smTextPrev() { smS.step = 1; smPhase(); smq('smRoom').scrollTop = 0; setTimeout(() => smq('smText').focus(), 50); }
        /* 글꼴 후보 : 설정창 글꼴 목록(fontList · js/app.js) 중 웹폰트 전부 (기기마다 다른 (Local) · (Apple) 글꼴은 빼요) */
        function smFillFonts() {
            const L = fontList.filter(f => /\[/.test(f.name)), box = smq('smFonts'); if (!box) return;
            box.innerHTML = '';
            L.forEach(f => {
                const b = document.createElement('button');
                b.type = 'button'; b.dataset.f = f.css; b.style.fontFamily = f.css; b.textContent = f.name.replace(/\s*\[.*\]\s*/, '');
                b.onclick = () => smSetFont(f.css); box.appendChild(b);
            });
        }
        function smSetFont(f) {
            smS.font = f; document.querySelectorAll('#smFonts button').forEach(b => b.classList.toggle('on', b.dataset.f === f));
            smDraw();
            if (document.fonts && document.fonts.load) document.fonts.load(`40px ${f}`).then(() => { if (smS.font === f) smDraw(); }).catch(() => {});   // 웹폰트가 늦게 오면 다시 그림
        }
        function smSetColor(c) { smS.color = c; document.querySelectorAll('#smColors button').forEach(b => b.classList.toggle('on', b.dataset.c === c)); smDraw(); }

        /* ---------- 완성 ---------- */
        function smMake() {                                            // 투명 바탕 PNG · 빈 곳은 잘라내기
            if (smS.out) return smS.out;
            if (smS.mode === 'photo' && smS.shape === 'free' && smS.path.length < 9) return '';
            const c = document.createElement('canvas'); c.width = c.height = SM_SIZE;
            const x = c.getContext('2d'); smRender(x, false);
            const d = x.getImageData(0, 0, SM_SIZE, SM_SIZE).data;
            let x0 = SM_SIZE, y0 = SM_SIZE, x1 = 0, y1 = 0;
            for (let y = 0; y < SM_SIZE; y++) for (let i = 0; i < SM_SIZE; i++) if (d[(y * SM_SIZE + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            if (x1 <= x0 || y1 <= y0) return '';
            const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(1, SM_OUT / Math.max(w, h));
            const o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k);
            o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, o.width, o.height);
            return (smS.out = o.toDataURL('image/png'));
        }
        async function smFinish(stick) {
            const src = smMake();
            if (!src) { showMsg(smS.shape === 'free' ? '✂️ 오리고 싶은 모양을 먼저 그려 주세요.' : '스티커를 만들지 못했어요.'); return; }
            try {
                await smLoad();
                if (smS.list.length >= SM_MAX) { if (!stick) { showMsg(`내 스티커는 ${SM_MAX}개까지 저장돼요.<br>안 쓰는 스티커를 지워 주세요.`); return; } }
                else { smS.list.unshift({ id: Date.now().toString(36), src, t: smS.mode === 'text' ? smS.text : '' }); await smSave(); }
            } catch (e) { if (!stick) { showMsg('⚠ 내 스티커를 저장하지 못했어요. 잠시 후 다시 해 주세요.'); return; } }
            if (stick) { smStick(src); return; }
            closeStickerMaker();
            showMsg('✂️ 내 스티커에 저장했어요!<br><span style="font-size:12px;color:#777;">빈 곳을 눌러 🎨 스티커 → ✂️ 내 스티커에서 붙일 수 있어요.</span>');
        }
        function smStick(src) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">스티커는 ✂️ 내 스티커에 저장돼 있어요.</span>'); return; }
            if (!addImage(src)) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = '110px';
            closeStickerMaker();
            if (typeof closeModal === 'function') closeModal('stickerModal');
        }

        /* ---------- 내 스티커 (✏️ 스티커 창 → ✂️ 내 스티커) ---------- */
        function smGrid() {
            const L = smS.list || [];
            if (!L.length) return '<div class="smk-empty">✂️ 아직 만든 스티커가 없어요.<br>하단메뉴 ✨ 스티커에서 만들어 보세요!</div>';
            return L.map((s, i) => `<span class="smk-it"><button type="button" onclick="smUse(${i})"><img src="${s.src}" alt="${s.t || '내 스티커'}"></button><i onclick="smDel(${i})" title="지우기">✕</i></span>`).join('');
        }
        function smUse(i) { const s = smS.list && smS.list[i]; if (s) smStick(s.src); }
        async function smDel(i) {
            if (!(await showMsg('이 스티커를 내 스티커에서 지울까요?<br><span style="font-size:12px;color:#777;">이미 일기에 붙인 스티커는 그대로 남아요.</span>', true))) return;
            smS.list.splice(i, 1);
            try { await smSave(); } catch (e) {}
            const g = smq('stickerGrid'); if (g && g.dataset.mine) loadMyStickers();
        }
        async function loadMyStickers(btn) {
            if (btn) { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
            const g = smq('stickerGrid'); g.dataset.mine = '1';
            g.innerHTML = '<div class="smk-empty">불러오는 중…</div>';
            await smLoad();
            g.innerHTML = `<div class="smk-mine smk-in-modal">${smGrid()}</div>`;
        }

        /* 하단메뉴 ✨ 스티커 창의 세 버튼 (사진 고르는 창은 눌렀을 때 바로 열려야 해서 화면을 먼저 만들어 둬요) */
        function smOpenCam() { smBuild(); smq('smCam').click(); }
        function smOpenFile() { smBuild(); smq('smFile').click(); }
        function smOpenText() { smBuild(); smStartText(); }
        function smShow() {
            smBuild();
            smq('smRoom').classList.add('show'); smq('smRoom').scrollTop = 0;
            document.body.classList.add('fc-lock');
        }
        function closeStickerMaker() {
            const r = smq('smRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        /* 스티커 창의 다른 칸을 누르면 '내 스티커' 표시 지우기 */
        document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.cat-btn'); if (b && !b.classList.contains('sm-cat')) { const g = smq('stickerGrid'); if (g) delete g.dataset.mine; } }, true);
        window.smOpenCam = smOpenCam; window.smOpenFile = smOpenFile; window.smOpenText = smOpenText; window.smTextNext = smTextNext; window.smTextPrev = smTextPrev;
        window.loadMyStickers = loadMyStickers;
