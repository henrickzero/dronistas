package com.dronistas.web;

import com.dronistas.service.PerfilService;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
public class PerfilController {

    private final PerfilService perfis;

    public PerfilController(PerfilService perfis) { this.perfis = perfis; }

    @GetMapping("/api/perfil/me")
    public Map<String, Object> meuPerfil() {
        return perfis.meuPerfil();
    }

    @PutMapping("/api/perfil/me")
    public Map<String, Object> atualizar(@RequestBody Map<String, Object> body) {
        return perfis.atualizarMeuPerfil(body);
    }
}
