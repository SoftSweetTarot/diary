/* 말랑달콤 다이어리 - js/trash.js
   🗑 휴지통 : 지운 것 · 덮어쓰기 전 모습을 30일 동안 보관하고 되살려요 (도련 · 2026-10-13)
   - ⚙ 설정 → 💾 데이터 관리 → 🗑 휴지통 : 목록 · 되살리기 · 휴지통 비우기 (구글 · 📁 폴더 같은 화면)
   - 들어가는 것 : 앱이 지운 것 (그날 일기를 다 비움 · 스티커 · 페이지 · 배경지 · 인형 · 인형극)
                  + 덮어쓰기 직전 모습 (백업 불러오기 · 폴더 → 구글 옮기기 · "어느 쪽을 남길까요?"에서 바뀐 쪽) · 내용이 같으면 넣지 않아요
   - 구글 : 구글 드라이브 휴지통 그대로 (30일 뒤 구글이 비워요) · 덮어쓰기 전 모습은 '휴지통' 폴더에 만들어 바로 휴지통으로 (원래 자리는 appProperties.orig)
   - 📁 폴더 : 말랑달콤 / 휴지통 칸 (js/devsave.js) · 30일 또는 폰 · 아이패드 50MB (PC 폴더 200MB) 넘으면 오래된 것부터 비워요
   - 되살릴 자리에 그새 새로 쓴 게 있으면 "어느 쪽을 남길까요?" → 안 고른 쪽은 휴지통으로 */

        const TR_TOP = '말랑달콤';
        const trq = id => document.getElementById(id);
        const trEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

        /* ---------- 덮어쓰기 전 모습 보관 (부르는 곳 : backup.js · drive.js) ---------- */
        async function trashKeep(path, oldText) {
            if (oldText == null || oldText === '' || oldText === 'null') return;
            try {
                if (drive.local) { if (window.dvTrash) await dvTrash.put(path, oldText); return; }
                const dir = await getFolder([TR_TOP, '휴지통'], true);
                const b = 'diary_boundary_' + Math.random().toString(36).slice(2);
                const meta = { name: path.split('/').pop(), mimeType: 'application/json', parents: [dir], appProperties: { orig: path.slice(0, 110) } };
                const mp = `--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(meta)}\r\n--${b}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${oldText}\r\n--${b}--`;
                const res = await gfetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id', { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + b }, body: mp });
                if (res.ok) await driveTrash((await res.json()).id);
            } catch (e) { console.warn('덮어쓰기 전 모습을 휴지통에 넣지 못했어요 (저장은 그대로 해요):', path, e); }
        }
        const dayPathOf = key => { const d = parseDayKey(key); return d ? DAY_PATH.concat(yearFolderName(d.y), monthFolderName(d.m), dayFileName(d.d)).join('/') : ''; };
        function trashKeepDay(key, oldText) { const p = dayPathOf(key); return p ? trashKeep(p, oldText) : Promise.resolve(); }

        /* ---------- 이름 : 경로 → 사람이 알아보는 말 ---------- */
        function trLabel(path) {
            let m = /\/다이어리\/페이지\/(\d{4})년\/(\d{1,2})월\/(\d{1,2})일\.json$/.exec(path);
            if (m) return `📔 ${m[1]}년 ${m[2]}월 ${m[3]}일 일기`;
            if (/\/설정\/설정\.json$/.test(path)) return '⚙ 설정';
            if (/\/카페\/카페\.json$/.test(path)) return '☕ 카페 기록';
            if (/\/검색\//.test(path)) return '🔍 검색 목록';
            const parts = path.split('/'), i = parts.indexOf('원본');
            if (i > 1) return parts[1] === '스티커' ? `🏷️ ${parts[2]} 스티커` : /배경지/.test(parts[i - 1]) ? '🎨 배경지' : /페이지/.test(parts[i - 1]) ? '📔 페이지' : '📦 ' + parts[i - 1];
            if (/\/인형극\//.test(path)) return '🎭 인형극 ' + parts[parts.length - 1].replace(/\.json$/, '');
            if (/\/인형\//.test(path)) return '👧 인형 ' + parts[parts.length - 1].replace(/\.json$/, '');
            if (/\/목록\//.test(path)) return '📋 모음 목록';
            return '📄 ' + parts.slice(1).join(' / ');
        }
        const trWhen = ms => { const d = new Date(ms); return `${d.getMonth() + 1}월 ${d.getDate()}일 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
        const trSize = b => b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB';

        /* ---------- 목록 : [{ id | f, path, at, size }] ---------- */
        async function trGoogleFolders() {                                 // 말랑달콤 아래 폴더 번호 → 경로
            const map = new Map(), top = await getFolder([TR_TOP], false);
            if (!top) return map;
            map.set(top, TR_TOP);
            const walk = async (id, path) => { for (const f of await driveList(`'${id}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`, 'id,name')) { map.set(f.id, path + '/' + f.name); await walk(f.id, path + '/' + f.name); } };
            await walk(top, TR_TOP);
            return map;
        }
        async function trList() {
            if (drive.local) return (await dvTrash.list()).filter(e => !/\/목록\/목록\d+\.json$|\/검색\//.test(e.path)).map(e => Object.assign({ dev: true }, e));
            const map = await trGoogleFolders();
            const fs = await driveList(`trashed=true and mimeType!='${FOLDER_MIME}'`, 'id,name,parents,modifiedTime,size,trashedTime,appProperties');
            const out = [];
            fs.forEach(f => {
                const orig = f.appProperties && f.appProperties.orig, par = (f.parents || [])[0];
                const path = orig || (map.has(par) ? map.get(par) + '/' + f.name : '');
                if (!path || !/\.json$/i.test(path) || /\/목록\/목록\d+\.json$|\/검색\//.test(path)) return;   // 모음 목록 · 검색 목록은 앱이 알아서 다시 만들어요
                out.push({ id: f.id, path, at: Date.parse(f.trashedTime || f.modifiedTime) || 0, size: +f.size || 0 });
            });
            return out;
        }

        /* ---------- 되살리기 ---------- */
        async function trRestore(e) {
            let text;
            if (e.dev) { const o = await dvTrash.take(e); text = o && o.text; }
            else text = await readFileText(e.id);
            if (text == null) { showMsg('⚠ 휴지통에서 읽지 못했어요.'); return false; }
            const parts = e.path.split('/'), name = parts.pop();
            const dir = await getFolder(parts, true), cur = await findFile(dir, name);
            const now = cur ? await readFileText(cur.id) : null;
            if (now != null && now !== text && now !== '' && now !== 'null') {
                const back = await showAsk(`<b>${trEsc(trLabel(e.path))}</b><br>그새 새로 쓴 것이 있어요.<br>어느 쪽을 남길까요?<br><span style="font-size:12px;color:#777;">고르지 않은 쪽은 휴지통으로 가요.</span>`, '🗑 휴지통 것', '📝 지금 것');
                if (!back) return false;
                await trashKeep(e.path, now);
            }
            await driveUpsert(dir, name, cur && cur.id, text);
            if (e.dev) await dvTrash.drop(e);
            else await gfetch(`${DRIVE_API}/${e.id}`, { method: 'DELETE' }).catch(() => {});
            return true;
        }
        async function trEmpty(list) {
            if (drive.local) { await dvTrash.empty(); return; }
            for (const e of list) { try { await gfetch(`${DRIVE_API}/${e.id}`, { method: 'DELETE' }); } catch (x) {} }
        }
        /* 되살린 뒤 : 화면 · 모음 목록을 다시 (모음은 원본을 보고 목록을 다시 맞춰요) */
        async function trReload() {
            await loadFromDrive();
            if (typeof COLL !== 'undefined') COLL.map.forEach(C => { C.checked = false; C.lists = null; });
        }

        /* ---------- 화면 ---------- */
        function trBuild() {
            if (trq('trashModal')) return;
            const m = document.createElement('div');
            m.className = 'modal'; m.id = 'trashModal';
            m.innerHTML = `<div class="modal-content tr-box">
                <div class="modal-title">🗑 휴지통</div>
                <p class="tr-tip">지운 것과 덮어쓰기 전 모습을 30일 동안 보관해요.<br>되살리면 원래 자리로 돌아가요.</p>
                <div class="tr-list" id="trList"></div>
                <div class="tr-foot"><span id="trTotal"></span><button type="button" class="btn tr-empty" id="trEmpty">휴지통 비우기</button></div></div>`;
            document.body.appendChild(m);
        }
        async function openTrash() {
            if (!drive.ready || drive.guest) { showMsg('🗑 휴지통은 구글로 로그인했거나 📁 폴더에 저장할 때 쓸 수 있어요.'); return; }
            trBuild(); openModal('trashModal');
            const box = trq('trList'), tot = trq('trTotal'), emp = trq('trEmpty');
            box.innerHTML = '<div class="tr-empty-msg">⏳ 불러오는 중…</div>'; tot.textContent = ''; emp.disabled = true;
            let list;
            try { list = await keepTrying(trList, { alive: () => ktShown(box), onTry: n => { box.innerHTML = `<div class="tr-empty-msg">${KT_MSG(n)}</div>`; } }); }
            catch (e) { if (ktShown(box)) box.innerHTML = '<div class="tr-empty-msg">⚠ 불러오지 못했어요.</div>'; return; }
            list.sort((a, b) => b.at - a.at);
            const size = list.reduce((s, e) => s + (e.size || 0), 0);
            tot.textContent = list.length ? `${list.length}개 · ${trSize(size)}` : '';
            emp.disabled = !list.length;
            if (!list.length) { box.innerHTML = '<div class="tr-empty-msg">휴지통이 비어 있어요.</div>'; return; }
            box.textContent = '';
            list.forEach(e => {
                const row = document.createElement('div'); row.className = 'tr-row';
                row.innerHTML = `<span class="tr-what"><b></b><small>${trWhen(e.at)}에 지움 · ${trSize(e.size || 0)}</small></span><button type="button" class="btn tr-back">되살리기</button>`;
                row.querySelector('b').textContent = trLabel(e.path);
                row.querySelector('.tr-back').onclick = async ev => {
                    ev.currentTarget.disabled = true;
                    try { if (await trRestore(e)) { await trReload(); showMsg(`<b>${trEsc(trLabel(e.path))}</b><br>되살렸어요!`); openTrash(); } else ev.currentTarget.disabled = false; }
                    catch (x) { console.warn(x); showMsg('⚠ 되살리지 못했어요. 잠시 후 다시 해 주세요.'); ev.currentTarget.disabled = false; }
                };
                box.appendChild(row);
            });
            emp.onclick = async () => {
                if (!(await showMsg(`휴지통의 ${list.length}개를 모두 지울까요?<br><span style="font-size:12px;color:#777;">비우면 다시 살릴 수 없어요.</span>`, true))) return;
                emp.disabled = true;
                try { await trEmpty(list); } catch (x) { console.warn(x); }
                openTrash();
            };
        }

        window.trashKeep = trashKeep; window.trashKeepDay = trashKeepDay; window.openTrash = openTrash;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['trash'] = true;
