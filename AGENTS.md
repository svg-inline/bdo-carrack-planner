<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

### REGRA DE OURO

O site deve funcionar de forma básica, sem JavaScript. E o site deve funcionar caso as APIs do WordPress caiam.

## Qualidade obrigatória

Toda mudança deve passar por:

- lint
- typecheck
- unit tests
- component tests quando aplicável
- build
- e2e para fluxos críticos

Não alterar contratos, URLs, SEO ou regras do Design System
sem atualizar a documentação correspondente.

## Atualização obrigatória de documentação e changelog

Consultar `docs/changelog.md` para regras de registro no CHANGELOG.
Toda alteração relevante no projeto deve atualizar a documentação correspondente no mesmo conjunto de mudanças.

### Documentação

Antes de modificar uma funcionalidade, consulte os documentos relacionados em `docs/`.

Se a implementação alterar qualquer regra documentada, atualize o override
responsável. Se a mudança for arquitetural, atualize também o ADR existente ou
crie um novo.

Não duplicar a mesma regra em vários documentos. Atualize o override
responsável e, quando necessário, apenas referencie-o nos demais documentos.

Usar a seção:

```md
## [Unreleased]
```

Categorias permitidas:

```md
### Added

### Changed

### Fixed

### Removed

### Deprecated

### Security
```

Exemplo:

```md
## [Unreleased]

### Added

- Testes E2E para redirects canônicos.

### Changed

- Consolidada a área de conta em `/minha-conta/*`.

### Fixed

- Corrigido canonical da Central de Conteúdos.

### Removed

- Removida a rota legada `/ahome-v3`.
```

Registrar mudanças de forma objetiva, descrevendo o efeito da alteração e não detalhes internos irrelevantes.

Não adicionar ao changelog:

- formatação;
- renomeações internas sem impacto;
- refactors sem mudança de comportamento;
- comentários;
- pequenas alterações exclusivamente de implementação.

### Regra de conclusão

Uma tarefa que modifica comportamento documentado não está concluída enquanto:

```text
código
+
testes aplicáveis
+
documentação correspondente
+
CHANGELOG.md quando aplicável
```

não estiverem atualizados no mesmo conjunto de mudanças.

## Tailwind CSS

- evitar arbitrary values (`[...]`) quando existir utility ou token equivalente;
- não acessar tokens CSS através de classes como `rounded-[var(...)]`, `text-[var(...)]`, `bg-[var(...)]` ou equivalentes;
- reutilizar as utilities geradas pelo `@theme inline` de `app/globals.css`;
- novos valores reutilizáveis devem ser promovidos para token ou utility global conforme `docs/engineering/tailwind.md`;
- não criar escalas locais de tipografia, cores, espaçamento, radius ou shadows;
- componentes canônicos do Design System têm precedência sobre estilização local.

- evitar CSS inline (`style={{...}}`) e blocos `<style>`/`<style jsx>`; estilos estáticos devem usar Tailwind, tokens, `@utility`, componentes do Design System ou CSS Modules. CSS inline é permitido apenas para valores realmente dinâmicos que não possam ser representados adequadamente por classes.

Adicione esta regra:

### Variantes com CVA

Usar `class-variance-authority` (`cva` + `VariantProps`) quando um **componente reutilizável possuir variantes visuais explícitas e estáveis** controladas por props, como:

- `variant`: `primary | secondary | ghost`
- `size`: `sm | md | lg`
- `tone`: `brand | content`
- `state`: variantes visuais semânticas

Exemplo:

```tsx
import { cva, type VariantProps } from "class-variance-authority";

const buttonVariants = cva("inline-flex items-center justify-center", {
  variants: {
    variant: {
      primary: "bg-conteudo text-white",
      secondary: "border border-conteudo text-conteudo",
    },
    size: {
      sm: "h-8 px-3",
      md: "h-10 px-4",
      lg: "h-11 px-6",
    },
  },
  defaultVariants: {
    variant: "primary",
    size: "md",
  },
});

type ButtonProps = VariantProps<typeof buttonVariants>;
```

Não usar CVA para:

- classes condicionais pontuais de uma página;
- estado de negócio;
- layout específico de uma única tela;
- substituir um simples `cn(...)`;
- criar variantes que não fazem parte da API real do componente.

Exemplo simples que **não precisa de CVA**:

```tsx
className={cn(
  "flex items-center",
  active && "bg-conteudo text-white"
)}
```

Regra prática:

> Se a variação faz parte da API reutilizável do componente, considere `cva`.
> Se é apenas uma condição local de renderização/estado, use `cn()`.

Antes de criar novas variantes, verificar se o componente canônico já possui essa opção. Quando faltar, preferir estender o componente existente em vez de criar outro paralelo.

### Boas práticas de Next.js

- Prefira usar IMG do nextjs para imagens, pois ele otimiza as imagens e melhora a performance do site.
- Prefira usar Link do nextjs para links internos, pois ele otimiza a navegação do site.
- Declaração Prévia de funções e componentes: Prefira declarar funções e componentes antes de usá-los, para evitar problemas de hoisting.

### Radix UI

Utilize componentes e primitivas do Radix UI sempre que possível; crie componentes de interface personalizados apenas quando o Radix UI não oferecer uma solução adequada.

### BDO LINKS ÚTEIS

- [LINKS ÚTEIS MAR](./docs/bdo-links-uteis-mar.md)
- [LINKS ÚTEIS GERAL](./docs/bdo-links-uteis.md)
