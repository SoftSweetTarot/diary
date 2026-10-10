/* 말랑달콤 다이어리 - js/drive.js
   ☁ 구글 로그인 · 드라이브 저장/불러오기 · 화면 꺼짐 자동 저장  ⚠ 저장의 핵심 - 꼭 필요할 때만 수정
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        /* =====================================================================
           ☁ 구글 드라이브 저장소 : 내 드라이브의 '말랑달콤' 폴더 하나에 모두 모여요
             말랑달콤 / 설정 / 설정.json                       ⚙ 설정 탭 값 (글꼴 · 소리 · 고른 페이지 등)
                      / 카페 / 카페.json                       ☕ 출석 · 화분 · 달력 · D-day …
                      / 카페 / 인형 / 로라.json                👧 인형 하나에 파일 하나 (js/doll-store.js)
                      / 페이지 / 페이지 / 내페이지 · 받은페이지 / 목록 · 원본   🎨 (js/coll.js)
                      / 페이지 / 배경지 / 내배경지 · 받은배경지 / 목록 · 원본   📂
                      / 스티커 / 씰 · 조각 · 모조지 · 마테 · 떡메 · 속지 / 내X · 받은X / 목록 · 원본
                      / 다이어리 / 페이지 / 2026년 / 10월 / 9일.json   📔 하루에 파일 1개
                      / 다이어리 / 검색 / 검색-2026.json              🔍 (js/search.js)
           - 폴더가 없으면 저장할 때 자동으로 만들어요 · 같은 이름 폴더가 둘이면 먼저 만든 쪽으로 합쳐요
           - 두 기기에서 같이 써도 : 덮어쓰기 전에 드라이브 파일의 '마지막 수정 시각'을 보고
             바뀌었으면 다른 기기 내용 위에 내가 고친 것만 얹어요 (같은 날 일기는 물어봐요)
           ===================================================================== */
        const GOOGLE_CLIENT_ID = '1020129080030-42dun4pqvve1pjg9r21m62dd71h6hui5.apps.googleusercontent.com'; // ← 본인 OAuth 클라이언트 ID로 교체
        const TOP_FOLDER_NAME = '말랑달콤';                         // 최상위 폴더
        const DIARY_PATH = [TOP_FOLDER_NAME, '다이어리'];
        const DAY_PATH = DIARY_PATH.concat('페이지');              // 📔 일기 : 말랑달콤 / 다이어리 / 페이지 / 2026년 / 10월 / 9일.json
        const SEARCH_PATH = DIARY_PATH.concat('검색');             // 🔍 검색 목록
        const SETTINGS_PATH = [TOP_FOLDER_NAME, '설정'], SETTINGS_FILE_NAME = '설정.json';
        const CAFE_PATH = [TOP_FOLDER_NAME, '카페'], CAFE_FILE_NAME = '카페.json';
        const STICKER_PATH = [TOP_FOLDER_NAME, '스티커'];          // 스티커 / 씰 / 내씰 …
        const PAGE_PATH = [TOP_FOLDER_NAME, '페이지'];             // 페이지 / 페이지 · 배경지
        const ROOT_PATH_TEXT = DAY_PATH.join(' / ');
        const USE_APP_DATA_FOLDER = false; // false: 내 드라이브에 '말랑달콤' 폴더가 보임 / true: 사용자에게 안 보이는 앱 전용 공간
        const DRIVE_SCOPE = USE_APP_DATA_FOLDER
            ? 'https://www.googleapis.com/auth/drive.appdata'
            : 'https://www.googleapis.com/auth/drive.file';
        const AUTH_FLAG_KEY = 'gdrive_authed';   // 이 기기에서 이전에 로그인했는지 (자동 로그인 시도용)
        const UPLOAD_DEBOUNCE_MS = 3000;         // 변경 후 이 시간이 지나면 자동으로 드라이브에 저장
        const PENDING_KEY = 'gdrive_pending_backup'; // 화면이 꺼질 때 업로드가 끝나기 전에 앱이 멈출 경우를 대비한 임시 보관본
        const KEEPALIVE_MAX_BYTES = 60000;       // fetch keepalive 옵션은 본문 64KB 이하만 가능
        const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';
        const FOLDER_MIME = 'application/vnd.google-apps.folder';
        const DAY_KEY_RE = /^diary_(\d{4})_(\d{2})_(\d{2})$/;

        /* 메모리 저장소: 화면이 쓰는 값은 여기(문자열)에 두고, 변경된 것만 드라이브에 올립니다.
           - 날짜 데이터  : diary_2026_09_10  → 말랑달콤/다이어리/페이지/2026년/9월/10일.json
           - 설정 데이터  : diary_ui_font 등  → 말랑달콤/설정/설정.json  (카페 기록은 말랑달콤/카페/카페.json) */
        const store = {
            _m: new Map(),
            _silent: false,
            keys() { return Array.from(this._m.keys()); },
            getItem(k) { return this._m.has(k) ? this._m.get(k) : null; },
            setItem(k, v) {
                v = String(v);
                if (v === 'undefined' || this._m.get(k) === v) return;
                this._m.set(k, v);
                if (!this._silent) markDirty(k);
            },
            removeItem(k) {
                if (this._m.delete(k) && !this._silent) markDirty(k);
            },
            /* 드라이브에서 읽어온 값을 '변경됨' 표시 없이 넣기 (null이면 비우기) */
            putLoaded(k, v) { if (v === null || v === undefined) this._m.delete(k); else this._m.set(k, String(v)); },
            clear() { this._m.clear(); },
            toJSONString() {
                return '{' + this.keys().map(k => JSON.stringify(k) + ':' + this._m.get(k)).join(',') + '}';
            }
        };

        const drive = {
            client: null, token: null, expiresAt: 0,
            ready: false,      // 설정을 성공적으로 불러온 상태 (이때부터만 업로드 허용)
            guest: false, uploading: false, needAuth: false, error: false, lastSaved: null,
            gen: 0,            // 다시 불러오기 할 때마다 증가 (예전 요청의 결과가 뒤늦게 섞이는 것 방지)
            inflight: null,    // 지금 업로드 중인 키
            settingsFile: null, cafeFile: null,   // { id, modifiedTime } : 마지막으로 읽거나 쓴 때의 드라이브 파일 (두 기기 확인용)
            cafeBase: new Map(),         // ☕ 카페 기록 : 마지막으로 드라이브에서 읽거나 올린 값 (두 기기가 같은 항목을 고쳤을 때 합치는 기준)
            dayMeta: new Map(),          // 'diary_2026_10_09' → 읽거나 쓴 때의 드라이브 파일 수정 시각 ('' = 그때 파일이 없었음)
            full: false,                 // 구글 저장공간이 꽉 참
            dirtyKeys: new Set(),        // 아직 드라이브에 올리지 못한 변경 (날짜/설정 키)
            loadedDays: new Set(),       // 드라이브에서 이미 읽어 온 날짜 (없는 날짜도 '읽음' 처리)
            dayLoads: new Map(),         // 읽는 중인 날짜 요청
            folderIds: new Map(),        // 폴더 경로 → 폴더 id 캐시
            folderBusy: new Map(),
            monthIndex: new Map(),       // '2026/9' → { folderId, files: Map(파일명 → 파일정보) } 캐시
            monthBusy: new Map(),
            get dirty() { return this.dirtyKeys.size > 0; }
        };
        let uploadTimer = null;
        let uploadChain = Promise.resolve(true);
        let pendingToken = null;

        function markDirty(key) {
            if (drive.guest) { updateBadge(); return; }
            drive.dirtyKeys.add(key);
            if (drive.ready) {
                clearTimeout(uploadTimer);
                uploadTimer = setTimeout(() => flushUpload(), UPLOAD_DEBOUNCE_MS);
            }
            updateBadge();
        }

        /* ---------- 로그인 / 토큰 ---------- */
        function requestToken(prompt) {
            return new Promise((resolve, reject) => {
                if (!drive.client) return reject({ type: 'no_client' });
                const timer = setTimeout(() => { pendingToken = null; reject({ type: 'timeout' }); }, prompt === 'none' ? 8000 : 180000);
                pendingToken = {
                    ok: (r) => {
                        clearTimeout(timer); pendingToken = null;
                        if (!google.accounts.oauth2.hasGrantedAllScopes(r, DRIVE_SCOPE)) return reject({ type: 'scope' });
                        drive.token = r.access_token;
                        drive.expiresAt = Date.now() + ((r.expires_in || 3600) - 120) * 1000;
                        drive.needAuth = false;
                        try { localStorage.setItem(AUTH_FLAG_KEY, '1'); } catch (e) {}
                        resolve();
                    },
                    err: (e) => { clearTimeout(timer); pendingToken = null; reject(e || {}); }
                };
                drive.client.requestAccessToken({ prompt });
            });
        }

        async function ensureToken() {
            if (drive.token && Date.now() < drive.expiresAt) return;
            try { await requestToken('none'); }
            catch (e) {
                drive.needAuth = true; updateBadge();
                const err = new Error('auth'); err.code = 'auth'; throw err;
            }
        }

        async function gfetch(url, opts = {}, retried = false) {
            await ensureToken();
            const res = await fetch(url, Object.assign({}, opts, {
                headers: Object.assign({}, opts.headers || {}, { Authorization: 'Bearer ' + drive.token })
            }));
            if (res.status === 401 && !retried) { drive.token = null; return gfetch(url, opts, true); }
            /* 너무 자주 요청했거나(429 · 403 rateLimit) 구글이 잠깐 아플 때(5xx) : 1 · 2 · 4 · 8초 쉬고 다시 */
            const tries = opts._tries || 0;
            if (tries < 4 && !opts.keepalive && (res.status === 429 || res.status >= 500 || (res.status === 403 && /rate/i.test(await driveReason(res))))) {
                await new Promise(r => setTimeout(r, 1000 * 2 ** tries + Math.random() * 400));
                return gfetch(url, Object.assign({}, opts, { _tries: tries + 1 }), retried);
            }
            return res;
        }
        /* 구글이 알려 준 실패 이유 (storageQuotaExceeded · rateLimitExceeded …) */
        async function driveReason(res) {
            try { const j = await res.clone().json(); return (j && j.error && j.error.errors && j.error.errors[0] && j.error.errors[0].reason) || ''; } catch (e) { return ''; }
        }
        /* 실패 응답 → 에러 (404 = 'gone' : 그 사이 지워짐 · 공간 꽉 참 = 'full') */
        async function driveFail(res, what) {
            const er = new Error(what + ' ' + res.status);
            if (res.status === 404) er.code = 'gone';
            else if (res.status === 403 && /quota/i.test(await driveReason(res))) er.code = 'full';
            return er;
        }
        /* 드라이브 검색 글 안의 ' \ 는 앞에 \ 를 붙여요 */
        const qName = n => String(n).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

        /* ---------- 폴더 / 파일 이름 규칙 ----------
           말랑달콤 / 다이어리 / 페이지 / 2026년 / 9월 / 10일.json   (하루에 파일 1개, 같은 날은 항상 덮어쓰기) */
        const yearFolderName = y => `${y}년`;
        const monthFolderName = m => `${m}월`;
        const dayFileName = d => `${d}일.json`;
        function dayKeyOf(y, m, d) { return `diary_${y}_${String(m).padStart(2, '0')}_${String(d).padStart(2, '0')}`; }
        function parseDayKey(k) { const r = DAY_KEY_RE.exec(k); return r ? { y: +r[1], m: +r[2], d: +r[3] } : null; }
        function isDayKey(k) { return DAY_KEY_RE.test(k); }
        function isSettingKey(k) { return (k.startsWith('diary_') || VAULT_KEYS.includes(k)) && !isDayKey(k) && k !== PAGE_SIZE_KEY; }
        /* 설정 키가 드라이브의 어느 파일로 가는지 : 'cafe' · 'split' · 'settings' */
        function keyFile(k) { return CAFE_KEYS.includes(k) ? 'cafe' : 'settings'; }
        /* 설정 파일 2개 : 어디에 · 무슨 이름으로 · drive 의 어느 칸에 기억 */
        const KEY_FILES = {
            settings: { path: SETTINGS_PATH, name: SETTINGS_FILE_NAME, prop: 'settingsFile' },
            cafe: { path: CAFE_PATH, name: CAFE_FILE_NAME, prop: 'cafeFile' }
        };

        /* 🔐 암호 보관 : 출석 · 화분 기록은 설정.json 에서 무엇인지 알아볼 수 없게 저장해요
           - 이름도 뜻 없는 글자 (VAULT_KEYS) · 내용은 뒤섞은 글자 + 앞 7자리 확인 표시
           - 누가 글자를 하나라도 고치면 확인 표시가 맞지 않아서 그 기록은 버리고 처음부터 (고칠 이유가 없게) */
        const VAULT_KEYS = ['zq7k2m', 'xr4p9w'];
        const CAFE_KEYS = VAULT_KEYS.concat(['diary_cycle', 'diary_dday', 'diary_psy', 'diary_arcade_best', 'diary_luck_seed']);   // ☕ 카페.json 으로 가는 키
        const VAULT_SALT = 'mL4q!z9Rw2';
        function vaultHash(t) { let h = 2166136261; for (let i = 0; i < t.length; i++) { h ^= t.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36).padStart(7, '0').slice(-7); }
        function vaultMix(bytes) {
            let s = parseInt(vaultHash(VAULT_SALT), 36) || 1;
            return bytes.map(b => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return b ^ (s & 255); });
        }
        function vaultSeal(obj) {
            const bytes = vaultMix(Array.from(new TextEncoder().encode(JSON.stringify(obj))));
            const b64 = btoa(String.fromCharCode.apply(null, bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
            return vaultHash(VAULT_SALT + b64) + b64;
        }
        function vaultOpen(text) {
            if (typeof text !== 'string' || text.length < 8) return null;
            const chk = text.slice(0, 7), b64 = text.slice(7);
            if (vaultHash(VAULT_SALT + b64) !== chk) return null;                     // 누가 고쳤어요 → 버리기
            try {
                const bin = atob(b64.replace(/-/g, '+').replace(/_/g, '/'));
                const bytes = vaultMix(Array.from(bin, c => c.charCodeAt(0)));
                return JSON.parse(new TextDecoder().decode(new Uint8Array(bytes)));
            } catch (e) { return null; }
        }
        /* 읽기 · 쓰기 (로그인 → 드라이브 설정 / 게스트 → 이 기기) */
        function vaultGet(key, sync) {
            try { const raw = sync ? store.getItem(key) : localStorage.getItem(key); return raw ? vaultOpen(JSON.parse(raw)) : null; } catch (e) { return null; }
        }
        function vaultPut(key, obj, sync) {
            const t = JSON.stringify(vaultSeal(obj));
            try { if (sync) store.setItem(key, t); else localStorage.setItem(key, t); } catch (e) {}
        }
        function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
        function dayPathText(date) {
            return `${DAY_PATH.join('/')}/${yearFolderName(date.getFullYear())}/${monthFolderName(date.getMonth() + 1)}/${dayFileName(date.getDate())}`;
        }
        function corruptError(what) { const er = new Error('corrupt'); er.type = 'corrupt'; er.what = what; return er; }

        /* ---------- 드라이브 기본 동작 ---------- */
        const DRIVE_PARENT_DEFAULT = USE_APP_DATA_FOLDER ? 'appDataFolder' : 'root';
        const DRIVE_SPACE = USE_APP_DATA_FOLDER ? '&spaces=appDataFolder' : '';

        async function driveList(query, fields) {
            let files = [], pageToken = '';
            do {
                const url = `${DRIVE_API}?q=${encodeURIComponent(query)}${DRIVE_SPACE}&orderBy=createdTime&pageSize=1000`
                    + `&fields=${encodeURIComponent('nextPageToken,files(' + fields + ')')}` + (pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : '');
                const res = await gfetch(url);
                if (!res.ok) throw await driveFail(res, 'list');
                const j = await res.json();
                files = files.concat(j.files || []);
                pageToken = j.nextPageToken || '';
            } while (pageToken);
            return files;
        }

        async function readFileText(id) {
            const res = await gfetch(`${DRIVE_API}/${id}?alt=media`);
            if (!res.ok) throw await driveFail(res, 'read');
            return await res.text();
        }
        /* 파일 정보만 (내용 X) : 휴지통에 있거나 없어졌으면 null */
        async function driveMeta(id) {
            const res = await gfetch(`${DRIVE_API}/${id}?fields=id,name,modifiedTime,trashed,size`);
            if (res.status === 404) return null;
            if (!res.ok) throw await driveFail(res, 'meta');
            const f = await res.json();
            return f.trashed ? null : f;
        }
        /* 폴더 안에서 이름으로 파일 찾기 (같은 이름이 여럿이면 먼저 만든 것) */
        async function findFile(folderId, name) {
            const fs = await driveList(`name='${qName(name)}' and '${folderId}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,name,modifiedTime,size');
            return fs[0] || null;
        }

        /* 빈 파일이면 null, 읽을 수 없는 내용이면 corrupt 에러(→ 절대 덮어쓰지 않음) */
        function parseJsonObject(text, what) {
            if (!text.trim()) return null;
            let obj;
            try { obj = JSON.parse(text); } catch (e) { throw corruptError(what); }
            if (!obj || typeof obj !== 'object') throw corruptError(what);
            return obj;
        }

        async function findFolder(name, parentId) {
            const files = await driveList(`name='${qName(name)}' and mimeType='${FOLDER_MIME}' and '${parentId || DRIVE_PARENT_DEFAULT}' in parents and trashed=false`, 'id,name');
            if (files.length > 1) mergeFolders(files[0].id, files.slice(1).map(f => f.id));   // 두 기기가 동시에 만든 같은 폴더 → 먼저 만든 쪽으로 합치기 (기다리지 않음)
            return files[0] ? files[0].id : null;
        }
        /* 같은 이름 폴더 합치기 : 나중 폴더 안의 것을 모두 먼저 폴더로 옮기고, 빈 폴더는 휴지통으로
           (옮긴 것 중 또 같은 이름 폴더가 생기면 그 폴더를 열 때 다시 합쳐져요) */
        const folderMerging = new Set();
        async function mergeFolders(keepId, otherIds) {
            for (const id of otherIds) {
                if (folderMerging.has(id)) continue;
                folderMerging.add(id);
                try {
                    const kids = await driveList(`'${id}' in parents and trashed=false`, 'id');
                    for (const k of kids) {
                        const res = await gfetch(`${DRIVE_API}/${k.id}?addParents=${keepId}&removeParents=${id}&fields=id`, {
                            method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: '{}'
                        });
                        if (!res.ok) throw await driveFail(res, 'move');
                    }
                    await driveTrash(id);
                    drive.monthIndex.clear();                               // 옮겨진 일기가 다시 보이도록
                } catch (e) { console.warn('같은 이름 폴더를 합치지 못했어요:', e); }
                finally { folderMerging.delete(id); }
            }
        }

        async function createFolder(name, parentId) {
            const res = await gfetch(`${DRIVE_API}?fields=id`, {
                method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId || DRIVE_PARENT_DEFAULT] })
            });
            if (!res.ok) throw await driveFail(res, 'mkdir');
            return (await res.json()).id;
        }

        /* names = ['말랑달콤','설정'] / ['말랑달콤','다이어리','페이지','2026년','9월'] …
           create=false : 있으면 찾기만 (읽을 때) / create=true : 없으면 만들기 (저장할 때) */
        async function getFolder(names, create) {
            const key = names.join('/');
            if (drive.folderIds.has(key)) return drive.folderIds.get(key);
            const busyKey = key + '|' + (create ? 1 : 0);
            if (drive.folderBusy.has(busyKey)) return drive.folderBusy.get(busyKey);
            const p = (async () => {
                let parentId = null;
                if (names.length > 1) {
                    parentId = await getFolder(names.slice(0, -1), create);
                    if (!parentId) return null;
                }
                const name = names[names.length - 1];
                let id = await findFolder(name, parentId);
                if (!id && create) {
                    id = await createFolder(name, parentId);
                    const again = await findFolder(name, parentId);                // 그 사이 다른 기기도 만들었으면 먼저 만든 쪽을 써요
                    if (again) id = again;
                }
                if (id) drive.folderIds.set(key, id);
                return id || null;
            })();
            drive.folderBusy.set(busyKey, p);
            try { return await p; } finally { drive.folderBusy.delete(busyKey); }
        }

        /* 한 달 폴더 안의 파일 목록을 한 번만 가져와 기억 → 같은 달의 날짜들은 목록 조회 없이 바로 읽음 */
        async function getMonthIndex(y, m, create) {
            const key = `${y}/${m}`;
            let entry = drive.monthIndex.get(key);
            if (entry) return entry;
            if (drive.monthBusy.has(key)) {
                entry = await drive.monthBusy.get(key);
                if (entry || !create) return entry;
            }
            const p = (async () => {
                const folderId = await getFolder([...DAY_PATH, yearFolderName(y), monthFolderName(m)], create);
                if (!folderId) return null;
                const files = await driveList(`'${folderId}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,name,modifiedTime,size');
                const e = { folderId, files: new Map() };
                files.forEach(f => { if (!e.files.has(f.name)) e.files.set(f.name, f); });   // 같은 이름이 여러 개면 가장 오래된 1개만 사용
                drive.monthIndex.set(key, e);
                return e;
            })();
            drive.monthBusy.set(key, p);
            try { return await p; } finally { drive.monthBusy.delete(key); }
        }

        function resetDriveCaches() {
            drive.folderIds.clear(); drive.folderBusy.clear();
            drive.monthIndex.clear(); drive.monthBusy.clear();
            drive.settingsFile = null; drive.cafeFile = null;
        }

        /* ---------- 읽기 : 설정 / 하루치 ---------- */
        /* 설정.json · 카페.json : 내용(없으면 null) · 파일 정보는 drive.settingsFile / cafeFile 에 */
        async function fetchKeyFile(which) {
            const F = KEY_FILES[which];
            drive[F.prop] = null;
            const dir = await getFolder(F.path, false);
            const f = dir && await findFile(dir, F.name);
            if (!f) return null;
            drive[F.prop] = f;
            return parseJsonObject(await readFileText(f.id), which);
        }

        async function fetchDay(date, meta) {
            const idx = await getMonthIndex(date.getFullYear(), date.getMonth() + 1, false);
            const f = idx && idx.files.get(dayFileName(date.getDate()));
            if (meta) meta.t = f ? f.modifiedTime || '' : '';
            if (!f) return null;                                   // 그날 쓴 일기가 없음
            const obj = parseJsonObject(await readFileText(f.id), getDateKey(date));
            return obj ? JSON.stringify(obj) : null;
        }

        /* 하루치를 메모리로 읽어 오기 (이미 읽었으면 바로 끝, 읽는 중이면 그 요청을 같이 기다림) */
        function ensureDayLoaded(date) {
            const key = getDateKey(date);
            if (drive.guest || drive.loadedDays.has(key)) return Promise.resolve(true);
            if (drive.dayLoads.has(key)) return drive.dayLoads.get(key);
            const gen = drive.gen;
            const p = (async () => {
                try {
                    const meta = {}, text = await fetchDay(date, meta);
                    if (gen !== drive.gen) return false;
                    if (!drive.dirtyKeys.has(key)) store.putLoaded(key, text);   // 고치는 중인 내용이 있으면 덮어쓰지 않음
                    if (!drive.dayMeta.has(key)) drive.dayMeta.set(key, meta.t);
                    drive.loadedDays.add(key);
                    return true;
                } catch (e) {
                    console.warn('일기 불러오기 실패:', key, e);
                    return false;
                } finally {
                    if (drive.dayLoads.get(key) === p) drive.dayLoads.delete(key);
                }
            })();
            drive.dayLoads.set(key, p);
            return p;
        }

        function prefetchDays(dates) {
            if (!drive.ready || drive.guest) return Promise.resolve([]);
            return Promise.all(dates.map(ensureDayLoaded));
        }
        /* 다이어리를 처음 열 때: 오늘 + 어제 + 내일 (3개) */
        function prefetchInitial() { return prefetchDays([currentDate, addDays(currentDate, -1), addDays(currentDate, 1)]); }
        /* 페이지를 한 장 넘긴 뒤: 넘긴 방향의 다음 하루치만 (1개) */
        function prefetchAfterTurn(dir) { return prefetchDays([addDays(currentDate, dir)]); }

        async function loadFromDrive() {
            resetDriveCaches();
            const [settings, cafe] = await Promise.all([fetchKeyFile('settings'), fetchKeyFile('cafe')]);   // 읽지 못하면 여기서 에러 → 아무것도 바꾸지 않음
            clearTimeout(uploadTimer);
            drive.gen++;
            store.clear();
            drive.dirtyKeys.clear(); drive.loadedDays.clear(); drive.dayLoads.clear(); drive.dayMeta.clear();
            if (settings) Object.keys(settings).forEach(k => { if (isSettingKey(k) && keyFile(k) === 'settings') store.putLoaded(k, JSON.stringify(settings[k])); });
            drive.cafeBase = new Map();
            if (cafe) Object.keys(cafe).forEach(k => { if (keyFile(k) === 'cafe') { store.putLoaded(k, JSON.stringify(cafe[k])); drive.cafeBase.set(k, JSON.stringify(cafe[k])); } });
            if (typeof collLogin === 'function') await collLogin();          // 🎨 지금 쓰는 내 페이지 · 배경지 원본 (js/coll.js)
            drive.ready = true; drive.guest = false;
            drive.needAuth = false; drive.error = false; drive.full = false;
            lastRemoteCheck = Date.now();
            applyLoadedData();
            updateBadge();
            prefetchInitial();                             // 기다리지 않고 백그라운드로 3일치 미리 읽기
        }

        /* ---------- 쓰기 : 하루 1파일 덮어쓰기 ---------- */
        /* 화면이 꺼지는 중에도 요청이 끝까지 전송되도록 keepalive 사용 (본문이 64KB 이하일 때만 가능) */
        function keepaliveFor(body) {
            try { return new Blob([body]).size <= KEEPALIVE_MAX_BYTES ? { keepalive: true } : {}; }
            catch (e) { return {}; }
        }

        /* fileId가 있으면 그 파일을 덮어쓰고, 없으면 folderId 안에 새로 만듭니다 */
        async function driveUpsert(folderId, name, fileId, body) {
            if (fileId) {
                const res = await gfetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media&fields=id,modifiedTime`, Object.assign({
                    method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body
                }, keepaliveFor(body)));
                if (res.ok) return await res.json();
                throw await driveFail(res, 'update');                           // 404 'gone' : 그 사이 지워짐 → 캐시를 비우고 다시 시도
            }
            /* 새 파일을 만들기 전에 폴더가 살아 있는지 드라이브에 직접 확인 : 휴지통에 들어간 폴더에 만들면 일기가 안 보이게 돼요
               → 폴더가 없거나 휴지통이면 기억해 둔 폴더를 모두 잊고 'gone' (부른 쪽이 폴더를 다시 찾아서 다시 저장해요) */
            if (!(await driveMeta(folderId))) {
                resetDriveCaches();
                const er = new Error('folder gone'); er.code = 'gone'; throw er;
            }
            const b = 'diary_boundary_' + Math.random().toString(36).slice(2);
            const meta = { name, mimeType: 'application/json', parents: [folderId] };
            const multipart =
                `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
                `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${body}\r\n--${b}--`;
            const res = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime', Object.assign({
                method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: multipart
            }, keepaliveFor(multipart)));
            if (!res.ok) throw await driveFail(res, 'create');                 // 404 'gone' : 폴더가 지워짐
            return await res.json();
        }

        async function driveTrash(fileId) {
            const res = await gfetch(`${DRIVE_API}/${fileId}?fields=id`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify({ trashed: true })
            });
            if (!res.ok && res.status !== 404) throw await driveFail(res, 'trash');
        }

        /* 설정 값은 모두 JSON 글자 · 잘못된 값이 하나 섞여도 설정.json 전체가 깨지지 않게 그 값만 빼고 저장 */
        function settingsBody(file) {
            return '{' + store.keys().filter(k => isSettingKey(k) && keyFile(k) === (file || 'settings')).map(k => {
                const v = store.getItem(k);
                try { JSON.parse(v); } catch (e) { console.warn('설정 값이 JSON 이 아니라서 저장하지 않았어요:', k); return ''; }
                return JSON.stringify(k) + ':' + v;
            }).filter(Boolean).join(',') + '}';
        }

        /* 다른 기기가 고친 설정 파일 내용을 지금 메모리에 합치기
           mine : 이 기기에서 고쳤는데 아직 못 올린 키 → 그건 내 것 그대로 · 나머지는 드라이브 것으로 */
        async function mergeKeyFile(which, cur, mine) {
            const obj = parseJsonObject(await readFileText(cur.id), which) || {};
            const keep = k => mine.has(k) || drive.dirtyKeys.has(k);
            let changed = false;
            Object.keys(obj).forEach(k => {
                if (!isSettingKey(k) || keyFile(k) !== which) return;
                const v = JSON.stringify(obj[k]);
                if (keep(k)) {                                                  // 이 기기에서도 고친 값
                    if (which === 'cafe' && v !== drive.cafeBase.get(k)) {       // ☕ 다른 기기도 고쳤어요 → 한쪽만 남기지 않고 합쳐요
                        const mv = store.getItem(k), merged = cafeMerge(k, drive.cafeBase.get(k), mv, v);
                        if (merged !== mv) { store.putLoaded(k, merged); changed = true; }
                    }
                    return;
                }
                if (store.getItem(k) !== v) { store.putLoaded(k, v); changed = true; }
            });
            store.keys().forEach(k => {
                if (isSettingKey(k) && keyFile(k) === which && !(k in obj) && !keep(k)) { store.putLoaded(k, null); changed = true; }   // 다른 기기에서 지운 값
            });
            drive[KEY_FILES[which].prop] = cur;
            if (which === 'cafe') { drive.cafeBase = new Map(); Object.keys(obj).forEach(k => { if (keyFile(k) === 'cafe') drive.cafeBase.set(k, JSON.stringify(obj[k])); }); }
            if (changed) { applyRemoteSettings(); if (which === 'cafe') cafeShownAgain(); }
        }
        /* ☕ 열려 있는 카페 창이 옛 기록을 들고 있지 않게 : 합친 기록으로 다시 읽어서 다시 그려요
           (창을 연 채로 고치면 창이 들고 있던 옛 기록이 그대로 저장되어, 다른 기기가 더한 것이 빠질 수 있어서) */
        function cafeShownAgain() {
            const open = id => { const e = document.getElementById(id); return !!e && e.classList.contains('show'); };
            try { if (typeof atRead === 'function' && open('attendRoom')) { atS.d = atRead(); atRender(); } } catch (e) { console.warn(e); }
            try { if (typeof cyRead === 'function' && open('cycleRoom')) { cy.d = cyRead(); cyRender(); } } catch (e) { console.warn(e); }
            try { if (typeof arReadBest === 'function' && open('arcadeRoom')) ar.best = arReadBest(); } catch (e) { console.warn(e); }
        }

        /* ☕ 카페 기록 합치기 : 두 기기가 같은 항목을 고쳤을 때 한쪽 기록이 사라지지 않게
           base = 마지막으로 드라이브에서 읽거나 올린 값 · mine = 이 기기 · theirs = 지금 드라이브 (모두 JSON 글자)
           - 출석 도장 : 양쪽 도장을 모두 (도장은 지우는 기능이 없어요)
           - 오락실 최고 점수 : 게임마다 더 높은 점수
           - 생리 달력 · 심리테스트 결과 : 날짜(테스트)마다 바뀐 쪽 · 둘 다 바꿨으면 이 기기 것
           - D-day : 양쪽에서 더한 것은 모두 · 한쪽에서 지운 것은 지워요
           - 행운 번호 : 드라이브에 있는 번호 (기기마다 다르면 안 돼요)
           - 그 밖 : 한쪽만 바꿨으면 바꾼 쪽 · 둘 다 바꿨으면 이 기기 것 (예전과 같음)
           읽을 수 없는 값이 섞여 있으면 이 기기 것을 그대로 둬요 */
        function cafeMerge(k, base, mine, theirs) {
            if (mine === theirs || theirs == null) return mine;
            if (mine == null) return theirs;
            const P = t => { if (t == null) return undefined; try { return JSON.parse(t); } catch (e) { return null; } };
            const obj = x => x && typeof x === 'object' && !Array.isArray(x);
            const pick = () => (mine === base ? theirs : mine);
            const each3 = (b, m, t, both) => {                                 // 칸마다 : 한쪽만 바뀌었으면 바뀐 쪽
                const out = {};
                new Set([...Object.keys(b || {}), ...Object.keys(m), ...Object.keys(t)]).forEach(n => {
                    const bv = b && n in b ? JSON.stringify(b[n]) : undefined, mv = n in m ? JSON.stringify(m[n]) : undefined, tv = n in t ? JSON.stringify(t[n]) : undefined;
                    const r = mv === tv ? mv : mv === bv ? tv : tv === bv ? mv : both(m[n], t[n], mv);
                    if (r !== undefined) out[n] = JSON.parse(r);
                });
                return out;
            };
            try {
                if (k === VAULT_KEYS[0]) {                                     // 🔐 출석 도장 { "2026-10": [1, 2, 5] }
                    const m = vaultOpen(P(mine)), t = vaultOpen(P(theirs));
                    if (!obj(m) || !obj(t)) return mine;
                    const out = {};
                    new Set([...Object.keys(m), ...Object.keys(t)]).forEach(ym => {
                        const days = new Set([...(Array.isArray(m[ym]) ? m[ym] : []), ...(Array.isArray(t[ym]) ? t[ym] : [])].filter(d => Number.isInteger(d)));
                        if (days.size) out[ym] = [...days].sort((a, b) => a - b);
                    });
                    return JSON.stringify(vaultSeal(out));
                }
                if (k === 'diary_arcade_best') {
                    const m = P(mine), t = P(theirs);
                    if (!obj(m) || !obj(t)) return mine;
                    const out = Object.assign({}, t);
                    Object.keys(m).forEach(g => { const a = +m[g] || 0, b = +t[g] || 0; out[g] = Math.max(a, b); });
                    return JSON.stringify(out);
                }
                if (k === 'diary_luck_seed') return P(theirs) ? theirs : mine;
                if (k === 'diary_psy') {
                    const m = P(mine), t = P(theirs), b = P(base);
                    if (!obj(m) || !obj(t)) return mine;
                    return JSON.stringify(each3(obj(b) ? b : {}, m, t, (x, y, mv) => mv));
                }
                if (k === 'diary_cycle') {
                    const m = P(mine), t = P(theirs), b = P(base);
                    if (!obj(m) || !obj(m.d) || !obj(t) || !obj(t.d)) return mine;
                    return JSON.stringify(Object.assign({}, m, { d: each3(obj(b) && obj(b.d) ? b.d : {}, m.d, t.d, (x, y, mv) => mv) }));
                }
                if (k === 'diary_dday') {
                    const m = P(mine), t = P(theirs), b = P(base);
                    if (!Array.isArray(m) || !Array.isArray(t)) return mine;
                    const S = a => a.map(x => JSON.stringify(x));
                    const bs = new Set(Array.isArray(b) ? S(b) : []), ms = new Set(S(m)), ts = S(t);
                    const out = ts.filter(x => !(bs.has(x) && !ms.has(x)));            // 드라이브 것 중 이 기기에서 지운 것은 빼고
                    S(m).forEach(x => { if (!bs.has(x) && !out.includes(x)) out.push(x); });   // 이 기기에서 더한 것
                    return '[' + out.join(',') + ']';
                }
            } catch (e) { console.warn('카페 기록을 합치지 못해서 이 기기 것으로 둬요:', k, e); return mine; }
            return pick();
        }
        /* 다른 기기 설정이 들어왔을 때 화면에 바로 보이는 것만 다시 (글꼴 · 페이지 · 보이는 것 · D-day) */
        async function applyRemoteSettings() {
            try {
                if (typeof pgPrepare === 'function') await pgPrepare();        // 고른 페이지 · 배경지가 바뀌었으면 그 원본부터 (js/settings.js · js/pattern-maker.js)
                if (typeof patPrepare === 'function') await patPrepare();
                loadCustomSkins();                                              // 페이지 · 배경지 다시 적용
                loadUIFont();
                if (typeof showApply === 'function') showApply();
                if (typeof ddRefresh === 'function') ddRefresh();
            } catch (e) { console.warn(e); }
        }

        /* 설정.json · 카페.json 올리기 : 덮어쓰기 전에 드라이브 파일이 바뀌었는지 보고, 바뀌었으면 합친 뒤에 */
        async function writeKeyFile(which, mine) {
            const F = KEY_FILES[which];
            const dir = await getFolder(F.path, true);
            const known = drive[F.prop];
            let cur = known ? await driveMeta(known.id) : null;
            if (!cur) cur = await findFile(dir, F.name);                              // 처음이거나 지워졌으면 이름으로 한 번 더 찾기
            if (cur && (!known || cur.id !== known.id || cur.modifiedTime !== known.modifiedTime)) await mergeKeyFile(which, cur, mine);
            const body = settingsBody(which);
            const saved = await driveUpsert(dir, F.name, cur && cur.id, body);
            drive[F.prop] = { id: saved.id, name: F.name, modifiedTime: saved.modifiedTime };
            if (which === 'cafe') { const o = JSON.parse(body); drive.cafeBase = new Map(Object.keys(o).map(k => [k, JSON.stringify(o[k])])); }
        }

        /* 일기 하루 올리기 : 다른 기기가 그 사이 같은 날을 고쳤으면 물어봐요 */
        async function writeDay(key, dk) {
            const val = store.getItem(key);
            const name = dayFileName(dk.d);
            const idx = await getMonthIndex(dk.y, dk.m, val !== null);              // 올릴 때만 년도·달 폴더를 만들어요
            if (!idx) return;                                                       // 지울 날인데 폴더도 없음
            const f = idx.files.get(name);
            let cur = f ? await driveMeta(f.id) : null;
            if (!cur) cur = await findFile(idx.folderId, name);
            const base = drive.dayMeta.has(key) ? drive.dayMeta.get(key) : (f ? f.modifiedTime || '' : '');
            if (cur && cur.modifiedTime !== base) {                                 // 다른 기기가 고쳤어요
                let theirs = null;
                try { theirs = JSON.stringify(parseJsonObject(await readFileText(cur.id), key)); } catch (e) { if (e.type !== 'corrupt') throw e; }
                if (theirs !== val && theirs !== null && theirs !== 'null') {
                    const mineWins = await showAsk(`📱 다른 기기에서 <b>${dk.m}월 ${dk.d}일</b> 일기를 고쳤어요.<br>어느 쪽을 남길까요?<br><span style="font-size:12px;color:#777;">고르지 않은 쪽은 사라져요.</span>`, '📝 내 것 저장', '📱 다른 기기 것');
                    if (!mineWins) {
                        idx.files.set(name, cur); drive.dayMeta.set(key, cur.modifiedTime);
                        if (!drive.dirtyKeys.has(key)) { store.putLoaded(key, theirs); dayShownAgain(key); }
                        return;
                    }
                }
            }
            if (val === null) {                                                     // 내용을 모두 지운 날 → 파일은 휴지통으로
                if (cur) await driveTrash(cur.id);
                idx.files.delete(name); drive.dayMeta.set(key, '');
                return;
            }
            const saved = await driveUpsert(idx.folderId, name, cur && cur.id, val);    // 있으면 덮어쓰기, 없으면 새 파일
            idx.files.set(name, { id: saved.id, name, modifiedTime: saved.modifiedTime });
            drive.dayMeta.set(key, saved.modifiedTime);
        }
        /* 그날이 지금 펼쳐 둔 페이지면 다시 그리기 · 검색 목록도 */
        function dayShownAgain(key) {
            try {
                if (typeof isCoverOpen !== 'undefined' && isCoverOpen && !turn && getDateKey(currentDate) === key) loadData();
                if (typeof searchTouch === 'function') searchTouch(key);
            } catch (e) { console.warn(e); }
        }

        /* 변경된 키 하나(또는 같은 설정 파일의 키 묶음)를 드라이브에 반영 */
        async function driveWriteKey(key, retried, mine) {
            try {
                const dk = parseDayKey(key);
                if (dk) await writeDay(key, dk);
                else await writeKeyFile(keyFile(key), mine || new Set([key]));
            } catch (e) {
                if (e && e.code === 'gone' && !retried) { resetDriveCaches(); return driveWriteKey(key, true, mine); }
                throw e;
            }
        }

        /* 업로드는 한 번에 하나씩(순서대로) 처리 → 같은 날짜 파일이 두 개 생기는 문제 방지 */
        function flushUpload(opts) {
            const force = !!(opts && opts.force);
            clearTimeout(uploadTimer);
            uploadChain = uploadChain.then(async () => {
                if (!drive.ready || drive.guest) return false;
                if (force && isCoverOpen) {                                 // 💾 저장 버튼: 지금 보고 있는 날짜 파일을 한 번 더 덮어씀
                    const k = getDateKey(currentDate);
                    if (drive.loadedDays.has(k) && store.getItem(k) !== null) drive.dirtyKeys.add(k);
                }
                if (!drive.dirty) return true;
                drive.uploading = true; updateBadge();
                let allOk = true, authFail = false, full = false;
                const sent = [];
                const done = new Set();
                for (const key of Array.from(drive.dirtyKeys)) {
                    if (done.has(key) || !drive.dirtyKeys.has(key)) continue;
                    /* 설정 키는 같은 파일 것을 한 번에 (파일 하나를 여러 번 올리지 않게) */
                    const group = isDayKey(key) ? [key] : Array.from(drive.dirtyKeys).filter(k => !isDayKey(k) && keyFile(k) === keyFile(key));
                    group.forEach(k => { drive.dirtyKeys.delete(k); done.add(k); });   // 올리는 도중 또 바뀌면 다시 표시됨
                    drive.inflight = key;
                    try { await driveWriteKey(key, false, new Set(group)); sent.push(isDayKey(key) ? key : keyFile(key)); }
                    catch (e) {
                        group.forEach(k => drive.dirtyKeys.add(k)); allOk = false;
                        if (e && e.code === 'auth') { authFail = true; break; }
                        if (e && e.code === 'full') { full = true; break; }
                        console.warn('드라이브에 올리지 못했어요:', key, e);
                    }
                }
                drive.inflight = null; drive.uploading = false; drive.error = !allOk;
                if (full && !drive.full) {                                  // 💾 공간이 꽉 참 : 이 기기에 보관하고 알려요
                    drive.full = true; savePending();
                    showMsg('☁ 구글 드라이브 저장공간이 <b>가득 찼어요.</b><br>고친 내용은 이 기기에 보관해 둘게요.<br><span style="font-size:12px;color:#777;">지메일 · 구글 포토 등에서 필요 없는 파일을 지우면 자동으로 다시 저장해요.</span>');
                }
                if (allOk) {
                    drive.lastSaved = new Date(); drive.full = false;
                    if (!drive.dirty) clearPending();                       // 그 사이 새 변경이 없을 때만 임시 보관본 삭제
                } else if (!authFail) {
                    if (full) savePending();
                    uploadTimer = setTimeout(() => flushUpload(), full ? 5 * 60000 : 30000);
                }
                if (sent.length) driveTell({ t: 'saved', keys: sent });   // 같은 기기의 다른 탭에도 알려요
                updateBadge(); updateStorageInfo();
                return allOk;
            });
            return uploadChain;
        }

        /* ---------- 전체 목록 (백업 / 용량 확인용) ---------- */
        async function driveEnumerateAll() {
            const rootId = await getFolder(DAY_PATH, false);
            const out = new Map();
            if (!rootId) return [];
            const years = (await driveList(`'${rootId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`, 'id,name'))
                .map(f => ({ f, r: /^(\d{4})년$/.exec(f.name) })).filter(x => x.r);
            const monthGroups = await Promise.all(years.map(async yx => {
                const ms = await driveList(`'${yx.f.id}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`, 'id,name');
                return ms.map(f => ({ f, y: +yx.r[1], r: /^(\d{1,2})월$/.exec(f.name) })).filter(x => x.r);
            }));
            await Promise.all([].concat(...monthGroups).map(async mx => {
                const files = await driveList(`'${mx.f.id}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,name,size');
                files.forEach(f => {
                    const r = /^(\d{1,2})일\.json$/.exec(f.name);
                    if (!r) return;
                    const key = dayKeyOf(mx.y, +mx.r[1], +r[1]);
                    if (!out.has(key)) out.set(key, { key, id: f.id, size: +f.size || 0 });
                });
            }));
            return Array.from(out.values());
        }

        /* 아직 읽지 않은 모든 날짜를 메모리로 읽기 (전체 백업용). 읽지 못한 파일 수를 돌려줌 */
        async function loadAllDays() {
            const all = await driveEnumerateAll();
            const todo = all.filter(f => !drive.loadedDays.has(f.key));
            const gen = drive.gen;
            let i = 0, failed = 0;
            await Promise.all(Array.from({ length: 5 }, async () => {
                while (i < todo.length) {
                    const f = todo[i++];
                    try {
                        const obj = parseJsonObject(await readFileText(f.id), f.key);
                        if (gen !== drive.gen) return;
                        if (!drive.dirtyKeys.has(f.key)) store.putLoaded(f.key, obj ? JSON.stringify(obj) : null);
                        drive.loadedDays.add(f.key);
                    } catch (e) { failed++; }
                }
            }));
            return failed;
        }

        async function postLoginTasks() {
            await recoverPendingBackup();
        }

        /* 드라이브에서 불러온 데이터를 화면에 반영 */
        function applyLoadedData() {
            loadCustomSkins();
            loadUIFont();
            if (isCoverOpen) loadData();
            updateStorageInfo();
            if (typeof lockAfterLoad === 'function') lockAfterLoad();       // 🔒 다이어리 잠금 (js/lock.js)
            if (typeof showApply === 'function') showApply();               // 👀 페이지에 보이는 것 (js/show.js)
            if (typeof ddRefresh === 'function') ddRefresh();               // ⏳ D-day (js/dday.js)
        }

        /* ---------- 화면(UI) ---------- */
        function showGate(state, msg) {
            document.getElementById('driveGate').style.display = 'flex';
            document.getElementById('gateMsg').innerHTML = msg;
            const login = state === 'login';
            document.getElementById('gateLoginBtn').style.display = login ? 'flex' : 'none';
            document.getElementById('gateGuestBtn').style.display = login ? 'block' : 'none';
        }
        function hideGate() { document.getElementById('driveGate').style.display = 'none'; }

        /* ☁ 저장 알림 : 평소엔 숨김 · 저장 기록(글)이 바뀔 때만 부드럽게 나왔다가 사라짐
           (로그인 만료 · 저장 실패처럼 눌러야 하는 경고는 해결될 때까지 떠 있음) */
        let badgeLast = null, badgeTimer = null;
        function updateBadge() {
            const el = document.getElementById('driveBadge');
            if (!el) return;
            let text = '', warn = false, stay = false;
            if (drive.guest) { text = '☁ 저장 안 됨 · 눌러서 로그인'; warn = true; }
            else if (!drive.ready) { return; }
            else if (drive.needAuth) { text = '⚠ 로그인이 만료됐어요 · 눌러서 다시 연결'; warn = true; stay = true; }
            else if (drive.full) { text = '⚠ 드라이브 공간이 꽉 찼어요 · 이 기기에 보관 중'; warn = true; stay = true; }
            else if (drive.uploading) text = '☁ 드라이브에 저장 중…';
            else if (drive.error) { text = '⚠ 저장 실패 · 눌러서 다시 시도'; warn = true; stay = true; }
            else if (drive.dirty) text = '☁ 저장 대기 중…';
            else if (drive.lastSaved) text = '☁ 드라이브에 저장됨 ' + drive.lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            else text = '☁ 드라이브 연결됨';
            if (text === badgeLast) return;                       // 바뀐 게 없으면 가만히
            badgeLast = text;
            el.textContent = text;
            el.classList.toggle('warn', warn);
            el.classList.add('show');
            clearTimeout(badgeTimer);
            if (!stay) badgeTimer = setTimeout(() => el.classList.remove('show'), warn ? 4000 : 2600);
        }

        async function onBadgeClick() {
            if (drive.guest) {
                const yes = await showMsg('로그인하면 지금 화면의 임시 내용은<br>드라이브에 저장된 내용으로 대체돼요.<br>계속할까요?', true);
                if (yes) showGate('login', '☁ 구글 계정으로 로그인해 주세요.');
            } else if (drive.needAuth) {
                try { await requestToken('select_account'); await flushUpload({ force: true }); }
                catch (e) { showMsg('⚠ ' + driveErrorText(e)); }
            } else if (drive.error || drive.dirty) {
                flushUpload({ force: true });
            }
        }

        function driveErrorText(e) {
            const t = (e && (e.type || e.error || e.message)) || '';
            if (t === 'popup_closed') return '로그인 창이 닫혔어요. 다시 시도해 주세요.';
            if (t === 'popup_failed_to_open') return '팝업이 차단됐어요. 팝업을 허용한 뒤 다시 눌러 주세요.';
            if (t === 'scope') return '드라이브 파일 권한을 허용해야 일기를 저장할 수 있어요. 다시 시도해 주세요.';
            if (t === 'access_denied') return '권한이 거부됐어요. 다시 시도해 주세요.';
            if (t === 'timeout') return '응답이 없어요. 다시 시도해 주세요.';
            if (t === 'corrupt') return '저장된 파일을 읽을 수 없어요. 데이터 보호를 위해 덮어쓰지 않았어요. 드라이브의 말랑달콤 폴더를 확인해 주세요.';
            return '연결에 실패했어요. (' + t + ')';
        }

        /* ---------- 시작 / 로그인 / 로그아웃 ---------- */
        function waitForGoogle(ms) {
            return new Promise(resolve => {
                const t0 = Date.now();
                (function poll() {
                    if (window.google && google.accounts && google.accounts.oauth2) return resolve(true);
                    if (Date.now() - t0 > ms) return resolve(false);
                    setTimeout(poll, 100);
                })();
            });
        }

        async function initDrive() {
            if (GOOGLE_CLIENT_ID.startsWith('YOUR_CLIENT_ID')) {
                showGate('config', '⚙ 코드 맨 위의 <b>GOOGLE_CLIENT_ID</b>에<br>발급받은 OAuth 클라이언트 ID를 넣어 주세요.');
                return;
            }
            showGate('wait', '☁ 구글 드라이브에 연결하는 중…');
            const fileHint = location.protocol === 'file:'
                ? '<br><br><span style="font-size:12px;color:#c62828;">이 파일이 <b>file://</b>로 열려 있어요. 구글 로그인은 https 주소(GitHub Pages 등)나 localhost에서만 동작해요.</span>' : '';
            if (!(await waitForGoogle(10000))) {
                showGate('login', '구글 로그인 스크립트를 불러오지 못했어요.<br>인터넷 연결을 확인하고 새로고침해 주세요.' + fileHint);
                return;
            }
            drive.client = google.accounts.oauth2.initTokenClient({
                client_id: GOOGLE_CLIENT_ID,
                scope: DRIVE_SCOPE,
                callback: (r) => { if (pendingToken) (r && r.error) ? pendingToken.err(r) : pendingToken.ok(r); },
                error_callback: (e) => { if (pendingToken) pendingToken.err(e); }
            });
            /* 이전에 로그인한 적이 있으면 창 없이 자동 로그인 시도 */
            let authed = false;
            try { authed = localStorage.getItem(AUTH_FLAG_KEY) === '1'; } catch (e) {}
            if (authed) {
                try { await requestToken('none'); await loadFromDrive(); hideGate(); postLoginTasks(); return; }
                catch (e) { if (e && e.type === 'corrupt') { showGate('login', driveErrorText(e)); return; } }
            }
            showGate('login', '일기는 내 구글 드라이브의 <b>말랑달콤</b> 폴더에<br>하루에 파일 1개씩 저장돼요.' + fileHint);
        }

        async function driveLogin() {
            showGate('wait', '☁ 구글 로그인 창에서 계정을 선택해 주세요…');
            try { await requestToken('select_account'); await loadFromDrive(); hideGate(); postLoginTasks(); }
            catch (e) { showGate('login', driveErrorText(e)); }
        }

        function enterGuestMode() {
            drive.guest = true; drive.ready = false;
            if (typeof collGuestStart === 'function') collGuestStart();    // 게스트 모음은 이 기기에 (js/coll.js)
            hideGate(); updateBadge();
        }

        async function reloadFromDrive() {
            if (!drive.ready) { showMsg('먼저 구글 드라이브에 연결해 주세요.'); return; }
            const yes = await showMsg('드라이브에 저장된 내용으로 현재 내용을 바꿔서 다시 불러올까요?<br><span style="font-size:12px;color:#777;">아직 저장되지 않은 변경은 사라져요.</span>', true);
            if (!yes) return;
            try { await loadFromDrive(); clearPending(); showMsg('🔄 드라이브에서 다시 불러왔어요!'); }
            catch (e) { showMsg('⚠ ' + driveErrorText(e)); }
        }

        async function driveLogout() {
            const yes = await showMsg('로그아웃할까요?<br><span style="font-size:12px;color:#777;">드라이브의 말랑달콤 폴더는 그대로 남아 있어요.</span>', true);
            if (!yes) return;
            if (drive.ready && drive.dirty) await flushUpload();
            try { localStorage.removeItem(AUTH_FLAG_KEY); } catch (e) {}
            location.reload();
        }

        /* =====================================================================
           📴 화면이 꺼지는 순간(잠금 / 홈 버튼 / 앱·탭 전환 / 창 닫기) 자동 저장
           - 아이폰·안드로이드·아이패드 모두 화면이 꺼지면 페이지가 '숨김' 상태가 되어
             visibilitychange(hidden) / pagehide / freeze 이벤트가 발생합니다.
           - 그 즉시 ① 편집 중인 내용을 메모리에 반영하고 ② 날짜별 json 파일로 업로드를 시작합니다.
           - 화면이 꺼지면 브라우저가 앱을 곧바로 멈출 수 있어서, 업로드가 끝나기 전에 멈추는 경우를
             대비해 이 기기에 임시 보관본도 함께 남기고, 다음에 열 때 자동으로 복구를 물어봅니다.
           ===================================================================== */
        function savePending() {
            try {
                const items = {}, b = {}, bv = {};
                drive.dirtyKeys.forEach(k => { items[k] = store.getItem(k); });          // null = 내용을 지운 날
                if (drive.inflight && !(drive.inflight in items)) items[drive.inflight] = store.getItem(drive.inflight);
                Object.keys(items).forEach(k => {                                         // 그때 드라이브 파일의 수정 시각 (기기 시계가 아니라 구글 시각)
                    if (isDayKey(k)) { if (drive.dayMeta.has(k)) b[k] = drive.dayMeta.get(k); }
                    else if (isSettingKey(k)) {
                        const f = drive[KEY_FILES[keyFile(k)].prop]; b[k] = f && f.modifiedTime || '';
                        if (keyFile(k) === 'cafe' && drive.cafeBase.has(k)) bv[k] = drive.cafeBase.get(k);   // ☕ 합칠 때 기준
                    }
                });
                localStorage.setItem(PENDING_KEY, JSON.stringify({ savedAt: Date.now(), items, b, bv }));
            } catch (e) { /* 용량 초과 등: 임시 보관은 포기하고 업로드만 시도 */ }
        }
        function clearPending() { try { localStorage.removeItem(PENDING_KEY); } catch (e) {} }

        function saveOnScreenOff() {
            try { if (!turn) saveData(false); } catch (err) {}      // 편집 중인 글/스티커를 메모리(store)에 반영
            if (!drive.ready || drive.guest) return;                 // 로그인 전이거나 게스트면 저장할 곳이 없음
            if (drive.dirty || drive.uploading) {
                savePending();                                       // 업로드 전에 먼저 이 기기에 안전하게 보관
                if (drive.dirty) flushUpload();                      // 디바운스(3초) 기다리지 않고 즉시 업로드
            }
        }

        /* 다음에 열었을 때, 업로드되지 못한 임시 보관본(변경된 날짜만)이 있으면 복구
           - 기기 시계는 믿지 않아요 : 보관할 때 적어 둔 '그때 드라이브 파일의 수정 시각'과 지금 수정 시각을 비교해요
             · 같으면 그 사이 아무도 안 고친 것 → 한 번에 "복구할까요?"
             · 다르면 그 사이 다른 기기가 고친 것 → 일기는 날마다 "어느 쪽을 남길까요?" · 설정은 한 번에 물어요
             · ☕ 카페 기록은 묻지 않고 양쪽을 합쳐요 (cafeMerge)
           - 지금 드라이브 내용이 보관본과 같으면 (이미 올라감) 아무것도 안 해요 */
        async function recoverPendingBackup() {
            let p = null;
            try { const raw = localStorage.getItem(PENDING_KEY); p = raw ? JSON.parse(raw) : null; } catch (e) {}
            if (!p || !p.items || typeof p.items !== 'object') { clearPending(); return; }
            const B = p.b && typeof p.b === 'object' ? p.b : {}, BV = p.bv && typeof p.bv === 'object' ? p.bv : {};
            const safe = [], cafe = [], askDays = [], askSet = [];
            for (const k of Object.keys(p.items)) {
                const v = p.items[k];
                if (!k.startsWith('diary_') && !VAULT_KEYS.includes(k)) continue;
                if (!(v === null || typeof v === 'string')) continue;
                const dk = parseDayKey(k);
                let now;
                if (dk) {
                    await ensureDayLoaded(new Date(dk.y, dk.m - 1, dk.d));
                    if (!drive.loadedDays.has(k)) continue;                             // 드라이브 내용을 읽지 못하면 건드리지 않음
                    const idx = drive.monthIndex.get(`${dk.y}/${dk.m}`);
                    const f = idx && idx.files.get(dayFileName(dk.d));
                    now = f ? f.modifiedTime || '' : '';
                } else if (isSettingKey(k)) {
                    const sf = drive[KEY_FILES[keyFile(k)].prop];
                    now = sf && sf.modifiedTime || '';
                } else continue;
                if (store.getItem(k) === v) continue;                                   // 내용이 같음 (이미 올라갔어요)
                if (!dk && keyFile(k) === 'cafe') cafe.push(k);
                else if (k in B && B[k] === now) safe.push(k);                          // 그 사이 아무도 안 고쳤어요
                else (dk ? askDays : askSet).push(k);                                   // 그 사이 다른 기기가 고쳤어요
            }
            clearPending();
            if (!safe.length && !cafe.length && !askDays.length && !askSet.length) return;
            const put = k => { const v = p.items[k]; if (v === null) store.removeItem(k); else store.setItem(k, v); };
            let any = false;
            const when = new Date(p.savedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            try {
                if (safe.length || cafe.length) {
                    const yes = await showMsg('📴 ' + when + ' 화면이 꺼질 때의 변경 내용이<br>드라이브에 저장되지 못했어요. (' + (safe.length + cafe.length) + '건)<br>이 기기에 보관된 내용으로 복구할까요?<br><span style="font-size:12px;color:#777;">취소를 누르면 드라이브의 현재 내용을 유지해요.</span>', true);
                    if (yes) {
                        safe.forEach(put);
                        cafe.forEach(k => { const m = cafeMerge(k, BV[k], p.items[k], store.getItem(k)); if (m !== store.getItem(k)) store.setItem(k, m); });
                        any = true;
                    }
                }
                for (const k of askDays) {
                    const dk = parseDayKey(k);
                    const mine = await showAsk(`📴 ${when} 화면이 꺼질 때 고친 <b>${dk.m}월 ${dk.d}일</b> 일기가 저장되지 못했는데,<br>그 사이 📱 다른 기기에서 이 날을 고쳤어요.<br>어느 쪽을 남길까요?<br><span style="font-size:12px;color:#777;">고르지 않은 쪽은 사라져요.</span>`, '📝 이 기기 것', '📱 다른 기기 것');
                    if (mine) { put(k); any = true; }
                }
                if (askSet.length) {
                    const mine = await showAsk(`📴 ${when} 화면이 꺼질 때 바꾼 <b>설정 ${askSet.length}개</b>가 저장되지 못했는데,<br>그 사이 📱 다른 기기에서 설정을 바꿨어요.<br>어느 쪽을 남길까요?`, '📝 이 기기 것', '📱 다른 기기 것');
                    if (mine) { askSet.forEach(put); any = true; }
                }
                if (!any) return;
                applyLoadedData();
                await flushUpload({ force: true });
            } catch (e) { showMsg('⚠ 복구에 실패했어요.'); }
        }

        /* 로그인 토큰이 곧 만료되면 화면이 켜져 있을 때 미리 갱신 (꺼진 상태에서는 갱신이 안 될 수 있음) */
        async function refreshTokenIfNeeded() {
            if (!drive.ready || drive.guest || drive.uploading || document.hidden || !drive.client) return;
            if (drive.token && Date.now() < drive.expiresAt - 10 * 60 * 1000) return;
            try { await requestToken('none'); updateBadge(); } catch (e) {}
        }
        setInterval(refreshTokenIfNeeded, 5 * 60 * 1000);

        /* =====================================================================
           📱💻 두 기기 · 두 탭에서 같이 쓸 때
           - 앱으로 돌아올 때 · 켜 둔 동안 1분마다 : 설정 · 카페 파일과 펼쳐 둔 날(앞 · 뒤 포함 3일)이
             다른 기기에서 바뀌었는지 '마지막 수정 시각'만 보고, 바뀌었으면 그것만 다시 읽어요
           - 같은 기기의 다른 탭이 저장하면 BroadcastChannel 로 바로 알려 줘요
           ===================================================================== */
        let lastRemoteCheck = 0, remoteChecking = null;
        const driveBC = (() => { try { return 'BroadcastChannel' in window ? new BroadcastChannel('mallang-drive') : null; } catch (e) { return null; } })();
        function driveTell(msg) { try { if (driveBC) driveBC.postMessage(msg); } catch (e) {} }
        if (driveBC) driveBC.onmessage = (e) => {
            const m = e.data || {};
            if (m.t === 'saved') checkRemote(true);
            else if (m.t === 'coll' && typeof collRemote === 'function') collRemote(m.path);   // 스티커 · 페이지 목록 (js/coll.js)
        };
        function checkRemote(force) {
            if (!drive.ready || drive.guest || document.hidden || drive.needAuth) return Promise.resolve();
            if (!force && Date.now() - lastRemoteCheck < 50000) return Promise.resolve();
            if (remoteChecking) return remoteChecking;
            lastRemoteCheck = Date.now();
            remoteChecking = (async () => {
                const gen = drive.gen;
                try { if (!turn) saveData(false); } catch (e) {}           // 쓰던 글을 먼저 메모리에 (고친 것은 지키려고)
                for (const which of Object.keys(KEY_FILES)) {
                    const F = KEY_FILES[which], known = drive[F.prop];
                    if (Array.from(drive.dirtyKeys).some(k => !isDayKey(k) && keyFile(k) === which)) continue;   // 올릴 때 합쳐요
                    const dir = await getFolder(F.path, false);
                    const cur = dir && (known && await driveMeta(known.id) || await findFile(dir, F.name));
                    if (gen !== drive.gen) return;
                    if (cur && (!known || cur.modifiedTime !== known.modifiedTime)) await mergeKeyFile(which, cur, new Set());
                }
                const days = isCoverOpen ? [currentDate, addDays(currentDate, -1), addDays(currentDate, 1)] : [];
                const months = new Set(days.map(d => `${d.getFullYear()}/${d.getMonth() + 1}`));
                months.forEach(m => drive.monthIndex.delete(m));            // 달 폴더 목록을 새로 (수정 시각이 들어 있어요)
                let any = false;
                for (const d of days) {
                    const key = getDateKey(d);
                    if (!drive.loadedDays.has(key) || drive.dirtyKeys.has(key) || drive.inflight === key) continue;
                    const idx = await getMonthIndex(d.getFullYear(), d.getMonth() + 1, false);
                    const f = idx && idx.files.get(dayFileName(d.getDate()));
                    const t = f ? f.modifiedTime || '' : '';
                    if (gen !== drive.gen || t === (drive.dayMeta.get(key) || '')) continue;
                    const meta = {}, text = await fetchDay(d, meta);
                    if (gen !== drive.gen || drive.dirtyKeys.has(key)) continue;
                    store.putLoaded(key, text); drive.dayMeta.set(key, meta.t);
                    dayShownAgain(key); any = true;
                }
                if (any && typeof srRemote === 'function') srRemote();     // 🔍 검색 목록도 다시 맞춰 보게
                if (typeof collRemote === 'function') collRemote();         // 스티커 · 페이지 목록
            })().catch(e => console.warn('다른 기기 변경 확인 실패:', e)).finally(() => { remoteChecking = null; });
            return remoteChecking;
        }
        setInterval(() => checkRemote(), 60 * 1000);                     // 화면을 보는 동안 1분마다 (숨겨져 있으면 쉬어요)

        /* 화면 꺼짐 / 앱 전환 (아이폰·안드로이드·아이패드 공통) */
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) saveOnScreenOff();
            else { refreshTokenIfNeeded(); checkRemote(); }
        });
        /* 아이폰 사파리·홈 화면 앱에서 페이지가 떠날 때 (visibilitychange 보완) */
        window.addEventListener('pagehide', saveOnScreenOff);
        /* 안드로이드 크롬 등에서 페이지가 동결될 때 */
        document.addEventListener('freeze', saveOnScreenOff);
        /* 데스크톱에서 창/탭을 닫을 때 */
        window.addEventListener('beforeunload', (e) => {
            saveOnScreenOff();
            if (drive.ready && !drive.guest && (drive.dirty || drive.uploading)) { e.preventDefault(); e.returnValue = ''; }
        });



/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['drive'] = true;
