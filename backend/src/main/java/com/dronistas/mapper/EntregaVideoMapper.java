package com.dronistas.mapper;

import com.dronistas.model.EntregaVideo;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.UUID;

@Mapper
public interface EntregaVideoMapper {

    @Insert("""
        INSERT INTO entrega_video (id, conta_id, url_video, observacao, status, criado_em)
        VALUES (#{id}, #{contaId}, #{urlVideo}, #{observacao}, 'ENVIADA', now())
        """)
    int inserir(EntregaVideo e);

    @Select("""
        SELECT ev.*, pv.titulo AS titulo_proposta, pd.nome AS nome_dronista,
               ps.nome AS nome_solicitante, cp.valor_proposto::text AS valor_proposto
        FROM entrega_video ev
        JOIN conta_proposta cp ON cp.id = ev.conta_id
        JOIN proposta_voo pv ON pv.id = cp.proposta_id
        JOIN perfil_dronista pd ON pd.id = cp.dronista_id
        JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
        WHERE ev.id = #{id}
        """)
    EntregaVideo buscarPorId(@Param("id") UUID id);

    /** Última entrega de uma conta (reenvio sobrescreve visualmente). */
    @Select("""
        SELECT ev.*, pv.titulo AS titulo_proposta, pd.nome AS nome_dronista,
               ps.nome AS nome_solicitante, cp.valor_proposto::text AS valor_proposto
        FROM entrega_video ev
        JOIN conta_proposta cp ON cp.id = ev.conta_id
        JOIN proposta_voo pv ON pv.id = cp.proposta_id
        JOIN perfil_dronista pd ON pd.id = cp.dronista_id
        JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
        WHERE ev.conta_id = #{contaId}
        ORDER BY ev.criado_em DESC
        LIMIT 1
        """)
    EntregaVideo buscarUltimaPorConta(@Param("contaId") UUID contaId);

    /** Entregas relevantes para o solicitante logado (suas propostas). */
    @Select("""
        SELECT ev.*, pv.titulo AS titulo_proposta, pd.nome AS nome_dronista,
               ps.nome AS nome_solicitante, cp.valor_proposto::text AS valor_proposto
        FROM entrega_video ev
        JOIN conta_proposta cp ON cp.id = ev.conta_id
        JOIN proposta_voo pv ON pv.id = cp.proposta_id
        JOIN perfil_dronista pd ON pd.id = cp.dronista_id
        JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
        WHERE pv.solicitante_id = #{solicitanteId}
        ORDER BY ev.criado_em DESC
        LIMIT 100
        """)
    List<EntregaVideo> listarPorSolicitante(@Param("solicitanteId") UUID solicitanteId);

    /** Entregas enviadas pelo dronista logado. */
    @Select("""
        SELECT ev.*, pv.titulo AS titulo_proposta, pd.nome AS nome_dronista,
               ps.nome AS nome_solicitante, cp.valor_proposto::text AS valor_proposto
        FROM entrega_video ev
        JOIN conta_proposta cp ON cp.id = ev.conta_id
        JOIN proposta_voo pv ON pv.id = cp.proposta_id
        JOIN perfil_dronista pd ON pd.id = cp.dronista_id
        JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
        WHERE cp.dronista_id = #{dronistaId}
        ORDER BY ev.criado_em DESC
        LIMIT 100
        """)
    List<EntregaVideo> listarPorDronista(@Param("dronistaId") UUID dronistaId);

    @Update("""
        UPDATE entrega_video SET url_video = #{urlVideo}, observacao = #{observacao}, status = 'ENVIADA'
        WHERE id = #{id} AND status IN ('ENVIADA', 'REJEITADA')
        """)
    int reenviar(@Param("id") UUID id, @Param("urlVideo") String urlVideo, @Param("observacao") String observacao);

    @Update("UPDATE entrega_video SET status = 'APROVADA' WHERE id = #{id} AND status = 'ENVIADA'")
    int aprovar(@Param("id") UUID id);

    @Update("UPDATE entrega_video SET status = 'REJEITADA' WHERE id = #{id} AND status = 'ENVIADA'")
    int recusar(@Param("id") UUID id);

    @Update("""
        UPDATE entrega_video SET nota = #{nota}, comentario = #{comentario}
        WHERE id = #{id} AND nota IS NULL
        """)
    int avaliar(@Param("id") UUID id, @Param("nota") int nota, @Param("comentario") String comentario);

    @Update("""
        UPDATE entrega_video SET nota_solicitante = #{nota}, comentario_solicitante = #{comentario}
        WHERE id = #{id} AND nota_solicitante IS NULL
        """)
    int avaliarSolicitante(@Param("id") UUID id, @Param("nota") int nota, @Param("comentario") String comentario);

    /** Marca dronista_id extraído do join via alias — MyBatis mapeia o campo extra pelo alias. */
    @Select("""
        SELECT cp.dronista_id
        FROM entrega_video ev
        JOIN conta_proposta cp ON cp.id = ev.conta_id
        WHERE ev.id = #{id}
        """)
    UUID buscarDronistaDaEntrega(@Param("id") UUID id);

    @Select("""
        SELECT pv.solicitante_id
        FROM entrega_video ev
        JOIN conta_proposta cp ON cp.id = ev.conta_id
        JOIN proposta_voo pv ON pv.id = cp.proposta_id
        WHERE ev.id = #{id}
        """)
    UUID buscarSolicitanteDaEntrega(@Param("id") UUID id);

    /** PropostaId da entrega. */
    @Select("""
        SELECT cp.proposta_id
        FROM entrega_video ev
        JOIN conta_proposta cp ON cp.id = ev.conta_id
        WHERE ev.id = #{id}
        """)
    UUID buscarPropostaDaEntrega(@Param("id") UUID id);

    /** ContaId -> proposta (para fluxo de entrega pela conta). */
    @Select("""
        SELECT cp.proposta_id FROM conta_proposta cp WHERE cp.id = #{contaId}
        """)
    UUID buscarPropostaDaConta(@Param("contaId") UUID contaId);
}
