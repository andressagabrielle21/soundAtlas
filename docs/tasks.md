# SoundAtlas — Tarefas pós-MVP (`docs/tasks.md`)

Roteiro operacional das **Etapas 7 a 10**. O *o quê* e o *porquê* estão em `docs/spec.md` (seções 15 a 18); aqui ficam **ordem, prompts e critérios de aceite**. Marque `[x]` ao concluir e registre desvios na própria tarefa.

## Como usar

1. Pegue **a próxima tarefa não concluída** na ordem abaixo (uma por vez).
2. Copie o prompt para o Codex (ele já lê `AGENTS.md`). Tarefas marcadas **(somente leitura)** não devem alterar código.
3. Rode `npm run lint`, `npm run typecheck` e `npm test` completo; para mudanças de fluxo, `npm run test:e2e` (exige Supabase local).
4. Revise o diff com a checklist do Apêndice B do spec (pode usar o ChatGPT).
5. Commit pequeno, marque a tarefa e siga.

Se o Codex errar duas vezes na mesma tarefa, pare, reescreva o prompt com mais contexto ou divida a tarefa.

## Mapa de dependências

```
Passo 0 (preparação)
   └─ Etapa 7 — mínimo para começar a Fase 2: T7.0 → T7.1 → T7.2 → T7.3
         ├─ Etapa 8 (Discover/Last.fm)  — T8.0 … T8.6      (T7.4 e T7.5 em paralelo)
         └─ Etapa 7 restante: T7.4 … T7.9                  (obrigatória antes da Etapa 9)
               └─ Etapa 9 (preparação social)  → Etapa 10 (social)
```

---

## Passo 0 — Preparação (você, ~30 min)

- [ ] Copiar `spec.md` e `tasks.md` para `docs/` no repositório; criar `docs/decisions.md` (vazio, com título).
- [ ] Atualizar o `AGENTS.md` do repositório com o bloco **"Integrações, cache e segurança"** do Apêndice A do spec (mantendo as regras que o projeto já tem, como "executar `npm test` completo antes de commit/push").
- [ ] Rodar `npm run lint`, `typecheck` e `test` e anotar o estado inicial (passando/falhando) em `docs/decisions.md`.
- [ ] Criar uma branch por etapa (`etapa-7-seguranca`, `etapa-8-discover`…).
- [ ] Criar conta/chave de API no Last.fm e guardá-la **só** em `.env.local` e nas variáveis do deploy como `LASTFM_API_KEY` (sem prefixo `NEXT_PUBLIC_`). Não cole a chave em prompts.

---

## Etapa 7 — Performance e segurança (base)

### T7.0 — Auditoria do estado atual (somente leitura)  ← **COMECE AQUI**
- [ ] Concluída

Contexto: spec seções 15.3 e 15.4.

```text
Contexto: leia AGENTS.md e docs/spec.md (seções 5, 8, 15 e 16).

Tarefa: T7.0 — Auditoria de segurança e performance (SOMENTE LEITURA).

Objetivo: produzir docs/audit.md respondendo, com evidências (arquivo e trecho), a cada item da seção 15.4 do spec, mais:
- lista de todas as tabelas, views e funções do schema public com: RLS ativo? políticas? security definer? search_path fixo? uso de auth.uid()?
- lista de todas as rotas (page, route handlers, Server Actions) com: exige sessão? valida entrada (como)? limite de paginação? rate limit?
- como o Discover atual obtém e cacheia os dados (qual mecanismo de cache, tempos de revalidação, timeout)
- como o proxy /album/[id]/capa decide qual URL buscar
- linha de base de bundle por rota (next build) e, se possível, Lighthouse mobile em /discover, /buscar, /biblioteca, /album/[id], /perfil
- variáveis de ambiente usadas e se alguma secreta pode chegar ao cliente

Não faça: não altere código, migrações nem dependências. Classifique cada achado como OK / Lacuna / Risco alto.

Critério de aceite: docs/audit.md criado, com tabela de achados priorizada e sugestão de tarefa para cada lacuna.
Ao final: resuma os 5 achados mais importantes.
```

**Depois:** leve `docs/audit.md` ao ChatGPT para priorizar. Ajuste as tarefas T7.1–T7.9 abaixo para cobrir **apenas as lacunas** (marque as já atendidas como `[x] já existia`).

