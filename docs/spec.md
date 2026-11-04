# SoundAtlas — Spec de Desenvolvimento (com IA)

> Diário musical pessoal: pesquise álbuns, avalie com estrelas, escreva resenhas e registre cada escuta.

**Modo de desenvolvimento:** este documento foi escrito para ser seguido com **Codex** (agente de código) e **ChatGPT** (planejamento e revisão). Ele serve ao mesmo tempo como especificação do produto e como roteiro de tarefas para entregar à IA.

---

## 1. Visão geral

O **SoundAtlas** é uma aplicação web responsiva (mobile-first) para catalogar, avaliar e registrar experiências de escuta musical, com interface minimalista inspirada no Letterboxd.

A primeira versão é um **diário musical pessoal**, não um sistema de recomendações. O usuário descobre álbuns pela busca, adiciona à biblioteca, atribui estrelas, escreve comentários e acompanha seus hábitos de escuta por gênero, década e período. Recomendações entram em fase posterior, aproveitando os dados coletados no MVP.

### Princípios

- **Mobile-first:** layout pensado para ~360–430px; desktop é expansão.
- **Registrar em poucos toques:** adicionar, avaliar e logar uma escuta em menos de 15 segundos.
- **Visual limpo:** capas de álbum como protagonistas; tipografia sóbria; tema escuro por padrão.
- **Dados do usuário são dele:** exportação (JSON/CSV) desde o MVP.

---

## 2. Fluxo principal do usuário

1. **Pesquisar:** encontrar um álbum pelo nome ou artista.
2. **Adicionar à biblioteca:** definir status — *Quero ouvir*, *Ouvindo* ou *Já ouvi*.
3. **Avaliar:** atribuir estrelas (com meias estrelas) e escrever uma resenha.
4. **Registrar escuta:** informar a data e adicionar uma entrada ao diário.
5. **Explorar estatísticas:** filtrar por gêneros, décadas e histórico.

### Regra central: avaliação ≠ registro de escuta

São **duas entidades distintas**:

| Entidade | O que representa | Cardinalidade por álbum |
|---|---|---|
| **Entrada da biblioteca** (`library_entry`) | Estado *atual* do álbum para o usuário: status, avaliação atual, resenha atual | 1 por usuário/álbum |
| **Registro de escuta** (`listen_log`) | Um evento no diário: "ouvi em tal data" | N por usuário/álbum |

**Exemplo:** o usuário ouve *Titanic Rising* em janeiro e dá 4 estrelas. Em março ouve de novo e muda para 5.

- O **diário** preserva as duas experiências (jan → 4★, mar → 5★).
- A **biblioteca** exibe apenas a avaliação atual (5★).

Cada `listen_log` guarda um **snapshot** da nota daquele momento (`rating_at_time`), enquanto `library_entry.rating` guarda o valor vigente.

**Escala de notas:** de 0,5 a 5,0 em passos de 0,5 (**meias estrelas aceitas**).

---

## 3. Escopo do MVP

### Dentro do MVP

- Cadastro/login (e-mail + senha ou magic link)
- Busca de álbuns por nome/artista
- Página do álbum
- Biblioteca com status (*Quero ouvir / Ouvindo / Já ouvi*)
- Avaliação por estrelas (0,5 a 5) e resenha
- Diário de escuta (criar, listar, editar, excluir)
- Estatísticas básicas: gênero, década e período
- Perfil próprio e exportação (JSON/CSV)
- PWA básico (instalável na tela inicial)

### Fora do MVP

- Recomendações
- Feed social, seguidores, curtidas
- Listas personalizadas
- Integração com Spotify/Last.fm (scrobble)
- Avaliação de faixas individuais
- App nativo

### Critérios de sucesso

- Fluxo "buscar → adicionar → avaliar → logar" completo sem ajuda.
- Busca em < 2 s (com cache).
- Lighthouse mobile: Performance ≥ 85, Acessibilidade ≥ 90.
- Pelo menos 20 álbuns registrados por você sem bugs bloqueantes.

---

## 4. Telas

