import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService } from './api.service';
import { papelAtual, limparSessao } from './papel';

/**
 * Shell interno autenticado. Sidebar estilo YouTube no desktop; no celular vira
 * header sticky com botão hambúrguer expansível (mobile-first).
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
  <div class="app-shell">
    <aside class="sidebar" [class.aberto]="menuAberto">
      <div class="sidebar-topo">
        <div class="sidebar-brand">dron<span>istas</span></div>
        <button class="btn-menu" type="button" (click)="menuAberto = !menuAberto"
                [attr.aria-expanded]="menuAberto" aria-label="Abrir/fechar menu">
          {{ menuAberto ? '✕' : '☰' }}
        </button>
      </div>
      <nav (click)="fecharAoNavegar()">
        <span class="rotulo">Menu</span>
        <a routerLink="/app" routerLinkActive="ativo" [routerLinkActiveOptions]="{exact: true}">
          <span class="ico">🏠</span> Início
        </a>

        @if (ehDronista) {
          <a routerLink="/app/propostas"><span class="ico">🧭</span> Oportunidades</a>
          <a routerLink="/app/contas"><span class="ico">📄</span> Minhas propostas</a>
        } @else {
          <a routerLink="/app/propostas"><span class="ico">📋</span> Minhas propostas de voo</a>
          <a routerLink="/app/propostas/nova"><span class="ico">➕</span> Publicar novo voo</a>
        }

        <a routerLink="/app/entregas"><span class="ico">🎬</span> Entregas</a>
        <a routerLink="/app/ranking"><span class="ico">🏆</span> Ranking</a>
        <a routerLink="/app/perfil"><span class="ico">👤</span> Perfil</a>
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
    .app-shell { display: flex; min-height: 100vh; background: var(--color-bg); }

    .sidebar {
      width: 240px; color: var(--color-text);
      background: var(--color-bg);
      display: flex; flex-direction: column; padding: .75rem .75rem; gap: .35rem;
      flex-shrink: 0;
      position: sticky; top: 0; height: 100vh; overflow-y: auto;
    }
    .sidebar-brand {
      font-weight: 800; font-size: 1.25rem; padding: .35rem .6rem .9rem;
      color: var(--color-text); letter-spacing: -.5px;
    }
    .sidebar-brand span { color: #3ea6ff; }
    .sidebar nav { display: flex; flex-direction: column; gap: .05rem; flex: 1; }
    .sidebar .rotulo { font-size: .72rem; letter-spacing: .08em; text-transform: uppercase; color: var(--color-text-muted); padding: .5rem .6rem .35rem; }
    .sidebar nav a {
      color: var(--color-text); text-decoration: none; padding: .6rem .75rem;
      border-radius: 10px; font-size: .925rem;
      display: flex; align-items: center; gap: .75rem;
      transition: background .12s ease;
    }
    .sidebar nav a .ico { font-size: 1.05rem; width: 1.5rem; text-align: center; }
    .sidebar nav a:hover { background: rgba(255, 255, 255, .08); }
    /* Item ativo: faixa branca à esquerda + fundo sutil, sem "caixa" colorida */
    .sidebar nav a.ativo {
      background: rgba(255, 255, 255, .12); font-weight: 600;
    }
    .btn-menu {
      display: none;
      border: none; background: transparent; color: var(--color-text);
      font-size: 1.2rem; line-height: 1; padding: .4rem .6rem;
      cursor: pointer; border-radius: 999px;
    }
    .btn-menu:hover { background: rgba(255, 255, 255, .08); }
    .sidebar-topo {
      display: none; align-items: center; justify-content: space-between;
      padding: .1rem .2rem; margin-bottom: .2rem;
    }
    .btn-logout {
      border: none; background: transparent; color: var(--color-text-muted);
      padding: .6rem .75rem; cursor: pointer; border-radius: 10px; font-size: .925rem;
      text-align: left;
    }
    .btn-logout:hover { background: rgba(255, 255, 255, .08); color: var(--color-text); }

    .area { flex: 1; min-width: 0; }
    .conteudo-pagina { max-width: 900px; margin: 0 auto; padding: 1.5rem 1rem 3rem; }

    /* Celular: header fixo preto + menu hambúrguer */
    @media (max-width: 768px) {
      .app-shell { flex-direction: column; }
      .sidebar {
        width: 100%; flex-direction: column; padding: 0;
        position: sticky; top: 0; z-index: 40; height: auto; overflow: visible;
        background: var(--color-bg);
        box-shadow: 0 1px 0 rgba(255, 255, 255, .08);
      }
      .sidebar-topo {
        display: flex; padding: .6rem .5rem;
      }
      .btn-menu { display: inline-block; }
      .sidebar-brand { padding: 0 .2rem; font-size: 1.1rem; }
      .sidebar nav {
        display: none;
        flex-direction: column; gap: .05rem;
        padding: .4rem .5rem .6rem;
        background: var(--color-bg);
      }
      .sidebar.aberto nav { display: flex; }
      .sidebar .rotulo { display: block; }
      .sidebar nav a { padding: .75rem .7rem; font-size: .95rem; }
      .btn-logout { display: none; }
      .sidebar.aberto .btn-logout { display: block; margin: 0 .5rem .5rem; }
      .conteudo-pagina { padding: 1rem .8rem 2.5rem; }
    }
  `]
})
export class ShellComponent implements OnInit {
  ehDronista = false;
  ehSolicitante = false;
  menuAberto = false;

  constructor(private api: ApiService) {}

  fecharAoNavegar() { this.menuAberto = false; }

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
