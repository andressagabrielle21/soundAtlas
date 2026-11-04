# Autenticação local

1. Aplique as migrações de `supabase/migrations` ao projeto Supabase.
2. Copie `.env.example` para `.env.local` e preencha a URL e a chave publicável
   do projeto.
3. No Supabase Auth, habilite o provedor Email e configure **Site URL** com a
   origem do app, por exemplo `http://localhost:3001` para desenvolvimento.
4. Se **Confirm email** estiver habilitado, use este link no template
   **Confirm signup** do Supabase:

   ```html
   <a href="{{ .SiteURL }}/auth/confirmar?token_hash={{ .TokenHash }}">
     Confirmar e-mail
   </a>
   ```

Abra `/cadastrar` para criar a conta ou `/entrar` para entrar com e-mail e senha.

## Teste de isolamento

Em um banco Supabase de teste com as migrações aplicadas, rode
`psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/initial_rls.sql`
com uma conexão administrativa. O teste cria duas contas, simula a sessão da
primeira e desfaz todos os dados ao terminar.
