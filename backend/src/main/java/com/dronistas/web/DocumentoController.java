package com.dronistas.web;

import com.dronistas.mapper.DronistaDocumentoMapper;
import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.model.DronistaDocumento;
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
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Documentos do dronista — LISTA (N arquivos, teto 10). Cada arquivo vai para o S3
 * (bucket privado); leitura/visualização SEMPRE pelo backend autenticado.
 * O primeiro upload marca validacao_doc=ENVIADA; admin aprova no painel.
 */
@RestController
public class DocumentoController {

    private final S3UploadService s3;
    private final PerfilDronistaMapper dronistas;
    private final DronistaDocumentoMapper documentos;
    private final PerfilService perfis;

    private static final int MAX_ARQUIVOS = 10; // teto por dronista

    public DocumentoController(S3UploadService s3, PerfilDronistaMapper dronistas,
                               DronistaDocumentoMapper documentos, PerfilService perfis) {
        this.s3 = s3;
        this.dronistas = dronistas;
        this.documentos = documentos;
        this.perfis = perfis;
    }

    private PerfilDronista perfilDoLogado() {
        Sessao s = Sessao.atual();
        if (!s.ehDronista() && !s.ehAdmin())
            throw new RegraNegocioException("PROIBIDO", "Documentos são exclusivos do dronista");
        PerfilDronista p = dronistas.buscarPorUsuario(s.getUsuarioId());
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil de dronista não encontrado");
        return p;
    }

    /** Lista os documentos do próprio dronista. */
    @GetMapping("/api/documentos/me")
    public Map<String, Object> me() {
        PerfilDronista p = perfilDoLogado();
        var lista = documentos.listarPorDronista(p.getId());
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("habilitado", s3.habilitado());
        out.put("validacaoDoc", p.getValidacaoDoc());
        out.put("total", lista.size());
        out.put("documentos", lista.stream().map(d -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", d.getId().toString());
            m.put("nome", d.getNomeOriginal());
            m.put("tamanho", d.getTamanho());
            m.put("contentType", d.getContentType());
            m.put("criadoEm", d.getCriadoEm());
            return m;
        }).toList());
        return out;
    }

    /** Envia 1 arquivo (pode repetir quantas vezes quiser, até o teto de 10). */
    @PostMapping("/api/documentos/upload")
    public ResponseEntity<Map<String, Object>> upload(@RequestParam("arquivo") MultipartFile arquivo) {
        Sessao s = Sessao.atual();
        PerfilDronista p = perfilDoLogado();

        long atuais = documentos.listarPorDronista(p.getId()).size();
        if (atuais >= MAX_ARQUIVOS)
            throw new RegraNegocioException("PROIBIDO",
                    "Limite de " + MAX_ARQUIVOS + " documentos atingido — exclua um antes de enviar outro");

        S3UploadService.UploadResultado r = s3.enviarDocumento(arquivo);

        DronistaDocumento d = new DronistaDocumento();
        d.setId(UUID.randomUUID());
        d.setDronistaId(p.getId());
        d.setNomeOriginal(arquivo.getOriginalFilename());
        d.setUrl(r.url());
        d.setChaveS3(r.chave());
        d.setTamanho(r.tamanho());
        d.setContentType(r.contentType());
        documentos.inserir(d);

        // o primeiro documento dispara a validação de identidade
        if (p.getValidacaoDoc() == null || "PENDENTE".equals(p.getValidacaoDoc())) {
            p.setValidacaoDoc("ENVIADA");
            dronistas.atualizar(p);
        }

        Map<String, Object> out = new LinkedHashMap<>();
        out.put("id", d.getId().toString());
        out.put("nome", d.getNomeOriginal());
        out.put("tamanho", d.getTamanho());
        out.put("validacaoDoc", "ENVIADA");
        out.put("total", atuais + 1);
        return ResponseEntity.status(HttpStatus.CREATED).body(out);
    }

    /** Exclui um documento do próprio dronista (remove o objeto do S3 também). */
    @DeleteMapping("/api/documentos/{id}")
    public ResponseEntity<Void> excluir(@PathVariable UUID id) {
        Sessao s = Sessao.atual();
        DronistaDocumento d = documentos.buscarDoUsuario(id, s.getUsuarioId());
        if (d == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Documento não encontrado");
        try { s3.excluir(d.getChaveS3()); } catch (Exception ignore) { /* best-effort */ }
        documentos.excluir(id);
        return ResponseEntity.ok().build();
    }

    /** Lê o conteúdo do arquivo (streaming, autenticado) — admin ou dono. */
    @GetMapping("/api/documentos/{id}/conteudo")
    public ResponseEntity<org.springframework.core.io.Resource> conteudo(@PathVariable UUID id) {
        Sessao s = Sessao.atual();
        DronistaDocumento d = documentos.buscarPorId(id);
        if (d == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Documento não encontrado");
        boolean dono = d.getDronistaId().equals(perfilDoLogado().getId());
        if (!dono && !s.ehAdmin())
            throw new RegraNegocioException("PROIBIDO", "Sem permissão para abrir este documento");
        return s3.abrirStream(d.getChaveS3());
    }
}
