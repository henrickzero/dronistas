package com.dronistas.config;

import com.dronistas.mapper.UsuarioMapper;
import com.dronistas.model.Usuario;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import java.util.UUID;

/**
 * Garante o admin da plataforma (admin@dronistas.com / admin123) com hash
 * gerado pelo próprio BCryptPasswordEncoder — sem depender de seed SQL.
 */
@Component
public class AdminSeeder implements CommandLineRunner {

    private final UsuarioMapper usuarios;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    public AdminSeeder(UsuarioMapper usuarios) { this.usuarios = usuarios; }

    @Override
    public void run(String... args) {
        if (usuarios.buscarPorEmail("admin@dronistas.com") == null) {
            Usuario u = new Usuario();
            u.setId(UUID.fromString("00000000-0000-0000-0000-000000000001"));
            u.setNome("Administrador");
            u.setEmail("admin@dronistas.com");
            u.setSenhaHash(encoder.encode("admin123"));
            u.setPapel("ADMIN");
            usuarios.inserir(u);
        }
    }
}
