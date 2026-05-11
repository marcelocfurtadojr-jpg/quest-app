# QUEST

> Acompanhamento gamificado de hábitos de saúde, treino, nutrição e sono.
> Estética coreana minimalista + sistema de rank inspirado em MOBA (Ferro →
> Diamante). PWA instalável, funciona offline, zero backend obrigatório.

![rank colors](https://img.shields.io/badge/rank-iron→diamond-7BB8FF) ![pwa](https://img.shields.io/badge/PWA-installable-B7B5FF) ![storage](https://img.shields.io/badge/storage-localStorage-A8E6CF)

---

## Como rodar localmente

A app é **100% estática** (HTML/CSS/JS + Tailwind via CDN). Não precisa de
build, mas precisa ser servida por HTTP (e não via `file://`), porque o
service worker e o `manifest.json` exigem isso.

Escolha **um** dos comandos abaixo na pasta `quest/`:

```bash
# Python 3 (vem com Windows/Mac/Linux)
python -m http.server 5173

# Node (se tiver instalado)
npx serve -p 5173 .

# PHP
php -S localhost:5173
```

Depois abra <http://localhost:5173>.

> Em dev você pode visualizar pelo Live Preview do VS Code, mas para testar
> a instalação como PWA é melhor usar um dos servers acima.

## 📱 Instalando no celular — passo a passo

A PWA precisa ser servida via **HTTPS** para o "Instalar app" aparecer no
celular. Escolha **uma** das três opções abaixo, da mais simples para a mais
robusta.

### ⭐ Opção A — Netlify Drop (recomendada, 60 segundos, sem cadastro)

1. No computador, abra <https://app.netlify.com/drop>.
2. **Arraste a pasta `quest/` inteira** para a área tracejada da página.
3. Em ~10 segundos aparece uma URL no topo, algo como
   `https://random-name-1234.netlify.app`. **Copie essa URL.**
4. No celular, abra essa URL no **Chrome** (Android) ou **Safari** (iOS).
5. Instale:
   - **Android/Chrome:** toque no menu `⋮` no canto superior direito →
     **"Instalar app"** (ou "Adicionar à tela inicial").
   - **iOS/Safari:** toque no botão **Compartilhar** (□↑) na barra inferior →
     role para baixo → **"Adicionar à Tela de Início"**.
6. Pronto — o ícone do QUEST aparece na home do celular como qualquer outro
   app. Toque para abrir em tela cheia, sem barra de URL.

> A URL do Netlify Drop fica viva permanentemente para você. Se quiser uma
> URL personalizada / um domínio próprio, basta criar uma conta gratuita
> e "claim" do site.

### Opção B — GitHub Pages (gratuito, permanente, sob seu controle)

1. Crie uma conta gratuita em <https://github.com> (se ainda não tiver).
2. Crie um novo repositório **público** (exemplo: `quest-app`).
3. Clique em **"uploading an existing file"** e arraste **todos os arquivos
   de dentro de `quest/`** (não a pasta `quest/` em si — os arquivos
   `index.html`, `app.js`, etc. devem ficar na raiz do repo).
4. Vá em **Settings → Pages**.
5. Em "Source", escolha **`Deploy from a branch`** → **`main`** → **`/ (root)`**
   → **Save**.
6. Aguarde 1–2 min. A página recarrega e mostra
   `Your site is live at https://SEU_USUARIO.github.io/quest-app`.
7. Abra essa URL no celular e siga o passo 5 da Opção A para instalar.

### Opção C — só testar no celular pela rede Wi-Fi (sem hospedar)

> Não dá pra instalar como PWA (a instalação exige `https` ou `localhost`),
> mas funciona como página web normal.

1. No computador (Windows), abra o **PowerShell** na pasta `quest/` e rode:
   ```powershell
   powershell -ExecutionPolicy Bypass -File serve.ps1
   ```
   No Mac/Linux: `python3 -m http.server 8773`
2. Descubra o IP local do PC:
   - Windows: abra prompt, digite `ipconfig`, procure **"Endereço IPv4"** da
     placa Wi-Fi (algo como `192.168.X.X`).
   - Mac/Linux: `ifconfig | grep "inet "` ou Preferências → Rede.
3. Verifique que celular **e PC estão na mesma Wi-Fi**.
4. No celular, abra `http://192.168.X.X:8773` (substitua pelo seu IP).
5. Use normal — todos os dados ficam salvos no localStorage do celular.

### Sobre os dados

- **Tudo é salvo localmente no celular** (`localStorage`). Não há servidor.
- Se desinstalar o app ou limpar dados do navegador, **você perde o histórico**.
- Use **Configurações → Exportar JSON** periodicamente para fazer backup.
- O backup pode ser reimportado em **Configurações → Importar**.

## Dados de exemplo

Por padrão o app inicia **completamente zerado** — você começa do **Ferro 0 XP**
no primeiro dia. Se quiser ver a UI preenchida (para entender as telas antes
de começar de verdade), vá em **Configurações → Carregar dados de exemplo**.
Isso popula 14 dias de logs, treinos, medidas, livros e ranks históricos.

Para voltar ao zero: **Configurações → Apagar tudo**.

## Estrutura de arquivos

```
quest/
  index.html       # casca da SPA + tabbar + container modal
  styles.css       # estilos custom além do Tailwind
  app.js           # estado, views, lógica de XP/rank, modais
  manifest.json    # PWA install manifest
  sw.js            # service worker (offline cache)
  icons/
    icon.svg       # ícone principal (gradiente lavanda → rosa → mint)
    icon-192.png   # fallback Android
    icon-512.png   # fallback maskable
  README.md
```

## Schema de dados (localStorage)

Tudo persistido em `quest.state.v1` como JSON:

```js
{
  user:              { name, goals, currentRank, totalXP, darkMode, reminders },
  dailyLogs:         [{date, training, protein, sleep, reading, steps, buffs, notes, xp}],
  workouts:          [{date, type, exercises:[{name, sets:[{reps,weight,technique}]}]}],
  bodyMeasurements:  [{date, weight, waist, chest, arm}],
  photos:            [{date, type:'front'|'side', dataUrl}],
  quests:            { pool, weeklyPool, dailyAssigned, weeklyCurrent },
  rewards:           { available, unlocked, redeemed },
  books:             [{title, totalPages, currentPage, finishedAt?}],
  rankHistory:       [{weekStart, rank, xp}],
  sleepSessions:     [{date, startISO, endISO?, durationH}]
}
```

Existem **Exportar JSON** / **Importar JSON** em Configurações para backup
manual.

## Sistema de XP e rank

- Cap de **7 XP/dia** vindo do log diário (treino, proteína, sono, leitura, passos)
- XP extra de **daily quests** (3/dia, 1 re-roll) e **weekly quest** (1/semana)
- O rank é determinado pelo **rankXP** — uma pontuação **acumulada** que
  sofre **decay de 10% toda segunda-feira** (rollover semanal).

| Rank          | rankXP necessário |
|---------------|------------------:|
| Ferro         |     0             |
| Bronze        |    25             |
| Prata         |    70             |
| Ouro          |   140             |
| Platina       |   230             |
| Esmeralda     |   340             |
| Diamante      |   470             |
| Mestre        |   640             |
| Grão-Mestre   |   840             |
| 👑 Challenger | **1.100**         |

**Por que o decay torna o jogo realista:**

Em equilíbrio (rank fixo), você precisa repor **10% do rankXP atual por semana**:

- Para **manter Ouro (140)**: 14 XP/semana — fácil, qualquer rotina mínima segura
- Para **manter Diamante (470)**: 47 XP/semana — semana sólida
- Para **manter Challenger (1100)**: 110 XP/semana — **teto absoluto sustentado**,
  precisa bater proteína, treinar 4×, dormir bem, ler, andar 8k passos e fechar
  3 quests/dia + weekly quase todo dia útil. É o "fim de jogo" do QUEST.

XP máximo teórico por semana:
- Log diário: 7 dias × 7 XP cap = **49 XP**
- Daily quests: 3/dia × 7 dias × ~1.4 XP médio = **~30 XP**
- Weekly quest: 6–10 XP
- **Total máximo: ~85–95 XP/semana** (com cenário muito disciplinado)

Subir de Ferro a Challenger sem decay levaria ~13 semanas. Com o decay,
você precisa **acelerar bastante nos tiers altos** para vencer a "gravidade" —
caso contrário você estabiliza num platô. Isso emula o MMR de MOBA.

**3 semanas consecutivas em Platina+** desbloqueiam uma **skin**.
Promoção/rebaixamento mostra overlay animado com confete (e vibração no mobile).

## Funcionalidades por tela

| Tela        | Recursos principais |
|-------------|---------------------|
| Início      | rank + barra XP; 3 daily quests; weekly quest; streaks (treino/sono/proteína/leitura); botão "Registrar dia"; atalhos rápidos |
| Treino      | **11 splits** (Upper A/B, Lower A/B, Push, Pull, Core/Abs, Cardio HIIT, Calistenia, Dança K-pop, Outro) com legendas KR; **~50 exercícios** detalhados (técnica, erros comuns, dica + 화이팅); séries × reps × carga; técnicas (rest-pause, drop, myo, AMRAP); timer 60/90/120/180s; progressão ↑/→/↓; histórico das 5 últimas sessões; botão **(i)** abre técnica completa |
| Biblioteca  | navegue todos os exercícios por categoria, com nome PT + KR (벤치 프레스, 데드리프트 etc.), busca e detalhamento completo |
| Nutrição    | **banco de 60+ alimentos** com kcal/macros por 100g (peito de frango → 비빔밥 → 김치); busca rápida; cálculo automático por porção com presets 50/100/150/200g; meta de kcal e proteína editáveis; refeições do dia |
| Corpo       | sparkline de peso + média 7d; medidas (cintura/peito/braço); upload fotos progresso; comparador lado-a-lado |
| Conquistas  | **20 achievements** com nomes coreanos (첫걸음, 단백질 마스터, 챌린저 etc.); XP bônus ao desbloquear; barra de progresso |
| Insights    | correlações (sono ≥7h → adesão de treino); foco da semana baseado no ponto mais fraco; histórico de ranks |
| Sono        | "apagando luz" / "acordei" calcula duração automaticamente; gráfico das últimas 7 noites |
| Leitura     | timer pomodoro 15min; livros em andamento com barra de progresso |
| Recompensas | customizáveis; histórico; skins desbloqueadas por 3 semanas Platina+ |
| Config      | nome, objetivos, lembretes de proteína; editor do pool de quests; tabela completa de ranks; export/import JSON; reset |

## Sistema de atributos (능력치)

5 stats que crescem por categoria de ação:

| Stat | KR | Cor | Cresce com |
|------|----|-----|------------|
| Força | 힘 | rosa | treinos pesados |
| Resistência | 지구력 | mint | cardio, passos, dança |
| Sabedoria | 지혜 | azul | leitura, estudo, foco |
| Disciplina | 절제 | roxo | proteína na meta + sono |
| Vitalidade | 활력 | dourado | streaks + quests completadas |

Exibidos como barras verticais no dashboard (ko: 능력치).

## Combo multiplier

Streaks ativos aplicam multiplicador ao XP ganho:

| Streak | Multiplier |
|--------|-----------|
| 3 dias  | ×1.1 |
| 7 dias  | ×1.2 |
| 14 dias | ×1.3 |
| 30 dias | ×1.5 |

(aparece no header do dashboard como "⚡ Combo ×1.2")

## Estética

- Paleta: pink `#FFB7C5`, lavender `#B7B5FF`, mint `#A8E6CF`, ink `#1A1A2E`,
  navy `#0F1729`
- Tipografia: Inter (corpo) + Noto Sans KR (acentos coreanos: 좋은 아침, 주간 미션...)
- Microinterações: confete sutil, animação pop, vibração curta em mobile
- Modo escuro (toggle no canto superior direito do dashboard)
- Mobile-first, otimizado para viewports < 400px

## Roadmap v2

- [ ] Sincronização cloud (Firebase Auth + Firestore ou Supabase)
- [ ] Compartilhamento com amigos (ver streaks/rank um do outro)
- [ ] Push notifications para lembretes de proteína (Service Worker já preparado)
- [ ] Importação automática de passos (Health Connect API / Apple HealthKit)
- [ ] Gráficos avançados (Recharts ou Chart.js) — séries temporais de carga máxima por exercício
- [ ] AMRAP do dia: registro destacado com comparação automática à última vez
- [ ] Calendário mensal com heatmap de adesão
- [ ] Modo "raid": meta semanal em grupo
- [ ] Reconhecimento OCR de etiqueta nutricional (foto → g de proteína)
- [ ] Integração com MacroFactor/FatSecret (via webhook ou IFTTT)
- [ ] Tema "K-pop idol" desbloqueável com avatares de stage

## Tech notes

- Sem build step: roda direto em qualquer host estático
- Tailwind via CDN (em prod, substituir por JIT pré-compilado)
- `app.js` em ESM mas autocontido (sem imports externos)
- Service worker estratégia: **network-first** para mesma origem,
  **stale-while-revalidate** para CDNs (Tailwind/Google Fonts)
- `structuredClone` usado para clonar pools default (Chrome 98+, Safari 15.4+)

---

Feito para um adulto com TDAH que precisa de feedback imediato e baixa
fricção. Cada interação no app é desenhada para gerar uma pequena
recompensa dopaminérgica — confete, vibração, animação de check.

화이팅 🩷
