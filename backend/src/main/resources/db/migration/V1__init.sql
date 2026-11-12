-- V1: Dronistas — usuarios e perfis
CREATE TABLE usuario (
    id            UUID PRIMARY KEY,
    nome          VARCHAR(200) NOT NULL,
    email         VARCHAR(200) NOT NULL,
    senha_hash    TEXT         NOT NULL,
    papel         VARCHAR(20)  NOT NULL, -- ADMIN | DRONISTA | SOLICITANTE
    ativo         BOOLEAN      NOT NULL DEFAULT TRUE,
    data_cadastro TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_usuario_email ON usuario (lower(email));

-- Perfil do profissional dono de drone
CREATE TABLE perfil_dronista (
    id                   UUID PRIMARY KEY,
    usuario_id           UUID NOT NULL UNIQUE REFERENCES usuario(id),
    nome                 VARCHAR(200) NOT NULL,
    telefone             VARCHAR(20),
    bio                  TEXT,
    cnpj_cpf             VARCHAR(14) NOT NULL,
    licenca_anac         VARCHAR(30),
    nota_media           NUMERIC(3,2),
    trabalhos_concluidos INT NOT NULL DEFAULT 0,
    ativo                BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em            TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Perfil de quem solicita serviço de drone
CREATE TABLE perfil_solicitante (
    id           UUID PRIMARY KEY,
    usuario_id   UUID NOT NULL UNIQUE REFERENCES usuario(id),
    nome         VARCHAR(200) NOT NULL,
    telefone     VARCHAR(20),
    empresa      VARCHAR(200),
    nota_media   NUMERIC(3,2),
    contratacoes INT NOT NULL DEFAULT 0,
    ativo        BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Proposta de voo criada pelo solicitante
CREATE TABLE proposta_voo (
    id               UUID PRIMARY KEY,
    solicitante_id   UUID NOT NULL REFERENCES perfil_solicitante(id),
    titulo           VARCHAR(200) NOT NULL,
    descricao        TEXT,
    local            VARCHAR(300),
    data_voo         DATE NOT NULL,
    hora_voo         TIME NOT NULL,
    duracao_min      INT NOT NULL CHECK (duracao_min > 0),
    qualidade_video  VARCHAR(20) NOT NULL, -- FULLHD | 2K | 4K_30FPS | 4K_60FPS | 4K_120FPS
    fps              INT,
    formato_video    VARCHAR(10) NOT NULL, -- MP4 | MOV | LOG | RAW | PRORES
    valor_oferecido  NUMERIC(12,2) NOT NULL CHECK (valor_oferecido > 0),
    status           VARCHAR(12) NOT NULL DEFAULT 'ABERTA', -- ABERTA | ACEITA | CONCLUIDA | CANCELADA
    dronista_id      UUID REFERENCES perfil_dronista(id),
    conta_aceita_id  UUID,
    criado_em        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_proposta_status ON proposta_voo (status);
CREATE INDEX idx_proposta_solicitante ON proposta_voo (solicitante_id);

-- Conta-proposta enviada pelo dronista em resposta a uma proposta
CREATE TABLE conta_proposta (
    id             UUID PRIMARY KEY,
    proposta_id    UUID NOT NULL REFERENCES proposta_voo(id),
    dronista_id    UUID NOT NULL REFERENCES perfil_dronista(id),
    valor_proposto NUMERIC(12,2) NOT NULL CHECK (valor_proposto > 0),
    mensagem       TEXT,
    status         VARCHAR(10) NOT NULL DEFAULT 'ENVIADA', -- ENVIADA | ACEITA | RECUSADA
    criado_em      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conta_proposta ON conta_proposta (proposta_id);
CREATE INDEX idx_conta_dronista ON conta_proposta (dronista_id);

-- Entrega do vídeo pelo dronista; aprovação libera o pagamento
CREATE TABLE entrega_video (
    id                     UUID PRIMARY KEY,
    conta_id               UUID NOT NULL REFERENCES conta_proposta(id),
    url_video              TEXT NOT NULL,
    observacao             TEXT,
    status                 VARCHAR(10) NOT NULL DEFAULT 'ENVIADA', -- ENVIADA | APROVADA | REJEITADA
    nota                   INT CHECK (nota BETWEEN 1 AND 5),       -- solicitante -> dronista
    comentario             TEXT,
    nota_solicitante       INT CHECK (nota_solicitante BETWEEN 1 AND 5), -- dronista -> solicitante
    comentario_solicitante TEXT,
    criado_em              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_entrega_conta ON entrega_video (conta_id);
-- Admin da plataforma é criado no arranque pelo AdminSeeder (hash BCrypt real de "admin123").
