package com.dronistas.service;

import com.dronistas.mapper.UsuarioMapper;
import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.mapper.PerfilSolicitanteMapper;
import com.dronistas.model.Usuario;
import com.dronistas.model.PerfilDronista;
import com.dronistas.model.PerfilSolicitante;
import com.dronistas.security.DocumentoValidator;
import com.dronistas.security.LocalizacaoValidator;
import com.dronistas.security.JwtService;
import com.dronistas.service.GeocodingService;
import com.dronistas.security.RegraNegocioException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthService {

    /** Registro: papel DRONISTA|SOLICITANTE, com dados do perfil embutidos. */
    public record RegistroRequest(String nome, String email, String senha, String telefone,
                                  String papel, String bio, String cnpjCpf, String licencaAnac, String empresa,
                                  String estado, String cidade, String bairro, String cep,
                                  String logradouro, String numero,
                                  String tipoPessoa, String pixTipo, String pixChave,
                                  String banco, String agencia, String conta, String tipoConta,
                                  String documentoFotoUrl) {}
    public record LoginRequest(String email, String senha) {}
    public record AuthResponse(String token, String papel, String usuarioId) {}

    private final UsuarioMapper usuarios;
    private final PerfilDronistaMapper dronistas;
    private final PerfilSolicitanteMapper solicitantes;
    private final DocumentoValidator documentos;
    private final GeocodingService geo;
    private final JwtService jwt;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AuthService(UsuarioMapper usuarios, PerfilDronistaMapper dronistas,
                       PerfilSolicitanteMapper solicitantes, DocumentoValidator documentos,
                       GeocodingService geo, JwtService jwt) {
        this.usuarios = usuarios;
        this.dronistas = dronistas;
        this.solicitantes = solicitantes;
        this.documentos = documentos;
        this.geo = geo;
        this.jwt = jwt;
    }

    @Transactional
    public AuthResponse registrar(RegistroRequest r) {
        if (r.nome() == null || r.nome().isBlank())
            throw new RegraNegocioException("CAMPO_OBRIGATORIO", "Nome é obrigatório");
        if (r.email() == null || !r.email().matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$"))
            throw new RegraNegocioException("CAMPO_INVALIDO", "E-mail inválido");
        if (r.senha() == null || r.senha().length() < 8)
            throw new RegraNegocioException("SENHA_FRACA", "Senha deve ter ao menos 8 caracteres");
        String papel = r.papel() == null ? "" : r.papel().toUpperCase();
        if (!papel.equals("DRONISTA") && !papel.equals("SOLICITANTE"))
            throw new RegraNegocioException("PAPEL_INVALIDO", "Papel deve ser DRONISTA ou SOLICITANTE");

        if (usuarios.contarPorEmail(r.email()) > 0)
            throw new RegraNegocioException("EMAIL_DUPLICADO", "E-mail já cadastrado");

        Usuario u = new Usuario();
        u.setId(UUID.randomUUID());
        u.setNome(r.nome().trim());
        u.setEmail(r.email().trim());
        u.setSenhaHash(encoder.encode(r.senha()));
        u.setPapel(papel);
        usuarios.inserir(u);

        if (papel.equals("DRONISTA")) {
            String doc = DocumentoValidator.normalizar(r.cnpjCpf());
            if (doc.isEmpty())
                throw new RegraNegocioException("CAMPO_OBRIGATORIO", "CPF/CNPJ é obrigatório para dronistas");
            if (!documentos.isValido(doc))
                throw new RegraNegocioException("DOCUMENTO_INVALIDO", "CPF/CNPJ inválido");

            // Passo 1 do onboarding: "Autônomo (CPF) ou Empresa/MEI (CNPJ)?" — coerência com o documento
            String tipoPessoa = r.tipoPessoa() == null ? "" : r.tipoPessoa().trim().toUpperCase();
            if (!tipoPessoa.isEmpty() && !tipoPessoa.equals("CPF") && !tipoPessoa.equals("CNPJ"))
                throw new RegraNegocioException("CAMPO_INVALIDO", "Forma de atuação inválida (Autônomo ou Empresa/MEI)");
            if (tipoPessoa.equals("CPF") && doc.length() != 11)
                throw new RegraNegocioException("CAMPO_INVALIDO",
                        "Você escolheu Autônomo (CPF), mas o documento informado é um CNPJ — corrija antes de continuar");
            if (tipoPessoa.equals("CNPJ") && doc.length() != 14)
                throw new RegraNegocioException("CAMPO_INVALIDO",
                        "Você escolheu Empresa/MEI (CNPJ), mas o documento informado é um CPF — corrija antes de continuar");

            // Passo 2: dados para repasse (Pix/banco) com trava de titularidade
            RepasseValidator.validarPix(r.pixTipo(), r.pixChave(), doc);
            RepasseValidator.validarBanco(r.banco(), r.agencia(), r.conta(), r.tipoConta());

            // Passo 3: validação de identidade (link do documento — opcional no cadastro)
            String foto = r.documentoFotoUrl() == null ? null : r.documentoFotoUrl().trim();
            if (foto != null && !foto.isBlank() && !foto.matches("^(https?://).+"))
                throw new RegraNegocioException("CAMPO_INVALIDO", "Link do documento inválido (http/https)");

            PerfilDronista p = new PerfilDronista();
            p.setId(UUID.randomUUID());
            p.setUsuarioId(u.getId());
            p.setNome(u.getNome());
            p.setTelefone(r.telefone());
            p.setBio(r.bio());
            p.setCnpjCpf(doc);
            p.setLicencaAnac(r.licencaAnac());
            p.setEstado(LocalizacaoValidator.estado(r.estado()));
            p.setCidade(LocalizacaoValidator.texto(r.cidade(), "Cidade", 120));
            p.setBairro(LocalizacaoValidator.texto(r.bairro(), "Bairro", 120));
            p.setCep(LocalizacaoValidator.cep(r.cep()));
            p.setLogradouro(LocalizacaoValidator.texto(r.logradouro(), "Logradouro", 300));
            p.setNumero(LocalizacaoValidator.numeroEndereco(r.numero()));
            p.setPixTipo(r.pixTipo() == null || r.pixTipo().isBlank() ? null : r.pixTipo().trim().toUpperCase());
            p.setPixChave(r.pixChave() == null || r.pixChave().isBlank() ? null : r.pixChave().trim());
            p.setBanco(r.banco());
            p.setAgencia(r.agencia());
            p.setConta(r.conta());
            p.setTipoConta(r.tipoConta() == null || r.tipoConta().isBlank() ? null : r.tipoConta().trim().toUpperCase());
            p.setDocumentoFotoUrl(foto == null || foto.isBlank() ? null : foto);
            if (foto != null && !foto.isBlank()) p.setValidacaoDoc("ENVIADA");
            double[] coords = geo.resolver(p.getCep(), p.getEstado(), p.getCidade(), p.getBairro(), p.getLogradouro(), p.getNumero(), null);
            if (coords != null) { p.setLat(coords[0]); p.setLng(coords[1]); }
            p.setNotaMedia(null);
            p.setTrabalhosConcluidos(0);
            dronistas.inserir(p);
        } else {
            String doc = DocumentoValidator.normalizar(r.cnpjCpf());
            if (!doc.isEmpty() && !documentos.isValido(doc))
                throw new RegraNegocioException("DOCUMENTO_INVALIDO", "CPF/CNPJ inválido");
            PerfilSolicitante p = new PerfilSolicitante();
            p.setId(UUID.randomUUID());
            p.setUsuarioId(u.getId());
            p.setNome(u.getNome());
            p.setTelefone(r.telefone());
            p.setEmpresa(r.empresa());
            p.setCnpjCpf(doc.isEmpty() ? null : doc);
            p.setNotaMedia(null);
            p.setContratacoes(0);
            solicitantes.inserir(p);
        }

        return new AuthResponse(jwt.emitir(u.getId(), papel), papel, u.getId().toString());
    }

    public AuthResponse login(LoginRequest r) {
        if (r.email() == null || r.senha() == null)
            throw new RegraNegocioException("CREDENCIAIS_INVALIDAS", "E-mail ou senha inválidos");
        Usuario u = usuarios.buscarPorEmail(r.email());
        if (u == null || !encoder.matches(r.senha(), u.getSenhaHash()))
            throw new RegraNegocioException("CREDENCIAIS_INVALIDAS", "E-mail ou senha inválidos");
        return new AuthResponse(jwt.emitir(u.getId(), u.getPapel()), u.getPapel(), u.getId().toString());
    }
}
