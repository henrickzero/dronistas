package com.dronistas.web;

import com.dronistas.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
public class AuthController {

    private final AuthService auth;

    public AuthController(AuthService auth) { this.auth = auth; }

    @PostMapping("/api/auth/registrar")
    public ResponseEntity<AuthService.AuthResponse> registrar(@RequestBody AuthService.RegistroRequest req) {
        return ResponseEntity.status(HttpStatus.CREATED).body(auth.registrar(req));
    }

    @PostMapping("/api/auth/login")
    public AuthService.AuthResponse login(@RequestBody AuthService.LoginRequest req) {
        return auth.login(req);
    }
}