### T7.1 — RLS verificável e teste de isolamento completo
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seções 5 e 15) e docs/audit.md.

Tarefa: T7.1 — Garantir RLS em todas as tabelas e isolamento entre usuários.

Requisitos:
- Crie um teste (rodando contra o Supabase local) que consulta o catálogo do Postgres e FALHA se alguma tabela do schema public estiver sem RLS ou sem política.
- Expanda o teste de isolamento (usuário A x usuário B) para cobrir library_entries, listen_logs e TODAS as RPCs (read_profile_data, read_listening_stats, read_album_diary, write_album_diary, remove_library_album): B nunca lê nem altera dados de A, mesmo passando o id de A.
- Corrija, por migração versionada, qualquer função security definer sem search_path fixo ou que não use auth.uid().

Não faça: não altere regras de negócio da seção 5; não altere o schema fora de migração.

Aceite: criar uma tabela sem RLS em uma migração de teste faz o teste falhar; testes de isolamento passam; documente o comando para rodá-los.
```

### T7.2 — Validação com Zod em todas as entradas
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seções 8 e 15.3) e docs/audit.md.

Tarefa: T7.2 — Validação de entrada com Zod.

Requisitos:
- Crie schemas compartilhados e aplique-os em: Server Actions (openAlbum, updateLibrary, saveReview, signIn, signUp), /api/logs (GET/POST/PATCH/DELETE), /api/export, /buscar/resultados e /album/[id]/capa.
- Regras: nota múltipla de 0,5 entre 0,5 e 5; datas válidas (rejeite datas absurdas); resenha <= 5.000 caracteres; limit/offset com máximo; ids em formato uuid; campos extras rejeitados.
- Respostas de MusicBrainz também devem ser validadas antes de gravar em albums/artists.
- Erros: 400 (ou erro de ação) com mensagem genérica; nunca ecoar a entrada nem stack traces.

Escreva testes com payloads inválidos (nota 4,3; limit 100000; id não-uuid; campo extra).

Não faça: não mude comportamento válido existente nem o schema do banco.

Aceite: nenhuma entrada de rota/action sem schema; testes passam; lint/typecheck/test OK.
```

### T7.3 — Rate limiting com armazenamento compartilhado
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seção 15.3) e docs/audit.md.

Tarefa: T7.3 — Rate limiting.

Requisitos:
- Proponha primeiro (em 5 linhas, antes de codar) a opção mais simples para o nosso deploy na Vercel com contador COMPARTILHADO entre instâncias (ex.: Upstash Redis via biblioteca de rate limit, ou recurso nativo da hospedagem). NÃO use contador em memória do processo. Espere minha aprovação da opção antes de instalar dependências.
- Implemente um helper reutilizável por usuário (quando autenticado) e por IP.
- Aplique em: /buscar/resultados, signIn/signUp, /album/[id]/capa e (já preparando as próximas etapas) em ações que chamem APIs externas.
- Excedeu o limite: 429 com Retry-After (ou erro amigável em Server Actions).
- Limites configuráveis por variável de ambiente; documente-as em .env.example.

Aceite: teste excedendo o limite recebe 429; usuário normal não é afetado; segredos só no servidor.
```

### T7.4 — Cabeçalhos de segurança e CSP
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seção 15.3) e docs/audit.md.

Tarefa: T7.4 — Cabeçalhos de segurança e CSP.

Requisitos:
- Configure Content-Security-Policy, X-Content-Type-Options: nosniff, Referrer-Policy, Permissions-Policy e frame-ancestors 'none'.
- A CSP deve permitir apenas: o próprio domínio, o Supabase do projeto e os hosts de imagem realmente usados (liste-os e justifique cada um). Comece em modo Report-Only, valide navegando o app (login, busca, álbum, biblioteca, perfil, PWA) e só então aplique em modo enforce.
- Teste automatizado que confere a presença dos cabeçalhos.

Não faça: não use 'unsafe-eval'; justifique qualquer 'unsafe-inline' (prefira nonce/hash).

Aceite: app funciona sem violações de CSP no console; teste de cabeçalhos passa.
```

### T7.5 — Proxy de capa e hosts de imagem
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seções 6 e 15.3) e docs/audit.md.

Tarefa: T7.5 — Endurecer /album/[id]/capa e imagens.

