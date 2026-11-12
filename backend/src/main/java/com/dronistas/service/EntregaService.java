package com.dronistas.service;

import com.dronistas.mapper.EntregaVideoMapper;
import com.dronistas.mapper.PropostaVooMapper;
import com.dronistas.mapper.ContaPropostaMapper;
import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.mapper.PerfilSolicitanteMapper;
import com.dronistas.model.ContaProposta;
import com.dronistas.model.EntregaVideo;
import com.dronistas.model.PropostaVoo;
import com.dronistas.security.RegraNegocioException;
import com.dronistas.security.Sessao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
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

    public EntregaService(EntregaVideoMapper entregas, ContaPropostaMapper contas, PropostaVooMapper propostas,
                          PerfilDronistaMapper dronistas, PerfilSolicitanteMapper solicitantes, PerfilService perfis) {
        this.entregas = entregas;
        this.contas = contas;
        this.propostas = propostas;
        this.dronistas = dronistas;
        this.solicitantes = solicitantes;
        this.perfis = perfis;
    }

    /** Dronista aceito entrega o vídeo da conta. Reenvio (status REJEITADA) atualiza a entrega. */
    @Transactional
    public EntregaVideo entregar(UUID contaId, Map<String, Object> body) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas o dronista contratado entrega o vídeo");
        var perfil = perfis.requerDronista(s);

        ContaProposta c = contas.buscarPorId(contaId);
        if (c == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!c.getDronistaId().equals(perfil.getId()))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!"ACEITA".equals(c.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Só é possível entregar o vídeo depois da conta aceita");

        String url = urlVideo(body.get("urlVideo"));
        String obs = PropostaService.campoTexto(body.get("observacao"), "Observação", 2000, false);

        EntregaVideo ultima = entregas.buscarUltimaPorConta(contaId);
        if (ultima != null && ("ENVIADA".equals(ultima.getStatus()) || "REJEITADA".equals(ultima.getStatus()))) {
            entregas.reenviar(ultima.getId(), url, obs);
            return entregas.buscarPorId(ultima.getId());
        }
        if (ultima != null && "APROVADA".equals(ultima.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Esta entrega já foi aprovada");

        EntregaVideo e = new EntregaVideo();
        e.setId(UUID.randomUUID());
        e.setContaId(contaId);
        e.setUrlVideo(url);
        e.setObservacao(obs);
        e.setStatus("ENVIADA");
        entregas.inserir(e);
        return entregas.buscarPorId(e.getId());
    }

    public List<EntregaVideo> minhasComoSolicitante() {
        Sessao s = Sessao.atual();
        var perfil = perfis.requerSolicitante(s);
        return entregas.listarPorSolicitante(perfil.getId());
    }

    public List<EntregaVideo> minhasComoDronista() {
        Sessao s = Sessao.atual();
        var perfil = perfis.requerDronista(s);
        return entregas.listarPorDronista(perfil.getId());
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
