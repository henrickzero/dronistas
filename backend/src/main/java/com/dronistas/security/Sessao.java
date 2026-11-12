package com.dronistas.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.UUID;

/** Identidade da requisição: usuário autenticado + papel (DRONISTA | SOLICITANTE | ADMIN). */
public class Sessao {
    private final UUID usuarioId;
    private final String papel;
    private final String via; // API

    public Sessao(UUID usuarioId, String papel, String via) {
        this.usuarioId = usuarioId;
        this.papel = papel;
        this.via = via;
    }

    public UUID getUsuarioId() { return usuarioId; }
    public String getPapel() { return papel; }
    public String getVia() { return via; }

    public static Sessao atual() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        if (a != null && a.getPrincipal() instanceof Sessao s) return s;
        throw new EstadoNaoAutenticadoException();
    }

    public boolean ehAdmin() { return "ADMIN".equals(papel); }
    public boolean ehDronista() { return "DRONISTA".equals(papel); }
    public boolean ehSolicitante() { return "SOLICITANTE".equals(papel); }
}
