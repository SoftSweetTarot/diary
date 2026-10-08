/* 말랑달콤 다이어리 - js/stickermaker.js
   ✂️ 스티커 만들기 : 내 사진이나 글씨로 하얀 테두리 '다이컷 스티커'를 만들어요 (하단메뉴 ✨ 스티커 → ✂️ 스티커만들기 → 📷 사진찍기 · 🖼️ 사진고르기 · 🔤 글씨 스티커)
   - 🖼 사진고르기로 여러 장(최대 SM_MANY)을 고르면 : 위쪽 사진 줄에서 한 장씩 골라 모양 · 자리 · 크기를 따로 맞춰요 (🔁 버튼 = 지금 모양 · 크기를 모든 사진에)
     📌 붙이기 → 🏷️ 씰 내스티커에 '한 칸'으로 저장 → 한 장의 하얀 종이에 씰이 여러 개 붙어 페이지 가운데 나와요 (js/stickerpeel.js)
     여러 장 한 칸 : { id, src : 종이 미리보기, ss : [스티커 그림들], k } → 누르면 종이째 다시 나와요 (11장부터는 알림 후 앞의 SM_MANY장만)
     🧩 · 🏷️ 만들기 → 모두 그 종류 내스티커에 저장 · 📄 모조지는 고른 사진들이 모조지 한 장에 나란히 인쇄돼요 (js/papermaker.js)
   - 사진 스티커 : 📷 찍기 · 🖼 고르기(한 장) → 모양(🖼 원본 그대로 · 동그라미 · 하트 · 별 · 둥근네모 · 구름) 또는 ✂️ 손으로 오리기 → 끌어서 자리 · 크기 조절
     결과 버튼 : 🏷️ 씰스티커로 다이어리에 붙이기 (씰로 저장 → 하얀 종이에서 떼어 원하는 곳에 · js/stickerpeel.js)
               🧩 조각스티커로 다이어리에 붙이기 (조각 봉투로 저장 → 봉투를 뜯어 원하는 곳에 · js/piecebag.js)
               📄 모조지스티커로 다이어리에 붙이기 (모조지 한 장으로 저장 → 가운데 나온 모조지에서 오려 원하는 곳에 · js/papermaker.js)
                 🧩 조각스티커 만들기 · 🏷️ 씰스티커 만들기 (하얀 테두리를 둘러 그 종류 내스티커에 저장) · 📄 모조지스티커 만들기 (모조지 한 장으로 저장)
   - 글씨 스티커 : 1단계 글자 쓰기 → (다음 단계) 2단계 글꼴 · 색 · 하얀 테두리 고르고 붙이기 · 💾 저장만 → 🧩 내스티커
   - 내스티커 : ✨ 스티커 창 → 종류 → 내스티커 에서 언제든 다시 붙여요 (모든 종류 합쳐 최대 40개)
     한 칸 : { id, src, t, k } · k = 'seal' 씰 · 'piece' 조각(👜 내 봉투 : 봉투 하나 · 누르면 늘 새 봉투로 나와서 뜯으면 조각이 쏟아져요 js/piecebag.js) · 'paper' 모조지(src = 모조지 한 장 · 누르면 늘 새 종이로 가운데 나와요 js/papermaker.js) · 없으면 사진 · 글씨 스티커(🧩 내스티커)
     저장 위치 : 내 드라이브 말랑달콤 / 다이어리 / 내스티커.json (게스트는 이 기기에만)
   ※ 사진은 이 기기에서만 오려서, 완성한 스티커 그림만 저장돼요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (세 버튼만 '준비 중') */

        const SM_FILE = '내스티커.json', SM_LOCAL = 'malang_my_stickers', SM_MAX = 40, SM_SIZE = 300, SM_OUT = 260, SM_MANY = 10;
        const SM_SHAPES = [['orig', '🖼️ 원본 그대로'], ['circle', '동그라미'], ['heart', '하트'], ['star', '별'], ['round', '둥근네모'], ['cloud', '구름'], ['free', '✂️ 손으로']];
        const SM_DEF_FONT = "'Jua', sans-serif";                      // 처음 글꼴 (고르는 목록은 설정창과 같은 fontList · js/app.js)
        const SM_COLORS = ['#ff6b8b', '#ff9f43', '#ffd23f', '#4caf7a', '#3d9be0', '#8a6be0', '#5a3d4a', '#ffffff'];
        const smS = { built: false, mode: 'photo', img: null, shape: 'circle', zoom: 1, ox: 0, oy: 0, path: [], drawing: false, border: true,
            text: '', step: 1, font: SM_DEF_FONT, color: SM_COLORS[0], list: null, fileId: null, loading: null, out: '', outDie: '', die: false,
            many: null, cur: 0 };                                       // many : 여러 장 [{ img, shape, zoom, ox, oy, path }] · cur : 지금 고친 사진
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
                const ok = u => /^data:image\/(png|webp|jpeg)/.test(u || '');
                smS.list = arr.filter(x => x && ok(x.src) && (!x.ss || (Array.isArray(x.ss) && x.ss.length && x.ss.every(ok))));
                smS.loading = null;
                return smS.list;
            })();
            return smS.loading;
        }
        /* 저장은 한 번에 하나씩 : 저장 중에 또 바뀌면 끝난 뒤 '마지막 목록'만 한 번 더 올려요 (✕를 빨리 여러 번 눌러도 업로드가 쌓이지 않아요) */
        let smQ = null, smDirty = false;
        async function smSave() {
            smDirty = true;
            while (smQ) await smQ.catch(() => {});
            if (!smDirty) return;
            smDirty = false;
            smQ = smWrite();
            try { await smQ; } catch (e) { smDirty = true; throw e; } finally { smQ = null; }
        }
        async function smWrite() {
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
                <input type="file" id="smFile" accept="image/*" multiple hidden onchange="smPickFile(this)">
                <section id="smStep2" class="smk-step">
                  <div class="smk-strip" id="smStrip" hidden></div>
                  <div class="smk-stage"><canvas id="smCanvas" width="${SM_SIZE}" height="${SM_SIZE}"></canvas></div>
                  <p class="smk-hint" id="smHint"></p>
                  <div id="smPhotoOpts">
                    <div class="smk-chips" id="smShapes">${SM_SHAPES.map(s => `<button type="button" data-s="${s[0]}" onclick="smSetShape('${s[0]}')">${s[1]}</button>`).join('')}</div>
                    <label class="smk-zoom">🔍 <input type="range" id="smZoom" min="0.4" max="3" step="0.02" value="1" oninput="smS.zoom=+this.value;smDraw()"></label>
                    <button type="button" class="smk-all" id="smAll" hidden onclick="smAllSame()">🔁 이 모양 · 크기를 모든 사진에</button>
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
                    <div id="smPhotoGo" class="smk-col">
                      <div class="smk-three smk-sticks">
                        <button type="button" class="smk-go" onclick="smFinish('pstick',this)">🧩<br>조각스티커로<br>다이어리에 붙이기</button>
                        <button type="button" class="smk-go" onclick="smFinish('stick',this)">🏷️<br>씰스티커로<br>다이어리에 붙이기</button>
                        <button type="button" class="smk-go" onclick="smFinish('pastick',this)">📄<br>모조지스티커로<br>다이어리에 붙이기</button>
                      </div>
                      <div class="smk-three">
                        <button type="button" class="smk-go smk-sub" onclick="smFinish('piece',this)">🧩<br>조각스티커<br>만들기</button>
                        <button type="button" class="smk-go smk-sub" onclick="smFinish('seal',this)">🏷️<br>씰스티커<br>만들기</button>
                        <button type="button" class="smk-go smk-sub" onclick="smFinish('paper',this)">📄<br>모조지스티커<br>만들기</button>
                      </div>
                    </div>
                    <div id="smTextGo" class="smk-col">
                      <button type="button" class="smk-go" onclick="smFinish('text',this)">📌 다이어리에 붙이기</button>
                      <button type="button" class="smk-go smk-sub" onclick="smFinish('keep',this)">💾 내 스티커에 저장만</button>
                    </div>
                    <button type="button" class="smk-go smk-sub" id="smTextBack" onclick="smTextPrev()" hidden>◀ 이전 단계</button>
                  </div>
                </section>
              </div>`;
            document.body.appendChild(el);
            /* 📱 글을 쓰는 중에 버튼을 누르면 입력칸이 포커스를 잃으면서 키보드가 접히고 화면이 움직여서(아이패드) 누른 버튼 밑의 버튼이 눌렸어요
               → 버튼을 눌러도 입력칸이 포커스를 그대로 가지게 해서 화면이 안 움직이게 해요 (눌림 자체는 그대로 동작) */
            el.addEventListener('mousedown', e => { if (e.target.closest && e.target.closest('button')) e.preventDefault(); });
            const cv = smq('smCanvas');
            cv.addEventListener('pointerdown', smDown); cv.addEventListener('pointermove', smMove);
            cv.addEventListener('pointerup', smUp); cv.addEventListener('pointercancel', smUp);
            cv.addEventListener('wheel', e => { if (smS.mode !== 'photo') return; e.preventDefault(); smS.zoom = Math.max(.4, Math.min(3, smS.zoom * (e.deltaY < 0 ? 1.06 : .94))); smq('smZoom').value = smS.zoom; smDraw(); }, { passive: false });
        }

        /* ---------- 사진 ---------- */
        function smPickFile(inp) {
            const fs = [...(inp.files || [])].filter(f => /^image\//.test(f.type)); inp.value = '';
            if (fs.length > 1) return smPickMany(fs);
            const f = fs[0];
            if (!f) return;
            const im = new Image();
            im.onload = () => {
                const c = document.createElement('canvas'), k = Math.min(1, 1000 / Math.max(im.width, im.height));
                c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
                c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src);
                smS.mode = 'photo'; smS.img = c; smS.zoom = 1; smS.ox = 0; smS.oy = 0; smS.path = []; smS.many = null;
                smq('smZoom').value = 1; smS.step = 1; smPhase();
                smShow(); smSetShape(smS.shape === 'free' ? 'circle' : smS.shape);
            };
            im.onerror = () => showMsg('사진을 열지 못했어요. 다른 사진을 골라 주세요.');
            im.src = URL.createObjectURL(f);
        }
        /* 여러 장 : 스티커 만들기 창에서 사진 줄로 한 장씩 골라 고쳐요 */
        const smImg = f => new Promise(ok => {
            const im = new Image();
            im.onload = () => {
                const c = document.createElement('canvas'), k = Math.min(1, 1000 / Math.max(im.width, im.height));
                c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
                c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); ok(c);
            };
            im.onerror = () => { URL.revokeObjectURL(im.src); ok(null); };
            im.src = URL.createObjectURL(f);
        });
        async function smPickMany(fs) {
            if (fs.length > SM_MANY) showMsg(`사진은 한 번에 <b>${SM_MANY}장까지</b> 고를 수 있어요.<br><span style="font-size:12px;color:#777;">고른 ${fs.length}장 중 앞의 ${SM_MANY}장만 가져올게요.</span>`);
            const imgs = (await Promise.all(fs.slice(0, SM_MANY).map(smImg))).filter(Boolean);
            if (!imgs.length) { showMsg('사진을 열지 못했어요. 다른 사진을 골라 주세요.'); return; }
            const shape = smS.shape === 'free' ? 'circle' : smS.shape;
            smS.many = imgs.map(img => ({ img, shape, zoom: 1, ox: 0, oy: 0, path: [] })); smS.cur = 0;
            smS.mode = 'photo'; smS.step = 1; smPhase();
            smShow(); smGo(0);
            smStripDraw();
        }
        /* 사진 줄 그리기 · 사진 바꾸기 (지금 사진의 모양 · 자리 · 크기는 그 사진에 남아요) */
        function smStripDraw() {
            const el = smq('smStrip'); if (!el || !smS.many) return;
            el.innerHTML = smS.many.map((m, i) => `<button type="button" class="${i === smS.cur ? 'on' : ''}" onclick="smGo(${i})" aria-label="${i + 1}번째 사진"><img src="${m.th || (m.th = smThumb(m.img))}" alt=""><span>${i + 1}</span></button>`).join('');
        }
        function smThumb(img) { const c = document.createElement('canvas'), k = 112 / Math.min(img.width, img.height); c.width = c.height = 112; c.getContext('2d').drawImage(img, (112 - img.width * k) / 2, (112 - img.height * k) / 2, img.width * k, img.height * k); return c.toDataURL('image/jpeg', .8); }
        function smKeep() { const m = smS.many && smS.many[smS.cur]; if (m) Object.assign(m, { shape: smS.shape, zoom: smS.zoom, ox: smS.ox, oy: smS.oy, path: smS.path }); }
        function smLoadPhoto(i) {
            const m = smS.many[i]; smS.cur = i;
            Object.assign(smS, { img: m.img, shape: m.shape, zoom: m.zoom, ox: m.ox, oy: m.oy, path: m.path });
        }
        function smGo(i) {
            if (!smS.many) return;
            smKeep(); smLoadPhoto(i);
            smq('smZoom').value = smS.zoom;
            document.querySelectorAll('#smShapes button').forEach(b => b.classList.toggle('on', b.dataset.s === smS.shape));
            smq('smHint').textContent = smS.shape === 'free' ? '✂️ 손가락(마우스)으로 오리고 싶은 모양을 한 번에 빙 둘러 그려요' : `${i + 1}번째 사진 · 위 줄에서 다른 사진을 골라 따로 맞출 수 있어요`;
            smDraw(); smStripDraw();
        }
        function smAllSame() {
            if (!smS.many) return;
            if (smS.shape === 'free') { showMsg('✂️ 손으로 오리기는 사진마다 따로 그려 주세요.'); return; }
            smKeep(); smS.many.forEach(m => { m.shape = smS.shape; m.zoom = smS.zoom; m.path = []; });
            showMsg(`🔁 ${smS.many.length}장 모두 같은 모양 · 크기로 맞췄어요.<br><span style="font-size:12px;color:#777;">자리는 사진마다 그대로예요.</span>`);
        }
        /* 여러 장 완성 : 'stick' 씰로 붙이기(한 장 종이) · 'pstick' 조각으로 붙이기(봉투 하나) · 'pastick' 모조지로 붙이기(모조지 한 장) · 'piece' · 'seal' · 'paper' 만들기 */
        async function smManyFinish(act) {
            smKeep();
            const back = smS.cur, k = SM_STICK[act] || act;
            let out = [];
            for (let i = 0; i < smS.many.length; i++) {
                smLoadPhoto(i); smS.out = ''; smS.outDie = '';
                const src = smMake(k === 'paper' ? smS.border : true);
                if (!src) { smGo(i); showMsg(`✂️ ${i + 1}번째 사진의 모양을 먼저 그려 주세요.`); return; }
                out.push(src);
            }
            smLoadPhoto(back); smS.out = ''; smS.outDie = '';
            if (k === 'paper') out = await smPaperSheet(out); if (!out) return;
            const r = await smAdd(out, k);
            if (SM_STICK[act]) return smStickAs(k, out, r);
            if (r === 'ok') closeStickerMaker();
            smAddMsg(r, k, false);
        }
        function smSetShape(s) {
            smS.shape = s; smS.path = [];
            document.querySelectorAll('#smShapes button').forEach(b => b.classList.toggle('on', b.dataset.s === s));
            smq('smHint').textContent = s === 'free' ? '✂️ 손가락(마우스)으로 오리고 싶은 모양을 한 번에 빙 둘러 그려요' : s === 'orig' ? '🖼️ 사진 모양 그대로 스티커가 돼요 · 🔍 막대로 크기를 바꿔요' : '사진을 끌어서 자리를 맞추고, 🔍 막대로 크기를 바꿔요';
            smDraw();
        }
        /* 모양 길 (가운데 기준, 반지름 r) */
        function smShapePath(ctx, s, cx, cy, r) {
            ctx.beginPath();
            if (s === 'circle') ctx.arc(cx, cy, r, 0, Math.PI * 2);
            else if (s === 'heart') { ctx.moveTo(cx, cy + r * .9); ctx.bezierCurveTo(cx - r * 1.35, cy + r * .05, cx - r * .95, cy - r * 1.05, cx, cy - r * .42); ctx.bezierCurveTo(cx + r * .95, cy - r * 1.05, cx + r * 1.35, cy + r * .05, cx, cy + r * .9); }
            else if (s === 'star') { for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * .5 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr); } }
            else if (s === 'round') { const w = r * 1.7, h = r * 1.7, x = cx - w / 2, y = cy - h / 2, q = r * .35; ctx.moveTo(x + q, y); ctx.arcTo(x + w, y, x + w, y + h, q); ctx.arcTo(x + w, y + h, x, y + h, q); ctx.arcTo(x, y + h, x, y, q); ctx.arcTo(x, y, x + w, y, q); }
            else if (s === 'orig') { const R = smPhotoRect(), q = Math.min(10, R.w / 4, R.h / 4); ctx.moveTo(R.x + q, R.y); ctx.arcTo(R.x + R.w, R.y, R.x + R.w, R.y + R.h, q); ctx.arcTo(R.x + R.w, R.y + R.h, R.x, R.y + R.h, q); ctx.arcTo(R.x, R.y + R.h, R.x, R.y, q); ctx.arcTo(R.x, R.y, R.x + R.w, R.y, q); }   // 🖼 원본 그대로 : 사진 네모 (모서리만 살짝 둥글게)
            else if (s === 'cloud') { [[-.5, .15, .45], [0, -.2, .58], [.5, .1, .48], [-.15, .35, .5], [.3, .38, .45]].forEach(([a, b, c]) => { ctx.moveTo(cx + a * r + c * r, cy + b * r); ctx.arc(cx + a * r, cy + b * r, c * r, 0, Math.PI * 2); }); }
            ctx.closePath();
        }
        function smFreePath(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
        function smPhotoRect() {
            const im = smS.img, base = smS.shape === 'orig' ? SM_SIZE * .86 / Math.max(im.width, im.height) : SM_SIZE / Math.min(im.width, im.height), k = base * smS.zoom;   // 원본 그대로는 사진 전체가 보이게
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
            if (smS.border || smS.die) {                                    // 🏷️ 씰 · 🧩 조각은 하얀 칼선이 늘 있어요 (그림자 없이 · 떼는 화면이 그림자를 그려요)
                ctx.save(); clip(); ctx.lineJoin = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = '#fff';
                if (!smS.die) { ctx.shadowColor = 'rgba(0,0,0,.22)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 3; }
                ctx.stroke(); ctx.fillStyle = '#fff'; ctx.fill(); ctx.restore();
            }
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
        function smDraw() { const cv = smq('smCanvas'); if (cv) smRender(cv.getContext('2d'), true); smS.out = ''; smS.outDie = ''; }

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
            smShow(); smSetFont(smS.font); smSetColor(smS.color);
            if (window.matchMedia && matchMedia('(pointer: fine)').matches) setTimeout(() => smq('smText').focus(), 50);   // 📱 터치 기기는 키보드가 저절로 올라와 화면이 움직이지 않게 직접 눌러서 써요
        }
        /* 글씨 스티커는 두 단계 : 1) 글만 쓰기 → 2) 글꼴 · 색 · 테두리 고르고 붙이기 (사진 스티커는 한 화면 그대로) */
        function smPhase() {
            const t = smS.mode === 'text', one = t && smS.step === 1;
            smq('smPhotoOpts').hidden = t;
            smq('smTextA').hidden = !one;
            smq('smTextB').hidden = !t || one;
            smq('smFinal').hidden = one;
            smq('smPhotoGo').hidden = t; smq('smTextGo').hidden = !t;
            const many = !t && !!smS.many;                            // 여러 장 : 사진 줄 · 🔁 버튼이 보여요
            smq('smStrip').hidden = !many; smq('smAll').hidden = !many;
            smq('smTextBack').hidden = !t || one;
            if (t) smq('smHint').textContent = one ? '✏️ 스티커에 쓸 글자를 써요' : '글꼴 · 색 · 테두리를 골라요';
        }
        function smTextNext() {
            if (!(smS.text || '').trim()) { showMsg('스티커에 쓸 글씨를 먼저 써 주세요.'); return; }
            if (!smS.fontsBuilt) { smS.fontsBuilt = true; smFillFonts(); smSetFont(smS.font); }   // 글꼴 목록은 2단계에 들어갈 때 만들어요 (처음 화면이 가볍게)
            smS.step = 2; smPhase(); smq('smText').blur(); smq('smRoom').scrollTop = 0;
        }
        function smTextPrev() { smS.step = 1; smPhase(); smq('smRoom').scrollTop = 0; if (window.matchMedia && matchMedia('(pointer: fine)').matches) setTimeout(() => smq('smText').focus(), 50); }
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
        function smMake(die) {                                         // 투명 바탕 PNG · 빈 곳은 잘라내기 (die : 🏷️ · 🧩 하얀 칼선을 늘 둘러요)
            const key = die ? 'outDie' : 'out';
            if (smS[key]) return smS[key];
            if (smS.mode === 'photo' && smS.shape === 'free' && smS.path.length < 9) return '';
            const c = document.createElement('canvas'); c.width = c.height = SM_SIZE;
            const x = c.getContext('2d'); smS.die = !!die; smRender(x, false); smS.die = false;
            const d = x.getImageData(0, 0, SM_SIZE, SM_SIZE).data;
            let x0 = SM_SIZE, y0 = SM_SIZE, x1 = 0, y1 = 0;
            for (let y = 0; y < SM_SIZE; y++) for (let i = 0; i < SM_SIZE; i++) if (d[(y * SM_SIZE + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (y < y0) y0 = y; if (y > y1) y1 = y; }
            if (x1 <= x0 || y1 <= y0) return '';
            const w = x1 - x0 + 1, h = y1 - y0 + 1, k = Math.min(1, SM_OUT / Math.max(w, h));
            const o = document.createElement('canvas'); o.width = Math.round(w * k); o.height = Math.round(h * k);
            o.getContext('2d').drawImage(c, x0, y0, w, h, 0, 0, o.width, o.height);
            return (smS[key] = o.toDataURL('image/png'));
        }
        /* ✨ 스티커 창(하단메뉴) → 목록 창 : 🍭 미니시트(위쪽 🍭 미니시트 · 😀 이모지 두 칸) · 🎁 캡슐스티커 · 🌸 계절 스티커 (🎀 마스킹테이프는 종류 창의 내스티커로)
           목록을 불러오는 코드(loadXxx)는 stickerModal 안의 눈에 안 보이는 카테고리 버튼(.cat-btn)이 불러요 → 그 버튼을 대신 눌러 줘요 */
        const SL_KINDS = { emoji: ['🍭 미니시트', 'em-cat'], caps: ['🎁 캡슐스티커', 'cs-cat'], season: ['🌸 계절 스티커', 'ss-cat'] };
        function openStickerList(kind) {
            if (kind === 'tape') return openStickerKind('tape');
            const k = SL_KINDS[kind]; if (!k) return;
            closeModal('stickerMakeModal');
            openModal('stickerModal');
            const bar = smq('stickerKindTabs'); bar.hidden = true; bar.classList.remove('two');
            const t = document.getElementById('stickerListTitle'); if (t) t.textContent = k[0];
            if (kind === 'emoji' && window.spkTabs) { spkTabs(); spkTab('pack'); return; }   // 🍭 미니시트 · 😀 이모지 두 칸 (js/stickerpack.js)
            const b = document.querySelector('#stickerCategories .' + k[1]); if (b) b.click();
        }
        window.openStickerList = openStickerList;

        /* ✨ 스티커 창 → 🎀 마스킹테이프 · 🧩 조각스티커 · 🏷️ 씰스티커 · 📄 모조지스티커 · 📃 속지 : 목록 창 위에 카테고리 4개, 소스는 그 아래
           지금 있는 것 : 🎀 내스티커(만든 · 받은 테이프) / 🧩 내스티커(👜 내 봉투 · 사진 · 글씨) · 기본스티커(그림 모음 · 계절) / 🏷️ · 📄 내스티커(만든 것)
                          문구점스티커는 모든 종류가 🛍️ 문구점의 그 칸으로 / 나머지는 '준비 중' */
        const STK_KINDS = {
            tape: ['🎀', '마스킹테이프', ['스티커', '마스킹 테이프']],
            piece: ['🧩', '조각스티커', ['스티커', '이미지 스티커팩']],
            seal: ['🏷️', '씰스티커', ['스티커']],
            paper: ['📄', '모조지스티커', ['스티커']],
            leaf: ['📃', '속지', []],
        };
        const STK_TABS = [['mine', '내스티커'], ['share', '공유스티커'], ['free', '기본스티커'], ['shop', '문구점스티커']];
        let stkKind = 'tape';
        function openStickerKind(kind, tab) {
            const k = STK_KINDS[kind]; if (!k) return;
            stkKind = kind;
            closeModal('stickerMakeModal');
            openModal('stickerModal');
            const t = document.getElementById('stickerListTitle'); if (t) t.textContent = k[0] + ' ' + k[1];
            const bar = smq('stickerKindTabs');
            bar.classList.remove('two');
            bar.innerHTML = STK_TABS.map(([v, n]) => `<button type="button" class="stk-tab" data-tab="${v}" onclick="stkTab('${v}')">${n}</button>`).join('');
            bar.hidden = false;
            stkTab(tab || 'mine');
        }
        function stkTab(tab) {
            document.querySelectorAll('#stickerKindTabs .stk-tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
            const g = smq('stickerGrid'), k = STK_KINDS[stkKind];
            delete g.dataset.mine; delete g.dataset.mytape;
            g.scrollTop = 0;
            const go = (ic, name, sub, fn) => `<button type="button" class="stk-go" onclick="${fn}"><span>${ic}</span><b>${name}</b><small>${sub}</small></button>`;
            if (tab === 'mine' && stkKind === 'tape') return loadMyTapes();
            if (tab === 'mine' && stkKind !== 'leaf') return loadMyStickers(stkKind);
            if (tab === 'free' && stkKind === 'piece') {
                const ss = document.getElementById('seasonTab');
                g.innerHTML = go('🧩', '말랑달콤 그림 모음', '카테고리별 조각스티커', "closeModal('stickerModal'); openLibrary()")
                    + (ss && !ss.hidden ? go('🌸', ss.textContent.replace(/^\S+\s*/, ''), '지금 계절 스티커', "openStickerList('season')") : '');
            } else if (tab === 'shop') g.innerHTML = go('🛍️', '문구점에서 ' + k[1] + ' 보기', '새 창으로 열려요', 'stkShop()');
            else g.innerHTML = `<div class="cs-empty">🛠️ ${k[1]} ${STK_TABS.find(x => x[0] === tab)[1]}는 준비 중이에요.<br>조금만 기다려 주세요!</div>`;
        }
        function stkShop() { openShop('#/' + (STK_KINDS[stkKind][2].length ? 'c/' + STK_KINDS[stkKind][2].map(encodeURIComponent).join('/') : '')); }
        window.openStickerKind = openStickerKind; window.stkTab = stkTab; window.stkShop = stkShop;

        /* 💾/📌 버튼을 누르면 '저장하는 중…'으로 바뀌고 끝날 때까지 다시 못 눌러요 (눌렸는지 바로 보이고 두 번 저장도 막음) */
        let smkLock = false;
        async function smkRun(btn, label, fn) {
            if (smkLock) return;
            smkLock = true;
            const all = [...document.querySelectorAll('.smk-room .smk-go')], old = btn ? btn.textContent : '';
            all.forEach(b => { b.disabled = true; });
            if (btn) { btn.classList.add('busy'); btn.textContent = label; }
            try { await fn(); }
            finally { smkLock = false; all.forEach(b => { b.disabled = false; }); if (btn) { btn.classList.remove('busy'); btn.textContent = old; } }
        }
        function smFinish(act, btn) { return smkRun(btn, SM_STICK[act] || act === 'text' ? '📌 붙이는 중…' : '💾 저장하는 중…', () => smDoFinish(act)); }
        /* 내 스티커에 넣기 (📸 포토부스 · 📄 모조지스티커 만들기도 이걸 써요) · src 는 하나 또는 여러 개 [src, …] (자리가 남는 만큼)
           결과 : 'ok' · 'full' (다 못 넣음) · 'fail' */
        async function smAdd(src, k, t) {
            try {
                await smLoad();
                if (smS.list.length >= SM_MAX) return 'full';
                const many = Array.isArray(src) && src.length > 1, one = Array.isArray(src) ? src[0] : src;
                smS.list.unshift(Object.assign({ id: Date.now().toString(36), src: many ? await smSheetPrev(src) : one, t: t || '' }, many ? { ss: src } : {}, k ? { k } : {}));
                await smSave();
                return 'ok';
            } catch (e) { return 'fail'; }
        }
        /* 여러 장 한 칸의 미리보기 : 하얀 종이 위에 스티커들을 나란히 (내스티커 칸에 보여요) */
        async function smSheetPrev(srcs) {
            const ims = await Promise.all(srcs.map(u => new Promise(ok => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ok(null); im.src = u; })));
            const n = ims.length, cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols), C = 76, G = 6, P = 10;
            const c = document.createElement('canvas'); c.width = cols * C + G * (cols - 1) + P * 2; c.height = rows * C + G * (rows - 1) + P * 2;
            const x = c.getContext('2d'), q = 14;
            x.beginPath(); x.moveTo(q, 0); x.arcTo(c.width, 0, c.width, c.height, q); x.arcTo(c.width, c.height, 0, c.height, q); x.arcTo(0, c.height, 0, 0, q); x.arcTo(0, 0, c.width, 0, q);
            x.fillStyle = '#f7f8fc'; x.fill(); x.strokeStyle = '#e6e3ee'; x.lineWidth = 2; x.stroke();
            ims.forEach((im, i) => {
                if (!im) return;
                const k = Math.min(C / im.width, C / im.height), w = im.width * k, h = im.height * k;
                x.drawImage(im, P + (i % cols) * (C + G) + (C - w) / 2, P + Math.floor(i / cols) * (C + G) + (C - h) / 2, w, h);
            });
            return c.toDataURL('image/png');
        }
        const SM_PATH = { '': '🧩 조각스티커 → 내스티커', piece: '🧩 조각스티커 → 내스티커(👜 내 봉투)', seal: '🏷️ 씰스티커 → 내스티커', paper: '📄 모조지스티커 → 내스티커' };
        /* 저장 결과 안내 (stick : 붙이는 중이면 꽉 찼을 때 · 실패만 알려요) */
        function smAddMsg(r, k, stick) {
            if (r === 'full') { if (!stick) showMsg(`내 스티커는 ${SM_MAX}개까지 저장돼요.<br>안 쓰는 스티커를 지워 주세요.`); }
            else if (r === 'fail') showMsg('⚠ 내 스티커를 저장하지 못했어요. 잠시 후 다시 해 주세요.');
            else if (!stick) showMsg(`✂️ 내 스티커에 저장했어요!<br><span style="font-size:12px;color:#777;">하단메뉴 ✨ 스티커 → ${SM_PATH[k || '']}에서 붙일 수 있어요.</span>`);
        }
        /* act : 'stick' 씰로 붙이기 · 'pstick' 조각으로 붙이기 · 'piece' · 'seal' · 'paper' 만들기 / 글씨 스티커는 'text' 붙이기 · 'keep' 저장만 */
        const SM_STICK = { stick: 'seal', pstick: 'piece', pastick: 'paper' };
        /* 📄 모조지 : 오린 그림들 → 모조지 한 장 [src] (js/papermaker.js) */
        async function smPaperSheet(srcs) {
            if (!window.pmMakeSheet) { comingSoon('📄 모조지스티커'); return null; }
            try { return [await pmMakeSheet(srcs)]; } catch (e) { showMsg('모조지스티커를 만들지 못했어요.'); return null; }
        }
        /* 📌 붙이기 : 씰은 하얀 종이째 · 조각은 봉투째 · 모조지는 모조지째 꺼내요 (내스티커에도 저장돼요) */
        function smStickAs(k, srcs, r) {
            smAddMsg(r, k, true); closeStickerMaker();
            if (k === 'piece' && window.openPieceBag) openPieceBag(srcs);
            else if (k === 'paper' && window.openPaperSheet) openPaperSheet(srcs[0]);
            else if (k === 'seal' && window.openStickerPeel) openStickerPeel(srcs.length > 1 ? srcs : srcs[0]);
            else srcs.forEach(smStick);
        }
        async function smDoFinish(act) {
            if (smS.many && smS.mode === 'photo') return smManyFinish(act);
            const k = SM_STICK[act] || (act === 'piece' || act === 'seal' || act === 'paper' ? act : '');
            let src = smMake(k === 'paper' ? smS.border : !!k);
            if (!src) { showMsg(smS.shape === 'free' ? '✂️ 오리고 싶은 모양을 먼저 그려 주세요.' : '스티커를 만들지 못했어요.'); return; }
            if (k === 'paper') { const o = await smPaperSheet([src]); if (!o) return; src = o[0]; }
            const r = await smAdd(src, k, smS.mode === 'text' ? smS.text : '');
            if (SM_STICK[act]) return smStickAs(k, [src], r);
            if (act === 'text') { smAddMsg(r, k, true); smStick(src); return; }
            if (r === 'ok') closeStickerMaker();
            smAddMsg(r, k, false);
        }
        function smStick(src) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">스티커는 ✂️ 내 스티커에 저장돼 있어요.</span>'); return; }
            if (!addImage(src)) return;
            const el = document.querySelector('#canvasArea .element-box:last-child'); if (el) el.style.width = '110px';
            closeStickerMaker();
            if (typeof closeModal === 'function') closeModal('stickerModal');
        }

        /* ---------- 내 스티커 (✨ 스티커 창 → 🧩 조각 · 🏷️ 씰 · 📄 모조지 → 내스티커) ---------- */
        const smKindOf = s => s.k === 'seal' || s.k === 'paper' ? s.k : 'piece';
        const SM_EMPTY = {
            piece: '✂️ 아직 만든 조각스티커가 없어요.<br>📸 포토부스 · 📷 사진찍기 · 🖼️ 사진고르기 결과에서<br>🧩 조각스티커 만들기를 눌러 보세요!',
            seal: '🏷️ 아직 만든 씰스티커가 없어요.<br>📸 포토부스 · 📷 사진찍기 · 🖼️ 사진고르기 결과에서<br>🏷️ 씰스티커 만들기나 📌 다이어리에 붙이기를 눌러 보세요!',
            paper: '📄 아직 만든 모조지스티커가 없어요.<br>📸 포토부스 · 📷 사진찍기 · 🖼️ 사진고르기 결과에서<br>📄 모조지스티커 만들기나 다이어리에 붙이기를 눌러 보세요!' };
        function smGrid(kind) {
            const L = (smS.list || []).map((s, i) => [s, i]).filter(([s]) => smKindOf(s) === kind);
            const it = ([s, i]) => s.k === 'piece'
                ? `<span class="smk-it smk-bag"><button type="button" onclick="smUse(${i})" aria-label="조각스티커 봉투"><img src="${s.src}" alt=""></button><b class="smk-n">${s.ss ? s.ss.length : 1}pcs</b><i onclick="smDel(${i})" title="지우기">✕</i></span>`
                : `<span class="smk-it"><button type="button" onclick="smUse(${i})"><img src="${s.src}" alt="${s.t || '내 스티커'}"></button>${s.ss ? `<b class="smk-n">${s.ss.length}장</b>` : ''}<i onclick="smDel(${i})" title="지우기">✕</i></span>`;
            if (kind === 'piece') {                                     // 🧩 내가 만든 조각은 👜 내 봉투에 (봉투 하나 = 한 칸 · 처음엔 안 뜯은 봉투)
                const bag = L.filter(([s]) => s.k === 'piece'), rest = L.filter(([s]) => !s.k);
                if (!L.length) return `<div class="smk-empty">${SM_EMPTY.piece}</div>`;
                return (bag.length ? '<div class="stk-head">👜 내 봉투</div>' + bag.map(it).join('') : '')
                    + (rest.length ? '<div class="stk-head">✂️ 사진 · 글씨 스티커</div>' + rest.map(it).join('') : '');
            }
            if (!L.length) return `<div class="smk-empty">${SM_EMPTY[kind]}</div>`;
            return L.map(it).join('');
        }
        function smUse(i) {
            const s = smS.list && smS.list[i]; if (!s) return;
            if (s.k === 'seal' && window.openStickerPeel) { closeModal('stickerModal'); openStickerPeel(s.ss || s.src); }   // 여러 장 한 칸은 종이째
            else if (s.k === 'piece' && window.openPieceBag) {               // 🧩 봉투 : 늘 새 봉투로 나와요 (뜯어서 꺼내요)
                closeModal('stickerModal');
                openPieceBag(s.ss || [s.src]);
            } else if (s.k === 'paper' && window.openPaperSheet) { closeModal('stickerModal'); openPaperSheet(s.src); }   // 📄 모조지 : 늘 새 종이로 가운데 나와요 (오려서 붙여요)
            else (s.ss || [s.src]).forEach(smStick);
        }
        async function smDel(i) {
            if (!(await showMsg('이 스티커를 내 스티커에서 지울까요?<br><span style="font-size:12px;color:#777;">이미 일기에 붙인 스티커는 그대로 남아요.</span>', true))) return;
            smS.list.splice(i, 1);
            const g = smq('stickerGrid'); if (g && g.dataset.mine) loadMyStickers(g.dataset.mine);   // 바로 사라지고, 저장은 뒤에서 (드라이브 업로드를 기다리지 않아요)
            smSave().catch(() => showMsg('⚠ 지운 것을 드라이브에 저장하지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인한 뒤 다시 지워 주세요.</span>'));
        }
        async function loadMyStickers(kind) {
            const g = smq('stickerGrid'); g.dataset.mine = kind;
            g.innerHTML = '<div class="smk-empty">불러오는 중…</div>';
            await smLoad();
            if (g.dataset.mine === kind) g.innerHTML = `<div class="smk-mine smk-in-modal">${smGrid(kind)}</div>`;
        }

        /* ✂️ 스티커만들기 창의 📷 · 🖼️ · 🔤 버튼 (사진 고르는 창은 눌렀을 때 바로 열려야 해서 화면을 먼저 만들어 둬요) */
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
        document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('.cat-btn'); if (b) { const g = smq('stickerGrid'); if (g) delete g.dataset.mine; } }, true);
        window.smGo = smGo; window.smAllSame = smAllSame; window.smOpenCam = smOpenCam; window.smOpenFile = smOpenFile; window.smOpenText = smOpenText; window.smTextNext = smTextNext; window.smTextPrev = smTextPrev;
        window.loadMyStickers = loadMyStickers; window.smAdd = smAdd; window.smAddMsg = smAddMsg;
