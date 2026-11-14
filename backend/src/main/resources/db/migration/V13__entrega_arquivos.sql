-- V13: arquivos de vídeo da entrega viram lista (N arquivos)
CREATE TABLE entrega_video_arquivo (
    id            UUID PRIMARY KEY,
    entrega_id    UUID NOT NULL REFERENCES entrega_video(id) ON DELETE CASCADE,
    nome_original VARCHAR(300),
    url           TEXT NOT NULL,
    chave_s3      TEXT NOT NULL UNIQUE,
    tamanho       BIGINT,
    content_type  VARCHAR(100),
    ordem         INT NOT NULL DEFAULT 0,
    criado_em     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_video_arquivo_entrega ON entrega_video_arquivo (entrega_id);
