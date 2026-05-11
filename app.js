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
  { id: 'q01', text: 'Beber 2L de água',                            xp: 1, tag: 'saúde',  ko: '물 2L' },
  { id: 'q02', text: 'Exposição ao sol 10 min',                     xp: 1, tag: 'saúde',  ko: '햇볕 쬐기' },
  { id: 'q03', text: 'Vitamina D 5000 UI',                          xp: 1, tag: 'saúde',  ko: '비타민' },
  { id: 'q04', text: 'Suco verde / chá matcha pela manhã',          xp: 1, tag: 'saúde',  ko: '녹차' },
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
  { id: 'q17', text: 'Refeição com kimchi/fermentado',              xp: 1, tag: 'nutri',  ko: '김치' },
  { id: 'q18', text: 'Bibimbap ou tigela proteica caseira',         xp: 2, tag: 'nutri',  ko: '비빔밥' },
  { id: 'q19', text: 'Não pular o café da manhã',                   xp: 1, tag: 'nutri',  ko: '아침' },
  // Sono
  { id: 'q20', text: 'Dormir antes de 23:30',                       xp: 2, tag: 'sono',   ko: '일찍 자기' },
  { id: 'q21', text: 'Sem celular 30 min antes de dormir',          xp: 2, tag: 'sono',   ko: '핸드폰 멀리' },
  { id: 'q22', text: 'Cortar cafeína após 14h',                     xp: 1, tag: 'sono',   ko: '커피 차단' },
  { id: 'q23', text: 'Janela escurecida ao deitar',                 xp: 1, tag: 'sono',   ko: '암막' },
  // Foco/leitura
  { id: 'q24', text: 'Ler 15 min',                                  xp: 1, tag: 'foco',   ko: '독서' },
  { id: 'q25', text: 'Ler 30 min (sessão profunda)',                xp: 2, tag: 'foco',   ko: '깊은 독서' },
  { id: 'q26', text: 'Estudar coreano 15 min (Hangul/vocab)',       xp: 2, tag: 'foco',   ko: '한국어' },
  { id: 'q27', text: 'Escrever 3 coisas pelas quais é grato',       xp: 1, tag: 'foco',   ko: '감사 일기' },
  { id: 'q28', text: '25 min Pomodoro sem distração',               xp: 2, tag: 'foco',   ko: '뽀모도로' },
  // Mente
  { id: 'q29', text: 'Meditar 5 min',                               xp: 1, tag: 'mente',  ko: '명상' },
  { id: 'q30', text: 'Respiração 4-7-8 (3 ciclos)',                 xp: 1, tag: 'mente',  ko: '호흡' },
  { id: 'q31', text: 'Banho frio 60s no fim',                       xp: 2, tag: 'mente',  ko: '냉수 샤워' },
  // Cultura K
  { id: 'q32', text: 'Ouvir 1 música em coreano',                   xp: 1, tag: 'k-pop',  ko: 'K-pop' },
  { id: 'q33', text: 'Assistir vídeo dança K-pop e tentar 1 move',  xp: 1, tag: 'k-pop',  ko: '안무' },
  { id: 'q34', text: 'Variety K (Knowing Bros, RM) 1 episódio',     xp: 1, tag: 'k-pop',  ko: '예능' },
  { id: 'q35', text: 'Escrever post-it com palavra coreana nova',   xp: 1, tag: 'k-pop',  ko: '단어' },
];

// Pool de weekly quests — 20 desafios maiores que valem mais XP (주간 미션).
const DEFAULT_WEEKLY_POOL = [
  { id: 'w01', text: 'Bater 145g de proteína em 5 dias',            xp:  8 },
  { id: 'w02', text: '4 treinos completados',                       xp: 10 },
  { id: 'w03', text: 'Dormir >7h em 5 noites',                      xp:  8 },
  { id: 'w04', text: '3 sessões de leitura de 15min',               xp:  6 },
  { id: 'w05', text: '8k passos em 5 dias',                         xp:  6 },
  { id: 'w06', text: 'Cozinhar 3 refeições caseiras com proteína',  xp:  7 },
  { id: 'w07', text: 'Sem açúcar processado em 4 dias',             xp: 10 },
  { id: 'w08', text: 'Estudar coreano em 5 dias diferentes',        xp:  8 },
  { id: 'w09', text: 'Bater PR em 1 exercício composto',            xp: 12 },
  { id: 'w10', text: '1 sessão de dança K-pop completa (45min+)',   xp:  8 },
  { id: 'w11', text: '5 dias sem celular após 22h',                 xp: 10 },
  { id: 'w12', text: 'Tomar sol 10min em 5 dias',                   xp:  6 },
  { id: 'w13', text: 'Finalizar 1 livro / 1 capítulo importante',   xp:  8 },
  { id: 'w14', text: 'Meditar 5 min em 5 dias',                     xp:  6 },
  { id: 'w15', text: 'Banho frio em 4 dias',                        xp:  9 },
  { id: 'w16', text: 'Comer fermentado (kimchi/iogurte) 5x',        xp:  7 },
  { id: 'w17', text: 'Sequência perfeita: 7 dias com log completo', xp: 14 },
  { id: 'w18', text: 'Visitar restaurante coreano / cozinhar prato', xp: 6 },
  { id: 'w19', text: 'Aprender 1 coreografia inteira (1 música)',   xp: 12 },
  { id: 'w20', text: 'Tirar foto progresso (frontal + lateral)',    xp:  5 },
];

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

// Frases curtas pra trigger de eventos especiais (overlays).
const KOMBAT_EVENTS = {
  flawless:  { title: 'FLAWLESS VICTORY',    sub: 'Dia 7/7 XP — perfeito' },
  fatality:  { title: 'FATALITY',            sub: 'Weekly quest derrotada' },
  brutality: { title: 'BRUTALITY',           sub: 'PERSONAL RECORD batido' },
  finish:    { title: 'FINISH IT!',          sub: 'Dia registrado' },
  outstanding:{ title: 'OUTSTANDING!',       sub: 'Promoção de rank' },
  toasty:    { title: 'TOASTY!',             sub: 'Surpresa de combo' },
};