| Tela | Conteúdo principal |
|---|---|
| **Diário (início)** | Linha do tempo das últimas escutas (capa, nota, data, trecho do comentário) |
| **Buscar** | Campo de busca; resultados com capa, artista e ano |
| **Álbum** | Capa, artista, ano, gêneros, faixas; status; estrelas; resenha; "Registrar escuta"; histórico de escutas do álbum |
| **Biblioteca** | Abas por status; filtros (gênero, década, nota); ordenação |
| **Registrar escuta** (sheet) | Data (padrão: hoje), nota, comentário, marcação "reescuta" |
| **Estatísticas** | Escutas por mês, top gêneros, distribuição por década e por nota |
| **Perfil** | Conta, exportação, logout |

**Navegação:** barra inferior fixa — *Diário · Buscar · Biblioteca · Perfil* — com botão de ação rápida "+" para registrar escuta.

---

## 5. Modelo de dados

```sql
users (
  id            uuid primary key,
  username      text unique not null,
  created_at    timestamptz default now()
)

artists (
  id            uuid primary key,
  external_id   text unique not null,   -- MusicBrainz ID
  name          text not null
)

albums (
  id            uuid primary key,
  external_id   text unique not null,   -- MusicBrainz release-group ID
  title         text not null,
  artist_id     uuid references artists(id),
  release_date  date,
  release_year  int,
  decade        int generated always as ((release_year / 10) * 10) stored,
  genres        text[] default '{}',
  cover_url     text,
  track_count   int,
  fetched_at    timestamptz default now()
)

library_entries (
  id            uuid primary key,
  user_id       uuid references users(id) on delete cascade,
  album_id      uuid references albums(id),
  status        text check (status in ('want','listening','listened')) not null,
  rating        numeric(2,1) check (rating between 0.5 and 5),  -- avaliação ATUAL
  review        text,                                           -- resenha ATUAL
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (user_id, album_id)
)

listen_logs (
  id              uuid primary key,
  user_id         uuid references users(id) on delete cascade,
  album_id        uuid references albums(id),
  listened_on     date not null,
  rating_at_time  numeric(2,1) check (rating_at_time between 0.5 and 5),
  note            text,
  is_relisten     boolean default false,
  created_at      timestamptz default now()
)

create index on listen_logs (user_id, listened_on desc);
create index on library_entries (user_id, status);
```

> Ative **Row Level Security** por `user_id` em todas as tabelas de usuário.
> Valide notas também no código: apenas múltiplos de 0,5 (o `check` do banco aceita qualquer valor entre 0,5 e 5).

### Regras de negócio (fonte da verdade para testes)

1. Criar um `listen_log` **cria automaticamente** a `library_entry` se não existir (status `listened`).
2. Ao criar um `listen_log` com nota, `library_entry.rating` é atualizada **somente se** a escuta for a mais recente por `listened_on`.
3. Editar ou excluir um `listen_log` recalcula `library_entry.rating` a partir do log mais recente com nota; se não houver logs com nota, mantém a nota manual existente.
4. Alterar a nota na página do álbum atualiza `library_entry.rating` **sem** criar log.
5. `is_relisten` é sugerido automaticamente quando já existe log anterior do mesmo álbum.
6. Remover um álbum da biblioteca pergunta se os logs devem ser removidos (padrão: **manter**).
7. Notas válidas: 0,5; 1,0; 1,5; … ; 5,0.

---

## 6. Fonte de dados do catálogo

**Recomendação para o MVP:** MusicBrainz (metadados e tags) + Cover Art Archive (capas).

- Gratuito, dados abertos.
- Respeitar o rate limit (~1 req/s) e enviar `User-Agent` identificando o app.
- **Sempre via backend**, com cache nas tabelas `albums`/`artists`.
- Usar **release-group** como identidade do álbum (evita duplicatas de edições deluxe/remasters).
- Normalizar tags para uma lista curada de gêneros (rock, pop, hip hop, eletrônica, jazz, MPB…).

Alternativas (Spotify, Last.fm): conferir termos e restrições atuais antes de depender delas.

---

## 7. Stack

