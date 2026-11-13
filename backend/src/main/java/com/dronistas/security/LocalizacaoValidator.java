package com.dronistas.security;

/** Validação/normalização de localização: UF (2 letras) e CEP (00000-000), ambos opcionais. */
public final class LocalizacaoValidator {

    private LocalizacaoValidator() {}

    /** UF em 2 letras maiúsculas; vazio = null; inválido = 422. */
    public static String estado(String v) {
        if (v == null) return null;
        String t = v.trim().toUpperCase();
        if (t.isEmpty()) return null;
        if (!t.matches("[A-Z]{2}"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Estado deve ser a UF com 2 letras (ex.: SP, MG)");
        return t;
    }

    /** CEP 8 dígitos normalizado 00000-000; vazio = null; inválido = 422. */
    public static String cep(String v) {
        if (v == null) return null;
        String d = v.replaceAll("\\D", "");
        if (d.isEmpty()) return null;
        if (d.length() != 8)
            throw new RegraNegocioException("CAMPO_INVALIDO", "CEP inválido — deve ter 8 dígitos");
        return d.substring(0, 5) + "-" + d.substring(5);
    }

    /** Texto opcional (cidade/bairro) com limite; vazio = null; inválido = 422. */
    public static String texto(String v, String rotulo, int max) {
        if (v == null) return null;
        String t = v.trim();
        if (t.isEmpty()) return null;
        if (t.length() > max)
            throw new RegraNegocioException("CAMPO_INVALIDO", rotulo + " excede " + max + " caracteres");
        return t;
    }

    /** Nmero do endereo: alfanumrico (ex.: 123A, SN, LT 12 QD 3), at 10 caracteres; vazio = null. */
    public static String numeroEndereco(String v) {
        if (v == null) return null;
        String t = v.trim().toUpperCase();
        if (t.isEmpty()) return null;
        if (t.length() > 10 || !t.matches("[A-Z0-9][A-Z0-9 \\/\\-]*"))
            throw new RegraNegocioException("CAMPO_INVALIDO",
                "Nmero do endereo invlido — use at 10 caracteres alfanumricos (ex.: 123A)");
        return t;
    }
}
