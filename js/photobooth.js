/* 말랑달콤 다이어리 - js/photobooth.js
   📸 말랑 포토부스 : 네컷 사진처럼 찍고 꾸며서 다이어리에 붙여요 (카페 → 만들기·꾸미기 → 📸 포토부스)
   1) 틀 고르기 : 네컷(세로) · 2×2 · 한 컷 + 프레임 색
   2) 찍기 : 카메라로 3 · 2 · 1 찰칵! (앞 카메라는 거울처럼) · 또는 갤러리의 사진 고르기
   3) 꾸미기 : 필터(뽀샤시 · 흑백 · 빈티지 · 쿨톤) · 아래 글씨 · 반짝이 꾸밈
   4) 📌 다이어리에 붙이기 · 💾 내 기기에 저장
   - 사진은 이 기기에서만 합쳐서, 다 만든 한 장만 일기에 담겨요 (카메라 영상은 어디에도 보내지 않아요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (포토부스만 '준비 중') */

        const PB_LAYOUTS = {
            strip: { name: '네컷', n: 4, w: 400, slot: [360, 270], cols: 1, gap: 14, pad: 20, foot: 92 },
            grid: { name: '2×2', n: 4, w: 600, slot: [270, 300], cols: 2, gap: 14, pad: 22, foot: 80 },
            one: { name: '한 컷', n: 1, w: 500, slot: [456, 456], cols: 1, gap: 0, pad: 22, foot: 96 }
        };
        const PB_FRAMES = [
            ['pink', '#ffc2d4', '#ff6b8b'], ['sky', '#bfe3ff', '#3d8fd6'], ['mint', '#c6f2df', '#2f9a6a'], ['lav', '#e3d6ff', '#7a5ad0'],
            ['black', '#2b2b2b', '#ffffff'], ['white', '#ffffff', '#5a3d4a'], ['check', '#ffe0ea', '#ff6b8b'], ['star', '#3d4f8f', '#ffe680']
        ];
        const PB_FILTERS = [['none', '기본'], ['soft', '뽀샤시'], ['bw', '흑백'], ['vintage', '빈티지'], ['cool', '쿨톤']];
        const pb = { built: false, layout: 'strip', frame: 'pink', filter: 'soft', text: '', deco: true, shots: [], stream: null, facing: 'user', busy: false, out: '' };
        const pbq = id => document.getElementById(id);

        /* ---------- 화면 ---------- */
        function pbBuild() {
            if (pb.built) return;
            pb.built = true;
            const el = document.createElement('div');
            el.id = 'boothRoom'; el.className = 'pb-room';
            el.innerHTML = `
              <div class="pb-bar"><button class="pb-x pb-back" type="button" id="pbBack" onclick="pbBackStep()" aria-label="앞으로" hidden>←</button><span class="pb-sp" id="pbSp"></span><b>📸 말랑 포토부스</b><button class="pb-x" type="button" onclick="closeBooth()" aria-label="닫기">✕</button></div>
              <div class="pb-wrap">
                <section id="pbStep1" class="pb-step">
                  <p class="pb-lead">어떤 틀로 찍을까요?</p>
                  <div class="pb-layouts" id="pbLayouts">${Object.keys(PB_LAYOUTS).map(k => `<button type="button" data-l="${k}" onclick="pbSetLayout('${k}')"><span class="pb-lay pb-lay-${k}">${'<i></i>'.repeat(PB_LAYOUTS[k].n)}</span><small>${PB_LAYOUTS[k].name}</small></button>`).join('')}</div>
                  <p class="pb-lead">프레임 색</p>
                  <div class="pb-frames" id="pbFrames">${PB_FRAMES.map(f => `<button type="button" data-f="${f[0]}" onclick="pbSetFrame('${f[0]}')" style="--a:${f[1]};--b:${f[2]}" class="pb-fr-${f[0]}"></button>`).join('')}</div>
                  <button type="button" class="pb-go" onclick="pbStartCamera()">📷 카메라로 찍기</button>
                  <button type="button" class="pb-go pb-sub" onclick="pbq('pbFiles').click()">🖼️ 갤러리에서 사진 고르기</button>
                  <input type="file" id="pbFiles" accept="image/*" multiple hidden onchange="pbPickFiles(this.files)">
                  <p class="pb-note">💡 카메라 영상은 이 기기에서만 쓰여요. 다 만든 사진 한 장만 일기에 담겨요.</p>
                </section>
                <section id="pbStep2" class="pb-step" hidden>
                  <div class="pb-cam"><video id="pbVideo" playsinline muted autoplay></video><div class="pb-count" id="pbCount"></div><div class="pb-flash" id="pbFlash"></div><div class="pb-num" id="pbNum"></div></div>
                  <div class="pb-thumbs" id="pbThumbs"></div>
                  <div class="pb-cam-btns"><button type="button" class="pb-flip" onclick="pbFlip()" aria-label="카메라 바꾸기">🔄</button><button type="button" class="pb-shoot" id="pbShoot" onclick="pbShootAll()">찰칵!</button><span class="pb-flip-sp"></span></div>
                  <p class="pb-note" id="pbCamNote">찰칵을 누르면 3초씩 세고 차례로 찍어요</p>
                </section>
                <section id="pbStep3" class="pb-step" hidden>
                  <div class="pb-preview"><canvas id="pbCanvas"></canvas></div>
                  <div class="pb-row"><small>필터</small><div class="pb-chips" id="pbFilters">${PB_FILTERS.map(f => `<button type="button" data-v="${f[0]}" onclick="pbSetFilter('${f[0]}')">${f[1]}</button>`).join('')}</div></div>
                  <div class="pb-row"><small>글씨</small><input id="pbText" maxlength="18" placeholder="아래에 쓸 말 (예: 우리의 하루 💕)" oninput="pb.text=this.value;pbCompose()"></div>
                  <label class="pb-deco"><input type="checkbox" id="pbDeco" checked onchange="pb.deco=this.checked;pbCompose()"> ✨ 반짝이 꾸밈</label>
                  <button type="button" class="pb-go" onclick="pbStick()">📌 다이어리에 붙이기</button>
                  <div class="pb-two"><button type="button" class="pb-go pb-sub" onclick="pbSave()">💾 내 기기에 저장</button><button type="button" class="pb-go pb-sub" onclick="pbRetake()">🔄 다시 찍기</button></div>
                </section>
              </div>`;
            document.body.appendChild(el);
        }
        function pbStep(n) {
            [1, 2, 3].forEach(i => { pbq('pbStep' + i).hidden = i !== n; });
            pbq('pbBack').hidden = n === 1; pbq('pbSp').hidden = n !== 1;
            if (n !== 2) pbStopCamera();
            pbq('boothRoom').scrollTop = 0;
        }
        function pbBackStep() { if (!pbq('pbStep3').hidden || !pbq('pbStep2').hidden) { pb.shots = []; pbStep(1); } }
        function pbSetLayout(k) { pb.layout = k; document.querySelectorAll('#pbLayouts button').forEach(b => b.classList.toggle('on', b.dataset.l === k)); }
        function pbSetFrame(k) { pb.frame = k; document.querySelectorAll('#pbFrames button').forEach(b => b.classList.toggle('on', b.dataset.f === k)); if (!pbq('pbStep3').hidden) pbCompose(); }
        function pbSetFilter(k) { pb.filter = k; document.querySelectorAll('#pbFilters button').forEach(b => b.classList.toggle('on', b.dataset.v === k)); pbCompose(); }

        /* ---------- 카메라 ---------- */
        async function pbStartCamera() {
            pb.shots = []; pbRenderThumbs();
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { showMsg('이 브라우저에서는 카메라를 쓸 수 없어요.<br>🖼️ 갤러리에서 사진 고르기를 눌러 주세요.'); return; }
            pbStep(2);
            try {
                pb.stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: pb.facing, width: { ideal: 1280 }, height: { ideal: 960 } }, audio: false });
                const v = pbq('pbVideo'); v.srcObject = pb.stream; v.classList.toggle('mirror', pb.facing === 'user');
                await v.play().catch(() => {});
                pbq('pbCamNote').textContent = PB_LAYOUTS[pb.layout].n > 1 ? `찰칵을 누르면 3초씩 세고 ${PB_LAYOUTS[pb.layout].n}장을 차례로 찍어요` : '찰칵을 누르면 3초 세고 찍어요';
            } catch (e) {
                pbStep(1);
                showMsg('📷 카메라를 열지 못했어요.<br><span style="font-size:12px;color:#777;">브라우저 주소창의 🔒 → 카메라 허용을 확인하거나,<br>🖼️ 갤러리에서 사진 고르기를 써 주세요.</span>');
            }
        }
        function pbStopCamera() { if (pb.stream) { pb.stream.getTracks().forEach(t => t.stop()); pb.stream = null; } const v = pbq('pbVideo'); if (v) v.srcObject = null; }
        async function pbFlip() { pb.facing = pb.facing === 'user' ? 'environment' : 'user'; pbStopCamera(); await pbStartCamera(); }
        const pbWait = ms => new Promise(r => setTimeout(r, ms));
        async function pbShootAll() {
            if (pb.busy || !pb.stream) return;
            pb.busy = true; pbq('pbShoot').disabled = true;
            const L = PB_LAYOUTS[pb.layout];
            pb.shots = []; pbRenderThumbs();
            for (let i = 0; i < L.n && pb.stream; i++) {
                pbq('pbNum').textContent = L.n > 1 ? `${i + 1} / ${L.n}` : '';
                for (let c = 3; c > 0; c--) { pbq('pbCount').textContent = c; pbq('pbCount').classList.remove('tick'); void pbq('pbCount').offsetWidth; pbq('pbCount').classList.add('tick'); await pbWait(800); }
                pbq('pbCount').textContent = '';
                pb.shots.push(pbGrab());
                const f = pbq('pbFlash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on');
                pbRenderThumbs();
                await pbWait(450);
            }
            pbq('pbNum').textContent = '';
            pb.busy = false; pbq('pbShoot').disabled = false;
            if (pb.shots.length === L.n) pbToEdit();
        }
        function pbGrab() {                                   // 지금 화면 → 그림 (앞 카메라는 거울처럼 뒤집어서)
            const v = pbq('pbVideo'), c = document.createElement('canvas');
            const w = v.videoWidth || 640, h = v.videoHeight || 480, k = Math.min(1, 900 / Math.max(w, h));
            c.width = Math.round(w * k); c.height = Math.round(h * k);
            const x = c.getContext('2d');
            if (pb.facing === 'user') { x.translate(c.width, 0); x.scale(-1, 1); }
            x.drawImage(v, 0, 0, c.width, c.height);
            return c;
        }
        function pbRenderThumbs() {
            const L = PB_LAYOUTS[pb.layout], box = pbq('pbThumbs'); box.innerHTML = '';
            for (let i = 0; i < L.n; i++) {
                const s = document.createElement('span');
                if (pb.shots[i]) { const im = new Image(); im.src = pb.shots[i].toDataURL('image/jpeg', .6); s.appendChild(im); } else s.textContent = i + 1;
                box.appendChild(s);
            }
        }
        /* 갤러리 사진 */
        async function pbPickFiles(files) {
            const L = PB_LAYOUTS[pb.layout], list = [...(files || [])].filter(f => /^image\//.test(f.type));
            pbq('pbFiles').value = '';
            if (!list.length) return;
            const load = f => new Promise(res => { const im = new Image(); im.onload = () => { const c = document.createElement('canvas'), k = Math.min(1, 900 / Math.max(im.width, im.height)); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(im.src); res(c); }; im.onerror = () => res(null); im.src = URL.createObjectURL(f); });
            const cs = (await Promise.all(list.slice(0, L.n).map(load))).filter(Boolean);
            if (!cs.length) return;
            pb.shots = []; for (let i = 0; i < L.n; i++) pb.shots.push(cs[i % cs.length]);
            if (cs.length < L.n && typeof toast === 'function') toast(`사진 ${L.n}장이 필요해서 고른 사진을 되풀이해 넣었어요`);
            pbToEdit();
        }
        function pbToEdit() { pbStep(3); pbq('pbText').value = pb.text; pbq('pbDeco').checked = pb.deco; pbSetFilter(pb.filter); }
        function pbRetake() { pb.shots = []; pbStep(1); }

        /* ---------- 합치기 ---------- */
        function pbFilter(ctx, w, h) {                        // 모든 브라우저에서 되도록 픽셀을 직접 바꿔요
            if (pb.filter === 'none') return;
            const d = ctx.getImageData(0, 0, w, h), a = d.data;
            for (let i = 0; i < a.length; i += 4) {
                let r = a[i], g = a[i + 1], b = a[i + 2];
                if (pb.filter === 'soft') { r = r * 1.06 + 14; g = g * 1.04 + 12; b = b * 1.04 + 14; const l = (r + g + b) / 3; r = l + (r - l) * 1.12; g = l + (g - l) * 1.05; b = l + (b - l) * 1.08; }
                else if (pb.filter === 'bw') { const l = r * .3 + g * .59 + b * .11; r = g = b = (l - 128) * 1.12 + 128; }
                else if (pb.filter === 'vintage') { const nr = r * .393 + g * .769 + b * .189, ng = r * .349 + g * .686 + b * .168, nb = r * .272 + g * .534 + b * .131; r = r * .55 + nr * .45 + 6; g = g * .55 + ng * .45; b = b * .55 + nb * .45 - 8; }
                else if (pb.filter === 'cool') { r = r * .94; g = g * 1.02 + 4; b = b * 1.1 + 10; }
                a[i] = r < 0 ? 0 : r > 255 ? 255 : r; a[i + 1] = g < 0 ? 0 : g > 255 ? 255 : g; a[i + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
            }
            ctx.putImageData(d, 0, 0);
        }
        function pbCover(ctx, src, x, y, w, h) {               // 칸에 꽉 차게 (가운데 자르기)
            const sw = src.width, sh = src.height, k = Math.max(w / sw, h / sh), cw = w / k, ch = h / k;
            ctx.drawImage(src, (sw - cw) / 2, (sh - ch) / 2, cw, ch, x, y, w, h);
        }
        function pbRound(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
        function pbCompose() {
            const L = PB_LAYOUTS[pb.layout], F = PB_FRAMES.find(f => f[0] === pb.frame) || PB_FRAMES[0];
            const rows = Math.ceil(L.n / L.cols), W = L.w, H = L.pad * 2 + rows * L.slot[1] + (rows - 1) * L.gap + L.foot;
            const c = pbq('pbCanvas'); c.width = W; c.height = H;
            const x = c.getContext('2d');
            x.fillStyle = F[1]; x.fillRect(0, 0, W, H);
            if (pb.frame === 'check') { x.fillStyle = 'rgba(255,255,255,.55)'; for (let i = 0; i < W; i += 24) for (let j = 0; j < H; j += 24) if (((i + j) / 24) % 2 === 0) x.fillRect(i, j, 12, 12); }
            if (pb.frame === 'star') { x.fillStyle = 'rgba(255,255,255,.7)'; for (let i = 0; i < 40; i++) { x.beginPath(); x.arc((i * 97) % W, (i * 151) % H, 1.6, 0, 7); x.fill(); } }
            const sw = L.slot[0], sh = L.slot[1], x0 = (W - (L.cols * sw + (L.cols - 1) * L.gap)) / 2;
            pb.shots.slice(0, L.n).forEach((s, i) => {
                const col = i % L.cols, row = Math.floor(i / L.cols), px = x0 + col * (sw + L.gap), py = L.pad + row * (sh + L.gap);
                const t = document.createElement('canvas'); t.width = sw; t.height = sh;
                const tx = t.getContext('2d'); pbCover(tx, s, 0, 0, sw, sh); pbFilter(tx, sw, sh);
                x.save(); pbRound(x, px, py, sw, sh, 10); x.clip(); x.drawImage(t, px, py); x.restore();
            });
            /* 아래 글씨 : 날짜 + 한마디 */
            const now = new Date(), date = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
            const fy = H - L.foot;
            x.fillStyle = F[2]; x.textAlign = 'center';
            x.font = `bold ${pb.layout === 'strip' ? 26 : 30}px Jua, "Gowun Dodum", "Noto Sans KR", sans-serif`;
            x.fillText(pb.text || '말랑달콤 💕', W / 2, fy + L.foot * .48);
            x.font = '15px "Noto Sans KR", sans-serif'; x.globalAlpha = .8;
            x.fillText(`${date} · 말랑 포토부스`, W / 2, fy + L.foot * .8); x.globalAlpha = 1;
            if (pb.deco) {                                    // ✨ 반짝이 · 하트
                const dots = [[.06, .03], [.94, .05], [.04, .5], [.96, .62], [.1, .97], [.9, .95]];
                dots.forEach(([a, b], i) => {
                    const cx = a * W, cy = b * H, r = 8 + (i % 3) * 3;
                    x.fillStyle = i % 2 ? '#fff6b8' : '#ffffff';
                    if (i % 3 === 2) { x.beginPath(); x.moveTo(cx, cy + r * .9); x.bezierCurveTo(cx - r * 1.3, cy, cx - r * .7, cy - r, cx, cy - r * .3); x.bezierCurveTo(cx + r * .7, cy - r, cx + r * 1.3, cy, cx, cy + r * .9); x.fillStyle = '#ff8fab'; x.fill(); }
                    else { x.beginPath(); for (let k = 0; k < 8; k++) { const rr = k % 2 ? r * .3 : r, an = k * Math.PI / 4; x.lineTo(cx + Math.cos(an) * rr, cy + Math.sin(an) * rr); } x.closePath(); x.fill(); }
                });
            }
            pb.out = '';
        }
        function pbOut() { if (!pb.out) pb.out = pbq('pbCanvas').toDataURL('image/jpeg', .86); return pb.out; }
        function pbStick() {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">💾 내 기기에 저장해 두었다가 붙여도 돼요.</span>'); return; }
            if (!addImage(pbOut())) return;
            const el = document.querySelector('#canvasArea .element-box:last-child');
            if (el) el.style.width = pb.layout === 'strip' ? '110px' : '170px';
            closeBooth();
            if (typeof toast === 'function') toast('📸 포토부스 사진을 붙였어요' + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
        }
        function pbSave() {
            const a = document.createElement('a'), n = new Date();
            a.href = pbOut(); a.download = `말랑포토부스_${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}_${String(n.getHours()).padStart(2, '0')}${String(n.getMinutes()).padStart(2, '0')}.jpg`;
            document.body.appendChild(a); a.click(); a.remove();
        }

        function openBooth() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            pbBuild(); pb.shots = [];
            pbSetLayout(pb.layout); pbSetFrame(pb.frame); pbStep(1);
            pbq('boothRoom').classList.add('show');
            document.body.classList.add('fc-lock');
        }
        function closeBooth() {
            pbStopCamera(); pb.busy = false;
            const r = pbq('boothRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openBooth = openBooth;