// Lutadores Mortal Kombat — SVGs estilizados (fan-art geométrica).
// Cada lutador é mascote de um atributo + aparece em overlays + banner.
// Construídos com formas geométricas pra identidade clara sem violar copyright.
const FIGHTERS = {
  // KANO — implante laser vermelho no olho direito, faca, peito tatuado, careca.
  // Atributo: FORÇA. Overlay: BRUTALITY.
  kano: { name: 'Kano', accent: '#B8242E', tagline: 'BRUTAL POWER', attr: 'forca', svg: `
    <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- cabeça careca -->
      <ellipse cx="100" cy="55" rx="36" ry="42" fill="#D4A574" stroke="#1A1A2E" stroke-width="2.5"/>
      <!-- sobrancelha esquerda -->
      <path d="M70 48 L88 44" stroke="#1A1A2E" stroke-width="3.5" stroke-linecap="round"/>
      <!-- olho esquerdo -->
      <circle cx="82" cy="58" r="3" fill="#1A1A2E"/>
      <!-- implante laser direito (placa metálica + olho vermelho brilhante) -->
      <path d="M108 38 L138 42 L140 70 L110 72 Z" fill="#888" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M114 44 L130 46 L132 64 L116 66 Z" fill="#444"/>
      <circle cx="123" cy="55" r="6" fill="#FF1818"/>
      <circle cx="123" cy="55" r="2.5" fill="#FFE0E0"/>
      <!-- linha vermelha lateral (laser scan) -->
      <line x1="140" y1="55" x2="195" y2="55" stroke="#FF1818" stroke-width="1.5" opacity="0.5" stroke-dasharray="3 3"/>
      <!-- barba/queixo -->
      <path d="M76 78 Q100 92 124 78" stroke="#1A1A2E" stroke-width="2.5" fill="none"/>
      <!-- pescoço grosso -->
      <rect x="84" y="92" width="32" height="14" fill="#D4A574" stroke="#1A1A2E" stroke-width="2"/>
      <!-- ombros largos + camiseta preta sem manga -->
      <path d="M45 130 Q50 108 90 105 L110 105 Q150 108 155 130 L155 195 L45 195 Z" fill="#1A1A2E" stroke="#1A1A2E" stroke-width="2"/>
      <!-- braços musculosos (bíceps) -->
      <ellipse cx="42" cy="155" rx="18" ry="36" fill="#D4A574" stroke="#1A1A2E" stroke-width="2"/>
      <ellipse cx="158" cy="155" rx="18" ry="36" fill="#D4A574" stroke="#1A1A2E" stroke-width="2"/>
      <!-- veias bíceps -->
      <path d="M38 145 Q44 155 38 165" stroke="#8B5A3C" stroke-width="1.5" fill="none"/>
      <path d="M162 145 Q156 155 162 165" stroke="#8B5A3C" stroke-width="1.5" fill="none"/>
      <!-- caveira no peito (tatuagem) -->
      <circle cx="100" cy="140" r="10" fill="none" stroke="#B8242E" stroke-width="2"/>
      <circle cx="96" cy="138" r="2" fill="#B8242E"/>
      <circle cx="104" cy="138" r="2" fill="#B8242E"/>
      <path d="M94 145 L98 147 L100 144 L102 147 L106 145" stroke="#B8242E" stroke-width="1.5" fill="none"/>
      <!-- faca na mão direita (Kano blade) -->
      <path d="M178 178 L196 168 L198 174 L182 184 Z" fill="#C0C0C0" stroke="#1A1A2E" stroke-width="1.5"/>
      <rect x="172" y="180" width="10" height="14" rx="2" fill="#1A1A2E"/>
    </svg>` },

  // JOHNNY CAGE — óculos escuros, jaqueta verde com JC, smirk, dedinho apontando.
  // Atributo: VITALIDADE (Hollywood vibes). Overlay: TOASTY.
  cage: { name: 'Johnny Cage', accent: '#3FBF7F', tagline: 'HOLLYWOOD APPROVES', attr: 'vitalidade', svg: `
    <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- cabelo preto curto -->
      <path d="M62 42 Q70 18 100 16 Q130 18 138 42 L136 60 L64 60 Z" fill="#2A2A2A" stroke="#1A1A2E" stroke-width="2"/>
      <!-- rosto -->
      <ellipse cx="100" cy="62" rx="34" ry="40" fill="#F0C8A0" stroke="#1A1A2E" stroke-width="2.5"/>
      <!-- óculos escuros (cool sunglasses) -->
      <rect x="68" y="54" width="28" height="14" rx="3" fill="#1A1A2E" stroke="#1A1A2E" stroke-width="2"/>
      <rect x="104" y="54" width="28" height="14" rx="3" fill="#1A1A2E" stroke="#1A1A2E" stroke-width="2"/>
      <line x1="96" y1="60" x2="104" y2="60" stroke="#1A1A2E" stroke-width="3"/>
      <!-- reflexo nos óculos -->
      <path d="M72 56 L92 56" stroke="#FFF" stroke-width="2" opacity="0.6"/>
      <path d="M108 56 L128 56" stroke="#FFF" stroke-width="2" opacity="0.6"/>
      <!-- sorriso confiante -->
      <path d="M86 85 Q100 96 116 85" stroke="#1A1A2E" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <!-- queixo / sombra -->
      <path d="M100 95 Q104 99 100 102" stroke="#1A1A2E" stroke-width="1" fill="none" opacity="0.4"/>
      <!-- pescoço -->
      <rect x="86" y="100" width="28" height="14" fill="#F0C8A0" stroke="#1A1A2E" stroke-width="2"/>
      <!-- jaqueta verde + camiseta preta -->
      <path d="M55 200 L55 130 Q60 115 88 110 L100 130 L112 110 Q140 115 145 130 L145 200 Z" fill="#3FBF7F" stroke="#1A1A2E" stroke-width="2"/>
      <!-- gola da jaqueta -->
      <path d="M82 110 L100 142 L118 110 L130 132 L120 200 M82 110 L70 132 L80 200" fill="#2A8C5A" stroke="#1A1A2E" stroke-width="1.5"/>
      <!-- camiseta preta debaixo -->
      <path d="M100 130 L88 140 L100 150 L112 140 Z" fill="#1A1A2E"/>
      <!-- JC no peito (badge) -->
      <circle cx="100" cy="170" r="13" fill="#FFE89E" stroke="#1A1A2E" stroke-width="2"/>
      <text x="100" y="175" text-anchor="middle" font-family="Russo One, Impact, sans-serif" font-size="13" font-weight="800" fill="#1A1A2E">JC</text>
      <!-- braços (jaqueta) -->
      <path d="M55 130 L38 200 L52 205 L62 138 Z" fill="#3FBF7F" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M145 130 L162 200 L148 205 L138 138 Z" fill="#3FBF7F" stroke="#1A1A2E" stroke-width="2"/>
      <!-- mão direita apontando (signature pose) -->
      <circle cx="166" cy="206" r="9" fill="#F0C8A0" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M170 208 L188 196" stroke="#F0C8A0" stroke-width="6" stroke-linecap="round"/>
      <path d="M170 208 L188 196" stroke="#1A1A2E" stroke-width="1.5" fill="none"/>
    </svg>` },

  // SCORPION — máscara amarela, bandana ninja, olhos brancos vazios, kunai.
  // Atributo: nenhum direto. Overlay: FATALITY ("GET OVER HERE!").
  scorpion: { name: 'Scorpion', accent: '#E8C56B', tagline: 'GET OVER HERE!', attr: null, svg: `
    <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- bandana ninja amarela com 2 pontas -->
      <path d="M58 38 Q100 18 142 38 L150 28 L155 50 L142 56 Q100 50 58 56 L45 50 L50 28 Z" fill="#E8C56B" stroke="#1A1A2E" stroke-width="2.5"/>
      <!-- bandana ponta tras balançando -->
      <path d="M50 50 L20 70 L25 85 L52 65" fill="#E8C56B" stroke="#1A1A2E" stroke-width="2"/>
      <!-- rosto/máscara amarela -->
      <ellipse cx="100" cy="78" rx="36" ry="44" fill="#E8C56B" stroke="#1A1A2E" stroke-width="2.5"/>
      <!-- máscara ninja inferior preta (cobre boca/nariz) -->
      <path d="M68 84 Q100 78 132 84 L134 120 Q100 130 66 120 Z" fill="#1A1A2E" stroke="#1A1A2E" stroke-width="2"/>
      <!-- detalhe da máscara (linhas) -->
      <line x1="78" y1="100" x2="122" y2="100" stroke="#666" stroke-width="1.5"/>
      <line x1="80" y1="112" x2="120" y2="112" stroke="#666" stroke-width="1.5"/>
      <!-- olhos vazios brancos (Hanzo undead) -->
      <ellipse cx="84" cy="68" rx="6" ry="4" fill="#FFFFFF" stroke="#1A1A2E" stroke-width="1.5"/>
      <ellipse cx="116" cy="68" rx="6" ry="4" fill="#FFFFFF" stroke="#1A1A2E" stroke-width="1.5"/>
      <!-- chamas saindo dos olhos -->
      <path d="M82 60 Q84 50 86 58 Q88 50 86 60" fill="#E84A1A" stroke="#B8242E" stroke-width="1"/>
      <path d="M114 60 Q116 50 118 58 Q120 50 118 60" fill="#E84A1A" stroke="#B8242E" stroke-width="1"/>
      <!-- pescoço -->
      <rect x="86" y="128" width="28" height="12" fill="#E8C56B" stroke="#1A1A2E" stroke-width="2"/>
      <!-- traje amarelo torso -->
      <path d="M55 200 L55 145 Q60 130 90 128 L110 128 Q140 130 145 145 L145 200 Z" fill="#E8C56B" stroke="#1A1A2E" stroke-width="2"/>
      <!-- detalhes pretos faixa central -->
      <rect x="92" y="140" width="16" height="60" fill="#1A1A2E"/>
      <circle cx="100" cy="160" r="4" fill="#E8C56B"/>
      <circle cx="100" cy="180" r="4" fill="#E8C56B"/>
      <!-- braços -->
      <path d="M55 145 L40 200 L54 205 L62 152 Z" fill="#E8C56B" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M145 145 L160 200 L146 205 L138 152 Z" fill="#E8C56B" stroke="#1A1A2E" stroke-width="2"/>
      <!-- mão direita segurando kunai/spear -->
      <circle cx="164" cy="210" r="8" fill="#1A1A2E"/>
      <path d="M168 208 L196 200 L198 207 L170 215 Z" fill="#C0C0C0" stroke="#1A1A2E" stroke-width="1.5"/>
      <!-- corrente do spear -->
      <path d="M170 212 Q180 218 190 214" stroke="#888" stroke-width="2" fill="none" stroke-dasharray="3 2"/>
    </svg>` },

  // SUB-ZERO — máscara azul, capuz, gelo nas mãos.
  // Atributo: DISCIPLINA. Overlay: nenhum direto (BRUTALITY já é Kano).
  subzero: { name: 'Sub-Zero', accent: '#7BB8FF', tagline: 'FROZEN DISCIPLINE', attr: 'disciplina', svg: `
    <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- capuz azul -->
      <path d="M55 60 Q60 22 100 18 Q140 22 145 60 L145 90 Q130 88 100 88 Q70 88 55 90 Z" fill="#3A7BC8" stroke="#1A1A2E" stroke-width="2.5"/>
      <!-- rosto (parte exposta) -->
      <ellipse cx="100" cy="68" rx="28" ry="32" fill="#E0D5C0" stroke="#1A1A2E" stroke-width="2"/>
      <!-- máscara azul inferior -->
      <path d="M75 76 Q100 70 125 76 L128 110 Q100 118 72 110 Z" fill="#5A9BE0" stroke="#1A1A2E" stroke-width="2"/>
      <!-- olhos azul-gelo brilhantes -->
      <ellipse cx="88" cy="62" rx="5" ry="3.5" fill="#A8E0FF" stroke="#1A1A2E" stroke-width="1.5"/>
      <ellipse cx="112" cy="62" rx="5" ry="3.5" fill="#A8E0FF" stroke="#1A1A2E" stroke-width="1.5"/>
      <!-- raio gelado lateral -->
      <path d="M70 50 L60 40 M68 56 L52 52 M132 56 L148 52 M130 50 L140 40"
            stroke="#A8E0FF" stroke-width="1.5" stroke-linecap="round"/>
      <!-- pescoço -->
      <rect x="88" y="116" width="24" height="12" fill="#E0D5C0" stroke="#1A1A2E" stroke-width="2"/>
      <!-- torso azul + faixa preta -->
      <path d="M58 200 L58 135 Q62 122 90 118 L110 118 Q138 122 142 135 L142 200 Z" fill="#3A7BC8" stroke="#1A1A2E" stroke-width="2"/>
      <rect x="58" y="148" width="84" height="10" fill="#1A1A2E"/>
      <!-- dragão Lin Kuei no peito -->
      <circle cx="100" cy="175" r="11" fill="none" stroke="#A8E0FF" stroke-width="2"/>
      <path d="M94 173 Q100 168 106 173 Q100 180 94 173" fill="#A8E0FF"/>
      <!-- braços -->
      <path d="M58 135 L42 200 L56 205 L66 142 Z" fill="#3A7BC8" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M142 135 L158 200 L144 205 L134 142 Z" fill="#3A7BC8" stroke="#1A1A2E" stroke-width="2"/>
      <!-- mão direita com gelo cristalino brotando -->
      <circle cx="162" cy="208" r="9" fill="#E0D5C0" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M168 200 L178 186 L182 200 L194 195 L186 210 L196 218 L180 218 L182 232 L170 222 Z"
            fill="#A8E0FF" stroke="#7BB8FF" stroke-width="1.5"/>
    </svg>` },

  // RAIDEN — chapéu de palha cônico, raios saindo das mãos, manto branco.
  // Atributo: SABEDORIA. Overlay: OUTSTANDING.
  raiden: { name: 'Raiden', accent: '#FFE08F', tagline: 'THUNDER GOD', attr: 'sabedoria', svg: `
    <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- chapéu cônico (kasa) -->
      <path d="M45 70 L100 14 L155 70 Z" fill="#C49B5C" stroke="#1A1A2E" stroke-width="2.5"/>
      <ellipse cx="100" cy="70" rx="58" ry="10" fill="#A57B40" stroke="#1A1A2E" stroke-width="2"/>
      <!-- linhas verticais do chapéu -->
      <line x1="78" y1="50" x2="80" y2="68" stroke="#1A1A2E" stroke-width="1" opacity="0.4"/>
      <line x1="100" y1="30" x2="100" y2="68" stroke="#1A1A2E" stroke-width="1" opacity="0.4"/>
      <line x1="122" y1="50" x2="120" y2="68" stroke="#1A1A2E" stroke-width="1" opacity="0.4"/>
      <!-- rosto sombreado pelo chapéu -->
      <ellipse cx="100" cy="92" rx="28" ry="28" fill="#D4A574" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M72 80 Q100 96 128 80 L128 92 Q100 100 72 92 Z" fill="#1A1A2E" opacity="0.5"/>
      <!-- olhos brilhantes brancos (Thunder God) -->
      <ellipse cx="88" cy="92" rx="6" ry="3" fill="#FFFFFF"/>
      <ellipse cx="112" cy="92" rx="6" ry="3" fill="#FFFFFF"/>
      <!-- raios saindo dos olhos -->
      <line x1="84" y1="88" x2="76" y2="82" stroke="#FFE08F" stroke-width="2" stroke-linecap="round"/>
      <line x1="116" y1="88" x2="124" y2="82" stroke="#FFE08F" stroke-width="2" stroke-linecap="round"/>
      <!-- boca/queixo -->
      <path d="M88 110 Q100 116 112 110" stroke="#1A1A2E" stroke-width="2" fill="none"/>
      <!-- manto branco -->
      <path d="M50 200 L60 132 Q70 122 90 122 L110 122 Q130 122 140 132 L150 200 Z" fill="#F5F2E8" stroke="#1A1A2E" stroke-width="2"/>
      <!-- detalhe do manto (cinto vermelho) -->
      <rect x="56" y="162" width="88" height="8" fill="#B8242E" stroke="#1A1A2E" stroke-width="1.5"/>
      <!-- raio no peito -->
      <path d="M104 130 L92 152 L100 152 L94 170 L110 148 L102 148 Z" fill="#FFE08F" stroke="#1A1A2E" stroke-width="1.5"/>
      <!-- braços com mãos eletrificadas -->
      <path d="M60 132 L45 195 L58 200 L70 138 Z" fill="#F5F2E8" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M140 132 L155 195 L142 200 L130 138 Z" fill="#F5F2E8" stroke="#1A1A2E" stroke-width="2"/>
      <!-- bolas de raios nas mãos -->
      <circle cx="42" cy="205" r="14" fill="#FFE08F" opacity="0.4"/>
      <circle cx="42" cy="205" r="9"  fill="#FFE08F"/>
      <path d="M42 196 L40 202 L44 202 L40 210 L46 200 L42 200 Z" fill="#FFF" stroke="#1A1A2E" stroke-width="1"/>
      <circle cx="158" cy="205" r="14" fill="#FFE08F" opacity="0.4"/>
      <circle cx="158" cy="205" r="9"  fill="#FFE08F"/>
      <path d="M158 196 L156 202 L160 202 L156 210 L162 200 L158 200 Z" fill="#FFF" stroke="#1A1A2E" stroke-width="1"/>
    </svg>` },

  // LIU KANG — faixa vermelha, peito nu, pose de bicicleta voadora.
  // Atributo: RESISTÊNCIA. Overlay: FLAWLESS VICTORY.
  liukang: { name: 'Liu Kang', accent: '#E84A1A', tagline: 'ENDURING FIRE', attr: 'resistencia', svg: `
    <svg viewBox="0 0 200 250" fill="none" xmlns="http://www.w3.org/2000/svg">
      <!-- cabelo preto curto -->
      <path d="M70 30 Q100 12 130 30 L130 48 L70 48 Z" fill="#1A1A2E" stroke="#1A1A2E" stroke-width="2"/>
      <!-- faixa vermelha na testa (signature headband) -->
      <rect x="64" y="44" width="72" height="10" fill="#B8242E" stroke="#1A1A2E" stroke-width="2"/>
      <!-- pontas da faixa balançando atras -->
      <path d="M64 50 L40 65 L48 70 L66 56" fill="#B8242E" stroke="#1A1A2E" stroke-width="1.5"/>
      <path d="M64 54 L42 78 L50 82 L66 60" fill="#B8242E" stroke="#1A1A2E" stroke-width="1.5"/>
      <!-- rosto -->
      <ellipse cx="100" cy="68" rx="32" ry="32" fill="#C49060" stroke="#1A1A2E" stroke-width="2.5"/>
      <!-- sobrancelhas concentradas -->
      <path d="M78 62 L92 60" stroke="#1A1A2E" stroke-width="3" stroke-linecap="round"/>
      <path d="M122 62 L108 60" stroke="#1A1A2E" stroke-width="3" stroke-linecap="round"/>
      <!-- olhos determinados -->
      <ellipse cx="86" cy="70" rx="3" ry="2.5" fill="#1A1A2E"/>
      <ellipse cx="114" cy="70" rx="3" ry="2.5" fill="#1A1A2E"/>
      <!-- nariz/boca -->
      <path d="M100 76 L98 84 L102 84 Z" fill="#1A1A2E" opacity="0.3"/>
      <path d="M90 92 Q100 88 110 92" stroke="#1A1A2E" stroke-width="2" fill="none"/>
      <!-- pescoço grosso -->
      <rect x="86" y="98" width="28" height="12" fill="#C49060" stroke="#1A1A2E" stroke-width="2"/>
      <!-- peito nu musculoso -->
      <path d="M58 200 L62 130 Q70 115 100 115 Q130 115 138 130 L142 200 Z" fill="#C49060" stroke="#1A1A2E" stroke-width="2.5"/>
      <!-- definição peitoral -->
      <path d="M75 128 Q88 140 100 138 Q112 140 125 128" stroke="#1A1A2E" stroke-width="1.5" fill="none" opacity="0.5"/>
      <line x1="100" y1="138" x2="100" y2="175" stroke="#1A1A2E" stroke-width="1.5" opacity="0.4"/>
      <!-- 6-pack abs -->
      <path d="M88 150 L88 175 M112 150 L112 175 M84 162 L116 162" stroke="#1A1A2E" stroke-width="1" opacity="0.4"/>
      <!-- calça preta + cinto vermelho -->
      <rect x="62" y="180" width="78" height="10" fill="#B8242E" stroke="#1A1A2E" stroke-width="1.5"/>
      <path d="M62 190 L142 190 L138 230 L66 230 Z" fill="#1A1A2E"/>
      <!-- braços musculosos em pose de soco -->
      <path d="M62 130 L50 165 L40 160 L58 122 Z" fill="#C49060" stroke="#1A1A2E" stroke-width="2"/>
      <path d="M138 130 L160 175 L168 168 L148 124 Z" fill="#C49060" stroke="#1A1A2E" stroke-width="2"/>
      <!-- punho cerrado direito -->
      <circle cx="170" cy="180" r="10" fill="#C49060" stroke="#1A1A2E" stroke-width="2"/>
      <!-- bola de fogo na mão -->
      <circle cx="170" cy="180" r="14" fill="#E84A1A" opacity="0.5"/>
      <path d="M170 170 Q175 175 173 180 Q178 178 174 184 Q170 180 168 185 Q166 178 170 170" fill="#FFE08F"/>
    </svg>` },
};

