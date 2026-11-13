# Dronistas — Portal de Conexão de Serviços com Drones

**Data:** 2026-11-13 (v3.0 — snapshot fiel: wizard de publicação em 5 passos com prévia do mapa, endereço completo com logradouro+numero, geocoding de porta exata, combo de cidade e mapas de visualização)
**Status:** Ativa (critérios validados por `smoke-test.ps1` — verde; precisão de geocoding provada a 0,00 km)
**Base:** herdada do iAcadastro v3.3 (Spring Boot 3.3 + MyBatis + Angular 18 + PostgreSQL 16 + Docker Compose)

## 1. Objetivo

Portal que conecta **dono de drone profissional** (dronista) com **quem precisa desse serviço** (solicitante). O fluxo:

1. **Solicitante** publica a proposta de voo no **wizard de 5 passos** (O serviço → Quando → Vídeo → Onde → Revisão), com **endereço completo** (CEP, logradouro, UF, cidade, bairro, número), **prévia do mapa** antes de publicar e valor com máscara brasileira.
2. **Dronistas** navegam o marketplace (linhas compactas, **combos de Estado+Cidade populados do banco**, chip de qualidade, paginação de 10) e veem a **distância da sua base e o mapa do local** em cada oportunidade. Fecham o trabalho de dois jeitos:
   - **"✓ Aceitar o valor ofertado"** ( aceite direto) — acordo imediato no preço do anúncio; ou
   - **Conta-proposta** (preço + mensagem), que o solicitante **aprova** → proposta ACEITA e travada para aquele dronista (demais contas recusadas automaticamente).
3. O dronista contratado **grava e entrega o vídeo** (URL hospedada).
4. O solicitante **aprova ou recusa** a entrega. Aprovada → **pagamento liberado** e trabalho concluído.
5. Ambos se **avaliam** (1–5 estrelas + comentário, uma vez por direção) e o portal mantém os **rankings** de dronistas e solicitantes (com localização).

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Backend | Java 17 + Spring Boot 3.3 (Web, Validation, Security) |
| Acesso a dados | MyBatis (annotation SQL) |
| Frontend | Angular 18 standalone |
| Banco | PostgreSQL 16 (imagem `pgvector`, sem uso de pgvector nesta fase) |
| Build/Run | Maven + Docker Compose (db :5433 / api :8080 / app :8081) |
| Auth | JWT bearer + bcrypt |
| Mapas no frontend | Leaflet 1.9.4 (CDN, lazy) + Esri World Imagery (satélite) + OSM (ruas) |
| Serviços externos (gratuitos, sem chave) | ViaCEP + BrasilAPI CEP v2 (dupla fonte, a BrasilAPI traz coordenadas) · Nominatim/OSM (geocoding textual: rua+porta, bairro, cidade) |

Herança do iAcadastro: helpers genéricos mantidos (DTO de erro, JWT, DocumentoValidator, DialogService, design system); domínio Cliente/Chat/MCP/Gráficos/Tenant **removido** — portal global, sem multi-tenant.

## 3. Modelo de Segurança

**Escopo único global** — todos os perfis compartilham o mesmo banco e o mesmo ranking. Sem tenant.

| Papel | Descrição | Permissões |
|---|---|---|
| `DRONISTA` | Profissional dono de drone | Ver/aceitar propostas abertas, enviar conta-proposta, entregar vídeo, ver suas contas/entregas, avaliar solicitante, ver ranking |
| `SOLICITANTE` | Interessado no serviço | Criar/editar/cancelar propostas, ver contas recebidas, aceitar/recusar conta, aprovar/recusar entrega, avaliar dronista, ver ranking |
| `ADMIN` | Operador da plataforma | Acesso total (criado no arranque pelo `AdminSeeder`) |

**Público** (sem JWT): `/api/auth/registrar`, `/api/auth/login`. **Autenticados**: todo o resto sob `/api/**`; sessão ausente → **401 JSON** `{codigo, mensagem}` (entry point no `SecurityConfig`).
Admin da plataforma: `admin@dronistas.com` / `admin123` (trocar em produção).

## 4. Entidades

