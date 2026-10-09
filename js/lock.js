/* 말랑달콤 다이어리 - js/lock.js
   🔒 다이어리 잠금 : 다이어리를 열 때 4자리 비밀번호를 물어봐요 (⚙ 설정 → 🔒 다이어리 잠금)
   - 비밀번호는 그대로 저장하지 않고, 풀 수 없는 암호(해시)로 바꿔 설정(설정.json)에 저장 → 다른 기기에서도 같은 비밀번호
     이 기기에도 한 벌 기억해서, 드라이브를 불러오기 전에도 잠금 화면이 먼저 떠요
   - 자동 잠금 : 다이어리를 열 때만 / 잠깐(1분 · 5분) 나갔다 돌아와도
   - 비밀번호를 잊으면 : '비밀번호를 잊었어요' → 다이어리 주인의 구글 계정으로 다시 로그인하면 잠금이 풀려요
   - 로그인해서 쓸 때만 켤 수 있어요 (게스트는 비밀번호를 잊으면 되찾을 방법이 없어서)
   ※ 잠금은 '화면'을 막는 거예요. 일기 파일 자체를 암호화하지는 않아요.
   ※ 이 파일이 없어도 다이어리는 정상 동작 (잠금 기능만 없어요) */

        const LOCK_KEY = 'diary_lock';                 // 설정 저장소 { h: 해시, s: 소금, u: 구글 계정 번호, a: 자동 잠금(분, 0 = 열 때만) }
        const LOCK_LOCAL = 'malang_lock';              // 이 기기 보관본 (드라이브를 읽기 전 잠금 화면용)
        const LOCK_TRIES = 5, LOCK_WAIT = 30;          // 5번 틀리면 30초 기다리기
        const lk2 = { rec: null, mode: '', buf: '', first: '', fails: 0, waitUntil: 0, hiddenAt: 0, open: false, after: null };
        const lkq2 = id => document.getElementById(id);

        async function lockHash(pin, salt) {
            const data = new TextEncoder().encode('malang|' + salt + '|' + pin);
            const buf = await crypto.subtle.digest('SHA-256', data);
            return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
        }
        function lockRead() {
            let r = null;
            try { if (typeof drive !== 'undefined' && drive.ready) r = JSON.parse(store.getItem(LOCK_KEY)); } catch (e) {}
            if (!r && !(typeof drive !== 'undefined' && drive.ready)) { try { r = JSON.parse(localStorage.getItem(LOCK_LOCAL)); } catch (e) {} }
            return r && r.h && r.s ? r : null;
        }
        function lockWrite(r) {
            if (r) { store.setItem(LOCK_KEY, JSON.stringify(r)); try { localStorage.setItem(LOCK_LOCAL, JSON.stringify(r)); } catch (e) {} }
            else { store.removeItem(LOCK_KEY); try { localStorage.removeItem(LOCK_LOCAL); } catch (e) {} }
            lk2.rec = r;
        }
        async function lockOwner() {                    // 지금 로그인한 구글 계정 번호
            try { const res = await gfetch('https://www.googleapis.com/drive/v3/about?fields=user(permissionId)'); return ((await res.json()).user || {}).permissionId || ''; }
            catch (e) { return ''; }
        }

        /* ---------- 잠금 화면 (열 때 · 설정할 때 공용) ---------- */
        function lockBuild() {
            if (lkq2('lockScreen')) return;
            const el = document.createElement('div');
            el.id = 'lockScreen'; el.className = 'lock-screen'; el.hidden = true;
            el.innerHTML = `
              <div class="lock-box">
                <div class="lock-ico" id="lockIco">🔒</div>
                <b id="lockTitle">말랑달콤 다이어리</b>
                <p id="lockMsg">비밀번호 4자리를 눌러 주세요</p>
                <div class="lock-dots" id="lockDots"><i></i><i></i><i></i><i></i></div>
                <div class="lock-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" onclick="lockKey('${n}')">${n}</button>`).join('')}
                  <button type="button" class="lock-sub" id="lockLeft" onclick="lockLeft()"></button><button type="button" onclick="lockKey('0')">0</button><button type="button" class="lock-sub" onclick="lockKey('del')" aria-label="지우기">⌫</button></div>
                <button type="button" class="lock-forgot" id="lockForgot" onclick="lockForgot()">비밀번호를 잊었어요</button>
              </div>`;
            document.body.appendChild(el);
            document.addEventListener('keydown', e => {
                if (!lk2.open) return;
                if (/^[0-9]$/.test(e.key)) lockKey(e.key);
                else if (e.key === 'Backspace') lockKey('del');
                else if (e.key === 'Escape' && lk2.mode !== 'unlock') lockClose();
            });
        }
        function lockShow(mode, title, msg) {
            lockBuild();
            lk2.mode = mode; lk2.buf = ''; lk2.open = true;
            lkq2('lockTitle').textContent = title; lkq2('lockMsg').textContent = msg; lkq2('lockMsg').classList.remove('err');
            lkq2('lockIco').textContent = mode === 'unlock' ? '🔒' : '🔐';
            lkq2('lockLeft').textContent = mode === 'unlock' ? '' : '취소';
            lkq2('lockForgot').hidden = !(mode === 'unlock' || mode === 'check');
            lkq2('lockScreen').hidden = false;
            document.body.classList.add('lock-on');
            lockDots();
        }
        function lockClose() {
            lk2.open = false; lk2.mode = '';
            const s = lkq2('lockScreen'); if (s) s.hidden = true;
            document.body.classList.remove('lock-on');
        }
        function lockLeft() { if (lk2.mode !== 'unlock') lockClose(); }
        function lockDots(shake) {
            lkq2('lockDots').querySelectorAll('i').forEach((d, i) => d.classList.toggle('on', i < lk2.buf.length));
            if (shake) { const d = lkq2('lockDots'); d.classList.remove('shake'); void d.offsetWidth; d.classList.add('shake'); }
        }
        function lockSay(t, err) { const m = lkq2('lockMsg'); m.textContent = t; m.classList.toggle('err', !!err); }

        async function lockKey(k) {
            if (!lk2.open) return;
            if (lk2.waitUntil > Date.now()) { lockSay(`조금 쉬었다 해요 · ${Math.ceil((lk2.waitUntil - Date.now()) / 1000)}초 뒤에 다시`, true); return; }
            if (k === 'del') { lk2.buf = lk2.buf.slice(0, -1); lockDots(); return; }
            if (lk2.buf.length >= 4) return;
            lk2.buf += k; lockDots();
            if (lk2.buf.length < 4) return;
            const pin = lk2.buf;
            await new Promise(r => setTimeout(r, 120));
            if (lk2.mode === 'unlock' || lk2.mode === 'check') {
                const rec = lk2.rec || lockRead();
                if (rec && await lockHash(pin, rec.s) === rec.h) {
                    lk2.fails = 0; if (lk2.mode === 'unlock') lk2.unlockedOnce = true;
                    const after = lk2.after; lk2.after = null;
                    lockClose(); if (after) after();
                    return;
                }
                lk2.fails++; lk2.buf = ''; lockDots(true);
                if (lk2.fails >= LOCK_TRIES) { lk2.fails = 0; lk2.waitUntil = Date.now() + LOCK_WAIT * 1000; lockSay(`${LOCK_TRIES}번 틀렸어요 · ${LOCK_WAIT}초 뒤에 다시 해 주세요`, true); }
                else lockSay(`비밀번호가 달라요 (${lk2.fails}/${LOCK_TRIES})`, true);
                return;
            }
            if (lk2.mode === 'new1') { lk2.first = pin; lk2.mode = 'new2'; lk2.buf = ''; lockDots(); lockSay('한 번 더 똑같이 눌러 주세요'); return; }
            if (lk2.mode === 'new2') {
                if (pin !== lk2.first) { lk2.mode = 'new1'; lk2.buf = ''; lockDots(true); lockSay('두 번이 달라요. 처음부터 다시 눌러 주세요', true); return; }
                const s = Math.random().toString(36).slice(2, 10);
                const old = lockRead();
                const rec = { h: await lockHash(pin, s), s, u: (old && old.u) || await lockOwner(), a: old ? old.a : 0 };
                lockWrite(rec); lockClose(); lockRenderSettings();
            }
        }

        /* 비밀번호를 잊었을 때 : 주인 구글 계정으로 다시 로그인 → 잠금 풀기 */
        async function lockForgot() {
            const rec = lk2.rec || lockRead();
            const yes = await showMsg('다이어리 주인의 <b>구글 계정으로 다시 로그인</b>하면 잠금이 풀려요.<br><span style="font-size:12px;color:#777;">풀린 뒤 ⚙ 설정 → 🔒 다이어리 잠금에서 새 비밀번호를 정할 수 있어요.</span>', true);
            if (!yes) return;
            try {
                await requestToken('select_account');
                const who = await lockOwner();
                if (rec && rec.u && who !== rec.u) { showMsg('⚠ 다이어리 주인의 구글 계정이 아니에요.'); return; }
                if (!drive.ready) await loadFromDrive();
                lockWrite(null); lk2.after = null; lk2.unlockedOnce = true; lockClose(); lockRenderSettings();
                showMsg('🔓 잠금을 풀었어요.<br><span style="font-size:12px;color:#777;">다시 잠그려면 ⚙ 설정 → 🔒 다이어리 잠금</span>');
            } catch (e) { showMsg('⚠ 구글 로그인을 하지 못했어요. 다시 해 주세요.'); }
        }

        /* ---------- 언제 잠그나요 ---------- */
        function lockNeed() { const r = lockRead(); lk2.rec = r; if (r) lockShow('unlock', '말랑달콤 다이어리', '비밀번호 4자리를 눌러 주세요'); }
        function lockAfterLoad() {                                  // 드라이브에서 설정을 불러온 뒤 (js/drive.js 에서 불러요)
            const r = lockRead(); if (r) lk2.rec = r;
            try { if (r) localStorage.setItem(LOCK_LOCAL, JSON.stringify(r)); else localStorage.removeItem(LOCK_LOCAL); } catch (e) {}
            if (r && !lk2.open && !lk2.unlockedOnce) lockNeed();
            if (!r && lk2.open && lk2.mode === 'unlock') lockClose();
            lockRenderSettings();
        }
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) { lk2.hiddenAt = Date.now(); return; }
            const r = lockRead();
            if (r && r.a > 0 && lk2.hiddenAt && Date.now() - lk2.hiddenAt >= r.a * 60000 && !lk2.open) lockNeed();
        });

        /* ---------- ⚙ 설정 → 🔒 다이어리 잠금 ---------- */
        function openLockSettings() {
            if (typeof closeModal === 'function') closeModal('settingsMenuModal');
            lockRenderSettings();
            openModal('lockModal');
        }
        function lockRenderSettings() {
            const box = lkq2('lockSet'); if (!box) return;
            const r = lockRead(), logged = typeof drive !== 'undefined' && drive.ready && !drive.guest;
            if (!logged) { box.innerHTML = '<p class="lock-note">☁ 구글 계정으로 로그인해야 잠금을 켤 수 있어요.<br>(비밀번호를 잊었을 때 구글 계정으로 되찾기 위해서예요)</p>'; return; }
            box.innerHTML = r ? `
                <div class="lock-state on">🔒 잠금이 켜져 있어요</div>
                <label class="lock-label">자동 잠금</label>
                <select class="btn" id="lockAuto" onchange="lockSetAuto(this.value)" style="width:100%;">
                  <option value="0"${r.a === 0 ? ' selected' : ''}>다이어리를 열 때만</option>
                  <option value="1"${r.a === 1 ? ' selected' : ''}>1분 넘게 나갔다 오면 다시 잠금</option>
                  <option value="5"${r.a === 5 ? ' selected' : ''}>5분 넘게 나갔다 오면 다시 잠금</option>
                </select>
                <div class="lock-btns"><button class="btn" type="button" onclick="lockChange()">🔑 비밀번호 바꾸기</button><button class="btn" type="button" onclick="lockOff()">🔓 잠금 끄기</button></div>`
                : `<div class="lock-state">🔓 잠금이 꺼져 있어요</div>
                <button class="btn lock-on-btn" type="button" onclick="lockOn()">🔒 비밀번호 정하고 잠금 켜기</button>`;
            box.innerHTML += '<p class="lock-note">비밀번호는 다른 기기에서도 똑같이 쓰여요. 잊어버리면 잠금 화면의 <b>비밀번호를 잊었어요</b>를 눌러 구글 계정으로 다시 로그인하면 풀려요.<br>※ 잠금은 다이어리 화면을 막는 기능이에요.</p>';
        }
        function lockOn() { closeModal('lockModal'); lockShow('new1', '새 비밀번호', '쓸 비밀번호 4자리를 눌러 주세요'); }
        function lockChange() { closeModal('lockModal'); lk2.after = () => lockShow('new1', '새 비밀번호', '바꿀 비밀번호 4자리를 눌러 주세요'); lockShow('check', '지금 비밀번호', '지금 비밀번호 4자리를 눌러 주세요'); }
        function lockOff() {
            closeModal('lockModal');
            lk2.after = () => { lockWrite(null); lockRenderSettings(); };
            lockShow('check', '잠금 끄기', '지금 비밀번호 4자리를 눌러 주세요');
        }
        function lockSetAuto(v) { const r = lockRead(); if (!r) return; r.a = +v || 0; lockWrite(r); }

        /* 페이지를 열자마자 : 이 기기에 잠금 기록이 있으면 드라이브를 읽기 전에도 잠금 화면 */
        (function lockBoot() { let r = null; try { r = JSON.parse(localStorage.getItem(LOCK_LOCAL)); } catch (e) {} if (r && r.h) { lk2.rec = r; lockNeed(); } })();
        window.openLockSettings = openLockSettings;
        window.lockAfterLoad = lockAfterLoad;
