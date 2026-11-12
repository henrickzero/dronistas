package com.dronistas.service;

import com.dronistas.mapper.ContaPropostaMapper;
import com.dronistas.mapper.PropostaVooMapper;
import com.dronistas.model.ContaProposta;
import com.dronistas.model.PropostaVoo;
import com.dronistas.security.RegraNegocioException;
import com.dronistas.security.Sessao;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class ContaService {

    private final ContaPropostaMapper contas;
    private final PropostaVooMapper propostas;
    private final PerfilService perfis;

    public ContaService(ContaPropostaMapper contas, PropostaVooMapper propostas, PerfilService perfis) {
        this.contas = contas;
        this.propostas = propostas;
        this.perfis = perfis;
    }

    /** Dronista envia (ou atualiza) a conta-proposta. Uma conta por dronista enquanto ENVIADA. */
    public ContaProposta enviar(UUID propostaId, Map<String, Object> body) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas dronistas enviam contas-proposta");
        var perfil = perfis.requerDronista(s);

        PropostaVoo p = propostas.buscarPorId(propostaId);
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Proposta não encontrada");
        if (!"ABERTA".equals(p.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Esta proposta não está mais aberta a contas-proposta");

        BigDecimal valor = PropostaService.valor(body.get("valorProposto"), "Valor proposto");
        String mensagem = PropostaService.campoTexto(body.get("mensagem"), "Mensagem", 2000, false);

        ContaProposta existente = contas.buscarEnviadaDoDronista(propostaId, perfil.getId());
        if (existente != null) {
            existente.setValorProposto(valor);
            existente.setMensagem(mensagem);
            contas.atualizar(existente);
            return contas.buscarPorId(existente.getId());
        }

        ContaProposta c = new ContaProposta();
        c.setId(UUID.randomUUID());
        c.setPropostaId(propostaId);
        c.setDronistaId(perfil.getId());
        c.setValorProposto(valor);
        c.setMensagem(mensagem);
        c.setStatus("ENVIADA");
        contas.inserir(c);
        return contas.buscarPorId(c.getId());
    }

    /** Contas recebidas por uma proposta — só o autor da proposta vê. */
    public List<ContaProposta> porProposta(UUID propostaId) {
        Sessao s = Sessao.atual();
        PropostaVoo p = propostas.buscarPorId(propostaId);
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Proposta não encontrada");
        if (!s.ehSolicitante() || !p.getSolicitanteId().equals(perfis.requerSolicitante(s).getId()))
            if (!s.ehAdmin()) throw new RegraNegocioException("NAO_ENCONTRADO", "Proposta não encontrada");
        return contas.listarPorProposta(propostaId);
    }

    public List<ContaProposta> minhas() {
        Sessao s = Sessao.atual();
        var perfil = perfis.requerDronista(s);
        return contas.listarPorDronista(perfil.getId());
    }

    /** Solicitante aceita a conta: proposta ACEITA, demais contas RECUSADAS. */
    public void aceitar(UUID contaId) {
        Sessao s = Sessao.atual();
        ContaProposta c = contas.buscarPorId(contaId);
        if (c == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!s.ehSolicitante()) throw new RegraNegocioException("PROIBIDO", "Só o solicitante aceita contas");
        PropostaVoo p = propostas.buscarPorId(c.getPropostaId());
        if (p == null || !p.getSolicitanteId().equals(perfis.requerSolicitante(s).getId()))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!"ABERTA".equals(p.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Esta proposta já não está mais aberta");
        if (c.getDronistaId().equals(p.getDronistaId()) && "ACEITA".equals(c.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Conta já aceita");

        contas.aceitar(contaId);
        propostas.aceitar(p.getId(), c.getDronistaId(), contaId);
        propostas.recusarOutrasContas(p.getId(), contaId);
    }

    /** Solicitante recusa a conta (ainda ENVIADA). */
    public void recusar(UUID contaId) {
        Sessao s = Sessao.atual();
        ContaProposta c = contas.buscarPorId(contaId);
        if (c == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!s.ehSolicitante()) throw new RegraNegocioException("PROIBIDO", "Só o solicitante recusa contas");
        PropostaVoo p = propostas.buscarPorId(c.getPropostaId());
        if (p == null || !p.getSolicitanteId().equals(perfis.requerSolicitante(s).getId()))
            throw new RegraNegocioException("NAO_ENCONTRADO", "Conta-proposta não encontrada");
        if (!"ENVIADA".equals(c.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Esta conta não está mais à espera de decisão");
        contas.recusar(contaId);
    }
}
