package com.dronistas.security;

/** Exceção de regra de negócio com código mapeado para status HTTP no ApiExceptionHandler. */
public class RegraNegocioException extends RuntimeException {
    private final String codigo;
    public RegraNegocioException(String codigo, String mensagem) {
        super(mensagem);
        this.codigo = codigo;
    }
    public String getCodigo() { return codigo; }
}
