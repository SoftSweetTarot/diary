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
   - 안 되는 것 : 편지 · 명예의 전당 · 뽑기처럼 구글 계정이 있어야 하는 서버 기능
   ※ drive.js 의 initDrive · gfetch · ensureToken · driveLogin · driveLogout 이 이 파일을 불러요 · 이 파일이 없어도 다이어리는 정상 */

        const DV_MODE = 'malang_dev_mode';                 // 'idb' (브라우저 저장공간) | 'dir' (PC 폴더) · 없으면 쓰지 않음
        const DV_DB = 'malang-device', DV_TOP = '말랑달콤';
        const V = { on: false, mode: '', top: null, label: '', idx: new Map(), stale: false, last: 0 };   // top : PC 의 말랑달콤 폴더 손잡이
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
        async function vDir(p, create) {                                 // 말랑달콤 폴더 바깥은 절대 건드리지 않아요
            if (!p) return null;
            const parts = p.split('/');
            if (parts[0] !== DV_TOP) throw new Error('outside');
            let d = V.top;
            for (const n of parts.slice(1)) {
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
                idx.set(DV_TOP, { k: 'd', mt: 0, ct: 0 }); await walk(V.top, DV_TOP);   // 고른 곳 전체가 아니라 말랑달콤 폴더만 봐요
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

        /* ---------- 🗑 휴지통 칸 : 말랑달콤 / 휴지통 / 시각-xxxx.json ({ path : 원래 자리, at : 지운 때, text : 내용 }) + 목록.json
           - 30일이 지나거나 휴지통이 너무 커지면 (폰 · 아이패드 50MB · PC 폴더 200MB) 오래된 것부터 지워요
           - 백업 zip · 구글로 옮기기에는 들어가지 않아요 (js/backup.js) ---------- */
        const TRASH = DV_TOP + '/휴지통', TRASH_IDX = TRASH + '/목록.json', TRASH_DAYS = 30;
        const trashCap = () => V.mode === 'dir' ? 200 * 1048576 : 50 * 1048576;
        async function vTrashIdx() { try { const a = JSON.parse(await vRead(TRASH_IDX) || '[]'); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
        async function vTrashSave(a) { await vWrite(TRASH_IDX, JSON.stringify(a)); }
        async function vTrashPut(path, text) {
            if (text == null || path.startsWith(TRASH + '/')) return;
            const at = Date.now(), f = `${at}-${Math.random().toString(36).slice(2, 6)}.json`, body = JSON.stringify({ v: 1, path, at, text });
            await vWrite(TRASH + '/' + f, body);
            const a = await vTrashIdx(); a.push({ f, path, at, size: body.length }); await vTrashSave(a);
            await vTrashPurge();
        }
        async function vTrashPurge() {
            let a = await vTrashIdx(); const n = a.length, old = Date.now() - TRASH_DAYS * 864e5;
            a.sort((x, y) => x.at - y.at);
            let total = a.reduce((s, e) => s + (e.size || 0), 0);
            while (a.length && (a[0].at < old || total > trashCap())) { const e = a.shift(); total -= e.size || 0; try { await vRemove(TRASH + '/' + e.f); } catch (x) {} }
            if (a.length !== n) await vTrashSave(a);
        }
        async function vToTrash(p) {                                       // 파일 하나 · 폴더째
            const e = V.idx.get(p); if (!e) return;
            const files = e.k === 'f' ? [p] : Array.from(V.idx.keys()).filter(k => k.startsWith(p + '/') && V.idx.get(k).k === 'f');
            for (const f of files) { const t = await vRead(f); if (t != null) await vTrashPut(f, t); }
            await vRemove(p);
        }
        const dvTrash = {
            list: async () => (await vTrashIdx()).filter(e => V.idx.has(TRASH + '/' + e.f)),
            take: async e => { try { return JSON.parse(await vRead(TRASH + '/' + e.f)); } catch (x) { return null; } },
            drop: async e => { await vRemove(TRASH + '/' + e.f); await vTrashSave((await vTrashIdx()).filter(x => x.f !== e.f)); },
            empty: async () => { await vRemove(TRASH); },
            read: p => vRead(p), write: (p, t) => vWrite(p, t), put: vTrashPut, purge: vTrashPurge
        };
        window.dvTrash = dvTrash;

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
                if (m[2]) return method === 'GET' && !/alt=media/.test(u.search) ? vRes(200, { revisions: [] }) : method === 'PATCH' ? vRes(200, {}) : vRes(404, {});   // 옛 버전 목록은 없어요
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
                    if (meta.trashed) { await vToTrash(p); return vRes(200, { id }); }   // 🗑 바로 지우지 않고 휴지통 칸으로 (js/trash.js)
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
        const dvDays = () => Array.from(V.idx.keys()).filter(p => /\/다꾸\/[^/]+\/\d{4}년\/\d{1,2}월\/\d{1,2}일\.json$/.test(p)).length;
        async function dvStart(mode) {
            V.mode = mode; await vLoad();
            V.on = true; drive.local = true; drive.token = null;
            if (typeof waitForGoogle === 'function') waitForGoogle(15000).then(ok => { if (ok) driveClientMake(); });   // ☁ 구글로 로그인을 누르면 바로 창이 뜨게 미리 준비
            await loadFromDrive();                                         // 드라이브로 로그인할 때와 똑같이 읽어요 (설정 · 카페 · 모음 · 3일치)
            vTrashPurge().catch(() => {});                                 // 🗑 30일 지난 것 비우기
            hideGate(); updateBadge();
            try { await postLoginTasks(); } catch (e) {}
            if (mode === 'idb' && navigator.storage && navigator.storage.persist && !/firefox/i.test(navigator.userAgent)) navigator.storage.persist().catch(() => {});   // 지우지 말아 주세요 (묻는 창 없이 되는 브라우저만)
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
                try { h = await dvTx(['meta'], 'readonly', t => dvReq(t.objectStore('meta').get('top'))); } catch (e) {}
                if (!h || !h.queryPermission) { dvSetMode(''); return false; }
                V.top = h; try { V.label = localStorage.getItem(DV_MODE + '_label') || ''; } catch (e) { V.label = ''; }
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
            showGate('login', '');
        }
        function dvChoose() {
            const pc = dvCanDir();
            const c = dvCard(`<div class="gate-title dv-title">일기를 어디에 둘까요?</div>
                <button type="button" class="dv-opt on" data-v="folder"><b>📁 폴더</b><span>${pc ? '저장할 폴더를 고르면 쓰는 대로 자동으로 저장해요. 백업을 푼 폴더를 고르면 그대로 이어서 써요.' : '이 기기 폴더에 쓰는 대로 자동으로 저장해요. 다음에 열면 그대로 이어서 써요.'}</span></button>
                <button type="button" class="dv-opt" data-v="look"><b>👀 구경만</b><span>저장하지 않아요. 닫거나 새로고침하면 쓴 일기가 사라져요.</span></button>
                <p class="dv-foot">나중에 구글로 로그인하면 내 드라이브로 옮길 수 있어요.</p>
                <button type="button" class="gate-guest dv-restore">📥 다른 기기에서 받은 백업 파일(zip)로 시작하기</button>
                <button type="button" class="gate-guest dv-back">← 돌아가기</button>`);
            c.querySelector('[data-v="folder"]').onclick = () => dvPickFolder(true);
            c.querySelector('[data-v="look"]').onclick = () => { dvBack(); enterGuestMode(); };
            c.querySelector('.dv-restore').onclick = () => bkPickFile(dvStartWithBackup);
            c.querySelector('.dv-back').onclick = dvBack;
        }
        /* 고른 곳 → 말랑달콤 폴더 : 고른 게 말랑달콤 폴더(또는 백업을 푼 폴더)면 그대로 · 아니면 그 안에 (있으면 그것 · 없으면 만들기) */
        async function dvTopOf(h) {
            const label = h.name === DV_TOP ? '' : h.name;                   // 안내문에는 고른 폴더 이름만 (말랑달콤은 말하지 않아요 · 도련)
            if (h.name === DV_TOP) return { top: h, label };
            try { return { top: await h.getDirectoryHandle(DV_TOP), label }; } catch (e) {}
            for (const n of ['다꾸', '다이어리', '설정', '스티커']) { try { await h.getDirectoryHandle(n); return { top: h, label }; } catch (e) {} }   // 이름을 바꾼 말랑달콤 폴더
            return { top: await h.getDirectoryHandle(DV_TOP, { create: true }), label };
        }
        /* 📁 폴더 고르기 · 시작 (say : 다 되면 안내창) → 성공하면 true */
        async function dvPickFolder(say) {
            if (!dvCanDir()) {
                try { await dvDb(); } catch (e) { showMsg('⚠ 이 브라우저에서는 저장할 수 없어요.<br><span style="font-size:12px;color:#777;">시크릿 모드라면 일반 창으로 열어 주세요.</span>'); return false; }
                dvSetMode('idb'); dvBack(); showGate('wait', '📁 이 기기 폴더를 만드는 중…');
                try { await dvStart('idb'); return true; }
                catch (e) { console.warn(e); dvSetMode(''); dvQuit(); dvBack(); showMsg('⚠ 이 기기에 폴더를 만들지 못했어요.<br><span style="font-size:12px;color:#777;">시크릿 모드라면 일반 창으로 열어 주세요.</span>'); return false; }
            }
            let h;
            try { h = await showDirectoryPicker({ id: 'malang', mode: 'readwrite', startIn: 'documents' }); }
            catch (e) { return false; }                                    // 고르지 않고 닫음
            try {
                const t = await dvTopOf(h);
                V.top = t.top; V.label = t.label;
                try { await dvTx(['meta'], 'readwrite', x => { x.objectStore('meta').put(t.top, 'top'); }); } catch (e) {}
                try { localStorage.setItem(DV_MODE + '_label', t.label); } catch (e) {}
                dvSetMode('dir'); dvBack(); showGate('wait', '📁 ' + dvFolder(t.label) + '를 여는 중…');
                await dvStart('dir');
                const n = dvDays();
                if (say) showMsg(n ? `📁 ${dvFolder(t.label)}의 일기 <b>${n}일치</b>로 이어서 쓸게요!` : `📁 ${dvFolder(t.label)}에 저장할게요!<br><span style="font-size:12px;color:#777;">쓰는 대로 자동으로 저장되고, 다음에 열면 그대로 이어서 써요.</span>`);
                return true;
            } catch (e) { console.warn(e); dvSetMode(''); dvQuit(); dvBack(); showMsg('⚠ 그 폴더에는 저장할 수 없어요. 다른 폴더를 골라 주세요.'); return false; }
        }
        /* 📥 새 기기 : 백업 zip 으로 시작 → "이 기기에 저장할까요?" → (PC) 저장할 곳 고르기 → 넣기 */
        async function dvStartWithBackup(file) {
            const b = await bkOpen(file); if (!b) return;
            const pc = dvCanDir();
            if (!(await showMsg(`📥 백업 파일에 일기 <b>${b.days}일치</b> · 파일 ${b.items.length}개가 있어요.<br><b>이 기기</b>에 저장할까요?${pc ? '<br><span style="font-size:12px;color:#777;">다음 창에서 저장할 폴더를 골라 주세요.</span>' : ''}`, true))) return;
            if (!(await dvPickFolder(false))) return;
            await bkApply(b, '이 기기 폴더');
        }
        function dvAskAgain() {
            const n = dvFolder(V.label);
            const c = dvCard(`<div class="gate-title dv-title">다시 오셨네요!</div>
                <div class="gate-msg">지난번에 고른 ${n}에서<br>이어서 쓸게요.</div>
                <button type="button" class="btn gate-btn dv-go">📁 폴더 열고 이어서 쓰기</button>
                <button type="button" class="gate-guest dv-other">다른 폴더 고르기</button>
                <button type="button" class="gate-guest dv-login">구글 계정으로 시작하기</button>`);
            c.querySelector('.dv-go').onclick = async () => {
                let st = 'denied'; try { st = await V.top.requestPermission({ mode: 'readwrite' }); } catch (e) {}
                if (st !== 'granted') { showMsg('폴더를 허용해야 이어서 쓸 수 있어요.<br><span style="font-size:12px;color:#777;">허용 창에서 <b>방문할 때마다 허용</b>을 누르면 다음부터는 바로 열려요.</span>'); return; }
                try { dvBack(); showGate('wait', '📁 폴더를 여는 중…'); await dvStart('dir'); }
                catch (e) { console.warn(e); dvQuit(); dvAskAgain(); showMsg('⚠ 폴더를 열지 못했어요. 폴더가 옮겨졌다면 <b>다른 폴더 고르기</b>를 눌러 주세요.'); }
            };
            c.querySelector('.dv-other').onclick = () => dvPickFolder(true);
            c.querySelector('.dv-login').onclick = async () => {               // 폴더를 열지 않고 구글로 : 폴더 일기는 옮기지 않아요
                if (!(await showMsg('폴더에 쓴 일기는 옮기지 않고 그대로 둬요.<br><span style="font-size:12px;color:#777;">옮기려면 <b>📁 폴더 열고 이어서 쓰기</b>를 누른 뒤 ⚙ 설정 → ☁ 구글로 로그인을 눌러 주세요.</span><br>그냥 구글로 시작할까요?', true))) return;
                dvSetMode(''); dvBack();
            };
        }
        /* ⚙ 설정 → 📁 폴더 바꾸기 (PC) : 다른 말랑달콤 폴더로 · 새 폴더가 비어 있으면 지금 일기를 옮길지 물어요 */
        async function dvChangeFolder() {
            if (!V.on || V.mode !== 'dir') return;
            try { if (isCoverOpen && !turn) saveData(false); } catch (e) {}
            await flushUpload({ force: true });
            let h; try { h = await showDirectoryPicker({ id: 'malang', mode: 'readwrite', startIn: 'documents' }); } catch (e) { return; }
            try {
                const old = { top: V.top, label: V.label }, t = await dvTopOf(h);
                if (await t.top.isSameEntry(old.top)) { showMsg('지금 쓰는 폴더와 같은 폴더예요.'); return; }
                bkBusy('📁 폴더를 바꾸는 중…');
                const mine = await bkReadTree();                              // 지금 폴더의 것
                V.top = t.top; V.label = t.label; await vLoad(); resetDriveCaches();   // 폴더 기억을 새로
                let carry = false;
                bkBusy(null);
                if (mine.length && !dvDays()) carry = await showMsg(`📁 ${dvFolder(t.label)}가 비어 있어요.<br>지금 쓰던 일기 (파일 ${mine.length}개)를 새 폴더로 옮길까요?<br><span style="font-size:12px;color:#777;">옮기지 않으면 빈 다이어리로 시작해요. 원래 폴더는 그대로 남아요.</span>`, true);
                try { await dvTx(['meta'], 'readwrite', x => { x.objectStore('meta').put(t.top, 'top'); }); } catch (e) {}
                try { localStorage.setItem(DV_MODE + '_label', t.label); } catch (e) {}
                if (carry) await bkApply({ items: mine.map(([path, text]) => ({ path, text: async () => text })), days: mine.filter(f => /\/다꾸\/[^/]+\/\d{4}년\/\d{1,2}월\/\d{1,2}일\.json$/.test(f[0])).length }, '새 폴더');
                else { await loadFromDrive(); const n = dvDays(); showMsg(n ? `📁 ${dvFolder(t.label)}의 일기 <b>${n}일치</b>로 이어서 쓸게요!` : `📁 이제 ${dvFolder(t.label)}에 저장해요.`); }
                if (typeof updateStorageInfo === 'function') updateStorageInfo();
            } catch (e) { console.warn(e); bkBusy(null); showMsg('⚠ 그 폴더로 바꾸지 못했어요.'); }
        }

        /* ---------- ☁ 폴더로 쓰다가 구글로 로그인 (⚙ 설정) ----------
           - 누른 그 순간 구글 로그인 창부터 열어요 (아이패드 · 아이폰 사파리는 조금이라도 늦게 열면 창을 막아요)
           - 창이 떠 있는 동안 이 기기 폴더를 통째로 챙겨 둬요 (기다리던 저장 · 모음 · 검색 목록까지 끝낸 뒤)
           - 로그인을 안 했거나 실패하면 아무것도 바뀌지 않아요 (그대로 이 기기 폴더)
           - 구글 드라이브를 못 열면 다시 이 기기 폴더로 돌아와요
           - 열리면 "구글 드라이브 폴더에 넣을까요?" → 넣으면 일기 · 파일은 이 기기 것으로 덮어쓰고 설정 · 카페 · 검색 목록은 합쳐요 (js/backup.js)
           - 넣지 않아도 이 기기 폴더는 그대로 남아요 · 다음부터는 구글로 열려요 */
        async function dvLogin() {
            if (!V.on) return;
            if (!drive.client && !driveClientMake()) { showMsg('구글 로그인을 준비하는 중이에요.<br>잠시 후 다시 눌러 주세요.'); waitForGoogle(10000).then(ok => { if (ok) driveClientMake(); }); return; }
            const tp = requestToken('select_account');                      // 창은 지금 바로
            bkBusy('☁ 구글 로그인 창에서 계정을 선택해 주세요…');
            let files = null;
            const collect = (async () => { await bkSettle(); files = await bkReadTree(); })().catch(e => { console.warn(e); files = null; });
            try { await tp; }
            catch (e) { await collect; bkBusy(null); drive.token = null; showMsg('로그인하지 않았어요.<br><span style="font-size:12px;color:#777;">지금처럼 이 기기 폴더에 저장해요.</span>'); return; }
            bkBusy('☁ 구글 드라이브를 여는 중…');
            await collect;
            const mode = V.mode;
            V.on = false; drive.local = false; drive.ready = false; resetDriveCaches();
            try { await loadFromDrive(); bkBusy(null); hideGate(); await postLoginTasks(); }
            catch (e) {
                console.warn(e); drive.token = null;
                try { await dvStart(mode); } catch (x) { console.warn(x); }
                bkBusy(null); showMsg('⚠ 구글 드라이브를 열지 못했어요.<br><span style="font-size:12px;color:#777;">지금처럼 이 기기 폴더에 저장해요. 잠시 후 다시 해 주세요.</span>');
                return;
            }
            dvSetMode('');                                                 // 다음부터는 구글로 열려요
            if (files && files.length) await dvCarry(files);
            else if (files === null) showMsg('⚠ 이 기기 폴더를 다 읽지 못해서 옮기지 않았어요.<br><span style="font-size:12px;color:#777;">폴더는 그대로 남아 있어요. ⚙ 설정 → 로그아웃 → 로그인 없이 시작하기 → 📁 폴더로 열어서 📦 백업 파일을 받은 뒤, 구글에서 📥 백업 불러오기로 넣을 수 있어요.</span>');
        }
        function dvAfterLogin() { dvSetMode(''); }
        /* 로그인한 뒤 : 이 기기 폴더 통째로 드라이브로 */
        async function dvCarry(files) {
            const days = files.filter(f => /\/다꾸\/[^/]+\/\d{4}년\/\d{1,2}월\/\d{1,2}일\.json$/.test(f[0])).length;
            if (!(await showMsg(`📁 이 기기 폴더에 일기 <b>${days}일치</b> · 파일 ${files.length}개가 있어요.<br><b>구글 드라이브 폴더</b>에 넣을까요?<br><span style="font-size:12px;color:#777;">같은 날짜 일기는 이 기기 것으로 덮어써요.<br>설정 · 카페 기록은 합쳐요. 넣지 않아도 이 기기 폴더에는 그대로 남아 있어요.</span>`, true))) return;
            await bkApply({ items: files.map(([path, text]) => ({ path, text: async () => text })), days }, '구글 드라이브');
        }
        async function dvStop() {
            if (!(await showMsg('이 기기 폴더에 저장하기를 그만둘까요?<br><span style="font-size:12px;color:#777;">폴더 안의 일기는 지우지 않고 그대로 둬요. 다시 📁 폴더를 고르면 이어서 쓸 수 있어요.</span>', true))) return;
            try { if (isCoverOpen && !turn) saveData(false); } catch (e) {}
            await flushUpload({ force: true });
            dvSetMode(''); location.reload();
        }
        const dvOn = () => V.on;
        const dvIsDir = () => V.on && V.mode === 'dir';
        const dvFolder = l => l ? `<b>${dvEsc(l)}</b> 폴더` : '고른 폴더';
        const dvWhere = () => V.mode === 'dir' ? (V.label ? `'${V.label}' 폴더` : '고른 폴더') : '이 기기 폴더';

        window.dvAuto = dvAuto; window.dvChoose = dvChoose; window.vfsFetch = vfsFetch; window.dvOn = dvOn; window.dvIsDir = dvIsDir; window.dvWhere = dvWhere;
        window.dvLogin = dvLogin; window.dvAfterLogin = dvAfterLogin; window.dvCarry = dvCarry; window.dvStop = dvStop; window.dvChangeFolder = dvChangeFolder;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['devsave'] = true;
