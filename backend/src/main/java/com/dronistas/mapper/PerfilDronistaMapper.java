package com.dronistas.mapper;

import com.dronistas.model.PerfilDronista;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.UUID;

@Mapper
public interface PerfilDronistaMapper {

    @Select("SELECT * FROM perfil_dronista WHERE usuario_id = #{usuarioId} AND ativo")
    PerfilDronista buscarPorUsuario(@Param("usuarioId") UUID usuarioId);

    @Select("SELECT * FROM perfil_dronista WHERE id = #{id} AND ativo")
    PerfilDronista buscarPorId(@Param("id") UUID id);

    /** Fila de validação de identidade (admin): um status, ordenado pelo mais recente. */
    @Select("""
        SELECT * FROM perfil_dronista
        WHERE ativo AND validacao_doc = #{status}
        ORDER BY criado_em DESC
        LIMIT 100
        """)
    List<PerfilDronista> listarPorValidacao(@Param("status") String status);

    @Insert("""
        INSERT INTO perfil_dronista (id, usuario_id, nome, telefone, bio, cnpj_cpf, licenca_anac,
                                     estado, cidade, bairro, cep, logradouro, numero, lat, lng,
                                     pix_tipo, pix_chave, banco, agencia, conta, tipo_conta,
                                     documento_foto_url, documento_verso_url, validacao_doc, ativo, criado_em)
        VALUES (#{id}, #{usuarioId}, #{nome}, #{telefone}, #{bio}, #{cnpjCpf}, #{licencaAnac},
                #{estado}, #{cidade}, #{bairro}, #{cep}, #{logradouro}, #{numero}, #{lat}, #{lng},
                #{pixTipo}, #{pixChave}, #{banco}, #{agencia}, #{conta}, #{tipoConta},
                #{documentoFotoUrl}, #{documentoVersoUrl}, COALESCE(#{validacaoDoc}, 'PENDENTE'), TRUE, now())
        """)
    int inserir(PerfilDronista p);

    @Update("""
        UPDATE perfil_dronista
        SET nome = #{nome}, telefone = #{telefone}, bio = #{bio},
            cnpj_cpf = COALESCE(#{cnpjCpf}, cnpj_cpf), licenca_anac = COALESCE(#{licencaAnac}, licenca_anac),
            estado = COALESCE(#{estado}, estado), cidade = COALESCE(#{cidade}, cidade),
            bairro = COALESCE(#{bairro}, bairro), cep = COALESCE(#{cep}, cep),
            logradouro = COALESCE(#{logradouro}, logradouro), numero = COALESCE(#{numero}, numero),
            lat = COALESCE(#{lat}, lat), lng = COALESCE(#{lng}, lng),
            pix_tipo = COALESCE(#{pixTipo}, pix_tipo), pix_chave = COALESCE(#{pixChave}, pix_chave),
            banco = COALESCE(#{banco}, banco), agencia = COALESCE(#{agencia}, agencia),
            conta = COALESCE(#{conta}, conta), tipo_conta = COALESCE(#{tipoConta}, tipo_conta),
            documento_foto_url = COALESCE(#{documentoFotoUrl}, documento_foto_url),
            documento_verso_url = COALESCE(#{documentoVersoUrl}, documento_verso_url),
            validacao_doc = COALESCE(#{validacaoDoc}, validacao_doc)
        WHERE id = #{id} AND ativo
        """)
    int atualizar(PerfilDronista p);

    /** Recalcula a média a partir das notas registradas nas entregas; chamado ao avaliar. */
    @Update("""
        UPDATE perfil_dronista p
        SET nota_media = (
            SELECT round(avg(ev.nota)::numeric, 2)
            FROM entrega_video ev
            JOIN conta_proposta cp ON cp.id = ev.conta_id
            WHERE cp.dronista_id = p.id AND ev.nota IS NOT NULL
        )
        WHERE p.id = #{id}
        """)
    int recalcularNota(@Param("id") UUID id);

    @Update("UPDATE perfil_dronista SET trabalhos_concluidos = trabalhos_concluidos + 1 WHERE id = #{id}")
    int incrementarTrabalhos(@Param("id") UUID id);

    @Select("""
        SELECT p.id, p.nome, p.licenca_anac, p.nota_media, p.trabalhos_concluidos,
               p.estado, p.cidade
        FROM perfil_dronista p
        WHERE p.ativo
        ORDER BY p.nota_media DESC NULLS LAST, p.trabalhos_concluidos DESC, p.nome
        LIMIT 50
        """)
    List<PerfilDronista> ranking();

    /** Perfis anteriores à V3 sem coordenadas, mas com CEP ou cidade/UF informados. */
    @Select("""
        SELECT * FROM perfil_dronista
        WHERE lat IS NULL AND ativo AND (cep IS NOT NULL OR (cidade IS NOT NULL AND estado IS NOT NULL))
        ORDER BY criado_em DESC
        LIMIT 25
        """)
    List<PerfilDronista> listarSemCoordenadas();

    @Update("UPDATE perfil_dronista SET lat = #{lat}, lng = #{lng} WHERE id = #{id}")
    int atualizarCoordenadas(@Param("id") UUID id, @Param("lat") double lat, @Param("lng") double lng);
}
