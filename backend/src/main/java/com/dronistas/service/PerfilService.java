package com.dronistas.service;

import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.mapper.PerfilSolicitanteMapper;
import com.dronistas.model.PerfilDronista;
import com.dronistas.model.PerfilSolicitante;
import com.dronistas.security.RegraNegocioException;
import com.dronistas.security.Sessao;
import org.springframework.stereotype.Service;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
public class PerfilService {

    private final PerfilDronistaMapper dronistas;
    private final PerfilSolicitanteMapper solicitantes;
    private final GeocodingService geo;

    public PerfilService(PerfilDronistaMapper dronistas, PerfilSolicitanteMapper solicitantes, GeocodingService geo) {
        this.dronistas = dronistas;
        this.solicitantes = solicitantes;
        this.geo = geo;
    }

    /** Perfil do usuário logado; ADMIN recebe um resumo sem perfil. */
    public Map<String, Object> meuPerfil() {
        Sessao s = Sessao.atual();
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("usuarioId", s.getUsuarioId().toString());
        out.put("papel", s.getPapel());
        if (s.ehDronista()) {
            PerfilDronista p = requerDronista(s);
            out.put("perfilId", p.getId().toString());
            out.put("nome", p.getNome());
            out.put("telefone", p.getTelefone());
            out.put("bio", p.getBio());
            out.put("cnpjCpf", p.getCnpjCpf());
            out.put("licencaAnac", p.getLicencaAnac());
            out.put("estado", p.getEstado());
            out.put("cidade", p.getCidade());
            out.put("bairro", p.getBairro());
            out.put("cep", p.getCep());
            out.put("logradouro", p.getLogradouro());
            out.put("numero", p.getNumero());
            out.put("notaMedia", p.getNotaMedia());
            out.put("trabalhosConcluidos", p.getTrabalhosConcluidos());
            // Repasse + validação de identidade (dados do próprio dronista)
            out.put("pixTipo", p.getPixTipo());
            out.put("pixChave", p.getPixChave());
            out.put("banco", p.getBanco());
            out.put("agencia", p.getAgencia());
            out.put("conta", p.getConta());
            out.put("tipoConta", p.getTipoConta());
            out.put("documentoFotoUrl", p.getDocumentoFotoUrl());
            out.put("validacaoDoc", p.getValidacaoDoc());
            out.put("validacaoDocPendente",
                    p.getValidacaoDoc() == null || "PENDENTE".equals(p.getValidacaoDoc()));
        } else if (s.ehSolicitante()) {
            PerfilSolicitante p = requerSolicitante(s);
            out.put("perfilId", p.getId().toString());
            out.put("nome", p.getNome());
            out.put("telefone", p.getTelefone());
            out.put("empresa", p.getEmpresa());
            out.put("notaMedia", p.getNotaMedia());
            out.put("contratacoes", p.getContratacoes());
        } else {
            out.put("nome", "Administrador");
        }
        return out;
    }

