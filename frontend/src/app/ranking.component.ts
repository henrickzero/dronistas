import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';
import { EstrelasComponent } from './estrelas.component';

/** Ranking público dos profissionais e dos solicitantes. */
@Component({
  selector: 'app-ranking',
  standalone: true,
  imports: [EstrelasComponent],
  template: `
  <h1>🏆 Ranking</h1>
  <p class="muted">Os melhor avaliados de cada lado do marketplace.</p>

  <div class="seletor">
    <button class="chip" [class.ativo]="aba === 'dronistas'" (click)="aba = 'dronistas'"><span class="drone-icone"></span> Dronistas</button>
    <button class="chip" [class.ativo]="aba === 'solicitantes'" (click)="aba = 'solicitantes'">🎯 Solicitantes</button>
  </div>

  @if (carregando) { <div class="alert alert-info">Carregando...</div> }

  @if (aba === 'dronistas') {
    @for (d of dronistas; track d.id; let i = $index) {
      <div class="cartao-item rank" [class.top3]="i < 3">
        <span class="posicao">{{ medalha(i) }}</span>
        <div class="corpo">
          <div class="nome">
            <b>{{ d.nome }}</b>
            @if (d.cidade) { <small class="muted"> · 📍 {{ d.cidade }}@if (d.estado) {/{{ d.estado }} }</small> }
            @if (d.licencaAnac) { <small class="muted"> · ANAC {{ d.licencaAnac }}</small> }
          </div>
          <app-estrelas [nota]="d.notaMedia"></app-estrelas>
          <small class="muted">{{ d.trabalhosConcluidos }} trabalho(s) concluído(s)</small>
        </div>
      </div>
    } @empty {
      @if (!carregando) { <div class="vazio"><span class="icone">🏅</span>Ranking em construção — nenhuma avaliação ainda.</div> }
    }
  } @else {
    @for (s of solicitantes; track s.id; let i = $index) {
      <div class="cartao-item rank" [class.top3]="i < 3">
        <span class="posicao">{{ medalha(i) }}</span>
        <div class="corpo">
          <div class="nome">
            <b>{{ s.nome }}</b>
            @if (s.empresa) { <small class="muted"> · {{ s.empresa }}</small> }
          </div>
          <app-estrelas [nota]="s.notaMedia"></app-estrelas>
          <small class="muted">{{ s.contratacoes }} contratação(ões)</small>
        </div>
      </div>
    } @empty {
      @if (!carregando) { <div class="vazio"><span class="icone">🏅</span>Ranking em construção — nenhuma avaliação ainda.</div> }
    }
  }`,
  styles: [`
    .seletor { display: flex; gap: .5rem; margin-bottom: 1rem; }
    .rank { display: flex; align-items: center; gap: .9rem; }
    .rank.top3 { border-color: var(--color-accent); background: rgba(255, 215, 73, .06); }
    .posicao { font-size: 1.6rem; width: 2.4rem; text-align: center; flex-shrink: 0; }
    .corpo { display: flex; flex-direction: column; gap: .15rem; min-width: 0; }
    .nome { font-size: 1rem; }
    .rank app-estrelas { margin: .1rem 0; }
  `]
})
export class RankingComponent implements OnInit {
  aba = 'dronistas';
  dronistas: any[] = [];
  solicitantes: any[] = [];
  carregando = true;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.rankingDronistas().subscribe({ next: d => { this.dronistas = d || []; this.checarFim(); },
      error: () => this.checarFim() });
    this.api.rankingSolicitantes().subscribe({ next: s => { this.solicitantes = s || []; this.checarFim(); },
      error: () => this.checarFim() });
  }

  private checarFim() { if (this.dronistas || this.solicitantes) this.carregando = false; }

  medalha(i: number): string {
    return i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : String(i + 1) + '.';
  }
}
