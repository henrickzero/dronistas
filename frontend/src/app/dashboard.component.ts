import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from './api.service';
import { papelAtual } from './papel';
import { EstrelasComponent } from './estrelas.component';

/** Dashboard contextual: resumo diferente para dronista e solicitante. */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, EstrelasComponent, DatePipe],
  template: `
  <h1><span class="drone-icone"></span> {{ ehDronista ? 'Bem-vindo, dronista!' : 'Bem-vindo! 🎯' }}</h1>
  <p class="muted">{{ ehDronista
      ? 'Veja as oportunidades abertas e acompanhe suas propostas enviadas.'
      : 'Publique sua necessidade de voo e escolha a melhor proposta recebida.' }}</p>

  @if (carregando) { <div class="alert alert-info">Carregando...</div> }

  <div class="cards-resumo">
    <a class="card-resumo" routerLink="/app/propostas">
      <span class="numero">{{ totais.propostas }}</span>
      <span class="rotulo">{{ ehDronista ? 'oportunidades abertas' : 'propostas publicadas' }}</span>
    </a>
    <a class="card-resumo" [routerLink]="ehDronista ? '/app/contas' : '/app/propostas'">
      <span class="numero">{{ totais.contas }}</span>
      <span class="rotulo">{{ ehDronista ? 'propostas enviadas por você' : 'com contas recebidas' }}</span>
    </a>
    <a class="card-resumo" routerLink="/app/entregas">
      <span class="numero">{{ totais.entregas }}</span>
      <span class="rotulo">{{ ehDronista ? 'entregas suas' : 'entregas recebidas' }}</span>
    </a>
    <a class="card-resumo" routerLink="/app/ranking">
      <span class="numero">{{ notaFormatada }}</span>
      <span class="rotulo">sua nota média</span>
    </a>
  </div>

  <div class="card">
    <h2>{{ ehDronista ? 'Próximas oportunidades' : 'Como funciona' }}</h2>
    @if (ehDronista) {
      @for (p of destaques; track p.id) {
        <div class="linha-destaque">
          <div>
            <b>{{ p.titulo }}</b>
            <div class="muted" style="font-size:.85rem">{{ p.nomeSolicitante }} · {{ p.dataVoo | date:'dd/MM' }} {{ p.horaVoo }}</div>
          </div>
          <span class="valor">R$ {{ p.valorOferecido }}</span>
        </div>
      } @empty {
        <p class="muted">Nenhuma oportunidade aberta agora. Volte mais tarde.</p>
      }
      <div class="acoes-linha">
        <a class="btn" routerLink="/app/propostas">Ver todas as oportunidades</a>
      </div>
    } @else {
      <ol class="passos">
        <li> publique o voo: data, hora, duração, qualidade do vídeo e valor oferecido;</li>
        <li> dronistas enviam suas contas-proposta;</li>
        <li> você aprova a melhor — e as demais são recusadas automaticamente;</li>
        <li> o dronista grava e entrega o vídeo na plataforma;</li>
        <li> você aprova a entrega — o pagamento é então liberado;</li>
        <li> avalie o dronista em estrelas para o ranking.</li>
      </ol>
      <div class="acoes-linha">
        <a class="btn" routerLink="/app/propostas/nova">Publicar meu primeiro voo</a>
      </div>
    }
  </div>`,
  styles: [`
    .cards-resumo { display: grid; grid-template-columns: repeat(2, 1fr); gap: .75rem; margin: 1.25rem 0; }
    @media (min-width: 640px) { .cards-resumo { grid-template-columns: repeat(4, 1fr); } }
    .card-resumo {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius-lg); padding: 1rem; text-decoration: none;
      display: flex; flex-direction: column; gap: .2rem; box-shadow: var(--shadow);
      color: inherit;
    }
    .card-resumo { display: grid; gap: .2rem; }
    .card-resumo .numero { font-size: 1.6rem; font-weight: 800; color: #6ee7a0; }
    .card-resumo .rotulo { font-size: .8rem; color: var(--color-text-muted); }
    .linha-destaque {
      display: flex; justify-content: space-between; align-items: center; gap: .75rem;
      padding: .6rem 0; border-bottom: 1px solid var(--color-border);
    }
    .linha-destaque:last-of-type { border-bottom: none; }
    .passos { margin: 0; padding-left: 1.2rem; display: grid; gap: .45rem; font-size: .95rem; }
  `]
})
export class DashboardComponent implements OnInit {
  ehDronista = papelAtual() === 'DRONISTA';
  carregando = true;
  private faltam = 0;
  totais = { propostas: 0, contas: 0, entregas: 0 };
  notaFormatada = '—';
  destaques: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    const completa = () => { if (--this.faltam <= 0) this.carregando = false; };
    if (this.ehDronista) {
      this.faltam = 4;
      this.api.propostasAbertas().subscribe({
        next: (r: any) => {
          this.totais.propostas = r?.totalElementos || r?.conteudo?.length || 0;
          this.destaques = (r?.conteudo || []).slice(0, 5);
        },
        error: () => {}, complete: completa });
      this.api.minhasContas().subscribe({ next: cs => this.totais.contas = cs?.length || 0,
        error: () => {},  complete: completa });
      this.api.minhasEntregas().subscribe({ next: es => this.totais.entregas = es?.length || 0,
        error: () => {}, complete: completa });
      this.api.meuPerfil().subscribe({
        next: p => { const n = p?.notaMedia; this.notaFormatada = n != null ? Number(n).toFixed(1) : '—'; },
        error: () => {}, complete: completa });
    } else {
      this.faltam = 3;
      this.api.minhasPropostas().subscribe({
        next: (r: any) => {
          const ps = r?.conteudo || [];
          this.totais.propostas = r?.totalElementos || ps.length;
          this.totais.contas = (ps || []).filter((p: any) => (p.totalContas || 0) > 0).length;
        },
        error: () => {}, complete: completa });
      this.api.entregasRecebidas().subscribe({ next: es => this.totais.entregas = es?.length || 0,
        error: () => {}, complete: completa });
      this.api.meuPerfil().subscribe({
        next: p => { const n = p?.notaMedia; this.notaFormatada = n != null ? Number(n).toFixed(1) : '—'; },
        error: () => {}, complete: completa });
    }
  }
}