| Camada | Escolha |
|---|---|
| Front-end | Next.js (App Router) + TypeScript |
| Estilo | Tailwind CSS |
| Backend/DB | Supabase (Postgres + Auth + RLS) |
| Gráficos | Recharts (ou SVG próprio) |
| Hospedagem | Vercel + Supabase |
| Testes | Vitest (unidade) + Playwright (E2E) |

Mantenha a stack **fixa** durante o MVP: IAs funcionam melhor com um conjunto de tecnologias estável e bem documentado.

---

## 8. Endpoints / operações

```
GET    /api/search?q=
GET    /api/albums/:id

GET    /api/library?status=&genre=&decade=&rating=&sort=
PUT    /api/library/:albumId        status / nota / resenha
DELETE /api/library/:albumId

GET    /api/logs?from=&to=&albumId=
POST   /api/logs
PATCH  /api/logs/:id
DELETE /api/logs/:id

GET    /api/stats/genres?from=&to=
GET    /api/stats/decades?from=&to=
GET    /api/stats/timeline?granularity=month
GET    /api/stats/ratings

GET    /api/export?format=json|csv
```

---

## 9. Como trabalhar com Codex e ChatGPT

### Divisão de papéis

| Ferramenta | Use para |
|---|---|
| **ChatGPT** | Planejar, discutir decisões de design, revisar diffs, depurar erros colados, gerar dados de teste, revisar acessibilidade e textos |
| **Codex** | Implementar tarefas no repositório: criar arquivos, rodar testes, corrigir lint, abrir PRs/diffs para revisão |

### Arquivo `AGENTS.md`

O Codex lê um `AGENTS.md` na raiz do repositório com instruções permanentes. Crie-o na Etapa 0 com o conteúdo do **Apêndice A** e mantenha-o atualizado. Este `spec.md` também deve ficar no repositório (ex.: `docs/spec.md`) para a IA consultar.

### Ciclo de trabalho (por tarefa)

1. **Escolha uma tarefa** da seção 10 (uma por vez; cada tarefa deve caber em um diff revisável).
2. **Entregue o prompt** ao Codex, apontando `AGENTS.md` e as seções relevantes do spec.
3. **Teste primeiro** nas regras críticas: peça os testes antes da implementação.
4. **Rode** lint, typecheck e testes; confira o resultado no celular (ou no modo responsivo do navegador).
5. **Revise o diff** (você mesmo ou com ChatGPT usando a checklist do Apêndice B).
6. **Commit pequeno** na branch da tarefa e merge só com os critérios de aceite cumpridos.

### Boas práticas

- Uma tarefa = um objetivo. Evite prompts do tipo "faça a etapa inteira".
- Sempre inclua no prompt: **objetivo, arquivos/áreas envolvidas, regras de negócio, critério de aceite e o que NÃO mexer**.
- Não deixe a IA mudar o schema do banco sem você aprovar; mudanças vão em arquivos de migração versionados.
- Nunca cole chaves/segredos em prompts; use `.env.local` e `.env.example`.
- Se a IA errar duas vezes na mesma tarefa, pare: reescreva o prompt com mais contexto ou quebre a tarefa em duas.
- Peça sempre que a IA **explique** decisões não óbvias em comentários curtos ou na descrição do PR.

### Onde a IA mais erra (reforce na revisão)

- Regras de sincronização entre `library_entry` e `listen_log` (tarefas T4.x).
- Políticas RLS (usuário A enxergando dados do B).
- Rate limit e cache do MusicBrainz (chamadas repetidas ou sem `User-Agent`).
- Estados de carregamento, vazio e erro.
- Estrelas com meia nota no mobile (alvo de toque, acessibilidade).
- Fusos horários em `listened_on` (use `date`, não timestamp).

---

## 10. Plano de desenvolvimento em tarefas

Legenda: **Aceite** = critério para considerar a tarefa concluída. Prompts são pontos de partida; ajuste ao contexto.

### Etapa 0 — Fundação