    @SuppressWarnings("unchecked")
    public Map<String, Object> atualizarMeuPerfil(Map<String, Object> body) {
        Sessao s = Sessao.atual();
        if (s.ehDronista()) {
            PerfilDronista p = requerDronista(s);
            if (body.get("nome") != null && !body.get("nome").toString().isBlank()) p.setNome(body.get("nome").toString());
            if (body.get("telefone") != null) p.setTelefone(body.get("telefone").toString());
            if (body.get("bio") != null) p.setBio(body.get("bio").toString());
            if (body.get("licencaAnac") != null) p.setLicencaAnac(body.get("licencaAnac").toString());
            if (body.containsKey("estado")) p.setEstado(com.dronistas.security.LocalizacaoValidator.estado(str(body.get("estado"))));
            if (body.containsKey("cidade")) p.setCidade(com.dronistas.security.LocalizacaoValidator.texto(str(body.get("cidade")), "Cidade", 120));
            if (body.containsKey("bairro")) p.setBairro(com.dronistas.security.LocalizacaoValidator.texto(str(body.get("bairro")), "Bairro", 120));
            if (body.containsKey("cep")) p.setCep(com.dronistas.security.LocalizacaoValidator.cep(str(body.get("cep"))));
            if (body.containsKey("logradouro"))
                p.setLogradouro(com.dronistas.security.LocalizacaoValidator.texto(str(body.get("logradouro")), "Logradouro", 300));
            if (body.containsKey("numero"))
                p.setNumero(com.dronistas.security.LocalizacaoValidator.numeroEndereco(str(body.get("numero"))));
            // Passo 2 (repasse) e Passo 3 (validação) via perfil — mesma validação do cadastro
            String pixTipoNovo = body.containsKey("pixTipo")
                    ? (str(body.get("pixTipo")) == null || str(body.get("pixTipo")).isBlank()
                        ? null : str(body.get("pixTipo")).trim().toUpperCase()) : null;
            String pixChaveNova = body.containsKey("pixChave")
                    ? (str(body.get("pixChave")) == null || str(body.get("pixChave")).isBlank()
                        ? null : str(body.get("pixChave")).trim()) : null;
            String docAtual = com.dronistas.security.DocumentoValidator.normalizar(p.getCnpjCpf());
            RepasseValidator.validarPix(pixTipoNovo != null ? pixTipoNovo : p.getPixTipo(),
                    pixChaveNova != null ? pixChaveNova : p.getPixChave(), docAtual);
            if (pixTipoNovo != null) p.setPixTipo(pixTipoNovo);
            if (pixChaveNova != null) p.setPixChave(pixChaveNova);
            String bancoNovo = str(body.get("banco")) == null ? p.getBanco() : str(body.get("banco"));
            String agenciaNova = str(body.get("agencia")) == null ? p.getAgencia() : str(body.get("agencia"));
            String contaNova = str(body.get("conta")) == null ? p.getConta() : str(body.get("conta"));
            String tipoContaNova = str(body.get("tipoConta")) == null || str(body.get("tipoConta")).isBlank()
                    ? p.getTipoConta() : str(body.get("tipoConta")).trim().toUpperCase();
            RepasseValidator.validarBanco(bancoNovo, agenciaNova, contaNova, tipoContaNova);
            if (body.containsKey("banco")) p.setBanco(bancoNovo);
            if (body.containsKey("agencia")) p.setAgencia(agenciaNova);
            if (body.containsKey("conta")) p.setConta(contaNova);
            if (body.containsKey("tipoConta")) p.setTipoConta(tipoContaNova == null || tipoContaNova.isBlank() ? null : tipoContaNova);
            String fotoNova = str(body.get("documentoFotoUrl"));
            if (fotoNova != null && !fotoNova.isBlank()) {
                if (!fotoNova.trim().matches("^(https?://).+"))
                    throw new RegraNegocioException("CAMPO_INVALIDO", "Link do documento inválido (http/https)");
                p.setDocumentoFotoUrl(fotoNova.trim());
                p.setValidacaoDoc("ENVIADA");
            }
            // Regeocodifica quando qualquer campo de localização muda (opcional, sem quebrar a save)
            if (body.containsKey("estado") || body.containsKey("cidade") || body.containsKey("cep")
                    || body.containsKey("logradouro") || body.containsKey("numero")) {
                double[] coords = geo.resolver(p.getCep(), p.getEstado(), p.getCidade(), p.getBairro(),
                        p.getLogradouro(), p.getNumero(), null);
                if (coords != null) { p.setLat(coords[0]); p.setLng(coords[1]); }
            }
            dronistas.atualizar(p);
        } else if (s.ehSolicitante()) {
            PerfilSolicitante p = requerSolicitante(s);
            if (body.get("nome") != null && !body.get("nome").toString().isBlank()) p.setNome(body.get("nome").toString());
            if (body.get("telefone") != null) p.setTelefone(body.get("telefone").toString());
            if (body.get("empresa") != null) p.setEmpresa(body.get("empresa").toString());
            solicitantes.atualizar(p);
        } else {
            throw new RegraNegocioException("PROIBIDO", "Admin não possui perfil");
        }
        return meuPerfil();
    }

    private static String str(Object v) { return v == null ? null : v.toString(); }

    public PerfilDronista requerDronista(Sessao s) {
        PerfilDronista p = dronistas.buscarPorUsuario(s.getUsuarioId());
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil de dronista não encontrado");
        return p;
    }

    public PerfilSolicitante requerSolicitante(Sessao s) {
        PerfilSolicitante p = solicitantes.buscarPorUsuario(s.getUsuarioId());
        if (p == null) throw new RegraNegocioException("NAO_ENCONTRADO", "Perfil de solicitante não encontrado");
        return p;
    }
}
