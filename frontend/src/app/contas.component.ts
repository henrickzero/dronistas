import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from './api.service';

/** Contas-proposta enviadas pelo dronista logado. */
@Component({
  selector: 'app-contas',
  standalone: true,
  imports: [RouterLink],
  template: `
  <div class="cabecalho-pagina">
    <h1>📄 Minhas contas-proposta</h1>
  </div>
  <p class="muted">Acompanhe o resultado de cada proposta que você enviou.</p>

  @if (carregando) { <div class="alert alert-info">Carregando...</div> }
  @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

  @for (c of lista; track c.id) {
    <div class="cartao-item">
      <div class="linha-topo">
        <h3 class="card-titulo">{{ c.tituloProposta }}</h3>
        <span class="badge" [class]="'badge-' + c.status.toLowerCase()">{{ rotulo(c.status) }}</span>
      </div>
      <ul class="meta-lista">
        <li>💰 Seu preço: <span class="valor grande">R$ {{ c.valorProposto }}</span></li>
        <li>📊 Status do voo: {{ rotuloProposta(c.statusProposta) }}</li>
        @if (c.mensagem) { <li>💬 "{{ c.mensagem }}"</li> }
      </ul>
      <div class="acoes-linha">
        <a class="btn btn-outline btn-sm" [routerLink]="['/app/propostas', c.propostaId]">Abrir proposta</a>
      </div>
    </div>
  } @empty {
    @if (!carregando) {
      <div class="vazio">
        <span class="icone">📭</span>
        Você ainda não enviou contas-proposta. Veja as <a routerLink="/app/propostas">oportunidades abertas</a>.
      </div>
    }
  }`,
  styles: [`
    a { color: var(--color-primary-dark); }
  `]
})
export class ContasComponent implements OnInit {
  lista: any[] = [];
  carregando = true; erro = '';

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.minhasContas().subscribe({
      next: cs => { this.lista = cs || []; this.carregando = false; },
      error: e => { this.erro = e.error?.mensagem || 'Erro ao carregar'; this.carregando = false; }
    });
  }

  rotulo(s: string): string {
    return { ENVIADA: 'aguardando', ACEITA: 'aceita ✓', RECUSADA: 'não escolhida' }[s] || s;
  }
  rotuloProposta(s: string): string {
    return { ABERTA: 'aberta a contas', ACEITA: 'conta aceita', CONCLUIDA: 'concluído', CANCELADA: 'cancelado' }[s] || s;
  }
}
