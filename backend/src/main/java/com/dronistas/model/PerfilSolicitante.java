package com.dronistas.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public class PerfilSolicitante {
    private UUID id;
    private UUID usuarioId;
    private String nome;
    private String telefone;
    private String empresa;
    private Double notaMedia;     // média das notas 1-5 dadas pelos dronistas
    private int contratacoes;     // entregas aprovadas
    private boolean ativo;
    private OffsetDateTime criadoEm;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getUsuarioId() { return usuarioId; }
    public void setUsuarioId(UUID usuarioId) { this.usuarioId = usuarioId; }
    public String getNome() { return nome; }
    public void setNome(String nome) { this.nome = nome; }
    public String getTelefone() { return telefone; }
    public void setTelefone(String telefone) { this.telefone = telefone; }
    public String getEmpresa() { return empresa; }
    public void setEmpresa(String empresa) { this.empresa = empresa; }
    public Double getNotaMedia() { return notaMedia; }
    public void setNotaMedia(Double notaMedia) { this.notaMedia = notaMedia; }
    public int getContratacoes() { return contratacoes; }
    public void setContratacoes(int contratacoes) { this.contratacoes = contratacoes; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(OffsetDateTime criadoEm) { this.criadoEm = criadoEm; }
}
