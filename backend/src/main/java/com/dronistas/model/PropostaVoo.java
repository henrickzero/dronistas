package com.dronistas.model;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.math.BigDecimal;
import java.util.UUID;

/**
 * Proposta de voo criada pelo SOLICITANTE.
 * Status: ABERTA | ACEITA | CONCLUIDA | CANCELADA
 */
public class PropostaVoo {
    private UUID id;
    private UUID solicitanteId;     // FK perfil_solicitante
    private String titulo;
    private String descricao;
    private String local;
    private LocalDate dataVoo;
    private LocalTime horaVoo;
    private int duracaoMin;
    private String qualidadeVideo;  // FULLHD | 2K | 4K_30FPS | 4K_60FPS | 4K_120FPS
    private Integer fps;            // opcional p/ FULLHD/2K: 30|60|120
    private String formatoVideo;    // MP4 | MOV | LOG | RAW | PRORES
    private BigDecimal valorOferecido;
    private String estado;          // UF (2 letras)
    private String cidade;
    private String bairro;
    private String cep;             // 00000-000
    private Double lat;             // coordenadas para distância (geocoding opcional)
    private Double lng;
    private Double distanciaKm;     // preenchido no marketplace para o dronista logado
    private String status;
    private UUID dronistaId;        // FK perfil_dronista (quando ACEITA/CONCLUIDA)
    private UUID contaAceitaId;     // FK conta_proposta
    private OffsetDateTime criadoEm;

    // Campos de exibição (join)
    private String nomeSolicitante;
    private String nomeDronista;
    private long totalContas;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getSolicitanteId() { return solicitanteId; }
    public void setSolicitanteId(UUID solicitanteId) { this.solicitanteId = solicitanteId; }
    public String getTitulo() { return titulo; }
    public void setTitulo(String titulo) { this.titulo = titulo; }
    public String getDescricao() { return descricao; }
    public void setDescricao(String descricao) { this.descricao = descricao; }
    public String getLocal() { return local; }
    public void setLocal(String local) { this.local = local; }
    public LocalDate getDataVoo() { return dataVoo; }
    public void setDataVoo(LocalDate dataVoo) { this.dataVoo = dataVoo; }
    public LocalTime getHoraVoo() { return horaVoo; }
    public void setHoraVoo(LocalTime horaVoo) { this.horaVoo = horaVoo; }
    public int getDuracaoMin() { return duracaoMin; }
    public void setDuracaoMin(int duracaoMin) { this.duracaoMin = duracaoMin; }
    public String getQualidadeVideo() { return qualidadeVideo; }
    public void setQualidadeVideo(String qualidadeVideo) { this.qualidadeVideo = qualidadeVideo; }
    public Integer getFps() { return fps; }
    public void setFps(Integer fps) { this.fps = fps; }
    public String getFormatoVideo() { return formatoVideo; }
    public void setFormatoVideo(String formatoVideo) { this.formatoVideo = formatoVideo; }
    public BigDecimal getValorOferecido() { return valorOferecido; }
    public void setValorOferecido(BigDecimal valorOferecido) { this.valorOferecido = valorOferecido; }
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
    public Double getDistanciaKm() { return distanciaKm; }
    public void setDistanciaKm(Double distanciaKm) { this.distanciaKm = distanciaKm; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public UUID getDronistaId() { return dronistaId; }
    public void setDronistaId(UUID dronistaId) { this.dronistaId = dronistaId; }
    public UUID getContaAceitaId() { return contaAceitaId; }
    public void setContaAceitaId(UUID contaAceitaId) { this.contaAceitaId = contaAceitaId; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(OffsetDateTime criadoEm) { this.criadoEm = criadoEm; }
    public String getNomeSolicitante() { return nomeSolicitante; }
    public void setNomeSolicitante(String nomeSolicitante) { this.nomeSolicitante = nomeSolicitante; }
    public String getNomeDronista() { return nomeDronista; }
    public void setNomeDronista(String nomeDronista) { this.nomeDronista = nomeDronista; }
    public long getTotalContas() { return totalContas; }
    public void setTotalContas(long totalContas) { this.totalContas = totalContas; }
}
