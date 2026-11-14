package com.dronistas.web;

import com.dronistas.model.EntregaVideo;
import com.dronistas.service.EntregaService;
import com.dronistas.security.RegraNegocioException;
import com.dronistas.security.Sessao;
import com.dronistas.service.S3UploadService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Entrega do vídeo — por UPLOAD para o S3 (bucket privado) com visualização
 * SEMPRE pelo backend autenticado (streaming; entregas antigas por URL externa redirecionam).
 */
@RestController
public class EntregaController {

    private final EntregaService entregas;
    private final S3UploadService s3;
    private final com.dronistas.mapper.PerfilDronistaMapper dronistas;
    private final com.dronistas.mapper.PerfilSolicitanteMapper solicitantes;

    public EntregaController(EntregaService entregas, S3UploadService s3,
                             com.dronistas.mapper.PerfilDronistaMapper dronistas,
                             com.dronistas.mapper.PerfilSolicitanteMapper solicitantes) {
        this.entregas = entregas;
        this.s3 = s3;
        this.dronistas = dronistas;
        this.solicitantes = solicitantes;
    }

    /** Entregas das propostas do solicitante. */
    @GetMapping("/api/entregas/recebidas")
    public List<EntregaVideo> recebidas() {
        return entregas.minhasComoSolicitante();
    }

    /** Entregas enviadas pelo dronista. */
    @GetMapping("/api/entregas/minhas")
    public List<EntregaVideo> minhas() {
        return entregas.minhasComoDronista();
    }

    /** Upload do vídeo da entrega (multipart) — substitui o antigo fluxo por URL. */
    @PostMapping(value = "/api/contas/{contaId}/entrega", consumes = "multipart/form-data")
    public ResponseEntity<EntregaVideo> entregarUpload(@PathVariable UUID contaId,
                                                       @RequestParam("arquivo") MultipartFile arquivo,
                                                       @RequestParam(value = "observacao", required = false) String observacao) {
        return ResponseEntity.status(HttpStatus.CREATED).body(entregas.entregarUpload(contaId, arquivo, observacao));
    }

    @PostMapping("/api/entregas/{id}/aprovar")
    public EntregaVideo aprovar(@PathVariable UUID id) {
        return entregas.aprovar(id);
    }

    @PostMapping("/api/entregas/{id}/recusar")
    public EntregaVideo recusar(@PathVariable UUID id) {
        return entregas.recusar(id);
    }

