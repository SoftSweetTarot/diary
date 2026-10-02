/* 말랑달콤 다이어리 - js/sound.js
   🔊 말랑 소리 : 다이어리 전체의 효과음을 한곳에서 관리해요 (모든 소리는 파일 없이 브라우저가 만들어요)
   - 🖱️ 클릭 소리 : 버튼을 누를 때 (7가지 중에서 고르기)
   - 📖 다이어리 소리 : 붙이기 뿅 · 지우기 슝 · 페이지 넘기기 사락 · 저장 딩동
   - ✨ 연출 소리 : 포춘카드 · 꿈해몽 · 토정비결 · 심리테스트 · 이름 궁합 · 익명 편지함 · 랜덤박스 · 오락실
       연출 화면의 🔊 버튼을 누르면 모든 연출 소리가 한 번에 꺼져요 (설정과 같은 스위치)
   - 소리 크기 : 모든 효과음의 크기 (🎵 배경음악은 따로 조절)
   - 설정 저장 : 내 드라이브 settings.json 'diary_sound' (이 기기에도 같이 기억 → 로그인 전에도 바로 적용)
   - 아이폰 · 아이패드 무음 모드에서도 들리게 (audioSession 'playback' · 예전 기기는 무음 소리 한 번 재생)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (소리만 나지 않아요) */

        const SND_KEY = 'diary_sound', SND_LOCAL = 'malang_sound';
        const SND_DEF = { click: true, type: 'pop', diary: true, fx: true, vol: 70 };
        const SND_CLICKS = [['pop', '톡톡'], ['bubble', '뽀글'], ['tick', '딸깍'], ['boing', '또잉'], ['xylo', '실로폰'], ['star', '반짝'], ['chick', '삐약']];
        const snd = { ac: null, out: null, unlocked: false, last: 0, xylo: 0, noise: null };
        const sndSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;

        /* ---------- 설정 ---------- */
        function sndPref() {
            let o = null;
            try { if (sndSync()) o = JSON.parse(store.getItem(SND_KEY) || 'null'); } catch (e) {}
            if (!o) { try { o = JSON.parse(localStorage.getItem(SND_LOCAL) || 'null'); } catch (e) {} }
            return Object.assign({}, SND_DEF, o || {});
        }
        function sndSet(k, v) {
            const o = sndPref(); o[k] = v;
            const t = JSON.stringify(o);
            try { if (sndSync()) store.setItem(SND_KEY, t); } catch (e) {}
            try { localStorage.setItem(SND_LOCAL, t); } catch (e) {}
            if (k === 'vol' && snd.out) snd.out.gain.value = sndGain(o);
            if (k === 'fx' && !v) document.dispatchEvent(new Event('snd-fx-off'));
            sndMark();
        }
        const sndGain = o => Math.pow((o.vol || 0) / 100, 1.6) * 1.4;
        function sndOn(k) { const o = sndPref(); return !!o[k] && o.vol > 0; }

        /* ---------- 소리 길 ---------- */
        function sndCtx() {
            try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
            if (!snd.ac) {
                try { snd.ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
                snd.out = snd.ac.createGain(); snd.out.gain.value = sndGain(sndPref()); snd.out.connect(snd.ac.destination);
            }
            if (snd.ac.state !== 'running') { try { const p = snd.ac.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
            return snd.ac;
        }
        const sndOut = () => snd.out;
        /* 연출 소리를 쓰는 곳은 이걸로 소리 길을 받아요 (꺼져 있으면 null → 소리 없음) */
        function sndFx() { return sndOn('fx') ? sndCtx() : null; }
        /* 화면을 처음 누를 때 소리 깨우기 (아이폰 · 아이패드 무음 모드 대비) */
        function sndUnlock() {
            const ac = sndCtx(); if (!ac || snd.unlocked) return;
            snd.unlocked = true;
            try {
                const n = 1600, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
                const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
                w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
                v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
                for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
                const el = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
                el.setAttribute('playsinline', ''); const pr = el.play(); if (pr && pr.catch) pr.catch(() => { snd.unlocked = false; });
            } catch (e) { snd.unlocked = false; }
            try { const b = ac.createBuffer(1, 1, 22050), s = ac.createBufferSource(); s.buffer = b; s.connect(ac.destination); s.start(0); } catch (e) {}
        }

        /* ---------- 소리 재료 ---------- */
        function sndTone(f, dur, vol, type, at, f2) {
            const ac = snd.ac; if (!ac) return;
            const t = ac.currentTime + (at || 0), o = ac.createOscillator(), g = ac.createGain();
            o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
            if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur * .8);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            o.connect(g).connect(snd.out); o.start(t); o.stop(t + dur + 0.02);
        }
        function sndNoise(dur, vol, at, f1, f2, q) {
            const ac = snd.ac; if (!ac) return;
            if (!snd.noise) { const n = ac.sampleRate * .5, b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1; snd.noise = b; }
            const t = ac.currentTime + (at || 0), s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
            s.buffer = snd.noise; f.type = 'bandpass'; f.Q.value = q || 1; f.frequency.setValueAtTime(f1, t); if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + dur);
            g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
            s.connect(f).connect(g).connect(snd.out); s.start(t); s.stop(t + dur + 0.02);
        }
        const SND_PENTA = [523, 587, 659, 784, 880, 1047, 1175, 1319];
        const SND_CLICK_FX = {
            pop: () => sndTone(900, .07, .22, 'sine', 0, 620),
            bubble: () => { sndTone(320, .09, .2, 'sine', 0, 980); sndTone(700, .06, .08, 'sine', .04, 1300); },
            tick: () => { sndTone(2100, .025, .12, 'triangle'); sndNoise(.03, .08, 0, 4000, 0, 2); },
            boing: () => sndTone(260, .16, .22, 'triangle', 0, 560),
            xylo: () => { const f = SND_PENTA[snd.xylo++ % SND_PENTA.length]; sndTone(f, .35, .2, 'triangle'); sndTone(f * 4, .12, .04, 'sine'); },
            star: () => { sndTone(1568, .18, .12, 'sine'); sndTone(2093, .25, .09, 'sine', .05); },
            chick: () => { sndTone(2300, .06, .1, 'sine', 0, 3200); sndTone(2500, .06, .09, 'sine', .08, 3400); }
        };
        const SND_DIARY_FX = {
            put: () => { sndTone(420, .12, .2, 'sine', 0, 1100); sndTone(1320, .14, .07, 'triangle', .06); },               // 뿅
            remove: () => { sndNoise(.25, .12, 0, 2500, 500, 1.2); sndTone(700, .18, .07, 'sine', 0, 260); },                 // 슝
            page: () => sndNoise(.38, .1, 0, 900, 3500, .7),                                                                  // 사락
            save: () => { sndTone(988, .5, .14, 'triangle'); sndTone(1319, .7, .12, 'triangle', .16); }                       // 딩동
        };
        function sndClick(type) {
            if (!type && !sndOn('click')) return;
            if (!sndCtx()) return;
            const now = performance.now(); if (!type && now - snd.last < 45) return; snd.last = now;
            try { (SND_CLICK_FX[type || sndPref().type] || SND_CLICK_FX.pop)(); } catch (e) {}
        }
        function sndDiary(k) { if (!sndOn('diary') || !sndCtx()) return; try { SND_DIARY_FX[k] && SND_DIARY_FX[k](); } catch (e) {} }

        /* ---------- 누를 때마다 클릭 소리 ---------- */
        const SND_TAP = 'button, a[href], a[onclick], label, select, summary, [onclick], [role="button"], .cat-btn, input[type="checkbox"], input[type="radio"], input[type="range"]';
        document.addEventListener('pointerdown', e => {
            sndUnlock();
            if (e.button > 0) return;
            const t = e.target; if (!t || !t.closest) return;
            if (t.closest('#canvasArea, canvas, textarea, input[type="text"], input[type="search"], .ar-pad, .ar-screen, .no-click-snd')) return;
            const b = t.closest(SND_TAP);
            if (!b || b.disabled || b.closest('.snd-fx')) return;
            sndClick();
        }, true);

        /* ---------- 🔊 연출 소리 켜고 끄기 (연출 화면의 버튼 · 설정 공용) ---------- */
        function sndToggleFx() {
            const on = !sndOn('fx');
            if (on && sndPref().vol <= 0) sndSet('vol', 50);
            sndSet('fx', on);
            if (on && sndCtx()) SND_CLICK_FX.star();
            if (typeof toast === 'function') toast(on ? '🔊 연출 소리를 켰어요' : '🔇 연출 소리를 껐어요 (설정에서 다시 켤 수 있어요)');
        }
        const sndFxBtn = cls => `<button type="button" class="snd-fx ${cls || ''}" onclick="sndToggleFx()" aria-label="연출 소리 켜고 끄기">${sndOn('fx') ? '🔊' : '🔇'}</button>`;
        function sndMark() {
            const on = sndOn('fx');
            document.querySelectorAll('.snd-fx').forEach(b => {
                b.classList.toggle('off', !on);
                if (b.classList.contains('snd-fx-text')) b.textContent = on ? '🔊 소리 켜짐' : '🔇 소리 꺼짐';
                else b.textContent = on ? '🔊' : '🔇';
            });
            sndRenderSettings();
        }

        /* ---------- ⚙️ 설정 화면 ---------- */
        function sndRenderSettings() {
            const box = document.getElementById('sndSwitches'); if (!box) return;
            const o = sndPref();
            const row = (k, name, sub) => `<label class="show-row"><span><b>${name}</b><small>${sub}</small></span><input type="checkbox" class="show-sw" ${o[k] ? 'checked' : ''} onchange="sndSet('${k}', this.checked)"></label>`;
            box.innerHTML = row('click', '🖱️ 클릭 소리', '버튼을 누를 때 나는 소리')
                + `<div class="snd-types${o.click ? '' : ' dim'}">${SND_CLICKS.map(([k, n]) => `<button type="button" class="no-click-snd${o.type === k ? ' on' : ''}" onclick="sndPickClick('${k}')">${n}</button>`).join('')}</div>`
                + row('diary', '📖 다이어리 소리', '붙이기 뿅 · 지우기 슝 · 페이지 사락 · 저장 딩동')
                + row('fx', '✨ 연출 소리', '운세 · 테스트 · 궁합 · 편지 · 랜덤박스 · 오락실')
                + `<div class="snd-vol"><span>🔈</span><input type="range" min="0" max="100" step="5" value="${o.vol}" oninput="sndVol(this.value)" onchange="sndVol(this.value, true)" aria-label="소리 크기"><span>🔊</span><b id="sndVolNum">${o.vol}</b></div>`
                + '<p class="snd-note">🎵 배경음악은 툴바의 배경음악 버튼에서 따로 조절해요.</p>';
        }
        function sndPickClick(k) { sndSet('type', k); if (!sndPref().click) sndSet('click', true); sndClick(k); }
        function sndVol(v, done) {
            v = +v; const o = sndPref(); o.vol = v;
            if (snd.out) snd.out.gain.value = sndGain(o);
            const n = document.getElementById('sndVolNum'); if (n) n.textContent = v;
            if (done) { sndSet('vol', v); if (sndCtx()) SND_CLICK_FX[o.type || 'pop'](); }
        }
