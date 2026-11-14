package com.dronistas.mapper;

import com.dronistas.model.RascunhoArquivo;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.UUID;

@Mapper
public interface RascunhoArquivoMapper {

    @Insert("""
        INSERT INTO entrega_rascunho_arquivo (id, conta_id, dronista_id, nome_original, url, chave_s3, tamanho, content_type, criado_em)
        VALUES (#{id}, #{contaId}, #{dronistaId}, #{nomeOriginal}, #{url}, #{chaveS3}, #{tamanho}, #{contentType}, now())
        """)
    int inserir(RascunhoArquivo r);

    @Select("""
        SELECT * FROM entrega_rascunho_arquivo WHERE conta_id = #{contaId} ORDER BY criado_em
        """)
    List<RascunhoArquivo> listarPorConta(@Param("contaId") UUID contaId);

    @Select("""
        SELECT r.* FROM entrega_rascunho_arquivo r
        JOIN perfil_dronista pd ON pd.id = r.dronista_id
        WHERE r.id = #{id} AND pd.usuario_id = #{usuarioId}
        """)
    RascunhoArquivo buscarDoUsuario(@Param("id") UUID id, @Param("usuarioId") UUID usuarioId);

    @Select("SELECT COUNT(*) FROM entrega_rascunho_arquivo WHERE conta_id = #{contaId}")
    long contarPorConta(@Param("contaId") UUID contaId);

    @Delete("DELETE FROM entrega_rascunho_arquivo WHERE id = #{id}")
    int excluir(@Param("id") UUID id);

    @Delete("DELETE FROM entrega_rascunho_arquivo WHERE conta_id = #{contaId}")
    int excluirTodosPorConta(@Param("contaId") UUID contaId);
}
