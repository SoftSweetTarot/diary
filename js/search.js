/* 말랑달콤 다이어리 - js/search.js
   🔍 일기 검색 : 지금까지 쓴 일기에서 낱말을 찾아요 (다이어리 위쪽 날짜 뒤의 🔍)
   - 글상자 · 오늘의 질문 대답 · 이모지 스티커 · 운세/꿈해몽/행운 카드 글 · 기분/날씨 도장 이름까지 찾아요
   - 빠르게 찾으려고 '검색 목록'을 따로 둬요 : 말랑달콤 / 다이어리 / 검색-2026.json (한 해에 파일 1개, 글만 담겨요)
     일기를 저장하면 검색 목록도 고쳐 두었다가, 20초 뒤(또는 화면을 닫을 때) 한 번에 올려요
   - 검색 창을 처음 열 때 (기기마다 · 접속할 때마다 한 번) 드라이브의 일기 목록과 맞춰 봐요
     다른 기기에서 쓴 일기처럼 목록에 없는 날만 그 일기 파일을 읽어서 채워요 (처음 한 번은 조금 걸릴 수 있어요)
   - 게스트(로그인 안 함)는 지금 기기에 있는 일기에서만 찾아요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (검색 버튼만 '준비 중') */

        const SR_PREFIX = '검색-', SR_MAX = 2000, SR_SAVE_MS = 20000;
        const sr = { years: new Map(), synced: false, syncing: null, timer: 0, built: false, q: '' };
        const srq = id => document.getElementById(id);
        const srOn = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        const srEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

        /* 하루치 일기 → 찾을 수 있는 글 */
        function srText(raw) {
            if (!raw) return '';
            const out = [];
            (Array.isArray(raw.i) ? raw.i : []).forEach(it => {
                if (it.t === 't' && it.c) out.push(String(it.c));
                else if (it.t === 's' && it.c) out.push(String(it.c));
                else if (it.t === 'd' && it.c && it.c.name) out.push(String(it.c.name));
                else if (it.t === 'i' && /^data:image\/svg/i.test(slimDec(it.c) || '') && !/malang-(tape|draw)/.test(slimDec(it.c))) {
                    try {                                                        // 운세 · 꿈해몽 · 행운 카드에 적힌 글
                        const svg = decodeURIComponent(String(slimDec(it.c)).replace(/^data:image\/svg\+xml(;charset=utf-8)?,/i, ''));
                        const t = (svg.match(/<text[^>]*>[^<]*<\/text>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join(' ');
                        if (t) out.push(t.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'"));
                    } catch (e) {}
                }
            });
            const lab = (list, id) => { const x = typeof list !== 'undefined' && list.find(q => q[0] === id); return x ? x[2] : ''; };
            if (raw.mo) out.push('기분 ' + lab(typeof PS_MOODS !== 'undefined' ? PS_MOODS : [], raw.mo));
            if (raw.we) out.push('날씨 ' + lab(typeof PS_WEATHERS !== 'undefined' ? PS_WEATHERS : [], raw.we));
            return out.join('\n').replace(/[ \t]+/g, ' ').slice(0, SR_MAX);
        }
        const srDayOf = key => { const p = parseDayKey(key); return p ? `${p.y}-${String(p.m).padStart(2, '0')}-${String(p.d).padStart(2, '0')}` : ''; };

        /* ---------- 해마다 검색 목록 (드라이브 파일) ---------- */
        async function srYear(y) {
            let Y = sr.years.get(y);
            if (Y && Y.ready) return Y;
            if (Y && Y.loading) return Y.loading;
            Y = { ready: false, d: {}, fileId: null, dirty: false, pend: [] };
            sr.years.set(y, Y);
            Y.loading = (async () => {
                try {
                    const rootId = await getFolder(ROOT_PATH, false);
                    if (rootId) {
                        const f = (await driveList(`name='${SR_PREFIX}${y}.json' and '${rootId}' in parents and trashed=false`, 'id,name'))[0];
                        if (f) { Y.fileId = f.id; const o = JSON.parse(await readFileText(f.id) || '{}'); if (o && o.d && typeof o.d === 'object') Y.d = o.d; }
                    }
                } catch (e) {}
                Y.ready = true; Y.loading = null;
                Y.pend.splice(0).forEach(k => srApply(Y, k));
                return Y;
            })();
            return Y.loading;
        }
        function srApply(Y, key) {
            const day = srDayOf(key); if (!day) return;
            let raw = null; try { raw = JSON.parse(store.getItem(key)); } catch (e) {}
            const t = srText(raw);
            const old = Y.d[day];
            if (!t) { if (old) { delete Y.d[day]; Y.dirty = true; } }
            else if (!old || old[0] !== t) { Y.d[day] = [t, '']; Y.dirty = true; }         // '' = 드라이브 파일 시각은 다음에 맞춰 볼게요
            if (Y.dirty) srSchedule();
        }
        /* 일기를 저장할 때마다 (js/elements.js 의 saveData 에서 불러요) */
        function searchTouch(key) {
            if (!srOn()) return;
            const p = parseDayKey(key); if (!p) return;
            const Y = sr.years.get(p.y);
            if (Y && Y.ready) { srApply(Y, key); return; }
            if (Y) { if (!Y.pend.includes(key)) Y.pend.push(key); return; }
            srYear(p.y).then(Y2 => srApply(Y2, key));
        }
        function srSchedule() { clearTimeout(sr.timer); sr.timer = setTimeout(srUpload, SR_SAVE_MS); }
        async function srUpload() {
            clearTimeout(sr.timer);
            if (!srOn()) return;
            for (const [y, Y] of sr.years) {
                if (!Y.ready || !Y.dirty) continue;
                Y.dirty = false;
                try {
                    const rootId = await getFolder(ROOT_PATH, true);
                    const saved = await driveUpsert(rootId, `${SR_PREFIX}${y}.json`, Y.fileId, JSON.stringify({ v: 1, d: Y.d }));
                    Y.fileId = saved.id;
                } catch (e) { Y.dirty = true; if (e && e.code === 'gone') Y.fileId = null; srSchedule(); }
            }
        }
        document.addEventListener('visibilitychange', () => { if (document.hidden) srUpload(); });

        /* ---------- 드라이브의 일기 목록과 맞춰 보기 (검색 창을 열 때 한 번) ---------- */
        async function srSync(progress) {
            if (sr.synced || !srOn()) return;
            if (sr.syncing) return sr.syncing;
            sr.syncing = (async () => {
                const rootId = await getFolder(ROOT_PATH, false);
                if (!rootId) { sr.synced = true; return; }
                const years = (await driveList(`'${rootId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`, 'id,name'))
                    .map(f => +((/^(\d{4})년$/.exec(f.name) || [])[1])).filter(Boolean).sort();
                const need = [];
                for (const y of years) {
                    const Y = await srYear(y), seen = new Set();
                    for (let m = 1; m <= 12; m++) {
                        const idx = await getMonthIndex(y, m, false); if (!idx) continue;
                        idx.files.forEach((f, name) => {
                            const d = (/^(\d{1,2})일\.json$/.exec(name) || [])[1]; if (!d) return;
                            const date = new Date(y, m - 1, +d), key = getDateKey(date), day = srDayOf(key), e = Y.d[day];
                            seen.add(day);
                            if (drive.loadedDays.has(key) || drive.dirtyKeys.has(key)) { srApply(Y, key); if (Y.d[day] && !Y.d[day][1]) Y.d[day][1] = f.modifiedTime || ''; return; }
                            if (!e || (e[1] && f.modifiedTime && e[1] < f.modifiedTime) || !e[1]) need.push({ Y, date, key, day, f });
                        });
                    }
                    Object.keys(Y.d).forEach(day => { if (!seen.has(day) && !store.getItem('diary_' + day.replace(/-/g, '_'))) { delete Y.d[day]; Y.dirty = true; } });
                }
                for (let i = 0; i < need.length; i += 4) {                          // 목록에 없는 날만 읽어서 채우기 (4개씩)
                    if (progress) progress(i, need.length);
                    await Promise.all(need.slice(i, i + 4).map(async n => {
                        try {
                            const text = await fetchDay(n.date);                 // 메모리에 쌓아 두지 않고 글만 뽑아요
                            let raw = null; try { raw = JSON.parse(text); } catch (e) {}
                            const t = srText(raw);
                            if (t) n.Y.d[n.day] = [t, n.f.modifiedTime || '']; else delete n.Y.d[n.day];
                            n.Y.dirty = true;
                        } catch (e) {}
                    }));
                }
                sr.synced = true;
                srSchedule();
            })();
            try { await sr.syncing; } finally { sr.syncing = null; }
        }

        /* ---------- 검색 화면 ---------- */
        function srBuild() {
            if (sr.built) return;
            sr.built = true;
            const el = document.createElement('div');
            el.id = 'searchRoom'; el.className = 'sr-room';
            const moods = typeof PS_MOODS !== 'undefined' ? PS_MOODS : [];
            el.innerHTML = `
              <div class="sr-bar"><span class="sr-sp"></span><b>🔍 일기 검색</b><button class="sr-x" type="button" onclick="closeSearch()" aria-label="닫기">✕</button></div>
              <div class="sr-wrap">
                <div class="sr-box"><span>🔍</span><input id="srInput" type="search" placeholder="찾고 싶은 낱말 (예: 떡볶이, 생일)" autocomplete="off" enterkeyhint="search"></div>
                ${moods.length ? `<div class="sr-moods">${moods.map(m => `<button type="button" onclick="srMood('${m[2]}')">${m[1]}<small>${m[2]}</small></button>`).join('')}</div>` : ''}
                <div class="sr-status" id="srStatus"></div>
                <div class="sr-list" id="srList"></div>
              </div>`;
            document.body.appendChild(el);
            const inp = srq('srInput'); let t = 0;
            inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(srRun, 250); });
            inp.addEventListener('keydown', e => { if (e.key === 'Enter') { clearTimeout(t); srRun(); inp.blur(); } });
        }
        function srMood(label) { srq('srInput').value = '기분 ' + label; srRun(); }
        function srAll() {                                                          // [{ day, text }] (최신 날 먼저)
            const map = new Map();
            sr.years.forEach(Y => Object.keys(Y.d).forEach(day => map.set(day, Y.d[day][0])));
            store.keys().forEach(k => { const day = srDayOf(k); if (day && (!srOn() || drive.loadedDays.has(k) || drive.dirtyKeys.has(k))) { let raw = null; try { raw = JSON.parse(store.getItem(k)); } catch (e) {} const t = srText(raw); if (t) map.set(day, t); else map.delete(day); } });
            return [...map.entries()].sort((a, b) => a[0] < b[0] ? 1 : -1).map(([day, text]) => ({ day, text }));
        }
        function srRun() {
            const q = srq('srInput').value.trim(), list = srq('srList');
            if (!q) { list.innerHTML = ''; srq('srStatus').textContent = sr.synced || !srOn() ? `📔 일기 ${srAll().length}일 중에서 찾아요` : ''; return; }
            const words = q.toLowerCase().split(/\s+/).filter(Boolean);
            const hits = srAll().filter(x => { const t = x.text.toLowerCase(); return words.every(w => t.includes(w)); });
            srq('srStatus').innerHTML = hits.length ? `'<b>${srEsc(q)}</b>' 이(가) 나온 날 <b>${hits.length}</b>일` : `'<b>${srEsc(q)}</b>' 이(가) 나온 날이 없어요`;
            const wk = ['일', '월', '화', '수', '목', '금', '토'];
            list.innerHTML = hits.slice(0, 200).map(x => {
                const [y, m, d] = x.day.split('-').map(Number), dt = new Date(y, m - 1, d);
                const flat = x.text.replace(/\s+/g, ' '), i = flat.toLowerCase().indexOf(words[0]);
                let snip = flat.slice(Math.max(0, i - 24), i + 60); if (i > 24) snip = '…' + snip; if (i + 60 < flat.length) snip += '…';
                let html = srEsc(snip);
                words.forEach(w => { html = html.replace(new RegExp(srEsc(w).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), s => `<mark>${s}</mark>`); });
                return `<button type="button" class="sr-it" onclick="srGo('${x.day}')"><span class="sr-d"><b>${m}월 ${d}일</b><small>${y} · ${wk[dt.getDay()]}</small></span><span class="sr-t">${html}</span></button>`;
            }).join('') + (hits.length > 200 ? '<p class="sr-more">최근 200일까지 보여 줘요. 낱말을 더 넣어 좁혀 보세요.</p>' : '');
        }
        function srGo(day) {
            const [y, m, d] = day.split('-').map(Number);
            closeSearch();
            if (typeof goToDate === 'function') goToDate(new Date(y, m - 1, d));
        }
        async function openSearch() {
            srBuild();
            if (typeof isCoverOpen !== 'undefined' && isCoverOpen) saveData(false);
            srq('searchRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            setTimeout(() => srq('srInput').focus(), 50);
            srRun();
            if (srOn() && !sr.synced) {
                srq('srStatus').textContent = '📔 일기 목록을 살펴보는 중…';
                try { await srSync((i, n) => { srq('srStatus').textContent = `📔 검색 목록을 만드는 중… ${i} / ${n}일 (처음 한 번만)`; }); } catch (e) { srq('srStatus').textContent = '⚠ 일기 목록을 다 읽지 못했어요. 지금 있는 것에서 찾을게요.'; }
                srRun();
            }
        }
        function closeSearch() {
            const r = srq('searchRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openSearch = openSearch;
        window.searchTouch = searchTouch;
