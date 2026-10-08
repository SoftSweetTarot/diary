/* 말랑달콤 다이어리 - js/app.js
   공통 상태값 · 알림창 · 글꼴 목록 · 페이지 목록 · 시작(window.onload)
   ※ 파일 불러오는 순서: drive → app → page → elements → settings → service (index.html 참고) */
        let currentDate = new Date();
        let isCoverOpen = false;
        let selectedElement = null;
        let autoSaveTimer = null;
        let autoSaveMinutes = 5;
        let zIndexCounter = 10;

        let customSkins = {};

        /* 페이지 크기 설정 */
        const PAGE_SIZE_KEY = 'diary_page_size';
        const DEFAULT_PAGE_W = 480, DEFAULT_PAGE_H = 620;
        const PAGE_W_MIN = 320, PAGE_W_MAX = 1200, PAGE_H_MIN = 400, PAGE_H_MAX = 1600;
        const PAGE_BORDER = 4, PAGE_HEADER_H = 48;
        let pageSetting = { w: DEFAULT_PAGE_W, h: DEFAULT_PAGE_H };
        let liveSize = null;
        let layoutDirty = false;

        /* 커스텀 예쁜 메시지 모달 로직 (alert / confirm 대체) */
        let msgResolve = null;
        function showMsg(msg, isConfirm = false) {
            return new Promise((resolve) => {
                msgResolve = resolve;
                document.getElementById('customAlertMsg').innerHTML = msg;
                document.getElementById('customAlertCancelBtn').style.display = isConfirm ? 'block' : 'none';
                document.getElementById('customAlertModal').style.display = 'flex';
            });
        }
        function closeMsg(res) {
            document.getElementById('customAlertModal').style.display = 'none';
            if (msgResolve) {
                msgResolve(res);
                msgResolve = null;
            }
        }

/* 폰트 목록 (기본 web/google fonts 및 기본 로컬 폰트) */
const SYSTEM_FONT = "system-ui, -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', 'Malgun Gothic', 'Segoe UI', Roboto, sans-serif";

