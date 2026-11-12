# Dronistas — Portal de Serviços com Drones

Marketplace que conecta **dronistas profissionais** (donos de drone) a **solicitantes**
(pessoas/empresas que precisam de um voo filmado). Feito para funcionar muito bem pelo celular.

## Como funciona

1. **Solicitante** publica a **proposta de voo**: data, hora, duração, qualidade do vídeo
   (Full HD, 2K, 4K 30/60/120 fps), formato (MP4, MOV, LOG, RAW, ProRes), **valor oferecido**
   e **localização** (estado via select, CEP com preenchimento automático ViaCEP, cidade, bairro).
2. **Dronistas** navegam as oportunidades abertas — lista compacta, **filtrável por estado,
   cidade e qualidade, paginada**, e com a **distância da base do dronista até o local do voo**
   ("~46,7 km de você", calculada por coordenadas resolvidas via BrasilAPI/Nominatim + Haversine).
3. O dronista fecha o trabalho de dois jeitos:
   - **Aceite direto ("de cara")** no valor ofertado — acordo imediato; ou
   - **Conta-proposta** (preço + mensagem) — uma por dronista, atualizável enquanto aguarda.
4. No caminho da conta-proposta, o solicitante **aprova a melhor**; as demais são recusadas
   automaticamente. No aceite direto, o dronista é contratado no valor do anúncio na hora.
5. O dronista contratado **grava e entrega o vídeo** (URL: YouTube, Drive, Vimeo...);
   o solicitante **aprova ou recusa** a entrega. Aprovada → **pagamento liberado** e
   trabalho concluído.
6. Ambos se **avaliam em estrelas** (1–5); o portal mantém o **ranking de dronistas e
   de solicitantes** (com cidade/UF das bases).

## Stack

- **Backend:** Java 17 + Spring Boot 3.3, MyBatis, Spring Security (JWT), Flyway
- **Banco:** PostgreSQL 16 (imagem `pgvector/pgvector:pg16`, volume próprio)
- **Frontend:** Angular 18 standalone, design system mobile-first (sidebar → header sticky no celular)
- **Execução:** Docker Compose (db + backend :8080 + frontend/nginx :8081)

## Como rodar

```powershell
docker compose up -d --build
```

- Aplicação: **http://localhost:8081**
- API direta: http://localhost:8080/api/...

Primeiro acesso: crie sua conta na home — escolha **"Preciso de um drone"** (solicitante)
ou **"Sou dronista"**. O admin da plataforma usa `admin@dronistas.com` / `admin123`
(trocar em produção via env `JWT_SECRET` + seed).

> Recriar o banco do zero: `docker compose down -v && docker compose up -d --build`

## API principal

| Método | Rota | Papel | Descrição |
|---|---|---|---|
| POST | /api/auth/registrar | público | cria conta (dronista ou solicitante) + token |
| POST | /api/auth/login | público | token |
| GET/PUT | /api/perfil/me | ambos | perfil do logado (nota, trabalhos, edição) |
| POST | /api/propostas | solicitante | publica proposta de voo (com UF/CEP/cidade/bairro) |
| GET | /api/propostas/minhas | solicitante | propostas do solicitante |
| GET | /api/propostas/abertas?estado=&cidade=&page= | ambos | marketplace paginado (10/página) com filtro por estado/cidade; traz `distanciaKm` para o dronista |
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
| GET | /api/ranking/dronistas · /solicitantes | ambos | ranking por nota e volume (com cidade/UF do dronista) |

Erros: `{ "codigo", "mensagem" }` — 409 duplicado, 422 validação, 404 não encontrado,
403 sem permissão, 401 credenciais.

## Estrutura

```
dronistas/
├── backend/            # Spring Boot (com.dronistas)
│   └── src/main/java/com/dronistas/
│       ├── config/     # UuidTypeHandler (MyBatis ↔ Postgres UUID)
│       ├── mapper/     # MyBatis annotations
│       ├── model/      # Usuario, perfis, PropostaVoo, ContaProposta, EntregaVideo
│       ├── security/   # JWT, Sessão, DocumentoValidator (CPF/CNPJ alfanumérico)
│       ├── service/    # regras de negócio (estado da proposta/entrega)
│       └── web/        # controllers REST + handler de erros
│   └── resources/db/migration/V1__init.sql
├── frontend/           # Angular 18 (src/app)
│   ├── site-principal  # landing + cadastro (escolha de papel)
│   ├── shell           # app interno (sidebar → header mobile)
│   └── telas           # dashboard, propostas, detalhe, contas, entregas, ranking, perfil
├── docker-compose.yml  # db + backend + frontend
└── ESPECIFICACAO.md    # especificação completa (v2.0)
```

## Fora de escopo (fase futura)

- Gateway de pagamento real (aprovação marca "pagamento liberado", cobrança fica para depois)
- Upload de arquivo (entrega por URL de vídeo hospedado)
- Chat/negociação por mensagens entre partes
- Geocoding por rua/roteamento (OSRM) e ordenação de oportunidades por distância
- Geolocalização precisa no mapa (hoje: CEP/cidade → coordenadas aproximadas)

## Referência completa

A especificação técnica detalhada (entidades, regras de negócio numeradas, API completa,
migrações V1–V3 e critérios de aceite validados) está em **ESPECIFICACAO.md** (v2.1).
