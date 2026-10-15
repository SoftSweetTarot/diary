/* 말랑달콤 다이어리 - js/glrun.js
   ✨ 공용 셰이더 실행기 : 페이지 위에서 움직이는 WebGL 그림을 모두 이 실행기 하나가 돌려요 (도련 · 2026-10-15)
   - WebGL 은 화면 밖에 딱 하나 → 🪄 캐릭터 움직이기(js/char-move.js) · ✨ 셰이더 스티커가 같이 써요 (여러 장 붙여도 WebGL 개수 제한에 안 걸려요)
   - 움직이는 것들은 한 번에 초당 약 30번 그려요 · 안 보이는 곳(닫힌 창 · 다른 쪽 · 백그라운드 탭)은 쉬어요 · '동작 줄이기' 설정이면 멈춘 모습
   - WebGL 이 없거나 셰이더가 안 되면 → 그림 그대로(멈춘 모습) 보여요 · 데이터는 그대로 지켜요

   ✨ 셰이더 스티커 (아직 페이지에 넣는 곳은 없어요 · 실행기만 미리 준비)
   - 일기에 붙인 셰이더 스티커 = 평범한 그림 요소(image) + 데이터 sh { f 효과 이름 | g 직접 쓴 GLSL , v 속도 , a 세기 }
       → 위에 움직이는 캔버스(canvas.gl-live)를 겹쳐요 · 그림은 그대로 남아 있어서 PNG 저장 · 다른 기기에서도 안전해요
   - 🔒 데이터에는 GLSL 글자만 담겨요 : GLSL 은 그래픽 카드에서만 도는 그림 언어라 JS 로는 절대 실행하지 않아요 (실행기는 이 파일 안에만)
   - 효과 GLSL 약속 : vec4 fx(vec4 c, vec2 uv) 하나만 쓰면 돼요
       c = 그 자리 그림 색(알파 곱한 색) · uv = 0~1 자리 · 쓸 수 있는 값 : img(그림) · t(초) · amp(세기) · res(그림 크기 px)
   - 효과를 늘리려면 GLR_FX 에 한 줄 (이름: GLSL)
   ※ 파일 불러오는 순서: … → elements → … → glrun → char-move → service */

        const GLR_SIZE = 1024;                                              // 공용 WebGL 그림판 크기 (그림 긴 변은 이보다 작게)
        const GLR_STK = 640;                                                // 셰이더 스티커 그림 긴 변
        const GLR_GLSL_MAX = 6000;                                          // 직접 쓴 GLSL 글자 수 한도
        const GLR_VS = 'attribute vec2 a;varying vec2 uv;void main(){uv=vec2(a.x*.5+.5,.5-a.y*.5);gl_Position=vec4(a,0.,1.);}';
        const GLR_HEAD = 'precision mediump float;varying vec2 uv;uniform sampler2D img;uniform float t,amp;uniform vec2 res;\n';
        const GLR_MAIN = '\nvoid main(){vec4 c=texture2D(img,uv);gl_FragColor=fx(c,uv);}';

        /* ✨ 효과 모음 (이름 : GLSL) */
        const GLR_FX = {
            holo: `vec3 hsv(float h){return clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);}
vec4 fx(vec4 c,vec2 uv){
  float k=uv.x*.9+uv.y*.6+t*.18;
  vec3 rb=hsv(fract(k));
  float band=.5+.5*sin((uv.x-uv.y)*9.+t*1.6);
  return vec4(mix(c.rgb,c.rgb*.55+rb*c.a*.6,.35*amp*band),c.a);
}`,
            shine: `vec4 fx(vec4 c,vec2 uv){
  float p=fract(t*.32)*2.2-.6;
  float d=abs((uv.x+uv.y*.55)-p*1.55);
  float g=smoothstep(.09,0.,d)*.75*amp;
  return vec4(c.rgb+vec3(g)*c.a,c.a);
}`,
            glitter: `float h2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec4 fx(vec4 c,vec2 uv){
  vec2 g=floor(uv*res/6.);
  float r=h2(g);
  float tw=pow(max(0.,sin(t*(2.+r*3.)+r*40.)),18.);
  float s=step(.82,r)*tw*amp;
  return vec4(c.rgb+vec3(s)*c.a,c.a);
}`,
            wave: `vec4 fx(vec4 c,vec2 uv){
  vec2 p=uv+vec2(sin(uv.y*10.+t*2.4),cos(uv.x*9.+t*2.))*.008*amp;
  return texture2D(img,p);
}`
        };

        /* =====================================================================
           🎨 공용 WebGL (화면 밖 · 한 개) : glrGL() → { cv, gl, buf, gen, progs } · 못 만들면 null
           ===================================================================== */
        let glrG = null, glrGen = 0;                                        // null = 아직 · false = 못 만듦
        function glrGL() {
            if (glrG && glrG.gl.isContextLost()) glrG = null;
            if (glrG !== null) return glrG || null;
            try {
                const cv = document.createElement('canvas'); cv.width = cv.height = GLR_SIZE;
                const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
                if (!gl) { glrG = false; return null; }
                const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
                gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
                gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ZERO);
                cv.addEventListener('webglcontextlost', e => { e.preventDefault(); glrG = null; });
                glrG = { cv, gl, buf, gen: ++glrGen, progs: {} };
            } catch (e) { console.warn('셰이더 실행기: WebGL 을 쓸 수 없어요', e); glrG = false; }
            return glrG || null;
        }
        /* 셰이더 묶음 만들기 (이름마다 한 번 · WebGL 을 다시 만들면 다시) → { pr, u(이름) } · 안 되면 null */
        function glrShader(gl, type, src) {
            const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
            if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const m = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(m); }
            return s;
        }
        function glrProg(G, key, vs, fs) {
            if (key in G.progs) return G.progs[key];
            const gl = G.gl;
            try {
                const pr = gl.createProgram();
                gl.attachShader(pr, glrShader(gl, gl.VERTEX_SHADER, vs)); gl.attachShader(pr, glrShader(gl, gl.FRAGMENT_SHADER, fs));
                gl.linkProgram(pr);
                if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
                const loc = {};
                G.progs[key] = { pr, la: gl.getAttribLocation(pr, 'a'), u: n => (n in loc ? loc[n] : (loc[n] = gl.getUniformLocation(pr, n))) };
            } catch (e) { console.warn('셰이더 실행기: 셰이더를 만들 수 없어요 (' + key + ')', e); G.progs[key] = null; }
            return G.progs[key];
        }
        /* 네모 한 장(화면 가득) 깔기 : 'a' 자리에 */
        function glrQuad(G, la) {
            const gl = G.gl;
            for (let i = 0; i < 4; i++) if (i !== la) gl.disableVertexAttribArray(i);   // 다른 셰이더가 켜 둔 자리는 꺼요
            gl.bindBuffer(gl.ARRAY_BUFFER, G.buf); gl.enableVertexAttribArray(la); gl.vertexAttribPointer(la, 2, gl.FLOAT, false, 0, 0);
        }
        function glrTex(gl, unit, filter) {
            const tx = gl.createTexture();
            gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, tx);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            return tx;
        }
        /* 그린 것(왼쪽 아래 w × h)을 그 그림의 캔버스로 옮겨요 */
        function glrBlit(G, ctx, w, h) {
            ctx.clearRect(0, 0, w, h);
            ctx.drawImage(G.cv, 0, GLR_SIZE - h, w, h, 0, 0, w, h);
        }

        /* =====================================================================
           ▶ 살아 움직이게 : 움직이는 것 하나 = { ctx(겹친 캔버스 2d), t0, born, seen, draw(초), free() }
           ===================================================================== */
        const glrLive = new Set();
        let glrRaf = 0, glrLastT = 0;
        const glrStill = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
        function glrTick(now) {
            glrRaf = 0;
            if (now - glrLastT >= 30) {
                glrLastT = now;
                glrLive.forEach(it => {
                    const cv = it.ctx && it.ctx.canvas;
                    if (!cv || !cv.isConnected) { if (it.seen || now - it.born > 6000) { glrLive.delete(it); it.free(); } return; }   // 페이지에서 빠졌으면 메모리 돌려주기
                    it.seen = true;
                    if (cv.offsetParent === null) return;                    // 안 보이는 곳은 쉬어요
                    it.draw(glrStill() ? 0 : (now - it.t0) / 1000);
                });
            }
            if (glrLive.size && !document.hidden) glrRaf = requestAnimationFrame(glrTick);
        }
        function glrKick() { if (!glrRaf && glrLive.size) glrRaf = requestAnimationFrame(glrTick); }
        function glrAdd(it) { glrLive.add(it); glrKick(); }
        function glrDel(it) { glrLive.delete(it); }
        document.addEventListener('visibilitychange', glrKick);

        /* =====================================================================
           ✨ 셰이더 스티커
           ===================================================================== */
        /* 일기 파일 · 다른 곳에서 온 sh 는 정해진 값만 통과 (GLSL 은 글자로만 · 실행은 그래픽 카드에서만) */
        function glrClean(sh) {
            if (!sh || typeof sh !== 'object') return null;
            const n = (v, lo, hi, d) => { v = parseFloat(v); return isNaN(v) ? d : Math.max(lo, Math.min(hi, Math.round(v * 10) / 10)); };
            const out = { v: n(sh.v, .2, 3, 1), a: n(sh.a, 0, 2, 1) };
            if (typeof sh.f === 'string' && Object.prototype.hasOwnProperty.call(GLR_FX, sh.f)) out.f = sh.f;
            else if (typeof sh.g === 'string' && sh.g.length <= GLR_GLSL_MAX && /\bfx\s*\(/.test(sh.g) && !/[^\x09\x0a\x0d\x20-\x7e]/.test(sh.g)) out.g = sh.g;
            else return null;
            return out;
        }
        function glrStkDraw(s, tSec) {
            const G = glrGL(); if (!G || !s.ctx) return false;
            const key = s.sh.f ? 'fx:' + s.sh.f : 'g:' + s.sh.g;
            const P = glrProg(G, key, GLR_VS, GLR_HEAD + (s.sh.f ? GLR_FX[s.sh.f] : s.sh.g) + GLR_MAIN);
            if (!P) { glrStkStop(s); return false; }                       // 셰이더가 안 되면 그림 그대로
            const gl = G.gl;
            gl.useProgram(P.pr); glrQuad(G, P.la);
            gl.blendFunc(gl.ONE, gl.ZERO);
            if (s.gen !== G.gen) {                                          // 처음 · WebGL 을 다시 만들었을 때만 그림 올리기
                s.tex = glrTex(gl, 0, gl.LINEAR);
                gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, s.src);
                s.gen = G.gen;
            }
            gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, s.tex);
            gl.uniform1i(P.u('img'), 0); gl.uniform1f(P.u('t'), tSec * s.sh.v); gl.uniform1f(P.u('amp'), s.sh.a); gl.uniform2f(P.u('res'), s.w, s.h);
            gl.viewport(0, 0, s.w, s.h);
            gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
            glrBlit(G, s.ctx, s.w, s.h);
            return true;
        }
        function glrStkFree(s) {
            try { if (glrG && s.tex && s.gen === glrG.gen) glrG.gl.deleteTexture(s.tex); } catch (e) {}
            s.tex = null; s.gen = 0;
        }
        function glrStkStop(s) {                                            // 멈추고 그림 그대로 보여주기
            glrDel(s); glrStkFree(s);
            const cv = s.ctx && s.ctx.canvas; if (cv) cv.remove();
            if (s.img) s.img.style.opacity = '';
        }

        /* ---------- 📔 일기 안의 셰이더 스티커 (elements.js createElementFromData 에서 불러요) ---------- */
        function glrDress(el, img, shIn) {
            const sh = glrClean(shIn);
            if (!sh) return;
            el.dataset.sh = JSON.stringify(sh);                             // WebGL 이 없는 기기에서도 데이터는 그대로 지켜요
            el.dataset.ts = 1;                                              // 사진 꾸미기 창이 안 떠요 (움직이는 그림에는 필터가 안 먹어요)
            if (!glrGL()) return;                                           // WebGL 이 없으면 그림만 보여요
            const go = () => {
                if (!img.naturalWidth || el.querySelector(':scope > canvas.gl-live')) return;
                const k = Math.min(1, GLR_STK / Math.max(img.naturalWidth, img.naturalHeight));
                const w = Math.max(2, Math.round(img.naturalWidth * k)), h = Math.max(2, Math.round(img.naturalHeight * k));
                const src = document.createElement('canvas'); src.width = w; src.height = h;   // SVG 그림도 같은 크기의 그림판에 한 번 그려서 올려요
                try { src.getContext('2d').drawImage(img, 0, 0, w, h); } catch (e) { return; }
                const cv = document.createElement('canvas'); cv.className = 'gl-live'; cv.width = w; cv.height = h;
                const s = { sh, img, src, w, h, tex: null, gen: 0, ctx: cv.getContext('2d'), t0: performance.now(), born: performance.now(), seen: false };
                s.draw = t => glrStkDraw(s, t); s.free = () => glrStkFree(s);
                el.appendChild(cv); img.style.opacity = 0;
                if (!glrStkDraw(s, 0)) return;
                glrAdd(s);
            };
            if (img.complete && img.naturalWidth) go(); else img.addEventListener('load', go, { once: true });
        }

        Object.assign(window, { GLR_SIZE, glrGL, glrProg, glrQuad, glrTex, glrBlit, glrAdd, glrDel, glrKick, glrDress, GLR_FX });

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['glrun'] = true;