- `usuario`: `id`, `nome`, `email` (único global, lower), `senha_hash`, `papel` (`ADMIN | DRONISTA | SOLICITANTE`), `ativo`.
- `perfil_dronista`: `id`, `usuario_id` (unique), `nome`, `telefone`, `bio`, `cnpj_cpf` (**obrigatório**, CPF/CNPJ alfanumérico), `licenca_anac`, **localização (`estado`, `cidade`, `bairro`, `cep`)**, `lat`/`lng`, `nota_media`, `trabalhos_concluidos`, `ativo`.
- `perfil_solicitante`: `id`, `usuario_id` (unique), `nome`, `telefone`, `empresa`, **`cnpj_cpf` (opcional — V4; unique parcial entre ativos, validado se informado)**, `nota_media` (média das `nota_solicitante` recebidas), `contratacoes`, `ativo`.
- `proposta_voo`: `id`, `solicitante_id`, `titulo`, `descricao`, `local` (referência livre/ponto de encontro), `data_voo`, `hora_voo`, `duracao_min`, `qualidade_video`, `fps` (opcional), `formato_video`, `valor_oferecido`, **localização (`estado`, `cidade`, `bairro`, `logradouro` (V7), `numero` (V5), `cep`)**, **`solicitante_presente` (V6 — boolean, default TRUE: FALSE = dronista executa sozinho)**, `lat`/`lng`, `status`, `dronista_id` + `conta_aceita_id` (quando aceita).
- `conta_proposta`: `id`, `proposta_id`, `dronista_id`, `valor_proposto`, `mensagem`, `status` (`ENVIADA | ACEITA | RECUSADA`).
- `entrega_video`: `id`, `conta_id`, `url_video`, `observacao`, `status`, `nota`+`comentario` (solicitante → dronista), `nota_solicitante`+`comentario_solicitante` (dronista → solicitante).

**Sem tabela de avaliação:** as notas vivem em `entrega_video` (uma por direção, garantida por `nota IS NULL` na UPDATE); médias recalculadas por `avg()` com join.

### Qualidade e formato de vídeo
- `qualidade_video`: `FULLHD` (1080p), `2K`, `4K_30FPS`, `4K_60FPS`, `4K_120FPS`.
- `formato_video`: `MP4`, `MOV`, `LOG`, `RAW`, `PRORES`.
- FPS já embutido nos 4K; para FULLHD/2K o campo `fps` é opcional (∈ {24,25,30,60,120}).

### Endereço e busca por CEP (V2 + V5 + V7)
- **Campos do modo Endereço** (passo 4 do wizard): **CEP primeiro → Logradouro → Estado (UF) → Cidade → Bairro → Número** (alfanumérico `123A`, `SN 45, LT 12 QD 3` ≤ 10, normalizado maiúsculas).
- **Busca de CEP duplex** (`CepService`): ViaCEP → fallback automático BrasilAPI. O retorno traz `logradouro, bairro, cidade, uf` e **lat/lng quando a fonte as tem** (BrasilAPI). Preenchimento só em campos vazios ou autopreenchidos; o logradouro digitado manualmente para de ser sobrescrito (`logradouroAuto`).
- **CEP inexistente nas duas bases** → **alerta vermelho visível** "CEP não encontrado — confira o número ou preencha o endereço manualmente" (nunca dica discreta).
- **Contas-proposta exibem a base do dronista** (cidade/UF); ranking de dronistas também.

### Geocoding de precisão (V3 — comprovado)
`GeocodingService.resolver(cep, uf, cidade, bairro, logradouro, numero, local)` — cascata do mais preciso ao mais amplo:

1. **Referência textual** do solicitante (Nominatim);
2. **Logradouro + NÚMERO** informados (Nominatim — porta exata); sem resultado, logradouro puro;
3. **Rua que a BrasilAPI conhece do CEP + Número** (Nominatim), depois rua pura;
4. Coordenadas da BrasilAPI (em várias cidades são de CENTRO DE CIDADE — nunca usadas como 1º recurso);
5. Bairro (Nominatim) · 6. Cidade+UF (Nominatim).

