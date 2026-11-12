import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from './api.service';
import { papelAtual, limparSessao } from './papel';

/**
 * Shell interno autenticado. Sidebar escura no desktop; no celular vira
 * header sticky com os links em uma linha (mobile-first).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  <div class="app-shell">
    <aside class="sidebar">
      <div class="sidebar-brand">dron<span>istas</span></div>
      <nav>
        <span class="rotulo">Menu</span>
        <a routerLink="/app" routerLinkActive="ativo" [routerLinkActiveOptions]="{exact: true}">🏠 Início</a>

        @if (ehDronista) {
          <a routerLink="/app/propostas">🧭 Oportunidades</a>
          <a routerLink="/app/contas">📄 Minhas propostas</a>
        } @else {
          <a routerLink="/app/propostas">📋 Minhas propostas de voo</a>
          <a routerLink="/app/propostas/nova">➕ Publicar novo voo</a>
        }

        <a routerLink="/app/entregas">🎬 Entregas</a>
        <a routerLink="/app/ranking">🏆 Ranking</a>
        <a routerLink="/app/perfil">👤 Perfil</a>
      </nav>
      <button class="btn-logout" (click)="sair()">Sair</button>
    </aside>

    <section class="area">
      <div class="conteudo-pagina">
        <router-outlet></router-outlet>
      </div>
    </section>
  </div>`,
  styles: [`
    .app-shell { display: flex; min-height: 100vh; }

    .sidebar {
      width: 250px; background: #0b1f1d; color: #e6f4f2;
      display: flex; flex-direction: column; padding: 1rem .75rem; gap: .5rem;
      flex-shrink: 0;
    }
    .sidebar-brand { font-weight: 800; font-size: 1.2rem; padding: .25rem .5rem .75rem; }
    .sidebar-brand span { color: var(--color-accent); }
    .sidebar nav { display: flex; flex-direction: column; gap: .2rem; flex: 1; }
    .sidebar .rotulo { font-size: .7rem; letter-spacing: .12em; text-transform: uppercase; color: #6f9b96; padding: .4rem .5rem .2rem; }
    .sidebar nav a {
      color: #bcd9d5; text-decoration: none; padding: .6rem .6rem;
      border-radius: var(--radius); font-size: .925rem;
    }
    .sidebar nav a:hover { background: #16302d; color: #fff; }
    .sidebar nav a.ativo { background: var(--color-primary); color: #fff; font-weight: 600; }
    .btn-logout {
      border: 1px solid #2a4a46; background: transparent; color: #bcd9d5;
      padding: .55rem .5rem; cursor: pointer; border-radius: var(--radius); font-size: .9rem;
    }
    .btn-logout:hover { background: #16302d; color: #fff; }

    .area { flex: 1; min-width: 0; }
    .conteudo-pagina { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }

    /* Celular: sidebar vira header sticky */
    @media (max-width: 768px) {
      .app-shell { flex-direction: column; }
      .sidebar {
        width: 100%; flex-direction: column; padding: .5rem .6rem;
        position: sticky; top: 0; z-index: 40; box-shadow: var(--shadow);
      }
      .sidebar-brand { padding: .15rem .4rem; font-size: 1rem; }
      .sidebar nav { flex-direction: row; overflow-x: auto; gap: .3rem; -webkit-overflow-scrolling: touch; }
      .sidebar .rotulo { display: none; }
      .sidebar nav a { padding: .45rem .7rem; font-size: .82rem; white-space: nowrap; }
      .btn-logout { padding: .4rem .7rem; font-size: .8rem; align-self: flex-end; margin-top: .3rem; }
      .conteudo-pagina { padding: 1rem .8rem 2.5rem; }
    }
  `]
})
export class ShellComponent implements OnInit {
  ehDronista = false;
  ehSolicitante = false;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.ehDronista = papelAtual() === 'DRONISTA';
    this.ehSolicitante = papelAtual() === 'SOLICITANTE';
    // Papel desatualizado no localStorage ou token inválido -> cai pro login
    this.api.meuPerfil().subscribe({
      error: () => { limparSessao(); window.location.href = '/login'; }
    });
  }

  sair() {
    limparSessao();
    window.location.href = '/login';
  }
}
