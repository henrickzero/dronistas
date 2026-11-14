package com.dronistas.web;

import com.dronistas.mapper.DronistaDocumentoMapper;
import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.model.DronistaDocumento;
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
 * libera ou rejeita a partir daqui, visualizando os documentos
 * SEMPRE pelo backend autenticado (streaming; nada de link S3).
 */
@RestController
public class AdminValidacaoController {

    private final PerfilDronistaMapper dronistas;
    private final DronistaDocumentoMapper documentos;
    private final S3UploadService s3;

    public AdminValidacaoController(PerfilDronistaMapper dronistas, DronistaDocumentoMapper documentos,
                                    S3UploadService s3) {
        this.dronistas = dronistas;
        this.documentos = documentos;
        this.s3 = s3;
    }

    private void exigirAdmin() {
        if (!Sessao.atual().ehAdmin())
            throw new RegraNegocioException("PROIBIDO", "Operação exclusiva do administrador");
    }

    @GetMapping("/api/admin/validacoes")
    public List<Map<String, Object>> fila(@RequestParam(defaultValue = "ENVIADA") String status) {
        exigirAdmin();
        String st = status == null ? "" : status.trim().toUpperCase();
        if (!st.equals("ENVIADA") && !st.equals("PENDENTE") && !st.equals("APROVADA") && !st.equals("REJEITADA"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Status inválido");
        return dronistas.listarPorValidacao(st).stream().map(p -> {
            int totalDocs = documentos.listarPorDronista(p.getId()).size();
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("perfilId", p.getId().toString());
            m.put("nome", p.getNome());
            m.put("cnpjCpf", p.getCnpjCpf());
            m.put("telefone", p.getTelefone());
            m.put("cidade", p.getCidade());
            m.put("estado", p.getEstado());
            m.put("validacaoDoc", p.getValidacaoDoc());
            m.put("totalDocumentos", totalDocs);
            // legado (slots fixos das versões anteriores)
            m.put("temFrente", p.getDocumentoFotoUrl() != null);
            m.put("temVerso", p.getDocumentoVersoUrl() != null);
            return m;
        }).toList();
    }

    /** Resumo dos documentos enviados pelo dronista (IDs para abrir via /conteudo). */
    @GetMapping("/api/admin/validacoes/{perfilId}/documentos")
    public Map<String, Object> documentos(@PathVariable java.util.UUID perfilId) {
        exigirAdmin();
        PerfilDronista p = dronistas.buscarPorId(perfilId);
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil não encontrado");
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("nome", p.getNome());
        out.put("cnpjCpf", p.getCnpjCpf());
        out.put("validacaoDoc", p.getValidacaoDoc());
        out.put("documentos", documentos.listarPorDronista(perfilId).stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId().toString());
            m.put("nome", d.getNomeOriginal());
            m.put("tamanho", d.getTamanho());
            return m;
        }).toList());
        return out;
    }

    /** Conteúdo de um documento (streaming pelo backend; exclusivo admin). */
    @GetMapping("/api/admin/documentos/{id}/conteudo")
    public ResponseEntity<org.springframework.core.io.Resource> conteudo(@PathVariable java.util.UUID id) {
        exigirAdmin(); // painel admin; o dono usa /api/documentos/{id}/conteudo
        DronistaDocumento d = documentos.buscarPorId(id);
        if (d == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Documento não encontrado");
        return s3.abrirStream(d.getChaveS3());
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