**T0.1 — Projeto base**
- **Prompt:** "Crie um projeto Next.js (App Router) com TypeScript e Tailwind. Configure ESLint, Prettier e scripts `lint`, `typecheck`, `test`. Adicione Vitest. Não crie telas além de uma página inicial vazia."
- **Aceite:** `npm run lint`, `typecheck` e `test` passam; app abre em `localhost`.

**T0.2 — AGENTS.md e docs**
- **Prompt:** "Crie `AGENTS.md` na raiz com o conteúdo que eu fornecer [Apêndice A] e mova o spec para `docs/spec.md`."
- **Aceite:** arquivos presentes; comandos do `AGENTS.md` funcionam de fato.

**T0.3 — Design tokens e componentes base**
- **Prompt:** "Defina tema escuro com tokens (cores, tipografia, espaçamento) no Tailwind. Crie componentes `Button`, `Card`, `Input`, `Sheet` e `BottomNav` (Diário, Buscar, Biblioteca, Perfil). Mobile-first, alvos de toque ≥ 44px."
- **Aceite:** página `/dev/components` mostra todos em 390px de largura sem rolagem horizontal.

**T0.4 — Layout e rotas vazias**
- **Prompt:** "Crie as rotas `/`, `/buscar`, `/biblioteca`, `/perfil` e `/album/[id]` com layout compartilhado e `BottomNav`. Conteúdo placeholder."
- **Aceite:** navegação entre as telas funciona; item ativo destacado.

**T0.5 — Deploy**
- **Aceite:** app publicado na Vercel com variáveis de ambiente configuradas e `.env.example` no repositório.

### Etapa 1 — Autenticação

**T1.1 — Supabase e migrações**
- **Prompt:** "Configure o cliente Supabase (browser e servidor). Crie a migração inicial com as tabelas da seção 5 do spec e ative RLS em `library_entries` e `listen_logs` (acesso apenas ao próprio `user_id`). `albums` e `artists` são de leitura para autenticados."
- **Aceite:** migração aplica do zero; RLS ativo.

**T1.2 — Cadastro, login e logout**
- **Prompt:** "Implemente cadastro/login por e-mail e senha (ou magic link) com Supabase Auth. Telas `/entrar` e `/cadastrar`. Crie o registro em `users` com `username`."
- **Aceite:** fluxo completo funciona; erros exibidos de forma clara.

**T1.3 — Rotas protegidas e teste de isolamento**
- **Prompt:** "Proteja todas as rotas exceto login/cadastro. Escreva um teste que cria dois usuários e confirma que o usuário A não lê nem escreve dados do usuário B."
- **Aceite:** teste de isolamento passa.

### Etapa 2 — Catálogo e busca

**T2.1 — Cliente MusicBrainz**
- **Prompt:** "Crie um módulo servidor que busca release-groups (type Album) no MusicBrainz por texto, com `User-Agent` configurável, limite de 1 req/s e tratamento de erros/timeouts. Retorne título, artista, ano, id externo. Escreva testes com respostas mockadas."
- **Aceite:** testes passam; nenhuma chamada ao MusicBrainz parte do navegador.

**T2.2 — Capas e cache**
- **Prompt:** "Busque a capa no Cover Art Archive com fallback para placeholder. Ao abrir/selecionar um álbum, grave-o em `albums`/`artists`. Buscas repetidas devem usar o cache."
- **Aceite:** segunda busca idêntica não chama a API externa (verificável por log/teste).

**T2.3 — Normalização de gêneros**
- **Prompt:** "Crie uma lista curada de gêneros e uma função que mapeia tags do MusicBrainz para ela (com testes). Tags desconhecidas são ignoradas."
- **Aceite:** testes cobrem pelo menos 15 mapeamentos e casos desconhecidos.

**T2.4 — Tela de busca**
- **Prompt:** "Implemente `/buscar` com campo, debounce de 400 ms, lista de resultados (capa, título, artista, ano) e estados de carregamento, vazio e erro."
- **Aceite:** busca "Titanic Rising" mostra o álbum em < 2 s (após cache); estados tratados.

**T2.5 — Página do álbum (leitura)**
- **Prompt:** "Implemente `/album/[id]` com capa, título, artista, ano, gêneros e faixas. Sem ações de usuário ainda."
- **Aceite:** abre pela busca; layout correto em 360px.

