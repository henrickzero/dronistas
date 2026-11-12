-- CPF/CNPJ opcional do solicitante
ALTER TABLE perfil_solicitante
    ADD COLUMN cnpj_cpf VARCHAR(14);

CREATE UNIQUE INDEX IF NOT EXISTS idx_perfil_solicitante_cnpj_cpf
    ON perfil_solicitante (cnpj_cpf)
    WHERE cnpj_cpf IS NOT NULL AND ativo;
