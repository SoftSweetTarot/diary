/* 말랑달콤 다이어리 - js/char-move.js
   🪄 캐릭터 움직이기 : 내 기기에 있는 캐릭터 그림을 불러와 붓으로 칠하면 그 부분이 움직여요
       (카페 → 🧸 인형 꾸미기 → 🪄 캐릭터 움직이기)
   - 그림은 이 기기에서만 처리돼요 (서버 · 드라이브로 올라가지 않아요). 일기에 붙일 때 그림 그대로 일기 파일에 담겨요.
   - 칠하는 곳(마스크) : 💨 살랑(머리카락 · 치마 · 꼬리) · 👀 깜빡(눈) · 🫧 말랑(볼 · 귀 · 리본) → 작은 PNG 한 장(R · G · B 칸)으로 저장
   - 움직임은 WebGL 셰이더 하나가 그려요 : 그림 한 장을 칠한 곳만 살짝 휘어서 보여주는 방식(메시 없이 '거꾸로 찾아 그리기')
   - WebGL 은 화면 밖에 하나만 만들어 모든 캐릭터가 같이 써요 (일기에 여러 마리를 붙여도 WebGL 개수 제한에 안 걸려요)
   - 일기에 붙인 캐릭터 = 평범한 그림 요소(image) + 데이터 cm { m 칠한 곳 PNG, b 숨쉬기, j 통통, v 속도, a 세기 }
       → 위에 움직이는 캔버스(canvas.cmv-live)를 겹쳐요 · 그림은 그대로 남아 있어서 PNG 저장 · 다른 기기에서도 안전해요
   ※ 파일 불러오는 순서: … → elements → … → doll-room → doll-move → char-move → service */

        const CMV_MAX = 640;                 // 그림 긴 변 (여백 빼고)
        const CMV_PAD = 0.12;                // 가장자리 투명 여백 비율 (휘어도 안 잘려요)
        const CMV_MS = 128;                  // 칠하는 칸 긴 변
        const CMV_GL = 1024;                 // 공용 WebGL 그림판 크기
        const CMV_TOOLS = [
            ['poke', '👆 콕', '그림을 톡 눌러 보세요! 콩 뛰어요.'],
            ['sway', '💨 살랑', '머리카락 · 치마 · 꼬리를 칠해요. 위쪽은 가만히 있고 아래쪽이 살랑거려요.'],
            ['blink', '👀 깜빡', '눈을 쏙 칠하면 깜빡거려요. 눈 둘레만 칠해 주세요!'],
            ['jelly', '🫧 말랑', '볼 · 귀 · 리본처럼 말랑말랑 흔들릴 곳을 칠해요.'],
            ['erase', '🧽 지우개', '칠한 곳을 지워요.']
        ];
        const CMV_CH = { sway: 0, blink: 1, jelly: 2 };
        const CMV_COL = [[255, 120, 170], [90, 160, 255], [90, 200, 140]];       // 칠한 곳 보기 색 (살랑 · 깜빡 · 말랑)

        /* =====================================================================
           🎨 공용 WebGL (화면 밖 · 한 개)
           ===================================================================== */
        const CMV_VS = 'attribute vec2 a;varying vec2 uv;void main(){uv=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
        const CMV_FS = `precision mediump float;
varying vec2 uv;
uniform sampler2D img,msk;
uniform float t,amp,pk,br,bo,bly,blh;
uniform vec2 piv,swr;
void main(){
  vec2 p=uv;
  float s=1.+.014*amp*br*sin(t*1.9);
  p=piv+(p-piv)/s;
  p.y+=bo*.03*amp*abs(sin(t*2.8));
  if(pk>=0.)p.y+=exp(-pk*3.5)*abs(sin(pk*11.))*.06;
  vec3 m=texture2D(msk,uv).rgb;
  float k=clamp((uv.y-swr.x)/max(.02,swr.y-swr.x),0.,1.);
  p.x+=m.r*k*(.4+.6*k)*.035*amp*sin(t*2.1+uv.y*5.);
  p.y+=m.r*k*k*.006*amp*sin(t*4.2+uv.y*5.);
  float ph=fract(t*.23);
  float cl=smoothstep(.88,.92,ph)*(1.-smoothstep(.93,.98,ph));
  p.y=mix(p.y,bly+clamp((p.y-bly)/max(.08,1.-.93*cl),-blh,blh),m.g);
  p+=m.b*.014*amp*vec2(sin(t*3.3+uv.y*11.),cos(t*2.9+uv.x*11.));
  gl_FragColor=texture2D(img,p);
}`;
        let cmvG = null, cmvGen = 0;                                        // null = 아직 · false = 못 만듦
        function cmvGL() {
            if (cmvG && cmvG.gl.isContextLost()) cmvG = null;
            if (cmvG !== null) return cmvG || null;
            try {
                const cv = document.createElement('canvas'); cv.width = cv.height = CMV_GL;
                const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
                if (!gl) { cmvG = false; return null; }
                const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
                const pr = gl.createProgram();
                gl.attachShader(pr, sh(gl.VERTEX_SHADER, CMV_VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, CMV_FS));
                gl.linkProgram(pr);
                if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
                gl.useProgram(pr);
                const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
                const la = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
                const u = {}; ['img', 'msk', 't', 'amp', 'pk', 'br', 'bo', 'bly', 'blh', 'piv', 'swr'].forEach(n => { u[n] = gl.getUniformLocation(pr, n); });
                gl.uniform1i(u.img, 0); gl.uniform1i(u.msk, 1);
                gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ZERO);
                cv.addEventListener('webglcontextlost', e => { e.preventDefault(); cmvG = null; });
                cmvG = { cv, gl, u, gen: ++cmvGen };
            } catch (e) { console.warn('캐릭터 움직이기: WebGL 을 쓸 수 없어요', e); cmvG = false; }
            return cmvG || null;
        }
        function cmvTex(gl, unit, filter) {
            const tx = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return tx;
        }

        /* ---------- 캐릭터 한 마리 (그림 + 칠한 곳 + 움직임 설정) ---------- */
        function cmvNew(src, w, h, o) {
            const mw = w >= h ? CMV_MS : Math.max(8, Math.round(CMV_MS * w / h)), mh = h > w ? CMV_MS : Math.max(8, Math.round(CMV_MS * h / w));
            return { src, w, h, mw, mh, mask: new Uint8Array(mw * mh * 3), gen: 0, tex: null, mtex: null, dirty: true, ctx: null,
                br: !o || o.b !== 0, bo: !!(o && o.j), sp: (o && o.v) || 1, am: (o && o.a) || 1, swr: [0, 1], bly: .5, blh: .05, pokeAt: 0, t0: performance.now(), born: performance.now(), seen: false };
        }
        function cmvScan(pl) {                                              // 칠한 곳의 위 · 아래 끝 / 눈 높이 다시 재기
            let top = 1, bot = 0, g0 = 1, g1 = 0;
            for (let y = 0; y < pl.mh; y++) for (let x = 0; x < pl.mw; x++) {
                const i = (y * pl.mw + x) * 3;
                if (pl.mask[i] > 30) { top = Math.min(top, y / pl.mh); bot = Math.max(bot, (y + 1) / pl.mh); }
                if (pl.mask[i + 1] > 30) { g0 = Math.min(g0, y / pl.mh); g1 = Math.max(g1, (y + 1) / pl.mh); }
            }
            pl.swr = top < bot ? [top, bot] : [0, 1];
            if (g0 < g1) { pl.bly = (g0 + g1) / 2; pl.blh = (g1 - g0) / 2 + .012; }      // 깜빡이는 곳의 한가운데와 반 높이 (그 안쪽만 눌러서 눈꺼풀처럼)
            else { pl.bly = .5; pl.blh = .05; }
        }
        function cmvUpload(pl, G) {
            const gl = G.gl;
            if (pl.tex) { try { gl.deleteTexture(pl.tex); gl.deleteTexture(pl.mtex); } catch (e) {} }
            pl.tex = cmvTex(gl, 0, gl.LINEAR);
            gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, pl.src);
            pl.mtex = cmvTex(gl, 1, gl.LINEAR);
            pl.gen = G.gen; pl.dirty = true;
        }
        function cmvDraw(pl, tSec) {
            const G = cmvGL(); if (!G || !pl.ctx) return false;
            const gl = G.gl, u = G.u;
            if (pl.gen !== G.gen) cmvUpload(pl, G);
            if (pl.dirty) {
                gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, pl.mtex);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, pl.mw, pl.mh, 0, gl.RGB, gl.UNSIGNED_BYTE, pl.mask);
                pl.dirty = false;
            }
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, pl.tex);
            gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, pl.mtex);
            gl.viewport(0, 0, pl.w, pl.h);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            const now = performance.now();
            let pk = -1;
            if (pl.pokeAt) { pk = (now - pl.pokeAt) / 1000; if (pk > 2.5) { pl.pokeAt = 0; pk = -1; } }
            gl.uniform1f(u.t, tSec * pl.sp); gl.uniform1f(u.amp, pl.am); gl.uniform1f(u.pk, pk);
            gl.uniform1f(u.br, pl.br ? 1 : 0); gl.uniform1f(u.bo, pl.bo ? 1 : 0); gl.uniform1f(u.bly, pl.bly); gl.uniform1f(u.blh, pl.blh);
            gl.uniform2f(u.piv, .5, 1 - CMV_PAD * .9); gl.uniform2f(u.swr, pl.swr[0], pl.swr[1]);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            pl.ctx.clearRect(0, 0, pl.w, pl.h);
            pl.ctx.drawImage(G.cv, 0, CMV_GL - pl.h, pl.w, pl.h, 0, 0, pl.w, pl.h);
            return true;
        }

        function cmvFree(pl) {                                              // 더 안 쓰는 캐릭터의 그림 메모리 돌려주기
            cmvLive.delete(pl);
            try { if (cmvG && pl.tex) { cmvG.gl.deleteTexture(pl.tex); cmvG.gl.deleteTexture(pl.mtex); } } catch (e) {}
            pl.tex = pl.mtex = null; pl.gen = 0;
        }

        /* ---------- 살아 움직이게 (모든 캐릭터를 한 번에 돌려요 · 초당 30번) ---------- */
        const cmvLive = new Set();
        let cmvRaf = 0, cmvLastT = 0;
        const cmvStill = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        function cmvTick(now) {
            cmvRaf = 0;
            if (now - cmvLastT >= 30) {
                cmvLastT = now;
                cmvLive.forEach(pl => {
                    const cv = pl.ctx && pl.ctx.canvas;
                    if (!cv || !cv.isConnected) { if (pl.seen || now - pl.born > 6000) cmvFree(pl); return; }
                    pl.seen = true;
                    cmvDraw(pl, cmvStill() ? 0 : (now - pl.t0) / 1000);
                });
            }
            if (cmvLive.size && !document.hidden) cmvRaf = requestAnimationFrame(cmvTick);
        }
        function cmvKick() { if (!cmvRaf && cmvLive.size) cmvRaf = requestAnimationFrame(cmvTick); }
        document.addEventListener('visibilitychange', cmvKick);

        /* ---------- 칠한 곳 PNG 로 줄이기 / 풀기 ---------- */
        function cmvPack(pl) {
            const c = document.createElement('canvas'); c.width = pl.mw; c.height = pl.mh;
            const x = c.getContext('2d'), id = x.createImageData(pl.mw, pl.mh), n = pl.mw * pl.mh;
            for (let i = 0; i < n; i++) { id.data[i * 4] = pl.mask[i * 3]; id.data[i * 4 + 1] = pl.mask[i * 3 + 1]; id.data[i * 4 + 2] = pl.mask[i * 3 + 2]; id.data[i * 4 + 3] = 255; }
            x.putImageData(id, 0, 0);
            return c.toDataURL('image/png');
        }
        function cmvUnpack(pl, url) {                                       // 데이터가 이상하면 그냥 비어 있는 채로 둬요
            if (typeof url !== 'string' || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(url) || url.length > 120000) return;
            const im = new Image();
            im.onload = () => {
                try {
                    if (im.naturalWidth < 4 || im.naturalHeight < 4 || im.naturalWidth > 256 || im.naturalHeight > 256) return;
                    const c = document.createElement('canvas'); c.width = im.naturalWidth; c.height = im.naturalHeight;
                    const x = c.getContext('2d'); x.drawImage(im, 0, 0);
                    const d = x.getImageData(0, 0, c.width, c.height).data;
                    pl.mw = c.width; pl.mh = c.height; pl.mask = new Uint8Array(pl.mw * pl.mh * 3);
                    for (let i = 0; i < pl.mw * pl.mh; i++) { pl.mask[i * 3] = d[i * 4]; pl.mask[i * 3 + 1] = d[i * 4 + 1]; pl.mask[i * 3 + 2] = d[i * 4 + 2]; }
                    cmvScan(pl); pl.dirty = true;
                } catch (e) {}
            };
            im.src = url;
        }
        /* 일기 파일 · 다른 곳에서 온 cm 은 정해진 값만 통과 */
        function cmvClean(cm) {
            if (!cm || typeof cm !== 'object') return null;
            const n = (v, lo, hi, d) => { v = parseFloat(v); return isNaN(v) ? d : Math.max(lo, Math.min(hi, Math.round(v * 10) / 10)); };
            return { m: typeof cm.m === 'string' ? cm.m : '', b: cm.b === 0 ? 0 : 1, j: cm.j ? 1 : 0, v: n(cm.v, .5, 2, 1), a: n(cm.a, .4, 1.8, 1) };
        }

        /* ---------- 📔 일기 안의 캐릭터 (elements.js createElementFromData 에서 불러요) ---------- */
        function cmvDress(el, img, cmIn) {
            const cm = cmvClean(cmIn);
            if (!cm || !cmvGL()) return;                                    // WebGL 이 없으면 그림만 보여요
            el.dataset.cm = JSON.stringify(cm);
            el.dataset.ts = 1;                                              // 사진 꾸미기 창이 안 떠요 (움직이는 캐릭터에는 필터가 안 먹어요)
            const go = () => {
                if (!img.naturalWidth || el.querySelector('canvas.cmv-live')) return;
                const pl = cmvNew(img, img.naturalWidth, img.naturalHeight, cm);
                const cv = document.createElement('canvas'); cv.className = 'cmv-live'; cv.width = pl.w; cv.height = pl.h;
                pl.ctx = cv.getContext('2d');
                el.appendChild(cv); img.style.opacity = 0;
                cmvUnpack(pl, cm.m);
                cmvLive.add(pl); cmvKick();
            };
            if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
        }

        /* =====================================================================
           🪄 캐릭터 움직이기 창
           ===================================================================== */
        const CMV = { built: false, pl: null, pad: null, tool: 'sway', brush: 7, show: true, undo: [], painting: false, last: null, dirty: false };

        function cmvBuild() {
            if (CMV.built) return;
            CMV.built = true;
            const wrap = document.createElement('div');
            wrap.innerHTML = `
            <div class="modal" id="charMove">
              <div class="modal-content cmv-box">
                <div class="modal-title">🪄 캐릭터 움직이기</div>
                <div id="cmvStart">
                  <p class="cmv-tip">내 기기에 있는 캐릭터 그림을 불러와요.<br>배경이 투명한 <b>PNG</b>가 가장 예뻐요. 그림은 서버에 올라가지 않아요.</p>
                  <button class="btn btn-primary" type="button" id="cmvLoad" style="width:100%;justify-content:center;">📂 캐릭터 그림 불러오기</button>
                </div>
                <input type="file" id="cmvFile" accept="image/*" style="display:none">
                <div id="cmvEdit" style="display:none">
                  <div class="cmv-main">
                    <div class="cmv-stage" id="cmvStage"><canvas id="cmvView"></canvas><canvas id="cmvOv"></canvas></div>
                    <div class="cmv-ctl">
                      <div class="cmv-grp"><h4>붓</h4><div class="cmv-chips" id="cmvTools"></div><p class="cmv-note" id="cmvNote"></p></div>
                      <div class="cmv-grp"><h4>붓 크기</h4><div class="cmv-range"><small>작게</small><input type="range" id="cmvBrush" min="3" max="20" step="1"><small>크게</small></div></div>
                      <div class="cmv-grp"><h4>온몸 움직임</h4><div class="cmv-chips"><label class="cmv-chip"><input type="checkbox" id="cmvBr"> 🌬 숨쉬기</label><label class="cmv-chip"><input type="checkbox" id="cmvBo"> 🐰 통통</label></div></div>
                      <div class="cmv-grp"><h4>속도</h4><div class="cmv-range"><small>느리게</small><input type="range" id="cmvSp" min="0.5" max="2" step="0.1"><small>빠르게</small></div></div>
                      <div class="cmv-grp"><h4>세기</h4><div class="cmv-range"><small>살짝</small><input type="range" id="cmvAm" min="0.4" max="1.8" step="0.1"><small>크게</small></div></div>
                      <div class="cmv-grp cmv-row"><label class="cmv-chip"><input type="checkbox" id="cmvShow"> 🎨 칠한 곳 보이기</label><button type="button" class="cmv-chip" id="cmvUndo">↩ 되돌리기</button><button type="button" class="cmv-chip" id="cmvClear">🧹 모두 지우기</button></div>
                    </div>
                  </div>
                  <div class="cmv-btns">
                    <button class="btn btn-primary" type="button" id="cmvAttach">📔 일기에 붙이기</button>
                    <button class="btn" type="button" id="cmvPng">📷 지금 모습 저장</button>
                    <button class="btn" type="button" id="cmvOther">📂 다른 그림</button>
                  </div>
                </div>
                <button class="btn cmv-close" type="button" onclick="closeCharMove()">닫기</button>
              </div>
            </div>`;
            document.body.appendChild(wrap.firstElementChild);
            const $ = id => document.getElementById(id);
            $('cmvTools').innerHTML = CMV_TOOLS.map(([id, l]) => `<button type="button" class="cmv-chip" data-cmvt="${id}">${l}</button>`).join('');
            $('cmvTools').addEventListener('click', e => { const b = e.target.closest('[data-cmvt]'); if (b) cmvTool(b.dataset.cmvt); });
            $('cmvLoad').onclick = $('cmvOther').onclick = () => $('cmvFile').click();
            $('cmvFile').onchange = e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) cmvOpenFile(f); };
            $('cmvBrush').oninput = e => { CMV.brush = +e.target.value; };
            $('cmvBr').onchange = e => { if (CMV.pl) CMV.pl.br = e.target.checked; };
            $('cmvBo').onchange = e => { if (CMV.pl) CMV.pl.bo = e.target.checked; };
            $('cmvSp').oninput = e => { if (CMV.pl) CMV.pl.sp = +e.target.value; };
            $('cmvAm').oninput = e => { if (CMV.pl) CMV.pl.am = +e.target.value; };
            $('cmvShow').onchange = e => { CMV.show = e.target.checked; cmvOverlay(); };
            $('cmvUndo').onclick = cmvUndo;
            $('cmvClear').onclick = () => { if (!CMV.pl) return; cmvSnap(); CMV.pl.mask.fill(0); cmvMaskChanged(); };
            $('cmvAttach').onclick = cmvAttach;
            $('cmvPng').onclick = cmvSavePng;
            const ov = $('cmvOv');
            ov.addEventListener('pointerdown', cmvDown); ov.addEventListener('pointermove', cmvMove);
            ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => ov.addEventListener(n, cmvUp));
        }

        function openCharMove() {
            cmvBuild();
            ['serviceModal'].forEach(id => { const m = document.getElementById(id); if (m) m.style.display = 'none'; });
            if (!cmvGL()) { showMsg('⚠ 이 기기(브라우저)에서는 움직이는 그림을 쓸 수 없어요.<br><span style="font-size:12px;color:#777;">크롬 · 사파리 같은 최신 브라우저에서 열어 주세요.</span>'); return; }
            openModal('charMove');
            if (!CMV.pl) { document.getElementById('cmvStart').style.display = ''; document.getElementById('cmvEdit').style.display = 'none'; }
        }
        async function closeCharMove() {
            if (CMV.pl && CMV.dirty && !(await showMsg('칠해 둔 움직임이 사라져요.<br>그래도 닫을까요?<br><span style="font-size:12px;color:#777;">📔 일기에 붙이면 움직임이 그대로 저장돼요.</span>', true))) return;
            if (CMV.pl) cmvFree(CMV.pl);
            CMV.pl = null; CMV.pad = null; CMV.undo = []; CMV.dirty = false;
            closeModal('charMove');
        }

        /* ---------- 그림 불러오기 : 투명한 가장자리는 잘라내고, 휘어도 안 잘리게 여백을 둘러요 ---------- */
        async function cmvOpenFile(file) {
            if (!/^image\//.test(file.type)) { showMsg('이미지 파일(PNG · JPG)을 골라 주세요.'); return; }
            let im;
            const url = URL.createObjectURL(file);
            try { im = await loadImg(url); } catch (e) { URL.revokeObjectURL(url); showMsg('⚠ 그림을 열지 못했어요.<br>다른 파일로 해 주세요.'); return; }
            URL.revokeObjectURL(url);
            const nw = im.naturalWidth || 512, nh = im.naturalHeight || 512;
            const k = Math.min(1, CMV_MAX / Math.max(nw, nh));
            let cw = Math.max(1, Math.round(nw * k)), ch = Math.max(1, Math.round(nh * k));
            const t = document.createElement('canvas'); t.width = cw; t.height = ch;
            const tx = t.getContext('2d', { willReadFrequently: true }); tx.drawImage(im, 0, 0, cw, ch);
            let bx = 0, by = 0, bw = cw, bh = ch;
            try {                                                            // 투명한 가장자리 자르기
                const d = tx.getImageData(0, 0, cw, ch).data;
                let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
                for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (d[(y * cw + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
                if (x1 >= x0 && y1 >= y0 && (x1 - x0 + 1) * (y1 - y0 + 1) < cw * ch * .98) { bx = x0; by = y0; bw = x1 - x0 + 1; bh = y1 - y0 + 1; }
            } catch (e) {}
            const pad = Math.round(Math.max(bw, bh) * CMV_PAD);
            const W = bw + pad * 2, H = bh + pad * 2;
            const pc = document.createElement('canvas'); pc.width = W; pc.height = H;
            pc.getContext('2d').drawImage(t, bx, by, bw, bh, pad, pad, bw, bh);
            if (CMV.pl) cmvFree(CMV.pl);
            CMV.pad = pc;
            const pl = CMV.pl = cmvNew(pc, W, H, { b: 1, v: 1, a: 1 });
            pl.ctx = document.getElementById('cmvView').getContext('2d');
            const view = document.getElementById('cmvView'); view.width = W; view.height = H;
            const ov = document.getElementById('cmvOv'); ov.width = pl.mw; ov.height = pl.mh;
            document.getElementById('cmvStage').style.setProperty('--cmv-ar', (W / H).toFixed(4));
            CMV.undo = []; CMV.show = true; CMV.tool = 'sway'; CMV.dirty = false;
            document.getElementById('cmvBr').checked = true; document.getElementById('cmvBo').checked = false;
            document.getElementById('cmvSp').value = 1; document.getElementById('cmvAm').value = 1;
            document.getElementById('cmvBrush').value = CMV.brush; document.getElementById('cmvShow').checked = true;
            document.getElementById('cmvStart').style.display = 'none'; document.getElementById('cmvEdit').style.display = '';
            cmvTool('sway'); cmvOverlay();
            cmvLive.add(pl); cmvKick();
        }

        /* ---------- 칠하기 ---------- */
        function cmvTool(id) {
            CMV.tool = id;
            document.querySelectorAll('#cmvTools [data-cmvt]').forEach(b => b.classList.toggle('on', b.dataset.cmvt === id));
            document.getElementById('cmvNote').textContent = (CMV_TOOLS.find(x => x[0] === id) || [])[2] || '';
            document.getElementById('cmvOv').style.cursor = id === 'poke' ? 'pointer' : 'crosshair';
        }
        function cmvSnap() { CMV.undo.push(CMV.pl.mask.slice()); if (CMV.undo.length > 20) CMV.undo.shift(); }
        function cmvUndo() { if (!CMV.pl || !CMV.undo.length) return; CMV.pl.mask.set(CMV.undo.pop()); cmvMaskChanged(); }
        function cmvMaskChanged() { cmvScan(CMV.pl); CMV.pl.dirty = true; CMV.dirty = CMV.pl.mask.some(v => v > 0); cmvOverlay(); }
        function cmvPt(e) {
            const r = e.currentTarget.getBoundingClientRect();
            return [(e.clientX - r.left) / r.width * CMV.pl.mw, (e.clientY - r.top) / r.height * CMV.pl.mh];
        }
        function cmvStamp(x, y) {
            const pl = CMV.pl, R = CMV.brush, m = pl.mask, er = CMV.tool === 'erase', ch = CMV_CH[CMV.tool];
            for (let yy = Math.max(0, Math.floor(y - R)); yy <= Math.min(pl.mh - 1, Math.ceil(y + R)); yy++) {
                for (let xx = Math.max(0, Math.floor(x - R)); xx <= Math.min(pl.mw - 1, Math.ceil(x + R)); xx++) {
                    const dist = Math.hypot(xx + .5 - x, yy + .5 - y); if (dist > R) continue;
                    const a = Math.min(255, (1 - dist / R) * 1.8 * 255) | 0, i = (yy * pl.mw + xx) * 3;
                    for (let c = 0; c < 3; c++) {
                        if (er || c !== ch) m[i + c] = Math.max(0, m[i + c] - a);          // 한 곳에는 한 가지 움직임만
                        else m[i + c] = Math.max(m[i + c], a);
                    }
                }
            }
        }
        function cmvDown(e) {
            if (!CMV.pl) return;
            e.preventDefault();
            if (CMV.tool === 'poke') { CMV.pl.pokeAt = performance.now(); return; }
            try { e.currentTarget.setPointerCapture(e.pointerId); } catch (x) {}
            cmvSnap();
            CMV.painting = true; CMV.last = cmvPt(e);
            cmvStamp(CMV.last[0], CMV.last[1]); cmvMaskChanged();
        }
        function cmvMove(e) {
            if (!CMV.painting || !CMV.pl) return;
            e.preventDefault();
            const p = cmvPt(e), l = CMV.last, d = Math.hypot(p[0] - l[0], p[1] - l[1]), n = Math.max(1, Math.ceil(d / Math.max(1, CMV.brush * .4)));
            for (let i = 1; i <= n; i++) cmvStamp(l[0] + (p[0] - l[0]) * i / n, l[1] + (p[1] - l[1]) * i / n);
            CMV.last = p; cmvMaskChanged();
        }
        function cmvUp() { CMV.painting = false; }
        function cmvOverlay() {                                             // 칠한 곳을 색으로 겹쳐 보여요
            const ov = document.getElementById('cmvOv'); if (!ov || !CMV.pl) return;
            const pl = CMV.pl, x = ov.getContext('2d');
            ov.width = pl.mw; ov.height = pl.mh;
            if (!CMV.show) return;
            const id = x.createImageData(pl.mw, pl.mh);
            for (let i = 0; i < pl.mw * pl.mh; i++) {
                let best = 0, bv = 0;
                for (let c = 0; c < 3; c++) if (pl.mask[i * 3 + c] > bv) { bv = pl.mask[i * 3 + c]; best = c; }
                if (bv > 12) { id.data[i * 4] = CMV_COL[best][0]; id.data[i * 4 + 1] = CMV_COL[best][1]; id.data[i * 4 + 2] = CMV_COL[best][2]; id.data[i * 4 + 3] = bv * .5; }
            }
            x.putImageData(id, 0, 0);
        }

        /* ---------- 내보내기 ---------- */
        function cmvParams(pl) { return { m: cmvPack(pl), b: pl.br ? 1 : 0, j: pl.bo ? 1 : 0, v: Math.round(pl.sp * 10) / 10, a: Math.round(pl.am * 10) / 10 }; }
        async function cmvAttach() {
            const pl = CMV.pl; if (!pl) return;
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">표지를 넘긴 뒤 다시 붙여 주세요.</span>'); return; }
            const el = createElementFromData({ type: 'image', content: CMV.pad.toDataURL('image/png'), cm: cmvParams(pl), ts: 1, width: '170px', posX: 80, posY: 60, scale: 1, rotation: 0, zIndex: zIndexCounter }, true);
            document.getElementById('canvasArea').appendChild(el);
            selectElement(el);
            saveData(false);
            CMV.dirty = false;
            closeCharMove();
        }
        function cmvSavePng() {
            const v = document.getElementById('cmvView');
            if (!CMV.pl || !v) return;
            v.toBlob(b => { if (b) downloadBlob(b, `캐릭터_${dollStamp()}.png`); }, 'image/png');
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['char-move'] = true;
