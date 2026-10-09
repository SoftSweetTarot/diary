/* 말랑달콤 다이어리 - js/sharebox.js
   📤 스티커 공유 : 내가 만든 스티커를 파일(.json) 하나로 저장 → 네이버 카페에 올려 주고받아요 (개발자 등록 없이 사용자끼리)
   - 📤 공유하기 : 보관 창의 '내가만든' 칸 맨 위 (🏷️ 씰 · 🧩 조각 · 📄 모조지 · 🎀 마스킹테이프 · 📃 속지)
       누르면 고르기 → 스티커를 톡톡 눌러 체크 → 💾 파일로 저장 → 파일 이름 · 만든 사람(닉네임) 쓰기 → 기기에 저장
       한 파일에는 한 종류만 (카페 게시판이 종류별)
   - 📥 파일 불러오기 : 같은 보관 창의 '공유받은' 칸 맨 위 · 파일 이름은 상관없이 파일 속 종류를 보고 그 종류 공유받은 칸에 넣어요
       로그인한 사람만 (게스트는 이 기기 저장 공간이 작아서) · 종류마다 최대 SHX_MAX 개 · 이미 있는 것은 건너뛰어요
       저장 위치 : 내 드라이브 말랑달콤 / 다이어리 / 스티커 / 받은씰 · 받은조각 · 받은모조지 · 받은마테 · 받은속지 .json (종류마다 파일 하나)
   - 파일 모양 : { malang_sticker: 1, kind, from: 'share', by, items: [ … ] } (그림은 주소가 아닌 그림 그대로 · 인수인계 12번)
       from 은 나중에 🎁 이벤트 · 🛍️ 문구점 스티커팩도 같은 모양으로 쓰려고 넣어 둔 표시
   - 공유받은 스티커는 다시 공유하지 않아요 (📤 공유하기는 내가만든 칸에만) · 하나씩 ✕ 로 지울 수 있어요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (공유하기 · 공유받은 칸만 없음) */

        const SHX_MAX = 40, SHX_PER_FILE = 40, SHX_FILE_MAX = 20 * 1024 * 1024;
        const SHX_KINDS = { seal: '🏷️ 씰스티커', piece: '🧩 조각스티커', paper: '📄 모조지', tape: '🎀 마스킹테이프', leaf: '📃 속지' };
        const SHX_FILES = { seal: '받은씰.json', piece: '받은조각.json', paper: '받은모조지.json', tape: '받은마테.json', leaf: '받은속지.json' };   // 종류마다 파일 하나 (바뀐 종류만 올려서 빨라요)
        const SHX_WHERE = { seal: '✨ 스티커 → 🏷️ 씰스티커', piece: '✨ 스티커 → 🧩 조각스티커', paper: '✨ 스티커 → 📄 모조지', tape: '✨ 스티커 → 🎀 마스킹테이프', leaf: '✨ 스티커 → 📃 속지' };
        const shx = { lists: {}, ids: {}, loads: {}, kind: '', on: false, picks: [] };
        const shxq = id => document.getElementById(id);
        const shxSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        const shxEsc = t => String(t == null ? '' : t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
        const shxImg = u => typeof u === 'string' && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(u);
        const shxTxt = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, n);
        function shxHash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length.toString(36); }

        /* 한 칸 확인 : 종류마다 정해진 모양만 통과 (파일 · 드라이브에서 읽은 것 모두) */
        function shxItem(kind, o) {
            if (!o || typeof o !== 'object') return null;
            if (kind === 'tape') return typeof tpmClean === 'function' ? tpmClean(o) : null;
            if (kind === 'leaf') return shxImg(o.src) ? { src: o.src } : null;
            if (!shxImg(o.src)) return null;
            const k = o.k === 'seal' || o.k === 'paper' || o.k === 'piece' ? o.k : '';
            if ((kind === 'piece' ? k !== 'piece' && k !== '' : k !== kind)) return null;
            const it = { src: o.src };
            if (o.ss != null) { if (!Array.isArray(o.ss) || !o.ss.length || o.ss.length > 10 || !o.ss.every(shxImg)) return null; it.ss = o.ss.slice(); }
            const t = shxTxt(o.t, 40); if (t) it.t = t;
            if (k) it.k = k;
            return it;
        }
        const shxKey = (kind, it) => shxHash(kind + '|' + (kind === 'tape' ? it.bg + it.s + it.img : it.src + (it.ss ? it.ss.join('') : '')));

        /* ---------- 공유받은 목록 (드라이브 · 로그인한 사람만 · 종류마다 파일 하나, 그 칸을 열 때 그 종류만 읽어요) ---------- */
        async function shxLoad(kind) {
            if (shx.lists[kind]) return shx.lists[kind];
            if (shx.loads[kind]) return shx.loads[kind];
            shx.loads[kind] = (async () => {
                let arr = [];
                try {
                    const dir = shxSync() && await getFolder(STICKER_PATH, false);
                    if (dir) { const f = (await driveList(`name='${SHX_FILES[kind]}' and '${dir}' in parents and trashed=false`, 'id,name'))[0]; if (f) { shx.ids[kind] = f.id; const o = JSON.parse(await readFileText(f.id) || '{}'); arr = Array.isArray(o.s) ? o.s : []; } }
                } catch (e) {}
                shx.lists[kind] = arr.map(x => {
                    const it = shxItem(kind, x);
                    return it ? Object.assign(it, { kd: kind, by: shxTxt(x && x.by, 12), h: shxKey(kind, it), id: kind === 'tape' ? it.id : shxTxt(x.id, 20) || Date.now().toString(36) }) : null;
                }).filter(Boolean);
                shx.loads[kind] = null;
                return shx.lists[kind];
            })();
            return shx.loads[kind];
        }
        let shxQ = null;
        const shxDirty = new Set();
        async function shxSave(kind) {
            shxDirty.add(kind);
            while (shxQ) await shxQ.catch(() => {});
            if (!shxDirty.size) return;
            const ks = [...shxDirty]; shxDirty.clear();
            shxQ = (async () => {
                const dir = await getFolder(STICKER_PATH, true);
                await Promise.all(ks.map(async k => {
                    const body = JSON.stringify({ v: 1, s: shx.lists[k].map(({ h, kd, ...rest }) => rest) });
                    try { const r = await driveUpsert(dir, SHX_FILES[k], shx.ids[k], body); shx.ids[k] = r.id; }
                    catch (e) { if (e && e.code === 'gone') { shx.ids[k] = null; const r = await driveUpsert(dir, SHX_FILES[k], null, body); shx.ids[k] = r.id; } else throw e; }
                }));
            })();
            try { await shxQ; } catch (e) { ks.forEach(k => shxDirty.add(k)); throw e; } finally { shxQ = null; }
        }

        /* ---------- 📤 공유하기 (내가만든 칸) ---------- */
        /* 내가만든 칸 맨 위 띠 : 평소엔 📤 공유하기 · 고르는 중엔 '몇 개 골랐어요 · 💾 파일로 저장 · 취소' */
        function shxBar(kind) {
            const on = shx.on && shx.kind === kind;
            return `<div class="shx-bar${on ? ' on' : ''}" data-kind="${kind}">${on
                ? `<span class="shx-cnt">✔ <b>${shx.picks.length}</b>개 골랐어요</span><button type="button" class="shx-btn go" onclick="shxSend()"${shx.picks.length ? '' : ' disabled'}>💾 파일로 저장</button><button type="button" class="shx-btn" onclick="shxStop()">취소</button>`
                : `<button type="button" class="shx-btn go" onclick="shxStart('${kind}', this)">📤 공유하기</button><small>골라서 파일로 저장 → 카페에 올려요</small>`}</div>`;
        }
        function shxPaint() {
            document.querySelectorAll('.shx-bar[data-kind]').forEach(b => {
                const host = b.parentElement, kind = b.dataset.kind;
                b.outerHTML = shxBar(kind);
                if (!host) return;
                host.classList.toggle('shx-on', shx.on && shx.kind === kind);
                host.querySelectorAll('[data-shx]').forEach(it => it.classList.toggle('shx-ck', shx.on && shx.picks.includes(+it.dataset.shx)));
            });
        }
        function shxStart(kind) { shx.kind = kind; shx.on = true; shx.picks = []; shxPaint(); }
        function shxStop() { shx.on = false; shx.picks = []; shxPaint(); }
        /* 고르는 중에는 칸을 눌러도 붙이기 · 지우기 대신 체크만 (붙이기 · ✕ 보다 먼저 받아요) */
        document.addEventListener('click', e => {
            if (!shx.on) return;
            const it = e.target.closest && e.target.closest('[data-shx]');
            if (!it || !it.closest('.shx-on')) return;
            e.preventDefault(); e.stopPropagation();
            const i = +it.dataset.shx, k = shx.picks.indexOf(i);
            if (k >= 0) shx.picks.splice(k, 1);
            else if (shx.picks.length >= SHX_PER_FILE) { showMsg(`📤 한 파일에는 ${SHX_PER_FILE}개까지 담을 수 있어요.`); return; }
            else shx.picks.push(i);
            shxPaint();
        }, true);

        function shxSource(kind) {
            if (kind === 'tape') return typeof tpmS !== 'undefined' ? tpmS.list || [] : [];
            if (kind === 'leaf') return typeof lm !== 'undefined' ? lm.list || [] : [];
            return typeof smS !== 'undefined' ? smS.list || [] : [];
        }
        async function shxSend() {
            const src = shxSource(shx.kind), kind = shx.kind;
            const items = shx.picks.map(i => shxItem(kind, src[i])).filter(Boolean);
            if (!items.length) { showMsg('📤 저장할 스티커를 먼저 골라 주세요.'); return; }
            const a = await shxAsk('📤 ' + SHX_KINDS[kind] + ' ' + items.length + '개 파일로 저장', SHX_KINDS[kind].replace(/^\S+\s/, '') + ' 모음');
            if (!a) return;
            shxDownload({ malang_sticker: 1, kind, from: 'share', by: a.by, items }, a.name);
            shxStop();
            showMsg(`💾 <b>${shxEsc(a.name)}.json</b> 파일을 저장했어요!<br><br>말랑달콤 카페의 <b>${SHX_KINDS[kind].replace(/^\S+\s/, '')} 게시판</b>에 첨부해서 올려 주세요.<br><span style="font-size:12px;color:#777;">받은 사람은 같은 창의 <b>공유받은</b> 칸에서 불러와요.<br>아이패드 · 아이폰은 '파일' 앱 → 다운로드 폴더에 있어요.</span>`);
        }

        /* 파일 이름 · 만든 사람 묻기 (배경지 💾 파일로 저장도 같이 써요 js/pattern-maker.js) → { name, by } 또는 null */
        const SHX_NICK = 'malang_pattern_nick';                        // 배경지 만든 사람 닉네임과 같은 칸 (이 기기에 기억)
        function shxAsk(title, defName, defBy) {
            return new Promise(resolve => {
                let nick = defBy || '';
                if (!nick) try { nick = localStorage.getItem(SHX_NICK) || ''; } catch (e) {}
                const el = document.createElement('div');
                el.className = 'shx-pop';
                el.innerHTML = `<div class="alert-card shx-card"><b class="shx-t">${shxEsc(title)}</b>
                    <label>파일 이름<input type="text" id="shxName" maxlength="40" value="${shxEsc(defName)}" enterkeyhint="next"></label>
                    <label>만든 사람<input type="text" id="shxBy" maxlength="12" value="${shxEsc(nick)}" placeholder="닉네임 (안 써도 돼요)" enterkeyhint="done"></label>
                    <small>받은 사람의 공유받은 칸에 <b>by 닉네임</b>으로 보여요</small>
                    <div class="alert-btns"><button type="button" class="btn btn-primary" data-ok>💾 저장</button><button type="button" class="btn" data-no>취소</button></div></div>`;
                document.body.appendChild(el);
                const done = ok => {
                    const name = shxTxt(shxq('shxName').value, 40).replace(/[\\/:*?"|.]/g, '').trim(), by = shxTxt(shxq('shxBy').value, 12);
                    if (ok && !name) { shxq('shxName').focus(); return; }
                    el.remove();
                    if (ok) { try { if (by) localStorage.setItem(SHX_NICK, by); } catch (e) {} }
                    resolve(ok ? { name, by } : null);
                };
                el.querySelector('[data-ok]').onclick = () => done(true);
                el.querySelector('[data-no]').onclick = () => done(false);
                shxq('shxName').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); shxq('shxBy').focus(); } };
                shxq('shxBy').onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); } };
            });
        }
        function shxDownload(obj, name) {
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([JSON.stringify(obj)], { type: 'application/json' }));
            a.download = name + '.json';
            document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
        }

        /* ---------- 📥 공유받은 칸 ---------- */
        let shxBox = null;                                              // 지금 보이는 공유받은 칸 { kind, box }
        async function shxShareTab(kind, box) {
            shxBox = { kind, box };
            box.dataset.share = kind;
            const head = `<div class="shx-bar in"><button type="button" class="shx-btn go" onclick="shxPickFile()">📥 파일 불러오기</button><small>카페에서 받은 스티커 파일을 골라요</small></div>`;
            if (!shxSync()) { box.innerHTML = head.replace('onclick="shxPickFile()"', 'onclick="shxGuest()"') + `<div class="cs-empty">🔐 공유받은 스티커는 로그인하면 쓸 수 있어요.<br>내 구글 드라이브에 안전하게 보관돼요.</div>`; return; }
            box.innerHTML = '<div class="cs-empty">불러오는 중…</div>';
            const list = await shxLoad(kind);
            if (!shxBox || shxBox.box !== box || box.dataset.share !== kind) return;
            const L = list.map((s, i) => [s, i]);
            box.innerHTML = head + (L.length ? shxGrid(kind, L) : `<div class="cs-empty">📥 아직 공유받은 ${SHX_KINDS[kind].replace(/^\S+\s/, '')}가 없어요.<br>카페에서 받은 파일을 불러와 보세요!</div>`);
        }
        function shxGrid(kind, L) {
            const by = s => s.by ? `<small class="shx-by">by ${shxEsc(s.by)}</small>` : '';
            const del = i => `<i onclick="shxDel('${kind}', ${i})" title="지우기">✕</i>`;
            if (kind === 'tape') return L.map(([s, i]) => `<div class="tpm-it"><button type="button" class="tp-item" onclick="shxUse('${kind}', ${i})"><span style="background-image:url(&quot;${tpmUrl(s)}&quot;)"></span></button>${del(i)}${by(s)}</div>`).join('');
            if (kind === 'leaf') return `<div class="lf-picks">${L.map(([s, i]) => `<div class="lm-it"><button type="button" class="lf-pick" onclick="shxUse('${kind}', ${i})"><i class="lf-sw lf-my" style="--lf-img:url('${s.src}')"></i>${s.by ? 'by ' + shxEsc(s.by) : '받은 속지'}</button>${del(i)}</div>`).join('')}</div>`;
            return `<div class="smk-mine smk-in-modal">${L.map(([s, i]) => `<span class="smk-it${s.k === 'piece' ? ' smk-bag' : ''}"><button type="button" onclick="shxUse('${kind}', ${i})"><img src="${s.src}" alt=""></button>${s.ss ? `<b class="smk-n">${s.ss.length}${s.k === 'piece' ? 'pcs' : '장'}</b>` : ''}${del(i)}${by(s)}</span>`).join('')}</div>`;
        }
        function shxGuest() { showMsg('🔐 공유받은 스티커는 <b>로그인</b>하면 불러올 수 있어요.<br><span style="font-size:12px;color:#777;">받은 스티커는 내 구글 드라이브에 보관돼요.</span>'); }
        function shxUse(kind, i) {
            const s = shx.lists[kind] && shx.lists[kind][i]; if (!s) return;
            if (s.kd === 'tape') { if (typeof tpmStick === 'function') tpmStick(s); return; }
            if (s.kd === 'leaf') { if (window.pickLeaf) pickLeaf('my', s.src); return; }
            closeModal('stickerModal');
            if (s.kd === 'seal' && window.openStickerPeel) openStickerPeel(s.ss || s.src, { ts: !!s.t });
            else if (s.kd === 'paper' && window.openPaperSheet) openPaperSheet(s.src);
            else if (s.k === 'piece' && window.openPieceBag) openPieceBag(s.ss || [s.src]);
            else if (typeof smStick === 'function') (s.ss || [s.src]).forEach(smStick);
        }
        async function shxDel(kind, i) {
            const list = shx.lists[kind]; if (!list || !list[i]) return;
            if (!(await showMsg('이 스티커를 공유받은 칸에서 지울까요?<br><span style="font-size:12px;color:#777;">이미 일기에 붙인 것은 그대로 남아요.</span>', true))) return;
            list.splice(i, 1);
            if (shxBox) shxShareTab(shxBox.kind, shxBox.box);
            shxSave(kind).catch(() => showMsg('⚠ 지운 것을 드라이브에 저장하지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인한 뒤 다시 지워 주세요.</span>'));
        }
        function shxPickFile() {
            let inp = shxq('shxFile');
            if (!inp) {
                inp = document.createElement('input');
                inp.type = 'file'; inp.id = 'shxFile'; inp.hidden = true;
                inp.accept = '.json,.txt,application/json,text/plain';
                inp.onchange = () => { const f = inp.files && inp.files[0]; inp.value = ''; if (f) shxImport(f); };
                document.body.appendChild(inp);
            }
            inp.click();
        }
        async function shxImport(f) {
            if (!shxSync()) { shxGuest(); return; }
            if (f.size > SHX_FILE_MAX) { showMsg('⚠ 파일이 너무 커요 (20MB까지).'); return; }
            let o = null;
            try { o = JSON.parse(await f.text()); } catch (e) {}
            if (o && o.malang_pattern) { showMsg('🎨 배경지 파일이에요.<br><b>페이지 → 배경지 → 내 배경지</b>의 📥 파일 불러오기로 넣어 주세요.'); return; }
            if (!o || o.malang_sticker !== 1 || !SHX_KINDS[o.kind] || !Array.isArray(o.items)) { showMsg('⚠ 말랑달콤 스티커 파일이 아니에요.<br><span style="font-size:12px;color:#777;">카페에서 받은 .json 파일을 골라 주세요.</span>'); return; }
            const kind = o.kind, by = shxTxt(o.by, 12);
            const list = await shxLoad(kind), have = new Set(list.map(s => s.h));
            let room = SHX_MAX - list.length, add = 0, same = 0, bad = 0, full = 0;
            const fresh = [];
            o.items.slice(0, 100).forEach((x, n) => {
                const it = shxItem(kind, x); if (!it) { bad++; return; }
                const h = shxKey(kind, it);
                if (have.has(h)) { same++; return; }
                if (room <= 0) { full++; return; }
                have.add(h); room--; add++;
                fresh.push(Object.assign(it, { kd: kind, by, h, id: kind === 'tape' ? it.id : (Date.now() + n).toString(36) }));
            });
            if (add) {
                list.unshift(...fresh);
                try { await shxSave(kind); }
                catch (e) { list.splice(0, fresh.length); showMsg('⚠ 드라이브에 저장하지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인한 뒤 다시 불러와 주세요.</span>'); return; }
            }
            if (shxBox && shxBox.box.isConnected && shxBox.box.dataset.share === shxBox.kind) shxShareTab(shxBox.kind, shxBox.box);
            const name = SHX_KINDS[kind], other = shxBox && shxBox.kind !== kind;
            const lines = [];
            if (add) lines.push(`🎉 ${name} <b>${add}개</b>를 공유받은 칸에 넣었어요!${by ? `<br><small>by ${shxEsc(by)}</small>` : ''}`);
            if (same) lines.push(`이미 있는 ${same}개는 건너뛰었어요.`);
            if (full) lines.push(`공유받은 ${name.replace(/^\S+\s/, '')}는 최대 ${SHX_MAX}개라서 ${full}개는 못 넣었어요.<br><span style="font-size:12px;color:#777;">안 쓰는 것을 ✕ 로 지운 뒤 다시 불러와 주세요.</span>`);
            if (bad) lines.push(`<span style="font-size:12px;color:#777;">읽을 수 없는 ${bad}개는 뺐어요.</span>`);
            if (add && other) lines.push(`<span style="font-size:12px;color:#777;">${SHX_WHERE[kind]} → 공유받은 칸에서 볼 수 있어요.</span>`);
            showMsg(lines.join('<br>') || '⚠ 넣을 스티커가 없었어요.');
        }

        window.shxBar = shxBar; window.shxStart = shxStart; window.shxStop = shxStop; window.shxSend = shxSend; window.shxAsk = shxAsk; window.shxDownload = shxDownload;
        window.shxShareTab = shxShareTab; window.shxPickFile = shxPickFile; window.shxGuest = shxGuest; window.shxUse = shxUse; window.shxDel = shxDel;
