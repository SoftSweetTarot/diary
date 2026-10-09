/* 말랑달콤 다이어리 - js/show.js
   👀 페이지에 보이는 것 : 다이어리 페이지에 붙는 기능을 켜고 끄는 스위치 (⚙ 설정 → 설정 → 👀 페이지에 보이는 것)
   - 😊 기분 · 날씨 도장 · ⏳ D-day · 📷 사진 꾸미기 창 · 🌸 계절 장식
   - 끈 것만 설정(설정.json)에 저장 ('diary_show' = { stamp: 0, … }) · 게스트는 이 기기에만
   - 꺼도 이미 찍은 도장 · 만든 D-day · 이미 씌운 사진 틀은 지워지지 않아요 (다시 켜면 그대로 보여요)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (모두 보임) */

        const SHOW_KEY = 'diary_show', SHOW_LOCAL = 'malang_show';
        const SHOW_ITEMS = [
            ['stamp', '😊 기분 · 날씨 도장', '페이지 오른쪽 위 동그라미'],
            ['dday', '⏳ D-day', '📌 한 D-day 를 페이지 왼쪽 위에'],
            ['photo', '📷 사진 꾸미기 창', '사진을 누르면 뜨는 틀 · 글씨 창'],
            ['corner', '🌸 계절 장식', '계절 테마를 켰을 때 페이지 모서리 그림', 'season']
        ].filter(x => x[3] !== 'season' || (typeof SEASON_OPEN !== 'undefined' && SEASON_OPEN));   // 계절 기능이 닫혀 있으면 스위치도 숨겨요 (js/season.js)
        const showSync = () => typeof drive !== 'undefined' && drive.ready && !drive.guest;
        function showRead() {
            let o = null; try { o = JSON.parse(showSync() ? store.getItem(SHOW_KEY) : localStorage.getItem(SHOW_LOCAL)); } catch (e) {}
            return o && typeof o === 'object' ? o : {};
        }
        function showApply() {
            const o = showRead(), root = document.documentElement;
            SHOW_ITEMS.forEach(([k]) => root.classList.toggle('hide-' + k, o[k] === 0));
            showRenderSwitches();
            if (typeof updateTextPanel === 'function') updateTextPanel();      // 사진 꾸미기 창을 켜고 끈 걸 바로 보여 줘요
        }
        function showSet(k, on) {
            const o = showRead();
            if (on) delete o[k]; else o[k] = 0;
            const t = JSON.stringify(o);
            try { if (showSync()) store.setItem(SHOW_KEY, t); else localStorage.setItem(SHOW_LOCAL, t); } catch (e) {}
            showApply();
        }
        function showRenderSwitches() {
            if (window.clearSecRender) clearSecRender();
            if (window.snbRender) snbRender();                  // 📒 스티커 고르는 창 (js/stknote.js)
            const box = document.getElementById('showSwitches'); if (!box) return;
            const o = showRead();
            box.innerHTML = SHOW_ITEMS.map(([k, name, sub]) => `<label class="show-row"><span><b>${name}</b><small>${sub}</small></span>`
                + `<input type="checkbox" class="show-sw" ${o[k] === 0 ? '' : 'checked'} onchange="showSet('${k}', this.checked)"></label>`).join('');
        }
        /* 📱 아이패드: 창 안을 끌 때 (스크롤할 게 없으면) 창 전체가 딸려 움직이지 않게 막기 */
        document.addEventListener('touchmove', e => {
            const t = e.target; if (!t || !t.closest) return;
            const mc = t.closest('.modal-content'); if (!mc) return;
            if (t.closest('button, input, textarea, select, label')) return;      // 버튼 · 입력칸을 살짝 흔들며 눌러도 '누름'이 취소되지 않게
            for (let n = t; n && n !== mc.parentNode; n = n.parentNode) {
                if (n.nodeType !== 1) continue;
                const cs = getComputedStyle(n);
                if (n.scrollHeight > n.clientHeight + 1 && /(auto|scroll)/.test(cs.overflowY)) return;
                if (n.scrollWidth > n.clientWidth + 1 && /(auto|scroll)/.test(cs.overflowX)) return;     // ↔ 좌우로 밀리는 칸(스티커 카테고리 등)
            }
            e.preventDefault();
        }, { passive: false });
        showApply();
        window.showApply = showApply;
        window.showSet = showSet;
