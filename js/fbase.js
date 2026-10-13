/* 말랑달콤 다이어리 - js/fbase.js
   🔥 파이어스토어 연결 하나 (도련 · 2026-10-14) : 구글로 로그인한 회원 모두
   - 출입증 : 말랑달콤사람들_앱스크립트.gs 의 fb_hello (구글 로그인 확인 → uid = 회원번호 · 닉네임이 있으면 nl · nd)
   - 🔔 선물 벨 : bells/{회원번호} 를 듣고 있다가 울리면 → 지우고 → 앱스크립트에서 선물을 한 번 받아 와요 (js/presence.js 의 prGiftAsk)
              벨이 안 될 때(연결 안 됨 · 하루 무료량)는 presence.js 가 예전처럼 1분마다 물어봐요 (fbBellOn() 이 false)
   - 📞 피처폰 (js/fphone.js) 도 이 연결을 같이 써요 : fbOn() · FB.nick · 'fbauth' 이벤트 · fbSignIn(새 출입증)
   - 폴더 저장 · 구경만 하기는 연결하지 않아요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (선물은 1분마다 확인) */

        const FB_SDK = 'https://www.gstatic.com/firebasejs/10.12.2/firebase-';
        const FB_CFG = { apiKey: 'AIzaSyDg3q7ki9HS_6h-Txv9J1kGc9VTmo2b8lc', authDomain: 'softsweetdiary-phone.firebaseapp.com', projectId: 'softsweetdiary-phone', storageBucket: 'softsweetdiary-phone.firebasestorage.app', messagingSenderId: '666233690853', appId: '1:666233690853:web:7e6be0cca2e150a489520c' };
        const FB = { sdk: null, on: false, uid: '', nick: '', err: '', starting: false, retryAt: 0, bell: false, bellUnsub: null };
        const fbUsable = () => typeof drive !== 'undefined' && drive.ready && !drive.guest && !drive.local && typeof MEMBER_API_URL !== 'undefined' && !!MEMBER_API_URL;
        const fbQuota = e => !!e && /resource-exhausted/.test(e.code || e.message || '');
        const fbOn = () => FB.on;
        const fbBellOn = () => FB.bell;

        async function fbLoad() {
            if (FB.sdk) return FB.sdk;
            const [A, U, F] = await Promise.all(['app', 'auth', 'firestore'].map(n => import(FB_SDK + n + '.js')));
            const app = A.getApps().find(x => x.name === 'malang') || A.initializeApp(FB_CFG, 'malang');
            FB.sdk = { U, F, auth: U.getAuth(app), db: F.getFirestore(app) };
            return FB.sdk;
        }
        async function fbApi(action, data) {                                     // 앱스크립트 (구글 로그인 확인이 필요한 것)
            await ensureToken();
            const res = await fetch(MEMBER_API_URL, { method: 'POST', body: JSON.stringify(Object.assign({ action, token: drive.token }, data || {})), credentials: 'omit' });
            return res.json();
        }
        /* 출입증으로 들어가기 (처음 · 닉네임을 바꿨을 때) → 'fbauth' 이벤트 */
        async function fbSignIn(ft, nick) {
            if (!ft) { FB.err = 'setup'; throw new Error('setup'); }
            const { U, auth } = await fbLoad();
            const cred = await U.signInWithCustomToken(auth, ft);
            FB.uid = cred.user.uid; FB.nick = nick || ''; FB.on = true; FB.err = '';
            fbBell();
            window.dispatchEvent(new CustomEvent('fbauth'));
        }
        async function fbStart() {
            if (FB.starting || FB.on || !fbUsable()) return;
            FB.starting = true; FB.retryAt = Date.now() + 60000;               // 안 되면 1분 뒤 다시
            try {
                const r = await fbApi('fb_hello');
                if (!r || !r.ok) throw new Error(r && r.error || 'hello');
                await fbSignIn(r.ft, r.nick || '');
            } catch (e) {
                console.warn('🔥 파이어스토어 연결:', e);
                if (fbQuota(e)) { FB.err = 'quota'; FB.retryAt = Date.now() + 600000; }
                else if (FB.err !== 'setup') FB.err = 'net'; else FB.retryAt = Date.now() + 600000;
                window.dispatchEvent(new CustomEvent('fbauth'));
            }
            FB.starting = false;
        }
        function fbStop() {
            if (FB.bellUnsub) { try { FB.bellUnsub(); } catch (e) {} }
            FB.bellUnsub = null; FB.bell = false; FB.on = false; FB.uid = ''; FB.nick = ''; FB.err = ''; FB.retryAt = 0;
            if (FB.sdk) FB.sdk.U.signOut(FB.sdk.auth).catch(() => {});
            window.dispatchEvent(new CustomEvent('fbauth'));
        }

        /* 🔔 선물 벨 : 울리면 먼저 지우고 (그 사이 새 벨은 다시 울려요) → 선물 받아 오기 */
        function fbBell() {
            if (FB.bellUnsub) { try { FB.bellUnsub(); } catch (e) {} }
            const { F, db } = FB.sdk, ref = F.doc(db, 'bells', FB.uid);
            FB.bellUnsub = F.onSnapshot(ref, snap => {
                FB.bell = true;
                if (!snap.exists()) return;
                F.deleteDoc(ref).catch(() => {});
                if (typeof prGiftAsk === 'function') prGiftAsk(true);
            }, e => { console.warn('🔔 선물 벨:', e); FB.bell = false; FB.bellUnsub = null; if (fbQuota(e)) FB.err = 'quota'; });
        }

        setInterval(() => {
            if (!fbUsable()) { if (FB.on || FB.err) fbStop(); return; }
            if (!FB.on && !FB.starting && Date.now() >= FB.retryAt) fbStart();
            else if (FB.on && !FB.bellUnsub && Date.now() >= FB.retryAt) { FB.retryAt = Date.now() + 60000; fbBell(); }   // 벨이 끊겼으면 1분 뒤 다시
        }, 1500);
        window.fbOn = fbOn; window.fbBellOn = fbBellOn; window.fbSignIn = fbSignIn; window.fbApi = fbApi; window.fbLoad = fbLoad; window.fbQuota = fbQuota;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['fbase'] = true;
