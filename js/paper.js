/* 말랑달콤 다이어리 - js/paper.js
   📝 글상자 모양 : 메모지 · 포스트잇 · 말풍선 · 액자 등 (하단메뉴 ✨ 스티커 → 📝 메모지에서 모양을 골라 놓아요)
   - 모양은 그림 파일이 아니라 CSS 로 그려요 (css/style.css 의 .pp-이름) → 일기에는 모양 이름만 저장 (pp)
   - 새 모양 추가 : 아래 PAPERS 에 { id, name(이름), s(칩에 보일 짧은 이름) } 를 넣고 style.css 에 .pp-id 모양을 만들면 돼요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (모양 고르기만 안 보여요 · 이미 고른 모양은 그대로 보여요) */

        const PAPERS = [
            { id: '', name: '기본', s: '기본' },
            { id: 'line', name: '줄노트', s: '줄노트' },
            { id: 'grid', name: '모눈 메모', s: '모눈' },
            { id: 'py', name: '노랑 포스트잇', s: '노랑' },
            { id: 'pp', name: '분홍 포스트잇', s: '분홍' },
            { id: 'pm', name: '민트 포스트잇', s: '민트' },
            { id: 'ps', name: '하늘 포스트잇', s: '하늘' },
            { id: 'bw', name: '말풍선', s: '말풍선' },
            { id: 'bp', name: '분홍 말풍선', s: '분홍풍선' },
            { id: 'think', name: '생각 풍선', s: '생각' },
            { id: 'torn', name: '찢은 종이', s: '찢은종이' },
            { id: 'tag', name: '라벨 태그', s: '태그' },
            { id: 'letter', name: '편지지', s: '편지지' },
            { id: 'frame', name: '점선 액자', s: '액자' },
            { id: 'chalk', name: '칠판', s: '칠판' }
        ];
        const PAPER_LIGHT_TEXT = ['chalk'];                     // 어두운 바탕 → 글자를 밝게

        function setPaper(el, id) {                            // 요소에 모양 입히기 (불러올 때도 사용)
            [...el.classList].filter(c => c.startsWith('pp-')).forEach(c => el.classList.remove(c));
            if (id) { el.classList.add('pp-' + id); el.dataset.paper = id; } else delete el.dataset.paper;
        }
        function applyPaper(id) {
            if (!selectedElement || !selectedElement.querySelector('textarea')) return;
            const ta = selectedElement.querySelector('textarea'), was = selectedElement.dataset.paper || '';
            setPaper(selectedElement, id);
            const light = PAPER_LIGHT_TEXT.includes(id), wasLight = PAPER_LIGHT_TEXT.includes(was);
            if (light && !wasLight && (ta.dataset.color || DEFAULT_TEXT_COLOR) === DEFAULT_TEXT_COLOR) styleTextarea(ta, ta.dataset.font, '#ffffff', ta.dataset.size);
            if (!light && wasLight && ta.dataset.color === '#ffffff') styleTextarea(ta, ta.dataset.font, DEFAULT_TEXT_COLOR, ta.dataset.size);
            const w = parseFloat(selectedElement.style.width) || 0, h = parseFloat(selectedElement.style.height) || 0;
            if (id && w < 150) selectedElement.style.width = '170px';            // 모양이 보이도록 너무 작으면 조금 키우기
            if (id && h < 70) selectedElement.style.height = '90px';
            if (typeof updateTextPanel === 'function') updateTextPanel();
        }
        /* 📝 메모지 창 (하단메뉴 ✨ 스티커 → 📝 메모지) : 모양을 고르면 그 모양의 메모지가 페이지에 놓이고, 눌러서 글을 써요 */
        function openPaperPicker() {
            const box = document.getElementById('paperPick'); if (!box) return;
            if (!box.firstChild) box.innerHTML = PAPERS.map(p => `<button type="button" class="btn pp-pick-btn" title="${p.name}" onclick="pickPaper('${p.id}')"><span class="pp-chip${p.id ? ' pp-' + p.id : ''}"></span><small>${p.name}</small></button>`).join('');
            openModal('paperModal');
        }
        function pickPaper(id) {
            if (typeof isCoverOpen !== 'undefined' && !isCoverOpen) { showMsg('먼저 다이어리를 열어 주세요!'); return; }
            closeModal('paperModal');
            addText(); applyPaper(id);
        }
        window.openPaperPicker = openPaperPicker; window.pickPaper = pickPaper;
        window.applyPaper = applyPaper;
        window.setPaper = setPaper;
