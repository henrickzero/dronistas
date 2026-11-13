-- V8: dados de repasse (Pix/banco) e validação de identidade do dronista
ALTER TABLE perfil_dronista ADD COLUMN pix_tipo VARCHAR(20);        -- CPF | CNPJ | EMAIL | TELEFONE | ALEATORIA
ALTER TABLE perfil_dronista ADD COLUMN pix_chave VARCHAR(140);
ALTER TABLE perfil_dronista ADD COLUMN banco VARCHAR(120);
ALTER TABLE perfil_dronista ADD COLUMN agencia VARCHAR(20);
ALTER TABLE perfil_dronista ADD COLUMN conta VARCHAR(25);
ALTER TABLE perfil_dronista ADD COLUMN tipo_conta VARCHAR(20);      -- CORRENTE | POUPANCA
ALTER TABLE perfil_dronista ADD COLUMN documento_foto_url TEXT;
ALTER TABLE perfil_dronista ADD COLUMN validacao_doc VARCHAR(15) NOT NULL DEFAULT 'PENDENTE'; -- PENDENTE | ENVIADA | APROVADA | REJEITADA
