package com.dronistas.mapper;

import com.dronistas.model.ContaProposta;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.UUID;

@Mapper
public interface ContaPropostaMapper {

    @Insert("""
        INSERT INTO conta_proposta (id, proposta_id, dronista_id, valor_proposto, mensagem, status, criado_em)
        VALUES (#{id}, #{propostaId}, #{dronistaId}, #{valorProposto}, #{mensagem}, 'ENVIADA', now())
        """)
    int inserir(ContaProposta c);

    @Select("""
        SELECT cp.*, pd.nome AS nome_dronista, pd.nota_media AS nota_dronista,
               pd.licenca_anac AS licenca_anac_dronista,
               pv.titulo AS titulo_proposta, pv.status AS status_proposta
        FROM conta_proposta cp
        JOIN perfil_dronista pd ON pd.id = cp.dronista_id
        JOIN proposta_voo pv ON pv.id = cp.proposta_id
        WHERE cp.id = #{id}
        """)
    ContaProposta buscarPorId(@Param("id") UUID id);

    @Select("""
        SELECT cp.*, pd.nome AS nome_dronista, pd.nota_media AS nota_dronista,
               pd.licenca_anac AS licenca_anac_dronista,
               pd.cidade AS cidade_dronista, pd.estado AS estado_dronista
        FROM conta_proposta cp
        JOIN perfil_dronista pd ON pd.id = cp.dronista_id
        WHERE cp.proposta_id = #{propostaId}
        ORDER BY cp.valor_proposto, cp.criado_em
        """)
    List<ContaProposta> listarPorProposta(@Param("propostaId") UUID propostaId);

    /** Contas enviadas pelo dronista logado. */
    @Select("""
        SELECT cp.*, pv.titulo AS titulo_proposta, pv.status AS status_proposta,
               pd.nome AS nome_dronista
        FROM conta_proposta cp
        JOIN proposta_voo pv ON pv.id = cp.proposta_id
        JOIN perfil_dronista pd ON pd.id = cp.dronista_id
        WHERE cp.dronista_id = #{dronistaId}
        ORDER BY cp.criado_em DESC
        LIMIT 100
        """)
    List<ContaProposta> listarPorDronista(@Param("dronistaId") UUID dronistaId);

    /** Conta ENVIADA existente do dronista nesta proposta (regra: 1 por dronista). */
    @Select("""
        SELECT * FROM conta_proposta
        WHERE proposta_id = #{propostaId} AND dronista_id = #{dronistaId} AND status = 'ENVIADA'
        LIMIT 1
        """)
    ContaProposta buscarEnviadaDoDronista(@Param("propostaId") UUID propostaId, @Param("dronistaId") UUID dronistaId);

    /** Conta criada pela aceitação direta do dronista (de cara, no valor ofertado). */
    @Insert("""
        INSERT INTO conta_proposta (id, proposta_id, dronista_id, valor_proposto, mensagem, status, criado_em)
        VALUES (#{id}, #{propostaId}, #{dronistaId}, #{valorProposto}, #{mensagem}, 'ACEITA', now())
        """)
    int inserirAceita(ContaProposta c);

    @Update("""
        UPDATE conta_proposta SET valor_proposto = #{valorProposto}, mensagem = #{mensagem}
        WHERE id = #{id} AND status = 'ENVIADA'
        """)
    int atualizar(ContaProposta c);

    @Update("UPDATE conta_proposta SET status = 'ACEITA' WHERE id = #{id} AND status = 'ENVIADA'")
    int aceitar(@Param("id") UUID id);

    @Update("UPDATE conta_proposta SET status = 'RECUSADA' WHERE id = #{id} AND status = 'ENVIADA'")
    int recusar(@Param("id") UUID id);

    @Select("SELECT count(*) FROM conta_proposta WHERE proposta_id = #{propostaId} AND status = 'ENVIADA'")
    long contarEnviadas(@Param("propostaId") UUID propostaId);
}
