/* 말랑달콤 다이어리 - js/coll.js
   📚 모음 저장소 : 스티커 · 페이지 · 배경지처럼 '하나씩 늘어나는 것'을 드라이브에 담는 공통 코드
   - 드라이브 : <모음 폴더> / 목록 / 목록1.json · 목록2.json …   작은 그림(썸네일) 100개씩 묶음 · 화면에 보이는 묶음만 읽어요
                <모음 폴더> / 원본 / 1760000000000.json          하나에 파일 하나 (이름 = 만든 시각 ms) · 눌렀을 때만 읽어요
       목록 한 칸 : { id, th : 작은 그림, x : 칸에 보일 작은 정보, f : 원본 파일 id, m : 고친 시각 }
       원본       : { v:1, id, th, x, m, item : 진짜 내용 } → 목록이 없어져도 원본만 있으면 목록을 다시 만들 수 있어요
   - 이 기기 (IndexedDB 'mallang-coll')
       orig   : 읽은 원본 (200MB 를 넘으면 오래 안 쓴 것부터 지워요 · 다시 누르면 드라이브에서 또 읽어요)
       list   : 읽은 목록 묶음 (드라이브 파일의 수정 시각이 같으면 다시 받지 않아요)
       local  : 게스트(로그인 안 함)의 모음 · 원본 (지우지 않아요)
       outbox : 아직 드라이브에 못 올린 일 (인터넷이 끊겨도 다음에 이어서 올려요)
   - 두 기기에서 같이 써도
       새로 만든 것 : 시각으로 이름을 지어 겹치지 않아요
       목록 묶음을 고칠 때 : 고치기 직전에 드라이브 파일의 '마지막 수정 시각'을 보고, 바뀌었으면 다시 읽은 위에 내 것만 얹어요
       같은 것을 두 기기가 고쳤으면 : 물어봐요
       접속마다 모음을 처음 열 때 한 번 : 원본 폴더와 목록을 맞춰 봐요 (빠진 것은 원본에서 다시 넣고, 원본이 없는 칸은 빼요)
   ※ 파일 불러오는 순서: drive → coll → app … (index.html) */

        const COLL_PER = 100, COLL_CACHE_MAX = 200 * 1048576, COLL_TH = 96;   // 작은 그림 : 96px (폰 화면에서도 또렷하게)
        const COLL = { db: null, who: '', map: new Map(), pumping: null, timer: 0, lastId: 0, puts: 0, fullTold: false, loginHooks: [] };
        const collGuest = () => typeof drive === 'undefined' || drive.guest;
        const collOnline = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;

        /* ---------- IndexedDB ---------- */
        function collDb() {
            if (COLL.db) return COLL.db;
            COLL.db = new Promise(ok => {
                let r;
                try { r = indexedDB.open('mallang-coll', 1); } catch (e) { ok(null); return; }
                r.onupgradeneeded = () => {
                    const d = r.result;
                    ['orig', 'list', 'local'].forEach(n => { if (!d.objectStoreNames.contains(n)) d.createObjectStore(n); });
                    if (!d.objectStoreNames.contains('outbox')) d.createObjectStore('outbox', { autoIncrement: true });
                };
                r.onsuccess = () => ok(r.result);
                r.onerror = r.onblocked = () => ok(null);
            });
            return COLL.db;
        }
        async function collTx(name, mode, fn) {
            const d = await collDb();
            if (!d) return undefined;
            return new Promise(ok => {
                let out;
                try {
                    const tx = d.transaction(name, mode), req = fn(tx.objectStore(name));
                    if (req) req.onsuccess = () => { out = req.result; };
                    tx.oncomplete = () => ok(out);
                    tx.onerror = tx.onabort = () => ok(undefined);
                } catch (e) { ok(undefined); }
            });
        }
        const collGet = (s, k) => collTx(s, 'readonly', st => st.get(k));
        const collPut = (s, k, v) => collTx(s, 'readwrite', st => st.put(v, k));
        const collDel = (s, k) => collTx(s, 'readwrite', st => st.delete(k));
        /* 상자 안의 것 모두 [{ k, v }] (filter 로 고르기) */
        async function collScan(s, filter) {
            const d = await collDb();
            if (!d) return [];
            return new Promise(ok => {
                const out = [];
                try {
                    const tx = d.transaction(s, 'readonly'), req = tx.objectStore(s).openCursor();
                    req.onsuccess = () => { const c = req.result; if (!c) return; if (!filter || filter(c.key, c.value)) out.push({ k: c.key, v: c.value }); c.continue(); };
                    tx.oncomplete = () => ok(out);
                    tx.onerror = tx.onabort = () => ok(out);
                } catch (e) { ok(out); }
            });
        }

        /* ---------- 모음 ---------- */
        /* names : 드라이브 폴더 경로 ['말랑달콤','스티커','씰','내씰'] → 모음 하나 (같은 경로는 늘 같은 것) */
        function collOf(names) {
            const key = names.join('/');
            let C = COLL.map.get(key);
            if (!C) { C = { key, names, lists: null, idx: null, pend: [], gone: new Set(), checked: false, onChange: null }; COLL.map.set(key, C); }
            return C;
        }
        const collKey = (C, x) => `${COLL.who || 'me'}|${C.key}|${x}`;
        function collNewId() {
            let t = Date.now();
            if (t <= COLL.lastId) t = COLL.lastId + 1;
            COLL.lastId = t;
            return String(t);
        }
        /* 목록 한 칸 확인 (드라이브 · 기기에서 읽은 것) */
        function collClean(arr) {
            return (Array.isArray(arr) ? arr : []).filter(e => e && typeof e === 'object' && /^[\w-]{1,30}$/.test(e.id || ''))
                .map(e => ({ id: e.id, th: e.th == null ? '' : e.th, x: e.x && typeof e.x === 'object' ? e.x : {}, f: typeof e.f === 'string' ? e.f : '', m: +e.m || 0 }));
        }

        /* 목록 묶음 이름들만 (내용은 아직) : [{ n, f, items(null = 아직 안 읽음) }] 번호 순서 */
        function collIndex(C) {
            if (C.lists) return Promise.resolve(C.lists);
            if (C.idx) return C.idx;
            C.idx = (async () => {
                const lists = [];
                if (collGuest()) {
                    const g = await collGet('local', collKey(C, 'g'));
                    (g && Array.isArray(g.lists) ? g.lists : []).forEach(l => lists.push({ n: +l.n || 1, f: null, items: collClean(l.items) }));
                } else {
                    const dir = await getFolder(C.names.concat('목록'), false);
                    if (dir) {
                        const fs = await driveList(`'${dir}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,name,modifiedTime');
                        fs.forEach(f => { const r = /^목록(\d+)\.json$/.exec(f.name); if (r && !lists.some(l => l.n === +r[1])) lists.push({ n: +r[1], f, items: null }); });
                    }
                    await collPendLoad(C);
                }
                lists.sort((a, b) => a.n - b.n);
                C.lists = lists;
                return lists;
            })().finally(() => { C.idx = null; });
            return C.idx;
        }
        /* 묶음 하나 읽기 (이 기기에 같은 시각 것이 있으면 그것) */
        function collLoad(C, L) {
            if (L.items) return Promise.resolve(L.items);
            if (L.busy) return L.busy;
            L.busy = (async () => {
                const k = collKey(C, 'l' + L.n), c = await collGet('list', k);
                if (c && L.f && c.fid === L.f.id && c.mt === L.f.modifiedTime) L.items = collClean(c.items);
                else {
                    let o = null;
                    try { o = JSON.parse(await readFileText(L.f.id) || '{}'); } catch (e) { if (e && e.code === 'gone') o = {}; else throw e; }
                    L.items = collClean(o && o.items);
                    collPut('list', k, { fid: L.f.id, mt: L.f.modifiedTime, items: L.items });
                }
                return L.items;
            })().finally(() => { L.busy = null; });
            return L.busy;
        }
        /* 모두 읽기 (📥 받은 것 겹침 확인 · 맞춰 보기용) : 칸들 (새것 먼저) */
        async function collAll(C) {
            const lists = await collIndex(C);
            for (const L of lists) await collLoad(C, L);
            return C.pend.slice().reverse().concat(...lists.slice().reverse().map(L => L.items.slice().reverse())).filter(e => !C.gone.has(e.id));
        }
        /* 이미 읽은 칸에서 찾기 */
        function collEnt(C, id) {
            return C.pend.find(e => e.id === id) || (C.lists || []).reduce((hit, L) => hit || (L.items || []).find(e => e.id === id), null);
        }

        /* ---------- 원본 ---------- */
        async function collItem(C, id) {
            const e = collEnt(C, id);
            if (e && e._item) return e._item;                                         // 아직 올리는 중인 것
            if (collGuest()) { const g = await collGet('local', collKey(C, 'o' + id)); return g ? g.item : null; }
            const k = collKey(C, 'o' + id), c = await collGet('orig', k);
            if (c && (!e || !e.m || c.m === e.m)) { c.t = Date.now(); collPut('orig', k, c); return c.item; }
            let fid = e && e.f, o = null;
            for (let round = 0; round < 2 && !o; round++) {
                if (!fid || round) {
                    const dir = await getFolder(C.names.concat('원본'), false);
                    const f = dir && await findFile(dir, id + '.json');
                    if (!f) break;
                    fid = f.id;
                }
                try { o = JSON.parse(await readFileText(fid) || 'null'); }
                catch (er) { if (!(er && er.code === 'gone')) throw er; }
            }
            if (!o || o.item == null) return null;
            collCache(k, o.item, +o.m || (e && e.m) || 0);
            return o.item;
        }
        /* 원본을 이 기기에 넣어 두기 (200MB 를 넘으면 오래 안 쓴 것부터 지워요) */
        async function collCache(k, item, m) {
            let sz = 0; try { sz = JSON.stringify(item).length; } catch (e) {}
            await collPut('orig', k, { item, m, t: Date.now(), sz });
            if (++COLL.puts % 20) return;
            const all = await collScan('orig');
            let total = (all || []).reduce((s, r) => s + (r.v.sz || 0), 0);
            if (total <= COLL_CACHE_MAX) return;
            (all || []).sort((a, b) => a.v.t - b.v.t);
            for (const r of all) { if (total <= COLL_CACHE_MAX * .9) break; total -= r.v.sz || 0; await collDel('orig', r.k); }
        }

        /* ---------- 넣기 · 고치기 · 빼기 (화면은 바로 · 드라이브는 뒤에서 차례대로) ---------- */
        /* th : 작은 그림 · x : 칸에 보일 작은 정보 · item : 진짜 내용 → 새 id */
        async function collAdd(C, item, th, x) {
            const id = collNewId(), ent = { id, th: th || '', x: x || {}, f: '', m: Date.now() };
            if (collGuest()) {
                await collIndex(C);
                await collPut('local', collKey(C, 'o' + id), { item });
                collGuestList(C, ent, null);
                return id;
            }
            await collIndex(C);
            C.pend.push(Object.assign({ _item: item }, ent));
            await collQueue({ op: 'add', names: C.names, id, ent, item });
            return id;
        }
        async function collSet(C, id, item, th, x) {
            const old = collEnt(C, id) || {};
            const ent = { id, th: th == null ? old.th || '' : th, x: x || old.x || {}, f: old.f || '', m: Date.now() };
            if (collGuest()) {
                await collPut('local', collKey(C, 'o' + id), { item });
                collGuestList(C, ent, id);
                return;
            }
            collPatch(C, id, ent, item);
            collCache(collKey(C, 'o' + id), item, ent.m);
            await collQueue({ op: 'put', names: C.names, id, ent, item, base: old.m || 0, f: old.f || '' });
        }
        async function collRemove(C, id) {
            const old = collEnt(C, id) || {};
            if (collGuest()) {
                await collDel('local', collKey(C, 'o' + id));
                collGuestList(C, null, id);
                return;
            }
            C.gone.add(id);
            C.pend = C.pend.filter(e => e.id !== id);
            collDel('orig', collKey(C, 'o' + id));
            await collQueue({ op: 'del', names: C.names, id, f: old.f || '' });
        }
        /* 화면용 목록에서 그 칸 바꾸기 */
        function collPatch(C, id, ent, item) {
            const p = C.pend.find(e => e.id === id);
            if (p) { Object.assign(p, ent, item !== undefined ? { _item: item } : {}); return; }
            (C.lists || []).forEach(L => { const i = (L.items || []).findIndex(e => e.id === id); if (i >= 0) L.items[i] = Object.assign({}, L.items[i], ent); });
        }
        /* 게스트 : 묶음째 이 기기에 */
        function collGuestList(C, ent, id) {
            const lists = C.lists || (C.lists = []);
            if (id) lists.forEach(L => { const i = L.items.findIndex(e => e.id === id); if (i >= 0) { if (ent) L.items[i] = ent; else L.items.splice(i, 1); } });
            else if (ent) {
                let L = lists[lists.length - 1];
                if (!L || L.items.length >= COLL_PER) { L = { n: (L ? L.n : 0) + 1, f: null, items: [] }; lists.push(L); }
                L.items.push(ent);
            }
            collPut('local', collKey(C, 'g'), { lists: lists.map(L => ({ n: L.n, items: L.items })) });
        }

        /* ---------- 못 올린 일 (outbox) ---------- */
        async function collQueue(op) {
            op.who = COLL.who;
            await collTx('outbox', 'readwrite', st => st.add(op));
            collPump();
        }
        /* 다시 열었을 때 아직 못 올린 것도 화면에 보이게 */
        async function collPendLoad(C) {
            const ops = (await collScan('outbox', (k, v) => v && v.who === COLL.who && v.names && v.names.join('/') === C.key)) || [];
            ops.forEach(({ v }) => {
                if (v.op === 'add' && !C.pend.some(e => e.id === v.id) && !C.gone.has(v.id)) C.pend.push(Object.assign({ _item: v.item }, v.ent));
                if (v.op === 'del') { C.gone.add(v.id); C.pend = C.pend.filter(e => e.id !== v.id); }
            });
        }
        function collPump() {
            if (COLL.pumping) return COLL.pumping;
            clearTimeout(COLL.timer);
            COLL.pumping = (async () => {
                while (collOnline()) {
                    const ops = (await collScan('outbox', (k, v) => v && v.who === COLL.who)) || [];
                    if (!ops.length) break;
                    const { k, v } = ops[0];
                    try { await collDo(v); await collDel('outbox', k); }
                    catch (e) {
                        if (e && e.code === 'auth') break;                              // 다시 로그인하면 이어서
                        if (e && e.code === 'full' && !COLL.fullTold) {
                            COLL.fullTold = true;
                            showMsg('☁ 구글 드라이브 저장공간이 <b>가득 찼어요.</b><br>새로 만든 것은 이 기기에 보관해 둘게요.<br><span style="font-size:12px;color:#777;">공간을 비우면 자동으로 다시 저장해요.</span>');
                        }
                        console.warn('모음을 드라이브에 올리지 못했어요:', v.op, v.id, e);
                        COLL.timer = setTimeout(collPump, e && e.code === 'full' ? 5 * 60000 : 30000);
                        break;
                    }
                }
            })().finally(() => { COLL.pumping = null; });
            return COLL.pumping;
        }
        async function collDo(v) {
            const C = collOf(v.names), name = v.id + '.json';
            if (v.op === 'del') {
                const dir = await getFolder(v.names.concat('원본'), false);
                let cur = v.f ? await driveMeta(v.f) : null;
                if (!cur && dir) cur = await findFile(dir, name);
                if (cur) await driveTrash(cur.id);
                await collListEdit(C, v.id, null);
                C.gone.delete(v.id);
                return;
            }
            const dir = await getFolder(v.names.concat('원본'), true);
            let cur = v.f ? await driveMeta(v.f) : null;
            if (!cur) cur = await findFile(dir, name);
            if (v.op === 'put' && cur && v.base && Date.parse(cur.modifiedTime) > v.base + 2000) {       // 📱 다른 기기가 그 사이 고쳤어요
                let theirs = null;
                try { theirs = JSON.parse(await readFileText(cur.id) || 'null'); } catch (e) {}
                if (theirs && theirs.item != null && JSON.stringify(theirs.item) !== JSON.stringify(v.item)) {
                    const mine = await showAsk('📱 다른 기기에서 같은 것을 고쳤어요.<br>어느 쪽을 남길까요?<br><span style="font-size:12px;color:#777;">고르지 않은 쪽은 사라져요.</span>', '📝 내 것 저장', '📱 다른 기기 것');
                    if (!mine) {
                        const ent = { id: v.id, th: theirs.th || '', x: theirs.x || {}, f: cur.id, m: Date.parse(cur.modifiedTime) || Date.now() };
                        collPatch(C, v.id, ent);
                        collCache(collKey(C, 'o' + v.id), theirs.item, ent.m);
                        await collListEdit(C, v.id, ent);
                        if (C.onChange) C.onChange(v.id, theirs.item);
                        return;
                    }
                }
            }
            const body = JSON.stringify({ v: 1, id: v.id, th: v.ent.th, x: v.ent.x, m: v.ent.m, item: v.item });
            const saved = await driveUpsert(dir, name, cur && cur.id, body);
            const ent = Object.assign({}, v.ent, { f: saved.id, m: Date.parse(saved.modifiedTime) || v.ent.m });
            collCache(collKey(C, 'o' + v.id), v.item, ent.m);
            await collListEdit(C, v.id, ent, v.op === 'add');
            C.pend = C.pend.filter(e => e.id !== v.id);
        }
        /* 목록 묶음 고치기 : 고치기 직전에 드라이브 파일을 다시 보고 그 위에 (ent = null 이면 빼기) */
        async function collListEdit(C, id, ent, isNew) {
            const lists = await collIndex(C);
            const listDir = await getFolder(C.names.concat('목록'), true);
            let L = null;
            if (!isNew) for (let i = lists.length - 1; i >= 0 && !L; i--) { if ((await collLoad(C, lists[i])).some(e => e.id === id)) L = lists[i]; }
            if (!L) {
                if (!ent) return;                                                     // 뺄 것이 목록에 없어요 (이미 빠짐)
                L = lists[lists.length - 1];
                if (!L || (await collLoad(C, L)).length >= COLL_PER) { L = { n: (L ? L.n : 0) + 1, f: null, items: [] }; lists.push(L); }
            }
            const name = `목록${L.n}.json`;
            let cur = L.f ? await driveMeta(L.f.id) : null;
            if (!cur) cur = await findFile(listDir, name);
            if (cur && (!L.f || cur.id !== L.f.id || cur.modifiedTime !== L.f.modifiedTime)) { L.f = cur; L.items = null; await collLoad(C, L); }   // 다른 기기가 고쳤어요 → 다시 읽은 위에
            const items = L.items || (L.items = []);
            const i = items.findIndex(e => e.id === id);
            if (ent) { if (i >= 0) items[i] = ent; else items.push(ent); }
            else if (i >= 0) items.splice(i, 1);
            else return;
            const saved = await driveUpsert(listDir, name, cur && cur.id, JSON.stringify({ v: 1, items }));
            L.f = { id: saved.id, name, modifiedTime: saved.modifiedTime };
            collPut('list', collKey(C, 'l' + L.n), { fid: saved.id, mt: saved.modifiedTime, items });
            if (typeof driveTell === 'function') driveTell({ t: 'coll', path: C.key });
        }

        /* ---------- 맞춰 보기 (접속마다 모음을 처음 열 때 한 번 · 뒤에서) ---------- */
        async function collCheck(C) {
            if (C.checked || !collOnline()) return;
            C.checked = true;
            try {
                await collPump();
                const dir = await getFolder(C.names.concat('원본'), false);
                const lists = await collIndex(C);
                for (const L of lists) await collLoad(C, L);
                const have = new Map();
                if (dir) (await driveList(`'${dir}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,name')).forEach(f => {
                    const r = /^([\w-]{1,30})\.json$/.exec(f.name); if (r && !have.has(r[1])) have.set(r[1], f.id);
                });
                const busy = new Set(((await collScan('outbox', (k, v) => v && v.who === COLL.who)) || []).map(o => o.v.id));
                const inList = new Set();
                lists.forEach(L => L.items.forEach(e => inList.add(e.id)));
                const missing = [...have.keys()].filter(id => !inList.has(id) && !busy.has(id));
                const dead = [...inList].filter(id => !have.has(id) && !busy.has(id));
                for (const id of dead) await collListEdit(C, id, null);
                for (const id of missing) {                                           // 목록에서 빠진 원본 → 원본에 든 작은 그림으로 다시 넣기
                    let o = null; try { o = JSON.parse(await readFileText(have.get(id)) || 'null'); } catch (e) {}
                    if (!o || o.item == null) continue;
                    await collListEdit(C, id, { id, th: o.th || '', x: o.x && typeof o.x === 'object' ? o.x : {}, f: have.get(id), m: +o.m || 0 }, true);
                }
                if ((dead.length || missing.length) && C.onChange) C.onChange();
            } catch (e) { C.checked = false; console.warn('모음 맞춰 보기 실패:', C.key, e); }
        }

        /* ---------- 다른 기기 · 다른 탭에서 바뀌었을 때 (js/drive.js checkRemote · BroadcastChannel) ---------- */
        async function collRemote(path) {
            if (!collOnline()) return;
            for (const C of COLL.map.values()) {
                if (!C.lists || (path && C.key !== path)) continue;
                let changed = !!path;
                if (!path) {
                    try {
                        const dir = await getFolder(C.names.concat('목록'), false);
                        const fs = dir ? await driveList(`'${dir}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,name,modifiedTime') : [];
                        const now = fs.filter(f => /^목록\d+\.json$/.test(f.name)).map(f => f.name + f.modifiedTime).sort().join();
                        const was = C.lists.filter(L => L.f).map(L => `목록${L.n}.json` + L.f.modifiedTime).sort().join();
                        changed = now !== was;
                    } catch (e) { continue; }
                }
                if (changed) { C.lists = null; if (C.onChange) C.onChange(); }
            }
        }

        /* ---------- 로그인할 때 (js/drive.js loadFromDrive) ---------- */
        async function collLogin() {
            let who = 'me';
            try {
                const res = await gfetch('https://www.googleapis.com/drive/v3/about?fields=user(permissionId)');
                if (res.ok) who = ((await res.json()).user || {}).permissionId || who;
            } catch (e) {}
            if (who !== COLL.who) { COLL.map.clear(); COLL.who = who; }
            for (const fn of COLL.loginHooks) { try { await fn(); } catch (e) { console.warn('모음 준비 실패:', e); } }
            setTimeout(collPump, 1500);
        }
        function collGuestStart() { COLL.who = 'guest'; COLL.map.clear(); }

        /* ---------- 작은 그림 만들기 (96px webp) ---------- */
        function collThumb(src, size) {
            size = size || COLL_TH;
            return new Promise(ok => {
                if (typeof src !== 'string' || !/^data:image\//.test(src)) { ok(''); return; }
                const im = new Image();
                im.onload = () => {
                    const k = Math.min(1, size / Math.max(im.width, im.height)), c = document.createElement('canvas');
                    c.width = Math.max(1, Math.round(im.width * k)); c.height = Math.max(1, Math.round(im.height * k));
                    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                    let u = '';
                    try { u = c.toDataURL('image/webp', .82); } catch (e) {}
                    if (!/^data:image\/webp/.test(u)) u = c.toDataURL('image/png');
                    ok(u.length < src.length ? u : src);
                };
                im.onerror = () => ok('');
                im.src = src;
            });
        }

        /* ---------- 칸 그리기 : 가장 새 묶음부터 · 끝에 닿으면 다음 묶음 ----------
           host  : 칸이 들어갈 곳 · render(칸) → html · empty : 비었을 때 html
           (먼저 맞춰 보기를 뒤에서 시작하고, 끝나서 바뀐 게 있으면 다시 그려요) */
        /* 끝 표시가 화면(과 스크롤 상자) 안에 보이나요 */
        function cgNear(el) {
            if (!el.isConnected || !el.offsetParent) return false;
            const r = el.getBoundingClientRect();
            if (r.top > innerHeight + 150 || r.bottom < -150) return false;
            for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
                const o = getComputedStyle(a).overflowY;
                if (o === 'auto' || o === 'scroll') { const b = a.getBoundingClientRect(); return r.top <= b.bottom + 150 && r.bottom >= b.top - 150; }
            }
            return true;
        }
        async function collGrid(host, C, render, empty) {
            const tok = {};
            host._cg = tok;
            host.innerHTML = '<div class="cg-more">불러오는 중…</div>';
            let lists;
            try { lists = await collIndex(C); }
            catch (e) { if (host._cg === tok) host.innerHTML = '<div class="cs-empty">⚠ 목록을 읽지 못했어요.<br>인터넷 연결을 확인해 주세요.</div>'; return; }
            if (host._cg !== tok) return;
            let next = lists.length - 1, shown = 0;
            const sentinel = document.createElement('div');
            sentinel.className = 'cg-more';
            const add = arr => {
                const html = arr.filter(e => !C.gone.has(e.id)).map(render).join('');
                if (html) { sentinel.insertAdjacentHTML('beforebegin', html); shown++; }
            };
            host.innerHTML = '';
            host.appendChild(sentinel);
            add(C.pend.slice().reverse());
            let loading = false;
            const more = async () => {
                if (loading || host._cg !== tok) return;
                loading = true;
                try {
                    while (next >= 0 && host._cg === tok) {
                        const items = await collLoad(C, lists[next--]);
                        if (host._cg !== tok) return;
                        add(items.slice().reverse());
                        if (items.length) break;
                    }
                } catch (e) { sentinel.textContent = '⚠ 목록을 다 읽지 못했어요.'; loading = false; return; }
                loading = false;
                if (next < 0) {
                    if (io) io.disconnect();
                    sentinel.remove();
                    if (!host.querySelector('[data-id]') && empty) host.insertAdjacentHTML('beforeend', empty);
                } else {
                    sentinel.textContent = '';
                    requestAnimationFrame(() => { if (cgNear(sentinel)) more(); });   // 아직 화면이 덜 찼으면 한 묶음 더
                }
            };
            const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => { if (es.some(x => x.isIntersecting)) more(); }) : null;
            if (io) io.observe(sentinel);
            await more();
            if (!io) while (next >= 0 && host._cg === tok) await more();
            if (collOnline() && !C.checked) collCheck(C);
        }

        /* ---------- ✨ 스티커 모음 : 말랑달콤 / 스티커 / 씰 / 내씰 · 받은씰 … ---------- */
        const STK_FOLDERS = { seal: '씰', piece: '조각', paper: '모조지', tape: '마테', tk: '떡메', leaf: '속지' };   // tk = 🧻 떡메 (js/leafpad.js)
        function stkColl(kind, got) { const n = STK_FOLDERS[kind]; return collOf(STICKER_PATH.concat(n, (got ? '받은' : '내') + n)); }
        /* 글자 → 짧은 확인 글자 (같은 그림인지 보기) */
        function collHash(s) { s = String(s || ''); let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length.toString(36); }

        window.stkColl = stkColl; window.collHash = collHash;
        window.collOf = collOf; window.collAdd = collAdd; window.collSet = collSet; window.collRemove = collRemove; window.collItem = collItem;
        window.collAll = collAll; window.collEnt = collEnt; window.collGrid = collGrid; window.collThumb = collThumb; window.collNewId = collNewId;
        window.collLogin = collLogin; window.collRemote = collRemote; window.collGuestStart = collGuestStart; window.collCheck = collCheck;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['coll'] = true;
