# presente-bia

Site de presente de Dia dos Namorados — HTML, CSS e JavaScript puros. Deploy automático no GitHub Pages a cada push em `main`.

## estrutura

```
presente-bia/
├── index.html
├── styles/
│   ├── main.css       # tokens, fundo, ornamentos, botões
│   └── levels.css     # sistema de níveis + utilitários reutilizáveis
├── scripts/
│   └── main.js        # navegação entre níveis
├── assets/
│   ├── photos/        # imagens (.webp ou .jpg, max ~1600px)
│   └── audio/         # músicas e efeitos (.mp3, 128–192 kbps)
└── .github/workflows/
    └── deploy.yml     # publica automaticamente no gh-pages
```

### convenções de assets

- **Nomes**: kebab-case e sem acentos — `praia-jeri.jpg`, `nossa-musica.mp3`.
- **Fotos**: prefira `.webp` (~30% menor que JPG), com fallback em `.jpg`. Largura máxima de 1600px é mais que suficiente, mesmo pra desktop. Comprima em [squoosh.app](https://squoosh.app) antes de commitar.
- **Áudio**: `.mp3` a 128–192 kbps. Pra música de fundo, mantenha cada arquivo abaixo de 5MB pra não pesar no mobile.
- **Uso em HTML**: `<img src="assets/photos/foto.webp" alt="descrição">` ou `<audio src="assets/audio/musica.mp3" controls>`.

## rodando localmente

Basta abrir `index.html` no navegador. Pra desenvolvimento com live-reload:

```bash
npx serve .
# ou
python -m http.server 8000
```

## como adicionar um novo nível

1. Em `index.html`, dentro de `<main id="stage">`, adicione uma nova section:

   ```html
   <section class="level" data-level="2">
     <div class="level__inner">
       <p class="level__eyebrow">nível 2</p>
       <h2 class="level__title">título aqui</h2>
       <p class="level__subtitle">texto opcional</p>
       <div class="level__actions">
         <button class="btn" data-action="prev">voltar</button>
         <button class="btn btn--primary" data-action="next">seguir</button>
       </div>
     </div>
   </section>
   ```

2. As animações de entrada são automáticas — cada filho direto de `.level__inner` é escalonado pela CSS.

### ações disponíveis nos botões

| atributo                          | comportamento                |
|-----------------------------------|------------------------------|
| `data-action="next"`              | avança um nível              |
| `data-action="prev"`              | volta um nível               |
| `data-action="goto" data-target="N"` | pula pro nível N (índice) |
| `data-action="restart"`           | volta pro nível 0            |

### utilitários CSS prontos pra usar dentro de qualquer nível

- `.photo` — imagem com moldura e leve sombra (suporta `--photo-tilt` pra inclinar)
- `.script` — texto em fonte cursiva
- `.card` — card translúcido com blur de fundo
- `.divider` — divisor ornamental com linha fina

## deploy

A cada push em `main`, o workflow `.github/workflows/deploy.yml` publica em `https://<seu-usuario>.github.io/presente-bia/`.

**Ativação (uma única vez):**
1. Crie o repo no GitHub e faça push.
2. Em **Settings → Pages**, em "Source", selecione **GitHub Actions**.

## controle programático (console do navegador)

```js
presente.next();        // próximo nível
presente.prev();        // nível anterior
presente.goTo(2);       // pula pro índice 2
presente.current();     // índice atual
presente.total();       // total de níveis
```
