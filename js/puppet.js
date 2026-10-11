/* 말랑달콤 다이어리 - js/puppet.js
   🎭 인형극 : 내가 만든 인형들을 무대에 세우고, 장면마다 배경 · 자리 · 대사 · 표정을 정해서 짧은 상황극을 만들어요
       (카페 → 🧸 인형 꾸미기 → 🎭 인형극)
   - 📚 목록 : 내 인형극 · ➕ 새 인형극 · 📂 파일 불러오기
   - ✏️ 만들기 : 장면(최대 30) → 🏞 배경(무대 9가지 + 내 사진) · 🧸 인형(장면마다 5명까지 · 끌어서 자리 · 크기 · 뒤집기) · 💬 대사(누가 · 표정 · 말)
   - ▶ 공연 : 막이 열리고 → 제목 → 장면마다 말풍선이 타자 치듯 나오고, 말하는 인형은 콩 뛰며 표정이 바뀌어요 → 끝 → 막이 닫혀요
   - 저장 : 로그인 → 내 드라이브 / 말랑달콤 / 카페 / 인형극 / 제목.json · 게스트 → 이 기기에만
       인형극 파일 안에 나온 인형들이 같이 들어 있어서(cast) 파일 하나로 다른 사람과 나눌 수 있어요
   - 📷 장면 사진 (PNG) · 📔 일기에 붙이기 (장면 사진) · 📤 파일로 저장 (이름.json)
   - 인형 그림 · 움직임은 js/doll-render.js 의 dollDataUrl (인형에 정한 움직임 그대로 살아 움직여요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (인형극만 '준비 중')
   ※ 파일 불러오는 순서: … → doll-render → doll-store → doll-room → doll-move → char-move → puppet → service */

        const PS_MAX_SCENES = 30, PS_MAX_ACT = 5, PS_MAX_LINES = 20, PS_MAX_CAST = 12, PS_MAX_TEXT = 80, PS_MAX_PICS = 4;
        const PS_GUEST_KEY = 'malang_shows_guest';
        const PS_FOLDER = () => DOLL_FOLDERS.play;
        /* 😊 말할 때 표정 (인형 얼굴 값을 그 대사 동안만 바꿔요) */
        const PS_FACES = {
            '': { n: '🙂 그대로' },
            smile: { n: '😊 웃음', eyes: 'smile', mouth: 'open' },
            wow: { n: '😮 놀람', eyes: 'sparkle', mouth: 'o' },
            sad: { n: '😢 슬픔', eyes: 'sleepy', mouth: 'pout', brows: 'worried' },
            angry: { n: '😤 화남', mouth: 'pout', brows: 'strong' },
            love: { n: '😍 반함', eyes: 'heart', mouth: 'smile' },
            wink: { n: '😉 윙크', eyes: 'wink', mouth: 'smile' },
            sleepy: { n: '😪 졸림', eyes: 'sleepy', mouth: 'cat' }
        };

        /* ---------- 🏞 무대 배경 (1600 × 1000 SVG) ---------- */
        const psStars = (n, seed, h) => { let s = seed, o = ''; for (let i = 0; i < n; i++) { s = (s * 9301 + 49297) % 233280; const x = s / 233280 * 1600; s = (s * 9301 + 49297) % 233280; const y = s / 233280 * h; o += `<circle cx="${x | 0}" cy="${y | 0}" r="${(i % 3) + 1.5}" fill="#fff" opacity="${.5 + (i % 5) / 10}"/>`; } return o; };
        const PS_BG = {
            room: { n: '🏡 내 방', svg: `<rect width="1600" height="1000" fill="#ffe9ef"/><path d="M0 0h1600v700H0z" fill="#fff3e6"/><g fill="#ffd9c2" opacity=".55">${[...Array(20)].map((_, i) => `<rect x="${i * 80}" y="0" width="40" height="700"/>`).join('')}</g><rect x="980" y="130" width="420" height="320" rx="16" fill="#cfeaff" stroke="#fff" stroke-width="22"/><path d="M1190 130v320M980 290h420" stroke="#fff" stroke-width="14"/><circle cx="1090" cy="210" r="34" fill="#fff" opacity=".9"/><path d="M0 700h1600v300H0z" fill="#e8b994"/><path d="M0 700h1600" stroke="#d49a72" stroke-width="10"/><rect x="140" y="420" width="300" height="290" rx="20" fill="#ff9fb6"/><rect x="160" y="440" width="260" height="70" rx="14" fill="#ffd1dc"/><circle cx="560" cy="250" r="70" fill="#fff" opacity=".7"/><path d="M560 190v60l40 24" stroke="#ff8fae" stroke-width="10" fill="none" stroke-linecap="round"/>` },
            park: { n: '🌳 공원', svg: `<defs><linearGradient id="g" x2="0" y2="1"><stop offset="0" stop-color="#bfe6ff"/><stop offset="1" stop-color="#eaf8ff"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><g fill="#fff" opacity=".95"><ellipse cx="260" cy="170" rx="120" ry="44"/><ellipse cx="330" cy="140" rx="80" ry="50"/><ellipse cx="1260" cy="230" rx="140" ry="46"/><ellipse cx="1330" cy="200" rx="90" ry="52"/></g><path d="M0 640Q400 560 800 640T1600 620V1000H0z" fill="#9fdc8f"/><path d="M0 760Q500 700 1000 770T1600 740V1000H0z" fill="#7cc96e"/><rect x="190" y="380" width="44" height="300" fill="#a97452"/><circle cx="212" cy="360" r="140" fill="#5fb760"/><circle cx="140" cy="420" r="90" fill="#6cc46c"/><circle cx="290" cy="420" r="90" fill="#6cc46c"/><rect x="1330" y="430" width="40" height="260" fill="#a97452"/><circle cx="1350" cy="410" r="120" fill="#66bd66"/><g fill="#ff8fae">${[...Array(12)].map((_, i) => `<circle cx="${90 + i * 130}" cy="${830 + (i % 3) * 40}" r="12"/>`).join('')}</g>` },
            school: { n: '🏫 교실', svg: `<rect width="1600" height="1000" fill="#fff7e8"/><rect x="250" y="110" width="1100" height="440" rx="16" fill="#3f7a5a" stroke="#b07a4e" stroke-width="26"/><path d="M330 230h360M330 300h260M900 240q60-60 120 0t120 0" stroke="#fff" stroke-width="10" fill="none" opacity=".75" stroke-linecap="round"/><text x="1100" y="470" font-size="60" fill="#fff" opacity=".8" font-family="sans-serif">1+1=2</text><rect x="250" y="560" width="1100" height="20" fill="#b07a4e"/><path d="M0 720h1600v280H0z" fill="#d8b48a"/><g stroke="#c49c70" stroke-width="6">${[...Array(8)].map((_, i) => `<path d="M${i * 220} 720v280"/>`).join('')}</g><circle cx="1480" cy="200" r="70" fill="#fff" stroke="#b07a4e" stroke-width="10"/><path d="M1480 150v50l30 20" stroke="#ff6b8f" stroke-width="8" fill="none"/>` },
            beach: { n: '🏖 바닷가', svg: `<defs><linearGradient id="s" x2="0" y2="1"><stop offset="0" stop-color="#8fd3ff"/><stop offset="1" stop-color="#dff3ff"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#s)"/><circle cx="1300" cy="200" r="90" fill="#ffe680"/><path d="M0 520h1600v170H0z" fill="#4fb3e8"/><path d="M0 560q100-20 200 0t200 0 200 0 200 0 200 0 200 0 200 0 200 0" stroke="#fff" stroke-width="8" fill="none" opacity=".7"/><path d="M0 660Q800 620 1600 670V1000H0z" fill="#ffe2a8"/><path d="M0 680q120-30 240 0t240 0 240 0 240 0 240 0 240 0 240 0" stroke="#fff" stroke-width="14" fill="none" opacity=".8"/><path d="M200 900l60-260" stroke="#c98b5a" stroke-width="12"/><path d="M80 650q180-140 360 0z" fill="#ff8fae"/><path d="M80 650q60-80 120 0q60-80 120 0q60-80 120 0" fill="#fff" opacity=".6"/><circle cx="1180" cy="880" r="26" fill="#ff9f7f"/>` },
            night: { n: '🌙 밤하늘', svg: `<defs><linearGradient id="n" x2="0" y2="1"><stop offset="0" stop-color="#2b2a63"/><stop offset="1" stop-color="#6b5ba8"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#n)"/>${psStars(70, 7, 620)}<circle cx="1260" cy="190" r="90" fill="#fff6c8"/><circle cx="1295" cy="170" r="80" fill="#3a356f"/><path d="M0 700Q300 620 600 690T1200 680T1600 690V1000H0z" fill="#2d2b55"/><path d="M0 800Q400 750 800 800T1600 790V1000H0z" fill="#3c3a6b"/><g fill="#ffe680">${[...Array(6)].map((_, i) => `<rect x="${200 + i * 210}" y="${720 + (i % 2) * 20}" width="18" height="24" rx="4"/>`).join('')}</g>` },
            cafe: { n: '🍰 카페', svg: `<rect width="1600" height="1000" fill="#fff1e6"/><rect width="1600" height="160" fill="#ff9fb6"/><path d="M0 160${[...Array(17)].map((_, i) => `q50 60 100 0`).join('')}" fill="#ff9fb6" transform="translate(0 0)"/><path d="M0 160${[...Array(17)].map(() => 'q50 60 100 0').join('')}" fill="none" stroke="#fff" stroke-width="8"/><rect x="150" y="300" width="360" height="300" rx="20" fill="#fff" stroke="#e6b88a" stroke-width="12"/><g fill="#ffd1dc"><rect x="190" y="340" width="120" height="100" rx="12"/><rect x="350" y="340" width="120" height="100" rx="12"/></g><rect x="1050" y="320" width="380" height="240" rx="18" fill="#7a5040"/><text x="1240" y="410" font-size="54" text-anchor="middle" fill="#fff" font-family="sans-serif">MENU</text><path d="M1110 460h260M1110 510h200" stroke="#fff" stroke-width="10" opacity=".7"/><path d="M0 720h1600v280H0z" fill="#c98d6a"/><g fill="#b07a58">${[...Array(16)].map((_, i) => `<rect x="${i * 100}" y="${720 + (i % 2) * 140}" width="100" height="140"/>`).join('')}</g><circle cx="800" cy="300" r="40" fill="#ffe680"/><path d="M800 160v100" stroke="#7a5040" stroke-width="6"/>` },
            stage: { n: '🎪 무대', svg: `<rect width="1600" height="1000" fill="#3a1f3d"/><path d="M500 0L180 760h1240L1100 0z" fill="#fff6b8" opacity=".18"/><path d="M0 0h1600v120H0z" fill="#b8243f"/><path d="M0 120${[...Array(16)].map(() => 'q50 70 100 0').join('')}" fill="#b8243f"/><path d="M0 0h170v1000H0zM1430 0h170v1000h-170z" fill="#9c1d36"/><g stroke="#7d1529" stroke-width="10" opacity=".7"><path d="M60 0v1000M120 0v1000M1480 0v1000M1540 0v1000"/></g><path d="M0 760h1600v240H0z" fill="#8a5a3c"/><path d="M0 760h1600" stroke="#ffd36b" stroke-width="10"/><g stroke="#73492f" stroke-width="5">${[...Array(10)].map((_, i) => `<path d="M${i * 170} 760v240"/>`).join('')}</g>` },
            sakura: { n: '🌸 벚꽃길', svg: `<defs><linearGradient id="k" x2="0" y2="1"><stop offset="0" stop-color="#ffe4ef"/><stop offset="1" stop-color="#fff8fb"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#k)"/><g fill="#ffc2d6">${[...Array(8)].map((_, i) => `<circle cx="${i * 230}" cy="${120 + (i % 2) * 60}" r="160"/>`).join('')}</g><g fill="#ffd6e4">${[...Array(8)].map((_, i) => `<circle cx="${110 + i * 230}" cy="${210 + (i % 2) * 40}" r="120"/>`).join('')}</g><g fill="#9b6b55"><rect x="190" y="250" width="34" height="480"/><rect x="1380" y="250" width="34" height="480"/></g><path d="M0 720h1600v280H0z" fill="#d9ecc4"/><path d="M500 1000L720 720h160L1100 1000z" fill="#f3e2c8"/><g fill="#ff9fbd" opacity=".8">${[...Array(26)].map((_, i) => `<ellipse cx="${(i * 197) % 1600}" cy="${300 + (i * 131) % 650}" rx="9" ry="6" transform="rotate(${i * 37} ${(i * 197) % 1600} ${300 + (i * 131) % 650})"/>`).join('')}</g>` },
            snow: { n: '⛄ 눈 오는 날', svg: `<defs><linearGradient id="w" x2="0" y2="1"><stop offset="0" stop-color="#cfe0f2"/><stop offset="1" stop-color="#f4f8fc"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#w)"/><path d="M0 640Q400 580 800 640T1600 630V1000H0z" fill="#fff"/><path d="M1100 520l120-150 120 150z" fill="#5b8a6a"/><path d="M1080 600l140-170 140 170z" fill="#4f7d5f"/><rect x="1205" y="600" width="30" height="60" fill="#8a5a3c"/><circle cx="300" cy="620" r="90" fill="#fff" stroke="#dbe6f0" stroke-width="6"/><circle cx="300" cy="490" r="62" fill="#fff" stroke="#dbe6f0" stroke-width="6"/><circle cx="280" cy="480" r="7" fill="#333"/><circle cx="320" cy="480" r="7" fill="#333"/><path d="M300 495l40 10-40 10z" fill="#ff8f3c"/><g fill="#fff">${[...Array(60)].map((_, i) => `<circle cx="${(i * 233) % 1600}" cy="${(i * 157) % 900}" r="${4 + i % 4}" opacity=".9"/>`).join('')}</g>` }
        };
        const psBgUrl = id => PS_BG[id] ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice">${PS_BG[id].svg}</svg>`) : '';

        const PS = { built: false, list: [], show: null, id: null, mt: null, dirty: false, sc: 0, sel: -1, tab: 'bg', saving: false, play: null, bgCache: {} };
        const pzq = id => document.getElementById(id);
        const psEsc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
        const psLine = s => String(s == null ? '' : s).replace(/[\u0000-\u001f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, PS_MAX_TEXT);
        const psDrive = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        const psClamp = (v, a, b, d) => { v = parseFloat(v); return isNaN(v) ? d : Math.max(a, Math.min(b, v)); };

        /* ---------- 인형극 데이터 : 알려진 값만 통과 (파일 · 다른 사람 인형극도 안전하게) ---------- */
        function psNew() { return { v: 1, title: '', by: psNick(), cast: [], pics: [], scenes: [{ bg: 'room', actors: [], lines: [] }] }; }
        function psNick() { try { return localStorage.getItem('malang_pattern_nick') || ''; } catch (e) { return ''; } }
        function psClean(o) {
            if (!o || typeof o !== 'object') return null;
            const cast = (Array.isArray(o.cast) ? o.cast : []).slice(0, PS_MAX_CAST).map(c => { const d = c && sanitizeDoll(c.doll); return d ? (typeof c.src === 'string' && /^[\w-]{1,80}$/.test(c.src) ? { doll: d, src: c.src } : { doll: d }) : null; });
            const pics = (Array.isArray(o.pics) ? o.pics : []).slice(0, PS_MAX_PICS).map(u => typeof u === 'string' && u.length < 900000 && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(u) ? u : null);
            const scenes = (Array.isArray(o.scenes) ? o.scenes : []).slice(0, PS_MAX_SCENES).map(s => {
                if (!s || typeof s !== 'object') return null;
                const bg = PS_BG[s.bg] ? s.bg : (/^pic[0-3]$/.test(s.bg) && pics[+s.bg.slice(3)] ? s.bg : 'room');
                const actors = (Array.isArray(s.actors) ? s.actors : []).slice(0, PS_MAX_ACT).filter(a => a && Number.isInteger(a.c) && cast[a.c])
                    .map(a => ({ c: a.c, x: Math.round(psClamp(a.x, 4, 96, 50) * 10) / 10, y: Math.round(psClamp(a.y, 35, 100, 94) * 10) / 10, s: Math.round(psClamp(a.s, .4, 1.8, 1) * 100) / 100, f: !!a.f }));
                const lines = (Array.isArray(s.lines) ? s.lines : []).slice(0, PS_MAX_LINES).filter(l => l && typeof l.t === 'string')
                    .map(l => ({ w: Number.isInteger(l.w) && l.w >= 0 && l.w < actors.length ? l.w : -1, e: PS_FACES[l.e] ? l.e : '', t: psLine(l.t) })).filter(l => l.t);
                return { bg, actors, lines };
            }).filter(Boolean);
            if (!scenes.length) scenes.push({ bg: 'room', actors: [], lines: [] });
            return { v: 1, title: dollText(o.title, 20), by: dollText(o.by, 12), cast, pics, scenes };
        }
        /* 저장할 때 : 장면에서 안 쓰는 인형 · 사진은 빼고 번호를 다시 매겨요 */
        function psPack(show) {
            const usedC = new Map(), usedP = new Map(), cast = [], pics = [];
            const scenes = show.scenes.map(s => {
                let bg = s.bg;
                if (/^pic\d$/.test(bg)) { const i = +bg.slice(3); if (!usedP.has(i) && show.pics[i]) { usedP.set(i, pics.length); pics.push(show.pics[i]); } bg = usedP.has(i) ? 'pic' + usedP.get(i) : 'room'; }
                const actors = s.actors.filter(a => show.cast[a.c]).map(a => {
                    if (!usedC.has(a.c)) { usedC.set(a.c, cast.length); cast.push(show.cast[a.c].src ? { doll: show.cast[a.c].doll, src: show.cast[a.c].src } : { doll: show.cast[a.c].doll }); }
                    return Object.assign({}, a, { c: usedC.get(a.c) });
                });
                return { bg, actors, lines: s.lines.filter(l => l.t).map(l => ({ w: l.w, e: l.e, t: l.t })) };
            });
            return { v: 1, title: show.title, by: show.by, cast, pics, scenes };
        }
        const psName = show => (dollText(show.title, 20).replace(/[\\/:*?|]/g, '').trim() || '이름 없는 인형극');

        /* ---------- 저장소 : 로그인 → 드라이브 / 게스트 → 이 기기 ---------- */
        function psGuestRead() { try { const a = JSON.parse(localStorage.getItem(PS_GUEST_KEY)) || []; return Array.isArray(a) ? a : []; } catch (e) { return []; } }
        function psGuestWrite(a) { try { localStorage.setItem(PS_GUEST_KEY, JSON.stringify(a)); return true; } catch (e) { showMsg('이 기기의 저장 공간이 부족해요.<br>로그인하면 구글 드라이브에 저장할 수 있어요.'); return false; } }
        async function psList() {
            if (!psDrive()) return psGuestRead().map(e => ({ id: e.id, name: e.show && e.show.title || '이름 없는 인형극', mt: e.mt, show: psClean(e.show) })).filter(e => e.show).sort((a, b) => (b.mt || 0) - (a.mt || 0));
            const dir = await getFolder(PS_FOLDER(), false);
            if (!dir) return [];
            const fs = await driveList(`'${dir}' in parents and mimeType!='${FOLDER_MIME}' and trashed=false`, 'id,name,modifiedTime,size');
            return fs.filter(f => /\.json$/i.test(f.name)).map(f => ({ id: f.id, name: f.name.replace(/\.json$/i, ''), mt: f.modifiedTime, size: +f.size || 0 }))
                .sort((a, b) => Date.parse(b.mt) - Date.parse(a.mt));
        }
        async function psRead(ent) {
            if (ent.show) return ent.show;
            return psClean(JSON.parse(await readFileText(ent.id)));
        }
        async function psSaveStore() {
            const body = psPack(PS.show), name = psName(PS.show);
            if (!psDrive()) {
                const list = psGuestRead(), id = PS.id || 'g-' + Date.now().toString(36), now = Date.now();
                const next = [{ id, show: body, mt: now }].concat(list.filter(e => e.id !== id));
                if (!psGuestWrite(next)) return false;
                PS.id = id; PS.mt = now; return true;
            }
            const dir = await getFolder(PS_FOLDER(), true);
            let id = PS.id;
            const cur = id ? await driveMeta(id) : null;
            if (cur && PS.mt && cur.modifiedTime !== PS.mt &&
                !(await showAsk('📱 다른 기기에서 이 인형극을 고쳤어요.<br>지금 것으로 바꿀까요?', '🎭 지금 것으로', '그만두기'))) return false;
            if (!cur) id = null;
            let saved;
            try { saved = await driveUpsert(dir, name + '.json', id, JSON.stringify(body)); }
            catch (e) { if (e && e.code === 'gone') saved = await driveUpsert(await getFolder(PS_FOLDER(), true), name + '.json', null, JSON.stringify(body)); else throw e; }
            if (cur && cur.name !== name + '.json') {                                // 제목을 바꿨으면 파일 이름도
                try { await gfetch(`${DRIVE_API}/${saved.id}?fields=id`, { method: 'PATCH', headers: { 'Content-Type': 'application/json; charset=UTF-8' }, body: JSON.stringify({ name: name + '.json' }) }); } catch (e) {}
            }
            PS.id = saved.id; PS.mt = saved.modifiedTime; return true;
        }
        async function psDelete(ent) {
            if (!psDrive()) { psGuestWrite(psGuestRead().filter(e => e.id !== ent.id)); return; }
            await driveTrash(ent.id);
        }

        /* =====================================================================
           화면
           ===================================================================== */
        function psBuild() {
            if (PS.built) return;
            PS.built = true;
            const w = document.createElement('div');
            w.innerHTML = `
            <div class="modal" id="puppetShow">
              <div class="modal-content ps-box">
                <div class="modal-title">🎭 인형극</div>
                <div id="psListPane">
                  <p class="ps-tip">내 인형들이 배우가 되어 짧은 이야기를 연기해요.<br>장면마다 배경 · 자리 · 대사를 정하면 막이 열리고 공연이 시작돼요!</p>
                  <div class="ps-top-btns">
                    <button type="button" class="btn btn-primary" id="psNewBtn">➕ 새 인형극 만들기</button>
                    <button type="button" class="btn" id="psOpenFile">📂 파일 불러오기</button>
                  </div>
                  <input type="file" id="psFile" accept=".json,application/json" style="display:none">
                  <div class="ps-list" id="psList"></div>
                </div>
                <div id="psEdit" style="display:none">
                  <div class="ps-meta">
                    <label>제목<input type="text" id="psTitle" maxlength="20" placeholder="예) 로라의 소풍 대작전"></label>
                    <label>만든 사람<input type="text" id="psBy" maxlength="12" placeholder="닉네임"></label>
                  </div>
                  <div class="ps-stagewrap"><div class="ps-stage" id="psStage"></div></div>
                  <div class="ps-scenes" id="psScenes"></div>
                  <div class="ps-tabs" id="psTabs">
                    <button type="button" data-pst="bg">🏞 배경</button>
                    <button type="button" data-pst="cast">🧸 인형</button>
                    <button type="button" data-pst="lines">💬 대사</button>
                  </div>
                  <div class="ps-panel" id="psPanel"></div>
                  <div class="ps-btns">
                    <button type="button" class="btn btn-primary" id="psPlayAll">▶ 처음부터 공연 보기</button>
                    <button type="button" class="btn" id="psPlayHere">▶ 이 장면부터</button>
                    <button type="button" class="btn" id="psSave">💾 저장</button>
                    <button type="button" class="btn" id="psShot">📷 장면 사진</button>
                    <button type="button" class="btn" id="psStick">📔 일기에 붙이기</button>
                    <button type="button" class="btn" id="psExport">📤 파일로 저장</button>
                    <button type="button" class="btn" id="psBack">◀ 목록</button>
                  </div>
                </div>
                <button class="btn ps-close" type="button" onclick="closePuppetShow()">닫기</button>
              </div>
            </div>
            <div class="ps-play" id="psPlay" hidden>
              <div class="ps-theater">
                <div class="ps-stage ps-pstage" id="psPStage"></div>
                <div class="ps-curtain l" id="psCurL"></div><div class="ps-curtain r" id="psCurR"></div><div class="ps-valance"></div>
                <div class="ps-card" id="psCard"></div>
              </div>
              <div class="ps-pbar">
                <button type="button" id="psPPrev" aria-label="이전">⏮</button>
                <button type="button" id="psPPause" aria-label="멈춤">⏸</button>
                <button type="button" id="psPNext" aria-label="다음">⏭</button>
                <button type="button" id="psPClose" aria-label="닫기">✕ 닫기</button>
              </div>
              <p class="ps-phint">화면을 톡 누르면 다음 대사로 넘어가요<span class="rot"><br>📱 가로로 돌리면 더 크게 볼 수 있어요</span></p>
            </div>`;
            while (w.firstElementChild) document.body.appendChild(w.firstElementChild);
            pzq('psNewBtn').onclick = () => psOpenEdit(null, psNew());
            pzq('psOpenFile').onclick = () => pzq('psFile').click();
            pzq('psFile').onchange = psImport;
            pzq('psList').addEventListener('click', psListClick);
            pzq('psTitle').addEventListener('input', e => { PS.show.title = dollText(e.target.value, 20); PS.dirty = true; });
            pzq('psBy').addEventListener('input', e => { PS.show.by = dollText(e.target.value, 12); PS.dirty = true; });
            pzq('psTabs').addEventListener('click', e => { const b = e.target.closest('[data-pst]'); if (b) { PS.tab = b.dataset.pst; psRenderStage(); psRenderPanel(); } });
            pzq('psScenes').addEventListener('click', psSceneClick);
            pzq('psPanel').addEventListener('click', psPanelClick);
            pzq('psPanel').addEventListener('input', psPanelInput);
            pzq('psPanel').addEventListener('change', psPanelInput);
            pzq('psStage').addEventListener('pointerdown', psStageDown);
            pzq('psPlayAll').onclick = () => psPlay(0);
            pzq('psPlayHere').onclick = () => psPlay(PS.sc);
            pzq('psSave').onclick = () => psSave(true);
            pzq('psShot').onclick = psShot;
            pzq('psStick').onclick = psStick;
            pzq('psExport').onclick = psExport;
            pzq('psBack').onclick = psBack;
            pzq('psPStage').addEventListener('click', () => psPlayStep(+1, true));
            pzq('psPPrev').onclick = () => psPlayStep(-1, true);
            pzq('psPNext').onclick = () => psPlayStep(+1, true);
            pzq('psPPause').onclick = psPlayPause;
            pzq('psPClose').onclick = psPlayEnd;
        }

        async function openPuppetShow() {
            psBuild();
            ['serviceModal'].forEach(id => { const m = pzq(id); if (m) m.style.display = 'none'; });
            openModal('puppetShow');
            psShowList();
        }
        async function closePuppetShow() {
            if (PS.show && PS.dirty && (await showMsg('고친 인형극이 저장되지 않았어요.<br>저장할까요?', true))) { if (!(await psSave(false))) return; }
            PS.show = null; PS.dirty = false;
            closeModal('puppetShow');
        }

        /* ---------- 📚 목록 ---------- */
        async function psShowList() {
            pzq('psListPane').style.display = ''; pzq('psEdit').style.display = 'none';
            PS.show = null; PS.dirty = false;
            const box = pzq('psList');
            box.innerHTML = '<div class="ps-empty">🎭 무대를 준비하는 중…</div>';
            try { PS.list = await psList(); }
            catch (e) { box.innerHTML = '<div class="ps-empty">⚠ 인형극을 불러오지 못했어요.<br>인터넷 연결을 확인해 주세요.</div>'; return; }
            if (!PS.list.length) { box.innerHTML = '<div class="ps-empty">아직 만든 인형극이 없어요.<br>➕ 새 인형극 만들기로 첫 공연을 준비해 볼까요?</div>'; return; }
            box.innerHTML = PS.list.map((e, i) => `<div class="ps-item"><span class="ps-item-ico">🎭</span><div class="ps-item-t"><b>${psEsc(e.name)}</b><small>${e.mt ? new Date(typeof e.mt === 'number' ? e.mt : Date.parse(e.mt)).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }) : ''}</small></div>` +
                `<button type="button" class="btn" data-psi="${i}" data-psa="play">▶ 보기</button><button type="button" class="btn" data-psi="${i}" data-psa="edit">✏️</button><button type="button" class="btn" data-psi="${i}" data-psa="del">🗑</button></div>`).join('');
        }
        async function psListClick(e) {
            const b = e.target.closest('[data-psa]'); if (!b) return;
            const ent = PS.list[+b.dataset.psi]; if (!ent) return;
            if (b.dataset.psa === 'del') {
                if (!(await showMsg(`'${psEsc(ent.name)}' 인형극을 지울까요?<br><span style="font-size:12px;color:#777;">드라이브 휴지통으로 가요.</span>`, true))) return;
                try { await psDelete(ent); } catch (x) { showMsg('⚠ 지우지 못했어요.'); }
                psShowList(); return;
            }
            b.disabled = true;
            let show = null;
            try { show = await psRead(ent); } catch (x) { show = null; }
            b.disabled = false;
            if (!show) { showMsg('⚠ 인형극 파일을 읽지 못했어요.'); return; }
            if (b.dataset.psa === 'play') { PS.show = show; PS.id = ent.id; PS.mt = ent.mt; PS.dirty = false; psPlay(0, true); return; }
            psOpenEdit(ent, show);
        }

        /* ---------- ✏️ 만들기 ---------- */
        function psOpenEdit(ent, show) {
            PS.show = show; PS.id = ent ? ent.id : null; PS.mt = ent ? ent.mt : null; PS.dirty = !ent; PS.sc = 0; PS.sel = -1; PS.tab = show.scenes[0].actors.length ? 'lines' : 'cast';
            pzq('psListPane').style.display = 'none'; pzq('psEdit').style.display = '';
            pzq('psTitle').value = show.title; pzq('psBy').value = show.by;
            psRenderEd();
        }
        const psScene = () => PS.show.scenes[PS.sc];
        function psRenderEd() { psRenderStage(); psRenderScenes(); psRenderPanel(); }
        function psBgOf(show, id) { return /^pic\d$/.test(id) ? show.pics[+id.slice(3)] : psBgUrl(id); }
        /* 무대 그리기 (만들기 · 공연 같이) : 인형은 % 자리 · 키는 무대 높이의 55% × 크기 */
        function psStageHtml(show, sc, opt) {
            opt = opt || {};
            const s = show.scenes[sc];
            let h = `<div class="ps-bg" style="background-image:url('${psBgOf(show, s.bg)}')"></div>`;
            s.actors.forEach((a, i) => {
                const c = show.cast[a.c]; if (!c) return;
                const face = opt.speak === i && opt.face ? PS_FACES[opt.face] : null;
                const d = face ? Object.assign({}, c.doll, ['eyes', 'mouth', 'brows'].reduce((o, k) => (face[k] ? Object.assign(o, { [k]: face[k] }) : o), {})) : c.doll;
                h += `<img class="ps-actor${opt.sel === i ? ' sel' : ''}${opt.speak === i ? ' speak' : ''}" data-psa="${i}" alt="${psEsc(c.doll.name || '인형')}" draggable="false" style="left:${a.x}%;top:${a.y}%;height:${(55 * a.s).toFixed(1)}%;z-index:${Math.round(a.y * 10)};${a.f ? '--fx:-1;' : ''}" src="${dollDataUrl(d, { bg: false, crop: true, live: true, hop: opt.speak === i, pfx: 'ps' + i + (opt.tick || '') })}">`;
            });
            return h;
        }
        function psRenderStage() {
            const st = pzq('psStage'), s = psScene();
            st.innerHTML = psStageHtml(PS.show, PS.sc, { sel: PS.sel });
            if (!s.actors.length) st.insertAdjacentHTML('beforeend', '<div class="ps-hint">🧸 인형 탭에서 배우를 데려와 주세요</div>');
            else if (PS.tab !== 'lines') st.insertAdjacentHTML('beforeend', '<div class="ps-hint small">👆 인형을 끌어서 자리를 옮겨요</div>');
        }
        function psRenderScenes() {
            const n = PS.show.scenes.length;
            pzq('psScenes').innerHTML = PS.show.scenes.map((s, i) => `<button type="button" class="ps-sc${i === PS.sc ? ' on' : ''}" data-pss="${i}"><b>${i + 1}</b><span>${/^pic/.test(s.bg) ? '🖼' : (PS_BG[s.bg] ? PS_BG[s.bg].n.split(' ')[0] : '🏞')}</span><small>${s.lines.length ? '💬' + s.lines.length : ''}</small></button>`).join('') +
                `<button type="button" class="ps-sc add" data-psx="add"${n >= PS_MAX_SCENES ? ' disabled' : ''}>➕<small>장면</small></button>` +
                `<span class="ps-sc-tools"><button type="button" data-psx="copy" title="이 장면 복사"${n >= PS_MAX_SCENES ? ' disabled' : ''}>⧉</button><button type="button" data-psx="left" title="앞으로"${PS.sc ? '' : ' disabled'}>◀</button><button type="button" data-psx="right" title="뒤로"${PS.sc < n - 1 ? '' : ' disabled'}>▶</button><button type="button" data-psx="del" title="이 장면 지우기"${n > 1 ? '' : ' disabled'}>🗑</button></span>`;
        }
        async function psSceneClick(e) {
            const b = e.target.closest('[data-pss],[data-psx]'); if (!b || b.disabled) return;
            const S = PS.show.scenes;
            if (b.dataset.pss != null) { PS.sc = +b.dataset.pss; PS.sel = -1; psRenderEd(); return; }
            const x = b.dataset.psx;
            if (x === 'add') { const prev = psScene(); S.splice(PS.sc + 1, 0, { bg: prev.bg, actors: prev.actors.map(a => Object.assign({}, a)), lines: [] }); PS.sc++; }   // 새 장면 : 배경 · 배우 자리는 이어서, 대사는 새로
            else if (x === 'copy') { S.splice(PS.sc + 1, 0, JSON.parse(JSON.stringify(psScene()))); PS.sc++; }
            else if (x === 'left' || x === 'right') { const j = PS.sc + (x === 'left' ? -1 : 1); [S[PS.sc], S[j]] = [S[j], S[PS.sc]]; PS.sc = j; }
            else if (x === 'del') { if (!(await showMsg(`${PS.sc + 1}번 장면을 지울까요?`, true))) return; S.splice(PS.sc, 1); PS.sc = Math.min(PS.sc, S.length - 1); }
            PS.sel = -1; PS.dirty = true; psRenderEd();
        }

        /* 탭 : 🏞 배경 · 🧸 인형 · 💬 대사 */
        async function psRenderPanel() {
            document.querySelectorAll('#psTabs [data-pst]').forEach(b => b.classList.toggle('on', b.dataset.pst === PS.tab));
            const P = pzq('psPanel'), s = psScene();
            if (PS.tab === 'bg') {
                P.innerHTML = `<div class="ps-bgs">${Object.keys(PS_BG).map(id => `<button type="button" class="ps-bgc${s.bg === id ? ' on' : ''}" data-psbg="${id}"><i style="background-image:url('${PS.bgCache[id] || (PS.bgCache[id] = psBgUrl(id))}')"></i>${PS_BG[id].n}</button>`).join('')}` +
                    PS.show.pics.map((u, i) => u ? `<button type="button" class="ps-bgc${s.bg === 'pic' + i ? ' on' : ''}" data-psbg="pic${i}"><i style="background-image:url('${u}')"></i>🖼 내 사진 ${i + 1}</button>` : '').join('') +
                    `<button type="button" class="ps-bgc add" data-psbg="new"><i>📷</i>내 사진 넣기</button></div><input type="file" id="psPic" accept="image/*" style="display:none">`;
                pzq('psPic').onchange = psAddPic;
                return;
            }
            if (PS.tab === 'cast') {
                const a = PS.sel >= 0 ? s.actors[PS.sel] : null;
                let h = a ? `<div class="ps-actctl"><b>🎬 ${psEsc(PS.show.cast[a.c].doll.name || '인형')}</b>
                    <div class="dmv-range"><small>작게</small><input type="range" data-psk="s" min="0.4" max="1.8" step="0.05" value="${a.s}"><small>크게</small></div>
                    <div class="ps-actbtns"><button type="button" class="btn" data-psk="flip">↔ 뒤집기</button><button type="button" class="btn" data-psk="front">⬆ 앞으로</button><button type="button" class="btn" data-psk="out">🗑 무대에서 빼기</button></div></div>`
                    : (s.actors.length ? '<p class="ps-note">무대의 인형을 누르면 크기 · 방향을 바꿀 수 있어요.</p>' : '');
                h += `<h4 class="ps-h4">내 인형 데려오기 <small>(장면마다 ${PS_MAX_ACT}명까지)</small></h4><div class="ps-dolls" id="psDolls"><div class="ps-empty">☁ 인형을 불러오는 중…</div></div>`;
                P.innerHTML = h;
                let list = [];
                try { list = await listDolls(); } catch (e) { pzq('psDolls').innerHTML = '<div class="ps-empty">⚠ 인형을 불러오지 못했어요.</div>'; return; }
                if (PS.tab !== 'cast' || !pzq('psDolls')) return;
                const inCast = PS.show.cast.map((c, i) => c ? i : -1).filter(i => i >= 0 && !list.some(e => e.id === PS.show.cast[i].src));
                pzq('psDolls').innerHTML = (list.length || inCast.length) ?
                    list.map((e, i) => `<button type="button" class="ps-doll" data-psd="${i}"><img alt="" src="${dollDataUrl(e.doll, { bg: false, crop: true, pfx: 'pd' + i })}"><small>${psEsc(e.doll.name || '인형')}</small></button>`).join('') +
                    inCast.map(ci => `<button type="button" class="ps-doll" data-psc="${ci}"><img alt="" src="${dollDataUrl(PS.show.cast[ci].doll, { bg: false, crop: true, pfx: 'pc' + ci })}"><small>${psEsc(PS.show.cast[ci].doll.name || '인형')} 🎭</small></button>`).join('')
                    : '<div class="ps-empty">아직 만든 인형이 없어요.<br>먼저 👧 인형방에서 배우를 만들어 주세요!</div>';
                PS.dollList = list;
                return;
            }
            /* 💬 대사 */
            const who = (w) => `<select data-psl="w">${s.actors.map((a, i) => `<option value="${i}"${w === i ? ' selected' : ''}>${psEsc(PS.show.cast[a.c].doll.name || '인형 ' + (i + 1))}</option>`).join('')}<option value="-1"${w === -1 ? ' selected' : ''}>📢 해설</option></select>`;
            const face = (e, dis) => `<select data-psl="e"${dis ? ' disabled' : ''}>${Object.keys(PS_FACES).map(k => `<option value="${k}"${e === k ? ' selected' : ''}>${PS_FACES[k].n}</option>`).join('')}</select>`;
            P.innerHTML = (s.lines.length ? `<div class="ps-lines">${s.lines.map((l, i) => `<div class="ps-ln" data-psli="${i}"><span class="ps-ln-n">${i + 1}</span><div class="ps-ln-m"><div class="ps-ln-sel">${who(l.w)}${face(l.e, l.w < 0)}</div><input type="text" data-psl="t" maxlength="${PS_MAX_TEXT}" value="${psEsc(l.t)}" placeholder="${l.w < 0 ? '해설 : 어느 맑은 날…' : '대사를 써 주세요'}"></div><div class="ps-ln-b"><button type="button" data-psl="up"${i ? '' : ' disabled'}>▲</button><button type="button" data-psl="x">✕</button></div></div>`).join('')}</div>` : '<p class="ps-note">아직 대사가 없어요. 대사가 없는 장면은 공연에서 잠깐 보여 주고 넘어가요.</p>') +
                `<button type="button" class="btn ps-addln" data-psl="add"${s.lines.length >= PS_MAX_LINES ? ' disabled' : ''}>➕ 대사 더하기</button>` +
                (s.actors.length ? '' : '<p class="ps-note">🧸 인형을 먼저 무대에 세우면 누가 말할지 고를 수 있어요. (지금은 📢 해설만)</p>');
        }
        async function psPanelClick(e) {
            const s = psScene();
            const bg = e.target.closest('[data-psbg]');
            if (bg) { if (bg.dataset.psbg === 'new') { pzq('psPic').click(); return; } s.bg = bg.dataset.psbg; PS.dirty = true; psRenderStage(); psRenderScenes(); psRenderPanel(); return; }
            const dl = e.target.closest('[data-psd],[data-psc]');
            if (dl) {
                if (s.actors.length >= PS_MAX_ACT) { showMsg(`한 장면에는 ${PS_MAX_ACT}명까지 설 수 있어요.`); return; }
                let ci;
                if (dl.dataset.psc != null) ci = +dl.dataset.psc;
                else {
                    const ent = PS.dollList[+dl.dataset.psd]; if (!ent) return;
                    ci = PS.show.cast.findIndex(c => c && c.src === ent.id);
                    if (ci < 0) {
                        if (PS.show.cast.filter(Boolean).length >= PS_MAX_CAST) { showMsg(`인형극 하나에 배우는 ${PS_MAX_CAST}명까지예요.`); return; }
                        PS.show.cast.push({ doll: dollClone(ent.doll), src: ent.id }); ci = PS.show.cast.length - 1;
                    }
                }
                const n = s.actors.length, xs = [50, 30, 70, 15, 85];
                s.actors.push({ c: ci, x: xs[n] || 50, y: 94, s: 1, f: xs[n] > 50 });
                PS.sel = s.actors.length - 1; PS.dirty = true; psRenderStage(); psRenderPanel(); return;
            }
            const k = e.target.closest('[data-psk]');
            if (k && PS.sel >= 0) {
                const a = s.actors[PS.sel]; if (!a) return;
                if (k.dataset.psk === 'flip') a.f = !a.f;
                else if (k.dataset.psk === 'front') a.y = Math.min(100, Math.max(...s.actors.map(x => x.y)) + 0.5);
                else if (k.dataset.psk === 'out') {
                    s.actors.splice(PS.sel, 1);
                    s.lines.forEach(l => { if (l.w === PS.sel) l.w = -1; else if (l.w > PS.sel) l.w--; });   // 뺀 인형의 대사는 해설로
                    PS.sel = -1;
                } else return;
                PS.dirty = true; psRenderStage(); psRenderPanel(); return;
            }
            const l = e.target.closest('[data-psl]'); if (!l || l.tagName === 'SELECT' || l.tagName === 'INPUT') return;
            if (l.dataset.psl === 'add') {
                const last = s.lines[s.lines.length - 1];
                s.lines.push({ w: s.actors.length ? (last && last.w >= 0 ? (last.w + 1) % s.actors.length : 0) : -1, e: '', t: '' });
                PS.dirty = true; psRenderPanel(); psRenderScenes();
                setTimeout(() => { const ins = pzq('psPanel').querySelectorAll('[data-psl="t"]'); if (ins.length) ins[ins.length - 1].focus(); }, 30);
                return;
            }
            const row = l.closest('[data-psli]'); if (!row) return;
            const i = +row.dataset.psli;
            if (l.dataset.psl === 'x') s.lines.splice(i, 1);
            else if (l.dataset.psl === 'up' && i > 0) [s.lines[i - 1], s.lines[i]] = [s.lines[i], s.lines[i - 1]];
            PS.dirty = true; psRenderPanel(); psRenderScenes();
        }
        function psPanelInput(e) {
            const s = psScene();
            const k = e.target.closest('[data-psk="s"]');
            if (k && PS.sel >= 0 && s.actors[PS.sel]) {
                s.actors[PS.sel].s = parseFloat(k.value); PS.dirty = true;
                const img = pzq('psStage').querySelector(`[data-psa="${PS.sel}"]`); if (img) img.style.height = (55 * s.actors[PS.sel].s).toFixed(1) + '%';
                return;
            }
            const l = e.target.closest('[data-psl]'), row = e.target.closest('[data-psli]'); if (!l || !row) return;
            const ln = s.lines[+row.dataset.psli]; if (!ln) return;
            if (l.dataset.psl === 't') { ln.t = String(l.value).slice(0, PS_MAX_TEXT); PS.dirty = true; return; }
            if (e.type !== 'change') return;
            if (l.dataset.psl === 'w') { ln.w = parseInt(l.value, 10); if (ln.w < 0) ln.e = ''; psRenderPanel(); }
            if (l.dataset.psl === 'e') ln.e = l.value;
            PS.dirty = true;
        }
        /* 👆 무대에서 인형 고르기 · 끌어서 옮기기 */
        function psStageDown(e) {
            const img = e.target.closest('.ps-actor'), s = psScene();
            if (!img) { if (PS.sel >= 0) { PS.sel = -1; psRenderStage(); if (PS.tab === 'cast') psRenderPanel(); } return; }
            e.preventDefault();
            const i = +img.dataset.psa, a = s.actors[i]; if (!a) return;
            if (PS.sel !== i) { PS.sel = i; pzq('psStage').querySelectorAll('.ps-actor').forEach(x => x.classList.toggle('sel', +x.dataset.psa === i)); if (PS.tab !== 'lines') { PS.tab = 'cast'; psRenderPanel(); } }
            const st = pzq('psStage').getBoundingClientRect(), sx = e.clientX, sy = e.clientY, ax = a.x, ay = a.y;
            try { img.setPointerCapture(e.pointerId); } catch (x) {}
            const move = ev => {
                a.x = Math.round(Math.max(4, Math.min(96, ax + (ev.clientX - sx) / st.width * 100)) * 10) / 10;
                a.y = Math.round(Math.max(35, Math.min(100, ay + (ev.clientY - sy) / st.height * 100)) * 10) / 10;
                img.style.left = a.x + '%'; img.style.top = a.y + '%'; img.style.zIndex = Math.round(a.y * 10);
                PS.dirty = true;
            };
            const up = () => { img.removeEventListener('pointermove', move); img.removeEventListener('pointerup', up); img.removeEventListener('pointercancel', up); };
            img.addEventListener('pointermove', move); img.addEventListener('pointerup', up); img.addEventListener('pointercancel', up);
        }
        /* 📷 내 사진 배경 (긴 변 1280px JPG) */
        async function psAddPic(e) {
            const f = e.target.files && e.target.files[0]; e.target.value = '';
            if (!f) return;
            if (PS.show.pics.filter(Boolean).length >= PS_MAX_PICS) { showMsg(`내 사진 배경은 ${PS_MAX_PICS}장까지 넣을 수 있어요.`); return; }
            const url = URL.createObjectURL(f);
            try {
                const im = await loadImg(url);
                const k = Math.min(1, 1280 / Math.max(im.naturalWidth, im.naturalHeight));
                const c = document.createElement('canvas'); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k);
                c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
                PS.show.pics.push(c.toDataURL('image/jpeg', .82));
                psScene().bg = 'pic' + (PS.show.pics.length - 1); PS.dirty = true; psRenderEd();
            } catch (x) { showMsg('⚠ 사진을 열지 못했어요.'); }
            finally { URL.revokeObjectURL(url); }
        }

        /* ---------- 💾 저장 · 📤 파일 · 📂 불러오기 ---------- */
        async function psSave(msg) {
            if (PS.saving || !PS.show) return false;
            if (!PS.show.title) {
                const t = await psAskTitle(); if (!t) return false;
                PS.show.title = t; pzq('psTitle').value = t;
            }
            PS.saving = true;
            try {
                if (!(await psSaveStore())) return false;
                PS.dirty = false;
                try { if (PS.show.by) localStorage.setItem('malang_pattern_nick', PS.show.by); } catch (e) {}
                if (msg) showMsg(`💾 '${psEsc(PS.show.title)}' 인형극을 저장했어요!${psDrive() ? `<br><span style="font-size:12px;color:#777;">${PS_FOLDER().join(' / ')} / ${psEsc(psName(PS.show))}.json</span>` : '<br><span style="font-size:12px;color:#777;">로그인하지 않아서 이 기기에만 저장했어요.</span>'}`);
                return true;
            } catch (e) { console.error('인형극 저장 오류:', e); showMsg('⚠ 저장하지 못했어요.<br>인터넷 연결을 확인한 뒤 다시 저장해 주세요.'); return false; }
            finally { PS.saving = false; }
        }
        function psAskTitle() {
            return typeof shxAsk === 'function'
                ? shxAsk('🎭 인형극 제목', '', '', true).then(a => a && dollText(a.name, 20))
                : Promise.resolve(prompt('인형극 제목을 정해 주세요') || '').then(t => dollText(t, 20));
        }
        async function psExport() {
            if (!PS.show) return;
            const a = await shxAsk('📤 인형극 파일로 저장', psName(PS.show), PS.show.by, false, '불러온 사람에게 <b>만든 사람</b>으로 보여요');
            if (!a) return;
            PS.show.by = a.by; pzq('psBy').value = a.by;
            const blob = new Blob([JSON.stringify(Object.assign({ malang_show: 1 }, psPack(PS.show)))], { type: 'application/json' });
            downloadBlob(blob, `${a.name}.json`);
        }
        function psImport(e) {
            const f = e.target.files && e.target.files[0]; e.target.value = '';
            if (!f) return;
            if (f.size > 8e6) { showMsg('인형극 파일이 너무 커요.'); return; }
            f.text().then(t => {
                let o = null; try { o = JSON.parse(t); } catch (x) {}
                if (o && o.malang_doll) { showMsg('👧 인형 파일이에요.<br>👧 인형방의 📂 인형 불러오기로 넣어 주세요.'); return; }
                const show = o && o.malang_show ? psClean(o) : null;
                if (!show) { showMsg('⚠ 말랑달콤 인형극 파일이 아니에요.'); return; }
                if (!show.title) show.title = '받은 인형극';
                psOpenEdit(null, show);
                showMsg(`🎭 '${psEsc(show.title)}' 인형극을 불러왔어요!<br><span style="font-size:12px;color:#777;">💾 저장을 누르면 내 인형극에 들어가요.</span>`);
            });
        }
        async function psBack() {
            if (PS.dirty && (await showMsg('고친 인형극이 저장되지 않았어요.<br>저장할까요?', true))) { if (!(await psSave(false))) return; }
            psShowList();
        }

        /* ---------- 📷 장면 사진 (1600 × 1000 PNG) ---------- */
        async function psScenePng(show, sc, lineIdx) {
            const W = 1600, H = 1000, c = document.createElement('canvas'); c.width = W; c.height = H;
            const x = c.getContext('2d'), s = show.scenes[sc];
            const bg = await loadImg(psBgOf(show, s.bg));
            const k = Math.max(W / bg.naturalWidth, H / bg.naturalHeight);
            x.drawImage(bg, (W - bg.naturalWidth * k) / 2, (H - bg.naturalHeight * k) / 2, bg.naturalWidth * k, bg.naturalHeight * k);
            const order = s.actors.map((a, i) => i).sort((p, q) => s.actors[p].y - s.actors[q].y);
            for (const i of order) {
                const a = s.actors[i], cast = show.cast[a.c]; if (!cast) continue;
                const im = await loadImg(dollDataUrl(cast.doll, { bg: false, crop: true, pfx: 'pp' + i }));
                const h = H * .55 * a.s, w = h * im.naturalWidth / im.naturalHeight, cx = W * a.x / 100, by = H * a.y / 100;
                x.save(); x.translate(cx, 0); if (a.f) x.scale(-1, 1); x.drawImage(im, -w / 2, by - h, w, h); x.restore();
            }
            const ln = lineIdx != null ? s.lines[lineIdx] : null;
            if (ln) {
                x.font = 'bold 44px "Jua", "Gaegu", sans-serif'; x.textBaseline = 'top';
                const words = ln.t.split(''), lines = []; let cur = '';
                words.forEach(ch => { if (x.measureText(cur + ch).width > 620) { lines.push(cur); cur = ch; } else cur += ch; });
                if (cur) lines.push(cur);
                const bw = Math.max(...lines.map(t => x.measureText(t).width)) + 70, bh = lines.length * 56 + 50;
                let bx, byy;
                if (ln.w >= 0 && s.actors[ln.w]) { const a = s.actors[ln.w]; bx = Math.max(20, Math.min(W - bw - 20, W * a.x / 100 - bw / 2)); byy = Math.max(20, H * a.y / 100 - H * .55 * a.s - bh - 30); }
                else { bx = (W - bw) / 2; byy = H - bh - 40; }
                x.fillStyle = ln.w < 0 ? 'rgba(60,40,60,.82)' : '#fff'; x.strokeStyle = '#ff8fae'; x.lineWidth = 6;
                x.beginPath(); x.roundRect(bx, byy, bw, bh, 30); x.fill(); if (ln.w >= 0) x.stroke();
                if (ln.w >= 0 && s.actors[ln.w]) {                              // 말꼬리
                    const tx = Math.max(bx + 40, Math.min(bx + bw - 40, W * s.actors[ln.w].x / 100));
                    x.beginPath(); x.moveTo(tx - 18, byy + bh - 3); x.lineTo(tx, byy + bh + 26); x.lineTo(tx + 18, byy + bh - 3); x.closePath(); x.fill();
                    x.beginPath(); x.moveTo(tx - 18, byy + bh); x.lineTo(tx, byy + bh + 26); x.lineTo(tx + 18, byy + bh); x.stroke();
                }
                x.fillStyle = ln.w < 0 ? '#fff' : '#5a3d4a';
                lines.forEach((t, j) => x.fillText(t, bx + 35, byy + 25 + j * 56));
            }
            return c;
        }
        async function psShot() {
            try { const c = await psScenePng(PS.show, PS.sc, psScene().lines.length ? 0 : null); c.toBlob(b => { if (b) downloadBlob(b, `${psName(PS.show)}_${PS.sc + 1}장면.png`); }, 'image/png'); }
            catch (e) { console.warn(e); showMsg('⚠ 사진을 만들지 못했어요.'); }
        }
        async function psStick() {
            if (!isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!<br><span style="font-size:12px;color:#777;">표지를 넘긴 뒤 다시 붙여 주세요.</span>'); return; }
            try {
                const c = await psScenePng(PS.show, PS.sc, psScene().lines.length ? 0 : null);
                const el = createElementFromData({ type: 'image', content: c.toDataURL('image/jpeg', .88), width: '240px', posX: 50, posY: 60, scale: 1, rotation: 0, zIndex: zIndexCounter }, true);
                document.getElementById('canvasArea').appendChild(el);
                selectElement(el); saveData(false);
                showMsg('📔 장면 사진을 일기에 붙였어요!');
            } catch (e) { console.warn(e); showMsg('⚠ 일기에 붙이지 못했어요.'); }
        }

        /* =====================================================================
           ▶ 공연 : 막 열림 → 제목 → 장면 · 대사 → 끝 → 막 닫힘
           ===================================================================== */
        function psSteps(show, from) {                         // [{ sc, li }] (li = -1 : 대사 없는 장면)
            const out = [];
            show.scenes.forEach((s, i) => { if (i < from) return; if (!s.lines.length) out.push({ sc: i, li: -1 }); else s.lines.forEach((l, j) => out.push({ sc: i, li: j })); });
            return out;
        }
        function psTone(f, d, v) { try { if (typeof ritTone === 'function') ritTone(f, d, v, 'triangle'); } catch (e) {} }
        async function psPlay(from, fromList) {
            if (!PS.show) return;
            psBuild();
            const steps = psSteps(PS.show, from || 0);
            PS.play = { steps, i: -1, timer: 0, typing: 0, paused: false, sc: -1, fromList: !!fromList, ended: false };
            const P = pzq('psPlay'); P.hidden = false; document.body.classList.add('fc-lock');
            pzq('psPStage').innerHTML = ''; pzq('psPPause').textContent = '⏸';
            const L = pzq('psCurL'), R = pzq('psCurR'), card = pzq('psCard');
            L.classList.remove('open'); R.classList.remove('open');
            card.innerHTML = `<b>🎭 ${psEsc(PS.show.title || '이름 없는 인형극')}</b>${PS.show.by ? `<small>by ${psEsc(PS.show.by)}</small>` : ''}`; card.className = 'ps-card show';
            psTone(523, .4, .05); setTimeout(() => psTone(784, .5, .05), 180);
            await new Promise(r => setTimeout(r, 1500));
            if (!PS.play || PS.play.ended) return;
            card.className = 'ps-card';
            L.classList.add('open'); R.classList.add('open');
            psPlayStep(+1);
        }
        function psPlayStep(dir, user) {
            const p = PS.play; if (!p || p.ended) return;
            if (user && p.typing) { clearInterval(p.typing); p.typing = 0; const b = pzq('psPStage').querySelector('.ps-bub-t'); if (b) b.textContent = b.dataset.full; psPlayWait(); return; }   // 타자 중이면 먼저 끝까지
            clearTimeout(p.timer); clearInterval(p.typing); p.typing = 0;
            p.i += dir;
            if (p.i < 0) p.i = 0;
            if (p.i >= p.steps.length) { psPlayFinish(); return; }
            const st = p.steps[p.i], show = PS.show, s = show.scenes[st.sc], ln = st.li >= 0 ? s.lines[st.li] : null;
            const stage = pzq('psPStage');
            const speak = ln && ln.w >= 0 ? ln.w : -1;
            const draw = () => {
                stage.innerHTML = psStageHtml(show, st.sc, { speak, face: ln && ln.e, tick: 'p' + p.i });
                if (!ln) return psPlayWait(2200);
                const bub = document.createElement('div');
                if (speak >= 0 && s.actors[speak]) {
                    const a = s.actors[speak], top = a.y - 55 * a.s - 3;
                    bub.className = 'ps-bub' + (top < 16 ? ' low' : ''); bub.style.left = Math.max(25, Math.min(75, a.x)) + '%'; bub.style.top = (top < 16 ? 3 : top) + '%';   // 머리가 너무 위면 무대 위쪽에
                    bub.innerHTML = `<small>${psEsc(show.cast[a.c].doll.name || '')}</small><span class="ps-bub-t"></span>`;
                } else { bub.className = 'ps-bub nar'; bub.innerHTML = '<span class="ps-bub-t"></span>'; }
                stage.appendChild(bub);
                const t = bub.querySelector('.ps-bub-t'); t.dataset.full = ln.t;
                let k = 0;
                p.typing = setInterval(() => {
                    if (p.paused) return;
                    k++; t.textContent = ln.t.slice(0, k);
                    if (k % 2 === 0 && ln.t[k - 1] !== ' ') psTone(speak < 0 ? 660 : 880 + (speak * 90), .05, .02);
                    if (k >= ln.t.length) { clearInterval(p.typing); p.typing = 0; psPlayWait(); }
                }, 55);
            };
            if (st.sc !== p.sc) {                                           // 장면이 바뀌면 살짝 어두워졌다가
                p.sc = st.sc;
                stage.classList.add('fade');
                setTimeout(() => { if (PS.play === p && !p.ended) { draw(); stage.classList.remove('fade'); } }, 380);
            } else draw();
        }
        function psPlayWait(ms) {
            const p = PS.play; if (!p) return;
            const st = p.steps[p.i], ln = st && st.li >= 0 ? PS.show.scenes[st.sc].lines[st.li] : null;
            clearTimeout(p.timer);
            const wait = ms || Math.min(4200, 1300 + (ln ? ln.t.length * 45 : 0));
            const go = () => { if (PS.play !== p || p.ended) return; if (p.paused) { p.timer = setTimeout(go, 300); return; } psPlayStep(+1); };
            p.timer = setTimeout(go, wait);
        }
        function psPlayPause() {
            const p = PS.play; if (!p || p.ended) return;
            p.paused = !p.paused; pzq('psPPause').textContent = p.paused ? '▶' : '⏸';
        }
        async function psPlayFinish() {
            const p = PS.play; if (!p) return;
            p.ended = true; clearTimeout(p.timer); clearInterval(p.typing);
            const L = pzq('psCurL'), R = pzq('psCurR'), card = pzq('psCard');
            await new Promise(r => setTimeout(r, 400));
            L.classList.remove('open'); R.classList.remove('open');
            [784, 659, 523].forEach((f, i) => setTimeout(() => psTone(f, .45, .05), 300 + i * 200));
            await new Promise(r => setTimeout(r, 1100));
            if (PS.play !== p) return;
            card.innerHTML = `<b>🎬 끝</b><small>${psEsc(PS.show.title || '')}</small><div class="ps-card-btns"><button type="button" onclick="psPlay(0, PS.play && PS.play.fromList)">🔁 다시 보기</button><button type="button" onclick="psPlayEnd()">✕ 닫기</button></div>`;
            card.className = 'ps-card show end';
        }
        function psPlayEnd() {
            const p = PS.play;
            if (p) { p.ended = true; clearTimeout(p.timer); clearInterval(p.typing); }
            PS.play = null;
            pzq('psPlay').hidden = true; pzq('psPStage').innerHTML = '';
            document.body.classList.remove('fc-lock');
            if (p && p.fromList) { PS.show = null; }
        }
        window.openPuppetShow = openPuppetShow;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['puppet'] = true;
