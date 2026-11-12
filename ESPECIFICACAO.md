# Dronistas — Portal de Conexão de Serviços com Drones

**Data:** 2026-11-11 (v2.1 — snapshot fiel: aceite direto, localização/ViaCEP, marketplace paginado e distância base→voo)
**Status:** Ativa (todos os critérios validados por `smoke-test.ps1`)
**Base:** herdada do iAcadastro v3.3 (Spring Boot 3.3 + MyBatis + Angular 18 + PostgreSQL 16 + Docker Compose)

## 1. Objetivo

Portal que conecta **dono de drone profissional** (dronista) com **quem precisa desse serviço** (solicitante). O fluxo completo:

1. **Solicitante** cadastra a **proposta de voo** (data/hora, duração, qualidade do vídeo, formato, valor oferecido e **localização com estado/cidade/bairro/CEP**).
2. **Dronistas** navegam o marketplace (lista compacta, **filtrável por estado/cidade/qualidade e paginada**) e fecham o trabalho de dois jeitos:
   - **Aceite direto ("de cara")** no valor ofertado — acordo imediato; ou
   - **Conta-proposta** (valor proposto + mensagem), que o solicitante **aprova** → proposta fica **aceita** e travada para aquele dronista (demais contas recusadas automaticamente).
3. Dronista **grava** e **entrega o vídeo** (link hospedado) através da plataforma; o solicitante vê a **distância da base do dronista** até o local do voo nas contas recebidas.
4. Solicitante **aprova ou recusa** a entrega. Aprovada → o **pagamento é liberado** e o trabalho entra como concluído.
5. Ambos se **avaliam** (1–5 estrelas + comentário, cada direção uma única vez). Sistema calcula e exibe **ranking público** de dronistas e solicitantes (com localização das bases).

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Backend | Java 17 + Spring Boot 3.3 (Web, Validation, Security) |
| Acesso a dados | MyBatis (annotation SQL) |
| Frontend | Angular 18 standalone |
| Banco | PostgreSQL 16 (imagem `pgvector`, sem uso de pgvector nesta fase) |
| Build/Run | Maven + Docker Compose (db :5433 / api :8080 / app :8081) |
| Auth | JWT bearer + bcrypt |
| Serviços externos (gratuitos, sem chave) | ViaCEP (endereço por CEP), BrasilAPI CEP v2 (cep→coordenadas), Nominatim/OSM (geocoding por cidade/UF) |

Herança do iAcadastro: helpers genéricos mantidos (DTO de erro, JWT, DocumentoValidator, DialogService, design system); domínio Cliente/Chat/MCP/Gráficos/Tenant **removido** — o portal é global, sem multi-tenant.

## 3. Modelo de Segurança

**Escopo único global** — todos os perfis compartilham o mesmo banco e o mesmo ranking público. Sem tenant.

| Papel | Descrição | Permissões |
|---|---|---|
| `DRONISTA` | Profissional dono de drone | Ver/aceitar propostas abertas, enviar conta-proposta, entregar vídeo, ver suas contas/entregas, avaliar solicitante, ver ranking |
| `SOLICITANTE` | Interessado no serviço | Criar/editar/cancelar propostas, ver contas recebidas, aceitar/recusar conta, aprovar/recusar entrega, avaliar dronista, ver ranking |
| `ADMIN` | Operador da plataforma | Acesso total (criado no arranque pelo `AdminSeeder`) |

**Público** (sem JWT): `/api/auth/registrar`, `/api/auth/login`. **Autenticados**: todo o resto sob `/api/**`; sessão ausente → **401 JSON** `{codigo, mensagem}` (entry point configurado no `SecurityConfig`).
Token carrega `usuarioId` e `papel`; `Sessao.atual()` resolve a identidade. Admin da plataforma: `admin@dronistas.com` / `admin123` (trocar em produção).

## 4. Entidades

