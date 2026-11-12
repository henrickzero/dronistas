import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from './api.service';
import { salvarSessao } from './papel';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
  <div class="page">
    <div class="container" style="max-width:440px">
      <div class="hero" style="padding:1.75rem 0 1rem">
        <div class="logo">dron<span>istas</span></div>
        <h1>Entrar</h1>
        <p class="descricao">Acesse sua conta de dronista ou solicitante.</p>
      </div>

      <div class="card">
        <form (ngSubmit)="entrar()" #f="ngForm">
          <label>E-mail
            <input [(ngModel)]="email" name="email" type="email" required autocomplete="email">
          </label>
          <label>Senha
            <input [(ngModel)]="senha" name="senha" type="password" required autocomplete="current-password">
          </label>

          @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

          <button class="btn btn-block" type="submit" [disabled]="f.invalid || ocupado">
            {{ ocupado ? 'Entrando...' : 'Entrar' }}
          </button>
        </form>
      </div>

      <p class="muted" style="text-align:center; margin-top:1rem">
        Ainda não tem conta? <a routerLink="/">Cadastre-se</a>
      </p>
    </div>
  </div>`,
  styles: [`
    a { color: var(--color-primary-dark); font-weight: 600; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `]
})
export class LoginComponent {
  email = ''; senha = ''; erro = ''; ocupado = false;

  constructor(private api: ApiService) {}

  entrar() {
    this.erro = ''; this.ocupado = true;
    this.api.login(this.email, this.senha).subscribe({
      next: r => {
        salvarSessao(r.token, r.papel, r.usuarioId);
        // Recarga completa: garante shell limpo
        window.location.href = '/app';
      },
      error: e => {
        this.ocupado = false;
        this.erro = e.error?.mensagem || 'Credenciais inválidas';
      }
    });
  }
}