Requisitos:
- A rota só busca capas de hosts em lista de permissão e a partir do álbum informado (nunca uma URL vinda do cliente). Timeout curto, limite de tamanho e Content-Type de imagem validado.
- Cache adequado (Cache-Control) e fallback visual quando falhar.
- Padronize imagens com next/image: remotePatterns restritos, sizes corretos, miniaturas em listas, placeholder. Substitua <img> cru de capas.

Aceite: tentativa de passar URL arbitrária é rejeitada (teste); sem <img> cru para capas; listas mantêm layout estável (CLS).
```

### T7.6 — Segredos e dependências no CI
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seção 15.3).

Tarefa: T7.6 — Segredos e dependências.

Requisitos:
- Adicione scanner de segredos (ex.: gitleaks) e Dependabot; npm audit falhando em severidade alta.
- Script/teste que falha se alguma variável de ambiente secreta (service role, LASTFM_API_KEY etc.) tiver prefixo NEXT_PUBLIC_ ou aparecer em código de cliente.
- Confirme que .env* estão no .gitignore e que .env.example está atualizado (sem valores reais).

Aceite: commitar um segredo de teste faz o CI falhar; relatório de dependências vulneráveis anexado ao PR.
```

### T7.7 — Orçamento de performance
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seção 15.1) e a linha de base em docs/audit.md.

Tarefa: T7.7 — Orçamento de performance.

Requisitos:
- Configure Lighthouse CI (mobile, 4G simulado) para /discover, /buscar, /biblioteca, /album/[id] e /perfil, e relatório de tamanho de bundle por rota.
- Metas da seção 15.1. Para rotas que hoje violam a meta, registre a exceção com data-alvo em docs/decisions.md em vez de travar o CI; metas atendidas viram falha de CI se regredirem.
- Aplique as correções simples de maior impacto encontradas (imagens, JS desnecessário, importação dinâmica de código pesado).

Aceite: relatório gerado no CI; nenhuma rota piora em relação à linha de base.
```

### T7.8 — Observabilidade sem dados pessoais
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seção 15.3).

Tarefa: T7.8 — Monitoramento de erros e logs.

Requisitos:
- Monitoramento de erros (cliente e servidor) com scrubbing de dados pessoais (e-mail, texto de resenha/comentário, tokens).
- Logs estruturados com request id e latência para rotas e Server Actions; falhas de API externas registradas com fonte e duração.

Aceite: erro proposital aparece no painel sem dados pessoais; teste que garante que o scrubber remove e-mail/resenha.
```

### T7.9 — Backup e restauração
- [ ] Concluída

```text
Tarefa: T7.9 — Backup e restauração (parte manual + documentação).
Você: confirmar backups no painel do Supabase e restaurar em um projeto separado para testar.
Codex: criar docs/runbook.md com o passo a passo de backup, restauração e rotação de chaves.
```
- **Aceite:** restauração testada; `docs/runbook.md` criado.

---

## Etapa 8 — Discover: álbuns em alta e artistas similares (Last.fm)

Pré-requisito: T7.0–T7.3 concluídas. Flag: `FEATURE_DISCOVER_TRENDING`.

### T8.0 — Reconhecimento e decisões (somente leitura + você)
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seções 4, 6, 16 e 17).

Tarefa: T8.0 — Reconhecimento do Discover atual (SOMENTE LEITURA).

Objetivo: gerar o plano técnico da Etapa 8 em docs/decisions.md, sem alterar código:
- Como /discover busca os lançamentos hoje (módulo, cache, revalidate, timeout) e como reaproveitar o mesmo padrão para o Last.fm.
- Onde ficam openAlbum, a persistência em albums/artists e o proxy de capa, para o resolvedor reutilizá-los.
- Como artists.external_id e albums.external_id se relacionam com mbid do MusicBrainz.
- Estrutura de pastas proposta para lib/lastfm e lib/discover.
- Riscos específicos que você enxergar no código.