    /** Arquivos da entrega (para dronista/solicitante/admin envolvidos). */
    @GetMapping("/api/entregas/{entregaId}/arquivos")
    public java.util.List<com.dronistas.model.EntregaArquivo> arquivos(@PathVariable UUID entregaId) {
        Sessao s = Sessao.atual();
        EntregaVideo e = entregas.buscarPorId(entregaId);
        if (e == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        autorizarVisualizacao(e, s);
        return entregas.arquivosDaEntrega(entregaId);
    }

    /** Vídeo principal (legado/upload único) — SEMPRE pelo backend autenticado (streaming no bucket privado). */
    @GetMapping("/api/entregas/{id}/video")
    public ResponseEntity<org.springframework.core.io.Resource> video(@PathVariable UUID id) {
        Sessao s = Sessao.atual();
        EntregaVideo e = entregas.buscarPorId(id);
        if (e == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        autorizarVisualizacao(e, s);
        if (e.getVideoChave() == null || e.getVideoChave().isBlank())
            // entregas antigas por URL de hospedagem externa: redireciona
            return ResponseEntity.status(HttpStatus.FOUND).location(java.net.URI.create(e.getUrlVideo())).build();
        return s3.abrirStream(e.getVideoChave());
    }

    private void autorizarVisualizacao(EntregaVideo e, Sessao s) {
        if (s.ehAdmin()) return;
        UUID dronistaId = entregas.dronistaDaEntrega(e.getId());
        UUID solicitanteId = entregas.solicitanteDaEntrega(e.getId());
        boolean ehODronista = s.ehDronista() && dronistas.buscarPorUsuario(s.getUsuarioId()) != null
                && dronistas.buscarPorUsuario(s.getUsuarioId()).getId().equals(dronistaId);
        boolean ehOSolicitante = s.ehSolicitante() && solicitantes.buscarPorUsuario(s.getUsuarioId()) != null
                && solicitantes.buscarPorUsuario(s.getUsuarioId()).getId().equals(solicitanteId);
        if (!ehODronista && !ehOSolicitante)
            throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
    }

    /** Dronista anexa mais um vídeo à entrega (N arquivos, teto 10). */
    @PostMapping(value = "/api/entregas/{entregaId}/arquivos", consumes = "multipart/form-data")
    public ResponseEntity<com.dronistas.model.EntregaArquivo> adicionarArquivo(
            @PathVariable UUID entregaId,
            @RequestParam("arquivo") MultipartFile arquivo) {
        return ResponseEntity.status(HttpStatus.CREATED).body(entregas.adicionarArquivo(entregaId, arquivo));
    }

    /** Remove um vídeo da lista da entrega. */
    @DeleteMapping("/api/entregas/arquivos/{arquivoId}")
    public ResponseEntity<Void> removerArquivo(@PathVariable UUID arquivoId) {
        entregas.removerArquivo(arquivoId);
        return ResponseEntity.ok().build();
    }

    /** STAGING: anexa 1 vídeo ao rascunho da entrega (drone envia todos, entrega no final). */
    @PostMapping(value = "/api/contas/{contaId}/rascunho", consumes = "multipart/form-data")
    public ResponseEntity<com.dronistas.model.RascunhoArquivo> anexarRascunho(
            @PathVariable UUID contaId,
            @RequestParam("arquivo") MultipartFile arquivo) {
        return ResponseEntity.status(HttpStatus.CREATED).body(entregas.anexarRascunho(contaId, arquivo));
    }

    /** STAGING: lista os vídeos anexados no rascunho (ainda não entregues). */
    @GetMapping("/api/contas/{contaId}/rascunho")
    public java.util.List<com.dronistas.model.RascunhoArquivo> listarRascunho(@PathVariable UUID contaId) {
        return entregas.rascunhoDaConta(contaId);
    }

    /** STAGING: remove 1 vídeo do rascunho. */
    @DeleteMapping("/api/contas/rascunho/{rascunhoId}")
    public ResponseEntity<Void> removerRascunho(@PathVariable UUID rascunhoId) {
        entregas.removerRascunho(rascunhoId);
        return ResponseEntity.ok().build();
    }

    /** STAGING: conteúdo de 1 vídeo anexado (blob/streaming — dono apenas). */
    @GetMapping("/api/contas/rascunho/{rascunhoId}/conteudo")
    public ResponseEntity<org.springframework.core.io.Resource> conteudoRascunho(@PathVariable UUID rascunhoId) {
        Sessao s = Sessao.atual();
        com.dronistas.model.RascunhoArquivo ra = entregas.rascunhoPorId(rascunhoId, s.getUsuarioId());
        return s3.abrirStream(ra.getChaveS3());
    }

    /** FINALIZA a entrega (movendo os vídeos do rascunho) e notifica o solicitante. */
    @PostMapping("/api/contas/{contaId}/entrega-final")
    public ResponseEntity<EntregaVideo> finalizar(@PathVariable UUID contaId,
                                                  @RequestBody(required = false) Map<String, Object> body) {
        String obs = body == null || body.get("observacao") == null ? null : body.get("observacao").toString();
        return ResponseEntity.status(HttpStatus.CREATED).body(entregas.finalizarEntrega(contaId, obs));
    }

    /** Vídeo de um arquivo específico da lista — streaming autenticado (dono/solicitante/admin). */
    @GetMapping("/api/entregas/arquivos/{arquivoId}/video")
    public ResponseEntity<org.springframework.core.io.Resource> videoArquivo(@PathVariable UUID arquivoId) {
        Sessao s = Sessao.atual();
        com.dronistas.model.EntregaArquivo a = entregas.arquivoPorId(arquivoId);
        if (a == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Arquivo não encontrado");
        EntregaVideo entrega = entregas.buscarPorId(a.getEntregaId());
        autorizarVisualizacao(entrega, s);
        return s3.abrirStream(a.getChaveS3());
    }

    /** Solicitante avalia o dronista (1-5). */
    @PostMapping("/api/entregas/{id}/avaliar")
    public EntregaVideo avaliar(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return entregas.avaliar(id, body);
    }

    /** Dronista avalia o solicitante (ranking de solicitantes). */
    @PostMapping("/api/entregas/{id}/avaliar-solicitante")
    public EntregaVideo avaliarSolicitante(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return entregas.avaliarSolicitante(id, body);
    }
}
