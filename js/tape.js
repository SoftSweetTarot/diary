/* 말랑달콤 다이어리 - js/tape.js
   🎀 마스킹테이프 : 반투명 종이테이프를 다이어리에 붙여요 (✏️ 스티커 창 → 🎀 마스킹테이프)
   - 사진 모서리나 글 위에 붙이면 '다꾸' 느낌이 나요
   - 붙인 뒤 ↔ 손잡이를 끌면 무늬는 그대로, 길이만 늘었다 줄었다 해요 (🔄 돌리기 · ↘ 크기는 다른 그림과 같아요)
   - 테이프는 그림(SVG)으로 일기에 담겨요 → 파일 없음 · 나중에 무늬를 고쳐도 이미 붙인 테이프는 그대로
   ※ 이 파일이 없어도 다이어리는 정상 동작 (마스킹테이프 칸만 안 보여요) */

        const TAPE_MARK = 'malang-tape';
        /* 무늬 : bg = 바탕색 · w,h = 무늬 한 칸 크기 · p = 무늬 한 칸 그림 · grad = 가로 줄무늬 색 · extra = 테이프 전체에 그리는 그림 */
        const TAPES = [
            { id: 'dot', name: '딸기우유 도트', bg: '#ffc9d9', w: 14, h: 14, p: '<circle cx="4" cy="4" r="2.4" fill="#fff"/><circle cx="11" cy="11" r="2.4" fill="#fff"/>' },
            { id: 'mint', name: '민트 사선', bg: '#bff0dc', w: 12, h: 12, p: '<path d="M-3 3 L3 -3 M0 12 L12 0 M9 15 L15 9" stroke="#fff" stroke-width="3.4"/>' },
            { id: 'gingham', name: '라벤더 깅엄', bg: '#e9e1ff', w: 16, h: 16, p: '<rect width="8" height="16" fill="#c9b6ff" opacity=".55"/><rect width="16" height="8" fill="#c9b6ff" opacity=".55"/>' },
            { id: 'heart', name: '레몬 하트', bg: '#fff3a6', w: 22, h: 20, p: '<path d="M11 15 C3 10 4 4 8 4 C10 4 11 6 11 7 C11 6 12 4 14 4 C18 4 19 10 11 15Z" fill="#ff8fab"/>' },
            { id: 'cloud', name: '하늘 구름', bg: '#bfe3ff', w: 36, h: 22, p: '<g fill="#fff"><circle cx="10" cy="13" r="5"/><circle cx="16" cy="10" r="6"/><circle cx="22" cy="13" r="5"/><rect x="10" y="13" width="12" height="5"/></g>' },
            { id: 'flower', name: '복숭아 꽃', bg: '#ffd9c2', w: 24, h: 24, p: '<g fill="#fff">' + [0, 72, 144, 216, 288].map(a => `<ellipse cx="12" cy="7.5" rx="3" ry="4.5" transform="rotate(${a} 12 12)"/>`).join('') + '</g><circle cx="12" cy="12" r="2.6" fill="#ffb347"/>' },
            { id: 'star', name: '밤하늘 별', bg: '#4b5aa8', w: 26, h: 22, p: '<path d="M8 4 l1.6 3.6 3.9.4 -2.9 2.6 .9 3.8 -3.5 -2 -3.5 2 .9 -3.8 -2.9 -2.6 3.9 -.4z" fill="#ffe680"/><circle cx="20" cy="16" r="1.4" fill="#fff"/><circle cx="3" cy="17" r="1" fill="#fff"/>' },
            { id: 'cherry', name: '체리 체리', bg: '#fff1f1', w: 26, h: 24, p: '<path d="M9 16 C10 9 14 6 18 4 M15 16 C15 10 16 7 18 4" stroke="#5aa64e" stroke-width="1.4" fill="none"/><circle cx="9" cy="17" r="3.6" fill="#e8384f"/><circle cx="15" cy="17" r="3.6" fill="#ff5f78"/><path d="M18 4 q5 -1 6 3 q-5 1 -6 -3z" fill="#7cc46f"/>' },
            { id: 'wave', name: '바다 물결', bg: '#9fd8e6', w: 24, h: 14, p: '<path d="M0 8 q6 -6 12 0 t12 0" stroke="#fff" stroke-width="2.4" fill="none"/>' },
            { id: 'rainbow', name: '무지개 줄무늬', bg: '#fff', p: '', grad: ['#ffadad', '#ffd6a5', '#fdffb6', '#caffbf', '#9bf6ff', '#bdb2ff'] },
            { id: 'stripe', name: '캔디 줄무늬', bg: '#fff', w: 14, h: 14, p: '<rect width="7" height="14" fill="#ff9fb4"/>' },
            { id: 'kraft', name: '크라프트 바느질', bg: '#d9b88f', p: '', extra: '<g stroke="#fff8ee" stroke-width="1.6" stroke-dasharray="7 5" stroke-linecap="round"><line x1="8" x2="100%" y1="26%" y2="26%"/><line x1="8" x2="100%" y1="74%" y2="74%"/></g>' },
            { id: 'grid', name: '모눈 투명', bg: '#f4f8ff', w: 10, h: 10, p: '<path d="M10 0 V10 M0 10 H10" stroke="#9ec2f0" stroke-width=".8"/>' },
            { id: 'lace', name: '화이트 레이스', bg: '#fffdf8', w: 18, h: 18, p: '<circle cx="9" cy="9" r="5" fill="none" stroke="#e8d9c8" stroke-width="1.4"/><circle cx="9" cy="9" r="1.6" fill="#e8d9c8"/><circle cx="0" cy="0" r="2" fill="#e8d9c8"/><circle cx="18" cy="18" r="2" fill="#e8d9c8"/><circle cx="18" cy="0" r="2" fill="#e8d9c8"/><circle cx="0" cy="18" r="2" fill="#e8d9c8"/>' },
            { id: 'love', name: '러블리 글씨', bg: '#ffe0ec', w: 92, h: 30, p: '<text x="4" y="20" font-size="13" font-family="Georgia, serif" font-style="italic" fill="#e2668a">lovely day ♡</text>' },
            { id: 'coral', name: '코랄 단색', bg: '#ffa58f', w: 10, h: 10, p: '' }
        ];

        /* 🆓 기본 테이프 : 누구나 처음부터 쓰는 테이프 (✨ 스티커 → 🎀 마스킹테이프 → 기본 칸)
           hold: true = 만들어 두고 아직 안 보여 줘요 (나중에 hold 를 지우면 기본 칸에 나와요) */
        const TAPES_FREE = [
            { id: 'f-berry', name: '딸기 체크', bg: '#fff', w: 24, h: 24, p: '<rect width="12" height="24" fill="#ffc2d1" opacity=".55"/><rect width="24" height="12" fill="#ffc2d1" opacity=".55"/><g transform="translate(13.5 12.5)"><path d="M5 2.2C9.4 2 10.4 5.4 8.4 8.4 7.3 10 6 10.8 5 10.8S2.7 10 1.6 8.4C-.4 5.4.6 2 5 2.2Z" fill="#ff5c7a"/><path d="M2.6 2.4 4 .8l1 1.2 1-1.2 1.4 1.6-2.4.8z" fill="#5fb760"/><circle cx="3.6" cy="5" r=".5" fill="#ffe680"/><circle cx="6.4" cy="5.4" r=".5" fill="#ffe680"/><circle cx="5" cy="7.6" r=".5" fill="#ffe680"/></g>' },
            { id: 'f-bunny', name: '토끼 얼굴', bg: '#ffe4ec', w: 30, h: 26, p: '<g transform="translate(5 3)"><ellipse cx="6.5" cy="5" rx="2.6" ry="5.5" fill="#fff"/><ellipse cx="13.5" cy="5" rx="2.6" ry="5.5" fill="#fff"/><ellipse cx="6.5" cy="5.5" rx="1.1" ry="3.6" fill="#ffb3c8"/><ellipse cx="13.5" cy="5.5" rx="1.1" ry="3.6" fill="#ffb3c8"/><ellipse cx="10" cy="14" rx="8" ry="6.5" fill="#fff"/><circle cx="7" cy="13.4" r="1" fill="#5b3f4a"/><circle cx="13" cy="13.4" r="1" fill="#5b3f4a"/><path d="M9 15.6q1 1 2 0" stroke="#5b3f4a" stroke-width=".8" fill="none" stroke-linecap="round"/><ellipse cx="5" cy="15.6" rx="1.6" ry=".9" fill="#ffb3c8"/><ellipse cx="15" cy="15.6" rx="1.6" ry=".9" fill="#ffb3c8"/></g>' },
            { id: 'f-bear', name: '곰돌이 줄', bg: '#fff4e3', w: 28, h: 30, p: '<rect width="28" height="3" fill="#e8c39e"/><rect y="27" width="28" height="3" fill="#e8c39e"/><g transform="translate(4 6)"><circle cx="4" cy="4" r="3.4" fill="#c98f5f"/><circle cx="16" cy="4" r="3.4" fill="#c98f5f"/><circle cx="10" cy="10" r="8" fill="#c98f5f"/><ellipse cx="10" cy="12.6" rx="3.6" ry="2.8" fill="#f3d7b8"/><circle cx="10" cy="11.6" r=".9" fill="#5b3f4a"/><circle cx="7" cy="8.6" r=".9" fill="#5b3f4a"/><circle cx="13" cy="8.6" r=".9" fill="#5b3f4a"/></g>' },
            { id: 'f-coffee', name: '커피콩', bg: '#f3e2cf', w: 24, h: 22, p: '<g transform="rotate(-25 7 7)"><ellipse cx="7" cy="7" rx="4" ry="5.4" fill="#8a5a3c"/><path d="M7 2.2C5.4 5 8.6 9 7 11.8" stroke="#f3e2cf" stroke-width="1" fill="none"/></g><g transform="rotate(30 18 16)"><ellipse cx="18" cy="16" rx="4" ry="5.4" fill="#6f4630"/><path d="M18 11.2C16.4 14 19.6 18 18 20.8" stroke="#f3e2cf" stroke-width="1" fill="none"/></g>' },
            { id: 'f-moon', name: '달과 별', bg: '#dcd6ff', w: 34, h: 24, p: '<path d="M11 4a8 8 0 1 0 7 12 6.2 6.2 0 1 1-7-12z" fill="#fff6c2"/><path d="M26 5l1 2.2 2.4.3-1.8 1.6.5 2.4-2.1-1.2-2.1 1.2.5-2.4-1.8-1.6 2.4-.3z" fill="#fff"/><circle cx="29" cy="18" r="1.2" fill="#fff"/><circle cx="22" cy="20" r=".8" fill="#fff6c2"/>' },
            { id: 'f-lemon', name: '레몬 슬라이스', bg: '#fffbd6', w: 26, h: 24, p: '<circle cx="9" cy="9" r="6.6" fill="#ffe14d"/><circle cx="9" cy="9" r="5.2" fill="#fff7b8"/><g stroke="#ffe14d" stroke-width="1">' + [0, 60, 120].map(a => `<line x1="9" y1="4" x2="9" y2="14" transform="rotate(${a} 9 9)"/>`).join('') + '</g><path d="M20 19l2.4-4 1.6 1.2z" fill="#7cc96e"/><circle cx="20" cy="20" r="1" fill="#ffe14d"/>' },
            { id: 'f-vine', name: '나뭇잎 덩굴', bg: '#eaf7e1', w: 40, h: 24, p: '<path d="M0 12q10-8 20 0t20 0" stroke="#79b86a" stroke-width="1.4" fill="none"/><path d="M9 7.6c-3-4 1-6.8 3.4-6.4.4 3-1 6-3.4 6.4z" fill="#8fd17e"/><path d="M29 16.4c3 4-1 6.8-3.4 6.4-.4-3 1-6 3.4-6.4z" fill="#8fd17e"/><path d="M20 12c2.6-3.6 6-2.4 6.4-.6-2.4 1.6-4.8 1.6-6.4.6z" fill="#a6dd94"/>' },
            { id: 'f-stamp', name: '우표 테두리', bg: '#fdf6ea', w: 26, h: 26, hold: true, p: '<rect x="4" y="4" width="18" height="18" fill="#fff" stroke="#f0c8a0" stroke-width="1" stroke-dasharray="1.6 1.6"/><rect x="7" y="7" width="12" height="12" fill="#ffd1dc"/><path d="M13 16.6c-3-2-3-4.6-1.4-5.2 .8-.3 1.4.3 1.4.7 0-.4.6-1 1.4-.7 1.6.6 1.6 3.2-1.4 5.2z" fill="#ff6b8f"/>' },
            { id: 'f-balloon', name: '풍선', bg: '#e8f6ff', w: 48, h: 28, p: '<g stroke="#9aa7b8" stroke-width=".7" fill="none"><path d="M8 13q-1 5 1 10"/><path d="M24 16q1 5-1 9"/><path d="M40 12q-1 6 1 11"/></g><ellipse cx="8" cy="8" rx="4.6" ry="5.6" fill="#ff9fb6"/><ellipse cx="24" cy="11" rx="4.6" ry="5.6" fill="#ffd36b"/><ellipse cx="40" cy="7" rx="4.6" ry="5.6" fill="#b9a7ff"/><g fill="#fff" opacity=".7"><ellipse cx="6.4" cy="6" rx="1.1" ry="1.8"/><ellipse cx="22.4" cy="9" rx="1.1" ry="1.8"/><ellipse cx="38.4" cy="5" rx="1.1" ry="1.8"/></g>' },
            { id: 'f-crayon', name: '크레용 낙서', bg: '#fff', w: 60, h: 26, hold: true, p: '<g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.2" opacity=".85"><path d="M2 8l6 8 6-9 6 9 6-8" stroke="#ff8fab"/><path d="M33 18q4-12 8 0t8 0" stroke="#7cc4f0"/><path d="M52 6l3 3m0-3l-3 3" stroke="#ffc94d"/><circle cx="30" cy="6" r="2.4" stroke="#9fdc8f"/></g>' }
        ];
        const tapeFreeList = () => TAPES_FREE.filter(t => !t.hold);
        /* 🆓 기본 칸 그리기 · 누르면 붙이기 */
        function tapeFreeHtml() {
            return tapeFreeList().map(t => `<button type="button" class="tp-item" onclick="addFreeTape('${t.id}')"><span style="background-image:url(&quot;${tapeUrl(t)}&quot;)"></span><small>${t.name}</small></button>`).join('');
        }
        function addFreeTape(id) {
            const t = tapeFreeList().find(x => x.id === id); if (!t || typeof addImage !== 'function') return;
            placeTape(tapeUrl(t));
        }

        /* 테이프 그림 : 크기를 정하지 않은 SVG → 길이를 늘리면 무늬가 늘어나지 않고 더 이어져요 */
        function tapeSvg(t) {
            const pat = (t.p ? `<pattern id="p" width="${t.w}" height="${t.h}" patternUnits="userSpaceOnUse">${t.p}</pattern>` : '')
                + (t.grad ? '<linearGradient id="r" x2="0" y2="1">' + t.grad.map((c, i, a) => `<stop offset="${i / a.length}" stop-color="${c}"/><stop offset="${(i + 1) / a.length}" stop-color="${c}"/>`).join('') + '</linearGradient>' : '');
            return `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%"><!--${TAPE_MARK}:${t.id}--><defs>${pat}`
                + '<pattern id="z" width="6" height="8" patternUnits="userSpaceOnUse"><path d="M0 0 L6 4 L0 8Z" fill="#000"/></pattern>'
                + '<pattern id="z2" width="6" height="8" patternUnits="userSpaceOnUse"><path d="M6 0 L0 4 L6 8Z" fill="#000"/></pattern>'
                + '<pattern id="g" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r=".5" fill="#fff" opacity=".35"/></pattern>'
                + '<mask id="m"><rect width="100%" height="100%" fill="#fff"/><rect width="6" height="100%" fill="url(#z)"/>'
                + '<svg x="100%" overflow="visible"><rect x="-6" width="6" height="100%" fill="url(#z2)"/></svg></mask></defs>'
                + `<g mask="url(#m)" opacity=".86"><rect width="100%" height="100%" fill="${t.bg}"/>${t.p ? '<rect width="100%" height="100%" fill="url(#p)"/>' : ''}${t.grad ? '<rect width="100%" height="100%" fill="url(#r)"/>' : ''}${t.extra || ''}`
                + '<rect width="100%" height="100%" fill="url(#g)"/><rect width="100%" height="1.5" fill="#fff" opacity=".45"/><rect y="100%" width="100%" height="1.5" transform="translate(0 -1.5)" fill="#000" opacity=".06"/></g></svg>';
        }
        const tapeUrl = t => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(tapeSvg(t));
        function isTapeSrc(src) { return String(src || '').indexOf(TAPE_MARK) >= 0; }

        function addTape(id) {
            const t = TAPES.find(x => x.id === id); if (!t || typeof addImage !== 'function') return;
            if (!tapeHas(id)) { showMsg('🎀 이 테이프의 선물 기간이 끝났어요 💕'); return; }
            placeTape(tapeUrl(t));
        }
        /* 테이프 그림 하나를 다이어리에 붙이기 (🎀 마스킹테이프 · 🎀 내 마스킹테이프 공용) */
        function placeTape(url) {
            if (!addImage(url)) return false;
            const el = document.querySelector('#canvasArea .element-box:last-child');
            if (el) { el.style.width = '170px'; el.style.height = '30px'; el.dataset.rotation = -8; el.style.transform = el.style.transform.replace(/rotate\([^)]*\)/, 'rotate(-8deg)'); selectElement(el); }
            if (window.stkBlink) stkBlink();
            return true;
        }

        /* ✏️ 스티커 창 → 🎀 마스킹테이프 칸 : 선물 받은 테이프만 · 디자인마다 남은 날 (캡슐 스티커 칸처럼) */
        /* 🎀 마스킹테이프 → 내스티커의 '받은 테이프' 칸 (js/tapemaker.js loadMyTapes 가 내가 만든 테이프와 같이 그려요) */
        function tapeRecvHtml() {
            return TAPES.filter(t => tapeHas(t.id)).map(t => `<button type="button" class="tp-item" onclick="addTape('${t.id}')">${typeof nwChip === 'function' ? nwChip('tape', t.id) : ''}<span style="background-image:url(&quot;${tapeUrl(t)}&quot;)"></span><small>${t.name}</small><i>${dLabel(tapeLeft(t.id))}</i></button>`).join('');
        }
        window.tapeRecvHtml = tapeRecvHtml; window.tapeFreeHtml = tapeFreeHtml; window.addFreeTape = addFreeTape;
        window.isTapeSrc = isTapeSrc;
        window.placeTape = placeTape;
