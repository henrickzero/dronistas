import { Component, OnInit } from '@angular/core';
import { RouterLink, Router } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { papelAtual, flashSet, flashConsome } from './papel';
import { DialogService } from './dialog.service';

/**
 * Lista de propostas:
 * - Solicitante: minhas propostas publicadas (todos os status).
 * - Dronista: oportunidades abertas (marketplace) — lista compacta, filtrável
 *   por qualidade/estado/cidade e paginada (podem ser milhares de propostas).
 */
@Component({
  selector: 'app-propostas',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule],
  template: `
  <div class="cabecalho-pagina">
    <h1>{{ ehDronista ? '🧭 Oportunidades abertas' : '📋 Minhas propostas de voo' }}</h1>
    @if (!ehDronista) {
      <a class="btn" routerLink="/app/propostas/nova">➕ Publicar voo</a>
    }
  </div>

  @if (!ehDronista) {
    <p class="muted">Acompanhe o status de cada voo e as contas-proposta recebidas.</p>
  } @else {
    <div class="filtros-local">
      <select [(ngModel)]="filtroUf" name="filtroUf" (change)="recarregar()">
        <option value="">Estado — todos</option>
        @for (uf of ufs; track uf) { <option [value]="uf">{{ uf }}</option> }
      </select>
      <input [(ngModel)]="filtroCidade" name="filtroCidade" placeholder="Cidade (enter para filtrar)" (keyup.enter)="recarregar()">
      <button class="btn btn-sm" (click)="recarregar()">Filtrar</button>
    </div>
    <div class="chips">
      <button class="chip" [class.ativo]="filtro === ''" (click)="filtro = ''">Todas</button>
      @for (q of qualidades; track q.valor) {
        <button class="chip" [class.ativo]="filtro === q.valor" (click)="filtro = q.valor">{{ q.rotulo }}</button>
      }
    </div>
  }

  @if (carregando) { <div class="alert alert-info">Carregando...</div> }
  @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }
  @if (aviso) { <div class="alert alert-success">✓ {{ aviso }}</div> }
  @if (ehDronista && semBase) {
    <div class="alert alert-warning">📍 Informe CEP ou cidade no seu <a routerLink="/app/perfil">perfil</a> para ver a distância até cada proposta.</div>
  }

  @for (p of listaFiltrada(); track p.id) {
    <div class="linha-item" (click)="abrirDetalhe(p)">
      <div class="li-principal">
        <span class="li-titulo">{{ p.titulo }}</span>
        <span class="li-valor">R$ {{ p.valorOferecido }}</span>
      </div>
      <div class="li-secundaria">
        <span>📅 {{ p.dataVoo | date:'dd/MM' }} {{ hhmm(p.horaVoo) }} · {{ p.duracaoMin }}min</span>
        <span>🎥 {{ rotuloQualidade(p.qualidadeVideo) }}</span>
        <span>📍 {{ rotuloLocal(p) }}</span>
        @if (p.distanciaKm != null) { <span class="li-dist">🛩️ ~{{ p.distanciaKm }} km de você</span> }
        <span class="badge" [class]="'badge-' + p.status.toLowerCase()">{{ rotuloStatus(p.status) }}</span>
        @if (ehDronista && p.minhaContaStatus) {
          <span class="badge badge-enviada">minha proposta: {{ rotuloStatusConta(p.minhaContaStatus) }}</span>
        }
      </div>
      <div class="li-acoes">
        <a class="btn-outline btn btn-sm" [routerLink]="['/app/propostas', p.id]" (click)="$event.stopPropagation()">Detalhes</a>
        @if (ehDronista && p.status === 'ABERTA') {
          <button class="btn btn-sm" (click)="$event.stopPropagation(); aceitarDeCara(p)">✓ Aceitar de cara</button>
        }
      </div>
    </div>
  } @empty {
    @if (!carregando) {
      <div class="vazio">
        <span class="icone">🛩️</span>
        @if (ehDronista) { Nenhuma oportunidade com esses filtros. } @else { Você ainda não publicou nenhuma proposta. }
      </div>
    }
  }

  @if (ehDronista && totalPaginas > 1) {
    <div class="paginacao">
      <button class="btn btn-sm" [disabled]="pagina === 0" (click)="irPara(pagina - 1)">← Anterior</button>
      <span class="muted">Página {{ pagina + 1 }} de {{ totalPaginas }} · {{ totalElementos }} propostas</span>
      <button class="btn btn-sm" [disabled]="pagina >= totalPaginas - 1" (click)="irPara(pagina + 1)">Próxima →</button>
    </div>
  }`,
  styles: [`
    .linha-item {
      background: var(--color-surface); border: 1px solid var(--color-border);
      border-radius: var(--radius); padding: .55rem .8rem; margin-bottom: .5rem;
      cursor: pointer; box-shadow: var(--shadow);
    }
    .linha-item:hover { border-color: var(--color-primary); }
    .li-principal { display: flex; justify-content: space-between; gap: .6rem; align-items: baseline; }
    .li-titulo { font-weight: 600; font-size: .95rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .li-valor { font-weight: 700; color: #6ee7a0; white-space: nowrap; font-size: .95rem; }
    .li-secundaria {
      display: flex; flex-wrap: wrap; gap: .25rem .8rem;
      font-size: .78rem; color: var(--color-text-muted); margin-top: .15rem; align-items: center;
    }
    .li-acoes { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .45rem; }
    .li-dist { color: #7cc0ff; font-weight: 600; }
    .filtros-local { display: grid; grid-template-columns: 1fr 2fr auto; gap: .5rem; margin-bottom: .75rem; }
    .filtros-local select, .filtros-local input { min-height: 40px; padding: .45rem .6rem; margin-top: 0; }
    .paginacao { display: flex; align-items: center; justify-content: center; gap: 1rem; margin-top: 1.2rem; flex-wrap: wrap; }
    @media (max-width: 640px) {
      .filtros-local { grid-template-columns: 1fr; }
      .li-secundaria { gap: .15rem .6rem; }
    }
  `]
})
export class PropostasComponent implements OnInit {
  ehDronista = papelAtual() === 'DRONISTA';
  carregando = true;
  erro = '';
  aviso = '';
  filtro = '';          // qualidade (client-side)
  filtroUf = '';        // estado (server-side)
  filtroCidade = '';    // cidade (server-side)
  pagina = 0;
  totalPaginas = 1;
  totalElementos = 0;
  lista: any[] = [];
  contasPorProposta: any = {};

  ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  qualidades = [
    { valor: 'FULLHD', rotulo: 'Full HD' },
    { valor: '2K', rotulo: '2K' },
    { valor: '4K_30FPS', rotulo: '4K 30' },
    { valor: '4K_60FPS', rotulo: '4K 60' },
    { valor: '4K_120FPS', rotulo: '4K 120' }
  ];

