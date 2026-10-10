/* 말랑달콤 다이어리 - js/settings.js
   PC 백업/불러오기 · PNG 저장 · 용량 확인 · 페이지 · 자동 저장 주기 · 창 열기/닫기
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        async function exportJSON() {
            saveData(false);
            if (drive.ready && !drive.guest) {
                const st = document.getElementById('driveStatusText');
                if (st) st.textContent = '📂 드라이브의 모든 일기를 불러오는 중…';
                let failed = -1;
                try { failed = await loadAllDays(); } catch (e) {}
                updateStorageInfo();
                if (failed !== 0) { showMsg('⚠ 일부 일기를 불러오지 못해 백업을 만들지 못했어요.<br>잠시 후 다시 시도해 주세요.'); return; }
            }
            const blob = new Blob([store.toJSONString()], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `SoftSweetDiary_Backup_${getDateKey(currentDate)}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        }

        function triggerImportJSON() { document.getElementById('jsonInput').click(); }

        function importJSON(e) {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async function(evt) {
                try {
                    const importedData = JSON.parse(evt.target.result);
                    if (!importedData || typeof importedData !== 'object' || Array.isArray(importedData)) throw new Error('format');
                    Object.keys(importedData).forEach(key => {
                        if (key.startsWith('diary_') && key !== PAGE_SIZE_KEY) {
                            store.setItem(key, JSON.stringify(importedData[key]));
                            if (isDayKey(key)) drive.loadedDays.add(key);      // 가져온 내용이 그 날짜의 최신 내용
                        }
                    });
                } catch (err) { showMsg('⚠ 올바르지 않은 JSON 파일입니다.'); return; }

                applyLoadedData();
                if (drive.ready && !drive.guest) {
                    const ok = await flushUpload({ force: true });   // 날짜별 파일로 드라이브에 저장
                    showMsg(ok
                        ? '📥 데이터 복원이 완료되었고,<br>구글 드라이브의 날짜별 파일도 갱신했어요!'
                        : '📥 복원은 되었지만 드라이브 저장에 실패했어요.<br>잠시 후 자동으로 다시 시도합니다.');
                } else {
                    showMsg('📥 데이터 복원이 완료되었어요.<br>(드라이브에 연결되지 않아 저장은 되지 않았어요)');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        }

        function roundedRectPath(ctx, x, y, w, h, radii) {
            const [tl, tr, br, bl] = radii;
            ctx.beginPath();
            ctx.moveTo(x + tl, y);
            ctx.lineTo(x + w - tr, y);
            ctx.arcTo(x + w, y, x + w, y + tr, tr);
            ctx.lineTo(x + w, y + h - br);
            ctx.arcTo(x + w, y + h, x + w - br, y + h, br);
            ctx.lineTo(x + bl, y + h);
            ctx.arcTo(x, y + h, x, y + h - bl, bl);
            ctx.lineTo(x, y + tl);
            ctx.arcTo(x, y, x + tl, y, tl);
            ctx.closePath();
        }

        function exportToPNG() {
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어주세요!'); return; }
            if (turn) return;
            if (selectedElement) selectedElement.classList.remove('selected');

            const navButtons = document.querySelectorAll('.page-nav-btn');
            navButtons.forEach(btn => btn.style.visibility = 'hidden');

            const innerPage = document.getElementById('innerPage');
            const prevShadow = innerPage.style.boxShadow;
            innerPage.style.boxShadow = 'none';
            innerPage.classList.add('png-mode');

            const restore = () => {
                innerPage.style.boxShadow = prevShadow;
                innerPage.classList.remove('png-mode');
                navButtons.forEach(btn => btn.style.visibility = 'visible');
                if (selectedElement) selectedElement.classList.add('selected');
            };

            html2canvas(innerPage, {
                backgroundColor: null,
                useCORS: true,
                scale: 2
            }).then(canvas => {
                const s = canvas.width / innerPage.offsetWidth;
                const out = document.createElement('canvas');
                out.width = canvas.width;
                out.height = canvas.height;
                const ctx = out.getContext('2d');
                roundedRectPath(ctx, 0, 0, out.width, out.height, [15 * s, 22 * s, 22 * s, 15 * s]);
                ctx.clip();
                ctx.drawImage(canvas, 0, 0);

                const link = document.createElement('a');
                link.download = `${getDateKey(currentDate)}.png`;
                link.href = out.toDataURL('image/png');
                link.click();
                restore();
            }).catch(() => {
                restore();
                showMsg('⚠ PNG 저장에 실패했습니다.');
            });
        }

        /* 💾 저장 용량 : 내 구글 저장공간 게이지 + 말랑달콤 전체(다이어리 + 인형) 크기 (설정창을 열 때 갱신)
           - 구글 저장공간은 지금 받는 권한(drive.file) 그대로 읽을 수 있어요 (about.storageQuota · 추가 허락 없음)
           - 회사·학교 계정처럼 용량 제한이 없으면 게이지 없이 숫자만 */
        let storageStats = null;   // { days, diaryBytes, dolls, dollBytes, plays, playBytes, quota: { used, limit } | null }
        const fmtBytes = b => !b ? '0KB' : b >= 1073741824 ? (b / 1073741824).toFixed(b >= 107374182400 ? 0 : 1) + 'GB'
            : b >= 1048576 ? (b / 1048576).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1024)) + 'KB';

        async function folderFileStats(names) {
            const id = await getFolder(names, false);
            if (!id) return { n: 0, bytes: 0 };
            const files = await driveList(`'${id}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,size');
            return { n: files.length, bytes: files.reduce((s, f) => s + (parseInt(f.size, 10) || 0), 0) };
        }
        async function readDriveQuota() {
            try {
                const res = await gfetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota');
                if (!res.ok) return null;
                const q = (await res.json()).storageQuota || {};
                return { used: parseInt(q.usage, 10) || 0, limit: parseInt(q.limit, 10) || 0 };   // limit 0 = 제한 없음
            } catch (e) { return null; }
        }

        async function refreshStorageStats() {
            if (!drive.ready || drive.guest) { storageStats = null; updateStorageInfo(); return; }
            const none = { n: 0, bytes: 0 };
            const dollStats = key => (typeof DOLL_FOLDERS !== 'undefined' && DOLL_FOLDERS[key])
                ? folderFileStats(DOLL_FOLDERS[key]).catch(() => none) : Promise.resolve(none);
            try {
                const [all, quota, dolls, plays] = await Promise.all([driveEnumerateAll(), readDriveQuota(), dollStats('deco'), dollStats('play')]);
                storageStats = {
                    days: all.length, diaryBytes: all.reduce((s, f) => s + f.size, 0),
                    dolls: dolls.n, dollBytes: dolls.bytes, plays: plays.n, playBytes: plays.bytes, quota
                };
            } catch (e) {}
            updateStorageInfo();
        }

        function updateStorageInfo() {
            const t = document.getElementById('lsText');
            const d = document.getElementById('lsDetail');
            const gauge = document.getElementById('lsGauge');
            const warn = document.getElementById('lsWarn');
            if (gauge) gauge.style.display = 'none';
            if (warn) warn.style.display = 'none';
            if (storageStats) {
                const S = storageStats, q = S.quota;
                if (q && q.limit > 0) {
                    const pct = Math.min(100, q.used / q.limit * 100);
                    if (gauge) {
                        gauge.style.display = 'block';
                        const bar = gauge.querySelector('.ls-gauge-fill');
                        bar.style.width = Math.max(pct, 1) + '%';
                        bar.className = 'ls-gauge-fill' + (pct >= 90 ? ' full' : pct >= 70 ? ' warn' : '');
                    }
                    if (t) t.innerText = `${fmtBytes(q.used)} / ${fmtBytes(q.limit)} (${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%)`;
                    if (warn && pct >= 90) {
                        warn.style.display = 'block';
                        warn.innerHTML = pct >= 99
                            ? '⚠ 구글 저장공간이 <b>가득 찼어요!</b> 이대로면 일기를 저장할 수 없어요.<br>지메일·구글 포토 등에서 필요 없는 파일을 지워 주세요.'
                            : '⚠ 구글 저장공간이 거의 찼어요. 가득 차면 일기를 저장할 수 없어요.';
                    }
                } else if (t) {
                    t.innerText = q ? `${fmtBytes(q.used)} 사용 중 (용량 제한 없는 계정)` : '구글 저장공간을 읽지 못했어요';
                }
                const mine = S.diaryBytes + S.dollBytes + S.playBytes;
                if (d) d.innerHTML = `└ 그중 <b>말랑달콤</b> : ${fmtBytes(mine)}<br>`
                    + `<span style="color:#999;">(📔 일기 ${S.days}일치 ${fmtBytes(S.diaryBytes)} · 👧 인형 ${S.dolls}개 ${fmtBytes(S.dollBytes)}`
                    + (S.plays ? ` · 🎭 인형극 ${S.plays}개 ${fmtBytes(S.playBytes)}` : '') + ')</span>';
            } else {
                if (t) t.innerText = drive.guest ? '로그인하면 볼 수 있어요' : drive.ready ? '계산 중…' : '-';
                if (d) d.innerText = '';
            }
            const st = document.getElementById('driveStatusText');
            if (st) st.textContent = drive.guest ? '☁ 구글 드라이브에 연결되지 않음 (저장 안 됨)'
                : drive.ready ? `☁ 연결됨 · ${USE_APP_DATA_FOLDER ? '앱 전용 공간' : '내 드라이브'} / ${ROOT_PATH_TEXT} / 년도 / 월 / 일.json` : '☁ 연결 안 됨';
        }

        /* =====================================================================
           🎨 페이지 (다이어리 색 5개 : 전체 배경 · 겉표지 · 속지 · 테두리 · 포인트)
           - 페이지 목록 : 기본 페이지 4종 + 🌟 모두의 페이지(카페에서 받아 등록, js/community-skins.js) + 🎨 내 페이지
           - 내 페이지     : 말랑달콤 / 페이지 / 페이지 / 내페이지 · 받은페이지 / 목록(작은 그림 100개씩) · 원본(하나에 파일 하나) (js/coll.js)
               화면의 customSkins 에는 읽어 온 원본만 있어요 (지금 쓰는 페이지 · 눌러서 고른 페이지) · 목록 칸은 작은 그림으로 그려요
           - 지금 고른 페이지 : 'diary_skin' → 설정.json  (다음에 열어도 · 다른 기기에서도 그대로)
               예) {"id":"mint"} · {"id":"20261009-120533"} · {"id":"cs:3","c":{색 5개}}
               모두의 페이지는 색도 같이 적어 둬서, 목록에서 빠져도 쓰던 색이 유지돼요. (내 페이지는 그림이 커서 이름만)
           ===================================================================== */
        const SKIN_KEY = 'diary_skin';
        const SKIN_PRESET_NAMES = { pink: '🌸 러블리 핑크', mint: '🌿 맑은 민트', purple: '💜 파스텔 퍼플', yellow: '⭐ 따뜻한 옐로우' };
        const SKIN_NAME_MAX = 20;
        const MY_SKIN_MAX = Infinity;      // 🎨 내 페이지 개수 제한 없음 (끝없이 저장)
        /* 새 내 페이지를 더 넣을 수 없으면 알리고 true (같은 이름 덮어쓰기는 괜찮아요) */
        function mySkinFull(name) {
            if (hasOwn(customSkins, name) || Object.keys(customSkins).length < MY_SKIN_MAX) return false;
            showMsg(`내 페이지는 ${MY_SKIN_MAX}개까지 가질 수 있어요.<br>(내가만든 · 공유받은 합쳐서)<br>안 쓰는 페이지를 지우고 다시 해 주세요.`);
            return true;
        }
        let currentSkinId = 'pink';
        let currentSkinInline = null;      // 목록에 없는 페이지를 쓰는 중일 때 그 색 (예: 내려간 모두의 페이지)

        /* 🐷 말랑달콤 저금통 : 마음을 넣어 준 사람에게만 보이는 선물 (🎀 마스킹테이프)
           - 선물은 두 가지 : '전체'(저금 확인 때 · 그 종류 전부가 열려요) 와 '디자인 하나하나'(🎁 아이템 주기 · 캡슐 스티커처럼 디자인마다 따로 기간)
             한 디자인의 끝나는 날 = 전체와 그 디자인 중 더 늦은 날
           - 사람들이 만들어 나눈 페이지 · 배경지(카페에서 등록)은 만든 사람의 고운 마음이라 언제나 누구나 써요
           - 화면에서 class="tape-only" 는 🎀 이 하나라도 열린 사람에게만 보여요 (css : body.tape-on)
           - 이미 다이어리에 붙인 테이프는 기간이 끝나도 그대로 둬요 (새로 고르는 것만 막아요)
           - 끝나는 날은 '말랑달콤 사람들' 서버가 접속 신호의 답으로 알려 줘요 → setGift(전체🎀, {테이프id: 날}) (js/presence.js)
             그 날(한국 시간)까지 열려요 · 빈 값이면 닫혀요 · 🐷 저금통 창 : js/piggy.js */
        const GIFT_LOCAL = 'malang_gift';      // 이 기기에 마지막으로 받은 선물 → 다이어리를 열자마자 바로 보여 줘요 (서버 답이 오면 고쳐요)
        let giftBox = { ta: '', tp: {} };      // ta : 🎀 전체 끝나는 날 / tp : 디자인별 끝나는 날
        const giftToday = () => new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
        const giftOk = d => !!d && d >= giftToday();
        const giftLeft = d => giftOk(d) ? Math.round((Date.parse(d) - Date.parse(giftToday())) / 864e5) : -1;   // 0 = 오늘이 마지막 날 · 닫혔으면 -1
        const dLabel = n => n < 0 ? '' : n ? 'D-' + n : 'D-day';
        const giftEnd = (all, one) => [all, one].filter(giftOk).sort().pop() || '';      // 전체와 디자인 하나 중 더 늦은 날 · 없으면 ''
        const tapeUntil = id => giftEnd(giftBox.ta, giftBox.tp[id]);
        const tapeHas = id => !!tapeUntil(id);
        const tapeLeft = id => giftLeft(tapeUntil(id));
        const giftAlive = (all, map) => giftOk(all) || Object.keys(map).some(k => giftOk(map[k]));
        const tapeOn = () => giftAlive(giftBox.ta, giftBox.tp);
        const giftCount = map => Object.keys(map).filter(k => giftOk(map[k])).length;
        function setGift(ta, tp) {
            const day = d => /^\d{4}-\d{2}-\d{2}$/.test(d || '') ? d : '';
            const map = o => { const r = {}; if (o && typeof o === 'object') Object.keys(o).forEach(k => { if (/^[\w-]{1,30}$/.test(k) && day(o[k])) r[k] = o[k]; }); return r; };
            giftBox = { ta: day(ta), tp: map(tp) };
            document.body.classList.toggle('tape-on', tapeOn());
            try { if (tapeOn()) localStorage.setItem(GIFT_LOCAL, JSON.stringify(giftBox)); else localStorage.removeItem(GIFT_LOCAL); } catch (e) {}
            if (typeof pigThanks === 'function') pigThanks();
        }
        const giftRefresh = () => setGift(giftBox.ta, giftBox.tp);      // 기간이 끝난 건 닫기
        /* 🎁 선물 도착 신호(g = { t: { all|이름: [끝나는 날, 늘어남] } })를 지금 가진 것에 합치기 */
        function giftApply(g) {
            let ta = giftBox.ta; const tp = Object.assign({}, giftBox.tp);
            Object.keys(g.t || {}).forEach(k => { const u = g.t[k] && g.t[k][0]; if (k === 'all') ta = u; else tp[k] = u; });
            setGift(ta, tp);
        }
        try { const g = JSON.parse(localStorage.getItem(GIFT_LOCAL) || 'null') || {}; setGift(g.ta, g.tp); } catch (e) {}
        const skinCommunity = () => (typeof getCommunitySkins === 'function' ? getCommunitySkins() : []);
        const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

        /* id → { skin, kind:'preset'|'my'|'cs'|'inline', name } */
        function findSkin(id, inline) {
            if (typeof id !== 'string' || !id) return null;
            if (hasOwn(skinPresets, id)) return { skin: skinPresets[id], kind: 'preset', name: SKIN_PRESET_NAMES[id] || id };
            if (id.startsWith('th:')) {                                   // 🎁 테마 페이지 (보관함에 있는 것만 · js/skinstudio.js)
                const th = typeof themeSkinOf === 'function' ? themeSkinOf(id.slice(3)) : null;
                return th ? { skin: th.skin, kind: 'th', name: th.name } : null;
            }
            if (id.startsWith('cs:')) {
                const hit = skinCommunity().find(s => s.id === id);
                if (hit) return { skin: hit.skin, kind: 'cs', name: hit.name, by: hit.by };
            } else if (hasOwn(customSkins, id)) {
                return { skin: customSkins[id], kind: 'my', name: id };
            }
            const c = inline && typeof sanitizeSkin === 'function' ? sanitizeSkin(inline) : null;
            return c ? { skin: c, kind: 'inline', name: '지금 쓰는 페이지' } : null;
        }

        function setSkinVars(skin) {
            const root = document.documentElement;
            root.style.setProperty('--bg-color', skin.bg);
            root.style.setProperty('--cover-bg', skin.cover);
            root.style.setProperty('--page-bg', skin.page);
            root.style.setProperty('--border-color', skin.border);
            root.style.setProperty('--primary-accent', skin.accent);
            SK_OPT.forEach(o => skSetOpt(o, skin[o.k] || null, skin.page));   // 하단메뉴 · 팝업메뉴 색 : 따로 정한 색이 없으면 기본 모양(테두리는 테두리 색을 따라감)
            if (typeof stuApply === 'function') stuApply(skin);               // 🎀 놓아 둔 꾸밈 · 바꾼 아이콘 (js/skinstudio.js)
        }

        /* 색 고르기 칸도 지금 스킨 색으로 맞춤 (고른 스킨을 조금 바꿔서 내 스킨으로 등록할 수 있게) */
        function syncSkinPickers(skin) {
            const hex = v => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : null;
            const set = (id, v) => { const el = document.getElementById(id); if (el && hex(v)) el.value = v; };
            set('customBg', skin.bg); set('customCover', skin.cover); set('customPage', skin.page);
            set('customBorder', skin.border); set('customAccent', skin.accent);
            SK_OPT.forEach(o => {
                const base = o.def || (o.follow === 'page' ? skin.page : skin.border);
                const own = !!(hex(skin[o.k]) && skin[o.k].toLowerCase() !== String(base).toLowerCase());
                skOwn[o.k] = own;
                set(o.id, own ? skin[o.k] : base);
            });
        }

        /* 스킨 고르기 (목록 선택 · 등록 직후 · 불러올 때 공용)
           opts.save === false : 저장하지 않음 (드라이브에서 불러올 때) */
        function applySkinPreset(id, opts = {}) {
            const hit = findSkin(id, opts.inline || (id === currentSkinId ? currentSkinInline : null));
            const sel = document.getElementById('skinSelect');
            if (!hit) { if (sel) sel.value = currentSkinId; return false; }
            if (opts.save !== false && typeof seasonStop === 'function') seasonStop();   // 다른 페이지를 고르면 계절 테마 끄기 (js/season.js)
            setSkinVars(hit.skin);
            syncSkinPickers(hit.skin);
            currentSkinId = id;
            currentSkinInline = hit.kind === 'preset' || hit.kind === 'th' ? null : hit.skin;
            renderSkinSelect();
            if (opts.save !== false) {
                const rec = hit.kind === 'preset' || hit.kind === 'th' || hit.kind === 'my' ? { id } : { id, c: hit.skin };   // 🎨 내 페이지는 id 만 (그림은 원본 파일에 있어요 → 설정.json 은 가볍게)
                if (hit.kind === 'my' && hit.skin.got) rec.g = 1;                                                       // 받은페이지 칸 것 (다음에 열 때 어디서 읽을지)
                store.setItem(SKIN_KEY, JSON.stringify(rec));
            }
            return true;
        }

        /* 드라이브에서 불러온 '지금 고른 스킨' 적용 (없으면 기본 핑크 그대로) */
        function restoreSkin() {
            let rec = null;
            try { rec = JSON.parse(store.getItem(SKIN_KEY)); } catch (e) { rec = null; }
            if (!(rec && typeof rec.id === 'string' && applySkinPreset(rec.id, { save: false, inline: rec.c }))) {
                renderSkinSelect();
            }
            if (typeof seasonRestore === 'function') seasonRestore();          // 🌸 계절 테마가 켜져 있으면 그 색으로 (js/season.js)
        }

        /* 페이지 목록 다시 그리기 (📔 페이지 창이 열려 있을 때만 · js/skins.js renderPageList) */
        function renderSkinSelect() {
            if (typeof sklIsOpen === 'function' && sklIsOpen()) renderPageList();
        }

        /* 🔘 하단메뉴 · 📍 팝업메뉴 · 🪟 창 색 (따로 고르기 전에는 기본 모양 · 테두리는 '테두리 색상'을 따라가요)
           menu = 하단메뉴 테두리 · mf1~mf4 = 하단메뉴 버튼 4개 각각의 안쪽 · pbd = 팝업메뉴 테두리 · pfill = 팝업메뉴 안쪽 · psel = 팝업메뉴 선택했을 때
           wbd = 창 테두리 · wfill = 창 안쪽 · ink = 그 색 위에 올라가는 글자색(밝기를 보고 저절로 정함) */
        const SK_OPT = [
            { k: 'menu', id: 'customMenu', v: '--menu-border', follow: 'border' },
            { k: 'mf1', id: 'customMenuFill1', v: '--menu-fill-1', def: '#fde9a8', ink: '--menu-ink-1' },
            { k: 'mf2', id: 'customMenuFill2', v: '--menu-fill-2', def: '#fbd3dd', ink: '--menu-ink-2' },
            { k: 'mf3', id: 'customMenuFill3', v: '--menu-fill-3', def: '#cdebc3', ink: '--menu-ink-3' },
            { k: 'mf4', id: 'customMenuFill4', v: '--menu-fill-4', def: '#dccdf5', ink: '--menu-ink-4' },
            { k: 'pbd', id: 'customPopBorder', v: '--pop-border', follow: 'border' },
            { k: 'pfill', id: 'customPopFill', v: '--pop-fill', follow: 'page', ink: '--pop-ink' },
            { k: 'psel', id: 'customPopSel', v: '--pop-sel', def: '#ffe9f0', ink: '--pop-sel-ink' },
            { k: 'wbd', id: 'customWinBorder', v: '--win-border', follow: 'border' },
            { k: 'wfill', id: 'customWinFill', v: '--win-fill', follow: 'page', ink: '--win-ink' }
        ];
        /* 어두운 바탕이면 흰 글자 · 밝은 바탕이면 짙은 글자 */
        function skInk(hex) {
            const n = parseInt(String(hex).slice(1), 16);
            const l = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
            return l < 0.55 ? '#ffffff' : '#5a3d4a';
        }
        function skSetOpt(o, val, pageVal) {
            const root = document.documentElement;
            if (val) { root.style.setProperty(o.v, val); if (o.ink) root.style.setProperty(o.ink, skInk(val)); }
            else {
                root.style.removeProperty(o.v);
                if (o.ink && o.follow === 'page' && pageVal) root.style.setProperty(o.ink, skInk(pageVal));   // 속지색을 따라갈 땐 속지색 밝기로 글자색
                else if (o.ink) root.style.removeProperty(o.ink);
            }
        }
        const skOwn = {};
        function skFollowInput(srcId, mode) {
            SK_OPT.forEach(o => { if (o.follow === mode && !skOwn[o.k]) document.getElementById(o.id).value = document.getElementById(srcId).value; });
            previewCustomColor();
        }
        function customBorderInput() { skFollowInput('customBorder', 'border'); }
        function customPageInput() { skFollowInput('customPage', 'page'); }
        function customOptInput(k) { skOwn[k] = true; previewCustomColor(); }

        function previewCustomColor() {
            const root = document.documentElement;
            root.style.setProperty('--bg-color', document.getElementById('customBg').value);
            root.style.setProperty('--cover-bg', document.getElementById('customCover').value);
            root.style.setProperty('--page-bg', document.getElementById('customPage').value);
            root.style.setProperty('--border-color', document.getElementById('customBorder').value);
            root.style.setProperty('--primary-accent', document.getElementById('customAccent').value);
            SK_OPT.forEach(o => skSetOpt(o, skOwn[o.k] ? document.getElementById(o.id).value : null, document.getElementById('customPage').value));
        }

        /* 스킨 이름 : 따옴표·꺾쇠 같은 기호는 빼고 20자까지 */
        function cleanSkinName(v) {
            return String(v == null ? '' : v).replace(/[<>"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, SKIN_NAME_MAX);
        }
        function skinNameTaken(name) { return hasOwn(skinPresets, name) || hasOwn(customSkins, name); }
        function freeSkinName(name) {
            if (!skinNameTaken(name)) return name;
            for (let n = 2; n < 100; n++) { const t = cleanSkinName(name.slice(0, SKIN_NAME_MAX - 5)) + ` (${n})`; if (!skinNameTaken(t)) return t; }
            return name + Date.now().toString(36).slice(-3);
        }

        /* 색 고르기 칸 → 스킨 색 (따로 고른 하단메뉴 · 팝업메뉴 · 창 색만 담김) */
        function skinFromPickers() {
            const skin = {
                bg: document.getElementById('customBg').value,
                cover: document.getElementById('customCover').value,
                page: document.getElementById('customPage').value,
                border: document.getElementById('customBorder').value,
                accent: document.getElementById('customAccent').value
            };
            SK_OPT.forEach(o => { if (skOwn[o.k]) skin[o.k] = document.getElementById(o.id).value; });
            return skin;
        }

        /* ---------- 🎨 내 페이지 모음 (js/coll.js) ---------- */
        const pgColl = got => collOf(PAGE_PATH.concat('페이지', got ? '받은페이지' : '내페이지'));
        /* 목록에 보일 작은 페이지 : 색 + 꾸밈 자리 (꾸밈 그림만 48px 로 줄여요) */
        async function pgThumb(skin) {
            const th = Object.assign({}, skin), used = new Set((skin.deco || []).map(d => String(d.i)).filter(i => i.startsWith('u:')).map(i => i.slice(2)));
            delete th.icons; delete th.got;
            if (skin.imgs) { th.imgs = {}; for (const k of Object.keys(skin.imgs)) if (used.has(k)) th.imgs[k] = await collThumb(skin.imgs[k], 48) || skin.imgs[k]; }
            return th;
        }
        const pgHash = skin => collHash(JSON.stringify(sanitizeSkin(skin)));
        /* 페이지 원본을 읽어서 customSkins 에 (이미 있으면 바로) : 성공하면 true */
        async function pgEnsure(id, got) {
            if (hasOwn(customSkins, id)) return true;
            for (const g of got == null ? [false, true] : [!!got]) {
                let skin = null;
                try { skin = await collItem(pgColl(g), id); } catch (e) {}
                const c = skin && sanitizeSkin(skin);
                if (c) { customSkins[id] = g ? Object.assign(c, { got: 1 }) : c; return true; }
            }
            return false;
        }
        /* 로그인할 때 · 다른 기기에서 고른 페이지가 바뀌었을 때 : 지금 고른 내 페이지 원본 먼저 */
        async function pgPrepare() {
            let rec = null;
            try { rec = JSON.parse(store.getItem(SKIN_KEY)); } catch (e) {}
            const id = rec && typeof rec.id === 'string' ? rec.id : '';
            if (id && !hasOwn(skinPresets, id) && !/^(cs|th):/.test(id)) await pgEnsure(id, rec.g ? true : null);
        }
        if (typeof COLL !== 'undefined') COLL.loginHooks.push(() => { customSkins = {}; return pgPrepare(); });

        /* 내 페이지 저장 (🎨 색상설정 · 🎀 꾸미기 공용) : 지금 내가만든 페이지를 쓰는 중이면 그 페이지를 고칠지 물어요 */
        async function saveMySkin(skin) {
            const cur = hasOwn(customSkins, currentSkinId) && !customSkins[currentSkinId].got ? currentSkinId : '';
            let id = '';
            if (cur && await showMsg('🎨 지금 쓰는 내 페이지를 이 모양으로 바꿀까요?<br><span style="font-size:12px;color:#777;">취소를 누르면 새 페이지로 하나 더 저장해요.</span>', true)) id = cur;
            const th = await pgThumb(skin), x = { h: pgHash(skin) };
            try {
                if (id) await collSet(pgColl(false), id, skin, th, x);          // 화면은 바로 · 드라이브는 뒤에서
                else { if (mySkinFull('')) return false; id = await collAdd(pgColl(false), skin, th, x); }
            } catch (e) { showMsg('⚠ 내 페이지를 저장하지 못했어요. 잠시 뒤 다시 해 주세요.'); return false; }
            customSkins[id] = skin;
            applySkinPreset(id);
            return true;
        }
        async function saveCustomSkin() {
            const newSkin = skinFromPickers();
            if (typeof stuExtra === 'function') Object.assign(newSkin, stuExtra());   // 🎀 페이지 꾸미기에서 놓은 꾸밈 · 아이콘도 함께
            if (await saveMySkin(newSkin)) showMsg('🎨 내 페이지에 저장했어요!<br><span style="font-size:12px;color:#777;">📔 페이지 → 내가만든 칸에서 언제든 고를 수 있어요.</span>');
        }

        async function deleteSkin(id, got) {
            if (!(await showMsg('이 페이지를 지울까요?', true))) return;
            try { await collRemove(pgColl(!!got), id); } catch (e) { showMsg('⚠ 지우지 못했어요. 잠시 뒤 다시 해 주세요.'); return; }
            delete customSkins[id];
            if (currentSkinId === id) applySkinPreset('pink');
            renderSkinSelect();
        }

        /* 드라이브에서 읽은 뒤 (customSkins 는 로그인할 때 지금 고른 페이지 원본만 채워요 · pgPrepare) */
        function loadCustomSkins() {
            restoreSkin();
            if (typeof loadBgPattern === 'function') loadBgPattern();   // 전체 배경지 (js/skins.js)
        }

        /* ---------- 💾 페이지 파일로 저장 · 📥 페이지 파일 불러오기 ----------
           파일 : 사용자가 정한 이름.json  내용 : {"malang_skin":1,"skin":{색 · 꾸밈}}  → 카페에 첨부 → 받은 사람은 📔 페이지 → 공유받은 → 📥 파일 불러오기
           (이름 · 만든 사람은 담지 않아요 · 썸네일만) */
        async function downloadSkinFile(id) {
            await pgEnsure(id, false);
            const c = hasOwn(customSkins, id) ? sanitizeSkin(customSkins[id]) : null;
            if (!c) { showMsg('⚠ 이 페이지를 읽을 수 없어요.'); return; }
            if (!window.shxAsk) return;
            const a = await shxAsk('💾 페이지 파일로 저장', '페이지', '', true);
            if (!a) return;
            shxDownload({ malang_skin: 1, skin: c }, a.name);
            showMsg('💾 <b>' + a.name.replace(/[<>&]/g, '') + '.json</b> 파일을 저장했어요!<br><br>말랑달콤 카페의 <b>페이지 게시판</b>에 첨부해서 올려 주세요.<br><span style="font-size:12px;color:#777;">받은 사람은 📔 페이지 → 공유받은 → 📥 파일 불러오기로 넣어요.</span>');
        }

        /* 카페에서 받은 페이지 파일 → 공유받은 칸 */
        function parseSkinText(txt) {
            const m = String(txt || '').match(/\{[\s\S]*\}/);
            if (!m) return null;
            try {
                const o = JSON.parse(m[0]);
                const c = sanitizeSkin(o && o.skin ? o.skin : o);
                return c ? { skin: c } : null;
            } catch (e) { return null; }
        }
        async function addReceivedSkin(p) {
            if (!p) { showMsg('⚠ 페이지 파일이 아니거나 깨진 파일이에요.'); return; }
            const h = pgHash(p.skin);
            let same = null;
            try {
                for (const g of [true, false]) { const e = (await collAll(pgColl(g))).find(x => x.x && x.x.h === h); if (e) { same = { id: e.id, g }; break; } }
            } catch (e) { showMsg('⚠ 페이지 목록을 읽지 못했어요.<br><span style="font-size:12px;color:#777;">인터넷 연결을 확인한 뒤 다시 불러와 주세요.</span>'); return; }
            if (same) { if (await pgEnsure(same.id, same.g)) applySkinPreset(same.id); showMsg('📔 이미 가지고 있는 페이지예요.'); return; }
            if (mySkinFull('')) return;
            const skin = Object.assign({}, p.skin, { got: 1 });                      // got : 공유받은 칸에 보여요
            let id;
            try { id = await collAdd(pgColl(true), skin, await pgThumb(skin), { h }); }
            catch (e) { showMsg('⚠ 페이지를 넣지 못했어요. 잠시 뒤 다시 해 주세요.'); return; }
            customSkins[id] = skin;
            applySkinPreset(id);
            showMsg('📥 페이지를 공유받은 칸에 넣고 적용했어요!');
        }
        function importSkinFile(e) {
            const f = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!f) return;
            f.text().then(t => {
                let o = null; try { o = JSON.parse(t); } catch (er) {}
                if (o && o.malang_pattern) { showMsg('🌈 배경지 파일이에요.<br><b>🌈 배경지 → 공유받은</b> 칸의 📥 파일 불러오기로 넣어 주세요.'); return; }
                if (o && o.malang_sticker) { showMsg('✨ 스티커 파일이에요.<br><b>✨ 스티커 → 그 종류 → 공유받은</b> 칸의 📥 파일 불러오기로 넣어 주세요.'); return; }
                addReceivedSkin(parseSkinText(t));
            });
        }

        function updateAutoSaveInterval(val) { autoSaveMinutes = val; startAutoSave(); }
        function startAutoSave() {
            if (autoSaveTimer) clearInterval(autoSaveTimer);
            autoSaveTimer = setInterval(() => { if (!turn) saveData(false); }, autoSaveMinutes * 60 * 1000);
        }

        /* ---------- 창 제목 줄 : 왼쪽 ‹ 앞 화면 이름 · 가운데 제목 리본 · 오른쪽 ✕ (닫기) · 모양은 css/dakku.css ----------
           창 아래에 있던 '닫기' · '← …' 버튼은 숨기고, 제목 줄 버튼이 그 버튼을 대신 눌러 줘요. (원래 버튼의 동작 · 막힘 상태를 그대로 따라요)
           나중에 만들어지는 창(배경음악 · 인형 등)도 처음 열 때 똑같이 바꿔요. */
        function mtDecorate(modal) {
            if (!modal || modal.dataset.mt || modal.id === 'customAlertModal') return;
            const box = modal.querySelector('.modal-content'); if (!box) return;
            const title = [...box.children].find(c => c.classList.contains('modal-title')); if (!title) return;
            modal.dataset.mt = '1';
            if (title.classList.contains('mt-bar')) return;                                   // 이미 직접 만든 제목 줄 (카페)
            const btns = [...box.querySelectorAll('button')];
            const closeBtn = btns.filter(b => b.textContent.trim() === '닫기').pop();
            const backBtn = btns.find(b => /^←/.test(b.textContent.trim()));
            const mk = (txt, label, cls, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'mt-btn ' + cls; b.textContent = txt === '<' ? '‹ ' + label.replace(/ 메뉴$/, '') : txt; b.setAttribute('aria-label', label); b.onclick = e => { e.stopPropagation(); fn(); }; return b; };
            const span = document.createElement('span'); span.className = 'mt-text';
            while (title.firstChild) span.appendChild(title.firstChild);
            if (title.id) { span.id = title.id; title.removeAttribute('id'); }
            const back = mk('<', backBtn ? backBtn.textContent.replace('←', '').trim() || '뒤로' : '뒤로', 'mt-back' + (backBtn ? '' : ' mt-none'), () => backBtn && backBtn.click());
            const x = mk('✕', '닫기', 'mt-x', () => closeBtn ? closeBtn.click() : closeModal(modal.id));
            title.classList.add('mt-bar');
            title.append(back, span, x);
            [closeBtn, backBtn].forEach(b => {
                if (!b) return;
                b.classList.add('mt-moved');
                const p = b.parentElement;
                if (p && p !== box && ![...p.children].some(c => !c.classList.contains('mt-moved') && !c.hidden && c.tagName !== 'INPUT')) p.classList.add('mt-moved');
            });
        }
        /* 제목이 ‹ · ✕ 사이에 다 안 들어가면 글씨를 조금씩 줄여 한 줄에 맞춰요 (제목이 바뀔 때도) */
        function mtFit(modal) {
            const t = modal && modal.querySelector('.modal-title.mt-bar .mt-text'); if (!t || !t.offsetWidth) return;
            t.style.fontSize = ''; t.style.paddingLeft = t.style.paddingRight = ''; t.style.whiteSpace = t.style.lineHeight = '';
            const bar = t.parentElement.getBoundingClientRect(), bk = t.parentElement.querySelector('.mt-back:not(.mt-none)'), x = t.parentElement.querySelector('.mt-x');
            const side = Math.max(bk ? bk.getBoundingClientRect().right - bar.left : 0, x ? bar.right - x.getBoundingClientRect().left : 0) + 6;
            t.style.maxWidth = Math.max(60, bar.width - side * 2) + 'px';                 // 가운데 리본이 ‹ · ✕ 와 안 겹치게
            let fs = parseFloat(getComputedStyle(t).fontSize) || 15;
            if (t.scrollWidth > t.clientWidth + 1) t.style.paddingLeft = t.style.paddingRight = '16px';
            while (t.scrollWidth > t.clientWidth + 1 && fs > 12) { fs -= .5; t.style.fontSize = fs + 'px'; }
            if (t.scrollWidth > t.clientWidth + 1) { t.style.whiteSpace = 'normal'; t.style.lineHeight = '1.15'; }   // 그래도 길면 리본 안에서 두 줄로
        }
        document.querySelectorAll('.modal').forEach(mtDecorate);
        function openModal(id) {
            if (id === 'settingsModal') { saveData(false); updateStorageInfo(); refreshStorageStats(); if (typeof sndRenderSettings === 'function') sndRenderSettings(); }
            /* ☕ 서버 미리 깨우기 (js/service.js) : 설정 메뉴를 열면 건의함 서버, 카페를 열면 랜덤박스 서버 */
            if (typeof warmServer === 'function') {
                if (id === 'settingsMenuModal' && typeof FEEDBACK_SCRIPT_URL !== 'undefined') warmServer(FEEDBACK_SCRIPT_URL);
                if (id === 'serviceModal' && typeof GACHA_API_URL !== 'undefined') warmServer(GACHA_API_URL);
                if (id === 'serviceModal' && typeof wlPrefetch === 'function') wlPrefetch();     // 📱 배경화면 목록 미리 받아 두기 (js/wall.js)
                if (id === 'serviceModal' && typeof FORTUNE_API_URL !== 'undefined' && FORTUNE_API_URL) warmServer(FORTUNE_API_URL);
            }
            if (id === 'serviceModal' && typeof svcShowCats === 'function') svcShowCats();
            const m = document.getElementById(id);
            mtDecorate(m);       // 카페는 늘 카테고리부터
            m.style.display = 'flex';
            mtFit(m);
            const t = m.querySelector('.modal-title.mt-bar .mt-text');
            if (t && !t.dataset.fit) { t.dataset.fit = 1; new MutationObserver(() => mtFit(m)).observe(t, { childList: true, characterData: true, subtree: true }); }
        }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }
        /* 창 밖(배경 · 페이지)을 누르면 닫혀요 : 그 창의 ✕ 를 눌러 준 것과 같아요 (창마다 닫을 때 하는 일을 그대로)
           - 알림 · 확인 창은 대답해야 해서 안 닫혀요 · 🎀 페이지꾸미기 창은 창 밖에서 다이어리를 꾸며야 해서 그대로 (창 밖이 눌려요) */
        let mdDown = null;
        document.addEventListener('pointerdown', e => { mdDown = e.target; }, true);
        document.addEventListener('click', e => {
            const m = e.target;
            if (!m.classList || !m.classList.contains('modal') || mdDown !== m || m.id === 'customAlertModal') return;
            const x = m.querySelector('.mt-x'); if (x) x.click(); else closeModal(m.id);
        });

        /* ---------- ⚙ 설정 메뉴 : 📐 페이지 크기 · ⚙️ 설정 · 💌 건의함 · 🔒 잠금 · 📲 앱 설치 ---------- */
        function openSettingsMenu() { openModal('settingsMenuModal'); }
        function openFromSettingsMenu(id) {
            closeModal('settingsMenuModal');
            if (id === 'pageSizeModal') { syncPageSizeInputs(); refreshLayout(); }
            if (id === 'feedbackModal') { openFeedback(); return; }
            openModal(id);
        }
        function backToSettingsMenu(fromId) {
            closeModal(fromId);
            openModal('settingsMenuModal');
        }


/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['settings'] = true;
