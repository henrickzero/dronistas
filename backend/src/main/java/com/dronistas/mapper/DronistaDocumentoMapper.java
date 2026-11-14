package com.dronistas.mapper;

import com.dronistas.model.DronistaDocumento;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.UUID;

@Mapper
public interface DronistaDocumentoMapper {

    @Insert("""
        INSERT INTO dronista_documento (id, dronista_id, nome_original, url, chave_s3, tamanho, content_type, criado_em)
        VALUES (#{id}, #{dronistaId}, #{nomeOriginal}, #{url}, #{chaveS3}, #{tamanho}, #{contentType}, now())
        """)
    int inserir(DronistaDocumento d);

    @Select("""
        SELECT * FROM dronista_documento WHERE dronista_id = #{dronistaId} ORDER BY criado_em
        """)
    List<DronistaDocumento> listarPorDronista(@Param("dronistaId") UUID dronistaId);

    @Select("""
        SELECT d.* FROM dronista_documento d
        JOIN perfil_dronista pd ON pd.id = d.dronista_id
        WHERE d.id = #{id} AND pd.usuario_id = #{usuarioId}
        """)
    DronistaDocumento buscarDoUsuario(@Param("id") UUID id, @Param("usuarioId") UUID usuarioId);

    @Select("""
        SELECT d.* FROM dronista_documento d
        JOIN perfil_dronista pd ON pd.id = d.dronista_id
        WHERE d.id = #{id}
        """)
    DronistaDocumento buscarPorId(@Param("id") UUID id);

    @Delete("DELETE FROM dronista_documento WHERE id = #{id}")
    int excluir(@Param("id") UUID id);
}
