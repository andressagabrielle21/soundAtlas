# SoundAtlas — Spec de Desenvolvimento (com IA)

> Diário musical pessoal: pesquise álbuns, avalie com estrelas, escreva resenhas e registre cada escuta.

**Modo de desenvolvimento:** este documento foi escrito para ser seguido com **Codex** (agente de código) e **ChatGPT** (planejamento e revisão). Ele serve ao mesmo tempo como especificação do produto e como roteiro de tarefas para entregar à IA.

**Revisão da implementação: 06/11/2026.** As seções de telas e operações descrevem o código atual. A seção 10 conserva o roteiro de desenvolvimento, com notas sobre mudanças posteriores; seus critérios de aceite não representam uma declaração de conclusão ou de validação em produção. As regras de negócio da seção 5 continuam normativas.

**Planejamento pós-MVP: 06/11/2026.** As seções 15 a 18 descrevem trabalho **planejado e ainda não implementado** (performance e segurança, Discover com Last.fm, preparação para a parte social). As tarefas operacionais dessas etapas ficam em `docs/tasks.md`; as demais seções continuam descrevendo o código atual.

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

- Cadastro/login por e-mail e senha, com confirmação de e-mail quando exigida pelo Supabase (magic link não implementado)
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

> Recomendações, integração com Last.fm e recursos sociais passam a ser planejados nas seções 15 a 18 (Fases 2 e 3).

### Critérios de sucesso

- Fluxo "buscar → adicionar → avaliar → logar" completo sem ajuda.
- Busca em < 2 s (com cache).
- Lighthouse mobile: Performance ≥ 85, Acessibilidade ≥ 90.
- Pelo menos 20 álbuns registrados por você sem bugs bloqueantes.

---

## 4. Telas

| Tela | Conteúdo principal |
|---|---|
| **Discover** (`/discover`) | Lançamentos dos últimos 30 dias; `/` redireciona para esta tela |
| **Buscar** (`/buscar`) | Busca por título ou artista, incluindo último termo incompleto; debounce de 400 ms; resultados paginados com capa, artista e ano |
| **Álbum** (`/album/[id]`) | Capa, título, artista, ano, gêneros e faixas; status; nota e resenha; botão minimalista "+" ao lado dos dados principais; histórico com editar/excluir no canto superior direito de cada escuta |
| **Biblioteca** (`/biblioteca`) | Abas por status em toda a largura; filtro no cabeçalho; gênero, década e nota; ordenação por recentes, nota ou título; grade/lista e paginação de 24 álbuns; metadados compactos |
| **Registrar escuta** (sheet) | Data (padrão: hoje), nota, comentário, marcação "reescuta" |
| **Perfil** (`/perfil`) | Resumo compacto de álbuns, escutas e nota média; estatísticas por mês, gênero, década e nota; diário agrupado por mês, com paginação de 20 escutas; exportação JSON/CSV e logout |
| **Entrar / Criar conta** (`/entrar`, `/cadastrar`) | Formulários minimalistas de e-mail e senha; cadastro também exige nome de usuário; validações e confirmação de e-mail; sem navegação inferior |

**Navegação:** barra inferior aderente ao rodapé — *Discover · Buscar · + · Biblioteca · Perfil*. O botão "+" se projeta acima da barra, com base arredondada, e abre `/buscar?registrar=1` para escolher o álbum. A página do álbum abre o sheet diretamente; `?registrar=1` permite abri-lo ao chegar à página.

**Rotas de compatibilidade:** `/diario` redireciona para `/perfil#diario`, preservando a página válida; `/estatisticas` redireciona para `/perfil?periodo=…#estatisticas`. Estatísticas usam 7 dias, 30 dias (padrão), ano ou tudo. `/login` e `/cadastro` não são os caminhos implementados.

**Apresentação:** tema escuro, layout mobile-first, alvos de toque ≥ 44px e rótulos acessíveis em ações com ícones. Estados de carregamento usam círculo animado centralizado e texto acessível; vazio e erro continuam explícitos. Na página do álbum, a avaliação aparece diretamente quando ainda não há escutas; quando há, fica no sheet, na seção expansível "Nota e resenha do álbum". A interface não oferece atualmente a remoção do álbum da biblioteca (ver regra 6).

