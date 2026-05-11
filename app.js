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

// Pool padrão de daily quests. O usuário pode editar (Configurações).
const DEFAULT_QUEST_POOL = [
  { id: 'q01', text: 'Beber 2L de água',            xp: 1, tag: 'saúde' },
  { id: 'q02', text: '10min de mobilidade/ombros',  xp: 1, tag: 'treino' },
  { id: 'q03', text: 'Caminhar 30min ao ar livre',  xp: 1, tag: 'cardio' },
  { id: 'q04', text: 'Ouvir 1 música em coreano',   xp: 1, tag: 'foco' },
  { id: 'q05', text: 'Bater 145g de proteína',      xp: 2, tag: 'nutri' },
  { id: 'q06', text: 'Dormir antes de 23:30',       xp: 2, tag: 'sono' },
  { id: 'q07', text: 'Sem celular 30min antes de dormir', xp: 2, tag: 'sono' },
  { id: 'q08', text: 'Ler 15 min',                  xp: 1, tag: 'foco' },
  { id: 'q09', text: 'Exposição ao sol 10 min',     xp: 1, tag: 'saúde' },
  { id: 'q10', text: 'Treino conforme planejado',   xp: 2, tag: 'treino' },
  { id: 'q11', text: 'Alongamento pós-treino 5 min', xp: 1, tag: 'treino' },
  { id: 'q12', text: 'Meditar 5 min',               xp: 1, tag: 'mente' },
];

const DEFAULT_WEEKLY_POOL = [
  { id: 'w01', text: 'Bater 145g de proteína 5x na semana', xp: 8 },
  { id: 'w02', text: '4 treinos completados',               xp: 10 },
  { id: 'w03', text: 'Dormir >7h em 5 dias',                xp: 8 },
  { id: 'w04', text: '3 sessões de leitura de 15min',       xp: 6 },
  { id: 'w05', text: 'Bater 8k passos em 5 dias',           xp: 6 },
];

