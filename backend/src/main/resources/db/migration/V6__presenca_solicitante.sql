-- Presença do solicitante no local do voo.
-- TRUE = solicitante estará presente; FALSE/NULL = dronista realiza o voo no horário sem presença.
ALTER TABLE proposta_voo
    ADD COLUMN solicitante_presente BOOLEAN NOT NULL DEFAULT TRUE;