**Planejado (não implementado):** `/discover` ganha seções de álbuns em alta (Last.fm) e, depois, atividade da comunidade; `/album/[id]` ganha, ao final, álbuns de artistas similares; surgem `/perfil/privacidade` e `/u/[username]` (seções 17 e 18).

---

## 5. Modelo de dados

O SQL abaixo resume as entidades e não substitui as migrações executáveis em `supabase/migrations`. Triggers de criação de perfil, funções de diário, remoção e agregações do perfil são versionados nessas migrações; alterações de schema devem continuar sendo feitas exclusivamente por migração.

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

**Situação da regra 6:** a operação de remoção permanece na Server Action e na função SQL `remove_library_album`, mas seu controle foi retirado da interface. A regra continua válida caso a remoção volte a ser exposta; a interface atual não satisfaz o aceite original de remoção em T3.1.

---

## 6. Fonte de dados do catálogo

**Recomendação para o MVP:** MusicBrainz (metadados e tags) + Cover Art Archive (capas).

- Gratuito, dados abertos.
- Respeitar o rate limit (~1 req/s) e enviar `User-Agent` identificando o app.
- **Sempre via backend**, com cache nas tabelas `albums`/`artists`.
- Usar **release-group** como identidade do álbum (evita duplicatas de edições deluxe/remasters).
- Normalizar tags para uma lista curada de gêneros (rock, pop, hip hop, eletrônica, jazz, MPB…).

**Busca implementada:** frases por título/artista e prefixo no último termo; a consulta parcial de artistas usa `artistname`. Resultados de busca têm cache em memória por 10 minutos, limitado a 128 consultas, com reutilização de requisições em andamento; esse cache é por instância, não persistente nem compartilhado entre servidores. O catálogo selecionado é persistido em `albums`/`artists`. Discover consulta até 24 lançamentos com revalidação de uma hora. A consulta externa tem prazo de 5 segundos. A correção da busca parcial possui testes mockados; eles não comprovam a qualidade dos resultados da API real.

**Last.fm** é a fonte planejada para álbuns em alta e artistas similares (seção 17), sempre como camada complementar: MusicBrainz continua sendo a identidade do álbum. Spotify não está previsto; conferir termos e restrições atuais antes de depender dele ou de qualquer outra API.

---

## 7. Stack

| Camada | Escolha |
|---|---|
| Front-end | Next.js (App Router) + TypeScript |
| Estilo | Tailwind CSS |
| Backend/DB | Supabase (Postgres + Auth + RLS) |
| Gráficos | Barras em HTML/CSS, sem biblioteca adicional |
| Hospedagem | Vercel + Supabase |
| Testes | Vitest (unidade) + Playwright (E2E) |

Mantenha a stack **fixa** durante o MVP: IAs funcionam melhor com um conjunto de tecnologias estável e bem documentado.

---

## 8. Endpoints / operações

As operações abaixo refletem a implementação atual. Leituras das páginas usam componentes de servidor e Supabase; alterações de status, nota e resenha usam Server Actions, sem endpoints REST dedicados de biblioteca ou estatísticas.

```
GET    /buscar/resultados?q=         busca de álbuns
GET    /album/:id/capa               proxy público de capa / fallback
GET    /auth/confirmar               confirmação de autenticação

GET    /api/logs?album_id=&id=&offset=
POST   /api/logs
PATCH  /api/logs                     identificador no corpo JSON
DELETE /api/logs?id=

GET    /api/export?format=json|csv
```

- `openAlbum`: seleciona/persiste o álbum e redireciona para seus detalhes.
- `updateLibrary`: altera status; também conserva a operação de remoção, atualmente sem controle na interface.
- `saveReview`: salva a nota e a resenha atuais, sem criar uma escuta.
- `signIn`, `signUp`, `signOut`: autenticação por Server Actions.
- RPCs `read_profile_data` e `read_listening_stats`: resumo e estatísticas do perfil; `read_album_diary` e `write_album_diary`: leitura e gravação transacional do diário.
- RLS e validação no servidor continuam obrigatórias nas operações com dados do usuário.

