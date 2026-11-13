package com.dronistas.config;

import com.dronistas.mapper.PerfilDronistaMapper;
import com.dronistas.mapper.PropostaVooMapper;
import com.dronistas.model.PerfilDronista;
import com.dronistas.model.PropostaVoo;
import com.dronistas.service.GeocodingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Backfill de coordenadas: resolve lat/lng de registros criados antes da V3
 * (coluna ainda nula). Limitado por arranque para não atrasar o boot e gentil
 * com os serviços externos; idempotente — registros sem dados suficientes
 * simplesmente voltam a ficar elegíveis na próxima subida.
 */
@Component
public class GeocodingBackfill implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(GeocodingBackfill.class);
    private static final int LIMITE_POR_TABELA = 25;
    private static final long PAUSA_MS = 300;

    private final PropostaVooMapper propostas;
    private final PerfilDronistaMapper dronistas;
    private final GeocodingService geo;

    public GeocodingBackfill(PropostaVooMapper propostas, PerfilDronistaMapper dronistas, GeocodingService geo) {
        this.propostas = propostas;
        this.dronistas = dronistas;
        this.geo = geo;
    }

    @Override
    public void run(String... args) {
        int feitos = 0;
        try {
            for (PropostaVoo p : propostas.listarSemCoordenadas()) {
                double[] c = geo.resolver(p.getCep(), p.getEstado(), p.getCidade(), p.getBairro(), p.getLogradouro(), p.getNumero(), p.getLocal());
                if (c != null) { propostas.atualizarCoordenadas(p.getId(), c[0], c[1]); feitos++; }
                Thread.sleep(PAUSA_MS);
            }
            for (PerfilDronista d : dronistas.listarSemCoordenadas()) {
                double[] c = geo.resolver(d.getCep(), d.getEstado(), d.getCidade(), d.getBairro(), null, null, null);
                if (c != null) { dronistas.atualizarCoordenadas(d.getId(), c[0], c[1]); feitos++; }
                Thread.sleep(PAUSA_MS);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        if (feitos > 0) log.info("backfill de geocoding: {} registro(s) coordenado(s) neste arranque", feitos);
    }
}
