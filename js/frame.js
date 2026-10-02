/* 말랑달콤 다이어리 - js/frame.js
   📷 사진 틀 : 폴라로이드 · 인스탁스 · 필름 · 빈티지 스냅 · 동그라미 · 하트 · 테이프 붙인 사진
   - 다이어리의 사진(이미지)을 누르면 뜨는 '✥ 사진 꾸미기' → 틀 · 폴라로이드/인스탁스는 아래 여백에 글씨도 써요
   - 틀은 CSS 로 그려요 (css/style.css 의 .fr-이름) → 일기에는 틀 이름(fr)과 글씨(cp)만 저장
   - 사진에만 쓸 수 있어요 (스티커 · 테이프 · 펜 그림 같은 SVG 그림은 제외)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (틀 고르기만 안 보여요 · 이미 고른 틀은 그대로 보여요) */

        const FRAMES = [
            { id: '', s: '없음' },
            { id: 'polaroid', s: '폴라', cap: true },
            { id: 'instax', s: '인스탁', cap: true },
            { id: 'film', s: '필름' },
            { id: 'film2', s: '갈색' },
            { id: 'snap', s: '빈티지' },
            { id: 'tape', s: '테이프' },
            { id: 'round', s: '동글' },
            { id: 'heart', s: '하트' },
            { id: 'cloud', s: '구름' }
        ];
        const FRAME_CAP_MAX = 20;

        function frameCanCaption(id) { const f = FRAMES.find(x => x.id === id); return !!(f && f.cap); }
        function setFrame(el, id, caption) {
            [...el.classList].filter(c => c.startsWith('fr-')).forEach(c => el.classList.remove(c));
            if (id) { el.classList.add('fr-' + id); el.dataset.frame = id; } else delete el.dataset.frame;
            const cap = id && frameCanCaption(id) ? String(caption || '').slice(0, FRAME_CAP_MAX) : '';
            if (cap) el.dataset.caption = cap; else delete el.dataset.caption;
        }
        function applyFrame(id) {
            if (!selectedElement || typeof getSelectedPhoto !== 'function' || !getSelectedPhoto()) return;
            setFrame(selectedElement, id, selectedElement.dataset.caption || '');
            updateFrameChips();
            if (typeof positionTextPanel === 'function') positionTextPanel();
        }
        function applyCaption(v) {
            if (!selectedElement || !selectedElement.dataset.frame) return;
            setFrame(selectedElement, selectedElement.dataset.frame, v);
        }
        function updateFrameChips() {
            const cur = (selectedElement && selectedElement.dataset.frame) || '';
            document.querySelectorAll('#frameChips button').forEach(b => b.classList.toggle('on', b.dataset.fr === cur));
            const row = document.getElementById('captionRow');
            row.hidden = !frameCanCaption(cur);
            const inp = document.getElementById('captionInput');
            if (document.activeElement !== inp) inp.value = (selectedElement && selectedElement.dataset.caption) || '';
        }
        (function buildFrameChips() {
            const box = document.getElementById('frameChips'); if (!box) return;
            box.innerHTML = FRAMES.map(f => `<button type="button" data-fr="${f.id}" onclick="applyFrame('${f.id}')"><span class="fr-chip${f.id ? ' fr-' + f.id : ''}"><i></i></span><small>${f.s}</small></button>`).join('');
            document.getElementById('frameRow').hidden = false;
            document.getElementById('captionInput').maxLength = FRAME_CAP_MAX;
        })();
        window.applyFrame = applyFrame;
        window.applyCaption = applyCaption;
        window.setFrame = setFrame;
        window.updateFrameChips = updateFrameChips;