- **Prova:** "Avenida Boa Viagem, 2900, Recife" → pino a **0,00 km** do ponto real (antes caía no centro ~7 km longe). Caso Altiplano Cabo Branco (JP): o pino saiu do centro da cidade para a Rua Iracema Guedes Lins.
- Enriquecimento puro: falha → campos nulos e **nada quebra** (log de aviso).
- **Backfill no arranque:** `GeocodingBackfill` geocodifica até 25 propostas + 25 perfis antigos por boot (pausa 300ms; idempotente).
- **Opcional pendente:** Google Geocoding (precisão de prédio) — precisa de chave do usuário (~10k/mês grátis); plugável no topo da cascata.

### Mapas (Leaflet, read-only)
- **Detalhe da proposta:** card "📍 Local do voo" com marcador e alternador 🛰️ Satélite/🗺️ Ruas — visível a qualquer visualizador quando `lat/lng != null`.
- **Wizard, passo 5 (Revisão):** card "🗺️ Prévia do local" — resolução no navegador: ponto do mapa (etapa 4) → **geocoding textual do endereço com número** (Nominatim pelo navegador) → coordenadas do CEP como último recurso. Guard de re-render (container recriado → mapa recriado).
- **Wizard, passo 4 (modo mapa):** seletor interativo (Leaflet + Esri/OSM) que grava lat/lng com 6 casas — **prioridade máxima** sobre o geocoding.

### Marketplace 🧭 (lista, filtros, paginação)
- **Linhas compactas:** título + valor verde na 1ª linha; data/duração, qualidade, local (logradouro · bairro · cidade/UF), distância e status na 2ª; "Detalhes" e **"✓ Aceitar proposta"**.
- **Filtros server-side:** Estado (27 UFs) → **combo de Cidade populado do banco** (`GET /api/propostas/abertas/cidades?estado=` — cidades distintas das propostas ABERTA, agrupadas case-insensitive; trocar UF reseta e repopula; o combo se atualiza após cada listagem) — paginação de 10 (`{conteudo, pagina, totalPaginas, totalElementos}`) com índice `idx_proposta_uf_cidade`.
- **Client-side:** chip de qualidade sobre a página corrente.
- **Aviso ao dronista sem base:** banner ligando para o perfil.

## 5. Regras de Negócio

1. **Registro:** `POST /api/auth/registrar` recebe `nome, email, senha, telefone, papel` + perfil (dronista: `cnpjCpf` **obrigatório/validado**, `licencaAnac`, `bio`, localização; solicitante: `empresa`, `cnpjCpf` **opcional** — validado se informado, unique parcial entre ativos). Cria `usuario` + `perfil_*` na mesma transação com geocoding. Senha ≥ 8; e-mail único global (409).
2. **Visibilidade:** detalhe visível ao autor, ao dronista aceito, a quem tem conta — **e a qualquer dronista enquanto ABERTA**. Contas recebidas: só o autor. Fora disso → 404.
3. **Uma conta-proposta por dronista por proposta** — nova chamada enquanto ENVIADA sobrescreve valor/mensagem.
4. **Aceitar conta (solicitante):** proposta → `ACEITA`; demais ENVIADA → `RECUSADA` automáticas; novas contas → 403.
5. **Aceite direto (dronista):** `POST /api/propostas/{id}/aceitar` cria conta já ACEITA no valor ofertado, descarta a contraproposta do próprio dronista e recusa as demais. Corrida transacional → perdedor recebe 403.
6. **Cancelamento:** só o autor, só `ABERTA`.
7. **Entrega:** só com conta ACEITA; URL http/https; **reenvio (REJEITADA) atualiza a mesma entrega e restaura `ENVIADA`**.
8. **Aprovar entrega:** entrega `APROVADA`, proposta `CONCLUIDA`, incrementa `trabalhos_concluidos`/`contratacoes`. "Pagamento liberado" é flag visual.
9. **Recusar entrega:** `REJEITADA`; dronista reenvia; proposta permanece `ACEITA`.
10. **Avaliação:** só após APROVADA; uma por direção; nota 1–5; recalcula médias.
11. **Rankings:** nota desc, depois volume; autenticados.
12. **Validações:** `duracaoMin` 1..1440; `valor > 0` (máscara pt-BR convertida `1.234,56`→`1234.56`); `dataVoo >= hoje`; hora HH:mm; `fps` whitelist; UF 2 letras; CEP 8 dígitos; `nota` 1..5; URL http(s); `numero` alfanumérico ≤ 10; `logradouro` ≤ 300.
13. **Exclusão lógica** (`ativo = false`).
14. `licenca_anac` texto livre ≤ 30 (sem validação real — decisão unilateral).
15. **Wizard (client-side):** "Próximo" bloqueado até o passo atual ser válido (1: título+valor>0; 2: data/hora+duração; 4: **ponto no mapa OU CEP completo OU cidade+UF**); passo 3 sempre válido (defaults); revisão (5) permite pular para qualquer passo.
16. **`solicitante_presente`** (V6): default TRUE; FALSE indica execução sem presença no horário.
17. **Máscara de valor** (`mascaraValor`): digitação em centavos (350→`3,50`; 123456→`1.234,56`), `inputmode=numeric`, model sincronizado, conversão pt-BR→número no envio; campos: valor oferecido, conta-proposta e atualização.