- `usuario`: `id`, `nome`, `email` (único global), `senha_hash`, `papel` (`ADMIN | DRONISTA | SOLICITANTE`), `ativo`.
- `perfil_dronista`: `id`, `usuario_id` (unique), `nome`, `telefone`, `bio`, `cnpj_cpf` (obrigatório, CPF/CNPJ alfanumérico), `licenca_anac`, **localização (`estado`, `cidade`, `bairro`, `cep`)**, **coordenadas (`lat`, `lng`)**, `nota_media` (média das notas recebidas nas entregas), `trabalhos_concluidos`, `ativo`.
- `perfil_solicitante`: `id`, `usuario_id` (unique), `nome`, `telefone`, `empresa`, `nota_media` (média das `nota_solicitante` recebidas), `contratacoes`, `ativo`.
- `proposta_voo`: `id`, `solicitante_id`, `titulo`, `descricao`, `local` (referência livre), `data_voo` (DATE), `hora_voo` (TIME), `duracao_min` (>0), `qualidade_video`, `fps` (opcional), `formato_video`, `valor_oferecido` (>0), **localização (`estado`, `cidade`, `bairro`, `cep`)**, **coordenadas (`lat`, `lng`)**, `status` (`ABERTA | ACEITA | CONCLUIDA | CANCELADA`), `dronista_id` e `conta_aceita_id` (quando aceita).
- `conta_proposta`: `id`, `proposta_id`, `dronista_id`, `valor_proposto` (>0), `mensagem`, `status` (`ENVIADA | ACEITA | RECUSADA`).
- `entrega_video`: `id`, `conta_id`, `url_video`, `observacao`, `status` (`ENVIADA | APROVADA | REJEITADA`), `nota`+`comentario` (solicitante → dronista), `nota_solicitante`+`comentario_solicitante` (dronista → solicitante).

**Sem tabela de avaliação:** as notas vivem em `entrega_video` (uma por direção, garantida por `nota IS NULL` na UPDATE). As médias são recalculadas por `avg()` com join nas entregas (`recalcularNota`).

### Qualidade e formato de vídeo
- `qualidade_video`: `FULLHD` (1080p), `2K`, `4K_30FPS`, `4K_60FPS`, `4K_120FPS`.
- `formato_video`: `MP4`, `MOV`, `LOG`, `RAW`, `PRORES`.
- FPS já embutido nos 4K; para FULLHD/2K o campo `fps` separado é opcional (∈ {24,25,30,60,120}).

### Localização (V2)
- **Proposta de voo** e **perfil do dronista (base de operação)**: `estado` (UF 2 letras), `cidade`, `bairro`, `cep` (normalizado `00000-000`) — todos opcionais. Validados por `LocalizacaoValidator` (UF ≠2 letras → 422; CEP ≠8 dígitos → 422).
- **ViaCEP** nos 3 formulários (proposta, registro, perfil): ao completar 8 dígitos, preenche UF/cidade/bairro automaticamente — *só os campos vazios*; erro → "CEP não encontrado — preencha manualmente".
- **Contas-proposta exibem a base do dronista** (cidade/UF); ranking de dronistas também.

### Distância base→voo (V3)
- **Geocoding na escrita:** `GeocodingService` resolve lat/lng na criação/edição de proposta e no registro/edição do dronista — BrasilAPI CEP v2 (coordenadas por CEP) com fallback Nominatim (cidade/UF). Enriquecimento puro: falha → campos ficam nulos e **nada quebra** (log de aviso).
- **Haversine no marketplace:** `PropostaService.abertas()` (e o detalhe) preenche `distanciaKm` (1 decimal) = distância da base do dronista logado até cada proposta; exibido como **"🛩️ ~X km de você"** na lista e **"Sua base fica a ~X km do local do voo"** no detalhe. Para solicitantes, o campo não é calculado.
- **Backfill no arranque:** `GeocodingBackfill` (CommandLineRunner) geocodifica até 25 propostas + 25 perfis antigos sem coordenadas por boot (pausa 300ms entre chamadas; idempotente — quem não resolve volta a ficar elegível).
- Distância é **linha reta** (adequada a drone); roteamento por rua (OSRM) fica para fase futura.

### Marketplace: lista compacta, filtros e paginação (tela 🧭 Oportunidades)
- **Linhas compactas:** título + valor na primeira linha; data/hora/duração, qualidade, local, distância e status na segunda; botões "Detalhes" e "✓ Aceitar de cara".
- **Server-side:** filtro por estado (27 UFs) e cidade (case-insensitive), paginação de 10 (`GET /api/propostas/abertas?estado=&cidade=&page=` → `{conteudo, pagina, totalPaginas, totalElementos}`), índice `idx_proposta_uf_cidade (estado, lower(cidade))`.
- **Client-side:** chip de qualidade aplica sobre a página corrente.
- **Aviso ao dronista sem base:** banner "📍 Informe CEP ou cidade no seu perfil para ver a distância até cada proposta".

## 5. Regras de Negócio

