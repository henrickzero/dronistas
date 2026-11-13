package com.dronistas.service;

import com.dronistas.security.RegraNegocioException;
import java.util.List;

/**
 * Regras de repasse do dronista (Pix/banco) — usadas no cadastro e no perfil.
 * Trava de segurança central (evita transferências estornadas pelos gateways):
 * a chave Pix do tipo CPF/CNPJ DEVE ser o mesmo documento cadastrado.
 * "SN"-like ou vazio no número jamais validado.
 */
public final class RepasseValidator {

    private RepasseValidator() {}

    public static final String DOC_MISMATCH =
            "A Chave Pix do tipo CPF/CNPJ deve ser o MESMO documento cadastrado acima. "
            + "Repasse só pode ir para uma conta do mesmo titular.";

    /** Valida o par tipo+chave Pix contra o documento do dronista (normalizado, sem máscara). */
    public static void validarPix(String pixTipo, String pixChave, String docNormalizado) {
        if ((pixTipo == null || pixTipo.isBlank()) && (pixChave == null || pixChave.isBlank())) return;
        String tipo = pixTipo == null ? "" : pixTipo.trim().toUpperCase();
        if (!List.of("CPF", "CNPJ", "EMAIL", "TELEFONE", "ALEATORIA").contains(tipo))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Tipo de chave Pix inválido");
        String chave = pixChave == null ? "" : pixChave.trim();
        if (chave.isEmpty())
            throw new RegraNegocioException("CAMPO_OBRIGATORIO", "Informe a chave Pix");
        if (chave.length() > 77)
            throw new RegraNegocioException("CAMPO_INVALIDO", "Chave Pix muito longa");

        switch (tipo) {
            case "CPF" -> {
                String k = chave.replaceAll("\\D", "");
                if (k.length() != 11 || !k.equals(docNormalizado))
                    throw new RegraNegocioException("CAMPO_INVALIDO", DOC_MISMATCH);
            }
            case "CNPJ" -> {
                String k = chave.toUpperCase().replaceAll("[^A-Z0-9]", "");
                if (k.length() != 14 || !k.equals(docNormalizado))
                    throw new RegraNegocioException("CAMPO_INVALIDO", DOC_MISMATCH);
            }
            case "EMAIL" -> {
                if (!chave.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
                    throw new RegraNegocioException("CAMPO_INVALIDO", "Chave Pix de e-mail inválida");
            }
            case "TELEFONE" -> {
                String k = chave.replaceAll("\\D", "");
                if (k.length() < 10 || k.length() > 11)
                    throw new RegraNegocioException("CAMPO_INVALIDO", "Chave Pix de telefone inválida (10–11 dígitos)");
            }
            // ALEATORIA: alfanumérica até 77 — validada só no limite acima
        }
    }

    /** Valida os dados bancários quando preenchidos (banco obrigatório junto de conta). */
    public static void validarBanco(String banco, String agencia, String conta, String tipoConta) {
        boolean algum = notBlank(banco) || notBlank(agencia) || notBlank(conta);
        if (!algum) return;
        if (!notBlank(banco) || !notBlank(conta))
            throw new RegraNegocioException("CAMPO_OBRIGATORIO",
                    "Para repasse por banco, informe pelo menos o Banco e a Conta");
        if (tipoConta != null && !tipoConta.isBlank()) {
            String t = tipoConta.trim().toUpperCase();
            if (!t.equals("CORRENTE") && !t.equals("POUPANCA"))
                throw new RegraNegocioException("CAMPO_INVALIDO", "Tipo de conta deve ser CORRENTE ou POUPANCA");
        }
    }

    private static boolean notBlank(String s) { return s != null && !s.isBlank(); }
}