**Planejado:** as novas operações (resolver álbum do Last.fm, seguir, bloquear, denunciar, curtir, comentar) seguem o padrão atual de Server Actions com validação Zod, sem novos endpoints REST, salvo necessidade justificada (seções 16 a 18).

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

1. **Escolha uma tarefa** da seção 10 (histórico do MVP) ou de `docs/tasks.md` (Etapas 7 a 10), uma por vez; cada tarefa deve caber em um diff revisável.
2. **Entregue o prompt** ao Codex, apontando `AGENTS.md` e as seções relevantes do spec.
3. **Teste primeiro** nas regras críticas: peça os testes antes da implementação.
4. **Rode** lint, typecheck e testes; confira o resultado no celular (ou no modo responsivo do navegador).
5. **Revise o diff** (você mesmo ou com ChatGPT usando a checklist do Apêndice B).
6. **Commit pequeno** na branch da tarefa e merge só com os critérios de aceite cumpridos.

**Antes de cada commit ou push:** executar `npm test` completo, sem filtros, e `npm run lint`; corrigir falhas antes de prosseguir e informar os resultados, conforme `AGENTS.md`. `npm test` executa Vitest; o E2E é separado (`npm run test:e2e`) e exige Supabase local configurado. Não tratar aprovação de testes unitários como aprovação do E2E ou de auditoria visual.

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
- Chamadas a APIs externas (Last.fm) dentro da renderização da página, sem timeout nem `Suspense`.
- Vazamento de dados privados ao criar tabelas, views ou RPCs `security definer` novas (sem RLS, sem `search_path` fixo, sem usar `auth.uid()`).
- Rate limit com contador em memória (não funciona entre instâncias serverless).

---

## 10. Plano de desenvolvimento em tarefas

Legenda: **Aceite** = critério para considerar a tarefa concluída. Prompts são pontos de partida; ajuste ao contexto.

**Ajustes ao roteiro original:** T0.3 usa Discover no lugar de Diário na barra; T1.2 implementa e-mail/senha; T3.1 mantém status, mas a remoção foi retirada da interface; T4.4 é entregue dentro do perfil e `/` abre Discover; T5.2 também está no perfil, com redirecionamento da rota antiga; T6.1 reúne resumo, estatísticas, diário e exportação. Os prompts abaixo são históricos e devem ser interpretados com essas alterações e com as seções 4 e 8.

**Etapas 7 a 10 (pós-MVP):** performance e segurança, Discover/Last.fm, preparação social e social. Seus prompts, ordem e critérios de aceite estão em `docs/tasks.md`; o desenho e as regras estão nas seções 15 a 18.

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
| **M6 — Base segura** | Etapa 7: auditoria, RLS, Zod, rate limit, CSP | ~1–2 semanas |
| **M7 — Discover+** | Etapa 8: álbuns em alta e similares (Last.fm) | ~1–2 semanas |
| **M8 — Pré-social** | Etapa 9: privacidade, eventos, seguir/bloquear, testes | ~1–2 semanas |
| **M9 — Comunidade** | Etapa 10: feed, perfis, curtidas, comentários | ~2–3 semanas |

**Total do MVP (M1–M5): ~4 a 6 semanas** em tempo parcial; M6–M9 são estimativas iniciais para as próximas fases. Comece a usar o app com seus álbuns reais a partir do M3: é o melhor teste de usabilidade e já gera os dados das futuras recomendações.

---

## 12. Roadmap pós-MVP

### Etapa 7 — Performance e segurança (base)
- Auditoria do estado atual, RLS verificável em CI, Zod, rate limit, CSP, imagens, observabilidade (seção 15)

### Fase 2 — Discover com álbuns em alta e artistas similares (Last.fm)
- Seções "Artistas em alta" e "Populares por gênero" no `/discover`, ao lado de "Lançamentos"
- Bloco de álbuns de artistas similares ao fim de `/album/[id]` (seção 17)

### Fase 2b — Recomendações pessoais (sobre seus dados)
- "Mais deste gênero/década que você avalia bem"
- Artistas que você ouve muito, com discos ainda não ouvidos
- Regras e SQL, sem machine learning

