package com.dronistas.web;

import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.model.PerfilDronista;
import com.dronistas.security.RegraNegocioException;
import com.dronistas.security.Sessao;
import com.dronistas.service.PerfilService;
import com.dronistas.service.S3UploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Upload de documentos do dronista (RG/CNH) para o S3.
 * - POST /api/documentos/upload?slot=pos|vers  — 1 arquivo por chamada; o perfil guarda
 *   até 2 (frente/aberto + verso). Cada upload marca validacao_doc=ENVIADA.
 * - GET /api/documentos/url?slot=... — devolve URL pré-assinada (15 min) do arquivo
 *   do próprio dronista (bucket privado; nunca link fixo).
 */
@RestController
public class DocumentoController {

    private final S3UploadService s3;
    private final PerfilDronistaMapper dronistas;

    public DocumentoController(S3UploadService s3, PerfilDronistaMapper dronistas) {
        this.s3 = s3;
        this.dronistas = dronistas;
    }

    /** Status/URLs dos documentos do próprio dronista (presignadas a pedido do frontend). */
    @GetMapping("/api/documentos/me")
    public Map<String, Object> me() {
        Sessao s = Sessao.atual();
        PerfilDronista p = dronistas.buscarPorUsuario(s.getUsuarioId());
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil de dronista não encontrado");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("habilitado", s3.habilitado());
        out.put("validacaoDoc", p.getValidacaoDoc());
        out.put("pos", p.getDocumentoFotoUrl() != null);
        out.put("vers", p.getDocumentoVersoUrl() != null);
        return out;
    }

    /** Envia 1 arquivo (slot pos=documento aberto/frente; vers=verso). Até 2 arquivos por dronista. */
    @PostMapping("/api/documentos/upload")
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("arquivo") MultipartFile arquivo,
                                                      @RequestParam(defaultValue = "pos") String slot) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista() && !s.ehAdmin())
            throw new RegraNegocioException("PROIBIDO", "Upload de documento é exclusivo do dronista");
        String slotN = slot == null ? "pos" : slot.trim().toLowerCase();
        if (!slotN.equals("pos") && !slotN.equals("vers"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Slot inválido (use pos ou vers)");

        PerfilDronista p = dronistas.buscarPorUsuario(s.getUsuarioId());
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil de dronista não encontrado");

        String atual = "vers".equals(slotN) ? p.getDocumentoVersoUrl() : p.getDocumentoFotoUrl();
        if (atual != null && !atual.isBlank())
            // já tem arquivo nesse slot: substitui (exclui o antigo do S3 para não acumular)
            try { s3.excluir(chaveDa(atual)); } catch (Exception ignore) { /* best-effort */ }

        S3UploadService.UploadResultado r = s3.enviarDocumento(arquivo);

        // persiste no perfil (só o campo do slot; status -> ENVIADA)
        if ("vers".equals(slotN)) p.setDocumentoVersoUrl(r.url());
        else p.setDocumentoFotoUrl(r.url());
        p.setValidacaoDoc("ENVIADA");
        dronistas.atualizar(p);

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("slot", slotN);
        out.put("url", r.url());
        out.put("tamanho", r.tamanho());
        out.put("validacaoDoc", "ENVIADA");
        return ResponseEntity.status(HttpStatus.CREATED).body(out);
    }

    /** URL pré-assinada (15 min) para o próprio dronista conferir o arquivo enviado. */
    @GetMapping("/api/documentos/url")
    public Map<String, Object> url(@RequestParam(defaultValue = "pos") String slot) {
        Sessao s = Sessao.atual();
        PerfilDronista p = dronistas.buscarPorUsuario(s.getUsuarioId());
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil de dronista não encontrado");
        String url = "vers".equals(slot == null ? "pos" : slot.trim().toLowerCase())
                ? p.getDocumentoVersoUrl() : p.getDocumentoFotoUrl();
        if (url == null || url.isBlank())
            throw new RegraNegocioException("NAO_ENCONTRADO", "Nenhum arquivo enviado neste slot");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("urlPre", s3.urlPresignada(chaveDa(url)));
        out.put("validacaoDoc", p.getValidacaoDoc());
        return out;
    }

    /** Extrai a chave do objeto a partir da URL https://bucket.s3.region.amazonaws.com/<chave>. */
    private String chaveDa(String url) {
        int i = url.indexOf(".amazonaws.com/");
        if (i < 0) throw new RegraNegocioException("CAMPO_INVALIDO", "URL de documento inválida");
        return url.substring(i + ".amazonaws.com/".length());
    }
}
