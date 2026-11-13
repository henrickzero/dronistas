package com.dronistas.mapper;

import com.dronistas.model.PropostaVoo;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.UUID;

@Mapper
public interface PropostaVooMapper {

    @Insert("""
        INSERT INTO proposta_voo (id, solicitante_id, titulo, descricao, local, data_voo, hora_voo,
                                  duracao_min, qualidade_video, fps, formato_video, valor_oferecido,
                                  estado, cidade, bairro, logradouro, numero, cep, solicitante_presente, lat, lng, status, criado_em)
        VALUES (#{id}, #{solicitanteId}, #{titulo}, #{descricao}, #{local}, #{dataVoo}, #{horaVoo},
                #{duracaoMin}, #{qualidadeVideo}, #{fps}, #{formatoVideo}, #{valorOferecido},
                #{estado}, #{cidade}, #{bairro}, #{logradouro}, #{numero}, #{cep}, #{solicitantePresente}, #{lat}, #{lng}, 'ABERTA', now())
        """)
    int inserir(PropostaVoo p);

    @Select("""
        SELECT pv.*, ps.nome AS nome_solicitante, pd.nome AS nome_dronista,
               (SELECT count(*) FROM conta_proposta cp WHERE cp.proposta_id = pv.id) AS total_contas
        FROM proposta_voo pv
        JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
        LEFT JOIN perfil_dronista pd ON pd.id = pv.dronista_id
        WHERE pv.id = #{id}
        """)
    PropostaVoo buscarPorId(@Param("id") UUID id);

    /** Propostas do solicitante logado, paginadas (canceladas por último). */
    @Select("""
        SELECT pv.*, ps.nome AS nome_solicitante, pd.nome AS nome_dronista,
               (SELECT count(*) FROM conta_proposta cp WHERE cp.proposta_id = pv.id) AS total_contas
        FROM proposta_voo pv
        JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
        LEFT JOIN perfil_dronista pd ON pd.id = pv.dronista_id
        WHERE pv.solicitante_id = #{solicitanteId}
        ORDER BY CASE pv.status WHEN 'CANCELADA' THEN 1 ELSE 0 END, pv.criado_em DESC
        LIMIT #{limit} OFFSET #{offset}
        """)
    List<PropostaVoo> listarPorSolicitante(@Param("solicitanteId") UUID solicitanteId,
                                           @Param("limit") int limit, @Param("offset") int offset);

    @Select("SELECT count(*) FROM proposta_voo WHERE solicitante_id = #{solicitanteId}")
    long contarPorSolicitante(@Param("solicitanteId") UUID solicitanteId);

    /** Marketplace paginado com filtros opcionais: UF e/ou cidade (case-insensitive). */
    @Select("""
        <script>
        SELECT pv.*, ps.nome AS nome_solicitante, pd.nome AS nome_dronista,
               (SELECT count(*) FROM conta_proposta cp WHERE cp.proposta_id = pv.id) AS total_contas
        FROM proposta_voo pv
        JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
        LEFT JOIN perfil_dronista pd ON pd.id = pv.dronista_id
        WHERE pv.status = 'ABERTA'
        <if test="estado != null">AND pv.estado = #{estado}</if>
        <if test="cidade != null">AND lower(pv.cidade) = lower(#{cidade})</if>
        ORDER BY pv.data_voo, pv.criado_em DESC
        LIMIT #{limit} OFFSET #{offset}
        </script>
        """)
    List<PropostaVoo> listarAbertas(@Param("estado") String estado, @Param("cidade") String cidade,
                                    @Param("limit") int limit, @Param("offset") int offset);

    @Select("""
        <script>
        SELECT count(*) FROM proposta_voo pv
        WHERE pv.status = 'ABERTA'
        <if test="estado != null">AND pv.estado = #{estado}</if>
        <if test="cidade != null">AND lower(pv.cidade) = lower(#{cidade})</if>
        </script>
        """)
    long contarAbertas(@Param("estado") String estado, @Param("cidade") String cidade);

