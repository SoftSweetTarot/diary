/* 말랑달콤 다이어리 - js/char-move.js
   🪄 캐릭터 움직이기 : 내 기기에 있는 캐릭터 그림을 불러와 붓으로 칠하면 그 부분이 움직여요
   🧩 조각으로 입체 : 부위별로 나눈 PNG 여러 장을 불러오면 고개 돌리기 · 깜빡 · 입 · 머리카락 출렁임을 입체처럼 움직여요 (아래 '🧩' 부분)
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
                /* 🧩 조각 그리기용 (그물 메시) */
                const mp = gl.createProgram();
                gl.attachShader(mp, sh(gl.VERTEX_SHADER, CP_VS)); gl.attachShader(mp, sh(gl.FRAGMENT_SHADER, CP_FS));
                gl.linkProgram(mp);
                if (!gl.getProgramParameter(mp, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(mp));
                const m = { pr: mp, lp: gl.getAttribLocation(mp, 'p'), lq: gl.getAttribLocation(mp, 'q'), res: gl.getUniformLocation(mp, 'res'), al: gl.getUniformLocation(mp, 'al'), img: gl.getUniformLocation(mp, 'img') };
                const uv = [], idx = [];
                for (let j = 0; j <= CP_GY; j++) for (let i = 0; i <= CP_GX; i++) uv.push(i / CP_GX, j / CP_GY);
                for (let j = 0; j < CP_GY; j++) for (let i = 0; i < CP_GX; i++) { const a = j * (CP_GX + 1) + i, b = a + 1, c = a + CP_GX + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
                m.uv = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.uv); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv), gl.STATIC_DRAW);
                m.pos = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, m.pos); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(uv.length), gl.DYNAMIC_DRAW);
                m.idx = gl.createBuffer(); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.idx); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(idx), gl.STATIC_DRAW);
                m.n = idx.length;
                gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ZERO);
                cv.addEventListener('webglcontextlost', e => { e.preventDefault(); cmvG = null; });
                cmvG = { cv, gl, u, pr, buf, la, m, gen: ++cmvGen };
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
            gl.useProgram(G.pr);
            gl.disableVertexAttribArray(G.m.lp); gl.disableVertexAttribArray(G.m.lq);
            gl.bindBuffer(gl.ARRAY_BUFFER, G.buf); gl.enableVertexAttribArray(G.la); gl.vertexAttribPointer(G.la, 2, gl.FLOAT, false, 0, 0);
            gl.blendFunc(gl.ONE, gl.ZERO);
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
            if (pl.parts) pl.parts.forEach(P => { try { if (cmvG && P.tex) cmvG.gl.deleteTexture(P.tex); } catch (e) {} P.tex = null; });
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
                    if (cv.offsetParent === null) return;                    // 안 보이는 곳(닫힌 창 · 다른 쪽)은 쉬어요
                    (pl.pp ? cpDraw : cmvDraw)(pl, cmvStill() ? 0 : (now - pl.t0) / 1000);
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
            if (cm.k === 'p') return cpCleanP(cm, n);                       // 🧩 조각 캐릭터
            return { m: typeof cm.m === 'string' ? cm.m : '', b: cm.b === 0 ? 0 : 1, j: cm.j ? 1 : 0, v: n(cm.v, .5, 2, 1), a: n(cm.a, .4, 1.8, 1) };
        }

        /* ---------- 📔 일기 안의 캐릭터 (elements.js createElementFromData 에서 불러요) ---------- */
        function cmvDress(el, img, cmIn) {
            const cm = cmvClean(cmIn);
            if (!cm) return;
            el.dataset.cm = JSON.stringify(cm);                             // WebGL 이 없는 기기에서도 움직임 데이터는 그대로 지켜요
            el.dataset.ts = 1;
            if (!cmvGL()) return;                                           // WebGL 이 없으면 그림만 보여요                                              // 사진 꾸미기 창이 안 떠요 (움직이는 캐릭터에는 필터가 안 먹어요)
            if (cm.k === 'p') { cpDress(el, img, cm); return; }
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
           🧩 조각으로 입체 움직이기 (Live2D 처럼)
           - 얼굴 · 눈 · 눈동자 · 입 · 앞머리 · 뒷머리 · 몸… 을 따로 그린 투명 PNG 여러 장(같은 크기 · 같은 위치)을 불러와요
           - 조각마다 그물(메시)을 깔고, '파라미터'(고개 좌우 · 위아래 · 기울기 · 눈 뜨기 · 입 벌리기 · 눈동자)에 맞춰 그물 점을 옮겨요
             · 고개를 돌리면 앞쪽 조각(앞머리 · 눈)은 더 많이, 뒤쪽 조각(뒷머리 · 귀)은 반대로 움직이고 얼굴 가운데가 볼록하게 따라가요 → 입체 느낌
             · 머리카락은 고개를 따라 늦게 따라오며 출렁여요 (용수철)
           - 조각마다 '역할'과 '깊이(앞 + / 뒤 −)'만 정하면 돼요 · 파일 이름으로 역할을 먼저 짐작해요
           - 일기에 붙이면 평범한 그림 요소(지금 모습 PNG) + cm { k:'p', W, H, P 조각들, f 자동 움직임, v 속도, a 세기 } 로 저장돼요
           ===================================================================== */
        const CP_VS = 'attribute vec2 p;attribute vec2 q;uniform vec2 res;varying vec2 uv;void main(){uv=q;gl_Position=vec4(p.x/res.x*2.-1.,1.-p.y/res.y*2.,0.,1.);}';
        const CP_FS = 'precision mediump float;varying vec2 uv;uniform sampler2D img;uniform float al;void main(){gl_FragColor=texture2D(img,uv)*al;}';
        const CP_GX = 12, CP_GY = 12;        // 조각 하나의 그물 칸 수
        const CP_MAX = 20;                   // 조각 최대 장수
        const CP_SIZE = 600;                 // 그림 긴 변 (여백 빼고)
        /* 역할 : [이름, 기본 깊이, 무리(head 머리 · body 몸 · none 고정)] — 줄 순서가 기본 그리는 순서(뒤 → 앞) */
        const CP_ROLES = [
            ['still', '🖼 가만히(배경)', 0, 'none'], ['hairB', '💇 뒷머리', -0.55, 'head'], ['sway', '🎐 흔들리는 것(꼬리 · 리본끈)', 0, 'body'], ['body', '👕 몸 · 옷', 0, 'body'],
            ['ear', '👂 귀', -0.3, 'head'], ['face', '😊 얼굴(피부)', 0, 'head'], ['front', '🌸 볼 · 코', 0.35, 'head'], ['mouth', '👄 입', 0.35, 'head'],
            ['eye', '👀 눈(흰자 · 속눈썹)', 0.4, 'head'], ['pupil', '⚫ 눈동자', 0.45, 'head'], ['brow', '〰 눈썹', 0.45, 'head'], ['hairF', '💇 앞머리 · 옆머리', 0.6, 'head'], ['acc', '🎀 머리 장식', 0.7, 'head']
        ];
        const CP_ROLE = Object.fromEntries(CP_ROLES.map((r, i) => [r[0], { name: r[1], d: r[2], g: r[3], z: i }]));
        const CP_GUESS = [
            ['still', /background|^bg|배경/i], ['pupil', /pupil|iris|눈동자|홍채|동공/i], ['brow', /brow|눈썹/i], ['eye', /eye|눈/i], ['mouth', /mouth|lip|입/i],
            ['hairB', /back.?hair|hair.?back|hair_?b\b|뒷머리|뒤머리|뒷 머리/i], ['hairF', /front.?hair|hair.?front|bang|side.?hair|hair|앞머리|옆머리|머리카락|머리/i],
            ['ear', /(^|[^a-z])ears?([^a-z]|$)|귀/i], ['front', /blush|cheek|nose|볼|코/i], ['face', /face|head|skin|얼굴|피부/i],
            ['acc', /ribbon|bow|acc|hat|crown|리본|모자|장식|핀|왕관/i], ['sway', /tail|wing|꼬리|날개/i], ['body', /body|cloth|torso|arm|몸|옷|상체|팔/i]
        ];
        const cpGuess = name => { const n = String(name || '').replace(/\.[a-z0-9]+$/i, ''); const g = CP_GUESS.find(([, re]) => re.test(n)); return g ? g[0] : 'body'; };
        const CP_FLAGS = [['look', 1, '👀 두리번'], ['blink', 2, '😉 깜빡'], ['breath', 4, '🌬 숨쉬기'], ['talk', 8, '💬 말하기']];
        const CP_PARAMS = [['ax', '↔ 고개 좌우', -1, 1, 0], ['ay', '↕ 고개 위아래', -1, 1, 0], ['az', '↻ 고개 기울기', -1, 1, 0], ['eo', '👀 눈 뜨기', 0, 1, 1], ['mo', '👄 입 벌리기', 0, 1, 0], ['ex', '⚫ 눈동자 좌우', -1, 1, 0]];
        const cpClamp = (v, a, b) => Math.max(a, Math.min(b, v));

        function cpNew(W, H, o) {
            return { pp: true, w: W, h: H, parts: [], geo: null, f: o && o.f != null ? o.f : 7, sp: (o && o.v) || 1, am: (o && o.a) || 1,
                man: null, look: null, hi: null, pokeAt: 0, spr: { x: 0, v: 0, y: 0, w: 0 }, lt: null, gen: 0, ctx: null, t0: performance.now(), born: performance.now(), seen: false, pos: new Float32Array((CP_GX + 1) * (CP_GY + 1) * 2) };
        }
        /* 얼굴 둘레 · 목 · 발 위치 다시 재기 */
        function cpGeo(pl) {
            const box = list => { if (!list.length) return null; let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; list.forEach(P => { x0 = Math.min(x0, P.x); y0 = Math.min(y0, P.y); x1 = Math.max(x1, P.x + P.w); y1 = Math.max(y1, P.y + P.h); }); return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; };
            const live = pl.parts.filter(P => P.role !== 'still');
            const all = box(live.length ? live : pl.parts) || { x: 0, y: 0, w: pl.w, h: pl.h };
            let f = box(pl.parts.filter(P => P.role === 'face'));
            if (!f) f = box(pl.parts.filter(P => CP_ROLE[P.role].g === 'head' && P.role !== 'hairB'));
            if (!f) f = { x: all.x + all.w * .2, y: all.y, w: all.w * .6, h: all.h * .45 };
            const eyes = box(pl.parts.filter(P => P.role === 'eye')) || box(pl.parts.filter(P => P.role === 'pupil'));
            pl.geo = { cx: f.x + f.w / 2, cy: f.y + f.h / 2, R: Math.max(8, f.w / 2), Ry: Math.max(8, f.h / 2), nx: f.x + f.w / 2, ny: f.y + f.h * .92,
                bx: all.x + all.w / 2, by: all.y + all.h, ey: eyes ? eyes.y + eyes.h / 2 : f.y + f.h * .55 };
        }
        /* 지금 순간의 파라미터 (자동 움직임 · 손가락 따라보기 · 직접 움직이기) */
        function cpState(pl, tSec, still) {
            const S = { ax: 0, ay: 0, az: 0, bz: 0, eo: 1, mo: 0, ex: 0, ey: 0, br: 0, hx: 0, hy: 0, jump: 0, T: 0 };
            if (still) return S;
            const A = pl.am, T = S.T = tSec * pl.sp, f = pl.f, now = performance.now();
            if (f & 1) {
                S.ax = (.55 * Math.sin(.53 * T) + .22 * Math.sin(1.31 * T + 1)) * A; S.ay = (.28 * Math.sin(.41 * T + 2) + .12 * Math.sin(1.07 * T)) * A;
                S.az = .25 * Math.sin(.37 * T + .5) * A; S.bz = .3 * Math.sin(.29 * T + 1.3) * A;
            }
            if (f & 2) { const ph = (T * .26) % 1; if (ph > .94) S.eo = Math.abs(Math.cos((ph - .94) / .06 * Math.PI)); }
            if (f & 4) S.br = (Math.sin(T * 1.9) + 1) / 2 * A;
            if (f & 8) S.mo = Math.max(0, Math.sin(T * 10.5)) * (.55 + .45 * Math.sin(T * 2.3)) * .8;
            if (pl.look && now - pl.look.at < 2600) {                          // 👆 만진 쪽을 봐요
                const k = Math.min(1, (2600 - (now - pl.look.at)) / 600);
                S.ax += (pl.look.x - S.ax) * k; S.ay += (pl.look.y - S.ay) * k;
            }
            S.ex = S.ax * .6; S.ey = S.ay * .5;
            if (pl.man) { const m = pl.man; S.ax = m.ax; S.ay = m.ay; S.az = m.az; S.eo = m.eo; S.mo = m.mo; S.ex = m.ex; S.ey = m.ay * .5; }
            S.ax = cpClamp(S.ax, -1, 1); S.ay = cpClamp(S.ay, -1, 1); S.az = cpClamp(S.az, -1, 1);
            if (pl.pokeAt) { const pk = (now - pl.pokeAt) / 1000; if (pk > 1.6) pl.pokeAt = 0; else S.jump = -Math.exp(-pk * 3.5) * Math.abs(Math.sin(pk * 9)) * pl.geo.Ry * .35; }
            /* 💇 머리카락 용수철 : 고개를 늦게 따라와요 */
            const dt = pl.lt == null ? 0 : Math.min(.1, Math.max(0, tSec - pl.lt)); pl.lt = tSec;
            const sp = pl.spr, K = 70, C = 7;
            sp.v += ((S.ax - sp.x) * K - sp.v * C) * dt; sp.x += sp.v * dt;
            sp.w += ((S.ay - sp.y) * K - sp.w * C) * dt; sp.y += sp.w * dt;
            S.hx = (sp.x - S.ax) * pl.geo.R * .45 + Math.sin(T * 1.7) * pl.geo.R * .018 * A;
            S.hy = (sp.y - S.ay) * pl.geo.Ry * .15;
            return S;
        }
        /* 조각 하나의 그물 점 옮기기 */
        function cpDeform(pl, P, S, out) {
            const g = pl.geo, R = CP_ROLE[P.role], role = P.role, d = P.d, k0 = Math.min(1, pl.am);
            const ha = S.az * .2, hc = Math.cos(ha), hs = Math.sin(ha), ba = S.bz * .06, bc = Math.cos(ba), bs = Math.sin(ba), brk = 1 + .014 * S.br;
            const hair = role === 'hairF' || role === 'hairB', mcx = P.x + P.w / 2, mcy = P.y + P.h * .35;
            let k = 0;
            for (let j = 0; j <= CP_GY; j++) for (let i = 0; i <= CP_GX; i++) {
                const x0 = P.x + P.w * i / CP_GX, y0 = P.y + P.h * j / CP_GY;
                let x = x0, y = y0;
                if (R.g !== 'none') {
                    if (R.g === 'head') {
                        const u = (x0 - g.cx) / g.R, v = (y0 - g.cy) / g.Ry;
                        const kb = Math.max(0, 1 - u * u) * Math.max(0, 1 - v * v * .7);
                        const bul = (role === 'face' || role === 'ear' || hair ? .55 : .3) * kb;
                        x += S.ax * g.R * .24 * (d + bul);
                        y += S.ay * g.Ry * .16 * (d + bul);
                        if (role === 'eye' || role === 'pupil') y = g.ey + (y - g.ey) * Math.max(.07, S.eo);
                        if (role === 'pupil') { x += S.ex * g.R * .07; y += S.ey * g.Ry * .04 * S.eo; }
                        if (role === 'brow') y += (1 - S.eo) * g.Ry * .025;
                        if (role === 'mouth') { y = mcy + (y - mcy) * (1 + S.mo * 1.8); x = mcx + (x - mcx) * (1 - S.mo * .12); }
                        if (hair || role === 'acc') {
                            const w = Math.pow(cpClamp((y0 - P.y) / Math.max(1, P.h), 0, 1), 1.6) * (role === 'hairB' ? 1.2 : role === 'acc' ? .4 : .8);
                            x += S.hx * w; y += S.hy * w;
                        }
                        const rx = x - g.nx, ry = y - g.ny; x = g.nx + rx * hc - ry * hs; y = g.ny + rx * hs + ry * hc;      // 고개 기울기 (목이 축)
                    } else if (role === 'sway') {
                        const w = Math.pow(cpClamp((y0 - P.y) / Math.max(1, P.h), 0, 1), 1.5);
                        x += Math.sin(S.T * 2.4 + y0 * .02) * w * Math.max(P.w, P.h) * .07 * k0;
                    } else if (role === 'body') x += S.ax * g.R * .04;
                    y = g.by + (y - g.by) * brk;                                 // 숨쉬기 (발이 축)
                    const rx = x - g.bx, ry = y - g.by; x = g.bx + rx * bc - ry * bs; y = g.by + rx * bs + ry * bc + S.jump;   // 몸 기울기
                }
                out[k++] = x; out[k++] = y;
            }
        }
        function cpDraw(pl, tSec, still) {
            const G = cmvGL(); if (!G || !pl.ctx || !pl.parts.length) return false;
            const gl = G.gl, M = G.m;
            if (!pl.geo) cpGeo(pl);
            gl.useProgram(M.pr);
            gl.disableVertexAttribArray(G.la);
            gl.bindBuffer(gl.ARRAY_BUFFER, M.uv); gl.enableVertexAttribArray(M.lq); gl.vertexAttribPointer(M.lq, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ARRAY_BUFFER, M.pos); gl.enableVertexAttribArray(M.lp); gl.vertexAttribPointer(M.lp, 2, gl.FLOAT, false, 0, 0);
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, M.idx);
            gl.uniform2f(M.res, pl.w, pl.h); gl.uniform1i(M.img, 0);
            gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
            gl.viewport(0, 0, pl.w, pl.h);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            gl.activeTexture(gl.TEXTURE0);
            if (pl.gen !== G.gen) { pl.parts.forEach(P => { P.tex = null; }); pl.gen = G.gen; }
            const S = cpState(pl, tSec, still), now = performance.now();
            const hi = !still && pl.hi && now < pl.hi.until ? pl.hi.P : null;
            pl.parts.forEach(P => {
                if (!P.tex) {
                    P.tex = cmvTex(gl, 0, gl.LINEAR);
                    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, P.cv);
                } else gl.bindTexture(gl.TEXTURE_2D, P.tex);
                cpDeform(pl, P, S, pl.pos);
                gl.bufferSubData(gl.ARRAY_BUFFER, 0, pl.pos);
                gl.uniform1f(M.al, hi && hi !== P ? .25 : 1);
                gl.drawElements(gl.TRIANGLES, M.n, gl.UNSIGNED_SHORT, 0);
            });
            gl.disableVertexAttribArray(M.lp); gl.disableVertexAttribArray(M.lq);
            pl.ctx.clearRect(0, 0, pl.w, pl.h);
            pl.ctx.drawImage(G.cv, 0, CMV_GL - pl.h, pl.w, pl.h, 0, 0, pl.w, pl.h);
            return true;
        }
        /* 그림들 → 조각 : 같은 크기로 맞추고, 투명한 곳은 잘라 위치(x, y)만 기억해요 */
        function cpMake(srcs) {                                              // srcs = [{ im, name, role? }]
            const W0 = Math.max(...srcs.map(s => s.im.naturalWidth || s.im.width)), H0 = Math.max(...srcs.map(s => s.im.naturalHeight || s.im.height));
            const k = Math.min(1, CP_SIZE / Math.max(W0, H0)), cw = Math.max(1, Math.round(W0 * k)), ch = Math.max(1, Math.round(H0 * k));
            const parts = [];
            srcs.forEach((s, n) => {
                const t = document.createElement('canvas'); t.width = cw; t.height = ch;
                const tx = t.getContext('2d', { willReadFrequently: true });
                tx.drawImage(s.im, 0, 0, Math.round((s.im.naturalWidth || s.im.width) * k), Math.round((s.im.naturalHeight || s.im.height) * k));
                const dd = tx.getImageData(0, 0, cw, ch).data;
                let x0 = cw, y0 = ch, x1 = -1, y1 = -1;
                for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (dd[(y * cw + x) * 4 + 3] > 6) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
                if (x1 < x0) return;                                          // 다 투명한 그림은 빼요
                x0 = Math.max(0, x0 - 2); y0 = Math.max(0, y0 - 2); x1 = Math.min(cw - 1, x1 + 2); y1 = Math.min(ch - 1, y1 + 2);
                const w = x1 - x0 + 1, h = y1 - y0 + 1, cv = document.createElement('canvas'); cv.width = w; cv.height = h;
                cv.getContext('2d').drawImage(t, x0, y0, w, h, 0, 0, w, h);
                const role = s.role || cpGuess(s.name);
                parts.push({ cv, x: x0, y: y0, w, h, name: dollText(String(s.name || '조각').replace(/\.[a-z0-9]+$/i, ''), 16) || '조각', role, d: CP_ROLE[role].d, n, tex: null, url: '' });
            });
            if (!parts.length) return null;
            let ux0 = 1e9, uy0 = 1e9, ux1 = -1e9, uy1 = -1e9;
            parts.forEach(P => { ux0 = Math.min(ux0, P.x); uy0 = Math.min(uy0, P.y); ux1 = Math.max(ux1, P.x + P.w); uy1 = Math.max(uy1, P.y + P.h); });
            const pad = Math.round(Math.max(ux1 - ux0, uy1 - uy0) * .14);
            parts.forEach(P => { P.x += pad - ux0; P.y += pad - uy0; });
            parts.sort((a, b) => CP_ROLE[a.role].z - CP_ROLE[b.role].z || a.n - b.n);
            return { parts, W: ux1 - ux0 + pad * 2, H: uy1 - uy0 + pad * 2 };
        }
        /* 🧸 연습용 캐릭터 (조각 그림이 없어도 해 볼 수 있게 직접 그려요) */
        function cpSampleSrcs() {
            const W = 420, H = 560, out = [];
            const layer = (name, role, f) => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.lineJoin = x.lineCap = 'round'; f(x); out.push({ im: c, name, role }); };
            const ell = (x, cx, cy, rx, ry) => { x.beginPath(); x.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); };
            const HAIR = '#8a5a44', HL = '#5e3a2c', SKIN = '#ffe3d3', SL = '#d9a48f';
            layer('뒷머리', 'hairB', x => {
                x.fillStyle = HAIR; x.strokeStyle = HL; x.lineWidth = 4;
                x.beginPath(); x.moveTo(92, 190); x.bezierCurveTo(80, 60, 340, 60, 328, 190); x.bezierCurveTo(340, 280, 350, 360, 330, 420);
                x.quadraticCurveTo(300, 440, 280, 410); x.quadraticCurveTo(250, 440, 220, 415); x.lineTo(200, 415); x.quadraticCurveTo(170, 440, 140, 410); x.quadraticCurveTo(120, 440, 90, 420); x.bezierCurveTo(70, 360, 80, 280, 92, 190); x.closePath(); x.fill(); x.stroke();
            });
            layer('몸', 'body', x => {
                x.fillStyle = SKIN; x.strokeStyle = SL; x.lineWidth = 3;
                x.fillRect(196, 270, 28, 44); x.strokeRect(196, 270, 28, 44);
                [[-1], [1]].forEach(([s]) => { x.beginPath(); x.moveTo(210 + s * 55, 318); x.quadraticCurveTo(210 + s * 82, 380, 210 + s * 88, 450); x.lineTo(210 + s * 70, 452); x.quadraticCurveTo(210 + s * 62, 390, 210 + s * 42, 340); x.closePath(); x.fill(); x.stroke(); });
                x.fillStyle = '#ffb3c7'; x.strokeStyle = '#d07a92'; x.lineWidth = 4;
                x.beginPath(); x.moveTo(160, 305); x.quadraticCurveTo(210, 296, 260, 305); x.lineTo(278, 360); x.lineTo(262, 372); x.lineTo(268, 520); x.quadraticCurveTo(210, 540, 152, 520); x.lineTo(158, 372); x.lineTo(142, 360); x.closePath(); x.fill(); x.stroke();
                x.fillStyle = '#fff'; x.beginPath(); x.moveTo(186, 302); x.lineTo(210, 330); x.lineTo(234, 302); x.closePath(); x.fill(); x.stroke();
            });
            layer('귀', 'ear', x => { x.fillStyle = SKIN; x.strokeStyle = SL; x.lineWidth = 3; [108, 312].forEach(cx => { ell(x, cx, 205, 16, 24); x.fill(); x.stroke(); }); });
            layer('얼굴', 'face', x => {
                x.fillStyle = SKIN; x.strokeStyle = SL; x.lineWidth = 3;
                x.beginPath(); x.moveTo(112, 170); x.bezierCurveTo(112, 70, 308, 70, 308, 170); x.bezierCurveTo(310, 240, 270, 290, 210, 292); x.bezierCurveTo(150, 290, 110, 240, 112, 170); x.closePath(); x.fill(); x.stroke();
            });
            layer('볼', 'front', x => { x.fillStyle = 'rgba(255,140,170,.45)'; [[155, 240], [265, 240]].forEach(([cx, cy]) => { ell(x, cx, cy, 20, 11); x.fill(); }); });
            layer('입', 'mouth', x => { x.fillStyle = '#c9566a'; x.strokeStyle = '#8f3346'; x.lineWidth = 2; ell(x, 210, 258, 10, 3.5); x.fill(); x.stroke(); });
            layer('눈', 'eye', x => {
                [168, 252].forEach(cx => {
                    x.fillStyle = '#fff'; x.strokeStyle = '#5a3a32'; x.lineWidth = 3; ell(x, cx, 210, 22, 27); x.fill(); x.stroke();
                    x.lineWidth = 6; x.beginPath(); x.ellipse(cx, 210, 24, 29, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
                });
            });
            layer('눈동자', 'pupil', x => {
                [168, 252].forEach(cx => {
                    x.fillStyle = '#7a4630'; ell(x, cx, 214, 14, 19); x.fill();
                    x.fillStyle = '#3d1f14'; ell(x, cx, 216, 7, 10); x.fill();
                    x.fillStyle = '#fff'; ell(x, cx - 5, 205, 5, 6); x.fill(); ell(x, cx + 5, 224, 2.5, 2.5); x.fill();
                });
            });
            layer('눈썹', 'brow', x => { x.strokeStyle = HL; x.lineWidth = 5; [[150, 186], [234, 270]].forEach(([a, b]) => { x.beginPath(); x.moveTo(a, 168); x.quadraticCurveTo((a + b) / 2, 160, b, 168); x.stroke(); }); });
            layer('앞머리', 'hairF', x => {
                x.fillStyle = HAIR; x.strokeStyle = HL; x.lineWidth = 4;
                x.beginPath(); x.moveTo(100, 200); x.bezierCurveTo(88, 70, 332, 70, 320, 200);
                x.lineTo(306, 230); x.lineTo(296, 160); x.lineTo(272, 178); x.lineTo(258, 140); x.lineTo(232, 172); x.lineTo(214, 132); x.lineTo(192, 172); x.lineTo(166, 140); x.lineTo(150, 178); x.lineTo(124, 160); x.lineTo(114, 232); x.closePath(); x.fill(); x.stroke();
                x.strokeStyle = 'rgba(255,255,255,.35)'; x.lineWidth = 6; x.beginPath(); x.arc(210, 170, 80, Math.PI * 1.15, Math.PI * 1.45); x.stroke();
            });
            layer('리본', 'acc', x => {
                x.fillStyle = '#ff6b8f'; x.strokeStyle = '#c94467'; x.lineWidth = 3;
                x.beginPath(); x.moveTo(290, 100); x.lineTo(256, 78); x.lineTo(262, 120); x.closePath(); x.moveTo(290, 100); x.lineTo(326, 80); x.lineTo(320, 124); x.closePath(); x.fill(); x.stroke();
                ell(x, 290, 100, 9, 8); x.fill(); x.stroke();
            });
            return out;
        }
        /* 지금 모습(가만히 있는 모습) PNG */
        function cpSnapshot(pl) {
            const c = document.createElement('canvas'); c.width = pl.w; c.height = pl.h;
            const keep = pl.ctx; pl.ctx = c.getContext('2d');
            cpDraw(pl, 0, true); pl.ctx = keep;
            return c;
        }
        function cpParams(pl) {
            return { k: 'p', W: pl.w, H: pl.h, f: pl.f, v: Math.round(pl.sp * 10) / 10, a: Math.round(pl.am * 10) / 10,
                P: pl.parts.map(P => ({ s: P.url || (P.url = P.cv.toDataURL('image/png')), x: Math.round(P.x), y: Math.round(P.y), r: P.role, d: Math.round(P.d * 20) / 20 })) };
        }
        function cpCleanP(cm, n) {
            const W = Math.round(n(cm.W, 16, CMV_GL, 0)), H = Math.round(n(cm.H, 16, CMV_GL, 0));
            if (!W || !H) return null;
            const P = (Array.isArray(cm.P) ? cm.P : []).slice(0, CP_MAX)
                .filter(q => q && typeof q.s === 'string' && q.s.length < 4e6 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(q.s))
                .map(q => ({ s: q.s, x: Math.round(n(q.x, -W, W, 0)), y: Math.round(n(q.y, -H, H, 0)), r: CP_ROLE[q.r] ? q.r : 'still', d: Math.round(cpClamp(parseFloat(q.d) || 0, -1, 1) * 20) / 20 }));
            if (!P.length) return null;
            return { k: 'p', W, H, P, f: Math.round(n(cm.f, 0, 15, 7)), v: n(cm.v, .5, 2, 1), a: n(cm.a, .4, 1.8, 1) };
        }
        /* 📔 일기 안의 조각 캐릭터 */
        async function cpDress(el, img, cm) {
            let ims;
            try { ims = await Promise.all(cm.P.map(q => loadImg(q.s))); } catch (e) { return; }
            const go = () => {
                if (!img.naturalWidth || el.querySelector('canvas.cmv-live')) return;
                const pl = cpNew(cm.W, cm.H, cm);
                pl.parts = cm.P.map((q, i) => {
                    const cv = document.createElement('canvas'); cv.width = ims[i].naturalWidth; cv.height = ims[i].naturalHeight;
                    cv.getContext('2d').drawImage(ims[i], 0, 0);
                    return { cv, x: q.x, y: q.y, w: cv.width, h: cv.height, role: q.r, d: q.d, tex: null, url: q.s };
                });
                cpGeo(pl);
                const cv = document.createElement('canvas'); cv.className = 'cmv-live'; cv.width = pl.w; cv.height = pl.h;
                pl.ctx = cv.getContext('2d');
                el.appendChild(cv); img.style.opacity = 0;
                el.addEventListener('pointerdown', e => {                     // 👆 일기에서 만지면 그쪽을 보고 콩!
                    const r = cv.getBoundingClientRect(); if (!r.width) return;
                    cpLookAt(pl, (e.clientX - r.left) / r.width * pl.w, (e.clientY - r.top) / r.height * pl.h);
                });
                cmvLive.add(pl); cmvKick();
            };
            if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
        }
        function cpLookAt(pl, x, y) {
            if (!pl.geo) cpGeo(pl);
            const g = pl.geo;
            pl.look = { x: cpClamp((x - g.cx) / (g.R * 2.2), -1, 1), y: cpClamp((y - g.cy) / (g.Ry * 2.6), -1, 1), at: performance.now() };
        }

        /* =====================================================================
           🪄 캐릭터 움직이기 창
           ===================================================================== */
        const CMV = { built: false, pl: null, pad: null, tool: 'sway', brush: 7, show: true, undo: [], painting: false, last: null, dirty: false, mode: 'paint', pp: null, ppDirty: false };

        function cmvBuild() {
            if (CMV.built) return;
            CMV.built = true;
            const wrap = document.createElement('div');
            wrap.innerHTML = `
            <div class="modal" id="charMove">
              <div class="modal-content cmv-box">
                <div class="modal-title">🪄 캐릭터 움직이기</div>
                <div class="dmv-tabs" id="cmvModes">
                  <button type="button" class="dmv-tab" data-cmvmode="paint">🖌 칠해서 움직이기</button>
                  <button type="button" class="dmv-tab" data-cmvmode="parts">🧩 조각으로 입체</button>
                </div>
                <div id="cmvPaint">
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
                </div>
                <div id="cpPane" style="display:none">
                  <div id="cpStart">
                    <p class="cmv-tip">얼굴 · 눈 · 눈동자 · 입 · 앞머리 · 뒷머리 · 몸을 <b>따로 그린 투명 PNG 여러 장</b>을 한꺼번에 골라 주세요.<br>모두 <b>같은 크기 · 같은 위치</b>로 저장한 그림이어야 해요 (그림 앱의 레이어를 한 장씩 내보내기).</p>
                    <button class="btn btn-primary" type="button" id="cpLoad" style="width:100%;justify-content:center;">📂 조각 그림 여러 장 불러오기</button>
                    <button class="btn" type="button" id="cpSample" style="width:100%;justify-content:center;margin-top:8px;">🧸 연습용 캐릭터로 해 보기</button>
                    <p class="cmv-note">파일 이름에 '눈 · 눈동자 · 입 · 앞머리 · 뒷머리 · 얼굴 · 몸'(또는 eye · pupil · mouth · hair_front · hair_back · face · body)이 들어 있으면 역할을 알아서 맞춰요.</p>
                  </div>
                  <input type="file" id="cpFile" accept="image/png,image/webp,image/*" multiple style="display:none">
                  <div id="cpEdit" style="display:none">
                    <div class="cmv-main">
                      <div class="cp-stagewrap"><div class="cmv-stage cp-stage" id="cpStage"><canvas id="cpView"></canvas></div></div>
                      <div class="cmv-ctl">
                        <p class="cmv-note cp-how">👆 그림을 만지면 그쪽을 쳐다보고 콩 뛰어요.</p>
                        <div class="cmv-grp"><h4>자동 움직임</h4><div class="cmv-chips" id="cpFlags"></div></div>
                        <div class="cmv-grp"><h4>속도</h4><div class="cmv-range"><small>느리게</small><input type="range" id="cpSp" min="0.5" max="2" step="0.1"><small>빠르게</small></div></div>
                        <div class="cmv-grp"><h4>세기</h4><div class="cmv-range"><small>살짝</small><input type="range" id="cpAm" min="0.4" max="1.8" step="0.1"><small>크게</small></div></div>
                        <div class="cmv-grp"><h4>🎚 직접 움직여 보기 <small id="cpManNote"></small></h4><div id="cpParams"></div>
                          <button type="button" class="cmv-chip" id="cpAuto" style="margin-top:4px">▶ 다시 자동으로</button></div>
                        <div class="cmv-grp"><h4>🧩 조각 <small id="cpCount"></small></h4>
                          <p class="cmv-note" style="margin:0 0 6px">위에 있을수록 앞에 그려져요. 역할을 맞게 골라 주고, 깊이로 입체감을 맞춰요 (＋ 앞으로 · − 뒤로).</p>
                          <div id="cpParts"></div></div>
                      </div>
                    </div>
                    <div class="cmv-btns">
                      <button class="btn btn-primary" type="button" id="cpAttach">📔 일기에 붙이기</button>
                      <button class="btn" type="button" id="cpPng">📷 지금 모습 저장</button>
                      <button class="btn" type="button" id="cpOther">📂 다른 조각들</button>
                    </div>
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
            /* 🧩 조각으로 입체 */
            $('cmvModes').addEventListener('click', e => { const b = e.target.closest('[data-cmvmode]'); if (b) cmvMode(b.dataset.cmvmode); });
            $('cpLoad').onclick = $('cpOther').onclick = () => $('cpFile').click();
            $('cpFile').onchange = e => { const fs = [...(e.target.files || [])]; e.target.value = ''; if (fs.length) cpOpenFiles(fs); };
            $('cpSample').onclick = () => cpStart(cpSampleSrcs());
            $('cpFlags').innerHTML = CP_FLAGS.map(([id, bit, l]) => `<label class="cmv-chip"><input type="checkbox" data-cpf="${bit}"> ${l}</label>`).join('');
            $('cpFlags').addEventListener('change', e => { const c = e.target.closest('[data-cpf]'); if (!c || !CMV.pp) return; CMV.pp.f = c.checked ? CMV.pp.f | +c.dataset.cpf : CMV.pp.f & ~+c.dataset.cpf; CMV.ppDirty = true; });
            $('cpSp').oninput = e => { if (CMV.pp) { CMV.pp.sp = +e.target.value; CMV.ppDirty = true; } };
            $('cpAm').oninput = e => { if (CMV.pp) { CMV.pp.am = +e.target.value; CMV.ppDirty = true; } };
            $('cpParams').innerHTML = CP_PARAMS.map(([id, l, lo, hi]) => `<div class="dmv-sl"><label>${l}</label><input type="range" data-cpp="${id}" min="${lo}" max="${hi}" step="0.01"><output data-cpo="${id}"></output></div>`).join('');
            $('cpParams').addEventListener('input', e => {
                const r = e.target.closest('[data-cpp]'); if (!r || !CMV.pp) return;
                if (!CMV.pp.man) CMV.pp.man = Object.fromEntries(CP_PARAMS.map(([id, , , , df]) => [id, df]));
                CMV.pp.man[r.dataset.cpp] = parseFloat(r.value); cpSyncParams();
            });
            $('cpAuto').onclick = () => { if (CMV.pp) { CMV.pp.man = null; cpSyncParams(); } };
            $('cpParts').addEventListener('click', cpPartClick);
            $('cpParts').addEventListener('change', cpPartInput);
            $('cpParts').addEventListener('input', cpPartInput);
            $('cpAttach').onclick = cpAttach;
            $('cpPng').onclick = () => { const v = $('cpView'); if (CMV.pp && v) v.toBlob(b => { if (b) downloadBlob(b, `캐릭터_${dollStamp()}.png`); }, 'image/png'); };
            const cpv = $('cpView');
            cpv.addEventListener('pointerdown', e => { if (!CMV.pp) return; const p = cpPt(e); cpLookAt(CMV.pp, p[0], p[1]); CMV.pp.pokeAt = performance.now(); });
            cpv.addEventListener('pointermove', e => { if (!CMV.pp || (e.pointerType !== 'mouse' && !e.buttons)) return; const p = cpPt(e); cpLookAt(CMV.pp, p[0], p[1]); });
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
            if (!CMV.pp) { document.getElementById('cpStart').style.display = ''; document.getElementById('cpEdit').style.display = 'none'; }
            cmvMode(CMV.mode);
        }
        function cmvMode(m) {
            CMV.mode = m;
            document.querySelectorAll('#cmvModes [data-cmvmode]').forEach(b => b.classList.toggle('on', b.dataset.cmvmode === m));
            document.getElementById('cmvPaint').style.display = m === 'paint' ? '' : 'none';
            document.getElementById('cpPane').style.display = m === 'parts' ? '' : 'none';
            cmvKick();
        }
        async function closeCharMove() {
            if (((CMV.pl && CMV.dirty) || (CMV.pp && CMV.ppDirty)) && !(await showMsg('만들어 둔 움직임이 사라져요.<br>그래도 닫을까요?<br><span style="font-size:12px;color:#777;">📔 일기에 붙이면 움직임이 그대로 저장돼요.</span>', true))) return;
            if (CMV.pl) cmvFree(CMV.pl);
            if (CMV.pp) cmvFree(CMV.pp);
            CMV.pl = null; CMV.pad = null; CMV.undo = []; CMV.dirty = false; CMV.pp = null; CMV.ppDirty = false;
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

        /* ---------- 🧩 조각 편집 ---------- */
        async function cpOpenFiles(files) {
            const imgs = files.filter(f => /^image\//.test(f.type));
            if (!imgs.length) { showMsg('이미지 파일(PNG)을 골라 주세요.'); return; }
            if (imgs.length > CP_MAX) showMsg(`조각은 ${CP_MAX}장까지 쓸 수 있어요.<br>앞의 ${CP_MAX}장만 불러올게요.`);
            const srcs = [];
            for (const f of imgs.slice(0, CP_MAX)) {
                const url = URL.createObjectURL(f);
                try { srcs.push({ im: await loadImg(url), name: f.name }); } catch (e) {}
                URL.revokeObjectURL(url);
            }
            if (!srcs.length) { showMsg('⚠ 그림을 열지 못했어요.<br>다른 파일로 해 주세요.'); return; }
            if (!cpStart(srcs)) return;
            if (srcs.length === 1) showMsg('조각이 한 장뿐이에요.<br><span style="font-size:12px;color:#777;">한 장짜리 그림은 🖌 칠해서 움직이기가 더 잘 어울려요. 입체로 움직이려면 부위별로 나눈 그림 여러 장이 필요해요.</span>');
        }
        function cpStart(srcs) {
            const mk = cpMake(srcs);
            if (!mk) { showMsg('그림이 모두 투명해서 쓸 수 있는 조각이 없어요.'); return false; }
            if (CMV.pp) cmvFree(CMV.pp);
            const pl = CMV.pp = cpNew(mk.W, mk.H, { f: 7, v: 1, a: 1 });
            pl.parts = mk.parts; cpGeo(pl);
            const v = document.getElementById('cpView'); v.width = mk.W; v.height = mk.H;
            pl.ctx = v.getContext('2d');
            document.getElementById('cpStage').style.setProperty('--cmv-ar', (mk.W / mk.H).toFixed(4));
            document.getElementById('cpStart').style.display = 'none'; document.getElementById('cpEdit').style.display = '';
            document.getElementById('cpSp').value = 1; document.getElementById('cpAm').value = 1;
            document.querySelectorAll('#cpFlags [data-cpf]').forEach(c => { c.checked = !!(pl.f & +c.dataset.cpf); });
            CMV.ppDirty = true;
            cpSyncParams(); cpRenderParts();
            cmvLive.add(pl); cmvKick();
            return true;
        }
        function cpPt(e) { const r = e.currentTarget.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * CMV.pp.w, (e.clientY - r.top) / r.height * CMV.pp.h]; }
        function cpSyncParams() {
            const pl = CMV.pp; if (!pl) return;
            const m = pl.man || Object.fromEntries(CP_PARAMS.map(([id, , , , df]) => [id, df]));
            CP_PARAMS.forEach(([id]) => {
                const r = document.querySelector(`#cpParams [data-cpp="${id}"]`); if (r && !pl.man) r.value = m[id];
                const o = document.querySelector(`#cpParams [data-cpo="${id}"]`); if (o) o.textContent = (+m[id]).toFixed(2);
            });
            document.getElementById('cpManNote').textContent = pl.man ? '— 지금은 손으로 움직이는 중' : '— 만지면 자동 움직임이 멈춰요';
            document.getElementById('cpAuto').style.display = pl.man ? '' : 'none';
        }
        function cpRenderParts() {
            const pl = CMV.pp; if (!pl) return;
            document.getElementById('cpCount').textContent = `${pl.parts.length}장`;
            const opts = CP_ROLES.map(r => `<option value="${r[0]}">${r[1]}</option>`).join('');
            const box = document.getElementById('cpParts'); box.innerHTML = '';
            pl.parts.slice().reverse().forEach(P => {
                const i = pl.parts.indexOf(P), row = document.createElement('div');
                row.className = 'cp-part'; row.dataset.cpi = i;
                const th = document.createElement('canvas'); const k = 40 / Math.max(P.w, P.h); th.width = Math.max(1, Math.round(P.w * k)); th.height = Math.max(1, Math.round(P.h * k));
                th.getContext('2d').drawImage(P.cv, 0, 0, th.width, th.height); th.className = 'cp-thumb'; th.dataset.cph = 1;
                row.appendChild(th);
                const mid = document.createElement('div'); mid.className = 'cp-pmid';
                mid.innerHTML = `<div class="cp-pname" data-cph="1"></div><select data-cpr="1">${opts}</select><div class="cmv-range"><small>뒤</small><input type="range" data-cpd="1" min="-1" max="1" step="0.05"><small>앞</small></div>`;
                mid.querySelector('.cp-pname').textContent = P.name || '조각';
                mid.querySelector('select').value = P.role; mid.querySelector('input').value = P.d;
                row.appendChild(mid);
                const bt = document.createElement('div'); bt.className = 'cp-pbtn';
                bt.innerHTML = '<button type="button" data-cpm="1" title="앞으로">▲</button><button type="button" data-cpm="-1" title="뒤로">▼</button><button type="button" data-cpx="1" title="빼기">✕</button>';
                row.appendChild(bt);
                box.appendChild(row);
            });
        }
        function cpRow(e) { const r = e.target.closest('[data-cpi]'); return r && CMV.pp ? CMV.pp.parts[+r.dataset.cpi] : null; }
        async function cpPartClick(e) {
            const P = cpRow(e), pl = CMV.pp; if (!P) return;
            if (e.target.closest('[data-cph]')) { pl.hi = { P, until: performance.now() + 1400 }; return; }     // 어느 조각인지 반짝 보여주기
            const mv = e.target.closest('[data-cpm]');
            if (mv) {
                const i = pl.parts.indexOf(P), j = i + +mv.dataset.cpm;
                if (j < 0 || j >= pl.parts.length) return;
                pl.parts[i] = pl.parts[j]; pl.parts[j] = P; CMV.ppDirty = true; cpRenderParts(); pl.hi = { P, until: performance.now() + 900 }; return;
            }
            if (e.target.closest('[data-cpx]')) {
                if (pl.parts.length <= 1) { showMsg('조각이 하나는 있어야 해요.'); return; }
                if (!(await showMsg(`'${P.name}' 조각을 뺄까요?`, true))) return;
                cmvFree(pl); pl.parts.splice(pl.parts.indexOf(P), 1); cpGeo(pl); cmvLive.add(pl); cmvKick();
                CMV.ppDirty = true; cpRenderParts();
            }
        }
        function cpPartInput(e) {
            const P = cpRow(e), pl = CMV.pp; if (!P) return;
            if (e.target.matches('[data-cpr]') && e.type === 'change') { P.role = e.target.value; P.d = CP_ROLE[P.role].d; cpGeo(pl); cpRenderParts(); pl.hi = { P, until: performance.now() + 900 }; }
            else if (e.target.matches('[data-cpd]')) P.d = parseFloat(e.target.value);
            else return;
            CMV.ppDirty = true;
        }
        async function cpAttach() {
            const pl = CMV.pp; if (!pl) return;
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">표지를 넘긴 뒤 다시 붙여 주세요.</span>'); return; }
            const el = createElementFromData({ type: 'image', content: cpSnapshot(pl).toDataURL('image/png'), cm: cpParams(pl), ts: 1, width: '170px', posX: 80, posY: 60, scale: 1, rotation: 0, zIndex: zIndexCounter }, true);
            document.getElementById('canvasArea').appendChild(el);
            selectElement(el);
            saveData(false);
            CMV.ppDirty = false;
            closeCharMove();
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
