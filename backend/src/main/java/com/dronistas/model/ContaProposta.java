package com.dronistas.model;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Conta-proposta enviada pelo DRONISTA em resposta a uma proposta de voo.
 * Status: ENVIADA | ACEITA | RECUSADA
 */
public class ContaProposta {
    private UUID id;
    private UUID propostaId;
    private UUID dronistaId;
    private BigDecimal valorProposto;
    private String mensagem;
    private String status;
    private OffsetDateTime criadoEm;

    // Campos de exibição (joins)
    private String nomeDronista;
    private Double notaDronista;
    private String licencaAnacDronista;
    private String cidadeDronista;
    private String estadoDronista;
    private String tituloProposta;
    private String statusProposta;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getPropostaId() { return propostaId; }
    public void setPropostaId(UUID propostaId) { this.propostaId = propostaId; }
    public UUID getDronistaId() { return dronistaId; }
    public void setDronistaId(UUID dronistaId) { this.dronistaId = dronistaId; }
    public BigDecimal getValorProposto() { return valorProposto; }
    public void setValorProposto(BigDecimal valorProposto) { this.valorProposto = valorProposto; }
    public String getMensagem() { return mensagem; }
    public void setMensagem(String mensagem) { this.mensagem = mensagem; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(OffsetDateTime criadoEm) { this.criadoEm = criadoEm; }
    public String getNomeDronista() { return nomeDronista; }
    public void setNomeDronista(String nomeDronista) { this.nomeDronista = nomeDronista; }
    public Double getNotaDronista() { return notaDronista; }
    public void setNotaDronista(Double notaDronista) { this.notaDronista = notaDronista; }
    public String getLicencaAnacDronista() { return licencaAnacDronista; }
    public void setLicencaAnacDronista(String licencaAnacDronista) { this.licencaAnacDronista = licencaAnacDronista; }
    public String getCidadeDronista() { return cidadeDronista; }
    public void setCidadeDronista(String cidadeDronista) { this.cidadeDronista = cidadeDronista; }
    public String getEstadoDronista() { return estadoDronista; }
    public void setEstadoDronista(String estadoDronista) { this.estadoDronista = estadoDronista; }
    public String getTituloProposta() { return tituloProposta; }
    public void setTituloProposta(String tituloProposta) { this.tituloProposta = tituloProposta; }
    public String getStatusProposta() { return statusProposta; }
    public void setStatusProposta(String statusProposta) { this.statusProposta = statusProposta; }
}