Aceite: seção "Etapa 8 — plano" em docs/decisions.md.
```

**Você (manual):** ler os termos de uso da API do Last.fm (cache, atribuição, uso comercial) e anotar a conclusão em `docs/decisions.md`. Se o uso for comercial, o Last.fm pede contato prévio.

### T8.1 — Cliente Last.fm (somente servidor)
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seção 17) e a seção "Etapa 8 — plano" de docs/decisions.md.

Tarefa: T8.1 — Cliente Last.fm.

Requisitos:
- Crie lib/lastfm com funções: getTopArtists(limit), getArtistTopAlbums(artist|mbid, limit), getSimilarArtists(artist|mbid, limit), getTagTopAlbums(tag, limit).
- Use LASTFM_API_KEY (somente servidor), format=json, User-Agent identificando o app, timeout de 3 s e no máximo 1 retry; respeite ~1–2 req/s com concorrência limitada.
- Valide respostas com Zod e normalize para tipos internos ({ title, artist, mbid?, imageUrl? }); tolere mbid vazio e imagem ausente/placeholder.
- Cache via fetch com revalidate, no mesmo padrão do Discover atual: charts ~6 h; álbuns de artista ~24 h; similares ~14 dias.
- Testes com respostas mockadas (inclua mbid vazio, imagem ausente e erro/timeout).

Não faça: não chame o Last.fm do navegador; não crie tabelas; não altere a UI.

Aceite: testes passam; busca no bundle do cliente não encontra a chave nem o módulo; lint/typecheck/test OK.
```

### T8.2 — Resolvedor Last.fm → álbum do SoundAtlas
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seções 16 e 17.4) e docs/decisions.md.

Tarefa: T8.2 — Resolvedor e tabela album_links.

Requisitos:
- Migração versionada criando album_links (spec seção 16) com RLS: sem acesso direto de usuários; leitura/escrita apenas pelo servidor.
- resolveAlbum({ artist, title, mbid? }): 1) consulta album_links; 2) se houver mbid, tenta resolver para release-group; 3) senão busca no MusicBrainz por artista + título normalizados (acentos, caixa, sufixos como "Deluxe"/"Remastered"); 4) aceita só acima de um limiar de similaridade; 5) grava o vínculo (resultado negativo expira em ~7 dias).
- Server Action openLastfmAlbum({artist,title,mbid?}) com Zod e rate limit, que chama o resolvedor e depois REUTILIZA openAlbum para persistir e redirecionar.
- Testes com ~10 pares reais (acentos, deluxe, mbid vazio, sem correspondência).

Não faça: não altere regras do diário/biblioteca; respeite o limite do MusicBrainz.

Aceite: pares conhecidos resolvem para o release-group esperado; repetir a resolução não chama a API externa; testes de RLS de album_links passam.
```

### T8.3 — Discover: seção "Artistas em alta"
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seções 4, 15.2 e 17) e docs/decisions.md.

Tarefa: T8.3 — Seção "Artistas em alta" em /discover, atrás de FEATURE_DISCOVER_TRENDING.

Requisitos:
- Dados: getTopArtists(12) → getArtistTopAlbums(limit 1) para cada um, com concorrência limitada (ex.: 4).
- Cada seção do Discover em <Suspense> própria; a seção "Lançamentos" existente NÃO pode depender do Last.fm.
- Timeout ~3 s: falha ou cache vazio → skeleton e depois a seção some silenciosamente (sem mensagem de erro).
- Carrossel horizontal de capas (mobile-first, alvos >= 44px), título "Em alta no Last.fm", crédito "Dados: Last.fm" com link.
- Toque no card chama openLastfmAlbum. Capa do Last.fm com fallback visual; use next/image com host permitido (atualize a lista de hosts e a CSP somente se necessário).

Não faça: não mude a ordem/comportamento de "Lançamentos" além do necessário; não faça chamadas ao Last.fm no cliente.

Aceite: /discover abre normalmente com o Last.fm fora do ar (simule); toque abre o álbum correto; Lighthouse mobile dentro das metas da seção 15.1.
```

### T8.4 — Discover: "Populares por gênero"
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seção 17.2).

Tarefa: T8.4 — Seção "Populares em [gênero]".

Requisitos:
- Gêneros: os 2–3 mais frequentes na biblioteca/diário do usuário (use a agregação existente, via RPC, se houver); para quem não tem dados, use uma lista curada de 5 gêneros.
- Mapeie o gênero curado para a tag do Last.fm (tabela de mapeamento testada) e use getTagTopAlbums(tag, 12).
- Mesmo padrão: Suspense própria, timeout, ocultar em falha, resolver via openLastfmAlbum.

