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
            if (!addImage(tapeUrl(t))) return;
            const el = document.querySelector('#canvasArea .element-box:last-child');
            if (el) { el.style.width = '170px'; el.style.height = '30px'; el.dataset.rotation = -8; el.style.transform = el.style.transform.replace(/rotate\([^)]*\)/, 'rotate(-8deg)'); selectElement(el); }
            if (typeof closeModal === 'function') closeModal('stickerModal');
            if (typeof toast === 'function') toast('🎀 ↔ 손잡이를 끌면 테이프 길이가 바뀌어요');
        }

        /* ✏️ 스티커 창 → 🎀 마스킹테이프 칸 */
        function loadTapes(btn) {
            if (btn) { document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
            document.getElementById('stickerGrid').innerHTML = '<div class="tp-note">🎀 사진 모서리나 글 위에 붙여 보세요 · 붙인 뒤 ↔ 손잡이로 길이 조절</div>'
                + TAPES.map(t => `<button type="button" class="tp-item" onclick="addTape('${t.id}')"><span style="background-image:url(&quot;${tapeUrl(t)}&quot;)"></span><small>${t.name}</small></button>`).join('');
        }
        window.loadTapes = loadTapes;
        window.isTapeSrc = isTapeSrc;