1. **Registro:** `POST /api/auth/registrar` recebe `nome, email, senha, telefone, papel (DRONISTA|SOLICITANTE)` + campos do perfil (`cnpjCpf`/`licencaAnac`/`bio` para dronista; `empresa` para solicitante; `estado/cidade/bairro/cep` para dronista). Cria `usuario` + `perfil_*` na mesma transação, com geocoding do perfil. Senha ≥ 8; e-mail único global (409); CPF/CNPJ obrigatório e validado para dronista.
2. **Visibilidade:** detalhe da proposta é visível ao autor, ao dronista aceito, ao dronista com conta na proposta — **e a qualquer dronista enquanto a proposta está ABERTA** (é de lá que ele envia a conta). Contas recebidas: só o autor. Cross-tenant/papel → 404.
3. **Uma conta-proposta por dronista por proposta** — nova chamada enquanto ENVIADA sobrescreve valor/mensagem.
4. **Aceitar conta (solicitante):** proposta → `ACEITA` com `dronista_id`/`conta_aceita_id`; demais contas ENVIADA → `RECUSADA` automaticamente; novas contas → 403.
5. **Aceite direto (dronista):** `POST /api/propostas/{id}/aceitar` (só DRONISTA, só ABERTA) cria conta já ACEITA no valor ofertado, descarta a contraproposta pendente do próprio dronista e recusa as demais. Corrida transacional — o perdedor recebe 403 "acabou de ser aceita por outro dronista".
6. **Cancelamento:** só o autor, só `ABERTA`.
7. **Entrega:** só o dronista com conta ACEITA; URL http/https obrigatória. **Reenvio** (status REJEITADA) atualiza a mesma entrega e restaura `ENVIADA`.
8. **Aprovar entrega (solicitante):** entrega → `APROVADA`, proposta → `CONCLUIDA`, incrementa `trabalhos_concluidos` e `contratacoes`. "Pagamento liberado" é o flag visual — cobrança real fora de escopo.
9. **Recusar entrega:** → `REJEITADA`; dronista reenvia; proposta permanece `ACEITA`.
10. **Avaliação:** só após entrega APROVADA; uma por entrega por direção; nota 1–5; recalcula média e ranking.
11. **Rankings:** média nota desc, então volume desc — dronistas (nota/trabalhos/UF-cidade) e solicitantes (nota/contratações); exigem auth (qualquer papel vê).
12. **Validações:** `duracao_min` 1..1440, `valor > 0`, `data_voo >= hoje`, `hora` HH:mm, `fps` whitelist, UF/CEP conforme §4, `nota` 1..5, URL de vídeo http(s).
13. **Exclusão lógica** (`ativo = false`), sem delete físico.
14. `licenca_anac` é texto livre ≤ 30 (sem validação real — decisão unilateral).

## 6. API

Formato comum: `Authorization: Bearer <token>`. Erro: `{ "codigo": "...", "mensagem": "..." }` — 409 duplicado, 422 inválido, 404 inexistente, 403 sem permissão, 401 não autenticado.

### Público
- `POST /api/auth/registrar` — cria usuario + perfil (+ geocoding) e devolve token
- `POST /api/auth/login` — token + papel (`DRONISTA | SOLICITANTE | ADMIN`)

### Autenticados (qualquer papel, salvo indicado)
- `GET/PUT /api/perfil/me` — perfil do logado (nota, trabalhos/contratações, localização, coord.); PUT aceita telefone/bio/licença/empresa + estado/cidade/bairro/cep (regeocodifica)
- `GET  /api/propostas/abertas?estado=&cidade=&page=` — marketplace paginado (10/página) com filtros UF/cidade; preenche `distanciaKm` para dronistas (dronista logado)
- `GET  /api/propostas/participando` — propostas em que o dronista logado tem conta
- `GET  /api/propostas/minhas` — propostas do solicitante logado
- `GET  /api/propostas/{id}` — detalhe (guard conforme regra 2)
- `POST /api/propostas` — cria (solicitante)
- `PUT  /api/propostas/{id}` — edita (só autor, só ABERTA)
- `POST /api/propostas/{id}/cancelar` — cancela (só autor, só ABERTA)
- `POST /api/propostas/{id}/aceitar` — **aceite direto** (dronista → fecho no valor ofertado)
- `POST /api/propostas/{id}/contas` — envia/atualiza conta-proposta (dronista, proposta ABERTA)
- `GET  /api/propostas/{id}/contas` — contas recebidas (autor)
- `GET  /api/contas/minhas` — contas enviadas pelo dronista
- `POST /api/contas/{id}/aceitar` / `/recusar` — decisão do solicitante
- `POST /api/contas/{id}/entrega` — entrega/reenvio do vídeo (dronista aceito)
- `GET  /api/entregas/recebidas` — entregas das propostas do solicitante
- `GET  /api/entregas/minhas` — entregas enviadas pelo dronista
- `POST /api/entregas/{id}/aprovar` / `/recusar` — decisão do solicitante
- `POST /api/entregas/{id}/avaliar` — nota do dronista (solicitante)
- `POST /api/entregas/{id}/avaliar-solicitante` — nota do solicitante (dronista)
- `GET  /api/ranking/dronistas` — [{id, nome, licencaAnac, estado, cidade, notaMedia, trabalhosConcluidos}]
- `GET  /api/ranking/solicitantes` — [{id, nome, empresa, notaMedia, contratacoes}]

