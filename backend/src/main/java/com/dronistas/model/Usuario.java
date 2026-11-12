package com.dronistas.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public class Usuario {
    private UUID id;
    private String nome;
    private String email;
    private String senhaHash;
    private String papel; // ADMIN | DRONISTA | SOLICITANTE
    private boolean ativo;
    private OffsetDateTime dataCadastro;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getSenhaHash() { return senhaHash; }
    public void setSenhaHash(String senhaHash) { this.senhaHash = senhaHash; }
    public String getPapel() { return papel; }
    public void setPapel(String papel) { this.papel = papel; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public OffsetDateTime getDataCadastro() { return dataCadastro; }
    public void setDataCadastro(OffsetDateTime dataCadastro) { this.dataCadastro = dataCadastro; }
}
