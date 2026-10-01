# Momento

Aplicação pessoal para acompanhar tempo longe da pornografia, histórico de recaídas e progresso por XP. Funciona inteiramente no computador: o navegador acessa o Next.js local, que lê e grava dados no PostgreSQL do Supabase local. Não há contas, sincronização em nuvem nem analytics externos.

## Stack

- Next.js 16, React 19 e TypeScript
- Tailwind CSS 4 e componentes shadcn/ui
- Supabase CLI e PostgreSQL local
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

Em `.env.local`, substitua `<local-secret-key>` pelo valor `SECRET_KEY` mostrado por `npx supabase status`. Use apenas a chave deste projeto local. Não coloque a chave em variáveis `NEXT_PUBLIC_*` nem versione `.env.local`.

```bash
npm run dev
```

Abra [http://127.0.0.1:3000](http://127.0.0.1:3000). O servidor Next.js escuta apenas em `127.0.0.1`. Na primeira visita, escolha **Agora** ou uma data e horário locais para iniciar a jornada. Dados persistem no PostgreSQL local após recarregar a página.

## Variáveis de ambiente

| Variável | Uso |
| --- | --- |
| `SUPABASE_URL` | Endereço da API Supabase local; exemplo: `http://127.0.0.1:57321` |
| `SUPABASE_SECRET_KEY` | Chave `SECRET_KEY` do `supabase status`, usada somente no servidor |

O exemplo em `.env.local.example` contém o endereço local e um marcador para a chave. A aplicação rejeita um `SUPABASE_URL` que aponte para um host externo.

## Como funciona

- **Tempo limpo:** o contador calcula segundos a partir de `current_streak_started_at` e atualiza no navegador. Não grava no banco a cada segundo.
- **Recaída:** pede confirmação; uma função transacional salva a duração anterior, registra o histórico e reinicia a sequência. Repetir a mesma solicitação não duplica o registro.
- **Histórico e recorde:** a tela Histórico lista sequências da mais recente para a mais antiga. O dashboard mostra o maior tempo de sequência, o tempo limpo acumulado e o total de recaídas.
- **Calendário:** usa o fuso local do navegador. A primeira recaída encerra o tempo limpo daquele dia no calendário. Verde representa 100%, amarelo mais de 70% e menos de 100%, vermelho 70% ou menos. O dia atual usa apenas o tempo transcorrido.
- **XP e níveis:** cada minuto completo de tempo limpo acumulado rende 1 XP. XP atravessa recaídas. A primeira recaída de cada dia local reduz no máximo um nível visual, com mínimo 1; o maior nível alcançado permanece. O nível visual volta a acompanhar o XP ao atingir o próximo limiar.
- **Temas e feedback:** as cores e texturas acompanham o nível visual, inclusive acima do 10. Há avisos para 24 horas, novo recorde, promoção e recomeço. `prefers-reduced-motion` desativa animações.
- **Configurações:** antes da primeira recaída, a data inicial pode ser corrigida; isso recalcula XP e nível. Depois da primeira recaída, a data fica bloqueada para preservar o histórico. O tema é automático.

Timestamps são armazenados como `timestamptz`; a interface converte para o horário local. O banco mantém `display_level`, `highest_level_reached` e `last_level_penalty_date`. O histórico não pode ser alterado ou apagado pela aplicação.

## Arquitetura

- `src/app/`: páginas, layout e ações do primeiro acesso/configurações.
- `src/components/`: contador, estatísticas, XP, calendário, navegação e formulários.
- `src/features/`: ações de recaída e promoção.
- `src/lib/`: cálculos de sequência, calendário, XP, níveis, temas e acesso ao Supabase local.
- `supabase/migrations/`: tabelas, permissões e funções transacionais versionadas.
- `tests/` e `supabase/tests/`: testes de regras e pgTAP.

As páginas são renderizadas no servidor. Contador e calendário atualizam somente seus componentes no navegador. A `SUPABASE_SECRET_KEY` nunca é enviada ao cliente; o papel anônimo não tem acesso às tabelas pessoais.

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

`npm test` verifica sequência, marcos, XP, limiares, calendário, meses, meia-noite, horário de verão, fusos e temas. `npm run test:db` verifica penalidade diária, idempotência, recuperação, bloqueio da data inicial e imutabilidade do histórico. Os dados criados pelos testes SQL ficam em uma transação encerrada com `ROLLBACK`; o teste não reinicia o banco.

## Reiniciar o banco local

**Atenção: este comando apaga a jornada e todo o histórico local.** Faça backup antes se quiser preservar dados.

```bash
npx supabase db reset --local --no-seed
```

O reset recria a estrutura a partir das migrations versionadas. Não há seed aplicado por padrão.