## 7. Frontend (Angular 18, mobile-first)

Sidebar escura no desktop; no celular vira header sticky com links em scroll horizontal. Botões com alvo de toque ≥ 44px; inputs grandes. Todo o sistema é usado pelo celular.

### Rotas

| Rota | Componente | Acesso |
|---|---|---|
| `/` | Landing (hero + escolha de papel + cadastro com localização) | público |
| `/login` | Login | público |
| `/app` | Dashboard contextual por papel + métricas | autenticado |
| `/app/propostas` | Solicitante: minhas · Dronista: oportunidades (filtros + paginação + distância) | autenticado |
| `/app/propostas/nova` | Publicar proposta (incl. localização + ViaCEP) | solicitante |
| `/app/propostas/:id` | Detalhe: contas/aceite/entrega/avaliação, conforme papel | conforme guard |
| `/app/contas` | Minhas contas enviadas | dronista |
| `/app/entregas` | Entregas (recebidas/enviadas) + aprovar/recusar/avaliar | autenticado |
| `/app/ranking` | Rankings (com UF-cidade do dronista) | autenticado |
| `/app/perfil` | Perfil + métricas + localização (ViaCEP) | autenticado |

### Componentes principais
- **Landing:** escolha de papel (🎯 Preciso de drone / 🚁 Sou dronista) + formulários dinâmicos; feedback em tempo real (senha fraca, e-mail inválido, campos pendentes).
- **Propostas (dronista):** lista compacta, filtros UF (select)/cidade/qualidade, paginação, distância por linha, botão "✓ Aceitar de cara".
- **Proposta nova (solicitante):** data/duração, qualidade/formato (fps condicional), **seção Localização do voo** (UF/CEP/cidade/bairro + ViaCEP) e valor.
- **Detalhe da proposta:** guard por papel — solicitante: cancelar, contas recebidas com base do dronista, aceitar/recusar, entrega + aprovar (libera pagamento)/recusar, avaliar; dronista: aceite de cara ou conta-proposta (editável), entrega/reenvio, avaliar solicitante. Distância exibida para o dronista.
- **DialogService** global (sem `alert()`/`confirm()` nativos) + flash por `sessionStorage`.
- **Guards:** `authGuard`; `solicitanteGuard`/`dronistaGuard` (admin passa).

## 8. Banco de Dados

Banco dedicado `dronistas` (porta do host **5433**), volume `pgdata_dronistas`. Migrações:

- **V1__init.sql** — `usuario`, `perfil_dronista`, `perfil_solicitante`, `proposta_voo`, `conta_proposta`, `entrega_video` com CHECKs (`duracao_min > 0`, `valor > 0`, `nota BETWEEN 1 AND 5`), índices por status/solicitante/dronista/conta e unique em lower(email). **Não há seed SQL de admin:** o `AdminSeeder` (CommandLineRunner) cria `admin@dronistas.com` com hash BCrypt real no arranque.
- **V2__localizacao.sql** — `estado`/`cidade`/`bairro`/`cep` em `proposta_voo` e `perfil_dronista` + índice `idx_proposta_uf_cidade (estado, lower(cidade))`.
- **V3__coordenadas.sql** — `lat`/`lng` DOUBLE PRECISION em `proposta_voo` e `perfil_dronista`.

Runners no arranque: `AdminSeeder` (admin garantido) e `GeocodingBackfill` (coordenadas retroativas, 25+25 por boot, pausa 300ms).
Recriação total: `docker compose down -v && docker compose up -d --build`.

## 9. Critérios de Aceite (todos validados por smoke-test.ps1 — 9 seções, verde)