## 6. API

Formato comum: `Authorization: Bearer <token>`. Erro: `{ "codigo", "mensagem" }` — 409 duplicado · 422 inválido · 404 inexistente · 403 sem permissão · 401 não autenticado.

### Público
- `POST /api/auth/registrar` — cria.usuario + perfil (validações §5.1) + geocoding → token
- `POST /api/auth/login` — token + papel

### Autenticados
- `GET/PUT /api/perfil/me` — perfil (nota, trabalhos, localização, coords); PUT regeocodifica quando localização muda
- `GET /api/propostas/abertas?estado=&cidade=&page=` — marketplace paginado (10/página); preenche `distanciaKm` para o dronista
- `GET /api/propostas/abertas/cidades?estado=` — **cidades distintas com oportunidades abertas** (combo do filtro)
- `GET /api/propostas/participando` — propostas em que o dronista tem conta
- `GET /api/propostas/minhas` — propostas do solicitante
- `GET /api/propostas/{id}` — detalhe (guard §5.2)
- `POST /api/propostas` — cria (validações §5.12 + geocoding §Geocoding)
- `PUT /api/propostas/{id}` — edita (autor, ABERTA)
- `POST /api/propostas/{id}/cancelar` — cancela (autor, ABERTA)
- `POST /api/propostas/{id}/aceitar` — **aceite direto no valor ofertado (dronista)**
- `POST /api/propostas/{id}/contas` / `GET …/contas` — envia/atualiza · lista (autor)
- `GET /api/contas/minhas` — contas do dronista
- `POST /api/contas/{id}/aceitar` / `/recusar` — decisão do solicitante
- `POST /api/contas/{id}/entrega` — entrega/reenvio (dronista aceito)
- `GET /api/entregas/recebidas` / `GET /api/entregas/minhas`
- `POST /api/entregas/{id}/aprovar` / `/recusar`
- `POST /api/entregas/{id}/avaliar` / `/avaliar-solicitante`
- `GET /api/ranking/dronistas` / `/ranking/solicitantes`

## 7. Frontend (Angular 18, mobile-first)

Tema escuro completo (`color-scheme: dark`; ícones nativos de 📅/🕐 substituídos por **SVGs brancos**; vermelho só na marca/erro; **valores R$ em verde**; links/azul `#3ea6ff`). Sidebar escura no desktop → header sticky com scroll horizontal no celular. Botões ≥ 44px de alvo.

### Rotas

| Rota | Componente | Acesso |
|---|---|---|
| `/` | Landing (escolha de papel + cadastro com localização; CPF/CNPJ do solicitante opcional) | público |
| `/login` | Login | público |
| `/app` | Dashboard por papel (métricas + próximos destaques) | autenticado |
| `/app/propostas` | Solicitante: minhas · Dronista: oportunidades (combo UF+cidade + chip + paginação + distância) | autenticado |
| `/app/propostas/nova` | **Wizard 5 passos** (ver §Wizard) | solicitante |
| `/app/propostas/:id` | Detalhe: mapas/contas/aceite/entrega/avaliação conforme papel | conforme guard |
| `/app/contas` | Minhas propostas enviadas (dronista; aceito ⇒ **entrega do vídeo via card na tela**) | dronista |
| `/app/entregas` | Entregas recebidas/enviadas + decisões e avaliações | autenticado |
| `/app/ranking` | Rankings com medalhas e localização | autenticado |
| `/app/perfil` | Perfil + métricas + localização (ViaCEP) + distância base | autenticado |