### Etapa 3 — Biblioteca e avaliação

**T3.1 — Status do álbum**
- **Prompt:** "Na página do álbum, adicione um seletor de status (Quero ouvir / Ouvindo / Já ouvi) que faz upsert em `library_entries`. Permita remover da biblioteca (regra 6 do spec)."
- **Aceite:** status persiste após recarregar; remover funciona.

**T3.2 — Componente de estrelas**
- **Prompt:** "Crie um componente `StarRating` com meias estrelas (0,5 a 5), operável por toque, mouse e teclado, com `aria-label` e valor exibido. Valide múltiplos de 0,5."
- **Aceite:** toque na metade esquerda/direita de uma estrela dá meia/inteira; testes de unidade; funciona por teclado.

**T3.3 — Nota e resenha**
- **Prompt:** "Adicione nota e resenha (limite de 5.000 caracteres, com contador) à página do álbum, gravando em `library_entries` (regra 4: sem criar log)."
- **Aceite:** persiste; validação rejeita notas fora da escala.

**T3.4 — Tela de Biblioteca**
- **Prompt:** "Implemente `/biblioteca` com abas por status, grade/lista de capas, filtros (gênero, década, nota) e ordenação (recentes, nota, título)."
- **Aceite:** filtros combinam corretamente; estado vazio amigável.

### Etapa 4 — Diário de escuta (etapa crítica)

**T4.1 — Regras de negócio com testes primeiro**
- **Prompt:** "Antes de implementar, escreva testes de unidade para as regras 1, 2, 3, 5 e 7 do spec. Inclua o cenário *Titanic Rising*: log em janeiro com 4★, log em março com 5★ → biblioteca exibe 5★ e há 2 logs. Inclua: log antigo inserido depois não altera a nota atual; excluir o log mais recente volta a nota para a do log anterior. Depois implemente o módulo para os testes passarem."
- **Aceite:** todos os testes passam, incluindo o cenário Titanic Rising.

**T4.2 — API de logs**
- **Prompt:** "Implemente `POST/PATCH/DELETE/GET /api/logs` usando o módulo da T4.1, com validação (datas, escala de notas) e RLS."
- **Aceite:** testes de integração passam; usuário B não acessa logs de A.

**T4.3 — Sheet "Registrar escuta"**
- **Prompt:** "Crie o sheet com data (padrão hoje), `StarRating`, comentário e checkbox 'reescuta' (pré-marcado se houver log anterior). Acione pelo botão '+' da barra inferior e pela página do álbum."
- **Aceite:** registrar leva ≤ 3 interações após escolher o álbum.

**T4.4 — Linha do tempo do diário**
- **Prompt:** "Implemente a tela inicial `/` com logs agrupados por mês (capa, título, artista, data, nota do momento, trecho do comentário), com paginação ou scroll infinito."
- **Aceite:** ordenação por `listened_on` decrescente; mostra a nota *do momento*, não a atual.

**T4.5 — Histórico no álbum e edição/exclusão**
- **Prompt:** "Na página do álbum, liste as escutas daquele álbum, com editar e excluir (confirmação). Reflita as regras 2 e 3."
- **Aceite:** edição/exclusão recalcula a nota atual corretamente.

### Etapa 5 — Estatísticas

**T5.1 — Consultas agregadas**
- **Prompt:** "Crie views/funções SQL (ou queries) para: escutas por gênero, por década, por mês e distribuição de notas, com filtro de período. Escreva testes com dataset fixo."
- **Aceite:** resultados batem com os valores esperados do dataset de teste.

**T5.2 — Tela de estatísticas**
- **Prompt:** "Implemente `/estatisticas` (acesso pelo Perfil) com filtro de período (7 dias, 30 dias, ano, tudo) e gráficos legíveis em 360px. Estado vazio amigável."
- **Aceite:** gráficos sem rolagem horizontal; textos legíveis.

**T5.3 — Drill-down**
- **Prompt:** "Clique em um gênero ou década leva à Biblioteca com o filtro aplicado."
- **Aceite:** filtro chega pré-selecionado.

