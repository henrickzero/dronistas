package com.dronistas.security;

import org.springframework.stereotype.Component;
import java.util.InputMismatchException;

/**
 * Validação de documentos:
 * - CPF: 11 dígitos numéricos.
 * - CNPJ: padrão alfanumérico vigente (12 caracteres alfanuméricos + 2 dígitos verificadores
 *   numéricos). Letras valem pelo Character.getNumericValue (A=10 ... Z=35), como na Receita.
 */
@Component
public class DocumentoValidator {

    public boolean isValido(String documento) {
        if (documento == null) return false;
        String d = normalizar(documento);
        if (d.length() == 11) return validaCpf(d);
        if (d.length() == 14) return validaCnpj(d);
        return false;
    }

    /** Remove máscara e normaliza: mantém A-Z e 0-9 (letras maiúsculas). */
    public static String normalizar(String documento) {
        if (documento == null) return "";
        return documento.toUpperCase().replaceAll("[^A-Z0-9]", "");
    }

    private static int valorCnpj(char c) {
        return Character.getNumericValue(c);
    }

    private boolean validaCpf(String cpf) {
        if (!cpf.matches("\\d{11}") || cpf.matches("(\\d)\\1{10}")) return false;
        try {
            int soma = 0, peso = 10;
            for (int i = 0; i < 9; i++) soma += (cpf.charAt(i) - '0') * peso--;
            int d1 = 11 - (soma % 11);
            if (d1 >= 10) d1 = 0;
            if (d1 != cpf.charAt(9) - '0') return false;
            soma = 0; peso = 11;
            for (int i = 0; i < 10; i++) soma += (cpf.charAt(i) - '0') * peso--;
            int d2 = 11 - (soma % 11);
            if (d2 >= 10) d2 = 0;
            return d2 == cpf.charAt(10) - '0';
        } catch (InputMismatchException e) {
            return false;
        }
    }

    private boolean validaCnpj(String cnpj) {
        // Dígitos verificadores (2 últimas posições) continuam exclusivamente numéricos
        if (!cnpj.substring(12).matches("\\d{2}")) return false;
        if (cnpj.matches("(.)\\1{13}")) return false;

        int[] pesos1 = {5,4,3,2,9,8,7,6,5,4,3,2};
        int[] pesos2 = {6,5,4,3,2,9,8,7,6,5,4,3,2};
        try {
            int soma = 0;
            for (int i = 0; i < 12; i++) soma += valorCnpj(cnpj.charAt(i)) * pesos1[i];
            int d1 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
            if (d1 != cnpj.charAt(12) - '0') return false;
            soma = 0;
            for (int i = 0; i < 13; i++) soma += valorCnpj(cnpj.charAt(i)) * pesos2[i];
            int d2 = soma % 11 < 2 ? 0 : 11 - (soma % 11);
            return d2 == cnpj.charAt(13) - '0';
        } catch (InputMismatchException e) {
            return false;
        }
    }
}
