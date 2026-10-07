/* 말랑달콤 다이어리 - js/theme-skins.js
   🎁 테마 페이지 목록 (판매 · 보상용) — 🎁 테마 보관함에 보여요
   - 한 줄 = 테마 하나 : { id, name, desc, how, free, skin }
       id   : 영어 · 숫자 · - _ (한 번 정하면 바꾸지 말기 · 사용자 보관함에 이 id 가 저장돼요 · 페이지 id 는 'th:id')
       how  : 못 받았을 때 보이는 안내 글
       free : true 면 누구나 보관함에서 바로 써요 (⚠ 지금은 시험용으로 전부 true → 판매 · 보상으로 바꿀 때 true 를 지우기)
       skin : 색 5개(bg cover page border accent · 필수) + 하단메뉴 · 팝업메뉴 · 창 색(선택) + deco · icons (js/skinstudio.js 설명 참고)
   - 테마 하나 더 만들기 : 🎀 페이지꾸미기로 꾸민 뒤 🎨 페이지 → 내 페이지 코드를 복사해 skin 자리에 넣으면 돼요 (⚠ 내 이미지는 용량이 커서 테마에는 기본 꾸밈 · 이모지 권장)
   - 서버 선물로 줄 때는 themeGrant('id') 를 불러요 (다음 단계) */