    /** Cidades distintas com oportunidades abertas (combo de filtro); agrupadas case-insensitive (min = nome de exibição). */
    @Select("""
        <script>
        SELECT min(cidade)
        FROM proposta_voo
        WHERE status = 'ABERTA' AND cidade IS NOT NULL AND btrim(cidade) != ''
        <if test="estado != null">AND estado = #{estado}</if>
        GROUP BY lower(cidade)
        ORDER BY min(cidade)
        </script>
        """)
    List<String> listarCidadesAbertas(@Param("estado") String estado);

    /** Registros anteriores à V3 sem coordenadas, mas com dados suficientes para geocoding. */
    @Select("""
        SELECT * FROM proposta_voo
        WHERE lat IS NULL AND (cep IS NOT NULL OR (cidade IS NOT NULL AND estado IS NOT NULL))
        ORDER BY criado_em DESC
        LIMIT 25
        """)
    List<PropostaVoo> listarSemCoordenadas();

    @Update("UPDATE proposta_voo SET lat = #{lat}, lng = #{lng} WHERE id = #{id}")
    int atualizarCoordenadas(@Param("id") UUID id, @Param("lat") double lat, @Param("lng") double lng);

    /** Propostas em que o dronista tem conta enviada/aceita (acompanhamento). */
    @Select("""
        SELECT pv.*, ps.nome AS nome_solicitante, pd.nome AS nome_dronista,
               (SELECT count(*) FROM conta_proposta cp WHERE cp.proposta_id = pv.id) AS total_contas,
               cp.status AS status_da_minha_conta
        FROM proposta_voo pv
        JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
        LEFT JOIN perfil_dronista pd ON pd.id = pv.dronista_id
        JOIN conta_proposta cp ON cp.proposta_id = pv.id AND cp.dronista_id = #{dronistaId}
        ORDER BY pv.criado_em DESC
        LIMIT 100
        """)
    List<PropostaVoo> listarPorDronista(@Param("dronistaId") UUID dronistaId);

    @Update("""
        UPDATE proposta_voo
        SET titulo = #{titulo}, descricao = #{descricao}, local = #{local},
            data_voo = #{dataVoo}, hora_voo = #{horaVoo}, duracao_min = #{duracaoMin},
            qualidade_video = #{qualidadeVideo}, fps = #{fps}, formato_video = #{formatoVideo},
            valor_oferecido = #{valorOferecido}, estado = #{estado}, cidade = #{cidade},
            bairro = #{bairro}, logradouro = #{logradouro}, numero = #{numero}, cep = #{cep},
            solicitante_presente = #{solicitantePresente},
            lat = COALESCE(#{lat}, lat), lng = COALESCE(#{lng}, lng)
        WHERE id = #{id} AND status = 'ABERTA'
        """)
    int atualizar(PropostaVoo p);

    @Update("UPDATE proposta_voo SET status = 'CANCELADA' WHERE id = #{id} AND status = 'ABERTA'")
    int cancelar(@Param("id") UUID id);

    @Update("""
        UPDATE proposta_voo SET status = 'ACEITA', dronista_id = #{dronistaId}, conta_aceita_id = #{contaId}
        WHERE id = #{id} AND status = 'ABERTA'
        """)
    int aceitar(@Param("id") UUID id, @Param("dronistaId") UUID dronistaId, @Param("contaId") UUID contaId);

    @Update("UPDATE proposta_voo SET status = 'CONCLUIDA' WHERE id = #{id} AND status = 'ACEITA'")
    int concluir(@Param("id") UUID id);

    @Select("""
        SELECT count(*) FROM conta_proposta
        WHERE proposta_id = #{id} AND status = 'ENVIADA'
        """)
    long contarContasAbertas(@Param("id") UUID id);

    /** Recusa automaticamente todas as outras contas ENVIADA da proposta. */
    @Update("""
        UPDATE conta_proposta SET status = 'RECUSADA'
        WHERE proposta_id = #{propostaId} AND status = 'ENVIADA' AND id <> #{contaAceitaId}
        """)
    int recusarOutrasContas(@Param("propostaId") UUID propostaId, @Param("contaAceitaId") UUID contaAceitaId);
}