### Etapa 6 — Acabamento e lançamento

**T6.1 — Perfil e exportação**
- **Prompt:** "Crie `/perfil` com resumo (total de álbuns, escutas, nota média) e exportação JSON/CSV de biblioteca e diário."
- **Aceite:** arquivo exportado reimporta mentalmente os dados (conferência manual) e contém notas com meia estrela.

**T6.2 — PWA**
- **Prompt:** "Adicione manifest, ícones e service worker básico para instalação na tela inicial."
- **Aceite:** instalável no celular; Lighthouse PWA sem erros críticos.

**T6.3 — Acessibilidade e performance**
- **Prompt:** "Audite contraste, foco, rótulos e alvos de toque. Otimize imagens (`next/image`, tamanhos), adicione paginação onde faltar."
- **Aceite:** Lighthouse mobile: Performance ≥ 85, Acessibilidade ≥ 90.

**T6.4 — Testes E2E**
- **Prompt:** "Com Playwright, cubra o fluxo: cadastro → buscar → adicionar → avaliar → registrar escuta → ver no diário → ver estatística. Rode em viewport mobile."
- **Aceite:** teste E2E passa em CI.

**T6.5 — Monitoramento e beta**
- **Prompt:** "Adicione monitoramento de erros e analytics simples (eventos: busca, adicionar, avaliar, logar)."
- **Aceite:** erro proposital aparece no painel; beta com 5–10 pessoas iniciado.

---

## 11. Marcos e ritmo estimado

Estimativa para uso de IA em tempo parcial. A parte mecânica tende a ser rápida; revisão, teste no celular e decisões de produto continuam sendo o gargalo. **Trate os prazos como referência, não compromisso.**

| Marco | Entrega | Estimativa |
|---|---|---|
| **M1 — Esqueleto** | Etapas 0 e 1: app no ar com login | ~1 semana |
| **M2 — Descoberta** | Etapa 2: busca e página do álbum | ~1 semana |
| **M3 — Registro** | Etapas 3 e 4: biblioteca, nota, resenha, diário | ~1–2 semanas |
| **M4 — Insights** | Etapa 5: estatísticas | ~3–5 dias |
| **M5 — Beta** | Etapa 6: acabamento e testadores | ~1 semana |

**Total: ~4 a 6 semanas** em tempo parcial. Comece a usar o app com seus álbuns reais a partir do M3: é o melhor teste de usabilidade e já gera os dados das futuras recomendações.

---

## 12. Roadmap pós-MVP

### Fase 2 — Recomendações simples (sobre seus dados)
- "Mais deste gênero/década que você avalia bem"
- Artistas que você ouve muito, com discos ainda não ouvidos
- Discografia pendente de artistas favoritos
- Regras e SQL, sem machine learning

### Fase 3 — Recomendações avançadas
- Similaridade entre álbuns (tags, artistas relacionados, embeddings)
- Filtragem colaborativa quando houver base de usuários
- Explicação de cada sugestão ("porque você deu 5★ a X")

### Fase 4 — Social e integrações
- Seguir amigos, feed, listas compartilháveis
- Importação do Last.fm/Spotify, scrobbling
- Resumo anual ("Seu ano em música")

---

## 13. Riscos e decisões

| Risco / Dúvida | Mitigação |
|---|---|
| Código gerado que "parece certo" mas quebra regras de negócio | Testes antes do código nas tarefas T4.x; revisão com checklist (Apêndice B) |
| IA alterar escopo ou stack por conta própria | `AGENTS.md` com limites claros; tarefas pequenas |
| Falhas silenciosas de RLS | Teste de isolamento (T1.3) e repetição em cada nova tabela |
| Qualidade irregular de gêneros/capas no MusicBrainz | Lista curada de gêneros, fallback de capa |
| Rate limit da API de catálogo | Cache agressivo, fila de requisições |
| Duplicatas (deluxe, remaster) | Usar release-group |
| Escopo crescer antes do MVP | Lista "Fora do MVP" intocada até o M5 |
| Idioma | MVP em pt-BR; estruturar textos para i18n depois |
| Privacidade | MVP 100% privado; decidir visibilidade só na fase social |
| Decidido: escala de notas | Meias estrelas aceitas (0,5 a 5,0) |

