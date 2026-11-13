package com.dronistas.web;

import com.dronistas.model.PropostaVoo;
import com.dronistas.service.PropostaService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
public class PropostaController {

    private final PropostaService propostas;

    public PropostaController(PropostaService propostas) { this.propostas = propostas; }

    /** Marketplace paginado: filtros estado/cidade. */
    @GetMapping("/api/propostas/abertas")
    public Map<String, Object> abertas(@RequestParam(required = false) String estado,
                                       @RequestParam(required = false) String cidade,
                                       @RequestParam(defaultValue = "0") int page) {
        return toMap(propostas.abertas(estado, cidade, page));
    }

    /** Cidades com oportunidades abertas (combo de filtro); opcionalmente por UF. */
    @GetMapping("/api/propostas/abertas/cidades")
    public List<String> cidades(@RequestParam(required = false) String estado) {
        return propostas.cidadesAbertas(estado);
    }

    private Map<String, Object> toMap(PropostaService.Pagina pg) {
        var m = new java.util.LinkedHashMap<String, Object>();
        m.put("conteudo", pg.conteudo());
        m.put("pagina", pg.pagina());
        m.put("totalPaginas", pg.totalPaginas());
        m.put("totalElementos", pg.totalElementos());
        return m;
    }

    /** Propostas do dronista logado (participando). */
    @GetMapping("/api/propostas/participando")
    public List<PropostaVoo> participando() {
        return propostas.doDronista();
    }

    /** Propostas do solicitante logado. */
    @GetMapping("/api/propostas/minhas")
    public List<PropostaVoo> minhas() {
        return propostas.minhas();
    }

    @GetMapping("/api/propostas/{id}")
    public PropostaVoo detalhe(@PathVariable UUID id) {
        return propostas.detalhe(id);
    }

    @PostMapping("/api/propostas")
    public ResponseEntity<PropostaVoo> criar(@RequestBody Map<String, Object> body) {
        return ResponseEntity.status(HttpStatus.CREATED).body(propostas.criar(body));
    }

    @PutMapping("/api/propostas/{id}")
    public PropostaVoo atualizar(@PathVariable UUID id, @RequestBody Map<String, Object> body) {
        return propostas.atualizar(id, body);
    }

    /** Dronista aceita de cara o valor ofertado pelo solicitante. */
    @PostMapping("/api/propostas/{id}/aceitar")
    public PropostaVoo aceitarDeCara(@PathVariable UUID id) {
        return propostas.aceitarDireto(id);
    }

    @PostMapping("/api/propostas/{id}/cancelar")
    public ResponseEntity<Void> cancelar(@PathVariable UUID id) {
        propostas.cancelar(id);
        return ResponseEntity.ok().build();
    }
}
