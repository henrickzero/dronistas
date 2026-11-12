package com.dronistas.web;

import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.mapper.PerfilSolicitanteMapper;
import com.dronistas.model.PerfilDronista;
import com.dronistas.model.PerfilSolicitante;
import org.springframework.web.bind.annotation.*;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
public class RankingController {

    private final PerfilDronistaMapper dronistas;
    private final PerfilSolicitanteMapper solicitantes;

    public RankingController(PerfilDronistaMapper dronistas, PerfilSolicitanteMapper solicitantes) {
        this.dronistas = dronistas;
        this.solicitantes = solicitantes;
    }

    @GetMapping("/api/ranking/dronistas")
    public List<Map<String, Object>> dronistas() {
        return dronistas.ranking().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId().toString());
            m.put("nome", p.getNome());
            m.put("licencaAnac", p.getLicencaAnac());
            m.put("estado", p.getEstado());
            m.put("cidade", p.getCidade());
            m.put("notaMedia", p.getNotaMedia());
            m.put("trabalhosConcluidos", p.getTrabalhosConcluidos());
            return m;
        }).collect(Collectors.toList());
    }

    @GetMapping("/api/ranking/solicitantes")
    public List<Map<String, Object>> solicitantes() {
        return solicitantes.ranking().stream().map(p -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", p.getId().toString());
            m.put("nome", p.getNome());
            m.put("empresa", p.getEmpresa());
            m.put("notaMedia", p.getNotaMedia());
            m.put("contratacoes", p.getContratacoes());
            return m;
        }).collect(Collectors.toList());
    }
}