  constructor(private api: ApiService, private router: Router, private dialog: DialogService) {}

  ngOnInit() {
    const fl = flashConsome();
    if (fl) this.aviso = fl.mensagem;
    this.carregar();
    if (this.ehDronista) {
      this.api.minhasContas().subscribe(cs => {
        const mapa: any = {};
        (cs || []).forEach((c: any) => { if (c.propostaId) mapa[c.propostaId] = c.status; });
        this.contasPorProposta = mapa;
      });
      // Aviso quando o dronista ainda não tem base informada (sem distâncias na lista)
      this.api.meuPerfil().subscribe(p => {
        this.semBase = !p?.cep && !p?.cidade;
      });
    }
  }

  semBase = false;

  carregar() {
    this.carregando = true; this.erro = '';
    if (this.ehDronista) {
      this.api.propostasAbertas(this.filtroUf, this.filtroCidade.trim(), this.pagina).subscribe({
        next: (r: any) => {
          this.lista = r?.conteudo || [];
          this.totalPaginas = r?.totalPaginas || 1;
          this.totalElementos = r?.totalElementos || this.lista.length;
          this.carregando = false;
        },
        error: e => { this.erro = e.error?.mensagem || 'Erro ao carregar propostas'; this.carregando = false; }
      });
    } else {
      this.api.minhasPropostas().subscribe({
        next: ps => { this.lista = ps || []; this.carregando = false; },
        error: e => { this.erro = e.error?.mensagem || 'Erro ao carregar propostas'; this.carregando = false; }
      });
    }
  }

  listaFiltrada(): any[] {
    if (this.ehDronista && this.filtro) {
      return this.lista.filter(p => p.qualidadeVideo === this.filtro);
    }
    return this.lista;
  }

  recarregar() { this.pagina = 0; this.carregar(); }

  irPara(pag: number) { this.pagina = Math.max(0, pag); this.carregar(); }

  abrirDetalhe(p: any) { this.router.navigate(['/app/propostas', p.id]); }

  /** Aceitação direta: fecha o acordo no valor ofertado, sem contraproposta. */
  aceitarDeCara(p: any) {
    this.dialog.confirmar({
      titulo: 'Aceitar o valor ofertado',
      mensagem: `Fechar o acordo por R$ ${p.valorOferecido}?\nVocê será contratado imediatamente e novas contrapropostas ficam bloqueadas.`,
      textoConfirmar: 'Aceitar de cara'
    }).then(ok => {
      if (!ok) return;
      this.api.aceitarPropostaDeCara(p.id).subscribe({
        next: () => {
          flashSet('Acordo fechado! Você foi contratado pelo valor ofertado. Prepare a captura e entregue o vídeo.');
          this.router.navigate(['/app/propostas', p.id]);
        },
        error: e => this.dialog.info(e.error?.mensagem || 'Erro ao aceitar — a proposta pode ter sido fechada por outro dronista')
      });
    });
  }

  rotuloStatus(s: string): string {
    return { ABERTA: 'Aberta', ACEITA: 'Aceita', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' }[s] || s;
  }
  rotuloStatusConta(s: string): string {
    return { ENVIADA: 'aguardando', ACEITA: 'aceita ✓', RECUSADA: 'não escolhida' }[s] || s;
  }
  rotuloQualidade(q: string): string {
    return { FULLHD: 'Full HD', '2K': '2K', '4K_30FPS': '4K30', '4K_60FPS': '4K60', '4K_120FPS': '4K120' }[q] || q;
  }
  rotuloLocal(p: any): string {
    const partes = [p.bairro, p.cidade, p.estado].filter((x: string) => !!x);
    return partes.length ? partes.join(' · ') : (p.local || 'Local não informado');
  }
  hhmm(t: string): string { return (t || '').slice(0, 5); }
}
