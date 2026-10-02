/* 말랑달콤 다이어리 - js/install.js
   📲 앱으로 설치 : 휴대폰 · 태블릿 · PC 홈 화면에 말랑달콤 아이콘 만들기 (⚙ 설정 → 📲 앱으로 설치하기)
   - 크롬 · 엣지 · 삼성 인터넷 : 버튼을 누르면 바로 '설치' 창이 떠요
   - 아이폰 · 아이패드 : 브라우저가 설치 창을 띄워 주지 않아서, 그림으로 따라 하는 방법을 보여 줘요
   - 카카오톡 · 네이버 · 인스타그램 앱 안에서 열었을 때 : 설치도 구글 로그인도 안 되니, 바깥 브라우저로 여는 방법을 안내해요
   - 이미 설치한 앱으로 열었으면 버튼을 숨겨요
   필요한 파일 : manifest.json · sw.js · icons/ (index.html 과 같은 폴더)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (설치 버튼만 안 보여요) */

        const ins = { prompt: null };
        const insQ = id => document.getElementById(id);
        const insUA = navigator.userAgent;
        const insStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
        function insPlatform() {
            if (/KAKAOTALK/i.test(insUA)) return 'kakao';
            if (/NAVER\(inapp|Instagram|FBAN|FBAV|Line\/|DaumApps|everytimeApp|BAND\//i.test(insUA)) return 'inapp';
            if (/iPhone|iPad|iPod/.test(insUA) || (/Macintosh/.test(insUA) && navigator.maxTouchPoints > 1)) return 'ios';
            if (/SamsungBrowser/i.test(insUA)) return 'samsung';
            if (/Android/i.test(insUA)) return 'android';
            return 'pc';
        }

        if ('serviceWorker' in navigator && window.isSecureContext) {
            window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
        }
        window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); ins.prompt = e; });
        window.addEventListener('appinstalled', () => {
            ins.prompt = null; insShowBtn();
            if (typeof closeModal === 'function') closeModal('installModal');
            if (typeof toast === 'function') toast('📲 설치했어요! 이제 홈 화면의 말랑달콤 아이콘으로 열어 보세요');
        });
        function insShowBtn() { const b = insQ('installBtn'); if (b) b.hidden = insStandalone(); }
        insShowBtn();

        async function openInstall() {
            if (ins.prompt) {                                       // 크롬 · 엣지 · 삼성 인터넷 : 바로 설치 창
                const p = ins.prompt; ins.prompt = null;
                if (typeof closeModal === 'function') closeModal('settingsMenuModal');
                try { p.prompt(); await p.userChoice; } catch (e) {}
                return;
            }
            insQ('installGuide').innerHTML = insGuide(insPlatform());
            if (typeof closeModal === 'function') closeModal('settingsMenuModal');
            openModal('installModal');
        }

        const INS_ICON = {
            share: '<svg viewBox="0 0 24 24" class="ins-ic"><path d="M12 3v12M7.5 7.5 12 3l4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 10H6a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9a1 1 0 0 0-1-1h-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
            add: '<svg viewBox="0 0 24 24" class="ins-ic"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
            dots: '<b class="ins-key">⋮</b>',
            menu: '<b class="ins-key">≡</b>',
            pc: '<svg viewBox="0 0 24 24" class="ins-ic"><rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 20h8M12 16v4M12 7v6M9.5 10.5 12 13l2.5-2.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        };
        function insSteps(list) { return '<ol class="ins-steps">' + list.map(t => `<li>${t}</li>`).join('') + '</ol>'; }
        function insGuide(pf) {
            const ipad = /iPad|Macintosh/.test(insUA);
            if (pf === 'kakao') return `<p class="ins-lead">카카오톡 안에서는 설치도, 구글 로그인도 안 돼요.<br>크롬이나 사파리로 열어 주세요.</p>
                <button class="btn ins-go" type="button" onclick="location.href='kakaotalk://web/openExternal?url='+encodeURIComponent(location.href)">🌐 다른 브라우저로 열기</button>
                <p class="ins-note">안 열리면 오른쪽 아래(또는 위) <b class="ins-key">⋯</b> → '다른 브라우저로 열기'</p>`;
            if (pf === 'inapp') return `<p class="ins-lead">이 앱 안에서는 설치도, 구글 로그인도 안 돼요.<br>크롬이나 사파리로 열어 주세요.</p>
                ${insSteps([`화면 위나 아래의 <b class="ins-key">⋯</b> 또는 ${INS_ICON.dots} 메뉴를 눌러요`, `<b>'다른 브라우저로 열기'</b> 또는 <b>'기본 브라우저로 열기'</b>를 눌러요`, '열린 화면에서 다시 ⚙ 설정 → 📲 앱으로 설치하기'])}`;
            if (pf === 'ios') return `<p class="ins-lead">${ipad ? '아이패드' : '아이폰'}은 세 번만 누르면 돼요</p>
                ${insSteps([`${ipad ? '화면 <b>위쪽 주소창 오른쪽</b>' : '화면 <b>아래쪽 가운데</b>'}의 공유 버튼 ${INS_ICON.share} 을 눌러요`, `메뉴를 조금 내려서 <b>'홈 화면에 추가'</b> ${INS_ICON.add} 를 눌러요`, '오른쪽 위의 <b>\'추가\'</b>를 누르면 끝!'])}
                <p class="ins-note">사파리가 아닌 브라우저(크롬 등)라면 주소창 옆 공유 버튼 ${INS_ICON.share} 에서 똑같이 하면 돼요.</p>`;
            if (pf === 'samsung') return `<p class="ins-lead">삼성 인터넷은 이렇게 해요</p>
                ${insSteps([`화면 <b>아래쪽 오른쪽</b>의 ${INS_ICON.menu} 메뉴를 눌러요`, `<b>'현재 페이지 추가'</b>(또는 '페이지 추가')를 눌러요`, '<b>\'홈 화면\'</b>을 고르고 <b>\'추가\'</b>를 누르면 끝!'])}`;
            if (pf === 'android') return `<p class="ins-lead">크롬은 이렇게 해요</p>
                ${insSteps([`화면 <b>위쪽 오른쪽</b>의 점 세 개 ${INS_ICON.dots} 를 눌러요`, '<b>\'홈 화면에 추가\'</b> 또는 <b>\'앱 설치\'</b>를 눌러요', '<b>\'설치\'</b>(또는 \'추가\')를 누르면 끝!'])}`;
            return `<p class="ins-lead">PC(크롬 · 엣지)는 이렇게 해요</p>
                ${insSteps([`주소창 <b>오른쪽 끝</b>의 설치 아이콘 ${INS_ICON.pc} 을 눌러요`, '<b>\'설치\'</b>를 누르면 바탕화면과 시작 메뉴에 말랑달콤이 생겨요'])}
                <p class="ins-note">아이콘이 안 보이면 오른쪽 위 ${INS_ICON.dots} (엣지는 <b class="ins-key">⋯</b>) 메뉴 → '앱' 또는 '전송, 저장, 공유'에서 <b>'설치'</b>를 찾아 주세요.</p>`;
        }
        window.openInstall = openInstall;
