-- V12: documentos do dronista vira lista (N arquivos) — substitui os 2 slots fixos
CREATE TABLE dronista_documento (
    id            UUID PRIMARY KEY,
    dronista_id   UUID NOT NULL REFERENCES perfil_dronista(id) ON DELETE CASCADE,
    nome_original VARCHAR(300),
    url           TEXT NOT NULL,
    chave_s3      TEXT NOT NULL UNIQUE,
    tamanho       BIGINT,
    content_type  VARCHAR(100),
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_documento_dronista ON dronista_documento (dronista_id);
