/* 말랑달콤 다이어리 - js/patterns.js
   🎨 전체 배경에 까는 배경지 목록 (☁️ 말랑배경지)
   - tier : 'free' = 말랑배경지(심플한 줄무늬·도트 · 누구나) → 🌈 배경지 '기본' 칸
   - css  : 배경에 그대로 들어가는 CSS 값 (이미지 파일 없이 동작)
   - 새 배경지 추가 : 아래 목록에 { id, tier, name, css } 한 줄 추가. id는 저장에 쓰이므로 한 번 정하면 바꾸지 마세요.
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → patterns → skins → service (index.html 참고) */
const BG_PATTERNS = (() => {
    const plaid = (deg) => `repeating-linear-gradient(${deg}, rgba(232,86,75,.75) 0 4px, transparent 4px 18px, rgba(84,138,214,.7) 18px 21px, transparent 21px 34px, rgba(242,192,48,.8) 34px 38px, transparent 38px 52px, rgba(92,176,104,.7) 52px 55px, transparent 55px 70px, rgba(242,138,58,.7) 70px 73px, transparent 73px 84px, rgba(232,86,75,.45) 84px 86px, transparent 86px 96px)`;

    return [
        /* ---------------- ☁️ 말랑패턴 : 심플한 줄무늬 · 도트 · 체크 ---------------- */
        { id: 'candy', tier: 'free', name: '사탕 스트라이프',
          css: { backgroundColor: '#fdf0f4',
            backgroundImage: 'repeating-linear-gradient(45deg, transparent 0 13px, rgba(255,255,255,.9) 13px 15px, transparent 15px 28px), repeating-linear-gradient(45deg, #fdf0f4 0 14px, #f7c3d1 14px 28px)' } },
        { id: 'dots', tier: 'free', name: '딸기우유 도트',
          css: { backgroundColor: '#ffe7ee',
            backgroundImage: 'radial-gradient(circle, #ffffff 0 5px, transparent 5.5px), radial-gradient(circle, #ffffff 0 5px, transparent 5.5px)',
            backgroundSize: '30px 30px, 30px 30px', backgroundPosition: '0 0, 15px 15px' } },
        { id: 'pink-stripe', tier: 'free', name: '핑크 세로줄',
          css: { backgroundColor: '#fff5f8',
            backgroundImage: 'repeating-linear-gradient(90deg, #ffd6e2 0 18px, #fff5f8 18px 36px)' } },
        { id: 'mint-stripe', tier: 'free', name: '민트 가로줄',
          css: { backgroundColor: '#f1fbf6',
            backgroundImage: 'repeating-linear-gradient(0deg, #cdeedd 0 14px, #f1fbf6 14px 28px, #e2f6ec 28px 30px, #f1fbf6 30px 44px)' } },
        { id: 'blue-gingham', tier: 'free', name: '블루 깅엄',
          css: { backgroundColor: '#eef4fc',
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(133,166,220,.36) 0 16px, transparent 16px 32px), repeating-linear-gradient(0deg, rgba(133,166,220,.36) 0 16px, transparent 16px 32px)' } },
        { id: 'lavender-check', tier: 'free', name: '라벤더 체크',
          css: { backgroundColor: '#f6f1fc',
            backgroundImage: 'repeating-linear-gradient(90deg, rgba(186,160,226,.45) 0 3px, transparent 3px 26px), repeating-linear-gradient(0deg, rgba(186,160,226,.45) 0 3px, transparent 3px 26px)' } },
        { id: 'scallop', tier: 'free', name: '구름 스캘럽',
          css: { backgroundColor: '#d6ebf6',
            backgroundImage: 'radial-gradient(circle at 50% 0, transparent 0 11px, #ffffff 11.5px 13px, transparent 13.5px), radial-gradient(circle at 50% 0, #eaf5fb 0 13px, transparent 13.5px)',
            backgroundSize: '26px 20px', backgroundPosition: '0 0, 13px 10px' } },
        { id: 'lemon-grid', tier: 'free', name: '레몬 격자',
          css: { backgroundColor: '#fff8d6',
            backgroundImage: 'radial-gradient(circle, #f2c94c 0 3px, transparent 3.5px), linear-gradient(90deg, rgba(242,201,76,.35) 0 2px, transparent 2px), linear-gradient(0deg, rgba(242,201,76,.35) 0 2px, transparent 2px)',
            backgroundSize: '36px 36px', backgroundPosition: '-17px -17px, 0 0, 0 0' } },
        { id: 'grid-paper', tier: 'free', name: '모눈종이',
          css: { backgroundColor: '#fffdf7',
            backgroundImage: 'linear-gradient(90deg, rgba(120,170,210,.35) 0 1px, transparent 1px), linear-gradient(0deg, rgba(120,170,210,.35) 0 1px, transparent 1px), linear-gradient(90deg, rgba(120,170,210,.15) 0 1px, transparent 1px), linear-gradient(0deg, rgba(120,170,210,.15) 0 1px, transparent 1px)',
            backgroundSize: '80px 80px, 80px 80px, 16px 16px, 16px 16px' } },
        { id: 'plaid', tier: 'free', name: '무지개 체크',
          css: { backgroundColor: '#fcf6df', backgroundImage: `${plaid('90deg')}, ${plaid('0deg')}` } },

    ];
})();

/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['patterns'] = true;
