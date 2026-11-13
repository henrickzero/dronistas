# Dronistas — Portal de Serviços com Drones

Marketplace que conecta **dronistas profissionais** (donos de drone) a **solicitantes**
(pessoas/empresas que precisam de um voo filmado). Feito para funcionar muito bem pelo celular.

## Como funciona

1. **Solicitante** publica a proposta no **wizard de 5 passos** — título/descrição/valor,
   data+hora+duração, qualidade do vídeo (Full HD, 2K, 4K 30/60/120 fps) e formato
   (MP4, MOV, LOG, RAW, ProRes), e o **Onde**:
   - **🗺️ No mapa** — escolhe o ponto exato (satélite/ruas); ou
   - **📝 Endereço** — **CEP → Logradouro → Estado → Cidade → Bairro → Número**, com
     preenchimento automático (ViaCEP → BrasilAPI) e **prévia do mapa na revisão**.
2. **Dronistas** navegam as oportunidades — lista compacta paginada (10/página),
   **combos de Estado+Cidade** populados do banco, chip de qualidade, e cada linha mostra
   a **distância da base do dronista** ("🛩️ ~46,4 km de você") e o detalhe tem o
   **mapa do local** (satélite/ruas).
3. Fecham o trabalho de dois jeitos:
   - **"✓ Aceitar proposta"** — aceite direto no valor ofertado, acordo imediato; ou
   - **Conta-proposta** (preço + mensagem) — uma por dronista, atualizável; o solicitante
     aprova a melhor e as demais são recusadas automaticamente.
4. O dronista contratado **grava e entrega o vídeo** (URL: YouTube, Drive, Vimeo...);
   o solicitante **aprova ou recusa**. Aprovada → **pagamento liberado** e trabalho concluído.
5. Ambos se **avaliam em estrelas** (1–5); o portal mantém o **ranking de dronistas e
   de solicitantes** (com cidade/UF).

## Precisão de localização

O geocoding usa uma **cascata de serviços públicos gratuitos** (sem chave):

```
referência textual → logradouro + NÚMERO → rua que a BrasilAPI conhece do CEP + número
→ coordenadas do CEP (fallback fraco) → bairro → cidade
```

- A prova real: "Avenida Boa Viagem, 2900, Recife" pinou a **0,00 km** do ponto real —
  sem essa cascata, o CEP sozinho jogaria o pino no centro da cidade.
- Para precisão de **prédio**, use o seletor 🗺️ no wizard: o ponto clicado (6 casas
  decimais) tem prioridade máxima.
- **Google Geocoding** pode ser plugado no topo da cascata quando a chave for fornecida
  (~10 mil consultas grátis/mês no Google Cloud).

## Stack

- **Backend:** Java 17 + Spring Boot 3.3, MyBatis, Spring Security (JWT), Flyway
- **Banco:** PostgreSQL 16 (imagem `pgvector/pgvector:pg16`, volume próprio; host :5433)
- **Frontend:** Angular 18 standalone, tema escuro mobile-first (sidebar → header sticky no celular)
- **Execução:** Docker Compose (db + backend :8080 + frontend/nginx :8081)

## Como rodar

```powershell
docker compose up -d --build
```

- Aplicação: **http://localhost:8081**
- API direta: http://localhost:8080/api/...

Primeiro acesso: crie sua conta na home — escolha **"Preciso de um drone"** (solicitante)
ou **"Sou dronista"**. O admin da plataforma usa `admin@dronistas.com` / `admin123`
(trocar em produção).

> Recriar o banco do zero: `docker compose down -v && docker compose up -d --build`
>
> **Dados de simulação:** `seed_simulacao.sql` cria 80 propostas (vinculadas ao usuário
> "Raissa Santos", 21 cidades/13 estados) para testar paginação, filtros e distâncias —
> rodar com: `Get-Content seed_simulacao.sql -Raw | docker exec -i dronistas-db-1 psql -U dronistas -d dronistas`

