-- Número do endereço do local do voo (alfanumérico, ex.: 123A, SN 45, LT 12 QD 3)
ALTER TABLE proposta_voo
    ADD COLUMN numero VARCHAR(10);