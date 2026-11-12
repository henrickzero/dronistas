-- V3: coordenadas geográficas para cálculo de distância (Haversine)
ALTER TABLE proposta_voo ADD COLUMN lat DOUBLE PRECISION;
ALTER TABLE proposta_voo ADD COLUMN lng DOUBLE PRECISION;

ALTER TABLE perfil_dronista ADD COLUMN lat DOUBLE PRECISION;
ALTER TABLE perfil_dronista ADD COLUMN lng DOUBLE PRECISION;
