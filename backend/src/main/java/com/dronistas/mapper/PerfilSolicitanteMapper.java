package com.dronistas.mapper;

import com.dronistas.model.PerfilSolicitante;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.UUID;

@Mapper
public interface PerfilSolicitanteMapper {

    @Select("SELECT * FROM perfil_solicitante WHERE usuario_id = #{usuarioId} AND ativo")
    PerfilSolicitante buscarPorUsuario(@Param("usuarioId") UUID usuarioId);

    @Select("SELECT * FROM perfil_solicitante WHERE id = #{id} AND ativo")
    PerfilSolicitante buscarPorId(@Param("id") UUID id);

    @Insert("""
        INSERT INTO perfil_solicitante (id, usuario_id, nome, telefone, empresa, cnpj_cpf, ativo, criado_em)
        VALUES (#{id}, #{usuarioId}, #{nome}, #{telefone}, #{empresa}, #{cnpjCpf}, TRUE, now())
        """)
    int inserir(PerfilSolicitante p);

    @Update("""
        UPDATE perfil_solicitante
        SET nome = #{nome}, telefone = #{telefone}, empresa = COALESCE(#{empresa}, empresa),
            cnpj_cpf = COALESCE(#{cnpjCpf}, cnpj_cpf)
        WHERE id = #{id} AND ativo
        """)
    int atualizar(PerfilSolicitante p);

    @Update("UPDATE perfil_solicitante SET contratacoes = contratacoes + 1 WHERE id = #{id}")
    int incrementarContratacoes(@Param("id") UUID id);

    @Update("""
        UPDATE perfil_solicitante p
        SET nota_media = (
            SELECT round(avg(ev.nota_solicitante)::numeric, 2)
            FROM entrega_video ev
            JOIN conta_proposta cp ON cp.id = ev.conta_id
            JOIN proposta_voo pv ON pv.id = cp.proposta_id
            JOIN perfil_solicitante ps ON ps.id = pv.solicitante_id
            WHERE ps.id = p.id AND ev.nota_solicitante IS NOT NULL
        )
        WHERE p.id = #{id}
        """)
    int recalcularNota(@Param("id") UUID id);

    @Select("""
        SELECT p.id, p.nome, p.empresa, p.nota_media, p.contratacoes
        FROM perfil_solicitante p
        WHERE p.ativo
        ORDER BY p.nota_media DESC NULLS LAST, p.contratacoes DESC, p.nome
        LIMIT 50
        """)
    List<PerfilSolicitante> ranking();
}