### Fase 3 — Comunicação entre usuários (seção 18)
- 3-prep: privacidade, `activity_events`, seguir/bloquear/denunciar, exclusão de conta, testes de privacidade
- 3a: "Comunidade" no `/discover`, perfis públicos, seguir
- 3b: "Em alta no SoundAtlas", curtidas
- 3c: comentários curtos

### Fase 4 — Avançado
- Similaridade entre álbuns (tags, embeddings) e filtragem colaborativa, com explicação de cada sugestão
- Importação do Last.fm/Spotify, scrobbling, listas compartilháveis
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
| Last.fm não tem chart de álbuns nem "álbuns similares" | Derivar via artistas (seção 17.2) e rotular como "em alta no Last.fm" |
| Itens do Last.fm sem `mbid` confiável | Resolvedor com `album_links` e cache negativo |
| Termos de uso do Last.fm (cache, atribuição, uso comercial) | Revisar antes de lançar e registrar em `docs/decisions.md` |
| Tela fria lenta ao depender do Last.fm | `Suspense` por seção, timeout de 3 s, medir; promover para cache persistente + cron se necessário |
| Cache de busca em memória não é compartilhado entre instâncias | Não usá-lo para rate limit; contador em armazenamento compartilhado |
| Vazamento de dados privados ao abrir a parte social | Projeções (`activity_events`), privado por padrão, matriz de testes de privacidade |
| Abuso em perfis e comentários | Bloqueio, denúncia, rate limit; sem DMs nem upload de avatar no início |
| Proxy de capa (`/album/:id/capa`) público | Lista de hosts permitidos e validação (T7.5) |

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

## 15. Performance e segurança

> **Planejado.** Vale para todo o app e é pré-requisito da Fase 3: abrir dados de usuários a outros usuários só é seguro sobre uma base endurecida. O primeiro passo é **auditar o que já existe** (T7.0 em `docs/tasks.md`) e corrigir apenas as lacunas.

### 15.1 Metas mensuráveis (mobile, rede 4G simulada)

| Métrica | Meta |
|---|---|
| LCP (maior elemento visível) | < 2,5 s |
| INP (resposta a toques) | < 200 ms |
| CLS (saltos de layout) | < 0,1 |
| Lighthouse mobile | Performance ≥ 85 · Acessibilidade ≥ 90 · Boas práticas ≥ 90 |
| JS inicial por rota | ≤ ~200 KB (gzip), conferido com bundle analyzer |
| Rota própria com dado em cache (p95) | < 500 ms |
| Chamada a API externa | **nunca** bloqueia a renderização de uma tela inteira |

Antes de impor metas no CI, meça a linha de base atual (T7.7); metas já violadas hoje viram tarefas, não bloqueios imediatos.

### 15.2 Princípios de performance

1. **Cache-first:** telas leem de cache ou do banco; APIs externas (MusicBrainz, Last.fm) alimentam o cache.
2. **Streaming por seção:** cada bloco que depende de API externa fica em seu próprio `<Suspense>` com skeleton e **timeout curto (≈ 3 s)**; falha oculta o bloco, nunca quebra a página.
3. **Stale-while-revalidate:** servir o dado antigo enquanto atualiza em segundo plano.
4. **Paginação por cursor/limite** em biblioteca, diário e feeds; limite máximo imposto no servidor.
5. **Imagens:** `next/image` com `sizes` corretos, miniaturas em listas, lazy-load abaixo da dobra, placeholder/fallback de capa, hosts em lista de permissão.
6. **Cálculos no banco:** agregações em SQL/RPC com índices (já é o padrão de `read_listening_stats`).
7. **Interface otimista** em ações curtas (curtir, seguir), revertendo em caso de falha.
8. **Bundle enxuto:** sem bibliotecas pesadas; revisar dependências sugeridas pela IA.
9. **Chamadas externas paralelas** com `Promise.allSettled`, concorrência limitada e timeouts; uma fonte fora do ar não derruba a outra.

### 15.3 Princípios de segurança

