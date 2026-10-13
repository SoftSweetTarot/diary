/* 말랑달콤 다이어리 - js/devsave.js
   📁 로그인 없이 쓰기 : 이 기기의 '말랑달콤' 폴더에 저장 (도련 · 2026-10-13)
   - 첫 화면 '로그인 없이 시작하기' → "일기를 어디에 둘까요?"  📁 폴더 · 👀 구경만
   - 📁 폴더 : 쓰는 대로 자동 저장 · 다음에 열면 알아서 불러와서 바로 열려요 (백업 · 설치 권유 없음)
     · PC 크롬 · 엣지 · 웨일 : 저장할 곳을 고르면 그 안에 '말랑달콤' 폴더를 만들어 진짜 파일로 저장해요
     · 폰 · 아이패드 · 사파리 · 파이어폭스 : 이 기기 브라우저 저장공간 안에 '말랑달콤' 폴더를 만들어요 (파일 앱에서는 안 보여요 · 웹은 폰 폴더를 만들 수 없어요)
   - 폴더 모양은 구글 드라이브와 똑같아요 : 말랑달콤 / 다이어리 / 페이지 / 2026년 / 10월 / 13일.json · 말랑달콤 / 설정 / 설정.json · 말랑달콤 / 카페 / 카페.json
   - 오래 안 쓰면 (아이폰 사파리 : 안 연 날 7일) 브라우저가 지울 수 있어요 → 도련 : 안 쓰는 거라 괜찮아요
   - 구글로 로그인하면 이 기기 일기를 드라이브로 옮길지 물어봐요 (drive.js guestCarry) → 그 뒤로는 드라이브로 열려요
   ※ drive.js 의 initDrive · markDirty · updateBadge · driveLogin 이 이 파일을 불러요 · 이 파일이 없어도 다이어리는 정상 (구경만) */

        const DV_MODE = 'malang_dev_mode';                 // 'idb' (브라우저 저장공간) | 'dir' (PC 폴더) · 없으면 쓰지 않음
        const DV_DB = 'malang-device', DV_FILES = 'files', DV_META = 'meta';
        const DV_TOP = '말랑달콤';
        const dv = { on: false, mode: '', dir: null, top: null, dirty: new Set(), timer: 0, chain: Promise.resolve(), failed: false };
        const dvCanDir = () => typeof window.showDirectoryPicker === 'function';

        /* ---------- 작은 저장소 (IndexedDB) : 파일들 · PC 폴더 손잡이 ---------- */
        let dvDbP = null;
        function dvDb() {
            if (!dvDbP) dvDbP = new Promise((ok, no) => {
                let r; try { r = indexedDB.open(DV_DB, 1); } catch (e) { no(e); return; }
                r.onupgradeneeded = () => { r.result.createObjectStore(DV_FILES); r.result.createObjectStore(DV_META); };
                r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
            });
            dvDbP.catch(() => { dvDbP = null; });
            return dvDbP;
        }
        async function dvTx(store, mode, fn) {
            const db = await dvDb();
            return new Promise((ok, no) => {
                const t = db.transaction(store, mode), s = t.objectStore(store); let out;
                Promise.resolve(fn(s)).then(v => { out = v; });
                t.oncomplete = () => ok(out); t.onerror = () => no(t.error); t.onabort = () => no(t.error);
            });
        }
        const dvReq = q => new Promise((ok, no) => { q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });

        /* ---------- 키 ↔ 파일 자리 (드라이브와 같은 모양) ---------- */
        function dvPlace(k) {
            const dk = parseDayKey(k);
            if (dk) return { dirs: DAY_PATH.slice(1).concat(yearFolderName(dk.y), monthFolderName(dk.m)), name: dayFileName(dk.d), day: k };
            if (isSettingKey(k)) { const F = KEY_FILES[keyFile(k)]; return { dirs: F.path.slice(1), name: F.name, file: keyFile(k) }; }
            return { dirs: SETTINGS_PATH.slice(1), name: '기기.json', file: 'etc' };     // 그 밖의 값 (페이지 크기 등)
        }
        function dvBody(p) {
            if (p.day) return store.getItem(p.day);
            if (p.file === 'etc') {
                const ks = store.keys().filter(k => !isDayKey(k) && !isSettingKey(k));
                const o = {}; ks.forEach(k => { o[k] = store.getItem(k); });
                return ks.length ? JSON.stringify(o) : null;
            }
            const b = settingsBody(p.file); return b === '{}' ? null : b;
        }
        const dvPathText = p => [DV_TOP].concat(p.dirs, p.name).join('/');

        /* ---------- 쓰기 · 읽기 : 브라우저 저장공간 ---------- */
        async function idbWrite(p, body) {
            await dvTx(DV_FILES, 'readwrite', s => { if (body === null) s.delete(dvPathText(p)); else s.put(body, dvPathText(p)); });
        }
        async function idbReadAll() {
            return dvTx(DV_FILES, 'readonly', async s => {
                const [keys, vals] = await Promise.all([dvReq(s.getAllKeys()), dvReq(s.getAll())]);   // 둘 다 먼저 걸어 두고 기다려요
                return keys.map((k, i) => [String(k), vals[i]]);
            });
        }
        /* ---------- 쓰기 · 읽기 : PC 폴더 (진짜 파일) ---------- */
        async function dirOf(dirs, create) {
            let d = dv.top;
            for (const n of dirs) { try { d = await d.getDirectoryHandle(n, { create }); } catch (e) { if (!create && e && e.name === 'NotFoundError') return null; throw e; } }
            return d;
        }
        async function dirWrite(p, body) {
            const d = await dirOf(p.dirs, body !== null); if (!d) return;
            if (body === null) { try { await d.removeEntry(p.name); } catch (e) { if (!e || e.name !== 'NotFoundError') throw e; } return; }
            const f = await d.getFileHandle(p.name, { create: true }), w = await f.createWritable();
            await w.write(body); await w.close();
        }
        async function dirReadAll() {
            const out = [];
            const walk = async (d, path) => {
                for await (const [name, h] of d.entries()) {
                    if (h.kind === 'directory') await walk(h, path.concat(name));
                    else if (/\.json$/.test(name)) out.push([[DV_TOP].concat(path, name).join('/'), await (await h.getFile()).text()]);
                }
            };
            await walk(dv.top, []);
            return out;
        }

        /* ---------- 파일 자리 → 키 · 값을 메모리(store)에 ---------- */
        function dvLoadFiles(list) {
            const dayRe = new RegExp('^' + DAY_PATH.join('/') + '/(\\d{4})년/(\\d{1,2})월/(\\d{1,2})일\\.json$');
            store._silent = true;
            try {
                list.forEach(([path, text]) => {
                    let obj; try { obj = JSON.parse(text); } catch (e) { console.warn('읽지 못한 파일 (건너뜀):', path); return; }
                    if (!obj || typeof obj !== 'object') return;
                    const m = dayRe.exec(path);
                    if (m) { store.putLoaded(dayKeyOf(+m[1], +m[2], +m[3]), JSON.stringify(obj)); return; }
                    if (/\/기기\.json$/.test(path)) { Object.keys(obj).forEach(k => { if (typeof obj[k] === 'string') store.putLoaded(k, obj[k]); }); return; }
                    Object.keys(obj).forEach(k => { if (isSettingKey(k)) store.putLoaded(k, JSON.stringify(obj[k])); });
                });
            } finally { store._silent = false; }
        }

        /* ---------- 자동 저장 : 바뀐 것만 0.6초 모아서 · 화면이 꺼질 때는 바로 ---------- */
        function dvDirty(k) {
            if (!dv.on) return;
            dv.dirty.add(dvPathText(dvPlace(k)) + '\n' + k);
            clearTimeout(dv.timer); dv.timer = setTimeout(dvFlush, 600);
        }
        function dvFlush() {
            clearTimeout(dv.timer);
            if (!dv.on || !dv.dirty.size) return dv.chain;
            const seen = new Set(), jobs = [];
            dv.dirty.forEach(s => { const [path, k] = s.split('\n'); if (seen.has(path)) return; seen.add(path); const p = dvPlace(k); jobs.push([p, dvBody(p)]); });
            dv.dirty.clear();
            dv.chain = dv.chain.then(async () => {
                for (const [p, body] of jobs) {
                    try { await (dv.mode === 'dir' ? dirWrite(p, body) : idbWrite(p, body)); dv.failed = false; }
                    catch (e) {
                        console.warn('이 기기 저장 실패:', dvPathText(p), e);
                        if (!dv.failed) { dv.failed = true; showMsg('⚠ 이 기기의 <b>말랑달콤</b> 폴더에 저장하지 못했어요.<br><span style="font-size:12px;color:#777;">' + (dv.mode === 'dir' ? '폴더가 옮겨졌거나 허용이 풀렸을 수 있어요. 다이어리를 다시 열어 주세요.' : '기기 저장공간이 꽉 찼거나 시크릿 모드일 수 있어요.') + '</span>'); }
                    }
                }
            });
            return dv.chain;
        }
        function dvNow() { if (!dv.on) return; try { if (isCoverOpen && !turn) saveData(false); } catch (e) {} dvFlush(); }
        document.addEventListener('visibilitychange', () => { if (document.hidden) dvNow(); });
        addEventListener('pagehide', dvNow);

        /* ---------- 시작 : 이 기기 폴더를 쓰기로 했으면 알아서 불러와서 바로 열어요 ---------- */
        function dvSetMode(m) { try { if (m) localStorage.setItem(DV_MODE, m); else localStorage.removeItem(DV_MODE); } catch (e) {} }
        function dvGetMode() { try { return localStorage.getItem(DV_MODE) || ''; } catch (e) { return ''; } }
        async function dvStart(mode) {
            store.clear();
            const list = mode === 'dir' ? await dirReadAll() : await idbReadAll();
            dvLoadFiles(list);
            dv.on = true; dv.mode = mode; dv.failed = false;
            enterGuestMode();
            try { await applyRemoteSettings(); } catch (e) {}
            updateBadge();
            if (typeof updateStorageInfo === 'function') updateStorageInfo();
            if (mode === 'idb' && navigator.storage && navigator.storage.persist && !/firefox/i.test(navigator.userAgent)) navigator.storage.persist().catch(() => {});   // 지우지 말아 주세요 (묻는 창 없이 되는 브라우저만)
        }
        /* drive.js initDrive 맨 앞 : true 면 구글 화면 없이 이 기기 폴더로 열렸어요 */
        async function dvAuto() {
            const mode = dvGetMode();
            if (mode === 'idb') {
                try { await dvStart('idb'); return true; }
                catch (e) { console.warn(e); dvSetMode(''); return false; }
            }
            if (mode === 'dir') {
                let h = null;
                try { h = await dvTx(DV_META, 'readonly', s => dvReq(s.get('dir'))); } catch (e) {}
                if (!h || !h.queryPermission) { dvSetMode(''); return false; }
                dv.dir = h;
                let st = 'prompt'; try { st = await h.queryPermission({ mode: 'readwrite' }); } catch (e) {}
                if (st === 'granted') { try { dv.top = await h.getDirectoryHandle(DV_TOP, { create: true }); await dvStart('dir'); return true; } catch (e) { console.warn(e); } }
                dvAskAgain();                                  // '이번만 허용'이었으면 한 번 눌러야 해요 (브라우저 규칙)
                return true;
            }
            return false;
        }

        /* ---------- 첫 화면 카드 : 고르기 · 다시 왔을 때 ---------- */
        function dvCard(html) {
            const g = document.getElementById('driveGate'); g.style.display = 'flex';
            const c = g.querySelector('.gate-card');
            if (!c.dataset.orig) c.dataset.orig = c.innerHTML;
            c.innerHTML = html;
            return c;
        }
        function dvBack() {
            const c = document.querySelector('#driveGate .gate-card');
            if (c && c.dataset.orig) { c.innerHTML = c.dataset.orig; delete c.dataset.orig; }
            showGate('login', '일기는 내 구글 드라이브의 <b>말랑달콤</b> 폴더에<br>하루에 파일 1개씩 저장돼요.');
        }
        function dvChoose() {
            const pc = dvCanDir();
            const c = dvCard(`<div class="gate-title dv-title">일기를 어디에 둘까요?</div>
                <button type="button" class="dv-opt on" data-v="folder"><b>📁 폴더</b><span>${pc ? '저장할 곳을 고르면 그 안에 <b>말랑달콤</b> 폴더를 만들어 자동으로 저장해요.' : '이 기기에 <b>말랑달콤</b> 폴더를 만들어 자동으로 저장해요. 다음에 열면 그대로 이어서 써요.'}</span></button>
                <button type="button" class="dv-opt" data-v="look"><b>👀 구경만</b><span>저장하지 않아요. 닫거나 새로고침하면 쓴 일기가 사라져요.</span></button>
                <p class="dv-foot">나중에 구글로 로그인하면 내 드라이브로 옮길 수 있어요.</p>
                <button type="button" class="gate-guest dv-back">← 돌아가기</button>`);
            c.querySelector('[data-v="folder"]').onclick = () => dvPickFolder();
            c.querySelector('[data-v="look"]').onclick = () => { dvBack(); enterGuestMode(); };
            c.querySelector('.dv-back').onclick = dvBack;
        }
        async function dvPickFolder() {
            if (!dvCanDir()) {
                try { await dvDb(); } catch (e) { showMsg('⚠ 이 브라우저에서는 저장할 수 없어요.<br><span style="font-size:12px;color:#777;">시크릿 모드라면 일반 창으로 열어 주세요.</span>'); return; }
                dvSetMode('idb'); dvBack(); hideGate();
                try { await dvStart('idb'); } catch (e) { dvSetMode(''); showMsg('⚠ 이 기기에 폴더를 만들지 못했어요.<br><span style="font-size:12px;color:#777;">시크릿 모드라면 일반 창으로 열어 주세요.</span>'); }
                return;
            }
            let h;
            try { h = await showDirectoryPicker({ id: 'malang', mode: 'readwrite', startIn: 'documents' }); }
            catch (e) { return; }                                                   // 고르지 않고 닫음
            try {
                dv.dir = h; dv.top = await h.getDirectoryHandle(DV_TOP, { create: true });
                try { await dvTx(DV_META, 'readwrite', s => { s.put(h, 'dir'); }); } catch (e) {}
                dvSetMode('dir'); dvBack(); hideGate();
                await dvStart('dir');
                showMsg(`📁 <b>${dvEsc(h.name)} / ${DV_TOP}</b> 폴더에 저장할게요!<br><span style="font-size:12px;color:#777;">쓰는 대로 자동으로 저장되고, 다음에 열면 그대로 이어서 써요.</span>`);
            } catch (e) { console.warn(e); showMsg('⚠ 그 폴더에는 저장할 수 없어요. 다른 폴더를 골라 주세요.'); }
        }
        function dvAskAgain() {
            const n = dv.dir ? dvEsc(dv.dir.name) : '';
            const c = dvCard(`<div class="gate-title dv-title">다시 오셨네요!</div>
                <div class="gate-msg">지난번에 고른 <b>${n} / ${DV_TOP}</b> 폴더에서<br>이어서 쓸게요.</div>
                <button type="button" class="btn gate-btn dv-go">📁 폴더 열고 이어서 쓰기</button>
                <button type="button" class="gate-guest dv-other">다른 폴더 고르기</button>
                <button type="button" class="gate-guest dv-login">구글 계정으로 시작하기</button>`);
            c.querySelector('.dv-go').onclick = async () => {
                let st = 'denied'; try { st = await dv.dir.requestPermission({ mode: 'readwrite' }); } catch (e) {}
                if (st !== 'granted') { showMsg('폴더를 허용해야 이어서 쓸 수 있어요.<br><span style="font-size:12px;color:#777;">허용 창에서 <b>방문할 때마다 허용</b>을 누르면 다음부터는 바로 열려요.</span>'); return; }
                try { dv.top = await dv.dir.getDirectoryHandle(DV_TOP, { create: true }); dvBack(); hideGate(); await dvStart('dir'); }
                catch (e) { console.warn(e); showMsg('⚠ 폴더를 열지 못했어요. 폴더가 옮겨졌다면 <b>다른 폴더 고르기</b>를 눌러 주세요.'); }
            };
            c.querySelector('.dv-other').onclick = () => dvPickFolder();
            c.querySelector('.dv-login').onclick = () => { dvBack(); };
        }
        const dvEsc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

        /* 구글로 로그인했으면 이제 드라이브로 열려요 (이 기기 폴더의 파일은 그대로 남아요) */
        function dvOff() { if (!dv.on) return; dvFlush(); dv.on = false; window.dvWas = true; dvSetMode(''); }
        const dvOn = () => dv.on;
        const dvWhere = () => dv.mode === 'dir' ? (dv.dir ? dv.dir.name + ' / ' : '') + DV_TOP : '이 기기 / ' + DV_TOP;

        window.dvAuto = dvAuto; window.dvChoose = dvChoose; window.dvDirty = dvDirty; window.dvFlush = dvFlush;
        window.dvOn = dvOn; window.dvOff = dvOff; window.dvWhere = dvWhere;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['devsave'] = true;
