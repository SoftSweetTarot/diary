/* 말랑달콤 다이어리 - js/drive.js
   ☁ 구글 로그인 · 드라이브 저장/불러오기 · 화면 꺼짐 자동 저장  ⚠ 저장의 핵심 - 꼭 필요할 때만 수정
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        /* =====================================================================
           ☁ 구글 드라이브 저장소 (하루 1개 json 파일)
           - 저장 위치 : 말랑달콤 / 다이어리 / 2026년 / 9월 / 10일.json  (폴더가 없으면 저장할 때 자동 생성)
           - 같은 날짜는 항상 같은 파일을 덮어쓰기 → 하루에 파일 1개만 유지
           - 불러오기 : 처음엔 오늘 앞·뒤 포함 3일치, 페이지를 넘길 때마다 1일치씩 미리 읽기
           ===================================================================== */
        const GOOGLE_CLIENT_ID = '1020129080030-42dun4pqvve1pjg9r21m62dd71h6hui5.apps.googleusercontent.com'; // ← 본인 OAuth 클라이언트 ID로 교체
        const TOP_FOLDER_NAME = '말랑달콤';                   // 최상위 폴더 (다이어리 폴더의 상위 폴더)
        const ROOT_FOLDER_NAME = '다이어리';                  // 다이어리 루트 폴더 (말랑달콤 폴더 안)
        const ROOT_PATH = [TOP_FOLDER_NAME, ROOT_FOLDER_NAME]; // 드라이브 경로 : 말랑달콤 / 다이어리
        const ROOT_PATH_TEXT = ROOT_PATH.join(' / ');
        const SETTINGS_FILE_NAME = 'settings.json';           // 스킨·글꼴 등 설정 (루트 폴더 안에 1개)
        const USE_APP_DATA_FOLDER = false; // false: 내 드라이브에 '말랑달콤 / 다이어리' 폴더가 보임 / true: 사용자에게 안 보이는 앱 전용 공간
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
           - 날짜 데이터  : diary_2026_09_10  → 말랑달콤/다이어리/2026년/9월/10일.json
           - 설정 데이터  : diary_ui_font 등  → 말랑달콤/다이어리/settings.json */
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
            settingsFile: null,
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
            return res;
        }

        /* ---------- 폴더 / 파일 이름 규칙 ----------
           말랑달콤 / 다이어리 / 2026년 / 9월 / 10일.json   (하루에 파일 1개, 같은 날은 항상 덮어쓰기) */
        const yearFolderName = y => `${y}년`;
        const monthFolderName = m => `${m}월`;
        const dayFileName = d => `${d}일.json`;
        function dayKeyOf(y, m, d) { return `diary_${y}_${String(m).padStart(2, '0')}_${String(d).padStart(2, '0')}`; }
        function parseDayKey(k) { const r = DAY_KEY_RE.exec(k); return r ? { y: +r[1], m: +r[2], d: +r[3] } : null; }
        function isDayKey(k) { return DAY_KEY_RE.test(k); }
        function isSettingKey(k) { return k.startsWith('diary_') && !isDayKey(k) && k !== PAGE_SIZE_KEY; }
        function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
        function dayPathText(date) {
            return `${ROOT_PATH.join('/')}/${yearFolderName(date.getFullYear())}/${monthFolderName(date.getMonth() + 1)}/${dayFileName(date.getDate())}`;
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
                if (!res.ok) throw new Error('list ' + res.status);
                const j = await res.json();
                files = files.concat(j.files || []);
                pageToken = j.nextPageToken || '';
            } while (pageToken);
            return files;
        }

        async function readFileText(id) {
            const res = await gfetch(`${DRIVE_API}/${id}?alt=media`);
            if (!res.ok) throw new Error('read ' + res.status);
            return await res.text();
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
            const files = await driveList(`name='${name}' and mimeType='${FOLDER_MIME}' and '${parentId || DRIVE_PARENT_DEFAULT}' in parents and trashed=false`, 'id,name');
            return files[0] ? files[0].id : null;
        }

        async function createFolder(name, parentId) {
            const res = await gfetch(`${DRIVE_API}?fields=id`, {
                method: 'POST', headers: { 'Content-Type': 'application/json; charset=UTF-8' },
                body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId || DRIVE_PARENT_DEFAULT] })
            });
            if (!res.ok) throw new Error('mkdir ' + res.status);
            return (await res.json()).id;
        }

        /* names = ['말랑달콤','다이어리'] / ['말랑달콤','다이어리','2026년'] / ['말랑달콤','다이어리','2026년','9월']
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
                if (!id && create) id = await createFolder(name, parentId);
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
                const folderId = await getFolder([...ROOT_PATH, yearFolderName(y), monthFolderName(m)], create);
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
            drive.settingsFile = null;
        }

        /* ---------- 읽기 : 설정 / 하루치 ---------- */
        async function fetchSettings() {
            drive.settingsFile = null;
            const rootId = await getFolder(ROOT_PATH, false);
            if (!rootId) return null;
            const files = await driveList(`name='${SETTINGS_FILE_NAME}' and '${rootId}' in parents and trashed=false`, 'id,name,modifiedTime');
            if (!files[0]) return null;
            drive.settingsFile = files[0];
            return parseJsonObject(await readFileText(files[0].id), 'settings');
        }

        async function fetchDay(date) {
            const idx = await getMonthIndex(date.getFullYear(), date.getMonth() + 1, false);
            const f = idx && idx.files.get(dayFileName(date.getDate()));
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
                    const text = await fetchDay(date);
                    if (gen !== drive.gen) return false;
                    if (!drive.dirtyKeys.has(key)) store.putLoaded(key, text);   // 고치는 중인 내용이 있으면 덮어쓰지 않음
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
            const settings = await fetchSettings();        // 읽지 못하면 여기서 에러 → 아무것도 바꾸지 않음
            clearTimeout(uploadTimer);
            drive.gen++;
            store.clear();
            drive.dirtyKeys.clear(); drive.loadedDays.clear(); drive.dayLoads.clear();
            if (settings) Object.keys(settings).forEach(k => { if (isSettingKey(k)) store.putLoaded(k, JSON.stringify(settings[k])); });
            drive.ready = true; drive.guest = false;
            drive.needAuth = false; drive.error = false;
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
                if (res.status !== 404) throw new Error('update ' + res.status);
                const er = new Error('gone'); er.code = 'gone'; throw er;       // 그 사이 지워짐 → 캐시를 비우고 다시 시도
            }
            const b = 'diary_boundary_' + Math.random().toString(36).slice(2);
            const meta = { name, mimeType: 'application/json', parents: [folderId] };
            const multipart =
                `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n` +
                `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${body}\r\n--${b}--`;
            const res = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime', Object.assign({
                method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: multipart
            }, keepaliveFor(multipart)));
            if (!res.ok) {
                if (res.status === 404) { const er = new Error('gone'); er.code = 'gone'; throw er; }   // 폴더가 지워짐
                throw new Error('create ' + res.status);
            }
            return await res.json();
        }

        async function driveTrash(fileId) {
            const res = await gfetch(`${DRIVE_API}/${fileId}?fields=id`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify({ trashed: true })
            });
            if (!res.ok && res.status !== 404) throw new Error('trash ' + res.status);
        }

        function settingsBody() {
            return '{' + store.keys().filter(isSettingKey).map(k => JSON.stringify(k) + ':' + store.getItem(k)).join(',') + '}';
        }

        /* 변경된 키 하나를 드라이브에 반영 */
        async function driveWriteKey(key, retried) {
            try {
                const dk = parseDayKey(key);
                if (dk) {
                    const val = store.getItem(key);
                    const name = dayFileName(dk.d);
                    if (val === null) {                                    // 내용을 모두 지운 날 → 파일은 휴지통으로
                        const idx = await getMonthIndex(dk.y, dk.m, false);
                        const f = idx && idx.files.get(name);
                        if (f) { await driveTrash(f.id); idx.files.delete(name); }
                        return;
                    }
                    const idx = await getMonthIndex(dk.y, dk.m, true);      // 년도·달 폴더가 없으면 여기서 생성
                    const f = idx.files.get(name);
                    const saved = await driveUpsert(idx.folderId, name, f && f.id, val);   // 있으면 덮어쓰기, 없으면 새 파일
                    idx.files.set(name, { id: saved.id, name, modifiedTime: saved.modifiedTime });
                } else {
                    const rootId = await getFolder(ROOT_PATH, true);                        // '말랑달콤 / 다이어리' 폴더 (없으면 생성)
                    const saved = await driveUpsert(rootId, SETTINGS_FILE_NAME, drive.settingsFile && drive.settingsFile.id, settingsBody());
                    drive.settingsFile = { id: saved.id, name: SETTINGS_FILE_NAME, modifiedTime: saved.modifiedTime };
                }
            } catch (e) {
                if (e && e.code === 'gone' && !retried) { resetDriveCaches(); return driveWriteKey(key, true); }
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
                let allOk = true, authFail = false;
                for (const key of Array.from(drive.dirtyKeys)) {
                    drive.dirtyKeys.delete(key);                            // 올리는 도중 또 바뀌면 다시 표시됨
                    drive.inflight = key;
                    try { await driveWriteKey(key); }
                    catch (e) {
                        drive.dirtyKeys.add(key); allOk = false;
                        if (e && e.code === 'auth') { authFail = true; break; }
                    }
                }
                drive.inflight = null; drive.uploading = false; drive.error = !allOk;
                if (allOk) {
                    drive.lastSaved = new Date();
                    if (!drive.dirty) clearPending();                       // 그 사이 새 변경이 없을 때만 임시 보관본 삭제
                } else if (!authFail) {
                    uploadTimer = setTimeout(() => flushUpload(), 30000);
                }
                updateBadge(); updateStorageInfo();
                return allOk;
            });
            return uploadChain;
        }

        /* ---------- 전체 목록 (백업 / 용량 확인용) ---------- */
        async function driveEnumerateAll() {
            const rootId = await getFolder(ROOT_PATH, false);
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

        function updateBadge() {
            const el = document.getElementById('driveBadge');
            if (!el) return;
            let text = '', warn = false;
            if (drive.guest) { text = '☁ 저장 안 됨 · 눌러서 로그인'; warn = true; }
            else if (!drive.ready) { el.style.display = 'none'; return; }
            else if (drive.needAuth) { text = '⚠ 로그인이 만료됐어요 · 눌러서 다시 연결'; warn = true; }
            else if (drive.uploading) text = '☁ 드라이브에 저장 중…';
            else if (drive.error) { text = '⚠ 저장 실패 · 눌러서 다시 시도'; warn = true; }
            else if (drive.dirty) text = '☁ 저장 대기 중…';
            else if (drive.lastSaved) text = '☁ 드라이브에 저장됨 ' + drive.lastSaved.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
            else text = '☁ 드라이브 연결됨';
            el.textContent = text;
            el.classList.toggle('warn', warn);
            el.style.display = 'block';
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
            if (t === 'corrupt') return '저장된 파일을 읽을 수 없어요. 데이터 보호를 위해 덮어쓰지 않았어요. 드라이브의 말랑달콤 / 다이어리 폴더를 확인해 주세요.';
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
            showGate('login', '일기는 내 구글 드라이브의 <b>말랑달콤 / 다이어리</b> 폴더에<br>하루에 파일 1개씩 저장돼요.' + fileHint);
        }

        async function driveLogin() {
            showGate('wait', '☁ 구글 로그인 창에서 계정을 선택해 주세요…');
            try { await requestToken('select_account'); await loadFromDrive(); hideGate(); postLoginTasks(); }
            catch (e) { showGate('login', driveErrorText(e)); }
        }

        function enterGuestMode() {
            drive.guest = true; drive.ready = false;
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
            const yes = await showMsg('로그아웃할까요?<br><span style="font-size:12px;color:#777;">드라이브의 말랑달콤 / 다이어리 폴더는 그대로 남아 있어요.</span>', true);
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
                const items = {};
                drive.dirtyKeys.forEach(k => { items[k] = store.getItem(k); });          // null = 내용을 지운 날
                if (drive.inflight && !(drive.inflight in items)) items[drive.inflight] = store.getItem(drive.inflight);
                localStorage.setItem(PENDING_KEY, JSON.stringify({ savedAt: Date.now(), items }));
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

        /* 다음에 열었을 때, 업로드되지 못한 임시 보관본(변경된 날짜만)이 있으면 복구 */
        async function recoverPendingBackup() {
            let p = null;
            try { const raw = localStorage.getItem(PENDING_KEY); p = raw ? JSON.parse(raw) : null; } catch (e) {}
            if (!p || !p.items || typeof p.items !== 'object') { clearPending(); return; }
            const todo = [];
            for (const k of Object.keys(p.items)) {
                const v = p.items[k];
                if (!k.startsWith('diary_') || !(v === null || typeof v === 'string')) continue;
                const dk = parseDayKey(k);
                let driveTime = 0;
                if (dk) {
                    await ensureDayLoaded(new Date(dk.y, dk.m - 1, dk.d));
                    if (!drive.loadedDays.has(k)) continue;                             // 드라이브 내용을 읽지 못하면 건드리지 않음
                    const idx = drive.monthIndex.get(`${dk.y}/${dk.m}`);
                    const f = idx && idx.files.get(dayFileName(dk.d));
                    driveTime = f && f.modifiedTime ? Date.parse(f.modifiedTime) : 0;
                } else if (isSettingKey(k)) {
                    driveTime = drive.settingsFile && drive.settingsFile.modifiedTime ? Date.parse(drive.settingsFile.modifiedTime) : 0;
                } else continue;
                if (driveTime && driveTime >= p.savedAt) continue;                      // 이미 드라이브에 반영됨(더 최신)
                if (store.getItem(k) === v) continue;                                   // 내용이 같음
                todo.push(k);
            }
            clearPending();
            if (!todo.length) return;
            const when = new Date(p.savedAt).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
            const yes = await showMsg('📴 ' + when + ' 화면이 꺼질 때의 변경 내용이<br>드라이브에 저장되지 못했어요. (' + todo.length + '건)<br>이 기기에 보관된 내용으로 복구할까요?<br><span style="font-size:12px;color:#777;">취소를 누르면 드라이브의 현재 내용을 유지해요.</span>', true);
            if (!yes) return;
            try {
                todo.forEach(k => { const v = p.items[k]; if (v === null) store.removeItem(k); else store.setItem(k, v); });
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

        /* 화면 꺼짐 / 앱 전환 (아이폰·안드로이드·아이패드 공통) */
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) saveOnScreenOff();
            else refreshTokenIfNeeded();
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
