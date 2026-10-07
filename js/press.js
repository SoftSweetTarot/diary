/* 👆 버튼 누름 반응 (js/press.js)
   - 버튼 · 눌리는 칸을 손가락 · 마우스로 누르는 순간 '꾹' 작아지며 살짝 어두워져서 눌렸다는 걸 바로 알 수 있어요
   - 아이폰 · 아이패드 사파리는 css :active 가 잘 안 먹어서 class(.pressing)를 직접 붙여요
   - 아주 짧게 톡 눌러도 반응이 보이도록 최소 PRESS_MIN 밀리초 동안은 유지해요
   - 그림 · 글(캔버스 위) · 끌어서 움직이는 것은 제외 (꾸미는 중에 흔들리지 않게)
   - 이 반응이 싫은 칸은 그 요소에 data-nopress 를 달면 돼요 */
(() => {
    const PRESS_MIN = 140;
    const SEL = 'button, .btn, a[href], label, summary, [role="button"], [onclick], .sticker-item, .lib-item, .cat-btn';
    const SKIP = 'input, textarea, select, canvas, [disabled], [data-nopress], #canvasArea, #stuPaper, .text-panel-handle, .rot-zone, .element-box, .drag-handle';
    let cur = null, t0 = 0, timer = 0;

    function release() {
        clearTimeout(timer);
        const el = cur; if (!el) return;
        cur = null;
        const wait = Math.max(0, PRESS_MIN - (performance.now() - t0));
        setTimeout(() => el.classList.remove('pressing'), wait);
    }
    document.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        const t = e.target && e.target.closest ? e.target.closest(SEL) : null;
        if (!t || t.closest(SKIP) || t.matches('html, body')) return;
        const r = t.getBoundingClientRect();                       // 화면을 덮는 큰 바탕(창 뒷배경 등)은 제외
        if (r.width > innerWidth * .8 && r.height > innerHeight * .5) return;
        release(); cur = t; t0 = performance.now();
        t.classList.add('pressing');
        timer = setTimeout(release, 8000);                          // 혹시 뗀 신호를 못 받아도 계속 눌린 채로 남지 않게
    }, { capture: true, passive: true });
    ['pointerup', 'pointercancel', 'dragstart', 'contextmenu'].forEach(n => document.addEventListener(n, release, { capture: true, passive: true }));
    document.addEventListener('scroll', release, { capture: true, passive: true });   // 누른 채 화면을 밀면 취소
    document.addEventListener('touchstart', () => {}, { passive: true });             // 사파리에서 :active 를 깨우는 빈 신호
})();
