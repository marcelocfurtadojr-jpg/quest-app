/* ============================================================
   QUEST — núcleo da aplicação (vanilla JS, módulo único)
   ------------------------------------------------------------
   Arquitetura:
     1) CONSTANTES (ranks, quests-pool, exercícios, buffs)
     2) STATE (carrega/salva localStorage; cria sample data se vazio)
     3) UTILS (datas, XP, rank, streaks)
     4) ICONS (SVG inline estilo lucide)
     5) FX (toast, confetti, level-up, haptic)
     6) VIEWS (dashboard, log diário, treino, etc.)
     7) ROUTER + TABBAR + MODAL
     8) INIT
   ============================================================ */

// ===== 1. CONSTANTES =========================================

// Sistema de rank inspirado em League of Legends (10 tiers).
// O threshold é em "rankXP" — pontuação acumulada com decay semanal,
// não apenas XP da semana corrente (assim subir é mais MOBA-real).
const RANKS = [
  { key: 'iron',        name: 'Ferro',       color: '#8E8E93', threshold:    0 },
  { key: 'bronze',      name: 'Bronze',      color: '#C99466', threshold:   25 },
  { key: 'silver',      name: 'Prata',       color: '#C0C0D0', threshold:   70 },
  { key: 'gold',        name: 'Ouro',        color: '#E8C56B', threshold:  140 },
  { key: 'platinum',    name: 'Platina',     color: '#9BD9D6', threshold:  230 },
  { key: 'emerald',     name: 'Esmeralda',   color: '#5FC7A0', threshold:  340 },
  { key: 'diamond',     name: 'Diamante',    color: '#7BB8FF', threshold:  470 },
  { key: 'master',      name: 'Mestre',      color: '#C77BFF', threshold:  640 },
  { key: 'grandmaster', name: 'Grão-Mestre', color: '#FF7B9B', threshold:  840 },
  { key: 'challenger',  name: 'Challenger',  color: '#FFD341', threshold: 1100 },
];

// Decay aplicado uma vez por semana no rollover (toda segunda-feira).
// Em equilíbrio, você precisa ganhar X*0.10 XP/semana para manter o rank atual.
// → Challenger (1100 rankXP) exige ~110 XP/semana = teto absoluto sustentado.
// → Diamante (470 rankXP) exige ~47 XP/semana = semana sólida.
const RANK_DECAY = 0.10;

// Pool de daily quests — 35 opções com sabor coreano (일일 미션).
// XP varia conforme dificuldade. Tag determina o ícone/cor.
const DEFAULT_QUEST_POOL = [
  // Saúde básica
  { id: 'q01', text: 'Beber 2L de água',                            xp: 1, tag: 'saúde' },
  { id: 'q02', text: 'Exposição ao sol 10 min',                     xp: 1, tag: 'saúde',  ko: '햇볕 쬐기' },
  { id: 'q03', text: 'Vitamina D 5000 UI',                          xp: 1, tag: 'saúde',  ko: '비타민' },
  { id: 'q04', text: 'Suco verde / chá matcha pela manhã',          xp: 1, tag: 'saúde',  ko: '녹차', kpopOnly: true },
  { id: 'q04b', text: 'Suco verde / chá pela manhã',                xp: 1, tag: 'saúde' },
  // Treino
  { id: 'q05', text: 'Treino conforme planejado',                   xp: 2, tag: 'treino', ko: '운동' },
  { id: 'q06', text: '10min mobilidade de ombros',                  xp: 1, tag: 'treino', ko: '어깨 스트레칭' },
  { id: 'q07', text: 'Alongamento pós-treino 5 min',                xp: 1, tag: 'treino', ko: '스트레칭' },
  { id: 'q08', text: 'AMRAP de pull-ups (registrar máx)',           xp: 2, tag: 'treino', ko: '턱걸이' },
  { id: 'q09', text: 'Foam roller 5 min na cadeia posterior',       xp: 1, tag: 'treino', ko: '폼롤러' },
  // Cardio
  { id: 'q10', text: 'Caminhar 30min ao ar livre',                  xp: 1, tag: 'cardio', ko: '산책' },
  { id: 'q11', text: '8.000 passos no dia',                         xp: 2, tag: 'cardio', ko: '8천 보' },
  { id: 'q12', text: 'Subir escada em vez de elevador (3x)',        xp: 1, tag: 'cardio', ko: '계단' },
  { id: 'q13', text: 'Bicicleta/HIIT 20min',                        xp: 2, tag: 'cardio', ko: 'HIIT' },
  // Nutrição
  { id: 'q14', text: 'Bater 145g de proteína',                      xp: 2, tag: 'nutri',  ko: '단백질' },
  { id: 'q15', text: 'Comer 2 porções de vegetais',                 xp: 1, tag: 'nutri',  ko: '야채' },
  { id: 'q16', text: 'Sem açúcar processado hoje',                  xp: 2, tag: 'nutri',  ko: '설탕 노' },
  { id: 'q17', text: 'Refeição com kimchi/fermentado',              xp: 1, tag: 'nutri',  ko: '김치', kpopOnly: true },
  { id: 'q18', text: 'Bibimbap ou tigela proteica caseira',         xp: 2, tag: 'nutri',  ko: '비빔밥', kpopOnly: true },
  { id: 'q17b', text: 'Refeição com alimento fermentado',           xp: 1, tag: 'nutri' },
  { id: 'q18b', text: 'Tigela proteica caseira (1 refeição)',       xp: 2, tag: 'nutri' },
  { id: 'q19', text: 'Não pular o café da manhã',                   xp: 1, tag: 'nutri',  ko: '아침' },
  // Sono
  { id: 'q20', text: 'Dormir antes de 23:30',                       xp: 2, tag: 'sono',   ko: '일찍 자기' },
  { id: 'q21', text: 'Sem celular 30 min antes de dormir',          xp: 2, tag: 'sono',   ko: '핸드폰 멀리' },
  { id: 'q22', text: 'Cortar cafeína após 14h',                     xp: 1, tag: 'sono',   ko: '커피 차단' },
  { id: 'q23', text: 'Janela escurecida ao deitar',                 xp: 1, tag: 'sono',   ko: '암막' },
  // Foco/leitura
  { id: 'q24', text: 'Ler 15 min',                                  xp: 1, tag: 'foco',   ko: '독서' },
  { id: 'q25', text: 'Ler 30 min (sessão profunda)',                xp: 2, tag: 'foco',   ko: '깊은 독서' },
  { id: 'q26', text: 'Estudar coreano 15 min (Hangul/vocab)',       xp: 2, tag: 'foco',   ko: '한국어', kpopOnly: true },
  { id: 'q27', text: 'Escrever 3 coisas pelas quais é grato',       xp: 1, tag: 'foco',   ko: '감사 일기' },
  { id: 'q28', text: '25 min Pomodoro sem distração',               xp: 2, tag: 'foco',   ko: '뽀모도로' },
  // Mente
  { id: 'q29', text: 'Meditar 5 min',                               xp: 1, tag: 'mente',  ko: '명상' },
  { id: 'q30', text: 'Respiração 4-7-8 (3 ciclos)',                 xp: 1, tag: 'mente',  ko: '호흡' },
  { id: 'q31', text: 'Banho frio 60s no fim',                       xp: 2, tag: 'mente',  ko: '냉수 샤워' },
  // Cultura K — só aparecem se o tema for kpop_anime
  { id: 'q32', text: 'Ouvir 1 música em coreano',                   xp: 1, tag: 'k-pop',  ko: 'K-pop', kpopOnly: true },
  { id: 'q33', text: 'Assistir vídeo dança K-pop e tentar 1 move',  xp: 1, tag: 'k-pop',  ko: '안무',  kpopOnly: true },
  { id: 'q34', text: 'Variety K (Knowing Bros, RM) 1 episódio',     xp: 1, tag: 'k-pop',  ko: '예능', kpopOnly: true },
  { id: 'q35', text: 'Escrever post-it com palavra coreana nova',   xp: 1, tag: 'k-pop',  ko: '단어', kpopOnly: true },
  // === Novas: lazer & rotina lúdica ===
  { id: 'q36', text: 'Assistir 1 episódio de anime',                xp: 1, tag: 'mente',  ko: '애니메이션', kpopOnly: true },
  { id: 'q37', text: 'Ler 1 artigo de notícia/jornal',              xp: 1, tag: 'foco',   ko: '뉴스' },
  { id: 'q38', text: 'Ouvir podcast por 30 min',                    xp: 2, tag: 'foco',   ko: '팟캐스트' },
  { id: 'q39', text: 'Estudar 30 min uma habilidade nova',          xp: 2, tag: 'foco',   ko: '학습' },
  { id: 'q40', text: 'Cozinhar uma receita nova',                   xp: 2, tag: 'nutri',  ko: '요리' },
  { id: 'q41', text: 'Journaling 10 min (escrever no diário)',      xp: 1, tag: 'mente',  ko: '일기' },
  { id: 'q42', text: 'Dia sem redes sociais até 19h',               xp: 2, tag: 'foco' },
  { id: 'q43', text: 'Comer só comida real (sem ultraprocessado)',  xp: 2, tag: 'nutri' },
  { id: 'q44', text: 'Limpar/organizar 1 cantinho da casa',         xp: 1, tag: 'mente' },
  { id: 'q45', text: 'Contrast shower (frio no fim do banho)',      xp: 1, tag: 'saúde' },
  { id: 'q46', text: 'Caminhada 10 min após o almoço',              xp: 1, tag: 'cardio' },
  { id: 'q47', text: 'Falar com alguém que não fala há um tempo',   xp: 1, tag: 'mente' },
];

// Pool de weekly quests. Cada quest tem `target` = quantos "checks" precisa
// pra completar (renderizado como stepper na UI).
const DEFAULT_WEEKLY_POOL = [
  { id: 'w01', text: 'Bater 145g de proteína em 5 dias',            xp:  8, target: 5 },
  { id: 'w02', text: '4 treinos completados',                       xp: 10, target: 4 },
  { id: 'w03', text: 'Dormir >7h em 5 noites',                      xp:  8, target: 5 },
  { id: 'w04', text: '3 sessões de leitura de 15min',               xp:  6, target: 3 },
  { id: 'w05', text: '8k passos em 5 dias',                         xp:  6, target: 5 },
  { id: 'w06', text: 'Cozinhar 3 refeições caseiras com proteína',  xp:  7, target: 3 },
  { id: 'w07', text: 'Sem açúcar processado em 4 dias',             xp: 10, target: 4 },
  { id: 'w08', text: 'Estudar coreano em 5 dias diferentes',        xp:  8, target: 5, kpopOnly: true },
  { id: 'w09', text: 'Bater PR em 1 exercício composto',            xp: 12, target: 1 },
  { id: 'w10', text: '1 sessão de dança K-pop completa (45min+)',   xp:  8, target: 1, kpopOnly: true },
  { id: 'w11', text: '5 dias sem celular após 22h',                 xp: 10, target: 5 },
  { id: 'w12', text: 'Tomar sol 10min em 5 dias',                   xp:  6, target: 5 },
  { id: 'w13', text: 'Finalizar 1 livro / 1 capítulo importante',   xp:  8, target: 1 },
  { id: 'w14', text: 'Meditar 5 min em 5 dias',                     xp:  6, target: 5 },
  { id: 'w15', text: 'Banho frio em 4 dias',                        xp:  9, target: 4 },
  { id: 'w16', text: 'Comer fermentado (kimchi/iogurte) 5x',        xp:  7, target: 5, kpopOnly: true },
  { id: 'w16b', text: 'Comer alimento fermentado 5x',               xp:  7, target: 5 },
  { id: 'w17', text: 'Sequência perfeita: 7 dias com log completo', xp: 14, target: 7 },
  { id: 'w18', text: 'Visitar restaurante coreano / cozinhar prato', xp: 6, target: 1, kpopOnly: true },
  { id: 'w19', text: 'Aprender 1 coreografia inteira (1 música)',   xp: 12, target: 1 },
  { id: 'w20', text: 'Tirar foto progresso (frontal + lateral)',    xp:  5, target: 2 },
];

// ===== Temas / estéticas ====================================
// 4 temas. Cada um traz suas próprias quests temáticas, rewards, taglines,
// quote e accent color. Os pools universais (saúde, treino, nutrição) ficam
// no DEFAULT_QUEST_POOL e são compartilhados — os THEMES adicionam o sabor.
const THEMES = {
  kpop_anime: {
    name: 'K-pop / Animes / Jogos',
    short: 'K-POP × ANIME × GAMES',
    sub: 'taglines coreanas, animes, gameplays, MK overlays.',
    accent: '#FFB7C5',     // pink
    accent2: '#B7B5FF',    // lavender
    quote: { primary: '실패는 성공의 어머니', secondary: '"O fracasso é mãe do sucesso"' },
    quotes: [
      { primary: '실패는 성공의 어머니',     secondary: '"O fracasso é mãe do sucesso"' },
      { primary: '천 리 길도 한 걸음부터', secondary: '"Mil milhas começam com um passo"' },
      { primary: '오늘의 나는 어제보다 강하다', secondary: '"Hoje sou mais forte que ontem"' },
      { primary: '시작이 반이다',            secondary: '"Começar já é metade"' },
      { primary: 'TEST YOUR MIGHT.',        secondary: '"Hoje você é seu adversário." — MK' },
      { primary: 'YOUR SOUL IS MINE.',      secondary: '"Seu progresso é seu — ninguém tira." — Shang Tsung' },
      { primary: 'GET OVER HERE!',          secondary: '"Levanta. Hoje é dia de luta." — Scorpion' },
      { primary: '꾸준함이 답이다',          secondary: '"Consistência é a resposta"' },
    ],
    greeting: { primary: '안녕하세요', secondary: '' },
    tags: { home: '⚔ KOMBAT IS LIFE ⚔', workout: '⚔ TEST YOUR MIGHT ⚔', nutri: '🔥 FUEL FOR BATTLE 🔥', insights: '⚡ BATTLE REPORT ⚡', goals: '🎯 VISION · GOALS', dance: '🎵 DANCE ARENA 🎵' },
    labels: {
      finishBtn: 'FINISH IT!',
      arsenal:   '⚔ ARSENAL ⚔',
      footer:    '— MORTAL KOMBAT NEVER ENDS —',
      register:  'Registrar dia',
      logCta:    'Registrar dia',
    },
    showKombatant: true,
    quests: [
      { id: 't1_kp1',  text: 'Ouvir 1 música em coreano',                xp: 1, tag: 'k-pop',  ko: 'K-pop' },
      { id: 't1_kp2',  text: 'Aprender 1 move de coreografia K-pop',     xp: 1, tag: 'k-pop',  ko: '안무' },
      { id: 't1_kp3',  text: 'Variety K (Knowing Bros, RM) 1 episódio',  xp: 1, tag: 'k-pop',  ko: '예능' },
      { id: 't1_kp4',  text: 'Aprender 1 palavra coreana nova',          xp: 1, tag: 'k-pop',  ko: '단어' },
      { id: 't1_kp5',  text: 'Estudar coreano 15 min (Hangul/vocab)',    xp: 2, tag: 'k-pop',  ko: '한국어' },
      { id: 't1_kp6',  text: 'Cantar 1 música K-pop completa',           xp: 1, tag: 'k-pop',  ko: '노래' },
      { id: 't1_an1',  text: 'Assistir 1 episódio de anime',             xp: 1, tag: 'lazer',  ko: '애니메이션' },
      { id: 't1_an2',  text: 'Maratonar 3 eps do anime atual',           xp: 2, tag: 'lazer',  ko: '몰아보기' },
      { id: 't1_an3',  text: 'Ler 1 capítulo de mangá',                  xp: 1, tag: 'lazer',  ko: '만화' },
      { id: 't1_an4',  text: 'Pesquisar OST de anime e ouvir 3 faixas',  xp: 1, tag: 'lazer' },
      { id: 't1_an5',  text: 'Re-watch favorito de anime (30 min)',      xp: 1, tag: 'lazer' },
      { id: 't1_gm1',  text: '1 partida ranked de jogo competitivo',     xp: 2, tag: 'jogos',  ko: '게임' },
      { id: 't1_gm2',  text: '30 min de gameplay focado (sem celular)',  xp: 1, tag: 'jogos',  ko: '플레이' },
      { id: 't1_gm3',  text: 'Pesquisar combo/build novo no jogo atual', xp: 1, tag: 'jogos' },
      { id: 't1_gm4',  text: 'Sessão de speedrun ou desafio in-game',    xp: 2, tag: 'jogos' },
      { id: 't1_dr1',  text: '1 episódio de K-drama',                    xp: 1, tag: 'lazer',  ko: '드라마' },
      { id: 't1_dr2',  text: 'Cozinhar comida coreana caseira',          xp: 2, tag: 'nutri',  ko: '한식' },
    ],
    weeklyQuests: [
      { id: 'tw1_1', text: 'Aprender 1 coreografia inteira (1 música)',   xp: 12, target: 1 },
      { id: 'tw1_2', text: 'Estudar coreano em 5 dias diferentes',         xp:  8, target: 5 },
      { id: 'tw1_3', text: 'Finalizar 1 temporada de anime ou K-drama',    xp: 10, target: 1 },
      { id: 'tw1_4', text: 'Subir 1 elo no jogo competitivo (ranked)',     xp: 12, target: 1 },
      { id: 'tw1_5', text: 'Ler 1 volume de mangá inteiro',                xp:  8, target: 1 },
      { id: 'tw1_6', text: 'Cozinhar 1 prato coreano caseiro',             xp:  6, target: 1 },
    ],
    rewards: [
      '1 partida ranked de LoL',
      '2 partidas casual (normal/ARAM)',
      '1 episódio de anime',
      'Maratona 3 eps do anime atual',
      'Capítulo de mangá',
      '1 episódio de K-drama',
      'Tarde de gameplay sem culpa',
      'Concerto K-pop no YouTube',
    ],
    challenges: [
      { id: 'ka01', name: 'Episódio + alongamento', focus: 'lazer · cultura', xp: 2, icon: '📺',
        sets: 'Assistir 1 episódio de anime ou K-drama enquanto faz alongamento estático.',
        tip: 'Resolve cultura + mobilidade no mesmo bloco.' },
      { id: 'ka02', name: 'Praticar coreografia 15min', focus: 'lazer · dança', xp: 3, icon: '💃',
        sets: '15 min praticando uma coreografia K-pop até o chorus sair limpo.',
        tip: 'Dança = cardio escondido. Repete o pedaço difícil 5x.' },
      { id: 'ka03', name: 'Sessão de gameplay focada', focus: 'lazer · jogos', xp: 2, icon: '🎮',
        sets: '1h jogando com foco — sem second screen, sem celular. Treina concentração.',
        tip: 'Marca um objetivo (ranked, missão, build) antes de começar.' },
    ],
  },

  inside_out: {
    name: 'Divertidamente + Totoro',
    short: 'INSIDE OUT · GHIBLI',
    sub: 'Emoções (Inside Out) + leveza/natureza (Meu Amigo Totoro). Check-in emocional + ritmo lento.',
    accent: '#FFD93D',
    accent2: '#7BB8FF',
    quote: { primary: 'Toda emoção tem seu lugar.', secondary: '— Riley, sua mente é um time' },
    quotes: [
      { primary: 'Toda emoção tem seu lugar.',                        secondary: '— Riley, sua mente é um time' },
      { primary: 'Chorar ajuda a desacelerar, e a focar no que importa.', secondary: '— Tristeza' },
      { primary: 'Vai dar tudo certo. Acho.',                          secondary: '— Alegria' },
      { primary: 'A raiva também ama você.',                           secondary: '— Lembrança-núcleo' },
      { primary: 'Tem hora pra cada emoção. Hoje é dia de qual?',      secondary: '' },
      { primary: 'Sem Tristeza, a Alegria não significa nada.',        secondary: '' },
      { primary: 'Memórias-núcleo se formam quando você presta atenção.', secondary: '' },
      { primary: 'Coragem é agir com Medo dentro de você, não sem ele.', secondary: '' },
      // === Meu Amigo Totoro / Ghibli ===
      { primary: 'O que está abaixo dessa árvore? Um Totoro.',         secondary: '— Mei, Meu Amigo Totoro' },
      { primary: 'Tudo acontece por uma razão. Sempre.',                secondary: '— Studio Ghibli' },
      { primary: 'Mesmo a chuva mais forte passa.',                    secondary: '— Cena do guarda-chuva, Totoro' },
      { primary: 'Plante a semente. Espere. A floresta cresce sozinha.', secondary: '— Totoro' },
      { primary: 'Acreditar em criaturas mágicas é um músculo do coração.', secondary: '' },
      { primary: 'O Gatobus chega quando você mais precisa.',          secondary: '— Totoro' },
      { primary: 'Pequeno gesto, grande efeito — como soot sprites.',  secondary: '' },
      { primary: 'A natureza tem ritmo. Respeita o teu.',              secondary: '— Studio Ghibli' },
    ],
    greeting: { primary: 'Headquarters online', secondary: '' },
    tags: { home: '💛 HEADQUARTERS · TOTORO 💛', workout: '🌳 FORÇA DA FLORESTA', nutri: '🌰 SEMENTES & LEMBRANÇAS', insights: '🧠 DIÁRIO DA MENTE', goals: '🌈 ILHAS DA PERSONALIDADE', dance: '🎵 GATOBUS · DANÇA 🎵' },
    labels: {
      finishBtn: 'Finalizar o dia',
      arsenal:   '🌳 CABANA DO TOTORO',
      footer:    '',
      register:  'Salvar lembranças do dia',
      logCta:    'Salvar lembranças do dia',
    },
    showKombatant: false,
    quests: [
      { id: 't2_em1',  text: 'Nomear a emoção dominante do dia',          xp: 1, tag: 'mente' },
      { id: 't2_em2',  text: '3 coisas pelas quais é grato (Alegria)',    xp: 1, tag: 'mente' },
      { id: 't2_em3',  text: 'Identificar 1 gatilho de Raiva e respirar', xp: 2, tag: 'mente' },
      { id: 't2_em4',  text: 'Validar a Tristeza por 5 min, sem fugir',   xp: 2, tag: 'mente' },
      { id: 't2_em5',  text: 'Fazer algo que dá Medo (pequeno passo)',    xp: 2, tag: 'mente' },
      { id: 't2_em6',  text: 'Limite com a Ansiedade — checklist do dia', xp: 2, tag: 'mente' },
      { id: 't2_em7',  text: 'Detectar 1 viés do Nojinho (preconceito)',  xp: 1, tag: 'mente' },
      { id: 't2_em8',  text: 'Ligar pra alguém que importa',              xp: 2, tag: 'mente' },
      { id: 't2_em9',  text: 'Escrever 1 lembrança-núcleo positiva',      xp: 1, tag: 'mente' },
      { id: 't2_em10', text: 'Identificar uma "Ilha" da personalidade hoje', xp: 1, tag: 'mente' },
      { id: 't2_em11', text: 'Diário de bordo: 5 min escrevendo o dia',   xp: 1, tag: 'mente' },
      { id: 't2_em12', text: 'Abraçar / acariciar alguém querido 30s',    xp: 1, tag: 'mente' },
      { id: 't2_em13', text: 'Ouvir música que combina com a emoção atual', xp: 1, tag: 'mente' },
      { id: 't2_em14', text: 'Pedir desculpa por algo pendente',          xp: 2, tag: 'mente' },
      { id: 't2_em15', text: 'Brincar como criança 10 min (sem propósito)', xp: 1, tag: 'mente' },
      { id: 't2_em16', text: 'Notar 5 coisas bonitas no caminho',         xp: 1, tag: 'mente' },
      { id: 't2_em17', text: 'Falar consigo no espelho com gentileza',    xp: 1, tag: 'mente' },
      { id: 't2_em18', text: 'Identificar 1 pensamento ansioso e questionar',xp: 2, tag: 'mente' },
      { id: 't2_em19', text: 'Assistir um filme da Pixar/Disney',         xp: 1, tag: 'lazer' },
      { id: 't2_em20', text: 'Rever fotos antigas (lembrança-núcleo)',    xp: 1, tag: 'mente' },
      // === Totoro / Studio Ghibli ===
      { id: 't2_tt1',  text: 'Assistir Meu Amigo Totoro (filme inteiro)', xp: 3, tag: 'lazer' },
      { id: 't2_tt2',  text: 'Assistir 1 filme do Studio Ghibli',         xp: 2, tag: 'lazer' },
      { id: 't2_tt3',  text: 'Ouvir trilha de Joe Hisaishi (30 min)',     xp: 1, tag: 'mente' },
      { id: 't2_tt4',  text: 'Caminhar na natureza (parque, mata, rio)',  xp: 2, tag: 'cardio' },
      { id: 't2_tt5',  text: 'Plantar 1 sementinha (ou regar uma planta)',xp: 2, tag: 'mente' },
      { id: 't2_tt6',  text: 'Brincar na chuva ou sentir gotas no rosto', xp: 1, tag: 'mente' },
      { id: 't2_tt7',  text: 'Observar 1 árvore por 5 min em silêncio',   xp: 1, tag: 'mente' },
      { id: 't2_tt8',  text: 'Comer milho assado ou doce caseiro',        xp: 1, tag: 'nutri' },
      { id: 't2_tt9',  text: 'Cochilo de tarde como o Totoro (15-20min)', xp: 1, tag: 'mente' },
      { id: 't2_tt10', text: 'Ler 1 livro infantil (resgate da criança)', xp: 1, tag: 'foco' },
      { id: 't2_tt11', text: 'Desenhar/rabiscar sem objetivo (10 min)',   xp: 1, tag: 'mente' },
      { id: 't2_tt12', text: 'Conhecer um animal — pet, passarinho, gato',xp: 1, tag: 'mente' },
      { id: 't2_tt13', text: 'Subir em algo alto (escada, morro, mirante)', xp: 2, tag: 'cardio' },
      { id: 't2_tt14', text: 'Pé descalço na grama / na terra 5 min',     xp: 1, tag: 'mente' },
      { id: 't2_tt15', text: 'Cozinhar refeição caseira pra família',     xp: 2, tag: 'nutri' },
      { id: 't2_tt16', text: 'Limpar 1 cantinho da casa (soot sprites)',  xp: 1, tag: 'mente' },
      { id: 't2_tt17', text: 'Esperar o ônibus / metrô olhando o céu',    xp: 1, tag: 'mente' },
      { id: 't2_tt18', text: 'Mandar carta/mensagem pra alguém distante', xp: 1, tag: 'mente' },
      { id: 't2_tt19', text: 'Identificar 3 sons da natureza onde está',  xp: 1, tag: 'mente' },
      { id: 't2_tt20', text: 'Pegar guarda-chuva e sair, mesmo nublado',  xp: 1, tag: 'mente' },
      { id: 't2_tt21', text: 'Fazer onigiri / bolinho de arroz',          xp: 2, tag: 'nutri' },
      { id: 't2_tt22', text: 'Visitar um avô/idoso da família',           xp: 2, tag: 'mente' },
      { id: 't2_tt23', text: 'Acordar antes do sol nascer e ver amanhecer', xp: 2, tag: 'mente' },
      { id: 't2_tt24', text: 'Banho de banheira c/ leitura (no-shower)',  xp: 1, tag: 'mente' },
      { id: 't2_tt25', text: 'Coletar algo da natureza (folha, pedra)',    xp: 1, tag: 'mente' },
    ],
    weeklyQuests: [
      { id: 'tw2_1', text: 'Check-in das 5 emoções em 5 dias',            xp: 10, target: 5 },
      { id: 'tw2_2', text: 'Diário de bordo em 4 dias diferentes',         xp: 9, target: 4 },
      { id: 'tw2_3', text: 'Validar a Tristeza em 3 momentos da semana',   xp: 8, target: 3 },
      { id: 'tw2_4', text: 'Pedir ajuda a alguém (Medo controlado)',       xp: 10, target: 1 },
      { id: 'tw2_5', text: '3 conversas sem celular nas refeições',        xp: 8, target: 3 },
      { id: 'tw2_6', text: 'Sessão de terapia ou journaling longa (1h)',   xp: 10, target: 1 },
      { id: 'tw2_7', text: 'Rever 3 lembranças-núcleo positivas',          xp: 7, target: 3 },
      // === Totoro / Ghibli ===
      { id: 'tw2_8', text: 'Assistir 2 filmes do Studio Ghibli',           xp: 10, target: 2 },
      { id: 'tw2_9', text: 'Caminhada na natureza 3x na semana',           xp: 11, target: 3 },
      { id: 'tw2_10',text: 'Regar / cuidar de planta 7 dias seguidos',     xp: 10, target: 7 },
      { id: 'tw2_11',text: '3 cochilos do Totoro (soneca 20min)',          xp:  8, target: 3 },
      { id: 'tw2_12',text: 'Cozinhar 3 refeições simples e caseiras',      xp: 10, target: 3 },
    ],
    rewards: [
      'Filme da Pixar (revisita uma alegria-núcleo)',
      'Meu Amigo Totoro (filme inteiro 86min)',
      'Maratona de filmes Ghibli',
      'Ouvir trilha de Joe Hisaishi com fone',
      'Sessão de música nostálgica',
      'Episódio leve de série confortável',
      'Diário de gratidão por 10 min',
      'Soneca de 20 min sem culpa (cochilo de Totoro)',
      'Carinho com seu pet ou planta por 15 min',
      'Sessão de desenho/escrita livre',
      'Tarde no parque/jardim sem celular',
      'Sentar embaixo de uma árvore por 30 min',
      'Sorvete artesanal num lugar bonito',
    ],
    challenges: [
      { id: 'io01', name: 'Check-in das 5 emoções', focus: 'mente · auto-conhecimento', xp: 3, icon: '🌈',
        sets: 'Liste rapidamente como Alegria, Tristeza, Raiva, Medo e Nojinho estão no nível 0–10.',
        tip: 'Sem julgamento — só medição. Padrões aparecem ao repetir.' },
      { id: 'io02', name: 'Sentar com a Tristeza', focus: 'mente · processamento', xp: 4, icon: '💙',
        sets: '10 min em silêncio com uma emoção difícil. Respira, observa, não foge.',
        tip: 'Tristeza compartilhada é processada. Pode chorar — é função, não falha.' },
      { id: 'io03', name: 'Risada genuína do dia', focus: 'mente · alegria', xp: 2, icon: '😄',
        sets: 'Encontre algo que faça você rir de verdade (vídeo, podcast, foto). Mande pra alguém.',
        tip: 'Rir libera endorfina e ativa "lembrança-núcleo" boa.' },
      { id: 'io04', name: 'Carta para o "eu de antes"', focus: 'mente · auto-compaixão', xp: 3, icon: '✉️',
        sets: 'Escreva 5 frases para o você de 1 ano atrás. O que dizer? O que mudou?',
        tip: 'Auto-compaixão é a Alegria abraçando a Tristeza.' },
      // === Desafios Totoro / Ghibli ===
      { id: 'io05', name: 'Banho de floresta', focus: 'mente · natureza', xp: 5, icon: '🌳',
        sets: '45 min de caminhada lenta numa área verde (parque, mata, beira de rio). Sem fone.',
        tip: 'Shinrin-yoku — banho de floresta. Reduz cortisol, ativa parassimpático.' },
      { id: 'io06', name: 'Cochilo do Totoro', focus: 'mente · descanso', xp: 3, icon: '😴',
        sets: 'Soneca de 20 min de tarde, deitado, sem despertador. Acorda quando o corpo quiser.',
        tip: 'Não é "preguiça" — é restauração. Totoro dorme. Você merece.' },
      { id: 'io07', name: 'Plantio de semente', focus: 'mente · paciência', xp: 4, icon: '🌱',
        sets: 'Plante uma semente (manjericão, suculenta, qualquer). Rega diariamente.',
        tip: 'A floresta cresceu pq alguém plantou e teve paciência. Vale pra você também.' },
      { id: 'io08', name: 'Tarde Ghibli', focus: 'lazer · estética', xp: 4, icon: '🎬',
        sets: '1 filme Studio Ghibli completo + comida caseira + bebida quente. Sem celular.',
        tip: 'Ritual de cuidado emocional. Ghibli ensina a desacelerar.' },
      { id: 'io09', name: 'Caminho de Mei e Satsuki', focus: 'mente · maravilhamento', xp: 3, icon: '🌸',
        sets: 'Caminhada de 30 min com olhar de criança — observe 5 detalhes que normalmente passa batido.',
        tip: 'Curiosidade é músculo. A magia tá sempre lá; ver é que escolha.' },
      { id: 'io10', name: 'Chuva sem fugir', focus: 'mente · presença', xp: 3, icon: '☔',
        sets: 'Saia (ou só sente perto da janela) na chuva por 10 min, sentindo som e cheiro.',
        tip: 'Como Mei esperando o Totoro: deixa a chuva ser parte do dia.' },
      { id: 'io11', name: 'Refeição caseira em silêncio', focus: 'nutri · atenção', xp: 3, icon: '🍙',
        sets: 'Prepare 1 refeição simples (onigiri, sopa, mingau) e coma sem TV/celular por 20 min.',
        tip: 'Atenção plena na comida = digestão melhor + percepção real de fome/saciedade.' },
      { id: 'io12', name: 'Visita ao avô / família distante', focus: 'mente · vínculo', xp: 5, icon: '🏡',
        sets: 'Liga, visita ou manda mensagem longa pra alguém da família que mora longe.',
        tip: 'Em Totoro, mãe doente é o pano de fundo. Família é raiz. Cultive.' },
    ],
  },

  fashion: {
    name: 'Moda & Estilo',
    short: 'FRONT ROW',
    sub: 'Curadoria, look do dia, estilo pessoal. Luxo minimalista.',
    accent: '#0F0F0F',
    accent2: '#D6A93E',
    quote: { primary: 'Estilo é dizer quem você é sem palavras.', secondary: '— Rachel Zoe' },
    quotes: [
      { primary: 'Estilo é dizer quem você é sem palavras.',           secondary: '— Rachel Zoe' },
      { primary: 'Fashion fades, only style remains.',                 secondary: '— Yves Saint Laurent' },
      { primary: 'Antes de sair, tire um acessório.',                  secondary: '— Coco Chanel' },
      { primary: 'Vista-se mal e lembrarão da roupa. Vista-se bem e lembrarão da mulher/homem.', secondary: '— Coco Chanel' },
      { primary: 'Roupa é arquitetura: tudo é proporção.',             secondary: '— Coco Chanel' },
      { primary: 'Elegância é recusa.',                                secondary: '— Coco Chanel' },
      { primary: 'Eu não desenho roupas. Eu desenho sonhos.',          secondary: '— Ralph Lauren' },
      { primary: 'Moda passa, estilo fica.',                           secondary: '' },
    ],
    greeting: { primary: 'Welcome to the runway', secondary: '' },
    tags: { home: '◆ FRONT ROW ◆', workout: '◆ POWER POSE ◆', nutri: '◆ HEALTHY FROM WITHIN ◆', insights: '◆ STYLE REPORT ◆', goals: '◆ SILHOUETTE GOALS ◆', dance: '◆ EDITORIAL POSE ◆' },
    labels: {
      finishBtn: 'Wrap the day',
      arsenal:   '◆ WARDROBE ◆',
      footer:    '',
      register:  'Encerrar look do dia',
      logCta:    'Encerrar look do dia',
    },
    showKombatant: false,
    quests: [
      // Look do dia
      { id: 't3_fm1',  text: 'Montar look do dia com 3 peças coerentes',   xp: 1, tag: 'estilo' },
      { id: 't3_fm2',  text: 'Acertar a cartela de cores do outfit',       xp: 1, tag: 'estilo' },
      { id: 't3_fm11', text: 'Provar 1 combinação que nunca tentou',       xp: 2, tag: 'estilo' },
      { id: 't3_fm20', text: 'Tirar foto OOTD com luz natural',            xp: 1, tag: 'estilo' },
      { id: 't3_fm21', text: 'Look monocromático completo (1 cor só)',     xp: 2, tag: 'estilo' },
      { id: 't3_fm22', text: 'Look com camada extra (jaqueta/blazer)',     xp: 1, tag: 'estilo' },
      { id: 't3_fm23', text: 'Mix de texturas: 3 texturas diferentes',     xp: 2, tag: 'estilo' },
      { id: 't3_fm24', text: 'Usar 1 acessório statement (estampa/cor)',   xp: 1, tag: 'estilo' },
      { id: 't3_fm25', text: 'Repetir uma peça em 3 looks diferentes',     xp: 2, tag: 'estilo' },
      // Closet & cuidado
      { id: 't3_fm3',  text: 'Polir e cuidar de 1 par de sapatos',         xp: 1, tag: 'closet' },
      { id: 't3_fm4',  text: 'Desencalhar 1 peça do guarda-roupa (usar)',  xp: 2, tag: 'closet' },
      { id: 't3_fm8',  text: 'Avaliar 3 peças: ficar, doar, ajustar',      xp: 2, tag: 'closet' },
      { id: 't3_fm12', text: 'Engraxar / escovar 1 acessório de couro',    xp: 1, tag: 'closet' },
      { id: 't3_fm15', text: 'Lavar/cuidar de 1 peça delicada à mão',      xp: 1, tag: 'closet' },
      { id: 't3_fm16', text: 'Inventariar 1 categoria do closet',          xp: 2, tag: 'closet' },
      { id: 't3_fm26', text: 'Passar a ferro 3 peças pendentes',           xp: 2, tag: 'closet' },
      { id: 't3_fm27', text: 'Dobrar e organizar 1 gaveta',                xp: 1, tag: 'closet' },
      { id: 't3_fm28', text: 'Pendurar peças do varal interno do closet',  xp: 1, tag: 'closet' },
      { id: 't3_fm29', text: 'Fotografar 5 peças pra catálogo digital',    xp: 2, tag: 'closet' },
      { id: 't3_fm30', text: 'Costurar botão / pequeno reparo numa peça',  xp: 2, tag: 'closet' },
      // Curadoria & estudo
      { id: 't3_fm5',  text: 'Mood-board: salvar 5 referências de looks',  xp: 1, tag: 'curadoria' },
      { id: 't3_fm6',  text: 'Estudar 1 designer (Margiela, McQueen...)',  xp: 2, tag: 'curadoria' },
      { id: 't3_fm7',  text: 'Ler editorial de moda (Vogue, BoF, Dazed)',  xp: 1, tag: 'foco' },
      { id: 't3_fm13', text: 'Estudar uma cartela de cores (Pantone)',     xp: 1, tag: 'curadoria' },
      { id: 't3_fm17', text: 'Identificar sua paleta sazonal',             xp: 2, tag: 'curadoria' },
      { id: 't3_fm19', text: 'Estudar 1 tecido (algodão pima, lã merino…)', xp: 1, tag: 'foco' },
      { id: 't3_fm31', text: 'Aprender 1 nó de gravata novo',              xp: 1, tag: 'curadoria' },
      { id: 't3_fm32', text: 'Pesquisar 1 movimento histórico (Bauhaus, Dior New Look)', xp: 2, tag: 'curadoria' },
      { id: 't3_fm33', text: 'Mapear 3 marcas brasileiras que admira',     xp: 2, tag: 'curadoria' },
      { id: 't3_fm34', text: 'Comparar versões de uma peça em 3 marcas',   xp: 1, tag: 'curadoria' },
      { id: 't3_fm35', text: 'Identificar a etiqueta de composição de 1 peça', xp: 1, tag: 'curadoria' },
      // Cultura & lazer
      { id: 't3_fm9',  text: 'Postura imponente — 5 min de power pose',    xp: 1, tag: 'mente' },
      { id: 't3_fm10', text: 'Ouvir podcast de moda 30 min',               xp: 2, tag: 'foco' },
      { id: 't3_fm14', text: 'Assistir 1 desfile (Vogue Runway, FF Channel)', xp: 1, tag: 'lazer' },
      { id: 't3_fm18', text: 'Documentário/biografia de designer (1 ep)',  xp: 2, tag: 'lazer' },
      { id: 't3_fm36', text: 'Episódio de Next in Fashion / Drag Race',    xp: 1, tag: 'lazer' },
      { id: 't3_fm37', text: 'Visitar loja só pra observar visual merch.', xp: 2, tag: 'curadoria' },
      { id: 't3_fm38', text: 'Pesquisar street style (Tokyo, Copenhagen)', xp: 1, tag: 'curadoria' },
      { id: 't3_fm39', text: 'Inspiração: 1 ícone de estilo do passado',   xp: 1, tag: 'curadoria' },
      { id: 't3_fm40', text: 'Postar OOTD/looks em rede sem editar muito', xp: 1, tag: 'lazer' },
    ],
    weeklyQuests: [
      { id: 'tw3_1', text: 'Usar 5 looks distintos com mesmas 7 peças',    xp: 10, target: 5 },
      { id: 'tw3_2', text: 'Organizar 1 categoria inteira do guarda-roupa', xp: 9, target: 1 },
      { id: 'tw3_3', text: 'Ler 1 livro/edição completa de moda',          xp: 10, target: 1 },
      { id: 'tw3_4', text: 'Identificar e listar 10 peças "core" do estilo', xp: 8, target: 10 },
      { id: 'tw3_5', text: '7 dias sem comprar — só usar o que já tem',     xp: 12, target: 7 },
      { id: 'tw3_6', text: 'Documentar progresso do estilo (5 fotos OOTD)', xp: 8, target: 5 },
      { id: 'tw3_7', text: 'Concluir 1 curso/aula curta de moda online',    xp: 10, target: 1 },
    ],
    rewards: [
      'Ir a uma loja só pra ver coleção (sem comprar)',
      'Vogue Runway por 30 min',
      'Episódio de Next in Fashion / Drag Race',
      'Documentário de moda (Dior, McQueen, Halston)',
      'Sessão de organização de guarda-roupa',
      'Comprar 1 peça curinga planejada',
      'Tarde em sebo de revistas de moda',
    ],
    challenges: [
      { id: 'fa01', name: 'Capsule 7-em-7', focus: 'estilo · curadoria', xp: 4, icon: '👔',
        sets: 'Defina 7 peças e monte 7 looks distintos pra semana, usando só elas.',
        tip: 'Treina senso de combinação — vê o real essencial do guarda-roupa.' },
      { id: 'fa02', name: 'Edição do closet (15 min)', focus: 'estilo · curadoria', xp: 3, icon: '🧺',
        sets: 'Escolha 1 categoria (camisetas, calças) e separe 3 piles: ficar, ajustar, doar.',
        tip: 'Se não usou em 12 meses, é estoque emocional. Solta.' },
      { id: 'fa03', name: 'Estudo de silhueta', focus: 'estilo · técnica', xp: 3, icon: '📐',
        sets: 'Identifique sua silhueta (V, retângulo, ampulheta...) e liste 5 peças que valorizam.',
        tip: 'Roupa é arquitetura — proporção importa mais que tendência.' },
      { id: 'fa04', name: 'Look reverso', focus: 'estilo · criatividade', xp: 3, icon: '🔄',
        sets: 'Monte um look usando peças que você NUNCA combinaria. Tira foto pra comparar.',
        tip: 'Quebra de padrão treina o olho. Pode dar errado — é parte do jogo.' },
      { id: 'fa05', name: 'Color story do dia', focus: 'estilo · cor', xp: 3, icon: '🎨',
        sets: 'Look com 3 tons da mesma família cromática (ex: cremes, azuis, terra).',
        tip: 'Color story domina o look — chega de "preto resolve tudo".' },
      { id: 'fa06', name: 'Sapato como protagonista', focus: 'estilo · acessório', xp: 3, icon: '👟',
        sets: 'Monte um look ao redor de 1 sapato statement. Resto neutro pra ele brilhar.',
        tip: 'Quem dita o look não precisa ser a peça maior.' },
      { id: 'fa07', name: 'Tecidos premium 1 dia', focus: 'estilo · técnica', xp: 4, icon: '🧵',
        sets: 'Vista só tecidos naturais por 1 dia (algodão, lã, linho, seda). Anota como se sente.',
        tip: 'Tecido bom muda postura — pele percebe.' },
      { id: 'fa08', name: 'Inventário fotográfico', focus: 'closet · curadoria', xp: 5, icon: '📸',
        sets: 'Fotografe todas as peças de 1 categoria com fundo neutro. Salva como catálogo.',
        tip: 'Só vendo tudo junto você nota o excesso e o que falta.' },
      { id: 'fa09', name: 'Visita ao espelho longo', focus: 'mente · presença', xp: 2, icon: '🪞',
        sets: '5 min olhando o look no espelho de corpo inteiro, sem celular. Ajusta detalhes.',
        tip: 'A diferença entre vestir e parecer bem é o tempo no espelho.' },
      { id: 'fa10', name: 'Conserto pendente', focus: 'closet · cuidado', xp: 3, icon: '🪡',
        sets: 'Resolva 1 reparo pendente (botão, bainha, etiqueta). Costure ou leva à lavanderia.',
        tip: 'Reparo a fazer cria culpa no closet. Resolve hoje.' },
      { id: 'fa11', name: 'Dia da repetição', focus: 'estilo · sustent.', xp: 3, icon: '♻️',
        sets: 'Repita uma peça usada essa semana. Reinventa com outra combinação.',
        tip: 'Combinação ≠ excesso de peças. Reuso é a base do estilo verdadeiro.' },
      { id: 'fa12', name: 'Garimpo brechó / 2nd hand', focus: 'curadoria · valor', xp: 4, icon: '🛍️',
        sets: '30 min em brechó/online vintage. Só observar, mapear marcas e preços.',
        tip: 'Sebo de roupa — desenvolve olho pra qualidade real.' },
    ],
  },

  futebol_lol: {
    name: 'Futebol & League of Legends',
    short: 'PITCH × RIFT',
    sub: 'Tática, jogo, esporte. Foco em competitividade e disciplina.',
    accent: '#1E5E2A',
    accent2: '#E84A1A',
    quote: { primary: 'A bola é redonda — e o Rift também.', secondary: '"Disciplina vence talento que não se esforça."' },
    quotes: [
      { primary: 'A bola é redonda — e o Rift também.',               secondary: '"Disciplina vence talento que não se esforça."' },
      { primary: 'Vencer é hábito. Perder também é.',                 secondary: '— Vince Lombardi' },
      { primary: 'Demoras 10 mil horas pra ficar bom em qualquer coisa.', secondary: '— Anders Ericsson' },
      { primary: 'O básico bem feito ganha jogo.',                    secondary: '' },
      { primary: 'Macro joga o jogo. Micro ganha a teamfight.',       secondary: '— LoL' },
      { primary: 'Treino duro, jogo fácil.',                          secondary: '' },
      { primary: 'O placar não mente — o esforço sim.',               secondary: '' },
      { primary: 'GG, EZ — só quando o placar fechar.',               secondary: '— LoL' },
    ],
    greeting: { primary: 'GG, vamos pro próximo jogo', secondary: '' },
    tags: { home: '⚽ KICKOFF ⚽', workout: '⚽ WARM-UP DRILL', nutri: '⚽ PRE-MATCH FUEL', insights: '⚽ POST-MATCH ANALYSIS', goals: '⚽ TEMPORADA GOALS', dance: '⚽ CELEBRATION DANCE' },
    labels: {
      finishBtn: 'APITO FINAL',
      arsenal:   '⚽ VESTIÁRIO ⚽',
      footer:    '',
      register:  'Encerrar partida do dia',
      logCta:    'Encerrar partida do dia',
    },
    showKombatant: false,
    quests: [
      // Futebol — bola na mesa
      { id: 't4_ft1',  text: 'Assistir 1 jogo de futebol (qualquer liga)',    xp: 1, tag: 'lazer' },
      { id: 't4_ft2',  text: 'Embaixadinhas — 50 sem cair',                   xp: 2, tag: 'futebol' },
      { id: 't4_ft3',  text: 'Corrida intervalada 20 min (sprint football)',  xp: 2, tag: 'cardio' },
      { id: 't4_ft10', text: 'Bater bola na pelada/futsal',                   xp: 2, tag: 'cardio' },
      { id: 't4_ft11', text: 'Treinar passe contra a parede 50x',             xp: 1, tag: 'futebol' },
      { id: 't4_ft15', text: 'Cabeceio repetido 30x (vela ou pêndulo)',       xp: 1, tag: 'futebol' },
      { id: 't4_ft16', text: 'Drill de finalização 10 min',                   xp: 2, tag: 'futebol' },
      { id: 't4_ft20', text: 'Jogar fora ao ar livre 30 min (qq esporte)',    xp: 2, tag: 'cardio' },
      { id: 't4_ft21', text: 'Treinar drible: cone simulado 10 reps',         xp: 2, tag: 'futebol' },
      { id: 't4_ft22', text: 'Cobrança de falta — 20 chutes',                 xp: 1, tag: 'futebol' },
      { id: 't4_ft23', text: 'Lateral longo — 10 cobranças',                  xp: 1, tag: 'futebol' },
      { id: 't4_ft24', text: 'Domínio com 3 partes do pé — 5 min',            xp: 1, tag: 'futebol' },
      { id: 't4_ft25', text: 'Trabalho de pé não-dominante 10 min',           xp: 2, tag: 'futebol' },
      { id: 't4_ft26', text: 'Defesa: 1×1 simulado contra parede',            xp: 1, tag: 'futebol' },
      // LoL / esports
      { id: 't4_ft5',  text: '1 partida ranked de LoL com foco',              xp: 2, tag: 'lol' },
      { id: 't4_ft6',  text: '1 ARAM/Normal Match de LoL',                    xp: 1, tag: 'lol' },
      { id: 't4_ft7',  text: 'Assistir 1 partida pro (LCK/LEC/LCS/CBLOL)',    xp: 1, tag: 'lazer' },
      { id: 't4_ft8',  text: 'Estudar champ pool — 1 build novo',             xp: 1, tag: 'lol' },
      { id: 't4_ft12', text: 'Last-hit practice tool 15 min',                 xp: 1, tag: 'lol' },
      { id: 't4_ft18', text: 'Coop com amigos: 2 partidas',                   xp: 1, tag: 'lol' },
      { id: 't4_ft19', text: 'Ler patch notes ou tabela do campeonato',       xp: 1, tag: 'foco' },
      { id: 't4_ft27', text: 'Treinar 1 combo de um champ novo',              xp: 2, tag: 'lol' },
      { id: 't4_ft28', text: 'Warding test: posicionar 5 wards por minuto',   xp: 2, tag: 'lol' },
      { id: 't4_ft29', text: 'Dodge skill shots — 10 min practice tool',      xp: 1, tag: 'lol' },
      { id: 't4_ft30', text: 'Aprender pingar (FF/ping coords) sem text',     xp: 1, tag: 'lol' },
      { id: 't4_ft31', text: 'Dueto duo-queue: 2 partidas',                   xp: 1, tag: 'lol' },
      { id: 't4_ft32', text: 'Aprender 1 matchup ruim — guia/Mobalytics',     xp: 2, tag: 'lol' },
      { id: 't4_ft33', text: 'Watch ban/pick de pro e replicar comp',         xp: 2, tag: 'lol' },
      // Estudo & análise
      { id: 't4_ft4',  text: 'Ler análise tática 1 partida',                  xp: 1, tag: 'foco' },
      { id: 't4_ft9',  text: 'VOD review da última partida (15min)',          xp: 2, tag: 'foco' },
      { id: 't4_ft13', text: 'Ouvir podcast de futebol/esports 30 min',       xp: 1, tag: 'foco' },
      { id: 't4_ft14', text: 'Estudar 1 jogador (Messi, Faker, Mané, Bel)',   xp: 1, tag: 'foco' },
      { id: 't4_ft17', text: 'Analisar replay próprio 15 min',                xp: 2, tag: 'foco' },
      { id: 't4_ft34', text: 'Acompanhar 1 transferência / janela aberta',    xp: 1, tag: 'foco' },
      { id: 't4_ft35', text: 'Estudar 1 esquema tático (4-3-3, 3-5-2…)',      xp: 2, tag: 'foco' },
      { id: 't4_ft36', text: 'Ver tier list atual do meta (LoL)',             xp: 1, tag: 'foco' },
      { id: 't4_ft37', text: 'Ler entrevista de coach (futebol ou esports)',  xp: 1, tag: 'foco' },
      { id: 't4_ft38', text: 'Pesquisar stats SofaScore/Op.GG sobre seu time/champ', xp: 1, tag: 'foco' },
      // Mente & comunidade
      { id: 't4_ft39', text: 'Sem flame em chat de LoL no dia (mute self)',   xp: 2, tag: 'mente' },
      { id: 't4_ft40', text: 'Pós-derrota: respira 3 min antes do próximo',   xp: 1, tag: 'mente' },
      { id: 't4_ft41', text: 'Vibrar com a vitória de outro jogador (assistir)', xp: 1, tag: 'lazer' },
      { id: 't4_ft42', text: 'Postar clip/jogada nas redes do clã/squad',     xp: 1, tag: 'lazer' },
      { id: 't4_ft43', text: 'Drink isotônico (Gatorade-like) pré-partida',   xp: 1, tag: 'nutri' },
      { id: 't4_ft44', text: 'Stretch de gamer: pulso/cervical 5 min',        xp: 1, tag: 'mente' },
    ],
    weeklyQuests: [
      { id: 'tw4_1', text: 'Subir 1 div de LoL (ou manter promo)',            xp: 12, target: 1 },
      { id: 'tw4_2', text: 'Jogar futebol/futsal 2x na semana',               xp: 10, target: 2 },
      { id: 'tw4_3', text: 'Maestria 4→5 em 1 champ',                          xp: 10, target: 1 },
      { id: 'tw4_4', text: 'Assistir 3 jogos do seu time/liga',               xp: 8, target: 3 },
      { id: 'tw4_5', text: 'VOD review próprio em 3 dias diferentes',         xp: 9, target: 3 },
      { id: 'tw4_6', text: 'Acompanhar tabela do campeonato a semana toda',    xp: 7, target: 7 },
      { id: 'tw4_7', text: 'Sem tilt: 0 partidas raivosas durante 5 dias',     xp: 10, target: 5 },
      { id: 'tw4_8', text: 'Treinar matchup desconfortável 3x',               xp: 9, target: 3 },
    ],
    rewards: [
      '1 partida ranked de LoL',
      '2 partidas de ARAM/Normal',
      'Maratona ProView/VOD de pro',
      'Jogo completo de futebol na TV',
      'Partida com os amigos no fim de semana',
      'Comprar skin nova quando bater promoção',
      'FIFA / EA FC por 1h',
    ],
    challenges: [
      { id: 'fl01', name: 'Warmup de jogador', focus: 'cardio · preparação', xp: 3, icon: '⚽',
        sets: '10 min de aquecimento dinâmico (skipping, mobilidade, sprint curto). Estilo profissional.',
        tip: 'Eleva FC, prepara articulação. Atletas profissionais não pulam.' },
      { id: 'fl02', name: 'Cooldown pós-jogo', focus: 'mobilidade · recuperação', xp: 2, icon: '🧊',
        sets: '15 min alongamento + foam roller após partida (de bola ou de LoL longa).',
        tip: 'Ergonomia de gamer também precisa — pescoço, punho, ombro.' },
      { id: 'fl03', name: 'Champion mastery focus', focus: 'lol · estudo', xp: 4, icon: '🧠',
        sets: '30 min em 1 champ só, com objetivo claro (combo, build, matchup). Anota 1 lição.',
        tip: 'Profundidade > variedade. Pro player conhece 3 champs muito bem.' },
      { id: 'fl04', name: 'Tactic study session', focus: 'futebol · análise', xp: 4, icon: '📋',
        sets: '20 min de análise tática (livro, vídeo de TacticalManager, podcast tático).',
        tip: 'Saber ler o jogo melhora seu próprio futsal/pelada.' },
      { id: 'fl05', name: 'Treino técnico do dia', focus: 'futebol · técnica', xp: 3, icon: '🦶',
        sets: '15 min de fundamento: 100 toques (passe interno, externo, peito do pé alternados).',
        tip: 'Toque sucessivo treina coordenação e propriocepção.' },
      { id: 'fl06', name: 'Last-hit drill (LoL)', focus: 'lol · técnica', xp: 3, icon: '🗡️',
        sets: 'Practice Tool 15 min: meta de 80 CS aos 10min só com auto-attack (sem habilidades).',
        tip: 'Last-hit é fundamento. Pro player erra raro.' },
      { id: 'fl07', name: 'Ranked focus run', focus: 'lol · competição', xp: 5, icon: '⬆️',
        sets: '3 partidas ranked seguidas com regra: 0 chat negativo, foco em farm/objetivo.',
        tip: 'Tilt é o algoritmo do MMR contra você. Disciplina ganha mais que skill.' },
      { id: 'fl08', name: 'Heading drill', focus: 'futebol · cabeceio', xp: 3, icon: '🤾',
        sets: '3×15 cabeceios contra parede ou bola na vela. Foque em testa, não cabeça.',
        tip: 'Cabeceio bom é técnica + timing, não força.' },
      { id: 'fl09', name: 'Watch like a pro', focus: 'análise · jogos', xp: 3, icon: '👀',
        sets: 'Assista 1 partida pro (futebol ou LoL) anotando 3 jogadas decisivas e por quê.',
        tip: 'Assistir analisando treina ler o jogo. Multiplica horas de prática.' },
      { id: 'fl10', name: 'Pelada do fim de semana', focus: 'cardio · jogo', xp: 6, icon: '🥅',
        sets: 'Reserva sábado ou domingo: 60min+ de bola, futsal, society ou pickup game.',
        tip: 'Jogar com pessoas > qualquer drill solo. Pratique tudo de uma vez.' },
      { id: 'fl11', name: 'Aim/click trainer', focus: 'lol · mecânica', xp: 3, icon: '🎯',
        sets: 'Aim Lab / Practice Tool 15 min: foco em mira de habilidade (skillshot prediction).',
        tip: 'Mecânica é o teto do seu rank. Cada % conta.' },
      { id: 'fl12', name: 'Sprint × jogada', focus: 'cardio · explosão', xp: 4, icon: '💨',
        sets: '8×30m sprint com 90s de pausa. Como num contra-ataque real.',
        tip: 'Velocidade explosiva é o que separa pelada de campeonato.' },
      { id: 'fl13', name: 'Drill de pé fraco', focus: 'futebol · simetria', xp: 4, icon: '🦵',
        sets: '20 min usando SÓ o pé não-dominante (passes, dribles, finalizações).',
        tip: 'Pé fraco bom dobra suas opções em campo. Frustra no início.' },
      { id: 'fl14', name: 'Build research', focus: 'lol · estudo', xp: 3, icon: '📚',
        sets: 'Estuda 2 builds atualizadas (U.gg, Mobalytics, OP.gg) do champ que mais joga.',
        tip: 'Meta muda toda patch. Builds desatualizadas custam jogos.' },
      { id: 'fl15', name: 'Anti-tilt protocol', focus: 'mente · resiliência', xp: 4, icon: '🧘',
        sets: 'Após cada derrota, levante-se, água, 60s de respiração. Decide se continua.',
        tip: 'Tilt queue é o pior inimigo. Pausa de 5min vale 1 vitória.' },
    ],
  },
};

function getTheme(state) {
  return THEMES[state?.user?.theme] || THEMES.kpop_anime;
}

// Banco de alimentos — macros por 100g.
// Mistura proteína-foco (cut/hipertrofia) + culinária BR + alguns coreanos.
// kcal / protein(g) / carbs(g) / fat(g) por 100g.
const FOOD_DB = [
  // ===== Proteínas =====
  { name: 'Peito de frango grelhado',  kcal: 165, p: 31,   c: 0,    f: 3.6,  cat: 'proteina', ko: '닭가슴살' },
  { name: 'Sobrecoxa de frango s/pele',kcal: 177, p: 24,   c: 0,    f: 8,    cat: 'proteina', ko: '닭다리살' },
  { name: 'Patinho moído cru',         kcal: 137, p: 21,   c: 0,    f: 5.6,  cat: 'proteina', ko: '소고기' },
  { name: 'Patinho moído grelhado',    kcal: 197, p: 27,   c: 0,    f: 9.5,  cat: 'proteina', ko: '소고기 구이' },
  { name: 'Contra-filé grelhado',      kcal: 232, p: 28,   c: 0,    f: 13,   cat: 'proteina', ko: '등심' },
  { name: 'Lombo suíno assado',        kcal: 173, p: 26,   c: 0,    f: 7,    cat: 'proteina', ko: '돼지고기' },
  { name: 'Ovo inteiro',               kcal: 155, p: 13,   c: 1.1,  f: 11,   cat: 'proteina', ko: '계란' },
  { name: 'Clara de ovo',              kcal: 52,  p: 11,   c: 0.7,  f: 0.2,  cat: 'proteina', ko: '흰자' },
  { name: 'Atum em água',              kcal: 116, p: 26,   c: 0,    f: 0.8,  cat: 'proteina', ko: '참치' },
  { name: 'Salmão grelhado',           kcal: 208, p: 22,   c: 0,    f: 13,   cat: 'proteina', ko: '연어' },
  { name: 'Tilápia grelhada',          kcal: 128, p: 26,   c: 0,    f: 2.7,  cat: 'proteina', ko: '틸라피아' },
  { name: 'Whey protein (1 scoop 30g)',kcal: 120, p: 24,   c: 3,    f: 1.5,  cat: 'proteina', ko: '웨이' },
  { name: 'Iogurte grego natural',     kcal: 59,  p: 10,   c: 3.6,  f: 0.4,  cat: 'proteina', ko: '그릭요거트' },
  { name: 'Cottage',                   kcal: 98,  p: 11,   c: 3.4,  f: 4.3,  cat: 'proteina', ko: '코티지' },
  { name: 'Tofu firme',                kcal: 144, p: 17,   c: 3,    f: 9,    cat: 'proteina', ko: '두부' },
  // ===== Carboidratos =====
  { name: 'Arroz branco cozido',       kcal: 130, p: 2.7,  c: 28,   f: 0.3,  cat: 'carb',     ko: '쌀밥' },
  { name: 'Arroz integral cozido',     kcal: 112, p: 2.6,  c: 24,   f: 0.9,  cat: 'carb',     ko: '현미' },
  { name: 'Batata-doce assada',        kcal: 90,  p: 2,    c: 21,   f: 0.1,  cat: 'carb',     ko: '고구마' },
  { name: 'Batata inglesa cozida',     kcal: 87,  p: 1.9,  c: 20,   f: 0.1,  cat: 'carb',     ko: '감자' },
  { name: 'Aveia em flocos',           kcal: 389, p: 17,   c: 66,   f: 7,    cat: 'carb',     ko: '오트밀' },
  { name: 'Pão integral',              kcal: 247, p: 13,   c: 41,   f: 3.4,  cat: 'carb',     ko: '통밀빵' },
  { name: 'Macarrão integral cozido',  kcal: 124, p: 5,    c: 26,   f: 0.5,  cat: 'carb',     ko: '파스타' },
  { name: 'Mandioca cozida',           kcal: 125, p: 0.6,  c: 30,   f: 0.3,  cat: 'carb',     ko: '카사바' },
  { name: 'Feijão preto cozido',       kcal: 132, p: 8.9,  c: 24,   f: 0.5,  cat: 'carb',     ko: '검정콩' },
  { name: 'Lentilha cozida',           kcal: 116, p: 9,    c: 20,   f: 0.4,  cat: 'carb',     ko: '렌틸' },
  { name: 'Tapioca',                   kcal: 95,  p: 0.5,  c: 22,   f: 0.1,  cat: 'carb',     ko: '타피오카' },
  // ===== Vegetais =====
  { name: 'Brócolis cozido',           kcal: 35,  p: 2.4,  c: 7,    f: 0.4,  cat: 'veg',      ko: '브로콜리' },
  { name: 'Couve refogada',            kcal: 28,  p: 1.9,  c: 5,    f: 0.4,  cat: 'veg',      ko: '케일' },
  { name: 'Espinafre cru',             kcal: 23,  p: 2.9,  c: 3.6,  f: 0.4,  cat: 'veg',      ko: '시금치' },
  { name: 'Cenoura crua',              kcal: 41,  p: 0.9,  c: 10,   f: 0.2,  cat: 'veg',      ko: '당근' },
  { name: 'Tomate',                    kcal: 18,  p: 0.9,  c: 3.9,  f: 0.2,  cat: 'veg',      ko: '토마토' },
  { name: 'Alface',                    kcal: 15,  p: 1.4,  c: 2.9,  f: 0.2,  cat: 'veg',      ko: '상추' },
  { name: 'Pepino',                    kcal: 16,  p: 0.7,  c: 3.6,  f: 0.1,  cat: 'veg',      ko: '오이' },
  { name: 'Abobrinha refogada',        kcal: 20,  p: 1.2,  c: 4,    f: 0.3,  cat: 'veg',      ko: '애호박' },
  { name: 'Kimchi',                    kcal: 23,  p: 1.6,  c: 4,    f: 0.5,  cat: 'veg',      ko: '김치' },
  { name: 'Pimentão',                  kcal: 31,  p: 1,    c: 6,    f: 0.3,  cat: 'veg',      ko: '피망' },
  // ===== Frutas =====
  { name: 'Banana',                    kcal: 89,  p: 1.1,  c: 23,   f: 0.3,  cat: 'fruta',    ko: '바나나' },
  { name: 'Maçã',                      kcal: 52,  p: 0.3,  c: 14,   f: 0.2,  cat: 'fruta',    ko: '사과' },
  { name: 'Mamão',                     kcal: 43,  p: 0.5,  c: 11,   f: 0.3,  cat: 'fruta',    ko: '파파야' },
  { name: 'Morango',                   kcal: 32,  p: 0.7,  c: 7.7,  f: 0.3,  cat: 'fruta',    ko: '딸기' },
  { name: 'Abacate',                   kcal: 160, p: 2,    c: 9,    f: 15,   cat: 'fruta',    ko: '아보카도' },
  { name: 'Manga',                     kcal: 60,  p: 0.8,  c: 15,   f: 0.4,  cat: 'fruta',    ko: '망고' },
  { name: 'Mirtilo',                   kcal: 57,  p: 0.7,  c: 14,   f: 0.3,  cat: 'fruta',    ko: '블루베리' },
  // ===== Gorduras boas =====
  { name: 'Azeite extravirgem',        kcal: 884, p: 0,    c: 0,    f: 100,  cat: 'gordura',  ko: '올리브 오일' },
  { name: 'Castanha-do-pará',          kcal: 656, p: 14,   c: 12,   f: 66,   cat: 'gordura',  ko: '브라질너트' },
  { name: 'Amêndoas',                  kcal: 579, p: 21,   c: 22,   f: 50,   cat: 'gordura',  ko: '아몬드' },
  { name: 'Pasta de amendoim',         kcal: 588, p: 25,   c: 20,   f: 50,   cat: 'gordura',  ko: '땅콩버터' },
  { name: 'Manteiga',                  kcal: 717, p: 0.9,  c: 0.1,  f: 81,   cat: 'gordura',  ko: '버터' },
  // ===== Pratos coreanos prontos (porção média estimada) =====
  { name: 'Bibimbap (1 tigela ~500g)', kcal: 560, p: 25,   c: 75,   f: 16,   cat: 'prato',    ko: '비빔밥' },
  { name: 'Kimbap (1 rolo ~250g)',     kcal: 480, p: 14,   c: 78,   f: 12,   cat: 'prato',    ko: '김밥' },
  { name: 'Tteokbokki (1 porção)',     kcal: 470, p: 9,    c: 90,   f: 7,    cat: 'prato',    ko: '떡볶이' },
  { name: 'Bulgogi (200g)',            kcal: 360, p: 30,   c: 8,    f: 22,   cat: 'prato',    ko: '불고기' },
  { name: 'Doenjang jjigae (300g)',    kcal: 180, p: 14,   c: 12,   f: 9,    cat: 'prato',    ko: '된장찌개' },
  { name: 'Japchae (1 porção)',        kcal: 420, p: 11,   c: 60,   f: 14,   cat: 'prato',    ko: '잡채' },
  // ===== Bebidas =====
  { name: 'Café preto sem açúcar',     kcal: 2,   p: 0.3,  c: 0,    f: 0,    cat: 'bebida',   ko: '커피' },
  { name: 'Chá verde',                 kcal: 1,   p: 0,    c: 0,    f: 0,    cat: 'bebida',   ko: '녹차' },
  { name: 'Leite desnatado',           kcal: 34,  p: 3.4,  c: 5,    f: 0.1,  cat: 'bebida',   ko: '저지방 우유' },
  { name: 'Leite integral',            kcal: 61,  p: 3.2,  c: 4.8,  f: 3.3,  cat: 'bebida',   ko: '우유' },
  { name: 'Café com leite (100ml)',    kcal: 60,  p: 3,    c: 7,    f: 2.5,  cat: 'bebida' },
  { name: 'Cappuccino (200ml)',        kcal: 90,  p: 5,    c: 9,    f: 4,    cat: 'bebida' },
  { name: 'Suco de laranja natural',   kcal: 45,  p: 0.7,  c: 10,   f: 0.2,  cat: 'bebida' },
  { name: 'Refrigerante cola (lata 350ml)', kcal: 39, p: 0, c: 10,  f: 0,    cat: 'bebida' },
  { name: 'Refrigerante zero',         kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Cerveja Pilsen',            kcal: 43,  p: 0.5,  c: 3.5,  f: 0,    cat: 'bebida' },
  { name: 'Vinho tinto',               kcal: 85,  p: 0.1,  c: 2.6,  f: 0,    cat: 'bebida' },
  { name: 'Soju coreano',              kcal: 110, p: 0,    c: 0,    f: 0,    cat: 'bebida',   ko: '소주' },
  { name: 'Energético (Red Bull lata)',kcal: 45,  p: 0,    c: 11,   f: 0,    cat: 'bebida' },
  { name: 'Whey + água (1 scoop 30g)', kcal: 120, p: 24,   c: 3,    f: 1.5,  cat: 'bebida' },

  // ===== "Erros" comuns / Fast food =====
  // (registrar mesmo quando não foi ideal — sem julgamento)
  { name: 'Pizza muçarela (1 fatia ~120g)', kcal: 270, p: 11, c: 33, f: 11,  cat: 'erro' },
  { name: 'Pizza calabresa (1 fatia)', kcal: 290, p: 12,   c: 32,   f: 13,   cat: 'erro' },
  { name: 'Pizza portuguesa (1 fatia)',kcal: 310, p: 14,   c: 30,   f: 16,   cat: 'erro' },
  { name: 'Hambúrguer pão+carne+queijo', kcal: 295, p: 17, c: 27,   f: 14,   cat: 'erro' },
  { name: 'Big Mac (1 unidade)',       kcal: 540, p: 25,   c: 45,   f: 28,   cat: 'erro' },
  { name: 'Whopper (1 unidade)',       kcal: 657, p: 28,   c: 49,   f: 40,   cat: 'erro' },
  { name: 'X-Burger lanchonete (~250g)',kcal: 600,p: 28,   c: 45,   f: 32,   cat: 'erro' },
  { name: 'X-Bacon (~280g)',           kcal: 720, p: 32,   c: 45,   f: 42,   cat: 'erro' },
  { name: 'Batata frita média (100g)', kcal: 312, p: 3.4,  c: 41,   f: 15,   cat: 'erro' },
  { name: 'Onion rings (100g)',        kcal: 411, p: 5,    c: 38,   f: 27,   cat: 'erro' },
  { name: 'Nuggets de frango (6un)',   kcal: 280, p: 13,   c: 18,   f: 17,   cat: 'erro' },
  { name: 'Hot-dog (1 unidade)',       kcal: 290, p: 11,   c: 24,   f: 17,   cat: 'erro' },
  { name: 'Coxinha frita (1un ~80g)',  kcal: 250, p: 8,    c: 22,   f: 14,   cat: 'erro' },
  { name: 'Pastel de carne (1un)',     kcal: 200, p: 8,    c: 18,   f: 11,   cat: 'erro' },
  { name: 'Pão de queijo (1un ~25g)',  kcal: 80,  p: 2.2,  c: 8,    f: 4.5,  cat: 'erro' },
  { name: 'Esfiha de carne (1un)',     kcal: 180, p: 8,    c: 22,   f: 6,    cat: 'erro' },
  { name: 'Quibe frito (1un)',         kcal: 150, p: 7,    c: 15,   f: 7,    cat: 'erro' },
  { name: 'Açaí com granola (300ml)',  kcal: 380, p: 4,    c: 65,   f: 10,   cat: 'erro' },
  { name: 'Açaí completo (500ml)',     kcal: 620, p: 6,    c: 100,  f: 18,   cat: 'erro' },
  { name: 'Sushi salmão (1un)',        kcal: 50,  p: 2,    c: 7,    f: 1.5,  cat: 'erro',     ko: '초밥' },
  { name: 'Temaki salmão (1un)',       kcal: 290, p: 14,   c: 35,   f: 10,   cat: 'erro',     ko: '데마키' },
  { name: 'Yakisoba frango (300g)',    kcal: 380, p: 18,   c: 55,   f: 9,    cat: 'erro',     ko: '야끼소바' },
  { name: 'Ramyeon coreano (1 pacote)',kcal: 500, p: 11,   c: 78,   f: 17,   cat: 'erro',     ko: '라면' },
  { name: 'Korean fried chicken (200g)',kcal: 480,p: 28,   c: 25,   f: 28,   cat: 'erro',     ko: '치킨' },
  { name: 'Tteokbokki picante (1 porção)', kcal: 470, p: 9, c: 90,  f: 7,    cat: 'erro',     ko: '떡볶이' },

  // ===== Doces e sobremesas =====
  { name: 'Chocolate ao leite (30g)',  kcal: 158, p: 2.3,  c: 17,   f: 9,    cat: 'doce' },
  { name: 'Chocolate amargo 70% (30g)',kcal: 170, p: 2.4,  c: 14,   f: 12,   cat: 'doce' },
  { name: 'Brigadeiro (1un ~20g)',     kcal: 65,  p: 1.4,  c: 11,   f: 2,    cat: 'doce' },
  { name: 'Bolo de chocolate (1 fatia)',kcal: 350,p: 5,    c: 50,   f: 15,   cat: 'doce' },
  { name: 'Sorvete de creme (100g)',   kcal: 207, p: 3.5,  c: 24,   f: 11,   cat: 'doce' },
  { name: 'Sorvete chocolate (100g)',  kcal: 216, p: 3.8,  c: 28,   f: 11,   cat: 'doce' },
  { name: 'Doce de leite (1 col sopa)',kcal: 95,  p: 1.7,  c: 17,   f: 2,    cat: 'doce' },
  { name: 'Pudim de leite (100g)',     kcal: 167, p: 5,    c: 26,   f: 5,    cat: 'doce' },
  { name: 'Biscoito recheado (1un)',   kcal: 70,  p: 0.9,  c: 10,   f: 3,    cat: 'doce' },
  { name: 'Cookie chocolate chip (1un)',kcal: 150,p: 2,    c: 20,   f: 7,    cat: 'doce' },
  { name: 'Bombom Sonho de Valsa (1un)',kcal: 75, p: 0.9,  c: 9,    f: 4,    cat: 'doce' },
  { name: 'Cheesecake (1 fatia ~100g)',kcal: 321, p: 6,    c: 26,   f: 22,   cat: 'doce' },
  { name: 'Mel (1 col sopa)',          kcal: 64,  p: 0.1,  c: 17,   f: 0,    cat: 'doce' },
  { name: 'Açúcar refinado (1 col sopa)', kcal: 60, p: 0,   c: 15,   f: 0,    cat: 'doce' },

  // ===== Snacks e biscoitos =====
  { name: 'Pão francês (1un ~50g)',    kcal: 150, p: 4,    c: 30,   f: 1.5,  cat: 'snack' },
  { name: 'Pão de forma (1 fatia)',    kcal: 70,  p: 2,    c: 13,   f: 1,    cat: 'snack' },
  { name: 'Biscoito água e sal (5un)', kcal: 110, p: 2,    c: 19,   f: 3,    cat: 'snack' },
  { name: 'Biscoito polvilho (10un)',  kcal: 80,  p: 0.5,  c: 18,   f: 0,    cat: 'snack' },
  { name: 'Batata Pringles (lata sm)', kcal: 535, p: 5,    c: 50,   f: 36,   cat: 'snack' },
  { name: 'Doritos (100g)',            kcal: 498, p: 7,    c: 64,   f: 23,   cat: 'snack' },
  { name: 'Pipoca microondas (100g)',  kcal: 480, p: 8,    c: 65,   f: 22,   cat: 'snack' },
  { name: 'Pipoca natural (100g)',     kcal: 387, p: 12,   c: 78,   f: 5,    cat: 'snack' },
  { name: 'Castanha-de-caju (30g)',    kcal: 165, p: 5,    c: 9,    f: 13,   cat: 'snack' },
  { name: 'Mix de nuts (30g)',         kcal: 175, p: 5,    c: 7,    f: 15,   cat: 'snack' },
  { name: 'Barra de cereal (1un)',     kcal: 90,  p: 1.5,  c: 16,   f: 2.5,  cat: 'snack' },
  { name: 'Barra de proteína (1un)',   kcal: 220, p: 20,   c: 22,   f: 7,    cat: 'snack' },

  // ===== Mais proteínas =====
  { name: 'Sardinha em lata (em óleo)',kcal: 208, p: 25,   c: 0,    f: 12,   cat: 'proteina' },
  { name: 'Atum em óleo',              kcal: 198, p: 29,   c: 0,    f: 8,    cat: 'proteina' },
  { name: 'Coxa de frango s/ pele',    kcal: 152, p: 21,   c: 0,    f: 7,    cat: 'proteina' },
  { name: 'Bacon (2 fatias ~20g)',     kcal: 81,  p: 6,    c: 0,    f: 6,    cat: 'proteina' },
  { name: 'Linguiça toscana (100g)',   kcal: 270, p: 14,   c: 1,    f: 23,   cat: 'proteina' },
  { name: 'Calabresa (100g)',          kcal: 305, p: 14,   c: 2,    f: 27,   cat: 'proteina' },
  { name: 'Salame italiano (50g)',     kcal: 170, p: 13,   c: 0.5,  f: 13,   cat: 'proteina' },
  { name: 'Presunto cozido (50g)',     kcal: 73,  p: 11,   c: 0.5,  f: 3,    cat: 'proteina' },
  { name: 'Queijo muçarela (50g)',     kcal: 140, p: 11,   c: 1,    f: 10,   cat: 'proteina' },
  { name: 'Queijo prato (50g)',        kcal: 180, p: 12,   c: 1,    f: 14,   cat: 'proteina' },
  { name: 'Queijo coalho (50g)',       kcal: 160, p: 14,   c: 1,    f: 11,   cat: 'proteina' },
  { name: 'Ricota (100g)',             kcal: 174, p: 11,   c: 3,    f: 13,   cat: 'proteina' },
  { name: 'Iogurte natural integral',  kcal: 62,  p: 3.5,  c: 4.7,  f: 3.3,  cat: 'proteina' },
  { name: 'Omelete 2 ovos',            kcal: 170, p: 12,   c: 1,    f: 13,   cat: 'proteina' },
  { name: 'Ovo mexido (2 ovos)',       kcal: 195, p: 13,   c: 1.5,  f: 15,   cat: 'proteina' },
  { name: 'Camarão grelhado',          kcal: 99,  p: 24,   c: 0.2,  f: 0.3,  cat: 'proteina' },

  // ===== Mais carboidratos e leguminosas =====
  { name: 'Grão-de-bico cozido',       kcal: 164, p: 9,    c: 27,   f: 2.6,  cat: 'carb' },
  { name: 'Quinoa cozida',             kcal: 120, p: 4.4,  c: 21,   f: 1.9,  cat: 'carb' },
  { name: 'Cuscuz nordestino',         kcal: 113, p: 3.5,  c: 24,   f: 0.5,  cat: 'carb' },
  { name: 'Farofa (1 col sopa)',       kcal: 50,  p: 0.6,  c: 7,    f: 2,    cat: 'carb' },
  { name: 'Polenta cozida',            kcal: 71,  p: 1.6,  c: 15,   f: 0.5,  cat: 'carb' },
  { name: 'Inhame cozido',             kcal: 97,  p: 1.5,  c: 23,   f: 0.2,  cat: 'carb' },

  // ===== Mais frutas =====
  { name: 'Laranja',                   kcal: 47,  p: 0.9,  c: 12,   f: 0.1,  cat: 'fruta' },
  { name: 'Pera',                      kcal: 57,  p: 0.4,  c: 15,   f: 0.1,  cat: 'fruta' },
  { name: 'Melancia',                  kcal: 30,  p: 0.6,  c: 8,    f: 0.2,  cat: 'fruta' },
  { name: 'Melão',                     kcal: 34,  p: 0.8,  c: 8,    f: 0.2,  cat: 'fruta' },
  { name: 'Abacaxi',                   kcal: 50,  p: 0.5,  c: 13,   f: 0.1,  cat: 'fruta' },
  { name: 'Uva',                       kcal: 69,  p: 0.7,  c: 18,   f: 0.2,  cat: 'fruta' },
  { name: 'Kiwi',                      kcal: 61,  p: 1.1,  c: 15,   f: 0.5,  cat: 'fruta' },
  { name: 'Pêssego',                   kcal: 39,  p: 0.9,  c: 10,   f: 0.3,  cat: 'fruta' },

  // ===== Suplementos =====
  { name: 'Creatina monoidratada (5g)',kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'BCAA (1 dose 10g)',         kcal: 40,  p: 10,   c: 0,    f: 0,    cat: 'supl' },
  { name: 'Glutamina (5g)',            kcal: 20,  p: 5,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'Caseína (30g)',             kcal: 110, p: 24,   c: 4,    f: 1,    cat: 'supl' },
  { name: 'Pré-treino (1 dose)',       kcal: 5,   p: 0,    c: 1,    f: 0,    cat: 'supl' },
  { name: 'Multivitamínico (1 cápsula)', kcal: 0, p: 0,    c: 0,    f: 0,    cat: 'supl' },

  // ===== Mais pratos coreanos =====
  { name: 'Mandu / dumpling (5un)',    kcal: 350, p: 14,   c: 38,   f: 16,   cat: 'prato',    ko: '만두' },
  { name: 'Kimchi jjigae (1 tigela)',  kcal: 245, p: 16,   c: 15,   f: 14,   cat: 'prato',    ko: '김치찌개' },
  { name: 'Samgyeopsal (200g porco)',  kcal: 520, p: 28,   c: 0,    f: 45,   cat: 'prato',    ko: '삼겹살' },
  { name: 'Kongguksu (sopa fria soja)',kcal: 380, p: 18,   c: 50,   f: 12,   cat: 'prato',    ko: '콩국수' },

  // ===== Mais proteínas =====
  { name: 'Whey isolado (1 scoop)',        kcal: 110, p: 27,   c: 1,    f: 0.5,  cat: 'proteina' },
  { name: 'Albumina (1 dose 10g)',         kcal: 38,  p: 8.4,  c: 0,    f: 0.3,  cat: 'proteina' },
  { name: 'Polvo grelhado',                kcal: 164, p: 30,   c: 4,    f: 2,    cat: 'proteina' },
  { name: 'Bife de fígado',                kcal: 175, p: 27,   c: 4,    f: 5,    cat: 'proteina' },
  { name: 'Almôndega bovina (4un)',        kcal: 245, p: 18,   c: 6,    f: 16,   cat: 'proteina' },
  { name: 'Iogurte natural light',         kcal: 41,  p: 4,    c: 5,    f: 0.5,  cat: 'proteina' },
  { name: 'Leite vegetal aveia',           kcal: 47,  p: 1,    c: 8,    f: 1.5,  cat: 'bebida' },
  { name: 'Leite vegetal amêndoas',        kcal: 17,  p: 0.6,  c: 0.6,  f: 1.4,  cat: 'bebida' },
  { name: 'Tofu mexido (scrambled)',       kcal: 144, p: 17,   c: 3,    f: 9,    cat: 'proteina',  ko: '두부 스크램블' },
  { name: 'Salmão sashimi (sem arroz)',    kcal: 208, p: 22,   c: 0,    f: 13,   cat: 'proteina',  ko: '사시미' },

  // ===== Mais vegetais e legumes =====
  { name: 'Beterraba cozida',              kcal: 43,  p: 1.6,  c: 10,   f: 0.2,  cat: 'veg' },
  { name: 'Couve-flor cozida',             kcal: 23,  p: 1.8,  c: 4.1,  f: 0.5,  cat: 'veg' },
  { name: 'Berinjela grelhada',            kcal: 25,  p: 1,    c: 6,    f: 0.2,  cat: 'veg' },
  { name: 'Abóbora cozida',                kcal: 26,  p: 1,    c: 6.5,  f: 0.1,  cat: 'veg' },
  { name: 'Chuchu cozido',                 kcal: 22,  p: 0.8,  c: 5,    f: 0.1,  cat: 'veg' },
  { name: 'Vagem cozida',                  kcal: 35,  p: 1.8,  c: 8,    f: 0.2,  cat: 'veg' },
  { name: 'Cogumelos (champignon)',        kcal: 22,  p: 3.1,  c: 3.3,  f: 0.3,  cat: 'veg' },
  { name: 'Quiabo refogado',               kcal: 33,  p: 1.9,  c: 7,    f: 0.2,  cat: 'veg' },

  // ===== Refeições prontas / pratos completos =====
  { name: 'Salada caesar com frango (1 prato)', kcal: 470, p: 32, c: 18, f: 28,   cat: 'prato' },
  { name: 'Salada de atum (1 prato)',      kcal: 280, p: 26,   c: 8,    f: 16,   cat: 'prato' },
  { name: 'Lasanha bolonhesa (1 fatia ~200g)', kcal: 360, p: 18, c: 32, f: 18,   cat: 'prato' },
  { name: 'Estrogonofe de frango (300g)',  kcal: 450, p: 30,   c: 18,   f: 28,   cat: 'prato' },
  { name: 'Risoto de cogumelos (300g)',    kcal: 380, p: 9,    c: 60,   f: 11,   cat: 'prato' },
  { name: 'Caldo de osso (bone broth 200ml)', kcal: 40, p: 8,   c: 1,    f: 0.5,  cat: 'bebida' },
  { name: 'Sopa de legumes (1 tigela)',    kcal: 120, p: 5,    c: 20,   f: 2,    cat: 'prato' },
  { name: 'Sopa creme de abóbora (300ml)', kcal: 180, p: 4,    c: 28,   f: 6,    cat: 'prato' },
  { name: 'Crepioca com queijo e ovo',     kcal: 260, p: 19,   c: 18,   f: 13,   cat: 'prato' },
  { name: 'Falafel (3 unidades)',          kcal: 200, p: 7,    c: 18,   f: 12,   cat: 'prato' },
  { name: 'Hummus (3 col sopa)',           kcal: 110, p: 4,    c: 9,    f: 6,    cat: 'snack' },
  { name: 'Aveia overnight (1 pote)',      kcal: 320, p: 14,   c: 48,   f: 8,    cat: 'snack' },
  { name: 'Mingau de aveia com banana',    kcal: 270, p: 9,    c: 50,   f: 4,    cat: 'snack' },
  { name: 'Smoothie banana + whey',        kcal: 270, p: 28,   c: 30,   f: 4,    cat: 'bebida' },
  { name: 'Vitamina banana + leite',       kcal: 220, p: 8,    c: 38,   f: 4.5,  cat: 'bebida' },

  // ===== Pão e snacks extras =====
  { name: 'Pão de hambúrguer (1un)',       kcal: 220, p: 7,    c: 38,   f: 4,    cat: 'snack' },
  { name: 'Wrap integral (1un)',           kcal: 195, p: 6,    c: 32,   f: 5,    cat: 'snack' },
  { name: 'Granola sem açúcar (40g)',      kcal: 160, p: 5,    c: 22,   f: 6,    cat: 'snack' },

  // ===== Expansão: Proteínas (cortes nobres + processados + variados) =====
  { name: 'Picanha grelhada',              kcal: 290, p: 26,   c: 0,    f: 21,   cat: 'proteina' },
  { name: 'Maminha grelhada',              kcal: 200, p: 27,   c: 0,    f: 10,   cat: 'proteina' },
  { name: 'Alcatra grelhada',              kcal: 219, p: 28,   c: 0,    f: 12,   cat: 'proteina' },
  { name: 'Costela bovina assada',         kcal: 330, p: 22,   c: 0,    f: 27,   cat: 'proteina' },
  { name: 'Acém / músculo cozido',         kcal: 191, p: 30,   c: 0,    f: 8,    cat: 'proteina' },
  { name: 'Carne seca dessalgada',         kcal: 200, p: 33,   c: 0,    f: 7,    cat: 'proteina' },
  { name: 'Hambúrguer caseiro 150g (só carne)', kcal: 270, p: 27, c: 0, f: 18,   cat: 'proteina' },
  { name: 'Filé mignon grelhado',          kcal: 200, p: 30,   c: 0,    f: 9,    cat: 'proteina' },
  { name: 'Coração de frango',             kcal: 153, p: 26,   c: 0.7,  f: 5,    cat: 'proteina' },
  { name: 'Moela de frango',               kcal: 94,  p: 17,   c: 0,    f: 2.5,  cat: 'proteina' },
  { name: 'Sobrecoxa de frango c/ pele',   kcal: 211, p: 22,   c: 0,    f: 13,   cat: 'proteina' },
  { name: 'Peito de peru defumado (50g)',  kcal: 50,  p: 9,    c: 1,    f: 1,    cat: 'proteina' },
  { name: 'Mortadela (50g)',               kcal: 155, p: 7,    c: 1.5,  f: 13,   cat: 'proteina' },
  { name: 'Salsicha (1un ~50g)',           kcal: 145, p: 6,    c: 2,    f: 13,   cat: 'proteina' },
  { name: 'Pernil suíno assado',           kcal: 207, p: 28,   c: 0,    f: 10,   cat: 'proteina' },
  { name: 'Costelinha suína',              kcal: 296, p: 22,   c: 0,    f: 23,   cat: 'proteina' },
  { name: 'Cordeiro grelhado',             kcal: 258, p: 26,   c: 0,    f: 17,   cat: 'proteina' },
  { name: 'Pato assado',                   kcal: 337, p: 19,   c: 0,    f: 28,   cat: 'proteina' },
  { name: 'Coelho grelhado',               kcal: 173, p: 33,   c: 0,    f: 3.5,  cat: 'proteina' },
  { name: 'Bife de panela',                kcal: 240, p: 28,   c: 2,    f: 13,   cat: 'proteina' },
  { name: 'Strogonoff de carne (300g)',    kcal: 470, p: 32,   c: 12,   f: 32,   cat: 'proteina' },
  { name: 'Frango xadrez (300g)',          kcal: 380, p: 28,   c: 22,   f: 18,   cat: 'proteina' },

  // ===== Expansão: Peixes e frutos do mar =====
  { name: 'Bacalhau cozido',               kcal: 105, p: 23,   c: 0,    f: 0.9,  cat: 'proteina' },
  { name: 'Pescada grelhada',              kcal: 90,  p: 19,   c: 0,    f: 1.3,  cat: 'proteina' },
  { name: 'Robalo grelhado',               kcal: 124, p: 23,   c: 0,    f: 2.8,  cat: 'proteina' },
  { name: 'Linguado grelhado',             kcal: 91,  p: 19,   c: 0,    f: 1.2,  cat: 'proteina' },
  { name: 'Truta grelhada',                kcal: 148, p: 21,   c: 0,    f: 6.6,  cat: 'proteina' },
  { name: 'Lula grelhada',                 kcal: 100, p: 16,   c: 3,    f: 1.4,  cat: 'proteina' },
  { name: 'Mexilhão cozido',               kcal: 86,  p: 12,   c: 4,    f: 2.2,  cat: 'proteina' },
  { name: 'Caranguejo cozido',             kcal: 87,  p: 18,   c: 0,    f: 1.1,  cat: 'proteina' },
  { name: 'Lagosta cozida',                kcal: 89,  p: 19,   c: 0,    f: 0.9,  cat: 'proteina' },
  { name: 'Ostras frescas (6un)',          kcal: 50,  p: 6,    c: 3,    f: 1.5,  cat: 'proteina' },
  { name: 'Sardinha fresca grelhada',      kcal: 208, p: 25,   c: 0,    f: 12,   cat: 'proteina' },
  { name: 'Cavala grelhada',               kcal: 305, p: 19,   c: 0,    f: 25,   cat: 'proteina' },
  { name: 'Anchova grelhada',              kcal: 131, p: 20,   c: 0,    f: 4.8,  cat: 'proteina' },
  { name: 'Camarão empanado (100g)',       kcal: 240, p: 18,   c: 18,   f: 12,   cat: 'erro' },

  // ===== Expansão: Carboidratos / cereais =====
  { name: 'Arroz parbolizado cozido',      kcal: 127, p: 2.6,  c: 27,   f: 0.5,  cat: 'carb' },
  { name: 'Arroz japonês (gohan) cozido',  kcal: 130, p: 2.7,  c: 28,   f: 0.3,  cat: 'carb',     ko: '쌀밥' },
  { name: 'Arroz com feijão (mistura)',    kcal: 126, p: 4.5,  c: 24,   f: 0.6,  cat: 'carb' },
  { name: 'Macarrão à bolonhesa (300g)',   kcal: 420, p: 22,   c: 50,   f: 14,   cat: 'prato' },
  { name: 'Macarrão alho e óleo (300g)',   kcal: 470, p: 11,   c: 70,   f: 14,   cat: 'prato' },
  { name: 'Espaguete branco cozido',       kcal: 158, p: 5.8,  c: 31,   f: 0.9,  cat: 'carb' },
  { name: 'Nhoque batata (200g)',          kcal: 270, p: 6,    c: 56,   f: 1,    cat: 'carb' },
  { name: 'Pirão',                         kcal: 130, p: 4,    c: 24,   f: 1,    cat: 'carb' },
  { name: 'Cará cozido',                   kcal: 108, p: 1.5,  c: 26,   f: 0.2,  cat: 'carb' },
  { name: 'Trigo para quibe cru',          kcal: 342, p: 12,   c: 76,   f: 1.5,  cat: 'carb' },
  { name: 'Cevadinha cozida',              kcal: 123, p: 2.3,  c: 28,   f: 0.4,  cat: 'carb' },
  { name: 'Centeio integral (50g)',        kcal: 168, p: 5,    c: 35,   f: 1.5,  cat: 'carb' },
  { name: 'Cuscuz marroquino cozido',      kcal: 112, p: 3.8,  c: 23,   f: 0.2,  cat: 'carb' },
  { name: 'Polenta frita',                 kcal: 145, p: 2,    c: 22,   f: 5,    cat: 'erro' },
  { name: 'Tapioca recheada queijo+ovo',   kcal: 270, p: 16,   c: 26,   f: 12,   cat: 'prato' },
  { name: 'Beiju grande de tapioca',       kcal: 200, p: 1,    c: 48,   f: 0.3,  cat: 'carb' },
  { name: 'Banana da terra frita',         kcal: 180, p: 1.2,  c: 32,   f: 6,    cat: 'erro' },
  { name: 'Pão de batata (1un)',           kcal: 200, p: 5,    c: 35,   f: 5,    cat: 'snack' },
  { name: 'Pão sírio (1un)',               kcal: 165, p: 5.5,  c: 33,   f: 1.5,  cat: 'snack' },
  { name: 'Pão ciabatta (1un)',            kcal: 250, p: 9,    c: 50,   f: 1.5,  cat: 'snack' },
  { name: 'Pão de centeio (1 fatia)',      kcal: 60,  p: 2,    c: 12,   f: 0.7,  cat: 'snack' },
  { name: 'Croissant simples (1un)',       kcal: 230, p: 5,    c: 26,   f: 12,   cat: 'erro' },
  { name: 'Croissant de chocolate (1un)',  kcal: 310, p: 6,    c: 32,   f: 18,   cat: 'erro' },
  { name: 'Donut glaçado (1un)',           kcal: 270, p: 4,    c: 31,   f: 14,   cat: 'erro' },
  { name: 'Bagel simples (1un)',           kcal: 245, p: 9,    c: 48,   f: 1.5,  cat: 'snack' },
  { name: 'Panqueca americana (1un)',      kcal: 175, p: 4,    c: 22,   f: 8,    cat: 'erro' },
  { name: 'Waffle (1un)',                  kcal: 220, p: 5,    c: 25,   f: 11,   cat: 'erro' },

  // ===== Expansão: Vegetais =====
  { name: 'Rúcula crua',                   kcal: 25,  p: 2.6,  c: 3.7,  f: 0.7,  cat: 'veg' },
  { name: 'Agrião cru',                    kcal: 11,  p: 2.3,  c: 1.3,  f: 0.1,  cat: 'veg' },
  { name: 'Repolho roxo',                  kcal: 31,  p: 1.4,  c: 7,    f: 0.2,  cat: 'veg' },
  { name: 'Repolho verde',                 kcal: 25,  p: 1.3,  c: 5.8,  f: 0.1,  cat: 'veg' },
  { name: 'Acelga cozida',                 kcal: 20,  p: 1.9,  c: 4,    f: 0.1,  cat: 'veg' },
  { name: 'Aspargos cozidos',              kcal: 22,  p: 2.4,  c: 4,    f: 0.2,  cat: 'veg' },
  { name: 'Aipo cru',                      kcal: 16,  p: 0.7,  c: 3,    f: 0.2,  cat: 'veg' },
  { name: 'Cogumelo shiitake',             kcal: 34,  p: 2.2,  c: 7,    f: 0.5,  cat: 'veg',      ko: '표고버섯' },
  { name: 'Cogumelo shimeji',              kcal: 26,  p: 2.7,  c: 4.6,  f: 0.3,  cat: 'veg' },
  { name: 'Brotos de feijão (moyashi)',    kcal: 30,  p: 3,    c: 6,    f: 0.2,  cat: 'veg',      ko: '숙주나물' },
  { name: 'Algas nori (5g)',               kcal: 12,  p: 2,    c: 1.5,  f: 0.2,  cat: 'veg',      ko: '김' },
  { name: 'Algas wakame (50g)',            kcal: 23,  p: 1.5,  c: 4.5,  f: 0.3,  cat: 'veg',      ko: '미역' },
  { name: 'Picles de pepino (50g)',        kcal: 6,   p: 0.3,  c: 1.2,  f: 0,    cat: 'veg' },
  { name: 'Azeitona verde (10un)',         kcal: 50,  p: 0.4,  c: 1.5,  f: 5,    cat: 'gordura' },
  { name: 'Azeitona preta (10un)',         kcal: 60,  p: 0.5,  c: 2,    f: 6,    cat: 'gordura' },
  { name: 'Palmito em conserva (100g)',    kcal: 26,  p: 2.6,  c: 4.6,  f: 0.2,  cat: 'veg' },
  { name: 'Milho cozido (1 espiga)',       kcal: 90,  p: 3.4,  c: 19,   f: 1.4,  cat: 'carb' },
  { name: 'Milho em lata (100g)',          kcal: 80,  p: 2.8,  c: 17,   f: 1,    cat: 'carb' },
  { name: 'Ervilha em lata (100g)',        kcal: 78,  p: 5,    c: 14,   f: 0.4,  cat: 'carb' },
  { name: 'Cebola crua',                   kcal: 40,  p: 1.1,  c: 9,    f: 0.1,  cat: 'veg' },
  { name: 'Cebola roxa',                   kcal: 42,  p: 1.2,  c: 10,   f: 0.1,  cat: 'veg' },
  { name: 'Alho cru (1 dente ~5g)',        kcal: 7,   p: 0.3,  c: 1.5,  f: 0,    cat: 'veg' },
  { name: 'Gengibre cru',                  kcal: 80,  p: 1.8,  c: 18,   f: 0.8,  cat: 'veg' },
  { name: 'Pimenta dedo-de-moça',          kcal: 40,  p: 1.9,  c: 9,    f: 0.4,  cat: 'veg' },
  { name: 'Rabanete',                      kcal: 16,  p: 0.7,  c: 3.4,  f: 0.1,  cat: 'veg' },
  { name: 'Nabo cozido',                   kcal: 22,  p: 0.7,  c: 5,    f: 0.1,  cat: 'veg' },

  // ===== Expansão: Frutas =====
  { name: 'Tangerina/mexerica',            kcal: 53,  p: 0.8,  c: 13,   f: 0.3,  cat: 'fruta' },
  { name: 'Limão (suco)',                  kcal: 22,  p: 0.4,  c: 7,    f: 0.2,  cat: 'fruta' },
  { name: 'Maracujá (polpa)',              kcal: 97,  p: 2.2,  c: 23,   f: 0.7,  cat: 'fruta' },
  { name: 'Goiaba',                        kcal: 68,  p: 2.6,  c: 14,   f: 1,    cat: 'fruta' },
  { name: 'Caqui',                         kcal: 70,  p: 0.6,  c: 19,   f: 0.2,  cat: 'fruta' },
  { name: 'Carambola',                     kcal: 31,  p: 1,    c: 7,    f: 0.3,  cat: 'fruta' },
  { name: 'Cereja',                        kcal: 50,  p: 1,    c: 12,   f: 0.3,  cat: 'fruta' },
  { name: 'Ameixa fresca',                 kcal: 46,  p: 0.7,  c: 11,   f: 0.3,  cat: 'fruta' },
  { name: 'Ameixa seca (5un)',             kcal: 120, p: 1.1,  c: 32,   f: 0.2,  cat: 'fruta' },
  { name: 'Uva-passa (30g)',               kcal: 90,  p: 0.9,  c: 24,   f: 0.1,  cat: 'fruta' },
  { name: 'Tâmara (5un ~40g)',             kcal: 110, p: 1,    c: 30,   f: 0.1,  cat: 'fruta' },
  { name: 'Damasco seco (5un)',            kcal: 60,  p: 1.5,  c: 15,   f: 0.1,  cat: 'fruta' },
  { name: 'Figo fresco (1un)',             kcal: 37,  p: 0.4,  c: 10,   f: 0.2,  cat: 'fruta' },
  { name: 'Figo seco (3un)',               kcal: 90,  p: 1,    c: 24,   f: 0.4,  cat: 'fruta' },
  { name: 'Coco fresco (50g)',             kcal: 175, p: 1.7,  c: 7.5,  f: 17,   cat: 'gordura' },
  { name: 'Açaí puro polpa (100g)',        kcal: 58,  p: 0.8,  c: 6.2,  f: 3.9,  cat: 'fruta' },
  { name: 'Pitaia (dragon fruit)',         kcal: 60,  p: 1.2,  c: 13,   f: 0.4,  cat: 'fruta' },
  { name: 'Romã (sementes 100g)',          kcal: 83,  p: 1.7,  c: 19,   f: 1.2,  cat: 'fruta' },
  { name: 'Lichia',                        kcal: 66,  p: 0.8,  c: 17,   f: 0.4,  cat: 'fruta',    ko: '리치' },
  { name: 'Cupuaçu (polpa 100g)',          kcal: 49,  p: 1.2,  c: 12,   f: 0.6,  cat: 'fruta' },
  { name: 'Açaí na tigela puro (300g)',    kcal: 175, p: 2.4,  c: 19,   f: 12,   cat: 'fruta' },
  { name: 'Caju (fruta)',                  kcal: 43,  p: 0.7,  c: 11,   f: 0.2,  cat: 'fruta' },
  { name: 'Framboesa',                     kcal: 52,  p: 1.2,  c: 12,   f: 0.7,  cat: 'fruta' },
  { name: 'Amora',                         kcal: 43,  p: 1.4,  c: 10,   f: 0.5,  cat: 'fruta' },
  { name: 'Jaca (gomo ~50g)',              kcal: 47,  p: 0.7,  c: 12,   f: 0.2,  cat: 'fruta' },

  // ===== Expansão: Gorduras / oleaginosas =====
  { name: 'Óleo de coco (1 col sopa)',     kcal: 120, p: 0,    c: 0,    f: 14,   cat: 'gordura' },
  { name: 'Óleo de soja (1 col sopa)',     kcal: 120, p: 0,    c: 0,    f: 14,   cat: 'gordura' },
  { name: 'Manteiga ghee (1 col sopa)',    kcal: 112, p: 0,    c: 0,    f: 13,   cat: 'gordura' },
  { name: 'Banha de porco (1 col sopa)',   kcal: 115, p: 0,    c: 0,    f: 13,   cat: 'gordura' },
  { name: 'Maionese (1 col sopa)',         kcal: 90,  p: 0.1,  c: 0.5,  f: 10,   cat: 'gordura' },
  { name: 'Maionese light (1 col sopa)',   kcal: 35,  p: 0.1,  c: 1.5,  f: 3,    cat: 'gordura' },
  { name: 'Nozes (30g)',                   kcal: 200, p: 4.6,  c: 4,    f: 20,   cat: 'gordura' },
  { name: 'Avelãs (30g)',                  kcal: 190, p: 4.5,  c: 5,    f: 18,   cat: 'gordura' },
  { name: 'Macadâmia (30g)',               kcal: 220, p: 2.3,  c: 4,    f: 23,   cat: 'gordura' },
  { name: 'Pinhão cozido (100g)',          kcal: 175, p: 3.4,  c: 35,   f: 1.4,  cat: 'carb' },
  { name: 'Pistache (30g)',                kcal: 170, p: 6,    c: 8,    f: 14,   cat: 'gordura' },
  { name: 'Semente de chia (1 col sopa)',  kcal: 70,  p: 2.5,  c: 6,    f: 4.5,  cat: 'gordura' },
  { name: 'Semente de linhaça (1 col sopa)', kcal: 60, p: 2,   c: 3,    f: 4.5,  cat: 'gordura' },
  { name: 'Semente de girassol (30g)',     kcal: 175, p: 6,    c: 6,    f: 15,   cat: 'gordura' },
  { name: 'Semente de abóbora (30g)',      kcal: 165, p: 9,    c: 5,    f: 14,   cat: 'gordura' },
  { name: 'Tahine (1 col sopa)',           kcal: 90,  p: 2.7,  c: 3,    f: 8,    cat: 'gordura' },

  // ===== Expansão: Laticínios =====
  { name: 'Queijo cottage light (100g)',   kcal: 72,  p: 12,   c: 3,    f: 1.4,  cat: 'proteina' },
  { name: 'Queijo minas frescal (50g)',    kcal: 120, p: 9,    c: 1.5,  f: 9,    cat: 'proteina' },
  { name: 'Queijo minas padrão (50g)',     kcal: 130, p: 11,   c: 1,    f: 10,   cat: 'proteina' },
  { name: 'Queijo provolone (50g)',        kcal: 175, p: 13,   c: 0.5,  f: 13,   cat: 'proteina' },
  { name: 'Queijo parmesão ralado (1 col)',kcal: 30,  p: 2.8,  c: 0.3,  f: 2,    cat: 'proteina' },
  { name: 'Queijo gorgonzola (30g)',       kcal: 105, p: 6,    c: 0.6,  f: 9,    cat: 'proteina' },
  { name: 'Queijo brie (30g)',             kcal: 100, p: 6,    c: 0.1,  f: 8,    cat: 'proteina' },
  { name: 'Queijo gouda (30g)',            kcal: 105, p: 7.5,  c: 0.7,  f: 8,    cat: 'proteina' },
  { name: 'Cream cheese (1 col sopa)',     kcal: 50,  p: 1,    c: 0.7,  f: 5,    cat: 'gordura' },
  { name: 'Requeijão (1 col sopa)',        kcal: 60,  p: 2,    c: 1,    f: 5,    cat: 'gordura' },
  { name: 'Iogurte de morango (100g)',     kcal: 85,  p: 3,    c: 14,   f: 1.5,  cat: 'proteina' },
  { name: 'Skyr natural (100g)',           kcal: 63,  p: 11,   c: 4,    f: 0.2,  cat: 'proteina' },
  { name: 'Kefir natural (200ml)',         kcal: 110, p: 8,    c: 9,    f: 4,    cat: 'bebida' },
  { name: 'Iogurte grego com mel (100g)',  kcal: 130, p: 7,    c: 18,   f: 3,    cat: 'proteina' },

  // ===== Expansão: Pratos brasileiros / regionais =====
  { name: 'Feijoada (1 porção 400g)',      kcal: 560, p: 30,   c: 40,   f: 28,   cat: 'prato' },
  { name: 'Moqueca de peixe (400g)',       kcal: 380, p: 32,   c: 8,    f: 24,   cat: 'prato' },
  { name: 'Acarajé com vatapá (1un)',      kcal: 360, p: 12,   c: 24,   f: 24,   cat: 'erro' },
  { name: 'Vaca atolada (300g)',           kcal: 380, p: 28,   c: 22,   f: 18,   cat: 'prato' },
  { name: 'Galinhada (300g)',              kcal: 420, p: 28,   c: 45,   f: 14,   cat: 'prato' },
  { name: 'Baião de dois (300g)',          kcal: 360, p: 14,   c: 50,   f: 10,   cat: 'prato' },
  { name: 'Tutu de feijão (200g)',         kcal: 260, p: 11,   c: 35,   f: 8,    cat: 'prato' },
  { name: 'Virado à paulista (400g)',      kcal: 580, p: 30,   c: 55,   f: 22,   cat: 'prato' },
  { name: 'Escondidinho carne seca (300g)',kcal: 450, p: 26,   c: 38,   f: 20,   cat: 'prato' },
  { name: 'Bobó de camarão (300g)',        kcal: 420, p: 22,   c: 32,   f: 22,   cat: 'prato' },
  { name: 'Caldo verde (300ml)',           kcal: 180, p: 6,    c: 22,   f: 7,    cat: 'prato' },
  { name: 'Canjica doce (200g)',           kcal: 290, p: 6,    c: 50,   f: 7,    cat: 'doce' },
  { name: 'Curau de milho (150g)',         kcal: 220, p: 4,    c: 38,   f: 6,    cat: 'doce' },
  { name: 'Salpicão (200g)',               kcal: 280, p: 14,   c: 18,   f: 18,   cat: 'prato' },
  { name: 'Empadão de frango (200g)',      kcal: 420, p: 14,   c: 40,   f: 22,   cat: 'erro' },
  { name: 'Quiche de queijo (1 fatia)',    kcal: 320, p: 11,   c: 22,   f: 21,   cat: 'erro' },

  // ===== Expansão: Pratos coreanos =====
  { name: 'Japchae (1 porção ~250g)',      kcal: 420, p: 11,   c: 60,   f: 14,   cat: 'prato',    ko: '잡채' },
  { name: 'Sundubu jjigae (1 tigela)',     kcal: 230, p: 18,   c: 12,   f: 13,   cat: 'prato',    ko: '순두부찌개' },
  { name: 'Gimbap atum (1 rolo)',          kcal: 460, p: 18,   c: 70,   f: 12,   cat: 'prato',    ko: '참치김밥' },
  { name: 'Bibimbap dolsot (1 tigela)',    kcal: 620, p: 27,   c: 80,   f: 20,   cat: 'prato',    ko: '돌솥비빔밥' },
  { name: 'Galbi (200g)',                  kcal: 480, p: 32,   c: 6,    f: 35,   cat: 'prato',    ko: '갈비' },
  { name: 'Dakgalbi (300g)',               kcal: 420, p: 28,   c: 20,   f: 24,   cat: 'prato',    ko: '닭갈비' },
  { name: 'Yangnyeom chicken (200g)',      kcal: 510, p: 25,   c: 38,   f: 28,   cat: 'erro',     ko: '양념치킨' },
  { name: 'Kimchi fried rice (300g)',      kcal: 480, p: 12,   c: 65,   f: 18,   cat: 'prato',    ko: '김치볶음밥' },
  { name: 'Bingsu (sobremesa 300g)',       kcal: 320, p: 6,    c: 60,   f: 7,    cat: 'doce',     ko: '빙수' },
  { name: 'Hotteok (1un)',                 kcal: 230, p: 4,    c: 38,   f: 7,    cat: 'doce',     ko: '호떡' },
  { name: 'Bungeoppang (1un)',             kcal: 200, p: 4,    c: 38,   f: 4,    cat: 'doce',     ko: '붕어빵' },
  { name: 'Soondae (200g)',                kcal: 360, p: 14,   c: 32,   f: 20,   cat: 'prato',    ko: '순대' },
  { name: 'Banchan misto (porção 100g)',   kcal: 80,  p: 3,    c: 8,    f: 4,    cat: 'veg',      ko: '반찬' },
  { name: 'Naengmyeon (sopa fria 1 porção)',kcal: 480,p: 18,   c: 80,   f: 7,    cat: 'prato',    ko: '냉면' },
  { name: 'Patbingsu doce (300g)',         kcal: 290, p: 5,    c: 58,   f: 5,    cat: 'doce',     ko: '팥빙수' },
  { name: 'Gyeranppang (pão de ovo)',      kcal: 220, p: 8,    c: 28,   f: 8,    cat: 'snack',    ko: '계란빵' },

  // ===== Expansão: Pratos asiáticos diversos =====
  { name: 'Sushi atum (1un)',              kcal: 48,  p: 2,    c: 7,    f: 1.2,  cat: 'erro',     ko: '초밥' },
  { name: 'Niguiri salmão (1un)',          kcal: 50,  p: 2.5,  c: 7,    f: 1.5,  cat: 'erro' },
  { name: 'Hot roll (4un)',                kcal: 380, p: 14,   c: 38,   f: 18,   cat: 'erro' },
  { name: 'Yakimeshi (300g)',              kcal: 430, p: 14,   c: 65,   f: 12,   cat: 'prato' },
  { name: 'Frango xadrez chinês (300g)',   kcal: 420, p: 26,   c: 30,   f: 20,   cat: 'prato' },
  { name: 'Frango agridoce (300g)',        kcal: 480, p: 22,   c: 50,   f: 20,   cat: 'erro' },
  { name: 'Pad thai (1 porção ~350g)',     kcal: 530, p: 18,   c: 70,   f: 19,   cat: 'prato' },
  { name: 'Curry tailandês frango (300g)', kcal: 420, p: 22,   c: 30,   f: 22,   cat: 'prato' },
  { name: 'Pho vietnamita (1 tigela)',     kcal: 350, p: 25,   c: 45,   f: 7,    cat: 'prato' },
  { name: 'Rolinho primavera (1un)',       kcal: 100, p: 2.5,  c: 14,   f: 4,    cat: 'erro' },
  { name: 'Harumaki (1un)',                kcal: 90,  p: 2,    c: 13,   f: 3.5,  cat: 'erro' },
  { name: 'Gyoza (5un)',                   kcal: 280, p: 11,   c: 30,   f: 13,   cat: 'erro' },
  { name: 'Ramen japonês (1 tigela)',      kcal: 480, p: 18,   c: 60,   f: 17,   cat: 'erro' },
  { name: 'Tempurá camarão (4un)',         kcal: 240, p: 11,   c: 18,   f: 13,   cat: 'erro' },
  { name: 'Curry indiano frango (300g)',   kcal: 380, p: 24,   c: 18,   f: 22,   cat: 'prato' },

  // ===== Expansão: Pratos ocidentais / fast food =====
  { name: 'Lasanha 4 queijos (200g)',      kcal: 420, p: 18,   c: 30,   f: 24,   cat: 'erro' },
  { name: 'Macarrão carbonara (300g)',     kcal: 540, p: 20,   c: 65,   f: 22,   cat: 'erro' },
  { name: 'Pizza marguerita (1 fatia)',    kcal: 250, p: 11,   c: 32,   f: 8,    cat: 'erro' },
  { name: 'Pizza pepperoni (1 fatia)',     kcal: 310, p: 13,   c: 33,   f: 14,   cat: 'erro' },
  { name: 'Pizza quatro queijos (1 fatia)',kcal: 320, p: 15,   c: 30,   f: 16,   cat: 'erro' },
  { name: 'Calzone (1un ~300g)',           kcal: 720, p: 28,   c: 80,   f: 28,   cat: 'erro' },
  { name: 'Cheeseburger McDonald s (1un)', kcal: 300, p: 15,   c: 32,   f: 13,   cat: 'erro' },
  { name: 'McChicken (1un)',               kcal: 400, p: 14,   c: 39,   f: 21,   cat: 'erro' },
  { name: 'Quarteirão (1un)',              kcal: 510, p: 26,   c: 41,   f: 26,   cat: 'erro' },
  { name: 'Frango assado (1 quarto ~250g)',kcal: 380, p: 45,   c: 0,    f: 22,   cat: 'proteina' },
  { name: 'Subway frango (15cm)',          kcal: 350, p: 25,   c: 47,   f: 5,    cat: 'prato' },
  { name: 'Subway frango teriyaki (15cm)', kcal: 380, p: 26,   c: 53,   f: 5,    cat: 'prato' },
  { name: 'Subway atum (15cm)',            kcal: 480, p: 20,   c: 44,   f: 25,   cat: 'erro' },
  { name: 'Burrito frango (1un)',          kcal: 580, p: 24,   c: 70,   f: 22,   cat: 'erro' },
  { name: 'Taco carne (1un)',              kcal: 220, p: 9,    c: 18,   f: 12,   cat: 'erro' },
  { name: 'Nachos com queijo (200g)',      kcal: 580, p: 14,   c: 60,   f: 32,   cat: 'erro' },
  { name: 'KFC balde frango (200g)',       kcal: 480, p: 30,   c: 18,   f: 30,   cat: 'erro' },
  { name: 'Wrap de frango (1un)',          kcal: 360, p: 22,   c: 38,   f: 12,   cat: 'prato' },

  // ===== Expansão: Snacks / lanches rápidos =====
  { name: 'Misto quente (1un)',            kcal: 280, p: 15,   c: 26,   f: 13,   cat: 'snack' },
  { name: 'X-salada lanchonete (~250g)',   kcal: 550, p: 26,   c: 42,   f: 30,   cat: 'erro' },
  { name: 'X-tudo lanchonete (~350g)',     kcal: 820, p: 38,   c: 50,   f: 50,   cat: 'erro' },
  { name: 'Sanduíche natural frango (1un)',kcal: 280, p: 22,   c: 28,   f: 9,    cat: 'snack' },
  { name: 'Sanduíche atum (1un)',          kcal: 310, p: 18,   c: 30,   f: 13,   cat: 'snack' },
  { name: 'Empada de frango (1un)',        kcal: 220, p: 8,    c: 22,   f: 11,   cat: 'erro' },
  { name: 'Risoles de queijo (1un)',       kcal: 180, p: 5,    c: 18,   f: 9,    cat: 'erro' },
  { name: 'Bolinho de bacalhau (1un)',     kcal: 180, p: 8,    c: 14,   f: 10,   cat: 'erro' },
  { name: 'Bolinho de arroz (1un)',        kcal: 130, p: 3,    c: 18,   f: 5,    cat: 'erro' },
  { name: 'Biscoito maizena (5un)',        kcal: 110, p: 1.5,  c: 19,   f: 3,    cat: 'doce' },
  { name: 'Biscoito wafer (4un)',          kcal: 160, p: 1,    c: 22,   f: 7,    cat: 'doce' },
  { name: 'Cracker integral (5un)',        kcal: 130, p: 3,    c: 20,   f: 4,    cat: 'snack' },
  { name: 'Torrada light (4un)',           kcal: 95,  p: 3.5,  c: 17,   f: 1,    cat: 'snack' },
  { name: 'Chips de batata-doce (50g)',    kcal: 240, p: 2.5,  c: 26,   f: 14,   cat: 'snack' },
  { name: 'Chips de mandioca (50g)',       kcal: 260, p: 2,    c: 30,   f: 14,   cat: 'snack' },
  { name: 'Tortilha de milho (1un)',       kcal: 60,  p: 1.6,  c: 13,   f: 0.6,  cat: 'snack' },
  { name: 'Pipoca doce (100g)',            kcal: 425, p: 5,    c: 80,   f: 12,   cat: 'erro' },

  // ===== Expansão: Doces / sobremesas =====
  { name: 'Mousse de chocolate (1 taça)',  kcal: 230, p: 4,    c: 22,   f: 14,   cat: 'doce' },
  { name: 'Mousse de maracujá (1 taça)',   kcal: 200, p: 4,    c: 28,   f: 8,    cat: 'doce' },
  { name: 'Petit gateau (1un)',            kcal: 450, p: 6,    c: 50,   f: 24,   cat: 'doce' },
  { name: 'Brownie (1un ~70g)',            kcal: 270, p: 3.5,  c: 35,   f: 14,   cat: 'doce' },
  { name: 'Torta de morango (1 fatia)',    kcal: 280, p: 4,    c: 38,   f: 13,   cat: 'doce' },
  { name: 'Torta de limão (1 fatia)',      kcal: 290, p: 4,    c: 40,   f: 13,   cat: 'doce' },
  { name: 'Beijinho (1un)',                kcal: 70,  p: 1,    c: 11,   f: 2.5,  cat: 'doce' },
  { name: 'Cajuzinho (1un)',               kcal: 80,  p: 1.5,  c: 10,   f: 4,    cat: 'doce' },
  { name: 'Olho-de-sogra (1un)',           kcal: 60,  p: 1,    c: 11,   f: 1.5,  cat: 'doce' },
  { name: 'Quindim (1un)',                 kcal: 145, p: 3,    c: 22,   f: 5,    cat: 'doce' },
  { name: 'Cocada cremosa (1 fatia ~50g)', kcal: 220, p: 1.5,  c: 30,   f: 11,   cat: 'doce' },
  { name: 'Paçoca (1un ~22g)',             kcal: 105, p: 2.5,  c: 13,   f: 5,    cat: 'doce' },
  { name: 'Pé de moleque (1un ~20g)',      kcal: 95,  p: 2.5,  c: 11,   f: 4.5,  cat: 'doce' },
  { name: 'Goiabada cascão (50g)',         kcal: 140, p: 0.4,  c: 34,   f: 0.1,  cat: 'doce' },
  { name: 'Romeu e Julieta (queijo+goiabada)', kcal: 280, p: 11, c: 35, f: 11,   cat: 'doce' },
  { name: 'Bolo de cenoura com cobertura', kcal: 330, p: 5,    c: 50,   f: 12,   cat: 'doce' },
  { name: 'Bolo de fubá (1 fatia)',        kcal: 260, p: 5,    c: 42,   f: 8,    cat: 'doce' },
  { name: 'Bolo de banana (1 fatia)',      kcal: 250, p: 4,    c: 40,   f: 9,    cat: 'doce' },
  { name: 'Sorvete açaí (100g)',           kcal: 170, p: 2,    c: 28,   f: 6,    cat: 'doce' },
  { name: 'Picolé de fruta (1un)',         kcal: 70,  p: 0.5,  c: 17,   f: 0,    cat: 'doce' },
  { name: 'Açaí com leite condensado (300ml)', kcal: 450, p: 6, c: 75,  f: 14,   cat: 'erro' },

  // ===== Expansão: Bebidas =====
  { name: 'Água com gás',                  kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Água de coco natural (200ml)',  kcal: 38,  p: 1.4,  c: 9,    f: 0.4,  cat: 'bebida' },
  { name: 'Suco verde (300ml)',            kcal: 80,  p: 2,    c: 18,   f: 0.5,  cat: 'bebida' },
  { name: 'Suco de uva integral (200ml)',  kcal: 130, p: 1,    c: 32,   f: 0.2,  cat: 'bebida' },
  { name: 'Suco de maracujá (300ml)',      kcal: 110, p: 1,    c: 27,   f: 0.3,  cat: 'bebida' },
  { name: 'Suco de abacaxi (300ml)',       kcal: 165, p: 1,    c: 40,   f: 0.3,  cat: 'bebida' },
  { name: 'Limonada com açúcar (300ml)',   kcal: 130, p: 0.2,  c: 33,   f: 0,    cat: 'bebida' },
  { name: 'Chá preto sem açúcar',          kcal: 1,   p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Chá mate gelado (300ml)',       kcal: 80,  p: 0,    c: 20,   f: 0,    cat: 'bebida' },
  { name: 'Matcha com leite (200ml)',      kcal: 150, p: 6,    c: 16,   f: 7,    cat: 'bebida',   ko: '말차' },
  { name: 'Cappuccino c/ açúcar (200ml)',  kcal: 110, p: 5,    c: 14,   f: 4,    cat: 'bebida' },
  { name: 'Latte (300ml)',                 kcal: 180, p: 8,    c: 16,   f: 9,    cat: 'bebida' },
  { name: 'Mocha (300ml)',                 kcal: 290, p: 9,    c: 36,   f: 11,   cat: 'bebida' },
  { name: 'Frappuccino caramelo (300ml)',  kcal: 380, p: 6,    c: 60,   f: 13,   cat: 'erro' },
  { name: 'Achocolatado pronto (200ml)',   kcal: 160, p: 6,    c: 28,   f: 3,    cat: 'bebida' },
  { name: 'Whisky dose 50ml',              kcal: 110, p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Vodka dose 50ml',               kcal: 95,  p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Cachaça dose 50ml',             kcal: 110, p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Caipirinha (1 copo)',           kcal: 240, p: 0,    c: 25,   f: 0,    cat: 'bebida' },
  { name: 'Cerveja IPA (lata 350ml)',      kcal: 70,  p: 0.5,  c: 6,    f: 0,    cat: 'bebida' },
  { name: 'Cerveja sem álcool (lata 350ml)',kcal: 30, p: 0.4,  c: 6,    f: 0,    cat: 'bebida' },
  { name: 'Vinho branco (taça 150ml)',     kcal: 85,  p: 0.1,  c: 2.5,  f: 0,    cat: 'bebida' },
  { name: 'Espumante / champagne (150ml)', kcal: 90,  p: 0.1,  c: 2,    f: 0,    cat: 'bebida' },
  { name: 'Gatorade (500ml)',              kcal: 130, p: 0,    c: 35,   f: 0,    cat: 'bebida' },
  { name: 'Isotônico zero (500ml)',        kcal: 10,  p: 0,    c: 2,    f: 0,    cat: 'bebida' },
  { name: 'Kombucha (300ml)',              kcal: 30,  p: 0,    c: 7,    f: 0,    cat: 'bebida' },

  // ===== Expansão: Suplementos / fitness =====
  { name: 'Whey hidrolisado (1 scoop 30g)',kcal: 115, p: 25,   c: 1.5,  f: 1,    cat: 'supl' },
  { name: 'Whey vegan ervilha (1 scoop)',  kcal: 120, p: 22,   c: 4,    f: 2,    cat: 'supl' },
  { name: 'Hipercalórico (1 dose 100g)',   kcal: 380, p: 30,   c: 60,   f: 3,    cat: 'supl' },
  { name: 'Maltodextrina (30g)',           kcal: 120, p: 0,    c: 30,   f: 0,    cat: 'supl' },
  { name: 'Waxy maize (30g)',              kcal: 117, p: 0,    c: 29,   f: 0,    cat: 'supl' },
  { name: 'Termogênico cápsula',           kcal: 5,   p: 0,    c: 1,    f: 0,    cat: 'supl' },
  { name: 'Ômega-3 cápsula',               kcal: 9,   p: 0,    c: 0,    f: 1,    cat: 'supl' },
  { name: 'Colágeno hidrolisado (10g)',    kcal: 36,  p: 9,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'Beta-alanina (3g)',             kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'L-carnitina (3g)',              kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'ZMA cápsula',                   kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'Probiótico cápsula',            kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },

  // ===== Expansão: Vegano / vegetariano =====
  { name: 'Hambúrguer vegetal (1un ~120g)',kcal: 220, p: 18,   c: 16,   f: 11,   cat: 'proteina' },
  { name: 'Falafel assado (3un)',          kcal: 180, p: 8,    c: 22,   f: 8,    cat: 'prato' },
  { name: 'Tempeh grelhado (100g)',        kcal: 192, p: 19,   c: 7,    f: 11,   cat: 'proteina' },
  { name: 'Seitan (100g)',                 kcal: 121, p: 25,   c: 4,    f: 0.5,  cat: 'proteina' },
  { name: 'PTS / proteína de soja (50g)',  kcal: 165, p: 26,   c: 15,   f: 1,    cat: 'proteina' },
  { name: 'Leite de soja (200ml)',         kcal: 80,  p: 7,    c: 6,    f: 4,    cat: 'bebida' },
  { name: 'Leite de coco (200ml)',         kcal: 350, p: 3,    c: 6,    f: 36,   cat: 'bebida' },
  { name: 'Iogurte de coco vegano (100g)', kcal: 70,  p: 1,    c: 8,    f: 4,    cat: 'proteina' },
  { name: 'Queijo vegano (50g)',           kcal: 130, p: 4,    c: 6,    f: 10,   cat: 'proteina' },

  // ===== Expansão: Molhos e condimentos =====
  { name: 'Ketchup (1 col sopa)',          kcal: 20,  p: 0.2,  c: 5,    f: 0,    cat: 'doce' },
  { name: 'Mostarda amarela (1 col sopa)', kcal: 10,  p: 0.6,  c: 0.6,  f: 0.6,  cat: 'gordura' },
  { name: 'Mostarda dijon (1 col sopa)',   kcal: 15,  p: 0.8,  c: 1,    f: 0.9,  cat: 'gordura' },
  { name: 'Molho shoyu (1 col sopa)',      kcal: 8,   p: 1.3,  c: 0.8,  f: 0,    cat: 'veg',      ko: '간장' },
  { name: 'Molho gochujang (1 col sopa)',  kcal: 30,  p: 1,    c: 6,    f: 0.5,  cat: 'veg',      ko: '고추장' },
  { name: 'Molho tarê (1 col sopa)',       kcal: 30,  p: 1,    c: 6,    f: 0,    cat: 'veg' },
  { name: 'Molho barbecue (1 col sopa)',   kcal: 30,  p: 0.2,  c: 7,    f: 0.1,  cat: 'doce' },
  { name: 'Molho tártaro (1 col sopa)',    kcal: 90,  p: 0.2,  c: 0.5,  f: 9,    cat: 'gordura' },
  { name: 'Molho rosé (1 col sopa)',       kcal: 80,  p: 0.2,  c: 2,    f: 8,    cat: 'gordura' },
  { name: 'Molho pesto (1 col sopa)',      kcal: 80,  p: 1,    c: 1,    f: 8,    cat: 'gordura' },
  { name: 'Molho tomate caseiro (100g)',   kcal: 35,  p: 1.5,  c: 7,    f: 0.5,  cat: 'veg' },
  { name: 'Vinagre balsâmico (1 col sopa)',kcal: 14,  p: 0,    c: 2.7,  f: 0,    cat: 'veg' },
  { name: 'Geleia de frutas (1 col sopa)', kcal: 50,  p: 0.1,  c: 13,   f: 0,    cat: 'doce' },

  // ============================================================
  // ===== EXPANSÃO MASSIVA — 500+ alimentos adicionais ==========
  // ============================================================

  // ===== Ovos — todas as variações =====
  { name: 'Ovo cozido (1 unidade)',           kcal: 78,  p: 6.3,  c: 0.6,  f: 5.3,  cat: 'proteina' },
  { name: 'Ovo cozido (2 unidades)',          kcal: 155, p: 13,   c: 1.1,  f: 11,   cat: 'proteina' },
  { name: 'Ovo cozido (3 unidades)',          kcal: 234, p: 19,   c: 1.7,  f: 16,   cat: 'proteina' },
  { name: 'Ovo de codorna cozido (5un)',      kcal: 70,  p: 6,    c: 0.5,  f: 5,    cat: 'proteina' },
  { name: 'Ovo poché / pochê (1un)',          kcal: 72,  p: 6.3,  c: 0.4,  f: 4.8,  cat: 'proteina' },
  { name: 'Ovo frito sem óleo (1un)',         kcal: 88,  p: 6.3,  c: 0.5,  f: 6.7,  cat: 'proteina' },
  { name: 'Ovo frito com óleo (1un)',         kcal: 110, p: 6.3,  c: 0.5,  f: 9,    cat: 'proteina' },
  { name: 'Ovo mexido c/ manteiga (2un)',     kcal: 220, p: 12,   c: 1.5,  f: 18,   cat: 'proteina' },
  { name: 'Omelete simples (2 ovos + sal)',   kcal: 160, p: 12,   c: 1,    f: 12,   cat: 'proteina' },
  { name: 'Omelete recheada queijo (2 ovos)', kcal: 270, p: 18,   c: 2,    f: 22,   cat: 'proteina' },
  { name: 'Omelete recheada frango (2 ovos)', kcal: 240, p: 22,   c: 1,    f: 16,   cat: 'proteina' },
  { name: 'Omelete legumes (2 ovos)',         kcal: 180, p: 13,   c: 5,    f: 13,   cat: 'proteina' },
  { name: 'Ovos benedict (1 unidade)',        kcal: 250, p: 12,   c: 16,   f: 16,   cat: 'prato' },
  { name: 'Ovo Florentine c/ espinafre',      kcal: 165, p: 11,   c: 4,    f: 12,   cat: 'prato' },
  { name: 'Frittata (1 fatia ~150g)',         kcal: 200, p: 14,   c: 5,    f: 14,   cat: 'prato' },

  // ===== Frango — preparos diversos =====
  { name: 'Frango grelhado fatias (200g)',    kcal: 330, p: 62,   c: 0,    f: 7.2,  cat: 'proteina' },
  { name: 'Frango assado c/ pele (100g)',     kcal: 250, p: 24,   c: 0,    f: 17,   cat: 'proteina' },
  { name: 'Frango cozido desfiado (100g)',    kcal: 144, p: 27,   c: 0,    f: 3.6,  cat: 'proteina' },
  { name: 'Filé de frango milanesa (100g)',   kcal: 230, p: 21,   c: 12,   f: 12,   cat: 'erro' },
  { name: 'Filé de frango à parmegiana (200g)', kcal: 450, p: 38, c: 18,   f: 25,   cat: 'erro' },
  { name: 'Frango ao curry (200g)',           kcal: 320, p: 28,   c: 8,    f: 19,   cat: 'prato' },
  { name: 'Frango ao molho branco (200g)',    kcal: 290, p: 24,   c: 8,    f: 17,   cat: 'prato' },
  { name: 'Frango xadrez chinês (300g)',      kcal: 420, p: 26,   c: 30,   f: 20,   cat: 'prato' },
  { name: 'Frango thai com leite de coco',    kcal: 380, p: 24,   c: 12,   f: 26,   cat: 'prato' },
  { name: 'Coxinha de frango (1un ~80g)',     kcal: 250, p: 8,    c: 22,   f: 14,   cat: 'erro' },
  { name: 'Asa de frango grelhada (3un)',     kcal: 270, p: 25,   c: 0,    f: 18,   cat: 'proteina' },
  { name: 'Asa de frango BBQ (3un)',          kcal: 320, p: 24,   c: 8,    f: 22,   cat: 'erro' },
  { name: 'Coração frango espetinho (5un)',   kcal: 220, p: 32,   c: 1,    f: 9,    cat: 'proteina' },
  { name: 'Sobrecoxa desossada grelhada',     kcal: 195, p: 23,   c: 0,    f: 11,   cat: 'proteina' },
  { name: 'Frango ao molho mostarda',         kcal: 240, p: 26,   c: 4,    f: 13,   cat: 'proteina' },

  // ===== Bovinos — cortes e preparos =====
  { name: 'Carne moída magra grelhada',       kcal: 175, p: 26,   c: 0,    f: 8,    cat: 'proteina' },
  { name: 'Carne moída temperada (100g)',     kcal: 220, p: 23,   c: 3,    f: 13,   cat: 'proteina' },
  { name: 'Bife de chã grelhado (150g)',      kcal: 330, p: 42,   c: 0,    f: 18,   cat: 'proteina' },
  { name: 'Bife de fígado acebolado',         kcal: 200, p: 24,   c: 6,    f: 8,    cat: 'proteina' },
  { name: 'Língua bovina cozida',             kcal: 280, p: 22,   c: 4,    f: 19,   cat: 'proteina' },
  { name: 'Cupim assado (100g)',              kcal: 280, p: 25,   c: 0,    f: 20,   cat: 'proteina' },
  { name: 'Fraldinha grelhada (100g)',        kcal: 240, p: 27,   c: 0,    f: 14,   cat: 'proteina' },
  { name: 'Costela cozida desfiada (100g)',   kcal: 270, p: 24,   c: 0,    f: 19,   cat: 'proteina' },
  { name: 'Ossobuco (200g com osso)',         kcal: 280, p: 28,   c: 4,    f: 17,   cat: 'proteina' },
  { name: 'Rabada cozida (200g)',             kcal: 360, p: 28,   c: 0,    f: 27,   cat: 'proteina' },
  { name: 'Carne de hambúrguer grelhado 150g',kcal: 280, p: 25,   c: 0,    f: 20,   cat: 'proteina' },
  { name: 'Almôndegas ao molho (200g)',       kcal: 320, p: 22,   c: 12,   f: 20,   cat: 'prato' },
  { name: 'Carpaccio bovino (100g)',          kcal: 160, p: 25,   c: 0.5,  f: 6,    cat: 'proteina' },
  { name: 'Picadinho de carne (200g)',        kcal: 320, p: 28,   c: 8,    f: 18,   cat: 'prato' },
  { name: 'Carne assada de panela (150g)',    kcal: 290, p: 30,   c: 4,    f: 16,   cat: 'proteina' },

  // ===== Suínos =====
  { name: 'Bisteca suína grelhada',           kcal: 240, p: 28,   c: 0,    f: 14,   cat: 'proteina' },
  { name: 'Pernil suíno fatiado (100g)',      kcal: 230, p: 27,   c: 0,    f: 13,   cat: 'proteina' },
  { name: 'Costela suína defumada',           kcal: 310, p: 22,   c: 0,    f: 25,   cat: 'proteina' },
  { name: 'Joelho de porco (eisbein)',        kcal: 290, p: 26,   c: 0,    f: 20,   cat: 'proteina' },
  { name: 'Linguiça calabresa fatiada (100g)',kcal: 305, p: 14,   c: 2,    f: 27,   cat: 'proteina' },
  { name: 'Salsicha hot dog (50g)',           kcal: 145, p: 6,    c: 2,    f: 13,   cat: 'proteina' },
  { name: 'Bacon canadense (50g)',            kcal: 90,  p: 12,   c: 1,    f: 4,    cat: 'proteina' },
  { name: 'Bacon defumado (50g)',             kcal: 220, p: 12,   c: 1,    f: 19,   cat: 'proteina' },
  { name: 'Presunto cru parma (50g)',         kcal: 130, p: 14,   c: 0,    f: 8,    cat: 'proteina' },
  { name: 'Copa suína (50g)',                 kcal: 180, p: 12,   c: 0,    f: 14,   cat: 'proteina' },

  // ===== Peixes e frutos do mar =====
  { name: 'Atum fresco sashimi (100g)',       kcal: 130, p: 28,   c: 0,    f: 1,    cat: 'proteina' },
  { name: 'Atum em água escorrido (100g)',    kcal: 116, p: 26,   c: 0,    f: 0.8,  cat: 'proteina' },
  { name: 'Atum em óleo escorrido (100g)',    kcal: 198, p: 29,   c: 0,    f: 8,    cat: 'proteina' },
  { name: 'Tilápia ao forno (100g)',          kcal: 128, p: 26,   c: 0,    f: 2.7,  cat: 'proteina' },
  { name: 'Pirarucu grelhado (100g)',         kcal: 120, p: 25,   c: 0,    f: 2,    cat: 'proteina' },
  { name: 'Tambaqui assado (100g)',           kcal: 140, p: 22,   c: 0,    f: 6,    cat: 'proteina' },
  { name: 'Bacalhau desfiado (100g)',         kcal: 290, p: 63,   c: 0,    f: 2.4,  cat: 'proteina' },
  { name: 'Sardinha no óleo (lata)',          kcal: 220, p: 25,   c: 0,    f: 13,   cat: 'proteina' },
  { name: 'Sardinha em tomate (lata)',        kcal: 180, p: 23,   c: 1,    f: 9,    cat: 'proteina' },
  { name: 'Salmão defumado (50g)',            kcal: 70,  p: 9,    c: 0,    f: 3.5,  cat: 'proteina' },
  { name: 'Salmão sashimi (100g)',            kcal: 208, p: 22,   c: 0,    f: 13,   cat: 'proteina' },
  { name: 'Pescada filé grelhado',            kcal: 90,  p: 19,   c: 0,    f: 1.3,  cat: 'proteina' },
  { name: 'Merluza filé (100g)',              kcal: 84,  p: 18,   c: 0,    f: 1.2,  cat: 'proteina' },
  { name: 'Robalo ao forno (100g)',           kcal: 124, p: 23,   c: 0,    f: 2.8,  cat: 'proteina' },
  { name: 'Camarão rosa grelhado (100g)',     kcal: 99,  p: 24,   c: 0.2,  f: 0.3,  cat: 'proteina' },
  { name: 'Camarão à milanesa (100g)',        kcal: 245, p: 18,   c: 18,   f: 12,   cat: 'erro' },
  { name: 'Camarão na moranga (200g)',        kcal: 280, p: 22,   c: 18,   f: 14,   cat: 'prato' },
  { name: 'Caranguejo cozido (100g)',         kcal: 87,  p: 18,   c: 0,    f: 1.1,  cat: 'proteina' },
  { name: 'Siri cozido (100g)',               kcal: 84,  p: 17,   c: 0,    f: 1.2,  cat: 'proteina' },
  { name: 'Lula recheada (100g)',             kcal: 175, p: 18,   c: 8,    f: 8,    cat: 'prato' },
  { name: 'Polvo à grega (100g)',             kcal: 175, p: 28,   c: 4,    f: 5,    cat: 'prato' },

  // ===== Laticínios — leites e iogurtes =====
  { name: 'Leite de vaca integral 200ml',     kcal: 122, p: 6.4,  c: 9.6,  f: 6.6,  cat: 'bebida' },
  { name: 'Leite de vaca semidesnatado 200ml',kcal: 90,  p: 6.4,  c: 9.6,  f: 3,    cat: 'bebida' },
  { name: 'Leite desnatado 200ml',            kcal: 68,  p: 6.8,  c: 10,   f: 0.2,  cat: 'bebida' },
  { name: 'Leite zero lactose 200ml',         kcal: 90,  p: 6.4,  c: 9.6,  f: 3,    cat: 'bebida' },
  { name: 'Leite condensado (1 col sopa)',    kcal: 60,  p: 1.5,  c: 11,   f: 1.5,  cat: 'doce' },
  { name: 'Creme de leite (1 col sopa)',      kcal: 50,  p: 0.5,  c: 1,    f: 5,    cat: 'gordura' },
  { name: 'Creme de leite light (1 col sopa)',kcal: 25,  p: 0.5,  c: 1,    f: 2,    cat: 'gordura' },
  { name: 'Iogurte natural integral 200g',    kcal: 125, p: 7,    c: 9.4,  f: 6.6,  cat: 'proteina' },
  { name: 'Iogurte natural desnatado 200g',   kcal: 80,  p: 7,    c: 10,   f: 0.5,  cat: 'proteina' },
  { name: 'Iogurte grego natural (170g)',     kcal: 100, p: 17,   c: 6,    f: 0.7,  cat: 'proteina' },
  { name: 'Iogurte grego sabor (170g)',       kcal: 150, p: 12,   c: 20,   f: 2,    cat: 'proteina' },
  { name: 'Iogurte com aveia (200g)',         kcal: 140, p: 6,    c: 24,   f: 2,    cat: 'proteina' },
  { name: 'Iogurte com frutas (170g)',        kcal: 145, p: 5,    c: 24,   f: 2.5,  cat: 'doce' },
  { name: 'Iogurte proteico (Whey 25g) 250g', kcal: 165, p: 25,   c: 12,   f: 1.5,  cat: 'proteina' },
  { name: 'Skyr islandês (170g)',             kcal: 107, p: 19,   c: 7,    f: 0.3,  cat: 'proteina' },
  { name: 'Kefir natural 200ml',              kcal: 110, p: 8,    c: 9,    f: 4,    cat: 'bebida' },
  { name: 'Bebida láctea morango (200ml)',    kcal: 130, p: 4,    c: 22,   f: 3,    cat: 'bebida' },
  { name: 'Bebida láctea chocolate (200ml)',  kcal: 155, p: 5,    c: 24,   f: 4,    cat: 'bebida' },
  { name: 'Coalhada (100g)',                  kcal: 70,  p: 4,    c: 5,    f: 4,    cat: 'proteina' },

  // ===== Queijos — variedades =====
  { name: 'Queijo mussarela fatia (30g)',     kcal: 85,  p: 7,    c: 0.5,  f: 6,    cat: 'proteina' },
  { name: 'Queijo prato fatia (30g)',         kcal: 108, p: 7,    c: 0.5,  f: 8.5,  cat: 'proteina' },
  { name: 'Queijo cheddar (30g)',             kcal: 120, p: 7,    c: 0.4,  f: 10,   cat: 'proteina' },
  { name: 'Queijo emental (30g)',             kcal: 115, p: 8.5,  c: 0.5,  f: 9,    cat: 'proteina' },
  { name: 'Queijo coalho assado (50g)',       kcal: 160, p: 14,   c: 1,    f: 11,   cat: 'proteina' },
  { name: 'Queijo de cabra (30g)',            kcal: 110, p: 7,    c: 0.5,  f: 9,    cat: 'proteina' },
  { name: 'Queijo brie (30g)',                kcal: 100, p: 6,    c: 0.1,  f: 8,    cat: 'proteina' },
  { name: 'Queijo camembert (30g)',           kcal: 90,  p: 6,    c: 0.5,  f: 7,    cat: 'proteina' },
  { name: 'Queijo gorgonzola (30g)',          kcal: 105, p: 6,    c: 0.6,  f: 9,    cat: 'proteina' },
  { name: 'Queijo parmesão lasca (10g)',      kcal: 40,  p: 3.5,  c: 0.3,  f: 2.7,  cat: 'proteina' },
  { name: 'Parmesão ralado (1 col)',          kcal: 25,  p: 2.5,  c: 0.2,  f: 1.7,  cat: 'proteina' },
  { name: 'Burrata (50g)',                    kcal: 165, p: 9,    c: 1,    f: 14,   cat: 'proteina' },
  { name: 'Ricota fresca (50g)',              kcal: 87,  p: 5.5,  c: 1.5,  f: 6.5,  cat: 'proteina' },
  { name: 'Cream cheese light (1 col sopa)',  kcal: 35,  p: 1,    c: 1.5,  f: 3,    cat: 'gordura' },
  { name: 'Cottage light (100g)',             kcal: 72,  p: 12,   c: 3,    f: 1.4,  cat: 'proteina' },
  { name: 'Requeijão light (1 col sopa)',     kcal: 35,  p: 1.5,  c: 1.5,  f: 2.5,  cat: 'gordura' },
  { name: 'Tofu silken (100g)',               kcal: 55,  p: 6,    c: 2,    f: 2.7,  cat: 'proteina' },

  // ===== Carboidratos — arroz e variantes =====
  { name: 'Arroz branco cozido (1 xícara)',   kcal: 200, p: 4,    c: 45,   f: 0.5,  cat: 'carb' },
  { name: 'Arroz integral (1 xícara)',        kcal: 215, p: 5,    c: 45,   f: 1.8,  cat: 'carb' },
  { name: 'Arroz 7 grãos cozido (100g)',      kcal: 118, p: 4,    c: 24,   f: 1,    cat: 'carb' },
  { name: 'Arroz negro cozido (100g)',        kcal: 125, p: 4,    c: 24,   f: 1.5,  cat: 'carb' },
  { name: 'Arroz vermelho cozido (100g)',     kcal: 122, p: 4,    c: 24,   f: 1.4,  cat: 'carb' },
  { name: 'Arroz selvagem cozido (100g)',     kcal: 101, p: 4,    c: 21,   f: 0.3,  cat: 'carb' },
  { name: 'Arroz à grega (1 colher)',         kcal: 150, p: 3,    c: 28,   f: 3,    cat: 'carb' },
  { name: 'Arroz com brócolis (100g)',        kcal: 135, p: 3.5,  c: 25,   f: 2,    cat: 'carb' },
  { name: 'Risoto de funghi (200g)',          kcal: 380, p: 8,    c: 55,   f: 13,   cat: 'prato' },
  { name: 'Risoto de camarão (200g)',         kcal: 360, p: 18,   c: 50,   f: 10,   cat: 'prato' },
  { name: 'Risoto de frango (200g)',          kcal: 340, p: 22,   c: 45,   f: 8,    cat: 'prato' },
  { name: 'Arroz biro-biro (200g)',           kcal: 360, p: 12,   c: 48,   f: 12,   cat: 'prato' },

  // ===== Massas =====
  { name: 'Espaguete cozido (100g)',          kcal: 158, p: 5.8,  c: 31,   f: 0.9,  cat: 'carb' },
  { name: 'Penne cozido (100g)',              kcal: 160, p: 5.7,  c: 32,   f: 0.7,  cat: 'carb' },
  { name: 'Fettuccine cozido (100g)',         kcal: 158, p: 6,    c: 30,   f: 0.9,  cat: 'carb' },
  { name: 'Lasagna folha cozida (100g)',      kcal: 130, p: 5,    c: 25,   f: 1,    cat: 'carb' },
  { name: 'Ravioli queijo (200g)',            kcal: 350, p: 14,   c: 50,   f: 10,   cat: 'prato' },
  { name: 'Ravioli carne (200g)',             kcal: 330, p: 16,   c: 45,   f: 9,    cat: 'prato' },
  { name: 'Macarrão integral cozido (100g)',  kcal: 124, p: 5,    c: 26,   f: 0.5,  cat: 'carb' },
  { name: 'Talharim caseiro (100g)',          kcal: 175, p: 6.5,  c: 32,   f: 1.5,  cat: 'carb' },
  { name: 'Capeletti cozido (100g)',          kcal: 270, p: 11,   c: 40,   f: 7,    cat: 'carb' },
  { name: 'Espaguete ao alho e óleo (250g)',  kcal: 470, p: 11,   c: 70,   f: 14,   cat: 'prato' },
  { name: 'Espaguete bolonhesa (300g)',       kcal: 480, p: 22,   c: 60,   f: 16,   cat: 'prato' },
  { name: 'Lasanha bolonhesa (200g)',         kcal: 360, p: 18,   c: 32,   f: 18,   cat: 'erro' },
  { name: 'Lasanha de berinjela (200g)',      kcal: 240, p: 11,   c: 18,   f: 14,   cat: 'prato' },
  { name: 'Macarronese / salada macarrão',    kcal: 220, p: 4,    c: 25,   f: 12,   cat: 'erro' },

  // ===== Pão e bolos =====
  { name: 'Pão francês (1un 50g)',            kcal: 135, p: 4,    c: 27,   f: 1.5,  cat: 'carb' },
  { name: 'Pão de forma branco (1 fatia)',    kcal: 70,  p: 2,    c: 13,   f: 1,    cat: 'carb' },
  { name: 'Pão de forma integral (1 fatia)',  kcal: 65,  p: 3,    c: 12,   f: 1,    cat: 'carb' },
  { name: 'Pão sírio (1un)',                  kcal: 165, p: 5.5,  c: 33,   f: 1.5,  cat: 'carb' },
  { name: 'Pão árabe integral (1un)',         kcal: 175, p: 6,    c: 32,   f: 2,    cat: 'carb' },
  { name: 'Pão ciabatta (1 fatia)',           kcal: 120, p: 4,    c: 24,   f: 1,    cat: 'carb' },
  { name: 'Pão australiano (1 fatia)',        kcal: 110, p: 3,    c: 20,   f: 1.5,  cat: 'carb' },
  { name: 'Pão de batata (1un)',              kcal: 200, p: 5,    c: 35,   f: 5,    cat: 'snack' },
  { name: 'Pão de queijo (1un médio 40g)',    kcal: 130, p: 3.5,  c: 13,   f: 7,    cat: 'snack' },
  { name: 'Pão de queijo grande (1un 80g)',   kcal: 260, p: 7,    c: 26,   f: 14,   cat: 'snack' },
  { name: 'Pão recheado leite/queijo (1un)',  kcal: 290, p: 8,    c: 45,   f: 9,    cat: 'snack' },
  { name: 'Croissant simples (1un)',          kcal: 230, p: 5,    c: 26,   f: 12,   cat: 'erro' },
  { name: 'Croissant queijo (1un)',           kcal: 280, p: 9,    c: 24,   f: 16,   cat: 'erro' },
  { name: 'Torrada integral (1un)',           kcal: 30,  p: 1,    c: 5,    f: 0.5,  cat: 'carb' },
  { name: 'Bolo simples baunilha (1 fatia)',  kcal: 270, p: 4,    c: 42,   f: 10,   cat: 'doce' },
  { name: 'Bolo de laranja (1 fatia)',        kcal: 250, p: 4,    c: 40,   f: 9,    cat: 'doce' },
  { name: 'Bolo de milho (1 fatia)',          kcal: 245, p: 4,    c: 38,   f: 9,    cat: 'doce' },
  { name: 'Bolo de chocolate caseiro (1 fatia)', kcal: 320, p: 5, c: 48,   f: 13,   cat: 'doce' },
  { name: 'Bolo nega maluca (1 fatia)',       kcal: 310, p: 5,    c: 50,   f: 11,   cat: 'doce' },
  { name: 'Bolo prestígio (1 fatia)',         kcal: 380, p: 5,    c: 55,   f: 16,   cat: 'doce' },
  { name: 'Bolo formigueiro (1 fatia)',       kcal: 280, p: 4,    c: 45,   f: 10,   cat: 'doce' },

  // ===== Cereais & granolas =====
  { name: 'Granola tradicional (40g)',        kcal: 180, p: 5,    c: 25,   f: 7,    cat: 'snack' },
  { name: 'Granola sem açúcar (40g)',         kcal: 160, p: 5,    c: 22,   f: 6,    cat: 'snack' },
  { name: 'Corn flakes (30g)',                kcal: 110, p: 2,    c: 25,   f: 0.5,  cat: 'snack' },
  { name: 'Sucrilhos (30g)',                  kcal: 115, p: 1.5,  c: 26,   f: 0.5,  cat: 'snack' },
  { name: 'NesFit cereal (30g)',              kcal: 110, p: 2,    c: 24,   f: 1,    cat: 'snack' },
  { name: 'Aveia em flocos finos (30g)',      kcal: 117, p: 5,    c: 20,   f: 2,    cat: 'carb' },
  { name: 'Farelo de aveia (1 col sopa)',     kcal: 25,  p: 1.5,  c: 4,    f: 0.5,  cat: 'carb' },
  { name: 'Farelo de trigo (1 col sopa)',     kcal: 18,  p: 1.5,  c: 3,    f: 0.3,  cat: 'carb' },
  { name: 'Mingau de aveia c/ leite (1 tigela)', kcal: 280, p: 12, c: 42, f: 7,     cat: 'prato' },
  { name: 'Mingau de Mucilon (200ml)',        kcal: 175, p: 4,    c: 30,   f: 4,    cat: 'doce' },
  { name: 'Smoothie aveia + banana (300ml)',  kcal: 280, p: 8,    c: 50,   f: 4,    cat: 'bebida' },
  { name: 'Açaí na tigela c/ granola (300g)', kcal: 450, p: 5,    c: 75,   f: 13,   cat: 'erro' },
  { name: 'Vitamina banana e aveia (300ml)',  kcal: 250, p: 9,    c: 42,   f: 5,    cat: 'bebida' },

  // ===== Tubérculos e raízes =====
  { name: 'Batata inglesa cozida (100g)',     kcal: 87,  p: 1.9,  c: 20,   f: 0.1,  cat: 'carb' },
  { name: 'Batata inglesa assada (100g)',     kcal: 95,  p: 2,    c: 21,   f: 0.2,  cat: 'carb' },
  { name: 'Batata frita média (100g)',        kcal: 312, p: 3.4,  c: 41,   f: 15,   cat: 'erro' },
  { name: 'Batata rústica forno (100g)',      kcal: 160, p: 3,    c: 25,   f: 6,    cat: 'carb' },
  { name: 'Purê de batata (100g)',            kcal: 105, p: 2,    c: 17,   f: 4,    cat: 'carb' },
  { name: 'Purê de batata-doce (100g)',       kcal: 100, p: 2,    c: 21,   f: 1,    cat: 'carb' },
  { name: 'Batata-doce roxa cozida (100g)',   kcal: 86,  p: 1.6,  c: 20,   f: 0.1,  cat: 'carb' },
  { name: 'Batata-doce frita (100g)',         kcal: 195, p: 2,    c: 30,   f: 8,    cat: 'erro' },
  { name: 'Mandioquinha cozida (100g)',       kcal: 100, p: 1.6,  c: 23,   f: 0.3,  cat: 'carb' },
  { name: 'Baroa / mandioquinha frita',       kcal: 250, p: 2,    c: 35,   f: 11,   cat: 'erro' },
  { name: 'Mandioca frita (100g)',            kcal: 280, p: 1,    c: 38,   f: 13,   cat: 'erro' },
  { name: 'Aipim frito (100g)',               kcal: 280, p: 1,    c: 38,   f: 13,   cat: 'erro' },
  { name: 'Inhame cozido (100g)',             kcal: 97,  p: 1.5,  c: 23,   f: 0.2,  cat: 'carb' },
  { name: 'Cará cozido (100g)',               kcal: 108, p: 1.5,  c: 26,   f: 0.2,  cat: 'carb' },
  { name: 'Beterraba cozida (100g)',          kcal: 43,  p: 1.6,  c: 10,   f: 0.2,  cat: 'veg' },
  { name: 'Cenoura cozida (100g)',            kcal: 35,  p: 0.8,  c: 8,    f: 0.2,  cat: 'veg' },
  { name: 'Rabanete cru (100g)',              kcal: 16,  p: 0.7,  c: 3.4,  f: 0.1,  cat: 'veg' },
  { name: 'Nabo cozido (100g)',               kcal: 22,  p: 0.7,  c: 5,    f: 0.1,  cat: 'veg' },

  // ===== Vegetais — folhas e legumes =====
  { name: 'Alface americana (100g)',          kcal: 12,  p: 0.9,  c: 2.3,  f: 0.1,  cat: 'veg' },
  { name: 'Alface lisa (100g)',               kcal: 15,  p: 1.4,  c: 2.9,  f: 0.2,  cat: 'veg' },
  { name: 'Alface crespa (100g)',             kcal: 14,  p: 1.4,  c: 2.5,  f: 0.2,  cat: 'veg' },
  { name: 'Alface roxa (100g)',               kcal: 16,  p: 1.3,  c: 2.3,  f: 0.2,  cat: 'veg' },
  { name: 'Rúcula crua (100g)',               kcal: 25,  p: 2.6,  c: 3.7,  f: 0.7,  cat: 'veg' },
  { name: 'Agrião cru (100g)',                kcal: 11,  p: 2.3,  c: 1.3,  f: 0.1,  cat: 'veg' },
  { name: 'Espinafre cru (100g)',             kcal: 23,  p: 2.9,  c: 3.6,  f: 0.4,  cat: 'veg' },
  { name: 'Espinafre refogado (100g)',        kcal: 50,  p: 3,    c: 4,    f: 3,    cat: 'veg' },
  { name: 'Couve manteiga refogada (100g)',   kcal: 50,  p: 3,    c: 5,    f: 3,    cat: 'veg' },
  { name: 'Couve crespa crua (100g)',         kcal: 27,  p: 3,    c: 4.4,  f: 0.4,  cat: 'veg' },
  { name: 'Kale crua (100g)',                 kcal: 49,  p: 4.3,  c: 8.8,  f: 0.9,  cat: 'veg' },
  { name: 'Repolho roxo (100g)',              kcal: 31,  p: 1.4,  c: 7,    f: 0.2,  cat: 'veg' },
  { name: 'Repolho verde refogado (100g)',    kcal: 35,  p: 1.4,  c: 7,    f: 0.6,  cat: 'veg' },
  { name: 'Acelga cozida (100g)',             kcal: 20,  p: 1.9,  c: 4,    f: 0.1,  cat: 'veg' },
  { name: 'Endívia (100g)',                   kcal: 17,  p: 1.2,  c: 3.4,  f: 0.2,  cat: 'veg' },
  { name: 'Almeirão (100g)',                  kcal: 21,  p: 2,    c: 4,    f: 0.3,  cat: 'veg' },
  { name: 'Chicória (100g)',                  kcal: 23,  p: 1.7,  c: 4.7,  f: 0.3,  cat: 'veg' },
  { name: 'Brócolis cozido (100g)',           kcal: 35,  p: 2.4,  c: 7,    f: 0.4,  cat: 'veg' },
  { name: 'Brócolis no vapor (100g)',         kcal: 33,  p: 2.4,  c: 6.5,  f: 0.4,  cat: 'veg' },
  { name: 'Couve-flor cozida (100g)',         kcal: 23,  p: 1.8,  c: 4.1,  f: 0.5,  cat: 'veg' },
  { name: 'Couve-flor gratinada (100g)',      kcal: 140, p: 7,    c: 6,    f: 10,   cat: 'prato' },
  { name: 'Berinjela grelhada (100g)',        kcal: 25,  p: 1,    c: 6,    f: 0.2,  cat: 'veg' },
  { name: 'Berinjela à milanesa (100g)',      kcal: 165, p: 4,    c: 18,   f: 9,    cat: 'erro' },
  { name: 'Caponata de berinjela (100g)',     kcal: 90,  p: 1.5,  c: 8,    f: 6,    cat: 'veg' },
  { name: 'Abobrinha grelhada (100g)',        kcal: 22,  p: 1.2,  c: 4,    f: 0.3,  cat: 'veg' },
  { name: 'Abóbora cozida (100g)',            kcal: 26,  p: 1,    c: 6.5,  f: 0.1,  cat: 'veg' },
  { name: 'Abóbora gratinada (100g)',         kcal: 110, p: 4,    c: 12,   f: 5,    cat: 'prato' },
  { name: 'Pepino (100g)',                    kcal: 16,  p: 0.7,  c: 3.6,  f: 0.1,  cat: 'veg' },
  { name: 'Tomate cereja (100g)',             kcal: 18,  p: 0.9,  c: 3.9,  f: 0.2,  cat: 'veg' },
  { name: 'Tomate italiano (100g)',           kcal: 18,  p: 0.9,  c: 3.9,  f: 0.2,  cat: 'veg' },
  { name: 'Pimentão vermelho (100g)',         kcal: 31,  p: 1,    c: 6,    f: 0.3,  cat: 'veg' },
  { name: 'Pimentão amarelo (100g)',          kcal: 27,  p: 1,    c: 6.3,  f: 0.2,  cat: 'veg' },
  { name: 'Pimentão verde (100g)',            kcal: 20,  p: 0.9,  c: 4.7,  f: 0.2,  cat: 'veg' },
  { name: 'Quiabo refogado (100g)',           kcal: 33,  p: 1.9,  c: 7,    f: 0.2,  cat: 'veg' },
  { name: 'Vagem cozida (100g)',              kcal: 35,  p: 1.8,  c: 8,    f: 0.2,  cat: 'veg' },
  { name: 'Ervilha torta cozida (100g)',      kcal: 42,  p: 3,    c: 7.5,  f: 0.2,  cat: 'veg' },
  { name: 'Ervilha em lata (100g)',           kcal: 78,  p: 5,    c: 14,   f: 0.4,  cat: 'veg' },
  { name: 'Milho-verde cozido (100g)',        kcal: 96,  p: 3.4,  c: 19,   f: 1.4,  cat: 'carb' },
  { name: 'Milho lata (100g)',                kcal: 80,  p: 2.8,  c: 17,   f: 1,    cat: 'carb' },
  { name: 'Palmito pupunha (100g)',           kcal: 36,  p: 2.5,  c: 6.7,  f: 0.5,  cat: 'veg' },
  { name: 'Palmito conserva (100g)',          kcal: 26,  p: 2.6,  c: 4.6,  f: 0.2,  cat: 'veg' },
  { name: 'Cogumelo champignon cru (100g)',   kcal: 22,  p: 3.1,  c: 3.3,  f: 0.3,  cat: 'veg' },
  { name: 'Cogumelo shitake fresco (100g)',   kcal: 34,  p: 2.2,  c: 7,    f: 0.5,  cat: 'veg' },
  { name: 'Cogumelo Paris conserva (100g)',   kcal: 19,  p: 2.9,  c: 2.5,  f: 0.4,  cat: 'veg' },
  { name: 'Salsa fresca (10g)',               kcal: 4,   p: 0.3,  c: 0.6,  f: 0.1,  cat: 'veg' },
  { name: 'Cebolinha (10g)',                  kcal: 3,   p: 0.2,  c: 0.7,  f: 0,    cat: 'veg' },
  { name: 'Coentro (10g)',                    kcal: 3,   p: 0.2,  c: 0.4,  f: 0.1,  cat: 'veg' },
  { name: 'Manjericão fresco (10g)',          kcal: 3,   p: 0.3,  c: 0.3,  f: 0.1,  cat: 'veg' },

  // ===== Frutas =====
  { name: 'Banana nanica (1un 100g)',         kcal: 92,  p: 1.4,  c: 23,   f: 0.1,  cat: 'fruta' },
  { name: 'Banana prata (1un 80g)',           kcal: 75,  p: 1.2,  c: 19,   f: 0.1,  cat: 'fruta' },
  { name: 'Banana ouro (1un 50g)',            kcal: 44,  p: 0.7,  c: 12,   f: 0.1,  cat: 'fruta' },
  { name: 'Banana caturra (1un 90g)',         kcal: 84,  p: 1.3,  c: 21,   f: 0.1,  cat: 'fruta' },
  { name: 'Banana da terra (1un grande)',     kcal: 220, p: 2.3,  c: 56,   f: 0.7,  cat: 'fruta' },
  { name: 'Banana frita / caramelada',        kcal: 180, p: 1,    c: 30,   f: 6,    cat: 'erro' },
  { name: 'Maçã fuji (1un 150g)',             kcal: 78,  p: 0.5,  c: 21,   f: 0.3,  cat: 'fruta' },
  { name: 'Maçã gala (1un 130g)',             kcal: 68,  p: 0.4,  c: 18,   f: 0.3,  cat: 'fruta' },
  { name: 'Maçã verde (1un 150g)',            kcal: 75,  p: 0.4,  c: 20,   f: 0.3,  cat: 'fruta' },
  { name: 'Pera williams (1un 150g)',         kcal: 86,  p: 0.6,  c: 23,   f: 0.2,  cat: 'fruta' },
  { name: 'Pera asiática (1un)',              kcal: 51,  p: 0.6,  c: 13,   f: 0.2,  cat: 'fruta' },
  { name: 'Laranja pera (1un 180g)',          kcal: 85,  p: 1.6,  c: 22,   f: 0.2,  cat: 'fruta' },
  { name: 'Laranja lima (1un 150g)',          kcal: 70,  p: 1.4,  c: 18,   f: 0.2,  cat: 'fruta' },
  { name: 'Tangerina poncã (1un 90g)',        kcal: 48,  p: 0.7,  c: 12,   f: 0.3,  cat: 'fruta' },
  { name: 'Mexerica (1un 80g)',               kcal: 42,  p: 0.6,  c: 11,   f: 0.2,  cat: 'fruta' },
  { name: 'Limão tahiti (1un 80g)',           kcal: 22,  p: 0.7,  c: 7.6,  f: 0.2,  cat: 'fruta' },
  { name: 'Limão siciliano (1un)',            kcal: 24,  p: 0.6,  c: 8,    f: 0.3,  cat: 'fruta' },
  { name: 'Limão galego (1un)',               kcal: 20,  p: 0.7,  c: 6.7,  f: 0.2,  cat: 'fruta' },
  { name: 'Mamão papaya (1 fatia 150g)',      kcal: 65,  p: 0.7,  c: 16,   f: 0.4,  cat: 'fruta' },
  { name: 'Mamão formosa (1 fatia 200g)',     kcal: 80,  p: 1,    c: 20,   f: 0.4,  cat: 'fruta' },
  { name: 'Manga tommy (1un 200g)',           kcal: 110, p: 1.4,  c: 28,   f: 0.4,  cat: 'fruta' },
  { name: 'Manga palmer (1un 250g)',          kcal: 140, p: 1.8,  c: 35,   f: 0.5,  cat: 'fruta' },
  { name: 'Abacate (1/2 un médio 100g)',      kcal: 160, p: 2,    c: 9,    f: 15,   cat: 'gordura' },
  { name: 'Abacate inteiro (200g)',           kcal: 320, p: 4,    c: 18,   f: 30,   cat: 'gordura' },
  { name: 'Abacaxi pérola (1 fatia 100g)',    kcal: 50,  p: 0.5,  c: 13,   f: 0.1,  cat: 'fruta' },
  { name: 'Abacaxi havaí (1 fatia 100g)',     kcal: 48,  p: 0.5,  c: 12,   f: 0.1,  cat: 'fruta' },
  { name: 'Melancia (1 fatia 200g)',          kcal: 60,  p: 1.2,  c: 16,   f: 0.4,  cat: 'fruta' },
  { name: 'Melão amarelo (1 fatia 200g)',     kcal: 68,  p: 1.6,  c: 16,   f: 0.4,  cat: 'fruta' },
  { name: 'Melão cantaloupe (200g)',          kcal: 68,  p: 1.6,  c: 16,   f: 0.4,  cat: 'fruta' },
  { name: 'Morango (1 xícara 150g)',          kcal: 48,  p: 1,    c: 11,   f: 0.4,  cat: 'fruta' },
  { name: 'Mirtilo (100g)',                   kcal: 57,  p: 0.7,  c: 14,   f: 0.3,  cat: 'fruta' },
  { name: 'Framboesa (100g)',                 kcal: 52,  p: 1.2,  c: 12,   f: 0.7,  cat: 'fruta' },
  { name: 'Amora (100g)',                     kcal: 43,  p: 1.4,  c: 10,   f: 0.5,  cat: 'fruta' },
  { name: 'Cereja (100g)',                    kcal: 50,  p: 1,    c: 12,   f: 0.3,  cat: 'fruta' },
  { name: 'Uva niagara (100g)',               kcal: 67,  p: 0.7,  c: 17,   f: 0.2,  cat: 'fruta' },
  { name: 'Uva itália (100g)',                kcal: 69,  p: 0.7,  c: 18,   f: 0.2,  cat: 'fruta' },
  { name: 'Uva benitaka (100g)',              kcal: 65,  p: 0.7,  c: 17,   f: 0.2,  cat: 'fruta' },
  { name: 'Kiwi (1un 75g)',                   kcal: 46,  p: 0.8,  c: 11,   f: 0.4,  cat: 'fruta' },
  { name: 'Caqui mole (1un 150g)',            kcal: 105, p: 0.9,  c: 28,   f: 0.3,  cat: 'fruta' },
  { name: 'Caqui chocolate (1un)',            kcal: 110, p: 1,    c: 29,   f: 0.3,  cat: 'fruta' },
  { name: 'Goiaba branca (1un 100g)',         kcal: 54,  p: 1,    c: 12,   f: 0.5,  cat: 'fruta' },
  { name: 'Goiaba vermelha (1un 100g)',       kcal: 68,  p: 2.6,  c: 14,   f: 1,    cat: 'fruta' },
  { name: 'Pêssego (1un 150g)',               kcal: 58,  p: 1.3,  c: 14,   f: 0.4,  cat: 'fruta' },
  { name: 'Ameixa vermelha (1un 70g)',        kcal: 32,  p: 0.5,  c: 8,    f: 0.2,  cat: 'fruta' },
  { name: 'Ameixa preta seca (5un)',          kcal: 120, p: 1.1,  c: 32,   f: 0.2,  cat: 'fruta' },
  { name: 'Maracujá (1un 90g)',               kcal: 87,  p: 2,    c: 21,   f: 0.6,  cat: 'fruta' },
  { name: 'Carambola (1un 100g)',             kcal: 31,  p: 1,    c: 7,    f: 0.3,  cat: 'fruta' },
  { name: 'Fruta-do-conde (1un)',             kcal: 95,  p: 1.7,  c: 24,   f: 0.3,  cat: 'fruta' },
  { name: 'Jabuticaba (100g)',                kcal: 58,  p: 0.6,  c: 15,   f: 0.1,  cat: 'fruta' },
  { name: 'Acerola (100g)',                   kcal: 32,  p: 1,    c: 8,    f: 0.3,  cat: 'fruta' },
  { name: 'Pitanga (100g)',                   kcal: 38,  p: 0.8,  c: 9,    f: 0.4,  cat: 'fruta' },
  { name: 'Cupuaçu polpa (100g)',             kcal: 49,  p: 1.2,  c: 12,   f: 0.6,  cat: 'fruta' },
  { name: 'Açaí polpa pura (100g)',           kcal: 58,  p: 0.8,  c: 6,    f: 4,    cat: 'fruta' },
  { name: 'Açaí completo (300g)',             kcal: 380, p: 4,    c: 65,   f: 10,   cat: 'erro' },
  { name: 'Coco verde água (200ml)',          kcal: 38,  p: 1.4,  c: 9,    f: 0.4,  cat: 'bebida' },
  { name: 'Coco maduro polpa (50g)',          kcal: 175, p: 1.7,  c: 7.5,  f: 17,   cat: 'gordura' },
  { name: 'Coco ralado seco (1 col)',         kcal: 30,  p: 0.3,  c: 1,    f: 3,    cat: 'gordura' },
  { name: 'Romã (1un 100g)',                  kcal: 83,  p: 1.7,  c: 19,   f: 1.2,  cat: 'fruta' },
  { name: 'Pitaya (1un 200g)',                kcal: 120, p: 2.4,  c: 26,   f: 0.8,  cat: 'fruta' },
  { name: 'Tâmara fresca (3un)',              kcal: 65,  p: 0.5,  c: 18,   f: 0.1,  cat: 'fruta' },
  { name: 'Tâmara seca (3un)',                kcal: 80,  p: 0.8,  c: 22,   f: 0.1,  cat: 'fruta' },
  { name: 'Figo fresco (2un)',                kcal: 75,  p: 0.8,  c: 19,   f: 0.3,  cat: 'fruta' },
  { name: 'Figo seco (3un)',                  kcal: 95,  p: 1,    c: 25,   f: 0.4,  cat: 'fruta' },
  { name: 'Tâmara recheada nozes (1un)',      kcal: 90,  p: 2,    c: 13,   f: 4,    cat: 'doce' },
  { name: 'Lichia fresca (10un)',             kcal: 66,  p: 0.8,  c: 17,   f: 0.4,  cat: 'fruta' },
  { name: 'Salada de frutas (200g)',          kcal: 110, p: 1.5,  c: 27,   f: 0.6,  cat: 'fruta' },

  // ===== Castanhas / sementes =====
  { name: 'Castanha-do-pará (1un 5g)',        kcal: 33,  p: 0.7,  c: 0.6,  f: 3.3,  cat: 'gordura' },
  { name: 'Castanha-do-pará (5un)',           kcal: 165, p: 3.5,  c: 3,    f: 16.5, cat: 'gordura' },
  { name: 'Castanha-de-caju torrada (30g)',   kcal: 165, p: 5,    c: 9,    f: 13,   cat: 'gordura' },
  { name: 'Castanha-de-caju crua (30g)',      kcal: 155, p: 5,    c: 9,    f: 12,   cat: 'gordura' },
  { name: 'Amêndoas torradas (30g)',          kcal: 175, p: 6.5,  c: 6,    f: 15,   cat: 'gordura' },
  { name: 'Amêndoas cruas (30g)',             kcal: 175, p: 6.4,  c: 6.6,  f: 15,   cat: 'gordura' },
  { name: 'Nozes (30g)',                      kcal: 195, p: 4.6,  c: 4,    f: 19,   cat: 'gordura' },
  { name: 'Pistache torrado (30g)',           kcal: 165, p: 6,    c: 8,    f: 14,   cat: 'gordura' },
  { name: 'Avelãs (30g)',                     kcal: 188, p: 4.5,  c: 5,    f: 18,   cat: 'gordura' },
  { name: 'Macadâmia (30g)',                  kcal: 220, p: 2.3,  c: 4,    f: 23,   cat: 'gordura' },
  { name: 'Pinhão cozido (100g)',             kcal: 175, p: 3.4,  c: 35,   f: 1.4,  cat: 'carb' },
  { name: 'Amendoim cru (30g)',               kcal: 170, p: 7.5,  c: 5,    f: 14,   cat: 'gordura' },
  { name: 'Amendoim torrado salgado (30g)',   kcal: 175, p: 7,    c: 5,    f: 14,   cat: 'gordura' },
  { name: 'Amendoim japonês (30g)',           kcal: 145, p: 5,    c: 16,   f: 6,    cat: 'snack' },
  { name: 'Paçoca tradicional (1un)',         kcal: 105, p: 2.5,  c: 13,   f: 5,    cat: 'doce' },
  { name: 'Semente de chia (1 col sopa)',     kcal: 70,  p: 2.5,  c: 6,    f: 4.5,  cat: 'gordura' },
  { name: 'Semente de linhaça (1 col sopa)',  kcal: 60,  p: 2,    c: 3,    f: 4.5,  cat: 'gordura' },
  { name: 'Semente de girassol (30g)',        kcal: 175, p: 6,    c: 6,    f: 15,   cat: 'gordura' },
  { name: 'Semente de abóbora (30g)',         kcal: 165, p: 9,    c: 5,    f: 14,   cat: 'gordura' },
  { name: 'Semente de gergelim (1 col)',      kcal: 50,  p: 1.5,  c: 2,    f: 4.5,  cat: 'gordura' },
  { name: 'Mix de castanhas (40g)',           kcal: 240, p: 6,    c: 10,   f: 20,   cat: 'gordura' },
  { name: 'Pasta de amendoim integral (1 col)', kcal: 95, p: 4,   c: 3.5,  f: 8,    cat: 'gordura' },
  { name: 'Pasta de amêndoa (1 col)',         kcal: 100, p: 3.5,  c: 4,    f: 8.5,  cat: 'gordura' },
  { name: 'Pasta de avelã (Nutella, 1 col)',  kcal: 80,  p: 1,    c: 9,    f: 4.5,  cat: 'doce' },

  // ===== Leguminosas =====
  { name: 'Feijão preto cozido (100g)',       kcal: 132, p: 8.9,  c: 24,   f: 0.5,  cat: 'carb' },
  { name: 'Feijão carioca cozido (100g)',     kcal: 76,  p: 4.8,  c: 13.6, f: 0.5,  cat: 'carb' },
  { name: 'Feijão branco cozido (100g)',      kcal: 139, p: 9,    c: 26,   f: 0.5,  cat: 'carb' },
  { name: 'Feijão fradinho cozido (100g)',    kcal: 116, p: 8,    c: 21,   f: 0.4,  cat: 'carb' },
  { name: 'Feijão azuki cozido (100g)',       kcal: 128, p: 7.5,  c: 25,   f: 0.1,  cat: 'carb' },
  { name: 'Lentilha cozida (100g)',           kcal: 116, p: 9,    c: 20,   f: 0.4,  cat: 'carb' },
  { name: 'Lentilha vermelha cozida (100g)',  kcal: 115, p: 9,    c: 20,   f: 0.4,  cat: 'carb' },
  { name: 'Grão-de-bico cozido (100g)',       kcal: 164, p: 9,    c: 27,   f: 2.6,  cat: 'carb' },
  { name: 'Ervilha seca cozida (100g)',       kcal: 118, p: 8,    c: 21,   f: 0.4,  cat: 'carb' },
  { name: 'Soja cozida (100g)',               kcal: 173, p: 17,   c: 10,   f: 9,    cat: 'proteina' },
  { name: 'Edamame cozido (100g)',            kcal: 121, p: 12,   c: 9,    f: 5,    cat: 'proteina' },
  { name: 'Hummus tradicional (100g)',        kcal: 230, p: 8,    c: 18,   f: 14,   cat: 'snack' },
  { name: 'Falafel frito (3un)',              kcal: 200, p: 7,    c: 18,   f: 12,   cat: 'erro' },
  { name: 'Falafel assado (3un)',             kcal: 150, p: 7,    c: 18,   f: 6,    cat: 'prato' },

  // ===== Café da manhã / lanches =====
  { name: 'Tapioca pura grande (50g)',        kcal: 175, p: 0.4,  c: 44,   f: 0,    cat: 'carb' },
  { name: 'Tapioca recheada queijo (1un)',    kcal: 250, p: 12,   c: 35,   f: 8,    cat: 'snack' },
  { name: 'Tapioca recheada frango (1un)',    kcal: 280, p: 22,   c: 36,   f: 5,    cat: 'snack' },
  { name: 'Tapioca doce coco/banana (1un)',   kcal: 280, p: 2,    c: 55,   f: 6,    cat: 'doce' },
  { name: 'Crepioca queijo+ovo (1un)',        kcal: 260, p: 19,   c: 18,   f: 13,   cat: 'prato' },
  { name: 'Crepioca doce banana (1un)',       kcal: 220, p: 8,    c: 30,   f: 7,    cat: 'doce' },
  { name: 'Beiju de coco (1un)',              kcal: 180, p: 1,    c: 35,   f: 4,    cat: 'snack' },
  { name: 'Cuscuz nordestino c/ manteiga',    kcal: 180, p: 3.5,  c: 28,   f: 6,    cat: 'carb' },
  { name: 'Cuscuz paulista (200g)',           kcal: 320, p: 12,   c: 45,   f: 11,   cat: 'prato' },
  { name: 'Pão na chapa c/ requeijão (1un)',  kcal: 220, p: 6,    c: 30,   f: 8,    cat: 'snack' },
  { name: 'Misto quente (1un)',               kcal: 280, p: 15,   c: 26,   f: 13,   cat: 'snack' },
  { name: 'Cachorro-quente simples (1un)',    kcal: 290, p: 11,   c: 24,   f: 17,   cat: 'erro' },
  { name: 'Sanduíche atum (1un)',             kcal: 310, p: 18,   c: 30,   f: 13,   cat: 'snack' },
  { name: 'Sanduíche natural frango (1un)',   kcal: 280, p: 22,   c: 28,   f: 9,    cat: 'snack' },
  { name: 'Pão integral c/ pasta amendoim',   kcal: 220, p: 7,    c: 25,   f: 10,   cat: 'snack' },
  { name: 'Bolinho de chuva (1un)',           kcal: 100, p: 2,    c: 14,   f: 4,    cat: 'doce' },
  { name: 'Rosca doce (1un)',                 kcal: 240, p: 5,    c: 40,   f: 7,    cat: 'doce' },
  { name: 'Donut açucarado (1un)',            kcal: 250, p: 4,    c: 30,   f: 13,   cat: 'erro' },
  { name: 'Donut com cobertura (1un)',        kcal: 290, p: 4,    c: 35,   f: 15,   cat: 'erro' },

  // ===== Bebidas — sucos =====
  { name: 'Suco de laranja natural (200ml)',  kcal: 90,  p: 1.4,  c: 20,   f: 0.4,  cat: 'bebida' },
  { name: 'Suco de maracujá c/ açúcar (300ml)', kcal: 130, p: 1,  c: 32,   f: 0.3,  cat: 'bebida' },
  { name: 'Suco de uva integral (200ml)',     kcal: 130, p: 1,    c: 32,   f: 0.2,  cat: 'bebida' },
  { name: 'Suco de uva tinto (200ml)',        kcal: 140, p: 1,    c: 34,   f: 0.2,  cat: 'bebida' },
  { name: 'Suco de manga (300ml)',            kcal: 170, p: 1,    c: 42,   f: 0.4,  cat: 'bebida' },
  { name: 'Suco de morango (300ml)',          kcal: 90,  p: 1,    c: 22,   f: 0.4,  cat: 'bebida' },
  { name: 'Suco de melancia (300ml)',         kcal: 90,  p: 1.5,  c: 22,   f: 0.5,  cat: 'bebida' },
  { name: 'Suco de cenoura + laranja (300ml)',kcal: 110, p: 1.5,  c: 26,   f: 0.4,  cat: 'bebida' },
  { name: 'Suco verde (couve + abacaxi)',     kcal: 80,  p: 1.5,  c: 18,   f: 0.5,  cat: 'bebida' },
  { name: 'Suco detox (300ml)',               kcal: 85,  p: 2,    c: 18,   f: 0.5,  cat: 'bebida' },
  { name: 'Smoothie de morango (300ml)',      kcal: 220, p: 5,    c: 40,   f: 4,    cat: 'bebida' },
  { name: 'Smoothie verde proteico (300ml)',  kcal: 250, p: 25,   c: 25,   f: 5,    cat: 'bebida' },
  { name: 'Vitamina banana + leite (300ml)',  kcal: 220, p: 8,    c: 38,   f: 4.5,  cat: 'bebida' },
  { name: 'Limonada caseira (300ml)',         kcal: 130, p: 0.2,  c: 33,   f: 0,    cat: 'bebida' },
  { name: 'Limonada suíça (300ml)',           kcal: 180, p: 0.5,  c: 40,   f: 1,    cat: 'bebida' },

  // ===== Bebidas — quentes & geladas =====
  { name: 'Café espresso (50ml)',             kcal: 2,   p: 0.3,  c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Café coado (200ml)',               kcal: 4,   p: 0.5,  c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Café c/ leite 50/50 (200ml)',      kcal: 80,  p: 4,    c: 6,    f: 4,    cat: 'bebida' },
  { name: 'Cappuccino simples (200ml)',       kcal: 90,  p: 5,    c: 9,    f: 4,    cat: 'bebida' },
  { name: 'Mocha (300ml)',                    kcal: 290, p: 9,    c: 36,   f: 11,   cat: 'bebida' },
  { name: 'Latte macchiato (300ml)',          kcal: 180, p: 8,    c: 16,   f: 9,    cat: 'bebida' },
  { name: 'Flat white (200ml)',               kcal: 130, p: 7,    c: 9,    f: 7,    cat: 'bebida' },
  { name: 'Café gelado c/ leite (300ml)',     kcal: 120, p: 5,    c: 15,   f: 4,    cat: 'bebida' },
  { name: 'Chá preto (200ml)',                kcal: 1,   p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Chá verde (200ml)',                kcal: 1,   p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Chá de hibisco (200ml)',           kcal: 5,   p: 0,    c: 1,    f: 0,    cat: 'bebida' },
  { name: 'Chá de camomila (200ml)',          kcal: 2,   p: 0,    c: 0.4,  f: 0,    cat: 'bebida' },
  { name: 'Chá mate gelado (300ml)',          kcal: 80,  p: 0,    c: 20,   f: 0,    cat: 'bebida' },
  { name: 'Chocolate quente (250ml)',         kcal: 280, p: 8,    c: 40,   f: 9,    cat: 'bebida' },
  { name: 'Cappuccino instantâneo Nestlé (200ml)', kcal: 100, p: 3, c: 16, f: 3,    cat: 'bebida' },
  { name: 'Coca-Cola lata 350ml',             kcal: 140, p: 0,    c: 37,   f: 0,    cat: 'bebida' },
  { name: 'Coca-Cola Zero lata',              kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Guaraná Antarctica lata',          kcal: 130, p: 0,    c: 32,   f: 0,    cat: 'bebida' },
  { name: 'Sprite lata',                      kcal: 130, p: 0,    c: 32,   f: 0,    cat: 'bebida' },
  { name: 'Fanta laranja lata',               kcal: 140, p: 0,    c: 36,   f: 0,    cat: 'bebida' },
  { name: 'Pepsi Twist lata',                 kcal: 130, p: 0,    c: 33,   f: 0,    cat: 'bebida' },
  { name: 'Energético Red Bull (250ml)',      kcal: 110, p: 0,    c: 28,   f: 0,    cat: 'bebida' },
  { name: 'Energético Monster (473ml)',       kcal: 200, p: 0,    c: 54,   f: 0,    cat: 'bebida' },
  { name: 'Isotônico Gatorade (500ml)',       kcal: 130, p: 0,    c: 35,   f: 0,    cat: 'bebida' },
  { name: 'Isotônico Powerade (500ml)',       kcal: 130, p: 0,    c: 35,   f: 0,    cat: 'bebida' },
  { name: 'Água tônica (300ml)',              kcal: 110, p: 0,    c: 27,   f: 0,    cat: 'bebida' },
  { name: 'Água com gás (300ml)',             kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'bebida' },

  // ===== Bebidas alcoólicas =====
  { name: 'Cerveja Pilsen lata 350ml',        kcal: 150, p: 1.4,  c: 12,   f: 0,    cat: 'bebida' },
  { name: 'Cerveja long neck 355ml',          kcal: 155, p: 1.5,  c: 13,   f: 0,    cat: 'bebida' },
  { name: 'Cerveja IPA 500ml',                kcal: 230, p: 2,    c: 20,   f: 0,    cat: 'bebida' },
  { name: 'Cerveja Weiss 500ml',              kcal: 250, p: 2.5,  c: 24,   f: 0,    cat: 'bebida' },
  { name: 'Cerveja Stout 500ml',              kcal: 230, p: 2,    c: 17,   f: 0,    cat: 'bebida' },
  { name: 'Cerveja sem álcool (350ml)',       kcal: 105, p: 1.4,  c: 21,   f: 0,    cat: 'bebida' },
  { name: 'Vinho tinto seco taça 150ml',      kcal: 125, p: 0.1,  c: 4,    f: 0,    cat: 'bebida' },
  { name: 'Vinho branco seco taça 150ml',     kcal: 120, p: 0.1,  c: 3.5,  f: 0,    cat: 'bebida' },
  { name: 'Espumante brut taça 150ml',        kcal: 130, p: 0.1,  c: 3,    f: 0,    cat: 'bebida' },
  { name: 'Champanhe taça 150ml',             kcal: 135, p: 0.1,  c: 3,    f: 0,    cat: 'bebida' },
  { name: 'Caipirinha (1 copo 250ml)',        kcal: 250, p: 0,    c: 26,   f: 0,    cat: 'bebida' },
  { name: 'Caipiroska vodka (1 copo)',        kcal: 220, p: 0,    c: 22,   f: 0,    cat: 'bebida' },
  { name: 'Mojito (1 copo)',                  kcal: 230, p: 0,    c: 25,   f: 0,    cat: 'bebida' },
  { name: 'Margarita (1 copo)',               kcal: 270, p: 0,    c: 16,   f: 0,    cat: 'bebida' },
  { name: 'Whisky dose pura (50ml)',          kcal: 110, p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Whisky com Coca (300ml)',          kcal: 220, p: 0,    c: 30,   f: 0,    cat: 'bebida' },
  { name: 'Vodka dose pura (50ml)',           kcal: 95,  p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Vodka com energético (300ml)',     kcal: 200, p: 0,    c: 28,   f: 0,    cat: 'bebida' },
  { name: 'Tequila dose (50ml)',              kcal: 95,  p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Gin dose (50ml)',                  kcal: 95,  p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Gin-tônica (300ml)',               kcal: 200, p: 0,    c: 26,   f: 0,    cat: 'bebida' },

  // ===== Doces — chocolates e bombons =====
  { name: 'Bombom Sonho de Valsa (1un)',      kcal: 75,  p: 0.9,  c: 9,    f: 4,    cat: 'doce' },
  { name: 'Bombom Ouro Branco (1un)',         kcal: 70,  p: 1,    c: 9,    f: 3.5,  cat: 'doce' },
  { name: 'Bombom Serenata de Amor (1un)',    kcal: 80,  p: 1,    c: 10,   f: 4,    cat: 'doce' },
  { name: 'Bombom Lindt 70% (1un)',           kcal: 75,  p: 1.5,  c: 5,    f: 5.5,  cat: 'doce' },
  { name: 'Bombom Ferrero Rocher (1un)',      kcal: 75,  p: 1,    c: 6,    f: 5.5,  cat: 'doce' },
  { name: 'Trufa chocolate (1un)',            kcal: 110, p: 1.5,  c: 12,   f: 7,    cat: 'doce' },
  { name: 'Chocolate Hershey ao leite (40g)', kcal: 215, p: 3,    c: 24,   f: 12,   cat: 'doce' },
  { name: 'Chocolate Nestlé Diamante Negro (30g)', kcal: 158, p: 2.3, c: 17, f: 9, cat: 'doce' },
  { name: 'Chocolate Talento amêndoas (30g)', kcal: 158, p: 2.5,  c: 16,   f: 9.5,  cat: 'doce' },
  { name: 'Chocolate Lacta Laka (30g)',       kcal: 165, p: 2,    c: 18,   f: 10,   cat: 'doce' },
  { name: 'Chocolate Bis (1un)',              kcal: 35,  p: 0.5,  c: 4.5,  f: 1.7,  cat: 'doce' },
  { name: 'KitKat (1 barra 4 dedos)',         kcal: 210, p: 2.5,  c: 26,   f: 11,   cat: 'doce' },
  { name: 'Twix (1un)',                       kcal: 250, p: 2.5,  c: 33,   f: 12,   cat: 'doce' },
  { name: 'Snickers (1un)',                   kcal: 250, p: 4,    c: 31,   f: 13,   cat: 'doce' },
  { name: 'M&Ms (40g)',                       kcal: 200, p: 1.7,  c: 28,   f: 9,    cat: 'doce' },
  { name: 'Tabletes Toblerone (40g)',         kcal: 215, p: 2.5,  c: 25,   f: 12,   cat: 'doce' },
  { name: 'Bala dura (5un)',                  kcal: 60,  p: 0,    c: 15,   f: 0,    cat: 'doce' },
  { name: 'Bala mastigável (5un)',            kcal: 80,  p: 0.3,  c: 18,   f: 1,    cat: 'doce' },
  { name: 'Goma de mascar (1un)',             kcal: 4,   p: 0,    c: 1,    f: 0,    cat: 'doce' },
  { name: 'Pirulito (1un)',                   kcal: 25,  p: 0,    c: 7,    f: 0,    cat: 'doce' },
  { name: 'Marshmallow (5un)',                kcal: 50,  p: 0.4,  c: 12,   f: 0,    cat: 'doce' },

  // ===== Doces brasileiros =====
  { name: 'Brigadeiro tradicional (1un 20g)', kcal: 75,  p: 1.2,  c: 12,   f: 2.5,  cat: 'doce' },
  { name: 'Brigadeiro de colher (50g)',       kcal: 190, p: 3,    c: 30,   f: 6,    cat: 'doce' },
  { name: 'Beijinho (1un)',                   kcal: 70,  p: 1,    c: 11,   f: 2.5,  cat: 'doce' },
  { name: 'Cajuzinho (1un)',                  kcal: 80,  p: 1.5,  c: 10,   f: 4,    cat: 'doce' },
  { name: 'Olho de sogra (1un)',              kcal: 60,  p: 1,    c: 11,   f: 1.5,  cat: 'doce' },
  { name: 'Quindim (1un)',                    kcal: 145, p: 3,    c: 22,   f: 5,    cat: 'doce' },
  { name: 'Cocada cremosa (1 fatia 50g)',     kcal: 220, p: 1.5,  c: 30,   f: 11,   cat: 'doce' },
  { name: 'Cocada queimada (1un)',            kcal: 180, p: 1,    c: 28,   f: 7,    cat: 'doce' },
  { name: 'Pé de moleque (1un 20g)',          kcal: 95,  p: 2.5,  c: 11,   f: 4.5,  cat: 'doce' },
  { name: 'Mãe Benta (1un)',                  kcal: 90,  p: 1.5,  c: 15,   f: 3,    cat: 'doce' },
  { name: 'Bem-casado (1un)',                 kcal: 180, p: 2,    c: 28,   f: 7,    cat: 'doce' },
  { name: 'Pudim de leite (1 fatia 100g)',    kcal: 220, p: 5,    c: 32,   f: 8,    cat: 'doce' },
  { name: 'Pudim de claras (100g)',           kcal: 120, p: 5,    c: 25,   f: 0.5,  cat: 'doce' },
  { name: 'Mousse de maracujá (1 taça)',      kcal: 200, p: 4,    c: 28,   f: 8,    cat: 'doce' },
  { name: 'Mousse de chocolate (1 taça)',     kcal: 230, p: 4,    c: 22,   f: 14,   cat: 'doce' },
  { name: 'Doce de leite (1 col)',            kcal: 95,  p: 1.7,  c: 17,   f: 2,    cat: 'doce' },
  { name: 'Banana doce caramelada (1un)',     kcal: 160, p: 1,    c: 35,   f: 2,    cat: 'doce' },
  { name: 'Bananada (1un)',                   kcal: 130, p: 0.5,  c: 32,   f: 0.2,  cat: 'doce' },
  { name: 'Goiabada (50g)',                   kcal: 140, p: 0.4,  c: 34,   f: 0.1,  cat: 'doce' },
  { name: 'Marmelada (50g)',                  kcal: 130, p: 0.3,  c: 32,   f: 0,    cat: 'doce' },
  { name: 'Romeu e Julieta (queijo+goiabada)',kcal: 280, p: 11,   c: 35,   f: 11,   cat: 'doce' },
  { name: 'Pamonha doce (1un)',               kcal: 220, p: 4,    c: 38,   f: 6,    cat: 'doce' },
  { name: 'Curau (1 tigela 200g)',            kcal: 320, p: 5,    c: 50,   f: 10,   cat: 'doce' },
  { name: 'Canjica branca (200g)',            kcal: 290, p: 5,    c: 50,   f: 7,    cat: 'doce' },
  { name: 'Mungunzá (1 tigela)',              kcal: 280, p: 4,    c: 48,   f: 8,    cat: 'doce' },
  { name: 'Arroz-doce (1 tigela)',            kcal: 270, p: 5,    c: 48,   f: 6,    cat: 'doce' },
  { name: 'Tapioca de coco (1un)',            kcal: 220, p: 2,    c: 40,   f: 6,    cat: 'doce' },

  // ===== Sorvetes =====
  { name: 'Sorvete creme (1 bola)',           kcal: 110, p: 2,    c: 13,   f: 6,    cat: 'doce' },
  { name: 'Sorvete chocolate (1 bola)',       kcal: 125, p: 2,    c: 16,   f: 6,    cat: 'doce' },
  { name: 'Sorvete morango (1 bola)',         kcal: 115, p: 2,    c: 14,   f: 6,    cat: 'doce' },
  { name: 'Sorvete flocos (1 bola)',          kcal: 130, p: 2,    c: 17,   f: 6,    cat: 'doce' },
  { name: 'Sorvete pistache (1 bola)',        kcal: 145, p: 3,    c: 16,   f: 8,    cat: 'doce' },
  { name: 'Frozen yogurt (100g)',             kcal: 100, p: 4,    c: 18,   f: 1,    cat: 'doce' },
  { name: 'Sundae chocolate (1un)',           kcal: 290, p: 5,    c: 42,   f: 11,   cat: 'doce' },
  { name: 'Sundae caramelo (1un)',            kcal: 280, p: 4,    c: 45,   f: 10,   cat: 'doce' },
  { name: 'Casquinha simples (1un)',          kcal: 200, p: 3,    c: 30,   f: 8,    cat: 'doce' },
  { name: 'Picolé de fruta (1un)',            kcal: 70,  p: 0.5,  c: 17,   f: 0,    cat: 'doce' },
  { name: 'Picolé Magnum (1un)',              kcal: 270, p: 3,    c: 25,   f: 18,   cat: 'doce' },
  { name: 'Picolé Cornetto (1un)',            kcal: 230, p: 3,    c: 27,   f: 12,   cat: 'doce' },
  { name: 'Açaí na tigela com tudo (500g)',   kcal: 700, p: 7,    c: 110,  f: 22,   cat: 'erro' },
  { name: 'Açaí 300ml + banana + granola',    kcal: 450, p: 5,    c: 75,   f: 13,   cat: 'erro' },

  // ===== Pratos brasileiros =====
  { name: 'PF: arroz, feijão, bife, salada',  kcal: 600, p: 35,   c: 70,   f: 18,   cat: 'prato' },
  { name: 'PF: arroz, feijão, frango grelhado',kcal: 550, p: 40,   c: 70,  f: 12,   cat: 'prato' },
  { name: 'PF: arroz, feijão, peixe assado',  kcal: 510, p: 38,   c: 65,   f: 11,   cat: 'prato' },
  { name: 'Marmita fitness 500g',             kcal: 480, p: 38,   c: 50,   f: 14,   cat: 'prato' },
  { name: 'Marmita low carb 500g',            kcal: 380, p: 35,   c: 20,   f: 18,   cat: 'prato' },
  { name: 'Feijoada light (300g)',            kcal: 420, p: 28,   c: 38,   f: 18,   cat: 'prato' },
  { name: 'Feijoada completa (450g)',         kcal: 700, p: 36,   c: 50,   f: 35,   cat: 'erro' },
  { name: 'Moqueca de peixe baiana (400g)',   kcal: 380, p: 32,   c: 8,    f: 24,   cat: 'prato' },
  { name: 'Moqueca capixaba (400g)',          kcal: 350, p: 30,   c: 10,   f: 20,   cat: 'prato' },
  { name: 'Acarajé com vatapá (1un)',         kcal: 360, p: 12,   c: 24,   f: 24,   cat: 'erro' },
  { name: 'Abará (1un)',                      kcal: 220, p: 9,    c: 22,   f: 11,   cat: 'prato' },
  { name: 'Vatapá (200g)',                    kcal: 240, p: 12,   c: 18,   f: 14,   cat: 'prato' },
  { name: 'Caruru (200g)',                    kcal: 180, p: 8,    c: 14,   f: 10,   cat: 'prato' },
  { name: 'Vaca atolada (300g)',              kcal: 380, p: 28,   c: 22,   f: 18,   cat: 'prato' },
  { name: 'Galinhada mineira (300g)',         kcal: 420, p: 28,   c: 45,   f: 14,   cat: 'prato' },
  { name: 'Galinhada goiana (300g)',          kcal: 440, p: 28,   c: 46,   f: 16,   cat: 'prato' },
  { name: 'Frango com quiabo (300g)',         kcal: 320, p: 32,   c: 12,   f: 16,   cat: 'prato' },
  { name: 'Baião de dois (300g)',             kcal: 360, p: 14,   c: 50,   f: 10,   cat: 'prato' },
  { name: 'Tutu de feijão (200g)',            kcal: 260, p: 11,   c: 35,   f: 8,    cat: 'prato' },
  { name: 'Tutu à mineira (300g)',            kcal: 380, p: 18,   c: 45,   f: 14,   cat: 'prato' },
  { name: 'Virado à paulista (400g)',         kcal: 580, p: 30,   c: 55,   f: 22,   cat: 'prato' },
  { name: 'Escondidinho carne seca (300g)',   kcal: 450, p: 26,   c: 38,   f: 20,   cat: 'prato' },
  { name: 'Escondidinho frango (300g)',       kcal: 380, p: 28,   c: 38,   f: 14,   cat: 'prato' },
  { name: 'Bobó de camarão (300g)',           kcal: 420, p: 22,   c: 32,   f: 22,   cat: 'prato' },
  { name: 'Caldo verde (300ml)',              kcal: 180, p: 6,    c: 22,   f: 7,    cat: 'prato' },
  { name: 'Canjiquinha mineira (200g)',       kcal: 280, p: 12,   c: 38,   f: 9,    cat: 'prato' },
  { name: 'Picadinho carioca (300g)',         kcal: 380, p: 28,   c: 8,    f: 26,   cat: 'prato' },
  { name: 'Cuscuz nordestino completo',       kcal: 420, p: 15,   c: 55,   f: 14,   cat: 'prato' },
  { name: 'Paçoca de carne seca (200g)',      kcal: 340, p: 28,   c: 24,   f: 14,   cat: 'prato' },
  { name: 'Salpicão (200g)',                  kcal: 280, p: 14,   c: 18,   f: 18,   cat: 'prato' },
  { name: 'Empadão de frango (200g)',         kcal: 420, p: 14,   c: 40,   f: 22,   cat: 'erro' },
  { name: 'Empadinha de palmito (1un)',       kcal: 160, p: 3,    c: 18,   f: 8,    cat: 'snack' },
  { name: 'Empadinha de camarão (1un)',       kcal: 180, p: 5,    c: 18,   f: 9,    cat: 'snack' },
  { name: 'Quiche de queijo (1 fatia)',       kcal: 320, p: 11,   c: 22,   f: 21,   cat: 'erro' },
  { name: 'Quiche de alho-poró (1 fatia)',    kcal: 290, p: 10,   c: 22,   f: 18,   cat: 'erro' },
  { name: 'Bolinho de bacalhau (1un)',        kcal: 180, p: 8,    c: 14,   f: 10,   cat: 'erro' },
  { name: 'Croquete de carne (1un)',          kcal: 160, p: 8,    c: 14,   f: 8,    cat: 'erro' },
  { name: 'Coxinha tradicional (1un 80g)',    kcal: 250, p: 8,    c: 22,   f: 14,   cat: 'erro' },
  { name: 'Coxinha de catupiry (1un)',        kcal: 280, p: 9,    c: 22,   f: 17,   cat: 'erro' },
  { name: 'Quibe frito (1un)',                kcal: 150, p: 7,    c: 15,   f: 7,    cat: 'erro' },
  { name: 'Quibe assado (1un)',               kcal: 110, p: 8,    c: 12,   f: 4,    cat: 'prato' },
  { name: 'Esfiha de carne (1un)',            kcal: 180, p: 8,    c: 22,   f: 6,    cat: 'erro' },
  { name: 'Esfiha de queijo (1un)',           kcal: 170, p: 7,    c: 22,   f: 6,    cat: 'erro' },
  { name: 'Esfiha de frango (1un)',           kcal: 175, p: 9,    c: 22,   f: 6,    cat: 'erro' },
  { name: 'Pastel de carne (1un)',            kcal: 200, p: 8,    c: 18,   f: 11,   cat: 'erro' },
  { name: 'Pastel de queijo (1un)',           kcal: 220, p: 7,    c: 18,   f: 13,   cat: 'erro' },
  { name: 'Pastel de palmito (1un)',          kcal: 180, p: 4,    c: 20,   f: 9,    cat: 'erro' },
  { name: 'Pastel de pizza (1un)',            kcal: 230, p: 8,    c: 20,   f: 13,   cat: 'erro' },

  // ===== Pratos asiáticos =====
  { name: 'Sushi atum (1un)',                 kcal: 48,  p: 2,    c: 7,    f: 1.2,  cat: 'prato' },
  { name: 'Sushi salmão (1un)',               kcal: 50,  p: 2,    c: 7,    f: 1.5,  cat: 'prato' },
  { name: 'Niguiri salmão (1un)',             kcal: 50,  p: 2.5,  c: 7,    f: 1.5,  cat: 'prato' },
  { name: 'Niguiri atum (1un)',               kcal: 45,  p: 3,    c: 7,    f: 0.6,  cat: 'prato' },
  { name: 'Uramaki philadelphia (5un)',       kcal: 260, p: 9,    c: 32,   f: 11,   cat: 'erro' },
  { name: 'Uramaki tradicional (5un)',        kcal: 230, p: 8,    c: 30,   f: 8,    cat: 'prato' },
  { name: 'Hot Roll Philadelphia (5un)',      kcal: 380, p: 14,   c: 38,   f: 18,   cat: 'erro' },
  { name: 'Hot Roll crispy (5un)',            kcal: 420, p: 15,   c: 42,   f: 20,   cat: 'erro' },
  { name: 'Temaki salmão (1un)',              kcal: 290, p: 14,   c: 35,   f: 10,   cat: 'erro' },
  { name: 'Temaki philadelphia (1un)',        kcal: 320, p: 13,   c: 38,   f: 14,   cat: 'erro' },
  { name: 'Sashimi salmão (5un)',             kcal: 130, p: 14,   c: 0,    f: 8,    cat: 'proteina' },
  { name: 'Sashimi atum (5un)',               kcal: 80,  p: 18,   c: 0,    f: 0.6,  cat: 'proteina' },
  { name: 'Yakimeshi (200g)',                 kcal: 300, p: 10,   c: 45,   f: 8,    cat: 'prato' },
  { name: 'Yakisoba simples (300g)',          kcal: 380, p: 18,   c: 55,   f: 9,    cat: 'prato' },
  { name: 'Yakisoba completo (400g)',         kcal: 490, p: 22,   c: 65,   f: 14,   cat: 'erro' },
  { name: 'Frango xadrez chinês (300g)',      kcal: 420, p: 26,   c: 30,   f: 20,   cat: 'prato' },
  { name: 'Frango agridoce (300g)',           kcal: 480, p: 22,   c: 50,   f: 20,   cat: 'erro' },
  { name: 'Strogonoff de frango (300g)',      kcal: 450, p: 30,   c: 18,   f: 28,   cat: 'prato' },
  { name: 'Pad thai (350g)',                  kcal: 530, p: 18,   c: 70,   f: 19,   cat: 'prato' },
  { name: 'Pho vietnamita (1 tigela)',        kcal: 350, p: 25,   c: 45,   f: 7,    cat: 'prato' },
  { name: 'Ramen tonkotsu (1 tigela)',        kcal: 580, p: 22,   c: 65,   f: 22,   cat: 'erro' },
  { name: 'Udon noodles (1 tigela)',          kcal: 380, p: 14,   c: 60,   f: 8,    cat: 'prato' },
  { name: 'Gyoza pan-fried (5un)',            kcal: 280, p: 11,   c: 30,   f: 13,   cat: 'erro' },
  { name: 'Curry indiano frango (300g)',      kcal: 380, p: 24,   c: 18,   f: 22,   cat: 'prato' },
  { name: 'Naan bread (1un)',                 kcal: 260, p: 7,    c: 45,   f: 5,    cat: 'snack' },
  { name: 'Samosa vegetariana (1un)',         kcal: 230, p: 5,    c: 28,   f: 11,   cat: 'erro' },
  { name: 'Tikka masala (300g)',              kcal: 420, p: 26,   c: 18,   f: 26,   cat: 'prato' },
  { name: 'Biryani de frango (300g)',         kcal: 480, p: 22,   c: 65,   f: 14,   cat: 'prato' },

  // ===== Pratos ocidentais =====
  { name: 'Hambúrguer caseiro 200g pão',      kcal: 480, p: 28,   c: 38,   f: 22,   cat: 'prato' },
  { name: 'Cheeseburger duplo (1un)',         kcal: 720, p: 38,   c: 38,   f: 45,   cat: 'erro' },
  { name: 'Big Mac (1un)',                    kcal: 540, p: 25,   c: 45,   f: 28,   cat: 'erro' },
  { name: 'Quarteirão (1un)',                 kcal: 510, p: 26,   c: 41,   f: 26,   cat: 'erro' },
  { name: 'McChicken (1un)',                  kcal: 400, p: 14,   c: 39,   f: 21,   cat: 'erro' },
  { name: 'McFish (1un)',                     kcal: 380, p: 14,   c: 36,   f: 19,   cat: 'erro' },
  { name: 'McNuggets (6un)',                  kcal: 270, p: 14,   c: 16,   f: 17,   cat: 'erro' },
  { name: 'McNuggets (10un)',                 kcal: 440, p: 23,   c: 26,   f: 27,   cat: 'erro' },
  { name: 'Whopper (1un)',                    kcal: 657, p: 28,   c: 49,   f: 40,   cat: 'erro' },
  { name: 'Crispy Chicken (BK)',              kcal: 520, p: 24,   c: 41,   f: 28,   cat: 'erro' },
  { name: 'Chicken Royale (BK)',              kcal: 580, p: 26,   c: 50,   f: 31,   cat: 'erro' },
  { name: 'KFC Original Recipe (1 peça)',     kcal: 250, p: 19,   c: 8,    f: 16,   cat: 'erro' },
  { name: 'Subway frango 15cm',               kcal: 350, p: 25,   c: 47,   f: 5,    cat: 'prato' },
  { name: 'Subway atum 15cm',                 kcal: 480, p: 20,   c: 44,   f: 25,   cat: 'erro' },
  { name: 'Subway frango teriyaki 30cm',      kcal: 760, p: 52,   c: 106,  f: 10,   cat: 'erro' },
  { name: 'Pizza muçarela broto (1 fatia)',   kcal: 240, p: 10,   c: 30,   f: 9,    cat: 'erro' },
  { name: 'Pizza pepperoni (1 fatia média)',  kcal: 310, p: 13,   c: 33,   f: 14,   cat: 'erro' },
  { name: 'Pizza calabresa (1 fatia média)',  kcal: 290, p: 12,   c: 32,   f: 13,   cat: 'erro' },
  { name: 'Pizza portuguesa (1 fatia)',       kcal: 310, p: 14,   c: 30,   f: 16,   cat: 'erro' },
  { name: 'Pizza margherita (1 fatia)',       kcal: 250, p: 11,   c: 32,   f: 8,    cat: 'erro' },
  { name: 'Pizza 4 queijos (1 fatia)',        kcal: 320, p: 15,   c: 30,   f: 16,   cat: 'erro' },
  { name: 'Pizza brócolis (1 fatia)',         kcal: 230, p: 11,   c: 30,   f: 7,    cat: 'erro' },
  { name: 'Pizza chocolate (1 fatia doce)',   kcal: 320, p: 6,    c: 50,   f: 12,   cat: 'doce' },
  { name: 'Calzone broto (1un 200g)',         kcal: 580, p: 24,   c: 65,   f: 22,   cat: 'erro' },
  { name: 'Macarrão carbonara (300g)',        kcal: 540, p: 20,   c: 65,   f: 22,   cat: 'erro' },
  { name: 'Macarrão alfredo (300g)',          kcal: 580, p: 18,   c: 62,   f: 28,   cat: 'erro' },
  { name: 'Macarrão pesto (300g)',            kcal: 510, p: 18,   c: 60,   f: 22,   cat: 'prato' },
  { name: 'Lasanha 4 queijos (200g)',         kcal: 420, p: 18,   c: 30,   f: 24,   cat: 'erro' },
  { name: 'Lasanha vegetariana (200g)',       kcal: 320, p: 14,   c: 32,   f: 14,   cat: 'prato' },
  { name: 'Nhoque ao sugo (300g)',            kcal: 350, p: 9,    c: 65,   f: 5,    cat: 'prato' },
  { name: 'Nhoque 4 queijos (300g)',          kcal: 500, p: 18,   c: 60,   f: 20,   cat: 'erro' },
  { name: 'Risoto de funghi (300g)',          kcal: 460, p: 11,   c: 70,   f: 14,   cat: 'prato' },
  { name: 'Burrito frango (1un)',             kcal: 580, p: 24,   c: 70,   f: 22,   cat: 'erro' },
  { name: 'Burrito carne (1un)',              kcal: 620, p: 25,   c: 70,   f: 25,   cat: 'erro' },
  { name: 'Taco carne (1un)',                 kcal: 220, p: 9,    c: 18,   f: 12,   cat: 'erro' },
  { name: 'Quesadilla queijo (1un)',          kcal: 340, p: 14,   c: 30,   f: 18,   cat: 'erro' },
  { name: 'Nachos com queijo (200g)',         kcal: 580, p: 14,   c: 60,   f: 32,   cat: 'erro' },
  { name: 'Falafel wrap (1un)',               kcal: 380, p: 12,   c: 50,   f: 14,   cat: 'prato' },
  { name: 'Hambúrguer vegano (1un)',          kcal: 380, p: 22,   c: 36,   f: 16,   cat: 'prato' },

  // ===== Snacks salgados industrializados =====
  { name: 'Batata Lays original (50g)',       kcal: 270, p: 3,    c: 28,   f: 17,   cat: 'snack' },
  { name: 'Batata Ruffles cebola (50g)',      kcal: 265, p: 3,    c: 28,   f: 16,   cat: 'snack' },
  { name: 'Pringles original (lata sm)',      kcal: 535, p: 5,    c: 50,   f: 36,   cat: 'snack' },
  { name: 'Doritos queijo (50g)',             kcal: 250, p: 3.5,  c: 32,   f: 12,   cat: 'snack' },
  { name: 'Doritos tomate (50g)',             kcal: 250, p: 3.5,  c: 32,   f: 12,   cat: 'snack' },
  { name: 'Cheetos requeijão (50g)',          kcal: 240, p: 3,    c: 30,   f: 12,   cat: 'snack' },
  { name: 'Fandangos (50g)',                  kcal: 240, p: 2.5,  c: 33,   f: 11,   cat: 'snack' },
  { name: 'Pipoca de microondas (1 saco)',    kcal: 480, p: 8,    c: 65,   f: 22,   cat: 'snack' },
  { name: 'Pipoca natural (50g)',             kcal: 190, p: 6,    c: 39,   f: 2.5,  cat: 'snack' },
  { name: 'Pipoca doce (100g)',               kcal: 425, p: 5,    c: 80,   f: 12,   cat: 'erro' },
  { name: 'Amendoim japonês (40g)',           kcal: 200, p: 7,    c: 22,   f: 9,    cat: 'snack' },
  { name: 'Mix nuts salgado (40g)',           kcal: 240, p: 7,    c: 8,    f: 20,   cat: 'snack' },
  { name: 'Biscoito Cream Cracker (5un)',     kcal: 130, p: 3,    c: 19,   f: 4,    cat: 'snack' },
  { name: 'Biscoito Club Social (3un)',       kcal: 110, p: 2,    c: 13,   f: 5,    cat: 'snack' },
  { name: 'Polenguinho (1un)',                kcal: 40,  p: 2.5,  c: 0.5,  f: 3,    cat: 'snack' },
  { name: 'Petit Suisse (1un 45g)',           kcal: 60,  p: 2,    c: 9,    f: 1.5,  cat: 'doce' },
  { name: 'Iogurte Yakult (1 frasco)',        kcal: 50,  p: 0.7,  c: 11,   f: 0,    cat: 'bebida' },

  // ===== Biscoitos doces =====
  { name: 'Biscoito recheado chocolate (1un)',kcal: 70,  p: 0.9,  c: 10,   f: 3,    cat: 'doce' },
  { name: 'Biscoito recheado morango (1un)',  kcal: 70,  p: 0.9,  c: 10,   f: 3,    cat: 'doce' },
  { name: 'Biscoito Oreo (3un)',              kcal: 160, p: 1.5,  c: 24,   f: 7,    cat: 'doce' },
  { name: 'Wafer chocolate (4un)',            kcal: 160, p: 1,    c: 22,   f: 7,    cat: 'doce' },
  { name: 'Wafer morango (4un)',              kcal: 155, p: 1,    c: 22,   f: 7,    cat: 'doce' },
  { name: 'Biscoito Maria (5un)',             kcal: 100, p: 1.5,  c: 17,   f: 3,    cat: 'doce' },
  { name: 'Biscoito Maizena (5un)',           kcal: 110, p: 1.5,  c: 19,   f: 3,    cat: 'doce' },
  { name: 'Cookie chocolate chip caseiro (1)',kcal: 150, p: 2,    c: 20,   f: 7,    cat: 'doce' },
  { name: 'Cookie integral (1un)',            kcal: 110, p: 2.5,  c: 14,   f: 5,    cat: 'doce' },
  { name: 'Brownie caseiro (1un 70g)',        kcal: 270, p: 3.5,  c: 35,   f: 14,   cat: 'doce' },
  { name: 'Brownie sorvete (1 fatia)',        kcal: 380, p: 5,    c: 45,   f: 20,   cat: 'doce' },
  { name: 'Cheesecake morango (1 fatia)',     kcal: 340, p: 6,    c: 30,   f: 22,   cat: 'doce' },
  { name: 'Cheesecake chocolate (1 fatia)',   kcal: 380, p: 7,    c: 32,   f: 25,   cat: 'doce' },
  { name: 'Torta de limão (1 fatia)',         kcal: 290, p: 4,    c: 40,   f: 13,   cat: 'doce' },
  { name: 'Torta de morango (1 fatia)',       kcal: 280, p: 4,    c: 38,   f: 13,   cat: 'doce' },
  { name: 'Torta holandesa (1 fatia)',        kcal: 380, p: 5,    c: 32,   f: 26,   cat: 'doce' },
  { name: 'Torta de banana (1 fatia)',        kcal: 290, p: 4,    c: 42,   f: 13,   cat: 'doce' },
  { name: 'Petit gateau (1un)',               kcal: 450, p: 6,    c: 50,   f: 24,   cat: 'doce' },
  { name: 'Fondue chocolate (300g + frutas)', kcal: 580, p: 6,    c: 70,   f: 30,   cat: 'doce' },

  // ===== Suplementos / fitness =====
  { name: 'Whey concentrado (1 scoop 30g)',   kcal: 120, p: 24,   c: 3,    f: 1.5,  cat: 'supl' },
  { name: 'Whey isolado (1 scoop 30g)',       kcal: 110, p: 27,   c: 1,    f: 0.5,  cat: 'supl' },
  { name: 'Whey hidrolisado (1 scoop)',       kcal: 115, p: 25,   c: 1.5,  f: 1,    cat: 'supl' },
  { name: 'Whey vegano (1 scoop)',            kcal: 120, p: 22,   c: 4,    f: 2,    cat: 'supl' },
  { name: 'Albumina (1 dose 10g)',            kcal: 38,  p: 8.4,  c: 0,    f: 0.3,  cat: 'supl' },
  { name: 'Caseína (1 dose 30g)',             kcal: 110, p: 24,   c: 4,    f: 1,    cat: 'supl' },
  { name: 'Hipercalórico (1 dose 100g)',      kcal: 380, p: 30,   c: 60,   f: 3,    cat: 'supl' },
  { name: 'Maltodextrina (30g)',              kcal: 120, p: 0,    c: 30,   f: 0,    cat: 'supl' },
  { name: 'Waxy maize (30g)',                 kcal: 117, p: 0,    c: 29,   f: 0,    cat: 'supl' },
  { name: 'Dextrose (30g)',                   kcal: 120, p: 0,    c: 30,   f: 0,    cat: 'supl' },
  { name: 'Creatina monoidratada (5g)',       kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'Glutamina (5g)',                   kcal: 20,  p: 5,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'BCAA em pó (1 dose 10g)',          kcal: 40,  p: 10,   c: 0,    f: 0,    cat: 'supl' },
  { name: 'Beta-alanina (3g)',                kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'L-arginina (3g)',                  kcal: 0,   p: 3,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'L-carnitina líquida (1 dose)',     kcal: 5,   p: 0,    c: 1,    f: 0,    cat: 'supl' },
  { name: 'Pré-treino (1 scoop)',             kcal: 5,   p: 0,    c: 1,    f: 0,    cat: 'supl' },
  { name: 'Multivitamínico (1 cápsula)',      kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'Ômega-3 cápsula (1g)',             kcal: 9,   p: 0,    c: 0,    f: 1,    cat: 'supl' },
  { name: 'Vitamina C (1 cápsula)',           kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'Vitamina D3 (1 cápsula)',          kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'Colágeno hidrolisado (10g)',       kcal: 36,  p: 9,    c: 0,    f: 0,    cat: 'supl' },
  { name: 'Colágeno + ácido hialurônico',     kcal: 35,  p: 8,    c: 0.5,  f: 0,    cat: 'supl' },
  { name: 'Barra de proteína (1un 60g)',      kcal: 220, p: 20,   c: 22,   f: 7,    cat: 'snack' },
  { name: 'Barra Quest (1un)',                kcal: 190, p: 21,   c: 21,   f: 8,    cat: 'snack' },
  { name: 'Barra Crunchy proteica (1un)',     kcal: 210, p: 18,   c: 24,   f: 7,    cat: 'snack' },
  { name: 'Cookie proteico (1un)',            kcal: 180, p: 15,   c: 18,   f: 6,    cat: 'snack' },
  { name: 'Pasta de amendoim integral 30g',   kcal: 180, p: 7,    c: 7,    f: 15,   cat: 'gordura' },
  { name: 'Shake hipercalórico c/ leite',     kcal: 600, p: 40,   c: 80,   f: 12,   cat: 'bebida' },
  { name: 'Shake whey + banana',              kcal: 290, p: 28,   c: 30,   f: 4,    cat: 'bebida' },

  // ===== Vegan / vegetariano =====
  { name: 'Tofu firme grelhado (100g)',       kcal: 144, p: 17,   c: 3,    f: 9,    cat: 'proteina' },
  { name: 'Tofu defumado (100g)',             kcal: 165, p: 17,   c: 3,    f: 11,   cat: 'proteina' },
  { name: 'Seitan grelhado (100g)',           kcal: 121, p: 25,   c: 4,    f: 0.5,  cat: 'proteina' },
  { name: 'Tempeh grelhado (100g)',           kcal: 192, p: 19,   c: 7,    f: 11,   cat: 'proteina' },
  { name: 'PTS hidratada (100g)',             kcal: 110, p: 18,   c: 8,    f: 0.5,  cat: 'proteina' },
  { name: 'Hambúrguer Beyond Meat (1un)',     kcal: 230, p: 20,   c: 8,    f: 14,   cat: 'proteina' },
  { name: 'Hambúrguer Futuro (1un)',          kcal: 220, p: 19,   c: 8,    f: 13,   cat: 'proteina' },
  { name: 'Frango vegano (FYI 100g)',         kcal: 180, p: 18,   c: 6,    f: 9,    cat: 'proteina' },
  { name: 'Bife vegano (100g)',               kcal: 185, p: 18,   c: 8,    f: 9,    cat: 'proteina' },
  { name: 'Leite de soja (200ml)',            kcal: 80,  p: 7,    c: 6,    f: 4,    cat: 'bebida' },
  { name: 'Leite de aveia (200ml)',           kcal: 95,  p: 1,    c: 16,   f: 3,    cat: 'bebida' },
  { name: 'Leite de coco (200ml)',            kcal: 350, p: 3,    c: 6,    f: 36,   cat: 'bebida' },
  { name: 'Leite de amêndoas (200ml)',        kcal: 34,  p: 1.2,  c: 1.2,  f: 2.8,  cat: 'bebida' },
  { name: 'Leite de castanha (200ml)',        kcal: 70,  p: 1.5,  c: 8,    f: 3,    cat: 'bebida' },
  { name: 'Iogurte de coco vegano (100g)',    kcal: 70,  p: 1,    c: 8,    f: 4,    cat: 'proteina' },
  { name: 'Iogurte de amêndoa (100g)',        kcal: 60,  p: 2,    c: 6,    f: 3,    cat: 'proteina' },
  { name: 'Queijo vegano fatia (50g)',        kcal: 130, p: 4,    c: 6,    f: 10,   cat: 'proteina' },
  { name: 'Hummus tradicional (3 col)',       kcal: 110, p: 4,    c: 9,    f: 6,    cat: 'snack' },
  { name: 'Pasta de grão-de-bico (3 col)',    kcal: 100, p: 4,    c: 12,   f: 4,    cat: 'snack' },
  { name: 'Falafel assado (3un)',             kcal: 180, p: 8,    c: 22,   f: 8,    cat: 'prato' },

  // ===== Molhos e condimentos =====
  { name: 'Ketchup (1 col sopa)',             kcal: 20,  p: 0.2,  c: 5,    f: 0,    cat: 'doce' },
  { name: 'Mostarda amarela (1 col sopa)',    kcal: 10,  p: 0.6,  c: 0.6,  f: 0.6,  cat: 'gordura' },
  { name: 'Mostarda dijon (1 col sopa)',      kcal: 15,  p: 0.8,  c: 1,    f: 0.9,  cat: 'gordura' },
  { name: 'Mostarda mel (1 col sopa)',        kcal: 30,  p: 0.5,  c: 6,    f: 0.5,  cat: 'doce' },
  { name: 'Maionese tradicional (1 col)',     kcal: 90,  p: 0.1,  c: 0.5,  f: 10,   cat: 'gordura' },
  { name: 'Maionese light (1 col)',           kcal: 35,  p: 0.1,  c: 1.5,  f: 3,    cat: 'gordura' },
  { name: 'Maionese de alho (1 col)',         kcal: 85,  p: 0.5,  c: 1,    f: 9,    cat: 'gordura' },
  { name: 'Molho rosé (1 col)',               kcal: 80,  p: 0.2,  c: 2,    f: 8,    cat: 'gordura' },
  { name: 'Molho tártaro (1 col)',            kcal: 90,  p: 0.2,  c: 0.5,  f: 9,    cat: 'gordura' },
  { name: 'Molho de pimenta (1 col)',         kcal: 5,   p: 0.2,  c: 0.8,  f: 0,    cat: 'veg' },
  { name: 'Molho inglês (1 col)',             kcal: 7,   p: 0,    c: 1.5,  f: 0,    cat: 'veg' },
  { name: 'Molho shoyu (1 col)',              kcal: 8,   p: 1.3,  c: 0.8,  f: 0,    cat: 'veg' },
  { name: 'Molho shoyu light (1 col)',        kcal: 5,   p: 1,    c: 0.5,  f: 0,    cat: 'veg' },
  { name: 'Molho BBQ (1 col)',                kcal: 30,  p: 0.2,  c: 7,    f: 0.1,  cat: 'doce' },
  { name: 'Molho tomate caseiro (100g)',      kcal: 35,  p: 1.5,  c: 7,    f: 0.5,  cat: 'veg' },
  { name: 'Molho tomate Pomarola (100g)',     kcal: 50,  p: 1.5,  c: 9,    f: 1,    cat: 'veg' },
  { name: 'Molho branco (100g)',              kcal: 120, p: 3,    c: 8,    f: 8,    cat: 'gordura' },
  { name: 'Molho pesto (1 col)',              kcal: 80,  p: 1,    c: 1,    f: 8,    cat: 'gordura' },
  { name: 'Molho gorgonzola (1 col)',         kcal: 70,  p: 2,    c: 1,    f: 6.5,  cat: 'gordura' },
  { name: 'Vinagre balsâmico (1 col)',        kcal: 14,  p: 0,    c: 2.7,  f: 0,    cat: 'veg' },
  { name: 'Vinagre de maçã (1 col)',          kcal: 3,   p: 0,    c: 0.1,  f: 0,    cat: 'veg' },
  { name: 'Azeite extravirgem (1 col)',       kcal: 120, p: 0,    c: 0,    f: 14,   cat: 'gordura' },
  { name: 'Óleo de oliva (1 col)',            kcal: 120, p: 0,    c: 0,    f: 14,   cat: 'gordura' },
  { name: 'Óleo de coco (1 col)',             kcal: 120, p: 0,    c: 0,    f: 14,   cat: 'gordura' },
  { name: 'Óleo de soja (1 col)',             kcal: 120, p: 0,    c: 0,    f: 14,   cat: 'gordura' },
  { name: 'Manteiga (1 col)',                 kcal: 102, p: 0.1,  c: 0,    f: 12,   cat: 'gordura' },
  { name: 'Manteiga ghee (1 col)',            kcal: 112, p: 0,    c: 0,    f: 13,   cat: 'gordura' },
  { name: 'Margarina (1 col)',                kcal: 75,  p: 0,    c: 0,    f: 8.5,  cat: 'gordura' },
  { name: 'Banha de porco (1 col)',           kcal: 115, p: 0,    c: 0,    f: 13,   cat: 'gordura' },
  { name: 'Geleia de morango (1 col)',        kcal: 50,  p: 0.1,  c: 13,   f: 0,    cat: 'doce' },
  { name: 'Geleia de uva (1 col)',            kcal: 50,  p: 0.1,  c: 13,   f: 0,    cat: 'doce' },
  { name: 'Geleia diet (1 col)',              kcal: 15,  p: 0,    c: 4,    f: 0,    cat: 'doce' },
  { name: 'Mel (1 col)',                      kcal: 64,  p: 0.1,  c: 17,   f: 0,    cat: 'doce' },
  { name: 'Melado de cana (1 col)',           kcal: 55,  p: 0,    c: 13,   f: 0,    cat: 'doce' },
  { name: 'Açúcar refinado (1 col)',          kcal: 50,  p: 0,    c: 12,   f: 0,    cat: 'doce' },
  { name: 'Açúcar cristal (1 col)',           kcal: 50,  p: 0,    c: 12,   f: 0,    cat: 'doce' },
  { name: 'Açúcar mascavo (1 col)',           kcal: 48,  p: 0,    c: 12,   f: 0,    cat: 'doce' },
  { name: 'Açúcar de coco (1 col)',           kcal: 45,  p: 0,    c: 11,   f: 0,    cat: 'doce' },
  { name: 'Adoçante stévia (1 sachê)',        kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'doce' },
  { name: 'Adoçante sucralose (1 gota)',      kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'doce' },
  { name: 'Eritritol (1 col)',                kcal: 1,   p: 0,    c: 4,    f: 0,    cat: 'doce' },
  { name: 'Xilitol (1 col)',                  kcal: 9,   p: 0,    c: 4,    f: 0,    cat: 'doce' },

  // ===== Especiarias e ervas =====
  { name: 'Sal de cozinha (1 pitada)',        kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'veg' },
  { name: 'Sal rosa do Himalaia (1 pitada)',  kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'veg' },
  { name: 'Pimenta-do-reino (1 pitada)',      kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'veg' },
  { name: 'Pimenta cayena (1 pitada)',        kcal: 0,   p: 0,    c: 0,    f: 0,    cat: 'veg' },
  { name: 'Páprica doce (1 pitada)',          kcal: 1,   p: 0,    c: 0.2,  f: 0,    cat: 'veg' },
  { name: 'Páprica defumada (1 pitada)',      kcal: 1,   p: 0,    c: 0.2,  f: 0,    cat: 'veg' },
  { name: 'Cominho (1 pitada)',               kcal: 1,   p: 0,    c: 0.2,  f: 0,    cat: 'veg' },
  { name: 'Açafrão (1 pitada)',               kcal: 1,   p: 0,    c: 0.2,  f: 0,    cat: 'veg' },
  { name: 'Cúrcuma (1 col chá)',              kcal: 8,   p: 0.3,  c: 1.5,  f: 0.2,  cat: 'veg' },
  { name: 'Gengibre em pó (1 col chá)',       kcal: 6,   p: 0.2,  c: 1.3,  f: 0.1,  cat: 'veg' },
  { name: 'Canela em pó (1 col chá)',         kcal: 6,   p: 0.1,  c: 2,    f: 0,    cat: 'veg' },
  { name: 'Cravo da Índia (1 col chá)',       kcal: 7,   p: 0.1,  c: 1.4,  f: 0.3,  cat: 'veg' },
  { name: 'Noz-moscada (1 pitada)',           kcal: 2,   p: 0,    c: 0.2,  f: 0.1,  cat: 'veg' },
  { name: 'Curry em pó (1 col chá)',          kcal: 7,   p: 0.3,  c: 1.2,  f: 0.3,  cat: 'veg' },

  // ===== Carb-friendly café da manhã =====
  { name: 'Iogurte natural c/ mel (200g)',    kcal: 200, p: 7,    c: 28,   f: 7,    cat: 'doce' },
  { name: 'Iogurte natural c/ aveia + frutas',kcal: 270, p: 10,   c: 35,   f: 8,    cat: 'doce' },
  { name: 'Mingau aveia + leite + banana',    kcal: 320, p: 12,   c: 50,   f: 7,    cat: 'prato' },
  { name: 'Panqueca americana (1un)',         kcal: 175, p: 4,    c: 22,   f: 8,    cat: 'erro' },
  { name: 'Panqueca proteica banana+aveia+ovo',kcal: 200, p: 14,   c: 22,   f: 6,    cat: 'prato' },
  { name: 'Crepe doce Nutella (1un)',         kcal: 280, p: 5,    c: 38,   f: 12,   cat: 'erro' },
  { name: 'Waffle (1un)',                     kcal: 220, p: 5,    c: 25,   f: 11,   cat: 'erro' },
  { name: 'French toast (1 fatia)',           kcal: 180, p: 5,    c: 18,   f: 9,    cat: 'doce' },
  { name: 'Granola integral c/ iogurte 150g', kcal: 280, p: 9,    c: 40,   f: 10,   cat: 'prato' },
  { name: 'Smoothie bowl tropical (300g)',    kcal: 380, p: 8,    c: 65,   f: 10,   cat: 'prato' },
  { name: 'Overnight oats banana + aveia',    kcal: 320, p: 14,   c: 48,   f: 8,    cat: 'snack' },
  { name: 'Açaí com leite condensado (300ml)',kcal: 450, p: 6,    c: 75,   f: 14,   cat: 'erro' },

  // ===== Saladas =====
  { name: 'Salada simples (alface+tomate)',   kcal: 50,  p: 2,    c: 10,   f: 0.5,  cat: 'prato' },
  { name: 'Salada mista 200g',                kcal: 80,  p: 3,    c: 12,   f: 2,    cat: 'prato' },
  { name: 'Salada Caesar tradicional (1 prato)', kcal: 400, p: 12, c: 14,  f: 32,   cat: 'prato' },
  { name: 'Salada Caesar c/ frango (1 prato)',kcal: 470, p: 32,   c: 18,   f: 28,   cat: 'prato' },
  { name: 'Salada de atum (1 prato)',         kcal: 280, p: 26,   c: 8,    f: 16,   cat: 'prato' },
  { name: 'Salada de frango (1 prato)',       kcal: 320, p: 32,   c: 12,   f: 14,   cat: 'prato' },
  { name: 'Salada caprese (200g)',            kcal: 350, p: 14,   c: 8,    f: 28,   cat: 'prato' },
  { name: 'Salada grega (200g)',              kcal: 280, p: 9,    c: 14,   f: 20,   cat: 'prato' },
  { name: 'Salada de batata (100g)',          kcal: 180, p: 3,    c: 16,   f: 11,   cat: 'erro' },
  { name: 'Salada de maionese (100g)',        kcal: 220, p: 3,    c: 18,   f: 14,   cat: 'erro' },
  { name: 'Salada de macarrão (200g)',        kcal: 280, p: 6,    c: 32,   f: 14,   cat: 'erro' },
  { name: 'Tabule (200g)',                    kcal: 280, p: 6,    c: 38,   f: 11,   cat: 'prato' },
  { name: 'Salada de quinoa (200g)',          kcal: 260, p: 8,    c: 38,   f: 8,    cat: 'prato' },

  // ===== Sopas e caldos =====
  { name: 'Sopa de legumes (1 tigela)',       kcal: 120, p: 5,    c: 20,   f: 2,    cat: 'prato' },
  { name: 'Sopa de feijão (300ml)',           kcal: 200, p: 10,   c: 30,   f: 4,    cat: 'prato' },
  { name: 'Sopa de mandioquinha (300ml)',     kcal: 220, p: 4,    c: 32,   f: 7,    cat: 'prato' },
  { name: 'Sopa de cebola gratinada',         kcal: 280, p: 9,    c: 28,   f: 13,   cat: 'prato' },
  { name: 'Sopa creme abóbora (300ml)',       kcal: 180, p: 4,    c: 28,   f: 6,    cat: 'prato' },
  { name: 'Sopa creme aspargo (300ml)',       kcal: 160, p: 5,    c: 18,   f: 8,    cat: 'prato' },
  { name: 'Sopa creme palmito (300ml)',       kcal: 220, p: 6,    c: 22,   f: 12,   cat: 'prato' },
  { name: 'Sopa de tomate (300ml)',           kcal: 140, p: 5,    c: 22,   f: 4,    cat: 'prato' },
  { name: 'Canja de galinha (1 tigela)',      kcal: 220, p: 18,   c: 22,   f: 6,    cat: 'prato' },
  { name: 'Caldo de feijão (200ml)',          kcal: 130, p: 7,    c: 20,   f: 2,    cat: 'prato' },
  { name: 'Caldo de osso (200ml)',            kcal: 40,  p: 8,    c: 1,    f: 0.5,  cat: 'bebida' },
  { name: 'Caldo de mocotó (200ml)',          kcal: 60,  p: 10,   c: 1,    f: 2,    cat: 'bebida' },
  { name: 'Caldo verde (300ml)',              kcal: 180, p: 6,    c: 22,   f: 7,    cat: 'prato' },

  // ===== Itens de mercado / industrializados =====
  { name: 'Atum em lata Gomes da Costa',      kcal: 116, p: 26,   c: 0,    f: 0.8,  cat: 'proteina' },
  { name: 'Sardinha em lata 88 (1 lata)',     kcal: 380, p: 28,   c: 0,    f: 28,   cat: 'proteina' },
  { name: 'Anchova em conserva (50g)',        kcal: 110, p: 14,   c: 0,    f: 6,    cat: 'proteina' },
  { name: 'Salsicha em lata Hot Dog (1un)',   kcal: 100, p: 5,    c: 1,    f: 9,    cat: 'proteina' },
  { name: 'Patê de atum (1 col)',             kcal: 60,  p: 4,    c: 1,    f: 4,    cat: 'proteina' },
  { name: 'Patê de frango (1 col)',           kcal: 55,  p: 4,    c: 1,    f: 4,    cat: 'proteina' },
  { name: 'Ervilha em lata Quero (100g)',     kcal: 78,  p: 5,    c: 14,   f: 0.4,  cat: 'veg' },
  { name: 'Milho em lata Quero (100g)',       kcal: 80,  p: 2.8,  c: 17,   f: 1,    cat: 'veg' },
  { name: 'Seleta de legumes lata (100g)',    kcal: 65,  p: 3,    c: 12,   f: 0.5,  cat: 'veg' },
  { name: 'Azeitona verde em conserva (50g)', kcal: 70,  p: 0.7,  c: 2,    f: 7,    cat: 'gordura' },
  { name: 'Azeitona preta (50g)',             kcal: 80,  p: 0.7,  c: 2.5,  f: 8,    cat: 'gordura' },
  { name: 'Cogumelo em conserva (100g)',      kcal: 19,  p: 2.9,  c: 2.5,  f: 0.4,  cat: 'veg' },
  { name: 'Pepino em conserva (50g)',         kcal: 6,   p: 0.3,  c: 1.2,  f: 0,    cat: 'veg' },
  { name: 'Pickles misto (50g)',              kcal: 12,  p: 0.4,  c: 2.5,  f: 0,    cat: 'veg' },
  { name: 'Catchup Heinz (1 col)',            kcal: 18,  p: 0.2,  c: 4.5,  f: 0,    cat: 'doce' },
  { name: 'Tomate pelado em lata (100g)',     kcal: 28,  p: 1.3,  c: 5,    f: 0.4,  cat: 'veg' },
  { name: 'Polpa de tomate (100g)',           kcal: 60,  p: 3,    c: 13,   f: 0.4,  cat: 'veg' },
  { name: 'Extrato de tomate (1 col)',        kcal: 15,  p: 0.7,  c: 3,    f: 0,    cat: 'veg' },
  { name: 'Leite condensado lata (100g)',     kcal: 320, p: 7,    c: 56,   f: 8,    cat: 'doce' },
  { name: 'Creme de leite caixa (200g)',      kcal: 350, p: 4,    c: 8,    f: 35,   cat: 'gordura' },
  { name: 'Achocolatado Nescau pó (20g)',     kcal: 78,  p: 0.8,  c: 16,   f: 1,    cat: 'doce' },
  { name: 'Achocolatado Toddy pó (20g)',      kcal: 76,  p: 1,    c: 16,   f: 0.8,  cat: 'doce' },
  { name: 'Achocolatado Nescau pronto 200ml', kcal: 175, p: 7,    c: 26,   f: 5,    cat: 'bebida' },
  { name: 'Toddynho 200ml',                   kcal: 180, p: 7,    c: 27,   f: 5,    cat: 'bebida' },
  { name: 'Suco TANG (200ml preparado)',      kcal: 35,  p: 0,    c: 9,    f: 0,    cat: 'bebida' },
  { name: 'Suco DEL VALLE Caju 200ml',        kcal: 90,  p: 0,    c: 22,   f: 0,    cat: 'bebida' },

  // ===== Marcas conhecidas =====
  { name: 'Iogurte Activia natural (170g)',   kcal: 95,  p: 6,    c: 9,    f: 4,    cat: 'proteina' },
  { name: 'Iogurte Yopro (250g)',             kcal: 130, p: 25,   c: 7,    f: 0.5,  cat: 'proteina' },
  { name: 'Danoninho (1un 45g)',              kcal: 60,  p: 2,    c: 9,    f: 1.5,  cat: 'doce' },
  { name: 'Chamyto bebida láctea (1 frasco)', kcal: 60,  p: 1.5,  c: 11,   f: 1,    cat: 'bebida' },
  { name: 'Bauducco wafer (3un)',             kcal: 130, p: 1,    c: 18,   f: 6,    cat: 'doce' },
  { name: 'Triunfo biscoito (3un)',           kcal: 80,  p: 1,    c: 13,   f: 3,    cat: 'doce' },
  { name: 'Bauducco panettone (1 fatia 80g)', kcal: 290, p: 5,    c: 50,   f: 7,    cat: 'doce' },
  { name: 'Bauducco chocottone (1 fatia)',    kcal: 310, p: 5,    c: 50,   f: 9,    cat: 'doce' },
  { name: 'Nutella (1 col sopa 20g)',         kcal: 110, p: 1,    c: 11,   f: 7,    cat: 'doce' },
  { name: 'Doce de leite Viçosa (1 col)',     kcal: 95,  p: 1.7,  c: 17,   f: 2,    cat: 'doce' },

  // ===== Refeições prontas / congelados =====
  { name: 'Lasanha congelada Sadia (200g)',   kcal: 280, p: 14,   c: 30,   f: 10,   cat: 'prato' },
  { name: 'Pizza congelada Sadia (1/4)',      kcal: 320, p: 13,   c: 35,   f: 12,   cat: 'erro' },
  { name: 'Empada congelada (1un)',           kcal: 210, p: 6,    c: 22,   f: 11,   cat: 'erro' },
  { name: 'Hambúrguer Sadia (1un cru)',       kcal: 160, p: 12,   c: 1,    f: 12,   cat: 'proteina' },
  { name: 'Nuggets Sadia (5un cru)',          kcal: 220, p: 12,   c: 14,   f: 13,   cat: 'erro' },
  { name: 'Steak frango Sadia (1un)',         kcal: 220, p: 14,   c: 12,   f: 13,   cat: 'erro' },
  { name: 'Strogonoff congelado (300g)',      kcal: 380, p: 24,   c: 20,   f: 22,   cat: 'prato' },
  { name: 'Macarrão instantâneo (1 pacote)',  kcal: 380, p: 9,    c: 55,   f: 14,   cat: 'erro' },
  { name: 'Sopa instantânea Knorr (1 sachê)', kcal: 130, p: 3,    c: 22,   f: 3,    cat: 'erro' },
  { name: 'Cup Noodles (1 copo)',             kcal: 320, p: 8,    c: 50,   f: 11,   cat: 'erro' },

  // ============================================================
  // ===== 2ª EXPANSÃO — +300 itens =============================
  // ============================================================

  // ===== Comida de boteco / petiscos =====
  { name: 'Bolinho de bacalhau (3un)',         kcal: 480, p: 22,   c: 38,   f: 26,   cat: 'erro' },
  { name: 'Linguiça acebolada (100g)',         kcal: 290, p: 14,   c: 5,    f: 23,   cat: 'proteina' },
  { name: 'Calabresa acebolada (100g)',        kcal: 320, p: 14,   c: 4,    f: 27,   cat: 'proteina' },
  { name: 'Carne seca acebolada (100g)',       kcal: 280, p: 28,   c: 5,    f: 15,   cat: 'proteina' },
  { name: 'Frango à passarinho (100g)',        kcal: 280, p: 22,   c: 5,    f: 18,   cat: 'erro' },
  { name: 'Polenta frita (100g)',              kcal: 240, p: 4,    c: 28,   f: 12,   cat: 'erro' },
  { name: 'Mandioca frita (100g)',             kcal: 270, p: 1.2,  c: 37,   f: 13,   cat: 'erro' },
  { name: 'Aipim com carne seca (200g)',       kcal: 350, p: 22,   c: 32,   f: 14,   cat: 'prato' },
  { name: 'Isca de tilápia (100g)',            kcal: 220, p: 18,   c: 14,   f: 10,   cat: 'erro' },
  { name: 'Isca de fígado (100g)',             kcal: 240, p: 22,   c: 10,   f: 12,   cat: 'erro' },
  { name: 'Casquinha de siri (1un)',           kcal: 180, p: 12,   c: 14,   f: 9,    cat: 'prato' },
  { name: 'Bolinho de queijo (5un)',           kcal: 380, p: 14,   c: 30,   f: 22,   cat: 'erro' },
  { name: 'Bolinho de aipim (5un)',            kcal: 350, p: 6,    c: 42,   f: 16,   cat: 'erro' },
  { name: 'Croquete de bacalhau (3un)',        kcal: 420, p: 18,   c: 32,   f: 24,   cat: 'erro' },
  { name: 'Pastel de feira (1un grande)',      kcal: 280, p: 8,    c: 24,   f: 16,   cat: 'erro' },
  { name: 'Caldo de mocotó (1 tigela)',        kcal: 240, p: 16,   c: 8,    f: 14,   cat: 'prato' },
  { name: 'Bobó de frango (300g)',             kcal: 380, p: 28,   c: 22,   f: 18,   cat: 'prato' },
  { name: 'Galeto à passarinho (200g)',        kcal: 380, p: 35,   c: 0,    f: 26,   cat: 'proteina' },
  { name: 'Espetinho de carne (1un)',          kcal: 165, p: 18,   c: 1,    f: 10,   cat: 'proteina' },
  { name: 'Espetinho de frango (1un)',         kcal: 130, p: 18,   c: 1,    f: 6,    cat: 'proteina' },
  { name: 'Espetinho de medalhão (1un)',       kcal: 220, p: 16,   c: 1,    f: 17,   cat: 'erro' },
  { name: 'Espetinho de queijo coalho (1un)',  kcal: 110, p: 8,    c: 1,    f: 8,    cat: 'proteina' },
  { name: 'Choripán (1un)',                    kcal: 420, p: 16,   c: 32,   f: 24,   cat: 'erro' },
  { name: 'Pernil prensado no pão (1un)',      kcal: 460, p: 28,   c: 40,   f: 20,   cat: 'erro' },

  // ===== Comidas regionais brasileiras =====
  { name: 'Tapioca com queijo coalho (1un)',   kcal: 260, p: 14,   c: 35,   f: 8,    cat: 'prato' },
  { name: 'Tapioca com carne seca (1un)',      kcal: 320, p: 22,   c: 36,   f: 10,   cat: 'prato' },
  { name: 'Tapioca de chocolate (1un)',        kcal: 230, p: 3,    c: 42,   f: 5,    cat: 'doce' },
  { name: 'Tapioca de banana com canela',      kcal: 200, p: 2,    c: 40,   f: 3,    cat: 'doce' },
  { name: 'Cocada baiana (1 fatia)',           kcal: 220, p: 1.5,  c: 32,   f: 10,   cat: 'doce' },
  { name: 'Casadinho (1un)',                   kcal: 90,  p: 1,    c: 15,   f: 3,    cat: 'doce' },
  { name: 'Sequilho de leite (3un)',           kcal: 100, p: 1.5,  c: 15,   f: 4,    cat: 'doce' },
  { name: 'Doce de abóbora (50g)',             kcal: 130, p: 0.5,  c: 32,   f: 0.1,  cat: 'doce' },
  { name: 'Doce de mamão (50g)',               kcal: 135, p: 0.3,  c: 33,   f: 0.1,  cat: 'doce' },
  { name: 'Pamonha salgada (1un)',             kcal: 250, p: 8,    c: 32,   f: 10,   cat: 'snack' },
  { name: 'Pamonha doce (1un)',                kcal: 220, p: 4,    c: 38,   f: 6,    cat: 'doce' },
  { name: 'Pé de moça (1un)',                  kcal: 70,  p: 1.2,  c: 12,   f: 2,    cat: 'doce' },
  { name: 'Doce de batata-doce (50g)',         kcal: 130, p: 0.5,  c: 30,   f: 0.5,  cat: 'doce' },
  { name: 'Beiju doce de coco (1un)',          kcal: 180, p: 1.5,  c: 32,   f: 5,    cat: 'doce' },
  { name: 'Cuscuz com leite (1 tigela)',       kcal: 270, p: 7,    c: 42,   f: 8,    cat: 'prato' },
  { name: 'Polenta com ragu (300g)',           kcal: 380, p: 14,   c: 42,   f: 15,   cat: 'prato' },
  { name: 'Bauru paulista (1 sanduíche)',      kcal: 480, p: 28,   c: 38,   f: 22,   cat: 'erro' },
  { name: 'Beirute (1 sanduíche)',             kcal: 520, p: 30,   c: 45,   f: 24,   cat: 'erro' },
  { name: 'X-egg (1 sanduíche)',               kcal: 580, p: 28,   c: 40,   f: 32,   cat: 'erro' },
  { name: 'Sanduíche prensado (1un)',          kcal: 380, p: 18,   c: 38,   f: 18,   cat: 'erro' },

  // ===== Frutas regionais =====
  { name: 'Pitomba (10un)',                    kcal: 60,  p: 1,    c: 14,   f: 0.5,  cat: 'fruta' },
  { name: 'Cajá-manga (1un)',                  kcal: 45,  p: 1,    c: 11,   f: 0.3,  cat: 'fruta' },
  { name: 'Umbu (1un)',                        kcal: 22,  p: 0.5,  c: 5.5,  f: 0.1,  cat: 'fruta' },
  { name: 'Seriguela (5un)',                   kcal: 50,  p: 0.6,  c: 12,   f: 0.4,  cat: 'fruta' },
  { name: 'Buriti polpa (50g)',                kcal: 92,  p: 1,    c: 13,   f: 4.5,  cat: 'fruta' },
  { name: 'Tucumã polpa (50g)',                kcal: 130, p: 1.5,  c: 6,    f: 12,   cat: 'gordura' },
  { name: 'Bacuri polpa (100g)',               kcal: 76,  p: 0.7,  c: 19,   f: 0.3,  cat: 'fruta' },
  { name: 'Murici (10un)',                     kcal: 50,  p: 0.8,  c: 11,   f: 0.7,  cat: 'fruta' },
  { name: 'Mangaba (5un)',                     kcal: 43,  p: 1,    c: 10,   f: 0.2,  cat: 'fruta' },
  { name: 'Sapoti (1un)',                      kcal: 85,  p: 0.6,  c: 22,   f: 1,    cat: 'fruta' },
  { name: 'Açaí grosso (300g)',                kcal: 270, p: 4,    c: 30,   f: 18,   cat: 'fruta' },
  { name: 'Cupuaçu cremoso (200g)',            kcal: 220, p: 3,    c: 38,   f: 7,    cat: 'doce' },
  { name: 'Graviola polpa (100g)',             kcal: 66,  p: 1,    c: 17,   f: 0.3,  cat: 'fruta' },
  { name: 'Tamarindo polpa (50g)',             kcal: 120, p: 1.4,  c: 31,   f: 0.3,  cat: 'fruta' },

  // ===== Verduras adicionais =====
  { name: 'Salsão / aipo (100g)',              kcal: 16,  p: 0.7,  c: 3,    f: 0.2,  cat: 'veg' },
  { name: 'Erva-doce (100g)',                  kcal: 31,  p: 1.2,  c: 7,    f: 0.2,  cat: 'veg' },
  { name: 'Funcho (100g)',                     kcal: 31,  p: 1.2,  c: 7,    f: 0.2,  cat: 'veg' },
  { name: 'Pak choi (100g)',                   kcal: 13,  p: 1.5,  c: 2.2,  f: 0.2,  cat: 'veg' },
  { name: 'Mostarda em folhas (100g)',         kcal: 27,  p: 2.8,  c: 4.7,  f: 0.4,  cat: 'veg' },
  { name: 'Taioba refogada (100g)',            kcal: 28,  p: 2.7,  c: 4,    f: 0.4,  cat: 'veg' },
  { name: 'Folha de mandioca (100g)',          kcal: 38,  p: 4,    c: 6,    f: 0.6,  cat: 'veg' },
  { name: 'Chuchu refogado (100g)',            kcal: 22,  p: 0.8,  c: 5,    f: 0.1,  cat: 'veg' },
  { name: 'Maxixe (100g)',                     kcal: 12,  p: 0.8,  c: 2.5,  f: 0.1,  cat: 'veg' },
  { name: 'Jiló refogado (100g)',              kcal: 35,  p: 1.2,  c: 7,    f: 0.2,  cat: 'veg' },
  { name: 'Cará-roxo cozido (100g)',           kcal: 110, p: 1.5,  c: 26,   f: 0.2,  cat: 'carb' },

  // ===== Café da manhã + brunch =====
  { name: 'Café da manhã hotel completo',      kcal: 720, p: 30,   c: 65,   f: 38,   cat: 'erro' },
  { name: 'Bowl proteico (aveia+whey+banana)', kcal: 420, p: 35,   c: 50,   f: 9,    cat: 'prato' },
  { name: 'Açaí proteico (whey 30g+banana)',   kcal: 380, p: 30,   c: 45,   f: 8,    cat: 'prato' },
  { name: 'Iogurte com cereal Nestlé Fitness', kcal: 220, p: 9,    c: 38,   f: 4,    cat: 'snack' },
  { name: 'Pão integral c/ ovo e abacate (1)', kcal: 320, p: 14,   c: 25,   f: 18,   cat: 'prato' },
  { name: 'Pão integral c/ pasta amend.+banana', kcal: 280, p: 8,    c: 32,   f: 12,   cat: 'snack' },
  { name: 'Crepioca de banana e whey',         kcal: 280, p: 22,   c: 28,   f: 7,    cat: 'prato' },
  { name: 'Omelete fit (3 claras + 1 ovo)',    kcal: 130, p: 18,   c: 1,    f: 5,    cat: 'proteina' },
  { name: 'Granola c/ leite (200ml)',          kcal: 300, p: 9,    c: 45,   f: 10,   cat: 'snack' },
  { name: 'Mingau de aveia c/ canela e mel',   kcal: 290, p: 11,   c: 45,   f: 7,    cat: 'prato' },
  { name: 'Tigela de açaí + frutas + chia',    kcal: 380, p: 6,    c: 65,   f: 11,   cat: 'snack' },
  { name: 'Cookie de aveia caseiro (1un)',     kcal: 110, p: 2,    c: 17,   f: 4,    cat: 'doce' },
  { name: 'Bolo proteico aveia/whey (1 fatia)',kcal: 200, p: 16,   c: 22,   f: 6,    cat: 'snack' },

  // ===== Lanchonete brasileira =====
  { name: 'Pão de queijo gigante (1un 120g)',  kcal: 380, p: 10,   c: 38,   f: 21,   cat: 'snack' },
  { name: 'Salgado folhado de presunto+queijo',kcal: 320, p: 12,   c: 28,   f: 18,   cat: 'erro' },
  { name: 'Mini-pizza muçarela',               kcal: 180, p: 8,    c: 22,   f: 7,    cat: 'snack' },
  { name: 'Pão recheado de salsicha (1un)',    kcal: 320, p: 10,   c: 32,   f: 16,   cat: 'erro' },
  { name: 'Empanado de frango (1un)',          kcal: 180, p: 12,   c: 14,   f: 8,    cat: 'erro' },
  { name: 'Sanduíche de pernil (1un)',         kcal: 380, p: 22,   c: 32,   f: 16,   cat: 'erro' },
  { name: 'Sanduíche de mortadela (1un)',      kcal: 420, p: 18,   c: 35,   f: 22,   cat: 'erro' },
  { name: 'X-salada simples (1un)',            kcal: 520, p: 24,   c: 42,   f: 28,   cat: 'erro' },
  { name: 'Vitamina laranja+cenoura+beterraba',kcal: 130, p: 2,    c: 30,   f: 0.5,  cat: 'bebida' },
  { name: 'Suco verde detox (limão+couve)',    kcal: 60,  p: 1.5,  c: 14,   f: 0.3,  cat: 'bebida' },

  // ===== Acompanhamentos =====
  { name: 'Farofa de cebola caseira (50g)',    kcal: 200, p: 2,    c: 28,   f: 8,    cat: 'carb' },
  { name: 'Farofa de bacon (50g)',             kcal: 240, p: 4,    c: 24,   f: 14,   cat: 'erro' },
  { name: 'Farofa de banana (50g)',            kcal: 180, p: 2,    c: 30,   f: 6,    cat: 'carb' },
  { name: 'Vinagrete (4 col sopa)',            kcal: 25,  p: 0.5,  c: 4,    f: 0.5,  cat: 'veg' },
  { name: 'Maionese de batata (100g)',         kcal: 220, p: 3,    c: 18,   f: 14,   cat: 'erro' },
  { name: 'Maionese de cenoura+ovo (100g)',    kcal: 180, p: 4,    c: 14,   f: 12,   cat: 'erro' },
  { name: 'Salada de batata e ovo (100g)',     kcal: 200, p: 5,    c: 16,   f: 13,   cat: 'erro' },
  { name: 'Repolho refogado c/ alho (100g)',   kcal: 50,  p: 1.5,  c: 7,    f: 2,    cat: 'veg' },
  { name: 'Couve refogada na manteiga (100g)', kcal: 70,  p: 3,    c: 5,    f: 4,    cat: 'veg' },
  { name: 'Brócolis na manteiga (100g)',       kcal: 80,  p: 3,    c: 7,    f: 5,    cat: 'veg' },

  // ===== Doces de festa / sobremesas elaboradas =====
  { name: 'Bem-casado tradicional (1un)',      kcal: 180, p: 2,    c: 28,   f: 7,    cat: 'doce' },
  { name: 'Camafeu de nozes (1un)',            kcal: 110, p: 1.5,  c: 13,   f: 6,    cat: 'doce' },
  { name: 'Mãe-bento (1un)',                   kcal: 90,  p: 1.5,  c: 15,   f: 3,    cat: 'doce' },
  { name: 'Sonho de padaria recheado (1un)',   kcal: 280, p: 5,    c: 38,   f: 12,   cat: 'doce' },
  { name: 'Rosca recheada doce (1 fatia)',     kcal: 230, p: 4,    c: 36,   f: 7,    cat: 'doce' },
  { name: 'Bolo formigueiro (1 fatia)',        kcal: 280, p: 4,    c: 45,   f: 10,   cat: 'doce' },
  { name: 'Bolo de aniversário c/ recheio',    kcal: 380, p: 6,    c: 50,   f: 17,   cat: 'doce' },
  { name: 'Pavê de chocolate (1 fatia)',       kcal: 380, p: 6,    c: 38,   f: 22,   cat: 'doce' },
  { name: 'Pavê de bolacha c/ leite condensado',kcal: 420, p: 6,    c: 50,   f: 20,   cat: 'doce' },
  { name: 'Torta de bolacha + sorvete',        kcal: 480, p: 7,    c: 60,   f: 22,   cat: 'doce' },
  { name: 'Bolo de rolo (1 fatia)',            kcal: 320, p: 5,    c: 50,   f: 11,   cat: 'doce' },
  { name: 'Bolo nega-maluca (1 fatia)',        kcal: 310, p: 5,    c: 50,   f: 11,   cat: 'doce' },
  { name: 'Empadinha de leite condensado',     kcal: 240, p: 4,    c: 38,   f: 8,    cat: 'doce' },
  { name: 'Brownie c/ sorvete (1 porção)',     kcal: 540, p: 7,    c: 65,   f: 28,   cat: 'doce' },

  // ===== Sushi e pratos japoneses adicionais =====
  { name: 'California roll (5un)',             kcal: 240, p: 9,    c: 36,   f: 7,    cat: 'prato' },
  { name: 'Salmão skin (5un)',                 kcal: 320, p: 12,   c: 30,   f: 18,   cat: 'erro' },
  { name: 'Niguiri kani (1un)',                kcal: 42,  p: 2,    c: 7,    f: 0.5,  cat: 'prato' },
  { name: 'Sushi de manga (1un)',              kcal: 55,  p: 1,    c: 11,   f: 0.8,  cat: 'prato' },
  { name: 'Joe spicy salmon (5un)',            kcal: 280, p: 10,   c: 30,   f: 12,   cat: 'erro' },
  { name: 'Combinado 20 peças',                kcal: 800, p: 35,   c: 110,  f: 22,   cat: 'erro' },
  { name: 'Sashimi salmão (1 porção 100g)',    kcal: 208, p: 22,   c: 0,    f: 13,   cat: 'proteina' },
  { name: 'Yakitori frango (3 espetos)',       kcal: 220, p: 24,   c: 6,    f: 11,   cat: 'proteina' },
  { name: 'Donburi de salmão (1 tigela)',      kcal: 480, p: 26,   c: 60,   f: 14,   cat: 'prato' },
  { name: 'Donburi de frango (oyakodon)',      kcal: 520, p: 28,   c: 70,   f: 12,   cat: 'prato' },
  { name: 'Tempurá legumes (5un)',             kcal: 280, p: 5,    c: 32,   f: 14,   cat: 'erro' },
  { name: 'Edamame com sal (100g)',            kcal: 121, p: 12,   c: 9,    f: 5,    cat: 'proteina' },
  { name: 'Missoshiru (1 tigela)',             kcal: 80,  p: 6,    c: 8,    f: 3,    cat: 'prato' },

  // ===== Comida indiana / mediterrânea =====
  { name: 'Falafel pita c/ tzatziki (1 wrap)', kcal: 420, p: 13,   c: 50,   f: 18,   cat: 'prato' },
  { name: 'Shawarma de frango (1un)',          kcal: 540, p: 32,   c: 50,   f: 22,   cat: 'erro' },
  { name: 'Shawarma de cordeiro (1un)',        kcal: 620, p: 32,   c: 50,   f: 32,   cat: 'erro' },
  { name: 'Kebab no espeto (200g)',            kcal: 380, p: 35,   c: 0,    f: 26,   cat: 'proteina' },
  { name: 'Kafta grelhada (200g)',             kcal: 420, p: 28,   c: 4,    f: 32,   cat: 'proteina' },
  { name: 'Coalhada seca (100g)',              kcal: 105, p: 6,    c: 5,    f: 7,    cat: 'proteina' },
  { name: 'Babaganoush (100g)',                kcal: 130, p: 3,    c: 9,    f: 9,    cat: 'snack' },
  { name: 'Pão sírio + hummus (1 porção)',     kcal: 280, p: 9,    c: 38,   f: 10,   cat: 'snack' },
  { name: 'Curry de grão-de-bico (300g)',      kcal: 360, p: 14,   c: 45,   f: 14,   cat: 'prato' },
  { name: 'Dal indiano (300g)',                kcal: 280, p: 14,   c: 38,   f: 8,    cat: 'prato' },
  { name: 'Naan c/ alho (1un)',                kcal: 290, p: 8,    c: 45,   f: 8,    cat: 'snack' },
  { name: 'Lassi de manga (300ml)',            kcal: 220, p: 6,    c: 38,   f: 5,    cat: 'bebida' },
  { name: 'Doce gulab jamun (3un)',            kcal: 280, p: 4,    c: 45,   f: 10,   cat: 'doce' },

  // ===== Pratos mexicanos / latinos =====
  { name: 'Guacamole (3 col sopa)',            kcal: 110, p: 2,    c: 7,    f: 9,    cat: 'gordura' },
  { name: 'Pico de gallo (3 col)',             kcal: 20,  p: 0.5,  c: 4,    f: 0.2,  cat: 'veg' },
  { name: 'Salsa verde (3 col)',               kcal: 25,  p: 0.5,  c: 5,    f: 0.5,  cat: 'veg' },
  { name: 'Fajita de frango (1 porção)',       kcal: 480, p: 30,   c: 45,   f: 18,   cat: 'prato' },
  { name: 'Fajita de carne (1 porção)',        kcal: 540, p: 32,   c: 45,   f: 24,   cat: 'prato' },
  { name: 'Enchilada (1un)',                   kcal: 380, p: 18,   c: 35,   f: 18,   cat: 'erro' },
  { name: 'Chimichanga (1un)',                 kcal: 480, p: 22,   c: 42,   f: 24,   cat: 'erro' },
  { name: 'Tortilla de milho (1un)',           kcal: 60,  p: 1.6,  c: 13,   f: 0.6,  cat: 'snack' },
  { name: 'Empanada argentina (1un)',          kcal: 280, p: 12,   c: 26,   f: 14,   cat: 'erro' },
  { name: 'Pão de minuto/pão árabe (1un)',     kcal: 165, p: 5.5,  c: 33,   f: 1.5,  cat: 'snack' },

  // ===== Coreanos básicos (PT puro, sem hangul) =====
  { name: 'Bibimbap completo (1 tigela)',      kcal: 560, p: 25,   c: 75,   f: 16,   cat: 'prato', kpopOnly: true },
  { name: 'Tigela proteica coreana (frango+arroz)',kcal: 480, p: 38,  c: 55, f: 10,   cat: 'prato' },
  { name: 'Frango ao alho coreano (200g)',     kcal: 380, p: 32,   c: 14,   f: 18,   cat: 'prato' },
  { name: 'Carne bulgogi caseira (200g)',      kcal: 360, p: 30,   c: 8,    f: 22,   cat: 'prato', kpopOnly: true },
  { name: 'Pão tipo bao c/ pernil (1un)',      kcal: 280, p: 12,   c: 32,   f: 11,   cat: 'prato' },
  { name: 'Bolinho recheado vapor (1un)',      kcal: 200, p: 7,    c: 26,   f: 7,    cat: 'snack' },

  // ===== Veganos extras =====
  { name: 'Hambúrguer de grão-de-bico (1un)',  kcal: 220, p: 9,    c: 28,   f: 8,    cat: 'prato' },
  { name: 'Hambúrguer de feijão preto (1un)',  kcal: 200, p: 11,   c: 25,   f: 6,    cat: 'prato' },
  { name: 'Hambúrguer de lentilha (1un)',      kcal: 210, p: 12,   c: 26,   f: 6,    cat: 'prato' },
  { name: 'Almôndega de grão-de-bico (3un)',   kcal: 180, p: 7,    c: 22,   f: 7,    cat: 'prato' },
  { name: 'Strogonoff de cogumelos (300g)',    kcal: 320, p: 11,   c: 30,   f: 18,   cat: 'prato' },
  { name: 'Lasanha vegana (200g)',             kcal: 280, p: 11,   c: 30,   f: 13,   cat: 'prato' },
  { name: 'Pizza vegana (1 fatia)',            kcal: 220, p: 7,    c: 30,   f: 8,    cat: 'erro' },
  { name: 'Bowl de quinoa, abacate e grão',    kcal: 420, p: 14,   c: 55,   f: 15,   cat: 'prato' },
  { name: 'Pasta de homus c/ pita (1 porção)', kcal: 280, p: 9,    c: 38,   f: 10,   cat: 'snack' },
  { name: 'Tofu mexido c/ vegetais (200g)',    kcal: 220, p: 18,   c: 12,   f: 12,   cat: 'prato' },
  { name: 'Smoothie verde proteico (vegano)',  kcal: 260, p: 22,   c: 28,   f: 5,    cat: 'bebida' },
  { name: 'Iogurte de coco c/ granola',        kcal: 260, p: 5,    c: 38,   f: 10,   cat: 'snack' },
  { name: 'Sorvete vegano (100g)',             kcal: 180, p: 2,    c: 24,   f: 8,    cat: 'doce' },

  // ===== Preparos saudáveis / fit =====
  { name: 'Frango grelhado c/ legumes (300g)', kcal: 380, p: 45,   c: 18,   f: 12,   cat: 'prato' },
  { name: 'Salmão grelhado c/ legumes (300g)', kcal: 420, p: 38,   c: 14,   f: 24,   cat: 'prato' },
  { name: 'Bolo de carne magra (200g)',        kcal: 320, p: 32,   c: 8,    f: 18,   cat: 'prato' },
  { name: 'Atum c/ batata-doce e brócolis',    kcal: 380, p: 35,   c: 32,   f: 12,   cat: 'prato' },
  { name: 'Bowl açaí proteico fit',            kcal: 320, p: 26,   c: 35,   f: 8,    cat: 'snack' },
  { name: 'Crepioca c/ frango desfiado',       kcal: 280, p: 24,   c: 18,   f: 12,   cat: 'prato' },
  { name: 'Frittata de claras e legumes',      kcal: 160, p: 18,   c: 8,    f: 6,    cat: 'prato' },
  { name: 'Salada de quinoa c/ grão-de-bico',  kcal: 360, p: 14,   c: 50,   f: 12,   cat: 'prato' },
  { name: 'Hambúrguer caseiro low-carb (1)',   kcal: 280, p: 28,   c: 5,    f: 18,   cat: 'proteina' },
  { name: 'Wrap proteico de frango (1un)',     kcal: 380, p: 30,   c: 35,   f: 12,   cat: 'prato' },
  { name: 'Pizza low-carb base couve-flor',    kcal: 240, p: 14,   c: 12,   f: 14,   cat: 'prato' },
  { name: 'Brigadeiro fit (whey+cacau)',       kcal: 50,  p: 4,    c: 5,    f: 1.5,  cat: 'doce' },

  // ===== Bebidas funcionais =====
  { name: 'Kombucha rosa (300ml)',             kcal: 35,  p: 0,    c: 8,    f: 0,    cat: 'bebida' },
  { name: 'Kombucha gengibre (300ml)',         kcal: 30,  p: 0,    c: 7,    f: 0,    cat: 'bebida' },
  { name: 'Kefir de coco (200ml)',             kcal: 70,  p: 1,    c: 8,    f: 4,    cat: 'bebida' },
  { name: 'Chá kombucha caseiro (300ml)',      kcal: 25,  p: 0,    c: 6,    f: 0,    cat: 'bebida' },
  { name: 'Suco vegetal natural (300ml)',      kcal: 110, p: 3,    c: 22,   f: 1,    cat: 'bebida' },
  { name: 'Smoothie de açaí com proteína',     kcal: 340, p: 22,   c: 40,   f: 10,   cat: 'bebida' },
  { name: 'Vitamina de mamão (300ml)',         kcal: 160, p: 4,    c: 32,   f: 2,    cat: 'bebida' },
  { name: 'Vitamina de morango com banana',    kcal: 220, p: 7,    c: 38,   f: 4,    cat: 'bebida' },
  { name: 'Café gelado proteico (300ml)',      kcal: 160, p: 22,   c: 12,   f: 2,    cat: 'bebida' },
  { name: 'Bulletproof coffee (1 caneca)',     kcal: 260, p: 1,    c: 1,    f: 28,   cat: 'bebida' },
  { name: 'Chá de hibisco gelado (300ml)',     kcal: 8,   p: 0,    c: 2,    f: 0,    cat: 'bebida' },
  { name: 'Chá detox (300ml)',                 kcal: 10,  p: 0,    c: 2,    f: 0,    cat: 'bebida' },
  { name: 'Whey shake com banana (300ml)',     kcal: 290, p: 30,   c: 30,   f: 4,    cat: 'bebida' },
  { name: 'Whey shake com aveia (300ml)',      kcal: 320, p: 32,   c: 35,   f: 5,    cat: 'bebida' },
  { name: 'Café com colágeno (200ml)',         kcal: 50,  p: 10,   c: 1,    f: 0,    cat: 'bebida' },

  // ===== Sopas e caldos extras =====
  { name: 'Sopa de macarrão (1 tigela)',       kcal: 240, p: 10,   c: 38,   f: 6,    cat: 'prato' },
  { name: 'Sopa Toscana (1 tigela)',           kcal: 320, p: 12,   c: 18,   f: 22,   cat: 'prato' },
  { name: 'Sopa minestrone (1 tigela)',        kcal: 200, p: 7,    c: 28,   f: 6,    cat: 'prato' },
  { name: 'Sopa de batata e alho-poró',        kcal: 240, p: 6,    c: 30,   f: 10,   cat: 'prato' },
  { name: 'Sopa de cenoura e gengibre',        kcal: 170, p: 3,    c: 25,   f: 6,    cat: 'prato' },
  { name: 'Sopa de feijão branco (1 tigela)',  kcal: 240, p: 12,   c: 35,   f: 5,    cat: 'prato' },
  { name: 'Sopa de lentilha (1 tigela)',       kcal: 220, p: 12,   c: 32,   f: 4,    cat: 'prato' },
  { name: 'Caldo de feijoada (200ml)',         kcal: 180, p: 9,    c: 18,   f: 7,    cat: 'prato' },

  // ===== Massas regionais =====
  { name: 'Espaguete à puttanesca (300g)',     kcal: 480, p: 14,   c: 65,   f: 17,   cat: 'prato' },
  { name: 'Linguini ao limone (300g)',         kcal: 460, p: 13,   c: 62,   f: 18,   cat: 'prato' },
  { name: 'Lasagna 4 queijos (200g)',          kcal: 420, p: 18,   c: 30,   f: 24,   cat: 'erro' },
  { name: 'Canelone de ricota e espinafre',    kcal: 360, p: 14,   c: 38,   f: 16,   cat: 'prato' },
  { name: 'Canelone de carne (200g)',          kcal: 380, p: 18,   c: 36,   f: 18,   cat: 'prato' },
  { name: 'Ravioli c/ molho funghi (200g)',    kcal: 380, p: 14,   c: 48,   f: 14,   cat: 'prato' },
  { name: 'Tortellini ao alho e óleo (200g)',  kcal: 460, p: 14,   c: 55,   f: 18,   cat: 'prato' },
  { name: 'Cappelletti caldo (300ml)',         kcal: 280, p: 14,   c: 36,   f: 8,    cat: 'prato' },
  { name: 'Penne ao molho rosé (300g)',        kcal: 460, p: 14,   c: 56,   f: 18,   cat: 'prato' },
  { name: 'Talharim ao funghi (300g)',         kcal: 440, p: 12,   c: 60,   f: 16,   cat: 'prato' },

  // ===== Bebidas alcoólicas extras =====
  { name: 'Aperol Spritz (1 copo)',            kcal: 180, p: 0,    c: 18,   f: 0,    cat: 'bebida' },
  { name: 'Pina colada (1 copo)',              kcal: 280, p: 1,    c: 32,   f: 6,    cat: 'bebida' },
  { name: 'Daiquiri morango (1 copo)',         kcal: 240, p: 0.5,  c: 28,   f: 0,    cat: 'bebida' },
  { name: 'Bloody Mary (1 copo)',              kcal: 130, p: 1,    c: 7,    f: 0.2,  cat: 'bebida' },
  { name: 'Negroni (1 copo)',                  kcal: 215, p: 0,    c: 12,   f: 0,    cat: 'bebida' },
  { name: 'Old Fashioned (1 copo)',            kcal: 180, p: 0,    c: 5,    f: 0,    cat: 'bebida' },
  { name: 'Sake (200ml)',                      kcal: 270, p: 0.6,  c: 9,    f: 0,    cat: 'bebida' },
  { name: 'Soju (200ml)',                      kcal: 240, p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Chopp pilsen (1 chopp 300ml)',      kcal: 125, p: 1.2,  c: 10,   f: 0,    cat: 'bebida' },
  { name: 'Cachaça artesanal (50ml)',          kcal: 115, p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Conhaque (50ml)',                   kcal: 115, p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Licor de cacau (50ml)',             kcal: 145, p: 0,    c: 16,   f: 0,    cat: 'bebida' },
  { name: 'Hidromel (200ml)',                  kcal: 200, p: 0.2,  c: 12,   f: 0,    cat: 'bebida' },
  { name: 'Drink batida coco (1 copo)',        kcal: 280, p: 1,    c: 32,   f: 5,    cat: 'bebida' },

  // ===== Snacks proteicos / fit =====
  { name: 'Iogurte grego YoPro morango',       kcal: 100, p: 15,   c: 9,    f: 0.5,  cat: 'proteina' },
  { name: 'Iogurte grego YoPro coco',          kcal: 100, p: 15,   c: 8,    f: 0.5,  cat: 'proteina' },
  { name: 'Iogurte Mais Proteínas Itambé',     kcal: 105, p: 15,   c: 10,   f: 0.5,  cat: 'proteina' },
  { name: 'Barra Hue protein bar (1un)',       kcal: 190, p: 18,   c: 20,   f: 5,    cat: 'snack' },
  { name: 'Barra Trio proteica (1un)',         kcal: 150, p: 12,   c: 18,   f: 5,    cat: 'snack' },
  { name: 'Pasta amend Vitao (1 col)',         kcal: 90,  p: 4,    c: 3,    f: 7,    cat: 'gordura' },
  { name: 'Whey-bar choco fit (1un)',          kcal: 200, p: 20,   c: 18,   f: 6,    cat: 'snack' },
  { name: 'Pó de bolinho proteico (1un)',      kcal: 140, p: 15,   c: 15,   f: 3,    cat: 'snack' },
  { name: 'Chips de batata-doce assado (40g)', kcal: 170, p: 2,    c: 22,   f: 8,    cat: 'snack' },
  { name: 'Chips de couve crocante (30g)',     kcal: 140, p: 3,    c: 14,   f: 8,    cat: 'snack' },
  { name: 'Cracker integral c/ chia (5un)',    kcal: 130, p: 3,    c: 20,   f: 4,    cat: 'snack' },

  // ===== Sobremesas geladas =====
  { name: 'Açaí 500ml turbinado (banana+leite+granola)', kcal: 580, p: 8, c: 90, f: 18, cat: 'erro' },
  { name: 'Açaí 700ml completão',              kcal: 850, p: 11,   c: 130,  f: 28,   cat: 'erro' },
  { name: 'Banana split (1 porção)',           kcal: 480, p: 8,    c: 70,   f: 18,   cat: 'doce' },
  { name: 'Sorvete Häagen-Dazs (1 bola)',      kcal: 200, p: 3,    c: 18,   f: 13,   cat: 'doce' },
  { name: 'Gelato artesanal (1 bola)',         kcal: 130, p: 3,    c: 18,   f: 5,    cat: 'doce' },
  { name: 'Frozen yogurt c/ frutas (200g)',    kcal: 220, p: 7,    c: 38,   f: 4,    cat: 'doce' },
  { name: 'Pudim de leite condensado fitness', kcal: 180, p: 12,   c: 22,   f: 4,    cat: 'doce' },
  { name: 'Cheesecake limão fit (1 fatia)',    kcal: 200, p: 8,    c: 18,   f: 11,   cat: 'doce' },

  // ===== Pratos low-carb =====
  { name: 'Espaguete de abobrinha c/ frango',  kcal: 280, p: 30,   c: 14,   f: 12,   cat: 'prato' },
  { name: 'Pizza low-carb (couve-flor base)',  kcal: 240, p: 14,   c: 12,   f: 14,   cat: 'prato' },
  { name: 'Lasanha de berinjela (200g)',       kcal: 240, p: 11,   c: 18,   f: 14,   cat: 'prato' },
  { name: 'Hambúrguer s/ pão c/ ovo + salada', kcal: 380, p: 32,   c: 8,    f: 24,   cat: 'prato' },
  { name: 'Picadinho low-carb c/ couve-flor',  kcal: 320, p: 30,   c: 12,   f: 18,   cat: 'prato' },
  { name: 'Crepe de abóbora c/ frango',        kcal: 280, p: 26,   c: 22,   f: 9,    cat: 'prato' },
  { name: 'Wrap de alface c/ atum',            kcal: 220, p: 22,   c: 8,    f: 11,   cat: 'prato' },
  { name: 'Tigela de quinoa c/ legumes',       kcal: 320, p: 12,   c: 45,   f: 8,    cat: 'prato' },

  // ===== Kids meals / mais leves =====
  { name: 'Macarrão ao molho de tomate (200g)',kcal: 240, p: 6,    c: 42,   f: 4,    cat: 'prato' },
  { name: 'Pão c/ requeijão (1 fatia)',        kcal: 130, p: 4,    c: 16,   f: 5,    cat: 'snack' },
  { name: 'Pão c/ manteiga (1 fatia)',         kcal: 120, p: 3,    c: 16,   f: 5,    cat: 'snack' },
  { name: 'Achocolatado c/ leite (200ml)',     kcal: 190, p: 7,    c: 28,   f: 5,    cat: 'bebida' },
  { name: 'Vitamina banana caseira (300ml)',   kcal: 220, p: 8,    c: 38,   f: 4.5,  cat: 'bebida' },
  { name: 'Iogurte morango Danone (170g)',     kcal: 140, p: 6,    c: 22,   f: 3,    cat: 'doce' },
  { name: 'Toddynho chocolate (200ml)',        kcal: 180, p: 7,    c: 27,   f: 5,    cat: 'bebida' },
  { name: 'Bebida laranja Del Valle (200ml)',  kcal: 90,  p: 0,    c: 22,   f: 0,    cat: 'bebida' },

  // ===== Café & sobremesas de cafeteria =====
  { name: 'Brownie c/ cobertura (1 fatia)',    kcal: 320, p: 4,    c: 38,   f: 17,   cat: 'doce' },
  { name: 'Macaron francês (1un)',             kcal: 90,  p: 1.5,  c: 12,   f: 4,    cat: 'doce' },
  { name: 'Cannoli (1un)',                     kcal: 220, p: 5,    c: 22,   f: 12,   cat: 'doce' },
  { name: 'Madeleine (1un)',                   kcal: 90,  p: 1.5,  c: 11,   f: 4,    cat: 'doce' },
  { name: 'Carrot cake fatia',                 kcal: 330, p: 5,    c: 48,   f: 13,   cat: 'doce' },
  { name: 'Red velvet (1 fatia)',              kcal: 380, p: 5,    c: 50,   f: 18,   cat: 'doce' },
  { name: 'Tiramisu (1 fatia)',                kcal: 320, p: 6,    c: 28,   f: 20,   cat: 'doce' },
  { name: 'Crème brûlée (1 porção)',           kcal: 360, p: 6,    c: 30,   f: 23,   cat: 'doce' },
  { name: 'Profiterole c/ chocolate (1un)',    kcal: 200, p: 4,    c: 20,   f: 12,   cat: 'doce' },
  { name: 'Pavlova c/ frutas (1 porção)',      kcal: 290, p: 5,    c: 38,   f: 13,   cat: 'doce' },

  // ===== Bebidas tradicionais =====
  { name: 'Mate gelado limão (300ml)',         kcal: 90,  p: 0,    c: 22,   f: 0,    cat: 'bebida' },
  { name: 'Mate gelado pêssego (300ml)',       kcal: 110, p: 0,    c: 27,   f: 0,    cat: 'bebida' },
  { name: 'Chá mate quente s/ açúcar (200ml)', kcal: 2,   p: 0,    c: 0,    f: 0,    cat: 'bebida' },
  { name: 'Café preto adoçado (200ml)',        kcal: 60,  p: 0,    c: 14,   f: 0,    cat: 'bebida' },
  { name: 'Cappuccino italiano (200ml)',       kcal: 80,  p: 5,    c: 7,    f: 4,    cat: 'bebida' },
  { name: 'Café gelado caramelo (300ml)',      kcal: 220, p: 4,    c: 38,   f: 6,    cat: 'bebida' },
  { name: 'Frapê de morango (300ml)',          kcal: 320, p: 5,    c: 50,   f: 11,   cat: 'bebida' },
  { name: 'Milk-shake chocolate (300ml)',      kcal: 420, p: 8,    c: 60,   f: 16,   cat: 'bebida' },
  { name: 'Milk-shake morango (300ml)',        kcal: 380, p: 7,    c: 55,   f: 14,   cat: 'bebida' },
  { name: 'Refresco de tang (300ml)',          kcal: 50,  p: 0,    c: 13,   f: 0,    cat: 'bebida' },
];

// Conquistas / 업적 — checadas após cada save de log/treino/etc.
// id, name, ko, description, condition(state) → boolean, xp bônus, ícone.
const ACHIEVEMENTS = [
  { id: 'first_log',   name: 'Primeira luz',         ko: '첫걸음',  icon: '🌅', xp:  5,
    desc: 'Registrou o primeiro dia. A jornada começou.',
    cond: (s) => s.dailyLogs.length >= 1 },
  { id: 'streak3',     name: 'Trinca',               ko: '3일',     icon: '🔥', xp: 10,
    desc: '3 dias seguidos com log diário.',
    cond: (s) => s.dailyLogs.length >= 3 && getMaxLogStreak(s) >= 3 },
  { id: 'streak7',     name: 'Semana completa',      ko: '완주',    icon: '💎', xp: 20,
    desc: '7 dias seguidos com log diário.',
    cond: (s) => getMaxLogStreak(s) >= 7 },
  { id: 'streak30',    name: 'Mês de aço',           ko: '강철 한달', icon: '⚔️', xp: 80,
    desc: '30 dias seguidos. Disciplina virou identidade.',
    cond: (s) => getMaxLogStreak(s) >= 30 },
  { id: 'protein5',    name: 'Bater a meta',         ko: '단백질 마스터', icon: '🥩', xp: 15,
    desc: '5 dias com proteína na meta.',
    cond: (s) => s.dailyLogs.filter(l => l.protein?.hit).length >= 5 },
  { id: 'protein30',   name: 'Massacre da proteína', ko: '단백질 30일', icon: '🥩', xp: 50,
    desc: '30 dias com proteína na meta.',
    cond: (s) => s.dailyLogs.filter(l => l.protein?.hit).length >= 30 },
  { id: 'workout10',   name: 'Iniciado dos pesos',   ko: '입문',    icon: '🏋️', xp: 15,
    desc: 'Completou 10 treinos.',
    cond: (s) => s.workouts.length >= 10 },
  { id: 'workout50',   name: 'Veterano',             ko: '베테랑',  icon: '🥋', xp: 40,
    desc: 'Completou 50 treinos.',
    cond: (s) => s.workouts.length >= 50 },
  { id: 'sleep7d',     name: 'Bom de cama',          ko: '잠꾸러기', icon: '🌙', xp: 12,
    desc: '7 noites com ≥7h de sono.',
    cond: (s) => s.dailyLogs.filter(l => (l.sleep?.hours||0) >= 7).length >= 7 },
  { id: 'reading7',    name: 'Leitor matinal',       ko: '독서가',  icon: '📚', xp: 10,
    desc: '7 dias com leitura ≥15min.',
    cond: (s) => s.dailyLogs.filter(l => (l.reading?.minutes||0) >= 15).length >= 7 },
  { id: 'reading_book',name: 'Livro finalizado',     ko: '책 완독', icon: '📖', xp: 20,
    desc: 'Terminou um livro inteiro.',
    cond: (s) => s.books.some(b => b.finishedAt) },
  { id: 'steps_10k',   name: 'Andante',              ko: '걷기왕',  icon: '👟', xp:  8,
    desc: 'Bateu 10.000 passos num dia.',
    cond: (s) => s.dailyLogs.some(l => (l.steps||0) >= 10000) },
  { id: 'reach_gold',  name: 'Ouro alcançado',       ko: '골드',    icon: '🏆', xp: 25,
    desc: 'Chegou ao rank Ouro.',
    cond: (s) => RANKS.findIndex(r => r.key === s.user.currentRank) >= 3 },
  { id: 'reach_plat',  name: 'Sangue de Platina',    ko: '플레티넘', icon: '💠', xp: 40,
    desc: 'Chegou ao rank Platina.',
    cond: (s) => RANKS.findIndex(r => r.key === s.user.currentRank) >= 4 },
  { id: 'reach_dia',   name: 'Olho de Diamante',     ko: '다이아',  icon: '💎', xp: 60,
    desc: 'Chegou ao rank Diamante.',
    cond: (s) => RANKS.findIndex(r => r.key === s.user.currentRank) >= 6 },
  { id: 'reach_master',name: 'Mestre dos hábitos',   ko: '마스터',  icon: '⚜️', xp: 100,
    desc: 'Chegou ao rank Mestre.',
    cond: (s) => RANKS.findIndex(r => r.key === s.user.currentRank) >= 7 },
  { id: 'reach_chall', name: 'Challenger 👑',         ko: '챌린저',  icon: '👑', xp: 200,
    desc: 'Chegou ao topo: Challenger.',
    cond: (s) => s.user.currentRank === 'challenger' },
  { id: 'quest_50',    name: 'Caçador de quests',    ko: '미션 헌터', icon: '🎯', xp: 20,
    desc: '50 daily quests completadas.',
    cond: (s) => (s.user.questsCompleted || 0) >= 50 },
  { id: 'photo_pair',  name: 'Antes & depois',       ko: '비포 애프터', icon: '📸', xp: 10,
    desc: 'Tirou pelo menos 2 fotos progresso.',
    cond: (s) => s.photos.length >= 2 },
  { id: 'pr',          name: 'Personal Record',      ko: 'PR 기록', icon: '⚡', xp: 15,
    desc: 'Aumentou carga em algum exercício.',
    cond: (s) => hasPR(s) },
];

// Helpers usados por ACHIEVEMENTS (definidos antes para evitar TDZ no array).
function getMaxLogStreak(s) {
  if (!s.dailyLogs.length) return 0;
  const days = new Set(s.dailyLogs.map(l => l.date));
  let best = 0;
  for (const d of days) {
    let cur = 1;
    const dt = new Date(d);
    while (true) {
      dt.setDate(dt.getDate() - 1);
      if (days.has(isoDate(dt))) cur++; else break;
    }
    if (cur > best) best = cur;
  }
  return best;
}
function hasPR(s) {
  // Existe algum exercício onde a sessão mais nova tem peso > sessão anterior
  const byEx = new Map();
  for (const w of s.workouts) {
    for (const ex of w.exercises) {
      const top = Math.max(...ex.sets.map(set => +set.weight || 0));
      if (!byEx.has(ex.name)) byEx.set(ex.name, []);
      byEx.get(ex.name).push({ date: w.date, top });
    }
  }
  for (const [, sessions] of byEx) {
    sessions.sort((a, b) => a.date < b.date ? 1 : -1);
    if (sessions.length >= 2 && sessions[0].top > sessions[1].top) return true;
  }
  return false;
}

// Quotes do dia — mistura ditados coreanos (~50%) com falas Mortal Kombat (~50%).
// Lado kombat: { kombat: 'TEXTO', pt: 'tradução', source: 'origem' }
// Lado coreano: { ko: '...', pt: '...' }
const QUOTES = [
  // === Coreano (50%) ===
  { ko: '천 리 길도 한 걸음부터', pt: 'Mil milhas começam com um passo' },
  { ko: '하루하루 강해진다',         pt: 'Mais forte a cada dia' },
  { ko: '오늘의 나는 어제의 나보다 강하다', pt: 'Hoje sou mais forte que ontem' },
  { ko: '천천히, 그러나 멈추지 마라', pt: 'Devagar, mas sem parar' },
  { ko: '실패는 성공의 어머니',       pt: 'O fracasso é mãe do sucesso' },
  { ko: '운동은 약이다',              pt: 'Exercício é remédio' },
  { ko: '한계는 머릿속에 있다',       pt: 'O limite está na cabeça' },
  { ko: '땀은 거짓말 하지 않는다',     pt: 'O suor não mente' },
  { ko: '시작이 반이다',              pt: 'Começar já é metade' },
  { ko: '꾸준함이 답이다',            pt: 'Consistência é a resposta' },

  // === Mortal Kombat (50%) ===
  { kombat: 'TEST YOUR MIGHT.',                   pt: 'Hoje você é seu próprio adversário.', source: 'MK' },
  { kombat: 'THERE IS NO KNOWLEDGE THAT IS NOT POWER.', pt: 'Não há conhecimento que não seja poder.', source: 'MK3' },
  { kombat: 'FATALITY IS NOT THE END — IT IS THE PROOF.', pt: 'O fim não é o fim — é a prova.', source: 'MK' },
  { kombat: 'YOUR SOUL IS MINE.',                 pt: 'Seu progresso é seu — ninguém tira.', source: 'Shang Tsung' },
  { kombat: 'POWER. STRENGTH. DISCIPLINE.',       pt: 'Os três pilares do treino.', source: 'MK' },
  { kombat: 'GET OVER HERE!',                     pt: 'Levanta. Hoje é dia de luta.', source: 'Scorpion' },
  { kombat: 'WE FIGHT NOT FOR HONOR, BUT FOR LIFE.', pt: 'Treinamos pela vida, não pela glória.', source: 'Liu Kang' },
  { kombat: 'FLAWLESS VICTORY AWAITS THE PATIENT.', pt: 'A vitória impecável recompensa quem persiste.', source: 'MK' },
  { kombat: 'IT HAS BEGUN.',                      pt: 'A jornada começou.', source: 'Shao Kahn' },
  { kombat: 'KOMBAT NEVER ENDS.',                 pt: 'A disciplina é o combate diário.', source: 'MK' },
];

// Pool de coreografias K-pop para sorteio (apenas metadados — sem letras).
// diff: 1 (fácil) a 5 (extremo).
const KPOP_CHOREOS = [
  { song: 'Magnetic',         artist: 'ILLIT',         year: 2024, diff: 2, style: 'pop bounce',     dur: '2:35', tip: 'Foco no isolamento de quadril e expressão facial.' },
  { song: 'Super Shy',        artist: 'NewJeans',      year: 2023, diff: 2, style: 'casual pop',     dur: '2:34', tip: 'Coreografia leve, ótima pra estrear no estilo.' },
  { song: 'OMG',              artist: 'NewJeans',      year: 2023, diff: 3, style: 'urban pop',      dur: '3:35', tip: 'Trabalha sincronia em duplas. Cuide o footwork.' },
  { song: 'God\'s Menu',      artist: 'Stray Kids',    year: 2020, diff: 4, style: 'powerful boy',   dur: '3:11', tip: 'Movimentos pesados, marca o "stomp". Energia explosiva.' },
  { song: 'Maniac',           artist: 'Stray Kids',    year: 2022, diff: 4, style: 'powerful boy',   dur: '3:13', tip: 'Trabalha agachamento de pulo e core forte.' },
  { song: 'Lalalala',         artist: 'Stray Kids',    year: 2023, diff: 4, style: 'aggressive',     dur: '3:11', tip: 'Movimentos curtos com pausa — staccato.' },
  { song: 'Antifragile',      artist: 'LE SSERAFIM',   year: 2022, diff: 3, style: 'latin pop',      dur: '2:36', tip: 'Body wave + cadeira de samba. Quadril liberado.' },
  { song: 'Easy',             artist: 'LE SSERAFIM',   year: 2024, diff: 3, style: 'sensual pop',    dur: '2:50', tip: 'Movimento contínuo, controle de braços.' },
  { song: 'Drama',            artist: 'aespa',         year: 2023, diff: 3, style: 'urban',          dur: '3:09', tip: 'Foco na expressão e angularidade dos braços.' },
  { song: 'Spicy',            artist: 'aespa',         year: 2023, diff: 3, style: 'pop',            dur: '3:21', tip: 'Trabalha rolagens de ombro e tornozelo solto.' },
  { song: 'Eleven',           artist: 'IVE',           year: 2021, diff: 2, style: 'feminine pop',   dur: '3:11', tip: 'Foco em linhas longas com os braços.' },
  { song: 'After LIKE',       artist: 'IVE',           year: 2022, diff: 3, style: 'retro disco',    dur: '2:56', tip: 'Pose disco no refrão. Atitude > técnica.' },
  { song: 'Kitsch',           artist: 'IVE',           year: 2023, diff: 3, style: 'fashion pop',    dur: '3:00', tip: 'Coreografia "passarela" — postura ereta sempre.' },
  { song: 'Cupid',            artist: 'FIFTY FIFTY',   year: 2023, diff: 2, style: 'soft pop',       dur: '2:54', tip: 'Coreografia minimalista, ótima primeira tentativa.' },
  { song: 'Crazy',            artist: 'LE SSERAFIM',   year: 2024, diff: 4, style: 'powerful girl',  dur: '2:50', tip: 'Stomp + viradas rápidas. Aquecimento de tornozelo é mandatório.' },
  { song: 'Smart',            artist: 'LE SSERAFIM',   year: 2024, diff: 3, style: 'cute pop',       dur: '2:25', tip: 'Movimento de cabeça acentuado. Faça frente ao espelho.' },
  { song: 'I Am',             artist: 'IVE',           year: 2023, diff: 3, style: 'powerful girl',  dur: '3:14', tip: 'Movimento amplo de braços, postura régia.' },
  { song: 'Standing Next to You', artist: 'Jungkook',  year: 2023, diff: 5, style: 'michael jackson',dur: '3:31', tip: 'Coreografia inspirada em MJ — pulso, deslize, isolamento total.' },
  { song: 'Seven',            artist: 'Jungkook',      year: 2023, diff: 3, style: 'urban pop',      dur: '3:04', tip: 'Energia leve, sequência fluida de hip-hop.' },
  { song: 'Hype Boy',         artist: 'NewJeans',      year: 2022, diff: 3, style: 'urban casual',   dur: '2:59', tip: 'Footwork e mudanças de direção rápidas.' },
  { song: 'Bubble Gum',       artist: 'NewJeans',      year: 2024, diff: 2, style: 'retro pop',      dur: '3:25', tip: 'Vibe leve — foca nos gestos das mãos.' },
  { song: 'TOMBOY',           artist: '(G)I-DLE',      year: 2022, diff: 3, style: 'attitude pop',   dur: '2:53', tip: 'Postura aberta e confiante. Pisadas firmes.' },
  { song: 'Queencard',        artist: '(G)I-DLE',      year: 2023, diff: 3, style: 'pop attitude',   dur: '3:07', tip: 'Atitude > técnica. Erre com confiança.' },
  { song: 'Crazy In Love',    artist: 'ITZY',          year: 2023, diff: 3, style: 'powerful girl',  dur: '3:11', tip: 'Mudanças de níveis (alto/médio/baixo).' },
  { song: 'WANNABE',          artist: 'ITZY',          year: 2020, diff: 4, style: 'powerful girl',  dur: '3:14', tip: 'Movimentos pesados, salto agachado. Resistência alta.' },
  { song: 'How You Like That',artist: 'BLACKPINK',     year: 2020, diff: 3, style: 'powerful',       dur: '3:01', tip: 'Foco no "killing part" central — pose impactante.' },
  { song: 'Shut Down',        artist: 'BLACKPINK',     year: 2022, diff: 3, style: 'urban',          dur: '2:55', tip: 'Coreografia minimalista, atitude máxima.' },
  { song: 'Magnetic Pulses',  artist: 'NCT 127',       year: 2023, diff: 5, style: 'noise dance',    dur: '3:30', tip: 'Movimento robótico complexo. Sincronia milimétrica.' },
  { song: 'Sticker',          artist: 'NCT 127',       year: 2021, diff: 5, style: 'experimental',   dur: '3:21', tip: 'Coreografia famosa pela dificuldade. Comece em 0.5x.' },
  { song: 'Crazy',            artist: 'NCT Dream',     year: 2024, diff: 4, style: 'urban boy',      dur: '3:01', tip: 'Sequência rápida — domina 8 contagens por vez.' },
  { song: 'Smoothie',         artist: 'NCT Dream',     year: 2024, diff: 3, style: 'funky pop',      dur: '2:58', tip: 'Body roll central. Tronco solto.' },
];

// Objetivos visuais (Goals) — "como eu quero ficar".
// Cada item tem uma chave que aponta para uma imagem opcional em
// GOALS — só metadados, sem imagens default. O usuário sobe suas próprias fotos
// pela aba Metas; imagens ficam em state.user.goalImages[key] como data URL.
const GOALS = [
  { key: 'bracos',     name: 'Bíceps & Braços',  focus: 'braços + ombros',
    why: 'Braços firmes em camiseta. Vem de bíceps + tríceps + ombros trabalhados juntos.' },
  { key: 'abdomen',    name: 'Abdômen',          focus: 'core / abdômen',
    why: 'Marcação de abdômen é cut + core treinado — os dois precisam acontecer.' },
  { key: 'calistenia', name: 'Calistenia',       focus: 'corpo todo · sem equipamento',
    why: 'Força relativa: empurra, puxa, segura o próprio peso. Mobilidade + funcional.' },
  { key: 'forca',      name: 'Força bruta',      focus: 'massa + compostos pesados',
    why: 'Físico "tank" — agachamento, terra, supino pesados. Força acima de estética.' },
  { key: 'peitoral',   name: 'Peitoral',         focus: 'peito',
    why: 'Peito largo e marcado vem de pressão horizontal pesada + crucifixo controlado.' },
  { key: 'dorsal',     name: 'Dorsal',           focus: 'dorsal V · costas',
    why: 'Latíssimo desenvolvido — V-taper. Tração pesada + escápula retraída.' },
  { key: 'ombros',     name: 'Ombros',           focus: 'deltoide + antebraço',
    why: 'Ombros largos abrem a silhueta. Desenvolvimento + elevações + face pull.' },
  { key: 'cardio',     name: 'Cardio & Magreza', focus: 'cardio + composição',
    why: 'Físico magro e explosivo. Cardio frequente + déficit calórico leve.' },
  { key: 'definicao',  name: 'Definição',        focus: 'corpo todo lean',
    why: 'Definido sem ser monstro. Volume moderado + cut bem feito + sono consistente.' },
];

// Desafios — só skincare + leitura. Os antigos temas MK/k-pop foram removidos.
// Ideal pra alternar quando o foco normal "cansa" (TDAH-friendly).
const _LEGACY_BODY_CHALLENGES_REMOVED = [
  { id: 'c01', name: 'Bíceps do Kano',        inspiration: 'Kano (MK)',         focus: 'bíceps',     xp: 5, icon: '💪',
    sets: 'Método 21s: 7 reps meia-amplitude baixa + 7 meia-amplitude alta + 7 completas. 3 séries.',
    tip: 'Carga moderada. Sente cada porção do movimento.' },
  { id: 'c02', name: 'Peito do Liu Kang',      inspiration: 'Liu Kang (MK)',     focus: 'peito',      xp: 6, icon: '🔥',
    sets: '4× supino reto até a falha (8-12 reps) + 3× crucifixo polia (12-15). Pausa 90s.',
    tip: 'Aperto máximo no topo do crucifixo, 1s de pausa.' },
  { id: 'c03', name: 'Costas do Sub-Zero',     inspiration: 'Sub-Zero (MK)',     focus: 'dorsal',     xp: 6, icon: '❄️',
    sets: '5× pull-up AMRAP + 3× remada curvada (8-10) + 3× pulldown pegada fechada (12).',
    tip: 'Foco em escápula retraída antes do braço se mexer.' },
  { id: 'c04', name: 'Ombros do Scorpion',     inspiration: 'Scorpion (MK)',     focus: 'ombro',      xp: 5, icon: '🟡',
    sets: '4× desenvolvimento militar (6-10) + drop set elevação lateral (15→12→10).',
    tip: 'Cotovelo guia o movimento na lateral, não o pulso.' },
  { id: 'c05', name: 'Pernas da Kitana',       inspiration: 'Kitana (MK)',       focus: 'perna+glúteo', xp: 7, icon: '🦵',
    sets: '5× agachamento (8-12) + 4× afundo passada (10/perna) + 3× hip thrust (12).',
    tip: 'Aperta glúteo 1s no topo do hip thrust.' },
  { id: 'c06', name: 'Antebraço do Raiden',    inspiration: 'Raiden (MK)',       focus: 'antebraço',  xp: 4, icon: '⚡',
    sets: '4× farmer\'s walk 30 passos + 3× rosca punho (15).',
    tip: 'Pegada firme, ombros pra trás durante o walk.' },
  { id: 'c07', name: 'Pescoço do Shao Kahn',   inspiration: 'Shao Kahn (MK)',    focus: 'pescoço/trapézio', xp: 4, icon: '👹',
    sets: '4× encolhimento halteres pesado (12) + 3× face pull (15).',
    tip: 'Face pull obrigatório — equilibra postura.' },

  { id: 'c08', name: 'Abdômen do Lee Jeno',    inspiration: 'Lee Jeno (NCT Dream)', focus: 'core',    xp: 5, icon: '🎯',
    sets: '4× crunch (20) + 4× elevação de pernas (15) + 4× prancha (45s).',
    tip: 'Abdômen marcado vem de cut + core treinado. Os dois.' },
  { id: 'c09', name: 'Braços do Jay Park',     inspiration: 'Jay Park',          focus: 'braços',     xp: 6, icon: '🥊',
    sets: 'Superset: rosca direta + tríceps testa 4×10. Termina com 21s de bíceps.',
    tip: 'Pump masivo — descanso curto (45s) entre supersets.' },
  { id: 'c10', name: 'Vascularidade do Wonho', inspiration: 'Wonho',             focus: 'cardio+pump',xp: 7, icon: '🩸',
    sets: '20 min HIIT + sessão de bíceps/ombro com sets longos (15-20 reps).',
    tip: 'Veias aparecem em BF baixo + bombeamento muscular alto.' },
  { id: 'c11', name: 'Coxa da Lisa',           inspiration: 'Lisa (BLACKPINK)',  focus: 'glúteo+coxa',xp: 6, icon: '💃',
    sets: '5× agachamento sumô (12) + 4× elevação pélvica unilateral (12/lado) + 3× cadeira abdutora (15).',
    tip: 'Pé ligeiramente pra fora no sumô — recruta mais glúteo interno.' },
  { id: 'c12', name: 'Cintura do Karina',      inspiration: 'Karina (aespa)',    focus: 'core+oblíquos', xp: 6, icon: '⏳',
    sets: '4× woodchopper (12/lado) + 4× side plank (30s/lado) + 4× russian twist (20).',
    tip: 'Trabalha rotação e estabilidade — cintura definida.' },
  { id: 'c13', name: 'Postura do Hyunjin',     inspiration: 'Hyunjin (Stray Kids)', focus: 'postura', xp: 5, icon: '🎭',
    sets: '3× face pull (15) + 3× remada vertical T-bar (10) + sequência 5min mobilidade torácica.',
    tip: 'Postura de dançarino = costas abertas + coluna ereta.' },
  { id: 'c14', name: 'Energia do Felix',       inspiration: 'Felix (Stray Kids)', focus: 'cardio+dança', xp: 7, icon: '🌟',
    sets: '40min de dança intensa (cardio) + 4× burpees (10).',
    tip: 'Dança queima muito porque combina cardio + coordenação. Energia explosiva.' },
  { id: 'c15', name: 'Total Stage Ready',      inspiration: 'idol full pack',    focus: 'corpo todo', xp: 10, icon: '🏆',
    sets: 'Sessão completa: peito + dorsal + perna leve + 30min cardio. Tudo em uma sessão.',
    tip: '"Stage ready" = pronto pra ficar 2h dançando no palco. Resistência total.' },

  // ===== Skincare — desafios de pele (rotina K-beauty inspirada) =====
  { id: 's01', name: 'Limpeza dupla AM',         inspiration: 'K-beauty AM routine', focus: 'skincare', xp: 3, icon: '🧼',
    sets: 'Lavar rosto com sabonete + tônico + hidratante + protetor solar FPS 50+.',
    tip: 'Protetor é o passo #1 anti-envelhecimento. Não pule nem no dia nublado.' },
  { id: 's02', name: 'Rotina noturna completa',  inspiration: '10-step Korean (versão lean)', focus: 'skincare', xp: 4, icon: '🌙',
    sets: 'Demaquilante + sabonete + tônico + sérum + hidratante + tratamento spot se precisar.',
    tip: 'Limpeza noturna é mais crítica que matinal — remove poluição e oleosidade do dia.' },
  { id: 's03', name: 'Esfoliação semanal',       inspiration: 'derma exfoliation', focus: 'skincare',   xp: 3, icon: '✨',
    sets: 'Esfoliante químico (BHA ou AHA) 1–2x na semana à noite, alternando com sérum hidratante.',
    tip: 'Nunca esfoliar todo dia. Pele virgem? Comece BHA 1x/sem.' },
  { id: 's04', name: 'Máscara hidratante',       inspiration: 'sheet mask',         focus: 'skincare',   xp: 2, icon: '🎭',
    sets: 'Sheet mask 15–20min após o tônico, à noite. Bater o sérum residual na pele.',
    tip: 'Sheet mask é hidratação extra — não substitui rotina diária.' },
  { id: 's05', name: 'Hidratação labial',        inspiration: 'lip care',           focus: 'skincare',   xp: 1, icon: '👄',
    sets: 'Esfoliar lábios suavemente + balm reparador noturno (vaselina ou lanolina).',
    tip: 'Lábio rachado denuncia desidratação geral — toma água também.' },
  { id: 's06', name: 'Tratamento de acne',       inspiration: 'spot treatment',     focus: 'skincare',   xp: 3, icon: '🎯',
    sets: 'Aplicação localizada de ácido salicílico ou patch de hidrocolóide nas áreas inflamadas.',
    tip: 'Nunca espreme. Patch de hidrocolóide drena sozinho em 6–8h.' },
  { id: 's07', name: 'Anti-olheira',             inspiration: 'eye care K-routine', focus: 'skincare',   xp: 2, icon: '👁️',
    sets: 'Creme com cafeína + vitamina K na pálpebra inferior, AM e PM. Massagem com dedo anelar.',
    tip: 'Sono 7h+ resolve mais que creme. Cafeína tópica só desincha.' },
  { id: 's08', name: 'Glass skin protocol',      inspiration: 'glass skin meta',    focus: 'skincare',   xp: 5, icon: '💎',
    sets: '7 dias seguidos com toner essence (snail mucin/galactomyces) + hidratante denso à noite.',
    tip: 'Glass skin = barreira saudável + hidratação profunda + nada de álcool ou fragrância.' },
  { id: 's09', name: 'Hidratação por dentro',    inspiration: 'inside-out beauty',  focus: 'skincare',   xp: 2, icon: '💧',
    sets: '2L de água + ômega-3 + colágeno hidrolisado 10g + alimentos ricos em vit C.',
    tip: 'Pele é o último órgão que recebe nutrientes — comece de dentro pra fora.' },
  { id: 's10', name: 'Detox digital pré-sono',   inspiration: 'blue light skin care', focus: 'skincare', xp: 3, icon: '📵',
    sets: '60min sem tela antes de dormir + máscara noturna + travesseiro de seda/cetim.',
    tip: 'Luz azul acelera fotoenvelhecimento. Tela LED em quarto escuro = pior.' },
];

// Pool ativo de desafios — só skincare + leitura.
const BODY_CHALLENGES = [
  // ===== Skincare =====
  { id: 's01', name: 'Limpeza dupla AM',         inspiration: 'K-beauty rotina manhã', focus: 'skincare', xp: 3, icon: '🧼',
    sets: 'Lavar rosto com sabonete + tônico + hidratante + protetor solar FPS 50+.',
    tip: 'Protetor é o passo #1 anti-envelhecimento. Não pule nem no dia nublado.' },
  { id: 's02', name: 'Rotina noturna completa',  inspiration: '10-step lean', focus: 'skincare', xp: 4, icon: '🌙',
    sets: 'Demaquilante + sabonete + tônico + sérum + hidratante + tratamento spot se precisar.',
    tip: 'Limpeza noturna é mais crítica que matinal — remove poluição e oleosidade do dia.' },
  { id: 's03', name: 'Esfoliação semanal',       inspiration: 'derma exfoliation', focus: 'skincare',   xp: 3, icon: '✨',
    sets: 'Esfoliante químico (BHA ou AHA) 1–2x na semana à noite, alternando com sérum hidratante.',
    tip: 'Nunca esfoliar todo dia. Pele virgem? Comece BHA 1x/sem.' },
  { id: 's04', name: 'Máscara hidratante',       inspiration: 'sheet mask',         focus: 'skincare',   xp: 2, icon: '🎭',
    sets: 'Sheet mask 15–20min após o tônico, à noite. Bater o sérum residual na pele.',
    tip: 'Sheet mask é hidratação extra — não substitui rotina diária.' },
  { id: 's05', name: 'Hidratação labial',        inspiration: 'lip care',           focus: 'skincare',   xp: 1, icon: '👄',
    sets: 'Esfoliar lábios suavemente + balm reparador noturno (vaselina ou lanolina).',
    tip: 'Lábio rachado denuncia desidratação geral — toma água também.' },
  { id: 's06', name: 'Tratamento de acne',       inspiration: 'spot treatment',     focus: 'skincare',   xp: 3, icon: '🎯',
    sets: 'Aplicação localizada de ácido salicílico ou patch de hidrocolóide nas áreas inflamadas.',
    tip: 'Nunca espreme. Patch de hidrocolóide drena sozinho em 6–8h.' },
  { id: 's07', name: 'Anti-olheira',             inspiration: 'eye care', focus: 'skincare',   xp: 2, icon: '👁️',
    sets: 'Creme com cafeína + vitamina K na pálpebra inferior, AM e PM. Massagem com dedo anelar.',
    tip: 'Sono 7h+ resolve mais que creme. Cafeína tópica só desincha.' },
  { id: 's08', name: 'Glass skin protocol',      inspiration: 'glass skin',         focus: 'skincare',   xp: 5, icon: '💎',
    sets: '7 dias seguidos com toner essence (snail mucin/galactomyces) + hidratante denso à noite.',
    tip: 'Glass skin = barreira saudável + hidratação profunda + nada de álcool ou fragrância.' },
  { id: 's09', name: 'Hidratação por dentro',    inspiration: 'inside-out beauty',  focus: 'skincare',   xp: 2, icon: '💧',
    sets: '2L de água + ômega-3 + colágeno hidrolisado 10g + alimentos ricos em vit C.',
    tip: 'Pele é o último órgão que recebe nutrientes — comece de dentro pra fora.' },
  { id: 's10', name: 'Detox digital pré-sono',   inspiration: 'blue light care',    focus: 'skincare', xp: 3, icon: '📵',
    sets: '60min sem tela antes de dormir + máscara noturna + travesseiro de seda/cetim.',
    tip: 'Luz azul acelera fotoenvelhecimento. Tela LED em quarto escuro = pior.' },

  // ===== Leitura =====
  { id: 'r01', name: 'Sprint de 30 min',         inspiration: 'pomodoro 30',        focus: 'leitura',    xp: 4, icon: '📖',
    sets: 'Timer 30min, celular no modo avião, 1 livro físico. Sem pausa.',
    tip: 'Fim do sprint: anote 1 frase do que ficou na cabeça. Memória ativa.' },
  { id: 'r02', name: '15 min antes de dormir',    inspiration: 'pre-sleep reading',  focus: 'leitura',    xp: 2, icon: '🌙',
    sets: 'Substitui scroll noturno — 15 min de livro físico até pegar no sono.',
    tip: 'Luz amarela na cabeceira; nada de telas nesses 15 min.' },
  { id: 'r03', name: 'Um capítulo inteiro',      inspiration: 'cap challenge',      focus: 'leitura',    xp: 5, icon: '📚',
    sets: 'Termine um capítulo do livro atual sem interrupção, qualquer hora do dia.',
    tip: 'Capítulo é unidade natural — fechar dá dopamina.' },
  { id: 'r04', name: '50 páginas',               inspiration: 'page sprint',        focus: 'leitura',    xp: 6, icon: '🏃',
    sets: 'Meta de 50 páginas em um dia. Pode dividir em sessões.',
    tip: 'Sprint mais agressivo — escolhe um livro com ritmo leve.' },
  { id: 'r05', name: 'Café da manhã + livro',    inspiration: 'morning ritual',     focus: 'leitura',    xp: 3, icon: '☕',
    sets: '20 min de livro no café da manhã. Celular em outro cômodo.',
    tip: 'Cérebro em alfa após o sono — receptivo a ideias novas.' },
  { id: 'r06', name: 'Não-ficção pesada',        inspiration: 'deep work',          focus: 'leitura',    xp: 5, icon: '🧠',
    sets: 'Sessão única de 45min em livro denso (filosofia, ciência, técnica).',
    tip: 'Toma nota à mão a cada 15 min — força síntese.' },
  { id: 'r07', name: 'Reler 1 trecho',           inspiration: 'active recall',      focus: 'leitura',    xp: 2, icon: '🔁',
    sets: 'Releia o trecho marcado da última sessão antes de continuar.',
    tip: 'Releitura cimenta — você só "lê" mesmo no segundo passe.' },
  { id: 'r08', name: 'Resumo em 3 frases',       inspiration: 'feynman lite',       focus: 'leitura',    xp: 3, icon: '✍️',
    sets: 'Termine a sessão e escreva 3 frases resumindo o que leu.',
    tip: 'Se você não consegue resumir, você não entendeu — volte e releia.' },
  { id: 'r09', name: 'Audiolivro caminhando',    inspiration: 'walk-and-listen',    focus: 'leitura',    xp: 3, icon: '🎧',
    sets: '30 min de audiolivro durante caminhada — combina cardio + foco.',
    tip: 'Velocidade 1.2-1.5x funciona pra maioria. Acima disso vira ruído.' },
  { id: 'r10', name: 'Marathon: 2h seguidas',    inspiration: 'reading marathon',   focus: 'leitura',    xp: 8, icon: '🏆',
    sets: '2 horas seguidas de leitura focada (pode ser 4×30min com 5min pausa).',
    tip: 'Sessão longa de fim de semana. Lugar silencioso, água por perto.' },
];

// Eventos celebratórios (overlays). Variam por tema — KOMBAT_EVENTS é só
// o default kpop_anime; os outros temas têm seus próprios textos.
const KOMBAT_EVENTS = {
  flawless:  { title: 'FLAWLESS VICTORY',    sub: 'Dia 7/7 XP — perfeito' },
  fatality:  { title: 'FATALITY',            sub: 'Weekly quest derrotada' },
  brutality: { title: 'BRUTALITY',           sub: 'PERSONAL RECORD batido' },
  finish:    { title: 'FINISH IT!',          sub: 'Dia registrado' },
  outstanding:{ title: 'OUTSTANDING!',       sub: 'Promoção de rank' },
  toasty:    { title: 'TOASTY!',             sub: 'Surpresa de combo' },
};

const THEME_EVENTS = {
  kpop_anime: KOMBAT_EVENTS,
  inside_out: {
    flawless:  { title: 'LEMBRANÇA-NÚCLEO!',      sub: 'Dia 7/7 XP — memória dourada' },
    fatality:  { title: 'NOVA ILHA!',             sub: 'Weekly quest derrotada' },
    brutality: { title: 'EUREKA!',                sub: 'PERSONAL RECORD batido' },
    finish:    { title: 'DIA NA MENTE!',          sub: 'Dia registrado' },
    outstanding:{ title: 'SUBIU DE NÍVEL!',       sub: 'Promoção de rank' },
    toasty:    { title: 'BING BONG!',             sub: 'Surpresa de combo' },
  },
  fashion: {
    flawless:  { title: 'COUTURE LEVEL',          sub: 'Dia 7/7 XP — impecável' },
    fatality:  { title: 'BEST DRESSED',           sub: 'Weekly quest derrotada' },
    brutality: { title: 'STATEMENT PIECE',        sub: 'PERSONAL RECORD batido' },
    finish:    { title: 'LOGGED IT, DARLING',     sub: 'Dia registrado' },
    outstanding:{ title: 'FRONT ROW UPGRADE',     sub: 'Promoção de rank' },
    toasty:    { title: 'CHIC SURPRISE',          sub: 'Surpresa de combo' },
  },
  futebol_lol: {
    flawless:  { title: 'CLEAN SHEET',            sub: 'Dia 7/7 XP — sem sofrer' },
    fatality:  { title: 'PENTAKILL',              sub: 'Weekly quest derrotada' },
    brutality: { title: 'BICICLETA!',             sub: 'PERSONAL RECORD batido' },
    finish:    { title: 'APITO FINAL',            sub: 'Dia registrado' },
    outstanding:{ title: 'PROMOTED!',             sub: 'Subiu de elo' },
    toasty:    { title: 'GG, EZ',                 sub: 'Surpresa de combo' },
  },
};

function themeEvent(kind) {
  const themeKey = state?.user?.theme || 'kpop_anime';
  const events = THEME_EVENTS[themeKey] || KOMBAT_EVENTS;
  return events[kind] || KOMBAT_EVENTS[kind];
}

// Lutadores Mortal Kombat — apenas metadados (sem SVG).
// O fighterHtml() carrega imagem real de icons/fighters/<key>.{webp,png,jpg};
// se não existir, mostra um placeholder limpo com o nome.
const FIGHTERS = {
  kano:     { name: 'Kano',        accent: '#B8242E', tagline: 'BRUTAL POWER',       attr: 'forca' },
  cage:     { name: 'Johnny Cage', accent: '#3FBF7F', tagline: 'HOLLYWOOD APPROVES', attr: 'vitalidade' },
  scorpion: { name: 'Scorpion',    accent: '#E8C56B', tagline: 'GET OVER HERE!',     attr: null },
  subzero:  { name: 'Sub-Zero',    accent: '#7BB8FF', tagline: 'FROZEN DISCIPLINE',  attr: 'disciplina' },
  raiden:   { name: 'Raiden',      accent: '#FFE08F', tagline: 'THUNDER GOD',        attr: 'sabedoria' },
  liukang:  { name: 'Liu Kang',    accent: '#E84A1A', tagline: 'ENDURING FIRE',      attr: 'resistencia' },
};

/** Extensões que o fighterHtml() tenta em ordem antes de desistir. */
const FIGHTER_EXTS = ['webp', 'png', 'jpg', 'jpeg', 'gif'];

/** Tenta a próxima extensão na cadeia; remove a <img> se esgotar. */
window.tryNextFighterExt = function (img) {
  const attempt = (+img.dataset.attempt || 0) + 1;
  if (attempt >= FIGHTER_EXTS.length) { img.remove(); return; }
  img.dataset.attempt = attempt;
  img.src = `icons/fighters/${img.dataset.fkey}.${FIGHTER_EXTS[attempt]}`;
};

/** SVGs abstratos de focos musculares — usados como placeholder visual
 *  quando a imagem real do objetivo não existe. Formas geométricas
 *  abstratas, não representações de pessoas reais. */
const FOCUS_SVGS = {
  'bíceps + tríceps': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M30 20 L20 50 L25 80 L35 100"/>
    <path d="M50 25 Q60 35 60 55 L55 75 L60 100"/>
    <ellipse cx="42" cy="50" rx="14" ry="20" fill="currentColor" opacity="0.18"/>
    <path d="M28 45 Q35 38 42 38 Q49 38 56 45"/>
    <path d="M28 60 Q35 70 42 70 Q49 70 56 60" opacity="0.6"/>
  </svg>`,
  'core / abdômen': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <path d="M30 30 Q50 25 70 30 L68 100 Q50 105 32 100 Z" fill="currentColor" opacity="0.15"/>
    <line x1="50" y1="35" x2="50" y2="95"/>
    <line x1="35" y1="50" x2="65" y2="50"/>
    <line x1="35" y1="65" x2="65" y2="65"/>
    <line x1="35" y1="80" x2="65" y2="80"/>
    <line x1="35" y1="92" x2="65" y2="92" opacity="0.4"/>
  </svg>`,
  'peito': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 30 Q30 25 50 25 Q70 25 80 30 L82 70 Q70 78 50 78 Q30 78 18 70 Z" fill="currentColor" opacity="0.18"/>
    <path d="M50 30 L50 75" opacity="0.55"/>
    <path d="M22 40 Q35 60 48 60 Q35 60 22 50" opacity="0.5"/>
    <path d="M78 40 Q65 60 52 60 Q65 60 78 50" opacity="0.5"/>
  </svg>`,
  'dorsal V': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M20 25 L50 18 L80 25 L72 95 L50 100 L28 95 Z" fill="currentColor" opacity="0.18"/>
    <path d="M28 35 L50 30 L72 35" opacity="0.6"/>
    <path d="M50 30 L50 95" opacity="0.5"/>
    <path d="M22 45 L48 50 M52 50 L78 45" opacity="0.5"/>
  </svg>`,
  'quadríceps + glúteo': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <path d="M35 20 Q30 60 30 95 L40 105 L42 95 L45 60 L48 30 Z" fill="currentColor" opacity="0.18"/>
    <path d="M58 20 Q60 60 56 95 L50 105 L48 95 L46 60 L48 30" fill="currentColor" opacity="0.15"/>
    <path d="M38 50 Q42 55 38 65" opacity="0.5"/>
    <path d="M52 50 Q56 55 52 65" opacity="0.5"/>
  </svg>`,
  'perna + glúteo': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <ellipse cx="35" cy="25" rx="15" ry="10" fill="currentColor" opacity="0.2"/>
    <ellipse cx="65" cy="25" rx="15" ry="10" fill="currentColor" opacity="0.2"/>
    <path d="M30 35 Q28 65 32 95 L42 105" fill="currentColor" opacity="0.16"/>
    <path d="M70 35 Q72 65 68 95 L58 105" fill="currentColor" opacity="0.16"/>
  </svg>`,
  'coxa + glúteo': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <path d="M22 15 Q18 50 30 80 L40 92 L48 75 L45 35 Z" fill="currentColor" opacity="0.18"/>
    <path d="M78 15 Q82 50 70 80 L60 92 L52 75 L55 35" fill="currentColor" opacity="0.18"/>
    <path d="M32 40 Q38 50 32 60" opacity="0.5"/>
    <path d="M68 40 Q62 50 68 60" opacity="0.5"/>
  </svg>`,
  'oblíquos + cintura': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M25 20 L75 20 L70 55 L55 65 L55 90 L45 90 L45 65 L30 55 Z" fill="currentColor" opacity="0.18"/>
    <path d="M50 25 L50 90" opacity="0.4"/>
    <path d="M30 45 L48 55 M70 45 L52 55" opacity="0.55"/>
  </svg>`,
  'braços + ombros': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <circle cx="20" cy="35" r="12" fill="currentColor" opacity="0.2"/>
    <circle cx="80" cy="35" r="12" fill="currentColor" opacity="0.2"/>
    <path d="M22 45 Q15 70 25 95" fill="currentColor" opacity="0.16"/>
    <path d="M78 45 Q85 70 75 95" fill="currentColor" opacity="0.16"/>
    <path d="M32 30 L68 30" opacity="0.5"/>
  </svg>`,
  'corpo todo lean': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="50" cy="20" r="10" fill="currentColor" opacity="0.2"/>
    <path d="M30 35 Q50 32 70 35 L68 60 L62 90 L60 110 M68 60 L75 90 L78 110 M32 60 L25 90 L22 110 M32 35 L32 60" fill="currentColor" opacity="0.16"/>
    <path d="M40 50 Q50 56 60 50" opacity="0.5"/>
  </svg>`,
  'corpo todo': `<svg viewBox="0 0 100 120" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="50" cy="22" r="11" fill="currentColor" opacity="0.2"/>
    <path d="M30 40 L25 75 L20 110 M30 40 L50 38 L70 40 M70 40 L75 75 L80 110 M50 38 L52 80 L48 110" fill="currentColor" opacity="0.16"/>
    <path d="M35 55 L65 55" opacity="0.4"/>
    <path d="M42 70 L58 70" opacity="0.4"/>
  </svg>`,
};

/** Retorna o SVG mais adequado pro foco do objetivo. */
function focusSvg(focus = '') {
  if (FOCUS_SVGS[focus]) return FOCUS_SVGS[focus];
  // Fallback por keyword
  const f = focus.toLowerCase();
  if (f.includes('bíceps') || f.includes('biceps') || f.includes('tríceps') || f.includes('triceps') || f.includes('braço')) return FOCUS_SVGS['braços + ombros'];
  if (f.includes('abdom') || f.includes('core') || f.includes('oblí')) return FOCUS_SVGS['core / abdômen'];
  if (f.includes('peito')) return FOCUS_SVGS['peito'];
  if (f.includes('dorsal') || f.includes('costas')) return FOCUS_SVGS['dorsal V'];
  if (f.includes('quad')) return FOCUS_SVGS['quadríceps + glúteo'];
  if (f.includes('glúteo') || f.includes('post')) return FOCUS_SVGS['perna + glúteo'];
  if (f.includes('cintura')) return FOCUS_SVGS['oblíquos + cintura'];
  if (f.includes('coxa')) return FOCUS_SVGS['coxa + glúteo'];
  if (f.includes('lean')) return FOCUS_SVGS['corpo todo lean'];
  return FOCUS_SVGS['corpo todo'];
}

/** Tenta a próxima extensão na cadeia para imagens de objetivos (icons/goals/). */
window.tryNextGoalExt = function (img) {
  const attempt = (+img.dataset.attempt || 0) + 1;
  if (attempt >= FIGHTER_EXTS.length) { img.remove(); return; }
  img.dataset.attempt = attempt;
  img.src = `icons/goals/${img.dataset.gkey}.${FIGHTER_EXTS[attempt]}`;
};

/** Renderiza imagem de objetivo. Procura primeiro em
 *  state.user.goalImages[key] (data URL upada pelo usuário). Senão mostra
 *  SVG abstrato do grupo muscular como placeholder. */
function goalImageHtml(g, { className = '' } = {}) {
  const svg = focusSvg(g.focus);
  const customSrc = state?.user?.goalImages?.[g.key];
  return `
    <div class="goal-img-wrap ${className}">
      <div class="goal-placeholder">
        <div class="goal-svg">${svg}</div>
        <div class="goal-name-overlay">${g.name}</div>
      </div>
      ${customSrc ? `
        <img src="${customSrc}"
             alt="${g.name}"
             class="goal-img loaded"
             loading="lazy"
             data-gkey="${g.key}" />
      ` : ''}
    </div>`;
}

/** Renderiza um lutador como tile limpo (gradient + iniciais).
 *  Versão pós-rework: imagens MK foram removidas — apenas o placeholder. */
function fighterHtml(key, { className = '' } = {}) {
  const f = FIGHTERS[key];
  if (!f) return '';
  const initials = f.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
  return `
    <div class="fighter-wrap ${className}" data-key="${key}">
      <div class="fighter-placeholder" style="--accent:${f.accent}">
        <div class="fighter-init">${initials}</div>
        <div class="fighter-pname">${f.name}</div>
      </div>
    </div>`;
}

// 5 atributos — agora com lutador MK como mascote.
const ATTRIBUTES = [
  { key: 'forca',       name: 'Força',       ko: '힘',     color: '#B8242E', icon: '💪', fighter: 'kano',
    desc: 'Cresce com treinos pesados (compostos, séries baixas).' },
  { key: 'resistencia', name: 'Resistência', ko: '지구력', color: '#E84A1A', icon: '🔥', fighter: 'liukang',
    desc: 'Cresce com cardio, passos e dança.' },
  { key: 'sabedoria',   name: 'Sabedoria',   ko: '지혜',   color: '#FFE08F', icon: '⚡', fighter: 'raiden',
    desc: 'Cresce com leitura, estudo e foco.' },
  { key: 'disciplina',  name: 'Disciplina',  ko: '절제',   color: '#7BB8FF', icon: '❄️', fighter: 'subzero',
    desc: 'Cresce com proteína na meta + sono regular.' },
  { key: 'vitalidade',  name: 'Vitalidade',  ko: '활력',   color: '#3FBF7F', icon: '🕶️', fighter: 'cage',
    desc: 'Cresce com streaks e quests.' },
];

// Biblioteca de exercícios pré-cadastrados.
// Cada exercício carrega technique, mistakes e tip para destravar conhecimento
// de movimento — funciona como mini-manual integrado.
// 운동 = treino. 모든 동작에는 이유가 있다 (todo movimento tem razão).
const EXERCISE_LIBRARY = {
  'Upper A': [
    { name: 'Supino reto barra', target: '3×5–8', muscles: 'peitoral, tríceps, deltóide anterior', ko: '벤치 프레스',
      description: 'Movimento-rei do peito. Construtor de massa torácica e força horizontal.',
      technique: 'Retraia escápulas (junte omoplatas), arco lombar leve, pés firmes no chão. Desça controlado até tocar o mamilo, explode pra cima sem trancar cotovelo.',
      mistakes: 'Cotovelos a 90° (lesão de ombro) — mantenha ~75°. Descer rápido. Levantar a bunda do banco. Não tocar o peito.',
      tip: 'Pense em "afastar o chão de você", não em "empurrar a barra". 화이팅!' },
    { name: 'Remada curvada barra', target: '3×6–10', muscles: 'dorsal, romboides, trapézio médio', ko: '바벨 로우',
      description: 'Espessura do dorsal e back-thickness. Antagonista direto do supino.',
      technique: 'Joelhos semi-flex, tronco ~45°, barra na altura dos joelhos. Puxe até a base do umbigo, apertando escápulas no topo. Desça controlado.',
      mistakes: 'Tronco subindo a cada rep (vira hip hinge). Cotovelos abertos demais (vira trapézio). Pegada curta demais.',
      tip: 'Empurre o peito pra frente enquanto puxa o cotovelo pra trás. Imagine partir uma noz entre as escápulas.' },
    { name: 'Desenvolvimento militar', target: '3×6–10', muscles: 'deltóide anterior, tríceps, trapézio', ko: '오버헤드 프레스',
      description: 'Pressão vertical — constrói ombros e core ao mesmo tempo.',
      technique: 'Barra na frente, na altura das clavículas. Glúteos e core travados. Suba a barra em linha reta vertical, retraindo a cabeça pra trás na passagem.',
      mistakes: 'Hiperestender lombar (fica supino em pé). Empurrar pra frente em vez de pra cima. Não travar core.',
      tip: 'Imagine sua cabeça atravessando uma janela quando a barra passa pela linha do queixo.' },
    { name: 'Pull-up / barra fixa', target: '3×AMRAP', muscles: 'dorsal, bíceps, antebraço', ko: '턱걸이',
      description: 'O rei da largura de dorsal. Sem máquina substitui de verdade.',
      technique: 'Pegada pronada, largura ombros + 10cm. Suba até queixo passar a barra, escápula retraída e peito empurrando pra frente.',
      mistakes: 'Subir só com bíceps (sem ativar dorsal). Balançar (kipping desnecessário). Não passar o queixo.',
      tip: 'Inicie cada rep "puxando o cotovelo pra baixo no bolso de trás". Se não consegue: negativas + assistida elástica.' },
    { name: 'Rosca direta barra', target: '2×8–12', muscles: 'bíceps braquial', ko: '바벨 컬',
      description: 'Hipertrofia clássica de bíceps.',
      technique: 'Cotovelos colados ao corpo, pulso neutro. Suba sem balançar tronco, aperta no topo, desce em 2-3 segundos.',
      mistakes: 'Balanço de quadril (cheating). Cotovelos indo pra frente. Não controlar a fase excêntrica.',
      tip: 'Encoste as costas numa parede — se a parede sente movimento, você está chuteando.' },
    { name: 'Tríceps testa', target: '2×8–12', muscles: 'tríceps (cabeça longa)', ko: '라잉 트라이셉스',
      description: 'Alongamento de tríceps em pico — ótimo pra hipertrofia.',
      technique: 'Deitado, barra acima da testa. Só o antebraço se move; cotovelos travados apontando pro teto. Desce até quase encostar na testa.',
      mistakes: 'Cotovelos abrindo (vira pullover). Movimentar ombro. Carga excessiva.',
      tip: 'Use barra W ou halteres se a barra reta incomodar o cotovelo.' },
  ],
  'Upper B': [
    { name: 'Supino inclinado halteres', target: '4×8–12', muscles: 'peito superior (clavicular), deltóide ant.', ko: '인클라인 덤벨',
      description: 'Mira o peito alto — região esteticamente decisiva pra ficar "preenchido".',
      technique: 'Banco 30–45°. Halteres na altura do peito, cotovelos a ~75°. Desce profundo, sente alongamento, sobe sem encostar halteres no topo.',
      mistakes: 'Inclinação >45° (vira ombro). Cotovelos travados. Encostar halteres no topo (mata tensão).',
      tip: 'Halteres > barra aqui — amplitude maior e cada lado trabalha independente.' },
    { name: 'Pulldown pegada neutra', target: '4×8–12', muscles: 'dorsal (largura), bíceps', ko: '랫 풀다운',
      description: 'Substituto/complemento do pull-up. Pegada neutra é mais "ombro-amigável".',
      technique: 'Senta com coxa travada, barra na largura dos ombros, leve inclinação de tronco (~15°). Puxa até a clavícula. Aperta dorsal no fim.',
      mistakes: 'Puxar com bíceps. Deitar demais (vira remada). Soltar peso na subida (tensão zero).',
      tip: 'Empurre o peito pra cima durante a fase concêntrica.' },
    { name: 'Crucifixo polia baixa', target: '3×10–15', muscles: 'peitoral (linha central), deltóide ant.', ko: '케이블 플라이',
      description: 'Cross body de polia — feedback contínuo no peito interno e linha central.',
      technique: 'Em pé entre 2 polias, leve passada à frente. Cotovelos semi-flex fixos. Tracione com a mão, juntando até cruzar levemente as mãos no centro.',
      mistakes: 'Esticar cotovelo na descida (vira tríceps). Carga excessiva (perde isolamento).',
      tip: 'Aperte uma laranja imaginária entre as mãos no topo, mantém 1 segundo.' },
    { name: 'Remada cavalinho', target: '3×8–12', muscles: 'dorsal médio, romboides', ko: '시티드 로우',
      description: 'Espessura de dorsal e meio-trapézio. Mais seguro que remada livre.',
      technique: 'Peito apoiado, pegada neutra, puxa até o umbigo. Escápula retrai antes do braço se mover.',
      mistakes: 'Cotovelo subindo (vira trapézio). Tronco se movendo (sem apoio = remada livre).',
      tip: 'Pense "cotovelo pro bolso de trás", não "puxar o peso".' },
    { name: 'Elevação lateral', target: '3×12–15', muscles: 'deltóide médio (largura de ombro)', ko: '사이드 레터럴',
      description: 'O exercício mais importante pra ombro largo / aparência de V.',
      technique: 'Halteres leves, leve inclinação pra frente, cotovelo guiando o movimento. Sobe até linha do ombro, sem subir com trapézio.',
      mistakes: 'Carga pesada demais (vira balanço). Polegar pra cima (vira deltóide anterior). Trapézio subindo.',
      tip: 'Imagine que está derramando uma jarra de café — pulso ligeiramente abaixado no topo.' },
    { name: 'Face pull', target: '3×15', muscles: 'deltóide posterior, romboides, manguito', ko: '페이스 풀',
      description: 'Antídoto da postura cifótica. Faz no fim de todo treino de upper.',
      technique: 'Polia alta, corda. Puxe até as mãos chegarem nas orelhas, cotovelos altos, rotação externa no fim.',
      mistakes: 'Carga pesada (perde forma). Cotovelo abaixo da altura do ombro (vira remada alta).',
      tip: 'Faz parecer uma "abertura de cortina" na cabeça.' },
  ],
  'Lower A': [
    { name: 'Agachamento livre', target: '4×5–8', muscles: 'quadríceps, glúteo, posterior, core', ko: '스쿼트',
      description: 'O rei dos exercícios. Força global, hipertrofia de perna inteira, core travado.',
      technique: 'Barra no trapézio (high-bar), pés largura dos ombros, ponta levemente pra fora. Senta entre as pernas, joelho na linha do pé, profundidade até paralelo.',
      mistakes: 'Joelho colapsando pra dentro (valgo). Calcanhar levantando. Lombar arredondada ("butt wink").',
      tip: 'Antes de descer, "rosqueie" os pés no chão pra fora — ativa glúteo e estabiliza joelho.' },
    { name: 'Stiff (RDL)', target: '3×8–10', muscles: 'isquiotibiais, glúteo, lombar', ko: '루마니안 데드리프트',
      description: 'Posterior de coxa e glúteo via hip hinge. Treina cadeia posterior.',
      technique: 'Joelhos quase travados, barra colada à perna. Empurra quadril pra trás, desce barra até meio da canela, sente alongamento de isquio, sobe.',
      mistakes: 'Agachar (vira squat). Barra distante da perna. Lombar arredondando.',
      tip: 'Pense em "fechar uma porta com a bunda" — quadril vai pra trás, não pra baixo.' },
    { name: 'Leg press 45°', target: '3×10–12', muscles: 'quadríceps, glúteo', ko: '레그 프레스',
      description: 'Volume de perna sem fadigar core. Bom finalizador de quad.',
      technique: 'Pés meio do apoio, largura dos ombros. Desce até joelho ~90°. Não solte a coluna do banco.',
      mistakes: 'Solto a coluna (lombar arredonda). Trancar joelho no topo. Pés muito baixos (joelho passa do pé).',
      tip: 'Pés mais altos = mais glúteo/posterior; mais baixos = mais quad.' },
    { name: 'Mesa flexora', target: '3×10–12', muscles: 'isquiotibiais', ko: '레그 컬',
      description: 'Isolamento de posterior — completa o trabalho do stiff.',
      technique: 'Quadril apoiado, joelhos fora do banco. Puxa calcanhar até quase tocar o glúteo. Aperta no pico.',
      mistakes: 'Levantar quadril (cheat). Voltar rápido (perde excêntrica).',
      tip: 'Conte 3 segundos na fase de volta — excêntrica é onde isquio cresce.' },
    { name: 'Panturrilha em pé', target: '4×12–15', muscles: 'gastrocnêmio', ko: '카프 레이즈',
      description: 'Joelho estendido = foca gastrocnêmio (a "cabeça" da panturrilha).',
      technique: 'Antepé na borda, calcanhar abaixo da linha do degrau. Sobe forte, segura 1s no topo, desce profundo.',
      mistakes: 'Amplitude curta. Carga sem controle (mola elástica).',
      tip: 'Faça 1 série dropset por treino — panturrilha responde a volume alto.' },
    { name: 'Abdominal infra (elevação pernas)', target: '3×15', muscles: 'reto abdominal inferior', ko: '리버스 크런치',
      description: 'Foca a parte baixa do abdômen, área teimosa.',
      technique: 'Deitado, pernas semi-flex. Sobe pernas e leva joelho ao peito, retraindo pelve. Não joga as pernas.',
      mistakes: 'Usar inércia. Lombar levantando.',
      tip: 'Pense "enrolar a pelve" em vez de "subir as pernas".' },
  ],
  'Lower B': [
    { name: 'Hip thrust', target: '4×6–10', muscles: 'glúteo máximo, isquio', ko: '힙 쓰러스트',
      description: 'O exercício mais eficiente para glúteo. Carga alta direto no maior músculo do corpo.',
      technique: 'Escápula no banco, barra sobre quadril (com pad). Pés na largura dos ombros, ponta levemente pra fora. Sobe até alinhar tronco-coxa, aperta glúteo 1s no topo.',
      mistakes: 'Hiperestender lombar. Pés muito longe (vira isquio). Não pausar no topo.',
      tip: 'Olhar fixo num ponto à frente (não pro teto) mantém pescoço seguro.' },
    { name: 'Afundo passada', target: '3×10/perna', muscles: 'quadríceps, glúteo, estabilizadores', ko: '런지',
      description: 'Unilateral — corrige assimetrias e treina estabilidade.',
      technique: 'Passada longa, desce até joelho de trás quase tocar. Joelho da frente alinhado com o pé. Empurre com calcanhar.',
      mistakes: 'Passada curta (vira quad isolado). Joelho da frente passando muito do pé.',
      tip: 'Mais passada longa = mais glúteo; mais curta = mais quad.' },
    { name: 'Cadeira extensora', target: '3×10–15', muscles: 'quadríceps (isolado)', ko: '레그 익스텐션',
      description: 'Isolamento puro de quad. Bom pré-fadiga ou finalizador.',
      technique: 'Almofada na canela, encaixa joelho com o eixo. Estende até quase travar, aperta no topo, desce em 3s.',
      mistakes: 'Travar joelho com chute. Carga excessiva.',
      tip: 'Aponte ponta do pé um pouco pra fora pra recrutar vasto medial (gota acima do joelho).' },
    { name: 'Cadeira flexora', target: '3×10–15', muscles: 'isquiotibiais (sentado)', ko: '시티드 컬',
      description: 'Variação sentada — mais alongamento e mais ativação que a mesa flexora.',
      technique: 'Quadril fixo, almofada na panturrilha. Flexiona joelho ao máximo, segura 1s, controla a volta.',
      mistakes: 'Levantar quadril. Voltar com inércia.',
      tip: 'Aponte os pés pra dentro (inversão) — recruta mais a cabeça medial.' },
    { name: 'Panturrilha sentado', target: '4×15', muscles: 'sóleo', ko: '시티드 카프',
      description: 'Joelho flexionado = sóleo (panturrilha "interna"). Complementa em pé.',
      technique: 'Joelho 90°, pad na coxa. Sobe forte, desce profundo. Amplitude completa.',
      mistakes: 'Amplitude curta. Carga sem controle.',
      tip: 'Sóleo é resistente — use reps altas (15–25).' },
    { name: 'Prancha', target: '3×45s', muscles: 'core profundo, glúteo', ko: '플랭크',
      description: 'Anti-extensão lombar. Treina core a manter coluna neutra.',
      technique: 'Cotovelos sob ombros, corpo reto, glúteo apertado, queixo neutro. Respiração ativa.',
      mistakes: 'Bumbum levantado. Lombar caindo. Cabeça pendurada.',
      tip: 'Se 45s ficar fácil, vá pra prancha lateral ou com perna alternada.' },
  ],
  'Push': [
    { name: 'Supino inclinado barra', target: '4×6–10', muscles: 'peito superior, deltóide, tríceps', ko: '인클라인 바벨',
      description: 'Push pesado focado no peito alto. Excelente para construir massa torácica visível.',
      technique: 'Banco 30°. Pegada fechada (ombro+5cm). Desce na linha das clavículas, sobe sem trancar.',
      mistakes: 'Inclinação >45° (vira ombro). Descer no esterno (vira supino reto).',
      tip: 'Manda 4×6 pesado + 1×AMRAP no fim — receita de hipertrofia.' },
    { name: 'Desenvolvimento halteres', target: '3×8–12', muscles: 'deltóide anterior+médio, tríceps', ko: '덤벨 숄더 프레스',
      description: 'Ombro com mais amplitude e equilíbrio bilateral.',
      technique: 'Sentado com apoio, halteres na altura das orelhas, palma virada pra frente. Sobe até quase tocar halteres no topo.',
      mistakes: 'Travar cotovelos. Hiperestender lombar.',
      tip: 'Variação "pegada neutra" (palmas se olhando) é mais amigável pra ombros sensíveis.' },
    { name: 'Crucifixo banco inclinado', target: '3×10–15', muscles: 'peitoral (alongamento)', ko: '플라이',
      description: 'Alongamento intenso de peito, recrutamento por amplitude.',
      technique: 'Banco 30°, halteres acima do peito, cotovelos semi-flex fixos. Abre como abraçando barril, desce até sentir alongamento.',
      mistakes: 'Esticar cotovelo (vira supino). Descer baixo demais (estressa ombro).',
      tip: 'Pausa 1s no ponto mais aberto pra catalisar hipertrofia.' },
    { name: 'Tríceps corda', target: '3×12–15', muscles: 'tríceps (todas cabeças)', ko: '트라이셉스 푸쉬다운',
      description: 'Volume e bombeamento de tríceps. Excelente final de push.',
      technique: 'Polia alta com corda. Cotovelos colados ao corpo. Estende e abre a corda no fim do movimento.',
      mistakes: 'Cotovelos saindo pra frente (vira ombro). Não abrir a corda no final.',
      tip: 'Termina com 1 série drop: 12 reps → tira 30%, mais 12 → mais 30%, mais 12. Pump absurdo.' },
    { name: 'Elevação frontal', target: '3×12', muscles: 'deltóide anterior', ko: '프론트 레이즈',
      description: 'Foco isolado em deltóide anterior. Use só se ombro anterior estiver fraco.',
      technique: 'Halteres na frente das coxas. Sobe até linha do ombro, alternado ou junto. Controle na descida.',
      mistakes: 'Subir acima do ombro (vira trapézio). Balanço.',
      tip: 'Se já faz muito supino, pode pular — o anterior já é bem estimulado.' },
  ],
  'Pull': [
    { name: 'Levantamento terra (Deadlift)', target: '4×3–5', muscles: 'cadeia posterior inteira', ko: '데드리프트',
      description: 'O exercício mais completo de força — recruta praticamente o corpo todo.',
      technique: 'Barra sobre meio do pé, mãos fora dos joelhos. Tronco neutro, peito alto. Empurra o chão com os pés enquanto puxa a barra colada ao corpo.',
      mistakes: 'Lombar arredondando (causa #1 de lesão). Barra distante da canela. Hiperestender no topo.',
      tip: 'Faz só 1x por semana. Pesa muito no SNC — não combine com squat pesado no mesmo dia.' },
    { name: 'Barra fixa pegada supinada', target: '3×AMRAP', muscles: 'bíceps, dorsal inferior', ko: '친업',
      description: 'Variação que dá mais bíceps que pull-up tradicional.',
      technique: 'Pegada supinada largura dos ombros. Sobe até queixo passar a barra. Desça controlado.',
      mistakes: 'Sub-amplitude. Balanço.',
      tip: 'Se barra fixa é difícil, faz 5 negativas (suba ajudado, desça em 5s) — destrava a força em ~4 semanas.' },
    { name: 'Remada unilateral halter', target: '3×8–12/lado', muscles: 'dorsal, romboides', ko: '원암 덤벨 로우',
      description: 'Mais amplitude que a remada barra, sem fadiga lombar.',
      technique: 'Joelho e mão no banco, costas planas. Puxa o halter até a costela inferior, cotovelo perto do corpo.',
      mistakes: 'Rotação de tronco (puxa com costas). Ombro caindo no fim.',
      tip: 'Imagine "guardando o cotovelo no bolso de trás".' },
    { name: 'Pulldown pegada fechada', target: '3×10–12', muscles: 'dorsal inferior, bíceps', ko: '클로즈 그립',
      description: 'Pega o dorsal de baixo e dá largura central.',
      technique: 'Pegada fechada (mãos quase se tocando), supinada ou neutra. Puxa até clavícula com leve inclinação de tronco.',
      mistakes: 'Puxar com bíceps. Inclinar tronco demais.',
      tip: 'Use quando o pulldown tradicional virou trapézio — fecha pegada e foca dorsal.' },
    { name: 'Rosca martelo', target: '3×10–12', muscles: 'bíceps braquial + braquiorradial', ko: '해머 컬',
      description: 'Hipertrofia de bíceps + antebraço. Faz braço parecer mais grosso.',
      technique: 'Pegada neutra (polegares pra cima). Cotovelo fixo, sobe controlado, aperta no topo.',
      mistakes: 'Balanço de quadril. Cotovelo indo pra frente.',
      tip: 'Alterne reto + martelo na mesma série em superset.' },
  ],
  'Core/Abs': [
    { name: 'Prancha frontal', target: '3×60s', muscles: 'core profundo', ko: '플랭크',
      description: 'Estabilidade anti-extensão. Base de tudo.',
      technique: 'Antebraço apoiado, corpo reto, glúteo travado.',
      mistakes: 'Bumbum alto. Lombar caindo. Travar respiração.',
      tip: 'Se 60s é fácil: prancha lateral 30s/lado ou prancha pés elevados.' },
    { name: 'Roda abdominal (Ab wheel)', target: '3×8–12', muscles: 'reto abdominal, oblíquos', ko: '에브 휠',
      description: 'Anti-extensão dinâmico. Um dos exercícios mais difíceis de core.',
      technique: 'Joelhos no chão, roda à frente. Estende lentamente, mantendo lombar neutra. Volta com força do abdômen.',
      mistakes: 'Estender demais e cair (lombar arqueada). Cabeça pra trás.',
      tip: 'Comece com amplitude pequena, vai aumentando ao longo das semanas.' },
    { name: 'Hanging leg raise', target: '3×10–15', muscles: 'reto abdominal inferior + flexor', ko: '행잉 레그 레이즈',
      description: 'Reto inferior + flexor de quadril. Difícil mas absurdamente eficaz.',
      technique: 'Pendurado na barra, sem balanço. Sobe pernas retas (ou semi-flex) até linha do quadril.',
      mistakes: 'Balanço. Não retrair pelve no topo.',
      tip: 'Se reto for difícil, começa com joelho flex. Em 4 semanas evolui pra reto.' },
    { name: 'Cable woodchopper', target: '3×12/lado', muscles: 'oblíquos, core rotacional', ko: '우드 찹',
      description: 'Treina rotação — funcional pra esportes e dança.',
      technique: 'Polia alta de um lado, segura com 2 mãos, gira o tronco pra baixo no lado oposto.',
      mistakes: 'Girar só braço (sem ativar core).',
      tip: 'Vai mais devagar do que parece — controle vence carga.' },
  ],
  'Cardio HIIT': [
    { name: 'Sprint 30s × 12 (1:1)', target: '12 rounds', muscles: 'sistema cardio + perna', ko: '스프린트',
      description: 'HIIT clássico. Queima gordura mantendo massa muscular.',
      technique: 'Esteira ou ar livre. 30s intenso (≥85% FCmax) + 30s caminhada. Repete 12x.',
      mistakes: 'Não recuperar entre rounds. Forçar quando lesão está pedindo descanso.',
      tip: 'Faz no fim do treino de upper, nunca antes — drena energia.' },
    { name: 'Burpees', target: '5×10 reps', muscles: 'corpo inteiro', ko: '버피',
      description: 'O exercício mais democrático do mundo. Sem equipamento. Brutal.',
      technique: 'Agacha, lança pernas pra trás (prancha), faz 1 flexão, volta, salta com mãos pra cima.',
      mistakes: 'Lombar caindo na prancha. Não saltar no fim.',
      tip: 'Quando sentir TDAH explodir e não conseguir focar: 30 burpees, depois tenta de novo.' },
    { name: 'Pular corda', target: '5×3min', muscles: 'panturrilha, ombro, cardio', ko: '줄넘기',
      description: 'Cardio com baixo impacto + coordenação. Pode fazer em qualquer lugar.',
      technique: 'Pulos baixos, pés juntos, pulso girando (não braço inteiro).',
      mistakes: 'Pulos altos demais (gasta energia à toa).',
      tip: 'Boxeadores fazem 15min direto — começa com 3min × 5 e vai subindo.' },
    { name: 'Mountain climbers', target: '4×40s', muscles: 'core + cardio', ko: '마운틴 클라이머',
      description: 'Cardio sem sair do lugar. Combina ativação de core + frequência cardíaca.',
      technique: 'Prancha alta. Joelhos vêm rápido até o peito alternados. Mantém quadril estável.',
      mistakes: 'Bumbum subindo. Joelho não chegando no peito.',
      tip: 'Põe 4 séries de 40s entre outros exercícios — vira finalizador HIIT.' },
  ],
  'Calistenia': [
    { name: 'Flexão de braço', target: '4×AMRAP', muscles: 'peito, tríceps, ombro', ko: '푸쉬업',
      description: 'Movimento fundacional de empurrar. Faz em qualquer lugar.',
      technique: 'Mãos largura dos ombros, corpo reto da cabeça aos calcanhares, desce até peito quase encostar no chão.',
      mistakes: 'Bumbum alto/baixo. Cotovelo aberto a 90°.',
      tip: 'Variação diamond (mãos juntas) foca tríceps; pés elevados foca peito alto.' },
    { name: 'Dip em barras paralelas', target: '3×8–12', muscles: 'peito inferior, tríceps', ko: '딥스',
      description: 'O melhor exercício de calistenia pra peito + tríceps simultâneo.',
      technique: 'Inclinado levemente pra frente (foco peito) ou ereto (foco tríceps). Desce até 90° ou mais, sobe forte.',
      mistakes: 'Descer muito (estressa ombro). Cotovelo abrindo.',
      tip: 'Se for fácil, adiciona cinto com carga. Se difícil, usa banda elástica de assistência.' },
    { name: 'Pistol squat', target: '3×5/perna', muscles: 'quadríceps, glúteo, estabilizador', ko: '피스톨 스쿼트',
      description: 'Agachamento numa perna só. Marco de mobilidade + força.',
      technique: 'Uma perna estendida à frente, outra agacha lentamente. Mantém calcanhar no chão.',
      mistakes: 'Calcanhar levanta. Lombar arredonda.',
      tip: 'Se difícil, faz com apoio em corrimão. Evolui em 6-8 semanas.' },
    { name: 'L-sit', target: '3×15–30s', muscles: 'core, flexor quadril, ombro', ko: '엘 싯',
      description: 'Movimento avançado de estática — abdômen + flexor + ombro.',
      technique: 'Sentado no chão ou paralelas, levanta corpo só com braços, pernas em L à frente.',
      mistakes: 'Pernas dobradas (versão progressão). Ombros encolhidos.',
      tip: 'Começa com joelhos flex (tuck L-sit), evolui pra perna reta em ~8 semanas.' },
  ],
  'Dança K-pop': [
    { name: 'Sessão de dança completa', target: '30–45min', muscles: 'corpo inteiro, cardio, coordenação', ko: '케이팝 댄스',
      description: 'Combina cardio + coordenação + alegria. Excelente para TDAH (foco numa coisa visual e ritmada).',
      technique: 'Aquecimento 5min, sessão principal aprendendo/repetindo 25min, cooldown 5min.',
      mistakes: 'Pular aquecimento (joelho não agradece). Forçar movimento sem alongamento.',
      tip: 'NewJeans, Stray Kids, IVE têm coreografias acessíveis. 1theK Dance e KPOP Step são bons canais.' },
    { name: 'Aprender coreografia nova', target: '30min', muscles: 'memória motora + cardio', ko: '안무 배우기',
      description: 'Foco em aprender uma coreografia nova do começo ao fim. Ótimo desafio cognitivo.',
      technique: 'Vídeo em câmera lenta primeiro (0.5x), domina 8 contagens por vez, depois aumenta velocidade.',
      mistakes: 'Tentar a velocidade real direto — frustra.',
      tip: 'Grava em vídeo pra ver onde está errando. 화이팅 ☆' },
  ],
  'Peito + Tríceps': [
    { name: 'Supino reto barra', target: '4×6–10', muscles: 'peitoral, tríceps, deltóide ant.',
      description: 'Compoosto principal pra construir peito.', technique: 'Escápula retraída, descida controlada até o mamilo, sobe explosivo.',
      mistakes: 'Cotovelos a 90°. Levantar bunda. Não tocar o peito.', tip: 'Pés firmes no chão, glúteo levemente apertado.' },
    { name: 'Supino inclinado halteres', target: '4×8–12', muscles: 'peito superior, deltóide ant.',
      description: 'Foca peito alto — região "preenchida" esteticamente.', technique: 'Banco 30–45°, halteres na largura dos ombros, desce profundo.',
      mistakes: 'Banco muito íngreme (vira ombro). Encostar halteres no topo.', tip: 'Use o cabo se quiser mais tensão constante.' },
    { name: 'Crucifixo halteres', target: '3×10–15', muscles: 'peitoral (alongamento)',
      description: 'Alongamento intenso de peito.', technique: 'Cotovelos semi-flex fixos, abre como abraçando um barril.',
      mistakes: 'Esticar cotovelo no fim (vira supino).', tip: 'Pausa 1s no ponto mais aberto.' },
    { name: 'Tríceps testa', target: '3×8–12', muscles: 'tríceps (cabeça longa)',
      description: 'Alongamento máximo de tríceps.', technique: 'Cotovelos travados apontando pro teto, só antebraço move.',
      mistakes: 'Cotovelo abrindo (vira pullover).', tip: 'Use barra W pra poupar punho.' },
    { name: 'Tríceps corda', target: '3×12–15', muscles: 'tríceps (todas cabeças)',
      description: 'Volume e pump.', technique: 'Cotovelos colados ao corpo, abra a corda no fim do movimento.',
      mistakes: 'Cotovelo subindo (vira ombro).', tip: 'Termina com drop set — pump absurdo.' },
    { name: 'Mergulho em paralelas', target: '3×AMRAP', muscles: 'tríceps, peito inferior',
      description: 'Composto pesado de tríceps.', technique: 'Corpo ereto pra focar tríceps; levemente inclinado pra focar peito.',
      mistakes: 'Descer demais (estressa ombro).', tip: 'Adicione carga com cinto quando bater 12 reps.' },
  ],
  'Costas + Bíceps': [
    { name: 'Barra fixa (pull-up)', target: '4×AMRAP', muscles: 'dorsal, bíceps',
      description: 'O rei da largura de dorsal.', technique: 'Pegada pronada, queixo passa a barra, escápula retraída.',
      mistakes: 'Subir só com bíceps. Sub-amplitude.', tip: 'Negativas + assistida elástica se ainda não tira.' },
    { name: 'Remada curvada barra', target: '4×6–10', muscles: 'dorsal, romboides, trapézio médio',
      description: 'Espessura de dorsal.', technique: 'Tronco ~45°, puxa até umbigo, escápula aperta.',
      mistakes: 'Tronco subindo a cada rep.', tip: 'Imagine "partir uma noz" entre as escápulas.' },
    { name: 'Pulldown pegada neutra', target: '4×10–12', muscles: 'dorsal, bíceps',
      description: 'Substituto/complemento do pull-up.', technique: 'Coxas travadas, leve inclinação (15°), puxa até a clavícula.',
      mistakes: 'Puxar com bíceps. Deitar demais.', tip: 'Empurre o peito pra cima durante a fase concêntrica.' },
    { name: 'Remada unilateral halter', target: '3×8–12/lado', muscles: 'dorsal, romboides',
      description: 'Amplitude maior + sem fadiga lombar.', technique: 'Joelho e mão no banco, costas planas, cotovelo perto do corpo.',
      mistakes: 'Rotação de tronco (cheating).', tip: '"Cotovelo pro bolso de trás".' },
    { name: 'Rosca direta barra', target: '3×8–12', muscles: 'bíceps braquial',
      description: 'Hipertrofia clássica de bíceps.', technique: 'Cotovelos colados ao corpo, pulso neutro.',
      mistakes: 'Balanço de quadril.', tip: 'Encosta as costas na parede pra remover o cheating.' },
    { name: 'Rosca martelo', target: '3×10–12', muscles: 'bíceps + braquiorradial',
      description: 'Bíceps mais grosso + antebraço.', technique: 'Pegada neutra (polegares pra cima), cotovelo fixo.',
      mistakes: 'Cotovelo indo pra frente.', tip: 'Alterne reto + martelo em superset.' },
  ],
  'Ombros': [
    { name: 'Desenvolvimento militar barra', target: '4×6–10', muscles: 'deltóide anterior, tríceps',
      description: 'Pressão vertical pesada.', technique: 'Core travado, sobe a barra em linha reta, retraia cabeça na passagem.',
      mistakes: 'Hiperestender lombar.', tip: 'Imagine atravessar uma janela com a cabeça.' },
    { name: 'Desenvolvimento halteres sentado', target: '4×8–12', muscles: 'deltóide ant+médio',
      description: 'Mais amplitude e equilíbrio bilateral.', technique: 'Halteres na altura das orelhas, palma virada pra frente.',
      mistakes: 'Travar cotovelos.', tip: 'Pegada neutra (palmas se olhando) é mais "ombro-amigável".' },
    { name: 'Elevação lateral', target: '4×12–15', muscles: 'deltóide médio',
      description: 'O exercício mais importante pra ombro largo.', technique: 'Cotovelo guia o movimento, sobe até linha do ombro.',
      mistakes: 'Polegar pra cima (vira ant.). Trapézio subindo.', tip: 'Imagine derramar uma jarra de café — pulso ligeiramente abaixado no topo.' },
    { name: 'Elevação frontal', target: '3×12', muscles: 'deltóide anterior',
      description: 'Isolamento se ombro anterior estiver fraco.', technique: 'Halteres na frente das coxas, sobe até linha do ombro.',
      mistakes: 'Subir acima do ombro (vira trapézio).', tip: 'Se já faz muito supino, pode pular.' },
    { name: 'Face pull', target: '4×15', muscles: 'deltóide posterior, manguito',
      description: 'Antídoto da postura cifótica.', technique: 'Polia alta com corda, puxa até as mãos chegarem nas orelhas.',
      mistakes: 'Carga pesada (perde forma).', tip: 'Faz no fim de todo treino — postura agradece.' },
    { name: 'Encolhimento de ombros (shrug)', target: '4×12', muscles: 'trapézio superior',
      description: 'Trapézio em volume.', technique: 'Halteres ao lado do corpo, sobe ombro até a orelha, pausa 1s.',
      mistakes: 'Rolar o ombro (não rola).', tip: 'Carga vai longe — trapézio aguenta muito.' },
  ],
  'Pernas (quadríceps)': [
    { name: 'Agachamento livre', target: '5×5–8', muscles: 'quadríceps, glúteo, posterior',
      description: 'O rei dos exercícios.', technique: 'Pés largura dos ombros, ponta leve pra fora, profundidade até paralelo.',
      mistakes: 'Joelho valgo. Calcanhar levantando.', tip: '"Rosqueie" os pés no chão pra fora antes de descer.' },
    { name: 'Leg press 45°', target: '4×8–12', muscles: 'quadríceps, glúteo',
      description: 'Volume sem fadigar core.', technique: 'Pés meio do apoio, desce até joelho ~90°.', mistakes: 'Soltar a lombar.', tip: 'Pés mais baixos = mais quad.' },
    { name: 'Cadeira extensora', target: '4×10–15', muscles: 'quadríceps isolado',
      description: 'Isolamento puro de quad.', technique: 'Eixo alinhado com joelho, estende até quase travar, aperta no topo.',
      mistakes: 'Travar com chute.', tip: 'Ponta do pé pra fora recruta vasto medial (gota acima do joelho).' },
    { name: 'Hack squat', target: '4×8–12', muscles: 'quadríceps (mais que glúteo)',
      description: 'Variação focada em quad.', technique: 'Pés meio do apoio, desce profundo.', mistakes: 'Joelhos pra dentro.', tip: 'Pés mais baixos = mais quad ainda.' },
    { name: 'Afundo passada', target: '3×10/perna', muscles: 'quad, glúteo, estabilizador',
      description: 'Unilateral — corrige assimetrias.', technique: 'Passada longa, desce até joelho de trás quase tocar.',
      mistakes: 'Joelho da frente passando do pé.', tip: 'Passada longa = mais glúteo. Curta = mais quad.' },
    { name: 'Panturrilha em pé', target: '4×12–15', muscles: 'gastrocnêmio',
      description: 'Joelho estendido = gastrocnêmio.', technique: 'Antepé na borda, calcanhar abaixo da linha.',
      mistakes: 'Amplitude curta.', tip: 'Faz 1 dropset por treino — panturrilha responde a volume alto.' },
  ],
  'Pernas (posterior + glúteo)': [
    { name: 'Stiff (RDL)', target: '4×8–10', muscles: 'isquiotibiais, glúteo, lombar',
      description: 'Posterior de coxa via hip hinge.', technique: 'Joelhos quase travados, empurra quadril pra trás, barra colada à perna.',
      mistakes: 'Agachar. Lombar arredondando.', tip: '"Fechar a porta com a bunda" — quadril pra trás, não pra baixo.' },
    { name: 'Hip thrust', target: '5×6–10', muscles: 'glúteo máximo, isquio',
      description: 'O exercício mais eficiente para glúteo.', technique: 'Escápula no banco, sobe até alinhar tronco-coxa, aperta 1s no topo.',
      mistakes: 'Hiperestender lombar.', tip: 'Olhar fixo num ponto à frente, não pro teto.' },
    { name: 'Mesa flexora', target: '4×10–12', muscles: 'isquiotibiais',
      description: 'Isolamento de posterior.', technique: 'Quadril apoiado, puxa calcanhar até quase tocar o glúteo.',
      mistakes: 'Levantar quadril.', tip: 'Conte 3s na fase de volta — isquio cresce na excêntrica.' },
    { name: 'Cadeira flexora sentado', target: '3×10–15', muscles: 'isquiotibiais',
      description: 'Variação sentada com mais alongamento.', technique: 'Flexiona joelho ao máximo, segura 1s.',
      mistakes: 'Voltar com inércia.', tip: 'Pés pra dentro recruta a cabeça medial.' },
    { name: 'Afundo búlgaro', target: '3×8/perna', muscles: 'glúteo, quad, posterior',
      description: 'Unilateral pesado.', technique: 'Pé de trás elevado num banco, desce reto, peso na perna da frente.',
      mistakes: 'Curvar pra frente.', tip: 'Tronco ligeiramente inclinado = mais glúteo.' },
    { name: 'Panturrilha sentado', target: '4×15', muscles: 'sóleo',
      description: 'Joelho flexionado = sóleo.', technique: 'Joelho 90°, pad na coxa, sobe forte, desce profundo.',
      mistakes: 'Amplitude curta.', tip: 'Reps altas (15–25).' },
  ],
  'Braços (bíceps + tríceps)': [
    { name: 'Rosca direta barra', target: '4×8–10', muscles: 'bíceps braquial',
      description: 'Hipertrofia clássica.', technique: 'Cotovelos colados, pulso neutro.', mistakes: 'Balanço.', tip: 'Encoste a parede.' },
    { name: 'Rosca martelo', target: '3×10–12', muscles: 'bíceps + braquiorradial',
      description: 'Bíceps grosso + antebraço.', technique: 'Pegada neutra, cotovelo fixo.', mistakes: 'Cotovelo indo pra frente.', tip: 'Superset com rosca direta.' },
    { name: 'Rosca scott', target: '3×10–12', muscles: 'bíceps (parte baixa)',
      description: 'Pico de bíceps.', technique: 'Banco scott, amplitude completa, sem balanço.', mistakes: 'Não esticar completamente.', tip: 'Não estoure cotovelo — controle no fim.' },
    { name: 'Tríceps testa', target: '4×8–12', muscles: 'tríceps cabeça longa',
      description: 'Alongamento intenso.', technique: 'Cotovelos travados apontando pro teto.', mistakes: 'Cotovelo abrindo.', tip: 'Barra W.' },
    { name: 'Tríceps corda', target: '4×12–15', muscles: 'tríceps todas cabeças',
      description: 'Volume e pump.', technique: 'Abra a corda no fim.', mistakes: 'Cotovelo subindo.', tip: 'Drop set no fim.' },
    { name: 'Tríceps francês', target: '3×10', muscles: 'tríceps cabeça longa',
      description: 'Alongamento profundo.', technique: 'Halter atrás da cabeça, cotovelos apontando pro teto.', mistakes: 'Cotovelo abrindo.', tip: 'Use halter de peso médio com amplitude total.' },
  ],
  '🆓 Treino livre': [], // modo aberto — você adiciona exercícios e o app detecta o split
  'Outro':           [],
};

// Buffs/debuffs disponíveis no log diário (multi-select).
const BUFFS = [
  { id: 'foco',    text: 'Foco em alta',       kind: 'buff',  icon: '🎯' },
  { id: 'sono',    text: 'Sono restaurador',   kind: 'buff',  icon: '🌙' },
  { id: 'sol',     text: 'Sol/vitamina D',     kind: 'buff',  icon: '☀️' },
  { id: 'social',  text: 'Boa companhia',      kind: 'buff',  icon: '🫶' },
  { id: 'cans',    text: 'Cansaço acumulado',  kind: 'debuff', icon: '🥱' },
  { id: 'tdah',    text: 'TDAH ruim hoje',     kind: 'debuff', icon: '🌀' },
  { id: 'dor',     text: 'Dor/lesão',          kind: 'debuff', icon: '⚠️' },
  { id: 'estress', text: 'Estresse alto',      kind: 'debuff', icon: '⚡' },
];

const META = {
  protein: 145, // g
  sleep:   7.5, // h
  reading: 15,  // min
  steps:   8000,
};

// XP máximo possível em um dia (usado para cap de XP diário "limpo").
const DAILY_XP_CAP = 7;

const STORAGE_KEY = 'quest.state.v1';
const ACCOUNTS_KEY = 'quest.accounts.v1';
const SESSION_KEY  = 'quest.session.v1';

// ===== 1b. AUTH (local) =====================================
// Multi-conta no mesmo dispositivo. Cada conta tem state próprio em
// quest.state.v1.<accountId>. Senha é hasheada com SHA-256 + salt fixo.
// Não é segurança forte — é "tranca de porta" pra família compartilhar
// o dispositivo. Para auth real seria preciso backend.

/** Lê um File de imagem, redimensiona pra `maxW` (mantém aspect),
 *  e retorna como data URL JPEG comprimido. Mantém o localStorage leve. */
function resizeImageToDataUrl(file, maxW = 700, quality = 0.82) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('image decode failed'));
      img.onload = () => {
        const scale = Math.min(1, maxW / img.naturalWidth);
        const w = Math.round(img.naturalWidth * scale);
        const h = Math.round(img.naturalHeight * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// ===== 1c. CLOUD (Firebase) =================================
// Quando Firebase está disponível (window.QuestCloud), o app usa Auth + Firestore
// pra sincronizar contas e state entre dispositivos. Caso contrário, cai no modo
// local (multi-conta no mesmo aparelho).
// Fotos e dataURLs (state.photos, state.user.goalImages) NÃO sincronizam:
// estouram o limite de 1MB do Firestore. Ficam apenas em localStorage.

function cloudReady() { return !!window.QuestCloud; }

function waitForCloud(timeout = 1500) {
  if (cloudReady()) return Promise.resolve(true);
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(false), timeout);
    window.addEventListener('quest-cloud-ready', () => {
      clearTimeout(t);
      resolve(true);
    }, { once: true });
  });
}

/** Remove campos pesados (fotos) antes de sincronizar com Firestore. */
function stripHeavyForCloud(s) {
  const copy = JSON.parse(JSON.stringify(s));
  copy.photos = [];
  if (copy.user) copy.user.goalImages = {};
  return copy;
}

/** Mescla state vindo do Firestore com fotos locais (que não sincronizam). */
function mergeWithLocalMedia(cloudState, localState) {
  if (!cloudState) return localState;
  if (!localState) return cloudState;
  cloudState.photos = localState.photos || [];
  cloudState.user = cloudState.user || {};
  cloudState.user.goalImages = localState.user?.goalImages || {};
  return cloudState;
}

let _cloudSaveTimer = null;
let _cloudSaveLastError = null;
/** Agenda salvamento no Firestore — debounce 800ms (evita writes excessivos). */
function scheduleCloudSave() {
  if (!cloudReady()) return;
  const user = window.QuestCloud.auth.currentUser;
  if (!user || !state) return;
  if (_cloudSaveTimer) clearTimeout(_cloudSaveTimer);
  _cloudSaveTimer = setTimeout(async () => {
    try {
      const ref = window.QuestCloud.doc(window.QuestCloud.db, 'users', user.uid);
      await window.QuestCloud.setDoc(ref, {
        state: stripHeavyForCloud(state),
        updatedAt: Date.now(),
      }, { merge: true });
      _cloudSaveLastError = null;
    } catch (e) {
      _cloudSaveLastError = e.message || String(e);
      console.warn('cloud save failed:', e);
    }
  }, 800);
}

/** Carrega state do Firestore (com cache offline do SDK). */
async function loadCloudState(uid) {
  try {
    const ref = window.QuestCloud.doc(window.QuestCloud.db, 'users', uid);
    const snap = await window.QuestCloud.getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data().state || null;
  } catch (e) {
    console.warn('cloud load failed:', e);
    return null;
  }
}

/** Lista candidatos de state legado/local pra migrar pra nuvem.
 *  Retorna [{key, label, summary}]. Pula a chave da conta cloud atual. */
function listLocalDataCandidates() {
  const out = [];
  const cloudUid = cloudReady() && window.QuestCloud.auth.currentUser?.uid;
  const cloudKey = cloudUid ? stateKey(cloudUid) : null;
  // 1) state legado em quest.state.v1 (sem account id)
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      out.push({
        key: STORAGE_KEY,
        label: 'Modo convidado (sem conta)',
        summary: summarizeState(s),
      });
    }
  } catch {}
  // 2) Contas locais com state
  for (const a of loadAccounts()) {
    const k = stateKey(a.id);
    if (k === cloudKey) continue;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      out.push({
        key: k,
        label: `Conta local: ${a.username}`,
        summary: summarizeState(JSON.parse(raw)),
        accountId: a.id,
      });
    } catch {}
  }
  // 3) Outras chaves quest.state.v1.* não-associadas a contas
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith(STORAGE_KEY + '.') || k === cloudKey) continue;
    if (out.find((x) => x.key === k)) continue;
    try {
      const s = JSON.parse(localStorage.getItem(k));
      out.push({
        key: k,
        label: `Dados órfãos (${k.slice(STORAGE_KEY.length + 1, STORAGE_KEY.length + 9)}…)`,
        summary: summarizeState(s),
      });
    } catch {}
  }
  return out;
}

function summarizeState(s) {
  if (!s) return 'vazio';
  const rank = s.user?.rankXP ?? 0;
  const logs = s.dailyLogs?.length ?? 0;
  const wos  = s.workouts?.length ?? 0;
  const meas = s.bodyMeasurements?.length ?? 0;
  return `${rank} XP · ${logs} dias · ${wos} treinos · ${meas} medidas`;
}

function hasLocalDataAvailable() {
  return listLocalDataCandidates().length > 0;
}

/** Mostra modal com candidatos pra migrar pra nuvem. */
function modalMigrateToCloud() {
  if (!cloudReady() || !window.QuestCloud.auth.currentUser) {
    toast('Entre numa conta na nuvem primeiro');
    return;
  }
  const candidates = listLocalDataCandidates();
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <h2 class="font-extrabold text-lg">Migrar para a nuvem</h2>
        <p class="text-xs text-ink/55 dark:text-paper/55">Escolha qual conjunto de dados locais subir pra sua conta atual.</p>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-3 overflow-y-auto" style="max-height:75vh">
      ${candidates.length === 0 ? `<div class="text-sm text-ink/55 dark:text-paper/55">Nenhum dado local encontrado.</div>` :
        candidates.map((c) => `
          <div class="q-card p-3">
            <div class="font-bold text-sm">${c.label}</div>
            <div class="text-[11px] text-ink/55 dark:text-paper/55 mt-0.5">${c.summary}</div>
            <div class="flex gap-2 mt-2">
              <button class="q-btn q-btn-primary text-xs flex-1 migrate-pick" data-key="${c.key}">Usar estes dados</button>
              <button class="q-btn q-btn-ghost text-xs migrate-delete" data-key="${c.key}" title="Apagar do aparelho">🗑️</button>
            </div>
          </div>
        `).join('')}
      <p class="text-[10px] text-ink/45 dark:text-paper/45 italic mt-2">
        ⚠ "Usar estes dados" substitui o state atual da sua conta na nuvem pelos dados escolhidos.
        Fotos locais continuam só neste aparelho.
      </p>
    </div>
  `);

  document.querySelectorAll('.migrate-pick').forEach((b) => b.onclick = async () => {
    const k = b.dataset.key;
    if (!confirm('Substituir os dados da conta atual pelos dados deste perfil local? A conta atual perde o state atual da nuvem.')) return;
    try {
      const raw = localStorage.getItem(k);
      if (!raw) throw new Error('Dados locais não encontrados.');
      const newState = JSON.parse(raw);
      migrateState(newState);
      // Mescla fotos locais que estiverem na chave da conta cloud atual (não perder)
      const cloudUid = window.QuestCloud.auth.currentUser.uid;
      const cloudKey = stateKey(cloudUid);
      let currentCloud = null;
      try { currentCloud = JSON.parse(localStorage.getItem(cloudKey) || 'null'); } catch {}
      if (currentCloud) {
        newState.photos = (newState.photos?.length ? newState.photos : currentCloud.photos) || [];
        newState.user = newState.user || {};
        if (!newState.user.goalImages || !Object.keys(newState.user.goalImages).length) {
          newState.user.goalImages = currentCloud.user?.goalImages || {};
        }
      }
      state = newState;
      saveState(); // grava local + dispara upload pra Firestore
      // Remove a fonte local migrada (evita ambiguidade)
      localStorage.removeItem(k);
      toast('Dados migrados pra nuvem ✓');
      closeModal();
      render();
    } catch (e) {
      alert(e.message || 'Erro ao migrar.');
    }
  });
  document.querySelectorAll('.migrate-delete').forEach((b) => b.onclick = () => {
    if (!confirm('Apagar definitivamente esses dados locais? Não dá pra desfazer.')) return;
    localStorage.removeItem(b.dataset.key);
    modalMigrateToCloud();
  });
}

async function sha256(text) {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function loadAccounts() {
  try { return JSON.parse(localStorage.getItem(ACCOUNTS_KEY)) || []; }
  catch { return []; }
}
function saveAccounts(accs) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accs));
}
function getSession() {
  return localStorage.getItem(SESSION_KEY) || null;
}
function setSession(id) {
  if (id) localStorage.setItem(SESSION_KEY, id);
  else    localStorage.removeItem(SESSION_KEY);
}
function currentAccount() {
  if (cloudReady()) {
    const u = window.QuestCloud.auth.currentUser;
    if (!u) return null;
    return {
      id: u.uid,
      username: u.displayName || (u.email || '').split('@')[0],
      email: u.email || '',
    };
  }
  const id = getSession();
  if (!id) return null;
  return loadAccounts().find((a) => a.id === id) || null;
}
function stateKey(accountId) {
  return accountId ? `${STORAGE_KEY}.${accountId}` : STORAGE_KEY;
}

async function createAccount({ username, password }) {
  username = (username || '').trim();
  if ((password || '').length < 4) throw new Error('Senha precisa ter ao menos 4 caracteres.');

  // Modo cloud: usa Firebase Auth (username deve ser email)
  if (cloudReady()) {
    if (!username.includes('@')) throw new Error('Use um email válido como identificador.');
    try {
      const cred = await window.QuestCloud.createUserWithEmailAndPassword(window.QuestCloud.auth, username, password);
      // Display name: prefixo do email
      const display = username.split('@')[0];
      try { await window.QuestCloud.updateProfile(cred.user, { displayName: display }); } catch {}
      return cred.user.uid;
    } catch (e) {
      throw new Error(firebaseAuthMsg(e));
    }
  }

  // Modo local (fallback)
  if (username.length < 2) throw new Error('Usuário precisa ter ao menos 2 letras.');
  const accs = loadAccounts();
  if (accs.some((a) => a.username.toLowerCase() === username.toLowerCase())) {
    throw new Error('Esse usuário já existe.');
  }
  const id = 'u' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  const passwordHash = await sha256(password + '·quest-salt·' + id);
  accs.push({ id, username, passwordHash, createdAt: new Date().toISOString() });
  saveAccounts(accs);
  return id;
}

async function loginAccount({ username, password }) {
  username = (username || '').trim();
  if (cloudReady()) {
    if (!username.includes('@')) throw new Error('Use um email válido como identificador.');
    try {
      const cred = await window.QuestCloud.signInWithEmailAndPassword(window.QuestCloud.auth, username, password);
      return cred.user.uid;
    } catch (e) {
      throw new Error(firebaseAuthMsg(e));
    }
  }
  const accs = loadAccounts();
  const acc = accs.find((a) => a.username.toLowerCase() === username.toLowerCase());
  if (!acc) throw new Error('Usuário não encontrado.');
  const hash = await sha256(password + '·quest-salt·' + acc.id);
  if (hash !== acc.passwordHash) throw new Error('Senha incorreta.');
  return acc.id;
}

function logoutAccount() {
  if (cloudReady()) {
    window.QuestCloud.signOut(window.QuestCloud.auth).catch(() => {});
  }
  setSession(null);
  state = null;
  showAuthScreen();
}

/** Apaga a conta atual permanentemente:
 *  - cloud: deleta doc Firestore + deleta usuário do Auth (com re-auth se necessário)
 *  - local: remove conta da lista + state + session
 *  Em ambos os modos, limpa o cache localStorage da conta. */
async function deleteCurrentAccount({ password } = {}) {
  // Modo cloud
  if (cloudReady() && window.QuestCloud.auth.currentUser) {
    const user = window.QuestCloud.auth.currentUser;
    // 1) Apaga doc do Firestore primeiro
    try {
      const ref = window.QuestCloud.doc(window.QuestCloud.db, 'users', user.uid);
      await window.QuestCloud.deleteDoc(ref);
    } catch (e) {
      console.warn('Falha apagando doc Firestore:', e);
    }
    // 2) Apaga usuário do Auth (pode exigir re-auth se sessão antiga)
    try {
      await window.QuestCloud.deleteUser(user);
    } catch (e) {
      if (e.code === 'auth/requires-recent-login') {
        if (!password) throw new Error('Senha obrigatória pra confirmar a exclusão.');
        const cred = window.QuestCloud.EmailAuthProvider.credential(user.email, password);
        await window.QuestCloud.reauthenticateWithCredential(user, cred);
        await window.QuestCloud.deleteUser(user);
      } else {
        throw new Error(firebaseAuthMsg(e));
      }
    }
    // 3) Limpa cache local da conta
    try { localStorage.removeItem(stateKey(user.uid)); } catch {}
    state = null;
    return;
  }

  // Modo local
  const id = getSession();
  if (id) {
    const accs = loadAccounts().filter((a) => a.id !== id);
    saveAccounts(accs);
    try { localStorage.removeItem(stateKey(id)); } catch {}
    setSession(null);
  } else {
    // Modo convidado legado
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  }
  state = null;
}

/** Traduz códigos de erro do Firebase Auth pra PT. */
function firebaseAuthMsg(e) {
  const c = e.code || '';
  if (c === 'auth/email-already-in-use') return 'Esse email já tem conta. Tente entrar.';
  if (c === 'auth/invalid-email')        return 'Email inválido.';
  if (c === 'auth/weak-password')        return 'Senha muito fraca (mínimo 6 caracteres).';
  if (c === 'auth/user-not-found')       return 'Usuário não encontrado.';
  if (c === 'auth/wrong-password')       return 'Senha incorreta.';
  if (c === 'auth/invalid-credential')   return 'Email ou senha incorretos.';
  if (c === 'auth/too-many-requests')    return 'Muitas tentativas. Espere um pouco.';
  if (c === 'auth/network-request-failed') return 'Sem conexão. Tente de novo.';
  return e.message || 'Erro de autenticação.';
}

// ===== 2. STATE ==============================================

/** Estado em memória. É reidratado de localStorage no init. */
let state = null;

function makeEmptyState() {
  return {
    user: {
      name: 'Jogador',
      currentRank: 'iron',
      totalXP: 0,
      rankXP: 0, // pontuação acumulada que determina o rank (sofre decay semanal)
      goals: 'Recomposição corporal: cut com leve hipertrofia em peito/dorsais',
      darkMode: false,
      reminders: { proteinTimes: ['12:30', '19:30'] },
      onboarded: false,
      kcalGoal: 2200,
      proteinGoal: 145,
      attributes: { forca: 0, resistencia: 0, sabedoria: 0, disciplina: 0, vitalidade: 0 },
      achievementsUnlocked: [],
      questsCompleted: 0,
    },
    dailyLogs: [],          // [{date, training, protein, sleep, reading, steps, buffs, notes, xp}]
    workouts: [],           // [{date, type, exercises:[{name, sets:[{reps,weight,technique}]}]}]
    bodyMeasurements: [],   // [{date, weight, waist, chest, arm}]
    photos: [],             // [{date, type:'front'|'side', dataUrl}]
    quests: {
      pool: structuredClone(DEFAULT_QUEST_POOL),
      weeklyPool: structuredClone(DEFAULT_WEEKLY_POOL),
      dailyAssigned: { date: null, items: [], rerolled: false, completed: [] },
      weeklyCurrent: { weekStart: null, item: null, progress: 0, completed: false },
    },
    rewards: {
      available: [
        // Reforços rápidos (sessões de lazer guilt-free)
        '1 partida de LoL (ranqueada)',
        '2 partidas de LoL (normal/aram)',
        '1 episódio de anime',
        'Maratona 3 eps do anime atual',
        'Filme com pipoca',
        // Recompensas maiores
        'Comprar lightstick novo',
        'Sessão de fotos',
        'Cinema sozinho',
      ],
      unlocked: [],   // skins desbloqueadas (3 semanas seguidas em Platina, etc.)
      redeemed: [],   // {date, text}
    },
    books: [],        // [{title, totalPages, currentPage, finishedAt?}]
    rankHistory: [],  // [{weekStart, rank, xp, rankXP}]
    sleepSessions: [], // [{date, startISO, endISO?, durationH}]
    settings: { lastSeenInsights: null, lastDecayWeek: null },
  };
}

function loadState() {
  try {
    const acc = currentAccount();
    const key = stateKey(acc?.id);
    let raw = localStorage.getItem(key);
    // Compat: se a conta foi recém-criada e não tem state, mas existe
    // state no key legado (quest.state.v1), promove pra essa conta.
    if (!raw && acc) {
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) raw = legacy;
    }
    if (!raw) return null;
    const s = JSON.parse(raw);
    migrateState(s);
    return s;
  } catch (e) {
    console.error('Falha lendo localStorage:', e);
    return null;
  }
}

/** Garante que campos novos apareçam mesmo em estados antigos.
 *  Idempotente — chame quantas vezes quiser sem efeito colateral. */
function migrateState(s) {
  if (!s) return;
  // Tema legado → tema novo
  s.user = s.user || {};
  if (s.user.theme === 'kpop')  s.user.theme = 'kpop_anime';
  if (s.user.theme === 'clean') s.user.theme = 'inside_out';
  if (!s.user.theme || !THEMES[s.user.theme]) s.user.theme = 'kpop_anime';

  // Marca quests específicas de K-pop no pool já salvo (idempotente)
  const KPOP_QUEST_IDS = new Set(['q26', 'q32', 'q33', 'q34', 'q35', 'q36']);
  if (s.quests?.pool) {
    s.quests.pool.forEach((q) => {
      if (KPOP_QUEST_IDS.has(q.id)) q.kpopOnly = true;
    });
  }

  // Garante que weekly quest atual tenha target. Procura no pool default +
  // pools temáticos pelo id antes de cair no default 1.
  function findTargetById(id) {
    const inDefault = DEFAULT_WEEKLY_POOL.find((q) => q.id === id);
    if (inDefault?.target != null) return inDefault.target;
    for (const t of Object.values(THEMES)) {
      const m = (t.weeklyQuests || []).find((q) => q.id === id);
      if (m?.target != null) return m.target;
    }
    return 1;
  }
  // Sempre alinha o target ao definido no pool (migração agressiva — sobrescreve
  // valores defaults de 1 atribuídos por migrações antigas).
  if (s.quests?.weeklyCurrent?.item) {
    const real = findTargetById(s.quests.weeklyCurrent.item.id);
    s.quests.weeklyCurrent.item.target = real;
  }
  if (Array.isArray(s.quests?.weeklyPool)) {
    s.quests.weeklyPool.forEach((q) => {
      if (q) q.target = findTargetById(q.id);
    });
  }

  s.rewards = s.rewards || { available: [], unlocked: [], redeemed: [] };
  s.rewards.available = s.rewards.available || [];
  const newRewards = [
    '1 partida de LoL (ranqueada)',
    '2 partidas de LoL (normal/aram)',
    '1 episódio de anime',
    'Maratona 3 eps do anime atual',
  ];
  // Compatibilidade: aceita strings legadas e objetos novos {id, text, daily}
  const existingTexts = new Set(
    s.rewards.available.map((r) => typeof r === 'string' ? r : r.text)
  );
  for (const r of newRewards) {
    if (!existingTexts.has(r)) s.rewards.available.push(r);
  }

  // Migração de keys antigas de GOALS → novas (após rework por grupo muscular).
  s.user = s.user || {};
  if (Array.isArray(s.user.activeGoals)) {
    const goalKeyMap = {
      // Keys antigas (versões 1 e 2) → novas keys por grupo muscular
      'cage_arms':    'definicao',
      'jeno_abs':     'abdomen',
      'liu_pecs':     'peitoral',
      'subzero_back': 'dorsal',
      'wonho_arms':   'bracos',
      'jaypark_lean': 'calistenia',
      'johnny':       'bracos',
      'leejeno':      'abdomen',
      'kano':         'forca',
      'liukang':      'peitoral',
      'subzero':      'dorsal',
      'raiden':       'ombros',
      'scorpion':     'cardio',
      'cage':         'definicao',
      // sem foto correspondente: kitana_legs, karina_waist, lisa_thighs, stage_ready → removidos
    };
    const validKeys = new Set(['bracos','abdomen','calistenia','forca','peitoral','dorsal','ombros','cardio','definicao']);
    s.user.activeGoals = s.user.activeGoals
      .map((k) => goalKeyMap[k] || k)
      .filter((k) => validKeys.has(k));
    s.user.activeGoals = Array.from(new Set(s.user.activeGoals));
  }
}

function saveState() {
  try {
    const acc = currentAccount();
    localStorage.setItem(stateKey(acc?.id), JSON.stringify(state));
  } catch (e) {
    console.error('Falha gravando localStorage:', e);
    toast('⚠️ Sem espaço para salvar localmente');
  }
  // Espelha pra Firestore (debounced — não bloqueia UI)
  if (cloudReady() && window.QuestCloud.auth.currentUser) {
    scheduleCloudSave();
    // Atualiza leaderboard global de leitura
    syncReadingLeaderboard().catch(() => {});
  }
}

/** Popula dados de exemplo dos últimos 14 dias para tela "preenchida". */
function seedSampleData() {
  const today = new Date();
  const types = ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Push', 'Pull', 'Dança K-pop'];
  // Inclui hoje (i=0) para o estado inicial não ficar "Ferro 0 XP".
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today); d.setDate(d.getDate() - i);
    const iso = isoDate(d);
    const trained = Math.random() > 0.25;
    const proteinG = trained ? 110 + Math.round(Math.random() * 55) : 100 + Math.round(Math.random() * 40);
    const sleepH = +(6.4 + Math.random() * 2.2).toFixed(1);
    const reading = Math.random() > 0.4 ? Math.round(10 + Math.random() * 15) : 0;
    const steps = Math.round(4000 + Math.random() * 9000);
    const buffs = Math.random() > 0.6 ? ['sono'] : (Math.random() > 0.7 ? ['tdah'] : []);
    const log = {
      date: iso,
      training: trained ? { type: types[i % types.length], done: true } : { type: 'descanso', done: false },
      protein: { grams: proteinG, hit: proteinG >= META.protein },
      sleep: { hours: sleepH },
      reading: { minutes: reading },
      steps,
      buffs,
      notes: '',
    };
    log.xp = computeDayXP(log);
    state.dailyLogs.push(log);
    if (trained) {
      const type = log.training.type;
      const ex = (EXERCISE_LIBRARY[type] || []).slice(0, 4).map((e) => ({
        name: e.name,
        sets: Array.from({ length: 3 }, () => ({
          reps: 6 + Math.floor(Math.random() * 6),
          weight: 20 + Math.floor(Math.random() * 40),
          technique: Math.random() > 0.85 ? 'rest-pause' : '',
        })),
      }));
      state.workouts.push({ date: iso, type, exercises: ex });
    }
  }
  // Medidas semanais
  for (let w = 4; w >= 1; w--) {
    const d = new Date(today); d.setDate(d.getDate() - w * 7);
    state.bodyMeasurements.push({
      date: isoDate(d),
      weight: +(78.5 - w * 0.4 + (Math.random() - 0.5) * 0.6).toFixed(1),
      waist:  +(86 - w * 0.3).toFixed(1),
      chest:  +(101 + w * 0.1).toFixed(1),
      arm:    +(35.5 + w * 0.05).toFixed(1),
    });
  }
  // Livro em andamento
  state.books.push({ title: '코리아: 일상 단어', totalPages: 220, currentPage: 84 });
  state.books.push({ title: 'Atomic Habits', totalPages: 300, currentPage: 156 });

  // XP total acumulado vai direto pro rankXP (mexe no rank)
  const totalEarned = state.dailyLogs.reduce((s, l) => s + (l.xp || 0), 0);
  state.user.totalXP = totalEarned;
  state.user.rankXP = totalEarned;
  state.user.currentRank = rankFromXP(state.user.rankXP).key;
}

// ===== 3. UTILS ==============================================

function isoDate(d = new Date()) {
  // Usa data LOCAL, não UTC. toISOString() volta UTC e pode pular 1 dia
  // dependendo do fuso (em UTC+X de manhã vira dia anterior; em UTC-X de
  // noite vira dia seguinte). Sempre queremos a data no fuso do usuário.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function todayISO() { return isoDate(new Date()); }

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0=domingo
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}

function weeklyXP() {
  const start = startOfWeek();
  return state.dailyLogs
    .filter((l) => new Date(l.date) >= start)
    .reduce((s, l) => s + (l.xp || 0), 0);
}

function rankFromXP(xp) {
  let r = RANKS[0];
  for (const x of RANKS) if (xp >= x.threshold) r = x;
  return r;
}

/** Aplica ganho/perda de XP — atualiza totalXP e rankXP, detecta promoção e
 *  dispara verificação de achievements. Se houver streak ativo, aplica multiplier. */
function gainXP(amount, opts = {}) {
  const before = rankFromXP(state.user.rankXP);
  const mult = (amount > 0 && !opts.noMult) ? comboMultiplier() : 1;
  const finalAmt = Math.round(amount * mult);
  state.user.totalXP = (state.user.totalXP || 0) + finalAmt;
  state.user.rankXP  = Math.max(0, (state.user.rankXP || 0) + finalAmt);
  const after = rankFromXP(state.user.rankXP);
  state.user.currentRank = after.key;

  // Distribui aos atributos se contexto fornecido
  if (opts.attr && finalAmt > 0) addAttributeXP(opts.attr, Math.max(1, Math.round(finalAmt * 0.5)));

  // Achievements e skin checks
  setTimeout(() => checkAchievements(), 50);

  if (before.key !== after.key) {
    const promoted = RANKS.indexOf(after) > RANKS.indexOf(before);
    return { changed: true, from: before, to: after, promoted, finalAmt, mult };
  }
  return { changed: false, finalAmt, mult };
}

/** Multiplicador de XP por sequência: 3 dias = 1.1x, 7 = 1.2x, 14 = 1.3x, 30 = 1.5x. */
function comboMultiplier() {
  const s = streaks();
  const best = Math.max(s.treino, s.sono, s.proteina, s.leitura);
  if (best >= 30) return 1.5;
  if (best >= 14) return 1.3;
  if (best >= 7)  return 1.2;
  if (best >= 3)  return 1.1;
  return 1;
}

function addAttributeXP(key, amount) {
  if (!state.user.attributes) state.user.attributes = { forca: 0, resistencia: 0, sabedoria: 0, disciplina: 0, vitalidade: 0 };
  state.user.attributes[key] = (state.user.attributes[key] || 0) + amount;
}

/** Verifica todas as conquistas; emite toast + confete pra cada nova desbloqueada. */
function checkAchievements() {
  if (!state.user.achievementsUnlocked) state.user.achievementsUnlocked = [];
  const newly = [];
  for (const a of ACHIEVEMENTS) {
    if (state.user.achievementsUnlocked.includes(a.id)) continue;
    try {
      if (a.cond(state)) {
        state.user.achievementsUnlocked.push(a.id);
        newly.push(a);
      }
    } catch (e) { /* condição mal-formada — ignora */ }
  }
  if (newly.length) {
    // Credita o XP imediatamente pra refletir no render
    for (const a of newly) {
      state.user.totalXP = (state.user.totalXP || 0) + a.xp;
      state.user.rankXP  = (state.user.rankXP  || 0) + a.xp;
    }
    state.user.currentRank = rankFromXP(state.user.rankXP).key;
    saveState();
    // Toasts sequenciais (visual reward)
    newly.forEach((a, i) => {
      setTimeout(() => {
        toast(`${a.icon} ${a.name} desbloqueada! +${a.xp} XP`);
        confetti(800);
        vibrate(40);
      }, i * 1500);
    });
    // Re-render uma vez no fim pra refletir XP/rank
    setTimeout(() => render(), 50);
  }
}

/** Retorna a quote do dia, do pool do tema atual (determinística — muda 1x/dia). */
function dailyQuote() {
  const d = new Date(todayISO()).getTime();
  const dayIdx = Math.floor(d / 86400000);
  const pool = (getTheme(state).quotes && getTheme(state).quotes.length)
    ? getTheme(state).quotes
    : [getTheme(state).quote];
  return pool[dayIdx % pool.length];
}
const dailyKoreanQuote = dailyQuote; // compat — chamada antiga ainda funciona

/** Calcula XP do dia a partir de um log diário. Cap em DAILY_XP_CAP. */
function computeDayXP(log) {
  let xp = 0;
  // Treino feito ou descanso planejado +2
  if (log.training?.done) xp += 2;
  else if (log.training?.type === 'descanso') xp += 1;
  // Proteína bateu +2 ; chegou a 80% +1
  if (log.protein?.hit) xp += 2;
  else if ((log.protein?.grams || 0) >= META.protein * 0.8) xp += 1;
  // Sono ≥7h +1; ≥7.5h +2
  if ((log.sleep?.hours || 0) >= 7.5) xp += 2;
  else if ((log.sleep?.hours || 0) >= 7) xp += 1;
  // Leitura ≥15min +1
  if ((log.reading?.minutes || 0) >= META.reading) xp += 1;
  // 8k passos +1
  if ((log.steps || 0) >= META.steps) xp += 1;
  // Debuffs reduzem 0 (compensação social – TDAH não pune dias ruins)
  return Math.min(xp, DAILY_XP_CAP);
}

/** Computa streak ativo para uma chave (predicado).
 *  Se hoje ainda não foi registrado, começa a contar a partir de ontem
 *  para não "quebrar" o streak antes do usuário fazer o log do dia. */
function streakFor(predicate) {
  const byDate = new Map(state.dailyLogs.map((l) => [l.date, l]));
  if (byDate.size === 0) return 0;
  let count = 0;
  const cursor = new Date(todayISO());
  // Pula hoje se ainda não tem log (tolerância de 1 dia)
  if (!byDate.has(isoDate(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (true) {
    const log = byDate.get(isoDate(cursor));
    if (log && predicate(log)) {
      count++;
      cursor.setDate(cursor.getDate() - 1);
    } else break;
  }
  return count;
}

function streaks() {
  return {
    treino:   streakFor((l) => l.training?.done),
    sono:     streakFor((l) => (l.sleep?.hours || 0) >= 7),
    proteina: streakFor((l) => l.protein?.hit),
    leitura:  streakFor((l) => (l.reading?.minutes || 0) >= META.reading),
  };
}

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return { pt: 'Madrugada produtiva',  ko: '깊은 밤' };
  if (h < 12) return { pt: 'Bom dia',               ko: '좋은 아침' };
  if (h < 18) return { pt: 'Boa tarde',             ko: '안녕하세요' };
  if (h < 22) return { pt: 'Boa noite',             ko: '좋은 저녁' };
  return       { pt: 'Hora de desacelerar',         ko: '잘 자요' };
}

/** Sorteia n elementos únicos de um array (Fisher-Yates parcial). */
function sample(arr, n) {
  const copy = arr.slice();
  const out = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

/** Garante quests diárias sorteadas para hoje. */
function ensureDailyQuests() {
  const today = todayISO();
  const da = state.quests.dailyAssigned;
  if (da.date !== today) {
    // Filtra quests específicas de K-pop quando o tema não é kpop_anime
    const isKpop = state.user.theme === 'kpop_anime' || !state.user.theme;
    const pool = state.quests.pool.filter((q) => isKpop || !q.kpopOnly);
    state.quests.dailyAssigned = {
      date: today,
      items: sample(pool, 3),
      rerolled: false,
      completed: [],
    };
    saveState();
  }
}

/** Garante weekly quest para a semana atual. */
function ensureWeeklyQuest() {
  const wstart = isoDate(startOfWeek());
  const wq = state.quests.weeklyCurrent;
  if (wq.weekStart !== wstart) {
    const isKpop = state.user.theme === 'kpop_anime' || !state.user.theme;
    const themeKey = state.user.theme || 'kpop_anime';
    // Combina pool universal (filtrado por tema) + weekly quests temáticas
    const pool = [
      ...state.quests.weeklyPool.filter((q) => isKpop || !q.kpopOnly),
      ...((THEMES[themeKey] && THEMES[themeKey].weeklyQuests) || []),
    ];
    state.quests.weeklyCurrent = {
      weekStart: wstart,
      item: sample(pool, 1)[0] || null,
      progress: 0,
      completed: false,
    };
    saveState();
  }
}

// ===== 4. ICONS (lucide-style inline) ========================

const I = {
  home:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  plus:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  dumb:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.4 14.4 9.6 9.6"/><path d="M18.657 21.485a2 2 0 1 1-2.829-2.828l-1.767 1.768a2 2 0 1 1-2.829-2.829l6.364-6.364a2 2 0 1 1 2.829 2.829l-1.768 1.767a2 2 0 1 1 2.828 2.829z"/><path d="m21.5 21.5-1.4-1.4"/><path d="M3.9 3.9 2.5 2.5"/><path d="M6.343 2.515a2 2 0 0 1 2.829 2.828l1.767-1.768a2 2 0 1 1 2.829 2.829L7.404 12.768a2 2 0 1 1-2.829-2.829l1.768-1.767a2 2 0 1 1-2.828-2.829z"/></svg>`,
  body:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="5" r="2.5"/><path d="M12 7.5v6"/><path d="m9 10 3 1 3-1"/><path d="m9 13 3 1 3-1"/><path d="M9 21v-5l3-2 3 2v5"/></svg>`,
  moon:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`,
  book:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>`,
  spark:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><path d="m6.34 6.34 2.83 2.83M14.83 14.83l2.83 2.83M6.34 17.66l2.83-2.83M14.83 9.17l2.83-2.83"/></svg>`,
  cog:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
  check:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  fire:   `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12.5 2.5c-.5 2-2 3-3 4.5-1.5 2-2.5 4-2.5 6.5 0 4 3 7 7 7s7-3 7-7c0-3.5-2-6-4-8 .5 2-1 4-2 4s-2-1-2.5-2.5-.5-3 0-4.5z"/></svg>`,
  trophy: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4a2 2 0 0 1-2-2V5a1 1 0 0 1 1-1h3"/><path d="M18 9h2a2 2 0 0 0 2-2V5a1 1 0 0 0-1-1h-3"/><path d="M6 4h12v6a6 6 0 0 1-12 0z"/><path d="M9 17h6"/><path d="M12 14v3"/><path d="M8 21h8"/></svg>`,
  reroll: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7L21 8"/><polyline points="21 3 21 8 16 8"/></svg>`,
  timer:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/></svg>`,
  camera: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/></svg>`,
  gift:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"/><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"/></svg>`,
  chev:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  close:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  bell:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  bowl:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11h18a8 8 0 0 1-16 0z"/><path d="M2 11h20"/><path d="M9 5c0-1 1-2 2-2s2 1 2 2-1 2-1 3"/><path d="M15 5c0-1 1-2 2-2"/></svg>`,
  award:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.5 13.5 17 22l-5-3-5 3 1.5-8.5"/></svg>`,
  brain:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.04Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.04Z"/></svg>`,
  info:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`,
  // === Decorativos MK ===
  // Dragão MK estilizado (silhouette ornamental — para background de hero)
  dragon: `<svg viewBox="0 0 200 200" fill="currentColor"><path d="M100 18c-12 0-22 8-28 20-4-2-10-2-14 2-6 6-4 16 2 22-8 4-14 14-12 24 2 10 12 18 22 18-2 4-2 10 2 14 4 4 10 4 14 2-2 8 0 18 8 22 8 4 18 0 22-8 4 8 14 12 22 8 8-4 10-14 8-22 4 2 10 2 14-2 4-4 4-10 2-14 10 0 20-8 22-18 2-10-4-20-12-24 6-6 8-16 2-22-4-4-10-4-14-2-6-12-16-20-28-20zm-32 60c4 0 8 4 8 8s-4 8-8 8-8-4-8-8 4-8 8-8zm64 0c4 0 8 4 8 8s-4 8-8 8-8-4-8-8 4-8 8-8zm-46 30h28c-2 8-8 14-14 14s-12-6-14-14z"/></svg>`,
  // Punho cerrado (fighter pose)
  fist: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M5.5 9c0-1.5 1-2.5 2.5-2.5h1V5c0-1.5 1-2.5 2.5-2.5S14 3.5 14 5v1.5h1.5C17 6.5 18 7.5 18 9v6c0 3-2 5-5 5h-2c-3 0-5-2-5-5V9z"/></svg>`,
  // Lightning bolt (Raiden style)
  bolt: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L4 14h6l-2 8 10-14h-7z"/></svg>`,
  // Chama (Scorpion ember)
  flame: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c-1 4-4 5-4 9 0 2 1 4 4 4s4-2 4-4c0-2-2-3-4-9zm-3 13c-2 0-4 2-4 5h14c0-3-2-5-4-5-1 0-2 1-3 1s-2-1-3-1z"/></svg>`,
  // Floco/cristal (Sub-Zero)
  ice: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2v20M2 12h20M5 5l14 14M19 5L5 19"/></svg>`,
  // Caveira (boss / brutal)
  skull: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C7 2 4 5 4 10v5l2 2v3h3v-2h2v2h2v-2h2v2h3v-3l2-2v-5c0-5-3-8-8-8zm-3 8a2 2 0 110 4 2 2 0 010-4zm6 0a2 2 0 110 4 2 2 0 010-4z"/></svg>`,
  // Espada (Kitana fans)
  sword: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="14 6 18 2 22 6 18 10 18 14 14 18 10 14 14 10"/><line x1="14" y1="18" x2="2" y2="22"/></svg>`,
  // Fighter silhouette (combat pose) — usado como hero na tela Treino
  fighter: `<svg viewBox="0 0 120 200" fill="currentColor"><circle cx="60" cy="22" r="14"/><path d="M50 38c-4 8-12 14-22 18-4 1-4 8 0 8l18-2 6 22-22 28c-3 4 1 10 6 8l24-12 4 30c0 6 8 6 8 0l4-30 24 12c5 2 9-4 6-8L84 84l6-22 18 2c4 0 4-7 0-8-10-4-18-10-22-18-2-3-12-3-14 0l-6 6-6-6c-2-3-12-3-14 0z"/></svg>`,
};

// ===== 5. FX (efeitos visuais e hápticos) ====================

function vibrate(ms = 18) {
  if (navigator.vibrate) navigator.vibrate(ms);
}

function toast(message, ms = 2200) {
  const el = document.createElement('div');
  el.className = 'q-toast';
  el.textContent = message;
  document.getElementById('fx').appendChild(el);
  setTimeout(() => el.remove(), ms);
}

function confetti(durationMs = 1400) {
  const colors = ['#FFB7C5', '#B7B5FF', '#A8E6CF', '#FFD8A8', '#7BB8FF'];
  const fx = document.getElementById('fx');
  const N = 28;
  for (let i = 0; i < N; i++) {
    const c = document.createElement('div');
    c.className = 'confetti-piece';
    c.style.background = colors[i % colors.length];
    const x = Math.random() * 100;
    c.style.left = `${x}vw`;
    c.style.setProperty('--dx', `${(Math.random() - 0.5) * 30}vw`);
    c.style.animationDuration = `${1.2 + Math.random() * 0.6}s`;
    fx.appendChild(c);
    setTimeout(() => c.remove(), durationMs + 400);
  }
}

/** Mapeia tipo de overlay → lutador MK que aparece atrás do texto. */
const OVERLAY_FIGHTER = {
  flawless:   'liukang',  // dia perfeito = Liu Kang
  fatality:   'scorpion', // "GET OVER HERE!"
  brutality:  'kano',     // raw power
  outstanding:'raiden',   // thunder god promo
  finish:     'cage',     // Hollywood approves
  toasty:     'cage',     // easter egg
};

/** Overlay celebratório — varia por tema (KOMBAT_EVENTS = só K-pop/Anime).
 *  Mostra silhueta do lutador relacionado por trás do texto no tema K-pop. */
function kombatOverlay(kind = 'finish') {
  const ev = themeEvent(kind) || KOMBAT_EVENTS.finish;
  const showFighter = state?.user?.theme === 'kpop_anime' || !state?.user?.theme;
  const fighterKey = showFighter ? OVERLAY_FIGHTER[kind] : null;
  const fighter = fighterKey && FIGHTERS[fighterKey];
  const overlay = document.createElement('div');
  overlay.className = 'mk-overlay';
  overlay.innerHTML = `
    ${fighter ? `<div class="mk-fighter">${fighterHtml(fighterKey)}</div>` : ''}
    <div class="mk-text">${ev.title}</div>
    <div class="mk-sub">${ev.sub}</div>
    ${fighter ? `<div class="mk-fighter-tag">${fighter.name} · ${fighter.tagline}</div>` : ''}
    <button class="mk-close">PROSSEGUIR</button>
  `;
  document.body.appendChild(overlay);
  vibrate([60, 30, 100]);
  confetti(1500);
  // Auto-close em ~3.2s ou no clique
  const close = () => overlay.remove();
  overlay.querySelector('.mk-close').onclick = close;
  overlay.onclick = (e) => { if (e.target === overlay) close(); };
  setTimeout(close, 3200);
}

/** Damage number flutuante — emerge perto do dedo do usuário ao ganhar XP. */
function damageNumber(amount, anchorEl) {
  const fx = document.getElementById('fx');
  const num = document.createElement('div');
  num.className = 'dmg-num';
  num.textContent = `+${amount} XP`;
  let x = window.innerWidth / 2, y = window.innerHeight / 2;
  if (anchorEl) {
    const rect = anchorEl.getBoundingClientRect();
    x = rect.left + rect.width / 2;
    y = rect.top + rect.height / 2;
  }
  num.style.left = `${x - 30}px`;
  num.style.top  = `${y - 20}px`;
  fx.appendChild(num);
  setTimeout(() => num.remove(), 1700);
}

function levelUpOverlay(fromRank, toRank, promoted = true) {
  const overlay = document.createElement('div');
  overlay.className = 'levelup-overlay';
  const verb = promoted ? 'PROMOÇÃO' : 'REBAIXAMENTO';
  const ko = promoted ? '승급!' : '강등';
  overlay.innerHTML = `
    <div class="levelup-card">
      <div class="font-display text-xs uppercase tracking-widest text-ink/50 mb-1">${ko}</div>
      <div class="text-2xl font-extrabold mb-3">${verb}</div>
      <div class="flex items-center justify-center gap-3 mb-4">
        <div class="rank-badge text-paper" style="background:${fromRank.color}">${fromRank.name[0].toUpperCase()}</div>
        <div class="text-xl">→</div>
        <div class="rank-badge text-paper" style="background:${toRank.color}">${toRank.name[0].toUpperCase()}</div>
      </div>
      <div class="text-lg font-semibold mb-4">Agora você é <span style="color:${toRank.color}">${toRank.name}</span></div>
      <button class="q-btn q-btn-primary w-full" id="lvlup-close">Continuar</button>
    </div>`;
  document.body.appendChild(overlay);
  if (promoted) confetti(1800);
  vibrate(80);
  overlay.querySelector('#lvlup-close').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}

// ===== 6. VIEWS ==============================================

let currentTab = 'home';
const app = () => document.getElementById('app');

function render() {
  ensureDailyQuests();
  ensureWeeklyQuest();
  applyTheme();
  const views = {
    home:     viewDashboard,
    workout:  viewWorkout,
    nutri:    viewNutrition,
    goals:    viewGoals,
    reading:  viewReading,
    body:     viewBody,
    insights: viewInsights,
    config:   viewConfig,
  };
  app().innerHTML = (views[currentTab] || viewDashboard)();
  renderTabbar();
  attachHandlers();
  app().firstElementChild?.classList.add('animate-fade-up');
}

function go(tab) {
  currentTab = tab;
  window.scrollTo(0, 0);
  render();
}

// ----- 6.1 Dashboard ----------------------------------------

function viewDashboard() {
  const u = state.user;
  const rxp = u.rankXP || 0;
  const wxp = weeklyXP();
  const r = rankFromXP(rxp);
  const nextIdx = RANKS.findIndex((x) => x.key === r.key) + 1;
  const next = RANKS[nextIdx] || null;
  const progress = next
    ? Math.min(100, ((rxp - r.threshold) / (next.threshold - r.threshold)) * 100)
    : 100;
  const todayLog = state.dailyLogs.find((l) => l.date === todayISO());
  const dayXP = todayLog?.xp || 0;
  const g = greeting();
  const s = streaks();
  const da = state.quests.dailyAssigned;
  const wq = state.quests.weeklyCurrent;
  const quote = dailyKoreanQuote();
  const mult = comboMultiplier();
  const attrs = state.user.attributes || { forca:0, resistencia:0, sabedoria:0, disciplina:0, vitalidade:0 };
  const unlockedCount = (state.user.achievementsUnlocked || []).length;

  // Quote do dia — rotaciona dentro do pool do tema atual
  const theme = getTheme(state);
  const q = dailyQuote();
  const quoteHtml = `
    <div class="font-display text-base text-ink/80 dark:text-paper/80">${q.primary}</div>
    ${q.secondary ? `<div class="text-xs italic text-ink/55 dark:text-paper/55">${q.secondary}</div>` : ''}`;
  const borderClass = 'border-pink/60 dark:border-pink/50';
  const greetingTop = theme.greeting?.primary || g.ko;

  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="flex items-center justify-between relative">
      <div>
        <div class="font-display text-xs uppercase tracking-widest text-ink/40 dark:text-paper/40">${greetingTop}</div>
        <h1 class="text-2xl font-extrabold mt-0.5">${g.pt}, ${u.name}.</h1>
      </div>
      <button id="toggle-dark" class="q-btn q-btn-ghost px-3 py-2" aria-label="modo escuro">
        ${state.user.darkMode ? '☀️' : '🌙'}
      </button>
    </div>
    <div class="mt-3 pl-3 border-l-2 ${borderClass} relative">
      ${quoteHtml}
    </div>
  </header>

  <section class="px-4">
    <div class="q-card p-4 flex items-center gap-4 ${RANKS.indexOf(r) >= 6 ? 'rank-elite' : ''}">
      <div class="rank-badge text-paper" style="background:${r.color}">
        ${r.name[0].toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between gap-2">
          <div class="font-kombat text-lg uppercase tracking-wider" style="color:${r.color}">${r.name}</div>
          <div class="text-xs text-ink/50 dark:text-paper/50">
            ${next ? `→ ${next.name} em ${next.threshold - rxp} XP` : '👑 CHALLENGER'}
          </div>
        </div>
        <div class="xp-track is-kombat mt-2"><div class="xp-fill" style="width:${progress}%"></div></div>
        <div class="flex justify-between text-xs mt-1 text-ink/55 dark:text-paper/55">
          <span>Rank: <b>${rxp} XP</b></span>
          <span>Semana: <b>${wxp}</b></span>
          <span>Hoje: <b>${dayXP}/${DAILY_XP_CAP}</b></span>
        </div>
      </div>
    </div>
  </section>

  <section class="px-4 mt-4">
    <div class="flex flex-wrap gap-2 items-center">
      ${streakChip('🔥', 'Treino', s.treino, 'treino')}
      ${streakChip('🌙', 'Sono',   s.sono,   'sono')}
      ${streakChip('🥩', 'Proteína', s.proteina, 'proteina')}
      ${streakChip('📖', 'Leitura', s.leitura, 'leitura')}
      ${mult > 1 ? `<span class="pill is-sun text-xs">⚡ Combo ×${mult.toFixed(1)}</span>` : ''}
    </div>
  </section>

  <section class="px-4 mt-4">
    <div class="q-card p-3">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-bold text-sm tracking-wider uppercase opacity-70">Atributos</h3>
        <span class="text-xs text-ink/45 dark:text-paper/45">${ATTRIBUTES.reduce((s,a)=>s+(attrs[a.key]||0),0)} pts</span>
      </div>
      <div class="grid grid-cols-5 gap-1">
        ${ATTRIBUTES.map(a => {
          const val = attrs[a.key] || 0;
          const max = Math.max(...ATTRIBUTES.map(x => attrs[x.key] || 0), 10);
          const pct = (val / max) * 100;
          return `
          <button class="flex flex-col items-center gap-1 attr-tile" data-attr="${a.key}" aria-label="${a.name}: ${val}">
            <div class="attr-chip" style="--accent:${a.color}" data-fallback="${a.icon}">
              <span class="attr-ko">${a.ko || a.icon}</span>
            </div>
            <div class="w-full xp-track" style="height:5px"><div class="xp-fill" style="width:${pct}%; background:${a.color}"></div></div>
            <div class="text-[11px] font-bold" style="color:${a.color}">${val}</div>
            <div class="text-[9px] text-ink/55 dark:text-paper/55 leading-tight text-center">${a.name}</div>
          </button>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="px-4 mt-3">
    ${(() => {
      const idx = Math.floor(new Date(todayISO()).getTime() / 86400000) % ATTRIBUTES.length;
      const a = ATTRIBUTES[idx];
      const val = attrs[a.key] || 0;
      const showKo = theme.showKombatant;
      return `
      <div class="q-card p-3 flex items-center gap-3">
        <div class="attr-chip shrink-0" style="--accent:${a.color}; width:56px; height:56px; font-size:22px;" data-fallback="${a.icon}">
          ${showKo ? `<span class="attr-ko">${a.ko || a.icon}</span>` : ''}
        </div>
        <div class="flex-1 min-w-0">
          <div class="text-[10px] uppercase tracking-widest text-ink/45 dark:text-paper/45">Atributo do dia</div>
          <div class="font-extrabold text-base" style="color:${a.color}">${a.name}${showKo && a.ko ? ` · ${a.ko}` : ''}</div>
          <div class="text-[11px] text-ink/60 dark:text-paper/60 leading-tight mt-0.5">${a.desc}</div>
        </div>
        <div class="text-right">
          <div class="text-[10px] text-ink/45 dark:text-paper/45">pts</div>
          <div class="text-xl font-extrabold" style="color:${a.color}">${val}</div>
        </div>
      </div>`;
    })()}
  </section>

  ${(() => {
    const dailies = (state.rewards.available || [])
      .map((r) => typeof r === 'string' ? { text: r, daily: false } : r)
      .filter((r) => r.daily);
    if (!dailies.length) return '';
    return `
    <section class="px-4 mt-3">
      <button id="open-rewards-daily" class="q-card w-full p-3 text-left flex items-center gap-3" style="border-left:3px solid #D6A93E">
        <span class="text-xl">🎁</span>
        <div class="flex-1 min-w-0">
          <div class="text-[10px] uppercase tracking-widest text-kgold">Recompensas diárias</div>
          <div class="font-semibold text-sm truncate">${dailies.map(r => r.text).slice(0,2).join(' · ')}${dailies.length > 2 ? ` +${dailies.length - 2}` : ''}</div>
          <div class="text-[10px] text-ink/55 dark:text-paper/55">Você tem ${dailies.length} recompensa${dailies.length === 1 ? '' : 's'} pra resgatar hoje</div>
        </div>
        <span class="w-4 h-4 opacity-40">${I.chev}</span>
      </button>
    </section>`;
  })()}

  <section class="px-4 mt-5">
    <div class="flex items-center justify-between mb-2">
      <h2 class="font-extrabold text-lg">Daily quests</h2>
      <button id="reroll" class="text-xs flex items-center gap-1 ${da.rerolled ? 'opacity-40 pointer-events-none' : 'text-lavender'}">
        <span class="w-4 h-4 inline-block">${I.reroll}</span> Re-roll
      </button>
    </div>
    <div class="q-card divide-y divide-ink/5 dark:divide-paper/5">
      ${da.items.map((q) => {
        const done = da.completed.includes(q.id);
        return `
        <div class="p-3 flex items-center gap-3 quest-row" data-quest="${q.id}">
          <button class="q-check ${done ? 'is-checked' : ''}" aria-label="completar">
            <span class="w-4 h-4">${I.check}</span>
          </button>
          <div class="flex-1">
            <div class="${done ? 'line-through opacity-50' : 'font-semibold'}">${q.text}</div>
            <div class="text-xs text-ink/45 dark:text-paper/45 mt-0.5">${q.tag || ''}</div>
          </div>
          <div class="pill is-mint">+${q.xp} XP</div>
        </div>`;
      }).join('')}
    </div>
  </section>

  ${wq.item ? (() => {
    const target = wq.item.target || 1;
    const progress = Math.min(target, wq.progress || 0);
    const pct = wq.completed ? 100 : Math.round((progress / target) * 100);
    const stepperHtml = target > 1 ? `
      <div class="wq-stepper mt-3" data-target="${target}">
        ${Array.from({length: target}, (_, i) => `
          <button class="wq-step ${i < progress ? 'is-done' : ''}" data-idx="${i}"
                  aria-label="${i < progress ? 'desmarcar' : 'marcar'} passo ${i+1}">
            ${i < progress ? '✓' : i+1}
          </button>
        `).join('')}
      </div>` : '';
    return `
    <section class="px-4 mt-5">
      <div class="q-card p-4">
        <div class="flex items-center justify-between">
          <div>
            <div class="font-display text-xs uppercase tracking-widest text-ink/40 dark:text-paper/40">${theme.showKombatant ? '주간 미션' : 'DESAFIO SEMANAL'}</div>
            <div class="font-bold mt-0.5">Weekly quest</div>
          </div>
          <div class="pill is-pink">+${wq.item.xp} XP</div>
        </div>
        <div class="mt-2 text-sm">${wq.item.text}</div>
        <div class="xp-track mt-3"><div class="xp-fill" style="width:${pct}%"></div></div>
        ${stepperHtml}
        <div class="flex items-center justify-between mt-2">
          <span class="text-xs text-ink/50 dark:text-paper/50">
            ${wq.completed ? '✓ Completa' : `${progress}/${target} · ${pct}%`}
          </span>
          <button id="wq-toggle" class="text-xs text-lavender font-semibold">
            ${wq.completed ? 'desmarcar' : (target > 1 ? 'marcar tudo como completa' : 'marcar como completa')}
          </button>
        </div>
      </div>
    </section>`;
  })() : ''}

  <section class="px-4 mt-6">
    <button id="open-log" class="q-btn q-btn-finish w-full py-4 text-base">
      <span class="w-5 h-5">${I.flame}</span> ${theme.labels?.finishBtn || 'FINISH IT!'} <span class="w-5 h-5">${I.flame}</span>
    </button>
    <p class="text-center text-xs text-ink/45 dark:text-paper/45 mt-2">
      ${theme.labels?.register || 'Registrar dia'} · ${dayXP}/${DAILY_XP_CAP} XP capturados hoje
    </p>
  </section>

  <section class="px-4 mt-6">
    <div class="kombat-divider">${theme.labels?.arsenal || '⚔ ARSENAL ⚔'}</div>
    <div class="grid grid-cols-2 gap-3">
      ${theme.showKombatant ? quickTile('choreo', 'Dança K-pop', I.spark, 'modal') : ''}
      ${quickTile('challenge',  'Desafios',    I.skull,  'modal')}
      ${quickTile('compete',    'Competição',  I.trophy, 'modal')}
      ${quickTile('library',    'Biblioteca',  I.brain,  'modal')}
      ${quickTile('sleep',      'Sono',        I.moon,   'modal')}
      ${quickTile('reading',    'Leitura',     I.book,   'modal')}
      ${quickTile('rewards',    'Recompensas', I.gift,   'modal')}
      ${quickTile('insights',   'Insights',    I.spark)}
      ${quickTile('achievements', `Conquistas · ${unlockedCount}`, I.award, 'modal')}
      ${quickTile('config',     'Config',      I.cog)}
    </div>
  </section>

  ${theme.labels?.footer ? `
  <section class="px-4 mt-6 pb-2 text-center">
    <div class="font-kombat text-[10px] text-blood/50 dark:text-ember/50 tracking-[0.4em]">${theme.labels.footer}</div>
  </section>` : ''}
  `;
}

function streakChip(emoji, label, count, dataKey) {
  const dataAttr = dataKey ? ` data-quick="${dataKey}"` : '';
  const cls = dataKey ? 'streak-chip is-clickable' : 'streak-chip';
  if (count <= 0) return `<button class="${cls} opacity-50"${dataAttr}>${emoji} ${label} 0</button>`;
  return `<button class="${cls}"${dataAttr}>${emoji} ${label} <b>${count}d</b></button>`;
}

function quickTile(key, label, icon, kind = 'tab') {
  return `
    <button class="q-card p-4 flex items-center gap-3 text-left tile-btn"
            data-target="${key}" data-kind="${kind}">
      <span class="w-7 h-7 text-lavender">${icon}</span>
      <span class="font-semibold">${label}</span>
      <span class="ml-auto w-4 h-4 opacity-40">${I.chev}</span>
    </button>`;
}

// ----- 6.2 Daily Log (modal) --------------------------------

function modalDailyLog() {
  const today = todayISO();
  const existing = state.dailyLogs.find((l) => l.date === today) || {
    date: today,
    training: { type: 'Upper A', done: false },
    protein: { grams: 0, hit: false },
    sleep: { hours: 0 },
    reading: { minutes: 0 },
    steps: 0,
    buffs: [],
    notes: '',
  };
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <h2 class="font-extrabold text-lg">Registrar dia</h2>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <form id="log-form" class="p-4 space-y-5 overflow-y-auto" style="max-height:70vh">
      <fieldset>
        <legend class="font-semibold mb-2">Treino</legend>
        <div class="flex gap-2 flex-wrap mb-2">
          ${['feito', 'descanso', 'pulei'].map((opt) => `
            <label class="cursor-pointer">
              <input type="radio" name="train-status" value="${opt}" class="sr-only"
                ${ (existing.training?.done && opt==='feito') ||
                   (existing.training?.type==='descanso' && opt==='descanso') ||
                   (!existing.training?.done && existing.training?.type!=='descanso' && opt==='pulei')
                  ? 'checked':''} />
              <span class="pill ${opt==='feito'?'is-mint':opt==='descanso'?'is-sun':'is-pink'} px-3 py-1 capitalize">${opt}</span>
            </label>`).join('')}
        </div>
        <select name="train-type" class="q-input">
          ${Object.keys(EXERCISE_LIBRARY).map(t =>
            `<option value="${t}" ${existing.training?.type===t?'selected':''}>${t}</option>`).join('')}
        </select>
      </fieldset>

      <fieldset>
        <legend class="font-semibold mb-2">Proteína (g, meta ${META.protein})</legend>
        <input type="number" name="protein" min="0" max="400" value="${existing.protein?.grams||0}" class="q-input" />
      </fieldset>

      <div class="grid grid-cols-2 gap-3">
        <fieldset>
          <legend class="font-semibold mb-2">Sono (h)</legend>
          <input type="number" step="0.1" name="sleep" min="0" max="14" value="${existing.sleep?.hours||0}" class="q-input" />
        </fieldset>
        <fieldset>
          <legend class="font-semibold mb-2">Leitura (min)</legend>
          <input type="number" name="reading" min="0" max="240" value="${existing.reading?.minutes||0}" class="q-input" />
        </fieldset>
      </div>

      <fieldset>
        <legend class="font-semibold mb-2">Passos</legend>
        <input type="number" name="steps" min="0" max="60000" value="${existing.steps||0}" class="q-input" />
      </fieldset>

      <fieldset>
        <legend class="font-semibold mb-2">Buffs / debuffs ativos</legend>
        <div class="flex flex-wrap gap-2">
          ${BUFFS.map(b => `
            <label class="cursor-pointer buff-pill" data-buff="${b.id}">
              <input type="checkbox" name="buff" value="${b.id}" class="sr-only" ${existing.buffs?.includes(b.id)?'checked':''} />
              <span class="pill ${b.kind==='buff'?'is-mint':'is-pink'} text-sm">${b.icon} ${b.text}</span>
            </label>`).join('')}
        </div>
      </fieldset>

      <fieldset>
        <legend class="font-semibold mb-2">Notas (opcional)</legend>
        <textarea name="notes" class="q-input" rows="2" placeholder="como foi o dia?">${existing.notes||''}</textarea>
      </fieldset>

      <button type="submit" class="q-btn q-btn-primary w-full py-3 mt-2">Salvar dia</button>
    </form>
  `);

  document.getElementById('log-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const status = f.querySelector('input[name="train-status"]:checked')?.value || 'pulei';
    const trainType = f['train-type'].value;
    const protein = +f.protein.value || 0;
    const sleep = +f.sleep.value || 0;
    const reading = +f.reading.value || 0;
    const steps = +f.steps.value || 0;
    const buffs = [...f.querySelectorAll('input[name="buff"]:checked')].map((b) => b.value);
    const notes = f.notes.value;
    const newLog = {
      date: today,
      training: {
        type: status === 'descanso' ? 'descanso' : trainType,
        done: status === 'feito',
      },
      protein: { grams: protein, hit: protein >= META.protein },
      sleep: { hours: sleep },
      reading: { minutes: reading },
      steps,
      buffs,
      notes,
    };
    newLog.xp = computeDayXP(newLog);
    const change = upsertDailyLog(newLog);
    saveState();

    closeModal();
    // Damage number flutuante perto do botão clicado
    const finishBtn = document.getElementById('open-log');
    damageNumber(newLog.xp, finishBtn);
    confetti(900);
    vibrate(25);

    // FLAWLESS VICTORY se dia perfeito (cap atingido)
    if (newLog.xp >= DAILY_XP_CAP) {
      setTimeout(() => kombatOverlay('flawless'), 400);
    } else {
      toast(`+${newLog.xp} XP salvos 🎉`);
    }

    if (change.changed) {
      setTimeout(() => kombatOverlay('outstanding'), 800);
      setTimeout(() => levelUpOverlay(change.from, change.to, change.promoted), 1400);
    }
    render();
  });
}

/** Substitui (ou cria) o log de um dia e aplica o delta de XP no rankXP/totalXP.
 *  XP é distribuído entre os atributos conforme o tipo da ação no log. */
function upsertDailyLog(log) {
  const idx = state.dailyLogs.findIndex((l) => l.date === log.date);
  const oldXP = idx >= 0 ? (state.dailyLogs[idx].xp || 0) : 0;
  if (idx >= 0) state.dailyLogs[idx] = log;
  else state.dailyLogs.push(log);
  const delta = (log.xp || 0) - oldXP;
  const change = gainXP(delta);
  if (delta > 0) {
    // Distribuição manual de atributos baseada nas dimensões do log
    if (log.training?.done) addAttributeXP('forca', 2);
    if ((log.steps||0) >= META.steps) addAttributeXP('resistencia', 2);
    if ((log.reading?.minutes||0) >= META.reading) addAttributeXP('sabedoria', 2);
    if (log.protein?.hit) addAttributeXP('disciplina', 1);
    if ((log.sleep?.hours||0) >= 7) addAttributeXP('disciplina', 1);
  }
  return change;
}

// ----- 6.3 Workout view -------------------------------------

function viewWorkout() {
  const types = Object.keys(EXERCISE_LIBRARY);
  const subtitles = {
    '🆓 Treino livre': 'detecta split sozinho',
    'Peito + Tríceps':  'pressão + isolamento', 'Costas + Bíceps':  'tração + isolamento',
    'Ombros':           'deltóide completo',     'Braços (bíceps + tríceps)': 'dia de braço',
    'Pernas (quadríceps)': 'quad isolado',       'Pernas (posterior + glúteo)': 'cadeia posterior',
    'Upper A': 'peito + dorsais',                'Upper B': 'peito alto + ombros',
    'Lower A': 'compostos pesados',              'Lower B': 'glúteo + acessórios',
    'Push':    'peito · ombro · tríceps',        'Pull':    'dorsais · bíceps',
    'Core/Abs': 'núcleo de combate',             'Cardio HIIT': 'queima · resistência',
    'Calistenia': 'sem peso · só corpo',         'Dança K-pop': 'cardio + coordenação',
    'Outro': 'modo aberto',
  };
  const icons = {
    '🆓 Treino livre': I.plus,
    'Peito + Tríceps': I.flame, 'Costas + Bíceps': I.dumb,
    'Ombros': I.fist,           'Braços (bíceps + tríceps)': I.fist,
    'Pernas (quadríceps)': I.bolt, 'Pernas (posterior + glúteo)': I.bolt,
    'Upper A': I.fist, 'Upper B': I.fist, 'Lower A': I.bolt, 'Lower B': I.bolt,
    'Push': I.flame, 'Pull': I.dumb, 'Core/Abs': I.skull,
    'Cardio HIIT': I.bolt, 'Calistenia': I.fighter, 'Dança K-pop': I.spark,
    'Outro': I.sword,
  };
  // Sugestão de descanso ativo: rotaciona por dia
  const restPicks = pickActiveRest();

  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="kombat-tagline text-xs">${getTheme(state).tags.workout}</div>
    <h1 class="text-2xl font-extrabold mt-1">Treino</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55">Escolha um split, registre manualmente, ou descreva o que você quer.</p>
    <button id="open-library" class="q-btn q-btn-ghost mt-3 text-sm">
      <span class="w-4 h-4">${I.brain}</span> Biblioteca completa
    </button>
  </header>

  <section class="px-4 space-y-3">
    <!-- Registro manual + auto-detecção -->
    <details class="q-card overflow-hidden" id="manual-card">
      <summary class="p-3 flex items-center gap-2 cursor-pointer list-none">
        <span class="w-5 h-5 text-lavender">${I.plus}</span>
        <span class="font-bold flex-1">Registrar manualmente</span>
        <span class="text-xs text-ink/45 dark:text-paper/45">o app detecta o split</span>
      </summary>
      <div class="px-3 pb-3 pt-1 space-y-2">
        <p class="text-xs text-ink/55 dark:text-paper/55">Cole ou digite os exercícios (um por linha). Pode incluir peso/reps depois do nome.</p>
        <textarea id="manual-text" class="q-input w-full text-sm" rows="5"
          placeholder="Supino reto 4x10 60kg&#10;Crucifixo 3x12&#10;Tríceps corda 3x15"></textarea>
        <div id="manual-detected" class="text-xs text-ink/55 dark:text-paper/55 min-h-[1em]"></div>
        <div class="flex gap-2">
          <button id="manual-detect" class="q-btn q-btn-ghost flex-1 text-sm">🔍 Detectar tipo</button>
          <button id="manual-save"   class="q-btn q-btn-primary flex-1 text-sm">💾 Salvar sessão</button>
        </div>
      </div>
    </details>

    <!-- Sugestão de exercícios por descrição -->
    <details class="q-card overflow-hidden" id="suggest-card">
      <summary class="p-3 flex items-center gap-2 cursor-pointer list-none">
        <span class="w-5 h-5 text-lavender">${I.spark}</span>
        <span class="font-bold flex-1">Sugerir exercícios</span>
        <span class="text-xs text-ink/45 dark:text-paper/45">descreva e veja sugestões</span>
      </summary>
      <div class="px-3 pb-3 pt-1 space-y-2">
        <p class="text-xs text-ink/55 dark:text-paper/55">Ex: "peito e tríceps em 30min", "perna leve sem academia", "core no chão".</p>
        <input id="suggest-text" class="q-input w-full text-sm" placeholder="Descreva o que você quer treinar..." />
        <div class="flex flex-wrap gap-1">
          ${['peito leve','perna pesada','cardio 20min','calistenia em casa','core curto',
             'mobilidade quadril','recuperação leve','dança 30min','peito e tríceps','costas e bíceps',
             'pernas e glúteo','antebraço grip','ombro completo','full body sem equipamento','HIIT 15 min'].map(p =>
            `<button class="pill is-pill suggest-preset text-[10px]" data-q="${p}">${p}</button>`
          ).join('')}
        </div>
        <button id="suggest-go" class="q-btn q-btn-primary w-full text-sm">✨ Sugerir</button>
        <div id="suggest-results" class="space-y-1"></div>
      </div>
    </details>

    <!-- Descanso ativo / calistenia -->
    <div class="q-card p-3">
      <div class="flex items-center gap-2">
        <span class="w-5 h-5 text-mint">${I.fighter}</span>
        <h3 class="font-bold flex-1">Descanso ativo de hoje</h3>
        <button id="rest-shuffle" class="text-xs text-lavender">🎲</button>
      </div>
      <p class="text-xs text-ink/55 dark:text-paper/55 mt-0.5">Calistenia leve para dias sem academia — circuito em casa.</p>
      <div id="rest-list" class="mt-2 space-y-1.5">
        ${renderRestPicks(restPicks)}
      </div>
    </div>

    <div class="kombat-divider">SELECIONE SEU ESTILO</div>
    <div class="grid grid-cols-2 gap-2">
      ${types.map(t => `
        <button class="q-card p-3 text-left workout-start relative" data-type="${t}">
          <div class="absolute top-2 right-2 w-5 h-5 text-blood/50">${icons[t] || I.dumb}</div>
          <div class="font-kombat text-[10px] text-blood/70 dark:text-ember/70 tracking-widest uppercase">${(EXERCISE_LIBRARY[t]||[]).length} moves</div>
          <div class="font-bold mt-0.5">${t}</div>
          <div class="text-xs text-ink/50 dark:text-paper/50 mt-0.5 leading-tight">${subtitles[t] || ''}</div>
        </button>`).join('')}
    </div>
  </section>

  <section class="px-4 mt-6">
    <h2 class="font-extrabold text-lg mb-2">Histórico recente</h2>
    <div class="space-y-2">
      ${state.workouts.slice().reverse().slice(0, 8).map(w => `
        <div class="q-card p-3 flex items-center justify-between">
          <div>
            <div class="font-semibold">${w.type}</div>
            <div class="text-xs text-ink/50 dark:text-paper/50">${formatDateBR(w.date)} · ${w.exercises.length} exercícios</div>
          </div>
          <button class="text-xs text-lavender font-semibold workout-view" data-date="${w.date}">ver</button>
        </div>
      `).join('') || `<div class="q-card p-4 text-sm text-ink/55 dark:text-paper/55">Sem treinos ainda.</div>`}
    </div>
  </section>
  `;
}

// --- helpers para o Treino livre / sugestão / descanso ativo -----------

const ACTIVE_REST_POOL = [
  { name: 'Caminhada leve',                 dur: '30–40min', tip: 'ritmo de conversa, fora ou esteira.' },
  { name: 'Mobilidade de quadril',          dur: '10min',    tip: 'cossack squat + 90/90 + lunges com rotação.' },
  { name: 'Yoga flow básico',               dur: '15min',    tip: 'saudação ao sol A + cobra + criança.' },
  { name: 'Alongamento total',              dur: '15min',    tip: 'cada postura 30s, foque no que dói.' },
  { name: 'Prancha estática',               dur: '3×45s',    tip: 'sem prender respiração; corpo reto.' },
  { name: 'Glúteo ponte',                   dur: '3×15',     tip: 'pés afastados; aperte 1s no topo.' },
  { name: 'Flexão de joelhos',              dur: '3×10',     tip: 'descida controlada, 3s.' },
  { name: 'Agachamento livre',              dur: '3×20',     tip: 'pés largura ombros; sem pressa.' },
  { name: 'Afundo alternado',               dur: '3×10/perna', tip: 'joelho da frente alinhado ao pé.' },
  { name: 'Burpee devagar',                 dur: '3×8',      tip: 'sem pulo final; foco em transição.' },
  { name: 'Mountain climber',               dur: '3×30s',    tip: 'quadril estável; passada curta.' },
  { name: 'Bird dog',                       dur: '3×10/lado', tip: 'mão e perna opostas; pausa 2s.' },
  { name: 'Dead bug',                       dur: '3×10/lado', tip: 'lombar colada; respirar pra fora.' },
  { name: 'Superman',                       dur: '3×15',     tip: 'queixo encostado; eleva 2s.' },
  { name: 'Polichinelo',                    dur: '3×40s',    tip: 'aquecimento ou cardio leve.' },
  { name: 'Pular corda imaginária',         dur: '3×60s',    tip: 'panturrilha; pés leves.' },
  { name: 'Escalador alpinista',            dur: '3×30s',    tip: 'velocidade controlada.' },
  { name: 'Abdominal infra (leg raise)',    dur: '3×12',     tip: 'sem balanço; controle na descida.' },
  { name: 'Russian twist sem peso',         dur: '3×20',     tip: 'pés no chão se ainda tá fraco.' },
  { name: 'Wall sit',                       dur: '3×45s',    tip: 'coxa paralela; respiração contínua.' },
];

function pickActiveRest(seedOffset = 0) {
  const seed = +todayISO().replace(/-/g, '') + seedOffset + (state.user?.activeRestRoll || 0);
  const a = [...ACTIVE_REST_POOL];
  const picked = [];
  let s = seed;
  for (let i = 0; i < 4 && a.length; i++) {
    s = (s * 9301 + 49297) % 233280;
    const idx = s % a.length;
    picked.push(a.splice(idx, 1)[0]);
  }
  return picked;
}

function renderRestPicks(picks) {
  return picks.map(p => `
    <div class="flex items-center gap-2 text-sm py-1 border-b border-ink/5 dark:border-paper/5 last:border-0">
      <span class="w-1.5 h-1.5 rounded-full bg-mint shrink-0"></span>
      <span class="font-semibold flex-1">${p.name}</span>
      <span class="text-xs text-ink/55 dark:text-paper/55">${p.dur}</span>
    </div>
    <div class="text-[11px] text-ink/45 dark:text-paper/45 pl-3.5 -mt-1 mb-1 italic">${p.tip}</div>
  `).join('');
}

/** Parser de texto livre para extrair lista de exercícios.
 *  Aceita uma linha por exercício, separadores comuns. */
function parseManualExercises(text) {
  return text.split(/\n+/).map((l) => l.trim()).filter(Boolean).map((line) => {
    // remove sets/reps/peso comuns: "4x10", "3 x 12", "60kg", "60 kg"
    const cleaned = line
      .replace(/\b\d+\s*[xX×]\s*\d+\b/g, '')
      .replace(/\b\d+\s*kg\b/gi, '')
      .replace(/[\-–—]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { name: cleaned, sets: [{ reps: '', weight: '', technique: '' }] };
  }).filter((e) => e.name.length > 1);
}

/** A partir de descrição livre, sugere exercícios da EXERCISE_LIBRARY.
 *  Pondera por grupo muscular, equipamento (calistenia se "casa/sem peso")
 *  e tempo (cardio se "curto/30min"). */
function suggestExercises(query) {
  const q = (query || '').toLowerCase();
  if (!q.trim()) return { groups: [], items: [], summary: 'Descreva o que você quer treinar.' };
  // Detecta grupos-alvo
  const wants = {
    peito:       /\bpeito|peit|chest|supino/.test(q),
    dorsal:      /\bcosta|dorsal|back|pull|remada|barra fixa/.test(q),
    biceps:      /\bbice|bicep|rosca/.test(q),
    triceps:     /\btric|tricep|testa|fran/.test(q),
    ombro:       /\bombro|delt|shoulder|desenvolv/.test(q),
    quad:        /\bperna|quad|leg|agach|squat/.test(q),
    post:        /\bglute|posterior|hamstring|isquio|stiff|terra|deadlift|hip thrust/.test(q),
    core:        /\bcore|abdom|abs|barriga|prancha|plank/.test(q),
    cardio:      /\bcardio|hiit|corrida|aerob|queim|fôleg/.test(q),
    panturrilha: /\bpanturrilha|calf/.test(q),
    antebraço:   /\bantebra|farmer|pulso|grip/.test(q),
  };
  const isCalistenia = /\bcasa|sem peso|sem academia|sem equipamento|calist|bodyweight|peso corporal/.test(q);
  const isShort      = /\b(?:5|10|15|20|25|30)\s?min|curto|r[áa]pido|quick/.test(q);
  const isLong       = /\b(?:45|60|90)\s?min|longo|completo/.test(q);
  const isLight      = /\bleve|fácil|facil|light|recupera|cansa|cansad/.test(q);
  const isHeavy      = /\bpesad|forte|max|heavy|hipertro|massa|forc|força/.test(q);
  const isMobility   = /\bmobilid|alonga|flex|stretch|yoga/.test(q);
  const isDance      = /\bdan[çc]a|coreo|kpop|hip hop|ballet/.test(q);
  const targets = Object.keys(wants).filter((k) => wants[k]);

  // Pool de candidatos: todos os exercícios + alguns "extras" calistênicos para casa
  const all = [];
  for (const [type, exes] of Object.entries(EXERCISE_LIBRARY)) {
    for (const e of exes) all.push({ ...e, _type: type });
  }
  // Suplemento de atividades para casa/mobilidade (não estão na library)
  const HOME_EXTRAS = [
    { name: 'Caminhada 30 min',          muscles: 'cardio, panturrilha', _type: 'Cardio' },
    { name: 'Pular corda 3x60s',         muscles: 'cardio, panturrilha', _type: 'Cardio HIIT' },
    { name: 'Burpees 3x10',              muscles: 'corpo todo, cardio',  _type: 'Calistenia' },
    { name: 'Mountain climber 3x30s',    muscles: 'core, cardio',        _type: 'Calistenia' },
    { name: 'Polichinelo 3x40s',         muscles: 'cardio, panturrilha', _type: 'Cardio HIIT' },
    { name: 'Bird dog 3x10/lado',        muscles: 'core, estabilidade',  _type: 'Mobilidade' },
    { name: 'Dead bug 3x10/lado',        muscles: 'core, oblíquos',      _type: 'Mobilidade' },
    { name: 'Cossack squat 3x8/lado',    muscles: 'quadríceps, mobilidade quadril', _type: 'Mobilidade' },
    { name: '90/90 hip stretch 2 min',   muscles: 'quadril, mobilidade', _type: 'Mobilidade' },
    { name: 'Cat-cow 10 reps',           muscles: 'coluna, mobilidade',  _type: 'Mobilidade' },
    { name: 'Cobra + criança 5 ciclos',  muscles: 'lombar, mobilidade',  _type: 'Yoga' },
    { name: 'Saudação ao sol 5 ciclos',  muscles: 'corpo todo, mobilidade', _type: 'Yoga' },
    { name: 'Wall sit 3x45s',            muscles: 'quadríceps, glúteo',  _type: 'Calistenia' },
    { name: 'Glute bridge 3x15',         muscles: 'glúteo, posterior',   _type: 'Calistenia' },
    { name: 'Superman 3x15',             muscles: 'lombar, glúteo',      _type: 'Calistenia' },
    { name: 'Russian twist 3x20',        muscles: 'core, oblíquos',      _type: 'Calistenia' },
    { name: 'Prancha lateral 2x30s/lado',muscles: 'oblíquos, core',      _type: 'Calistenia' },
    { name: 'Agachamento livre 3x20',    muscles: 'quadríceps, glúteo',  _type: 'Calistenia' },
    { name: 'Afundo passada 3x10/perna', muscles: 'quadríceps, glúteo',  _type: 'Calistenia' },
    { name: 'Flexão de joelhos 3x10',    muscles: 'peito, tríceps',      _type: 'Calistenia' },
    { name: 'Flexão diamante 3x8',       muscles: 'peito, tríceps',      _type: 'Calistenia' },
    { name: 'Pike push-up 3x8',          muscles: 'ombro, tríceps',      _type: 'Calistenia' },
    { name: 'Inverted row na mesa 3x10', muscles: 'dorsal, bíceps',      _type: 'Calistenia' },
    { name: 'Escalador alpinista 3x30s', muscles: 'cardio, core',        _type: 'Cardio HIIT' },
    { name: 'Step-up no banco 3x10/perna', muscles: 'quadríceps, glúteo', _type: 'Calistenia' },
    { name: 'High knees 3x30s',          muscles: 'cardio, quadríceps',  _type: 'Cardio HIIT' },
    { name: 'Box jump (cama/banco) 3x8', muscles: 'cardio, quadríceps',  _type: 'Cardio HIIT' },
    { name: 'Sprint na escada 3x',       muscles: 'cardio, glúteo',      _type: 'Cardio HIIT' },
    { name: 'Pular corda 5 min',         muscles: 'cardio, panturrilha', _type: 'Cardio HIIT' },
    { name: 'Cardio dança K-pop 20 min', muscles: 'cardio, coordenação', _type: 'Dança K-pop' },
    { name: 'Cardio dança hip-hop 20 min', muscles: 'cardio, coordenação', _type: 'Dança' },
  ];
  for (const e of HOME_EXTRAS) all.push(e);

  // Score por compatibilidade
  const scored = all.map((e) => {
    let s = 0;
    const muscles = (e.muscles || '').toLowerCase();
    const name = (e.name || '').toLowerCase();
    if (targets.length === 0) s = 0.4;
    for (const t of targets) {
      const map = { peito:'peito', dorsal:'dorsal|costas', biceps:'bíceps', triceps:'tríceps', ombro:'ombro|delt',
                    quad:'quadr|coxa', post:'glúteo|isquio|posterior', core:'core|abdom|oblí',
                    cardio:'cardio|resist', panturrilha:'panturrilha', antebraço:'antebraço|pulso' };
      if (new RegExp(map[t] || t).test(muscles)) s += 2;
      if (new RegExp(map[t] || t).test(name)) s += 0.8;
    }
    if (isCalistenia && (e._type === 'Calistenia' || /flex[ãa]o|prancha|burpee|jumping|polichinelo|wall|glute bridge|superman|bird|dead bug|pike|squat/i.test(name))) s += 2;
    if (isCalistenia && /smith|máquina|maquina|cabo|leg press|halter pesado/i.test(name)) s -= 2;
    if (isShort  && (e._type === 'Cardio HIIT' || e._type === 'Core/Abs' || e._type === 'Mobilidade')) s += 1;
    if (isLong   && /agachamento|terra|stiff|supino|deadlift/i.test(name)) s += 0.6;
    if (isLight  && (e._type === 'Mobilidade' || e._type === 'Yoga' || /alongamento|caminhada|bird|dead bug|wall|cat-cow|cobra|saudação|stretch/i.test(name))) s += 1.2;
    if (isHeavy  && /agachamento|levantamento|stiff|supino|barra|terra|deadlift|squat livre/i.test(name)) s += 1;
    if (isMobility && (e._type === 'Mobilidade' || e._type === 'Yoga' || /mobilidade|alonga|stretch|yoga/i.test(name + ' ' + muscles))) s += 1.5;
    if (isDance && (e._type === 'Dança K-pop' || e._type === 'Dança' || /dan[çc]a|coreo/i.test(name))) s += 2;
    return { e, s };
  }).filter((x) => x.s > 0);
  scored.sort((a, b) => b.s - a.s);
  // Dedup por nome — limite 12, com diversidade por _type quando possível
  const seen = new Set();
  const items = [];
  const byType = {};
  for (const { e } of scored) {
    if (seen.has(e.name)) continue;
    seen.add(e.name);
    byType[e._type] = (byType[e._type] || 0) + 1;
    if (byType[e._type] > 4 && items.length >= 6) continue; // após 6 itens, evita 5+ do mesmo tipo
    items.push(e);
    if (items.length >= 12) break;
  }
  const grpsLabel = targets.length ? targets.join(' + ') : 'geral';
  const tags = [
    grpsLabel,
    isCalistenia && 'sem equipamento',
    isShort && 'curto',
    isLong && 'longo',
    isLight && 'leve',
    isHeavy && 'pesado',
    isMobility && 'mobilidade',
    isDance && 'dança',
  ].filter(Boolean);
  return { groups: targets, items, summary: tags.join(' · ') };
}

function modalWorkoutSession(type, dateISO = null, prebuiltStart = null) {
  // Se dateISO presente: visualização de sessão antiga.
  // Se prebuiltStart presente: reabre modal mantendo o estado em memória (após
  // adicionar exercício custom).
  const editing = dateISO
    ? state.workouts.find((w) => w.date === dateISO && w.type === type)
    : null;
  const lib = EXERCISE_LIBRARY[type] || [];
  const start = prebuiltStart || editing || {
    date: todayISO(),
    type,
    exercises: lib.map((e) => ({
      name: e.name,
      sets: [{ reps: '', weight: '', technique: '' }, { reps: '', weight: '', technique: '' }, { reps: '', weight: '', technique: '' }],
    })),
  };

  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <div class="font-display text-xs uppercase tracking-widest text-ink/40 dark:text-paper/40">workout</div>
        <h2 class="font-extrabold text-lg">${type} · ${formatDateBR(start.date)}</h2>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>

    <div class="p-4 space-y-4 overflow-y-auto" style="max-height:70vh" id="workout-body">
      <div class="q-card p-3 flex items-center justify-between gap-2">
        <div class="font-semibold text-sm">⏱ Timer de descanso</div>
        <div class="flex gap-1">
          ${[60,90,120,180].map(s => `<button class="rest-btn pill" data-sec="${s}">${s}s</button>`).join('')}
        </div>
      </div>
      <div id="timer-display" class="text-center text-3xl font-extrabold hidden"></div>

      ${start.exercises.map((ex, exIdx) => {
        const lastSessions = lastSessionsFor(ex.name, 5);
        const last = lastSessions[0];
        const lastTopWeight = last ? Math.max(...last.sets.map(s => +s.weight || 0)) : 0;
        const curTopWeight = Math.max(...ex.sets.map(s => +s.weight || 0));
        const progClass = !last ? '' : curTopWeight > lastTopWeight ? 'prog-up' : curTopWeight === lastTopWeight ? 'prog-flat' : 'prog-down';
        const progLabel = !last ? '—' : curTopWeight > lastTopWeight ? `↑ +${(curTopWeight-lastTopWeight).toFixed(1)}` : curTopWeight === lastTopWeight ? '→ igual' : `↓ ${(curTopWeight-lastTopWeight).toFixed(1)}`;
        const targetInfo = lib.find((l) => l.name === ex.name);
        return `
        <div class="q-card p-3" data-ex-idx="${exIdx}">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0 flex-1">
              <div class="font-bold flex items-center gap-2">
                <span>${ex.name}</span>
                ${targetInfo?.ko ? `<span class="font-display text-xs text-ink/45 dark:text-paper/45">${targetInfo.ko}</span>` : ''}
              </div>
              <div class="text-xs text-ink/50 dark:text-paper/50">${targetInfo?.target || ''} ${targetInfo?.muscles ? '· ' + targetInfo.muscles : ''}</div>
            </div>
            ${targetInfo?.technique ? `<button class="ex-info text-lavender w-5 h-5 flex-shrink-0" data-ex-name="${encodeURIComponent(ex.name)}" aria-label="info">${I.info}</button>` : ''}
            <div class="text-xs font-bold ${progClass}">${progLabel}</div>
          </div>
          <div class="q-grid mt-3 font-semibold text-xs text-ink/55 dark:text-paper/55">
            <span>Técnica</span><span>Reps</span><span>kg</span><span></span>
          </div>
          ${ex.sets.map((s, sIdx) => `
            <div class="q-grid mt-1" data-set-idx="${sIdx}">
              <select class="q-input p-1 text-xs set-tech">
                ${['','rest-pause','drop-set','myo-reps','AMRAP'].map(t => `<option ${s.technique===t?'selected':''}>${t}</option>`).join('')}
              </select>
              <input type="number" min="0" max="50" class="q-input p-1 set-reps" value="${s.reps}" />
              <input type="number" step="0.5" min="0" max="500" class="q-input p-1 set-weight" value="${s.weight}" />
              <button class="q-btn q-btn-ghost px-2 py-1 text-xs add-set" data-action="${sIdx===ex.sets.length-1?'add':'rm'}">${sIdx===ex.sets.length-1?'+':'−'}</button>
            </div>`).join('')}
          ${lastSessions.length ? `
            <details class="mt-2 text-xs">
              <summary class="cursor-pointer text-ink/50 dark:text-paper/50">últimas ${lastSessions.length} sessões</summary>
              <div class="mt-1 space-y-1">
                ${lastSessions.map(ls => `
                  <div class="flex justify-between">
                    <span>${formatDateBR(ls.date)}</span>
                    <span>${ls.sets.map(ss => `${ss.reps||0}×${ss.weight||0}`).join(' · ')}</span>
                  </div>`).join('')}
              </div>
            </details>` : ''}
        </div>`;
      }).join('')}

      <button class="q-btn q-btn-ghost w-full py-2" id="add-custom-ex">+ Adicionar exercício</button>
      <button class="q-btn q-btn-primary w-full py-3" id="save-workout">Salvar treino</button>
    </div>
  `);

  // Handler do botão "+ adicionar exercício"
  document.getElementById('add-custom-ex').addEventListener('click', () => {
    const name = prompt('Nome do exercício (ex: "Crucifixo inclinado", "Pulldown unilateral")');
    if (!name || !name.trim()) return;
    // Sincroniza o que foi digitado até agora pra não perder
    syncSetsFromDOM(start);
    start.exercises.push({
      name: name.trim(),
      sets: [
        { reps: '', weight: '', technique: '' },
        { reps: '', weight: '', technique: '' },
        { reps: '', weight: '', technique: '' },
      ],
    });
    closeModal();
    // Reabre o modal com o exercício novo já no estado
    setTimeout(() => modalWorkoutSession(type, dateISO, start), 50);
  });

  // Info popover por exercício --------------------------------------
  document.querySelectorAll('.ex-info').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const name = decodeURIComponent(btn.dataset.exName);
      const ex = Object.values(EXERCISE_LIBRARY).flat().find(x => x.name === name);
      if (!ex) return;
      const pop = document.createElement('div');
      pop.className = 'fixed inset-0 z-50 flex items-end justify-center bg-ink/40 backdrop-blur-sm p-3';
      pop.innerHTML = `
        <div class="max-w-md w-full bg-paper dark:bg-navy rounded-2xl p-4 shadow-pop animate-pop-in">
          <div class="flex items-center justify-between mb-2">
            <div>
              <div class="font-bold">${ex.name}</div>
              ${ex.ko ? `<div class="font-display text-xs text-ink/45 dark:text-paper/45">${ex.ko}</div>` : ''}
            </div>
            <button class="pop-close text-2xl">×</button>
          </div>
          <div class="space-y-2 text-sm">
            <p class="text-ink/75 dark:text-paper/75">${ex.description}</p>
            <div><b class="text-lavender">Técnica:</b> ${ex.technique}</div>
            <div><b class="text-pink">Erros comuns:</b> ${ex.mistakes}</div>
            <div><b class="text-mint">💡 Dica:</b> ${ex.tip}</div>
          </div>
        </div>`;
      document.body.appendChild(pop);
      pop.onclick = (ev) => { if (ev.target === pop || ev.target.classList.contains('pop-close')) pop.remove(); };
    });
  });

  // Timer de descanso ------------------------------------------------
  let timerInt = null;
  document.querySelectorAll('.rest-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sec = +btn.dataset.sec;
      startRestTimer(sec);
    });
  });
  function startRestTimer(sec) {
    if (timerInt) clearInterval(timerInt);
    const disp = document.getElementById('timer-display');
    disp.classList.remove('hidden');
    let left = sec;
    const tick = () => {
      disp.textContent = `${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;
      if (left <= 0) {
        clearInterval(timerInt);
        disp.textContent = '✓ descanso completo';
        vibrate([60,40,80]);
        toast('Descanso completo');
      }
      left--;
    };
    tick();
    timerInt = setInterval(tick, 1000);
  }

  // Add/remove set ---------------------------------------------------
  document.getElementById('workout-body').addEventListener('click', (e) => {
    const t = e.target.closest('.add-set');
    if (!t) return;
    const exIdx = +t.closest('[data-ex-idx]').dataset.exIdx;
    const ex = start.exercises[exIdx];
    if (t.dataset.action === 'add') {
      ex.sets.push({ reps: '', weight: '', technique: '' });
    } else if (ex.sets.length > 1) {
      const setIdx = +t.closest('[data-set-idx]').dataset.setIdx;
      ex.sets.splice(setIdx, 1);
    }
    // re-renderiza apenas o card
    modalWorkoutSession(type, dateISO); // simples: re-abre modal
    syncSetsFromDOM(start);              // já salva o estado atual no objeto
  });

  function syncSetsFromDOM(target) {
    document.querySelectorAll('[data-ex-idx]').forEach((card) => {
      const exIdx = +card.dataset.exIdx;
      target.exercises[exIdx].sets = [...card.querySelectorAll('[data-set-idx]')].map((row) => ({
        technique: row.querySelector('.set-tech').value,
        reps:      row.querySelector('.set-reps').value,
        weight:    row.querySelector('.set-weight').value,
      }));
    });
  }

  document.getElementById('save-workout').addEventListener('click', () => {
    syncSetsFromDOM(start);
    // Remove sets vazios
    start.exercises.forEach((ex) => {
      ex.sets = ex.sets.filter((s) => s.reps || s.weight);
    });
    start.exercises = start.exercises.filter((ex) => ex.sets.length);
    if (!start.exercises.length) { toast('Nada para salvar'); return; }

    // Detecta PR (peso > sessão anterior em algum exercício)
    let prDetected = false;
    for (const ex of start.exercises) {
      const last = lastSessionsFor(ex.name, 1)[0];
      if (!last) continue;
      const curTop = Math.max(...ex.sets.map(s => +s.weight || 0));
      const lastTop = Math.max(...last.sets.map(s => +s.weight || 0));
      if (curTop > lastTop && lastTop > 0) { prDetected = true; break; }
    }

    // Se for "🆓 Treino livre", detecta o split automaticamente
    let detectedMsg = '';
    if (start.type === '🆓 Treino livre' || start.type === 'Outro') {
      const det = detectSplit(start.exercises);
      if (det.type !== 'Outro') {
        start.type = det.type;
        detectedMsg = `Sistema identificou: ${det.type} (${det.reason})`;
      }
    }

    // Substitui sessão do mesmo dia/tipo
    const idx = state.workouts.findIndex((w) => w.date === start.date && w.type === start.type);
    if (idx >= 0) state.workouts[idx] = start;
    else state.workouts.push(start);
    saveState();
    closeModal();
    confetti(700);
    if (prDetected) {
      kombatOverlay('brutality');
      addAttributeXP('forca', 5);
    } else {
      toast(detectedMsg || 'Treino salvo 💪', detectedMsg ? 3600 : 2200);
    }
    render();
  });
}

/** Identifica grupos musculares de um exercício pelo nome.
 *  Procura primeiro na EXERCISE_LIBRARY (campo muscles); cai pra regex
 *  no nome do exercício se não achar. Retorna lista de grupos: peito,
 *  triceps, dorsal, biceps, ombro, quad, post, core, cardio. */
function detectMuscleGroups(exerciseName) {
  const lowerName = (exerciseName || '').toLowerCase();
  // 1) Procura no library
  for (const exes of Object.values(EXERCISE_LIBRARY)) {
    const ex = exes.find((e) => e.name.toLowerCase() === lowerName);
    if (ex) {
      const m = (ex.muscles || '').toLowerCase();
      const g = [];
      if (m.includes('peito') || m.includes('peitoral')) g.push('peito');
      if (m.includes('tríceps') || m.includes('triceps')) g.push('triceps');
      if (m.includes('dorsal') || m.includes('romboides') || m.includes('trapézio')) g.push('dorsal');
      if (m.includes('bíceps') || m.includes('biceps')) g.push('biceps');
      if (m.includes('ombro') || m.includes('deltóide')) g.push('ombro');
      if (m.includes('quad') || m.includes('quadrí')) g.push('quad');
      if (m.includes('glúteo') || m.includes('isquio') || m.includes('posterior')) g.push('post');
      if (m.includes('core') || m.includes('abdom') || m.includes('oblí')) g.push('core');
      if (m.includes('cardio') || m.includes('resistência')) g.push('cardio');
      if (m.includes('panturrilha') || m.includes('gastroc') || m.includes('sóleo')) g.push('panturrilha');
      if (m.includes('antebraço') || m.includes('antebra')) g.push('antebraço');
      return g.length ? g : ['outros'];
    }
  }
  // 2) Inferência por regex no nome
  const g = [];
  if (/supino|crucifixo|peito|fly|press peito/.test(lowerName)) g.push('peito');
  if (/tríceps|triceps|testa|francês|corda|paralelas|dip|mergulho/.test(lowerName)) g.push('triceps');
  if (/remada|pulldown|pull[\- ]up|barra fixa|chin[\- ]up|dorsal/.test(lowerName)) g.push('dorsal');
  if (/rosca|bíceps|biceps|martelo|scott/.test(lowerName)) g.push('biceps');
  if (/desenvolv|elevação|ombro|deltóide|face pull|shrug|encolhimento|arnold/.test(lowerName)) g.push('ombro');
  if (/agach|squat|leg press|extensora|hack|afundo|lunge|pistol/.test(lowerName)) g.push('quad');
  if (/stiff|rdl|hip thrust|deadlift|levantamento terra|flexora|glúteo|posterior|búlgaro/.test(lowerName)) g.push('post');
  if (/abdominal|prancha|plank|crunch|core|leg raise|wheel|woodchopper|russian/.test(lowerName)) g.push('core');
  if (/cardio|sprint|hiit|corrida|bike|burpee|jumping|pular corda/.test(lowerName)) g.push('cardio');
  if (/panturrilha|calf|raise/.test(lowerName)) g.push('panturrilha');
  if (/antebraço|farmer|punho/.test(lowerName)) g.push('antebraço');
  return g.length ? g : ['outros'];
}

/** A partir de um array de exercícios (com name), detecta qual split
 *  é mais provável. Retorna o nome do split + nível de confiança (0-1). */
function detectSplit(exercises) {
  if (!exercises.length) return { type: 'Outro', confidence: 0, reason: 'nada pra analisar' };
  const counts = { peito:0, triceps:0, dorsal:0, biceps:0, ombro:0, quad:0, post:0, core:0, cardio:0, panturrilha:0, antebraço:0 };
  for (const ex of exercises) {
    const groups = detectMuscleGroups(ex.name);
    for (const g of groups) if (counts[g] !== undefined) counts[g]++;
  }
  const has = (k) => (counts[k] || 0) > 0;
  const total = exercises.length;
  let type, confidence = 0.7;
  // Heurísticas, ordem importa (do mais específico ao mais genérico)
  if (has('peito') && has('triceps') && !has('dorsal') && !has('biceps')) {
    type = 'Peito + Tríceps';
  } else if (has('dorsal') && has('biceps') && !has('peito')) {
    type = 'Costas + Bíceps';
  } else if (has('biceps') && has('triceps') && !has('peito') && !has('dorsal')) {
    type = 'Braços (bíceps + tríceps)';
  } else if (has('peito') && has('ombro') && has('triceps')) {
    type = 'Push';
  } else if (has('dorsal') && has('biceps')) {
    type = 'Pull';
  } else if (has('ombro') && counts.ombro >= 2 && !has('peito') && !has('dorsal')) {
    type = 'Ombros';
  } else if (has('quad') && counts.post === 0) {
    type = 'Pernas (quadríceps)';
  } else if (has('post') && !has('quad')) {
    type = 'Pernas (posterior + glúteo)';
  } else if (has('peito') && has('dorsal')) {
    type = 'Upper A';
  } else if (has('quad') && has('post')) {
    type = 'Lower A';
  } else if (has('core') && total === counts.core) {
    type = 'Core/Abs';
  } else if (has('cardio') && total === counts.cardio) {
    type = 'Cardio HIIT';
  } else if (has('peito')) {
    type = 'Push'; confidence = 0.5;
  } else if (has('dorsal')) {
    type = 'Pull'; confidence = 0.5;
  } else if (has('quad') || has('post')) {
    type = 'Lower A'; confidence = 0.5;
  } else {
    type = 'Outro'; confidence = 0.3;
  }
  // Lista dos grupos mais frequentes pra mostrar pro usuário
  const top = Object.entries(counts)
    .filter(([, c]) => c > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([k]) => k);
  return { type, confidence, reason: `Detectou: ${top.join(' + ')}` };
}

function lastSessionsFor(exName, n) {
  return state.workouts
    .slice()
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((w) => ({ date: w.date, type: w.type, sets: (w.exercises.find((e) => e.name === exName) || { sets: [] }).sets }))
    .filter((x) => x.sets.length)
    .slice(0, n);
}

// ----- 6.3b Nutrition view (식단) --------------------------

function viewNutrition() {
  const today = todayISO();
  let log = state.dailyLogs.find((l) => l.date === today);
  if (!log) {
    log = {
      date: today,
      training: { type: 'descanso', done: false },
      protein: { grams: 0, hit: false },
      sleep: { hours: 0 }, reading: { minutes: 0 },
      steps: 0, buffs: [], notes: '', meals: [], xp: 0,
    };
    state.dailyLogs.push(log);
    saveState();
  }
  if (!log.meals) log.meals = [];
  const totals = log.meals.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal, p: a.p + m.p, c: a.c + m.c, f: a.f + m.f,
    }),
    { kcal: 0, p: 0, c: 0, f: 0 }
  );
  const kcalGoal = state.user.kcalGoal || 2200;
  const pGoal    = state.user.proteinGoal || META.protein;
  const kcalPct  = Math.min(100, (totals.kcal / kcalGoal) * 100);
  const pPct     = Math.min(100, (totals.p / pGoal) * 100);

  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="kombat-tagline text-xs">${getTheme(state).tags.nutri}</div>
    <h1 class="text-2xl font-extrabold mt-1">Nutrição</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55">Toque em um alimento pra adicionar.</p>
  </header>

  <section class="px-4 mb-4">
    <div class="q-card p-4">
      <div class="grid grid-cols-2 gap-4">
        <div>
          <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Calorias</div>
          <div class="text-2xl font-extrabold">${Math.round(totals.kcal)} <span class="text-sm">/ ${kcalGoal}</span></div>
          <div class="xp-track mt-1"><div class="xp-fill" style="width:${kcalPct}%"></div></div>
        </div>
        <div>
          <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Proteína</div>
          <div class="text-2xl font-extrabold ${totals.p>=pGoal?'text-mint':''}">${Math.round(totals.p)}g <span class="text-sm">/ ${pGoal}g</span></div>
          <div class="xp-track mt-1"><div class="xp-fill" style="width:${pPct}%"></div></div>
        </div>
      </div>
      <div class="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
        <div class="pill is-sun">P ${Math.round(totals.p)}g</div>
        <div class="pill">C ${Math.round(totals.c)}g</div>
        <div class="pill is-pink">G ${Math.round(totals.f)}g</div>
      </div>
    </div>
  </section>

  <section class="px-4 mb-3">
    <input id="food-search" class="q-input" placeholder="🔍 Buscar (ex: pizza, frango, kimchi, hambúrguer, whey)" />
    <div class="flex gap-1.5 mt-2 overflow-x-auto pb-1" id="food-filters">
      ${[
        ['all',      '🍽 Tudo'],
        ['proteina', '🥩 Proteína'],
        ['carb',     '🍚 Carbo'],
        ['veg',      '🥦 Vegetal'],
        ['fruta',    '🍎 Fruta'],
        ['gordura',  '🥑 Gordura'],
        ['prato',    '🍱 Pratos'],
        ['bebida',   '🥤 Bebidas'],
        ['erro',     '🍕 Erros permitidos'],
        ['doce',     '🍫 Doces'],
        ['snack',    '🍿 Snacks'],
        ['supl',     '💊 Suplementos'],
      ].map(([k, l]) => `<button class="pill food-cat-btn ${k==='all'?'is-kombat':''} whitespace-nowrap text-xs" data-cat="${k}">${l}</button>`).join('')}
    </div>
  </section>

  <section class="px-4 mb-4" id="food-results">
    ${renderFoodList(FOOD_DB.slice(0, 14))}
  </section>

  <section class="px-4 mb-4">
    <h2 class="font-extrabold mb-2">Refeições de hoje</h2>
    <div class="q-card divide-y divide-ink/5 dark:divide-paper/5">
      ${log.meals.length ? log.meals.slice().reverse().map((m, idx) => `
        <div class="p-3 flex items-center gap-3 text-sm">
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">${m.name}</div>
            <div class="text-xs text-ink/50 dark:text-paper/50">${m.grams}g · ${Math.round(m.kcal)} kcal · P ${m.p.toFixed(1)}g · C ${m.c.toFixed(1)}g · G ${m.f.toFixed(1)}g</div>
          </div>
          <button class="meal-rm text-pink font-bold" data-idx="${log.meals.length - 1 - idx}">×</button>
        </div>`).join('') : `<div class="p-4 text-sm text-ink/55 dark:text-paper/55">Nada registrado ainda. Adicione abaixo.</div>`}
    </div>
  </section>
  `;
}

function renderFoodList(foods) {
  if (!foods.length) return `<div class="q-card p-4 text-sm text-ink/55 dark:text-paper/55">Nenhum alimento encontrado.</div>`;
  return `<div class="q-card divide-y divide-ink/5 dark:divide-paper/5">
    ${foods.map((f, i) => `
      <button class="food-row w-full p-3 flex items-center gap-3 text-left" data-name="${encodeURIComponent(f.name)}">
        <div class="flex-1 min-w-0">
          <div class="font-semibold flex items-center gap-2">
            <span class="truncate">${f.name}</span>
            ${f.ko ? `<span class="font-display text-xs text-ink/40 dark:text-paper/40">${f.ko}</span>` : ''}
          </div>
          <div class="text-xs text-ink/50 dark:text-paper/50">
            ${f.kcal}kcal · P${f.p}g · C${f.c}g · G${f.f}g <span class="opacity-50">/100g</span>
          </div>
        </div>
        <span class="pill ${categoryColor(f.cat)}">${categoryLabel(f.cat)}</span>
      </button>
    `).join('')}
  </div>`;
}
function categoryColor(c) {
  return c === 'proteina' ? 'is-pink'
       : c === 'carb'     ? 'is-sun'
       : c === 'veg'      ? 'is-mint'
       : c === 'fruta'    ? 'is-mint'
       : c === 'gordura'  ? 'is-sun'
       : c === 'prato'    ? 'is-mint'
       : c === 'bebida'   ? ''
       : c === 'erro'     ? 'is-kombat'   // junk food → vermelho/dourado MK (Kano-style)
       : c === 'doce'     ? 'is-pink'
       : c === 'snack'    ? 'is-sun'
       : c === 'supl'     ? ''
       : 'is-mint';
}
function categoryLabel(c) {
  return ({
    proteina: 'proteína', carb: 'carbo', veg: 'vegetal', fruta: 'fruta',
    gordura: 'gordura', prato: 'prato', bebida: 'bebida',
    erro: '⚠ erro permitido', doce: 'doce', snack: 'snack', supl: 'suplemento',
  })[c] || c;
}

function modalFoodPortion(foodName) {
  const f = FOOD_DB.find((x) => x.name === foodName);
  if (!f) return;
  // Sugestões de porções comuns
  const presets = f.cat === 'prato' ? [100, 250, 500] : [50, 100, 150, 200];
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <h2 class="font-extrabold text-lg">${f.name}</h2>
        ${f.ko ? `<div class="font-display text-xs text-ink/45 dark:text-paper/45">${f.ko}</div>` : ''}
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-4">
      <div class="text-xs text-ink/55 dark:text-paper/55">Por 100g: ${f.kcal}kcal · P${f.p}g · C${f.c}g · G${f.f}g</div>

      <div>
        <label class="block text-sm font-semibold mb-1">Quantidade (g)</label>
        <input id="portion-input" class="q-input text-lg" type="number" min="1" max="2000" value="100" />
        <div class="flex gap-2 mt-2 flex-wrap">
          ${presets.map(p => `<button class="pill preset-btn" data-g="${p}">${p}g</button>`).join('')}
        </div>
      </div>

      <div id="portion-summary" class="q-card p-3 text-center">
        <div class="text-3xl font-extrabold" id="ps-kcal">${f.kcal} kcal</div>
        <div class="text-sm text-ink/55 dark:text-paper/55 mt-1">
          P <b id="ps-p">${f.p}</b>g · C <b id="ps-c">${f.c}</b>g · G <b id="ps-f">${f.f}</b>g
        </div>
      </div>

      <button id="add-meal" class="q-btn q-btn-primary w-full py-3">Adicionar refeição</button>
    </div>
  `);

  const input = document.getElementById('portion-input');
  const update = () => {
    const g = +input.value || 0;
    document.getElementById('ps-kcal').textContent = `${Math.round(f.kcal * g / 100)} kcal`;
    document.getElementById('ps-p').textContent = (f.p * g / 100).toFixed(1);
    document.getElementById('ps-c').textContent = (f.c * g / 100).toFixed(1);
    document.getElementById('ps-f').textContent = (f.f * g / 100).toFixed(1);
  };
  input.addEventListener('input', update);
  document.querySelectorAll('.preset-btn').forEach(b => b.onclick = () => {
    input.value = b.dataset.g; update();
  });

  document.getElementById('add-meal').onclick = () => {
    const g = +input.value || 0;
    if (g <= 0) { toast('Quantidade inválida'); return; }
    const log = state.dailyLogs.find((l) => l.date === todayISO());
    if (!log.meals) log.meals = [];
    log.meals.push({
      name: f.name, ko: f.ko || '', grams: g, cat: f.cat,
      kcal: f.kcal * g / 100, p: f.p * g / 100, c: f.c * g / 100, f: f.f * g / 100,
    });
    // Sincroniza proteína total no log
    const totalP = log.meals.reduce((a, m) => a + m.p, 0);
    const oldHit = log.protein?.hit;
    log.protein = { grams: Math.round(totalP), hit: totalP >= META.protein };
    log.xp = computeDayXP(log);
    // Se bateu meta pela primeira vez, ganha XP/disciplina
    if (!oldHit && log.protein.hit) {
      addAttributeXP('disciplina', 3);
      confetti(1000);
      toast(`🥩 Meta de proteína batida! +bônus`);
    }
    saveState();
    checkAchievements();
    closeModal();
    toast(`+ ${f.name} adicionado`);
    vibrate(10);
    render();
  };
}

// ----- 6.4 Body view ---------------------------------------

function viewBody() {
  const ms = state.bodyMeasurements.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const last = ms[ms.length - 1];
  const first = ms[0];
  const weights = ms.map((m) => m.weight);
  const avg7 = weights.length >= 2 ? (weights.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, weights.length)).toFixed(1) : '—';

  // Helper: extrai série temporal de uma métrica
  function seriesFor(key) {
    return ms.filter((m) => m[key] && m[key] > 0).map((m) => ({ date: m.date, val: m[key] }));
  }

  // Variação entre primeira e última medida
  function deltaFor(key) {
    const series = seriesFor(key);
    if (series.length < 2) return null;
    const initial = series[0].val;
    const current = series[series.length - 1].val;
    const diff = current - initial;
    const pct = (diff / initial) * 100;
    return { initial, current, diff, pct };
  }

  // Gera SVG path para gráfico de linha mini
  function linePath(values, w, h, padY = 6) {
    if (values.length < 2) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const step = w / (values.length - 1);
    return values.map((v, i) => {
      const x = i * step;
      const y = h - padY - ((v - min) / range) * (h - padY * 2);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    }).join(' ');
  }

  function trendCard(key, label, unit, color) {
    const series = seriesFor(key);
    if (!series.length) return null;
    const values = series.map((s) => s.val);
    const delta = deltaFor(key);
    const path = linePath(values, 100, 30);
    return `
      <div class="q-card p-3">
        <div class="flex items-center justify-between">
          <div class="text-[10px] uppercase tracking-wider text-ink/55 dark:text-paper/55">${label}</div>
          ${delta ? `<div class="text-[10px] font-bold ${delta.diff >= 0 ? 'text-mint' : 'text-pink'}">${delta.diff >= 0 ? '+' : ''}${delta.diff.toFixed(1)}${unit}</div>` : ''}
        </div>
        <div class="flex items-end justify-between mt-1">
          <div class="text-xl font-extrabold" style="color:${color}">${values[values.length-1]}<span class="text-xs font-bold">${unit}</span></div>
          ${delta ? `<div class="text-[9px] text-ink/45 dark:text-paper/45 mb-1">${delta.pct >= 0 ? '+' : ''}${delta.pct.toFixed(1)}%</div>` : ''}
        </div>
        ${path ? `
          <svg viewBox="0 0 100 30" preserveAspectRatio="none" class="w-full mt-1" style="height:30px">
            <path d="${path}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>` : ''}
      </div>`;
  }

  const trendCards = [
    trendCard('weight', 'Peso',        'kg', '#B7B5FF'),
    trendCard('waist',  'Cintura',     'cm', '#FF85A5'),
    trendCard('chest',  'Peito',       'cm', '#7BB8FF'),
    trendCard('arm',    'Braço',       'cm', '#A8E6CF'),
    trendCard('hip',    'Quadril',     'cm', '#FFD8A8'),
    trendCard('thigh',  'Coxa',        'cm', '#E84A1A'),
    trendCard('calf',   'Panturrilha', 'cm', '#D6A93E'),
    trendCard('neck',   'Pescoço',     'cm', '#9BD9D6'),
    trendCard('bf',     '% gordura',   '%',  '#B8242E'),
  ].filter(Boolean);

  // Dashboard stats agregadas
  const totalMeasures = ms.length;
  const daysTracked = first ? Math.max(1, Math.ceil((new Date(last.date) - new Date(first.date)) / 86400000)) : 0;
  const weightDelta = deltaFor('weight');
  const waistDelta = deltaFor('waist');


  // Calcula próxima medida quinzenal (14 dias após a última)
  let nextDueLabel = 'Registre a primeira medida';
  let dueClass = 'is-mint';
  if (last) {
    const lastDate = new Date(last.date + 'T00:00:00');
    const next = new Date(lastDate); next.setDate(next.getDate() + 14);
    const daysLeft = Math.ceil((next - new Date()) / 86400000);
    if (daysLeft > 0) {
      nextDueLabel = `Próxima medida em ${daysLeft} dia${daysLeft === 1 ? '' : 's'}`;
      dueClass = daysLeft <= 3 ? 'is-sun' : 'is-mint';
    } else if (daysLeft === 0) {
      nextDueLabel = 'Próxima medida hoje';
      dueClass = 'is-sun';
    } else {
      nextDueLabel = `Atrasou ${Math.abs(daysLeft)} dia${Math.abs(daysLeft) === 1 ? '' : 's'} — registra agora`;
      dueClass = 'is-pink';
    }
  }

  // Última medida — mostrar todos os campos preenchidos
  const fieldsLast = last ? [
    last.weight && ['Peso', last.weight + 'kg'],
    last.waist  && ['Cintura', last.waist + 'cm'],
    last.chest  && ['Peito',   last.chest + 'cm'],
    last.arm    && ['Braço',   last.arm + 'cm'],
    last.hip    && ['Quadril', last.hip + 'cm'],
    last.thigh  && ['Coxa',    last.thigh + 'cm'],
    last.calf   && ['Panturrilha', last.calf + 'cm'],
    last.neck   && ['Pescoço', last.neck + 'cm'],
    last.bf     && ['% gordura', last.bf + '%'],
  ].filter(Boolean) : [];

  return `
  <header class="pt-7 pb-3 px-5">
    <h1 class="text-2xl font-extrabold">Corpo</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55">Peso, medidas quinzenais e fotos progresso.</p>
  </header>

  <section class="px-4">
    <div class="q-card p-4">
      <div class="flex items-baseline justify-between">
        <div>
          <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Peso atual</div>
          <div class="text-3xl font-extrabold">${last?.weight ?? '—'} <span class="text-base font-bold">kg</span></div>
        </div>
        <div class="text-right">
          <div class="text-xs text-ink/45 dark:text-paper/45">média 7d</div>
          <div class="text-lg font-bold">${avg7} kg</div>
        </div>
      </div>
      <svg class="spark mt-3" viewBox="0 0 300 60" preserveAspectRatio="none">
        ${sparkline(weights, 300, 60)}
      </svg>
      <div class="flex items-center justify-between mt-3 gap-2">
        <span class="pill ${dueClass} text-[10px]">📅 ${nextDueLabel}</span>
        <button class="q-btn q-btn-primary text-sm" id="add-weight">+ registrar medidas</button>
      </div>
    </div>
  </section>

  ${totalMeasures >= 1 ? `
  <!-- Dashboard agregado -->
  <section class="px-4 mt-3">
    <div class="grid grid-cols-3 gap-2">
      <div class="q-card p-3">
        <div class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">Medidas</div>
        <div class="text-2xl font-extrabold text-lavender">${totalMeasures}</div>
        <div class="text-[10px] text-ink/45 dark:text-paper/45">registros</div>
      </div>
      <div class="q-card p-3">
        <div class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">Acompanhando</div>
        <div class="text-2xl font-extrabold text-mint">${daysTracked}</div>
        <div class="text-[10px] text-ink/45 dark:text-paper/45">dias</div>
      </div>
      <div class="q-card p-3">
        <div class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">Δ Peso total</div>
        <div class="text-2xl font-extrabold ${(weightDelta?.diff || 0) >= 0 ? 'text-mint' : 'text-pink'}">${weightDelta ? (weightDelta.diff >= 0 ? '+' : '') + weightDelta.diff.toFixed(1) : '—'}</div>
        <div class="text-[10px] text-ink/45 dark:text-paper/45">kg</div>
      </div>
    </div>
  </section>` : ''}

  ${trendCards.length ? `
  <!-- Tendências por medida -->
  <section class="px-4 mt-3">
    <div class="flex items-center justify-between mb-2">
      <h2 class="font-extrabold">Tendências</h2>
      <span class="text-[10px] text-ink/45 dark:text-paper/45">comparado à 1ª medida</span>
    </div>
    <div class="grid grid-cols-2 gap-2">
      ${trendCards.join('')}
    </div>
  </section>` : ''}

  ${ms.length >= 2 ? `
  <!-- Insights automáticos -->
  <section class="px-4 mt-3">
    <div class="q-card p-3" style="border-left:3px solid ${(weightDelta?.diff || 0) >= 0 ? '#A8E6CF' : '#FFB7C5'}">
      <div class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">💡 Insight</div>
      <div class="text-sm mt-1 leading-snug">
        ${(() => {
          const insights = [];
          if (weightDelta) {
            const verb = weightDelta.diff > 0 ? 'ganhou' : 'perdeu';
            insights.push(`Em ${daysTracked} dias você ${verb} <b>${Math.abs(weightDelta.diff).toFixed(1)}kg</b> (${weightDelta.pct >= 0 ? '+' : ''}${weightDelta.pct.toFixed(1)}%).`);
          }
          if (waistDelta && waistDelta.diff < -1) {
            insights.push(`Cintura reduziu <b style="color:#A8E6CF">${Math.abs(waistDelta.diff).toFixed(1)}cm</b> — composição corporal melhorando.`);
          } else if (waistDelta && waistDelta.diff > 1) {
            insights.push(`Cintura aumentou ${waistDelta.diff.toFixed(1)}cm — fique de olho na ingestão calórica.`);
          }
          const armDelta = deltaFor('arm');
          if (armDelta && armDelta.diff > 0.5) {
            insights.push(`Braço cresceu <b style="color:#A8E6CF">+${armDelta.diff.toFixed(1)}cm</b> — hipertrofia rolando.`);
          }
          if (insights.length === 0) insights.push('Continue registrando — em 2-3 medidas dá pra ver tendência clara.');
          return insights.join('<br>');
        })()}
      </div>
    </div>
  </section>` : ''}

  ${fieldsLast.length ? `
  <section class="px-4 mt-3">
    <div class="q-card p-3">
      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45 mb-2">
        Última medida · ${formatDateBR(last.date)}
      </div>
      <div class="grid grid-cols-3 gap-2 text-sm">
        ${fieldsLast.map(([k, v]) => `
          <div class="text-center">
            <div class="text-[10px] text-ink/55 dark:text-paper/55">${k}</div>
            <div class="font-bold">${v}</div>
          </div>
        `).join('')}
      </div>
      ${last.notes ? `<div class="mt-2 pt-2 border-t border-ink/5 dark:border-paper/5 text-xs italic text-ink/55 dark:text-paper/55">"${last.notes}"</div>` : ''}
    </div>
  </section>` : ''}

  <section class="px-4 mt-4">
    <h2 class="font-extrabold mb-2">Histórico quinzenal</h2>
    <div class="q-card divide-y divide-ink/5 dark:divide-paper/5">
      ${ms.slice().reverse().slice(0, 12).map(m => `
        <div class="p-3 text-sm">
          <div class="flex items-center justify-between">
            <span class="font-semibold">${formatDateBR(m.date)}</span>
            <span class="text-ink/65 dark:text-paper/65 text-xs">
              ${m.weight ? m.weight + 'kg' : ''}${m.waist ? ' · ' + m.waist + 'cm cintura' : ''}${m.hip ? ' · ' + m.hip + 'cm quadril' : ''}
            </span>
          </div>
          ${(m.chest || m.arm || m.thigh || m.calf || m.neck || m.bf) ? `
            <div class="mt-1 text-[11px] text-ink/55 dark:text-paper/55">
              ${[
                m.chest && 'peito ' + m.chest + 'cm',
                m.arm   && 'braço ' + m.arm + 'cm',
                m.thigh && 'coxa ' + m.thigh + 'cm',
                m.calf  && 'panturrilha ' + m.calf + 'cm',
                m.neck  && 'pescoço ' + m.neck + 'cm',
                m.bf    && m.bf + '% gordura',
              ].filter(Boolean).join(' · ')}
            </div>` : ''}
          ${m.notes ? `<div class="mt-1 text-[11px] italic text-ink/50 dark:text-paper/50">"${m.notes}"</div>` : ''}
        </div>`).join('') || `<div class="p-4 text-sm text-ink/50">Sem registros — toque em "+ registrar medidas".</div>`}
    </div>
    ${ms.length > 0 ? `<p class="text-[10px] text-ink/45 dark:text-paper/45 mt-2 italic">Recomendado: tirar medidas a cada 2 semanas, sempre no mesmo horário do dia (manhã em jejum).</p>` : ''}
  </section>

  <section class="px-4 mt-5">
    <div class="flex items-center justify-between mb-2">
      <h2 class="font-extrabold">Fotos progresso</h2>
      <label class="q-btn q-btn-ghost cursor-pointer text-xs">
        <span class="w-4 h-4">${I.camera}</span> Nova
        <input type="file" id="photo-input" accept="image/*" capture="environment" class="hidden" />
      </label>
    </div>
    <div class="grid grid-cols-3 gap-2">
      ${state.photos.slice().reverse().slice(0, 9).map(p => `
        <div class="aspect-[3/4] q-card overflow-hidden" data-photo="${p.date}-${p.type}">
          <img src="${p.dataUrl}" class="w-full h-full object-cover" loading="lazy" />
        </div>`).join('') ||
        `<div class="col-span-3 q-card p-4 text-sm text-ink/50">Sem fotos ainda. Tire uma frontal e uma lateral.</div>`}
    </div>
    ${state.photos.length >= 2 ? `<button class="q-btn q-btn-ghost w-full mt-3" id="compare-photos">comparar lado-a-lado</button>` : ''}
  </section>
  `;
}

function sparkline(values, w, h) {
  if (values.length < 2) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const step = w / (values.length - 1);
  const pts = values.map((v, i) => `${i * step},${h - ((v - min) / range) * h * 0.85 - 5}`).join(' ');
  return `
    <polyline points="${pts}" fill="none" stroke="#B7B5FF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <polyline points="${pts}" fill="none" stroke="#FFB7C5" stroke-width="0" />
  `;
}

function modalWeightEntry() {
  const last = state.bodyMeasurements[state.bodyMeasurements.length - 1] || {};
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <h2 class="font-extrabold text-lg">Medidas quinzenais</h2>
        <p class="text-xs text-ink/55 dark:text-paper/55">Tire de manhã, em jejum, sempre no mesmo horário.</p>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <form id="weight-form" class="p-4 space-y-3 overflow-y-auto" style="max-height:75vh">
      <label class="block">
        <span class="text-sm font-semibold">Peso (kg)</span>
        <input class="q-input mt-1" type="number" step="0.1" name="weight" required value="${last.weight||''}" placeholder="ex: 78.5" />
      </label>

      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45 pt-1">Tronco · cm</div>
      <div class="grid grid-cols-3 gap-2">
        <label><span class="text-xs font-semibold">Cintura</span>
          <input class="q-input mt-1" type="number" step="0.1" name="waist" value="${last.waist||''}" />
        </label>
        <label><span class="text-xs font-semibold">Peito</span>
          <input class="q-input mt-1" type="number" step="0.1" name="chest" value="${last.chest||''}" />
        </label>
        <label><span class="text-xs font-semibold">Quadril</span>
          <input class="q-input mt-1" type="number" step="0.1" name="hip" value="${last.hip||''}" />
        </label>
      </div>

      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45 pt-1">Membros · cm</div>
      <div class="grid grid-cols-4 gap-2">
        <label><span class="text-xs font-semibold">Braço</span>
          <input class="q-input mt-1" type="number" step="0.1" name="arm" value="${last.arm||''}" />
        </label>
        <label><span class="text-xs font-semibold">Coxa</span>
          <input class="q-input mt-1" type="number" step="0.1" name="thigh" value="${last.thigh||''}" />
        </label>
        <label><span class="text-xs font-semibold">Pant.</span>
          <input class="q-input mt-1" type="number" step="0.1" name="calf" value="${last.calf||''}" />
        </label>
        <label><span class="text-xs font-semibold">Pesc.</span>
          <input class="q-input mt-1" type="number" step="0.1" name="neck" value="${last.neck||''}" />
        </label>
      </div>

      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45 pt-1">Opcional</div>
      <label class="block">
        <span class="text-xs font-semibold">% gordura corporal (se medir com bioimpedância/dobras)</span>
        <input class="q-input mt-1" type="number" step="0.1" name="bf" value="${last.bf||''}" placeholder="ex: 16.5" />
      </label>
      <label class="block">
        <span class="text-xs font-semibold">Notas (como tá se sentindo, observações)</span>
        <textarea class="q-input mt-1" name="notes" rows="2" placeholder="ex: cintura mais firme, sono melhorou na semana">${last.notes||''}</textarea>
      </label>

      <button type="submit" class="q-btn q-btn-primary w-full mt-2">Salvar medidas</button>
    </form>
  `);
  document.getElementById('weight-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    state.bodyMeasurements.push({
      date: todayISO(),
      weight: +f.weight.value || 0,
      waist:  +f.waist.value  || 0,
      chest:  +f.chest.value  || 0,
      arm:    +f.arm.value    || 0,
      hip:    +f.hip.value    || 0,
      thigh:  +f.thigh.value  || 0,
      calf:   +f.calf.value   || 0,
      neck:   +f.neck.value   || 0,
      bf:     +f.bf.value     || 0,
      notes:  (f.notes.value || '').trim(),
    });
    saveState();
    closeModal();
    toast('Medidas registradas');
    render();
  });
}

// ----- 6.5 Insights view -----------------------------------
// Rework limpo, sem fotos motivacionais: dados próprios do usuário.

function viewInsights() {
  const today = new Date(todayISO() + 'T00:00:00');
  const logs = state.dailyLogs.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const byDate = new Map(logs.map((l) => [l.date, l]));

  // ===== Heatmap dos últimos 35 dias (5 semanas × 7 dias) =====
  const HEAT_DAYS = 35;
  const heatCells = [];
  for (let i = HEAT_DAYS - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const iso = isoDate(d);
    const log = byDate.get(iso);
    const xp = log?.xp || 0;
    const lvl = xp === 0 ? 0 : xp <= 2 ? 1 : xp <= 4 ? 2 : xp <= 6 ? 3 : 4;
    heatCells.push({ iso, day: d.getDate(), xp, lvl });
  }

  // ===== Stats agregados (últimos 30 dias) =====
  const last30 = logs.slice(-30);
  const totalDays    = last30.length;
  const totalActive  = last30.filter((l) => (l.xp || 0) > 0).length;
  const totalTrain   = last30.filter((l) => l.training?.done).length;
  const totalSleep   = last30.filter((l) => (l.sleep?.hours || 0) >= 7).length;
  const totalProtein = last30.filter((l) => l.protein?.hit).length;
  const avgXP        = last30.length ? (last30.reduce((s, l) => s + (l.xp || 0), 0) / last30.length).toFixed(1) : '0';
  const maxStreak    = getMaxLogStreak(state);

  // ===== Distribuição XP por dia da semana =====
  const dowLabels = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB'];
  const dowSum = [0,0,0,0,0,0,0], dowN = [0,0,0,0,0,0,0];
  for (const l of last30) {
    const d = new Date(l.date + 'T00:00:00').getDay();
    dowSum[d] += (l.xp || 0);
    dowN[d]++;
  }
  const dowAvg = dowSum.map((s, i) => (dowN[i] ? s / dowN[i] : 0));
  const dowMax = Math.max(...dowAvg, 1);
  const bestDow = dowAvg.indexOf(Math.max(...dowAvg));
  const worstDow = dowAvg
    .map((v, i) => ({ v, i }))
    .filter((x) => dowN[x.i] > 0)
    .sort((a, b) => a.v - b.v)[0]?.i ?? 0;

  // ===== Personal record destacado =====
  const allSets = [];
  for (const w of state.workouts) {
    for (const ex of w.exercises) {
      for (const s of ex.sets) {
        const wt = +s.weight || 0;
        if (wt > 0) allSets.push({ name: ex.name, weight: wt, reps: s.reps, date: w.date });
      }
    }
  }
  const prByName = {};
  for (const r of allSets) {
    if (!prByName[r.name] || r.weight > prByName[r.name].weight) prByName[r.name] = r;
  }
  const topPRs = Object.values(prByName).sort((a, b) => b.weight - a.weight).slice(0, 3);

  // ===== Próximo passo (1 ação concreta) =====
  const last7 = logs.slice(-7);
  const next = nextStepRec(last7);

  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="kombat-tagline text-xs">${getTheme(state).tags.insights}</div>
    <h1 class="text-2xl font-extrabold mt-1">Insights</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55">${totalDays === 0 ? 'Registre seu primeiro dia para destravar.' : `${totalDays} ${totalDays === 1 ? 'dia acompanhado' : 'dias acompanhados'} · média ${avgXP} XP/dia`}</p>
  </header>

  <section class="px-4 space-y-3">

    <!-- Próximo passo (call to action única) -->
    <div class="q-card p-4 border-l-4" style="border-color:${next.color}">
      <div class="text-[10px] uppercase tracking-widest" style="color:${next.color}">PRÓXIMO PASSO</div>
      <div class="font-extrabold text-base mt-0.5">${next.title}</div>
      <div class="text-xs text-ink/60 dark:text-paper/60 mt-0.5">${next.tip}</div>
    </div>

    <!-- Heatmap 35 dias -->
    <div class="q-card p-4">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Atividade · 35 dias</div>
        <div class="flex items-center gap-1 text-[9px] text-ink/45 dark:text-paper/45">
          menos
          ${[0,1,2,3,4].map((l) => `<span class="heat-cell heat-l${l}" style="width:8px;height:8px"></span>`).join('')}
          mais
        </div>
      </div>
      <div class="heat-grid">
        ${heatCells.map((c) => `
          <div class="heat-cell heat-l${c.lvl}" title="${c.iso} · ${c.xp} XP"></div>
        `).join('')}
      </div>
    </div>

    <!-- Stats em 4 quadros -->
    <div class="grid grid-cols-2 gap-2">
      ${miniStat('Treinos', totalTrain, '30d', '#B8242E')}
      ${miniStat('Streak', maxStreak, 'dias', '#E84A1A')}
      ${miniStat('Sono ≥7h', totalSleep, '30d', '#7BB8FF')}
      ${miniStat('Proteína ✓', totalProtein, '30d', '#3FBF7F')}
    </div>

    <!-- Distribuição por dia da semana -->
    <div class="q-card p-4">
      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">XP médio · dia da semana</div>
      <div class="dow-chart mt-3">
        ${dowAvg.map((v, i) => {
          const h = Math.max(6, Math.round((v / dowMax) * 56));
          const isBest = i === bestDow && v > 0;
          const isWorst = i === worstDow && dowN[i] > 0 && i !== bestDow;
          return `
          <div class="dow-col">
            <div class="dow-bar" style="height:${h}px; background:${isBest ? '#3FBF7F' : isWorst ? '#B8242E55' : 'var(--lavender)'}"></div>
            <div class="dow-label">${dowLabels[i]}</div>
            <div class="dow-val">${v.toFixed(1)}</div>
          </div>`;
        }).join('')}
      </div>
      ${(dowAvg[bestDow] > 0) ? `
        <div class="text-xs text-ink/60 dark:text-paper/60 mt-3">
          Você rende mais em <b style="color:#3FBF7F">${dowLabels[bestDow]}</b>${dowN[worstDow] > 0 && worstDow !== bestDow ? ` e menos em <b>${dowLabels[worstDow]}</b>` : ''}.
        </div>` : ''}
    </div>

    <!-- Personal Records -->
    ${topPRs.length ? `
      <div class="q-card p-4">
        <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Personal records</div>
        <div class="mt-2 space-y-1.5">
          ${topPRs.map((pr, i) => `
            <div class="flex items-center gap-2 text-sm">
              <span class="font-kombat text-xs w-4" style="color:#D6A93E">${['🥇','🥈','🥉'][i]||''}</span>
              <span class="flex-1 truncate">${pr.name}</span>
              <span class="font-bold">${pr.weight}kg${pr.reps?` × ${pr.reps}`:''}</span>
              <span class="text-[10px] text-ink/45 dark:text-paper/45">${formatDateBR(pr.date)}</span>
            </div>
          `).join('')}
        </div>
      </div>` : ''}

    <!-- Histórico de ranks (compacto) -->
    ${state.rankHistory.length > 1 ? `
      <div class="q-card p-4">
        <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Histórico de ranks</div>
        <div class="mt-2 space-y-1">
          ${state.rankHistory.slice(-5).map(rh => {
            const r = RANKS.find(x => x.key === rh.rank) || RANKS[0];
            return `<div class="flex items-center justify-between text-sm">
              <span class="text-ink/55 dark:text-paper/55">${formatDateBR(rh.weekStart)}</span>
              <span class="font-bold" style="color:${r.color}">${r.name}</span>
              <span class="text-xs">${rh.xp} XP</span>
            </div>`;
          }).join('')}
        </div>
      </div>` : ''}

  </section>
  `;
}

function miniStat(label, value, unit, color) {
  return `
    <div class="q-card p-3">
      <div class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">${label}</div>
      <div class="flex items-baseline gap-1 mt-0.5">
        <div class="text-2xl font-extrabold" style="color:${color}">${value}</div>
        <div class="text-[10px] text-ink/45 dark:text-paper/45">${unit}</div>
      </div>
    </div>`;
}

/** Devolve a recomendação mais relevante para os últimos 7 dias.
 *  Retorna { title, tip, color }. */
function nextStepRec(logs) {
  if (!logs.length) return {
    title: 'Faça seu primeiro registro',
    tip: `Toque em "${getTheme(state).labels?.finishBtn || 'FINISH IT!'}" na home pra registrar o dia.`,
    color: '#B7B5FF',
  };
  const trainPct   = logs.filter((l) => l.training?.done).length / logs.length;
  const sleepPct   = logs.filter((l) => (l.sleep?.hours||0) >= 7).length / logs.length;
  const proteinPct = logs.filter((l) => l.protein?.hit).length / logs.length;
  const stepsPct   = logs.filter((l) => (l.steps||0) >= 8000).length / logs.length;
  const readPct    = logs.filter((l) => (l.reading?.minutes||0) >= 15).length / logs.length;

  const items = [
    { k:'sleep', pct: sleepPct,   title: 'Priorize o sono ≥7h',     tip: 'Apague a luz 23:30 hoje. Sem celular nos últimos 30min.',         color:'#7BB8FF' },
    { k:'train', pct: trainPct,   title: 'Trave 3 treinos no calendário', tip: 'Coloca como compromisso fixo — o app detecta o tipo automaticamente.', color:'#B8242E' },
    { k:'prot',  pct: proteinPct, title: 'Encha as refeições de proteína', tip: 'Mire 30g+ por refeição. Whey resolve quando der ruim.',           color:'#3FBF7F' },
    { k:'step',  pct: stepsPct,   title: 'Caminhe 30 min após o almoço', tip: 'Resolve passos e digestão de uma vez.',                            color:'#E84A1A' },
    { k:'read',  pct: readPct,    title: 'Leitura 15 min antes de dormir', tip: 'Use o timer pomodoro do app. Substitui o scroll noturno.',         color:'#B7B5FF' },
  ];
  items.sort((a, b) => a.pct - b.pct);
  return items[0];
}

// ----- 6.6 Sleep modal -------------------------------------

function modalSleep() {
  const active = state.sleepSessions.find((s) => !s.endISO);
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <h2 class="font-extrabold text-lg">Sono</h2>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-3">
      ${active
        ? `<div class="q-card p-4 text-center">
            <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Dormindo desde</div>
            <div class="text-2xl font-extrabold">${formatTime(active.startISO)}</div>
            <button id="wake-up" class="q-btn q-btn-primary w-full mt-3">Acordei agora</button>
          </div>`
        : `<button id="lights-off" class="q-btn q-btn-primary w-full py-4">🌙 Apagando luz agora</button>`}

      <h3 class="font-bold mt-3">Últimas noites</h3>
      <div class="q-card divide-y divide-ink/5 dark:divide-paper/5">
        ${state.sleepSessions.slice().reverse().slice(0, 7).map(s => `
          <div class="p-3 flex justify-between text-sm">
            <span>${formatDateBR(s.date)}</span>
            <span>${formatTime(s.startISO)} → ${s.endISO?formatTime(s.endISO):'…'}</span>
            <span class="pill ${(s.durationH||0)>=7.5?'is-mint':(s.durationH||0)>=7?'is-sun':'is-pink'}">${(s.durationH||0).toFixed(1)}h</span>
          </div>`).join('') || `<div class="p-4 text-sm text-ink/50">Sem registros.</div>`}
      </div>
    </div>
  `);

  const lights = document.getElementById('lights-off');
  if (lights) lights.onclick = () => {
    const now = new Date();
    state.sleepSessions.push({ date: isoDate(now), startISO: now.toISOString() });
    saveState(); closeModal(); toast('Boa noite 🌙'); render();
  };
  const wake = document.getElementById('wake-up');
  if (wake) wake.onclick = () => {
    const now = new Date();
    active.endISO = now.toISOString();
    const start = new Date(active.startISO);
    active.durationH = +(((now - start) / 3600000)).toFixed(2);
    // Atualiza log do dia
    const logDay = state.dailyLogs.find((l) => l.date === active.date);
    if (logDay) {
      logDay.sleep.hours = active.durationH;
      logDay.xp = computeDayXP(logDay);
    }
    saveState(); closeModal(); toast(`Dormiu ${active.durationH}h`); render();
  };
}

// ----- 6.7 Reading modal -----------------------------------

let readingInt = null;
let readingStart = 0;

// ----- 6.7 Reading view (tab principal) --------------------

function viewReading() {
  const board = buildReadingLeaderboard();
  const cloudGlobal = cloudReady() && !_globalLeaderboardFetched;
  // Dispara o fetch global em background se cloud disponível (não bloqueia UI)
  if (cloudGlobal) {
    _globalLeaderboardFetched = true;
    setTimeout(() => fetchGlobalReadingLeaderboard().then((rows) => {
      _globalLeaderboardCache = rows;
      // Re-render se ainda estiver na tab Leitura
      if (currentTab === 'reading') render();
    }), 0);
  }

  // Stats pessoais da leitura
  const wkStart = weekStartISO();
  const myWeekMin = (state.dailyLogs || [])
    .filter((l) => l.date >= wkStart)
    .reduce((s, l) => s + (l.reading?.minutes || 0), 0);
  const myTotalMin = (state.dailyLogs || []).reduce((s, l) => s + (l.reading?.minutes || 0), 0);
  const booksDone = (state.books || []).filter((b) => b.finishedAt).length;
  const booksReading = (state.books || []).filter((b) => !b.finishedAt).length;

  // Histórico últimos 14 dias (mini bar chart)
  const last14 = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(todayISO() + 'T00:00:00');
    d.setDate(d.getDate() - i);
    const iso = isoDate(d);
    const log = (state.dailyLogs || []).find((l) => l.date === iso);
    last14.push({ iso, min: log?.reading?.minutes || 0 });
  }
  const maxMin = Math.max(...last14.map((x) => x.min), 30);

  const theme = getTheme(state);

  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="kombat-tagline text-xs">📖 SESSÃO DE LEITURA</div>
    <h1 class="text-2xl font-extrabold mt-1">Leitura</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55">Timer, livros, leaderboard global.</p>
  </header>

  <section class="px-4 space-y-3">
    <!-- Stats em 3 quadros -->
    <div class="grid grid-cols-3 gap-2">
      <div class="q-card p-3">
        <div class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">Semana</div>
        <div class="text-2xl font-extrabold text-lavender">${myWeekMin}</div>
        <div class="text-[10px] text-ink/45 dark:text-paper/45">min</div>
      </div>
      <div class="q-card p-3">
        <div class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">Total</div>
        <div class="text-2xl font-extrabold text-mint">${myTotalMin}</div>
        <div class="text-[10px] text-ink/45 dark:text-paper/45">min</div>
      </div>
      <div class="q-card p-3">
        <div class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">Livros</div>
        <div class="text-2xl font-extrabold text-pink">${booksDone}</div>
        <div class="text-[10px] text-ink/45 dark:text-paper/45">${booksReading} em curso</div>
      </div>
    </div>

    <!-- Timer -->
    <div class="q-card p-4 text-center">
      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Timer de leitura</div>
      <div id="reading-timer-tab" class="text-4xl font-extrabold mt-1">15:00</div>
      <div class="flex gap-2 mt-3">
        <button id="r-start-tab" class="q-btn q-btn-primary flex-1">▶ Iniciar 15 min</button>
        <button id="r-stop-tab"  class="q-btn q-btn-ghost flex-1">⏸ Parar</button>
      </div>
      <div class="flex gap-2 mt-2">
        <button class="r-quick q-btn q-btn-ghost flex-1 text-[10px]" data-min="5">+5 min</button>
        <button class="r-quick q-btn q-btn-ghost flex-1 text-[10px]" data-min="15">+15 min</button>
        <button class="r-quick q-btn q-btn-ghost flex-1 text-[10px]" data-min="30">+30 min</button>
        <button class="r-quick q-btn q-btn-ghost flex-1 text-[10px]" data-min="60">+60 min</button>
      </div>
    </div>

    <!-- Histórico 14 dias -->
    <div class="q-card p-3">
      <div class="flex items-center justify-between mb-2">
        <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Últimos 14 dias</div>
        <div class="text-[10px] text-ink/45 dark:text-paper/45">média ${Math.round(last14.reduce((s, x) => s + x.min, 0) / 14)}min/dia</div>
      </div>
      <div class="reading-bars">
        ${last14.map((d) => {
          const h = Math.max(3, Math.round((d.min / maxMin) * 50));
          const isToday = d.iso === todayISO();
          return `<div class="reading-bar-col">
            <div class="reading-bar" style="height:${h}px; background:${isToday ? '#FFB7C5' : 'var(--lavender)'}"></div>
            <div class="reading-bar-label">${d.iso.slice(8)}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Leaderboard -->
    <div class="q-card p-3">
      <div class="flex items-center justify-between mb-2">
        <h3 class="font-bold text-sm">🏆 Leaderboard · semana</h3>
        <span class="text-[10px] text-ink/45 dark:text-paper/45">você em <b style="color:var(--lavender)">${board.youRank}º</b></span>
      </div>
      <div class="space-y-1">
        ${board.rows.slice(0, 12).map((r, i) => `
          <div class="flex items-center gap-2 py-1 ${r.isYou ? 'bg-lavender/10 rounded' : ''}">
            <span class="w-5 text-xs font-bold text-center ${i < 3 ? 'text-kgold' : 'text-ink/45 dark:text-paper/45'}">${i+1}</span>
            <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                  style="background:${r.color}25; color:${r.color}">${r.username.slice(0,1).toUpperCase()}</span>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold truncate ${r.isYou ? 'text-lavender' : ''}">${r.username}${r.isYou ? ' (você)' : r.isNpc ? ' · bot' : r.isGlobal ? ' · global' : ''}</div>
              <div class="xp-track mt-0.5" style="height:3px"><div class="xp-fill" style="width:${r.pct}%"></div></div>
            </div>
            <span class="text-xs font-bold tabular-nums">${r.minutes}min</span>
          </div>
        `).join('')}
      </div>
      <p class="text-[10px] text-ink/45 dark:text-paper/45 mt-2 italic">
        ${cloudReady() ? 'Inclui todos os usuários do app (cadastrados no Firebase) + 3 bots. Renova toda segunda.' : 'Inclui contas locais + 3 bots. Sem internet = leaderboard local.'}
      </p>
    </div>

    <!-- Livros -->
    <h2 class="font-extrabold text-lg mt-4">Livros em andamento</h2>
    <div class="space-y-2">
      ${state.books.map((b, i) => `
        <div class="q-card p-3 flex items-center gap-3" data-book="${i}">
          <div class="flex-1 min-w-0">
            <div class="font-semibold truncate">${b.title}</div>
            <div class="text-xs text-ink/55 dark:text-paper/55">página ${b.currentPage} / ${b.totalPages}${b.finishedAt ? ' · ✓ concluído' : ''}</div>
            <div class="xp-track mt-2"><div class="xp-fill" style="width:${(b.currentPage/b.totalPages)*100}%"></div></div>
          </div>
          ${b.finishedAt ? '' : `<button class="q-btn q-btn-ghost px-2 py-1 text-xs page-up-tab" data-i="${i}">+10 pg</button>`}
          <button class="q-btn q-btn-ghost px-2 py-1 text-xs book-remove" data-i="${i}" title="Remover">×</button>
        </div>`).join('') || `<div class="q-card p-4 text-sm text-ink/55">Sem livros ainda. Adicione abaixo.</div>`}
    </div>

    <form id="book-form-tab" class="flex gap-2 mt-2">
      <input class="q-input flex-1" name="title" placeholder="Título do novo livro" required />
      <input class="q-input w-20" name="pages" type="number" placeholder="págs" required min="1" />
      <button class="q-btn q-btn-primary">+</button>
    </form>
  </section>
  `;
}

let _globalLeaderboardCache = null;
let _globalLeaderboardFetched = false;

function modalReading() {
  // Mantém atalho via quick tile na home — abre a tab.
  go('reading');
}

function _modalReadingLegacy() {
  const board = buildReadingLeaderboard();
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <h2 class="font-extrabold text-lg">Leitura</h2>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-4 overflow-y-auto" style="max-height:75vh">
      <div class="q-card p-4 text-center">
        <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Timer de leitura</div>
        <div id="reading-timer" class="text-4xl font-extrabold mt-1">15:00</div>
        <div class="flex gap-2 mt-3">
          <button id="r-start" class="q-btn q-btn-primary flex-1">Iniciar 15 min</button>
          <button id="r-stop" class="q-btn q-btn-ghost flex-1">Parar</button>
        </div>
      </div>

      <!-- Leaderboard semanal (estilo gymrats) -->
      <div class="q-card p-3">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-bold text-sm">🏆 Leaderboard · semana</h3>
          <span class="text-[10px] text-ink/45 dark:text-paper/45">você está em <b style="color:var(--lavender)">${board.youRank}º</b></span>
        </div>
        <div class="space-y-1">
          ${board.rows.map((r, i) => `
            <div class="flex items-center gap-2 py-1 ${r.isYou ? 'bg-lavender/10 rounded' : ''}">
              <span class="w-5 text-xs font-bold text-center ${i < 3 ? 'text-kgold' : 'text-ink/45 dark:text-paper/45'}">${i+1}</span>
              <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                    style="background:${r.color}25; color:${r.color}">${r.username.slice(0,1).toUpperCase()}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold truncate ${r.isYou ? 'text-lavender' : ''}">${r.username}${r.isYou ? ' (você)' : r.isNpc ? ' · bot' : ''}</div>
                <div class="xp-track mt-0.5" style="height:3px"><div class="xp-fill" style="width:${r.pct}%"></div></div>
              </div>
              <span class="text-xs font-bold tabular-nums">${r.minutes}min</span>
            </div>
          `).join('')}
        </div>
        <p class="text-[10px] text-ink/45 dark:text-paper/45 mt-2 italic">
          Compete com outras contas neste dispositivo + 3 bots que leem em ritmo realista. Renova toda segunda.
        </p>
      </div>

      <h3 class="font-bold">Livros em andamento</h3>
      <div class="space-y-2">
        ${state.books.map((b, i) => `
          <div class="q-card p-3 flex items-center gap-3" data-book="${i}">
            <div class="flex-1">
              <div class="font-semibold">${b.title}</div>
              <div class="text-xs text-ink/55 dark:text-paper/55">página ${b.currentPage} / ${b.totalPages}</div>
              <div class="xp-track mt-2"><div class="xp-fill" style="width:${(b.currentPage/b.totalPages)*100}%"></div></div>
            </div>
            <button class="q-btn q-btn-ghost px-2 py-1 text-xs page-up" data-i="${i}">+pg</button>
          </div>`).join('') || `<div class="q-card p-4 text-sm text-ink/55">Sem livros. Adicione um abaixo.</div>`}
      </div>

      <form id="book-form" class="flex gap-2">
        <input class="q-input flex-1" name="title" placeholder="Título do novo livro" required />
        <input class="q-input w-20" name="pages" type="number" placeholder="págs" required />
        <button class="q-btn q-btn-primary">+</button>
      </form>
    </div>
  `);

  let remaining = 15 * 60;
  const disp = document.getElementById('reading-timer');
  function fmt(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
  document.getElementById('r-start').onclick = () => {
    if (readingInt) return;
    readingStart = Date.now();
    readingInt = setInterval(() => {
      remaining--;
      disp.textContent = fmt(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(readingInt); readingInt = null;
        vibrate([60,40,80]);
        recordReadingMinutes(15);
        toast('15 min completos 📖 +1 XP');
        confetti(800);
      }
    }, 1000);
  };
  document.getElementById('r-stop').onclick = () => {
    if (!readingInt) return;
    clearInterval(readingInt); readingInt = null;
    const elapsed = Math.round((Date.now() - readingStart) / 60000);
    if (elapsed > 0) recordReadingMinutes(elapsed);
    toast(`Sessão de ${elapsed} min registrada`);
    closeModal();
  };
  document.querySelectorAll('.page-up').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    state.books[i].currentPage = Math.min(state.books[i].totalPages, state.books[i].currentPage + 10);
    if (state.books[i].currentPage >= state.books[i].totalPages) {
      state.books[i].finishedAt = todayISO();
      toast(`📖 Concluiu "${state.books[i].title}"!`);
      confetti(1500);
    }
    saveState(); modalReading();
  });
  document.getElementById('book-form').onsubmit = (e) => {
    e.preventDefault();
    const f = e.target;
    state.books.push({ title: f.title.value, totalPages: +f.pages.value || 200, currentPage: 0 });
    saveState(); modalReading();
  };
}

// NPCs do leaderboard de leitura — perfis com ritmo realista (média min/dia).
// O progresso é gerado deterministicamente a partir do ISO da semana, então
// a "competição" não muda durante a semana, mas vira nova toda segunda.
const READING_NPCS = [
  { username: 'Ana',          avgMin: 28, variance: 12, color: '#FF85A5' },
  { username: 'João',         avgMin: 16, variance: 8,  color: '#7BB8FF' },
  { username: 'BookwormZ',    avgMin: 42, variance: 10, color: '#A8E6CF' },
];

// NPCs de cuidados (skincare/rotina) — pontos = quantos rituais concluiu na semana
const CARE_NPCS = [
  { username: 'Mari',         avgPts: 5, variance: 2, color: '#FFB7C5' },
  { username: 'Lia',          avgPts: 3, variance: 2, color: '#B7B5FF' },
  { username: 'Beto',         avgPts: 2, variance: 1, color: '#A8E6CF' },
];

function weekStartISO(d = new Date()) {
  const x = new Date(d);
  const day = x.getDay();
  x.setDate(x.getDate() - day); // domingo
  return isoDate(x);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Busca leaderboard global do Firestore (collection 'leaderboardReading').
 *  Cada usuário tem seu próprio doc que é escrito em saveState (cloud).
 *  Retorna array [{ uid, username, minutes, color }] da semana atual. */
async function fetchGlobalReadingLeaderboard() {
  if (!cloudReady()) return [];
  try {
    const { collection, getDocs, query, where, orderBy, limit } = window.QuestCloud;
    if (!collection || !getDocs) return []; // SDK partial — fallback
    const colRef = collection(window.QuestCloud.db, 'leaderboardReading');
    const wkStart = weekStartISO();
    const q = query(colRef, where('weekStart', '==', wkStart), orderBy('minutes', 'desc'), limit(50));
    const snap = await getDocs(q);
    const rows = [];
    snap.forEach((d) => {
      const data = d.data();
      rows.push({
        uid: d.id,
        username: data.username || 'Anônimo',
        minutes: data.minutes || 0,
        isYou: window.QuestCloud.auth.currentUser?.uid === d.id,
        isNpc: false,
        isGlobal: true,
        color: '#7BB8FF',
      });
    });
    return rows;
  } catch (e) {
    console.warn('fetchGlobalReadingLeaderboard failed:', e);
    return [];
  }
}

/** Escreve as estatísticas semanais de leitura do usuário atual em
 *  /leaderboardReading/{uid} pra aparecer no leaderboard global. */
async function syncReadingLeaderboard() {
  if (!cloudReady() || !window.QuestCloud.auth.currentUser) return;
  const u = window.QuestCloud.auth.currentUser;
  const wkStart = weekStartISO();
  const minutes = (state?.dailyLogs || [])
    .filter((l) => l.date >= wkStart)
    .reduce((s, l) => s + (l.reading?.minutes || 0), 0);
  try {
    const { collection, doc, setDoc } = window.QuestCloud;
    const ref = doc(window.QuestCloud.db, 'leaderboardReading', u.uid);
    await setDoc(ref, {
      username: state?.user?.name || (u.email || '').split('@')[0],
      weekStart: wkStart,
      minutes,
      updatedAt: Date.now(),
    });
  } catch (e) {
    console.warn('syncReadingLeaderboard failed:', e);
  }
}

/** Constrói o leaderboard semanal de leitura.
 *  Mescla: você + outras contas locais + cache global do Firestore + NPCs.
 *  Retorna { rows: [...sorted], youRank }. */
function buildReadingLeaderboard() {
  const wkStart = weekStartISO();
  const accs = loadAccounts();
  const youId = currentAccount()?.id;
  const rows = [];
  const seenIds = new Set();

  // Se cloud, prioriza os dados globais do Firestore (todos os usuários)
  if (cloudReady() && _globalLeaderboardCache?.length) {
    for (const r of _globalLeaderboardCache) {
      rows.push({ ...r });
      seenIds.add(r.uid);
    }
  } else {
    // Modo local: usa state das contas no aparelho
    for (const acc of accs) {
      const key = stateKey(acc.id);
      let minutes = 0;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const s = JSON.parse(raw);
          minutes = (s.dailyLogs || []).filter((l) => l.date >= wkStart).reduce((sum, l) => sum + (l.reading?.minutes || 0), 0);
        }
      } catch {}
      rows.push({ username: acc.username, minutes, isYou: acc.id === youId, isNpc: false, color: '#B7B5FF' });
      seenIds.add(acc.id);
    }
  }

  // Garante que VOCÊ está no leaderboard (mesmo antes do fetch global retornar)
  const myUid = cloudReady() ? window.QuestCloud.auth.currentUser?.uid : youId;
  if (myUid && !seenIds.has(myUid) && state) {
    const minutes = (state.dailyLogs || [])
      .filter((l) => l.date >= wkStart)
      .reduce((s, l) => s + (l.reading?.minutes || 0), 0);
    rows.push({
      uid: myUid,
      username: state.user?.name || 'Você',
      minutes,
      isYou: true,
      isNpc: false,
      color: '#B7B5FF',
    });
  }

  // Modo convidado legado
  if (!myUid && state) {
    const minutes = (state.dailyLogs || []).filter((l) => l.date >= wkStart).reduce((s, l) => s + (l.reading?.minutes || 0), 0);
    rows.push({ username: state.user?.name || 'Convidado', minutes, isYou: true, isNpc: false, color: '#B7B5FF' });
  }

  // NPCs — progresso determinístico por semana (mulberry32 com seed do wkStart)
  const seedBase = wkStart.split('-').join('') | 0;
  READING_NPCS.forEach((npc, i) => {
    const rng = mulberry32(seedBase + i * 1009);
    // Dia atual da semana (0 = domingo até 6 = sábado)
    const dow = new Date().getDay();
    // Para cada dia 0..dow, NPC lê (avgMin ± variance), no mínimo 0
    let total = 0;
    for (let d = 0; d <= dow; d++) {
      const v = npc.avgMin + (rng() * 2 - 1) * npc.variance;
      total += Math.max(0, Math.round(v));
    }
    rows.push({ username: npc.username, minutes: total, isYou: false, isNpc: true, color: npc.color });
  });

  rows.sort((a, b) => b.minutes - a.minutes);
  const maxMin = Math.max(...rows.map((r) => r.minutes), 1);
  rows.forEach((r) => { r.pct = Math.round((r.minutes / maxMin) * 100); });
  const youRank = (rows.findIndex((r) => r.isYou) + 1) || rows.length;
  return { rows, youRank };
}

/** Leaderboard de cuidados — conta desafios concluídos com id começando em "s"
 *  (skincare) na semana atual, somando contas locais + 3 NPCs. */
function buildCareLeaderboard() {
  const wkStart = weekStartISO();
  const accs = loadAccounts();
  const youId = currentAccount()?.id;
  const rows = [];

  function countCareForState(s) {
    return (s.user?.challengesDone || [])
      .filter((d) => d.date >= wkStart && /^s\d+/.test(d.id))
      .length;
  }
  for (const acc of accs) {
    let pts = 0;
    try {
      const raw = localStorage.getItem(stateKey(acc.id));
      if (raw) pts = countCareForState(JSON.parse(raw));
    } catch {}
    rows.push({ username: acc.username, pts, isYou: acc.id === youId, isNpc: false, color: '#B7B5FF' });
  }
  if (!youId && state) {
    rows.push({ username: state.user?.name || 'Convidado', pts: countCareForState(state), isYou: true, isNpc: false, color: '#B7B5FF' });
  }
  const seedBase = wkStart.split('-').join('') | 0;
  CARE_NPCS.forEach((npc, i) => {
    const rng = mulberry32(seedBase + i * 4441);
    const dow = new Date().getDay();
    let total = 0;
    for (let d = 0; d <= dow; d++) {
      // chance de fazer cuidado naquele dia ~ avgPts/7
      if (rng() < npc.avgPts / 7) total++;
    }
    rows.push({ username: npc.username, pts: total, isYou: false, isNpc: true, color: npc.color });
  });
  rows.sort((a, b) => b.pts - a.pts);
  const max = Math.max(...rows.map((r) => r.pts), 1);
  rows.forEach((r) => { r.pct = Math.round((r.pts / max) * 100); });
  const youRank = (rows.findIndex((r) => r.isYou) + 1) || rows.length;
  return { rows, youRank };
}

/** Modal "Competição" com ambos os leaderboards (leitura + cuidados). */
function modalCompete() {
  const reading = buildReadingLeaderboard();
  const care    = buildCareLeaderboard();

  function leaderboardHtml(title, sub, board, unit) {
    return `
      <div class="q-card p-3">
        <div class="flex items-center justify-between mb-2">
          <div>
            <h3 class="font-bold text-sm">${title}</h3>
            <div class="text-[10px] text-ink/45 dark:text-paper/45">${sub}</div>
          </div>
          <span class="text-[10px] text-ink/45 dark:text-paper/45">${board.youRank}º</span>
        </div>
        <div class="space-y-1">
          ${board.rows.map((r, i) => `
            <div class="flex items-center gap-2 py-1 ${r.isYou ? 'bg-lavender/10 rounded' : ''}">
              <span class="w-5 text-xs font-bold text-center ${i < 3 ? 'text-kgold' : 'text-ink/45 dark:text-paper/45'}">${i+1}</span>
              <span class="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                    style="background:${r.color}25; color:${r.color}">${r.username.slice(0,1).toUpperCase()}</span>
              <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold truncate ${r.isYou ? 'text-lavender' : ''}">${r.username}${r.isYou ? ' (você)' : r.isNpc ? ' · bot' : ''}</div>
                <div class="xp-track mt-0.5" style="height:3px"><div class="xp-fill" style="width:${r.pct}%"></div></div>
              </div>
              <span class="text-xs font-bold tabular-nums">${(r.minutes ?? r.pts)}${unit}</span>
            </div>
          `).join('')}
        </div>
      </div>`;
  }

  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <div class="kombat-tagline text-[10px]">${getTheme(state).short}</div>
        <h2 class="font-extrabold text-lg mt-0.5">Competição · semana</h2>
        <p class="text-xs text-ink/55 dark:text-paper/55">Você + outras contas no aparelho + 3 bots de cada categoria.</p>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-3 overflow-y-auto" style="max-height:75vh">
      ${leaderboardHtml('📖 Leitura', 'Minutos lidos na semana', reading, 'min')}
      ${leaderboardHtml('✨ Cuidados', 'Rituais de skincare concluídos', care, 'pts')}
      <p class="text-[10px] text-ink/45 dark:text-paper/45 italic">
        Cuidados pontua cada vez que você marca um desafio de skincare como concluído.
        Renova toda segunda. Bots leem/cuidam em ritmo realista.
      </p>
    </div>
  `);
}

function recordReadingMinutes(min) {
  const log = state.dailyLogs.find((l) => l.date === todayISO()) || {
    date: todayISO(),
    training: { type: 'descanso', done: false },
    protein: { grams: 0, hit: false },
    sleep: { hours: 0 },
    reading: { minutes: 0 },
    steps: 0, buffs: [], notes: '',
  };
  log.reading = { minutes: (log.reading?.minutes || 0) + min };
  log.xp = computeDayXP(log);
  upsertDailyLog(log);
}

// ----- 6.7b Exercise Library / Achievements modals ---------

function modalLibrary() {
  const types = Object.keys(EXERCISE_LIBRARY).filter(t => EXERCISE_LIBRARY[t].length);
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <div class="kombat-tagline text-[10px]">MOVE-SET ARCHIVE</div>
        <h2 class="font-extrabold text-lg mt-0.5">Biblioteca de exercícios</h2>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 overflow-y-auto" style="max-height:75vh">
      <input id="lib-search" class="q-input mb-3" placeholder="🔍 buscar exercício…" />
      <div id="lib-content">
        ${types.map(t => `
          <div class="mb-4">
            <h3 class="font-extrabold text-sm mb-2 flex items-center gap-2">
              ${t}
              <span class="pill text-[10px]">${EXERCISE_LIBRARY[t].length}</span>
            </h3>
            <div class="space-y-2">
              ${EXERCISE_LIBRARY[t].map((ex, i) => `
                <details class="q-card p-3 lib-ex" data-name="${ex.name.toLowerCase()}">
                  <summary class="cursor-pointer flex items-center justify-between gap-2">
                    <div class="min-w-0">
                      <div class="font-bold flex items-center gap-2">
                        <span class="truncate">${ex.name}</span>
                        ${ex.ko ? `<span class="font-display text-xs text-ink/45 dark:text-paper/45">${ex.ko}</span>` : ''}
                      </div>
                      <div class="text-xs text-ink/50 dark:text-paper/50 mt-0.5">${ex.target || ''} · ${ex.muscles || ''}</div>
                    </div>
                    <span class="w-4 h-4 opacity-40">${I.info}</span>
                  </summary>
                  <div class="mt-3 space-y-2 text-sm">
                    ${ex.description ? `<p class="text-ink/75 dark:text-paper/75">${ex.description}</p>` : ''}
                    ${ex.technique ? `<div><b class="text-lavender">Técnica:</b> <span class="text-ink/75 dark:text-paper/75">${ex.technique}</span></div>` : ''}
                    ${ex.mistakes ? `<div><b class="text-pink">Erros comuns:</b> <span class="text-ink/75 dark:text-paper/75">${ex.mistakes}</span></div>` : ''}
                    ${ex.tip ? `<div><b class="text-mint">💡 Dica:</b> <span class="text-ink/75 dark:text-paper/75">${ex.tip}</span></div>` : ''}
                  </div>
                </details>
              `).join('')}
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `);
  document.getElementById('lib-search').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll('.lib-ex').forEach(el => {
      el.style.display = el.dataset.name.includes(q) ? '' : 'none';
    });
  });
}

function modalAchievements() {
  const unlocked = state.user.achievementsUnlocked || [];
  const total = ACHIEVEMENTS.length;
  const pct = Math.round((unlocked.length / total) * 100);
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <div class="kombat-tagline text-[10px]">⚔ HALL OF FAME ⚔</div>
        <h2 class="font-extrabold text-lg mt-0.5">Conquistas <span class="text-sm font-normal text-ink/55 dark:text-paper/55">${unlocked.length}/${total}</span></h2>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 overflow-y-auto" style="max-height:75vh">
      <div class="xp-track mb-4"><div class="xp-fill" style="width:${pct}%"></div></div>
      <div class="space-y-2">
        ${ACHIEVEMENTS.map(a => {
          const ok = unlocked.includes(a.id);
          return `
          <div class="q-card p-3 flex items-center gap-3 ${ok ? '' : 'opacity-55'}">
            <div class="text-3xl">${ok ? a.icon : '🔒'}</div>
            <div class="flex-1 min-w-0">
              <div class="font-bold flex items-center gap-2">
                <span>${a.name}</span>
                ${state.user.theme === 'kpop_anime' && a.ko ? `<span class="font-display text-xs text-ink/45 dark:text-paper/45">${a.ko}</span>` : ''}
              </div>
              <div class="text-xs text-ink/55 dark:text-paper/55">${a.desc}</div>
            </div>
            <div class="pill ${ok ? 'is-mint' : ''}">+${a.xp}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `);
}

// ----- 6.7c Choreography (K-pop) modal --------------------

function modalChoreo() {
  // Estado persistido: histórico de coreografias aprendidas
  if (!state.user.choreosLearned) state.user.choreosLearned = [];
  // Sorteia uma do pool, evitando últimas 3 aprendidas
  const recent = new Set(state.user.choreosLearned.slice(-3).map((c) => c.id));
  const candidates = KPOP_CHOREOS.map((c, i) => ({ ...c, id: i })).filter((c) => !recent.has(c.id));
  const c = candidates[Math.floor(Math.random() * candidates.length)] || KPOP_CHOREOS[0];
  const diffStars = '★'.repeat(c.diff) + '☆'.repeat(5 - c.diff);
  const ytPractice = `https://www.youtube.com/results?search_query=${encodeURIComponent(c.artist + ' ' + c.song + ' dance practice')}`;
  const ytTutorial = `https://www.youtube.com/results?search_query=${encodeURIComponent(c.artist + ' ' + c.song + ' dance tutorial mirrored')}`;
  const tiktokTag   = `https://www.tiktok.com/tag/${encodeURIComponent((c.artist + c.song).replace(/[^a-z0-9]/gi, ''))}`;
  const tiktokSearch = `https://www.tiktok.com/search?q=${encodeURIComponent(c.artist + ' ' + c.song + ' dance')}`;

  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <div class="kombat-tagline text-[10px]">${getTheme(state).tags.dance}</div>
        <h2 class="font-extrabold text-lg mt-0.5">Coreografia sorteada</h2>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-3">
      <div class="q-card p-4 text-center" style="background: linear-gradient(135deg, rgba(255,183,197,0.15), rgba(183,181,255,0.15))">
        <div class="text-xs uppercase tracking-widest text-ink/45 dark:text-paper/45">${c.artist} · ${c.year}</div>
        <div class="font-extrabold text-2xl mt-1">${c.song}</div>
        <div class="font-kombat text-xs text-ink/55 dark:text-paper/55 mt-2 tracking-widest">${c.style} · ${c.dur}</div>
        <div class="mt-2 text-lg" style="color:#E84A1A">${diffStars}</div>
        <div class="text-xs text-ink/55 dark:text-paper/55 mt-3 italic">"${c.tip}"</div>
      </div>

      <div class="grid grid-cols-2 gap-2">
        <a href="${ytPractice}" target="_blank" rel="noopener" class="q-btn q-btn-primary text-center text-xs leading-tight py-2">
          ▶ YouTube<br><span class="opacity-80 text-[10px]">dance practice</span>
        </a>
        <a href="${ytTutorial}" target="_blank" rel="noopener" class="q-btn q-btn-ghost text-center text-xs leading-tight py-2">
          🎓 YouTube<br><span class="opacity-80 text-[10px]">tutorial espelhado</span>
        </a>
        <a href="${tiktokSearch}" target="_blank" rel="noopener" class="q-btn q-btn-primary text-center text-xs leading-tight py-2" style="background:linear-gradient(135deg,#000,#25F4EE)">
          🎵 TikTok<br><span class="opacity-80 text-[10px]">busca da música</span>
        </a>
        <a href="${tiktokTag}" target="_blank" rel="noopener" class="q-btn q-btn-ghost text-center text-xs leading-tight py-2">
          # TikTok<br><span class="opacity-80 text-[10px]">hashtag/challenge</span>
        </a>
      </div>

      <div class="flex gap-2">
        <button id="choreo-reroll" class="q-btn q-btn-ghost flex-1">🎲 Sortear outra</button>
        <button id="choreo-done" class="q-btn q-btn-finish flex-1">✓ Aprendi (+${4 + c.diff} XP)</button>
      </div>

      ${state.user.choreosLearned.length ? `
        <div class="mt-3">
          <h3 class="font-bold text-sm mb-2">Já aprendi (${state.user.choreosLearned.length})</h3>
          <div class="q-card divide-y divide-ink/5 dark:divide-paper/5 max-h-40 overflow-y-auto">
            ${state.user.choreosLearned.slice().reverse().slice(0, 10).map(l => `
              <div class="p-2 text-xs flex justify-between">
                <span class="font-semibold">${l.song}</span>
                <span class="text-ink/55 dark:text-paper/55">${l.artist} · ${formatDateBR(l.date)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `);

  document.getElementById('choreo-reroll').onclick = () => { closeModal(); modalChoreo(); };
  document.getElementById('choreo-done').onclick = () => {
    state.user.choreosLearned.push({ id: c.id, song: c.song, artist: c.artist, date: todayISO() });
    const xp = 4 + c.diff;
    addAttributeXP('resistencia', 2);
    const change = gainXP(xp, { attr: 'vitalidade' });
    saveState();
    closeModal();
    toast(`+${xp} XP — ${c.song} aprendida 🕺`);
    confetti(900);
    render();
    if (change.changed) levelUpOverlay(change.from, change.to, change.promoted);
  };
}

// ----- 6.3c Goals / Metas view -----------------------------
// Tab "Metas" — apenas referências visuais (com imagens reais). Os desafios
// físicos (BODY_CHALLENGES) ficam no modalChallenge() acessível pela home.

function viewGoals() {
  if (!state.user.activeGoals) state.user.activeGoals = [];
  const activeKeys = new Set(state.user.activeGoals);
  const activeGoals = GOALS.filter((g) => activeKeys.has(g.key));
  const otherGoals = GOALS.filter((g) => !activeKeys.has(g.key));

  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="kombat-tagline text-xs">${getTheme(state).tags.goals}</div>
    <h1 class="text-2xl font-extrabold mt-1">Metas</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55">Referências visuais — como você quer ficar.</p>
  </header>

  ${activeGoals.length ? `
  <section class="px-4 mb-4">
    <div class="kombat-divider">★ ATIVAS (${activeGoals.length})</div>
    <div class="grid grid-cols-2 gap-3">
      ${activeGoals.map(g => goalCardHtml(g, true)).join('')}
    </div>
  </section>` : ''}

  <section class="px-4 mb-6">
    <div class="kombat-divider">📸 GALERIA</div>
    <p class="text-xs text-ink/55 dark:text-paper/55 mb-3 leading-relaxed">
      Toque ★ pra marcar como meta. ${activeGoals.length ? '' : 'Comece marcando 1–2 que ressoem.'}
    </p>
    <div class="grid grid-cols-2 gap-3">
      ${otherGoals.map(g => goalCardHtml(g, false)).join('')}
    </div>
  </section>

  <section class="px-4 mb-6">
    <button id="open-challenges" class="q-btn q-btn-ghost w-full text-sm">
      🥊 Ver desafios físicos de hoje
    </button>
  </section>
  `;
}

function goalCardHtml(g, active) {
  const hasImage = !!state?.user?.goalImages?.[g.key];
  // "Wins" semanais — quantas vezes você "venceu" essa meta esta semana
  const wkStart = weekStartISO();
  const wins = (state.user.goalWins || []).filter((w) => w.key === g.key && w.date >= wkStart);
  const winsToday = wins.filter((w) => w.date === todayISO()).length;
  const target = 5; // meta semanal default
  return `
    <div class="q-card overflow-hidden goal-card ${active ? 'is-active' : ''}" data-key="${g.key}">
      <label class="aspect-[3/4] block cursor-pointer relative group">
        ${goalImageHtml(g)}
        <span class="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded bg-ink/70 text-paper pointer-events-none">
          ${hasImage ? '🔁 trocar' : '📷 enviar foto'}
        </span>
        <input type="file" accept="image/*" class="hidden goal-img-input" data-key="${g.key}" />
      </label>
      <div class="p-3">
        <div class="font-bold text-sm">${g.name}</div>
        <div class="text-[10px] text-ink/50 dark:text-paper/50 mt-0.5">${g.focus}</div>
        <p class="text-xs text-ink/65 dark:text-paper/65 mt-2 leading-snug">${g.why}</p>
        ${active ? `
          <div class="mt-2 pt-2 border-t border-ink/5 dark:border-paper/5">
            <div class="flex items-center justify-between">
              <span class="text-[10px] uppercase tracking-wider text-ink/45 dark:text-paper/45">Wins · semana</span>
              <span class="text-xs font-bold ${wins.length >= target ? 'text-mint' : 'text-lavender'}">${wins.length}/${target}</span>
            </div>
            <div class="xp-track mt-1" style="height:4px"><div class="xp-fill" style="width:${Math.min(100, (wins.length/target)*100)}%"></div></div>
            <button class="goal-win q-btn q-btn-finish w-full mt-2 py-1 text-xs" data-key="${g.key}">
              +1 win ${winsToday > 0 ? `· hoje: ${winsToday}` : 'hoje'}
            </button>
          </div>
        ` : ''}
        <button class="goal-toggle q-btn ${active ? 'q-btn-ghost' : 'q-btn-ghost'} w-full mt-2 py-1 text-[10px] text-ink/55 dark:text-paper/55" data-key="${g.key}">
          ${active ? '☆ desmarcar' : '☆ Marcar como meta'}
        </button>
        ${hasImage ? `<button class="goal-img-remove q-btn q-btn-ghost w-full mt-1 py-1 text-[10px] text-ink/55 dark:text-paper/55" data-key="${g.key}">remover foto</button>` : ''}
      </div>
    </div>`;
}

// ----- 6.7d1 Goals (objetivos visuais) modal --------------

function modalGoals() {
  if (!state.user.activeGoals) state.user.activeGoals = [];
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <div class="kombat-tagline text-[10px]">${getTheme(state).tags.goals}</div>
        <h2 class="font-extrabold text-lg mt-0.5">Meus objetivos</h2>
        <p class="text-xs text-ink/55 dark:text-paper/55">Marque as referências que você quer alcançar.</p>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 overflow-y-auto" style="max-height:75vh">
      <p class="text-xs text-ink/55 dark:text-paper/55 mb-3 leading-relaxed">
        Coloque imagens em <code>icons/goals/&lt;key&gt;.jpg</code> pra ver suas referências.
        Sem imagem → placeholder colorido. Confira <code>icons/goals/README.md</code> pros nomes.
      </p>
      <div class="grid grid-cols-2 gap-3">
        ${GOALS.map(g => {
          const active = state.user.activeGoals.includes(g.key);
          return `
          <div class="q-card overflow-hidden goal-card ${active ? 'is-active' : ''}" data-key="${g.key}">
            <div class="aspect-[3/4]">${goalImageHtml(g)}</div>
            <div class="p-3">
              <div class="font-bold text-sm">${g.name}</div>
              <div class="text-[10px] text-ink/50 dark:text-paper/50 mt-0.5">${g.focus}</div>
              <p class="text-xs text-ink/65 dark:text-paper/65 mt-2 leading-snug">${g.why}</p>
              <button class="goal-toggle q-btn ${active ? 'q-btn-finish' : 'q-btn-ghost'} w-full mt-2 py-1 text-xs" data-key="${g.key}">
                ${active ? '★ Objetivo ativo' : '☆ Marcar como meta'}
              </button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  `);
  document.querySelectorAll('.goal-toggle').forEach(b => b.onclick = () => {
    const k = b.dataset.key;
    const arr = state.user.activeGoals;
    const i = arr.indexOf(k);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(k);
    saveState();
    modalGoals(); // re-render
  });
}

// ----- 6.7d Body challenges modal --------------------------

function modalChallenge() {
  if (!state.user.challengesDone) state.user.challengesDone = [];
  // Pool = skincare + leitura (compartilhado) + desafios temáticos do tema atual
  const themeChallenges = getTheme(state).challenges || [];
  const fullPool = [...BODY_CHALLENGES, ...themeChallenges];
  const recent = new Set(state.user.challengesDone.slice(-5).map((c) => c.id));
  const pool = fullPool.filter((c) => !recent.has(c.id));
  const picked = sample(pool.length ? pool : fullPool, 3);

  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <div class="kombat-tagline text-[10px]">${getTheme(state).tags.workout}</div>
        <h2 class="font-extrabold text-lg mt-0.5">Desafios físicos</h2>
        <p class="text-xs text-ink/55 dark:text-paper/55">Inspirações de quem você admira.</p>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-3 overflow-y-auto" style="max-height:75vh">
      ${picked.map(c => `
        <div class="q-card p-4 challenge-card" data-id="${c.id}">
          <div class="flex items-start gap-3">
            <div class="text-3xl">${c.icon}</div>
            <div class="flex-1 min-w-0">
              <div class="font-extrabold text-base">${c.name}</div>
              <div class="font-kombat text-[10px] text-blood dark:text-ember tracking-widest">${c.inspiration ? c.inspiration + ' · ' : ''}${c.focus}</div>
              <p class="text-sm mt-2 text-ink/75 dark:text-paper/75">${c.sets}</p>
              <p class="text-xs italic mt-1 text-ink/55 dark:text-paper/55">💡 ${c.tip}</p>
            </div>
            <div class="pill ${state.user.theme === 'kpop_anime' ? 'is-kombat' : 'is-mint'} flex-shrink-0">+${c.xp} XP</div>
          </div>
          <button class="q-btn q-btn-primary w-full mt-3 text-sm challenge-done" data-id="${c.id}" data-xp="${c.xp}" data-name="${c.name}">
            ✓ Concluí esse desafio
          </button>
        </div>
      `).join('')}

      <button id="challenge-reroll" class="q-btn q-btn-ghost w-full">🎲 Sortear outros 3</button>

      ${state.user.challengesDone.length ? `
        <div class="mt-3">
          <h3 class="font-bold text-sm mb-2">Histórico (${state.user.challengesDone.length})</h3>
          <div class="q-card divide-y divide-ink/5 dark:divide-paper/5 max-h-40 overflow-y-auto">
            ${state.user.challengesDone.slice().reverse().slice(0, 10).map(d => `
              <div class="p-2 text-xs flex justify-between">
                <span class="font-semibold">${d.name}</span>
                <span class="text-ink/55 dark:text-paper/55">${formatDateBR(d.date)}</span>
              </div>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `);

  document.getElementById('challenge-reroll').onclick = () => { closeModal(); modalChallenge(); };
  document.querySelectorAll('.challenge-done').forEach((btn) => btn.onclick = () => {
    const id = btn.dataset.id;
    const xp = +btn.dataset.xp;
    const name = btn.dataset.name;
    const ch = BODY_CHALLENGES.find((c) => c.id === id);
    state.user.challengesDone.push({ id, name, date: todayISO() });
    if (ch) addAttributeXP('forca', 2);
    const change = gainXP(xp, { attr: 'forca' });
    saveState();
    toast(`+${xp} XP — ${name} concluído 💪`);
    confetti(1100);
    vibrate(25);
    btn.disabled = true;
    btn.textContent = '✓ Concluído!';
    btn.classList.remove('q-btn-primary');
    btn.classList.add('q-btn-ghost');
    if (change.changed) setTimeout(() => kombatOverlay('brutality'), 400);
  });
}

// ----- 6.8 Rewards modal -----------------------------------

function modalRewards() {
  // Normaliza recompensas: aceita string (legado) OU objeto {text, daily, id}
  const items = state.rewards.available.map((r, i) => {
    if (typeof r === 'string') return { id: 'r' + i, text: r, daily: false };
    return { id: r.id || 'r' + i, text: r.text || '', daily: !!r.daily };
  });

  function rewardRow(r, i) {
    const isDaily = r.daily;
    return `
      <div class="q-card p-3 flex items-center gap-2" data-i="${i}">
        <span class="reward-toggle-daily cursor-pointer text-sm select-none" data-i="${i}"
              title="Marcar como recompensa diária">
          ${isDaily ? '⭐' : '☆'}
        </span>
        <span class="flex-1 min-w-0 text-sm">${r.text}${isDaily ? ' <span class="text-[10px] text-kgold">· diária</span>' : ''}</span>
        <button class="q-btn q-btn-primary text-xs py-1 px-2 redeem" data-i="${i}">Resgatar</button>
        <button class="reward-delete q-btn q-btn-ghost text-xs py-1 px-2 text-ink/55 dark:text-paper/55" data-i="${i}" title="Remover">×</button>
      </div>`;
  }

  const dailyItems   = items.filter((r) => r.daily);
  const regularItems = items.filter((r) => !r.daily);

  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <div>
        <h2 class="font-extrabold text-lg">Recompensas</h2>
        <p class="text-xs text-ink/55 dark:text-paper/55">⭐ = recompensa diária. Marque pra ver lembrete na home.</p>
      </div>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-4 overflow-y-auto" style="max-height:75vh">

      ${dailyItems.length ? `
      <div>
        <h3 class="font-bold mb-2">⭐ Diárias</h3>
        <div class="space-y-2">
          ${dailyItems.map((r) => rewardRow(r, items.indexOf(r))).join('')}
        </div>
      </div>` : ''}

      <div>
        <h3 class="font-bold mb-2">Disponíveis</h3>
        <div class="space-y-2">
          ${regularItems.length
            ? regularItems.map((r) => rewardRow(r, items.indexOf(r))).join('')
            : `<div class="q-card p-4 text-sm text-ink/50">Adicione sua primeira recompensa.</div>`}
        </div>
      </div>

      <form id="reward-form" class="space-y-2">
        <input class="q-input w-full" name="text" placeholder="Nova recompensa" required />
        <label class="flex items-center gap-2 text-xs text-ink/65 dark:text-paper/65 cursor-pointer">
          <input type="checkbox" name="daily" class="accent-kgold" />
          <span>Marcar como diária (aparece lembrete na home todo dia)</span>
        </label>
        <button class="q-btn q-btn-primary w-full">+ Adicionar recompensa</button>
      </form>

      ${state.rewards.unlocked.length ? `
      <div>
        <h3 class="font-bold mb-2">🌟 Skins desbloqueadas</h3>
        <div class="flex flex-wrap gap-2">
          ${state.rewards.unlocked.map(s => `<span class="pill is-pink">${s}</span>`).join('')}
        </div>
      </div>` : ''}

      ${state.rewards.redeemed.length ? `
      <div>
        <h3 class="font-bold mb-2">Histórico</h3>
        <div class="q-card divide-y divide-ink/5 dark:divide-paper/5 max-h-40 overflow-y-auto">
          ${state.rewards.redeemed.slice().reverse().map(r => `
            <div class="p-2 flex justify-between text-xs">
              <span>${r.text}</span>
              <span class="text-ink/55 dark:text-paper/55">${formatDateBR(r.date)}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `);

  // Promove formato legado pra obj no save
  function persist() {
    state.rewards.available = items.map((r) => ({ id: r.id, text: r.text, daily: r.daily }));
    saveState();
  }
  document.querySelectorAll('.redeem').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    const r = items[i];
    if (!r) return;
    // Diárias ficam na lista; comuns saem
    if (!r.daily) items.splice(i, 1);
    state.rewards.redeemed.push({ date: todayISO(), text: r.text });
    persist(); modalRewards(); toast('🎁 Recompensa resgatada');
  });
  document.querySelectorAll('.reward-delete').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    const r = items[i];
    if (!r) return;
    if (!confirm(`Remover "${r.text}"?`)) return;
    items.splice(i, 1);
    persist(); modalRewards();
  });
  document.querySelectorAll('.reward-toggle-daily').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    if (items[i]) items[i].daily = !items[i].daily;
    persist(); modalRewards();
  });
  document.getElementById('reward-form').onsubmit = (e) => {
    e.preventDefault();
    const text = e.target.text.value.trim();
    if (!text) return;
    const daily = e.target.daily.checked;
    items.push({ id: 'r' + Date.now(), text, daily });
    persist(); modalRewards();
  };
}

// ----- 6.9 Config view -------------------------------------

function viewConfig() {
  const acc = currentAccount();
  return `
  <header class="pt-7 pb-3 px-5">
    <h1 class="text-2xl font-extrabold">Configurações</h1>
  </header>
  <section class="px-4 space-y-3">
    ${acc ? `
    <div class="q-card p-4 flex items-center gap-3">
      <span class="w-10 h-10 rounded-full bg-lavender/20 flex items-center justify-center font-bold">${acc.username.slice(0,1).toUpperCase()}</span>
      <div class="flex-1 min-w-0">
        <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Conta</div>
        <div class="font-bold truncate">${acc.username}</div>
        ${cloudReady() ? '<div class="text-[10px] text-mint">☁ sincronizando</div>' : ''}
      </div>
      <button id="cfg-logout" class="q-btn q-btn-ghost text-xs">Sair</button>
    </div>
    ${cloudReady() && hasLocalDataAvailable() ? `
    <div class="q-card p-4" style="border-left:3px solid #D6A93E">
      <div class="text-xs uppercase tracking-wider text-kgold">⚠ Dados locais detectados</div>
      <div class="font-bold mt-0.5">Migrar dados antigos pra esta conta</div>
      <p class="text-xs text-ink/55 dark:text-paper/55 mt-1 leading-relaxed">
        Detectamos rank/treinos/medidas guardados localmente neste aparelho.
        Importe pra essa conta na nuvem — assim aparece no celular e no PC.
      </p>
      <button id="cfg-migrate-cloud" class="q-btn q-btn-primary w-full mt-3 text-sm">
        ↑ Migrar dados locais para a nuvem
      </button>
    </div>` : ''}
    ` : `
    <div class="q-card p-4">
      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Modo convidado</div>
      <div class="font-bold mt-0.5">Sem conta — dados ficam no aparelho</div>
      <p class="text-xs text-ink/55 dark:text-paper/55 mt-1 leading-relaxed">
        Criar uma conta permite competir no leaderboard de Leitura e Cuidados com outros usuários do mesmo aparelho — e protege seus dados com senha.
      </p>
      <div class="flex gap-2 mt-3">
        <button id="cfg-login"    class="q-btn q-btn-primary flex-1 text-sm">→ Entrar</button>
        <button id="cfg-register" class="q-btn q-btn-ghost   flex-1 text-sm">✓ Criar conta</button>
      </div>
      <button id="cfg-promote" class="q-btn q-btn-ghost w-full mt-2 text-xs text-ink/55 dark:text-paper/55">
        Manter estes dados em uma conta nova
      </button>
    </div>`}

    <div class="q-card p-4">
      <label class="block">
        <span class="text-sm font-semibold">Seu nome</span>
        <input id="cfg-name" class="q-input mt-1" value="${state.user.name}" />
      </label>
      <label class="block mt-3">
        <span class="text-sm font-semibold">Objetivo</span>
        <textarea id="cfg-goals" class="q-input mt-1" rows="2">${state.user.goals}</textarea>
      </label>
      <label class="block mt-3">
        <span class="text-sm font-semibold">Lembretes de proteína (HH:MM separados por vírgula)</span>
        <input id="cfg-reminders" class="q-input mt-1" value="${state.user.reminders.proteinTimes.join(', ')}" />
      </label>
      <div class="block mt-3">
        <div class="text-sm font-semibold mb-2">Estética</div>
        <div class="grid grid-cols-2 gap-2">
          ${Object.entries(THEMES).map(([key, t]) => {
            const isCurrent = (state.user.theme || 'kpop_anime') === key;
            return `
            <label class="q-card p-2 cursor-pointer ${isCurrent ? 'is-selected' : ''} cfg-theme-choice" data-theme="${key}">
              <input type="radio" name="cfgTheme" value="${key}" class="hidden" ${isCurrent ? 'checked' : ''} />
              <div class="text-[9px] tracking-widest uppercase" style="color:${t.accent}">${t.short}</div>
              <div class="font-bold text-xs mt-1">${t.name}</div>
              <div class="text-[10px] text-ink/55 dark:text-paper/55 leading-tight mt-0.5">${t.sub}</div>
            </label>`;
          }).join('')}
        </div>
        <p class="text-[10px] text-ink/45 dark:text-paper/45 mt-2 leading-relaxed">
          Trocar tema atualiza apenas a estética. Suas quests, rewards e desafios temáticos permanecem (ajuste no pool abaixo).
        </p>
      </div>
      <button id="cfg-save" class="q-btn q-btn-primary w-full mt-3">Salvar</button>
    </div>

    <div class="q-card p-4">
      <h3 class="font-bold mb-2">Pool de daily quests</h3>
      <div class="space-y-2" id="pool-list">
        ${state.quests.pool.map((q,i) => `
          <div class="flex items-center gap-2">
            <input class="q-input flex-1 pool-text" data-i="${i}" value="${q.text}" />
            <input class="q-input w-14 pool-xp" data-i="${i}" type="number" value="${q.xp}" />
            <button class="q-btn q-btn-danger text-xs px-2 pool-rm" data-i="${i}">×</button>
          </div>`).join('')}
      </div>
      <button id="pool-add" class="q-btn q-btn-ghost w-full mt-2">+ adicionar quest</button>
    </div>

    <div class="q-card p-4">
      <h3 class="font-bold mb-2">Dados</h3>
      <div class="flex gap-2">
        <button id="export-data" class="q-btn q-btn-ghost flex-1">Exportar JSON</button>
        <label class="q-btn q-btn-ghost flex-1 cursor-pointer text-center">
          Importar
          <input type="file" id="import-data" accept="application/json" class="hidden" />
        </label>
      </div>
      <button id="load-sample" class="q-btn q-btn-ghost w-full mt-2">📦 Carregar dados de exemplo</button>
      <button id="reset-data" class="q-btn q-btn-danger w-full mt-2">Apagar tudo</button>
      <p class="text-xs text-ink/50 dark:text-paper/50 mt-2 leading-relaxed">
        "Apagar tudo" volta o estado ao zero (Ferro 0 XP) — use se quiser recomeçar limpo.
      </p>
    </div>

    ${acc ? `
    <div class="q-card p-4" style="border:1px solid rgba(184,36,46,0.3)">
      <h3 class="font-bold mb-1 text-blood">⚠ Zona de perigo</h3>
      <p class="text-xs text-ink/55 dark:text-paper/55 leading-relaxed">
        Excluir a conta apaga <b>permanentemente</b>: rank, XP, treinos, medidas,
        livros, conquistas, fotos locais. ${cloudReady() ? 'A conta no Firebase também é removida (não dá pra desfazer).' : ''}
      </p>
      <button id="cfg-delete" class="q-btn q-btn-danger w-full mt-3 text-sm">
        🗑️ Excluir minha conta
      </button>
    </div>` : ''}

    <div class="q-card p-4">
      <h3 class="font-bold mb-2">Sistema de rank</h3>
      <div class="space-y-1 text-sm">
        ${RANKS.map(r => `
          <div class="flex items-center justify-between">
            <span class="flex items-center gap-2">
              <span class="w-3 h-3 rounded-full" style="background:${r.color}"></span>
              <span class="font-semibold" style="color:${r.color}">${r.name}</span>
            </span>
            <span class="text-ink/55 dark:text-paper/55">${r.threshold}+ XP</span>
          </div>`).join('')}
      </div>
      <p class="text-xs text-ink/50 dark:text-paper/50 mt-3 leading-relaxed">
        Toda segunda, ${Math.round(RANK_DECAY*100)}% do rankXP some (decay).
        Manter Challenger exige ~${Math.round(RANKS.at(-1).threshold * RANK_DECAY)} XP/semana — quase teto absoluto.
      </p>
    </div>

    <div class="text-center text-xs text-ink/40 dark:text-paper/40 py-4">
      QUEST · v1 · feito pra você jogar a vida real
    </div>
  </section>
  `;
}

// ===== 7. ROUTER / TABBAR / MODAL ============================

function renderTabbar() {
  const items = [
    { key: 'home',     icon: I.home,   label: 'Início' },
    { key: 'workout',  icon: I.dumb,   label: 'Treino' },
    { key: 'nutri',    icon: I.bowl,   label: 'Nutri' },
    { key: 'goals',    icon: I.trophy, label: 'Metas' },
    { key: 'reading',  icon: I.book,   label: 'Leitura' },
    { key: 'body',     icon: I.body,   label: 'Corpo' },
  ];
  document.getElementById('tabbar').innerHTML = `
    <div class="flex gap-1">
      ${items.map(it => `
        <button class="tab-item ${currentTab===it.key?'is-active':''}" data-tab="${it.key}">
          ${it.icon}<span>${it.label}</span>
        </button>`).join('')}
    </div>`;
  document.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { vibrate(8); go(b.dataset.tab); });
}

function openModal(html) {
  const root = document.getElementById('modal-root');
  root.classList.remove('hidden');
  root.innerHTML = `
    <div class="absolute inset-0 bg-ink/40 backdrop-blur-sm" data-close></div>
    <div class="absolute inset-x-0 bottom-0 max-w-md mx-auto bg-paper dark:bg-navy rounded-t-3xl shadow-pop animate-pop-in overflow-hidden">
      ${html}
    </div>`;
  root.querySelector('[data-close]').onclick = closeModal;
  root.querySelectorAll('.modal-close').forEach((b) => (b.onclick = closeModal));
}

function closeModal() {
  const root = document.getElementById('modal-root');
  root.classList.add('hidden');
  root.innerHTML = '';
}

// ===== Handlers (delegados após cada render) =================

function attachHandlers() {
  document.getElementById('open-log')?.addEventListener('click', () => { vibrate(15); modalDailyLog(); });
  document.getElementById('open-rewards-daily')?.addEventListener('click', () => { vibrate(8); modalRewards(); });

  document.getElementById('toggle-dark')?.addEventListener('click', () => {
    state.user.darkMode = !state.user.darkMode;
    document.documentElement.classList.toggle('dark', state.user.darkMode);
    saveState(); render();
  });

  document.getElementById('reroll')?.addEventListener('click', () => {
    if (state.quests.dailyAssigned.rerolled) return;
    const isKpop = state.user.theme === 'kpop_anime' || !state.user.theme;
    const pool = state.quests.pool.filter((q) => isKpop || !q.kpopOnly);
    state.quests.dailyAssigned.items = sample(pool, 3);
    state.quests.dailyAssigned.completed = [];
    state.quests.dailyAssigned.rerolled = true;
    saveState(); render(); toast('🎲 Re-roll feito');
  });

  document.querySelectorAll('.quest-row').forEach((row) => {
    row.querySelector('.q-check').addEventListener('click', () => {
      const qid = row.dataset.quest;
      const done = state.quests.dailyAssigned.completed.includes(qid);
      let change = { changed: false };
      const q = state.quests.dailyAssigned.items.find((x) => x.id === qid);
      if (done) {
        state.quests.dailyAssigned.completed = state.quests.dailyAssigned.completed.filter((x) => x !== qid);
        change = addQuestXP(-(q?.xp || 1), q?.tag);
      } else {
        state.quests.dailyAssigned.completed.push(qid);
        confetti(500); vibrate(15);
        change = addQuestXP(q?.xp || 1, q?.tag);
        damageNumber(change.finalAmt, row);
        const mult = change.mult > 1 ? ` (combo ×${change.mult.toFixed(1)})` : '';
        if (change.mult > 1) toast(`COMBO ×${change.mult.toFixed(1)}!`);
        // Easter egg "TOASTY!" 5% das vezes
        if (Math.random() < 0.05) setTimeout(() => kombatOverlay('toasty'), 600);
      }
      saveState(); render();
      if (change.changed) levelUpOverlay(change.from, change.to, change.promoted);
    });
  });

  // Streak chips clicáveis = quick toggle do dia
  document.querySelectorAll('.streak-chip.is-clickable').forEach((b) => b.onclick = () => {
    const k = b.dataset.quick;
    if (!k) return;
    let log = state.dailyLogs.find((l) => l.date === todayISO());
    if (!log) {
      log = { date: todayISO(), training:{type:'descanso',done:false}, protein:{grams:0,hit:false},
              sleep:{hours:0}, reading:{minutes:0}, steps:0, buffs:[], notes:'', meals:[], xp:0 };
      state.dailyLogs.push(log);
    }
    if (k === 'treino') {
      const cur = !!log.training?.done;
      log.training = { type: log.training?.type || 'Treino livre', done: !cur };
      toast(cur ? 'Treino desmarcado' : '✓ Treino registrado');
    } else if (k === 'sono') {
      const cur = (log.sleep?.hours || 0) >= 7;
      log.sleep = { hours: cur ? 0 : 7 };
      toast(cur ? 'Sono desmarcado' : '✓ Sono 7h registrado');
    } else if (k === 'proteina') {
      const cur = !!log.protein?.hit;
      log.protein = { grams: cur ? 0 : META.protein, hit: !cur };
      toast(cur ? 'Proteína desmarcada' : '✓ Meta de proteína batida');
    } else if (k === 'leitura') {
      const cur = (log.reading?.minutes || 0) >= 15;
      log.reading = { minutes: cur ? 0 : 15 };
      toast(cur ? 'Leitura desmarcada' : '+15 min de leitura');
    }
    log.xp = computeDayXP(log);
    upsertDailyLog(log);
    vibrate(8);
    render();
  });

  document.getElementById('wq-toggle')?.addEventListener('click', () => {
    const wq = state.quests.weeklyCurrent;
    const target = wq.item?.target || 1;
    const wasCompleted = wq.completed;
    wq.completed = !wq.completed;
    wq.progress = wq.completed ? target : 0;
    let change = { changed: false };
    if (wq.completed) {
      change = addQuestXP(wq.item.xp);
      kombatOverlay('fatality');
    } else {
      change = addQuestXP(-wq.item.xp);
    }
    saveState(); render();
    if (change.changed) setTimeout(() => levelUpOverlay(change.from, change.to, change.promoted), 2900);
  });

  // Stepper de passos individuais do weekly quest
  document.querySelectorAll('.wq-step').forEach((btn) => btn.onclick = () => {
    const wq = state.quests.weeklyCurrent;
    if (!wq.item) return;
    const idx = +btn.dataset.idx;
    const target = wq.item.target || 1;
    const cur = wq.progress || 0;
    // Clicar num passo done desfaz tudo dali pra frente; clicar num pendente avança até ele inclusive
    let next;
    if (idx < cur) {
      next = idx; // desmarca este e os seguintes
    } else {
      next = idx + 1; // marca até aqui
    }
    const wasCompleted = wq.completed;
    wq.progress = next;
    wq.completed = next >= target;
    let change = { changed: false };
    if (!wasCompleted && wq.completed) {
      change = addQuestXP(wq.item.xp);
      kombatOverlay('fatality');
    } else if (wasCompleted && !wq.completed) {
      change = addQuestXP(-wq.item.xp);
    }
    vibrate(8);
    saveState(); render();
    if (change.changed) setTimeout(() => levelUpOverlay(change.from, change.to, change.promoted), 2900);
  });

  document.querySelectorAll('.tile-btn').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.target;
    const k = b.dataset.kind;
    if (k === 'modal') {
      if (t === 'sleep')        modalSleep();
      if (t === 'reading')      go('reading');  // virou tab principal
      if (t === 'rewards')      modalRewards();
      if (t === 'library')      modalLibrary();
      if (t === 'achievements') modalAchievements();
      if (t === 'choreo')       modalChoreo();
      if (t === 'challenge')    modalChallenge();
      if (t === 'compete')      modalCompete();
    } else go(t);
  }));

  // --- viewReading handlers ---
  (function attachReadingHandlers() {
    const disp = document.getElementById('reading-timer-tab');
    if (!disp) return;
    let remaining = 15 * 60;
    let intId = null;
    let startedAt = 0;
    function fmt(s) { return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`; }
    function tick() {
      remaining--;
      disp.textContent = fmt(Math.max(0, remaining));
      if (remaining <= 0) {
        clearInterval(intId); intId = null;
        vibrate([60,40,80]);
        recordReadingMinutes(15);
        toast('15 min completos 📖');
        confetti(800);
        render();
      }
    }
    document.getElementById('r-start-tab').onclick = () => {
      if (intId) return;
      remaining = 15 * 60;
      startedAt = Date.now();
      intId = setInterval(tick, 1000);
    };
    document.getElementById('r-stop-tab').onclick = () => {
      if (!intId) return;
      clearInterval(intId); intId = null;
      const elapsed = Math.round((Date.now() - startedAt) / 60000);
      if (elapsed > 0) { recordReadingMinutes(elapsed); toast(`Sessão de ${elapsed} min`); }
      render();
    };
    document.querySelectorAll('.r-quick').forEach((b) => b.onclick = () => {
      const min = +b.dataset.min;
      recordReadingMinutes(min);
      toast(`+${min} min de leitura 📖`);
      confetti(400);
      render();
    });
    document.querySelectorAll('.page-up-tab').forEach((b) => b.onclick = () => {
      const i = +b.dataset.i;
      state.books[i].currentPage = Math.min(state.books[i].totalPages, state.books[i].currentPage + 10);
      if (state.books[i].currentPage >= state.books[i].totalPages) {
        state.books[i].finishedAt = todayISO();
        toast(`📖 "${state.books[i].title}" concluído!`);
        confetti(1500);
      }
      saveState(); render();
    });
    document.querySelectorAll('.book-remove').forEach((b) => b.onclick = () => {
      const i = +b.dataset.i;
      if (!confirm(`Remover "${state.books[i].title}" da lista?`)) return;
      state.books.splice(i, 1);
      saveState(); render();
    });
    document.getElementById('book-form-tab')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const f = e.target;
      state.books.push({ title: f.title.value, totalPages: +f.pages.value || 200, currentPage: 0 });
      saveState(); render();
    });
  })();

  // Handlers da aba "Metas" (viewGoals)
  document.querySelectorAll('.goal-toggle').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const k = b.dataset.key;
    const arr = state.user.activeGoals || (state.user.activeGoals = []);
    const i = arr.indexOf(k);
    if (i >= 0) arr.splice(i, 1);
    else arr.push(k);
    saveState(); render();
  });
  // Wins semanais por meta
  document.querySelectorAll('.goal-win').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const k = b.dataset.key;
    state.user.goalWins = state.user.goalWins || [];
    state.user.goalWins.push({ key: k, date: todayISO(), ts: Date.now() });
    // Limita: máx 3 wins por meta/dia (evita spam)
    const todayWins = state.user.goalWins.filter((w) => w.key === k && w.date === todayISO());
    if (todayWins.length > 3) {
      toast('Máximo 3 wins por meta/dia');
      state.user.goalWins.pop();
      return;
    }
    // Bonus XP por win (1 XP cada, atributo correlato)
    const attrMap = { bracos:'forca', forca:'forca', peitoral:'forca', dorsal:'forca', ombros:'forca',
                      abdomen:'disciplina', cardio:'resistencia', calistenia:'resistencia', definicao:'disciplina' };
    addAttributeXP(attrMap[k] || 'vitalidade', 1);
    const change = gainXP(1, { attr: attrMap[k] || 'vitalidade' });
    saveState();
    vibrate(8);
    toast(`✓ +1 win em ${k}`);
    confetti(300);
    render();
    if (change.changed) levelUpOverlay(change.from, change.to, change.promoted);
  });
  // Upload de foto por meta (resize p/ 700px de largura, JPEG 0.82 — economiza localStorage)
  document.querySelectorAll('.goal-img-input').forEach((inp) => inp.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file, 700, 0.82);
      state.user.goalImages = state.user.goalImages || {};
      state.user.goalImages[inp.dataset.key] = dataUrl;
      saveState(); toast('Foto atualizada ✓'); render();
    } catch (err) {
      toast('Falha ao processar imagem');
      console.error(err);
    }
  });
  document.querySelectorAll('.goal-img-remove').forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    if (state.user.goalImages) delete state.user.goalImages[b.dataset.key];
    saveState(); render();
  });
  document.getElementById('open-challenges')?.addEventListener('click', modalChallenge);
  document.getElementById('challenge-reroll')?.addEventListener('click', () => render());
  document.querySelectorAll('.challenge-done').forEach((btn) => btn.onclick = () => {
    const id = btn.dataset.id;
    const xp = +btn.dataset.xp;
    const name = btn.dataset.name;
    if (!state.user.challengesDone) state.user.challengesDone = [];
    state.user.challengesDone.push({ id, name, date: todayISO() });
    addAttributeXP('forca', 2);
    const change = gainXP(xp, { attr: 'forca' });
    saveState();
    toast(`+${xp} XP — ${name} concluído 💪`);
    confetti(1100);
    vibrate(25);
    btn.disabled = true;
    btn.textContent = '✓ Concluído!';
    btn.classList.remove('q-btn-primary');
    btn.classList.add('q-btn-ghost');
    if (change.changed) setTimeout(() => kombatOverlay('brutality'), 400);
  });

  // Nutrição — busca + filtro de categoria combinados
  let _foodCat = 'all';
  const refreshFoods = () => {
    const q = (document.getElementById('food-search')?.value || '').toLowerCase().trim();
    let pool = _foodCat === 'all' ? FOOD_DB : FOOD_DB.filter(f => f.cat === _foodCat);
    if (q) pool = pool.filter(f => f.name.toLowerCase().includes(q) || (f.ko || '').includes(q));
    const limit = q ? pool.length : Math.min(pool.length, 14);
    document.getElementById('food-results').innerHTML = renderFoodList(pool.slice(0, q ? 50 : limit));
    bindFoodRows();
  };
  document.getElementById('food-search')?.addEventListener('input', refreshFoods);
  document.querySelectorAll('.food-cat-btn').forEach((b) => b.onclick = () => {
    _foodCat = b.dataset.cat;
    document.querySelectorAll('.food-cat-btn').forEach((x) => x.classList.toggle('is-kombat', x === b));
    refreshFoods();
  });
  bindFoodRows();
  document.querySelectorAll('.meal-rm').forEach(b => b.onclick = () => {
    const idx = +b.dataset.idx;
    const log = state.dailyLogs.find((l) => l.date === todayISO());
    if (log && log.meals) {
      log.meals.splice(idx, 1);
      const totalP = log.meals.reduce((a, m) => a + m.p, 0);
      log.protein = { grams: Math.round(totalP), hit: totalP >= META.protein };
      log.xp = computeDayXP(log);
      saveState(); render();
    }
  });

  document.getElementById('open-library')?.addEventListener('click', modalLibrary);
  document.querySelectorAll('.workout-start').forEach((b) => b.onclick = () => modalWorkoutSession(b.dataset.type));
  document.querySelectorAll('.workout-view').forEach((b) => b.onclick = () => {
    const w = state.workouts.find(x => x.date === b.dataset.date);
    if (w) modalWorkoutSession(w.type, w.date);
  });

  // --- Manual entry handlers ---
  const manualText = document.getElementById('manual-text');
  const manualDetected = document.getElementById('manual-detected');
  document.getElementById('manual-detect')?.addEventListener('click', () => {
    const exs = parseManualExercises(manualText?.value || '');
    if (!exs.length) { manualDetected.textContent = 'Digite ao menos um exercício.'; return; }
    const det = detectSplit(exs);
    manualDetected.innerHTML = `<span class="text-mint font-semibold">▸ ${det.type}</span> · <span class="opacity-70">${det.reason}</span>`;
  });
  document.getElementById('manual-save')?.addEventListener('click', () => {
    const exs = parseManualExercises(manualText?.value || '');
    if (!exs.length) { toast('Digite ao menos um exercício'); return; }
    const det = detectSplit(exs);
    const session = { date: todayISO(), type: det.type, exercises: exs };
    const idx = state.workouts.findIndex(w => w.date === session.date && w.type === session.type);
    if (idx >= 0) state.workouts[idx] = session;
    else state.workouts.push(session);
    // Atualiza log do dia (treino done)
    let log = state.dailyLogs.find(l => l.date === session.date);
    if (!log) {
      log = { date: session.date, training: { type: det.type, done: true }, protein:{grams:0,hit:false},
              sleep:{hours:0}, reading:{minutes:0}, steps:0, buffs:[], notes:'', meals:[], xp:0 };
      state.dailyLogs.push(log);
    } else { log.training = { type: det.type, done: true }; }
    log.xp = computeDayXP(log);
    addAttributeXP('forca', 2);
    saveState(); confetti(700); toast(`✓ ${det.type} · ${exs.length} exercícios`, 3200); render();
  });

  // --- Sugestão handlers ---
  const sugInput = document.getElementById('suggest-text');
  const sugOut   = document.getElementById('suggest-results');
  function runSuggest() {
    if (!sugInput) return;
    const { items, summary } = suggestExercises(sugInput.value);
    if (!items.length) {
      sugOut.innerHTML = `<div class="text-xs text-ink/55 dark:text-paper/55 italic">Nenhuma sugestão. Tente termos como "peito", "cardio", "calistenia"...</div>`;
      return;
    }
    sugOut.innerHTML = `
      <div class="text-[11px] uppercase tracking-wider text-ink/45 dark:text-paper/45 mt-2">${summary}</div>
      ${items.map(e => `
        <div class="flex items-start gap-2 py-1.5 border-b border-ink/5 dark:border-paper/5 last:border-0">
          <span class="w-1.5 h-1.5 mt-1.5 rounded-full bg-lavender shrink-0"></span>
          <div class="flex-1 min-w-0">
            <div class="font-semibold text-sm truncate">${e.name}</div>
            <div class="text-[11px] text-ink/55 dark:text-paper/55 truncate">${e.muscles || ''}${e._type ? ' · '+e._type : ''}</div>
          </div>
          <button class="text-[11px] text-mint font-semibold suggest-add" data-name="${e.name}">+ adicionar</button>
        </div>
      `).join('')}
      <button id="suggest-into-manual" class="q-btn q-btn-ghost w-full text-xs mt-2">📋 Copiar todos para o registro manual</button>
    `;
    sugOut.querySelectorAll('.suggest-add').forEach(b => b.onclick = () => {
      if (!manualText) return;
      manualText.value = (manualText.value ? manualText.value.replace(/\s*$/, '\n') : '') + b.dataset.name + '\n';
      document.getElementById('manual-card')?.setAttribute('open', '');
      toast(`+ ${b.dataset.name}`);
    });
    document.getElementById('suggest-into-manual')?.addEventListener('click', () => {
      if (!manualText) return;
      manualText.value = items.map(i => i.name).join('\n');
      document.getElementById('manual-card')?.setAttribute('open', '');
      toast('Copiado pro registro manual');
    });
  }
  document.getElementById('suggest-go')?.addEventListener('click', runSuggest);
  sugInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); runSuggest(); } });
  document.querySelectorAll('.suggest-preset').forEach(b => b.onclick = () => {
    if (sugInput) { sugInput.value = b.dataset.q; runSuggest(); }
  });

  // --- Descanso ativo shuffle ---
  document.getElementById('rest-shuffle')?.addEventListener('click', () => {
    state.user.activeRestRoll = (state.user.activeRestRoll || 0) + 1;
    const list = document.getElementById('rest-list');
    if (list) list.innerHTML = renderRestPicks(pickActiveRest());
    saveState();
  });

  document.getElementById('add-weight')?.addEventListener('click', modalWeightEntry);

  document.getElementById('photo-input')?.addEventListener('change', (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      state.photos.push({ date: todayISO(), type: state.photos.length % 2 ? 'side' : 'front', dataUrl: reader.result });
      saveState(); render(); toast('Foto salva');
    };
    reader.readAsDataURL(file);
  });

  document.getElementById('compare-photos')?.addEventListener('click', () => {
    const ps = state.photos.slice().reverse();
    openModal(`
      <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
        <h2 class="font-extrabold text-lg">Comparar</h2>
        <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
      </header>
      <div class="p-3 grid grid-cols-2 gap-2">
        <div>
          <div class="text-xs text-ink/50 mb-1">Mais antiga</div>
          <img src="${ps[ps.length-1].dataUrl}" class="w-full rounded-lg" />
          <div class="text-xs mt-1">${formatDateBR(ps[ps.length-1].date)}</div>
        </div>
        <div>
          <div class="text-xs text-ink/50 mb-1">Mais recente</div>
          <img src="${ps[0].dataUrl}" class="w-full rounded-lg" />
          <div class="text-xs mt-1">${formatDateBR(ps[0].date)}</div>
        </div>
      </div>`);
  });

  // Config
  document.querySelectorAll('.cfg-theme-choice').forEach((card) => card.onclick = () => {
    document.querySelectorAll('.cfg-theme-choice').forEach((c) => c.classList.remove('is-selected'));
    card.classList.add('is-selected');
    card.querySelector('input[type="radio"]').checked = true;
  });
  document.getElementById('cfg-save')?.addEventListener('click', () => {
    state.user.name  = document.getElementById('cfg-name').value || 'Jogador';
    state.user.goals = document.getElementById('cfg-goals').value;
    state.user.reminders.proteinTimes = document.getElementById('cfg-reminders').value.split(',').map(s=>s.trim()).filter(Boolean);
    const themePicked = document.querySelector('input[name="cfgTheme"]:checked')?.value;
    if (themePicked && THEMES[themePicked]) state.user.theme = themePicked;
    saveState(); toast('Configurações salvas'); render();
  });
  document.getElementById('cfg-logout')?.addEventListener('click', () => {
    if (!confirm('Sair da conta? Seus dados continuam salvos.')) return;
    logoutAccount();
  });
  document.getElementById('cfg-delete')?.addEventListener('click', async () => {
    const acc = currentAccount();
    if (!acc) return;
    const label = acc.email || acc.username;
    if (!confirm(`Excluir conta "${label}" PERMANENTEMENTE?\n\nIsso apaga rank, XP, treinos, medidas, livros, conquistas. Não dá pra desfazer.`)) return;
    if (!confirm('Última confirmação: tem certeza absoluta?')) return;
    let password = null;
    if (cloudReady()) {
      password = prompt('Digite sua senha pra confirmar a exclusão:');
      if (!password) return;
    }
    try {
      await deleteCurrentAccount({ password });
      alert('Conta excluída.');
      // No cloud, onAuthStateChanged dispara showAuthScreen; no local, chama manual
      if (!cloudReady()) showAuthScreen();
    } catch (e) {
      alert(e.message || 'Falha ao excluir a conta.');
    }
  });
  document.getElementById('cfg-migrate-cloud')?.addEventListener('click', modalMigrateToCloud);
  document.getElementById('cfg-login')?.addEventListener('click', () => {
    state = null;
    showAuthScreen('login');
  });
  document.getElementById('cfg-register')?.addEventListener('click', () => {
    state = null;
    showAuthScreen('register');
  });
  // "Promote": move state legado pra uma conta nova, preservando os dados atuais
  document.getElementById('cfg-promote')?.addEventListener('click', async () => {
    const username = prompt('Escolha um nome de usuário (≥2 letras):');
    if (!username || username.trim().length < 2) return;
    const pw1 = prompt('Defina uma senha (≥4 caracteres):');
    if (!pw1 || pw1.length < 4) return;
    const pw2 = prompt('Repita a senha:');
    if (pw1 !== pw2) { alert('Senhas não conferem.'); return; }
    try {
      const id = await createAccount({ username: username.trim(), password: pw1 });
      // Copia o state atual (legacy) pra chave da conta
      const legacy = localStorage.getItem(STORAGE_KEY);
      if (legacy) localStorage.setItem(stateKey(id), legacy);
      setSession(id);
      // Atualiza o user.name e remove o legacy pra evitar conflito futuro
      const fresh = JSON.parse(localStorage.getItem(stateKey(id)));
      fresh.user.name = username.trim();
      localStorage.setItem(stateKey(id), JSON.stringify(fresh));
      localStorage.removeItem(STORAGE_KEY);
      toast(`Conta "${username.trim()}" criada com seus dados`);
      bootGameState();
    } catch (e) {
      alert(e.message || 'Erro ao criar conta.');
    }
  });

  document.querySelectorAll('.pool-rm').forEach(b => b.onclick = () => {
    state.quests.pool.splice(+b.dataset.i, 1); saveState(); render();
  });
  document.getElementById('pool-add')?.addEventListener('click', () => {
    state.quests.pool.push({ id: 'q'+Date.now(), text: 'Nova quest', xp: 1, tag: '' });
    saveState(); render();
  });
  document.querySelectorAll('.pool-text').forEach(inp => inp.onchange = () => {
    state.quests.pool[+inp.dataset.i].text = inp.value; saveState();
  });
  document.querySelectorAll('.pool-xp').forEach(inp => inp.onchange = () => {
    state.quests.pool[+inp.dataset.i].xp = +inp.value || 1; saveState();
  });

  document.getElementById('export-data')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `quest-${todayISO()}.json`; a.click();
    URL.revokeObjectURL(url);
  });
  document.getElementById('import-data')?.addEventListener('change', (e) => {
    const f = e.target.files[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => { try { state = JSON.parse(r.result); saveState(); toast('Importado'); render(); } catch { toast('JSON inválido'); } };
    r.readAsText(f);
  });
  document.getElementById('reset-data')?.addEventListener('click', () => {
    if (confirm('Apagar TODOS os dados? Isso não pode ser desfeito.')) {
      localStorage.removeItem(STORAGE_KEY); state = makeEmptyState(); saveState(); render();
    }
  });
  document.getElementById('load-sample')?.addEventListener('click', () => {
    if (state.dailyLogs.length && !confirm('Isso vai SUBSTITUIR seus dados pelo exemplo. Continuar?')) return;
    state = makeEmptyState();
    seedSampleData();
    saveState();
    toast('📦 Dados de exemplo carregados');
    render();
  });
}

/** XP de quests (daily/weekly) — não passa pelo cap diário do log,
 *  e cada quest soma +1 ao contador total (achievement caçador). */
function addQuestXP(amount, tag) {
  const today = todayISO();
  let log = state.dailyLogs.find((l) => l.date === today);
  if (!log) {
    log = {
      date: today,
      training: { type: 'descanso', done: false },
      protein: { grams: 0, hit: false },
      sleep: { hours: 0 },
      reading: { minutes: 0 },
      steps: 0, buffs: [], notes: '', meals: [],
      xp: 0,
    };
    state.dailyLogs.push(log);
  }
  log.xp = (log.xp || 0) + amount;
  if (amount > 0) state.user.questsCompleted = (state.user.questsCompleted || 0) + 1;
  // Mapeia tag → atributo (vitalidade é o default das quests gerais)
  const attrMap = {
    treino: 'forca', cardio: 'resistencia', foco: 'sabedoria',
    nutri: 'disciplina', sono: 'disciplina', saúde: 'vitalidade',
    mente: 'vitalidade', 'k-pop': 'vitalidade',
  };
  const attr = attrMap[tag] || 'vitalidade';
  return gainXP(amount, { attr });
}

function bindFoodRows() {
  document.querySelectorAll('.food-row').forEach((b) => b.onclick = () => {
    const name = decodeURIComponent(b.dataset.name);
    modalFoodPortion(name);
  });
}

// ===== Helpers de formatação =================================

function formatDateBR(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ===== 8. INIT ===============================================

/** Roda toda segunda-feira (ou no primeiro carregamento da nova semana).
 *  1) Registra histórico da semana anterior.
 *  2) Aplica decay no rankXP — esse é o "atrito" que dificulta segurar tiers altos.
 *  3) Desbloqueia skins por 3 semanas Platina+ seguidas. */
function checkWeeklyRollover() {
  const thisWeekStart = isoDate(startOfWeek());
  if (state.settings.lastDecayWeek === thisWeekStart) return;

  const prevStart = new Date(startOfWeek());
  prevStart.setDate(prevStart.getDate() - 7);
  const prevISO = isoDate(prevStart);

  if (!state.rankHistory.find(r => r.weekStart === prevISO)) {
    const xp = state.dailyLogs
      .filter(l => new Date(l.date) >= prevStart && new Date(l.date) < startOfWeek())
      .reduce((s, l) => s + (l.xp || 0), 0);
    if (xp > 0 || state.user.rankXP > 0) {
      // Aplica decay ANTES de registrar o snapshot (representa "semana fechada")
      const before = rankFromXP(state.user.rankXP);
      state.user.rankXP = Math.floor(state.user.rankXP * (1 - RANK_DECAY));
      const after = rankFromXP(state.user.rankXP);
      state.user.currentRank = after.key;

      const rk = rankFromXP(state.user.rankXP);
      state.rankHistory.push({
        weekStart: prevISO,
        rank: rk.key,
        xp,
        rankXP: state.user.rankXP,
      });

      // Skin: 3 semanas Platina+ seguidas
      const last3 = state.rankHistory.slice(-3);
      const elite = new Set(['platinum','emerald','diamond','master','grandmaster','challenger']);
      if (last3.length === 3 && last3.every(r => elite.has(r.rank))) {
        const newSkin = `Skin K-${state.rankHistory.length}`;
        if (!state.rewards.unlocked.includes(newSkin)) {
          state.rewards.unlocked.push(newSkin);
          setTimeout(() => toast(`🌟 Skin desbloqueada: ${newSkin}`), 600);
        }
      }
      // Avisa rebaixamento por decay (não overlay para não assustar logo na abertura)
      if (before.key !== after.key && RANKS.indexOf(after) < RANKS.indexOf(before)) {
        setTimeout(() => toast(`📉 Rebaixado por inatividade: ${after.name}`), 300);
      }
    }
  }
  state.settings.lastDecayWeek = thisWeekStart;
  saveState();
}

async function init() {
  // Espera o módulo Firebase carregar (max 1.5s; depois cai pra modo local).
  await waitForCloud();

  if (cloudReady()) {
    // Modo cloud: o estado de auth do Firebase rege a tela.
    showAuthLoading();
    window.QuestCloud.onAuthStateChanged(window.QuestCloud.auth, async (user) => {
      if (!user) { showAuthScreen(); return; }
      await bootGameState();
    });
    return;
  }

  // Modo local (fallback).
  const session = getSession();
  if (!session) { showAuthScreen(); return; }
  const acc = loadAccounts().find((a) => a.id === session);
  if (!acc) { setSession(null); showAuthScreen(); return; }
  bootGameState();
}

function showAuthLoading() {
  document.getElementById('tabbar').innerHTML = '';
  document.getElementById('app').innerHTML = `
    <div class="px-5 pt-16 text-center">
      <div class="kombat-tagline text-xs">⚔ QUEST ⚔</div>
      <div class="text-sm text-ink/55 dark:text-paper/55 mt-4">Conectando…</div>
    </div>`;
}

async function bootGameState() {
  // 1) Carrega cache local pra UI instantânea
  let local = loadState();
  // 2) Se tiver Firebase, busca o state da nuvem e mescla com fotos locais
  if (cloudReady() && window.QuestCloud.auth.currentUser) {
    const cloud = await loadCloudState(window.QuestCloud.auth.currentUser.uid);
    if (cloud) {
      state = mergeWithLocalMedia(cloud, local);
    } else if (local) {
      state = local;
    } else {
      state = makeEmptyState();
      const acc = currentAccount();
      if (acc) state.user.name = acc.username;
    }
    // Migra: state local pré-existente sem nuvem → faz upload inicial
    migrateState(state);
    saveState();
  } else {
    state = local;
    if (!state) {
      state = makeEmptyState();
      const acc = currentAccount();
      if (acc) state.user.name = acc.username;
      saveState();
    }
  }
  if (state.user.darkMode) document.documentElement.classList.add('dark');
  applyTheme();
  ensureDailyQuests();
  ensureWeeklyQuest();
  checkWeeklyRollover();
  setTimeout(checkAchievements, 100);
  render();
}

/** Aplica o tema do usuário (data-theme no <html>). */
function applyTheme() {
  const t = state?.user?.theme && THEMES[state.user.theme] ? state.user.theme : 'kpop_anime';
  document.documentElement.dataset.theme = t;
}

/** Renderiza tela de login/cadastro sem tabbar. */
function showAuthScreen(mode = 'login') {
  document.getElementById('tabbar').innerHTML = '';
  const app = document.getElementById('app');
  const cloud = cloudReady();
  app.innerHTML = `
    <div class="px-5 pt-12 pb-8">
      <div class="kombat-tagline text-xs">⚔ QUEST ⚔</div>
      <h1 class="text-3xl font-extrabold mt-1">${mode === 'register' ? 'Criar conta' : 'Entrar'}</h1>
      <p class="text-sm text-ink/55 dark:text-paper/55 mt-1">
        ${mode === 'register'
          ? (cloud ? 'Use um email e senha. Sua conta sincroniza entre celular e PC.' : 'Escolha um usuário e uma senha. Seus dados ficam só neste dispositivo.')
          : (cloud ? 'Entre com email e senha. Sem conta? Cadastre-se abaixo.' : 'Use seu usuário e senha. Sem conta? Cadastre-se abaixo.')}
      </p>
      ${cloud ? '<div class="text-[10px] text-mint mt-1">☁ sincronização ativa</div>' : '<div class="text-[10px] text-ink/45 dark:text-paper/45 mt-1">⚠ modo offline (sem sincronização)</div>'}
    </div>
    <div class="px-5 space-y-3">
      <form id="auth-form" class="q-card p-4 space-y-3">
        <label class="block">
          <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">${cloud ? 'Email' : 'Usuário'}</div>
          <input class="q-input w-full mt-1" name="username" type="${cloud ? 'email' : 'text'}" autocomplete="${cloud ? 'email' : 'username'}" placeholder="${cloud ? 'voce@exemplo.com' : 'ex: ueg, jogador1'}" required ${cloud ? '' : 'minlength="2"'} />
        </label>
        <label class="block">
          <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Senha</div>
          <input class="q-input w-full mt-1" type="password" name="password" autocomplete="${mode === 'register' ? 'new-password' : 'current-password'}" placeholder="${cloud ? 'mínimo 6 caracteres' : 'mínimo 4 caracteres'}" required minlength="${cloud ? 6 : 4}" />
        </label>
        ${mode === 'register' ? `
          <label class="block">
            <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Confirmar senha</div>
            <input class="q-input w-full mt-1" type="password" name="password2" autocomplete="new-password" placeholder="repita a senha" required minlength="4" />
          </label>
          <div>
            <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45 mb-2">Estética</div>
            <div class="grid grid-cols-2 gap-2">
              ${Object.entries(THEMES).map(([key, t], i) => `
                <label class="theme-choice q-card p-3 cursor-pointer" data-theme="${key}">
                  <input type="radio" name="theme" value="${key}" class="hidden" ${i === 0 ? 'checked' : ''} />
                  <div class="text-[10px] tracking-widest uppercase" style="color:${t.accent}">${t.short}</div>
                  <div class="font-bold mt-1 leading-tight">${t.name}</div>
                  <div class="text-[10px] text-ink/55 dark:text-paper/55 mt-1 leading-tight">${t.sub}</div>
                </label>
              `).join('')}
            </div>
          </div>
        ` : ''}
        <div id="auth-error" class="text-xs text-blood min-h-[1em]"></div>
        <button class="q-btn q-btn-primary w-full" type="submit">
          ${mode === 'register' ? '✓ Criar e entrar' : '→ Entrar'}
        </button>
      </form>

      <button id="auth-toggle" class="q-btn q-btn-ghost w-full text-sm">
        ${mode === 'register' ? 'Já tenho conta — entrar' : 'Não tenho conta — cadastrar'}
      </button>

      ${!cloud && loadAccounts().length > 0 && mode === 'login' ? `
        <div class="q-card p-3">
          <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45 mb-2">Contas neste dispositivo</div>
          <div class="space-y-1">
            ${loadAccounts().map((a) => `
              <button class="auth-quickuser flex items-center w-full p-2 rounded hover:bg-ink/5 dark:hover:bg-paper/5" data-user="${a.username}">
                <span class="w-8 h-8 rounded-full bg-lavender/20 flex items-center justify-center font-bold text-sm">${a.username.slice(0,1).toUpperCase()}</span>
                <span class="ml-3 font-semibold text-sm">${a.username}</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;

  const form = document.getElementById('auth-form');
  const err  = document.getElementById('auth-error');
  form.onsubmit = async (e) => {
    e.preventDefault();
    err.textContent = '';
    const data = Object.fromEntries(new FormData(form));
    try {
      if (mode === 'register') {
        if (data.password !== data.password2) throw new Error('Senhas não conferem.');
        const wasFirstAccount = cloudReady() ? false : loadAccounts().length === 0;
        const legacy = wasFirstAccount ? localStorage.getItem(STORAGE_KEY) : null;
        const id = await createAccount({ username: data.username, password: data.password });
        if (!cloudReady()) setSession(id);
        const chosenTheme = THEMES[data.theme] ? data.theme : 'kpop_anime';
        // Prepara state inicial
        let initial;
        if (legacy) {
          try {
            initial = JSON.parse(legacy);
            initial.user = initial.user || {};
            initial.user.name  = data.username.includes('@') ? data.username.split('@')[0] : data.username;
            initial.user.theme = chosenTheme;
          } catch { initial = null; }
        }
        if (!initial) {
          initial = makeEmptyState();
          initial.user.theme = chosenTheme;
          initial.user.name  = data.username.includes('@') ? data.username.split('@')[0] : data.username;
          const themeQuests = THEMES[chosenTheme].quests || [];
          initial.quests.pool = [...DEFAULT_QUEST_POOL, ...themeQuests];
          const themeRewards = THEMES[chosenTheme].rewards || [];
          if (themeRewards.length) {
            initial.rewards.available = [
              ...themeRewards,
              'Cinema sozinho',
              'Sessão de fotos',
              'Comprar lightstick novo',
            ];
          }
        }
        try { localStorage.setItem(stateKey(id), JSON.stringify(initial)); } catch {}
        if (legacy) localStorage.removeItem(STORAGE_KEY);
        // Em modo cloud, o onAuthStateChanged chama bootGameState
        if (!cloudReady()) bootGameState();
      } else {
        await loginAccount({ username: data.username, password: data.password });
        if (!cloudReady()) {
          // setSession já foi feito por loginAccount no path local
          // Mas precisa explicitar:
          const accs = loadAccounts();
          const a = accs.find(x => x.username.toLowerCase() === data.username.trim().toLowerCase());
          if (a) setSession(a.id);
          bootGameState();
        }
        // Em modo cloud, onAuthStateChanged dispara
      }
    } catch (ex) {
      err.textContent = ex.message || 'Erro inesperado.';
    }
  };
  document.getElementById('auth-toggle').onclick = () => showAuthScreen(mode === 'register' ? 'login' : 'register');
  document.querySelectorAll('.auth-quickuser').forEach((b) => b.onclick = () => {
    form.username.value = b.dataset.user;
    form.password.focus();
  });
  // Visual selecionado nos chips de tema
  document.querySelectorAll('.theme-choice').forEach((card) => {
    card.onclick = () => {
      document.querySelectorAll('.theme-choice').forEach((c) => c.classList.remove('is-selected'));
      card.classList.add('is-selected');
      card.querySelector('input[type="radio"]').checked = true;
    };
  });
  document.querySelector('.theme-choice[data-theme="kpop"]')?.classList.add('is-selected');
}

init();
