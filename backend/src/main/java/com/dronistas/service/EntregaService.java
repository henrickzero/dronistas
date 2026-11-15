package com.dronistas.service;

import com.dronistas.mapper.EntregaVideoMapper;
import com.dronistas.mapper.EntregaArquivoMapper;
import com.dronistas.mapper.PropostaVooMapper;
import com.dronistas.mapper.ContaPropostaMapper;
import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.mapper.PerfilSolicitanteMapper;
import com.dronistas.model.ContaProposta;
import com.dronistas.model.EntregaArquivo;
import com.dronistas.model.EntregaVideo;
import com.dronistas.model.PropostaVoo;
import com.dronistas.security.RegraNegocioException;
import com.dronistas.security.Sessao;
import com.dronistas.service.S3UploadService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class EntregaService {

    private final EntregaVideoMapper entregas;
    private final ContaPropostaMapper contas;
    private final PropostaVooMapper propostas;
    private final PerfilDronistaMapper dronistas;
    private final PerfilSolicitanteMapper solicitantes;
    private final PerfilService perfis;
    private final EntregaArquivoMapper arquivos;
    private final com.dronistas.mapper.RascunhoArquivoMapper rascunho;
    private final S3UploadService s3;

    public EntregaService(EntregaVideoMapper entregas, ContaPropostaMapper contas, PropostaVooMapper propostas,
                          PerfilDronistaMapper dronistas, PerfilSolicitanteMapper solicitantes, PerfilService perfis,
                          S3UploadService s3, EntregaArquivoMapper arquivos,
                          com.dronistas.mapper.RascunhoArquivoMapper rascunho) {
        this.entregas = entregas;
        this.contas = contas;
        this.propostas = propostas;
        this.dronistas = dronistas;
        this.solicitantes = solicitantes;
        this.perfis = perfis;
        this.s3 = s3;
        this.arquivos = arquivos;
        this.rascunho = rascunho;
    }

    /** Anexa 1 vídeo ao RASCUNHO da entrega (staging — invisível ao solicitante).
     *  Se já houver entrega enviada/recusada, o anexo entra na versão nova ao finalizar.
     *  (Os vídeos do formato antigo continuam suportados na entrega existente.) */
    @Transactional
    public com.dronistas.model.RascunhoArquivo anexarRascunho(UUID contaId, MultipartFile arquivo) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas o dronista contratado entrega o vídeo");
        var perfil = perfis.requerDronista(s);

        ContaProposta c = contas.buscarPorId(contaId);
        if (c == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!c.getDronistaId().equals(perfil.getId()))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        validarContaEntregavel(c);

        validarVideo(arquivo);
        if (rascunho.contarPorConta(contaId) >= ARQUIVOS_MAX)
            throw new RegraNegocioException("PROIBIDO", "Limite de " + ARQUIVOS_MAX + " vídeos por entrega atingido");

        S3UploadService.UploadResultado r = s3.enviarVideo(arquivo);
        com.dronistas.model.RascunhoArquivo ra = new com.dronistas.model.RascunhoArquivo();
        ra.setId(UUID.randomUUID());
        ra.setContaId(contaId);
        ra.setDronistaId(perfil.getId());
        ra.setNomeOriginal(arquivo.getOriginalFilename());
        ra.setUrl(r.url());
        ra.setChaveS3(r.chave());
        ra.setTamanho(r.tamanho());
        ra.setContentType(r.contentType());
        rascunho.inserir(ra);
        return ra;
    }

    public List<com.dronistas.model.RascunhoArquivo> rascunhoDaConta(UUID contaId) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas o dronista contratado entrega o vídeo");
        var perfil = perfis.requerDronista(s);
        ContaProposta c = contas.buscarPorId(contaId);
        if (c == null || !c.getDronistaId().equals(perfil.getId()))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        return rascunho.listarPorConta(contaId);
    }

    /** Remove 1 vídeo do rascunho (exclui do S3 também). */
    @Transactional
    public void removerRascunho(UUID rascunhoId) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas o dronista contratado entrega o vídeo");
        com.dronistas.model.RascunhoArquivo ra = rascunho.buscarDoUsuario(rascunhoId, s.getUsuarioId());
        if (ra == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Arquivo não encontrado no rascunho");
        try { s3.excluir(ra.getChaveS3()); } catch (Exception ignore) { /* best-effort */ }
        rascunho.excluir(ra.getId());
    }

    /** Conta só aceita entrega quando ACEITA e ainda não finalizada. */
    private void validarContaEntregavel(ContaProposta c) {
        if (!"ACEITA".equals(c.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Só é possível entregar o vídeo depois da conta aceita");
        EntregaVideo ultima = entregas.buscarUltimaPorConta(c.getId());
        if (ultima != null && "APROVADA".equals(ultima.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Esta entrega já foi aprovada");
    }

    /** FINALIZA a entrega: move todos os vídeos do rascunho para a entrega visível ao solicitante. */
    @Transactional
    public EntregaVideo finalizarEntrega(UUID contaId, String observacao) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas o dronista contratado entrega o vídeo");
        var perfil = perfis.requerDronista(s);

        ContaProposta c = contas.buscarPorId(contaId);
        if (c == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!c.getDronistaId().equals(perfil.getId()))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        validarContaEntregavel(c);

        var staging = rascunho.listarPorConta(contaId);
        if (staging.isEmpty())
            throw new RegraNegocioException("CAMPO_OBRIGATORIO",
                    "Anexe pelo menos um vídeo antes de realizar a entrega");
        if (staging.size() > ARQUIVOS_MAX)
            throw new RegraNegocioException("PROIBIDO", "Limite de " + ARQUIVOS_MAX + " vídeos por entrega atingido");

        EntregaVideo e = entregas.buscarUltimaPorConta(contaId);
        boolean nova = (e == null); // primeira entrega desta conta
        if (e != null && "APROVADA".equals(e.getStatus())) {
            throw new RegraNegocioException("PROIBIDO", "Esta entrega já foi aprovada");
        }
        if (e != null && ("ENVIADA".equals(e.getStatus()) || "REJEITADA".equals(e.getStatus()))) {
            // versão nova substitui a anterior: arquivos antigos saem do S3 e da tabela
            for (EntregaArquivo antigo : arquivos.listarPorEntrega(e.getId())) {
                try { s3.excluir(antigo.getChaveS3()); } catch (Exception ignore) { /* best-effort */ }
            }
            arquivos.excluirTodosPorEntrega(e.getId());
        }

        // campos calculados ANTES do INSERT (url_video é NOT NULL)
        long totalBytes = 0;
        String primeiraUrl = null;
        String primeiraChave = null;
        Long primeiroTamanho = null;
        String primeiroTipo = null;
        int totalArquivos = staging.size();
        for (com.dronistas.model.RascunhoArquivo ra : staging) {
            totalBytes += ra.getTamanho() == null ? 0 : ra.getTamanho();
            if (primeiraUrl == null) {
                primeiraUrl = ra.getUrl();
                primeiraChave = ra.getChaveS3();
                primeiroTamanho = ra.getTamanho();
                primeiroTipo = ra.getContentType();
            }
        }

        String obs = observacao;
        if (nova) {
            e = new EntregaVideo();
            e.setId(UUID.randomUUID());
            e.setContaId(contaId);
            e.setUrlVideo(primeiraUrl);
            e.setVideoChave(primeiraChave);
            e.setVideoTamanho(totalBytes);
            e.setVideoContentType(primeiroTipo);
            e.setObservacao(obs);
            e.setStatus("ENVIADA");
            entregas.inserir(e);
        } else {
            entregas.reenviar(e.getId(), primeiraUrl, primeiraChave, totalBytes, primeiroTipo, obs);
        }

        // move staging -> arquivos da entrega (agora a entrega existe e tem dados)
        int ordem = 0;
        for (com.dronistas.model.RascunhoArquivo ra : staging) {
            EntregaArquivo a = new EntregaArquivo();
            a.setId(UUID.randomUUID());
            a.setEntregaId(e.getId());
            a.setNomeOriginal(ra.getNomeOriginal());
            a.setUrl(ra.getUrl());
            a.setChaveS3(ra.getChaveS3());
            a.setTamanho(ra.getTamanho());
            a.setContentType(ra.getContentType());
            a.setOrdem(ordem++);
            arquivos.inserir(a);
        }

        rascunho.excluirTodosPorConta(contaId); // staging limpo
        return entregas.buscarPorId(e.getId());
    }

    /** Dronista aceito entrega o vídeo da conta — POR UPLOAD no S3 (até 8 GB, MP4/MOV/WebM).
     *  Mantido para compatibilidade de fluxo antigo (1 arquivo direto); o fluxo novo é rascunho+finalizar. */
    @Transactional
    public EntregaVideo entregarUpload(UUID contaId, MultipartFile arquivo, String observacao) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas o dronista contratado entrega o vídeo");
        var perfil = perfis.requerDronista(s);

        ContaProposta c = contas.buscarPorId(contaId);
        if (c == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!c.getDronistaId().equals(perfil.getId()))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!"ACEITA".equals(c.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Só é possível entregar o vídeo depois da conta aceita");

        validarVideo(arquivo);
        S3UploadService.UploadResultado r = s3.enviarVideo(arquivo);

        String link = r.url();
        EntregaVideo ultima = entregas.buscarUltimaPorConta(contaId);
        if (ultima != null && ("ENVIADA".equals(ultima.getStatus()) || "REJEITADA".equals(ultima.getStatus()))) {
            // arquivo antigo sai do S3 para não acumular lixo
            if (ultima.getVideoChave() != null) {
                try { s3.excluir(ultima.getVideoChave()); } catch (Exception ignore) { /* best-effort */ }
            }
            entregas.reenviar(ultima.getId(), link, r.chave(), r.tamanho(), r.contentType(), observacao);
            return entregas.buscarPorId(ultima.getId());
        }
        if (ultima != null && "APROVADA".equals(ultima.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Esta entrega já foi aprovada");

        EntregaVideo e = new EntregaVideo();
        e.setId(UUID.randomUUID());
        e.setContaId(contaId);
        e.setUrlVideo(link);
        e.setVideoChave(r.chave());
        e.setVideoTamanho(r.tamanho());
        e.setVideoContentType(r.contentType());
        e.setObservacao(observacao);
        e.setStatus("ENVIADA");
        entregas.inserir(e);
        // o vídeo principal também entra na lista de arquivos (fonte única p/ player)
        EntregaArquivo primeiro = new EntregaArquivo();
        primeiro.setId(UUID.randomUUID());
        primeiro.setEntregaId(e.getId());
        primeiro.setNomeOriginal(arquivo.getOriginalFilename());
        primeiro.setUrl(link);
        primeiro.setChaveS3(r.chave());
        primeiro.setTamanho(r.tamanho());
        primeiro.setContentType(r.contentType());
        primeiro.setOrdem(0);
        arquivos.inserir(primeiro);
        return entregas.buscarPorId(e.getId());
    }

    /** Vídeo é mídia pesada (muitas vezes > 500 MB do drone): limite generoso por arquivo. */
    private static final long VIDEO_MAX_BYTES = 8L * 1024 * 1024 * 1024; // 8 GB
    private static final int ARQUIVOS_MAX = 10; // teto de vídeos por entrega
    private static final java.util.Set<String> VIDEO_EXT_OK =
            java.util.Set.of("mp4", "mov", "webm", "mkv", "avi");

    private void validarVideo(org.springframework.web.multipart.MultipartFile arquivo) {
        if (arquivo == null || arquivo.isEmpty())
            throw new RegraNegocioException("CAMPO_OBRIGATORIO", "Selecione o arquivo de vídeo do voo");
        if (arquivo.getSize() > VIDEO_MAX_BYTES)
            throw new RegraNegocioException("CAMPO_INVALIDO", "Vídeo maior que 8 GB — exporte em resolução menor e tente novamente");
        String nome = arquivo.getOriginalFilename() == null ? "" : arquivo.getOriginalFilename();
        if (nome.contains("..") || nome.contains("/"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Nome de arquivo inválido");
        String ext = nome.contains(".") ? nome.substring(nome.lastIndexOf('.') + 1).toLowerCase() : "";
        if (!VIDEO_EXT_OK.contains(ext))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Formato de vídeo não aceito — envie MP4, MOV, WebM, MKV ou AVI");
    }

    /** Dronista anexa mais um vídeo à entrega (lista de N arquivos, teto de 10). */
    @Transactional
    public EntregaArquivo adicionarArquivo(UUID entregaId, org.springframework.web.multipart.MultipartFile arquivo) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas o dronista contratado entrega o vídeo");
        var perfil = perfis.requerDronista(s);
        EntregaVideo e = entregas.buscarPorId(entregaId);
        if (e == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        UUID dronistaId = entregas.buscarDronistaDaEntrega(entregaId);
        if (!perfil.getId().equals(dronistaId))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        if ("APROVADA".equals(e.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Esta entrega já foi aprovada");
        validarVideo(arquivo);
        if (arquivos.listarPorEntrega(entregaId).size() >= ARQUIVOS_MAX)
            throw new RegraNegocioException("PROIBIDO", "Limite de " + ARQUIVOS_MAX + " vídeos por entrega atingido");

        S3UploadService.UploadResultado r = s3.enviarVideo(arquivo);
        EntregaArquivo a = new EntregaArquivo();
        a.setId(UUID.randomUUID());
        a.setEntregaId(entregaId);
        a.setNomeOriginal(arquivo.getOriginalFilename());
        a.setUrl(r.url());
        a.setChaveS3(r.chave());
        a.setTamanho(r.tamanho());
        a.setContentType(r.contentType());
        a.setOrdem(arquivos.listarPorEntrega(entregaId).size());
        arquivos.inserir(a);
        return a;
    }

    /** STAGING: resolve 1 vídeo do rascunho do próprio dronista (para streaming). */
    public com.dronistas.model.RascunhoArquivo rascunhoPorId(UUID rascunhoId, java.util.UUID usuarioId) {
        com.dronistas.model.RascunhoArquivo ra = rascunho.buscarDoUsuario(rascunhoId, usuarioId);
        if (ra == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Arquivo não encontrado no rascunho");
        return ra;
    }

    /** Remove um vídeo JÁ ENTREGUE — bloqueado: depois de entregue, só o solicitante
     *  (recusando a entrega) devolve o controle ao dronista para reenviar. */
    @Transactional
    public void removerArquivo(UUID arquivoId) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas o dronista contratado entrega o vídeo");
        EntregaArquivo a = arquivos.buscarComContexto(arquivoId);
        if (a == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Arquivo não encontrado");
        var perfil = perfis.requerDronista(s);
        UUID dronistaId = entregas.buscarDronistaDaEntrega(a.getEntregaId());
        if (!perfil.getId().equals(dronistaId))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Arquivo não encontrado");
        EntregaVideo entrega = entregas.buscarPorId(a.getEntregaId());
        if (entrega != null && ("ENVIADA".equals(entrega.getStatus()) || "APROVADA".equals(entrega.getStatus())))
            throw new RegraNegocioException("PROIBIDO",
                    "O vídeo já foi entregue ao solicitante e não pode ser removido" +
                    ("APROVADA".equals(entrega.getStatus()) ? " — entrega aprovada" :
                        " — aguarde a recusa do solicitante para enviar uma nova versão"));
        try { s3.excluir(a.getChaveS3()); } catch (Exception ignore) { /* best-effort */ }
        arquivos.excluir(arquivoId);
    }

    /** Arquivos da entrega (N vídeos), ordenados — usado no detalhe. */
    public List<EntregaArquivo> arquivosDaEntrega(UUID entregaId) {
        EntregaVideo e = entregas.buscarPorId(entregaId);
        if (e == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        return arquivos.listarPorEntrega(entregaId);
    }

    /** Um arquivo da entrega (para streaming com guard no controller). */
    public EntregaArquivo arquivoPorId(UUID arquivoId) {
        EntregaArquivo a = arquivos.buscarComContexto(arquivoId);
        if (a == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Arquivo não encontrado");
        return a;
    }

    /** Entregas com seus arquivos (N vídeos cada). */
    private List<EntregaVideo> comArquivos(List<EntregaVideo> lista) {
        for (EntregaVideo e : lista) e.setArquivos(arquivos.listarPorEntrega(e.getId()));
        return lista;
    }

    public List<EntregaVideo> minhasComoSolicitante() {
        Sessao s = Sessao.atual();
        var perfil = perfis.requerSolicitante(s);
        return comArquivos(entregas.listarPorSolicitante(perfil.getId()));
    }

    public List<EntregaVideo> minhasComoDronista() {
        Sessao s = Sessao.atual();
        var perfil = perfis.requerDronista(s);
        return comArquivos(entregas.listarPorDronista(perfil.getId()));
    }

    /** Solicitante aprova a entrega: proposta CONCLUIDA, pagamento liberado, contadores sobem. */
    @Transactional
    public EntregaVideo aprovar(UUID entregaId) {
        Sessao s = Sessao.atual();
        EntregaVideo e = buscarComGuardSolicitante(entregaId, s);
        if (!"ENVIADA".equals(e.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Só entregas pendentes podem ser aprovadas");
        entregas.aprovar(entregaId);
        UUID propostaId = entregas.buscarPropostaDaEntrega(entregaId);
        propostas.concluir(propostaId);

        UUID dronistaId = entregas.buscarDronistaDaEntrega(entregaId);
        UUID solicitanteId = entregas.buscarSolicitanteDaEntrega(entregaId);
        dronistas.incrementarTrabalhos(dronistaId);
        solicitantes.incrementarContratacoes(solicitanteId);
        return entregas.buscarPorId(entregaId);
    }

    /** Solicitante recusa: dronista pode reenviar. */
    @Transactional
    public EntregaVideo recusar(UUID entregaId) {
        Sessao s = Sessao.atual();
        EntregaVideo e = buscarComGuardSolicitante(entregaId, s);
        if (!"ENVIADA".equals(e.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Só entregas pendentes podem ser recusadas");
        entregas.recusar(entregaId);
        return entregas.buscarPorId(entregaId);
    }

    /** Solicitante avalia o dronista (1-5). Uma única avaliação por entrega. */
    @Transactional
    public EntregaVideo avaliar(UUID entregaId, Map<String, Object> body) {
        Sessao s = Sessao.atual();
        EntregaVideo e = buscarComGuardSolicitante(entregaId, s);
        if (!"APROVADA".equals(e.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Avaliação só depois da entrega aprovada");
        if (e.getNota() != null)
            throw new RegraNegocioException("PROIBIDO", "Esta entrega já foi avaliada");
        int nota = nota(body);
        String comentario = PropostaService.campoTexto(body.get("comentario"), "Comentário", 1000, false);
        entregas.avaliar(entregaId, nota, comentario);
        UUID dronistaId = entregas.buscarDronistaDaEntrega(entregaId);
        dronistas.recalcularNota(dronistaId);
        return entregas.buscarPorId(entregaId);
    }

    /** Dronista avalia o solicitante (1-5). Ranking de solicitantes. */
    @Transactional
    public EntregaVideo avaliarSolicitante(UUID entregaId, Map<String, Object> body) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas dronistas avaliam solicitantes");
        var perfil = perfis.requerDronista(s);
        EntregaVideo e = entregas.buscarPorId(entregaId);
        if (e == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        UUID dronistaId = entregas.buscarDronistaDaEntrega(entregaId);
        if (!perfil.getId().equals(dronistaId))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        if (!"APROVADA".equals(e.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Avaliação só depois da entrega aprovada");
        if (e.getNotaSolicitante() != null)
            throw new RegraNegocioException("PROIBIDO", "Você já avaliou este solicitante");
        int nota = nota(body);
        String comentario = PropostaService.campoTexto(body.get("comentario"), "Comentário", 1000, false);
        entregas.avaliarSolicitante(entregaId, nota, comentario);
        UUID solicitanteId = entregas.buscarSolicitanteDaEntrega(entregaId);
        solicitantes.recalcularNota(solicitanteId);
        return entregas.buscarPorId(entregaId);
    }

    /** Detalhe da entrega (o guard de quem pode ver fica no controller). */
  /** Detalhe da entrega (o guard de quem pode ver fica no controller). */
    public EntregaVideo buscarPorId(UUID id) {
        EntregaVideo e = entregas.buscarPorId(id);
        if (e == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        e.setArquivos(arquivos.listarPorEntrega(id));
        return e;
    }

    public UUID dronistaDaEntrega(UUID entregaId) { return entregas.buscarDronistaDaEntrega(entregaId); }

    public UUID solicitanteDaEntrega(UUID entregaId) { return entregas.buscarSolicitanteDaEntrega(entregaId); }

    private EntregaVideo buscarComGuardSolicitante(UUID entregaId, Sessao s) {
        EntregaVideo e = entregas.buscarPorId(entregaId);
        if (e == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        if (!s.ehSolicitante()) throw new RegraNegocioException("PROIBIDO", "Operação exclusiva do solicitante");
        UUID solicitanteId = entregas.buscarSolicitanteDaEntrega(entregaId);
        if (!perfis.requerSolicitante(s).getId().equals(solicitanteId))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Entrega não encontrada");
        return e;
    }

    static String urlVideo(Object v) {
        String t = v == null ? "" : v.toString().trim();
        if (t.isBlank()) throw new RegraNegocioException("CAMPO_OBRIGATORIO", "URL do vídeo é obrigatória");
        if (!t.matches("^(https?://).+"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "URL do vídeo inválida (http/https)");
        if (t.length() > 2000) throw new RegraNegocioException("CAMPO_INVALIDO", "URL excede 2000 caracteres");
        return t;
    }

    static int nota(Map<String, Object> body) {
        Object v = body.get("nota");
        if (v == null) throw new RegraNegocioException("CAMPO_OBRIGATORIO", "Nota é obrigatória (1 a 5)");
        int n;
        try { n = Integer.parseInt(v.toString().trim()); }
        catch (Exception e) { throw new RegraNegocioException("CAMPO_INVALIDO", "Nota inválida"); }
        if (n < 1 || n > 5) throw new RegraNegocioException("CAMPO_INVALIDO", "Nota deve ser entre 1 e 5");
        return n;
    }
}
