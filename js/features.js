/* 말랑달콤 다이어리 - js/features.js
   🔓 기능 공개 스위치 : 기본 기능만 먼저 보여 주고, 앱 업그레이드처럼 조금씩 공개해요
   - 아래 FEATURES 에서 true 로 바꾸면 그 기능이 보여요 (false = 숨김) → index.html 의 ?v= 숫자만 올려서 배포
   - 숨겨도 코드와 사용자 데이터는 그대로예요 (다시 켜면 예전 그대로 보여요)
   - 숨기는 방법 : <html> 에 'ft-no-이름' 표시 → css 가 data-ft="이름" 붙은 버튼 · 칸을 숨겨요 + js 몇 곳은 ftOn('이름') 으로 확인
   ※ 다른 파일보다 먼저 읽어요 (<head>) · 이 파일이 없으면 모든 기능이 보여요 */

        const FEATURES = {
            cafe: false,      // ☕ 카페 (하단메뉴 카페 버튼 · 🎨 색상설정의 '카페 버튼 안쪽' 색)
            notebook: false,  // 📒 스티커 수첩 (⚙ 설정의 '스티커 고르는 창' · 숨기면 늘 🪟 고르는 창)
            dday: false,      // ⏳ D-day (⚙ 설정 스위치 · 페이지 왼쪽 위 D-day · 카페에서 만들어요)
            pattern: false,   // 🌈 배경지 · 🖼️ 이미지로 배경지 · 🖌️ 그려서 배경지 (🎨 페이지 창)
            studio: false,    // 🎀 페이지 꾸미기 (🎨 페이지 창)
            stkmake: false,   // ✂️ 나만의 스티커 만들기 · 스티커 창들의 '내가만든' 칸
                              //    (+ 🧩 조각스티커 · 📄 모조지 · 🎀 마스킹테이프 버튼 : 지금은 만든 것만 들어 있는 칸이라 같이 숨겨요)
            share: false,     // 📥 '공유받은' 칸 · 💾 공유용 파일 저장 (카페로 주고받는 것)
            caps: false       // 🎁 캡슐스티커 (카페 랜덤박스에서 받아요)
        };
        function ftOn(name) { return !(name in FEATURES) || FEATURES[name] !== false; }
        (function () {
            const root = document.documentElement;
            Object.keys(FEATURES).forEach(k => root.classList.toggle('ft-no-' + k, !ftOn(k)));
            if (!ftOn('dday')) root.classList.add('hide-dday');            // 페이지 왼쪽 위 D-day (js/dday.js · css 의 .hide-dday)
            /* 🧩 조각스티커 : 계절 스티커가 열려 있으면 기본 칸에 계절 스티커가 있어서 버튼을 보여요 (js/season.js SEASON_OPEN) */
            window.addEventListener('load', () => {
                if (ftOn('stkmake') || typeof SEASON_OPEN === 'undefined' || !SEASON_OPEN) return;
                const b = document.querySelector('#stickerMakeModal [data-ft-piece]'); if (b) b.removeAttribute('data-ft');
            });
        })();
        window.ftOn = ftOn;

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['features'] = true;
