package com.dronistas.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

/**
 * Resolve latitude/longitude a partir de CEP (e estado/cidade como fallback).
 * Fontes gratuitas, sem chave:
 *   1. BrasilAPI /api/cep/v2/{cep} — retorna coordinates quando disponível;
 *   2. Nominatim (OpenStreetMap) por cidade+UF — fallback aproximado ao nível de cidade.
 * Falha de rede/resultado vazio = null (distância é opcional; nunca quebra o fluxo).
 */
@Service
public class GeocodingService {

    private static final Logger log = LoggerFactory.getLogger(GeocodingService.class);

    private final RestTemplate http;

    /** Haversine entre dois pontos em graus; retorna km. */
    public static double distanciaKm(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    public GeocodingService() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(4000);
        f.setReadTimeout(5000);
        this.http = new RestTemplate(f);
    }

    /** [lat, lng] para o CEP informado (com UF/cidade como fallback), ou null. */
    public double[] resolver(String cep, String uf, String cidade) {
        if (cep != null && !cep.isBlank()) {
            double[] porCep = porBrasilApi(cep.replaceAll("\\D", ""));
            if (porCep != null) return porCep;
        }
        if (cidade != null && !cidade.isBlank() && uf != null && !uf.isBlank()) {
            double[] porCidade = porNominatim(uf, cidade);
            if (porCidade != null) return porCidade;
        }
        log.warn("geocoding sem resultado p/ cep={} uf={} cidade={} — distância ficará indisponível", cep, uf, cidade);
        return null;
    }

    /** BrasilAPI CEP v2: https://brasilapi.com.br/api/cep/v2/{cep} */
    @SuppressWarnings("unchecked")
    private double[] porBrasilApi(String cepDigitos) {
        if (cepDigitos == null || cepDigitos.length() != 8) return null;
        try {
            var body = http.getForEntity("https://brasilapi.com.br/api/cep/v2/" + cepDigitos, java.util.Map.class).getBody();
            if (body == null || Boolean.TRUE.equals(body.get("erro"))) return null;
            Object locationObj = body.get("location");
            if (!(locationObj instanceof java.util.Map<?, ?> location)) return null;
            Object coordsObj = location.get("coordinates");
            if (!(coordsObj instanceof java.util.Map<?, ?> coords)) return null;
            Object lat = coords.get("latitude");
            Object lng = coords.get("longitude");
            if (lat == null || lng == null) return null;
            return new double[]{ Double.parseDouble(lat.toString()), Double.parseDouble(lng.toString()) };
        } catch (Exception e) {
            return null;
        }
    }

    /** Nominatim: geocoding aproximado por cidade/UF (User-Agent obrigatório). */
    private double[] porNominatim(String uf, String cidade) {
        try {
            HttpHeaders h = new HttpHeaders();
            h.set("User-Agent", "dronistas-portal/1.0 (suporte@dronistas.local)");
            var uri = UriComponentsBuilder.fromHttpUrl("https://nominatim.openstreetmap.org/search")
                    .queryParam("q", cidade + ", " + uf + ", Brasil")
                    .queryParam("format", "json")
                    .queryParam("limit", "1")
                    .build()
                    .encode()
                    .toUri();
            ResponseEntity<Object[]> resp = http.exchange(uri, HttpMethod.GET, new HttpEntity<>(h), Object[].class);
            Object[] arr = resp.getBody();
            if (arr == null || arr.length == 0 || !(arr[0] instanceof java.util.Map<?, ?> m)) return null;
            Object lat = m.get("lat");
            Object lng = m.get("lon");
            if (lat == null || lng == null) return null;
            return new double[]{ Double.parseDouble(lat.toString()), Double.parseDouble(lng.toString()) };
        } catch (Exception e) {
            log.info("nominatim falhou p/ uf={} cidade={}: {}", uf, cidade, e.getMessage());
            return null;
        }
    }
}