### Wizard "Publicar proposta de voo" (5 passos)
1. **O serviço:** título, descrição, valor (máscara R$);
2. **Quando:** data, hora, duração;
3. **Vídeo:** qualidade (FPS condicional p/ FULLHD/2K), formato;
4. **Onde:** modo chips **🗺️ No mapa** (Leaflet seletor, satélite/ruas, ponto exato) **ou 📝 Endereço** (CEP → Logradouro → UF → Cidade → Bairro → Número, com busca duplex e alerta visível) + "Sua presença no local" + referência;
5. **Revisão:** resumo por seção com "✏️ Editar" que pula ao passo, **card "🗺️ Prévia do local"** (alternador satélite/ruas) + "Revisar com calma".

Barra de progresso + pontos (✓ azul nas concluídos); navegação valida o passo; scroll suave ao topo.
**Detalhe da proposta:** para dronista — "✓ Aceitar o valor ofertado" (em ABERTA; também no card da contraproposta, com hint) OU "📨 Ou envie sua conta-proposta" (valor com máscara, editável); ao aceito: entrega/reenvio + avaliar o solicitante; mapa "📍 Local do voo" sempre que houver ponto. Para o autor: cancelar; contas recebidas (base do dronista); aceitar/recusar; entrega + "Aprovar e liberar pagamento"; avaliar.

**DialogService** global (sem alert()/confirm()) + flash por `sessionStorage`. **Guards:** `authGuard`, `solicitanteGuard`, `dronistaGuard` (admin passa).

## 8. Banco de Dados

Banco dedicado `dronistas` (porta do host **5433**), volume `pgdata_dronistas`. Migrações:

- **V1__init.sql** — `usuario`, `perfil_dronista`, `perfil_solicitante`, `proposta_voo`, `conta_proposta`, `entrega_video` com CHECKs (`duracao_min > 0`, `valor > 0`, `nota BETWEEN 1 AND 5`), índices e unique em lower(email). Admin **não** é seed SQL — `AdminSeeder` (CommandLineRunner) cria `admin@dronistas.com` com hash BCrypt real no arranque.
- **V2__localizacao.sql** — `estado`/`cidade`/`bairro`/`cep` em `proposta_voo` e `perfil_dronista` + índice `idx_proposta_uf_cidade (estado, lower(cidade))`.
- **V3__coordenadas.sql** — `lat`/`lng` DOUBLE PRECISION nas duas tabelas.
- **V4__cpf_solicitante.sql** — `perfil_solicitante.cnpj_cpf VARCHAR(14)` + unique parcial entre ativos.
- **V5__numero_endereco.sql** — `proposta_voo.numero VARCHAR(10)` (alfanumérico).
- **V6__presenca_solicitante.sql** — `proposta_voo.solicitante_presente BOOLEAN NOT NULL DEFAULT TRUE`.
- **V7__logradouro.sql** — `proposta_voo.logradouro VARCHAR(300)`.

Runners no arranque: `AdminSeeder` (admin garantido) e `GeocodingBackfill` (coordenadas retroativas, 25+25 por boot, 300ms).
Recriação total: `docker compose down -v && docker compose up -d --build`.

## 9. Critérios de Aceite (validados — smoke-test.ps1 verde, 9 seções)

