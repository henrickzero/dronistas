-- V14: rascunho de arquivos da entrega (drone anexa N, entrega finaliza)
CREATE TABLE entrega_rascunho_arquivo (
    id            UUID PRIMARY KEY,
    conta_id      UUID NOT NULL REFERENCES conta_proposta(id) ON DELETE CASCADE,
    dronista_id   UUID NOT NULL REFERENCES perfil_dronista(id),
    nome_original VARCHAR(300),
    url           TEXT NOT NULL,
    chave_s3      TEXT NOT NULL UNIQUE,
    tamanho       BIGINT,
    content_type  VARCHAR(100),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rascunho_conta ON entrega_rascunho_arquivo (conta_id);