const THEME_SKINS = [
    {
        id: 'bunny', name: '토끼 마을', desc: '토끼와 리본이 반겨 주는 사랑스러운 핑크', how: '구매하거나 이벤트 보상으로 받을 수 있어요', free: true,
        skin: {
            bg: '#ffe3ec', cover: '#ff9fb8', page: '#fff4f7', border: '#ff9db5', accent: '#f0587f',
            mf1: '#ffd3df', mf2: '#ffe9b8', mf3: '#d4efc9', mf4: '#e4d4f7',
            deco: [
                { a: 'pill', i: 's:bunny', x: 17, y: -8, s: 46, r: -8 },
                { a: 'pill', i: 's:heart', x: 93, y: -8, s: 20, r: 14 },
                { a: 'paper', i: 's:flower', x: 6, y: 96, s: 38, r: -10 },
                { a: 'paper', i: 's:sprout', x: 94, y: 95, s: 36, r: 8 },
                { a: 'paper', i: 's:sparkle', x: 90, y: 8, s: 22, r: 0 },
                { a: 'pop', i: 's:ribbon', x: 50, y: -3, s: 34, r: 0 },
                { a: 'pop', i: 's:heart', x: 98, y: 98, s: 20, r: 12 },
                { a: 'b1', i: 's:bunny', x: 50, y: -6, s: 24, r: 0 },
                { a: 'bar', i: 's:heart', x: 97, y: 12, s: 18, r: 10 }
            ],
            icons: { b1: 's:bunny', b2: 'e:🎵', b3: 'e:🧁', b4: 'e:🎀', p_pen: 'e:🖍️', p_save: 'e:💌' }
        }
    },
    {
        id: 'sakura', name: '벚꽃 리본', desc: '꽃잎과 리본으로 포인트를 준 여성스러운 디자인', how: '구매하거나 이벤트 보상으로 받을 수 있어요', free: true,
        skin: {
            bg: '#fff0f3', cover: '#ffb3c6', page: '#fffafb', border: '#f6a5bd', accent: '#e8668c',
            mf1: '#ffe0e8', mf2: '#fff1c7', mf3: '#e3f2d8', mf4: '#f1e1fa',
            deco: [
                { a: 'paper', i: 's:sakura', x: 5, y: 4, s: 40, r: -15 },
                { a: 'paper', i: 's:sakura', x: 96, y: 96, s: 44, r: 20 },
                { a: 'paper', i: 's:sakura', x: 90, y: 90, s: 24, r: -20 },
                { a: 'paper', i: 's:vine', x: 12, y: 94, s: 40, r: 0 },
                { a: 'pill', i: 's:sakura', x: 4, y: 50, s: 28, r: 10 },
                { a: 'pop', i: 's:ribbon', x: 50, y: -4, s: 36, r: 0 },
                { a: 'pop', i: 's:sakura', x: 2, y: 96, s: 26, r: -10 },
                { a: 'b1', i: 's:sakura', x: 50, y: -6, s: 22, r: 0 },
                { a: 'b4', i: 's:sakura', x: 88, y: 10, s: 20, r: 20 }
            ],
            icons: { b1: 's:sakura', b2: 'e:🎶', b3: 'e:🍵', b4: 'e:🌸', p_pen: 'e:🖊️', p_save: 'e:🎀' }
        }
    },
    {
        id: 'night', name: '밤하늘', desc: '달과 별이 반짝이는 몽환적인 분위기', how: '구매하거나 이벤트 보상으로 받을 수 있어요', free: true,
        skin: {
            bg: '#3b3a8c', cover: '#6f63d6', page: '#ece8ff', border: '#7a6ee0', accent: '#6455d6',
            menu: '#c9bfff', mf1: '#7a6ee0', mf2: '#6a5bd0', mf3: '#5a64c9', mf4: '#8f6fd8', pbd: '#a99cf5', pfill: '#6a60c8', psel: '#8a7de8', wbd: '#7a6ee0',
            deco: [
                { a: 'pill', i: 's:moon', x: 5, y: 12, s: 44, r: -10 },
                { a: 'pill', i: 's:star', x: 94, y: -12, s: 20, r: 12 },
                { a: 'paper', i: 's:cloud', x: 10, y: 98, s: 56, r: 0 },
                { a: 'paper', i: 's:cloud', x: 92, y: 96, s: 48, r: 0 },
                { a: 'paper', i: 's:sparkle', x: 90, y: 6, s: 22, r: 0 },
                { a: 'pop', i: 's:moon', x: 6, y: -2, s: 30, r: -10 },
                { a: 'pop', i: 's:sparkle', x: 98, y: 4, s: 20, r: 0 },
                { a: 'bar', i: 's:cloud', x: 4, y: 94, s: 44, r: 0, b: 1 },
                { a: 'bar', i: 's:cloud', x: 96, y: 94, s: 44, r: 0, b: 1 },
                { a: 'b1', i: 's:star', x: 82, y: 12, s: 18, r: 0 }
            ],
            icons: { b1: 's:star', b2: 'e:🎵', b3: 'e:☕', b4: 'e:🔮', p_pen: 'e:✨', p_save: 'e:💎' }
        }
    },
    {
        id: 'forest', name: '초록 숲', desc: '식물과 나뭇잎으로 편안한 자연의 느낌', how: '구매하거나 이벤트 보상으로 받을 수 있어요', free: true,
        skin: {
            bg: '#e7f3dc', cover: '#8fcf8f', page: '#f8fbf1', border: '#9ccf8d', accent: '#4c9a5c',
            mf1: '#e1f1cc', mf2: '#f6f0c4', mf3: '#cdebc3', mf4: '#d5ead8',
            deco: [
                { a: 'paper', i: 's:vine', x: 12, y: 3, s: 44, r: 0 },
                { a: 'paper', i: 's:tree', x: 93, y: 91, s: 50, r: 0 },
                { a: 'paper', i: 's:leaf', x: 6, y: 95, s: 34, r: -20 },
                { a: 'paper', i: 's:clover', x: 83, y: 94, s: 24, r: 10 },
                { a: 'pill', i: 's:leaf', x: 4, y: 50, s: 26, r: -25 },
                { a: 'pill', i: 's:leaf', x: 96, y: 50, s: 26, r: 25, f: 1 },
                { a: 'pop', i: 's:sprout', x: 50, y: -3, s: 34, r: 0 },
                { a: 'pop', i: 's:vine', x: 85, y: 98, s: 34, r: 0 },
                { a: 'b1', i: 's:leaf', x: 50, y: -4, s: 22, r: 0 },
                { a: 'bar', i: 's:vine', x: 3, y: 96, s: 36, r: 0, b: 1 }
            ],
            icons: { b1: 's:sprout', b2: 'e:🎵', b3: 'e:🍵', b4: 'e:🍀', p_pen: 'e:🍃', p_save: 'e:🌼' }
        }
    }
];
