package com.dronistas.service;

import com.dronistas.mapper.PropostaVooMapper;
import com.dronistas.mapper.ContaPropostaMapper;
import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.model.PropostaVoo;
import com.dronistas.model.ContaProposta;
import com.dronistas.model.PerfilDronista;
import com.dronistas.security.LocalizacaoValidator;
import com.dronistas.security.RegraNegocioException;
import com.dronistas.security.Sessao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class PropostaService {

    private static final List<String> QUALIDADES = List.of("FULLHD", "2K", "4K_30FPS", "4K_60FPS", "4K_120FPS");
    private static final List<String> FORMATOS = List.of("MP4", "MOV", "LOG", "RAW", "PRORES");
    private static final List<Integer> FPS_VALIDOS = List.of(24, 25, 30, 60, 120);

    private final PropostaVooMapper propostas;
    private final ContaPropostaMapper contas;
    private final PerfilService perfis;
    private final PerfilDronistaMapper dronistas;
    private final GeocodingService geo;

    public PropostaService(PropostaVooMapper propostas, ContaPropostaMapper contas, PerfilService perfis,
                           PerfilDronistaMapper dronistas, GeocodingService geo) {
        this.propostas = propostas;
        this.contas = contas;
        this.perfis = perfis;
        this.dronistas = dronistas;
        this.geo = geo;
    }

    public PropostaVoo criar(Map<String, Object> body) {
        Sessao s = Sessao.atual();
        if (!s.ehSolicitante()) throw new RegraNegocioException("PROIBIDO", "Apenas solicitantes criam propostas");
        var perfil = perfis.requerSolicitante(s);

        PropostaVoo p = new PropostaVoo();
        p.setSolicitanteId(perfil.getId());
        p.setTitulo(campoTexto(body.get("titulo"), "Título", 200, true));
        p.setDescricao(campoTexto(body.get("descricao"), "Descrição", 5000, false));
        p.setLocal(campoTexto(body.get("local"), "Local", 300, false));
        p.setDataVoo(dataVoo(body.get("dataVoo")));
        p.setHoraVoo(horaVoo(body.get("horaVoo")));
        p.setDuracaoMin(duracaoMin(body.get("duracaoMin")));
        p.setQualidadeVideo(qualidade(body.get("qualidadeVideo")));
        p.setFps(fps(body.get("fps")));
        p.setFormatoVideo(formato(body.get("formatoVideo")));
        p.setValorOferecido(valor(body.get("valorOferecido"), "Valor oferecido"));
        p.setEstado(LocalizacaoValidator.estado(utStr(body.get("estado"))));
        p.setCidade(LocalizacaoValidator.texto(utStr(body.get("cidade")), "Cidade", 120));
        p.setBairro(LocalizacaoValidator.texto(utStr(body.get("bairro")), "Bairro", 120));
        p.setLogradouro(LocalizacaoValidator.texto(utStr(body.get("logradouro")), "Logradouro", 300));
        p.setNumero(LocalizacaoValidator.numeroEndereco(utStr(body.get("numero"))));
        p.setCep(LocalizacaoValidator.cep(utStr(body.get("cep"))));
        Object pres = body.get("solicitantePresente");
        p.setSolicitantePresente(pres == null || Boolean.parseBoolean(String.valueOf(pres)));
        // Coordenadas: prioriza ponto escolhido no mapa; senão geocoding aproximado
        double[] mapa = coordsMapa(body.get("lat"), body.get("lng"));
        if (mapa != null) { p.setLat(mapa[0]); p.setLng(mapa[1]); }
        else {
            double[] coords = geo.resolver(p.getCep(), p.getEstado(), p.getCidade(), p.getBairro(), p.getLogradouro(), p.getNumero(), p.getLocal());
            if (coords != null) { p.setLat(coords[0]); p.setLng(coords[1]); }
        }
        p.setStatus("ABERTA");
        p.setId(UUID.randomUUID());
        propostas.inserir(p);
        return propostas.buscarPorId(p.getId());
    }

    /** Lat/lng vindos do mapa; valida faixa e retorna null se ausentes/inválidos. */
    private double[] coordsMapa(Object lat, Object lng) {
        if (lat == null || lng == null) return null;
        try {
            double la = Double.parseDouble(String.valueOf(lat));
            double lo = Double.parseDouble(String.valueOf(lng));
            if (la < -90 || la > 90 || lo < -180 || lo > 180) return null;
            return new double[]{la, lo};
        } catch (NumberFormatException e) { return null; }
    }

    public PropostaVoo atualizar(UUID id, Map<String, Object> body) {
        Sessao s = Sessao.atual();
        PropostaVoo atual = buscarComGuard(s, id);
        if (!s.ehSolicitante() || !atual.getSolicitanteId().equals(perfis.requerSolicitante(s).getId()))
            throw new RegraNegocioException("PROIBIDO", "Só o autor edita a proposta");
        if (!"ABERTA".equals(atual.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Só propostas ABERTA podem ser editadas");

        if (body.containsKey("titulo")) atual.setTitulo(campoTexto(body.get("titulo"), "Título", 200, true));
        if (body.containsKey("descricao")) atual.setDescricao(campoTexto(body.get("descricao"), "Descrição", 5000, false));
        if (body.containsKey("local")) atual.setLocal(campoTexto(body.get("local"), "Local", 300, false));
        if (body.containsKey("dataVoo")) atual.setDataVoo(dataVoo(body.get("dataVoo")));
        if (body.containsKey("horaVoo")) atual.setHoraVoo(horaVoo(body.get("horaVoo")));
        if (body.containsKey("duracaoMin")) atual.setDuracaoMin(duracaoMin(body.get("duracaoMin")));
        if (body.containsKey("qualidadeVideo")) atual.setQualidadeVideo(qualidade(body.get("qualidadeVideo")));
        if (body.containsKey("fps")) atual.setFps(fps(body.get("fps")));
        if (body.containsKey("formatoVideo")) atual.setFormatoVideo(formato(body.get("formatoVideo")));
        if (body.containsKey("valorOferecido")) atual.setValorOferecido(valor(body.get("valorOferecido"), "Valor oferecido"));
        if (body.containsKey("estado")) atual.setEstado(LocalizacaoValidator.estado(utStr(body.get("estado"))));
        if (body.containsKey("cidade")) atual.setCidade(LocalizacaoValidator.texto(utStr(body.get("cidade")), "Cidade", 120));
        if (body.containsKey("bairro")) atual.setBairro(LocalizacaoValidator.texto(utStr(body.get("bairro")), "Bairro", 120));
        if (body.containsKey("logradouro")) atual.setLogradouro(LocalizacaoValidator.texto(utStr(body.get("logradouro")), "Logradouro", 300));
        if (body.containsKey("numero")) atual.setNumero(LocalizacaoValidator.numeroEndereco(utStr(body.get("numero"))));
        if (body.containsKey("solicitantePresente")) atual.setSolicitantePresente(Boolean.parseBoolean(String.valueOf(body.get("solicitantePresente"))));
        if (body.containsKey("cep")) atual.setCep(LocalizacaoValidator.cep(utStr(body.get("cep"))));
        // Coordenadas: prioriza ponto escolhido no mapa
        double[] mapaUpd = coordsMapa(body.get("lat"), body.get("lng"));
        if (mapaUpd != null) { atual.setLat(mapaUpd[0]); atual.setLng(mapaUpd[1]); }
        else {
            double[] coordsUpd = geo.resolver(atual.getCep(), atual.getEstado(), atual.getCidade(), atual.getBairro(), atual.getLogradouro(), atual.getNumero(), atual.getLocal());
            if (coordsUpd != null) { atual.setLat(coordsUpd[0]); atual.setLng(coordsUpd[1]); }
        }
        propostas.atualizar(atual);
        return propostas.buscarPorId(id);
    }

    /** Cidades com oportunidades abertas (para o combo de filtro), opcionalmente por UF. */
    public List<String> cidadesAbertas(String estado) {
        String uf = LocalizacaoValidator.estado(estado);
        return propostas.listarCidadesAbertas(uf);
    }

    public void cancelar(UUID id) {
        Sessao s = Sessao.atual();
        PropostaVoo atual = buscarComGuard(s, id);
        if (!s.ehSolicitante() || !atual.getSolicitanteId().equals(perfis.requerSolicitante(s).getId()))
            throw new RegraNegocioException("PROIBIDO", "Só o autor cancela a proposta");
        if (!"ABERTA".equals(atual.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Propostas aceitas/concluídas não podem ser canceladas");
        propostas.cancelar(id);
    }

    public List<PropostaVoo> minhas() {
        Sessao s = Sessao.atual();
        var perfil = perfis.requerSolicitante(s);
        return propostas.listarPorSolicitante(perfil.getId());
    }

    /** Propostas em que o dronista logado participa (conta enviada ou aceita). */
    public List<PropostaVoo> doDronista() {
        Sessao s = Sessao.atual();
        var perfil = perfis.requerDronista(s);
        return propostas.listarPorDronista(perfil.getId());
    }

    /** Dronista aceita de cara o valor ofertado: fecha o acordo imediatamente no preço do anúncio. */
    @Transactional
    public PropostaVoo aceitarDireto(UUID propostaId) {
        Sessao s = Sessao.atual();
        if (!s.ehDronista()) throw new RegraNegocioException("PROIBIDO", "Apenas dronistas aceitam o valor oferecido");
        var perfil = perfis.requerDronista(s);
        PropostaVoo p = propostas.buscarPorId(propostaId);
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Proposta não encontrada");
        if (!"ABERTA".equals(p.getStatus()))
            throw new RegraNegocioException("PROIBIDO", "Esta proposta não está mais aberta");

        // Contraproposta pendente deste dronista é descartada (ele optou pelo valor ofertado)
        ContaProposta pendente = contas.buscarEnviadaDoDronista(propostaId, perfil.getId());
        if (pendente != null) contas.recusar(pendente.getId());

        ContaProposta c = new ContaProposta();
        c.setId(UUID.randomUUID());
        c.setPropostaId(propostaId);
        c.setDronistaId(perfil.getId());
        c.setValorProposto(p.getValorOferecido());
        c.setMensagem("Aceitação direta do valor ofertado");
        c.setStatus("ACEITA");
        contas.inserirAceita(c);

        int lihas = propostas.aceitar(propostaId, perfil.getId(), c.getId());
        if (lihas == 0)
            throw new RegraNegocioException("PROIBIDO", "Esta proposta acabou de ser aceita por outro dronista");
        propostas.recusarOutrasContas(propostaId, c.getId());
        return propostas.buscarPorId(propostaId);
    }

    public PropostaVoo detalhe(UUID id) {
        Sessao s = Sessao.atual();
        PropostaVoo p = buscarComGuard(s, id);
        calcularDistancias(java.util.List.of(p), s);
        return p;
    }

    /** Visível pelo autor (solicitante), pelo dronista aceito ou por quem tem conta na proposta. */
    private PropostaVoo buscarComGuard(Sessao s, UUID id) {
        PropostaVoo p = propostas.buscarPorId(id);
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Proposta não encontrada");
        if (s.ehAdmin()) return p;
        boolean autor = s.ehSolicitante() && perfis.requerSolicitante(s).getId().equals(p.getSolicitanteId());
        boolean aceito = s.ehDronista() && p.getDronistaId() != null
                && perfis.requerDronista(s).getId().equals(p.getDronistaId());
        boolean participante = s.ehDronista()
                && propostas.listarPorDronista(perfis.requerDronista(s).getId()).stream()
                    .anyMatch(x -> x.getId().equals(id));
        // Marketplace: qualquer dronista pode abrir o detalhe de uma proposta ABERTA
        // (é de lá que envia a própria conta-proposta)
        boolean oportunidadeAberta = s.ehDronista() && "ABERTA".equals(p.getStatus());
        if (!autor && !aceito && !participante && !oportunidadeAberta)
            throw new RegraNegocioException("NAO_ENCONTRADO", "Proposta não encontrada");
        return p;
    }

    public record Pagina(List<PropostaVoo> conteudo, int pagina, int totalPaginas, long totalElementos) {}

    private static final int TAM_PAGINA = 10;

    /** Marketplace paginado, com filtros opcionais por UF e cidade. */
    public Pagina abertas(String estado, String cidade, int page) {
        String uf = LocalizacaoValidator.estado(estado);
        String cid = LocalizacaoValidator.texto(cidade, "Cidade", 120);
        int p = Math.max(0, page);
        long total = propostas.contarAbertas(uf, cid);
        List<PropostaVoo> conteudo = propostas.listarAbertas(uf, cid, TAM_PAGINA, p * TAM_PAGINA);
        calcularDistancias(conteudo, Sessao.atual());
        return new Pagina(conteudo, p, total == 0 ? 0 : (int) Math.ceil((double) total / TAM_PAGINA), total);
    }

    /** Distância (Haversine) da base do dronista logado até cada proposta com coords. */
    private void calcularDistancias(List<PropostaVoo> lista, Sessao s) {
        if (lista == null || lista.isEmpty() || !s.ehDronista()) return;
        try {
            PerfilDronista base = dronistas.buscarPorUsuario(s.getUsuarioId());
            if (base == null || base.getLat() == null || base.getLng() == null) return;
            for (PropostaVoo p : lista) {
                if (p.getLat() != null && p.getLng() != null) {
                    double km = GeocodingService.distanciaKm(base.getLat(), base.getLng(), p.getLat(), p.getLng());
                    p.setDistanciaKm(Math.round(km * 10.0) / 10.0);
                }
            }
        } catch (Exception ignore) {
            // distância é enriquecimento — nunca quebra a listagem
        }
    }

    /** Trim tolerante para valores vindos do JSON. */
    private static String utStr(Object v) { return v == null ? null : v.toString(); }

    // ---------- Validações ----------

    static String campoTexto(Object v, String rotulo, int max, boolean obrigatorio) {
        String t = v == null ? null : v.toString().trim();
        if (t == null || t.isBlank()) {
            if (obrigatorio) throw new RegraNegocioException("CAMPO_OBRIGATORIO", rotulo + " é obrigatório");
            return null;
        }
        if (t.length() > max) throw new RegraNegocioException("CAMPO_INVALIDO", rotulo + " excede " + max + " caracteres");
        return t;
    }

    static LocalDate dataVoo(Object v) {
        String t = v == null ? "" : v.toString().trim();
        if (t.isBlank()) throw new RegraNegocioException("CAMPO_OBRIGATORIO", "Data do voo é obrigatória");
        LocalDate d;
        try { d = LocalDate.parse(t); }
        catch (Exception e) { throw new RegraNegocioException("CAMPO_INVALIDO", "Data do voo inválida (use AAAA-MM-DD)"); }
        if (d.isBefore(LocalDate.now()))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Data do voo não pode ser no passado");
        return d;
    }

    static LocalTime horaVoo(Object v) {
        String t = v == null ? "" : v.toString().trim();
        if (t.isBlank()) throw new RegraNegocioException("CAMPO_OBRIGATORIO", "Hora do voo é obrigatória");
        try { return LocalTime.parse(t); }
        catch (Exception e) { throw new RegraNegocioException("CAMPO_INVALIDO", "Hora do voo inválida (use HH:MM)"); }
    }

    static int duracaoMin(Object v) {
        if (v == null) throw new RegraNegocioException("CAMPO_OBRIGATORIO", "Duração (minutos) é obrigatória");
        int m;
        try { m = Integer.parseInt(v.toString().trim()); }
        catch (Exception e) { throw new RegraNegocioException("CAMPO_INVALIDO", "Duração inválida"); }
        if (m <= 0 || m > 24 * 60)
            throw new RegraNegocioException("CAMPO_INVALIDO", "Duração deve ser entre 1 e 1440 minutos");
        return m;
    }

    static String qualidade(Object v) {
        String t = v == null ? "" : v.toString().trim().toUpperCase();
        if (!QUALIDADES.contains(t))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Qualidade de vídeo inválida: use FULLHD, 2K, 4K_30FPS, 4K_60FPS ou 4K_120FPS");
        return t;
    }

    static Integer fps(Object v) {
        if (v == null || v.toString().isBlank()) return null;
        try {
            int f = Integer.parseInt(v.toString().trim());
            if (!FPS_VALIDOS.contains(f))
                throw new RegraNegocioException("CAMPO_INVALIDO", "FPS deve ser 24, 25, 30, 60 ou 120");
            return f;
        } catch (NumberFormatException e) {
            throw new RegraNegocioException("CAMPO_INVALIDO", "FPS inválido");
        }
    }

    static String formato(Object v) {
        String t = v == null ? "" : v.toString().trim().toUpperCase();
        if (!FORMATOS.contains(t))
            throw new RegraNegocioException("CAMPO_INVALIDO", "Formato inválido: use MP4, MOV, LOG, RAW ou PRORES");
        return t;
    }

    static BigDecimal valor(Object v, String rotulo) {
        if (v == null) throw new RegraNegocioException("CAMPO_OBRIGATORIO", rotulo + " é obrigatório");
        BigDecimal d;
        try { d = new BigDecimal(v.toString().trim().replace(",", ".")); }
        catch (Exception e) { throw new RegraNegocioException("CAMPO_INVALIDO", rotulo + " inválido"); }
        if (d.compareTo(BigDecimal.ZERO) <= 0)
            throw new RegraNegocioException("CAMPO_INVALIDO", rotulo + " deve ser maior que zero");
        return d;
    }
}
