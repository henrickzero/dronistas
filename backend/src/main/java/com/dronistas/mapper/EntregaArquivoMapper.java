package com.dronistas.mapper;

import com.dronistas.model.EntregaArquivo;
import org.apache.ibatis.annotations.*;
import java.util.List;
import java.util.UUID;

@Mapper
public interface EntregaArquivoMapper {

    @Insert("""
        INSERT INTO entrega_video_arquivo (id, entrega_id, nome_original, url, chave_s3, tamanho, content_type, ordem, criado_em)
        VALUES (#{id}, #{entregaId}, #{nomeOriginal}, #{url}, #{chaveS3}, #{tamanho}, #{contentType}, #{ordem}, now())
        """)
    int inserir(EntregaArquivo a);

    @Select("SELECT * FROM entrega_video_arquivo WHERE entrega_id = #{entregaId} ORDER BY ordem, criado_em")
    List<EntregaArquivo> listarPorEntrega(@Param("entregaId") UUID entregaId);

    @Select("""
        SELECT a.* FROM entrega_video_arquivo a
        JOIN entrega_video ev ON ev.id = a.entrega_id
        JOIN conta_proposta cp ON cp.id = ev.conta_id
        JOIN proposta_voo pv ON pv.id = cp.proposta_id
        WHERE a.id = #{id}
        """)
    EntregaArquivo buscarComContexto(@Param("id") UUID id);

    @Delete("DELETE FROM entrega_video_arquivo WHERE id = #{id}")
    int excluir(@Param("id") UUID id);

    @Delete("DELETE FROM entrega_video_arquivo WHERE entrega_id = #{entregaId}")
    int excluirTodosPorEntrega(@Param("entregaId") UUID entregaId);
}
