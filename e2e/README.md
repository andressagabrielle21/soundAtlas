# Teste E2E mobile

Use o Node 24, o Docker e o Supabase CLI v2. O teste cria uma conta descartável no Supabase local, com as migrações do projeto. As respostas do MusicBrainz e do Cover Art Archive vêm de uma fixture para manter a busca reproduzível.

```bash
npm ci
supabase start
npx playwright install chromium
source <(supabase status -o env)
export NEXT_PUBLIC_SUPABASE_URL="$API_URL"
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${PUBLISHABLE_KEY:-$ANON_KEY}"
export SUPABASE_SECRET_KEY="${SECRET_KEY:-$SERVICE_ROLE_KEY}"
npm run test:e2e
```

O Playwright inicia o build de produção em `http://127.0.0.1:3100` e roda no Chromium com viewport de 360 × 800. Em caso de falha, o CI salva o trace em `test-results/`.