## API principal

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | /api/auth/registrar | público | cria conta (dronista ou solicitante) + token |
| POST | /api/auth/login | público | token |
| GET/PUT | /api/perfil/me | ambos | perfil do logado (nota, localização, edição) |
| POST | /api/propostas | solicitante | publica proposta (wizard; envia logradouro/numero/presença/lat-lng) |
| GET | /api/propostas/minhas | solicitante | propostas do solicitante |
| GET | /api/propostas/abertas?estado=&cidade=&page= | ambos | marketplace paginado (10/página); traz `distanciaKm` para o dronista |
| GET | /api/propostas/abertas/cidades?estado= | ambos | **cidades com oportunidades abertas** (combo do filtro) |
| GET | /api/propostas/participando | dronista | propostas em que o dronista tem conta |
| POST | /api/propostas/{id}/aceitar | dronista | **aceite direto do valor ofertado** — fecho o acordo na hora |
| PUT/POST | /api/propostas/{id}… | autor | editar `/cancelar` (só ABERTA) |
| POST | /api/propostas/{id}/contas | dronista | envia/atualiza conta-proposta |
| GET | /api/propostas/{id}/contas | autor | contas recebidas |
| GET | /api/contas/minhas | dronista | contas enviadas |
| POST | /api/contas/{id}/aceitar | autor | aceita conta → proposta ACEITA, demais recusadas |
| POST | /api/contas/{id}/recusar | autor | recusa conta |
| POST | /api/contas/{id}/entrega | dronista aceito | entrega vídeo (URL) — reenvio atualiza |
| GET | /api/entregas/recebidas · /minhas | ver tabela | entregas do lado de cada papel |
| POST | /api/entregas/{id}/aprovar | autor | aprova → pagamento liberado, proposta CONCLUIDA |
| POST | /api/entregas/{id}/recusar | autor | recusa → dronista reenvia |
| POST | /api/entregas/{id}/avaliar | autor | nota 1–5 ao dronista |
| POST | /api/entregas/{id}/avaliar-solicitante | dronista | nota 1–5 ao solicitante |
| GET | /api/ranking/dronistas · /solicitantes | ambos | ranking por nota e volume (com cidade/UF) |

Erros: `{ "codigo", "mensagem" }` — 409 duplicado, 422 validação, 404 não encontrado,
403 sem permissão, 401 não autenticado.

## Estrutura

```
dronistas/
├── backend/            # Spring Boot (com.dronistas)
│   └── src/main/java/com/dronistas/
│       ├── config/     # UuidTypeHandler, AdminSeeder, GeocodingBackfill
│       ├── mapper/     # MyBatis annotations
│       ├── model/      # Usuario, perfis, PropostaVoo, ContaProposta, EntregaVideo
│       ├── security/   # JWT, Sessão, DocumentoValidator (CPF/CNPJ alfanum.), LocalizacaoValidator
│       ├── service/    # regras de negócio + GeocodingService (cascata de precisão)
│       └── web/        # controllers REST + handler de erros
│   └── resources/db/migration/  # V1__init … V7__logradouro
├── frontend/           # Angular 18 (src/app) — tema escuro mobile-first
│   ├── site-principal  # landing + cadastro (escolha de papel)
│   ├── shell           # app interno (sidebar → header; menu hambúrguer no celular)
│   └── telas           # dashboard, propostas (combos+paginação+distância),
│                       # proposta-nova (WIZARD 5 passos + mapas), proposta-detalhe
│                       # (mapa + contas + aceite + entrega + avaliação), contas,
│                       # entregas, ranking, perfil
├── docker-compose.yml  # db + backend + frontend
├── smoke-test.ps1      # validação ponta a ponta (9 seções)
├── seed_simulacao.sql  # 80 propostas sintéticas p/ simulação
└── ESPECIFICACAO.md    # especificação técnica completa (v3.0)
```

## Fora de escopo (fase futura)

- Gateway de pagamento real (aprovação marca "pagamento liberado", cobrança fica para depois)
- Upload de arquivo (entrega por URL de vídeo hospedado)
- Chat/negociação por mensagens entre partes
- Google Geocoding com chave própria (precisão de prédio; hoje a cascata pública
  já entrega precisão de porta/quarteirão na maioria dos CEPs)
- Roteamento por estradas (OSRM) e ordenação de oportunidades por distância

## Referência completa

A especificação técnica detalhada (entidades, regras de negócio numeradas, cascata de
geocoding, API completa, migrações V1–V7, wizard passo a passo e critérios de aceite
validados) está em **ESPECIFICACAO.md** (v3.0).
