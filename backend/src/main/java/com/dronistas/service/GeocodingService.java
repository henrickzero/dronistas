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
 * Resolve latitude/longitude a partir dos dados de endereço informados.
 * Cascata (do mais preciso ao mais amplo):
 *   1. Nominatim com a referência do solicitante (ex.: "Edificio next towers, bairro, cidade")
 *   2. Rua conhecida pela BrasilAPI para o CEP + Nominatim — precisão de rua
 *      (em várias cidades — ex. João Pessoa — a BrasilAPI só entrega a RUA, não o ponto)
 *   3. Coordenadas da BrasilAPI para o CEP (precisão varia por cidade)
 *   4. Nominatim pelo bairro + cidade
 *   5. Nominatim pelo cidade + UF
 * Todas gratuitas e sem chave; falha de rede/resultado vazio = null
 * (geocoding é enriquecimento — nunca quebra o cadastro nem a listagem).
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
        f.setReadTimeout(6000);
        this.http = new RestTemplate(f);
    }

    /** Dados de rua/bairro/cidade + coordenadas que a BrasilAPI conhece para o CEP. */
    private static final class RegistroCep {
        String rua; String bairro; String cidade; Double lat; Double lng;
    }

    /** [lat, lng] com a melhor precisão possível a partir dos dados do endereço, ou null. */
    public double[] resolver(String cep, String uf, String cidade, String bairro, String local) {
        RegistroCep reg = registroCep(cep);

        // 1. Referência textual do solicitante (prédio/condomínio/ponto) — mais específica que o CEP
        if (local != null && !local.isBlank()) {
            double[] porRef = porNominatim(junta(local,
                    first(bairro, regBairro(reg)), first(cidade, regCidade(reg)), uf));
            if (porRef != null) return porRef;
        }

        // 2. Rua conhecida pela BrasilAPI para o CEP + Nominatim = marcador na rua certa
        if (reg != null && reg.rua != null) {
            double[] porRua = porNominatim(junta(reg.rua,
                    first(bairro, reg.bairro), first(cidade, reg.cidade), uf));
            if (porRua != null) return porRua;
        }

        // 3. Coordenadas da BrasilAPI (precisão depende da cidade)
        if (reg != null && reg.lat != null && reg.lng != null) {
            return new double[]{ reg.lat, reg.lng };
        }

        // 4. Nominatim pelo bairro (precisão de bairro)
        if (bairro != null && !bairro.isBlank()) {
            double[] porBairro = porNominatim(junta(bairro, cidade, uf));
            if (porBairro != null) return porBairro;
        }

        // 5. Nominatim pela cidade
        if (cidade != null && !cidade.isBlank() && uf != null && !uf.isBlank()) {
            double[] porCidade = porNominatim(junta(cidade, uf));
            if (porCidade != null) return porCidade;
        }

        log.warn("geocoding sem resultado p/ cep={} uf={} cidade={} bairro={} local={}",
                cep, uf, cidade, bairro, local);
        return null;
    }

    private static String first(String a, String b) {
        return (a != null && !a.isBlank()) ? a : b;
    }

    private static String regBairro(RegistroCep r) { return r == null ? null : r.bairro; }
    private static String regCidade(RegistroCep r) { return r == null ? null : r.cidade; }

    private String junta(String... partes) {
        StringBuilder sb = new StringBuilder();
        for (String p : partes) {
            if (p != null && !p.isBlank()) {
                if (sb.length() > 0) sb.append(", ");
                sb.append(p.trim());
            }
        }
        return sb.length() > 0 ? sb + ", Brasil" : "";
    }

    /** Consulta a BrasilAPI pelo CEP; null se CEP vazio/inválido ou falha de rede. */
    private RegistroCep registroCep(String cep) {
        String digitos = cep == null ? null : cep.replaceAll("\\D", "");
        if (digitos == null || digitos.length() != 8) return null;
        try {
            var body = http.getForEntity("https://brasilapi.com.br/api/cep/v2/" + digitos, java.util.Map.class).getBody();
            if (body == null || Boolean.TRUE.equals(body.get("erro"))) return null;

            RegistroCep r = new RegistroCep();
            if (body.get("street") instanceof String s && !s.isBlank()) r.rua = s;
            if (body.get("neighborhood") instanceof String s && !s.isBlank()) r.bairro = s;
            if (body.get("city") instanceof String s && !s.isBlank()) r.cidade = s;

            if (body.get("location") instanceof java.util.Map<?, ?> location
                    && location.get("coordinates") instanceof java.util.Map<?, ?> coords) {
                Object lat = coords.get("latitude");
                Object lng = coords.get("longitude");
                if (lat != null && lng != null) {
                    try {
                        r.lat = Double.parseDouble(lat.toString());
                        r.lng = Double.parseDouble(lng.toString());
                    } catch (NumberFormatException ignored) { /* ponto ausente */ }
                }
            }
            return (r.rua != null || r.lat != null) ? r : null;
        } catch (Exception e) {
            return null;
        }
    }

    /** Nominatim (OpenStreetMap) por consulta textual livre (User-Agent obrigatório). */
    private double[] porNominatim(String consulta) {
        if (consulta == null || consulta.isBlank()) return null;
        try {
            HttpHeaders h = new HttpHeaders();
            h.set("User-Agent", "dronistas-portal/1.0 (suporte@dronistas.local)");
            var uri = UriComponentsBuilder.fromHttpUrl("https://nominatim.openstreetmap.org/search")
                    .queryParam("q", consulta)
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
            log.info("nominatim falhou p/ '{}': {}", consulta, e.getMessage());
            return null;
        }
    }
}