**Identidade e acesso**
- `user_id` **sempre derivado da sessão no servidor**, nunca do corpo da requisição ou de parâmetros de URL.
- **RLS ativo em toda tabela** do schema `public`; tabela sem RLS deve quebrar o CI (T7.1).
- Tabelas privadas (`library_entries`, `listen_logs`) **nunca** têm a política afrouxada para terceiros. Dados sociais saem por **projeções** (seção 18).
- Chave `service_role` só em código de servidor e só quando indispensável.

**Segredos e dependências**
- Chaves (Last.fm, `service_role`, futuros segredos de cron) só no servidor; nenhuma variável secreta com prefixo `NEXT_PUBLIC_`; scanner de segredos em CI.
- Dependabot e `npm audit`; toda dependência sugerida pela IA é verificada (existe? é mantida? é necessária?).

**Entrada e saída**
- **Zod no servidor** em toda Server Action, rota `/api` e rota GET com parâmetros (`/buscar/resultados`, `/album/:id/capa`): tipos, tamanhos, escala de notas, datas, `limit` máximo. Respostas de APIs externas também são validadas antes de gravar ou exibir.
- Texto de usuário (resenhas, comentários futuros) é **texto puro**; sem `dangerouslySetInnerHTML`.
- **Nada de proxy aberto:** `/album/:id/capa` só busca capas de hosts permitidos para aquele álbum.

**Abuso**
- Rate limiting por usuário/IP em busca, autenticação, ações que chamam API externa e (futuro) seguir/comentar. Em ambiente serverless, o contador precisa de **armazenamento compartilhado** (o cache de busca atual é em memória por instância e **não serve** para isso). Resposta `429` com `Retry-After`.

**Transporte e navegador**
- HTTPS; `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors 'none'`. A CSP deve listar apenas os hosts de imagem realmente usados (Cover Art Archive, Last.fm se aplicável, Supabase).

**Dados e conformidade**
- Backups ativos com **restauração testada**; exportação já existe (`/api/export`); exclusão de conta completa (LGPD) é pré-requisito da Fase 3.
- Logs e monitoramento **sem dados pessoais** (sem e-mail, sem texto de resenha).

### 15.4 Itens a verificar na auditoria (T7.0)

Pontos que a spec atual não permite confirmar e que o código deve responder:

- Todas as tabelas têm RLS? Existe teste de isolamento entre usuários (T1.3) e ele cobre as RPCs (`read_profile_data`, `read_listening_stats`, `read_album_diary`, `write_album_diary`, `remove_library_album`)? As funções `security definer` fixam `search_path` e derivam o usuário de `auth.uid()`?
- `/buscar/resultados`, `/album/:id/capa`, `/api/logs` e `/api/export` exigem sessão? Quais validam entrada com schema? Quais têm limite de tamanho/paginação?
- O proxy de capa aceita URL arbitrária ou só hosts conhecidos?
- Há rate limiting em algum ponto? Há cabeçalhos de segurança/CSP?
- Alguma chave aparece em código de cliente ou com prefixo `NEXT_PUBLIC_`?
- Qual é a linha de base de Lighthouse/bundle nas rotas principais?
- Backups estão ativos e já houve teste de restauração?

---

## 16. Arquitetura pós-MVP

Princípio: **segura, simples e eficaz**. Continuamos com o monólito Next.js + Supabase e **reaproveitamos os padrões já em uso** (Server Components para leitura, Server Actions para escrita, RPCs transacionais no Postgres, RLS). Sem microsserviços, filas ou servidores novos.

```
Navegador (PWA, mobile-first)
        │ HTTPS
Next.js na Vercel ── Server Components (leitura) · Server Actions (escrita)
        │                 │
        │                 ├─ lib/musicbrainz   (existente)
        │                 ├─ lib/lastfm        (novo: só servidor, timeout, Zod)
        │                 └─ cache: fetch com revalidate (padrão do Discover atual)
        │
Supabase (Postgres + Auth + RLS)
   ├─ PRIVADO:  library_entries, listen_logs                   (RLS: só o dono)
   ├─ CATÁLOGO: albums, artists, album_links (novo)            (escrita só no servidor)
   └─ PÚBLICO CONTROLADO (Fase 3): activity_events, follows, view public_profiles
```

### Decisões