- Registro/login dos papéis + ADMIN; erros (401/409/422 em senha curta, CPF inválido, e-mail duplicado).
- Proposta: 422 em valor negativo, data no passado, qualidade/formato/CEP/UF inválidos; 403 dronista cria.
- Fluxo completo: proposta **com logradouro** (verificado retorno `logradouro` no marketplace) → detalhe por dronista antes de conta → 2 contas (uma por dronista, atualização sobrescreve) → filtro UF+cidade case-insensitive → **UF sem resultados (RR)** → **combo de cidades SP inclui Itu** → **distância calculada (Campinas→Itu ≈ 46,4 km)** → aceitação/travamento → entrega/recusa/reenvio (restaura ENVIADA) → aprovação (CONCLUIDA, pagamento liberado) → avaliações nas duas direções → rankings corretos.
- Aceite direto: proposta fechada no valor ofertado; contraproposta descartada; outro dronista → 403.
- **Precisão de geocoding:** "Avenida Boa Viagem, 2900, Recife" → pino a **0,00 km** do real (cascata de porta); Altiplano Cabo Branco → rua certa em vez do centro da cidade.
- **Simulação de carga:** `seed_simulacao.sql` cria 80 propostas (Raissa Santos) em 21 cidades/13 estados — 9 páginas exibidas; combo lista 21 cidades; útil p/ testar paginação/filtros.
- Backfill de geocoding no arranque; detalhe com mapa; wizard valida passos; UI mobile-first.

## 10. Estrutura

```
projetos/dronistas/
├── backend/
│   ├── pom.xml (Spring Boot 3.3, MyBatis 3.0.3, jjwt .11.5, Flyway)
│   ├── Dockerfile (maven build → jre-alpine)
│   └── src/main/java/com/dronistas/
│       ├── BackendApplication.java
│       ├── config/    # UuidTypeHandler, AdminSeeder, GeocodingBackfill
│       ├── mapper/    # Usuario, PerfilDronista, PerfilSolicitante, PropostaVoo, ContaProposta, EntregaVideo
│       ├── model/     # Usuario, PerfilDronista, PerfilSolicitante, PropostaVoo, ContaProposta, EntregaVideo
│       ├── security/  # JwtService, JwtAuthFilter, Sessao, SecurityConfig, DocumentoValidator,
│       │              # LocalizacaoValidator (UF/CEP/numeroEndereco), RegraNegocioException
│       ├── service/   # AuthService, PerfilService, PropostaService, ContaService, EntregaService, GeocodingService
│       └── web/       # Auth, Perfil, Proposta, Conta, Entrega, Ranking + ApiExceptionHandler
│   └── src/main/resources/
│       ├── application.yml
│       └── db/migration/  # V1__init … V7__logradouro
├── frontend/
│   ├── package.json / angular.json / Dockerfile (node build → nginx)
│   └── src/app/
│       ├── api.service.ts, papel.ts (sessão/flash), auth.guard.ts
│       ├── dialog.service.ts + dialog.component.ts (modais globais)
│       ├── mascara.ts (CPF/CNPJ/telefone/CEP/valorR$), estrelas.component.ts
│       ├── cep.service.ts (ViaCEP→BrasilAPI duplex + geocoding textual p/ prévia)
│       ├── site-principal (landing/registro), login, shell (sidebar→header)
│       ├── propostas (combo UF+cidade/paginação/distância/aceite), proposta-nova (WIZARD 5 passos + mapas),
│       ├── proposta-detalhe (mapa/contas/entrega/avaliação), contas, entregas, ranking, perfil
├── docker-compose.yml (db 5433 / backend 8080 / frontend 8081)
├── smoke-test.ps1 (9 seções de validação ponta a ponta)
├── seed_simulacao.sql (80 propostas sintéticas p/ Raissa Santos — simulação, não migração)
└── ESPECIFICACAO.md / README.md
```

## 11. Observações

- **Pagamento real** fora de escopo (flag "pagamento liberado"); gateway (Pix/Stripe/PagSeguro) em fase futura.
- **Entrega por URL** (YouTube/Drive/Vimeo); upload direto (S3/MinIO) em fase futura.
- **Geocoding:** serviços públicos sem chave. **Google Maps:** integrável no topo da cascata quando o proprietário fornecer a chave (Geocoding API, ~10k/mês grátis).
- **Precisão de porta** comprovada com número no endereço; sem OSM para a porta → cai na rua/bairro (nunca mais centro de cidade quando há rua+cidade).
- **Distância é linha reta** (Haversine); roteamento (OSRM) e ordenação por proximidade em fase futura.
