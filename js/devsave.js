/* 말랑달콤 다이어리 - js/devsave.js
   📁 로그인 없이 쓰기 : 이 기기의 '말랑달콤' 폴더에 저장 (도련 · 2026-10-13)
   - 첫 화면 '로그인 없이 시작하기' → "일기를 어디에 둘까요?"  📁 폴더 · 👀 구경만
   - 📁 폴더를 고른 사람은 구글로 로그인했을 때와 저장 · 불러오기 · 폴더 모양 · 기능이 모두 같아요
     → 드라이브에 말을 거는 곳(drive.js gfetch) 하나만 '이 기기 폴더'로 바꿔 끼워요 (vfsFetch : 드라이브 API 흉내)
     → 일기 · 설정 · 카페 · 스티커 모음 · 내가 만든 스티커 · 페이지 · 인형 · 인형극 · 검색 목록 … 드라이브에 저장되던 것 모두
   - 폴더 자리
     · PC 크롬 · 엣지 · 웨일 : 저장할 곳을 고르면 그 안에 '말랑달콤' 폴더를 만들어 진짜 파일로 저장해요
     · 폰 · 아이패드 · 사파리 · 파이어폭스 : 이 기기 브라우저 저장공간 안에 '말랑달콤' 폴더를 만들어요 (파일 앱에서는 안 보여요 · 웹은 폰 폴더를 만들 수 없어요)
   - 기기 바꿀 때 : ⚙ 설정 → 📦 백업 파일 받기 (말랑달콤 폴더 통째로 .zip) → 새 기기에서 📥 백업 불러오기
     (구글 드라이브에서 '말랑달콤' 폴더를 내려받은 zip 도 불러올 수 있어요)
   - 오래 안 쓰면 (아이폰 사파리 : 안 연 날 7일) 브라우저가 지울 수 있어요 → 도련 : 안 쓰는 거라 괜찮아요
   - 구글로 로그인하면 이 기기 일기를 드라이브로 옮길지 물어봐요 → 그 뒤로는 드라이브로 열려요
   - 안 되는 것 : 🕘 이전 버전 (구글 드라이브만 기억해요) · 편지 · 명예의 전당 · 뽑기처럼 구글 계정이 있어야 하는 서버 기능
   ※ drive.js 의 initDrive · gfetch · ensureToken · driveLogin · driveLogout 이 이 파일을 불러요 · 이 파일이 없어도 다이어리는 정상 */

        const DV_MODE = 'malang_dev_mode';                 // 'idb' (브라우저 저장공간) | 'dir' (PC 폴더) · 없으면 쓰지 않음
        const DV_DB = 'malang-device', DV_TOP = '말랑달콤';
        const V = { on: false, mode: '', root: null, idx: new Map(), stale: false, last: 0, wantRestore: false };
        const dvCanDir = () => typeof window.showDirectoryPicker === 'function';
        const dvEsc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);

        /* ---------- 작은 저장소 (IndexedDB) : vmeta 파일 정보 · vdata 내용 · meta PC 폴더 손잡이 ---------- */
        let dvDbP = null;
        function dvDb() {
            if (!dvDbP) dvDbP = new Promise((ok, no) => {
                let r; try { r = indexedDB.open(DV_DB, 2); } catch (e) { no(e); return; }
                r.onupgradeneeded = (ev) => {
                    const db = r.result, t = r.transaction;
                    if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta');
                    const vm = db.objectStoreNames.contains('vmeta') ? t.objectStore('vmeta') : db.createObjectStore('vmeta');
                    const vd = db.objectStoreNames.contains('vdata') ? t.objectStore('vdata') : db.createObjectStore('vdata');
                    if (ev.oldVersion === 1 && db.objectStoreNames.contains('files')) {       // v391 에 저장한 것 옮기기 (말랑달콤/… 경로 → 글)
                        const now = Date.now();
                        t.objectStore('files').openCursor().onsuccess = e => {
                            const c = e.target.result;
                            if (!c) { db.deleteObjectStore('files'); return; }
                            const path = String(c.key), parts = path.split('/');
                            for (let i = 1; i < parts.length; i++) vm.put({ k: 'd', mt: now, ct: now }, parts.slice(0, i).join('/'));
                            vd.put(String(c.value), path); vm.put({ k: 'f', mt: now, ct: now, size: String(c.value).length }, path);
                            c.continue();
                        };
                    }
                };
                r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error);
            });
            dvDbP.catch(() => { dvDbP = null; });
            return dvDbP;
        }
        const dvReq = q => new Promise((ok, no) => { q.onsuccess = () => ok(q.result); q.onerror = () => no(q.error); });
        async function dvTx(stores, mode, fn) {
            const db = await dvDb();
            return new Promise((ok, no) => {
                const t = db.transaction(stores, mode); let out;
                Promise.resolve(fn(t)).then(v => { out = v; }, no);
                t.oncomplete = () => ok(out); t.onerror = () => no(t.error); t.onabort = () => no(t.error || new Error('abort'));
            });
        }

        /* ---------- 경로 · 번호 : 번호는 경로를 그대로 담아요 (같은 이름 파일이 둘이 될 수 없어요) ---------- */
        const vId = p => p === '' ? 'root' : 'v~' + encodeURIComponent(p);
        const vPath = id => id === 'root' ? '' : (typeof id === 'string' && id.startsWith('v~')) ? decodeURIComponent(id.slice(2)) : null;
        const vParent = p => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '';
        const vName = p => p.slice(p.lastIndexOf('/') + 1);
        const vJoin = (a, b) => a ? a + '/' + b : b;
        const vNow = () => (V.last = Math.max(Date.now(), V.last + 1));
        const vIso = ms => new Date(ms).toISOString();
        const vBC = (() => { try { return 'BroadcastChannel' in window ? new BroadcastChannel('malang-vfs') : null; } catch (e) { return null; } })();
        if (vBC) vBC.onmessage = () => { V.stale = true; };        // 같은 기기의 다른 탭이 고쳤어요 → 다음에 볼 때 목록을 새로
        const vTell = () => { try { if (vBC) vBC.postMessage(1); } catch (e) {} };

        /* ---------- 폴더 손잡이 (PC) ---------- */
        async function vDir(p, create) {
            let d = V.root;
            if (!p) return d;
            for (const n of p.split('/')) {
                try { d = await d.getDirectoryHandle(n, { create: !!create }); }
                catch (e) { if (!create && e && (e.name === 'NotFoundError' || e.name === 'TypeMismatchError')) return null; throw e; }
            }
            return d;
        }

        /* ---------- 목록 읽기 (처음 한 번 · 다른 탭이 고치면 다시) ---------- */
        async function vLoad() {
            const idx = new Map();
            if (V.mode === 'idb') {
                await dvTx(['vmeta'], 'readonly', async t => {
                    const s = t.objectStore('vmeta');
                    const [ks, vs] = await Promise.all([dvReq(s.getAllKeys()), dvReq(s.getAll())]);
                    ks.forEach((k, i) => idx.set(String(k), vs[i]));
                });
            } else {
                const walk = async (d, p) => {
                    for await (const [name, h] of d.entries()) {
                        const cp = vJoin(p, name);
                        if (h.kind === 'directory') { idx.set(cp, { k: 'd', mt: 0, ct: 0 }); await walk(h, cp); }
                        else { const f = await h.getFile(); idx.set(cp, { k: 'f', mt: f.lastModified, ct: f.lastModified, size: f.size }); }
                    }
                };
                const top = await vDir(DV_TOP, false);                  // 고른 폴더 전체가 아니라 그 안의 말랑달콤 폴더만 봐요
                if (top) { idx.set(DV_TOP, { k: 'd', mt: 0, ct: 0 }); await walk(top, DV_TOP); }
            }
            V.idx = idx; V.stale = false;
        }
        async function vFresh() { if (V.stale) await vLoad(); }

        /* ---------- 기본 동작 : 폴더 만들기 · 쓰기 · 읽기 · 지우기 · 옮기기 ---------- */
        async function vMkdir(p) {
            if (!p || (V.idx.get(p) || {}).k === 'd') return;
            await vMkdir(vParent(p));
            const now = vNow(), m = { k: 'd', mt: now, ct: now };
            if (V.mode === 'idb') await dvTx(['vmeta'], 'readwrite', t => { t.objectStore('vmeta').put(m, p); });
            else await vDir(p, true);
            V.idx.set(p, m); vTell();
        }
        async function vWrite(p, text) {
            await vMkdir(vParent(p));
            const old = V.idx.get(p), now = vNow();
            let m = { k: 'f', mt: now, ct: old && old.ct || now, size: new Blob([text]).size };
            if (V.mode === 'idb') await dvTx(['vmeta', 'vdata'], 'readwrite', t => { t.objectStore('vdata').put(text, p); t.objectStore('vmeta').put(m, p); });
            else {
                const fh = await (await vDir(vParent(p), true)).getFileHandle(vName(p), { create: true });
                const w = await fh.createWritable(); await w.write(text); await w.close();
                const f = await fh.getFile(); m = { k: 'f', mt: Math.max(f.lastModified, old ? old.mt + 1 : 0), ct: old && old.ct || f.lastModified, size: f.size };
            }
            V.idx.set(p, m); vTell();
            return m;
        }
        async function vRead(p) {
            if (V.mode === 'idb') return dvTx(['vdata'], 'readonly', t => dvReq(t.objectStore('vdata').get(p)));
            const d = await vDir(vParent(p), false); if (!d) return undefined;
            try { return await (await (await d.getFileHandle(vName(p))).getFile()).text(); } catch (e) { return undefined; }
        }
        async function vRemove(p) {
            const kill = [p].concat(Array.from(V.idx.keys()).filter(k => k.startsWith(p + '/')));
            if (V.mode === 'idb') await dvTx(['vmeta', 'vdata'], 'readwrite', t => { kill.forEach(k => { t.objectStore('vmeta').delete(k); t.objectStore('vdata').delete(k); }); });
            else { const d = await vDir(vParent(p), false); if (d) try { await d.removeEntry(vName(p), { recursive: true }); } catch (e) { if (!e || e.name !== 'NotFoundError') throw e; } }
            kill.forEach(k => V.idx.delete(k)); vTell();
        }
        async function vMove(p, np) {
            if (p === np) return;
            const e = V.idx.get(p); if (!e) return;
            if (e.k === 'f') { const txt = await vRead(p); await vWrite(np, txt == null ? '' : txt); }
            else { await vMkdir(np); for (const k of Array.from(V.idx.keys()).filter(k => vParent(k) === p)) await vMove(k, vJoin(np, vName(k))); }
            await vRemove(p);
        }

        /* ---------- 🪄 드라이브 API 흉내 : drive.js gfetch 가 이 기기 폴더일 때 여기로 와요 ---------- */
        const FOLDER = 'application/vnd.google-apps.folder';
        const vRes = (st, obj) => new Response(obj === undefined ? '' : typeof obj === 'string' ? obj : JSON.stringify(obj), { status: st, headers: { 'Content-Type': 'application/json' } });
        const vFile = p => { const e = V.idx.get(p); return { id: vId(p), name: vName(p), mimeType: e.k === 'd' ? FOLDER : 'application/json', modifiedTime: vIso(e.mt || 0), size: String(e.size || 0), trashed: false }; };
        function vQuery(q) {
            const c = { name: null, parent: null, folder: null, trashed: false };
            for (const part of q.split(' and ')) {
                let m;
                if ((m = /^name='((?:\\.|[^'\\])*)'$/.exec(part))) c.name = m[1].replace(/\\(.)/g, '$1');
                else if ((m = /^'([^']*)' in parents$/.exec(part))) c.parent = m[1];
                else if ((m = /^mimeType(!?)='(.*)'$/.exec(part))) c.folder = m[1] ? (m[2] === FOLDER ? false : null) : (m[2] === FOLDER ? true : null);
                else if ((m = /^trashed=(true|false)$/.exec(part))) c.trashed = m[1] === 'true';
            }
            if (c.trashed) return [];                                   // 휴지통은 없어요 (지우면 바로 지워져요)
            const pp = c.parent == null ? null : vPath(c.parent);
            if (c.parent != null && pp == null) return [];
            const out = [];
            V.idx.forEach((e, p) => {
                if (pp != null && vParent(p) !== pp) return;
                if (c.name != null && vName(p) !== c.name) return;
                if (c.folder === true && e.k !== 'd') return;
                if (c.folder === false && e.k !== 'f') return;
                out.push(p);
            });
            out.sort((a, b) => (V.idx.get(a).ct || 0) - (V.idx.get(b).ct || 0) || (a < b ? -1 : 1));
            return out.map(vFile);
        }
        function vMultipart(body, ctype) {
            const b = (/boundary=([^;]+)/.exec(ctype || '') || [])[1];
            const parts = String(body).split('--' + b).slice(1, -1).map(s => s.replace(/^\r\n/, '').replace(/\r\n$/, ''));
            const pick = s => s.slice(s.indexOf('\r\n\r\n') + 4);
            return { meta: JSON.parse(pick(parts[0])), body: pick(parts[1]) };
        }
        async function vfsFetch(url, opts) {
            opts = opts || {};
            try {
                await vFresh();
                const u = new URL(url), method = (opts.method || 'GET').toUpperCase(), path = u.pathname;
                if (/\/about$/.test(path)) {
                    if (/storageQuota/.test(u.searchParams.get('fields') || '')) {
                        let usage = 0, quota = 0; try { const e = await navigator.storage.estimate(); usage = e.usage || 0; quota = e.quota || 0; } catch (e) {}
                        return vRes(200, { storageQuota: { usage: String(usage), limit: String(quota) } });
                    }
                    return vRes(200, { user: { permissionId: 'device' } });
                }
                const m = /\/files(?:\/([^/]+))?(\/revisions(?:\/[^/]+)?)?$/.exec(path);
                if (!m) return vRes(404, {});
                if (m[2]) return method === 'GET' && !/alt=media/.test(u.search) ? vRes(200, { revisions: [] }) : method === 'PATCH' ? vRes(200, {}) : vRes(404, {});   // 🕘 이전 버전은 없어요
                const upload = /\/upload\//.test(path), id = m[1];
                if (!id) {
                    if (method === 'GET') return vRes(200, { files: vQuery(u.searchParams.get('q') || '') });
                    if (method === 'POST' && upload) {                      // 새 파일 (폴더 · 이름 · 내용)
                        const ct = (opts.headers && (opts.headers['Content-Type'] || opts.headers['content-type'])) || '';
                        const { meta, body } = vMultipart(opts.body, ct);
                        const pp = vPath((meta.parents || ['root'])[0]);
                        if (pp == null || (pp && (V.idx.get(pp) || {}).k !== 'd')) return vRes(404, {});
                        const p = vJoin(pp, meta.name), e = await vWrite(p, body);
                        return vRes(200, { id: vId(p), modifiedTime: vIso(e.mt) });
                    }
                    if (method === 'POST') {                                // 새 폴더
                        const meta = JSON.parse(opts.body || '{}'), pp = vPath((meta.parents || ['root'])[0]);
                        if (pp == null || (pp && (V.idx.get(pp) || {}).k !== 'd')) return vRes(404, {});
                        const p = vJoin(pp, meta.name); await vMkdir(p);
                        return vRes(200, { id: vId(p) });
                    }
                    return vRes(400, {});
                }
                const p = vPath(id);
                const ent = p === '' ? { k: 'd' } : (p != null && V.idx.get(p));
                if (!ent) return vRes(404, { error: { errors: [{ reason: 'notFound' }] } });
                if (method === 'GET') {
                    if (u.searchParams.get('alt') === 'media') { const t = await vRead(p); return t === undefined ? vRes(404, {}) : vRes(200, t); }
                    return vRes(200, p === '' ? { id: 'root', name: '', mimeType: FOLDER, trashed: false } : vFile(p));
                }
                if (method === 'PATCH' && upload) { const e = await vWrite(p, String(opts.body == null ? '' : opts.body)); return vRes(200, { id, modifiedTime: vIso(e.mt) }); }
                if (method === 'PATCH') {
                    const add = u.searchParams.get('addParents'), meta = (() => { try { return JSON.parse(opts.body || '{}'); } catch (e) { return {}; } })();
                    if (meta.trashed) { await vRemove(p); return vRes(200, { id }); }
                    let np = p;
                    if (add != null && vPath(add) != null) np = vJoin(vPath(add), vName(p));
                    if (meta.name) np = vJoin(vParent(np), meta.name);
                    if (np !== p) { await vMove(p, np); return vRes(200, vFile(np)); }
                    return vRes(200, vFile(p));
                }
                return vRes(400, {});
            } catch (e) {
                console.warn('이 기기 폴더 저장소 오류:', url, e);
                return vRes(500, { error: { errors: [{ reason: String(e && e.name || 'error') }] } });
            }
        }

        /* ---------- 시작 : 이 기기 폴더로 '로그인'한 것처럼 ---------- */
        function dvSetMode(m) { try { if (m) localStorage.setItem(DV_MODE, m); else localStorage.removeItem(DV_MODE); } catch (e) {} }
        function dvGetMode() { try { return localStorage.getItem(DV_MODE) || ''; } catch (e) { return ''; } }
        async function dvStart(mode) {
            V.mode = mode; await vLoad();
            V.on = true; drive.local = true; drive.token = null;
            await loadFromDrive();                                         // 드라이브로 로그인할 때와 똑같이 읽어요 (설정 · 카페 · 모음 · 3일치)
            hideGate(); updateBadge();
            try { await postLoginTasks(); } catch (e) {}
            if (mode === 'idb' && navigator.storage && navigator.storage.persist && !/firefox/i.test(navigator.userAgent)) navigator.storage.persist().catch(() => {});   // 지우지 말아 주세요 (묻는 창 없이 되는 브라우저만)
            if (V.wantRestore) { V.wantRestore = false; if (await showMsg('📥 이제 다른 기기에서 받은 <b>백업 파일</b>을 골라 주세요.', true)) dvRestorePick(); }
        }
        /* drive.js initDrive 맨 앞 : true 면 구글 화면 없이 이 기기 폴더로 열렸어요 (또는 '이어서 쓰기' 화면) */
        async function dvAuto() {
            const mode = dvGetMode();
            if (mode === 'idb') {
                try { await dvStart('idb'); return true; }
                catch (e) { console.warn(e); dvQuit(); return false; }
            }
            if (mode === 'dir') {
                let h = null;
                try { h = await dvTx(['meta'], 'readonly', t => dvReq(t.objectStore('meta').get('dir'))); } catch (e) {}
                if (!h || !h.queryPermission) { dvSetMode(''); return false; }
                V.root = h;
                let st = 'prompt'; try { st = await h.queryPermission({ mode: 'readwrite' }); } catch (e) {}
                if (st === 'granted') { try { await dvStart('dir'); return true; } catch (e) { console.warn(e); dvQuit(); } }
                dvAskAgain();                                  // '이번만 허용'이었으면 한 번 눌러야 해요 (브라우저 규칙)
                return true;
            }
            return false;
        }
        function dvQuit() { V.on = false; drive.local = false; drive.ready = false; }

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
                <button type="button" class="gate-guest dv-restore">📥 다른 기기에서 받은 백업 파일로 시작하기</button>
                <button type="button" class="gate-guest dv-back">← 돌아가기</button>`);
            c.querySelector('[data-v="folder"]').onclick = () => dvPickFolder();
            c.querySelector('[data-v="look"]').onclick = () => { dvBack(); enterGuestMode(); };
            c.querySelector('.dv-restore').onclick = () => { V.wantRestore = true; dvPickFolder(); };
            c.querySelector('.dv-back').onclick = dvBack;
        }
        async function dvPickFolder() {
            if (!dvCanDir()) {
                try { await dvDb(); } catch (e) { showMsg('⚠ 이 브라우저에서는 저장할 수 없어요.<br><span style="font-size:12px;color:#777;">시크릿 모드라면 일반 창으로 열어 주세요.</span>'); return; }
                dvSetMode('idb'); dvBack(); showGate('wait', '📁 이 기기에 <b>말랑달콤</b> 폴더를 만드는 중…');
                try { await dvStart('idb'); } catch (e) { console.warn(e); dvSetMode(''); dvQuit(); dvBack(); showMsg('⚠ 이 기기에 폴더를 만들지 못했어요.<br><span style="font-size:12px;color:#777;">시크릿 모드라면 일반 창으로 열어 주세요.</span>'); }
                return;
            }
            let h;
            try { h = await showDirectoryPicker({ id: 'malang', mode: 'readwrite', startIn: 'documents' }); }
            catch (e) { V.wantRestore = false; return; }                       // 고르지 않고 닫음
            try {
                V.root = h;
                try { await dvTx(['meta'], 'readwrite', t => { t.objectStore('meta').put(h, 'dir'); }); } catch (e) {}
                dvSetMode('dir'); dvBack(); showGate('wait', '📁 <b>' + dvEsc(h.name) + ' / ' + DV_TOP + '</b> 폴더를 여는 중…');
                await dvStart('dir');
                if (!V.wantRestore) showMsg(`📁 <b>${dvEsc(h.name)} / ${DV_TOP}</b> 폴더에 저장할게요!<br><span style="font-size:12px;color:#777;">쓰는 대로 자동으로 저장되고, 다음에 열면 그대로 이어서 써요.</span>`);
            } catch (e) { console.warn(e); dvSetMode(''); dvQuit(); dvBack(); showMsg('⚠ 그 폴더에는 저장할 수 없어요. 다른 폴더를 골라 주세요.'); }
        }
        function dvAskAgain() {
            const n = V.root ? dvEsc(V.root.name) : '';
            const c = dvCard(`<div class="gate-title dv-title">다시 오셨네요!</div>
                <div class="gate-msg">지난번에 고른 <b>${n} / ${DV_TOP}</b> 폴더에서<br>이어서 쓸게요.</div>
                <button type="button" class="btn gate-btn dv-go">📁 폴더 열고 이어서 쓰기</button>
                <button type="button" class="gate-guest dv-other">다른 폴더 고르기</button>
                <button type="button" class="gate-guest dv-login">구글 계정으로 시작하기</button>`);
            c.querySelector('.dv-go').onclick = async () => {
                let st = 'denied'; try { st = await V.root.requestPermission({ mode: 'readwrite' }); } catch (e) {}
                if (st !== 'granted') { showMsg('폴더를 허용해야 이어서 쓸 수 있어요.<br><span style="font-size:12px;color:#777;">허용 창에서 <b>방문할 때마다 허용</b>을 누르면 다음부터는 바로 열려요.</span>'); return; }
                try { dvBack(); showGate('wait', '📁 폴더를 여는 중…'); await dvStart('dir'); }
                catch (e) { console.warn(e); dvQuit(); dvAskAgain(); showMsg('⚠ 폴더를 열지 못했어요. 폴더가 옮겨졌다면 <b>다른 폴더 고르기</b>를 눌러 주세요.'); }
            };
            c.querySelector('.dv-other').onclick = () => dvPickFolder();
            c.querySelector('.dv-login').onclick = () => { dvSetMode(''); dvBack(); };
        }

        /* ---------- 📦 백업 파일 (말랑달콤 폴더 통째로 .zip) ---------- */
        const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
        function crc32(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
        function zipMake(files) {                                          // files : [[이름, Uint8Array]] · 압축 없이 담기 (어디서나 열려요)
            const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
            const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
            for (const [name, data] of files) {
                const nb = enc.encode(name), crc = crc32(data), h = new DataView(new ArrayBuffer(30));
                h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true);
                h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
                h.setUint16(26, nb.length, true); h.setUint16(28, 0, true);
                parts.push(new Uint8Array(h.buffer), nb, data);
                const c = new DataView(new ArrayBuffer(46));
                c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
                c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
                c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
                cen.push(new Uint8Array(c.buffer), nb);
                off += 30 + nb.length + data.length;
            }
            const cs = cen.reduce((s, a) => s + a.length, 0), e = new DataView(new ArrayBuffer(22));
            e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
            return new Blob(parts.concat(cen, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
        }
        async function zipRead(buf) {                                      // 우리 백업 · 구글 드라이브에서 내려받은 zip (압축 0 · 8)
            const v = new DataView(buf), u8 = new Uint8Array(buf);
            let e = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
            if (e < 0) throw new Error('zip');
            const n = v.getUint16(e + 10, true); let p = v.getUint32(e + 16, true);
            const utf = new TextDecoder('utf-8'), out = [];
            for (let i = 0; i < n; i++) {
                if (v.getUint32(p, true) !== 0x02014b50) throw new Error('zip');
                const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
                const name = utf.decode(u8.subarray(p + 46, p + 46 + nl));
                p += 46 + nl + xl + cl;
                if (name.endsWith('/')) continue;
                const ds = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), raw = u8.subarray(ds, ds + csize);
                let data;
                if (method === 0) data = raw;
                else if (method === 8 && typeof DecompressionStream === 'function') data = new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
                else throw new Error('zip-method');
                out.push([name, data]);
            }
            return out;
        }
        function dvSaveBlob(blob, name) {
            const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
            document.body.appendChild(a); a.click(); a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        }
        const DAY_FILE_RE = /\/다이어리\/페이지\/\d{4}년\/\d{1,2}월\/\d{1,2}일\.json$/;
        async function dvBackup() {
            if (!V.on) return;
            try { if (isCoverOpen && !turn) saveData(false); } catch (e) {}
            await flushUpload({ force: true });
            await vLoad();
            const enc = new TextEncoder(), files = [];
            for (const [p, e] of V.idx) {
                if (e.k !== 'f' || !p.startsWith(DV_TOP + '/')) continue;
                const t = await vRead(p); if (t == null) continue;
                files.push([p, enc.encode(t)]);
            }
            if (!files.length) { showMsg('아직 저장된 일기가 없어요.'); return; }
            const days = files.filter(f => DAY_FILE_RE.test(f[0])).length;
            const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            dvSaveBlob(zipMake(files), `말랑달콤_백업_${stamp}.zip`);
            showMsg(`📦 백업 파일을 만들었어요!<br>일기 <b>${days}일치</b> · 파일 ${files.length}개<br><span style="font-size:12px;color:#777;">새 기기에서 📁 폴더를 고른 뒤 ⚙ 설정 → 📥 백업 불러오기로 넣으면 그대로 이어서 써요.</span>`);
        }
        function dvRestorePick() {
            let inp = document.getElementById('dvRestoreInput');
            if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'dvRestoreInput'; inp.accept = '.zip,.json,application/zip,application/json'; inp.hidden = true; document.body.appendChild(inp); inp.onchange = () => { const f = inp.files[0]; inp.value = ''; if (f) dvRestore(f); }; }
            inp.click();
        }
        async function dvRestore(file) {
            if (!V.on) return;
            if (/\.json$/i.test(file.name)) { importJSON({ target: { files: [file], value: '' } }); return; }   // 예전 📂 PC로 백업 (.json)
            let list;
            try { list = await zipRead(await file.arrayBuffer()); } catch (e) { showMsg('⚠ 백업 파일을 읽지 못했어요.<br><span style="font-size:12px;color:#777;">말랑달콤 백업(.zip) 파일인지 확인해 주세요.</span>'); return; }
            const utf = new TextDecoder('utf-8'), items = [];
            list.forEach(([name, data]) => {
                const i = name.indexOf(DV_TOP + '/'); if (i < 0) return;
                const p = name.slice(i).split('/').filter(s => s && s !== '.' && s !== '..').join('/');
                if (p.length > DV_TOP.length) items.push([p, utf.decode(data)]);
            });
            if (!items.length) { showMsg('⚠ 이 파일 안에 <b>말랑달콤</b> 폴더가 없어요.'); return; }
            const days = items.filter(f => DAY_FILE_RE.test(f[0])).length;
            if (!(await showMsg(`📥 백업 파일에 일기 <b>${days}일치</b> · 파일 ${items.length}개가 있어요.<br>이 기기의 말랑달콤 폴더에 넣을까요?<br><span style="font-size:12px;color:#777;">같은 날짜 · 같은 파일은 백업 것으로 바뀌고, 나머지는 그대로 남아요.</span>`, true))) return;
            try {
                try { if (isCoverOpen && !turn) saveData(false); } catch (e) {}
                await flushUpload({ force: true });
                for (const [p, t] of items) await vWrite(p, t);
                await loadFromDrive();
                showMsg(`📥 백업을 불러왔어요! 일기 <b>${days}일치</b>`);
            } catch (e) { console.warn(e); showMsg('⚠ 백업을 다 넣지 못했어요. 기기 저장공간을 확인해 주세요.'); }
        }

        /* ---------- 구글로 옮겨 가기 · 그만 쓰기 ---------- */
        async function dvBeforeLogin() {                                   // drive.js driveLogin 맨 앞 : 이 기기 일기를 모두 챙겨 두고 드라이브로
            if (!V.on) return null;
            try { if (isCoverOpen && !turn) saveData(false); } catch (e) {}
            await flushUpload({ force: true });
            try { await loadAllDays(); } catch (e) {}
            const o = {}; store.keys().forEach(k => { if (isDayKey(k) && store.getItem(k) !== null) o[k] = store.getItem(k); });
            V.on = false; drive.local = false; drive.ready = false; window.dvWas = true;
            resetDriveCaches();
            return Object.keys(o).length ? o : null;
        }
        function dvAfterLogin() { dvSetMode(''); }
        async function dvStop() {
            if (!(await showMsg('이 기기 폴더에 저장하기를 그만둘까요?<br><span style="font-size:12px;color:#777;">폴더 안의 일기는 지우지 않고 그대로 둬요. 다시 📁 폴더를 고르면 이어서 쓸 수 있어요.</span>', true))) return;
            try { if (isCoverOpen && !turn) saveData(false); } catch (e) {}
            await flushUpload({ force: true });
            dvSetMode(''); location.reload();
        }
        const dvOn = () => V.on;
        const dvWhere = () => V.mode === 'dir' ? (V.root ? V.root.name + ' / ' : '') + DV_TOP : '이 기기 / ' + DV_TOP;

        window.dvAuto = dvAuto; window.dvChoose = dvChoose; window.vfsFetch = vfsFetch; window.dvOn = dvOn; window.dvWhere = dvWhere;
        window.dvBackup = dvBackup; window.dvRestorePick = dvRestorePick; window.dvBeforeLogin = dvBeforeLogin; window.dvAfterLogin = dvAfterLogin; window.dvStop = dvStop;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['devsave'] = true;
