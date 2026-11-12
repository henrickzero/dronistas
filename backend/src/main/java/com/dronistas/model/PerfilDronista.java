package com.dronistas.model;

import java.time.OffsetDateTime;
import java.util.UUID;

public class PerfilDronista {
    private UUID id;
    private UUID usuarioId;
    private String nome;
    private String telefone;
    private String bio;
    private String cnpjCpf;       // documento do profissional (CPF ou CNPJ)
    private String licencaAnac;
    private String estado;        // UF (2 letras)
    private String cidade;
    private String bairro;
    private String cep;           // 00000-000
    private Double lat;           // coordenadas da base de operação
    private Double lng;
    private Double notaMedia;     // média das notas 1-5 recebidas
    private int trabalhosConcluidos;
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
    public String getBio() { return bio; }
    public void setBio(String bio) { this.bio = bio; }
    public String getCnpjCpf() { return cnpjCpf; }
    public void setCnpjCpf(String cnpjCpf) { this.cnpjCpf = cnpjCpf; }
    public String getLicencaAnac() { return licencaAnac; }
    public void setLicencaAnac(String licencaAnac) { this.licencaAnac = licencaAnac; }
    public String getEstado() { return estado; }
    public void setEstado(String estado) { this.estado = estado; }
    public String getCidade() { return cidade; }
    public void setCidade(String cidade) { this.cidade = cidade; }
    public String getBairro() { return bairro; }
    public void setBairro(String bairro) { this.bairro = bairro; }
    public String getCep() { return cep; }
    public void setCep(String cep) { this.cep = cep; }
    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }
    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
    public Double getNotaMedia() { return notaMedia; }
    public void setNotaMedia(Double notaMedia) { this.notaMedia = notaMedia; }
    public int getTrabalhosConcluidos() { return trabalhosConcluidos; }
    public void setTrabalhosConcluidos(int obras) { this.trabalhosConcluidos = obras; }
    public boolean isAtivo() { return ativo; }
    public void setAtivo(boolean ativo) { this.ativo = ativo; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(OffsetDateTime criadoEm) { this.criadoEm = criadoEm; }
}
