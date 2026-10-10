/* 말랑달콤 다이어리 - js/doll-store.js
   👧 인형 저장소 : 구글 드라이브에 인형마다 파일 1개, 인형 이름으로 저장
       내 드라이브 / 말랑달콤 / 카페 / 인형 / 로라.json
       (나중에 인형극을 만들면 : 말랑달콤 / 카페 / 인형극 / 상황극.json — DOLL_FOLDERS.play 주석만 풀면 됨)
   - 다이어리(말랑달콤/다이어리)와는 다른 폴더라서 일기·설정 저장과 서로 영향을 주지 않아요.
   - 저장할 때만 그 인형 파일 하나를 올려요. (설정을 바꿀 때마다 인형까지 올라가지 않음)
   - 로그인 없이 둘러보기(게스트)일 때는 이 기기(브라우저)에만 저장해요.
   ※ 저장 코드(drive.js)의 getFolder · driveList · readFileText · driveUpsert · driveTrash 를 그대로 사용
   ※ 파일 불러오는 순서: … → pattern-maker → doll-render → doll-store → doll-room → service */

        const DOLL_FOLDERS = {
            deco: [TOP_FOLDER_NAME, '카페', '인형']             // 👧 인형 꾸미기 : 말랑달콤 / 카페 / 인형 / 로라.json
            // play: [TOP_FOLDER_NAME, '카페', '인형극']        // 🎭 나중에 인형극 : 말랑달콤 / 카페 / 인형극 / 상황극.json
        };
        const DOLL_MAX_COUNT = Infinity;                        // 인형 개수 제한 없음
        const DOLL_GUEST_KEY = 'malang_dolls_guest';            // 게스트 모드 : 이 기기에만

        const dollCache = { list: null, loading: null, mode: '' };   // [{ id, name(파일 이름), doll, time }]
        const dollUseDrive = () => drive.ready && !drive.guest;

        /* 인형 이름 → 파일 이름 (드라이브에서 헷갈리는 기호는 빼기) */
        function dollFileName(name) {
            return (dollText(name, 12).replace(/[\\/:*?|]/g, '').trim() || '이름없는인형') + '.json';
        }
        function dollFolderText() { return DOLL_FOLDERS.deco.join(' / '); }

        /* ---------- 게스트 : 이 기기에만 ---------- */
        function readGuestDolls() {
            let arr = [];
            try { arr = JSON.parse(localStorage.getItem(DOLL_GUEST_KEY)) || []; } catch (e) { arr = []; }
            return (Array.isArray(arr) ? arr : []).map(e => {
                const d = e && sanitizeDoll(e.doll);
                return d ? { id: String(e.id), name: dollFileName(d.name), doll: d, time: +e.time || 0 } : null;
            }).filter(Boolean).sort((a, b) => b.time - a.time);
        }
        function writeGuestDolls(list) {
            try { localStorage.setItem(DOLL_GUEST_KEY, JSON.stringify(list.map(e => ({ id: e.id, doll: e.doll, time: e.time })))); return true; }
            catch (e) { showMsg('이 기기의 저장 공간이 부족해요.<br>로그인하면 구글 드라이브에 저장할 수 있어요.'); return false; }
        }

        /* ---------- 목록 불러오기 ---------- */
        async function listDolls(force) {
            const mode = dollUseDrive() ? 'drive' : 'guest';            // 게스트 → 로그인으로 바뀌면 다시 읽기
            if (dollCache.list && !force && dollCache.mode === mode) return dollCache.list;
            if (!dollUseDrive()) { dollCache.mode = mode; dollCache.list = readGuestDolls(); return dollCache.list; }   // 게스트는 기다릴 게 없어서 바로 (예전엔 '읽는 중' 표시가 안 풀려 새로 읽어도 첫 결과가 나왔어요)
            if (dollCache.loading) return dollCache.loading;
            dollCache.loading = (async () => {
                try {
                    dollCache.mode = mode;
                    const folderId = await getFolder(DOLL_FOLDERS.deco, false);
                    const out = [];
                    if (folderId) {
                        const files = (await driveList(`'${folderId}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,name,modifiedTime,size'))
                            .filter(f => /\.json$/i.test(f.name)).slice(0, 200);
                        for (let i = 0; i < files.length; i += 6) {                  // 6개씩 나눠서 읽기
                            await Promise.all(files.slice(i, i + 6).map(async f => {
                                try {
                                    const d = sanitizeDoll(await readFileText(f.id));
                                    if (!d) return;
                                    if (!d.name) d.name = dollText(f.name.replace(/\.json$/i, ''), 12);
                                    out.push({ id: f.id, name: f.name, doll: d, time: Date.parse(f.modifiedTime) || 0 });
                                } catch (e) { console.warn('인형 파일을 읽지 못했어요:', f.name, e); }
                            }));
                        }
                    }
                    out.sort((a, b) => b.time - a.time);
                    dollCache.list = out;
                    return dollCache.list;
                } finally { dollCache.loading = null; }
            })();
            return dollCache.loading;
        }

        /* ---------- 저장 : 결과 { id, doll } 또는 null ----------
           id : 고치고 있는 인형의 파일 id (새 인형이면 null)
           같은 이름의 다른 인형이 있으면 물어보고 (opts.ask) 바꾸거나 '이름 (2)'로 저장 */
        async function saveDoll(doll, id, opts = {}) {
            const d = sanitizeDoll(doll);
            if (!d) { showMsg('⚠ 인형이 너무 커서 저장할 수 없어요.<br>조각 수를 조금 줄여 주세요.'); return null; }
            const list = await listDolls();
            const origId = id || null;
            let fname = dollFileName(d.name);
            const same = list.find(e => e.name === fname && e.id !== origId);
            let replaceId = null;
            if (same) {
                const yes = opts.ask === false ? false : await showMsg(`'${dollText(d.name, 12)}' 이름의 인형이 이미 있어요.<br>그 인형을 지금 인형으로 바꿀까요?<br><span style="font-size:12px;color:#777;">취소를 누르면 '${dollText(d.name, 12)} (2)'처럼 새 이름으로 저장해요.</span>`, true);
                if (yes) replaceId = same.id;
                else {
                    for (let n = 2; n < 100; n++) {
                        const nm = dollText(d.name, 9) + ` (${n})`;
                        if (!list.some(e => e.name === dollFileName(nm) && e.id !== origId)) { d.name = nm; break; }
                    }
                    fname = dollFileName(d.name);
                }
            }
            const targetId = replaceId || origId;
            if (!targetId && list.length >= DOLL_MAX_COUNT) {
                showMsg(`👧 인형은 최대 ${DOLL_MAX_COUNT}개까지 저장할 수 있어요.<br>안 쓰는 인형을 지운 뒤 다시 저장해 주세요.`);
                return null;
            }
            const now = Date.now();

            if (!dollUseDrive()) {                              // 게스트 : 이 기기에만
                const gid = targetId || ('g-' + now.toString(36) + Math.random().toString(36).slice(2, 6));
                const next = list.filter(e => e.id !== gid && e.id !== origId);
                next.unshift({ id: gid, name: fname, doll: d, time: now });
                if (!writeGuestDolls(next)) return null;
                dollCache.list = next;
                return { id: gid, doll: d };
            }

            const folderId = await getFolder(DOLL_FOLDERS.deco, true);   // 폴더가 없으면 만들기
            const body = JSON.stringify(d);
            /* 📱 두 기기 : 덮어쓸 인형을 다른 기기가 그 사이 고쳤거나, 같은 이름 인형을 새로 만들었으면 물어봐요 */
            let writeId = targetId;
            const known = targetId && list.find(e => e.id === targetId);
            const cur = targetId ? await driveMeta(targetId) : await findFile(folderId, fname);
            if (cur && (!known || Date.parse(cur.modifiedTime) !== known.time)) {
                const yes = await showAsk(`📱 다른 기기에서 '${dollText(d.name, 12)}' 인형을 ${known ? '고쳤어요' : '만들었어요'}.<br>지금 인형으로 바꿀까요?`, '👧 지금 인형으로', '그만두기');
                if (!yes) { dollCache.list = null; return null; }          // 다음에 목록을 새로 읽어요
                writeId = cur.id;
            } else if (targetId && !cur) writeId = null;                   // 그 사이 지워졌으면 새로 만들어요
            let saved;
            try { saved = await driveUpsert(folderId, fname, writeId, body); }
            catch (e) {
                if (e && e.code === 'gone') saved = await driveUpsert(folderId, fname, null, body);   // 그 사이 지워진 파일 → 새로 만들기
                else throw e;
            }
            const prev = list.find(e => e.id === saved.id);
            if (prev && prev.name !== fname) await dollRenameFile(saved.id, fname);        // 이름을 바꿨으면 파일 이름도
            if (origId && origId !== saved.id) { try { await driveTrash(origId); } catch (e) {} }   // 다른 인형을 덮어썼으면 원래 파일은 휴지통으로
            dollCache.list = [{ id: saved.id, name: fname, doll: d, time: Date.parse(saved.modifiedTime) || now }].concat(list.filter(e => e.id !== saved.id && e.id !== origId));
            if (cur && writeId === cur.id && !known) dollCache.list = null;   // 다른 기기 인형이 섞였으니 다음에 새로 읽어요
            return { id: saved.id, doll: d };
        }

        async function dollRenameFile(fileId, name) {
            const res = await gfetch(`${DRIVE_API}/${fileId}?fields=id,name`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify({ name })
            });
            if (!res.ok) throw new Error('rename ' + res.status);
        }

        /* ---------- 지우기 (드라이브에서는 휴지통으로) ---------- */
        async function deleteDoll(id) {
            const list = await listDolls();
            if (!dollUseDrive()) {
                const next = list.filter(e => e.id !== id);
                writeGuestDolls(next); dollCache.list = next; return;
            }
            await driveTrash(id);
            dollCache.list = list.filter(e => e.id !== id);
        }

        /* 로그인·로그아웃으로 사람이 바뀌면 목록을 새로 읽도록 */

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['doll-store'] = true;
