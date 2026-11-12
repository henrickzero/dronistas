package com.dronistas.model;

import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Entrega do vídeo pelo DRONISTA.
 * Status: ENVIADA | APROVADA | REJEITADA
 * Aprovação = pagamento liberado + proposta CONCLUIDA.
 */
public class EntregaVideo {
    private UUID id;
    private UUID contaId;
    private String urlVideo;
    private String observacao;
    private String status;
    private OffsetDateTime criadoEm;

    // Avaliação do dronista pelo solicitante
    private Integer nota;
    private String comentario;

    // Avaliação do solicitante pelo dronista (ranking de solicitantes)
    private Integer notaSolicitante;
    private String comentarioSolicitante;

    // Campos de exibição (joins)
    private String tituloProposta;
    private String nomeDronista;
    private String nomeSolicitante;
    private String valorProposto;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getContaId() { return contaId; }
    public void setContaId(UUID contaId) { this.contaId = contaId; }
    public String getUrlVideo() { return urlVideo; }
    public void setUrlVideo(String urlVideo) { this.urlVideo = urlVideo; }
    public String getObservacao() { return observacao; }
    public void setObservacao(String observacao) { this.observacao = observacao; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(OffsetDateTime criadoEm) { this.criadoEm = criadoEm; }
    public Integer getNota() { return nota; }
    public void setNota(Integer nota) { this.nota = nota; }
    public String getComentario() { return comentario; }
    public void setComentario(String comentario) { this.comentario = comentario; }
    public Integer getNotaSolicitante() { return notaSolicitante; }
    public void setNotaSolicitante(Integer notaSolicitante) { this.notaSolicitante = notaSolicitante; }
    public String getComentarioSolicitante() { return comentarioSolicitante; }
    public void setComentarioSolicitante(String comentarioSolicitante) { this.comentarioSolicitante = comentarioSolicitante; }
    public String getTituloProposta() { return tituloProposta; }
    public void setTituloProposta(String tituloProposta) { this.tituloProposta = tituloProposta; }
    public String getNomeDronista() { return nomeDronista; }
    public void setNomeDronista(String nomeDronista) { this.nomeDronista = nomeDronista; }
    public String getNomeSolicitante() { return nomeSolicitante; }
    public void setNomeSolicitante(String nomeSolicitante) { this.nomeSolicitante = nomeSolicitante; }
    public String getValorProposto() { return valorProposto; }
    public void setValorProposto(String valorProposto) { this.valorProposto = valorProposto; }
}
