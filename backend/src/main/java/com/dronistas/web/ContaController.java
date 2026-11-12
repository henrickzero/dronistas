package com.dronistas.web;

import com.dronistas.model.ContaProposta;
import com.dronistas.service.ContaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class ContaController {

    private final ContaService contas;

    public ContaController(ContaService contas) { this.contas = contas; }

    @GetMapping("/api/contas/minhas")
    public List<ContaProposta> minhas() {
        return contas.minhas();
    }

    @GetMapping("/api/propostas/{propostaId}/contas")
    public List<ContaProposta> porProposta(@PathVariable UUID propostaId) {
        return contas.porProposta(propostaId);
    }

    @PostMapping("/api/propostas/{propostaId}/contas")
    public ResponseEntity<ContaProposta> enviar(@PathVariable UUID propostaId, @RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(contas.enviar(propostaId, body));
    }

    @PostMapping("/api/contas/{id}/aceitar")
    public ResponseEntity<Void> aceitar(@PathVariable UUID id) {
        contas.aceitar(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/api/contas/{id}/recusar")
    public ResponseEntity<Void> recusar(@PathVariable UUID id) {
        contas.recusar(id);
        return ResponseEntity.ok().build();
    }
}
