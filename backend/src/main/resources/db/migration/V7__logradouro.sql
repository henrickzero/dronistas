-- V7: logradouro (rua/avenida) da proposta de voo — preenchido no formulário (ou pelo lookup do CEP)
ALTER TABLE proposta_voo ADD COLUMN logradouro VARCHAR(300);
