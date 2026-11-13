-- V9: logradouro e numero da base de operação do dronista (endereço completo, como na proposta)
ALTER TABLE perfil_dronista ADD COLUMN logradouro VARCHAR(300);
ALTER TABLE perfil_dronista ADD COLUMN numero VARCHAR(10);
