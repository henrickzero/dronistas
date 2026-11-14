package com.dronistas.web;

import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.model.PerfilDronista;
import com.dronistas.security.RegraNegocioException;
import com.dronistas.security.Sessao;
import com.dronistas.service.S3UploadService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Painel de validação de identidade (exclusivo ADMIN).
 * O dronista com cadastro pendente/em análise NÃO pode aceitar voos —
 * libera ou rejeita a partir daqui, visualizando os documentos com URL pré-assinada.
 */
@RestController
public class AdminValidacaoController {

    private final PerfilDronistaMapper dronistas;
    private final S3UploadService s3;

    public AdminValidacaoController(PerfilDronistaMapper dronistas, S3UploadService s3) {
        this.dronistas = dronistas;
        this.s3 = s3;
    }

    private void exigirAdmin() {
        if (!Sessao.atual().ehAdmin())
            throw new RegraNegocioException("PROIBIDO", "Operação exclusiva do administrador");
    }

    private String presSignOuVazio(String url) {
        if (url == null || url.isBlank()) return null;
        try { return s3.urlPresignada(S3UploadService.chaveDeUrl(url)); }
        catch (Exception e) { return null; }
    }

    @GetMapping("/api/admin/validacoes")
    public List<Map<String, Object>> fila(@RequestParam(defaultValue = "ENVIADA") String status) {
        exigirAdmin();
        String st = status == null ? "" : status.trim().toUpperCase();
        if (!st.equals("ENVIADA") && !st.equals("PENDENTE") && !st.equals("APROVADA") && !st.equals("REJEITADA"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Status inválido");
        return dronistas.listarPorValidacao(st).stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("perfilId", p.getId().toString());
            m.put("nome", p.getNome());
            m.put("cnpjCpf", p.getCnpjCpf());
            m.put("telefone", p.getTelefone());
            m.put("cidade", p.getCidade());
            m.put("estado", p.getEstado());
            m.put("validacaoDoc", p.getValidacaoDoc());
            m.put("temFrente", p.getDocumentoFotoUrl() != null);
            m.put("temVerso", p.getDocumentoVersoUrl() != null);
            return m;
        }).toList();
    }

    /** URLs pré-assinadas (15 min) para o admin visualizar os documentos do dronista. */
    @GetMapping("/api/admin/validacoes/{perfilId}/documentos")
    public Map<String, Object> documentos(@PathVariable java.util.UUID perfilId) {
        exigirAdmin();
        PerfilDronista p = dronistas.buscarPorId(perfilId);
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil não encontrado");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nome", p.getNome());
        out.put("cnpjCpf", p.getCnpjCpf());
        out.put("frente", presSignOuVazio(p.getDocumentoFotoUrl()));
        out.put("verso", presSignOuVazio(p.getDocumentoVersoUrl()));
        out.put("validacaoDoc", p.getValidacaoDoc());
        return out;
    }

    /** Aprova → o dronista volta a poder aceitar voos. */
    @PostMapping("/api/admin/validacoes/{perfilId}/aprovar")
    public ResponseEntity<Void> aprovar(@PathVariable java.util.UUID perfilId) {
        exigirAdmin();
        PerfilDronista p = dronistas.buscarPorId(perfilId);
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil não encontrado");
        p.setValidacaoDoc("APROVADA");
        dronistas.atualizar(p);
        return ResponseEntity.ok().build();
    }

    /** Rejeita → dronista continua impedido de aceitar até reapresentar os documentos. */
    @PostMapping("/api/admin/validacoes/{perfilId}/rejeitar")
    public ResponseEntity<Void> rejeitar(@PathVariable java.util.UUID perfilId) {
        exigirAdmin();
        PerfilDronista p = dronistas.buscarPorId(perfilId);
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil não encontrado");
        p.setValidacaoDoc("REJEITADA");
        dronistas.atualizar(p);
        return ResponseEntity.ok().build();
    }
}
