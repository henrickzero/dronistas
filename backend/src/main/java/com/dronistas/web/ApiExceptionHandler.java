package com.dronistas.web;

import com.dronistas.security.RegraNegocioException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<Map<String, Object>> regra(RegraNegocioException e) {
        HttpStatus status = switch (e.getCodigo()) {
            case "DUPLICADO", "EMAIL_DUPLICADO" -> HttpStatus.CONFLICT;                     // 409
            case "DOCUMENTO_INVALIDO", "CAMPO_INVALIDO", "CAMPO_OBRIGATORIO",
                 "SENHA_FRACA", "PAPEL_INVALIDO" -> HttpStatus.UNPROCESSABLE_ENTITY;        // 422
            case "NAO_ENCONTRADO" -> HttpStatus.NOT_FOUND;                                  // 404
            case "UPLOAD_NAO_CONFIGURADO" -> HttpStatus.SERVICE_UNAVAILABLE;                // 503
            case "UPLOAD_FALHOU" -> HttpStatus.BAD_GATEWAY;                                 // 502
            case "CADASTRO_EM_APROVACAO" -> HttpStatus.FORBIDDEN;                           // 403
            case "PROIBIDO" -> HttpStatus.FORBIDDEN;                                        // 403
            case "CREDENCIAIS_INVALIDAS" -> HttpStatus.UNAUTHORIZED;                        // 401
            default -> HttpStatus.BAD_REQUEST;
        };
        return ResponseEntity.status(status).body(Map.of("codigo", e.getCodigo(), "mensagem", e.getMessage()));
    }
}
