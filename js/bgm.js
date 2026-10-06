/* 말랑달콤 다이어리 - js/bgm.js
   🎵 배경음악 : 다이어리를 꾸미면서 들을 수 있는 음악 플레이어 (툴바 🎵 배경음악)
   - 녹음 파일 없이 브라우저가 악보를 보고 그 자리에서 소리를 만들어요 (Web Audio)
   - 음색 3가지 : 🎐 오르골 · 🎹 피아노 · 👾 8비트(옛날 게임기)
   - 창을 닫아도 계속 흘러나오고, 오른쪽 아래 작은 막대(미니 플레이어)로 멈추기·다시 열기
   - 곡 종류 두 가지
       ① 전곡 악보 (file: true) : js/bgm/곡이름.json 을 그 곡을 처음 틀 때만 받아 와요 (곡당 1~70KB · 깃허브에서 받음 · 드라이브 트래픽 없음)
          Mutopia Project(무료 공개 악보)의 악보를 그대로 연주 데이터로 바꾼 것 → 원곡 길이 그대로
          출처 · 이용 허락은 js/bgm/CREDITS.txt 와 곡 정보(credit)에 적혀 있어요. (CC BY-SA 악보는 출처 표시가 꼭 필요해요)
       ② 짧은 노래 (tracks) : 이 파일 안에 음표로 적은 동요·민요 → repeat 번 되풀이 (원래 1분 안쪽의 짧은 노래들)
   - 곡은 모두 저작권이 끝난 곡만 넣었어요. (마리오·포켓몬 · 요즘 피아노곡 · 대부분의 한국 창작 동요는 저작권이 있어서 못 넣어요)
   - 음량 · 음색 · 반복 방식은 이 기기에만 기억 (드라이브에 저장하지 않음 → 트래픽 없음)
   ※ 이 파일이 없어도 다이어리는 정상 동작 (배경음악 버튼만 반응 없음) */

        const BGM_DATA_DIR = 'js/bgm/';
        const BGM_DATA_VER = '1';

        const BGM_CATS = [
            { id: 'game', name: '🎮 게임 속 그 음악' },
            { id: 'classic', name: '🎻 클래식' },
            { id: 'piano', name: '🎹 피아노' },
            { id: 'kids', name: '🧸 동요 · 따뜻한 노래' }
        ];

        /* 테트리스 재료 : A 부분 · B 부분 (멜로디 / 반주) */
        const BGM_TET_A = [
            ['E5',2],['B4',1],['C5',1],['D5',2],['C5',1],['B4',1], ['A4',2],['A4',1],['C5',1],['E5',2],['D5',1],['C5',1],
            ['B4',3],['C5',1],['D5',2],['E5',2], ['C5',2],['A4',2],['A4',4],
            ['-',2],['D5',2],['F5',1],['A5',2],['G5',1],['F5',1], ['E5',3],['C5',1],['E5',2],['D5',1],['C5',1],
            ['B4',2],['B4',1],['C5',1],['D5',2],['E5',2], ['C5',2],['A4',2],['A4',2],['-',2]];
        const BGM_TET_AB = [
            ['E3',2],['E2',2],['E3',2],['E2',2], ['A2',2],['A3',2],['A2',2],['A3',2], ['G#2',2],['G#3',2],['G#2',2],['G#3',2], ['A2',2],['A3',2],['A2',2],['A3',2],
            ['D3',2],['D2',2],['D3',2],['D2',2], ['C3',2],['C2',2],['C3',2],['C2',2], ['G#2',2],['G#3',2],['E2',2],['E3',2], ['A2',2],['A3',2],['A2',4]];
        const BGM_TET_B = [
            ['E5+C5',4],['C5+A4',4],['D5+B4',4],['B4+G#4',4],['C5+A4',4],['A4+E4',4],['G#4+E4',4],['B4+G#4',2],['-',2],
            ['E5+C5',4],['C5+A4',4],['D5+B4',4],['B4+G#4',4],['C5+A4',2],['E5+C5',2],['A5+E5',4],['G#5+E5',8]];
        const BGM_TET_BB = [['A2',8],['G#2',8],['A2',8],['E2',8],['A2',8],['G#2',8],['A2',8],['E2',8]];

        /* 작은 별 · 프레르 자크 · 노 젓기 재료 */
        const BGM_FJ = [['C5',2],['D5',2],['E5',2],['C5',2],['C5',2],['D5',2],['E5',2],['C5',2],['E5',2],['F5',2],['G5',4],['E5',2],['F5',2],['G5',4],
            ['G5',1],['A5',1],['G5',1],['F5',1],['E5',2],['C5',2],['G5',1],['A5',1],['G5',1],['F5',1],['E5',2],['C5',2],['C5',2],['G4',2],['C5',4],['C5',2],['G4',2],['C5',4]];
        const BGM_ROW = [['C5',3],['C5',3],['C5',2],['D5',1],['E5',3],['E5',2],['D5',1],['E5',2],['F5',1],['G5',6],
            ['C6',1],['C6',1],['C6',1],['G5',1],['G5',1],['G5',1],['E5',1],['E5',1],['E5',1],['C5',1],['C5',1],['C5',1],['G5',2],['F5',1],['E5',2],['D5',1],['C5',6]];

        const BGM_SONGS = [
            /* ---------- 🎮 게임 속 그 음악 ---------- */
            { id: 'tetris', cat: 'game', repeat: 3, title: '테트리스 (코로베이니키)', by: '러시아 민요', bpm: 144, unit: 8, voice: 'chip',
              tracks: [BGM_TET_A.concat(BGM_TET_A, BGM_TET_B, BGM_TET_A), BGM_TET_AB.concat(BGM_TET_AB, BGM_TET_BB, BGM_TET_AB)] },
            {id: "mountain", cat: "game", title: "산왕의 궁전에서", by: "그리그 · 1875", file: true, len: 140, credit: "Mutopia Project · 악보 입력 Coyau · 퍼블릭 도메인"},
            {id: "toccata", cat: "game", title: "토카타와 푸가 d단조 (유령의 성)", by: "바흐 · 1700년대", file: true, len: 572, credit: "Mutopia Project · 악보 입력 Anonymous · 퍼블릭 도메인"},
            {id: "blitz", cat: "game", title: "천둥과 번개 폴카", by: "요한 슈트라우스 2세 · 1868", file: true, len: 193, credit: "Mutopia Project · 악보 입력 Stan Sanderson · 퍼블릭 도메인"},
            {id: "inv8", cat: "game", title: "인벤션 8번 (8비트로 들으면 딱!)", by: "바흐 · 1723", file: true, len: 66, credit: "Mutopia Project · 악보 입력 Mutopia · 퍼블릭 도메인", voice: "chip", repeat: 2},
            {id: "inv1", cat: "game", title: "인벤션 1번", by: "바흐 · 1723", file: true, len: 66, credit: "Mutopia Project · 악보 입력 jeff covey · CC BY-SA 3.0", voice: "chip", repeat: 2},
            /* ---------- 🎻 클래식 ---------- */
            {id: "elise", cat: "classic", title: "엘리제를 위하여", by: "베토벤 · 1810", file: true, len: 159, credit: "Mutopia Project · 악보 입력 Stelios Samelis · 퍼블릭 도메인"},
            {id: "moonlight", cat: "classic", title: "월광 소나타 1악장", by: "베토벤 · 1801", file: true, len: 314, credit: "Mutopia Project · 악보 입력 Stewart Holmes · CC BY-SA 2.5"},
            {id: "pathetique", cat: "classic", title: "비창 소나타 2악장", by: "베토벤 · 1798", file: true, len: 286, credit: "Mutopia Project · 악보 입력 Chris Sawer · 퍼블릭 도메인"},
            {id: "fate", cat: "classic", title: "운명 교향곡 1악장", by: "베토벤 · 1808", file: true, len: 317, credit: "Mutopia Project · 악보 입력 Stelios Samelis · Johannes Heinecke · 퍼블릭 도메인", voice: "box"},
            {id: "joy", cat: "classic", title: "환희의 송가", by: "베토벤 · 1824", file: true, len: 43, credit: "Mutopia Project · 악보 입력 Peter Chubb · 퍼블릭 도메인", voice: "box", repeat: 3},
            {id: "nacht", cat: "classic", title: "아이네 클라이네 나흐트무지크 1악장", by: "모차르트 · 1787", file: true, len: 320, credit: "Mutopia Project · 악보 입력 Anonymous · 퍼블릭 도메인", voice: "box"},
            {id: "newworld", cat: "classic", title: "신세계 교향곡 2악장 (꿈속의 고향)", by: "드보르자크 · 1893", file: true, len: 524, credit: "Mutopia Project · 악보 입력 Keith OHara · CC BY-SA 3.0", voice: "box"},
            {id: "air", cat: "classic", title: "G선상의 아리아", by: "바흐 · 1730년경", file: true, len: 217, credit: "Mutopia Project · 악보 입력 jeff covey · CC BY-SA 3.0", voice: "box"},
            {id: "anitra", cat: "classic", title: "아니트라의 춤 (페르귄트)", by: "그리그 · 1875", file: true, len: 209, credit: "Mutopia Project · 악보 입력 Deborah Lowrey · 퍼블릭 도메인", voice: "box"},
            {id: "wedding", cat: "classic", title: "결혼 행진곡 (한여름 밤의 꿈)", by: "멘델스존 · 1842", file: true, len: 328, credit: "Mutopia Project · 악보 입력 Alexander Brock · CC BY-SA 4.0", voice: "box"},
            {id: "hallelujah", cat: "classic", title: "할렐루야 (메시아)", by: "헨델 · 1741", file: true, len: 209, credit: "Mutopia Project · 악보 입력 Joshua Koo · 퍼블릭 도메인", voice: "box"},
            {id: "lullaby", cat: "classic", title: "브람스 자장가", by: "브람스 · 1868", file: true, len: 39, credit: "Mutopia Project · 악보 입력 Diego Guillen · 퍼블릭 도메인", voice: "box", repeat: 3},
            /* ---------- 🎹 피아노 ---------- */
            {id: "gymno", cat: "piano", title: "짐노페디 1번", by: "사티 · 1888", file: true, len: 188, credit: "Mutopia Project · 악보 입력 Evin Robertson · 퍼블릭 도메인"},
            {id: "clair", cat: "piano", title: "달빛 (베르가마스크 모음곡)", by: "드뷔시 · 1905", file: true, len: 339, credit: "Mutopia Project · 악보 입력 Keith OHara · 퍼블릭 도메인"},
            {id: "nocturne", cat: "piano", title: "녹턴 Op.9 No.2", by: "쇼팽 · 1832", file: true, len: 247, credit: "Mutopia Project · 악보 입력 Renato Biolcati Rinaldi · CC BY-SA 3.0"},
            {id: "puppy", cat: "piano", title: "강아지 왈츠", by: "쇼팽 · 1847", file: true, len: 106, credit: "Mutopia Project · 악보 입력 Magnus Lewis-Smith · 퍼블릭 도메인"},
            {id: "traumerei", cat: "piano", title: "트로이메라이 (어린이 정경)", by: "슈만 · 1838", file: true, len: 138, credit: "Mutopia Project · 악보 입력 Ying-Chun Liu · 퍼블릭 도메인"},
            {id: "consolation", cat: "piano", title: "위안 3번", by: "리스트 · 1850", file: true, len: 243, credit: "Mutopia Project · 악보 입력 Ryan Prince · CC BY 3.0"},
            {id: "gondel", cat: "piano", title: "베네치아의 뱃노래 (무언가)", by: "멘델스존 · 1830", file: true, len: 138, credit: "Mutopia Project · 악보 입력 Ryan Prince · CC BY 3.0"},
            {id: "prelude1", cat: "piano", title: "평균율 프렐류드 1번", by: "바흐 · 1722", file: true, len: 156, credit: "Mutopia Project · 악보 입력 Tobias Erbsland · 퍼블릭 도메인"},
            {id: "turkish", cat: "piano", title: "터키 행진곡", by: "모차르트 · 1783", file: true, len: 212, credit: "Mutopia Project · 악보 입력 Rune Zedeler · Chris Sawer · 퍼블릭 도메인"},
            {id: "k545", cat: "piano", title: "소나타 C장조 K.545 1악장", by: "모차르트 · 1788", file: true, len: 139, credit: "Mutopia Project · 악보 입력 Alejandro Sierra · CC BY-SA 3.0"},
            {id: "twinklevar", cat: "piano", title: "작은 별 변주곡 (전곡 · 기타 이중주판)", by: "모차르트 · 1781", file: true, len: 532, credit: "Mutopia Project · 악보 입력 Jeffrey Olson · 퍼블릭 도메인"},
            {id: "amaryllis", cat: "piano", title: "아마릴리스", by: "기스 · 1867", file: true, len: 170, credit: "Mutopia Project · 악보 입력 Stan Sanderson · 퍼블릭 도메인"},
            {id: "entertainer", cat: "piano", title: "엔터테이너", by: "스콧 조플린 · 1902", file: true, len: 253, credit: "Mutopia Project · 악보 입력 Chris Sawer · 퍼블릭 도메인"},
            {id: "maple", cat: "piano", title: "메이플 리프 래그", by: "스콧 조플린 · 1899", file: true, len: 160, credit: "Mutopia Project · 악보 입력 Chris Sawer · 퍼블릭 도메인"},
            {id: "canon", cat: "piano", title: "캐논", by: "파헬벨 · 1680년경", file: true, len: 192, credit: "Mutopia Project · 악보 입력 Anonymous (Jim Paterson 원본) · CC BY 3.0"},
            {id: "arabesque", cat: "piano", title: "아라베스크 1번", by: "드뷔시 · 1891", file: true, len: 207, credit: "Mutopia Project · 악보 입력 Keith OHara · 퍼블릭 도메인"},
            {id: "minuet", cat: "piano", title: "미뉴에트 G장조", by: "바흐 노트 · 1725", file: true, len: 46, credit: "Mutopia Project · 악보 입력 Mutopia · 퍼블릭 도메인", repeat: 2},
            {id: "sonatina", cat: "piano", title: "소나티네 Op.36 No.1 (전 악장)", by: "클레멘티 · 1797", file: true, len: 192, credit: "Mutopia Project · 악보 입력 Brian D. Rude · 퍼블릭 도메인"},
            {id: "farmer", cat: "piano", title: "즐거운 농부", by: "슈만 · 1848", file: true, len: 48, credit: "Mutopia Project · 악보 입력 Philippe Hézaine · CC BY-SA 2.5", repeat: 2},
            {id: "candeur", cat: "piano", title: "순진한 마음 (부르크뮐러 25 연습곡)", by: "부르크뮐러 · 1851", file: true, len: 40, credit: "Mutopia Project · 악보 입력 Bas Wassink · 퍼블릭 도메인", repeat: 2},
            {id: "burgarab", cat: "piano", title: "아라베스크 (부르크뮐러 25 연습곡)", by: "부르크뮐러 · 1851", file: true, len: 29, credit: "Mutopia Project · 악보 입력 Bas Wassink · 퍼블릭 도메인", repeat: 2},
            {id: "pastorale", cat: "piano", title: "목가 (부르크뮐러 25 연습곡)", by: "부르크뮐러 · 1851", file: true, len: 57, credit: "Mutopia Project · 악보 입력 Bas Wassink · 퍼블릭 도메인", repeat: 2},
            {id: "soldiers", cat: "piano", title: "나무 병정의 행진", by: "차이콥스키 · 1878", file: true, len: 40, credit: "Mutopia Project · 악보 입력 Anonymous · 퍼블릭 도메인", repeat: 2},
            /* ---------- 🧸 동요 · 따뜻한 노래 ---------- */
            { id: 'star', cat: 'kids', repeat: 3, title: '반짝반짝 작은 별', by: '프랑스 민요', bpm: 100, unit: 8,
              tracks: [[
                ['C5',2],['C5',2],['G5',2],['G5',2],['A5',2],['A5',2],['G5',4],['F5',2],['F5',2],['E5',2],['E5',2],['D5',2],['D5',2],['C5',4],
                ['G5',2],['G5',2],['F5',2],['F5',2],['E5',2],['E5',2],['D5',4],['G5',2],['G5',2],['F5',2],['F5',2],['E5',2],['E5',2],['D5',4],
                ['C5',2],['C5',2],['G5',2],['G5',2],['A5',2],['A5',2],['G5',4],['F5',2],['F5',2],['E5',2],['E5',2],['D5',2],['D5',2],['C5',4]
              ], [
                ['C4',4],['C4',4],['F4',4],['C4',4],['F3',4],['C4',4],['G3',4],['C4',4],
                ['C4',4],['F3',4],['C4',4],['G3',4],['C4',4],['F3',4],['C4',4],['G3',4],
                ['C4',4],['C4',4],['F4',4],['C4',4],['F3',4],['C4',4],['G3',4],['C4',4]
              ]] },
            { id: 'butterfly', cat: 'kids', repeat: 3, title: '나비야', by: '독일 민요', bpm: 108, unit: 8,
              tracks: [[
                ['G4',2],['E4',2],['E4',4],['F4',2],['D4',2],['D4',4],['C4',2],['D4',2],['E4',2],['F4',2],['G4',2],['G4',2],['G4',4],
                ['G4',2],['E4',2],['E4',4],['F4',2],['D4',2],['D4',4],['C4',2],['E4',2],['G4',2],['G4',2],['E4',2],['E4',2],['E4',4],
                ['D4',2],['D4',2],['D4',2],['D4',2],['D4',2],['E4',2],['F4',4],['E4',2],['E4',2],['E4',2],['E4',2],['E4',2],['F4',2],['G4',4],
                ['G4',2],['E4',2],['E4',4],['F4',2],['D4',2],['D4',4],['C4',2],['E4',2],['G4',2],['G4',2],['C4',8]
              ], [
                ['C3',8],['G2',8],['C3',8],['C3+G3',8],['C3',8],['G2',8],['C3',8],['C3',8],['G2',8],['G2',8],['C3',8],['C3',8],['C3',8],['G2',8],['C3',8],['C3',8]
              ]] },
            { id: 'plane', cat: 'kids', repeat: 5, title: '떴다 떴다 비행기', by: '미국 민요', bpm: 112, unit: 8,
              tracks: [[
                ['E4',2],['D4',2],['C4',2],['D4',2],['E4',2],['E4',2],['E4',4],['D4',2],['D4',2],['D4',4],['E4',2],['G4',2],['G4',4],
                ['E4',2],['D4',2],['C4',2],['D4',2],['E4',2],['E4',2],['E4',4],['D4',2],['D4',2],['E4',2],['D4',2],['C4',8]
              ], [
                ['C3',8],['C3',8],['G2',8],['C3',8],['C3',8],['C3',8],['G2',8],['C3',8]
              ]] },
            { id: 'cuckoo', cat: 'kids', repeat: 4, title: '뻐꾸기', by: '독일 민요', bpm: 112, unit: 4,
              tracks: [[
                ['G4',1],['E4',2],['G4',1],['E4',2],['D4',1],['C4',1],['D4',1],['C4',3],
                ['D4',1],['D4',1],['E4',1],['F4',2],['D4',1],['E4',1],['E4',1],['F4',1],['G4',2],['E4',1],
                ['G4',1],['E4',2],['G4',1],['E4',2],['F4',1],['E4',1],['D4',1],['C4',3]
              ], [
                ['C3',3],['C3',3],['G2',3],['C3',3],['G2',3],['G2',3],['C3',3],['C3',3],['C3',3],['C3',3],['G2',3],['C3',3]
              ]] },
            { id: 'london', cat: 'kids', repeat: 5, title: '런던 다리', by: '영국 전래동요', bpm: 108, unit: 8,
              tracks: [[
                ['G4',3],['A4',1],['G4',2],['F4',2],['E4',2],['F4',2],['G4',4],['D4',2],['E4',2],['F4',4],['E4',2],['F4',2],['G4',4],
                ['G4',3],['A4',1],['G4',2],['F4',2],['E4',2],['F4',2],['G4',4],['D4',4],['G4',4],['E4',2],['C4',6]
              ], [
                ['C3',8],['C3',8],['G2',8],['C3',8],['C3',8],['C3',8],['G2',8],['C3',8]
              ]] },
            { id: 'farm', cat: 'kids', repeat: 6, title: '올드 맥도널드', by: '미국 민요', bpm: 120, unit: 8,
              tracks: [[
                ['G4',2],['G4',2],['G4',2],['D4',2],['E4',2],['E4',2],['D4',4],['B4',2],['B4',2],['A4',2],['A4',2],['G4',6],['D4',2],
                ['G4',2],['G4',2],['G4',2],['D4',2],['E4',2],['E4',2],['D4',4],['B4',2],['B4',2],['A4',2],['A4',2],['G4',8]
              ], [
                ['G2',8],['C3',4],['G2',4],['G2',4],['D3',4],['G2',8],['G2',8],['C3',4],['G2',4],['G2',4],['D3',4],['G2',8]
              ]] },
            { id: 'jacques', cat: 'kids', repeat: 2, title: '프레르 자크 (돌림노래)', by: '프랑스 민요', bpm: 108, unit: 8,
              tracks: [BGM_FJ.concat(BGM_FJ, [['-',16]]), [['-',16]].concat(BGM_FJ, BGM_FJ)] },
            { id: 'rowboat', cat: 'kids', repeat: 6, title: '노 젓는 노래 (돌림노래)', by: '미국 전래동요', bpm: 132, unit: 8,
              tracks: [BGM_ROW.concat([['-',12]]), [['-',12]].concat(BGM_ROW)] },
            { id: 'susanna', cat: 'kids', repeat: 5, title: '오! 수재너', by: '포스터 · 1848', bpm: 120, unit: 8,
              tracks: [[
                ['C5',1],['D5',1],
                ['E5',2],['G5',2],['G5',3],['A5',1],['G5',2],['E5',2],['C5',3],['D5',1],['E5',2],['E5',2],['D5',2],['C5',2],['D5',6],['C5',1],['D5',1],
                ['E5',2],['G5',2],['G5',3],['A5',1],['G5',2],['E5',2],['C5',3],['D5',1],['E5',2],['E5',2],['D5',2],['D5',2],['C5',8]
              ], [
                ['-',2],['C3',8],['C3',8],['C3',8],['G2',8],['C3',8],['C3',8],['G2',8],['C3',8]
              ]] },
            { id: 'clementine', cat: 'kids', repeat: 5, title: '클레멘타인 (넓고 넓은 바닷가에)', by: '미국 민요 · 1884', bpm: 96, unit: 8,
              tracks: [[
                ['F4',1.5],['F4',0.5],
                ['F4',2],['C4',2],['A4',1.5],['A4',0.5], ['A4',2],['F4',2],['F4',1.5],['A4',0.5], ['C5',2],['C5',2],['Bb4',1],['A4',1], ['G4',4],['G4',1.5],['A4',0.5],
                ['Bb4',2],['Bb4',2],['A4',1.5],['G4',0.5], ['A4',2],['F4',2],['F4',1.5],['A4',0.5], ['G4',2],['C4',2],['E4',1.5],['G4',0.5], ['F4',6]
              ], [
                ['-',2],['F3',6],['F3',6],['F3',6],['C3',6],['C3',6],['F3',6],['C3',6],['F3',6]
              ]] },
            {id: "homesweet", cat: "kids", title: "즐거운 나의 집", by: "비숍 · 1823", file: true, len: 71, credit: "Mutopia Project · 악보 입력 Stan Sanderson · 퍼블릭 도메인", voice: "box", repeat: 3},
            {id: "loreley", cat: "kids", title: "로렐라이", by: "질허 · 1837", file: true, len: 42, credit: "Mutopia Project · 악보 입력 Stan Sanderson · 퍼블릭 도메인", voice: "box", repeat: 3},
            {id: "roeslein", cat: "kids", title: "들장미", by: "슈베르트 · 1815", file: true, len: 89, credit: "Mutopia Project · 악보 입력 Ph. Raynaud · 퍼블릭 도메인", voice: "box", repeat: 2},
            {id: "swanee", cat: "kids", title: "스와니 강 (주제와 변주)", by: "포스터 · 1851", file: true, len: 357, credit: "Mutopia Project · 악보 입력 Louie van Bommel · CC BY-SA 3.0", voice: "box"},
            {id: "greensleeves", cat: "kids", title: "그린슬리브스", by: "영국 민요", file: true, len: 46, credit: "Mutopia Project · 악보 입력 Ralf Axel Gehlert · 퍼블릭 도메인", voice: "box", repeat: 3},
            {id: "amazing", cat: "kids", title: "어메이징 그레이스", by: "영국 찬송가 · 1779", file: true, len: 72, credit: "Mutopia Project · 악보 입력 Breizh Partitions · CC BY-SA 3.0", voice: "box", repeat: 3},
            {id: "silent", cat: "kids", title: "고요한 밤 거룩한 밤", by: "그루버 · 1818", file: true, len: 40, credit: "Mutopia Project · 악보 입력 Steve Dunlop · 퍼블릭 도메인", voice: "box", repeat: 3},
            {id: "adeste", cat: "kids", title: "참 반가운 신도여", by: "웨이드 · 1751", file: true, len: 47, credit: "Mutopia Project · 악보 입력 Matt Corks · 퍼블릭 도메인", voice: "box", repeat: 3},
            {id: "joyworld", cat: "kids", title: "기쁘다 구주 오셨네", by: "헨델 편곡 · 1839", file: true, len: 40, credit: "Mutopia Project · 악보 입력 Steve Dunlop · 퍼블릭 도메인", voice: "box", repeat: 3},
            { id: 'jingle', cat: 'kids', repeat: 3, title: '징글벨', by: '피어폰트 · 1857', bpm: 120, unit: 8,
              tracks: [[
                ['E5',2],['E5',2],['E5',4],['E5',2],['E5',2],['E5',4],['E5',2],['G5',2],['C5',3],['D5',1],['E5',8],
                ['F5',2],['F5',2],['F5',3],['F5',1],['F5',2],['E5',2],['E5',2],['E5',1],['E5',1],['E5',2],['D5',2],['D5',2],['E5',2],['D5',4],['G5',4],
                ['E5',2],['E5',2],['E5',4],['E5',2],['E5',2],['E5',4],['E5',2],['G5',2],['C5',3],['D5',1],['E5',8],
                ['F5',2],['F5',2],['F5',3],['F5',1],['F5',2],['E5',2],['E5',2],['E5',1],['E5',1],['G5',2],['G5',2],['F5',2],['D5',2],['C5',8]
              ], [
                ['C3',8],['C3',8],['C3',8],['C3',8],['F2',8],['C3',8],['G2',8],['G2',8],
                ['C3',8],['C3',8],['C3',8],['C3',8],['F2',8],['C3',8],['G2',8],['C3',8]
              ]] },
            { id: 'birthday', cat: 'kids', repeat: 3, title: '생일 축하합니다', by: '힐 자매 · 1893', bpm: 100, unit: 8,
              tracks: [[
                ['G4',1.5],['G4',0.5],['A4',2],['G4',2],['C5',2],['B4',4],['G4',1.5],['G4',0.5],['A4',2],['G4',2],['D5',2],['C5',4],
                ['G4',1.5],['G4',0.5],['G5',2],['E5',2],['C5',2],['B4',2],['A4',2],['F5',1.5],['F5',0.5],['E5',2],['C5',2],['D5',2],['C5',6]
              ], [
                ['-',2],['C3',6],['G2',6],['G2',6],['C3',6],['C3',6],['F2',6],['C3',2],['G2',4],['C3',6]
              ]] },        ];

        /* ---------- 음 이름 → 주파수 ---------- */
        const BGM_NOTE = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
        function bgmMidi(n) { const m = /^([A-G](?:#|b)?)(\d)$/.exec(n); return m ? 12 * (+m[2] + 1) + BGM_NOTE[m[1]] : null; }
        const bgmFreq = m => 440 * Math.pow(2, (m - 69) / 12);
        const bgmClock = s => { s = Math.max(0, Math.round(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

        /* ---------- 상태 ---------- */
        const BGM_PREF_KEY = 'malang_bgm_pref';
        const bgm = {
            ac: null, out: null, song: null, playing: false, loading: false, cat: 'game',
            ev: [], idx: 0, t0: 0, total: 0, timer: null, cache: {}, loadSeq: 0,
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
            box:   { name: '🎐 오르골',  partials: [[1, 1, 'sine'], [2, 0.28, 'sine'], [4.07, 0.08, 'sine']], decay: 1.2, low: 1.6, vol: 0.2, sustain: false },
            piano: { name: '🎹 피아노',  partials: [[1, 1, 'triangle'], [2, 0.3, 'sine'], [3, 0.1, 'sine']], decay: 1.8, low: 2.6, vol: 0.18, sustain: false },
            chip:  { name: '👾 8비트',   partials: [[1, 1, 'square']], decay: 0, low: 0, vol: 0.09, sustain: true }
        };
        function bgmVoiceOf(song) { return bgm.pref.voice === 'auto' ? (song.voice || (song.file ? 'piano' : 'box')) : bgm.pref.voice; }

        function bgmPlayNote(m, t, dur, vel, voiceId) {
            const v = BGM_VOICES[voiceId] || BGM_VOICES.box, ac = bgm.ac, low = m < 60;
            const g = ac.createGain(), f = bgmFreq(m);
            const vol = v.vol * (low ? 0.8 : 1) * (0.3 + 0.7 * vel);
            let end;
            g.gain.setValueAtTime(0.0001, t);
            g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
            if (v.sustain) {                                             // 8비트 : 음 길이만큼 유지하고 뚝
                end = t + Math.max(0.05, Math.min(dur, 4) * 0.9);
                g.gain.setValueAtTime(vol, Math.max(t + 0.01, end - 0.02));
                g.gain.exponentialRampToValueAtTime(0.0001, end);
            } else {                                                     // 오르골·피아노 : 톡 튕기고 사라짐 (짧은 음은 조금 빨리 놓기)
                const ring = low ? v.low : v.decay;
                end = t + Math.min(ring, Math.max(0.35, dur * 1.6) + 0.25);
                g.gain.exponentialRampToValueAtTime(0.0006, end);
            }
            g.connect(bgm.out);
            v.partials.forEach(([mul, amp, type]) => {
                const fr = f * mul; if (fr > 12000) return;
                const o = ac.createOscillator(), og = ac.createGain();
                o.type = type; o.frequency.value = fr; og.gain.value = amp;
                o.connect(og).connect(g); o.start(t); o.stop(end + 0.05);
            });
        }

        /* ---------- 곡 → [시각(초), 음, 길이(초), 세기(0~1)] 목록 ---------- */
        function bgmHandEvents(song) {                                   // 이 파일에 적힌 짧은 노래
            const step = 60 / song.bpm / (song.unit / 4), one = [];
            let total = 0;
            (song.tracks || [song.notes]).forEach(tr => {
                let t = 0;
                tr.forEach(([n, len]) => {
                    if (n !== '-') n.split('+').forEach(p => { const m = bgmMidi(p); if (m !== null) one.push([t, m, len * step, 0.8]); });
                    t += len * step;
                });
                total = Math.max(total, t);
            });
            one.sort((a, b) => a[0] - b[0]);
            return { ev: one, total };
        }
        function bgmDecode(d) {                                          // js/bgm/*.json : [쉼(1/100초), 길이, 음, 세기(1~31)] 이 이어진 숫자 목록
            const ev = [], n = d.n;
            let t = 0;
            for (let i = 0; i + 3 < n.length; i += 4) { t += n[i]; ev.push([t / 100, n[i + 2], n[i + 1] / 100, n[i + 3] / 31]); }
            const last = ev[ev.length - 1];
            return { ev, total: last ? last[0] + last[2] : 0 };
        }
        function bgmRepeat(r, times) {                                   // 짧은 곡은 여러 번 이어서
            if (!times || times < 2) return r;
            const gap = 1.2, ev = [];
            for (let k = 0; k < times; k++) r.ev.forEach(e => ev.push([e[0] + k * (r.total + gap), e[1], e[2], e[3]]));
            return { ev, total: r.total * times + gap * (times - 1) };
        }
        function bgmLoad(song) {
            if (bgm.cache[song.id]) return Promise.resolve(bgm.cache[song.id]);
            const done = r => (bgm.cache[song.id] = bgmRepeat(r, song.repeat));
            if (!song.file) return Promise.resolve(done(bgmHandEvents(song)));
            return fetch(BGM_DATA_DIR + song.id + '.json?v=' + BGM_DATA_VER, { credentials: 'omit' })
                .then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); })
                .then(d => done(bgmDecode(d)));
        }

        /* ---------- 연주 : 조금씩 미리 예약 ---------- */
        function bgmStart(song, from) {
            bgmAudio();
            const seq = ++bgm.loadSeq;
            bgmHalt();
            bgm.song = song; bgm.cat = song.cat;
            bgm.loading = true; bgm.playing = true;
            bgmRender();
            bgmLoad(song).then(r => {
                if (seq !== bgm.loadSeq) return;                         // 그사이 다른 곡을 눌렀으면 무시
                bgm.loading = false;
                bgm.ev = r.ev; bgm.total = r.total;
                const at = Math.max(0, Math.min(from || 0, r.total - 1));
                let i = 0; while (i < r.ev.length && r.ev[i][0] < at) i++;
                bgm.idx = i;
                bgm.t0 = bgm.ac.currentTime + 0.12 - at;
                bgm.voice = bgmVoiceOf(song);
                bgm.timer = setInterval(bgmTick, 100);
                bgmTick(); bgmRender();
            }).catch(() => {
                if (seq !== bgm.loadSeq) return;
                bgm.loading = false; bgm.playing = false; bgmRender();
            });
        }
        function bgmTick() {
            if (!bgm.playing || bgm.loading || !bgm.ac) return;
            const now = bgm.ac.currentTime, ahead = document.hidden ? 3 : 0.5;   // 화면이 꺼지면 넉넉하게 미리 예약
            const ev = bgm.ev;
            while (bgm.idx < ev.length && bgm.t0 + ev[bgm.idx][0] < now + ahead) {
                const e = ev[bgm.idx++], t = bgm.t0 + e[0];
                if (t >= now - 0.05) bgmPlayNote(e[1], Math.max(t, now), e[2], e[3], bgm.voice);
            }
            bgmProgress();
            if (bgm.idx >= ev.length && now > bgm.t0 + bgm.total + 1.2) {         // 곡 끝
                bgmStart(bgm.pref.mode === 'one' ? bgm.song : bgmNextSong(1));
            }
        }
        function bgmHalt() {
            clearInterval(bgm.timer); bgm.timer = null; bgm.ev = []; bgm.idx = 0;
            if (bgm.ac) bgmNewOut();
        }
        function bgmStop() {
            bgm.loadSeq++;
            bgm.playing = false; bgm.loading = false;
            bgm.pausedAt = bgm.song && bgm.ac ? Math.max(0, bgm.ac.currentTime - bgm.t0) : 0;
            bgmHalt();
            bgmRender();
        }
        function bgmToggle() {
            if (bgm.playing) bgmStop();
            else if (bgm.song) bgmStart(bgm.song, bgm.pausedAt || 0);              // 멈춘 곳부터 이어서
            else bgmStart(BGM_SONGS.find(s => s.cat === bgm.cat) || BGM_SONGS[0]);
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
        function bgmSeek(v) { if (bgm.song) bgmStart(bgm.song, +v); }
        function bgmSongLen(s) {
            if (bgm.cache[s.id]) return bgm.cache[s.id].total;
            if (s.file) return s.len * (s.repeat || 1);
            const r = bgmHandEvents(s); return r.total * (s.repeat || 1);
        }

        /* ---------- 화면 : 배경음악 창 + 오른쪽 아래 미니 플레이어 ---------- */
        function bgmBuild() {
            if (document.getElementById('bgmModal')) return;
            const m = document.createElement('div');
            m.className = 'modal'; m.id = 'bgmModal';
            m.innerHTML = `
              <div class="modal-content bgm-content">
                <div class="modal-title">🎵 배경음악</div>
                <div class="bgm-now"><span class="bgm-eq" id="bgmEq"><i></i><i></i><i></i></span><div class="bgm-now-t"><b id="bgmNowTitle">곡을 골라 주세요</b><small id="bgmNowBy">다이어리를 꾸미면서 들어 보세요</small></div></div>
                <div class="bgm-seek"><span id="bgmCur">0:00</span><input type="range" id="bgmPos" min="0" max="1" step="1" value="0" disabled aria-label="재생 위치"
                    oninput="bgm.dragging = true; document.getElementById('bgmCur').textContent = bgmClock(this.value)" onchange="bgm.dragging = false; bgmSeek(this.value)"><span id="bgmDur">0:00</span></div>
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
                <p class="bgm-note">창을 닫아도 음악은 계속 나와요. 오른쪽 아래 🎵 막대로 멈추거나 다시 열 수 있어요.<br>
                  전곡 악보는 <a href="https://www.mutopiaproject.org" target="_blank" rel="noopener">Mutopia Project</a>의 무료 공개 악보로 연주해요.</p>
                <button class="btn" type="button" style="width:100%; justify-content:center; margin-top:8px;" onclick="closeModal('bgmModal')">닫기</button>
              </div>`;
            document.body.appendChild(m);
            const mini = document.createElement('div');
            mini.className = 'bgm-mini'; mini.id = 'bgmMini'; mini.hidden = true;
            mini.innerHTML = `<button type="button" class="bgm-mini-t" onclick="openBgm()"><span class="bgm-eq on"><i></i><i></i><i></i></span><span id="bgmMiniTitle"></span></button><button type="button" class="bgm-mini-x" onclick="bgmStop()" aria-label="배경음악 멈추기">■</button>`;
            (document.getElementById('statusDock') || document.body).appendChild(mini);   // 아래 상태 줄에 (폰에서는 다이어리 아래 한 줄)
            const tabs = document.getElementById('bgmTabs');
            BGM_CATS.forEach(c => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'bgm-tab'; b.dataset.cat = c.id;
                b.textContent = c.name + ' ' + BGM_SONGS.filter(s => s.cat === c.id).length;
                b.onclick = () => { bgm.cat = c.id; bgmRender(); document.getElementById('bgmList').scrollTop = 0; };
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

        function bgmProgress() {
            const pos = document.getElementById('bgmPos');
            if (!pos || bgm.dragging) return;
            const has = bgm.song && !bgm.loading && bgm.total > 0;
            const cur = has ? (bgm.playing ? Math.min(bgm.total, Math.max(0, bgm.ac.currentTime - bgm.t0)) : (bgm.pausedAt || 0)) : 0;
            const total = has ? bgm.total : (bgm.song ? bgmSongLen(bgm.song) : 0);
            pos.disabled = !has; pos.max = Math.max(1, Math.floor(total)); pos.value = Math.floor(cur);
            pos.style.setProperty('--p', (total ? cur / total * 100 : 0) + '%');
            document.getElementById('bgmCur').textContent = bgmClock(cur);
            document.getElementById('bgmDur').textContent = bgmClock(total);
        }

        function bgmRender() {
            if (!document.getElementById('bgmModal')) return;
            const s = bgm.song;
            document.getElementById('bgmNowTitle').textContent = s ? s.title : '곡을 골라 주세요';
            document.getElementById('bgmNowBy').textContent = bgm.loading ? '🎼 악보를 불러오는 중…' : s ? s.by + (s.credit ? ' · ' + s.credit : '') : '다이어리를 꾸미면서 들어 보세요';
            document.getElementById('bgmEq').classList.toggle('on', bgm.playing && !bgm.loading);
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
                b.innerHTML = `<span class="bgm-song-i">${s === x && bgm.playing ? '♪' : '▶'}</span><span class="bgm-song-t"><b></b><small></small></span><span class="bgm-song-len"></span>`;
                b.querySelector('b').textContent = x.title; b.querySelector('small').textContent = x.by + (x.file ? ' · 전곡' : '');
                b.querySelector('.bgm-song-len').textContent = bgmClock(bgmSongLen(x));
                b.onclick = () => bgmStart(x);
                list.appendChild(b);
            });
            bgmProgress();
            const mini = document.getElementById('bgmMini');
            mini.hidden = !bgm.playing;
            document.getElementById('bgmMiniTitle').textContent = s ? s.title : '';
        }

        function bgmSetVol(v) {
            bgm.pref.vol = +v; bgmSavePref();
            if (bgm.out) bgm.out.gain.setTargetAtTime(bgm.pref.vol * 0.6, bgm.ac.currentTime, 0.05);
        }
        function bgmSetVoice(v) { bgm.pref.voice = v; bgmSavePref(); if (bgm.song) bgm.voice = bgmVoiceOf(bgm.song); }
        function bgmSetShuffle() { bgm.pref.shuffle = !bgm.pref.shuffle; bgmSavePref(); bgmRender(); }
        function bgmSetMode() { bgm.pref.mode = bgm.pref.mode === 'one' ? 'all' : 'one'; bgmSavePref(); bgmRender(); }

/* 이 파일을 끝까지 문제없이 읽었다는 표시 */
(window.MALLANG_LOADED = window.MALLANG_LOADED || {})['bgm'] = true;
