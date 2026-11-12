package com.dronistas.mapper;

import com.dronistas.model.Usuario;
import org.apache.ibatis.annotations.*;
import java.util.UUID;

@Mapper
public interface UsuarioMapper {

    @Select("SELECT * FROM usuario WHERE lower(email) = lower(#{email}) AND ativo LIMIT 1")
    Usuario buscarPorEmail(@Param("email") String email);

    @Select("SELECT * FROM usuario WHERE id = #{id} AND ativo")
    Usuario buscarPorId(@Param("id") UUID id);

    @Select("SELECT count(*) FROM usuario WHERE lower(email) = lower(#{email})")
    long contarPorEmail(@Param("email") String email);

    @Insert("""
        INSERT INTO usuario (id, nome, email, senha_hash, papel, ativo, data_cadastro)
        VALUES (#{id}, #{nome}, #{email}, #{senhaHash}, #{papel}, TRUE, now())
        """)
    int inserir(Usuario u);
}