1. **Cache dos dados do Last.fm:** começar com o mecanismo já usado em Discover (`fetch` com `revalidate`, compartilhado pelo Next na hospedagem), não com uma infraestrutura nova. **Regra de promoção:** só criar tabela `external_cache` + cron de atualização se a medição (T8.6) mostrar tela fria > 3 s ou problemas de limite com o Last.fm.
2. **Vínculos persistentes:** a correspondência item do Last.fm → álbum do MusicBrainz (`album_links`) precisa sobreviver a reinícios; por isso vai para o Postgres, não para memória.
3. **Streaming por seção** (`<Suspense>`) em vez de endpoints REST novos para "similares" e "em alta".
4. **Projeções em vez de abrir tabelas privadas:** a parte social lê `activity_events`, nunca `listen_logs`.
5. **Escrita pelo padrão atual:** novas mutações como Server Actions com Zod, e RPC quando precisarem de transação (como `write_album_diary`).
6. **Feature flags por variável de ambiente** (`FEATURE_DISCOVER_TRENDING`, `FEATURE_SOCIAL`): código novo entra desligado e é ativado gradualmente.
7. **Registro de decisões** em `docs/decisions.md`, também útil como contexto para a IA.

### Novas estruturas de dados

```sql
-- Fase 2: vínculo persistente Last.fm → álbum do SoundAtlas
album_links (
  id          uuid primary key,
  source      text not null,                 -- 'lastfm'
  source_key  text not null,                 -- mbid ou 'artista||álbum' normalizado
  album_id    uuid references albums(id),    -- null = tentativa sem sucesso (cache negativo)
  resolved_at timestamptz not null default now(),
  unique (source, source_key)
)
```

`album_links` é de leitura/escrita **apenas do servidor** (RLS impede acesso direto por usuários). As estruturas da Fase 3 estão na seção 18.

---

## 17. Fase 2 — Discover com álbuns em alta e artistas similares (Last.fm)

> **Planejado.** Nada desta seção está implementado. Tarefas operacionais: Etapa 8 em `docs/tasks.md`.

### 17.1 Objetivo

- Ampliar o **`/discover`** (que hoje mostra lançamentos dos últimos 30 dias via MusicBrainz) com álbuns **em alta**.
- Ao fim de cada **`/album/[id]`**, exibir álbuns de **artistas similares**.

### 17.2 O que o Last.fm oferece (e não oferece)

Conferido na documentação dos métodos:

- **Não existe** chart global de **álbuns**. Os charts são de artistas, faixas e tags (`chart.getTopArtists`, `chart.getTopTracks`, `chart.getTopTags`, `chart.getHypedArtists`…).
- **Não existe** método de "álbuns similares". Há `artist.getSimilar`, `artist.getTopAlbums` e `tag.getTopAlbums`.

Logo, "álbuns em alta" é **derivado**:

| Seção do `/discover` | Fonte | Situação |
|---|---|---|
| **Lançamentos** (30 dias) | MusicBrainz | Existente |
| **Artistas em alta** | `chart.getTopArtists` → álbum principal de cada um (`artist.getTopAlbums`, limit 1) | Fase 2 |
| **Populares em [gênero]** | `tag.getTopAlbums` para os gêneros mais frequentes do usuário (lista curada para quem é novo) | Fase 2 |
| **Em alta no SoundAtlas** | Agregado de escutas de quem compartilha | Fase 3 |
| **Atividade da comunidade** | `activity_events` | Fase 3 |

A interface deve dizer "populares/em alta no Last.fm", não "lançamentos". A ordem das seções (por exemplo, *Em alta* acima de *Lançamentos*) é decisão de produto a validar no celular.

**Similares em `/album/[id]`:** `artist.getSimilar` do artista do álbum (por `mbid` quando houver, senão por nome) → até 6 artistas → álbum principal de cada um via `artist.getTopAlbums`. Destaque opcional para o que já está na biblioteca do usuário.

### 17.3 Pontos de atenção (verificar antes de implementar)

