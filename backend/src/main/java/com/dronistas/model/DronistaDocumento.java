package com.dronistas.model;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Arquivo de documento (RG/CNH etc.) enviado pelo dronista — N arquivos por perfil. */
public class DronistaDocumento {
    private UUID id;
    private UUID dronistaId;
    private String nomeOriginal;
    private String url;
    private String chaveS3;
    private Long tamanho;
    private String contentType;
    private OffsetDateTime criadoEm;

    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public UUID getDronistaId() { return dronistaId; }
    public void setDronistaId(UUID dronistaId) { this.dronistaId = dronistaId; }
    public String getNomeOriginal() { return nomeOriginal; }
    public void setNomeOriginal(String nomeOriginal) { this.nomeOriginal = nomeOriginal; }
    public String getUrl() { return url; }
    public void setUrl(String url) { this.url = url; }
    public String getChaveS3() { return chaveS3; }
    public void setChaveS3(String chaveS3) { this.chaveS3 = chaveS3; }
    public Long getTamanho() { return tamanho; }
    public void setTamanho(Long tamanho) { this.tamanho = tamanho; }
    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }
    public OffsetDateTime getCriadoEm() { return criadoEm; }
    public void setCriadoEm(OffsetDateTime criadoEm) { this.criadoEm = criadoEm; }
}
