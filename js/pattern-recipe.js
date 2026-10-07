/* 말랑달콤 다이어리 - js/pattern-recipe.js
   🧾 사용자가 만든 배경지의 "레시피" (다이어리 · 배경지 등록 도구 공용)
   - 사용자가 만든 배경지는 CSS 코드가 아니라 짧은 설정값(레시피)으로 저장·전송해요.
       무늬 메이커 : {"v":1,"kind":"stripe","bg":"#fff0f5","c1":"#f7c3d1","a":1,"w":14,"g":14,"angle":45}
       이미지/그림 : {"v":1,"kind":"tile","src":"data:image/png;base64,...","w":80,"h":80,"bg":"#ffffff","from":"draw"}
                     (등록된 배경지는 이미지를 patterns 폴더 파일로 떼어 내서 "src":"patterns/12.webp" 처럼 저장)
   - 다이어리는 레시피를 받을 때마다 sanitizeRecipe()로 검사한 뒤 recipeToCss()로 그려요.
     정해진 항목만 통과하므로 이상한 코드가 들어와도 화면을 망가뜨릴 수 없어요.
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → patterns → community-patterns → pattern-recipe → skins → pattern-maker → service */

        const RECIPE_KINDS = ['stripe', 'dot', 'check', 'grid', 'scallop', 'tile'];
        const RECIPE_MAX_SRC = 40000;          // 이미지 레시피 최대 글자 수 (내 배경지 저장 용량을 지키기 위해)
        const RECIPE_MAX_LEN = 45000;          // 레시피 전체 최대 글자 수

        const RECIPE_LIMITS = {
            a: [0.1, 1], w: [1, 60], g: [0, 120], angle: [0, 180],
            tileW: [8, 600], tileH: [8, 1200]
        };

        function recipeNum(v, lim, def) {
            const n = parseFloat(v);
            if (isNaN(n)) return def;
            return Math.max(lim[0], Math.min(lim[1], Math.round(n * 100) / 100));
        }
        function recipeColor(v, def) {
            return (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v.toLowerCase() : def;
        }
        function recipeText(v, max) {
            return String(v == null ? '' : v).replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, max);
        }

        /* 레시피 검사 : 알려진 항목만 골라 범위 안으로 맞춰서 돌려줌 (문제 있으면 null) */
        function sanitizeRecipe(input) {
            let r = input;
            if (typeof r === 'string') {
                if (r.length > RECIPE_MAX_LEN) return null;
                try { r = JSON.parse(r); } catch (e) { return null; }
            }
            if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
            const kind = RECIPE_KINDS.includes(r.kind) ? r.kind : null;
            if (!kind) return null;
            const L = RECIPE_LIMITS;
            if (kind === 'tile') {
                const src = typeof r.src === 'string' ? r.src : '';
                const isData = src.length <= RECIPE_MAX_SRC && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(src);
                const isFile = /^patterns\/[A-Za-z0-9_-]{1,40}\.(png|webp|jpg)$/.test(src);      // 등록된 배경지의 이미지 파일
                if (!isData && !isFile) return null;
                return {
                    v: 1, kind, src,
                    w: recipeNum(r.w, L.tileW, 80), h: recipeNum(r.h, L.tileH, 80),
                    bg: recipeColor(r.bg, '#ffffff'),
                    from: r.from === 'image' ? 'image' : 'draw'
                };
            }
            const out = {
                v: 1, kind,
                bg: recipeColor(r.bg, '#fff0f5'),
                c1: recipeColor(r.c1, '#f7c3d1'),
                a: recipeNum(r.a, L.a, 1),
                w: recipeNum(r.w, L.w, 12),
                g: recipeNum(r.g, L.g, 12)
            };
            if (kind === 'stripe') out.angle = recipeNum(r.angle, L.angle, 45);
            if (kind === 'dot') out.stagger = !!r.stagger;
            return out;
        }

        function recipeRgba(hex, a) {
            const n = parseInt(hex.slice(1), 16);
            return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
        }

        /* 레시피 → 배경 CSS 값 (backgroundColor / backgroundImage / backgroundSize / backgroundPosition) */
        function recipeToCss(input) {
            const r = sanitizeRecipe(input);
            if (!r) return null;
            if (r.kind === 'tile') {
                return { backgroundColor: r.bg, backgroundImage: `url("${r.src}")`, backgroundSize: `${r.w}px ${r.h}px` };
            }
            const c = recipeRgba(r.c1, r.a), bg = r.bg, w = r.w, g = r.g;
            switch (r.kind) {
                case 'stripe':
                    return { backgroundColor: bg,
                        backgroundImage: `repeating-linear-gradient(${r.angle}deg, ${c} 0 ${w}px, transparent ${w}px ${w + Math.max(g, 1)}px)` };
                case 'dot': {
                    const s = Math.max(w * 2 + g, 4);
                    const dot = `radial-gradient(circle, ${c} 0 ${w}px, transparent ${w + 0.5}px)`;
                    return r.stagger
                        ? { backgroundColor: bg, backgroundImage: `${dot}, ${dot}`, backgroundSize: `${s}px ${s}px, ${s}px ${s}px`, backgroundPosition: `0 0, ${s / 2}px ${s / 2}px` }
                        : { backgroundColor: bg, backgroundImage: dot, backgroundSize: `${s}px ${s}px` };
                }
                case 'check':
                    return { backgroundColor: bg,
                        backgroundImage: `repeating-linear-gradient(90deg, ${c} 0 ${w}px, transparent ${w}px ${w * 2}px), repeating-linear-gradient(0deg, ${c} 0 ${w}px, transparent ${w}px ${w * 2}px)` };
                case 'grid': {
                    const t = Math.min(w, 12), s = Math.max(g, t + 4);
                    return { backgroundColor: bg,
                        backgroundImage: `linear-gradient(90deg, ${c} 0 ${t}px, transparent ${t}px), linear-gradient(0deg, ${c} 0 ${t}px, transparent ${t}px)`,
                        backgroundSize: `${s}px ${s}px` };
                }
                case 'scallop': {
                    const rad = Math.max(w, 4), sw = rad * 2, sh = Math.round(rad * 1.5 * 10) / 10;
                    const fill = recipeRgba(r.c1, Math.round(r.a * 0.35 * 100) / 100);
                    return { backgroundColor: bg,
                        backgroundImage: `radial-gradient(circle at 50% 0, transparent 0 ${rad - 2}px, ${c} ${rad - 1.5}px ${rad}px, transparent ${rad + 0.5}px), radial-gradient(circle at 50% 0, ${fill} 0 ${rad}px, transparent ${rad + 0.5}px)`,
                        backgroundSize: `${sw}px ${sh}px`, backgroundPosition: `0 0, ${rad}px ${sh / 2}px` };
                }
            }
            return null;
        }


        /* 🎨 공유 스킨 : 색 5개뿐 → {"bg":"#ffe6f0","cover":"#ff9a9e","page":"#fff0f5","border":"#ffb6c1","accent":"#ff6b81"}
           '#'+6자리 색만 통과 (하나라도 이상하면 null) */
        const SKIN_COLOR_FIELDS = ['bg', 'cover', 'page', 'border', 'accent'];
        function sanitizeSkin(input) {
            let s = input;
            if (typeof s === 'string') {
                if (s.length > 4500000) return null;       // 꾸밈놓기 내 이미지(크게)까지 담을 수 있게
                try { s = JSON.parse(s); } catch (e) { return null; }
            }
            if (!s || typeof s !== 'object' || Array.isArray(s)) return null;
            const out = {};
            for (const k of SKIN_COLOR_FIELDS) {
                const c = recipeColor(s[k], null);
                if (!c) return null;
                out[k] = c;
            }
            ['menu', 'mf1', 'mf2', 'mf3', 'mf4', 'pbd', 'pfill', 'psel', 'wbd', 'wfill'].forEach(k => {          // 🔘 하단메뉴 · 📍 팝업메뉴 · 🪟 창 색 (있을 때만)
                const c = s[k] != null ? recipeColor(s[k], null) : null;
                if (c) out[k] = c;
            });
            if (typeof stuClean === 'function') stuClean(s, out);          // 🎀 꾸밈 · 아이콘 · 내 이미지 (js/skinstudio.js · 정해진 모양만 통과)
            return out;
        }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['pattern-recipe'] = true;
