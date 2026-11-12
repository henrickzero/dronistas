package com.dronistas.security;

public class EstadoNaoAutenticadoException extends RuntimeException {
    public EstadoNaoAutenticadoException() { super("Sessão inválida ou ausente"); }
}
