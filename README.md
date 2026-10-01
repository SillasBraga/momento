# Momento

Aplicação pessoal para acompanhar tempo longe da pornografia, histórico de recaídas e progresso por XP. Cada jornada pertence a uma conta de e-mail e senha. Em desenvolvimento, Next.js e Supabase funcionam localmente; para acessar a mesma jornada em outros aparelhos, publique o Next.js e use um projeto Supabase Cloud. Não há analytics externos.

## Stack

- Next.js 16, React 19 e TypeScript
- Tailwind CSS 4 e componentes shadcn/ui
- Supabase Auth, Supabase CLI e PostgreSQL local ou Supabase Cloud
- Node.js para testes de regras; pgTAP para testes do banco

## Pré-requisitos

- Node.js 20.9 ou superior e npm
- Docker Desktop em execução
- Portas `3000` e `57321–57329` disponíveis

## Instalação e início

No diretório do projeto:

```bash
npm install
npx supabase start
npx supabase status
```

O primeiro `supabase start` cria o banco local e aplica as migrations de `supabase/migrations/`. Copie `.env.local.example` para `.env.local`. No PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Em `.env.local`, substitua os marcadores pelos valores `PUBLISHABLE_KEY` e `SECRET_KEY` mostrados por `npx supabase status -o env`. A chave secreta fica somente no servidor. Não coloque `SUPABASE_SECRET_KEY` em variáveis `NEXT_PUBLIC_*` nem versione `.env.local`.

```bash
npm run dev
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000). O servidor Next.js de desenvolvimento escuta apenas em `127.0.0.1`. Crie uma conta de teste local e escolha **Agora** ou uma data e horário locais. Dados persistem no PostgreSQL local após recarregar a página.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | URL da API do projeto Supabase; local: `http://127.0.0.1:57321` |
| `SUPABASE_PUBLISHABLE_KEY` | Chave publicável usada pelo Supabase Auth no servidor |
| `SUPABASE_SECRET_KEY` | Chave secreta usada somente nas ações do servidor para ler e gravar jornadas |
| `APP_URL` | Origem do site, usada no link de confirmação de e-mail |

O exemplo em `.env.local.example` contém os endereços locais e marcadores para as chaves. Em produção, `SUPABASE_URL` deve usar HTTPS. A chave secreta nunca deve aparecer no código cliente, em logs públicos ou no Git.

## Sincronização entre aparelhos

1. Crie um projeto no Supabase Cloud.
2. Faça `npx supabase login`, `npx supabase link` e `npx supabase db push` para aplicar as migrations ao projeto novo. **Não** use `db reset --linked`: esse comando apaga dados remotos.
3. Publique o Next.js em um host compatível (por exemplo, Vercel) e configure `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` e `APP_URL` no ambiente do servidor. `APP_URL` deve ser a origem HTTPS pública do site.
4. Em Supabase Auth, configure **Site URL** para `APP_URL` e adicione `APP_URL/auth/callback` às **Redirect URLs**. Mantenha confirmação de e-mail habilitada e configure SMTP para entrega confiável dos e-mails em produção.

No template **Confirm signup** do Supabase Auth, use este link de confirmação para que o servidor possa validar o token e criar a sessão:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=email">Confirmar e-mail</a>
```

`APP_URL` não deve terminar com `/auth/callback`; a aplicação acrescenta esse caminho ao enviar o cadastro.

O repositório GitHub contém apenas o código. Sem um projeto Supabase Cloud e um site hospedado, não há sincronização entre aparelhos. Ao criar a primeira conta na nuvem, a jornada começa vazia. A jornada anterior no banco local permanece guardada lá e não é enviada automaticamente.

## Como funciona

- **Tempo limpo:** o contador calcula segundos a partir de `current_streak_started_at` e atualiza no navegador. Não grava no banco a cada segundo. Mesmo deslogado, o tempo transcorrido entra no cálculo ao voltar; sem conexão, novos registros de recaída não podem ser enviados.
- **Contas:** a sessão usa cookies; cada jornada tem um `user_id` único. O `localStorage` não guarda o progresso. As tabelas pessoais não são acessíveis diretamente pelos papéis do navegador; ações do servidor validam a sessão e filtram pelo usuário.
- **Recaída:** pede confirmação; uma função transacional salva a duração anterior, registra o histórico e reinicia a sequência. Repetir a mesma solicitação não duplica o registro.
- **Histórico e recorde:** a tela Histórico lista sequências da mais recente para a mais antiga. O dashboard mostra o maior tempo de sequência, o tempo limpo acumulado e o total de recaídas.
- **Calendário:** usa o fuso local do navegador. A primeira recaída encerra o tempo limpo daquele dia no calendário. Verde representa 100%, amarelo mais de 70% e menos de 100%, vermelho 70% ou menos. O dia atual usa apenas o tempo transcorrido.
- **XP e níveis:** cada minuto completo de tempo limpo acumulado rende 1 XP. XP atravessa recaídas. A primeira recaída de cada dia local reduz no máximo um nível visual, com mínimo 1; o maior nível alcançado permanece. O nível visual volta a acompanhar o XP ao atingir o próximo limiar.
- **Temas e feedback:** as cores e texturas acompanham o nível visual, inclusive acima do 10. Há avisos para 24 horas, novo recorde, promoção e recomeço. `prefers-reduced-motion` desativa animações.
- **Configurações:** antes da primeira recaída, a data inicial pode ser corrigida; isso recalcula XP e nível. Depois da primeira recaída, a data fica bloqueada para preservar o histórico. O tema é automático.

Timestamps são armazenados como `timestamptz`; a interface converte para o horário local. O banco mantém `display_level`, `highest_level_reached` e `last_level_penalty_date`. O histórico não pode ser alterado ou apagado pela aplicação. A migration de contas preserva jornadas locais antigas sem vinculá-las automaticamente a uma conta.

## Arquitetura

- `src/app/`: páginas, login, callback de e-mail, layout e ações do primeiro acesso/configurações.
- `src/components/`: contador, estatísticas, XP, calendário, navegação e formulários.
- `src/features/`: ações de recaída e promoção.
- `src/lib/`: cálculos de sequência, calendário, XP, níveis, temas, sessão e acesso ao Supabase.
- `supabase/migrations/`: tabelas, permissões e funções transacionais versionadas.
- `tests/` e `supabase/tests/`: testes de regras e pgTAP.

As páginas são renderizadas no servidor. Contador e calendário atualizam somente seus componentes no navegador. A `SUPABASE_SECRET_KEY` nunca é enviada ao cliente; os papéis anônimo e autenticado não têm acesso direto às tabelas pessoais.

## Migrations e testes

Para aplicar migrations novas em um banco local existente **sem apagar dados**:

```bash
npx supabase migration up --local
```

Com o Supabase local em execução, rode:

```bash
npm test
npm run test:db
npm run lint
npm run typecheck
npm run build
```

`npm test` verifica sequência, marcos, XP, limiares, calendário, meses, meia-noite, horário de verão, fusos e temas. `npm run test:db` verifica penalidade diária, idempotência, recuperação, bloqueio da data inicial, imutabilidade do histórico e isolamento entre contas. Os dados criados pelos testes SQL ficam em uma transação encerrada com `ROLLBACK`; o teste não reinicia o banco.

## Reiniciar o banco local

**Atenção: este comando apaga a jornada e todo o histórico local.** Faça backup antes se quiser preservar dados.

```bash
npx supabase db reset --local --no-seed
```

O reset recria a estrutura a partir das migrations versionadas. Não há seed aplicado por padrão.
