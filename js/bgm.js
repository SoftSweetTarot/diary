/* 말랑달콤 다이어리 - js/bgm.js
   🎵 배경음악 : 다이어리를 꾸미면서 들을 수 있는 음악 플레이어 (툴바 🎵 배경음악)
   - 녹음 파일 없이 브라우저가 그 자리에서 소리를 만들어요 (Web Audio) → 불러오는 시간 0초 · 트래픽 0
   - 음색 3가지 : 🎐 오르골 · 🎹 피아노 · 👾 8비트(옛날 게임기)
   - 창을 닫아도 계속 흘러나오고, 오른쪽 아래 작은 막대(미니 플레이어)로 멈추기·다시 열기
   - 곡은 모두 저작권이 끝난 곡(작곡가 사후 70년 이상 · 전래 민요)만 넣었어요.
     ※ 마리오·포켓몬 같은 게임 음악, 요즘 피아노곡, 대부분의 한국 창작 동요는 저작권이 있어서 넣을 수 없어요.
   - 음량 · 음색 · 반복 방식은 이 기기에만 기억 (드라이브에 저장하지 않음 → 트래픽 없음)
   - 곡 추가 : 아래 BGM_SONGS 에 한 줄 추가. 음 이름은 'C4'(가운데 도) · 'F#5' · 'Bb3' 처럼, '+' 로 화음, '-' 는 쉼표
       길이는 unit 분음표 몇 개 (unit 8 이면 1 = 8분음표). tracks 로 멜로디 · 반주를 따로 적을 수도 있어요.
   ※ 이 파일이 없어도 다이어리는 정상 동작 (배경음악 버튼만 반응 없음) */

        const BGM_CATS = [
            { id: 'game', name: '🎮 게임 속 그 음악' },
            { id: 'classic', name: '🎻 클래식' },
            { id: 'piano', name: '🎹 피아노' },
            { id: 'kids', name: '🧸 동요 · 따뜻한 노래' }
        ];

        /* 작은 별 변주곡 재료 : 주제 멜로디 · 반주 */
        const BGM_TW = [['C5',2],['C5',2],['G5',2],['G5',2],['A5',2],['A5',2],['G5',4],['F5',2],['F5',2],['E5',2],['E5',2],['D5',2],['D5',2],['C5',4]];
        const BGM_TWB = [['C4',2],['C5+E4',2],['E4+C5',2],['C4+E4',2],['F4',2],['C4+F4',2],['C4+E4',4],['B3+D4',2],['G3+B3',2],['C4',2],['A3+C4',2],['F3+A3',2],['G3+B3',2],['C3+C4',4]];
        /* 변주 : 한 음을 '그 음 · 위 음 · 그 음 · 아래 음' 으로 잘게 쪼개기 (다장조 음계 기준) */
        function bgmVary(list) {
            const sc = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
            const step = (n, d) => { const i = sc.indexOf(n[0]) + d, o = +n.slice(-1) + Math.floor(i / 7); return sc[(i + 7) % 7] + o; };
            const r = [];
            list.forEach(([n, len]) => {
                r.push([n, 0.5], [step(n, 1), 0.5], [n, 0.5], [step(n, -1), 0.5]);
                if (len > 2) r.push([n, len - 2]);
            });
            return r;
        }

        /* 같은 음 묶음을 여러 번 (월광 소나타의 셋잇단음표용) */
        const bgmRep = (notes, n) => { const r = []; for (let i = 0; i < n; i++) notes.forEach(x => r.push([x, 1])); return r; };
        /* 프레르 자크 : 돌림노래 재료 */
        const BGM_FJ = [['C5',2],['D5',2],['E5',2],['C5',2],['C5',2],['D5',2],['E5',2],['C5',2],['E5',2],['F5',2],['G5',4],['E5',2],['F5',2],['G5',4],
            ['G5',1],['A5',1],['G5',1],['F5',1],['E5',2],['C5',2],['G5',1],['A5',1],['G5',1],['F5',1],['E5',2],['C5',2],['C5',2],['G4',2],['C5',4],['C5',2],['G4',2],['C5',4]];
        const BGM_ROW = [['C5',3],['C5',3],['C5',2],['D5',1],['E5',3],['E5',2],['D5',1],['E5',2],['F5',1],['G5',6],
            ['C6',1],['C6',1],['C6',1],['G5',1],['G5',1],['G5',1],['E5',1],['E5',1],['E5',1],['C5',1],['C5',1],['C5',1],['G5',2],['F5',1],['E5',2],['D5',1],['C5',6]];

        const BGM_SONGS = [
            /* ---------- 🎮 게임 속 그 음악 (게임에 쓰여 유명해진 옛 곡) ---------- */
            { id: 'tetris', cat: 'game', title: '테트리스 (코로베이니키)', by: '러시아 민요', bpm: 144, unit: 8, voice: 'chip',
              tracks: [[
                ['E5',2],['B4',1],['C5',1],['D5',2],['C5',1],['B4',1], ['A4',2],['A4',1],['C5',1],['E5',2],['D5',1],['C5',1],
                ['B4',3],['C5',1],['D5',2],['E5',2], ['C5',2],['A4',2],['A4',4],
                ['D5',3],['F5',1],['A5',2],['G5',1],['F5',1], ['E5',3],['C5',1],['E5',2],['D5',1],['C5',1],
                ['B4',2],['B4',1],['C5',1],['D5',2],['E5',2], ['C5',2],['A4',2],['A4',4]
              ], [
                ['E3',2],['E2',2],['E3',2],['E2',2], ['A2',2],['A3',2],['A2',2],['A3',2], ['G#2',2],['G#3',2],['G#2',2],['G#3',2], ['A2',2],['A3',2],['A2',2],['A3',2],
                ['D3',2],['D2',2],['D3',2],['D2',2], ['C3',2],['C2',2],['C3',2],['C2',2], ['G#2',2],['G#3',2],['E2',2],['E3',2], ['A2',2],['A3',2],['A2',4]
              ]] },
            { id: 'mountain', cat: 'game', title: '산왕의 궁전에서', by: '그리그 · 1875', bpm: 126, unit: 8, accel: true,
              tracks: [[
                ['B3',1],['C#4',1],['D4',1],['E4',1],['F#4',1],['D4',1],['F#4',2], ['E#4',1],['C#4',1],['E#4',2],['E4',1],['C4',1],['E4',2],
                ['B3',1],['C#4',1],['D4',1],['E4',1],['F#4',1],['D4',1],['F#4',1],['B4',1], ['A4',1],['F#4',1],['D4',1],['F#4',1],['A4',4]
              ], [
                ['B2',2],['F#2',2],['B2',2],['F#2',2], ['C#3',2],['G#2',2],['C3',2],['G2',2], ['B2',2],['F#2',2],['B2',2],['F#2',2], ['D3',2],['A2',2],['D3',4]
              ]] },
            { id: 'cancan', cat: 'game', title: '캉캉 (천국과 지옥)', by: '오펜바흐 · 1858', bpm: 152, unit: 8,
              tracks: [[
                ['C5',4],['D5',1],['F5',1],['E5',1],['D5',1], ['G5',2],['G5',2],['G5',1],['A5',1],['E5',1],['F5',1],
                ['D5',2],['D5',2],['D5',1],['F5',1],['E5',1],['D5',1], ['C5',1],['C6',1],['B5',1],['A5',1],['G5',1],['F5',1],['E5',1],['D5',1],
                ['C5',4],['D5',1],['F5',1],['E5',1],['D5',1], ['G5',2],['G5',2],['G5',1],['A5',1],['E5',1],['F5',1],
                ['D5',2],['D5',2],['D5',1],['F5',1],['E5',1],['D5',1], ['C5',1],['G5',1],['D5',1],['E5',1],['C5',4]
              ], [
                ['C3',2],['G3',2],['C3',2],['G3',2], ['G2',2],['G3',2],['G2',2],['G3',2], ['G2',2],['G3',2],['G2',2],['G3',2], ['C3',2],['G3',2],['C3',2],['G3',2],
                ['C3',2],['G3',2],['C3',2],['G3',2], ['G2',2],['G3',2],['G2',2],['G3',2], ['G2',2],['G3',2],['G2',2],['G3',2], ['C3',2],['G2',2],['C3',4]
              ]] },
            { id: 'toccata', cat: 'game', title: '유령의 성 (토카타와 푸가)', by: '바흐 · 1700년대', bpm: 52, unit: 16, voice: 'piano',
              tracks: [[
                ['A5',1],['G5',1],['A5',6],['G5',1],['F5',1],['E5',1],['D5',1],['C#5',4],['D5+D4',10],['-',4],
                ['A4',1],['G4',1],['A4',6],['E4',2],['F4',2],['C#4',2],['D4+D3',10],['-',4],
                ['A3',1],['G3',1],['A3',6],['G3',1],['F3',1],['E3',1],['D3',1],['C#3',4],['D3+D2',12],['-',8]
              ]] },

            { id: 'bee', cat: 'game', title: '왕벌의 비행', by: '림스키코르사코프 · 1900', bpm: 112, unit: 16, voice: 'chip',
              tracks: [[
                ['E6',1],['D#6',1],['D6',1],['C#6',1],['D6',1],['C#6',1],['C6',1],['B5',1], ['C6',1],['B5',1],['A#5',1],['A5',1],['G#5',1],['G5',1],['F#5',1],['F5',1],
                ['E5',1],['D#5',1],['D5',1],['C#5',1],['C5',1],['C#5',1],['D5',1],['D#5',1], ['E5',1],['D#5',1],['D5',1],['C#5',1],['C5',1],['C#5',1],['D5',1],['D#5',1],
                ['E5',1],['D#5',1],['D5',1],['C#5',1],['D5',1],['C#5',1],['C5',1],['B4',1], ['C5',1],['B4',1],['A#4',1],['A4',1],['A#4',1],['B4',1],['C5',1],['C#5',1],
                ['D5',1],['C#5',1],['C5',1],['B4',1],['C5',1],['C#5',1],['D5',1],['D#5',1], ['E5',4],['E4',4]
              ], [
                ['A2',8],['A2',8],['A2',8],['A2',8],['A2',8],['A2',8],['A2',8],['E2+E3',8]
              ]] },

            /* ---------- 🎻 클래식 ---------- */
            { id: 'elise', cat: 'classic', title: '엘리제를 위하여', by: '베토벤 · 1810', bpm: 72, unit: 16,
              tracks: [[
                ['E5',1],['D#5',1],['E5',1],['D#5',1],['E5',1],['B4',1],['D5',1],['C5',1],
                ['A4+A2',1],['E3',1],['A3',1],['C4',1],['E4',1],['A4',1], ['B4+E2',1],['E3',1],['G#3',1],['E4',1],['G#4',1],['B4',1],
                ['C5+A2',1],['E3',1],['A3',1],['E4',1],['E5',1],['D#5',1],
                ['E5',1],['D#5',1],['E5',1],['B4',1],['D5',1],['C5',1],
                ['A4+A2',1],['E3',1],['A3',1],['C4',1],['E4',1],['A4',1], ['B4+E2',1],['E3',1],['G#3',1],['E4',1],['C5',1],['B4',1],
                ['A4+A2',2],['E3',1],['A3',3]
              ]] },
            { id: 'joy', cat: 'classic', title: '환희의 송가', by: '베토벤 교향곡 9번 · 1824', bpm: 108, unit: 4,
              tracks: [[
                ['E4+C3',1],['E4',1],['F4',1],['G4+G2',1],['G4+E3',1],['F4',1],['E4',1],['D4+G2',1],
                ['C4+C3',1],['C4',1],['D4',1],['E4+C3',1],['E4+G2',1.5],['D4',0.5],['D4+G2',2],
                ['E4+C3',1],['E4',1],['F4',1],['G4+G2',1],['G4+E3',1],['F4',1],['E4',1],['D4+G2',1],
                ['C4+C3',1],['C4',1],['D4',1],['E4+C3',1],['D4+G2',1.5],['C4',0.5],['C4+C3',2]
              ]] },
            { id: 'nacht', cat: 'classic', title: '아이네 클라이네 나흐트무지크', by: '모차르트 · 1787', bpm: 132, unit: 8,
              tracks: [[
                ['G4+G3',2],['-',1],['D4',1],['G4+G3',2],['-',1],['D4',1], ['G4',1],['D4',1],['G4',1],['B4',1],['D5+B3',4],
                ['C5+A3',2],['-',1],['A4',1],['C5+A3',2],['-',1],['A4',1], ['C5',1],['A4',1],['F#4',1],['A4',1],['D4+D3',4]
              ]] },
            { id: 'fate', cat: 'classic', title: '운명 교향곡', by: '베토벤 교향곡 5번 · 1808', bpm: 108, unit: 8, voice: 'piano',
              tracks: [[
                ['-',1],['G4+G3',1],['G4+G3',1],['G4+G3',1],['Eb4+Eb3',8],['-',1],['F4+F3',1],['F4+F3',1],['F4+F3',1],['D4+D3',8],
                ['-',1],['G4',1],['G4',1],['G4',1],['Eb4',1],['Ab4',1],['Ab4',1],['Ab4',1],['G4',1],['Eb5',1],['Eb5',1],['Eb5',1],['C5+C3',8],['-',4]
              ]] },
            { id: 'lullaby', cat: 'classic', title: '브람스 자장가', by: '브람스 · 1868', bpm: 84, unit: 8,
              tracks: [[
                ['E4',1],['E4',1],['G4',4],['E4',1],['E4',1],['G4',4],['E4',1],['G4',1],['C5',2],['B4',3],['A4',1],['A4',2],['G4',2],
                ['D4',1],['E4',1],['F4',2],['D4',2],['D4',1],['E4',1],['F4',4],['D4',1],['F4',1],['B4',1],['A4',1],['G4',2],['B4',2],['C5',6]
              ], [
                ['-',2],['C3+G3',6],['C3+G3',6],['G2+F3',6],['C3+E3',6],['G2+F3',6],['G2+F3',6],['G2+F3',6],['C3+E3',6]
              ]] },
            { id: 'newworld', cat: 'classic', title: '신세계 교향곡 2악장 (꿈속의 고향)', by: '드보르자크 · 1893', bpm: 52, unit: 8,
              tracks: [[
                ['E4',3],['G4',1],['G4',4],['E4',3],['D4',1],['C4',4],['D4',2],['E4',2],['G4',2],['E4',2],['D4',8],
                ['E4',3],['G4',1],['G4',4],['E4',3],['D4',1],['C4',4],['D4',2],['E4',2],['D4',2],['C4',2],['C4',8]
              ], [
                ['C3+G3',8],['F2+C3',8],['G2+D3',8],['G2+B2',8],['C3+G3',8],['F2+C3',8],['G2+D3',8],['C3+G3',8]
              ]] },
            { id: 'morning', cat: 'classic', title: '아침 기분 (페르귄트)', by: '그리그 · 1875', bpm: 76, unit: 8,
              tracks: [[
                ['G5',1],['E5',1],['D5',1],['C5',1],['D5',1],['E5',1], ['G5',1],['E5',1],['D5',1],['C5',1],['D5',0.5],['E5',0.5],['D5',0.5],['E5',0.5],
                ['G5',1],['E5',1],['G5',1],['A5',1],['E5',1],['A5',1], ['G5',1],['E5',1],['D5',1],['C5',3]
              ], [
                ['C3+G3',6],['C3+G3',6],['A2+E3',6],['F2+C3',3],['C3',3]
              ]] },
            { id: 'wedding', cat: 'classic', title: '결혼 행진곡 (로엔그린)', by: '바그너 · 1850', bpm: 76, unit: 8,
              tracks: [[
                ['G4',2],['C5',3],['C5',1],['C5',4],['G4',2],['D5',3],['B4',1],['C5',4],
                ['G4',2],['C5',3],['F5',1],['F5',2],['E5',3],['D5',1],['C5',3],['B4',1],['C5',6]
              ], [
                ['-',2],['C3+E3',8],['G2+F3',6],['C3+E3',4],['C3+E3',2],['F2+A2',6],['C3+G3',4],['G2+F3',4],['C3+E3',6]
              ]] },

            { id: 'swan', cat: 'classic', title: '백조의 호수', by: '차이콥스키 · 1876', bpm: 66, unit: 8,
              tracks: [[
                ['F#5+B3+D4',6],['B4',1],['C#5',1],['D5',1],['E5',1],['F#5+B3+D4',3],['D5',1],['F#5+G3+B3',3],['D5',1],['F#5+B3+D4',3],['B4',1],
                ['D5+G3',1],['B4',1],['G4',1],['D5',1],['B4+E3+B3',4],['C#5+F#3+A#3',4],['B4+B2+F#3',8]
              ]] },
            { id: 'spring', cat: 'classic', title: '사계 중 봄', by: '비발디 · 1725', bpm: 100, unit: 8,
              tracks: [[
                ['E5',2],['G#5+E4+B3',2],['G#5',2],['G#5',2],['F#5',1],['E5',1],['B5+E4+G#4',6],['B5',1],['A5',1],
                ['G#5+E4+B3',2],['G#5',2],['G#5',2],['F#5',1],['E5',1],['B5+E4+G#4',6],['B5',1],['A5',1],
                ['G#5+E4+B3',2],['A5',1],['B5',1],['A5+F#4+D#4',2],['G#5',2],['F#5+B3+D#4',6],['-',2]
              ]] },
            { id: 'moonlight', cat: 'classic', title: '월광 소나타', by: '베토벤 · 1801', bpm: 52, unit: 12, voice: 'piano',
              tracks: [
                bgmRep(['G#3','C#4','E4'], 4).concat(bgmRep(['G#3','C#4','E4'], 4), bgmRep(['A3','C#4','E4'], 2), bgmRep(['A3','D4','F#4'], 2),
                    [['G#3',1],['C4',1],['F#4',1],['G#3',1],['C#4',1],['E4',1],['G#3',1],['C#4',1],['D#4',1],['F#3',1],['C4',1],['D#4',1]], bgmRep(['E3','G#3','C#4'], 4)),
                [['C#2+C#3',12],['B1+B2',12],['A1+A2',6],['F#1+F#2',6],['G#1+G#2',12],['C#2+C#3',12]]
              ] },

            /* ---------- 🎹 피아노 ---------- */
            { id: 'gymno', cat: 'piano', title: '짐노페디 1번', by: '사티 · 1888', bpm: 76, unit: 4, voice: 'piano',
              tracks: [[
                ['-',12],
                ['-',1],['F#5',1],['A5',1],['G5',1],['F#5',1],['C#5',1],['B4',1],['C#5',1],['D5',1],['A4',9],
                ['-',1],['F#5',1],['A5',1],['G5',1],['F#5',1],['C#5',1],['B4',1],['C#5',1],['D5',1],['A4',9]
              ], [
                ['G2',1],['B3+D4+F#4',2],['D2',1],['A3+C#4+F#4',2], ['G2',1],['B3+D4+F#4',2],['D2',1],['A3+C#4+F#4',2],
                ['G2',1],['B3+D4+F#4',2],['D2',1],['A3+C#4+F#4',2], ['G2',1],['B3+D4+F#4',2],['D2',1],['A3+C#4+F#4',2],
                ['G2',1],['B3+D4+F#4',2],['D2',1],['A3+C#4+F#4',2], ['G2',1],['B3+D4+F#4',2],['D2',1],['A3+C#4+F#4',2],
                ['G2',1],['B3+D4+F#4',2],['D2',1],['A3+C#4+F#4',2], ['G2',1],['B3+D4+F#4',2],['D2',1],['A3+C#4+F#4',2]
              ]] },
            { id: 'entertainer', cat: 'piano', title: '엔터테이너', by: '스콧 조플린 · 1902', bpm: 88, unit: 16, voice: 'piano',
              tracks: [[
                ['D4',1],['D#4',1],
                ['E4',1],['C5',2],['E4',1],['C5',2],['E4',1],['C5',1], ['C5',5],['C5',1],['D5',1],['D#5',1],
                ['E5',1],['C5',1],['D5',1],['E5',2],['B4',1],['D5',2], ['C5',6],['D4',1],['D#4',1],
                ['E4',1],['C5',2],['E4',1],['C5',2],['E4',1],['C5',1], ['C5',6],['A4',1],['G4',1],
                ['F#4',1],['A4',1],['C5',1],['E5',2],['D5',1],['C5',1],['A4',1], ['D5',6],['-',2]
              ], [
                ['-',2],
                ['C3',2],['E3+G3+C4',2],['G2',2],['E3+G3+C4',2], ['C3',2],['E3+G3+C4',2],['G2',2],['E3+G3+C4',2],
                ['G2',2],['F3+G3+B3',2],['D3',2],['F3+G3+B3',2], ['C3',2],['E3+G3+C4',2],['G2',2],['E3+G3+C4',2],
                ['C3',2],['E3+G3+C4',2],['G2',2],['E3+G3+C4',2], ['C3',2],['E3+G3+C4',2],['G2',2],['E3+G3+C4',2],
                ['D3',2],['F#3+A3+C4',2],['A2',2],['F#3+A3+C4',2], ['G2',2],['B2+D3+G3',2],['D3',2],['B2+D3+G3',2]
              ]] },
            { id: 'turkish', cat: 'piano', title: '터키 행진곡', by: '모차르트 · 1783', bpm: 116, unit: 16, voice: 'piano',
              tracks: [[
                ['B4',1],['A4',1],['G#4',1],['A4',1],['C5',4], ['D5',1],['C5',1],['B4',1],['C5',1],['E5',4],
                ['F5',1],['E5',1],['D#5',1],['E5',1],['B5',1],['A5',1],['G#5',1],['A5',1],['B5',1],['A5',1],['G#5',1],['A5',1],['C6',4],
                ['A5',2],['C6',2],['B5',2],['A5',2],['G5',2],['A5',2],['B5',2],['A5',2],['G5',2],['A5',2],['B5',2],['A5',2],['G5',2],['F#5',2],['E5',4]
              ], [
                ['-',4],['A3+C4+E4',2],['A3+C4+E4',2], ['-',4],['A3+C4+E4',2],['A3+C4+E4',2],
                ['A2',4],['A3+C4+E4',2],['A3+C4+E4',2], ['A2',4],['A3+C4+E4',2],['A3+C4+E4',2],
                ['C3',4],['C4+E4+G4',2],['C4+E4+G4',2], ['G2',4],['B3+D4+G4',2],['B3+D4+G4',2],
                ['C3',4],['C4+E4+G4',2],['C4+E4+G4',2], ['E2',4],['E3+B3',4]
              ]] },
            { id: 'minuet', cat: 'piano', title: '미뉴에트 G장조', by: '바흐 노트 · 1725', bpm: 120, unit: 8, voice: 'piano',
              tracks: [[
                ['D5',2],['G4',1],['A4',1],['B4',1],['C5',1], ['D5',2],['G4',2],['G4',2], ['E5',2],['C5',1],['D5',1],['E5',1],['F#5',1], ['G5',2],['G4',2],['G4',2],
                ['C5',2],['D5',1],['C5',1],['B4',1],['A4',1], ['B4',2],['C5',1],['B4',1],['A4',1],['G4',1], ['F#4',2],['G4',1],['A4',1],['B4',1],['G4',1], ['A4',6],
                ['D5',2],['G4',1],['A4',1],['B4',1],['C5',1], ['D5',2],['G4',2],['G4',2], ['E5',2],['C5',1],['D5',1],['E5',1],['F#5',1], ['G5',2],['G4',2],['G4',2],
                ['C5',2],['D5',1],['C5',1],['B4',1],['A4',1], ['B4',2],['C5',1],['B4',1],['A4',1],['G4',1], ['A4',2],['B4',1],['A4',1],['G4',1],['F#4',1], ['G4',6]
              ], [
                ['G3+B3',4],['A3',2],['B3',6],['C4',6],['B3',6],['A3',6],['G3',6],['D3',6],['D3+F#3',6],
                ['G3+B3',4],['A3',2],['B3',6],['C4',6],['B3',6],['A3',6],['G3',6],['D3',6],['G2',6]
              ]] },
            { id: 'canon', cat: 'piano', title: '캐논', by: '파헬벨 · 1680년경', bpm: 66, unit: 4, voice: 'piano',
              tracks: [[
                ['F#5',2],['E5',2],['D5',2],['C#5',2],['B4',2],['A4',2],['B4',2],['C#5',2],
                ['D5',2],['C#5',2],['B4',2],['A4',2],['G4',2],['F#4',2],['G4',2],['E4',2],
                ['D4',0.5],['F#4',0.5],['A4',0.5],['G4',0.5],['F#4',0.5],['D4',0.5],['F#4',0.5],['E4',0.5],
                ['D4',0.5],['B3',0.5],['D4',0.5],['A4',0.5],['G4',0.5],['B4',0.5],['A4',0.5],['G4',0.5],
                ['F#4',0.5],['D4',0.5],['E4',0.5],['C#5',0.5],['D5',0.5],['F#5',0.5],['A5',0.5],['A4',0.5],
                ['B4',0.5],['G4',0.5],['A4',0.5],['F#4',0.5],['D4',0.5],['D5',0.5],['D5',1]
              ], [
                ['D3',2],['A2',2],['B2',2],['F#2',2],['G2',2],['D2',2],['G2',2],['A2',2],
                ['D3',2],['A2',2],['B2',2],['F#2',2],['G2',2],['D2',2],['G2',2],['A2',2],
                ['D3',2],['A2',2],['B2',2],['F#2',2],['G2',2],['D2',2],['G2',2],['A2',2]
              ]] },
            { id: 'twinklevar', cat: 'piano', title: '작은 별 변주곡', by: '모차르트 · 1781', bpm: 92, unit: 8, voice: 'piano',
              tracks: [BGM_TW.concat(bgmVary(BGM_TW)), BGM_TWB.concat(BGM_TWB)] },

            /* ---------- 🧸 동요 · 따뜻한 노래 ---------- */
            { id: 'star', cat: 'kids', title: '반짝반짝 작은 별', by: '프랑스 민요', bpm: 100, unit: 8,
              tracks: [[
                ['C5',2],['C5',2],['G5',2],['G5',2],['A5',2],['A5',2],['G5',4],['F5',2],['F5',2],['E5',2],['E5',2],['D5',2],['D5',2],['C5',4],
                ['G5',2],['G5',2],['F5',2],['F5',2],['E5',2],['E5',2],['D5',4],['G5',2],['G5',2],['F5',2],['F5',2],['E5',2],['E5',2],['D5',4],
                ['C5',2],['C5',2],['G5',2],['G5',2],['A5',2],['A5',2],['G5',4],['F5',2],['F5',2],['E5',2],['E5',2],['D5',2],['D5',2],['C5',4]
              ], [
                ['C4',4],['C4',4],['F4',4],['C4',4],['F3',4],['C4',4],['G3',4],['C4',4],
                ['C4',4],['F3',4],['C4',4],['G3',4],['C4',4],['F3',4],['C4',4],['G3',4],
                ['C4',4],['C4',4],['F4',4],['C4',4],['F3',4],['C4',4],['G3',4],['C4',4]
              ]] },
            { id: 'butterfly', cat: 'kids', title: '나비야', by: '독일 민요', bpm: 108, unit: 8,
              tracks: [[
                ['G4',2],['E4',2],['E4',4],['F4',2],['D4',2],['D4',4],['C4',2],['D4',2],['E4',2],['F4',2],['G4',2],['G4',2],['G4',4],
                ['G4',2],['E4',2],['E4',4],['F4',2],['D4',2],['D4',4],['C4',2],['E4',2],['G4',2],['G4',2],['E4',2],['E4',2],['E4',4],
                ['D4',2],['D4',2],['D4',2],['D4',2],['D4',2],['E4',2],['F4',4],['E4',2],['E4',2],['E4',2],['E4',2],['E4',2],['F4',2],['G4',4],
                ['G4',2],['E4',2],['E4',4],['F4',2],['D4',2],['D4',4],['C4',2],['E4',2],['G4',2],['G4',2],['C4',8]
              ], [
                ['C3',8],['G2',8],['C3',8],['C3+G3',8],['C3',8],['G2',8],['C3',8],['C3',8],['G2',8],['G2',8],['C3',8],['C3',8],['C3',8],['G2',8],['C3',8],['C3',8]
              ]] },
            { id: 'plane', cat: 'kids', title: '떴다 떴다 비행기', by: '미국 민요', bpm: 112, unit: 8,
              tracks: [[
                ['E4',2],['D4',2],['C4',2],['D4',2],['E4',2],['E4',2],['E4',4],['D4',2],['D4',2],['D4',4],['E4',2],['G4',2],['G4',4],
                ['E4',2],['D4',2],['C4',2],['D4',2],['E4',2],['E4',2],['E4',4],['D4',2],['D4',2],['E4',2],['D4',2],['C4',8]
              ], [
                ['C3',8],['C3',8],['G2',8],['C3',8],['C3',8],['C3',8],['G2',8],['C3',8]
              ]] },
            { id: 'cuckoo', cat: 'kids', title: '뻐꾸기', by: '독일 민요', bpm: 112, unit: 4,
              tracks: [[
                ['G4',1],['E4',2],['G4',1],['E4',2],['D4',1],['C4',1],['D4',1],['C4',3],
                ['D4',1],['D4',1],['E4',1],['F4',2],['D4',1],['E4',1],['E4',1],['F4',1],['G4',2],['E4',1],
                ['G4',1],['E4',2],['G4',1],['E4',2],['F4',1],['E4',1],['D4',1],['C4',3]
              ], [
                ['C3',3],['C3',3],['G2',3],['C3',3],['G2',3],['G2',3],['C3',3],['C3',3],['C3',3],['C3',3],['G2',3],['C3',3]
              ]] },
            { id: 'london', cat: 'kids', title: '런던 다리', by: '영국 전래동요', bpm: 108, unit: 8,
              tracks: [[
                ['G4',3],['A4',1],['G4',2],['F4',2],['E4',2],['F4',2],['G4',4],['D4',2],['E4',2],['F4',4],['E4',2],['F4',2],['G4',4],
                ['G4',3],['A4',1],['G4',2],['F4',2],['E4',2],['F4',2],['G4',4],['D4',4],['G4',4],['E4',2],['C4',6]
              ], [
                ['C3',8],['C3',8],['G2',8],['C3',8],['C3',8],['C3',8],['G2',8],['C3',8]
              ]] },
            { id: 'farm', cat: 'kids', title: '올드 맥도널드', by: '미국 민요', bpm: 120, unit: 8,
              tracks: [[
                ['G4',2],['G4',2],['G4',2],['D4',2],['E4',2],['E4',2],['D4',4],['B4',2],['B4',2],['A4',2],['A4',2],['G4',6],['D4',2],
                ['G4',2],['G4',2],['G4',2],['D4',2],['E4',2],['E4',2],['D4',4],['B4',2],['B4',2],['A4',2],['A4',2],['G4',8]
              ], [
                ['G2',8],['C3',4],['G2',4],['G2',4],['D3',4],['G2',8],['G2',8],['C3',4],['G2',4],['G2',4],['D3',4],['G2',8]
              ]] },
            { id: 'jacques', cat: 'kids', title: '프레르 자크 (돌림노래)', by: '프랑스 민요', bpm: 108, unit: 8,
              tracks: [BGM_FJ.concat(BGM_FJ, [['-',16]]), [['-',16]].concat(BGM_FJ, BGM_FJ)] },
            { id: 'rowboat', cat: 'kids', title: '노 젓는 노래 (돌림노래)', by: '미국 전래동요', bpm: 132, unit: 8,
              tracks: [BGM_ROW.concat([['-',12]]), [['-',12]].concat(BGM_ROW)] },
            { id: 'susanna', cat: 'kids', title: '오! 수재너', by: '포스터 · 1848', bpm: 120, unit: 8,
              tracks: [[
                ['C5',1],['D5',1],
                ['E5',2],['G5',2],['G5',3],['A5',1],['G5',2],['E5',2],['C5',3],['D5',1],['E5',2],['E5',2],['D5',2],['C5',2],['D5',6],['C5',1],['D5',1],
                ['E5',2],['G5',2],['G5',3],['A5',1],['G5',2],['E5',2],['C5',3],['D5',1],['E5',2],['E5',2],['D5',2],['D5',2],['C5',8]
              ], [
                ['-',2],['C3',8],['C3',8],['C3',8],['G2',8],['C3',8],['C3',8],['G2',8],['C3',8]
              ]] },
            { id: 'clementine', cat: 'kids', title: '클레멘타인 (넓고 넓은 바닷가에)', by: '미국 민요 · 1884', bpm: 96, unit: 8,
              tracks: [[
                ['F4',1.5],['F4',0.5],
                ['F4',2],['C4',2],['A4',1.5],['A4',0.5], ['A4',2],['F4',2],['F4',1.5],['A4',0.5], ['C5',2],['C5',2],['Bb4',1],['A4',1], ['G4',4],['G4',1.5],['A4',0.5],
                ['Bb4',2],['Bb4',2],['A4',1.5],['G4',0.5], ['A4',2],['F4',2],['F4',1.5],['A4',0.5], ['G4',2],['C4',2],['E4',1.5],['G4',0.5], ['F4',6]
              ], [
                ['-',2],['F3',6],['F3',6],['F3',6],['C3',6],['C3',6],['F3',6],['C3',6],['F3',6]
              ]] },
            { id: 'birthday', cat: 'kids', title: '생일 축하합니다', by: '힐 자매 · 1893', bpm: 100, unit: 8,
              tracks: [[
                ['G4',1.5],['G4',0.5],['A4',2],['G4',2],['C5',2],['B4',4],['G4',1.5],['G4',0.5],['A4',2],['G4',2],['D5',2],['C5',4],
                ['G4',1.5],['G4',0.5],['G5',2],['E5',2],['C5',2],['B4',2],['A4',2],['F5',1.5],['F5',0.5],['E5',2],['C5',2],['D5',2],['C5',6]
              ], [
                ['-',2],['C3',6],['G2',6],['G2',6],['C3',6],['C3',6],['F2',6],['C3',2],['G2',4],['C3',6]
              ]] },
            { id: 'jingle', cat: 'kids', title: '징글벨', by: '피어폰트 · 1857', bpm: 120, unit: 8,
              tracks: [[
                ['E5',2],['E5',2],['E5',4],['E5',2],['E5',2],['E5',4],['E5',2],['G5',2],['C5',3],['D5',1],['E5',8],
                ['F5',2],['F5',2],['F5',3],['F5',1],['F5',2],['E5',2],['E5',2],['E5',1],['E5',1],['E5',2],['D5',2],['D5',2],['E5',2],['D5',4],['G5',4],
                ['E5',2],['E5',2],['E5',4],['E5',2],['E5',2],['E5',4],['E5',2],['G5',2],['C5',3],['D5',1],['E5',8],
                ['F5',2],['F5',2],['F5',3],['F5',1],['F5',2],['E5',2],['E5',2],['E5',1],['E5',1],['G5',2],['G5',2],['F5',2],['D5',2],['C5',8]
              ], [
                ['C3',8],['C3',8],['C3',8],['C3',8],['F2',8],['C3',8],['G2',8],['G2',8],
                ['C3',8],['C3',8],['C3',8],['C3',8],['F2',8],['C3',8],['G2',8],['C3',8]
              ]] },
            { id: 'silent', cat: 'kids', title: '고요한 밤 거룩한 밤', by: '그루버 · 1818', bpm: 84, unit: 8,
              tracks: [[
                ['G4',3],['A4',1],['G4',2],['E4',6],['G4',3],['A4',1],['G4',2],['E4',6],['D5',4],['D5',2],['B4',6],['C5',4],['C5',2],['G4',6],
                ['A4',4],['A4',2],['C5',3],['B4',1],['A4',2],['G4',3],['A4',1],['G4',2],['E4',6],['A4',4],['A4',2],['C5',3],['B4',1],['A4',2],['G4',3],['A4',1],['G4',2],['E4',6],
                ['D5',4],['D5',2],['F5',3],['D5',1],['B4',2],['C5',6],['E5',6],['C5',2],['G4',2],['E4',2],['G4',3],['F4',1],['D4',2],['C4',12]
              ], [
                ['C3+G3',12],['C3+G3',12],['G2+F3',12],['C3+E3',12],['F2+C3',12],['C3+G3',12],['F2+C3',12],['C3+G3',12],['G2+F3',12],['C3+E3',12],['G2+F3',6],['G2+B2',6],['C3+E3',12]
              ]] },
            { id: 'joyworld', cat: 'kids', title: '기쁘다 구주 오셨네', by: '헨델 편곡 · 1839', bpm: 96, unit: 8,
              tracks: [[
                ['C5',2],['B4',1.5],['A4',0.5],['G4',3],['F4',1],['E4',2],['D4',2],['C4',3],['G4',1],['A4',3],['A4',1],['B4',3],['B4',1],['C5',6]
              ], [
                ['C3+E3',4],['C3+G3',4],['G2+B2',4],['C3',4],['F2+C3',4],['G2+D3',4],['C3+E3',6]
              ]] }
        ];

        /* ---------- 음 이름 → 주파수 ---------- */
        const BGM_NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
        function bgmMidi(n) { const m = /^([A-G](?:#|b)?)(\d)$/.exec(n); return m ? 12 * (+m[2] + 1) + BGM_NOTE[m[1]] : null; }
        const bgmFreq = m => 440 * Math.pow(2, (m - 69) / 12);

        /* ---------- 상태 ---------- */
        const BGM_PREF_KEY = 'malang_bgm_pref';
        const bgm = {
            ac: null, out: null, song: null, playing: false, cat: 'game',
            queue: [], timer: null, loopCount: 0, startAt: 0,
            pref: { vol: 0.5, voice: 'auto', mode: 'all', shuffle: false }      // mode : all(목록 반복) · one(한 곡 반복)
        };
        try { Object.assign(bgm.pref, JSON.parse(localStorage.getItem(BGM_PREF_KEY)) || {}); } catch (e) {}
        function bgmSavePref() { try { localStorage.setItem(BGM_PREF_KEY, JSON.stringify(bgm.pref)); } catch (e) {} }

        /* ---------- 소리 장치 (아이폰·아이패드 무음 모드에서도 들리게) ---------- */
        function bgmAudio() {
            try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
            if (!bgm.ac) {
                bgm.ac = new (window.AudioContext || window.webkitAudioContext)();
                const comp = bgm.ac.createDynamicsCompressor();          // 화음이 겹쳐도 찢어지지 않게
                comp.connect(bgm.ac.destination);
                bgm.comp = comp;
                bgmNewOut();
                try {                                                    // 예전 아이폰·아이패드용 : 무음 한 조각
                    const b = bgm.ac.createBuffer(1, 1, 22050), s = bgm.ac.createBufferSource();
                    s.buffer = b; s.connect(bgm.ac.destination); s.start(0);
                } catch (e) {}
            }
            if (bgm.ac.state !== 'running') { try { const p = bgm.ac.resume(); if (p && p.catch) p.catch(() => {}); } catch (e) {} }
            return bgm.ac;
        }
        function bgmNewOut() {                                           // 멈출 때는 출력 통로를 통째로 바꿔서 예약된 음을 끊어요
            if (bgm.out) { const old = bgm.out; old.gain.setTargetAtTime(0, bgm.ac.currentTime, 0.04); setTimeout(() => { try { old.disconnect(); } catch (e) {} }, 400); }
            bgm.out = bgm.ac.createGain();
            bgm.out.gain.value = bgm.pref.vol * 0.6;
            bgm.out.connect(bgm.comp);
        }

        /* ---------- 음색 ---------- */
        const BGM_VOICES = {
            box:   { name: '🎐 오르골',  partials: [[1, 1, 'sine'], [2, 0.28, 'sine'], [4.07, 0.08, 'sine']], decay: 1.2, low: 1.6, vol: 0.22, sustain: false },
            piano: { name: '🎹 피아노',  partials: [[1, 1, 'triangle'], [2, 0.35, 'sine'], [3, 0.12, 'sine']], decay: 1.6, low: 2.2, vol: 0.2, sustain: false },
            chip:  { name: '👾 8비트',   partials: [[1, 1, 'square']], decay: 0, low: 0, vol: 0.055, sustain: true }
        };
        function bgmVoiceOf(song) { return bgm.pref.voice === 'auto' ? (song.voice || 'box') : bgm.pref.voice; }

        function bgmPlayNote(m, t, dur, voiceId) {
            const v = BGM_VOICES[voiceId] || BGM_VOICES.box, ac = bgm.ac, low = m < 60;
            const g = ac.createGain(), f = bgmFreq(m);
            const vol = v.vol * (low ? 0.8 : 1);
            let end;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
            if (v.sustain) {                                             // 8비트 : 음 길이만큼 유지하고 뚝
                end = t + Math.max(0.05, dur * 0.88);
                g.gain.setValueAtTime(vol, end - 0.02);
                g.gain.exponentialRampToValueAtTime(0.0001, end);
            } else {                                                     // 오르골·피아노 : 톡 튕기고 천천히 사라짐
                end = t + (low ? v.low : v.decay);
                g.gain.exponentialRampToValueAtTime(0.0006, end);
            }
            g.connect(bgm.out);
            v.partials.forEach(([mul, amp, type]) => {
                const o = ac.createOscillator(), og = ac.createGain();
                o.type = type; o.frequency.value = f * mul; og.gain.value = amp;
                o.connect(og).connect(g); o.start(t); o.stop(end + 0.05);
            });
        }

        /* ---------- 연주 : 곡을 '언제 어떤 음' 목록으로 바꿔서 조금씩 미리 예약 ---------- */
        function bgmEvents(song, speed) {
            const step = 60 / (song.bpm * speed) / (song.unit / 4), ev = [];
            let total = 0;
            (song.tracks || [song.notes]).forEach(tr => {
                let t = 0;
                tr.forEach(([n, len]) => {
                    if (n !== '-') n.split('+').forEach(p => { const m = bgmMidi(p); if (m !== null) ev.push([t, m, len * step]); });
                    t += len * step;
                });
                total = Math.max(total, t);
            });
            ev.sort((a, b) => a[0] - b[0]);
            return { ev, total };
        }

        function bgmStart(song) {
            bgmAudio();
            bgmNewOut();
            clearInterval(bgm.timer);
            bgm.song = song; bgm.playing = true; bgm.loopCount = 0;
            bgmQueueSong(bgm.ac.currentTime + 0.1);
            bgm.timer = setInterval(bgmTick, 120);
            bgmRender();
        }
        function bgmQueueSong(at) {
            const speed = bgm.song.accel ? Math.min(1.9, 1 + bgm.loopCount * 0.15) : 1;   // 산왕의 궁전 : 반복할수록 빨라짐
            const { ev, total } = bgmEvents(bgm.song, speed);
            bgm.queue = ev.map(e => [at + e[0], e[1], e[2]]);
            bgm.voice = bgmVoiceOf(bgm.song);
            bgm.songEnd = at + total;
        }
        function bgmTick() {
            if (!bgm.playing || !bgm.ac) return;
            const now = bgm.ac.currentTime, ahead = document.hidden ? 2.5 : 0.4;   // 화면이 꺼지면 넉넉하게 미리 예약
            while (bgm.queue.length && bgm.queue[0][0] < now + ahead) {
                const [t, m, d] = bgm.queue.shift();
                if (t >= now - 0.05) bgmPlayNote(m, Math.max(t, now), d, bgm.voice);
            }
            if (!bgm.queue.length && now > bgm.songEnd - ahead) {
                const gap = bgm.songEnd + 0.9;                             // 곡 사이 쉼
                if (bgm.pref.mode === 'one') { bgm.loopCount++; bgmQueueSong(gap); }
                else { const next = bgmNextSong(1); bgm.song = next; bgm.loopCount = 0; bgmQueueSong(gap); setTimeout(bgmRender, Math.max(0, (gap - now) * 1000)); }
            }
        }
        function bgmStop() {
            bgm.playing = false;
            clearInterval(bgm.timer); bgm.timer = null; bgm.queue = [];
            if (bgm.ac) bgmNewOut();
            bgmRender();
        }
        function bgmToggle() {
            if (bgm.playing) bgmStop();
            else bgmStart(bgm.song || BGM_SONGS.find(s => s.cat === bgm.cat) || BGM_SONGS[0]);
        }
        function bgmNextSong(dir) {
            const list = BGM_SONGS.filter(s => s.cat === (bgm.song ? bgm.song.cat : bgm.cat));
            if (bgm.pref.shuffle && list.length > 1) {
                let s; do { s = list[Math.floor(Math.random() * list.length)]; } while (s === bgm.song);
                return s;
            }
            const i = list.indexOf(bgm.song);
            return list[(i + dir + list.length) % list.length];
        }
        function bgmSkip(dir) { bgmStart(bgmNextSong(dir)); }

        /* ---------- 화면 : 배경음악 창 + 오른쪽 아래 미니 플레이어 ---------- */
        function bgmBuild() {
            if (document.getElementById('bgmModal')) return;
            const m = document.createElement('div');
            m.className = 'modal'; m.id = 'bgmModal';
            m.innerHTML = `
              <div class="modal-content bgm-content">
                <div class="modal-title">🎵 배경음악</div>
                <div class="bgm-now"><span class="bgm-eq" id="bgmEq"><i></i><i></i><i></i></span><div class="bgm-now-t"><b id="bgmNowTitle">곡을 골라 주세요</b><small id="bgmNowBy">다이어리를 꾸미면서 들어 보세요</small></div></div>
                <div class="bgm-ctrl">
                  <button class="btn" type="button" onclick="bgmSkip(-1)" aria-label="이전 곡">⏮</button>
                  <button class="btn bgm-play" id="bgmPlayBtn" type="button" onclick="bgmToggle()" aria-label="재생">▶</button>
                  <button class="btn" type="button" onclick="bgmSkip(1)" aria-label="다음 곡">⏭</button>
                  <button class="btn" id="bgmShuffleBtn" type="button" onclick="bgmSetShuffle()">🔀</button>
                  <button class="btn" id="bgmModeBtn" type="button" onclick="bgmSetMode()">🔁</button>
                </div>
                <div class="bgm-opts">
                  <label>🔈 <input type="range" id="bgmVol" min="0" max="1" step="0.05" oninput="bgmSetVol(this.value)"></label>
                  <select id="bgmVoice" class="btn" onchange="bgmSetVoice(this.value)">
                    <option value="auto">🎼 곡에 맞춰 자동</option>
                    <option value="box">🎐 오르골</option><option value="piano">🎹 피아노</option><option value="chip">👾 8비트</option>
                  </select>
                </div>
                <div class="bgm-tabs" id="bgmTabs" role="tablist"></div>
                <div class="bgm-list" id="bgmList"></div>
                <p class="bgm-note">창을 닫아도 음악은 계속 나와요. 오른쪽 아래 🎵 막대로 멈추거나 다시 열 수 있어요.</p>
                <button class="btn" type="button" style="width:100%; justify-content:center; margin-top:8px;" onclick="closeModal('bgmModal')">닫기</button>
              </div>`;
            document.body.appendChild(m);
            const mini = document.createElement('div');
            mini.className = 'bgm-mini'; mini.id = 'bgmMini'; mini.hidden = true;
            mini.innerHTML = `<button type="button" class="bgm-mini-t" onclick="openBgm()"><span class="bgm-eq on"><i></i><i></i><i></i></span><span id="bgmMiniTitle"></span></button><button type="button" class="bgm-mini-x" onclick="bgmStop()" aria-label="배경음악 멈추기">■</button>`;
            document.body.appendChild(mini);
            const tabs = document.getElementById('bgmTabs');
            BGM_CATS.forEach(c => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'bgm-tab'; b.dataset.cat = c.id; b.textContent = c.name;
                b.onclick = () => { bgm.cat = c.id; bgmRender(); };
                tabs.appendChild(b);
            });
            // 배경음악 창 안 어디를 눌러도 소리 장치 깨우기 (아이패드)
            ['pointerdown', 'touchend', 'click'].forEach(t => m.addEventListener(t, () => { if (bgm.ac && bgm.ac.state !== 'running') bgmAudio(); }, true));
        }

        function openBgm() {
            bgmBuild();
            if (bgm.song) bgm.cat = bgm.song.cat;
            bgmRender();
            openModal('bgmModal');
        }

        function bgmRender() {
            if (!document.getElementById('bgmModal')) return;
            const s = bgm.song;
            document.getElementById('bgmNowTitle').textContent = s ? s.title : '곡을 골라 주세요';
            document.getElementById('bgmNowBy').textContent = s ? s.by : '다이어리를 꾸미면서 들어 보세요';
            document.getElementById('bgmEq').classList.toggle('on', bgm.playing);
            const pb = document.getElementById('bgmPlayBtn');
            pb.textContent = bgm.playing ? '⏸' : '▶'; pb.setAttribute('aria-label', bgm.playing ? '멈추기' : '재생');
            const sh = document.getElementById('bgmShuffleBtn');
            sh.classList.toggle('on', bgm.pref.shuffle); sh.title = bgm.pref.shuffle ? '섞어 듣기 켜짐' : '섞어 듣기 꺼짐';
            const md = document.getElementById('bgmModeBtn');
            md.textContent = bgm.pref.mode === 'one' ? '🔂' : '🔁'; md.title = bgm.pref.mode === 'one' ? '한 곡 반복' : '목록 반복';
            document.getElementById('bgmVol').value = bgm.pref.vol;
            document.getElementById('bgmVoice').value = bgm.pref.voice;
            document.querySelectorAll('.bgm-tab').forEach(b => b.classList.toggle('on', b.dataset.cat === bgm.cat));
            const list = document.getElementById('bgmList');
            list.innerHTML = '';
            BGM_SONGS.filter(x => x.cat === bgm.cat).forEach(x => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'bgm-song' + (s === x ? ' on' : '');
                b.innerHTML = `<span class="bgm-song-i">${s === x && bgm.playing ? '♪' : '▶'}</span><span class="bgm-song-t"><b></b><small></small></span>`;
                b.querySelector('b').textContent = x.title; b.querySelector('small').textContent = x.by;
                b.onclick = () => bgmStart(x);
                list.appendChild(b);
            });
            const mini = document.getElementById('bgmMini');
            mini.hidden = !bgm.playing;
            document.getElementById('bgmMiniTitle').textContent = s ? s.title : '';
        }

        function bgmSetVol(v) {
            bgm.pref.vol = +v; bgmSavePref();
            if (bgm.out) bgm.out.gain.setTargetAtTime(bgm.pref.vol * 0.6, bgm.ac.currentTime, 0.05);
        }
        function bgmSetVoice(v) { bgm.pref.voice = v; bgmSavePref(); if (bgm.playing) bgm.voice = bgmVoiceOf(bgm.song); }
        function bgmSetShuffle() { bgm.pref.shuffle = !bgm.pref.shuffle; bgmSavePref(); bgmRender(); toast(bgm.pref.shuffle ? '🔀 섞어 듣기' : '🔀 순서대로 듣기'); }
        function bgmSetMode() { bgm.pref.mode = bgm.pref.mode === 'one' ? 'all' : 'one'; bgmSavePref(); bgmRender(); toast(bgm.pref.mode === 'one' ? '🔂 한 곡 반복' : '🔁 목록 반복'); }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['bgm'] = true;