// Biblioteca de exercícios pré-cadastrados (foco em peito + dorsais).
const EXERCISE_LIBRARY = {
  'Upper A': [
    { name: 'Supino reto barra',          target: '3×5–8',  notes: 'foco peito' },
    { name: 'Remada curvada',             target: '3×6–10', notes: 'dorsal grossura' },
    { name: 'Desenvolvimento militar',    target: '3×6–10', notes: 'ombros' },
    { name: 'Pull-up / barra fixa',       target: '3×AMRAP', notes: 'dorsal largura' },
    { name: 'Rosca direta',               target: '2×8–12', notes: 'bíceps' },
    { name: 'Tríceps testa',              target: '2×8–12', notes: 'tríceps' },
  ],
  'Upper B': [
    { name: 'Supino inclinado halteres',  target: '4×8–12', notes: 'peito alto' },
    { name: 'Pulldown pegada neutra',     target: '4×8–12', notes: 'dorsal' },
    { name: 'Crucifixo polia baixa',      target: '3×10–15', notes: 'peito interno' },
    { name: 'Remada cavalinho',           target: '3×8–12', notes: 'dorsal grossura' },
    { name: 'Elevação lateral',           target: '3×12–15', notes: 'deltóide médio' },
    { name: 'Face pull',                  target: '3×15',    notes: 'postura/posterior' },
  ],
  'Lower A': [
    { name: 'Agachamento livre',          target: '4×5–8',  notes: 'força total' },
    { name: 'Stiff',                      target: '3×8–10', notes: 'posterior' },
    { name: 'Leg press',                  target: '3×10–12', notes: 'quadríceps' },
    { name: 'Mesa flexora',               target: '3×10–12', notes: 'isquiossural' },
    { name: 'Panturrilha em pé',          target: '4×12–15', notes: '' },
    { name: 'Abdominal infra',            target: '3×15',    notes: 'core' },
  ],
  'Lower B': [
    { name: 'Hip thrust',                 target: '4×6–10', notes: 'glúteo' },
    { name: 'Afundo passada',             target: '3×10/perna', notes: 'unilateral' },
    { name: 'Cadeira extensora',          target: '3×10–15', notes: 'quad iso' },
    { name: 'Cadeira flexora',            target: '3×10–15', notes: 'isquio iso' },
    { name: 'Panturrilha sentado',        target: '4×15',    notes: 'sóleo' },
    { name: 'Prancha',                    target: '3×45s',   notes: 'core iso' },
  ],
  'Dança':   [{ name: 'Sessão dança K-pop', target: '30–45min', notes: 'cardio + alegria' }],
  'Outro':   [],
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
  const types = ['Upper A', 'Lower A', 'Upper B', 'Lower B', 'Dança'];
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

/** Aplica ganho/perda de XP — atualiza totalXP e rankXP, e detecta promoção. */
function gainXP(amount) {
  const before = rankFromXP(state.user.rankXP);
  state.user.totalXP = (state.user.totalXP || 0) + amount;
  state.user.rankXP  = Math.max(0, (state.user.rankXP || 0) + amount);
  const after = rankFromXP(state.user.rankXP);
  state.user.currentRank = after.key;
  if (before.key !== after.key) {
    const promoted = RANKS.indexOf(after) > RANKS.indexOf(before);
    return { changed: true, from: before, to: after, promoted };
  }
  return { changed: false };
}

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
    body:     viewBody,
    insights: viewInsights,
    config:   viewConfig,
  };
  app().innerHTML = (views[currentTab] || viewDashboard)();
  renderTabbar();
  attachHandlers();
  // animação de entrada
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

  return `
  <header class="pt-7 pb-5 px-5">
    <div class="flex items-center justify-between">
      <div>
        <div class="font-display text-xs uppercase tracking-widest text-ink/40 dark:text-paper/40">${g.ko}</div>
        <h1 class="text-2xl font-extrabold mt-0.5">${g.pt}, ${u.name}.</h1>
      </div>
      <button id="toggle-dark" class="q-btn q-btn-ghost px-3 py-2" aria-label="modo escuro">
        ${state.user.darkMode ? '☀️' : '🌙'}
      </button>
    </div>
  </header>

  <section class="px-4">
    <div class="q-card p-4 flex items-center gap-4">
      <div class="rank-badge text-paper" style="background:${r.color}">
        ${r.name[0].toUpperCase()}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline justify-between gap-2">
          <div class="font-extrabold text-lg" style="color:${r.color}">${r.name}</div>
          <div class="text-xs text-ink/50 dark:text-paper/50">
            ${next ? `→ ${next.name} em ${next.threshold - rxp} XP` : 'CHALLENGER 👑'}
          </div>
        </div>
        <div class="xp-track mt-2"><div class="xp-fill" style="width:${progress}%"></div></div>
        <div class="flex justify-between text-xs mt-1 text-ink/55 dark:text-paper/55">
          <span>Rank: <b>${rxp} XP</b></span>
          <span>Semana: <b>${wxp}</b></span>
          <span>Hoje: <b>${dayXP}/${DAILY_XP_CAP}</b></span>
        </div>
      </div>
    </div>
  </section>

  <section class="px-4 mt-4">
    <div class="flex flex-wrap gap-2">
      ${streakChip('🔥', 'Treino', s.treino)}
      ${streakChip('🌙', 'Sono',   s.sono)}
      ${streakChip('🥩', 'Proteína', s.proteina)}
      ${streakChip('📖', 'Leitura', s.leitura)}
    </div>
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
    <button id="open-log" class="q-btn q-btn-primary w-full py-4 text-base">
      <span class="w-5 h-5">${I.plus}</span> Registrar dia
    </button>
  </section>

  <section class="px-4 mt-6">
    <div class="flex items-center justify-between mb-2">
      <h2 class="font-extrabold text-lg">Acessos rápidos</h2>
    </div>
    <div class="grid grid-cols-2 gap-3">
      ${quickTile('workout',  'Treino',      I.dumb)}
      ${quickTile('body',     'Corpo',       I.body)}
      ${quickTile('sleep',    'Sono',        I.moon, 'modal')}
      ${quickTile('reading',  'Leitura',     I.book, 'modal')}
      ${quickTile('rewards',  'Recompensas', I.gift, 'modal')}
      ${quickTile('insights', 'Insights',    I.spark)}
    </div>
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
          ${['Upper A','Upper B','Lower A','Lower B','Dança','Outro'].map(t =>
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
    toast(`+${newLog.xp} XP salvos 🎉`);
    confetti(900);
    vibrate(25);

    if (change.changed) {
      levelUpOverlay(change.from, change.to, change.promoted);
    }
    render();
  });
}

/** Substitui (ou cria) o log de um dia e aplica o delta de XP no rankXP/totalXP. */
function upsertDailyLog(log) {
  const idx = state.dailyLogs.findIndex((l) => l.date === log.date);
  const oldXP = idx >= 0 ? (state.dailyLogs[idx].xp || 0) : 0;
  if (idx >= 0) state.dailyLogs[idx] = log;
  else state.dailyLogs.push(log);
  const delta = (log.xp || 0) - oldXP;
  return gainXP(delta);
}

// ----- 6.3 Workout view -------------------------------------

function viewWorkout() {
  const types = ['Upper A', 'Upper B', 'Lower A', 'Lower B', 'Dança', 'Outro'];
  return `
  <header class="pt-7 pb-3 px-5">
    <h1 class="text-2xl font-extrabold">Treino</h1>
    <p class="text-sm text-ink/55 dark:text-paper/55">Registre séries e veja progressão.</p>
  </header>
  <section class="px-4 space-y-3">
    <div class="grid grid-cols-2 gap-2">
      ${types.map(t => `
        <button class="q-card p-3 text-left workout-start" data-type="${t}">
          <div class="text-xs uppercase tracking-wider text-ink/45 dark:text-paper/45">workout</div>
          <div class="font-bold">${t}</div>
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
            <div class="min-w-0">
              <div class="font-bold">${ex.name}</div>
              <div class="text-xs text-ink/50 dark:text-paper/50">${targetInfo?.target || ''} ${targetInfo?.notes ? '· ' + targetInfo.notes : ''}</div>
            </div>
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
    // Substitui sessão do mesmo dia/tipo
    const idx = state.workouts.findIndex((w) => w.date === start.date && w.type === start.type);
    if (idx >= 0) state.workouts[idx] = start;
    else state.workouts.push(start);
    saveState();
    closeModal();
    toast('Treino salvo 💪');
    confetti(700);
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
  <header class="pt-7 pb-3 px-5">
    <div class="font-display text-xs uppercase tracking-widest text-ink/40 dark:text-paper/40">주간 분석</div>
    <h1 class="text-2xl font-extrabold">Insights da semana</h1>
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
    { key: 'body',     icon: I.body,  label: 'Corpo' },
    { key: 'insights', icon: I.spark, label: 'Insights' },
    { key: 'config',   icon: I.cog,   label: 'Config' },
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
      if (done) {
        state.quests.dailyAssigned.completed = state.quests.dailyAssigned.completed.filter((x) => x !== qid);
        const q = state.quests.dailyAssigned.items.find((x) => x.id === qid);
        change = addQuestXP(-(q?.xp || 1));
      } else {
        state.quests.dailyAssigned.completed.push(qid);
        confetti(500); vibrate(15);
        const q = state.quests.dailyAssigned.items.find((x) => x.id === qid);
        toast(`+${q?.xp || 1} XP — quest completa`);
        change = addQuestXP(q?.xp || 1);
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
      confetti(1200); toast(`+${wq.item.xp} XP weekly!`);
    } else {
      change = addQuestXP(-wq.item.xp);
    }
    saveState(); render();
    if (change.changed) levelUpOverlay(change.from, change.to, change.promoted);
  });

  document.querySelectorAll('.tile-btn').forEach((b) => b.addEventListener('click', () => {
    const t = b.dataset.target;
    const k = b.dataset.kind;
    if (k === 'modal') {
      if (t === 'sleep')   modalSleep();
      if (t === 'reading') modalReading();
      if (t === 'rewards') modalRewards();
    } else go(t);
  }));

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

/** XP de quests (daily/weekly) — não passa pelo cap diário do log. */
function addQuestXP(amount) {
  const today = todayISO();
  let log = state.dailyLogs.find((l) => l.date === today);
  if (!log) {
    log = {
      date: today,
      training: { type: 'descanso', done: false },
      protein: { grams: 0, hit: false },
      sleep: { hours: 0 },
      reading: { minutes: 0 },
      steps: 0, buffs: [], notes: '',
      xp: 0,
    };
    state.dailyLogs.push(log);
  }
  log.xp = (log.xp || 0) + amount;
  return gainXP(amount);
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
  render();
}

init();
