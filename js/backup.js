/* 말랑달콤 다이어리 - js/backup.js
   📦 백업 · 📥 불러오기 : 구글 로그인이든 📁 하드(이 기기 폴더)든 똑같이 zip 하나 (도련 · 2026-10-13)
   - 백업 = 말랑달콤 폴더를 날짜별 json 파일 그대로 zip 에 묶어요 → 풀면 드라이브와 똑같은 말랑달콤 폴더
     (일기 · 설정 · 카페 · 스티커 모음 · 내가 만든 스티커 · 페이지 · 인형 · 인형극 · 검색 목록 모두)
   - 불러오기 = zip 안의 말랑달콤 폴더를 지금 쓰는 곳(구글 드라이브 / 이 기기 폴더)의 같은 자리에 넣어요
     · 같은 날짜 · 같은 파일은 백업 것으로 덮어써요 (구글 드라이브는 덮어쓰기 전 것이 🕘 이전 버전에 남아요) · 나머지는 그대로
     · 구글 드라이브에서 '말랑달콤' 폴더를 내려받은 zip 도 돼요
   - 하드 → 구글 로그인으로 옮길 때도 이 기능으로 폴더를 통째로 옮겨요 (js/devsave.js)
   - 드라이브와 말하는 함수(getFolder · driveList · readFileText · driveUpsert)만 써요 → 구글이든 이 기기 폴더든 같은 코드 (js/drive.js · js/devsave.js vfsFetch)
   ※ 예전 json 백업(📂 PC로 백업)은 없앴어요 : 1년치를 글자 하나에 담다가 폰이 멈추거나 한 글자만 깨져도 전부 못 읽어서 */

        const BK_TOP = '말랑달콤';
        const BK_DAY_RE = /\/다이어리\/페이지\/\d{4}년\/\d{1,2}월\/\d{1,2}일\.json$/;

        /* ---------- zip 만들기 · 읽기 (압축 없이 담기 · 읽기는 압축 0 · 8 둘 다) ---------- */
        const BK_CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
        function bkCrc(b) { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = BK_CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
        function bkZip(files) {                                            // files : [[경로, Uint8Array]]
            const enc = new TextEncoder(), parts = [], cen = []; let off = 0;
            const d = new Date(), dt = ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xFFFF, dd = (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xFFFF;
            for (const [name, data] of files) {
                const nb = enc.encode(name), crc = bkCrc(data), h = new DataView(new ArrayBuffer(30));
                h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
                h.setUint16(10, dt, true); h.setUint16(12, dd, true); h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true);
                h.setUint16(26, nb.length, true);
                parts.push(new Uint8Array(h.buffer), nb, data);
                const c = new DataView(new ArrayBuffer(46));
                c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
                c.setUint16(12, dt, true); c.setUint16(14, dd, true); c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
                c.setUint16(28, nb.length, true); c.setUint32(42, off, true);
                cen.push(new Uint8Array(c.buffer), nb);
                off += 30 + nb.length + data.length;
            }
            const cs = cen.reduce((s, a) => s + a.length, 0), e = new DataView(new ArrayBuffer(22));
            e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cs, true); e.setUint32(16, off, true);
            return new Blob(parts.concat(cen, [new Uint8Array(e.buffer)]), { type: 'application/zip' });
        }
        /* zip 안의 말랑달콤 폴더 파일들 : [{ path: '말랑달콤/…', text() }] (내용은 넣을 때 하나씩 꺼내요) */
        async function bkUnzip(file) {
            const buf = await file.arrayBuffer(), v = new DataView(buf), u8 = new Uint8Array(buf);
            let e = -1; for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
            if (e < 0) throw new Error('zip');
            const n = v.getUint16(e + 10, true), utf = new TextDecoder('utf-8'), out = [];
            let p = v.getUint32(e + 16, true);
            for (let i = 0; i < n; i++) {
                if (v.getUint32(p, true) !== 0x02014b50) throw new Error('zip');
                const method = v.getUint16(p + 10, true), csize = v.getUint32(p + 20, true), nl = v.getUint16(p + 28, true), xl = v.getUint16(p + 30, true), cl = v.getUint16(p + 32, true), lo = v.getUint32(p + 42, true);
                const name = utf.decode(u8.subarray(p + 46, p + 46 + nl)).replace(/\\/g, '/');
                p += 46 + nl + xl + cl;
                const at = name.indexOf(BK_TOP + '/');
                if (name.endsWith('/') || at < 0) continue;
                const path = name.slice(at).split('/').filter(s => s && s !== '.' && s !== '..').join('/');
                if (path.length <= BK_TOP.length || !/\.json$/i.test(path)) continue;
                out.push({ path, text: async () => {
                    const ds = lo + 30 + v.getUint16(lo + 26, true) + v.getUint16(lo + 28, true), raw = u8.subarray(ds, ds + csize);
                    if (method === 0) return utf.decode(raw);
                    if (method === 8 && typeof DecompressionStream === 'function') return utf.decode(new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()));
                    throw new Error('zip-method');
                } });
            }
            return out;
        }

        /* ---------- 진행 표시 (첫 화면 덮개 재사용) ---------- */
        function bkBusy(msg) { if (msg == null) { hideGate(); return; } showGate('wait', msg); }

        /* ---------- 지금 쓰는 곳(구글 / 이 기기)의 말랑달콤 폴더 → [[경로, 글]] ---------- */
        async function bkReadTree(tell) {
            const top = await getFolder([BK_TOP], false);
            if (!top) return [];
            const files = [];
            const walk = async (id, path) => {
                for (const f of await driveList(`'${id}' in parents and trashed=false`, 'id,name,mimeType')) {
                    if (f.mimeType === FOLDER_MIME) await walk(f.id, path + '/' + f.name);
                    else if (/\.json$/i.test(f.name)) files.push({ id: f.id, path: path + '/' + f.name });
                }
            };
            await walk(top, BK_TOP);
            const out = []; let i = 0, done = 0;
            await Promise.all(Array.from({ length: 4 }, async () => {
                while (i < files.length) {
                    const f = files[i++];
                    out.push([f.path, await readFileText(f.id)]);
                    if (tell) tell(++done, files.length);
                }
            }));
            return out.sort((a, b) => a[0] < b[0] ? -1 : 1);
        }
        /* [{ path, text() }] → 지금 쓰는 곳의 같은 자리에 (있으면 덮어쓰기) */
        async function bkPutTree(items, tell) {
            let done = 0, fail = 0;
            for (const it of items) {
                const parts = it.path.split('/'), name = parts.pop();
                const put = async body => { const dir = await getFolder(parts, true), cur = await findFile(dir, name); await driveUpsert(dir, name, cur && cur.id, body); };
                try {
                    const body = await it.text();
                    try { await put(body); }
                    catch (e) { if (e && e.code === 'gone') { resetDriveCaches(); await put(body); } else throw e; }   // 그 사이 폴더가 바뀌었으면 다시 찾아서 한 번 더
                } catch (e) { console.warn('넣지 못한 파일:', it.path, e); fail++; }
                if (tell) tell(++done, items.length);
            }
            return fail;
        }

        /* ---------- 📦 백업 파일 받기 ---------- */
        async function bkBackup() {
            if (!drive.ready || drive.guest) { showMsg('📦 백업은 구글로 로그인했거나 📁 폴더에 저장할 때 받을 수 있어요.<br><span style="font-size:12px;color:#777;">구경만 할 때는 저장된 일기가 없어요.</span>'); return; }
            try { if (isCoverOpen && !turn) saveData(false); } catch (e) {}
            bkBusy('📦 백업 파일을 만드는 중…');
            try {
                await flushUpload({ force: true });
                const list = await bkReadTree((n, all) => bkBusy(`📦 백업 파일을 만드는 중… <b>${n} / ${all}</b>`));
                bkBusy(null);
                if (!list.length) { showMsg('아직 저장된 일기가 없어요.'); return; }
                const enc = new TextEncoder(), days = list.filter(f => BK_DAY_RE.test(f[0])).length;
                const d = new Date(), stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                const a = document.createElement('a'); a.href = URL.createObjectURL(bkZip(list.map(([p, t]) => [p, enc.encode(t)]))); a.download = `다이어리_백업_${stamp}.zip`;
                document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
                showMsg(`📦 백업 파일을 만들었어요!<br>일기 <b>${days}일치</b> · 파일 ${list.length}개<br><span style="font-size:12px;color:#777;">새 기기에서 ⚙ 설정 → 📥 백업 불러오기 (로그인 없이 쓰면 첫 화면의 📥 백업 파일로 시작하기)</span>`);
            } catch (e) { console.warn(e); bkBusy(null); showMsg('⚠ 백업 파일을 만들지 못했어요.<br>잠시 후 다시 해 주세요.'); }
        }

        /* ---------- 📥 백업 불러오기 ---------- */
        function bkPickFile(then) {
            let inp = document.getElementById('bkInput');
            if (!inp) { inp = document.createElement('input'); inp.type = 'file'; inp.id = 'bkInput'; inp.accept = '.zip,application/zip,application/x-zip-compressed'; inp.hidden = true; document.body.appendChild(inp); }
            inp.onchange = () => { const f = inp.files[0]; inp.value = ''; if (f) then(f); };
            inp.click();
        }
        async function bkOpen(file) {                                      // 읽기 + 몇 일치인지
            let items;
            try { items = await bkUnzip(file); } catch (e) { showMsg('⚠ 백업 파일을 읽지 못했어요.<br><span style="font-size:12px;color:#777;">다이어리 백업(.zip) 파일인지 확인해 주세요.</span>'); return null; }
            if (!items.length) { showMsg('⚠ 이 파일 안에 다이어리 백업 내용이 없어요.'); return null; }
            return { items, days: items.filter(f => BK_DAY_RE.test(f.path)).length };
        }
        /* 지금 쓰는 곳에 넣고 다시 읽기 (진행 표시) */
        async function bkApply(b, where) {
            try { if (isCoverOpen && !turn) saveData(false); } catch (e) {}
            bkBusy(`📥 ${where}에 넣는 중…`);
            try {
                await flushUpload({ force: true });
                const fail = await bkPutTree(b.items, (n, all) => bkBusy(`📥 ${where}에 넣는 중… <b>${n} / ${all}</b>`));
                await loadFromDrive();
                bkBusy(null);
                showMsg(fail ? `⚠ ${b.items.length - fail}개는 넣었지만 <b>${fail}개</b>는 넣지 못했어요.<br>잠시 후 백업 불러오기를 한 번 더 해 주세요.` : `📥 백업을 불러왔어요! 일기 <b>${b.days}일치</b>`);
                return !fail;
            } catch (e) { console.warn(e); bkBusy(null); showMsg('⚠ 백업을 다 넣지 못했어요.<br>잠시 후 다시 해 주세요.'); return false; }
        }
        /* ⚙ 설정 → 📥 백업 불러오기 */
        function bkRestore() {
            if (!drive.ready || drive.guest) { showMsg('📥 백업은 구글로 로그인했거나 📁 폴더에 저장할 때 불러올 수 있어요.<br><span style="font-size:12px;color:#777;">첫 화면의 <b>로그인 없이 시작하기 → 📥 백업 파일로 시작하기</b>도 돼요.</span>'); return; }
            bkPickFile(async file => {
                const b = await bkOpen(file); if (!b) return;
                const google = !drive.local;
                const ok = await showMsg(google
                    ? `📥 백업 파일에 일기 <b>${b.days}일치</b> · 파일 ${b.items.length}개가 있어요.<br><b>구글 드라이브 폴더</b>에 넣을까요?<br><span style="font-size:12px;color:#777;">같은 날짜 · 같은 파일은 백업 것으로 덮어써요 (덮어쓰기 전 것은 🕘 이전 버전에 남아요).<br>나머지는 그대로 있어요.</span>`
                    : `📥 백업 파일에 일기 <b>${b.days}일치</b> · 파일 ${b.items.length}개가 있어요.<br><b>이 기기 폴더</b>에 저장할까요?<br><span style="font-size:12px;color:#777;">같은 날짜 · 같은 파일은 백업 것으로 덮어써요. 나머지는 그대로 있어요.</span>`, true);
                if (ok) bkApply(b, google ? '구글 드라이브' : '이 기기 폴더');
            });
        }

        window.bkBackup = bkBackup; window.bkRestore = bkRestore; window.bkPickFile = bkPickFile; window.bkOpen = bkOpen; window.bkApply = bkApply; window.bkReadTree = bkReadTree;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['backup'] = true;
