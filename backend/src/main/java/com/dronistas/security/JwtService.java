package com.dronistas.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Component
public class JwtService {

    private final Key key;
    private final long ttlMinutes;

    public JwtService(@Value("${app.jwt.secret}") String secret,
                      @Value("${app.jwt.ttl-minutes}") long ttlMinutes) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes());
        this.ttlMinutes = ttlMinutes;
    }

    public String emitir(UUID usuarioId, String papel) {
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(usuarioId.toString())
                .claim("papel", papel)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(ttlMinutes * 60)))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    /** Retorna a Sessao decodificada ou null se inválido/expirado. */
    public Sessao validar(String token) {
        try {
            Claims c = Jwts.parserBuilder().setSigningKey(key).build()
                    .parseClaimsJws(token).getBody();
            UUID usuarioId = UUID.fromString(c.getSubject());
            String papel = c.get("papel", String.class);
            return new Sessao(usuarioId, papel, "API");
        } catch (JwtException | IllegalArgumentException e) {
            return null;
        }
    }
}