- **Identificadores:** itens do Last.fm trazem nome e, às vezes, `mbid` (que pode ser de *release*, não de *release-group*) ou vazio. Daí o **resolvedor** com `album_links`.
- **Imagens:** capas do Last.fm podem vir vazias ou com placeholder; usar a capa do Cover Art Archive (fluxo `/album/:id/capa` existente) após resolver o álbum, e um fallback visual enquanto isso.
- **Termos de uso:** conferir regras de cache, atribuição e uso comercial (o Last.fm pede contato prévio para projetos comerciais) e registrar a conclusão em `docs/decisions.md`.
- **Limite de requisições** não é numericamente publicado: ser conservador (≤ 1–2 req/s) e depender de cache.
- **Primeira carga fria:** "Artistas em alta" exige ≈ 1 + 12 chamadas; limitar concorrência, usar Suspense e medir (T8.6).

### 17.4 Fluxos

**`/discover`:** cada seção em `<Suspense>` própria. *Lançamentos* não depende do Last.fm. Seções do Last.fm usam cache (`revalidate`: charts ≈ 6 h, álbuns de artista ≈ 24 h) e timeout de ≈ 3 s; falha ou cache vazio → skeleton e depois seção oculta.

**Toque em um card do Last.fm:** Server Action recebe `{artista, título, mbid?}` → resolvedor consulta `album_links`; se não houver, busca no MusicBrainz (normalizando acentos/edições deluxe), aceita só acima de um limiar de similaridade, grava o vínculo (inclusive resultado negativo por ~7 dias) → reutiliza `openAlbum` para persistir o álbum e redirecionar para `/album/[id]`.

**Similares no álbum:** componente de servidor em `<Suspense>` no fim da página; cache de ≈ 14 dias por artista; erro/timeout → bloco oculto. Rate limit nas ações que disparam chamadas externas novas.

### 17.5 Ordem

Etapa 7 (mínimo: T7.0–T7.3) → Etapa 8 (T8.0–T8.6). Detalhes, prompts e critérios de aceite em `docs/tasks.md`.

---

## 18. Fase 3 — Preparação do ambiente e comunicação entre usuários

> **Planejado.** Nada desta seção está implementado. Tarefas operacionais: Etapas 9 e 10 em `docs/tasks.md`.

### 18.1 Escopo

| Parte | Entrega |
|---|---|
| **3-prep (Etapa 9)** | Visibilidade/privacidade, `activity_events`, seguir/bloquear/denunciar, exclusão de conta, testes de privacidade, flags |
| **3a (Etapa 10)** | Seção "Comunidade" no `/discover`, perfis públicos, seguir |
| **3b** | "Em alta no SoundAtlas", curtidas |
| **3c** | Comentários curtos |

**Fora de escopo por ora:** mensagens diretas, upload de avatar, menções, notificações push. São os recursos que mais ampliam abuso e superfície de ataque.

### 18.2 Princípios de privacidade

1. **Privado por padrão.** Todos os usuários atuais continuam privados até aceitarem explicitamente.
2. **Cada campo público é uma decisão:**

| Dado | Compartilhado? |
|---|---|
| Álbum, nota, data da escuta | Sim (se o usuário compartilha) |
| Resenha da biblioteca (`review`) | Sim, só um trecho (opcional) |
| Comentário do diário (`note`) | **Não**, a menos que o usuário marque como público |
| E-mail, estatísticas pessoais, identificadores internos | **Nunca** |

3. **Projeção, não exposição:** terceiros leem só `activity_events` e `public_profiles`; `library_entries` e `listen_logs` seguem estritamente privadas.
4. **Revogável:** desligar o compartilhamento esconde os eventos imediatamente (a RLS consulta o estado atual); excluir a conta apaga tudo.
5. **Sem vazamento indireto:** perfil privado responde como inexistente (mesmo 404); contagens agregadas só com **k ≥ 3 usuários distintos**.
6. **Bloqueio vale em todo lugar:** feed, perfis e interações.

### 18.3 Modelo de dados

> Antes de criar, **verifique a tabela que hoje guarda `username`** (a seção 5 cita `users` e triggers de criação de perfil). **Estenda-a** com as colunas abaixo; não crie uma segunda tabela de perfil.