- Registro/login dos dois papéis + ADMIN seed (401 em senha errada; 401 sem token; 409 e-mail duplicado; 422 senha curta/CPF inválido).
- Validações de proposta: valor negativo, data no passado, qualidade/formato/CEP/UF inválidos → 422; dronista não cria proposta → 403.
- Fluxo completo: proposta com localização → marketplace paginado com a proposta → detalhe aberto por dronista antes de ter conta → contas de 2 dronistas (uma por dronista; atualização sobrescreve) → filtro UF+cidade case-insensitive → filtro sem resultado (RJ) → **distância base→voo calculada (Campinas→Itu = 46,7 km)** → aceitação (demais RECUSADAS automaticamente; novas bloqueadas; cancelar proposta aceita → 403) → entrega → recusa (REJEITADA) → reenvio (restaura ENVIADA) → aprovação (proposta CONCLUIDA, pagamento liberado) → avaliações nas duas direções (duplicada → 403; dronista de fora → 403/404) → rankings com médias e contadores corretos.
- Aceite direto: proposta 3 fechada pelo dronista no valor ofertado; contraproposta dele descartada (RECUSADA); outro dronista em proposta fechada → 403.
- Backfill de geocoding executa no arranque para registros antigos elegíveis.
- UI mobile-first: sidebar → header; listas em cartões/linhas compactas; inputs ≥ 44px.

## 10. Estrutura

```
projetos/dronistas/
├── backend/
│   ├── pom.xml (Spring Boot 3.3, MyBatis 3.0.3, JWT jjwt .11.5, Flyway)
│   ├── Dockerfile (maven build → jre-alpine)
│   └── src/main/java/com/dronistas/
│       ├── BackendApplication.java
│       ├── config/    # UuidTypeHandler, AdminSeeder, GeocodingBackfill
│       ├── mapper/    # Usuario, PerfilDronista, PerfilSolicitante, PropostaVoo, ContaProposta, EntregaVideo
│       ├── model/     # Usuario, PerfilDronista, PerfilSolicitante, PropostaVoo, ContaProposta, EntregaVideo
│       ├── security/  # JwtService, JwtAuthFilter, Sessao, SecurityConfig, DocumentoValidator,
│       │              # LocalizacaoValidator, RegraNegocioException, EstadoNaoAutenticadoException
│       ├── service/   # AuthService, PerfilService, PropostaService, ContaService, EntregaService, GeocodingService
│       └── web/       # Auth, Perfil, Proposta, Conta, Entrega, Ranking controllers + ApiExceptionHandler
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/  # V1__init.sql, V2__localizacao.sql, V3__coordenadas.sql
├── frontend/
│   ├── package.json / angular.json / tsconfig.json / Dockerfile (node build → nginx :80)
│   └── src/
│       ├── index.html, main.ts, styles.css (design system mobile-first)
│       └── app/
│           ├── api.service.ts, papel.ts (sessão/flash), auth.guard.ts
│           ├── dialog.service.ts + dialog.component.ts (modais globais)
│           ├── mascara.ts (CPF/CNPJ/telefone/CEP), estrelas.component.ts
│           ├── cep.service.ts (ViaCEP)
│           ├── site-principal.component.ts (landing + registro c/ localização)
│           ├── login.component.ts, shell.component.ts
│           ├── dashboard, propostas (filtros+paginação+distância), proposta-nova,
│           │   proposta-detalhe (aceite de cara/contas/entrega/avaliação),
│           │   contas, entregas, ranking, perfil (componentes)
├── docker-compose.yml (db 5433 / backend 8080 / frontend 8081)
├── smoke-test.ps1 (9 seções — harness da validação ponta a ponta)
├── ESPECIFICACAO.md / README.md
```

## 11. Observações

- **Pagamento real fora de escopo:** aprovar entrega marca "pagamento liberado" (flag/UI); gateway (Pix/Stripe/PagSeguro) em versão futura.
- **Entrega por URL** (YouTube/Drive/Vimeo); upload direto (S3/MinIO) em versão futura.
- **Geocoding:** BrasilAPI CEP v2 + Nominatim (gratuitos, sem chave); a ausência de coordenadas nunca bloqueia cadastro nem listagem.
- **Distância é linha reta** (Haversine); roteamento por estrada (OSRM) e ordenação por proximidade ficam como evolução natural.
- **Sem chat de IA / RAG / MCP** nesta fase — foco no marketplace.