Aceite: usuário com dados vê seus gêneros; usuário novo vê a lista curada; testes do mapeamento passam.
```

### T8.5 — Bloco "Artistas similares" em `/album/[id]`
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seções 15.2 e 17.4).

Tarefa: T8.5 — Álbuns de artistas similares ao fim da página do álbum.

Requisitos:
- Componente de servidor em <Suspense> no FIM de /album/[id]: getSimilarArtists(artist.external_id como mbid, senão nome, 6) → getArtistTopAlbums(limit 1) para cada um.
- Cards com capa, título e artista; marque (discretamente) os que já estão na biblioteca do usuário; toque usa openLastfmAlbum.
- Timeout ~3 s; erro/vazio → bloco oculto; cache ~14 dias.
- A renderização do restante da página não pode esperar por este bloco.

Aceite: simular Last.fm fora do ar não mostra erro nem atrasa a página; bloco aparece com dados reais; testes cobrindo mapeamento e filtragem do álbum atual (não sugerir o próprio álbum).
```

### T8.6 — Medição, atribuição e decisão de cache
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seções 15.1, 16 e 17.3) e docs/decisions.md.

Tarefa: T8.6 — Medir e fechar a Etapa 8.

Requisitos:
- Meça tempo de /discover e de /album/[id] com cache frio e quente (registre em docs/decisions.md) e quantas chamadas ao Last.fm ocorrem por carga fria.
- Garanta atribuição "Dados: Last.fm" com link onde usamos seus dados.
- Se a carga fria passar de 3 s ou houver risco de limite no Last.fm, proponha (SEM implementar) a promoção para tabela external_cache + cron conforme a seção 16; caso contrário, registre que o cache atual basta.

Aceite: números registrados; decisão documentada; atribuição visível.
```

---

## Etapa 9 — Preparação para a parte social

Pré-requisito: **Etapa 7 completa.** Flag: `FEATURE_SOCIAL`. Nada nesta etapa expõe dados a terceiros.

### T9.1 — Visibilidade e compartilhamento no perfil
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seção 18.2 e 18.3).

Tarefa: T9.1 — Colunas de visibilidade e view pública.

Requisitos:
- Descubra qual tabela guarda o username hoje e ESTENDA essa tabela (não crie perfil duplicado) com visibility ('private' por padrão), share_activity (false por padrão), display_name e bio (<= 160), via migração versionada; backfill: todos privados.
- Crie a view public_profiles expondo só campos seguros (username, display_name, bio) respeitando visibilidade (a regra completa de seguidores/bloqueio será testada na T9.5).
- RLS: o dono lê/edita tudo; terceiros não leem a tabela base.
- Server Action para alterar visibilidade/compartilhamento, com Zod.

Aceite: usuários existentes seguem privados; terceiros não leem a tabela de perfil diretamente (teste).
```

### T9.2 — Tela de privacidade
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seção 18.2).

Tarefa: T9.2 — /perfil/privacidade (atrás de FEATURE_SOCIAL).

Requisitos: controles de visibilidade do perfil e "compartilhar minha atividade"; texto claro em pt-BR explicando o que é compartilhado (álbum, nota, data, trecho da resenha) e o que NUNCA é (comentário do diário, e-mail, estatísticas); tudo desligado por padrão; alterações validadas no servidor; acesso a partir de /perfil.

Aceite: padrão tudo desligado; alterações persistem; mobile 360px sem rolagem horizontal.
```

### T9.3 — `activity_events` e geração de eventos
- [ ] Concluída

```text
Contexto: leia AGENTS.md, docs/spec.md (seções 5 e 18.3).

Tarefa: T9.3 — Projeção pública de atividade.

Requisitos:
- Migração: activity_events (spec 18.3), índices e RLS (leitura conforme visibilidade/share_activity/bloqueio; escrita só no servidor).
- Geração: decida e justifique (docs/decisions.md) entre estender a função write_album_diary para criar o evento na MESMA transação ou chamar uma função separada; prefira a mesma transação. Copie só campos permitidos (excerpt <= 280; nunca o note do diário).
- Editar um log atualiza o evento; excluir remove; desligar share_activity esconde os eventos antigos imediatamente.
- Preserve as regras 1–7 da seção 5 (testes existentes devem continuar passando).

