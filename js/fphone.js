/* 말랑달콤 다이어리 - js/fphone.js
   📞 반짝이 피처폰 메신저 (도련 · 2026-10-14)
   - 페이지 옆에 접힌 폴더폰이 놓여 있어요 → 끌어서 옮기고 (위치는 이 기기에 기억) · 누르면 열려요
   - 구글로 로그인한 회원끼리 · 둘 다 다이어리를 켜 둔 동안만 쓰는 1:1 문자 (부재중 · 기록 없음)
   - 닉네임 : 전화기에서 정해요 → 서버 '회원 목록' R 칸 (겹치면 다른 닉네임 추천)
   - 연락처 = 내 전화기에 등록한 닉네임들 (설정에 저장 · 구글 드라이브) · 서버는 몰라요
   - 걸기 : 친구를 고르고 📞 → 파이어스토어 '상대 우편함'에 신호를 넣어요 (등록 안 된 닉네임이면 바로 알려 줘요)
     받는 쪽 : 내 우편함을 듣고 있다가 바로 → 내 목록에 건 사람이 있으면 알람 · 진동 · 벨소리 / 없으면 울리지 않고 '전화를 걸 수 없습니다'
     30초 안에 안 받으면 '자리에 없어요' · 받으면 WebRTC 로 두 브라우저가 직접 연결 → 서버는 빠져요
   - 문자 중에 다른 친구가 걸면 또 울려요 → 받으면 대화가 하나 더 (위 이름표로 바꿔요) · 받든 말든 사용자 마음
   - 연결이 잘 안 되면 끊고 포기 · 끊으면 대화는 사라져요 · 친구를 지우면 그 친구와의 대화도 바로 끊겨요
   - 서버 : 말랑달콤사람들_앱스크립트.gs 의 fp_hello · fp_nick (구글 로그인 확인 → 닉네임 + 파이어스토어 출입증)
            신호 : 파이어스토어 softsweetdiary-phone · inbox/{받는 닉네임 소문자}/sig · users/{닉네임 소문자} (보안 규칙은 파이어베이스 콘솔)
            읽은 신호는 바로 지워요 · 오래된 신호(90초)는 무시하고 지워요 · 하루 무료량을 넘으면 '오늘은 쉬어요'
   ※ 이 파일이 없어도 다이어리는 정상 동작 */

        const FP_CONTACTS = 'diary_fp_contacts', FP_POS = 'malang_fp_pos';
        const FP_RING = 30000, FP_LINK = 15000, FP_OLD = 90000;
        const FP_FB = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-';
        const FP_FBCFG = { apiKey: 'AIzaSyDg3q7ki9HS_6h-Txv9J1kGc9VTmo2b8lc', authDomain: 'softsweetdiary-phone.firebaseapp.com', projectId: 'softsweetdiary-phone', storageBucket: 'softsweetdiary-phone.firebasestorage.app', messagingSenderId: '666233690853', appId: '1:666233690853:web:7e6be0cca2e150a489520c' };
        const FP_ICE = [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }];
        const fp = { el: null, open: false, fb: null, on: false, unsub: null, nick: '', view: 'home', sel: 0, convs: new Map(), cur: '', ring: [], calling: null, timer: 0, busy: false, err: '', toastT: 0, ringT: 0, buzzT: 0, tone: null, nickTry: null };
        const fpq = s => fp.el && fp.el.querySelector(s);
        const fpEsc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
        const fpUsable = () => typeof drive !== 'undefined' && drive.ready && !drive.guest && !drive.local && typeof MEMBER_API_URL !== 'undefined' && !!MEMBER_API_URL;

        /* ---------- 연락처 (내 전화기의 닉네임 목록) ---------- */
        function fpContacts() { try { const a = JSON.parse(store.getItem(FP_CONTACTS) || '[]'); return Array.isArray(a) ? a.filter(n => typeof n === 'string') : []; } catch (e) { return []; } }
        function fpSaveContacts(a) { store.setItem(FP_CONTACTS, JSON.stringify(a)); }
        const fpHas = n => fpContacts().some(x => x.toLowerCase() === String(n).toLowerCase());

        /* ---------- 서버 (앱스크립트 : 닉네임 · 출입증) ---------- */
        async function fpApi(action, data) {
            await ensureToken();
            const res = await fetch(MEMBER_API_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action, token: drive.token }, data || {})), credentials: 'omit' });
            return res.json();
        }

        /* ---------- 파이어스토어 (신호 우편함) ---------- */
        async function fpFirebase() {
            if (fp.fb) return fp.fb;
            const [A, U, F] = await Promise.all(['app', 'auth', 'firestore'].map(n => import(FP_FB + n + '.js')));
            const app = A.getApps().find(x => x.name === 'fphone') || A.initializeApp(FP_FBCFG, 'fphone');
            fp.fb = { U, F, auth: U.getAuth(app), db: F.getFirestore(app) };
            return fp.fb;
        }
        const fpNl = n => String(n).toLowerCase();
        const fpQuota = e => e && /resource-exhausted/.test(e.code || e.message || '');
        const FP_QUOTA_MSG = '오늘은 전화가 너무 많아서 쉬어요… 오후 5시쯤 다시 해 주세요';
        function fpStopListen() { if (fp.unsub) { try { fp.unsub(); } catch (e) {} } fp.unsub = null; fp.on = false; }
        /* 출입증으로 들어가서 내 우편함을 들어요 */
        async function fpConnect(ft) {
            fpStopListen();
            if (!ft || !fp.nick) { fp.err = ft ? '' : 'setup'; return; }
            const { U, F, auth, db } = await fpFirebase();
            await U.signInWithCustomToken(auth, ft);
            const me = fpNl(fp.nick);
            await F.setDoc(F.doc(db, 'users', me), { nd: fp.nick, at: F.serverTimestamp() });   // '등록된 닉네임' 표시 (한 번)
            fp.unsub = F.onSnapshot(F.collection(db, 'inbox', me, 'sig'), snap => {
                fp.err = '';
                snap.docChanges().forEach(ch => {
                    if (ch.type !== 'added') return;
                    const s = ch.doc.data(), at = s.at && s.at.toMillis ? s.at.toMillis() : Date.now();
                    F.deleteDoc(ch.doc.ref).catch(() => {});                   // 읽은 신호는 바로 지워요
                    if (Date.now() - at > (s.t === 'call' ? FP_RING : FP_OLD)) return;   // 오래된 신호는 무시
                    fpSignal(s);
                });
            }, e => { console.warn('📞 우편함:', e); fp.on = false; fp.unsub = null; fp.err = fpQuota(e) ? 'quota' : 'net'; fpRender(); });
            fp.on = true; fp.err = '';
        }
        async function fpSend(t, to, id, sdp) {
            if (!fp.on) return { ok: false, error: 'net' };
            const { F, db } = fp.fb;
            try {
                await F.addDoc(F.collection(db, 'inbox', fpNl(to), 'sig'), { t, from: fp.nick, fl: fpNl(fp.nick), id, sdp: sdp || '', at: F.serverTimestamp() });
                return { ok: true };
            } catch (e) { console.warn('📞 신호:', e); return { ok: false, error: fpQuota(e) ? 'quota' : 'net' }; }
        }
        async function fpKnown(nick) {                                          // 등록된 닉네임인지 (users)
            const { F, db } = fp.fb;
            try { return (await F.getDoc(F.doc(db, 'users', fpNl(nick)))).exists() ? 'ok' : 'nonick'; }
            catch (e) { return fpQuota(e) ? 'quota' : 'net'; }
        }

        /* ---------- WebRTC ---------- */
        function fpPC() { return new RTCPeerConnection({ iceServers: FP_ICE }); }
        function fpGather(pc) {                                                 // 연결 정보를 한 번에 다 담아 보내요 (신호 2번으로 연결)
            return new Promise(ok => {
                if (pc.iceGatheringState === 'complete') return ok();
                const t = setTimeout(ok, 2500);
                pc.addEventListener('icegatheringstatechange', () => { if (pc.iceGatheringState === 'complete') { clearTimeout(t); ok(); } });
            });
        }
        const fpId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        function fpConv(nick) {
            let c = fp.convs.get(nick);
            if (!c) { c = { nick, pc: null, dc: null, msgs: [], state: 'link', unread: 0, linkT: 0 }; fp.convs.set(nick, c); }
            return c;
        }
        function fpWire(c, dc) {
            c.dc = dc;
            dc.onopen = () => { clearTimeout(c.linkT); c.state = 'on'; fpSys(c, '연결됐어요 ♡'); fpRender(); };
            dc.onmessage = e => {
                let m = null; try { m = JSON.parse(e.data); } catch (x) {}
                if (!m) return;
                if (m.t === 'm' && typeof m.x === 'string') {
                    c.msgs.push({ me: false, x: m.x.slice(0, 500) });
                    if (fp.cur !== c.nick || !fp.open || fp.view !== 'chat') { c.unread++; fpBuzz(true); }
                    fpRender();
                }
                if (m.t === 'bye') fpEnd(c, '상대가 끊었어요');
            };
            dc.onclose = () => { if (c.state !== 'end' && fp.convs.get(c.nick) === c) fpEnd(c, '통화가 끝났어요'); };   // 거는 중에 그만둔 연결은 조용히
        }
        function fpWatch(c) {
            c.pc.onconnectionstatechange = () => { if (['failed', 'disconnected'].includes(c.pc.connectionState) && c.state !== 'end' && fp.convs.get(c.nick) === c) fpEnd(c, '연결이 잘 안 돼서 끊었어요'); };
            c.linkT = setTimeout(() => { if (c.state === 'link') fpEnd(c, '연결이 잘 안 돼서 끊었어요'); }, FP_LINK);
        }
        function fpSys(c, x) { c.msgs.push({ sys: true, x }); }
        function fpEnd(c, why, quiet) {
            if (!c || c.state === 'end') return;
            c.state = 'end'; clearTimeout(c.linkT);
            try { if (c.dc && c.dc.readyState === 'open' && !quiet) c.dc.send(JSON.stringify({ t: 'bye' })); } catch (e) {}
            try { c.dc && c.dc.close(); } catch (e) {}
            try { c.pc && c.pc.close(); } catch (e) {}
            fp.convs.delete(c.nick);                                            // 끊으면 대화는 사라져요
            if (fp.cur === c.nick) fp.cur = fp.convs.keys().next().value || '';
            if (!fp.cur && fp.view === 'chat') fp.view = 'home';
            if (why) fpToast(`${c.nick} · ${why}`);
            fpRender();
        }

        /* ---------- 걸기 ---------- */
        async function fpCall(nick) {
            if (!nick || fp.calling) return;
            if (fp.convs.has(nick)) { fp.cur = nick; fp.view = 'chat'; fpRender(); return; }
            if (!fp.on) { fpToast(fp.err === 'quota' ? FP_QUOTA_MSG : '📶 연결 중이에요. 잠시 후 다시 걸어 주세요'); if (fp.err !== 'quota') fpStart(); return; }
            const id = fpId(), pc = fpPC(), c = { nick, pc, dc: null, msgs: [], state: 'link', unread: 0, linkT: 0 };
            fp.calling = { nick, id, pc, c, t0: Date.now() };
            fp.view = 'calling'; fpRender();
            try {
                fpWire(c, pc.createDataChannel('fp'));
                await pc.setLocalDescription(await pc.createOffer());
                await fpGather(pc);
                if (!fp.calling || fp.calling.id !== id) return;
                const known = await fpKnown(nick);
                const r = known === 'ok' ? await fpSend('call', nick, id, pc.localDescription.sdp) : { ok: false, error: known };
                if (!fp.calling || fp.calling.id !== id) return;
                if (!r.ok) {
                    fpStopCalling();
                    fpToast(r.error === 'nonick' ? `'${nick}'은 등록되지 않은 닉네임이에요` : r.error === 'quota' ? FP_QUOTA_MSG : '전화를 걸지 못했어요');
                    return;
                }
                fp.calling.giveUp = setTimeout(() => {                         // 30초 안에 안 받으면
                    if (!fp.calling || fp.calling.id !== id) return;
                    fpSend('cancel', nick, id).catch(() => {});
                    fpStopCalling(); fpToast(`${nick} · 자리에 없어요`);
                }, FP_RING);
            } catch (e) { console.warn(e); fpStopCalling(); fpToast('전화를 걸지 못했어요'); }
        }
        function fpStopCalling(keep) {
            const k = fp.calling; if (!k) return;
            clearTimeout(k.giveUp); fp.calling = null;
            if (!keep) { try { k.pc.close(); } catch (e) {} if (fp.view === 'calling') fp.view = 'home'; }
            fpRender();
        }
        function fpHangCalling() { const k = fp.calling; if (!k) return; fpSend('cancel', k.nick, k.id).catch(() => {}); fpStopCalling(); }

        /* ---------- 받은 신호 ---------- */
        function fpSignal(s) {
            if (!s || !s.from) return;
            const k = fp.calling;
            if (s.t === 'call') {
                if (!fpHas(s.from)) { fpSend('nope', s.from, s.id).catch(() => {}); return; }   // 내 목록에 없으면 울리지 않아요
                if (fp.convs.has(s.from)) fpEnd(fp.convs.get(s.from), '', true);                // 같은 친구가 다시 걸면 새로
                if (!fp.ring.some(r => r.id === s.id)) { fp.ring.push({ from: s.from, id: s.id, sdp: s.sdp, t0: Date.now() }); fpRingOn(); }
                return;
            }
            if (s.t === 'cancel') { fp.ring = fp.ring.filter(r => r.id !== s.id); if (!fp.ring.length) fpRingOff(); fpRender(); return; }
            if (!k || k.nick.toLowerCase() !== s.from.toLowerCase() || k.id !== s.id) return;
            if (s.t === 'ans') {
                const c = k.c; fpStopCalling(true);
                fp.convs.set(c.nick, c); fp.cur = c.nick; fp.view = 'chat';
                fpSys(c, '연결하는 중…'); fpWatch(c);
                c.pc.setRemoteDescription({ type: 'answer', sdp: s.sdp }).catch(() => fpEnd(c, '연결이 잘 안 돼서 끊었어요'));
                fpRender();
            } else if (s.t === 'rej') { fpStopCalling(); fpToast(`${k.nick} · 전화를 받지 않아요`); }
            else if (s.t === 'nope') { fpStopCalling(); fpToast('전화를 걸 수 없습니다'); }
        }
        async function fpAccept(r) {
            fp.ring = fp.ring.filter(x => x !== r); if (!fp.ring.length) fpRingOff();
            const c = fpConv(r.from); c.pc = fpPC(); c.state = 'link';
            fp.cur = c.nick; fp.view = 'chat'; fpSys(c, '연결하는 중…'); fpRender();
            c.pc.ondatachannel = e => fpWire(c, e.channel);
            fpWatch(c);
            try {
                await c.pc.setRemoteDescription({ type: 'offer', sdp: r.sdp });
                await c.pc.setLocalDescription(await c.pc.createAnswer());
                await fpGather(c.pc);
                const res = await fpSend('ans', r.from, r.id, c.pc.localDescription.sdp);
                if (!res.ok) fpEnd(c, '연결이 잘 안 돼서 끊었어요');
            } catch (e) { console.warn(e); fpEnd(c, '연결이 잘 안 돼서 끊었어요'); }
        }
        function fpReject(r) {
            fp.ring = fp.ring.filter(x => x !== r); if (!fp.ring.length) fpRingOff();
            fpSend('rej', r.from, r.id).catch(() => {});
            fpRender();
        }

        /* ---------- 알람 · 진동 · 벨소리 ---------- */
        function fpRingOn() {
            fp.el.classList.add('ringing');
            if (!fp.ringT) {
                const tick = () => {
                    const now = Date.now();
                    fp.ring = fp.ring.filter(r => now - r.t0 < FP_RING);         // 30초 지나면 그만 울려요
                    if (!fp.ring.length) { fpRingOff(); fpRender(); return; }
                    fpBuzz(); fpTone();
                };
                tick(); fp.ringT = setInterval(tick, 1800);
            }
            fpRender();
        }
        function fpRingOff() { clearInterval(fp.ringT); fp.ringT = 0; if (fp.el) fp.el.classList.remove('ringing'); }
        function fpBuzz(short) {
            if (navigator.vibrate) try { navigator.vibrate(short ? 60 : [300, 120, 300]); } catch (e) {}
            if (short && fp.el) { fp.el.classList.remove('buzz'); void fp.el.offsetWidth; fp.el.classList.add('buzz'); }
        }
        function fpTone() {                                                     // 8비트 벨소리 (소리 설정을 따라요 · js/sound.js)
            const ac = typeof sndFx === 'function' ? sndFx() : null; if (!ac) return;
            const notes = [1046, 1318, 1568, 1318, 1046, 1568], t0 = ac.currentTime + .02;
            notes.forEach((f, i) => {
                const o = ac.createOscillator(), g = ac.createGain();
                o.type = 'square'; o.frequency.value = f;
                g.gain.setValueAtTime(0, t0 + i * .11); g.gain.linearRampToValueAtTime(.05, t0 + i * .11 + .01); g.gain.linearRampToValueAtTime(0, t0 + i * .11 + .1);
                o.connect(g); g.connect(ac.destination); o.start(t0 + i * .11); o.stop(t0 + i * .11 + .11);
            });
        }

        /* ---------- 문자 ---------- */
        function fpSendMsg() {
            const inp = fpq('.fp-in'), c = fp.convs.get(fp.cur);
            const x = inp ? inp.value.trim() : '';
            if (!x || !c || c.state !== 'on' || !c.dc || c.dc.readyState !== 'open') return;
            try { c.dc.send(JSON.stringify({ t: 'm', x: x.slice(0, 500) })); } catch (e) { fpEnd(c, '연결이 잘 안 돼서 끊었어요'); return; }
            c.msgs.push({ me: true, x: x.slice(0, 500) }); inp.value = '';
            fpRender(true);
        }

        /* ---------- 닉네임 ---------- */
        async function fpSetNick(n) {
            n = String(n || '').trim();
            if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_♡♥★☆]{2,10}$/.test(n)) { fpToast('2~10글자 · 한글 영어 숫자로 지어 주세요'); return; }
            fp.busy = true; fpRender();
            try {
                const old = fp.nick;
                const r = await fpApi('fp_nick', { nick: n });
                if (r && r.ok) {
                    if (old && fp.on && fpNl(old) !== fpNl(r.nick)) { const { F, db } = fp.fb; await F.deleteDoc(F.doc(db, 'users', fpNl(old))).catch(() => {}); }   // 옛 닉네임은 '등록 안 됨'으로
                    fp.nick = r.nick; fp.nickTry = null; fp.view = 'home'; fpToast(`반가워요, ${r.nick} ♡`);
                    try { await fpConnect(r.ft); } catch (e) { console.warn(e); fp.err = fpQuota(e) ? 'quota' : 'net'; }
                }
                else if (r && r.error === 'taken') { fp.nickTry = { n, suggest: r.suggest || [] }; fpToast('이미 있는 닉네임이에요'); }
                else fpToast(r && r.error === 'rule' ? '쓸 수 없는 닉네임이에요' : '닉네임을 정하지 못했어요');
            } catch (e) { fpToast('인터넷 연결을 확인해 주세요'); }
            fp.busy = false; fpRender();
        }

        /* ---------- 화면 ---------- */
        function fpToast(x) {
            const t = fpq('.fp-toast'); if (!t) return;
            t.textContent = x; t.hidden = false; clearTimeout(fp.toastT);
            fp.toastT = setTimeout(() => { t.hidden = true; }, 2800);
        }
        function fpScreenHTML() {
            if (!fpUsable()) return `<div class="fp-pad fp-center">📵<br>구글로 로그인하면<br>친구와 문자할 수 있어요</div>`;
            if (fp.starting && !fp.nick && fp.view !== 'nick') return `<div class="fp-pad fp-center">📶 연결 중…</div>`;
            if (fp.ring.length) {
                const r = fp.ring[0];
                return `<div class="fp-pad fp-center fp-ringv"><div class="fp-big">📞</div><b>${fpEsc(r.from)}</b><div class="fp-dim">전화가 왔어요${fp.ring.length > 1 ? ` (+${fp.ring.length - 1})` : ''}</div>
                    <div class="fp-row"><button type="button" class="fp-btn ok" data-a="accept">받기</button><button type="button" class="fp-btn no" data-a="reject">거절</button></div></div>`;
            }
            if (!fp.nick || fp.view === 'nick') {
                const s = fp.nickTry;
                return `<div class="fp-pad"><div class="fp-title">내 닉네임 정하기</div><div class="fp-dim">친구가 이 닉네임으로 나를 등록해요</div>
                    <div class="fp-row"><input class="fp-in" maxlength="10" placeholder="닉네임" value="${s ? fpEsc(s.n) : fpEsc(fp.nick)}"><button type="button" class="fp-btn ok" data-a="nick" ${fp.busy ? 'disabled' : ''}>등록</button></div>
                    ${s && s.suggest.length ? `<div class="fp-dim">이건 어때요?</div><div class="fp-chips">${s.suggest.map(n => `<button type="button" class="fp-chip" data-a="pick" data-n="${fpEsc(n)}">${fpEsc(n)}</button>`).join('')}</div>` : ''}
                    ${fp.nick ? `<button type="button" class="fp-link" data-a="home">← 돌아가기</button>` : ''}</div>`;
            }
            if (fp.view === 'calling' && fp.calling) return `<div class="fp-pad fp-center"><div class="fp-big fp-wave">📞</div><b>${fpEsc(fp.calling.nick)}</b><div class="fp-dim">거는 중<span class="fp-dots"></span></div>
                <div class="fp-row"><button type="button" class="fp-btn no" data-a="hang">끊기</button></div></div>`;
            const tabs = fp.convs.size ? `<div class="fp-tabs">${[...fp.convs.values()].map(c => `<button type="button" class="fp-tab${c.nick === fp.cur && fp.view === 'chat' ? ' on' : ''}" data-a="tab" data-n="${fpEsc(c.nick)}">${fpEsc(c.nick)}${c.unread ? `<i>${c.unread}</i>` : ''}</button>`).join('')}<button type="button" class="fp-tab${fp.view !== 'chat' ? ' on' : ''}" data-a="home">☰</button></div>` : '';
            if (fp.view === 'chat' && fp.convs.has(fp.cur)) {
                const c = fp.convs.get(fp.cur); c.unread = 0;
                return `${tabs}<div class="fp-msgs">${c.msgs.map(m => m.sys ? `<div class="fp-sys">${fpEsc(m.x)}</div>` : `<div class="fp-msg ${m.me ? 'me' : ''}">${fpEsc(m.x)}</div>`).join('')}</div>
                    <div class="fp-row fp-send"><input class="fp-in" maxlength="500" placeholder="${c.state === 'on' ? '문자 쓰기' : '연결하는 중…'}" ${c.state === 'on' ? '' : 'disabled'}><button type="button" class="fp-btn ok" data-a="send" ${c.state === 'on' ? '' : 'disabled'}>➤</button></div>`;
            }
            if (fp.view === 'add') return `${tabs}<div class="fp-pad"><div class="fp-title">친구 등록</div><div class="fp-dim">서로 등록해야 전화가 돼요</div>
                <div class="fp-row"><input class="fp-in" maxlength="10" placeholder="친구 닉네임"><button type="button" class="fp-btn ok" data-a="addok">등록</button></div>
                <button type="button" class="fp-link" data-a="home">← 돌아가기</button></div>`;
            const list = fpContacts();
            if (fp.sel >= list.length) fp.sel = Math.max(0, list.length - 1);
            return `${tabs}<div class="fp-head">♥ ${fpEsc(fp.nick)}<button type="button" class="fp-mini" data-a="nickedit" aria-label="닉네임 바꾸기">✎</button></div>
                <div class="fp-list">${list.length ? list.map((n, i) => `<div class="fp-item${i === fp.sel ? ' on' : ''}" data-a="sel" data-i="${i}"><span>${fpEsc(n)}</span><button type="button" class="fp-mini call" data-a="call" data-n="${fpEsc(n)}" aria-label="${fpEsc(n)}에게 전화">📞</button><button type="button" class="fp-mini" data-a="del" data-n="${fpEsc(n)}" aria-label="${fpEsc(n)} 지우기">✕</button></div>`).join('') : `<div class="fp-dim fp-center">아직 친구가 없어요</div>`}</div>
                <button type="button" class="fp-link" data-a="add">＋ 친구 등록</button>${fp.err === 'quota' ? `<div class="fp-dim">💤 ${FP_QUOTA_MSG}</div>` : fp.err === 'setup' ? `<div class="fp-dim">🔧 전화 서비스 준비 중이에요</div>` : fp.err ? `<div class="fp-dim">📶 연결이 불안정해요</div>` : ''}`;
        }
        function fpRender(keepFocus) {
            if (!fp.el) return;
            const scr = fpq('.fp-screen'), outer = fpq('.fp-outer-txt');
            const bn = fpq('.fp-bar-nick'); if (bn) bn.textContent = fp.nick ? '♥ ' + fp.nick : '';
            if (outer) outer.textContent = fp.ring.length ? '📞 ' + fp.ring[0].from : [...fp.convs.values()].some(c => c.unread) ? '✉ 새 문자' : fpClock();
            fp.el.classList.toggle('is-open', fp.open);
            if (!scr || !fp.open) return;
            const inp = scr.querySelector('.fp-in'), had = inp && document.activeElement === inp ? inp.value : null;
            scr.querySelector('.fp-body').innerHTML = fpScreenHTML();
            const box = scr.querySelector('.fp-msgs'); if (box) box.scrollTop = box.scrollHeight;
            const ni = scr.querySelector('.fp-in');
            if (ni && had != null && !keepFocus) { ni.value = had; ni.focus(); }
            if (ni && keepFocus) ni.focus();
        }
        const fpClock = () => { const d = new Date(); return `♡ ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
        setInterval(() => { if (fp.el && !fp.open) fpRender(); }, 30000);

        function fpAction(a, b) {
            const list = fpContacts();
            if (a === 'accept') fpAccept(fp.ring[0]);
            else if (a === 'reject') fpReject(fp.ring[0]);
            else if (a === 'hang') fpHangCalling();
            else if (a === 'nick') fpSetNick(fpq('.fp-in') && fpq('.fp-in').value);
            else if (a === 'pick') fpSetNick(b.dataset.n);
            else if (a === 'nickedit') { fp.view = 'nick'; fp.nickTry = null; fpRender(); }
            else if (a === 'home') { fp.view = 'home'; fpRender(); }
            else if (a === 'add') { fp.view = 'add'; fpRender(); const i = fpq('.fp-in'); if (i) i.focus(); }
            else if (a === 'addok') {
                const n = (fpq('.fp-in') && fpq('.fp-in').value || '').trim();
                if (!/^[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z0-9_♡♥★☆]{2,10}$/.test(n)) { fpToast('닉네임을 확인해 주세요'); return; }
                if (fp.nick && n.toLowerCase() === fp.nick.toLowerCase()) { fpToast('내 닉네임이에요'); return; }
                if (!fpHas(n)) fpSaveContacts(list.concat(n));
                fp.view = 'home'; fp.sel = fpContacts().length - 1; fpToast(`${n} 등록했어요`); fpRender();
            }
            else if (a === 'del') {
                const n = b.dataset.n;
                showMsg(`<b>${fpEsc(n)}</b>을(를) 전화기에서 지울까요?<br><span style="font-size:12px;color:#777;">지우면 서로 전화 · 문자를 할 수 없어요.</span>`, true).then(ok => {
                    if (!ok) return;
                    fpSaveContacts(fpContacts().filter(x => x.toLowerCase() !== n.toLowerCase()));
                    const c = fp.convs.get(n); if (c) fpEnd(c, '', false);               // 지우면 바로 끊겨요 (상대에게는 '통화가 끝났어요'만)
                    fpRender();
                });
            }
            else if (a === 'sel') { fp.sel = +b.dataset.i || 0; fpRender(); }
            else if (a === 'call') fpCall(b.dataset.n);
            else if (a === 'tab') { fp.cur = b.dataset.n; fp.view = 'chat'; fpRender(); }
            else if (a === 'send') fpSendMsg();
        }
        /* 키패드 : 📞 통화 · ⏻ 끊기 · ▲▼ 고르기 · ♥ 확인 */
        function fpKey(k) {
            if (!fp.open) { fpSetOpen(true); return; }
            const list = fpContacts();
            if (k === 'call') {
                if (fp.ring.length) return fpAccept(fp.ring[0]);
                if (fp.view === 'chat') return fpSendMsg();
                if (fp.view === 'home' && list[fp.sel]) return fpCall(list[fp.sel]);
            }
            if (k === 'end') {
                if (fp.ring.length) return fpReject(fp.ring[0]);
                if (fp.calling) return fpHangCalling();
                if (fp.view === 'chat' && fp.convs.has(fp.cur)) return fpEnd(fp.convs.get(fp.cur), '통화를 끊었어요');
                if (fp.view !== 'home') { fp.view = 'home'; return fpRender(); }
                return fpSetOpen(false);
            }
            if ((k === 'up' || k === 'down') && fp.view === 'home' && list.length) { fp.sel = (fp.sel + (k === 'up' ? -1 : 1) + list.length) % list.length; fpRender(); }
            if (k === 'ok' && fp.view === 'home' && list[fp.sel]) fpCall(list[fp.sel]);
        }
        function fpSetOpen(o) {
            fp.open = o;
            if (o && fpUsable() && !fp.on && Date.now() >= (fp.retryAt || 0)) fpStart();
            fpRender(); fpClamp();
        }

        /* ---------- 폰 그림 (SVG · 반짝이 핑크 · 직접 그린 모양) ---------- */
        function fpSvgOpen() {
            const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'];
            const kp = keys.map((k, i) => { const x = 30 + (i % 3) * 50, y = 312 + Math.floor(i / 3) * 27; return `<rect x="${x}" y="${y}" width="40" height="19" rx="9.5" fill="url(#fpKey)" stroke="#e7a3bd" stroke-width="1"/><text x="${x + 20}" y="${y + 13.5}" text-anchor="middle" font-size="11" fill="#b14a75" font-family="sans-serif">${k}</text>`; }).join('');
            return `<svg class="fp-svg" viewBox="0 0 210 430" aria-hidden="true">
              <defs>
                <linearGradient id="fpBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd3e4"/><stop offset=".5" stop-color="#f7a9c7"/><stop offset="1" stop-color="#ef8fb5"/></linearGradient>
                <linearGradient id="fpKey" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff6fa"/><stop offset="1" stop-color="#ffd9e8"/></linearGradient>
                <pattern id="fpGlit" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1.1" fill="#fff" opacity=".75"/><circle cx="6.5" cy="6" r=".8" fill="#fff" opacity=".5"/></pattern>
                <radialGradient id="fpGem" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffb3d1"/><stop offset="1" stop-color="#e2558f"/></radialGradient>
              </defs>
              <rect x="12" y="6" width="186" height="196" rx="30" fill="url(#fpBody)" stroke="#d9789f" stroke-width="2"/>
              <rect x="12" y="6" width="186" height="196" rx="30" fill="url(#fpGlit)"/>
              <rect x="26" y="26" width="158" height="160" rx="14" fill="#5b3446"/>
              <rect x="12" y="206" width="186" height="216" rx="30" fill="url(#fpBody)" stroke="#d9789f" stroke-width="2"/>
              <rect x="12" y="206" width="186" height="216" rx="30" fill="url(#fpGlit)"/>
              <rect x="60" y="196" width="90" height="16" rx="8" fill="#f2b9cf" stroke="#d9789f" stroke-width="1.5"/>
              <path d="M105 14c-3-4-9-3-9 2 0 4 9 9 9 9s9-5 9-9c0-5-6-6-9-2z" fill="url(#fpGem)"/>
              <g class="fp-k" data-k="call"><rect x="22" y="228" width="44" height="26" rx="13" fill="#bff0cf" stroke="#5fbf86" stroke-width="1.5"/><text x="44" y="246" text-anchor="middle" font-size="14">📞</text></g>
              <g class="fp-k" data-k="end"><rect x="144" y="228" width="44" height="26" rx="13" fill="#ffc7d2" stroke="#e0607d" stroke-width="1.5"/><text x="166" y="246" text-anchor="middle" font-size="13" fill="#c2385c" font-family="sans-serif" font-weight="700">⏻</text></g>
              <circle cx="105" cy="262" r="34" fill="#ffe3ee" stroke="#e7a3bd" stroke-width="1.5"/>
              <g class="fp-k" data-k="up"><path d="M93 240 L105 230 L117 240 Z" fill="#e58fb3"/><rect x="88" y="226" width="34" height="18" fill="transparent"/></g>
              <g class="fp-k" data-k="down"><path d="M93 284 L105 294 L117 284 Z" fill="#e58fb3"/><rect x="88" y="280" width="34" height="18" fill="transparent"/></g>
              <g class="fp-k" data-k="ok"><path d="M105 255c-5-7-15-5-15 3 0 7 15 16 15 16s15-9 15-16c0-8-10-10-15-3z" fill="url(#fpGem)" stroke="#d9608f" stroke-width="1"/></g>
              ${kp}
              <path d="M38 410c-2-3-7-2-7 1 0 3 7 7 7 7s7-4 7-7c0-3-5-4-7-1z M172 410c-2-3-7-2-7 1 0 3 7 7 7 7s7-4 7-7c0-3-5-4-7-1z" fill="url(#fpGem)"/>
              <g class="fp-charm"><path d="M198 220 q8 10 4 24" fill="none" stroke="#c9b6c0" stroke-width="2" stroke-dasharray="3 2"/><path d="M202 252c-5-7-15-5-15 3 0 7 15 16 15 16s15-9 15-16c0-8-10-10-15-3z" fill="url(#fpGem)" stroke="#d9608f" stroke-width="1"/></g>
            </svg>`;
        }
        function fpSvgClosed() {
            return `<svg class="fp-svg" viewBox="0 0 120 170" aria-hidden="true">
              <defs>
                <linearGradient id="fpBodyC" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd3e4"/><stop offset=".5" stop-color="#f7a9c7"/><stop offset="1" stop-color="#ef8fb5"/></linearGradient>
                <pattern id="fpGlitC" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="#fff" opacity=".75"/><circle cx="6" cy="5.5" r=".7" fill="#fff" opacity=".5"/></pattern>
                <radialGradient id="fpGemC" cx=".35" cy=".3" r=".8"><stop offset="0" stop-color="#fff"/><stop offset=".35" stop-color="#ffb3d1"/><stop offset="1" stop-color="#e2558f"/></radialGradient>
              </defs>
              <rect x="8" y="6" width="100" height="156" rx="24" fill="url(#fpBodyC)" stroke="#d9789f" stroke-width="2"/>
              <rect x="8" y="6" width="100" height="156" rx="24" fill="url(#fpGlitC)"/>
              <rect x="26" y="30" width="64" height="44" rx="9" fill="#5b3446"/>
              <circle cx="58" cy="18" r="5" fill="#5b3446" stroke="#f2b9cf" stroke-width="2"/>
              <path d="M58 100c-5-7-15-5-15 3 0 7 15 16 15 16s15-9 15-16c0-8-10-10-15-3z" fill="url(#fpGemC)" stroke="#d9608f" stroke-width="1"/>
              <g class="fp-charm"><path d="M108 120 q8 8 4 20" fill="none" stroke="#c9b6c0" stroke-width="2" stroke-dasharray="3 2"/><path d="M112 146c-4-5-12-4-12 2 0 5 12 12 12 12s12-7 12-12c0-6-8-7-12-2z" fill="url(#fpGemC)"/></g>
            </svg>`;
        }
        function fpBuild() {
            if (fp.el) return;
            const el = document.createElement('div');
            el.id = 'fpPhone'; el.className = 'fp-phone'; el.hidden = true;
            el.innerHTML = `<div class="fp-closed" role="button" tabindex="0" aria-label="피처폰 열기">${fpSvgClosed()}<div class="fp-outer"><span class="fp-outer-txt"></span></div></div>
                <div class="fp-opened">${fpSvgOpen()}<div class="fp-screen"><div class="fp-bar"><span>📶</span><span class="fp-bar-nick"></span><span>▮▮▮</span></div><div class="fp-body"></div><div class="fp-toast" hidden></div></div>
                <button type="button" class="fp-fold" aria-label="피처폰 접기">⌄</button></div>`;
            document.body.appendChild(el); fp.el = el;
            el.addEventListener('click', e => {
                const k = e.target.closest('.fp-k'); if (k) { fpKey(k.dataset.k); return; }
                const b = e.target.closest('[data-a]'); if (b && !b.disabled) { fpAction(b.dataset.a, b); return; }
                if (e.target.closest('.fp-fold')) { fpSetOpen(false); return; }
                if (!fp.open && !fp.dragged && (e.target === el || e.target.closest('.fp-closed'))) fpSetOpen(true);   // 잡고 누르면 클릭이 폰 전체로 와요 (pointer capture)
            });
            el.addEventListener('keydown', e => {
                if (e.key === 'Enter' && e.target.classList.contains('fp-in')) { e.preventDefault(); fpAction(fp.view === 'chat' ? 'send' : fp.view === 'add' ? 'addok' : 'nick'); }
                if (e.key === 'Enter' && e.target.classList.contains('fp-closed')) fpSetOpen(true);
            });
            fpDrag(el);
            fpPlace();
        }
        /* ---------- 끌어서 옮기기 (화면 · 버튼은 빼고 몸통을 잡아요) ---------- */
        function fpDrag(el) {
            let d = null;
            el.addEventListener('pointerdown', e => {
                if (e.button > 0 || e.target.closest('.fp-screen, .fp-k, .fp-fold, button, input')) return;
                const r = el.getBoundingClientRect();
                d = { id: e.pointerId, dx: e.clientX - r.left, dy: e.clientY - r.top, x0: e.clientX, y0: e.clientY, moved: false };
                fp.dragged = false;
                try { el.setPointerCapture(e.pointerId); } catch (x) {}
            });
            el.addEventListener('pointermove', e => {
                if (!d || d.id !== e.pointerId) return;
                if (!d.moved && Math.hypot(e.clientX - d.x0, e.clientY - d.y0) < 6) return;
                d.moved = true; fp.dragged = true; e.preventDefault();
                el.style.left = (e.clientX - d.dx) + 'px'; el.style.top = (e.clientY - d.dy) + 'px';
                fpClamp();
            });
            const up = e => {
                if (!d || d.id !== e.pointerId) return;
                if (d.moved) { try { localStorage.setItem(FP_POS, JSON.stringify({ x: parseFloat(el.style.left) / innerWidth, y: parseFloat(el.style.top) / innerHeight })); } catch (x) {} setTimeout(() => { fp.dragged = false; }, 0); }
                d = null;
            };
            el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
        }
        function fpPlace() {
            let p = null; try { p = JSON.parse(localStorage.getItem(FP_POS)); } catch (e) {}
            const pg = document.getElementById('diaryWrapper'), r = pg ? pg.getBoundingClientRect() : { right: innerWidth - 20, bottom: innerHeight - 120 };
            const x = p && isFinite(p.x) ? p.x * innerWidth : Math.min(innerWidth - 110, r.right - 60), y = p && isFinite(p.y) ? p.y * innerHeight : Math.min(innerHeight - 260, r.bottom - 300);
            fp.el.style.left = x + 'px'; fp.el.style.top = y + 'px';
            fpClamp();
        }
        function fpClamp() {
            if (!fp.el || fp.el.hidden) return;
            const r = fp.el.getBoundingClientRect();
            const x = Math.max(4, Math.min(innerWidth - r.width - 4, r.left)), y = Math.max(4, Math.min(innerHeight - Math.min(r.height, innerHeight - 8) - 4, r.top));
            fp.el.style.left = x + 'px'; fp.el.style.top = y + 'px';
        }
        addEventListener('resize', () => { if (fp.el) fpPlace(); });

        /* ---------- 켜기 : 다이어리가 열리면 페이지 옆에 ---------- */
        async function fpStart() {
            if (fp.starting || !fpUsable()) return;
            fp.starting = true; fp.retryAt = Date.now() + 60000; fpRender();
            try {
                const r = await fpApi('fp_hello');
                if (!r || !r.ok) throw new Error(r && r.error || 'hello');
                fp.nick = r.nick || '';
                await fpConnect(r.ft);
            } catch (e) { console.warn('📞 켜기:', e); fp.err = fpQuota(e) ? 'quota' : 'net'; }
            fp.starting = false;
            if (fp.err === 'quota') fp.retryAt = Date.now() + 600000;
            if (!fp.nick && !fp.err) { fp.view = 'nick'; fp.retryAt = Infinity; }   // 닉네임을 정하면 그때 들어가요
            fpRender();
        }
        function fpSync() {
            const show = typeof isCoverOpen !== 'undefined' && isCoverOpen && typeof drive !== 'undefined' && drive.ready && !drive.guest && !drive.local && (typeof ftOn !== 'function' || ftOn('fphone'));
            if (!show) {
                if (fp.el && !fp.el.hidden) { fp.el.hidden = true; fpStopListen(); fp.nick = ''; fp.retryAt = 0; if (fp.fb) fp.fb.U.signOut(fp.fb.auth).catch(() => {}); fp.err = ''; fp.ring = []; fpRingOff(); fp.convs.forEach(c => fpEnd(c, '', false)); fpStopCalling(); }
                return;
            }
            fpBuild();
            if (fp.el.hidden) { fp.el.hidden = false; fpPlace(); fpRender(); }
            if (!fp.on && !fp.starting && Date.now() >= (fp.retryAt || 0)) fpStart();   // 안 되면 1분 뒤 다시 (하루 무료량을 넘었으면 10분 뒤)
        }
        setInterval(fpSync, 1500);
        window.fpSync = fpSync;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['fphone'] = true;