---

## 14. Definição de pronto (qualquer tarefa)

- Critério de **Aceite** da tarefa cumprido
- `lint`, `typecheck` e `test` passando
- Funciona em 360px e em desktop
- Estados de carregamento, vazio e erro tratados
- Regras de negócio críticas com teste automatizado
- Sem erros no console; navegável por teclado
- Diff revisado por você; commit pequeno e descritivo

---

## Apêndice A — Modelo de `AGENTS.md`

```markdown
# AGENTS.md — SoundAtlas

## Projeto
Web-app mobile-first para avaliar álbuns (estrelas, resenha) e manter diário de escuta.
Especificação completa: docs/spec.md (fonte da verdade para regras de negócio).

## Stack (não alterar sem pedir)
Next.js (App Router) + TypeScript, Tailwind, Supabase (Postgres/Auth/RLS),
Vitest, Playwright, deploy na Vercel.

## Comandos
- Instalar: npm install
- Dev: npm run dev
- Lint: npm run lint
- Tipos: npm run typecheck
- Testes: npm run test
- E2E: npm run test:e2e

## Regras gerais
- Trabalhe em UMA tarefa por vez; faça mudanças pequenas e revisáveis.
- Antes de concluir, rode lint, typecheck e testes e informe o resultado.
- Não instale dependências novas sem justificar.
- Não altere o schema do banco fora de arquivos de migração versionados.
- Nunca commite segredos; use .env.local e mantenha .env.example atualizado.
- Chamadas ao MusicBrainz/Cover Art Archive: apenas no servidor, com User-Agent,
  máx. 1 req/s e cache em `albums`/`artists`.

## Regras de domínio (resumo)
- `library_entry` = estado ATUAL (status, nota, resenha); 1 por usuário/álbum.
- `listen_log` = evento do diário; N por álbum; guarda `rating_at_time`.
- Nota: 0,5 a 5,0 em passos de 0,5.
- Regras detalhadas: seção 5 do spec.

## UI
- Mobile-first (360–430px), tema escuro, alvos de toque ≥ 44px.
- Sempre tratar estados de carregamento, vazio e erro.
- Textos em pt-BR.

## Testes
- Regras de negócio críticas: escrever testes ANTES da implementação.
- Todo novo recurso com dados de usuário precisa de teste de isolamento (RLS).
```

## Apêndice B — Checklist de revisão do diff

- [ ] Implementa só o que a tarefa pediu (sem mudanças extras)?
- [ ] Regras de negócio da seção 5 respeitadas (principalmente 2, 3 e 4)?
- [ ] Toda query/tabela de usuário tem RLS e filtra por `user_id`?
- [ ] Notas validadas como múltiplos de 0,5 no código?
- [ ] Chamadas externas só no servidor, com cache e rate limit?
- [ ] Estados de carregamento, vazio e erro presentes?
- [ ] Layout testado em ~360px; sem rolagem horizontal?
- [ ] Acessibilidade: rótulos, foco, teclado, contraste?
- [ ] Testes novos ou atualizados; todos passando?
- [ ] Sem segredos, `console.log` ou código morto?
- [ ] Dependências novas justificadas?

## Apêndice C — Modelo de prompt para o Codex

```text
Contexto: leia AGENTS.md e docs/spec.md (seções [X, Y]).

Tarefa: [ID e título, ex.: T4.2 — API de logs]

Objetivo: [uma frase]

Requisitos:
- [regra de negócio ou comportamento 1]
- [regra de negócio ou comportamento 2]

Arquivos/áreas envolvidas: [ex.: src/lib/logs, src/app/api/logs]

Não faça: [ex.: não alterar o schema, não adicionar dependências, não mexer na UI]

Critério de aceite:
- [item verificável 1]
- [item verificável 2]

Ao final: rode lint, typecheck e testes e resuma o que mudou e o que ficou pendente.
```
