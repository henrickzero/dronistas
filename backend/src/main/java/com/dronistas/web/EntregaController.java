package com.dronistas.web;

import com.dronistas.model.EntregaVideo;
import com.dronistas.service.EntregaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class EntregaController {

    private final EntregaService entregas;

    public EntregaController(EntregaService entregas) { this.entregas = entregas; }

    /** Entregas das propostas do solicitante. */
    @GetMapping("/api/entregas/recebidas")
    public List<EntregaVideo> recebidas() {
        return entregas.minhasComoSolicitante();
    }

    /** Entregas enviadas pelo dronista. */
    @GetMapping("/api/entregas/minhas")
    public List<EntregaVideo> minhas() {
        return entregas.minhasComoDronista();
    }

    @PostMapping("/api/contas/{contaId}/entrega")
    public ResponseEntity<EntregaVideo> entregar(@PathVariable UUID contaId, @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(entregas.entregar(contaId, body));
    }

    @PostMapping("/api/entregas/{id}/aprovar")
    public EntregaVideo aprovar(@PathVariable UUID id) {
        return entregas.aprovar(id);
    }

    @PostMapping("/api/entregas/{id}/recusar")
    public EntregaVideo recusar(@PathVariable UUID id) {
        return entregas.recusar(id);
    }

    @PostMapping("/api/entregas/{id}/avaliar")
    public EntregaVideo avaliar(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return entregas.avaliar(id, body);
    }

    /** Dronista avalia o solicitante (ranking de solicitantes). */
    @PostMapping("/api/entregas/{id}/avaliar-solicitante")
    public EntregaVideo avaliarSolicitante(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return entregas.avaliarSolicitante(id, body);
    }
}
