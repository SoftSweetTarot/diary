/* 말랑달콤 다이어리 - js/skinstudio.js
   🎀 페이지꾸미기(스튜디오) + 🎁 테마 보관함
   - 페이지에는 색 외에 두 가지가 더 담겨요
       deco  : 놓아 둔 꾸밈 [{ a:놓는 곳, i:그림, x:가로%, y:세로%, s:크기(px), r:회전(도), f:뒤집기(1), b:뒤로(1) }]
       icons : 바꾼 아이콘 { 자리: 그림 }   (자리 = STU_SLOTS 의 k)
       lay   : 크기·간격 { is:하단 아이콘 크기(px) · gap:하단 버튼 간격(px) · dw:날짜칸 길이(%) · dx:날짜칸 좌우(px) }  (기본값과 같으면 안 담김)
       imgs  : 내 이미지 { 이름: 'data:image/…' }   (그림 'u:이름' 이 가리킴)
   - 그림(i) 모양 : 's:이름' = 기본 제공 SVG(STU_SVG) · 'e:🌸' = 이모지 · 'u:이름' = 내 이미지
   - 놓는 곳(a) : pill 날짜 줄 · paper 종이 · pop 팝업메뉴 · bar 하단메뉴 전체 · b1~b4 하단 버튼 각각
   - 페이지를 고르면 settings.js setSkinVars → stuApply(skin) 이 불러서 다이어리에 그려요
   - 테마 페이지(js/theme-skins.js)은 id 'th:이름' · 보관함에 있는 것만 쓸 수 있어요 (diary_themes = 가진 테마 id 목록)
   ※ 불러오는 순서: settings → … → skins → skinstudio → theme-skins */

        const STU_MAX_DECO = 60, STU_MAX_IMGS = 16, STU_IMG_PX = 112, STU_IMG_MAX_LEN = 24000;
        const STU_DECO_PX = 640, STU_DECO_IMG_MAX_LEN = 450000, STU_IMGS_TOTAL = 4000000;   // 🖼 꾸밈놓기용 내 이미지는 크게 (아이콘용만 작게 · 위 STU_IMG_PX / STU_IMG_MAX_LEN)
        const STU_THEMES_KEY = 'diary_themes';
        const STU_ANCHORS = [
            ['pill', '📅 날짜 줄'], ['paper', '📄 종이'], ['pop', '📍 팝업메뉴'], ['bar', '🔘 하단메뉴'],
            ['b1', '① 스티커 버튼'], ['b2', '② 페이지 버튼'], ['b3', '③ 카페 버튼'], ['b4', '④ 설정 버튼']
        ];
        /* 바꿀 수 있는 아이콘 자리 */
        const STU_SLOTS = [
            { k: 'b1', t: '하단 · 스티커' }, { k: 'b2', t: '하단 · 페이지' }, { k: 'b3', t: '하단 · 카페' }, { k: 'b4', t: '하단 · 설정' },
            { k: 'p_sticker', t: '팝업 · 스티커' }, { k: 'p_write', t: '팝업 · 메모' }, { k: 'p_pen', t: '팝업 · 필통' }, { k: 'p_image', t: '팝업 · 이미지' },
            { k: 'p_lib', t: '팝업 · 그림모음' }, { k: 'p_save', t: '팝업 · 저장' }, { k: 'p_order', t: '팝업 · 순서' }, { k: 'p_trash', t: '팝업 · 삭제' },
            { k: 'h_prev', t: '날짜 · 이전 <' }, { k: 'h_next', t: '날짜 · 다음 >' }, { k: 'h_cal', t: '날짜 · 달력' }, { k: 'h_search', t: '날짜 · 검색' }
        ];
        const STU_SLOT_OK = {}; STU_SLOTS.forEach(s => { STU_SLOT_OK[s.k] = 1; });
        const STU_ANCHOR_OK = {}; STU_ANCHORS.forEach(a => { STU_ANCHOR_OK[a[0]] = 1; });

        /* 🌸 기본 제공 꾸밈 (48×48 단색 면 SVG · 카테고리별) */
        const STU_SV = b => `<svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">${b}</svg>`;
        const stuPetals = (n, c, rx, ry, d) => Array.from({ length: n }, (_, i) => `<ellipse cx="24" cy="${24 - d}" rx="${rx}" ry="${ry}" fill="${c}" transform="rotate(${i * 360 / n} 24 24)"/>`).join('');
        const STU_SVG = {
            flower: STU_SV(stuPetals(5, '#f7a3bd', 7, 9.5, 10) + '<circle cx="24" cy="24" r="6.2" fill="#ffd966"/><circle cx="22.4" cy="22.6" r="1.6" fill="#fff3b8"/>'),
            daisy: STU_SV(stuPetals(8, '#ffffff', 4.2, 9, 11) + '<circle cx="24" cy="24" r="6" fill="#ffc83d"/>'),
            tulip: STU_SV('<path d="M24 26v18" stroke="#58a868" stroke-width="3.2" stroke-linecap="round"/><path d="M24 38c-6-1-9-4-10-8 5 0 9 2 10 8z" fill="#7cc58a"/><path d="M13 12c0 9 4 15 11 15s11-6 11-15l-6 5-5-8-5 8z" fill="#f2749a"/>'),
            sakura: STU_SV(Array.from({ length: 5 }, (_, i) => `<path d="M24 24c-7-3-8-12-3-15 2 2 3 3 3 5 0-2 1-3 3-5 5 3 4 12-3 15z" fill="#ffc9da" transform="rotate(${i * 72} 24 24)"/>`).join('') + '<circle cx="24" cy="24" r="3" fill="#f2749a"/>'),
            leaf: STU_SV('<path d="M8 40C6 20 18 7 40 8c1 22-10 34-30 32z" fill="#7cc58a"/><path d="M9 39C19 28 27 20 36 12" stroke="#4e9c60" stroke-width="2.4" fill="none" stroke-linecap="round"/>'),
            sprout: STU_SV('<path d="M24 42V24" stroke="#58a868" stroke-width="3.4" stroke-linecap="round"/><path d="M24 26C13 27 8 19 8 12c10-1 16 4 16 14z" fill="#8fd3a2"/><path d="M24 22c0-9 6-14 16-14 0 8-5 15-16 14z" fill="#6cbf80"/>'),
            clover: STU_SV('<g fill="#6cbf80"><circle cx="17" cy="17" r="8"/><circle cx="31" cy="17" r="8"/><circle cx="17" cy="31" r="8"/><circle cx="31" cy="31" r="8"/></g><path d="M24 24l8 18" stroke="#4e9c60" stroke-width="3" stroke-linecap="round"/>'),
            tree: STU_SV('<rect x="21" y="30" width="6" height="14" rx="2" fill="#a9754d"/><circle cx="24" cy="19" r="13" fill="#7cc58a"/><circle cx="16" cy="24" r="8" fill="#8fd3a2"/><circle cx="32" cy="24" r="8" fill="#6cbf80"/><circle cx="20" cy="15" r="2" fill="#fff" opacity=".5"/>'),
            pine: STU_SV('<rect x="21.5" y="35" width="5" height="9" rx="1.5" fill="#a9754d"/><path d="M24 4l11 14H13z" fill="#6cbf80"/><path d="M24 13l14 16H10z" fill="#58a868"/><path d="M24 22l16 16H8z" fill="#4e9c60"/>'),
            bunny: STU_SV('<ellipse cx="16" cy="12" rx="4.6" ry="10" fill="#fff" stroke="#f3b6c8" stroke-width="2"/><ellipse cx="32" cy="12" rx="4.6" ry="10" fill="#fff" stroke="#f3b6c8" stroke-width="2"/><ellipse cx="16" cy="13" rx="2" ry="6" fill="#ffc9da"/><ellipse cx="32" cy="13" rx="2" ry="6" fill="#ffc9da"/><ellipse cx="24" cy="31" rx="16" ry="13" fill="#fff" stroke="#f3b6c8" stroke-width="2"/><circle cx="18" cy="30" r="2.2" fill="#5a3d4a"/><circle cx="30" cy="30" r="2.2" fill="#5a3d4a"/><ellipse cx="14" cy="35" rx="3" ry="2" fill="#ffb6c8"/><ellipse cx="34" cy="35" rx="3" ry="2" fill="#ffb6c8"/><path d="M22 34.5c1 1.4 3 1.4 4 0" stroke="#5a3d4a" stroke-width="1.6" fill="none" stroke-linecap="round"/>'),
            bear: STU_SV('<circle cx="10" cy="12" r="6" fill="#c89466"/><circle cx="38" cy="12" r="6" fill="#c89466"/><circle cx="10" cy="12" r="3" fill="#f0cfb0"/><circle cx="38" cy="12" r="3" fill="#f0cfb0"/><ellipse cx="24" cy="27" rx="18" ry="16" fill="#c89466"/><ellipse cx="24" cy="33" rx="7.5" ry="5.5" fill="#f0cfb0"/><circle cx="16.5" cy="24" r="2.2" fill="#4a3226"/><circle cx="31.5" cy="24" r="2.2" fill="#4a3226"/><ellipse cx="24" cy="30.5" rx="2.6" ry="1.9" fill="#4a3226"/><path d="M24 32.4v2.2M21 35c1.4 1.5 4.6 1.5 6 0" stroke="#4a3226" stroke-width="1.4" fill="none" stroke-linecap="round"/>'),
            cat: STU_SV('<path d="M8 22L9 5l11 8zM40 22L39 5 28 13z" fill="#ffd9a8"/><path d="M11 17l.5-7 5 4zM37 17l-.5-7-5 4z" fill="#ffb6c8"/><ellipse cx="24" cy="28" rx="18" ry="14.5" fill="#ffd9a8"/><circle cx="17" cy="27" r="2.2" fill="#4a3226"/><circle cx="31" cy="27" r="2.2" fill="#4a3226"/><path d="M22 31.5l2 2 2-2z" fill="#ff8fb1"/><path d="M24 33.5v1.5M21 36c1.2 1.2 4.8 1.2 6 0M5 29l8 1M5 34l8-1M43 29l-8 1M43 34l-8-1" stroke="#4a3226" stroke-width="1.2" fill="none" stroke-linecap="round"/>'),
            chick: STU_SV('<ellipse cx="24" cy="28" rx="16" ry="15" fill="#ffe27a"/><path d="M24 7c-3 0-4 3-3 5 1-1 2-1.5 3-1.5s2 .5 3 1.5c1-2 0-5-3-5z" fill="#ffe27a"/><circle cx="17.5" cy="26" r="2.1" fill="#4a3226"/><circle cx="30.5" cy="26" r="2.1" fill="#4a3226"/><path d="M21.5 30h5l-2.5 3.6z" fill="#ff9d4a"/><ellipse cx="13" cy="31" rx="3" ry="2" fill="#ffb6a0"/><ellipse cx="35" cy="31" rx="3" ry="2" fill="#ffb6a0"/>'),
            star: STU_SV('<path d="M24 4l5.4 12.6 13.6 1.2-10.3 9 3.1 13.4L24 33l-11.8 7.2 3.1-13.4L5 17.8l13.6-1.2z" fill="#ffd966" stroke="#f5b83a" stroke-width="1.6" stroke-linejoin="round"/>'),
            moon: STU_SV('<path d="M31 5a19 19 0 1 0 12 28A16 16 0 0 1 31 5z" fill="#ffe08a" stroke="#f5b83a" stroke-width="1.6" stroke-linejoin="round"/>'),
            cloud: STU_SV('<path d="M13 35a8 8 0 0 1 .8-16A11 11 0 0 1 35 17a9 9 0 0 1 1 18z" fill="#fff" stroke="#cfe0f7" stroke-width="2" stroke-linejoin="round"/>'),
            sparkle: STU_SV('<path d="M24 3c1.5 10 4 16 17 21-13 5-15.5 11-17 21-1.5-10-4-16-17-21 13-5 15.5-11 17-21z" fill="#fff3b8" stroke="#ffd966" stroke-width="1.6" stroke-linejoin="round"/>'),
            heart: STU_SV('<path d="M24 41C8 30 5 20 10 14c4-4 10-3 14 3 4-6 10-7 14-3 5 6 2 16-14 27z" fill="#ff8fb1"/><ellipse cx="15" cy="18" rx="3" ry="2" fill="#fff" opacity=".55" transform="rotate(-35 15 18)"/>'),
            ribbon: STU_SV('<path d="M24 24L7 12v24z" fill="#ff8fb1"/><path d="M24 24l17-12v24z" fill="#ff8fb1"/><path d="M24 24L7 12v6z" fill="#ffb6c8"/><path d="M24 24l17-12v6z" fill="#ffb6c8"/><path d="M20 28l-4 14 8-6 8 6-4-14z" fill="#f2749a"/><circle cx="24" cy="24" r="5.5" fill="#f2749a"/><circle cx="22.5" cy="22.5" r="1.6" fill="#ffc9da"/>'),
            butterfly: STU_SV('<path d="M24 24C14 8 3 12 6 24c1 6 8 7 18 0z" fill="#b9a2f0"/><path d="M24 24C34 8 45 12 42 24c-1 6-8 7-18 0z" fill="#b9a2f0"/><path d="M24 26c-9 3-12 12-6 15 4 1 6-4 6-15zM24 26c9 3 12 12 6 15-4 1-6-4-6-15z" fill="#d9c8ff"/><rect x="22.6" y="14" width="2.8" height="22" rx="1.4" fill="#5a3d4a"/>'),
            strawberry: STU_SV('<path d="M24 43C11 36 8 24 11 18c3-5 9-4 13-2 4-2 10-3 13 2 3 6 0 18-13 25z" fill="#f2566f"/><path d="M16 14c3-1 5 0 8 2 3-2 5-3 8-2-2-3-5-4-8-3-3-1-6 0-8 3z" fill="#58a868"/><g fill="#ffe9a8"><ellipse cx="17" cy="24" rx="1.2" ry="1.8"/><ellipse cx="24" cy="28" rx="1.2" ry="1.8"/><ellipse cx="31" cy="24" rx="1.2" ry="1.8"/><ellipse cx="20" cy="33" rx="1.2" ry="1.8"/><ellipse cx="28" cy="33" rx="1.2" ry="1.8"/></g>'),
            vine: STU_SV('<path d="M4 38C14 38 14 24 22 24s8 14 22 12" stroke="#58a868" stroke-width="2.6" fill="none" stroke-linecap="round"/><g fill="#7cc58a"><ellipse cx="12" cy="33" rx="5" ry="2.8" transform="rotate(-35 12 33)"/><ellipse cx="22" cy="19" rx="5" ry="2.8" transform="rotate(35 22 19)"/><ellipse cx="32" cy="32" rx="5" ry="2.8" transform="rotate(-30 32 32)"/><ellipse cx="40" cy="31" rx="4.6" ry="2.6" transform="rotate(30 40 31)"/></g>')
        };
        const STU_CATS = [
            ['🌸 꽃·식물', ['flower', 'daisy', 'tulip', 'sakura', 'leaf', 'sprout', 'clover', 'tree', 'pine', 'vine']],
            ['🐰 캐릭터', ['bunny', 'bear', 'cat', 'chick', 'strawberry', 'butterfly']],
            ['⭐ 하늘·리본', ['star', 'moon', 'cloud', 'sparkle', 'heart', 'ribbon']]
        ];
        const STU_EMOJI = '🌸 🌷 🌼 🌹 🌺 🌻 💐 🌿 🍀 🍃 🌳 🌲 🌵 🍄 🐰 🐻 🐱 🐶 🐥 🦊 🐼 🐨 🐹 🦄 🐝 🦋 🐞 🐟 🐧 🍓 🍒 🍑 🍋 🍰 🧁 🍭 🍩 ☕ ⭐ 🌟 ✨ 🌙 ☀️ ☁️ 🌈 ❄️ 💗 💖 💜 💙 🎀 👑 💎 🎈 🎁 🔔 🎵 📚 ✏️ 🧸 🪄 🫧 🔮 🌊 🍁 🎃'.split(' ');

        /* ---------- 현재 적용 중인 꾸밈 (스킨을 고르면 stuApply 가 채워요) ---------- */
        const STU_LAY = [   // [키, 이름, 최소, 최대, 기본, 단위, css 변수, 값→css]
            ['bs', '하단 버튼 전체', 70, 130, 100, '%', '--tb-bs', v => v / 100],
            ['is', '하단 아이콘 크기', 16, 40, 26, 'px', '--tb-ico', v => v + 'px'],
            ['fs', '하단 글씨 크기', 8, 20, 12, 'px', '--tb-fs', v => v + 'px'],
            ['gap', '하단 버튼 간격', 0, 30, 10, 'px', '--tb-gap', v => v + 'px'],
            ['ps', '팝업메뉴 전체 크기', 70, 150, 100, '%', '--pop-s', v => v / 100],
            ['pi', '팝업 아이콘 크기', 16, 44, 28, 'px', '--pop-ico', v => v + 'px'],
            ['pf', '팝업 글씨 크기', 10, 26, 16, 'px', '--pop-fs', v => v + 'px'],
            ['pg', '팝업 메뉴끼리 간격', 0, 16, 2, 'px', '--pop-gap', v => v + 'px'],
            ['dw', '날짜칸 길이', 50, 110, 100, '%', '--pill-w', v => v / 100],
            ['dx', '날짜칸 좌우', -60, 60, 0, 'px', '--pill-x', v => v + 'px']
        ];
        let stuCur = { deco: [], icons: {}, imgs: {}, lay: {} };
        let stuSel = -1;                  // 스튜디오에서 고른 꾸밈 번호
        let stuTarget = 'paper';          // 새 꾸밈을 놓을 곳
        let stuOpenSlot = '';             // 아이콘 고르는 중인 자리

        const stuNum = (v, a, b, d) => { v = +v; return isFinite(v) ? Math.max(a, Math.min(b, v)) : d; };
        const stuCopy = o => JSON.parse(JSON.stringify(o));

        /* 스킨 속 deco · icons · imgs 를 검사해서 정해진 모양만 통과 (pattern-recipe.js sanitizeSkin 이 불러요) */
        function stuClean(src, out) {
            const imgs = {};
            if (src && src.imgs && typeof src.imgs === 'object') {
                Object.keys(src.imgs).slice(0, STU_MAX_IMGS).forEach(k => {
                    const v = src.imgs[k];
                    if (/^[\w-]{1,12}$/.test(k) && typeof v === 'string' && v.length <= STU_DECO_IMG_MAX_LEN && /^data:image\/(png|webp|jpeg|gif);base64,[A-Za-z0-9+/=]+$/.test(v)) imgs[k] = v;
                });
            }
            const okImg = i => {
                if (typeof i !== 'string' || i.length > 40) return false;
                if (i.startsWith('s:')) return hasOwn(STU_SVG, i.slice(2));
                if (i.startsWith('e:')) return i.length >= 3 && i.length <= 14;
                if (i.startsWith('u:')) return hasOwn(imgs, i.slice(2));
                return false;
            };
            const deco = [];
            (Array.isArray(src && src.deco) ? src.deco : []).slice(0, STU_MAX_DECO).forEach(d => {
                if (!d || typeof d !== 'object' || !STU_ANCHOR_OK[d.a] || !okImg(d.i)) return;
                const o = { a: d.a, i: d.i, x: Math.round(stuNum(d.x, -60, 160, 50) * 10) / 10, y: Math.round(stuNum(d.y, -60, 160, 50) * 10) / 10,
                    s: Math.round(stuNum(d.s, 10, 200, 36)), r: Math.round(stuNum(d.r, -180, 180, 0)) };
                if (d.f) o.f = 1;
                if (d.b) o.b = 1;
                deco.push(o);
            });
            const icons = {};
            if (src && src.icons && typeof src.icons === 'object') Object.keys(src.icons).forEach(k => { if (STU_SLOT_OK[k] && okImg(src.icons[k])) icons[k] = src.icons[k]; });
            const lay = {};
            if (src && src.lay && typeof src.lay === 'object') STU_LAY.forEach(([k, , mn, mx, df]) => { if (src.lay[k] != null) { const v = Math.round(stuNum(src.lay[k], mn, mx, df)); if (v !== df) lay[k] = v; } });
            if (Object.keys(lay).length) out.lay = lay;
            if (deco.length) out.deco = deco;
            if (Object.keys(icons).length) out.icons = icons;
            const used = {};
            deco.forEach(d => { if (d.i.startsWith('u:')) used[d.i.slice(2)] = 1; });
            Object.keys(icons).forEach(k => { if (icons[k].startsWith('u:')) used[icons[k].slice(2)] = 1; });
            const keep = {}; Object.keys(used).forEach(k => { if (imgs[k]) keep[k] = imgs[k]; });
            if (Object.keys(keep).length) out.imgs = keep;
        }

        /* 그림 하나를 HTML 로 */
        function stuImgHtml(i, imgs) {
            imgs = imgs || stuCur.imgs;
            if (typeof i !== 'string') return '';
            if (i.startsWith('s:')) return STU_SVG[i.slice(2)] || '';
            if (i.startsWith('e:')) { const b = document.createElement('b'); b.textContent = i.slice(2); return b.outerHTML; }
            if (i.startsWith('u:') && imgs[i.slice(2)]) { const im = document.createElement('img'); im.src = imgs[i.slice(2)]; im.alt = ''; im.draggable = false; return im.outerHTML; }
            return '';
        }
        function stuIconHtml(i) { const h = stuImgHtml(i); return h ? `<i class="stu-ico">${h}</i>` : ''; }
        /* 팝업메뉴 같은 곳에서 쓰는 : 이 자리의 바뀐 아이콘 (없으면 null → 기본 아이콘) */
        function stuIcon(key) { return stuCur.icons[key] ? stuIconHtml(stuCur.icons[key]) : null; }

        /* ---------- 다이어리에 그리기 ---------- */
        function stuHost(a) {
            if (a === 'pill') return document.getElementById('pageHeader');
            if (a === 'paper') return stuPaperLayer();
            if (a === 'bar') return document.querySelector('.toolbar');
            if (a === 'pop') return null;
            const n = { b1: 'tb-sticker', b2: 'tb-skin', b3: 'tb-cafe', b4: 'tb-set' }[a];
            return n ? document.querySelector('.toolbar .' + n) : null;
        }
        function stuPaperLayer() {
            let l = document.getElementById('stuPaper');
            if (!l) { l = document.createElement('div'); l.id = 'stuPaper'; l.className = 'stu-layer'; document.getElementById('innerPage').appendChild(l); }
            return l;
        }
        function stuDecoEl(d, idx) {
            const e = document.createElement('span');
            e.className = 'stu-deco' + (d.b ? ' back' : '') + (idx === stuSel ? ' sel' : '');
            e.dataset.idx = idx;
            e.style.cssText = `left:${d.x}%;top:${d.y}%;width:${d.s}px;height:${d.s}px;transform:translate(-50%,-50%) rotate(${d.r || 0}deg)${d.f ? ' scaleX(-1)' : ''}`;
            e.innerHTML = stuImgHtml(d.i);
            if (idx === stuSel) ['tl', 'tr', 'bl', 'br'].forEach(c => { const z = document.createElement('div'); z.className = 'rot-zone rot-' + c; e.appendChild(z); });   // 기존 그림과 같은 네 꼭짓점 회전 칸
            return e;
        }
        /* 한 곳(host)에 그 곳의 꾸밈 다시 놓기 */
        function stuMount(a, host) {
            if (!host) return;
            host.querySelectorAll(':scope > .stu-deco').forEach(n => n.remove());
            stuCur.deco.forEach((d, idx) => { if (d.a === a) host.appendChild(stuDecoEl(d, idx)); });
        }
        function stuRenderDeco() {
            ['pill', 'paper', 'bar', 'b1', 'b2', 'b3', 'b4'].forEach(a => stuMount(a, stuHost(a)));
            const fp = document.getElementById('stuFakePop');
            if (fp) stuMount('pop', fp);
        }
        /* 아이콘 자리 → 다이어리 속 버튼 */
        function stuSlotEl(k) {
            if (k === 'h_prev' || k === 'h_next') return document.querySelectorAll('#pageHeader > .page-arrow')[k === 'h_prev' ? 0 : 1] || null;
            const q = { b1: '.toolbar .tb-sticker', b2: '.toolbar .tb-skin', b3: '.toolbar .tb-cafe', b4: '.toolbar .tb-set',
                h_cal: '#pageHeader .page-cal-btn', h_search: '#pageHeader .page-search-btn' }[k];
            return q ? document.querySelector(q) : null;
        }
        function stuRenderIcons() {
            STU_SLOTS.forEach(s => {
                const el = stuSlotEl(s.k);
                if (!el) return;
                const cur = el.querySelector('svg, .stu-ico'), want = stuCur.icons[s.k];
                if (want) {
                    if (cur && cur.tagName.toLowerCase() === 'svg' && !el.dataset.stuO) el.dataset.stuO = cur.outerHTML;
                    const tmp = document.createElement('div'); tmp.innerHTML = stuIconHtml(want);
                    if (cur && tmp.firstChild) cur.replaceWith(tmp.firstChild);
                } else if (el.dataset.stuO) {
                    const old = el.querySelector('.stu-ico'), tmp = document.createElement('div'); tmp.innerHTML = el.dataset.stuO;
                    if (old) old.replaceWith(tmp.firstChild);
                    delete el.dataset.stuO;
                }
            });
            const fp = document.getElementById('stuFakePop');
            if (fp) stuFillFakePop(fp);
        }
        /* 📐 하단 아이콘 크기 · 버튼 간격 · 날짜칸 길이 · 좌우 */
        function stuRenderLay() {
            const root = document.documentElement;
            STU_LAY.forEach(([k, , mn, mx, df, , v, css]) => { const n = stuCur.lay[k]; if (n != null && n !== df) root.style.setProperty(v, css(n)); else root.style.removeProperty(v); });
        }
        /* settings.js setSkinVars 가 스킨을 고를 때마다 불러요 */
        function stuApply(skin) {
            const s = skin && typeof skin === 'object' ? skin : {};
            stuCur = { deco: stuCopy(Array.isArray(s.deco) ? s.deco : []), icons: Object.assign({}, s.icons || {}), imgs: Object.assign({}, s.imgs || {}), lay: Object.assign({}, s.lay || {}) };
            stuSel = -1;
            stuRenderDeco(); stuRenderIcons(); stuRenderLay();
            if (stuIsOpen()) stuRefreshWin();
        }
        /* 저장할 때 쓰는, 지금 적용된 꾸밈 (settings.js saveCustomSkin) */
        function stuExtra() { const o = {}; stuClean(stuCur, o); return o; }

        /* ---------- 🎁 테마 보관함 ---------- */
        /* 🔒 THEME_OPEN : false 면 🎁 테마 보관함 버튼 · 스킨 목록의 테마 그룹 · 테마 적용이 모두 숨어요 (코드는 그대로 · 판매/보상 시작 때 true 로) */
        const THEME_OPEN = false;
        { const b = document.getElementById('themeBoxBtn'); if (b) { b.hidden = !THEME_OPEN; b.parentNode.style.gridTemplateColumns = THEME_OPEN ? '' : 'repeat(2, 1fr)'; } }
        const stuThemeList = () => (THEME_OPEN && typeof THEME_SKINS !== 'undefined' && Array.isArray(THEME_SKINS)) ? THEME_SKINS : [];
        function stuOwned() {
            let ids = [];
            try { const v = JSON.parse(store.getItem(STU_THEMES_KEY) || '[]'); if (Array.isArray(v)) ids = v.filter(x => typeof x === 'string'); } catch (e) {}
            return ids;
        }
        const stuHasTheme = id => { const t = stuThemeList().find(x => x.id === id); return !!t && (!!t.free || stuOwned().includes(id)); };
        /* 구매 · 보상으로 받았을 때 보관함에 넣기 (서버 선물 도착 신호가 불러요) */
        function themeGrant(ids) {
            const have = stuOwned(), add = (Array.isArray(ids) ? ids : [ids]).filter(id => stuThemeList().some(t => t.id === id) && !have.includes(id));
            if (!add.length) return 0;
            store.setItem(STU_THEMES_KEY, JSON.stringify(have.concat(add)));
            if (typeof renderSkinSelect === 'function') renderSkinSelect();
            if (stuBoxOpen()) stuRenderBox();
            return add.length;
        }
        function themeSkinOf(id) {
            const t = stuThemeList().find(x => x.id === id && stuHasTheme(id));
            if (!t) return null;
            const c = typeof sanitizeSkin === 'function' ? sanitizeSkin(t.skin) : null;
            return c ? { skin: c, name: t.name } : null;
        }
        function stuBoxOpen() { const m = document.getElementById('themeBoxModal'); return !!m && m.style.display === 'flex'; }
        function openThemeBox() { closeModal('skinModal'); stuRenderBox(); openModal('themeBoxModal'); }
        function stuRenderBox() {
            const box = document.getElementById('themeBoxList');
            if (!box) return;
            const list = stuThemeList(), now = typeof currentSkinId !== 'undefined' ? currentSkinId : '';
            if (!list.length) { box.innerHTML = '<div class="stu-empty">아직 테마 페이지가 없어요.</div>'; return; }
            box.innerHTML = '';
            list.forEach(t => {
                const own = stuHasTheme(t.id), on = now === 'th:' + t.id;
                const c = typeof sanitizeSkin === 'function' ? sanitizeSkin(t.skin) : null;
                const card = document.createElement('div');
                card.className = 'th-card' + (own ? '' : ' locked') + (on ? ' on' : '');
                const sw = c ? `<span class="th-sw" style="background:${c.bg}"><i style="background:${c.cover}"></i><i style="background:${c.page}"></i><i style="background:${c.border}"></i><i style="background:${c.accent}"></i></span>` : '';
                card.innerHTML = `${sw}<div class="th-info"><b></b><small></small></div><button type="button" class="btn th-btn"></button>`;
                card.querySelector('b').textContent = (own ? '🎁 ' : '🔒 ') + t.name;
                card.querySelector('small').textContent = own ? (t.desc || '') : (t.how || '구매하거나 보상으로 받으면 열려요');
                const btn = card.querySelector('button');
                btn.textContent = on ? '✓ 쓰는 중' : own ? '적용' : '잠김';
                btn.disabled = on || !own;
                btn.onclick = () => { if (applySkinPreset('th:' + t.id)) stuRenderBox(); };
                box.appendChild(card);
            });
        }

        /* ---------- 🎀 스킨꾸미기 창 ---------- */
        const stuIsOpen = () => { const m = document.getElementById('stuModal'); return !!m && m.style.display === 'flex'; };
        let stuTab = 'deco', stuCat = 0, stuWheelT = 0;

        function openStudio() {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('다이어리 표지를 열어 둔 상태에서<br>페이지꾸미기를 할 수 있어요.'); return; }
            closeModal('skinModal');
            if (typeof selectedElement !== 'undefined' && selectedElement) { selectedElement.classList.remove('selected'); selectedElement = null; if (typeof updateTextPanel === 'function') updateTextPanel(); }   // 다이어리 위 그림 · 글 선택 풀기 (만드는 동안은 안 보이고 안 눌려요)
            document.body.classList.add('stu-edit');
            stuShowFakePop();
            openModal('stuModal');
            stuRefreshWin();
        }
        function closeStudio() {
            document.body.classList.remove('stu-edit');
            stuSel = -1; stuOpenSlot = '';
            const fp = document.getElementById('stuFakePop'); if (fp) fp.remove();
            stuRenderDeco();
            closeModal('stuModal');
        }
        function stuBackToMenu() { closeStudio(); openModal('skinModal'); }

        /* 팝업메뉴는 눌러야 잠깐 뜨는 거라서, 만드는 동안은 가짜 팝업메뉴를 다이어리 옆에 띄워 놓고 거기에 꾸며요 */
        function stuShowFakePop() {
            let fp = document.getElementById('stuFakePop');
            if (!fp) { fp = document.createElement('div'); fp.id = 'stuFakePop'; fp.className = 'tap-menu stu-fake'; document.body.appendChild(fp); }
            stuFillFakePop(fp);
            const w = (document.getElementById('innerPage') || document.getElementById('diaryWrapper')).getBoundingClientRect();   // 페이지 정중앙
            fp.style.left = Math.max(6, Math.min(innerWidth - fp.offsetWidth - 6, w.left + (w.width - fp.offsetWidth) / 2)) + 'px';
            fp.style.top = Math.max(6, w.top + (w.height - fp.offsetHeight) / 2) + 'px';
        }
        function stuFillFakePop(fp) {
            const items = typeof TM_ITEMS !== 'undefined' ? TM_ITEMS.concat([{ key: 'p_order', label: '순서', icon: TM_ICONS.order }, { key: 'p_trash', label: '삭제', icon: TM_ICONS.trash }]) : [];
            fp.innerHTML = items.map(it => `<button type="button" class="tap-menu-btn" tabindex="-1"><i class="tm-ic">${stuIcon(it.key) || it.icon}</i><span>${it.label}</span></button>`).join('');
            stuMount('pop', fp);
        }

        function stuRefreshWin() {
            const w = document.getElementById('stuBody');
            if (!w) return;
            document.querySelectorAll('#stuModal .stu-tab').forEach(b => b.classList.toggle('on', b.dataset.t === stuTab));
            w.innerHTML = '';
            if (stuTab === 'deco') stuBuildDeco(w); else if (stuTab === 'icon') stuBuildIcons(w); else if (stuTab === 'lay') stuBuildLay(w); else stuBuildSave(w);
        }
        function stuSetTab(t) { stuTab = t; stuOpenSlot = ''; stuRefreshWin(); }
        const stuEl = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

        function stuBuildDeco(w) {
            w.appendChild(stuEl('div', 'stu-hint', '고른 곳에 꾸밈이 놓여요. <b>다이어리 위에서 끌어서</b> 위치를 바꾸고, 네 모서리를 잡고 돌려요 · 손가락 두 개로 벌리면 크기 · 비틀면 회전이에요.'));
            const row = stuEl('div', 'stu-chips');
            STU_ANCHORS.forEach(([k, t]) => {
                const b = stuEl('button', 'stu-chip' + (stuTarget === k ? ' on' : ''), t); b.type = 'button';
                b.onclick = () => { stuTarget = k; stuRefreshWin(); };
                row.appendChild(b);
            });
            w.appendChild(row);
            const cats = stuEl('div', 'stu-chips stu-cats');
            STU_CATS.map(c => c[0]).concat(['😀 이모지', '🖼 내 이미지']).forEach((t, i) => {
                const b = stuEl('button', 'stu-chip' + (stuCat === i ? ' on' : ''), t); b.type = 'button';
                b.onclick = () => { stuCat = i; stuRefreshWin(); };
                cats.appendChild(b);
            });
            w.appendChild(cats);
            w.appendChild(stuLibGrid(id => stuAddDeco(id)));

            const sel = stuCur.deco[stuSel];
            const ed = stuEl('div', 'stu-edit');
            if (sel) {
                ed.innerHTML = `<div class="stu-edit-t">✏️ 고른 꾸밈</div>
                    <label>크기 <input type="range" min="12" max="120" value="${sel.s}" data-f="s"></label>
                    <label>회전 <input type="range" min="-180" max="180" value="${sel.r || 0}" data-f="r"></label>
                    <div class="stu-edit-btns"><button type="button" class="btn" data-a="flip">↔ 뒤집기</button><button type="button" class="btn" data-a="back">${sel.b ? '앞으로' : '뒤로'}</button><button type="button" class="btn" data-a="dup">복사</button><button type="button" class="btn" data-a="del">🗑 지우기</button></div>
                    <label>놓는 곳 <select class="btn" data-f="a">${STU_ANCHORS.map(([k, t]) => `<option value="${k}"${sel.a === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`;
                ed.querySelectorAll('input[type=range]').forEach(r => r.oninput = () => { sel[r.dataset.f] = +r.value; stuRenderDeco(); });
                ed.querySelector('select').onchange = e => { sel.a = e.target.value; stuRenderDeco(); };
                ed.querySelectorAll('[data-a]').forEach(b => b.onclick = () => stuAction(b.dataset.a));
            } else ed.appendChild(stuEl('div', 'stu-hint', '놓은 꾸밈을 누르면 크기 · 회전을 고칠 수 있어요.'));
            w.appendChild(ed);

            const cnt = stuCur.deco.length;
            const list = stuEl('div', 'stu-list');
            list.appendChild(stuEl('div', 'stu-edit-t', `놓은 꾸밈 ${cnt}개`));
            const chips = stuEl('div', 'stu-chips');
            stuCur.deco.forEach((d, i) => {
                const b = stuEl('button', 'stu-mini' + (i === stuSel ? ' on' : ''), stuImgHtml(d.i)); b.type = 'button';
                b.title = (STU_ANCHORS.find(a => a[0] === d.a) || [0, ''])[1];
                b.onclick = () => { stuSel = i; stuRenderDeco(); stuRefreshWin(); };
                chips.appendChild(b);
            });
            list.appendChild(chips);
            if (cnt) { const c = stuEl('button', 'btn stu-clear', '꾸밈 모두 지우기'); c.type = 'button'; c.onclick = async () => { if (await showMsg('놓은 꾸밈을 모두 지울까요?', true)) { stuCur.deco = []; stuSel = -1; stuRenderDeco(); stuRefreshWin(); } }; list.appendChild(c); }
            w.appendChild(list);
        }

        /* 그림 고르는 칸 (꾸밈 · 아이콘 공용) · pick(그림id) */
        function stuLibGrid(pick) {
            const g = stuEl('div', 'stu-grid');
            const add = (id, html) => { const b = stuEl('button', 'stu-cell', html); b.type = 'button'; b.onclick = () => pick(id); g.appendChild(b); };
            if (stuCat < STU_CATS.length) STU_CATS[stuCat][1].forEach(n => add('s:' + n, STU_SVG[n]));
            else if (stuCat === STU_CATS.length) STU_EMOJI.forEach(e => add('e:' + e, `<b>${e}</b>`));
            else {
                Object.keys(stuCur.imgs).forEach(k => add('u:' + k, stuImgHtml('u:' + k)));
                const up = stuEl('button', 'stu-cell stu-up', '＋<small>내 이미지</small>'); up.type = 'button';
                up.onclick = () => document.getElementById('stuFile').click();
                g.appendChild(up);
            }
            return g;
        }

        function stuAddDeco(i) {
            if (stuCur.deco.length >= STU_MAX_DECO) { showMsg(`꾸밈은 ${STU_MAX_DECO}개까지 놓을 수 있어요.`); return; }
            const a = stuTarget === 'pop' || STU_ANCHOR_OK[stuTarget] ? stuTarget : 'paper';
            const small = a === 'b1' || a === 'b2' || a === 'b3' || a === 'b4';
            stuCur.deco.push({ a, i, x: 50 + (stuCur.deco.length % 5) * 4, y: 50, s: small ? 26 : a === 'pill' ? 30 : 44, r: 0 });
            stuSel = stuCur.deco.length - 1;
            stuRenderDeco(); stuRefreshWin();
        }
        function stuAction(k) {
            const d = stuCur.deco[stuSel];
            if (!d) return;
            if (k === 'flip') d.f = d.f ? 0 : 1;
            else if (k === 'back') d.b = d.b ? 0 : 1;
            else if (k === 'dup') { if (stuCur.deco.length < STU_MAX_DECO) { stuCur.deco.push(Object.assign({}, d, { x: d.x + 6, y: d.y + 6 })); stuSel = stuCur.deco.length - 1; } }
            else if (k === 'del') { stuCur.deco.splice(stuSel, 1); stuSel = -1; }
            stuRenderDeco(); stuRefreshWin();
        }

        /* 내 이미지 : 작게 줄여서 스킨 안에 담아요 (투명 배경은 그대로) */
        function stuUpload(ev) {
            const f = ev.target.files && ev.target.files[0]; ev.target.value = '';
            if (!f || !/^image\//.test(f.type)) return;
            if (Object.keys(stuCur.imgs).length >= STU_MAX_IMGS) { showMsg(`내 이미지는 페이지 하나에 ${STU_MAX_IMGS}개까지예요.<br>안 쓰는 이미지를 지우고 다시 넣어 주세요.`); return; }
            const small = stuTab === 'icon';                       // 아이콘용은 작게 (제약) · 꾸밈놓기용은 크고 선명하게 (거의 제약 없음)
            const maxPx = small ? STU_IMG_PX : STU_DECO_PX, maxLen = small ? STU_IMG_MAX_LEN : STU_DECO_IMG_MAX_LEN;
            const url = URL.createObjectURL(f), im = new Image();
            im.onload = () => {
                URL.revokeObjectURL(url);
                let k = Math.min(1, maxPx / Math.max(im.width, im.height)), data = '';
                for (let t = 0; t < 6; t++) {                       // 너무 크면 조금씩 줄여서 담아요
                    const cv = document.createElement('canvas');
                    cv.width = Math.max(1, Math.round(im.width * k)); cv.height = Math.max(1, Math.round(im.height * k));
                    cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height);
                    data = cv.toDataURL('image/webp', small ? 0.85 : 0.92);
                    if (!/^data:image\/webp/.test(data)) data = cv.toDataURL('image/png');
                    if (data.length <= maxLen) break;
                    k *= 0.8;
                }
                if (data.length > maxLen) { showMsg(small ? '이미지가 너무 복잡해서 담을 수 없어요.<br>더 단순한 그림으로 해 주세요.' : '이미지가 너무 커서 담을 수 없어요.<br>조금 작은 그림으로 해 주세요.'); return; }
                const total = Object.keys(stuCur.imgs).reduce((n, q) => n + stuCur.imgs[q].length, 0);
                if (total + data.length > STU_IMGS_TOTAL) { showMsg('내 이미지가 너무 많이 쌓였어요.<br>안 쓰는 이미지를 지우고 다시 넣어 주세요.'); return; }
                let n = 1; while (stuCur.imgs['u' + n]) n++;
                stuCur.imgs['u' + n] = data;
                stuRefreshWin();
            };
            im.onerror = () => { URL.revokeObjectURL(url); showMsg('이미지를 읽지 못했어요.'); };
            im.src = url;
        }

        function stuBuildIcons(w) {
            w.appendChild(stuEl('div', 'stu-hint', '바꿀 아이콘을 누르고 그림을 골라요. 안 바꾼 건 기본 모양이에요.'));
            const g = stuEl('div', 'stu-slots');
            STU_SLOTS.forEach(s => {
                const own = stuCur.icons[s.k];
                const b = stuEl('button', 'stu-slot' + (own ? ' own' : '') + (stuOpenSlot === s.k ? ' on' : ''), `<span class="stu-slot-ic">${own ? stuImgHtml(own) : '·'}</span><small>${s.t}</small>`); b.type = 'button';
                b.onclick = () => { stuOpenSlot = stuOpenSlot === s.k ? '' : s.k; stuRefreshWin(); };
                g.appendChild(b);
            });
            w.appendChild(g);
            if (stuOpenSlot) {
                const box = stuEl('div', 'stu-pick');
                const s = STU_SLOTS.find(x => x.k === stuOpenSlot);
                box.appendChild(stuEl('div', 'stu-edit-t', `‘${s.t}’ 아이콘 고르기`));
                const cats = stuEl('div', 'stu-chips stu-cats');
                STU_CATS.map(c => c[0]).concat(['😀 이모지', '🖼 내 이미지']).forEach((t, i) => { const b = stuEl('button', 'stu-chip' + (stuCat === i ? ' on' : ''), t); b.type = 'button'; b.onclick = () => { stuCat = i; stuRefreshWin(); }; cats.appendChild(b); });
                box.appendChild(cats);
                box.appendChild(stuLibGrid(id => { stuCur.icons[stuOpenSlot] = id; stuRenderIcons(); stuRefreshWin(); }));
                const rst = stuEl('button', 'btn stu-clear', '↺ 기본 아이콘으로'); rst.type = 'button';
                rst.onclick = () => { delete stuCur.icons[stuOpenSlot]; stuRenderIcons(); stuRefreshWin(); };
                box.appendChild(rst);
                w.appendChild(box);
            }
        }

        function stuBuildLay(w) {
            w.appendChild(stuEl('div', 'stu-hint', '하단메뉴 · 팝업메뉴 · 맨 위 날짜칸의 크기 · 간격 · 위치를 조절해요. 바로 다이어리에 보여요.'));
            STU_LAY.forEach(([k, t, mn, mx, df, u]) => {
                const cur = stuCur.lay[k] != null ? stuCur.lay[k] : df;
                const row = stuEl('div', 'stu-lay-row', `<span>${t}</span><input type="range" min="${mn}" max="${mx}" value="${cur}"><b>${cur}${u}</b>`);
                const inp = row.querySelector('input'), val = row.querySelector('b');
                inp.oninput = () => { stuCur.lay[k] = +inp.value; val.textContent = inp.value + u; stuRenderLay(); };
                w.appendChild(row);
            });
            const r = stuEl('button', 'btn stu-clear', '↺ 기본 크기 · 간격으로'); r.type = 'button';
            r.onclick = () => { stuCur.lay = {}; stuRenderLay(); stuRefreshWin(); };
            w.appendChild(r);
        }

        function stuBuildSave(w) {
            w.appendChild(stuEl('div', 'stu-hint', '지금 다이어리의 <b>색 + 꾸밈 + 아이콘</b>이 모두 내 페이지로 저장돼요.<br>색은 🎨 기본페이지 창에서 고쳐요.'));
            w.appendChild(stuEl('div', 'stu-sum', `꾸밈 ${stuCur.deco.length}개 · 바꾼 아이콘 ${Object.keys(stuCur.icons).length}개 · 내 이미지 ${Object.keys(stuCur.imgs).length}개`));
            const inp = stuEl('input', 'btn skin-name-input'); inp.id = 'stuName'; inp.maxLength = 20; inp.placeholder = '페이지 이름 입력';
            w.appendChild(inp);
            const sv = stuEl('button', 'btn skin-save-btn', '➕ 내 페이지로 등록하기'); sv.type = 'button'; sv.onclick = stuSave; w.appendChild(sv);
            const cl = stuEl('button', 'btn stu-clear', '🎨 색 바꾸러 가기 (기본페이지)'); cl.type = 'button'; cl.onclick = () => { closeStudio(); openSkinBasic(); }; w.appendChild(cl);
        }
        async function stuSave() {
            const name = cleanSkinName(document.getElementById('stuName').value);
            if (!name) { showMsg('페이지 이름을 입력해주세요!'); return; }
            if (hasOwn(skinPresets, name) || name.startsWith('cs:') || name.startsWith('th:')) { showMsg('그 이름은 쓸 수 없어요.<br>다른 이름을 적어 주세요.'); return; }
            if (hasOwn(customSkins, name) && !(await showMsg(`'${name}' 페이지가 이미 있어요.<br>지금 모양으로 바꿀까요?`, true))) return;
            const extra = stuExtra();
            customSkins[name] = Object.assign(skinFromPickers(), extra);
            store.setItem('diary_custom_skins', JSON.stringify(customSkins));
            applySkinPreset(name);
            closeStudio();
            showMsg(`'${name}' 페이지가 저장되었어요!<br><span style="font-size:12px;color:#777;">🎨 페이지 목록의 '내 페이지'에서 언제든 고를 수 있어요.</span>`);
        }

        /* ---------- 다이어리 위에서 끌기 ---------- */
        (function stuSetupDrag() {
            let drag = null, pinch = null;
            const hostOf = (el, d) => d.a === 'pop' ? document.getElementById('stuFakePop') : stuHost(d.a);
            const elOf = (host, idx) => host.querySelector(`:scope > .stu-deco[data-idx="${idx}"]`);
            const paint = (d, el) => {
                el.style.width = el.style.height = d.s + 'px';
                el.style.transform = `translate(-50%,-50%) rotate(${d.r || 0}deg)${d.f ? ' scaleX(-1)' : ''}`;
            };
            const norm = a => { a = ((a + 180) % 360 + 360) % 360 - 180; return Math.round(a); };
            const ang = (x, y, c) => Math.atan2(y - c.y, x - c.x) * 180 / Math.PI;
            const center = el => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
            const finish = () => { const had = drag && (drag.moved || drag.mode !== 'move'); drag = null; pinch = null; if (had) stuRefreshWin(); };
            document.addEventListener('pointerdown', e => {
                if (!document.body.classList.contains('stu-edit')) return;
                /* ✌️ 손가락 두 개 : 고른 꾸밈을 벌리면 크기 · 비틀면 회전 (기존 그림과 같은 방식) */
                if (drag && e.pointerId !== drag.id && !pinch) {
                    const d = stuCur.deco[drag.idx], el = elOf(drag.host, drag.idx);
                    if (d && el) {
                        const dx = e.clientX - drag.lx, dy = e.clientY - drag.ly;
                        pinch = { idx: drag.idx, host: drag.host, p: { [drag.id]: [drag.lx, drag.ly], [e.pointerId]: [e.clientX, e.clientY] }, d0: Math.hypot(dx, dy) || 1, a0: Math.atan2(dy, dx) * 180 / Math.PI, s0: d.s, r0: d.r || 0 };
                        drag.mode = 'pinch'; e.preventDefault(); e.stopPropagation();
                    }
                    return;
                }
                const el = e.target.closest && e.target.closest('.stu-deco');
                if (!el) return;
                const idx = +el.dataset.idx, d = stuCur.deco[idx], host = d && hostOf(el, d);
                if (!d || !host) return;
                e.preventDefault(); e.stopPropagation();
                const zone = e.target.classList && e.target.classList.contains('rot-zone');
                if (stuSel !== idx) { stuSel = idx; stuRenderDeco(); stuTab = 'deco'; stuRefreshWin(); }
                const cur = elOf(host, idx) || el, r = host.getBoundingClientRect();
                drag = { id: e.pointerId, idx, host, mode: zone ? 'rotate' : 'move', lx: e.clientX, ly: e.clientY, moved: false,
                    ox: d.x - (e.clientX - r.left) / r.width * 100, oy: d.y - (e.clientY - r.top) / r.height * 100 };
                if (zone) drag.a0 = ang(e.clientX, e.clientY, center(cur)) - (d.r || 0);   // 네 꼭짓점을 잡고 돌리면 회전
            }, true);
            window.addEventListener('pointermove', e => {
                if (pinch && pinch.p[e.pointerId]) {
                    pinch.p[e.pointerId] = [e.clientX, e.clientY];
                    const k = Object.keys(pinch.p); if (k.length < 2) return;
                    const A = pinch.p[k[0]], B = pinch.p[k[1]], dx = B[0] - A[0], dy = B[1] - A[1];
                    const d = stuCur.deco[pinch.idx], el = d && elOf(pinch.host, pinch.idx); if (!d || !el) return;
                    d.s = Math.round(stuNum(pinch.s0 * (Math.hypot(dx, dy) / pinch.d0), 12, 200, d.s));
                    d.r = norm(pinch.r0 + (Math.atan2(dy, dx) * 180 / Math.PI - pinch.a0));
                    paint(d, el); drag.moved = true;
                    return;
                }
                if (!drag || drag.id !== e.pointerId || pinch) return;
                drag.lx = e.clientX; drag.ly = e.clientY;
                const d = stuCur.deco[drag.idx]; if (!d) return;
                const el = elOf(drag.host, drag.idx);
                if (drag.mode === 'rotate') {
                    if (!el) return;
                    d.r = norm(ang(e.clientX, e.clientY, center(el)) - drag.a0);
                    paint(d, el); drag.moved = true; return;
                }
                const r = drag.host.getBoundingClientRect();
                d.x = Math.round(stuNum((e.clientX - r.left) / r.width * 100 + drag.ox, -60, 160, d.x) * 10) / 10;
                d.y = Math.round(stuNum((e.clientY - r.top) / r.height * 100 + drag.oy, -60, 160, d.y) * 10) / 10;
                drag.moved = true;
                if (el) { el.style.left = d.x + '%'; el.style.top = d.y + '%'; }
            });
            const end = e => {
                if (pinch && pinch.p[e.pointerId]) { finish(); return; }
                if (drag && drag.id === e.pointerId && !pinch) finish();
                else if (drag && drag.id === e.pointerId) finish();
            };
            window.addEventListener('pointerup', end); window.addEventListener('pointercancel', end);
            /* 🖱 마우스 휠 : 고른 꾸밈 크기 조절 (기존 그림과 같음) */
            document.addEventListener('wheel', e => {
                if (!document.body.classList.contains('stu-edit')) return;
                const el = e.target.closest && e.target.closest('.stu-deco'); if (!el) return;
                const idx = +el.dataset.idx, d = stuCur.deco[idx]; if (!d) return;
                e.preventDefault();
                d.s = Math.round(stuNum(d.s * (e.deltaY < 0 ? 1.06 : .94), 12, 200, d.s));
                paint(d, el); clearTimeout(stuWheelT); stuWheelT = setTimeout(stuRefreshWin, 200);
            }, { passive: false });
            /* 만드는 동안은 다이어리 · 하단 버튼이 눌려서 열리지 않게 */
            document.addEventListener('click', e => {
                if (!document.body.classList.contains('stu-edit')) return;
                if (e.target.closest('.toolbar, #pageHeader, #canvasArea, #stuFakePop, .stu-deco')) {
                    e.preventDefault(); e.stopPropagation();
                    if (!e.target.closest('.stu-deco') && stuSel >= 0) { stuSel = -1; stuRenderDeco(); stuRefreshWin(); }
                }
            }, true);
            window.addEventListener('resize', () => { if (stuIsOpen()) stuShowFakePop(); });
        })();

        /* 이 파일을 끝까지 문제없이 읽었다는 표시 */
        (window.MALLANG_LOADED = window.MALLANG_LOADED || {})['skinstudio'] = true;
