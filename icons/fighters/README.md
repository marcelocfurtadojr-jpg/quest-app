# Lutadores — imagens locais (opcional)

O app carrega automaticamente imagens PNG desta pasta se elas existirem,
sobrepondo os SVGs estilizados que já vêm embutidos no `app.js`.

**Essa pasta está no `.gitignore`** — qualquer imagem que você colocar aqui
**NÃO é commitada para o GitHub**. Isso mantém o repositório público limpo
de material com copyright. As imagens ficam apenas no seu PC/celular.

## Nomes esperados

Coloque os arquivos com exatamente estes nomes:

| Arquivo            | Personagem    | Onde aparece                                |
|--------------------|---------------|---------------------------------------------|
| `kano.png`         | Kano          | Atributo Força + hero da tela Treino + overlay BRUTALITY |
| `cage.png`         | Johnny Cage   | Atributo Vitalidade + overlay TOASTY        |
| `scorpion.png`     | Scorpion      | Overlay FATALITY                            |
| `subzero.png`      | Sub-Zero      | Atributo Disciplina                         |
| `raiden.png`       | Raiden        | Atributo Sabedoria + overlay OUTSTANDING    |
| `liukang.png`      | Liu Kang      | Atributo Resistência + overlay FLAWLESS VICTORY |

## Dimensões recomendadas

- **Resolução:** ~400×500 px (proporção retrato)
- **Fundo:** transparente (PNG com canal alpha)
- **Tamanho:** mantenha cada arquivo abaixo de ~150 KB (PWA roda no celular)
- **Estilo:** funciona melhor com renders/PNG isolados do personagem

## Como adicionar

1. Salve cada PNG nesta pasta com o nome correto (lista acima)
2. Atualize a página (Ctrl+F5) — o app detecta sozinho
3. Pronto. Se falhar, o SVG estilizado continua aparecendo (fallback)

## ⚠ Sobre legalidade

Sprites, renders, capas e arte oficial de Mortal Kombat são **propriedade
da NetherRealm Studios / Warner Bros Games**. "Uso pessoal" não é exceção
de copyright — mas:

- **Localmente no seu PC/celular:** risco prático ~zero
- **Subir no GitHub público:** seria distribuição → não faça
  - (o `.gitignore` já protege contra commit acidental)

Você é responsável pelas imagens que escolher colocar aqui. Boas
alternativas com menos atrito: fan-art, sprites editados pela comunidade,
ou apenas manter os SVGs estilizados (que já vêm prontos no app).
