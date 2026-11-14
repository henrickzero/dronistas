-- V11: vídeo da entrega por upload (S3) em vez de URL de hospedagem externa
ALTER TABLE entrega_video ADD COLUMN video_chave TEXT;          -- chave do objeto no S3
ALTER TABLE entrega_video ADD COLUMN video_tamanho BIGINT;      -- bytes enviados
ALTER TABLE entrega_video ADD COLUMN video_content_type VARCHAR(100);
