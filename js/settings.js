/* 말랑달콤 다이어리 - js/settings.js
   PC 백업/불러오기 · PNG 저장 · 용량 확인 · 스킨 · 자동 저장 주기 · 창 열기/닫기
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

            const restore = () => {
                innerPage.style.boxShadow = prevShadow;
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
           🎨 스킨 (다이어리 색 5개 : 전체 배경 · 겉표지 · 속지 · 테두리 · 포인트)
           - 스킨 목록 : 기본 스킨 4종 + 🌟 모두의 스킨(카페에서 받아 등록, js/community-skins.js) + 🎨 내 스킨
           - 내 스킨     : 'diary_custom_skins' → settings.json
           - 지금 고른 스킨 : 'diary_skin' → settings.json  (다음에 열어도 · 다른 기기에서도 그대로)
               예) {"id":"mint"} · {"id":"봄날","c":{색 5개}} · {"id":"cs:3","c":{색 5개}}
               모두의 스킨·내 스킨은 색도 같이 적어 둬서, 목록에서 빠지거나 지워도 쓰던 색이 유지돼요.
           ===================================================================== */
        const SKIN_KEY = 'diary_skin';
        const SKIN_PRESET_NAMES = { pink: '🌸 러블리 핑크', mint: '🌿 맑은 민트', purple: '💜 파스텔 퍼플', yellow: '⭐ 따뜻한 옐로우' };
        const SKIN_NAME_MAX = 20;
        let currentSkinId = 'pink';
        let currentSkinInline = null;      // 목록에 없는 스킨을 쓰는 중일 때 그 색 (예: 내려간 모두의 스킨)

        const skinPaidOpen = () => typeof PAID_PATTERNS_OPEN === 'undefined' || PAID_PATTERNS_OPEN;
        const skinCommunity = () => (typeof getCommunitySkins === 'function' ? getCommunitySkins() : []);
        const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

        /* id → { skin, kind:'preset'|'my'|'cs'|'inline', name, tier } */
        function findSkin(id, inline) {
            if (typeof id !== 'string' || !id) return null;
            if (hasOwn(skinPresets, id)) return { skin: skinPresets[id], kind: 'preset', name: SKIN_PRESET_NAMES[id] || id, tier: 'free' };
            if (id.startsWith('cs:')) {
                const hit = skinCommunity().find(s => s.id === id);
                if (hit) return { skin: hit.skin, kind: 'cs', name: hit.name, tier: hit.tier, by: hit.by };
            } else if (hasOwn(customSkins, id)) {
                return { skin: customSkins[id], kind: 'my', name: id, tier: 'free' };
            }
            const c = inline && typeof sanitizeSkin === 'function' ? sanitizeSkin(inline) : null;
            return c ? { skin: c, kind: 'inline', name: '지금 쓰는 스킨', tier: 'free' } : null;
        }

        function setSkinVars(skin) {
            const root = document.documentElement;
            root.style.setProperty('--bg-color', skin.bg);
            root.style.setProperty('--cover-bg', skin.cover);
            root.style.setProperty('--page-bg', skin.page);
            root.style.setProperty('--border-color', skin.border);
            root.style.setProperty('--primary-accent', skin.accent);
        }

        /* 색 고르기 칸도 지금 스킨 색으로 맞춤 (고른 스킨을 조금 바꿔서 내 스킨으로 등록할 수 있게) */
        function syncSkinPickers(skin) {
            const hex = v => (typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)) ? v : null;
            const set = (id, v) => { const el = document.getElementById(id); if (el && hex(v)) el.value = v; };
            set('customBg', skin.bg); set('customCover', skin.cover); set('customPage', skin.page);
            set('customBorder', skin.border); set('customAccent', skin.accent);
        }

        /* 스킨 고르기 (목록 선택 · 등록 직후 · 불러올 때 공용)
           opts.save === false : 저장하지 않음 (드라이브에서 불러올 때) */
        function applySkinPreset(id, opts = {}) {
            const hit = findSkin(id, opts.inline || (id === currentSkinId ? currentSkinInline : null));
            const sel = document.getElementById('skinSelect');
            if (!hit) { if (sel) sel.value = currentSkinId; return false; }
            if (hit.tier === 'paid' && !skinPaidOpen() && opts.save !== false) {
                if (sel) sel.value = currentSkinId;
                showMsg('💎 유료 스킨은 준비 중이에요.<br>조금만 기다려 주세요!');
                return false;
            }
            setSkinVars(hit.skin);
            syncSkinPickers(hit.skin);
            currentSkinId = id;
            currentSkinInline = hit.kind === 'preset' ? null : hit.skin;
            renderSkinSelect();
            if (opts.save !== false) {
                const rec = hit.kind === 'preset' ? { id } : { id, c: hit.skin };
                store.setItem(SKIN_KEY, JSON.stringify(rec));
            }
            updateSkinShareUI();
            return true;
        }

        /* 드라이브에서 불러온 '지금 고른 스킨' 적용 (없으면 기본 핑크 그대로) */
        function restoreSkin() {
            let rec = null;
            try { rec = JSON.parse(store.getItem(SKIN_KEY)); } catch (e) { rec = null; }
            if (rec && typeof rec.id === 'string' && applySkinPreset(rec.id, { save: false, inline: rec.c })) return;
            renderSkinSelect();
            updateSkinShareUI();
        }

        /* 스킨 목록 선택 칸 다시 그리기 : 기본 · 🌟 모두의 스킨 · 🎨 내 스킨 */
        function renderSkinSelect() {
            const sel = document.getElementById('skinSelect');
            if (!sel) return;
            sel.innerHTML = '';
            const group = (label, rows) => {
                if (!rows.length) return;
                const g = document.createElement('optgroup');
                g.label = label;
                rows.forEach(([v, t]) => g.appendChild(new Option(t, v)));
                sel.appendChild(g);
            };
            group('기본 스킨', Object.keys(skinPresets).map(k => [k, SKIN_PRESET_NAMES[k] || k]));
            group('🌟 모두의 스킨 (카페에서 등록)', skinCommunity().map(s =>
                [s.id, `${s.tier === 'paid' ? '💎' : '🆓'} ${s.name}${s.by ? ' · by ' + s.by : ''}`]));
            group('🎨 내 스킨', Object.keys(customSkins).map(n => [n, '🎨 ' + n]));
            if (!Array.from(sel.options).some(o => o.value === currentSkinId) && currentSkinInline) {
                group('지금 쓰는 스킨', [[currentSkinId, '🎨 지금 쓰는 스킨 (목록에서 내려감)']]);
            }
            sel.value = currentSkinId;
            if (sel.value !== currentSkinId) sel.value = 'pink';
        }

        function previewCustomColor() {
            const root = document.documentElement;
            root.style.setProperty('--bg-color', document.getElementById('customBg').value);
            root.style.setProperty('--cover-bg', document.getElementById('customCover').value);
            root.style.setProperty('--page-bg', document.getElementById('customPage').value);
            root.style.setProperty('--border-color', document.getElementById('customBorder').value);
            root.style.setProperty('--primary-accent', document.getElementById('customAccent').value);
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

        async function saveCustomSkin() {
            const nameInput = cleanSkinName(document.getElementById('customSkinName').value);
            if (!nameInput) { showMsg('스킨 이름을 입력해주세요!'); return; }
            if (hasOwn(skinPresets, nameInput) || nameInput.startsWith('cs:')) { showMsg('그 이름은 쓸 수 없어요.<br>다른 이름을 적어 주세요.'); return; }
            if (hasOwn(customSkins, nameInput) && !(await showMsg(`'${nameInput}' 스킨이 이미 있어요.<br>지금 색으로 바꿀까요?`, true))) return;

            const newSkin = {
                bg: document.getElementById('customBg').value,
                cover: document.getElementById('customCover').value,
                page: document.getElementById('customPage').value,
                border: document.getElementById('customBorder').value,
                accent: document.getElementById('customAccent').value
            };

            customSkins[nameInput] = newSkin;
            store.setItem('diary_custom_skins', JSON.stringify(customSkins));
            applySkinPreset(nameInput);
            document.getElementById('customSkinName').value = '';
            showMsg(`'${nameInput}' 스킨이 새로 추가되었습니다!<br><span style="font-size:12px;color:#777;">아래 📤 카페에 스킨 공유하기에서 파일로 저장해 카페에 올릴 수 있어요.</span>`);
        }

        async function deleteSelectedSkin() {
            const selectedVal = document.getElementById('skinSelect').value;
            if (hasOwn(skinPresets, selectedVal)) { showMsg('기본 제공 프리셋 스킨은 삭제할 수 없습니다!'); return; }
            if (!hasOwn(customSkins, selectedVal)) { showMsg('🌟 모두의 스킨은 지울 수 없어요.<br>다른 스킨을 고르면 돼요.'); return; }

            const confirmDelete = await showMsg(`'${selectedVal}' 커스텀 스킨을 정말 삭제하시겠습니까?`, true);
            if (confirmDelete) {
                delete customSkins[selectedVal];
                store.setItem('diary_custom_skins', JSON.stringify(customSkins));
                if (currentSkinId === selectedVal) applySkinPreset('pink');
                else renderSkinSelect();
                showMsg('스킨이 삭제되었습니다.');
            }
        }

        function loadCustomSkins() {
            customSkins = {};
            const saved = store.getItem('diary_custom_skins');
            if (saved) {
                try {
                    const obj = JSON.parse(saved);
                    if (obj && typeof obj === 'object') Object.keys(obj).forEach(n => { if (obj[n] && typeof obj[n] === 'object') customSkins[n] = obj[n]; });
                } catch (e) { console.warn('내 스킨을 읽지 못했어요', e); }
            }
            restoreSkin();
            if (typeof loadBgPattern === 'function') loadBgPattern();   // 전체 배경 패턴 (js/skins.js)
        }

        /* ---------- 📤 카페에 스킨 공유 · 📥 스킨 파일 불러오기 ----------
           파일 : malang_skin_날짜_시간.malang.txt  내용 : {"malang_skin":1,"name":"봄날","by":"닉네임","skin":{색 5개}}
           → 카페에 첨부 → 관리자가 pattern-tool.html 에 넣어 js/community-skins.js 를 만들어 깃허브에 올림 */
        function updateSkinShareUI() {
            const info = document.getElementById('skinShareTarget');
            if (!info) return;
            const mine = hasOwn(customSkins, currentSkinId);
            info.innerHTML = mine
                ? `공유할 스킨 : <b></b>`
                : '<span style="color:#e57373;">🎨 내 스킨을 먼저 골라 주세요.</span> (내가 만든 스킨만 올릴 수 있어요)';
            if (mine) info.querySelector('b').textContent = '🎨 ' + currentSkinId;
            ['skinShareSaveBtn', 'skinShareCopyBtn'].forEach(id => { const b = document.getElementById(id); if (b) b.disabled = !mine; });
            const nick = document.getElementById('skinNick');
            if (nick && !nick.value) { try { nick.value = localStorage.getItem('malang_pattern_nick') || ''; } catch (e) {} }
        }

        function skinShareText() {
            if (!hasOwn(customSkins, currentSkinId)) return null;
            const c = sanitizeSkin(customSkins[currentSkinId]);
            if (!c) { showMsg('⚠ 이 스킨의 색을 읽을 수 없어요.'); return null; }
            const by = typeof patternNick === 'function' ? patternNick('skinNick') : cleanSkinName(document.getElementById('skinNick').value).slice(0, 12);
            return { by, text: JSON.stringify({ malang_skin: 1, name: currentSkinId, by, skin: c }) };
        }

        function downloadSkinFile() {
            const got = skinShareText();
            if (!got) return;
            if (!got.by) { showMsg('💾 "만든 사람(닉네임)"을 적어 주세요.<br>등록되면 스킨 이름 옆에 표시돼요.'); return; }
            const a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([got.text], { type: 'text/plain;charset=utf-8' }));
            const d = new Date(), z = n => String(n).padStart(2, '0');
            a.download = `malang_skin_${d.getFullYear()}${z(d.getMonth() + 1)}${z(d.getDate())}_${z(d.getHours())}${z(d.getMinutes())}${z(d.getSeconds())}.malang.txt`;
            document.body.appendChild(a); a.click();
            setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
            showMsg('💾 스킨 파일을 저장했어요! <b>(' + a.download + ')</b><br><br>말랑달콤 카페 글쓰기에서 이 파일을 <b>첨부</b>해서 올려 주세요.<br>등록되면 모든 사용자의 스킨 목록에 나타나요 💕');
        }

        function copySkinCode() {
            const got = skinShareText();
            if (!got) return;
            const done = () => toast('📋 스킨 코드를 복사했어요. 카페 글에 붙여 넣어 주세요.');
            const fallback = () => {
                const ta = document.createElement('textarea');
                ta.value = got.text; ta.style.position = 'fixed'; ta.style.opacity = '0';
                document.body.appendChild(ta); ta.select();
                try { document.execCommand('copy'); done(); } catch (e) { showMsg('복사하지 못했어요.'); }
                ta.remove();
            };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(got.text).then(done, fallback);
            else fallback();
        }

        /* 카페에서 받은 스킨 파일(또는 코드)을 내 스킨으로 넣기 */
        function parseSkinText(txt) {
            const m = String(txt || '').match(/\{[\s\S]*\}/);
            if (!m) return null;
            try {
                const o = JSON.parse(m[0]);
                const c = sanitizeSkin(o && o.skin ? o.skin : o);
                return c ? { name: cleanSkinName(o.name) || '받은 스킨', by: cleanSkinName(o.by).slice(0, 12), skin: c } : null;
            } catch (e) { return null; }
        }
        function addReceivedSkin(p) {
            if (!p) { showMsg('⚠ 스킨 파일이 아니거나 깨진 파일이에요.'); return; }
            const same = Object.keys(customSkins).find(n => JSON.stringify(sanitizeSkin(customSkins[n])) === JSON.stringify(p.skin));
            if (same) { applySkinPreset(same); toast(`🎨 이미 있는 스킨이에요 : '${same}'`); return; }
            const name = freeSkinName(p.name);
            customSkins[name] = p.skin;
            store.setItem('diary_custom_skins', JSON.stringify(customSkins));
            applySkinPreset(name);
            showMsg(`📥 '${name}' 스킨을 내 스킨에 넣고 적용했어요!` + (p.by ? `<br><span style="font-size:12px;color:#777;">만든 사람 : ${p.by}</span>` : ''));
        }
        function importSkinFile(e) {
            const f = e.target.files && e.target.files[0];
            e.target.value = '';
            if (!f) return;
            if (f.size > 20000) { showMsg('⚠ 스킨 파일이 아니에요. (파일이 너무 커요)'); return; }
            f.text().then(t => addReceivedSkin(parseSkinText(t)));
        }
        function pasteSkinCode() {
            const t = prompt('카페에서 복사한 스킨 코드를 붙여 넣어 주세요.');
            if (t) addReceivedSkin(parseSkinText(t));
        }

        function updateAutoSaveInterval(val) { autoSaveMinutes = val; startAutoSave(); }
        function startAutoSave() {
            if (autoSaveTimer) clearInterval(autoSaveTimer);
            autoSaveTimer = setInterval(() => { if (!turn) saveData(false); }, autoSaveMinutes * 60 * 1000);
        }

        function openModal(id) {
            if (id === 'settingsModal') { saveData(false); updateStorageInfo(); refreshStorageStats(); }
            /* ☕ 서버 미리 깨우기 (js/service.js) : 설정 메뉴를 열면 건의함 서버, 놀이터를 열면 랜덤박스 서버 */
            if (typeof warmServer === 'function') {
                if (id === 'settingsMenuModal' && typeof FEEDBACK_SCRIPT_URL !== 'undefined') warmServer(FEEDBACK_SCRIPT_URL);
                if (id === 'serviceModal' && typeof GACHA_API_URL !== 'undefined') warmServer(GACHA_API_URL);
            }
            document.getElementById(id).style.display = 'flex';
        }
        function closeModal(id) { document.getElementById(id).style.display = 'none'; }

        /* ---------- ⚙ 설정 메뉴 : 📐 페이지 크기 · ⚙️ 설정 · 💌 건의함 · 💝 후원 ---------- */
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
