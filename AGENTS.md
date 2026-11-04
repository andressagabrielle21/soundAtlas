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
