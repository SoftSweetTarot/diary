/* 말랑달콤 다이어리 - js/stknote.js
   📒 스티커 수첩 : 스티커 고르는 창의 두 번째 모양 (⚙️ 설정 → 📒 스티커 고르는 창 에서 골라요 · 처음엔 🪟 고르는 창)
   - ✨ 스티커 창의 9칸(미니시트 · 캡슐 · 씰 · 조각 · 모조지 · 마테 · 메모지 · 떡메모지 · 속지)을 열면 수첩 겉표지가 먼저 보여요 → 톡 누르면 펼쳐져요
   - 위의 칸(기본 · 내가만든 · 공유받은 …)만 두고 나머지 줄(그림 모음 칸 · 이전/다음 · 배치 · 안내 글 · 공유하기 …)은 숨겨서 스티커가 많이 보여요
   - 옆으로 밀거나 ‹ › 로 한 장씩 넘겨요 (한 장에 들어가는 만큼만 · 잘린 줄은 다음 장으로)
   - 스티커를 꾹 누른 채(마우스는 누른 채 바로) 끌면 수첩이 아래로 비켜 주고, 다이어리 위에 놓으면 그 자리에 붙어요 → 수첩이 다시 올라와요
     톡 누르면 예전처럼 · 다이어리 밖에 놓으면 그대로 돌아가요
   - ✕ 로 닫아요
   ※ 지금 창(🪟 고르는 창)은 그대로예요. 수첩일 때만 같은 창에 모양을 덧입혀요 (목록을 만드는 코드는 같아요)
   저장: 'diary_stk_view'(설정.json) · 게스트는 이 기기 'malang_stk_view' · 값 'list' | 'note' */

        const SNB_KEY = 'diary_stk_view', SNB_LOCAL = 'malang_stk_view';
        const SNB_MODALS = ['stickerModal', 'paperModal', 'tteokModal', 'leafModal'];
        const SNB_KEEP = '.modal-title, .stk-tabs, .sticker-categories, .sub-modal-btns, .snb-rings, .snb-cover, .snb-ear, .snb-under, .snb-flaps';   // 수첩 몸통 밖에 남는 것
        const SNB_HOLD = 260;                               // 손가락으로 꾹 : 이만큼 누르면 스티커가 떠요
        const snb = { pos: { x: 0, y: 0 }, moved: 0, dropping: false, m: null, page: 0, pages: [[0, 0]], press: null, noClick: 0, fire: false, libSaved: null, lastLib: -1, skipCover: false, tm: 0 };
        const snbq = id => document.getElementById(id);

        function snbSync() { return typeof drive !== 'undefined' && drive.ready && !drive.guest && typeof store !== 'undefined'; }
        function snbMode() {
            let v = null;
            try { v = snbSync() ? store.getItem(SNB_KEY) : localStorage.getItem(SNB_LOCAL); } catch (e) {}
            try { v = JSON.parse(v); } catch (e) {}
            return v === 'note' ? 'note' : 'list';
        }
        function snbSet(v) {
            const t = JSON.stringify(v === 'note' ? 'note' : 'list');
            try { if (snbSync()) store.setItem(SNB_KEY, t); } catch (e) {}
            try { localStorage.setItem(SNB_LOCAL, t); } catch (e) {}
            snbRender();
        }
        function snbRender() { document.querySelectorAll('#snbPick [data-v]').forEach(b => b.classList.toggle('on', b.dataset.v === snbMode())); }

        /* ---------- 수첩 옷 입히기 / 벗기기 ---------- */
        function snbWrap(m) {
            const box = m.querySelector('.modal-content');
            if (box.querySelector(':scope > .snb-body')) return box.querySelector(':scope > .snb-body');
            const body = document.createElement('div'); body.className = 'snb-body';
            const kids = [...box.children].filter(c => !c.matches(SNB_KEEP));
            if (kids[0]) box.insertBefore(body, kids[0]); else box.appendChild(body);
            kids.forEach(c => body.appendChild(c));
            const rings = document.createElement('div'); rings.className = 'snb-rings'; rings.innerHTML = '<i></i>'.repeat(9);
            const ears = ['prev', 'next'].map(k => { const e = document.createElement('div'); e.className = 'snb-ear ' + k; e.dataset.dir = k === 'next' ? 1 : -1; e.setAttribute('aria-label', k === 'next' ? '다음 장' : '앞 장'); return e; });
            const cover = document.createElement('div'); cover.className = 'snb-cover'; cover.hidden = true;
            cover.onclick = () => { if (Date.now() > snb.moved) snbOpenCover(cover); };
            box.prepend(rings); box.append(...ears, cover);
            snbBind(m, body);
            snbMovable(m, box);
            new MutationObserver(snbSoon).observe(body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
            body.addEventListener('load', snbSoon, true);
            return body;
        }
        function snbUnwrap(m) {
            const box = m.querySelector('.modal-content'), body = box.querySelector(':scope > .snb-body'); if (!body) return;
            [...body.children].forEach(c => box.insertBefore(c, body));
            box.querySelectorAll(':scope > .snb-body, :scope > .snb-rings, :scope > .snb-ear, :scope > .snb-under, :scope > .snb-flaps, :scope > .snb-cover').forEach(e => e.remove());
            m.classList.remove('snb-on', 'snb-away');
            box.style.left = box.style.top = box.style.width = box.style.height = '';
        }

        /* ✋ 수첩 옮기기 : 펼친 뒤 위 제목 줄을 누른 채 끌면 수첩이 따라와요 · 겉표지일 땐 고정 (도련 · 2026-10-09)
           화면 밖으로는 안 나가요 · 아홉 창이 같은 자리를 써요 */
        function snbMovable(m, box) {
            let st = null;
            const grip = e => { const c = m.querySelector('.snb-cover'); return (!c || c.hidden) && e.target.closest && e.target.closest('.modal-title') && !e.target.closest('button'); };
            box.addEventListener('pointerdown', e => {
                if (e.button > 0 || !m.classList.contains('snb-on') || !grip(e)) return;
                st = { id: e.pointerId, x: e.clientX, y: e.clientY, ox: snb.pos.x, oy: snb.pos.y, on: false };
            });
            window.addEventListener('pointermove', e => {
                if (!st || st.id !== e.pointerId) return;
                if (!st.on) { if (Math.hypot(e.clientX - st.x, e.clientY - st.y) < 6) return; st.on = true; try { box.setPointerCapture(e.pointerId); } catch (er) {} }
                snb.pos = { x: st.ox + e.clientX - st.x, y: st.oy + e.clientY - st.y };
                snbPlaceBox(box);
                e.preventDefault();
            });
            const end = e => { if (!st || st.id !== e.pointerId) return; if (st.on) snb.moved = Date.now() + 350; st = null; };
            window.addEventListener('pointerup', end, true); window.addEventListener('pointercancel', end, true);
        }
        function snbPlaceBox(box) {
            if (!box) return;
            box.style.left = box.style.top = '0px';
            const L = box.offsetLeft, T = box.offsetTop, p = snb.pos;                // 애니메이션 중에도 바뀌지 않는 제자리
            p.x = Math.max(-L, Math.min(innerWidth - box.offsetWidth - L, p.x));
            p.y = Math.max(-T, Math.min(innerHeight - box.offsetHeight - T, p.y));
            box.style.left = p.x + 'px'; box.style.top = p.y + 'px';
        }

        /* 창이 열리고 닫히는 것을 지켜봐요 (창을 여는 코드는 그대로) */
        SNB_MODALS.forEach(id => {
            const m = snbq(id); if (!m) return;
            let shown = false;
            new MutationObserver(() => {
                const on = m.style.display === 'flex';
                if (on === shown) return;
                shown = on;
                if (on) snbOnShow(m); else snbOnHide(m);
            }).observe(m, { attributes: true, attributeFilter: ['style'] });
        });
        function snbOnShow(m) {
            if (snbMode() !== 'note') { snbUnwrap(m); if (snb.m === m) snb.m = null; return; }
            snbWrap(m);
            m.classList.add('snb-on'); m.classList.remove('snb-away');
            snbSize(m); snbPlaceBox(m.querySelector('.modal-content'));
            const again = snb.skipCover && snb.m === m;
            snb.skipCover = false;
            snb.m = m;
            if (!again) { snb.page = 0; snb.lastLib = -1; snbCover(m); }
            snbMeasure();
        }
        function snbOnHide(m) {
            m.classList.remove('snb-away');
            if (snb.m !== m || snb.skipCover || snb.dropping) return;
            if (snb.libSaved && typeof libLayout !== 'undefined') {           // 🏷️ 그림 모음 배치는 원래대로 (수첩일 때만 장에 맞춰요)
                const first = libPage * libLayout.rows * libLayout.cols;
                libLayout = snb.libSaved; snb.libSaved = null;
                libPage = Math.floor(first / (libLayout.rows * libLayout.cols));
            }
        }

        /* 📐 수첩 크기 : 480 × 620 고정 (도련 · 2026-10-09) · 화면이 그보다 작으면 화면 안에 들어오게만 줄여요 */
        const SNB_W = 480, SNB_H = 620;
        function snbSize(m) {
            const box = m && m.querySelector('.modal-content'); if (!box) return;
            box.style.width = Math.min(SNB_W, innerWidth - 12) + 'px';
            box.style.height = Math.min(SNB_H, innerHeight - 12) + 'px';
        }
        window.addEventListener('resize', () => { if (snb.m && snb.m.classList.contains('snb-on')) { snbSize(snb.m); snbPlaceBox(snb.m.querySelector('.modal-content')); } });

        /* ---------- 📔 겉표지 : 다이어리 겉표지처럼 깅엄 + 레이스 · 톡 누르면 펼쳐져요 ---------- */
        function snbCover(m) {
            const c = m.querySelector('.snb-cover'); if (!c) return;
            const t = (m.querySelector('.modal-title .mt-text') || m.querySelector('.modal-title') || {}).textContent || '';
            const sp = t.trim().match(/^(\S+)\s+(.+)$/) || ['', '📒', t.trim()];
            const esc = s => s.replace(/[<>&"]/g, '');
            c.innerHTML = `<i class="snb-lace top"></i><i class="snb-lace bot"></i><span class="snb-cv-card"><b>${esc(sp[2])}</b><small>나의 스티커 수첩</small></span><span class="snb-cv-ic">${esc(sp[1])}</span><em>톡 눌러 펼쳐요</em><small class="snb-cv-tip">스티커를 꾹 누른 뒤 끌어다 다이어리에 놓으면 붙어요</small>`;
            c.classList.remove('open'); c.hidden = false;
        }
        function snbOpenCover(c) {
            if (c.classList.contains('open')) return;
            c.classList.add('open');
            if (window.sfx) try { sfx('page'); } catch (e) {}
            setTimeout(() => { c.hidden = true; c.classList.remove('open'); }, 560);
        }

        /* ---------- 📄 장 나누기 : 몸통 안의 작은 칸들을 줄 단위로 모아 한 장에 들어가는 만큼씩 ---------- */
        function snbSoon() { clearTimeout(snb.tm); snb.tm = setTimeout(snbMeasure, 60); }
        window.addEventListener('resize', snbSoon);
        function snbLibOn(m) { const b = snbq('libBox'); return m && m.id === 'stickerModal' && b && !b.hidden; }
        /* 🏷️ 씰스티커 → 기본(그림 모음) : 그림 모음 전체를 한 번에 펼쳐 두고 수첩이 장을 나눠요 · 칸 크기는 수첩 폭에 맞춰요 (이 기기 배치 설정은 안 바꿔요)
           그림은 loading=lazy 라 펼친 장의 그림만 불러와요 */
        function snbLibFit(body) {
            if (typeof libLayout === 'undefined' || typeof renderLibrary !== 'function') return false;
            const g = 8, w = body.clientWidth - 12, h = body.clientHeight - 12;
            if (w < 100 || h < 100) return false;
            const cols = Math.max(3, Math.min(10, Math.round(w / 92))), size = Math.max(50, Math.min(140, Math.floor((w - (cols - 1) * g) / cols)));
            const n = typeof libView === 'function' ? libView().length : 0, rows = Math.max(1, Math.ceil(n / cols));
            if (libLayout.cols === cols && libLayout.rows === rows && libLayout.size === size) return false;
            if (!snb.libSaved) snb.libSaved = libLayout;
            libLayout = { rows, cols, size };
            libPage = 0;
            if (typeof libItems !== 'undefined' && libItems) renderLibrary(); else if (typeof applyLibLayoutStyle === 'function') applyLibLayoutStyle();
            return true;
        }
        function snbMeasure() {
            const m = snb.m; if (!m || m.style.display !== 'flex' || !m.classList.contains('snb-on')) return;
            const body = m.querySelector('.snb-body'); if (!body || !body.clientHeight) return;
            if (snbLibOn(m)) {
                if (typeof libCat !== 'undefined' && libCat && typeof libItems !== 'undefined' && libItems) { libCat = ''; libPage = 0; renderLibrary(); return; }   // 그림 모음 칸 줄이 숨어 있으니 늘 🌈 전체
                if (snbLibFit(body)) return;                                   // 다시 그려지면 또 불려요
            }
            const H = body.clientHeight, top0 = body.getBoundingClientRect().top - body.scrollTop, atoms = [];
            const walk = el => {
                for (const c of el.children) {
                    if (c.hidden) continue;
                    const r = c.getBoundingClientRect();
                    if (!r.height || !r.width) { if (getComputedStyle(c).display === 'contents') walk(c); continue; }   // .cg-host (모음 칸) 은 껍데기만
                    if (r.height <= H * .6 || !c.children.length) atoms.push([r.top - top0, r.bottom - top0]); else walk(c);
                }
            };
            walk(body);
            atoms.sort((a, b) => a[0] - b[0]);
            const pages = [], end = atoms.reduce((v, a) => Math.max(v, a[1]), 0);
            let s = atoms.length ? Math.max(0, atoms[0][0] - 4) : 0;
            while (pages.length < 999) {
                let e = s, nx = Infinity;
                for (const [t, b] of atoms) { if (b <= s + 1) continue; if (b <= s + H - 2) e = Math.max(e, b); else nx = Math.min(nx, t); }
                pages.push([s, e]);
                if (nx === Infinity || e >= end - 1 && nx >= end) break;
                s = nx > s + 8 ? nx - 4 : s + H - 4;                            // 한 장보다 큰 칸은 잘라서라도 넘겨요
            }
            snb.pages = pages.length ? pages : [[0, 0]];
            body.style.setProperty('--snb-h', H + 'px');
            snb.page = Math.max(0, Math.min(snb.pages.length - 1, snb.page));
            snbShow();
        }
        function snbCut(n, H) { const [s0, e0] = snb.pages[n] || [0, 0]; const c = Math.floor(H - (e0 - s0) - 4); return c > 2 && snb.pages.length > 1 ? c : 0; }
        function snbShow() {
            const m = snb.m; if (!m) return;
            const body = m.querySelector('.snb-body'); if (!body || snb.curl) return;
            body.scrollTop = (snb.pages[snb.page] || [0])[0];
            const cut = snbCut(snb.page, body.clientHeight);
            body.style.clipPath = cut ? `inset(0 0 ${cut}px 0)` : '';
            m.querySelectorAll('.snb-ear').forEach(e => { const n = snb.page + +e.dataset.dir; e.hidden = n < 0 || n >= snb.pages.length; });
        }
        function snbGo(d) { if (snbCurlBegin(d)) snbCurlTo(snb.curl.W, true); }

        /* ---------- 📖 장 넘기기 : 다이어리처럼 손가락을 따라 장이 접히며 넘어가요 (js/page.js beginCurl 과 같은 모양)
           뒤에 넘어갈 장(복사본)을 깔고 → 지금 장을 접히는 선까지 잘라 내고 → 접힌 뒷면(flap)과 그림자를 그려요 ---------- */
        function snbCurlBegin(dir) {
            const m = snb.m; if (!m || snb.curl) return false;
            const body = m.querySelector('.snb-body'), box = body && body.parentElement, n = snb.page + dir;
            if (!body || n < 0 || n >= snb.pages.length) return false;
            const W = body.clientWidth, H = body.clientHeight, pos = { left: body.offsetLeft + 'px', top: body.offsetTop + 'px', width: W + 'px', height: H + 'px' };
            const under = document.createElement('div'); under.className = 'snb-under'; Object.assign(under.style, pos);
            const cl = body.cloneNode(true); cl.className = 'snb-clone'; cl.removeAttribute('style'); cl.style.setProperty('--snb-h', H + 'px');
            cl.querySelectorAll('[id]').forEach(e => e.removeAttribute('id'));
            under.appendChild(cl);
            const shadow = document.createElement('i'); shadow.className = 'snb-shadow ' + (dir > 0 ? 'next' : 'prev'); under.appendChild(shadow);
            const layer = document.createElement('div'); layer.className = 'snb-flaps'; Object.assign(layer.style, pos);
            const flap = document.createElement('i'); flap.className = 'snb-flap ' + (dir > 0 ? 'next' : 'prev'); layer.appendChild(flap);
            box.insertBefore(under, body); box.appendChild(layer);
            cl.scrollTop = snb.pages[n][0];
            const uc = snbCut(n, H); if (uc) cl.style.clipPath = `inset(0 0 ${uc}px 0)`;
            snb.curl = { dir, n, W, body, under, layer, flap, shadow, cut: snbCut(snb.page, H), d: 0 };
            m.querySelectorAll('.snb-ear').forEach(e => { e.hidden = true; });
            snbCurlAt(0);
            return true;
        }
        function snbCurlAt(d) {
            const c = snb.curl; if (!c) return;
            d = Math.max(0, Math.min(c.W, d)); c.d = d;
            const show = d >= 1, sw = Math.min(70, d);
            c.flap.style.display = c.shadow.style.display = show ? 'block' : 'none';
            c.flap.style.width = d + 'px'; c.shadow.style.width = sw + 'px';
            if (c.dir > 0) { c.body.style.clipPath = `inset(0 ${d}px ${c.cut}px 0)`; c.flap.style.left = (c.W - 2 * d) + 'px'; c.shadow.style.left = (c.W - d - 4) + 'px'; }
            else { c.body.style.clipPath = `inset(0 0 ${c.cut}px ${d}px)`; c.flap.style.left = d + 'px'; c.shadow.style.left = (d - sw - 4) + 'px'; }
        }
        function snbCurlTo(target, complete) {
            const c = snb.curl; if (!c) return;
            const from = c.d, dur = 120 + 420 * Math.abs(target - from) / c.W, t0 = performance.now();
            if (complete && window.sfx) try { sfx('page'); } catch (e) {}
            const step = now => {
                if (snb.curl !== c) return;
                const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
                snbCurlAt(from + (target - from) * e);
                if (k < 1) requestAnimationFrame(step); else snbCurlEnd(complete);
            };
            requestAnimationFrame(step);
        }
        function snbCurlEnd(complete) {
            const c = snb.curl; if (!c) return;
            if (complete) snb.page = c.n;
            c.under.remove(); c.layer.remove();
            snb.curl = null;
            snbShow();
        }

        /* ---------- ✋ 밀어서 넘기기 · 꾹 눌러 끌어 붙이기 ---------- */
        function snbItemOf(t, body) {
            if (!t.closest || t.closest('.smk-it > i, .shx-bar, .cs-empty, .smk-empty, .cg-more, .stk-go, input, select, textarea, a')) return null;
            const it = t.closest('.lib-item, .sticker-item, .smk-it, .spk-card') || t.closest('button, [onclick], img, canvas');   // 칸 단위가 먼저
            return it && it !== body && body.contains(it) && !it.classList.contains('empty') ? it : null;
        }
        function snbBind(m, body) {
            body.addEventListener('dragstart', e => e.preventDefault());
            body.parentElement.addEventListener('pointerdown', e => {         // 먼저 들어요 (🧻 떡메 칸처럼 눌림을 스스로 막는 칸도 있어서) · 제목 줄 아래 어디서든
                if (e.button > 0 || !m.classList.contains('snb-on') || !e.target.closest || e.target.closest('.modal-title, .snb-cover, .snb-ear')) return;
                if (snb.press) { if (snb.press.drag) return; clearTimeout(snb.press.timer); }
                const it = snbItemOf(e.target, body);
                const p = snb.press = { body, id: e.pointerId, x: e.clientX, y: e.clientY, t: e.target, it, mouse: e.pointerType === 'mouse', touch: e.pointerType === 'touch', drag: false, timer: 0 };
                if (it) p.timer = setTimeout(() => { if (snb.press === p && !p.gone) snbLift(e, body); }, SNB_HOLD);
            }, true);
            window.addEventListener('pointermove', e => {
                const p = snb.press; if (!p || p.id !== e.pointerId || p.body !== body) return;
                const dx = e.clientX - p.x, dy = e.clientY - p.y, d = Math.hypot(dx, dy);
                if (p.drag) { snbGhostAt(e.clientX, e.clientY); e.preventDefault(); return; }
                if (p.curl) { snbCurlAt((p.curl > 0 ? -dx : dx) - (p.ear ? 0 : 8)); e.preventDefault(); return; }
                if (d > 8) { clearTimeout(p.timer); p.gone = true; }
                if (d > 8 && !p.swipe) {                                       // 제목 아래는 어디를 밀어도 장 넘기기 · 스티커는 꾹 누른 뒤 끌어요 (마우스도 같아요)
                    p.swipe = true;
                    if (Math.abs(dx) > Math.abs(dy) && snbCurlBegin(dx < 0 ? 1 : -1)) { p.curl = dx < 0 ? 1 : -1; p.t0 = performance.now(); }
                }
            });
            const up = e => {
                const p = snb.press; if (!p || p.id !== e.pointerId || p.body !== body) return;
                clearTimeout(p.timer); snb.press = null;
                if (p.drag) { snb.noClick = Date.now() + 500; snbDrop(p, e.clientX, e.clientY, e.type === 'pointercancel'); return; }
                if (p.curl && snb.curl) {
                    snb.noClick = Date.now() + 400;
                    const c = snb.curl, fast = c.d > 30 && performance.now() - (p.t0 || 0) < 260;
                    const done = e.type !== 'pointercancel' && (c.d > c.W * .3 || fast || (p.ear && c.d < 6));   // 귀퉁이를 톡 눌러도 넘어가요
                    snbCurlTo(done ? c.W : 0, done);
                } else if (p.swipe) snb.noClick = Date.now() + 400;
            };
            window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);   // 몸통 밖에서 떼도 끝나요
            body.addEventListener('touchend', e => { if (Date.now() < snb.noClick) e.stopPropagation(); }, true);   // 밀기 · 끌어 붙이기는 수첩이 맡아요 (그림 모음이 한 번 더 넘기지 않게)
            body.addEventListener('contextmenu', e => e.preventDefault());
            m.querySelectorAll('.snb-ear').forEach(ear => ear.addEventListener('pointerdown', e => {   // 📄 아래 귀퉁이 : 잡아 넘기기 · 톡 눌러 넘기기 (마우스로도 쉽게)
                if (e.button > 0 || snb.curl) return;
                e.preventDefault();
                const dir = +ear.dataset.dir;
                if (!snbCurlBegin(dir)) return;
                snb.press = { body, id: e.pointerId, x: e.clientX, y: e.clientY, t: ear, it: null, ear: true, curl: dir, swipe: true, t0: performance.now(), timer: 0 };
                try { ear.setPointerCapture(e.pointerId); } catch (er) {}
            }));
        }
        document.addEventListener('click', e => {
            if (snb.fire || Date.now() > snb.noClick || !snb.m || !snb.m.contains(e.target)) return;
            e.stopPropagation(); e.preventDefault();
        }, true);

        function snbLift(e, body) {
            const p = snb.press; if (!p || p.drag || !p.it) return;
            p.drag = true;
            try { body.setPointerCapture(p.id); } catch (er) {}
            const it = p.it, r = it.getBoundingClientRect();
            const g = document.createElement('div'); g.className = 'snb-ghost';
            const img = it.tagName === 'IMG' ? it : it.querySelector('img');
            const cv = it.tagName === 'CANVAS' ? it : it.querySelector('canvas');
            if (img) g.innerHTML = `<img src="${img.currentSrc || img.src}" alt="">`;
            else if (cv) { try { g.innerHTML = `<img src="${cv.toDataURL()}" alt="">`; } catch (er) { g.appendChild(it.cloneNode(true)); } }
            else g.appendChild(it.cloneNode(true));
            const w = Math.min(160, Math.max(48, r.width)), h = Math.min(160, Math.max(48, r.height));
            g.style.width = w + 'px'; g.style.height = h + 'px';
            document.body.appendChild(g);
            p.ghost = g; p.gw = w; p.gh = h;
            snbGhostAt(p.x, p.y);
            snb.m.classList.add('snb-away');
            if (navigator.vibrate) try { navigator.vibrate(12); } catch (er) {}
        }
        function snbGhostAt(x, y) { const p = snb.press || snb.last; if (p && p.ghost) p.ghost.style.transform = `translate(${x - p.gw / 2}px, ${y - p.gh / 2}px) rotate(-4deg) scale(1.12)`; }
        function snbOver(x, y) {
            const cv = snbq('canvasArea'); if (!cv || (typeof isCoverOpen !== 'undefined' && !isCoverOpen)) return false;
            const r = cv.getBoundingClientRect();
            return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
        }
        function snbDrop(p, x, y, cancel) {
            const m = snb.m, g = p.ghost, ok = !cancel && Math.hypot(x - p.x, y - p.y) > 12 && snbOver(x, y);   // 꾹 누르고 그대로 떼면 붙이지 않아요
            if (g) {
                g.classList.add(ok ? 'stick' : 'back');
                if (!ok) { const r = p.it.getBoundingClientRect(); g.style.transform = `translate(${r.left + r.width / 2 - p.gw / 2}px, ${r.top + r.height / 2 - p.gh / 2}px)`; }
                setTimeout(() => g.remove(), ok ? 180 : 260);
            }
            if (!ok) { if (m) m.classList.remove('snb-away'); return; }
            snbPut(p, x, y);
        }
        /* 놓은 자리에 붙이기 : 그 스티커를 톡 누른 것과 똑같이 한 뒤, 새로 생긴 것을 놓은 자리로 옮겨요
           (🏷️ 그림 모음은 떼는 창 없이 하얀 테두리째 바로 붙여요 · 봉투 · 대지 · 모조지처럼 창이 뜨는 것은 그 창이 떠요) */
        function snbPut(p, x, y) {
            const m = snb.m, cv = snbq('canvasArea'), before = new Set(cv.children);
            let found = null;
            snb.dropping = true; setTimeout(() => { snb.dropping = false; }, 2700);
            const mo = new MutationObserver(() => {
                const el = [...cv.children].find(c => !before.has(c) && c.classList.contains('element-box'));
                if (!el || found) return;
                found = el; mo.disconnect(); snbPlace(el, x, y); snbBack(m, true);
            });
            mo.observe(cv, { childList: true });
            setTimeout(() => { if (found) return; mo.disconnect(); snbBack(m, false); }, 2500);
            const it = p.it;
            if (it.classList.contains('lib-item')) {
                const im = it.querySelector('img'); if (!im) return;
                const url = im.src.replace(/=w\d+$/, '');
                closeModal(m.id);
                (async () => { let s = url; try { if (window.pelBake) s = await pelBake(url); } catch (e) {} addImage(s); })();
                return;
            }
            if (m.id === 'leafModal') setTimeout(() => { if (!found) { found = 1; mo.disconnect(); snbBack(m, true); } }, 650);   // 📃 속지는 바탕만 바뀌어요
            const t = p.t && it.contains(p.t) ? p.t : it;
            snb.fire = true;
            try {
                if (it.classList.contains('tk-it')) {                          // 🧻 떡메 칸은 누르고 떼는 것으로 골라요 (js/leafpad.js tkTap)
                    const r = it.getBoundingClientRect(), o = { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerId: 99 };
                    it.dispatchEvent(new PointerEvent('pointerdown', o)); it.dispatchEvent(new PointerEvent('pointerup', o));
                } else t.click();
            } finally { snb.fire = false; }
        }
        /* 수첩 다시 올라오기 : 붙였으면 (창이 닫혔어도) 표지 없이 그 장 그대로 다시 열어요 */
        function snbBack(m, reopen) {
            if (!m) return;
            if (m.style.display === 'flex') { m.classList.remove('snb-away'); return; }
            if (!reopen) { m.classList.remove('snb-away'); return; }
            const other = [...document.querySelectorAll('.modal')].some(x => x !== m && x.style.display === 'flex');
            if (other) { m.classList.remove('snb-away'); return; }
            snb.skipCover = true;
            setTimeout(() => { snb.skipCover = true; m.style.display = 'flex'; setTimeout(() => m.classList.remove('snb-away'), 30); }, 260);
        }
        /* 새로 붙은 것의 가운데를 놓은 자리로 (페이지 밖으로 넘치면 안쪽으로) · elCenter 와 같은 계산 */
        function snbPlace(el, x, y) {
            const go = () => {
                if (!el.isConnected) return;
                const pg = snbq('canvasArea'), r = pg.getBoundingClientRect(), k = r.width / (pg.offsetWidth || r.width) || 1;
                const put = (a, b) => { el.dataset.posX = a; el.dataset.posY = b; el.style.transform = `translate(${a}px, ${b}px) scale(${el.dataset.scale || 1}) rotate(${el.dataset.rotation || 0}deg)`; };
                put(0, 0);
                const b = el.getBoundingClientRect(), hw = Math.min(b.width, r.width) / 2, hh = Math.min(b.height, r.height) / 2;
                const cx = Math.min(r.right - hw, Math.max(r.left + hw, x)), cy = Math.min(r.bottom - hh, Math.max(r.top + hh, y));
                put(Math.round((cx - (b.left + b.width / 2)) / k), Math.round((cy - (b.top + b.height / 2)) / k));
                if (typeof saveData === 'function') saveData(false);
            };
            const later = () => requestAnimationFrame(() => requestAnimationFrame(go));
            const img = el.querySelector('img');
            if (img && !img.complete) { img.addEventListener('load', later, { once: true }); img.addEventListener('error', later, { once: true }); }
            else later();
        }

        window.snbState = () => ({ page: snb.page, pages: snb.pages.length, curl: !!snb.curl }); window.snbMode = snbMode; window.snbSet = snbSet; window.snbRender = snbRender; window.snbGo = snbGo;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['stknote'] = true;