let fontList = [
    { id: 'sys',           name: '기기 기본 폰트', css: SYSTEM_FONT },

    /* --- 로컬 폰트 (Windows / Mac / OS 공통) --- */
    { id: 'malgun',        name: '맑은 고딕 (Local)', css: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif" },
    { id: 'gulim',         name: '굴림 (Local)', css: "'Gulim', 'GulimChe', sans-serif" },
    { id: 'dotum',         name: '돋움 (Local)', css: "'Dotum', 'DotumChe', sans-serif" },
    { id: 'batang',        name: '바탕 (Local)', css: "'Batang', 'AppleMyungjo', serif" },
    { id: 'gungsuh',       name: '궁서 (Local)', css: "'Gungsuh', 'GungsuhChe', serif" },
    { id: 'pyunji',        name: '휴먼편지체 (Local)', css: "'HMDodum', 'Pyunji R', sans-serif" },
    { id: 'headline',      name: '헤드라인 (Local)', css: "'HYHeadLine-Medium', 'HeadLine', sans-serif" },
    { id: 'arial',         name: 'Arial (Local)', css: "Arial, Helvetica, sans-serif" },
    { id: 'comic_sans',    name: 'Comic Sans MS (Local)', css: "'Comic Sans MS', 'Chalkboard SE', cursive" },
    { id: 'courier_new',   name: 'Courier New (Local)', css: "'Courier New', Courier, monospace" },
    { id: 'georgia',       name: 'Georgia (Local)', css: "Georgia, serif" },
    { id: 'impact',        name: 'Impact (Local)', css: "Impact, Charcoal, sans-serif" },
    { id: 'times_roman',   name: 'Times New Roman (Local)', css: "'Times New Roman', Times, serif" },
    { id: 'verdana',       name: 'Verdana (Local)', css: "Verdana, Geneva, sans-serif" },
    { id: 'segoe',         name: 'Segoe UI (Local)', css: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif" },
    { id: 'tahoma',        name: 'Tahoma (Local)', css: "Tahoma, Geneva, sans-serif" },
    { id: 'trebuchet',     name: 'Trebuchet MS (Local)', css: "'Trebuchet MS', 'Lucida Sans Unicode', sans-serif" },
    { id: 'palatino',      name: 'Palatino (Local)', css: "'Palatino Linotype', 'Book Antiqua', Palatino, serif" },
    { id: 'garamond',      name: 'Garamond (Local)', css: "Garamond, Baskerville, 'Baskerville Old Face', serif" },
    { id: 'consolas',      name: 'Consolas (Local)', css: "Consolas, 'Courier New', monospace" },
    { id: 'apple_sd',      name: '애플 SD 산돌고딕 (Apple)', css: "'Apple SD Gothic Neo', sans-serif" },
    { id: 'apple_myungjo', name: '애플 명조 (Apple)', css: "'AppleMyungjo', serif" },
    { id: 'helvetica',     name: 'Helvetica (Apple)', css: "'Helvetica Neue', Helvetica, Arial, sans-serif" },
    { id: 'chalkboard',    name: 'Chalkboard (Apple)', css: "'Chalkboard SE', 'Comic Sans MS', cursive" },

    /* --- 초인기 표준 웹폰트 (CDN 필요) --- */
    { id: 'pretendard',    name: '프리텐다드 [대표 고딕]', css: "'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif" },
    { id: 'suit',          name: '수트 (SUIT) [모던 고딕]', css: "'SUIT', sans-serif" },
    { id: 'gmarket',       name: 'Gmarket Sans [제목용]', css: "'GmarketSansMedium', sans-serif" },
    { id: 'tmon',          name: '티몬 몬소리체 [제목용]', css: "'TmonMonsori', sans-serif" },

    /* --- Google Fonts (고딕/Sans-Serif) --- */
    { id: 'nk',            name: '노토산스 KR [Google Fonts]', css: "'Noto Sans KR', sans-serif" },
    { id: 'gd',            name: '고운돋움 [Google Fonts]', css: "'Gowun Dodum', sans-serif" },
    { id: 'nanum_gothic',  name: '나눔고딕 [Google Fonts]', css: "'Nanum Gothic', sans-serif" },
    { id: 'nanum_square',  name: '나눔스퀘어 네오 [Google Fonts]', css: "'NanumSquareNeo', sans-serif" },
    { id: 'jua',           name: '주아 [Google Fonts]', css: "'Jua', sans-serif" },
    { id: 'dh',            name: '도현 [Google Fonts]', css: "'Do Hyeon', sans-serif" },
    { id: 'sf',            name: '해바라기 [Google Fonts]', css: "'Sunflower', sans-serif" },
    { id: 'bh',            name: '블랙한산스 [Google Fonts]', css: "'Black Han Sans', sans-serif" },
    { id: 'dg',            name: '동글 [Google Fonts]', css: "'Dongle', sans-serif" },
    { id: 'sty',           name: '스타일리쉬 [Google Fonts]', css: "'Stylish', sans-serif" },
    { id: 'ibm_sans',      name: 'IBM Plex Sans KR [Google Fonts]', css: "'IBM Plex Sans KR', sans-serif" },
    { id: 'orbit',         name: '오르빗 [Google Fonts]', css: "'Orbit', sans-serif" },
    { id: 'gothic_a1',     name: '고딕 A1 [Google Fonts]', css: "'Gothic A1', sans-serif" },

    /* --- Google Fonts (명조/Serif) --- */
    { id: 'nm',            name: '나눔명조 [Google Fonts]', css: "'Nanum Myeongjo', serif" },
    { id: 'noto_serif',    name: '노토세리프 KR [Google Fonts]', css: "'Noto Serif KR', serif" },
    { id: 'gowun_batang',  name: '고운바탕 [Google Fonts]', css: "'Gowun Batang', serif" },
    { id: 'sm',            name: '송명 [Google Fonts]', css: "'Song Myung', serif" },
    { id: 'diphylleia',    name: '산들바람 [Google Fonts]', css: "'Diphylleia', serif" },
    { id: 'hahmlet',       name: '함렛 [Google Fonts]', css: "'Hahmlet', serif" },

    /* --- Google Fonts (손글씨/Cursive/Display) --- */
    { id: 'nps',           name: '나눔펜 스크립트 [Google Fonts]', css: "'Nanum Pen Script', cursive" },
    { id: 'nanum_brush',   name: '나눔붓 스크립트 [Google Fonts]', css: "'Nanum Brush Script', cursive" },
    { id: 'gaegu',         name: '개구 [Google Fonts]', css: "'Gaegu', cursive" },
    { id: 'hm',            name: '하이멜로디 [Google Fonts]', css: "'Hi Melody', cursive" },
    { id: 'ps',            name: '푸어스토리 [Google Fonts]', css: "'Poor Story', cursive" },
    { id: 'sd',            name: '싱글데이 [Google Fonts]', css: "'Single Day', cursive" },
    { id: 'gj',            name: '감자꽃 [Google Fonts]', css: "'Gamja Flower', cursive" },
    { id: 'ys',            name: '연성 [Google Fonts]', css: "'Yeon Sung', cursive" },
    { id: 'ed',            name: '동해 독도 [Google Fonts]', css: "'East Sea Dokdo', cursive" },
    { id: 'cute',          name: '귀여운폰트 [Google Fonts]', css: "'Cute Font', cursive" },
    { id: 'kh',            name: '기랑해랑 [Google Fonts]', css: "'Kirang Haerang', cursive" },
    { id: 'gugi',          name: '구기 [Google Fonts]', css: "'Gugi', cursive" },
    { id: 'dokdo',         name: '독도 [Google Fonts]', css: "'Dokdo', cursive" },
    { id: 'black_fancy',   name: '흑백영화 [Google Fonts]', css: "'Black And White Fancy', cursive" },
    { id: 'bagel_fat',     name: '베이글 팻 One [Google Fonts]', css: "'Bagel Fat One', cursive" }
];

        function fontIdOf(css) { const f = fontList.find(x => x.css === css); return f ? f.id : 'sys'; }
        const DEFAULT_UI_FONT = fontList[0].css;
        const DEFAULT_TEXT_FONT = fontList[0].css;
        const DEFAULT_TEXT_COLOR = '#444444';
        const DEFAULT_TEXT_SIZE = 18;

        const emojiRanges = {
            faces: [[0x1F600, 0x1F64F], [0x1F970, 0x1F9A2]],
            animals: [[0x1F400, 0x1F4D3], [0x1F980, 0x1F9AE]],
            food: [[0x1F347, 0x1F37B], [0x1F950, 0x1F96B]],
            activities: [[0x1F380, 0x1F3C4], [0x1F940, 0x1F94B]],
            travel: [[0x1F680, 0x1F6C5], [0x1F300, 0x1F320]],
            objects: [[0x1F4A0, 0x1F4FF], [0x1F321, 0x1F346]],
            symbols: [[0x2702, 0x27B0], [0x1F300, 0x1F5FF]]
        };

        const skinPresets = {
            pink: { bg: '#ffe6f0', cover: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%)', page: '#fff0f5', border: '#ffb6c1', accent: '#ff6b81' },
            mint: { bg: '#e0f2f1', cover: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)', page: '#f1f8e9', border: '#a5d6a7', accent: '#2e7d32' },
            purple: { bg: '#f3e5f5', cover: 'linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%)', page: '#faf0e6', border: '#ce93d8', accent: '#7b1fa2' },
            yellow: { bg: '#fffde7', cover: 'linear-gradient(135deg, #f6d365 0%, #fda085 100%)', page: '#fff8e1', border: '#ffe082', accent: '#f57f17' }
        };

        window.onload = () => {
            loadEmojiCategory('all');
            setupCurlDrag();
            loadCustomSkins();
            setupFontSelects();
            setupPanelDrag();
            loadUIFont();
            loadPageSize();
            setupLayout();
            setupPageMove();
            startAutoSave();
            initDrive();
            loadCoverNotice();
        };


/* 이 파일을 끝까지 문제없이 읽었다는 표시 (index.html에서 확인) */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['app'] = true;