// 5 atributos — agora com lutador MK como mascote.
const ATTRIBUTES = [
  { key: 'forca',       name: 'Força',       color: '#B8242E', icon: '💪', fighter: 'kano',
    desc: 'Cresce com treinos pesados (compostos, séries baixas). Mascote: Kano.' },
  { key: 'resistencia', name: 'Resistência', color: '#E84A1A', icon: '🔥', fighter: 'liukang',
    desc: 'Cresce com cardio, passos e dança. Mascote: Liu Kang.' },
  { key: 'sabedoria',   name: 'Sabedoria',   color: '#FFE08F', icon: '⚡', fighter: 'raiden',
    desc: 'Cresce com leitura, estudo e foco. Mascote: Raiden.' },
  { key: 'disciplina',  name: 'Disciplina',  color: '#7BB8FF', icon: '❄️', fighter: 'subzero',
    desc: 'Cresce com proteína na meta + sono regular. Mascote: Sub-Zero.' },
  { key: 'vitalidade',  name: 'Vitalidade',  color: '#3FBF7F', icon: '🕶️', fighter: 'cage',
    desc: 'Cresce com streaks e quests. Mascote: Johnny Cage.' },
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
  'Outro': [],
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
      available: ['Comprar lightstick novo', 'Sessão de fotos', 'Cinema sozinho'],
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
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Falha lendo localStorage:', e);
    return null;
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Falha gravando localStorage:', e);
    toast('⚠️ Sem espaço para salvar localmente');
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
  return d.toISOString().slice(0, 10);
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

/** Retorna a quote do dia (determinística — muda 1x por dia).
 *  Pode retornar quote coreana OU frase Mortal Kombat. */
function dailyQuote() {
  const d = new Date(todayISO()).getTime();
  const idx = Math.floor(d / 86400000) % QUOTES.length;
  return QUOTES[idx];
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
    state.quests.dailyAssigned = {
      date: today,
      items: sample(state.quests.pool, 3),
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
    state.quests.weeklyCurrent = {
      weekStart: wstart,
      item: sample(state.quests.weeklyPool, 1)[0] || null,
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

/** Overlay tipo Mortal Kombat — "FATALITY!", "FLAWLESS VICTORY!", etc.
 *  Mostra silhueta do lutador relacionado por trás do texto. */
function kombatOverlay(kind = 'finish') {
  const ev = KOMBAT_EVENTS[kind] || KOMBAT_EVENTS.finish;
  const fighterKey = OVERLAY_FIGHTER[kind];
  const fighter = fighterKey && FIGHTERS[fighterKey];
  const overlay = document.createElement('div');
  overlay.className = 'mk-overlay';
  overlay.innerHTML = `
    ${fighter ? `<div class="mk-fighter">${fighter.svg}</div>` : ''}
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
  const views = {
    home:     viewDashboard,
    workout:  viewWorkout,
    nutri:    viewNutrition,
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

  // Renderiza quote: coreano OU kombat estilo MK
  const quoteHtml = quote.kombat
    ? `<div class="font-kombat text-sm tracking-widest text-blood dark:text-ember">${quote.kombat}</div>
       <div class="text-xs italic text-ink/55 dark:text-paper/55">"${quote.pt}" <span class="opacity-60">— ${quote.source || 'Mortal Kombat'}</span></div>`
    : `<div class="font-display text-base text-ink/80 dark:text-paper/80">${quote.ko}</div>
       <div class="text-xs italic text-ink/55 dark:text-paper/55">"${quote.pt}"</div>`;
  const borderClass = quote.kombat ? 'border-blood/60' : 'border-pink/60 dark:border-pink/50';

  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="kombat-hero-svg text-blood">${I.dragon}</div>
    <div class="flex items-center justify-between relative">
      <div>
        <div class="font-display text-xs uppercase tracking-widest text-ink/40 dark:text-paper/40">${g.ko}</div>
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
      ${streakChip('🔥', 'Treino', s.treino)}
      ${streakChip('🌙', 'Sono',   s.sono)}
      ${streakChip('🥩', 'Proteína', s.proteina)}
      ${streakChip('📖', 'Leitura', s.leitura)}
      ${mult > 1 ? `<span class="pill is-sun text-xs">⚡ Combo ×${mult.toFixed(1)}</span>` : ''}
    </div>
  </section>

  <section class="px-4 mt-4">
    <div class="q-card p-3">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-kombat text-sm tracking-widest uppercase">Atributos · Kombatants</h3>
        <span class="text-xs text-ink/45 dark:text-paper/45">${ATTRIBUTES.reduce((s,a)=>s+(attrs[a.key]||0),0)} pts</span>
      </div>
      <div class="grid grid-cols-5 gap-1">
        ${ATTRIBUTES.map(a => {
          const val = attrs[a.key] || 0;
          const max = Math.max(...ATTRIBUTES.map(x => attrs[x.key] || 0), 10);
          const pct = (val / max) * 100;
          const fighter = FIGHTERS[a.fighter];
          return `
          <button class="flex flex-col items-center gap-0.5 attr-tile" data-attr="${a.key}" aria-label="${a.name}: ${val}">
            <div class="attr-fighter h-16 w-full">${fighter ? fighter.svg : a.icon}</div>
            <div class="w-full xp-track is-kombat" style="height:5px"><div class="xp-fill" style="width:${pct}%; background:${a.color}"></div></div>
            <div class="text-[11px] font-bold mt-0.5" style="color:${a.color}">${val}</div>
            <div class="text-[9px] text-ink/55 dark:text-paper/55 leading-tight text-center">${a.name}</div>
          </button>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="px-4 mt-3">
    ${(() => {
      // Banner com lutador rotativo do dia (alinhado com a quote)
      const fkeys = Object.keys(FIGHTERS);
      const fidx = Math.floor(new Date(todayISO()).getTime() / 86400000) % fkeys.length;
      const f = FIGHTERS[fkeys[fidx]];
      return `
      <div class="fighter-banner">
        <div class="fighter-banner-svg">${f.svg}</div>
        <div class="flex-1 min-w-0">
          <div class="text-[10px] uppercase tracking-widest text-ink/45 dark:text-paper/45">Kombatant of the day</div>
          <div class="fighter-banner-text text-base" style="color:${f.accent}">${f.name}</div>
          <div class="text-[10px] font-kombat tracking-widest text-ink/65 dark:text-paper/65">${f.tagline}</div>
        </div>
      </div>`;
    })()}
  </section>

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

  ${wq.item ? `
  <section class="px-4 mt-5">
    <div class="q-card p-4">
      <div class="flex items-center justify-between">
        <div>
          <div class="font-display text-xs uppercase tracking-widest text-ink/40 dark:text-paper/40">주간 미션</div>
          <div class="font-bold mt-0.5">Weekly quest</div>
        </div>
        <div class="pill is-pink">+${wq.item.xp} XP</div>
      </div>
      <div class="mt-2 text-sm">${wq.item.text}</div>
      <div class="xp-track mt-3"><div class="xp-fill" style="width:${wq.completed ? 100 : Math.min(100, wq.progress * 25)}%"></div></div>
      <div class="flex items-center justify-between mt-2">
        <span class="text-xs text-ink/50 dark:text-paper/50">${wq.completed ? 'Completa ✓' : 'Em andamento'}</span>
        <button id="wq-toggle" class="text-xs text-lavender font-semibold">
          ${wq.completed ? 'desmarcar' : 'marcar como completa'}
        </button>
      </div>
    </div>
  </section>
  ` : ''}

  <section class="px-4 mt-6">
    <button id="open-log" class="q-btn q-btn-finish w-full py-4 text-base">
      <span class="w-5 h-5">${I.flame}</span> FINISH IT! <span class="w-5 h-5">${I.flame}</span>
    </button>
    <p class="text-center text-xs text-ink/45 dark:text-paper/45 mt-2">
      Registrar dia · ${dayXP}/${DAILY_XP_CAP} XP capturados hoje
    </p>
  </section>

  <section class="px-4 mt-6">
    <div class="kombat-divider">⚔ ARSENAL ⚔</div>
    <div class="grid grid-cols-2 gap-3">
      ${quickTile('sleep',    'Sono',        I.moon,  'modal')}
      ${quickTile('reading',  'Leitura',     I.book,  'modal')}
      ${quickTile('rewards',  'Recompensas', I.gift,  'modal')}
      ${quickTile('library',  'Biblioteca',  I.brain, 'modal')}
      ${quickTile('achievements', `Conquistas · ${unlockedCount}`, I.award, 'modal')}
      ${quickTile('config',   'Config',      I.cog)}
    </div>
  </section>

  <section class="px-4 mt-6 pb-2 text-center">
    <div class="font-kombat text-[10px] text-blood/50 dark:text-ember/50 tracking-[0.4em]">— MORTAL KOMBAT NEVER ENDS —</div>
  </section>
  `;
}

function streakChip(emoji, label, count) {
  if (count <= 0) return `<span class="streak-chip opacity-50">${emoji} ${label} 0</span>`;
  return `<span class="streak-chip">${emoji} ${label} <b>${count}d</b></span>`;
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
    'Upper A': 'peito + dorsais', 'Upper B': 'peito alto + ombros',
    'Lower A': 'compostos pesados', 'Lower B': 'glúteo + acessórios',
    'Push': 'peito · ombro · tríceps', 'Pull': 'dorsais · bíceps',
    'Core/Abs': 'núcleo de combate', 'Cardio HIIT': 'queima · resistência',
    'Calistenia': 'sem peso · só corpo', 'Dança K-pop': 'cardio + coordenação',
    'Outro': 'modo livre',
  };
  const icons = {
    'Upper A': I.fist, 'Upper B': I.fist, 'Lower A': I.bolt, 'Lower B': I.bolt,
    'Push': I.flame, 'Pull': I.dumb, 'Core/Abs': I.skull,
    'Cardio HIIT': I.bolt, 'Calistenia': I.fighter, 'Dança K-pop': I.spark,
    'Outro': I.sword,
  };
  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="absolute right-1 top-4 w-32 h-44 opacity-90 pointer-events-none" style="filter:drop-shadow(0 4px 12px rgba(184,36,46,0.3))">${FIGHTERS.kano.svg}</div>
    <div class="kombat-tagline text-xs">⚔ TEST YOUR MIGHT ⚔</div>
    <h1 class="text-2xl font-extrabold mt-1">Treino</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55 max-w-[60%]">Kano diz: <i>"Sem dor, sem glória."</i> Toque <b>(i)</b> em qualquer exercício pra técnica.</p>
    <button id="open-library" class="q-btn q-btn-ghost mt-3 text-sm">
      <span class="w-4 h-4">${I.brain}</span> Biblioteca completa
    </button>
  </header>
  <section class="px-4 space-y-3">
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

function modalWorkoutSession(type, dateISO = null) {
  // Se dateISO presente: visualização de sessão antiga.
  const editing = dateISO
    ? state.workouts.find((w) => w.date === dateISO && w.type === type)
    : null;
  const lib = EXERCISE_LIBRARY[type] || [];
  const start = editing || {
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

      <button class="q-btn q-btn-primary w-full py-3" id="save-workout">Salvar treino</button>
    </div>
  `);

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
      toast('Treino salvo 💪');
    }
    render();
  });
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
    <div class="kombat-tagline text-xs">🔥 FUEL FOR BATTLE 🔥</div>
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
  const weights = ms.map((m) => m.weight);
  const avg7 = weights.length >= 2 ? (weights.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, weights.length)).toFixed(1) : '—';

  return `
  <header class="pt-7 pb-3 px-5">
    <h1 class="text-2xl font-extrabold">Corpo</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55">Peso, medidas e fotos progresso.</p>
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
      <button class="q-btn q-btn-ghost w-full mt-3" id="add-weight">+ registrar peso/medidas</button>
    </div>
  </section>

  <section class="px-4 mt-4">
    <h2 class="font-extrabold mb-2">Medidas quinzenais</h2>
    <div class="q-card divide-y divide-ink/5 dark:divide-paper/5">
      ${ms.slice().reverse().slice(0, 8).map(m => `
        <div class="p-3 flex items-center justify-between text-sm">
          <span class="font-semibold">${formatDateBR(m.date)}</span>
          <span class="text-ink/65 dark:text-paper/65">${m.weight}kg · cintura ${m.waist}cm · peito ${m.chest}cm · braço ${m.arm}cm</span>
        </div>`).join('') || `<div class="p-4 text-sm text-ink/50">Sem registros.</div>`}
    </div>
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
      <h2 class="font-extrabold text-lg">Registrar medidas</h2>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <form id="weight-form" class="p-4 space-y-3">
      <label class="block">
        <span class="text-sm font-semibold">Peso (kg)</span>
        <input class="q-input mt-1" type="number" step="0.1" name="weight" required value="${last.weight||''}" />
      </label>
      <div class="grid grid-cols-3 gap-2">
        <label><span class="text-sm font-semibold">Cintura</span>
          <input class="q-input mt-1" type="number" step="0.1" name="waist" value="${last.waist||''}" />
        </label>
        <label><span class="text-sm font-semibold">Peito</span>
          <input class="q-input mt-1" type="number" step="0.1" name="chest" value="${last.chest||''}" />
        </label>
        <label><span class="text-sm font-semibold">Braço</span>
          <input class="q-input mt-1" type="number" step="0.1" name="arm" value="${last.arm||''}" />
        </label>
      </div>
      <button type="submit" class="q-btn q-btn-primary w-full">Salvar</button>
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
    });
    saveState();
    closeModal();
    toast('Medidas registradas');
    render();
  });
}

// ----- 6.5 Insights view -----------------------------------

function viewInsights() {
  const logs = state.dailyLogs.slice().sort((a, b) => (a.date < b.date ? -1 : 1));
  const last7 = logs.slice(-7);
  const last14 = logs.slice(-14);

  // Correlação simples: dias com sono>=7h vs adesão treino
  const goodSleep = last14.filter((l) => l.sleep?.hours >= 7);
  const badSleep = last14.filter((l) => l.sleep?.hours < 7);
  const adGood = goodSleep.length ? (goodSleep.filter((l) => l.training?.done).length / goodSleep.length) : 0;
  const adBad  = badSleep.length  ? (badSleep.filter((l) => l.training?.done).length / badSleep.length) : 0;
  const sleepCorr = goodSleep.length && badSleep.length
    ? `Em dias com sono ≥7h você treinou em <b>${Math.round(adGood*100)}%</b> deles (vs <b>${Math.round(adBad*100)}%</b> nos dias de sono curto).`
    : 'Registre mais dias para destravar correlações.';

  const weakest = findWeakestArea(last7);

  return `
  <header class="pt-7 pb-3 px-5 kombat-hero">
    <div class="kombat-tagline text-xs">⚡ BATTLE REPORT ⚡</div>
    <h1 class="text-2xl font-extrabold mt-1">Insights da semana</h1>
  </header>

  <section class="px-4 space-y-3">
    <div class="q-card p-4">
      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Correlação</div>
      <div class="text-sm mt-1">${sleepCorr}</div>
    </div>

    <div class="q-card p-4">
      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Foco da semana</div>
      <div class="font-bold mt-1">${weakest.label}</div>
      <div class="text-sm text-ink/65 dark:text-paper/65 mt-0.5">${weakest.tip}</div>
    </div>

    <div class="q-card p-4">
      <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Histórico de ranks</div>
      <div class="mt-2 space-y-1">
        ${(state.rankHistory.length
          ? state.rankHistory.slice(-6)
          : [{ weekStart: isoDate(startOfWeek()), rank: rankFromXP(state.user.rankXP||0).key, xp: weeklyXP() }]
        ).map(rh => {
          const r = RANKS.find(x => x.key === rh.rank) || RANKS[0];
          return `<div class="flex items-center justify-between text-sm">
            <span class="text-ink/55 dark:text-paper/55">${formatDateBR(rh.weekStart)}</span>
            <span class="font-bold" style="color:${r.color}">${r.name}</span>
            <span class="text-xs">${rh.xp} XP</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  </section>

  <section class="px-4 mt-4">
    <h2 class="font-extrabold mb-2">Últimos 7 dias</h2>
    <div class="q-card divide-y divide-ink/5 dark:divide-paper/5">
      ${last7.slice().reverse().map(l => `
        <div class="p-3 text-sm flex items-center justify-between">
          <div>
            <div class="font-semibold">${formatDateBR(l.date)}</div>
            <div class="text-xs text-ink/50 dark:text-paper/50">
              ${l.training?.done ? '🏋️ '+l.training.type : '💤'}
              · ${l.protein?.grams||0}g
              · ${l.sleep?.hours||0}h
              · ${l.steps||0} passos
            </div>
          </div>
          <div class="pill is-mint">${l.xp||0} XP</div>
        </div>`).join('') || `<div class="p-4 text-sm">Sem registros.</div>`}
    </div>
  </section>
  `;
}

function findWeakestArea(logs) {
  if (!logs.length) return { label: 'Comece a registrar', tip: 'Faça o primeiro log do dia para ver onde focar.' };
  const score = {
    treino:   logs.filter((l) => l.training?.done).length / logs.length,
    proteina: logs.filter((l) => l.protein?.hit).length / logs.length,
    sono:     logs.filter((l) => (l.sleep?.hours||0) >= 7).length / logs.length,
    leitura:  logs.filter((l) => (l.reading?.minutes||0) >= 15).length / logs.length,
    passos:   logs.filter((l) => (l.steps||0) >= 8000).length / logs.length,
  };
  const tips = {
    treino:   'Tente garantir 3 treinos esta semana — agende como compromisso.',
    proteina: 'Planeje refeições com 30g+ de proteína cada. Café da manhã é o vilão.',
    sono:     'Apague a luz 23:30 em ≥5 dias. Sem celular nos 30 min finais.',
    leitura:  'Use o timer de 15 min do app antes de dormir.',
    passos:   'Caminhe 30 min após o almoço — quase resolve sozinho.',
  };
  const labels = {
    treino: 'Adesão a treinos', proteina: 'Proteína diária', sono: 'Sono ≥7h', leitura: 'Leitura 15min', passos: '8k passos',
  };
  const worst = Object.entries(score).sort((a, b) => a[1] - b[1])[0];
  return { label: labels[worst[0]], tip: tips[worst[0]] };
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

function modalReading() {
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <h2 class="font-extrabold text-lg">Leitura</h2>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-4">
      <div class="q-card p-4 text-center">
        <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">Timer de leitura</div>
        <div id="reading-timer" class="text-4xl font-extrabold mt-1">15:00</div>
        <div class="flex gap-2 mt-3">
          <button id="r-start" class="q-btn q-btn-primary flex-1">Iniciar 15 min</button>
          <button id="r-stop" class="q-btn q-btn-ghost flex-1">Parar</button>
        </div>
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
                <span class="font-display text-xs text-ink/45 dark:text-paper/45">${a.ko}</span>
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

// ----- 6.8 Rewards modal -----------------------------------

function modalRewards() {
  openModal(`
    <header class="flex items-center justify-between p-4 border-b border-ink/5 dark:border-paper/5">
      <h2 class="font-extrabold text-lg">Recompensas</h2>
      <button class="modal-close p-1"><span class="w-5 h-5">${I.close}</span></button>
    </header>
    <div class="p-4 space-y-4">
      <div>
        <h3 class="font-bold mb-2">Disponíveis</h3>
        <div class="space-y-2">
          ${state.rewards.available.map((r, i) => `
            <div class="q-card p-3 flex items-center justify-between">
              <span>${r}</span>
              <button class="q-btn q-btn-primary text-xs py-1 px-3 redeem" data-i="${i}">Resgatar</button>
            </div>`).join('') || `<div class="q-card p-4 text-sm text-ink/50">Adicione sua primeira recompensa.</div>`}
        </div>
      </div>

      <form id="reward-form" class="flex gap-2">
        <input class="q-input flex-1" name="text" placeholder="Nova recompensa" required />
        <button class="q-btn q-btn-primary">+</button>
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
        <div class="q-card divide-y divide-ink/5 dark:divide-paper/5">
          ${state.rewards.redeemed.slice().reverse().map(r => `
            <div class="p-3 flex justify-between text-sm">
              <span>${r.text}</span>
              <span class="text-ink/55 dark:text-paper/55">${formatDateBR(r.date)}</span>
            </div>`).join('')}
        </div>
      </div>` : ''}
    </div>
  `);
  document.querySelectorAll('.redeem').forEach(b => b.onclick = () => {
    const i = +b.dataset.i;
    const text = state.rewards.available.splice(i, 1)[0];
    state.rewards.redeemed.push({ date: todayISO(), text });
    saveState(); modalRewards(); toast('🎁 Recompensa resgatada');
  });
  document.getElementById('reward-form').onsubmit = (e) => {
    e.preventDefault();
    state.rewards.available.push(e.target.text.value);
    saveState(); modalRewards();
  };
}

// ----- 6.9 Config view -------------------------------------

function viewConfig() {
  return `
  <header class="pt-7 pb-3 px-5">
    <h1 class="text-2xl font-extrabold">Configurações</h1>
  </header>
  <section class="px-4 space-y-3">
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
    { key: 'home',     icon: I.home,  label: 'Início' },
    { key: 'workout',  icon: I.dumb,  label: 'Treino' },
    { key: 'nutri',    icon: I.bowl,  label: 'Nutri' },
    { key: 'body',     icon: I.body,  label: 'Corpo' },
    { key: 'insights', icon: I.spark, label: 'Insights' },
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

  document.getElementById('toggle-dark')?.addEventListener('click', () => {
    state.user.darkMode = !state.user.darkMode;
    document.documentElement.classList.toggle('dark', state.user.darkMode);
    saveState(); render();
  });

  document.getElementById('reroll')?.addEventListener('click', () => {
    if (state.quests.dailyAssigned.rerolled) return;
    state.quests.dailyAssigned.items = sample(state.quests.pool, 3);
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

  document.getElementById('wq-toggle')?.addEventListener('click', () => {
    const wq = state.quests.weeklyCurrent;
    wq.completed = !wq.completed;
    let change = { changed: false };
    if (wq.completed) {
      change = addQuestXP(wq.item.xp);
      kombatOverlay('fatality'); // weekly = FATALITY
    } else {
      change = addQuestXP(-wq.item.xp);
    }
    saveState(); render();
    if (change.changed) setTimeout(() => levelUpOverlay(change.from, change.to, change.promoted), 2900);
  });

  document.querySelectorAll('.tile-btn').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.target;
    const k = b.dataset.kind;
    if (k === 'modal') {
      if (t === 'sleep')        modalSleep();
      if (t === 'reading')      modalReading();
      if (t === 'rewards')      modalRewards();
      if (t === 'library')      modalLibrary();
      if (t === 'achievements') modalAchievements();
    } else go(t);
  }));

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
  document.getElementById('cfg-save')?.addEventListener('click', () => {
    state.user.name  = document.getElementById('cfg-name').value || 'Jogador';
    state.user.goals = document.getElementById('cfg-goals').value;
    state.user.reminders.proteinTimes = document.getElementById('cfg-reminders').value.split(',').map(s=>s.trim()).filter(Boolean);
    saveState(); toast('Configurações salvas'); render();
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

function init() {
  state = loadState();
  if (!state) {
    // Estado completamente zerado — primeiro dia começa do Ferro com 0 XP.
    state = makeEmptyState();
    saveState();
  }
  if (state.user.darkMode) document.documentElement.classList.add('dark');
  ensureDailyQuests();
  ensureWeeklyQuest();
  checkWeeklyRollover();
  setTimeout(checkAchievements, 100);
  render();
}

init();
