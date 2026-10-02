/* 말랑달콤 다이어리 - js/question.js
   💬 오늘의 질문 : 날마다 질문 하나에 대답하고, 오늘 일기에 글상자로 남겨요 (놀이터 → 매일 말랑 → 💬 오늘의 질문)
   - 질문은 날짜마다 정해져 있어요 (js/question-data.js · 366개) → 내년 같은 날 같은 질문이 다시 와요
   - 📖 지난 해 오늘의 나 : 1~3년 전 같은 날짜의 일기에서 그때의 대답을 찾아 보여 줘요 (열 때만 그 날짜 파일을 읽어요)
   - 대답은 따로 저장하지 않고 오늘 일기 페이지의 글상자로 저장돼요 ('💬 오늘의 질문'으로 시작하는 글상자)
     → 일기를 쓴 걸로 쳐서 🌷 화분에 물도 줄 수 있어요 · 일기에서 직접 고쳐도 돼요
   ※ 이 파일이 없어도 다이어리는 정상 동작 (오늘의 질문만 '준비 중') */

        const QA_MARK = '💬 오늘의 질문';
        const QA_MAX = 300;
        const qa = { built: false, open: false, q: '' };
        const qaq = id => document.getElementById(id);

        function qaQuestion(d) { d = d || new Date(); const m = (typeof QUESTIONS !== 'undefined' && QUESTIONS[d.getMonth()]) || []; return m[d.getDate() - 1] || '오늘 하루는 어땠나요?'; }
        function qaCardText(q, a) { return `${QA_MARK}\nQ. ${q}\nA. ${a}`; }
        function qaParse(text) {                                 // 글상자 글 → 대답
            const t = String(text || ''); if (!t.startsWith(QA_MARK)) return null;
            const i = t.indexOf('\nA. ');
            return i < 0 ? '' : t.slice(i + 4).trim();
        }
        const qaSameDay = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

        /* 오늘 페이지의 질문 글상자 (화면에 열려 있으면 화면에서, 아니면 저장소에서) */
        function qaTodayBox() {
            if (typeof isCoverOpen !== 'undefined' && isCoverOpen && qaSameDay(currentDate, new Date()))
                return [...document.querySelectorAll('#canvasArea textarea')].find(t => qaParse(t.value) !== null) || null;
            return null;
        }
        function qaTodayAnswer() {
            const box = qaTodayBox();
            if (box) return qaParse(box.value);
            try { const it = readDayData(new Date()).find(x => x.type === 'text' && qaParse(x.content) !== null); return it ? qaParse(it.content) : null; } catch (e) { return null; }
        }
        function questionDone() { return qaTodayAnswer() !== null; }

        /* ---------- 화면 ---------- */
        function qaBuild() {
            if (qa.built) return;
            qa.built = true;
            const el = document.createElement('div');
            el.id = 'questionRoom'; el.className = 'qa-room';
            el.innerHTML = `
              <div class="qa-bar"><span class="qa-sp"></span><b>💬 오늘의 질문</b><button class="qa-x" type="button" onclick="closeQuestion()" aria-label="닫기">✕</button></div>
              <div class="qa-wrap">
                <div class="qa-card">
                  <small id="qaDate"></small>
                  <div class="qa-q" id="qaQ"></div>
                </div>
                <div class="qa-write">
                  <textarea id="qaInput" maxlength="${QA_MAX}" placeholder="생각나는 대로 편하게 적어 보세요"></textarea>
                  <div class="qa-count"><span id="qaCount">0</span> / ${QA_MAX}</div>
                </div>
                <button class="qa-go" type="button" id="qaGo" onclick="qaSave()">📔 오늘 일기에 쓰기</button>
                <div class="qa-past">
                  <b>📖 지난 해 오늘의 나</b>
                  <div id="qaPast"></div>
                </div>
                <p class="qa-tip">💡 대답은 오늘 일기에 글상자로 들어가요. 일기를 쓴 걸로 쳐서 🌷 화분에 물도 줄 수 있어요.<br>질문은 날짜마다 정해져 있어서, 내년 오늘 같은 질문이 다시 찾아와요.</p>
              </div>`;
            document.body.appendChild(el);
            const inp = qaq('qaInput');
            inp.addEventListener('input', () => { qaq('qaCount').textContent = inp.value.length; });
        }

        async function qaLoadPast() {
            const box = qaq('qaPast'), now = new Date(), found = [];
            box.innerHTML = '<div class="qa-none">📖 지난 일기를 살펴보는 중…</div>';
            for (let k = 1; k <= 3; k++) {
                const d = new Date(now.getFullYear() - k, now.getMonth(), now.getDate());
                if (d.getMonth() !== now.getMonth()) continue;                       // 2월 29일이 없는 해
                try {
                    if (typeof drive !== 'undefined' && drive.ready && !drive.guest) await ensureDayLoaded(d);
                    const it = readDayData(d).find(x => x.type === 'text' && qaParse(x.content) !== null);
                    if (it) found.push({ y: d.getFullYear(), a: qaParse(it.content) });
                } catch (e) {}
            }
            if (!qa.open) return;
            const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
            box.innerHTML = found.length
                ? found.map(f => `<div class="qa-old"><small>${f.y}년의 나</small><p>${esc(f.a) || '(대답이 비어 있어요)'}</p></div>`).join('')
                : '<div class="qa-none">💌 내년 오늘, 같은 질문이 다시 찾아와요.<br>그때 오늘의 대답을 여기서 다시 만날 수 있어요.</div>';
        }

        async function qaSave() {
            const a = qaq('qaInput').value.trim();
            if (!a) { qaq('qaInput').focus(); if (typeof toast === 'function') toast('💬 대답을 한 줄이라도 적어 주세요'); return; }
            const q = qa.q;
            closeQuestion();
            goToToday(() => {
                const text = qaCardText(q, a);
                let box = qaTodayBox(), fresh = false;
                if (!box) {
                    addText();
                    const el = document.querySelector('#canvasArea .element-box:last-child');
                    box = el && el.querySelector('textarea'); fresh = true;
                    if (!box) return;
                }
                box.value = text;
                const el = box.closest('.element-box');
                if (el) {
                    const lines = text.split('\n').reduce((n, l) => n + Math.max(1, Math.ceil(l.length / 15)), 0);
                    el.style.width = '240px';
                    el.style.height = Math.min(420, 22 * lines + 24) + 'px';
                }
                if (selectedElement) { selectedElement.classList.remove('selected'); selectedElement = null; updateTextPanel(); }
                saveData(false);
                if (typeof toast === 'function') toast((fresh ? '💬 오늘의 질문을 일기에 남겼어요' : '💬 일기의 대답을 고쳤어요') + (typeof plantStickHint === 'function' ? plantStickHint() : ''));
            });
        }

        function openQuestion() {
            if (typeof closeModal === 'function') closeModal('serviceModal');
            qaBuild();
            const d = new Date(), prev = qaTodayAnswer();
            qa.q = qaQuestion(d); qa.open = true;
            qaq('qaDate').textContent = `${d.getMonth() + 1}월 ${d.getDate()}일의 질문`;
            qaq('qaQ').textContent = qa.q;
            qaq('qaInput').value = prev || '';
            qaq('qaCount').textContent = (prev || '').length;
            qaq('qaGo').textContent = prev !== null ? '📔 일기의 대답 고치기' : '📔 오늘 일기에 쓰기';
            qaq('questionRoom').classList.add('show');
            document.body.classList.add('fc-lock');
            qaq('questionRoom').scrollTop = 0;
            qaLoadPast();
        }
        function closeQuestion() {
            qa.open = false;
            const r = qaq('questionRoom'); if (r) r.classList.remove('show');
            document.body.classList.remove('fc-lock');
        }
        window.openQuestion = openQuestion;
        window.questionDone = questionDone;