Aceite: log de usuário privado não gera evento visível; editar/excluir reflete no evento; desligar compartilhamento oculta tudo; testes de RLS do evento.
```

### T9.4 — Seguir, bloquear e denunciar (dados e ações)
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seção 18.3).

Tarefa: T9.4 — follows, blocks, reports.

Requisitos: migração com as três tabelas e RLS; Server Actions com Zod e rate limit (seguir, deixar de seguir, bloquear, desbloquear, denunciar). Bloquear remove follows nos dois sentidos. Seguir perfil 'followers' cria pedido 'pending'. Sem UI ainda.

Aceite: testes para auto-follow (rejeitado), duplicata, bloqueio e limites de taxa.
```

### T9.5 — Matriz de testes de privacidade
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seção 18).

Tarefa: T9.5 — Matriz de testes de privacidade (contra Supabase local).

Requisitos: teste parametrizado combinando visibilidade (private/followers/public) × leitor (dono/seguidor aceito/seguidor pendente/estranho/bloqueado) × share_activity (on/off), para public_profiles e activity_events. Confirme também que library_entries e listen_logs NUNCA vazam para terceiros e que perfil privado é indistinguível de inexistente. Documente o comando e como adicionar novas tabelas à matriz.

Aceite: matriz completa passa; falha se uma tabela social nova não estiver na matriz.
```

### T9.6 — Flag e rota de perfil público
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seções 16 e 18).

Tarefa: T9.6 — FEATURE_SOCIAL e /u/[username].

Requisitos: com a flag desligada nada social aparece nem responde (404); /u/[username] retorna o MESMO 404 para inexistente e privado; para visível, mostra display_name, bio e as últimas atividades (da projeção). Sem upload de avatar.

Aceite: testes de flag e de 404 idêntico; layout mobile correto.
```

### T9.7 — Termos, privacidade e exclusão de conta
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seção 15.3).

Tarefa: T9.7 — Páginas de Termos e Política de Privacidade (rascunho) e exclusão de conta.

Requisitos: exclusão de conta que apaga perfil, atividade, follows, blocks, library_entries, listen_logs e o usuário no Auth, por rotina transacional; confirmação explícita; e-mail/dados removidos. A exportação (/api/export) deve continuar funcionando antes da exclusão.

Aceite: teste confirma que não resta nenhuma linha do usuário em nenhuma tabela. Antes de abrir ao público, revisar os textos legais (LGPD) com atenção profissional.
```

### T9.8 — Moderação mínima
- [ ] Concluída

```text
Contexto: leia AGENTS.md e docs/spec.md (seção 18).

Tarefa: T9.8 — Denunciar/bloquear na UI e runbook.

Requisitos: botões "Denunciar" e "Bloquear" nos pontos que exibem conteúdo de terceiros (perfil, atividade); registrar em reports/blocks; documentar em docs/runbook.md como revisar denúncias e suspender um usuário.

Aceite: denúncia registrada; bloqueio some do feed/perfis; procedimento documentado.
```

---

## Etapa 10 — Comunicação entre usuários

Pré-requisito: Etapa 9 completa. **Detalhar os prompts de cada item ao chegar nele**, usando o formato do Apêndice C do spec e declarando quais campos passam a ser visíveis a terceiros (e atualizando a matriz da T9.5).

- [ ] **T10.1** Seção "Comunidade" no `/discover`: feed de `activity_events` com paginação por cursor, filtro de bloqueios, `Suspense`/skeleton.
- [ ] **T10.2** Seguir/deixar de seguir na UI; aba "Seguindo"; pedidos pendentes para perfis `followers`.
- [ ] **T10.3** Perfil público `/u/[username]` completo.
- [ ] **T10.4** "Em alta no SoundAtlas": função `security definer` retornando só `album_id` e contagem, apenas de usuários com `share_activity = true` e **k ≥ 3** usuários distintos.
- [ ] **T10.5** Curtidas em atividades (tabela própria, RLS, uma por usuário/atividade, interface otimista).
- [ ] **T10.6** Comentários curtos (≤ 500 caracteres, texto puro, rate limit, bloqueio/denúncia, exclusão pelo autor e pelo dono da atividade).

---

## Registro de desvios

Anote aqui tarefas alteradas, divididas ou adiadas (data, motivo, decisão).

| Data | Tarefa | O que mudou | Motivo |
|---|---|---|---|
| | | | |