```sql
-- colunas novas no perfil existente
visibility      text not null default 'private'
                check (visibility in ('private','followers','public')),
share_activity  boolean not null default false,
display_name    text,
bio             text check (char_length(bio) <= 160)

follows (
  follower_id uuid references users(id) on delete cascade,
  followee_id uuid references users(id) on delete cascade,
  status      text not null default 'accepted' check (status in ('pending','accepted')),
  created_at  timestamptz default now(),
  primary key (follower_id, followee_id),
  check (follower_id <> followee_id)
)

blocks (
  blocker_id uuid references users(id) on delete cascade,
  blocked_id uuid references users(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (blocker_id, blocked_id)
)

reports (
  id          uuid primary key,
  reporter_id uuid references users(id) on delete set null,
  target_type text not null check (target_type in ('profile','activity','comment')),
  target_id   uuid not null,
  reason      text not null,
  created_at  timestamptz default now()
)

-- projeção pública: só campos seguros
activity_events (
  id           uuid primary key,
  user_id      uuid references users(id) on delete cascade,
  log_id       uuid,                         -- origem, para atualizar/remover junto
  type         text not null check (type in ('listen','rating','review')),
  album_id     uuid references albums(id),
  rating       numeric(2,1),
  excerpt      text check (char_length(excerpt) <= 280),
  occurred_on  date not null,
  created_at   timestamptz default now()
)

create index on activity_events (created_at desc, id desc);
create index on activity_events (user_id, created_at desc);
```

**RLS (resumo):**
- Perfil: o dono lê e edita tudo; terceiros só leem pela view `public_profiles` (campos seguros, respeitando visibilidade e bloqueios).
- `activity_events`: leitura se o autor tem `share_activity = true` **e** (perfil `public` **ou** leitor seguidor aceito) **e** não há bloqueio entre as partes. Escrita **somente pelo servidor**.
- `follows`: cada usuário gerencia os seus. `blocks` e `reports`: cada um vê só os seus; denúncias são lidas por você no painel do Supabase.

**Geração de eventos:** feita pelo servidor, **na mesma transação** do diário sempre que possível (estendendo o padrão de `write_album_diary`), copiando apenas campos permitidos. **Editar** um log atualiza o evento; **excluir** remove. Nada de trigger que copie linhas inteiras.

**Paginação do feed:** por cursor (`created_at`, `id`), nunca por `offset` grande.

### 18.4 Ordem

Etapa 7 **completa** → Etapa 9 → Etapa 10. Cada nova tabela ou campo visível a terceiros entra na matriz de testes de privacidade (T9.5). Os testes de RLS rodam contra o Supabase local (como o E2E).

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
- Antes de cada commit ou push, execute `npm test` completo (sem filtrar testes) e `npm run lint`. Corrija as falhas antes de prosseguir e informe os resultados; não faça commit ou push com essas verificações falhando.
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

## Integrações, cache e segurança
- Last.fm e MusicBrainz: apenas no servidor; telas leem de cache/banco, com `Suspense`
  e timeout (~3 s) em blocos que dependem de API externa.
- Toda rota, Server Action e RPC valida entrada (Zod) e deriva o usuário da sessão
  (`auth.uid()`), nunca de parâmetros do cliente.
- Toda tabela do schema `public` tem RLS; RPCs `security definer` fixam `search_path`.
- `library_entries` e `listen_logs` nunca são abertas a terceiros; dados sociais saem por
  projeções (`activity_events`, `public_profiles`).
- Todo novo campo visível a outros usuários exige atualizar a matriz de testes de privacidade.
- Rate limit: contador em armazenamento compartilhado (não em memória do processo).
- Funcionalidades novas ficam atrás de feature flags (`FEATURE_DISCOVER_TRENDING`, `FEATURE_SOCIAL`).
- Decisões relevantes vão em `docs/decisions.md`; tarefas em `docs/tasks.md`.

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
- [ ] Rota, Server Action ou RPC nova valida entrada com Zod, deriva o usuário da sessão e tem rate limit quando dispara chamada externa?
- [ ] Alguma chamada externa roda dentro da renderização sem `Suspense` e timeout?
- [ ] Novo campo exposto a terceiros? Está na projeção correta e na matriz de testes de privacidade?
- [ ] Segredo com prefixo `NEXT_PUBLIC_` ou em código de cliente?

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
