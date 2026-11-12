-- V2: localizacao (estado, cidade, bairro, CEP) — proposta de voo e perfil do dronista
ALTER TABLE proposta_voo ADD COLUMN estado VARCHAR(2);
ALTER TABLE proposta_voo ADD COLUMN cidade VARCHAR(120);
ALTER TABLE proposta_voo ADD COLUMN bairro VARCHAR(120);
ALTER TABLE proposta_voo ADD COLUMN cep VARCHAR(9);
CREATE INDEX idx_proposta_uf_cidade ON proposta_voo (estado, lower(cidade));

ALTER TABLE perfil_dronista ADD COLUMN estado VARCHAR(2);
ALTER TABLE perfil_dronista ADD COLUMN cidade VARCHAR(120);
ALTER TABLE perfil_dronista ADD COLUMN bairro VARCHAR(120);
ALTER TABLE perfil_dronista ADD COLUMN cep VARCHAR(9);
