import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from './api.service';
import { papelAtual, flashSet } from './papel';
import { EstrelasComponent } from './estrelas.component';
import { DialogService } from './dialog.service';

/**
 * Entregas:
 * - Solicitante: entregas recebidas nas suas propostas (aprovar/recusar/avaliar).
 * - Dronista: entregas enviadas (status de aprovação e pagamento).
 */
@Component({
  selector: 'app-entregas',
  standalone: true,
  imports: [FormsModule, RouterLink, EstrelasComponent],
  template: `
  <div class="cabecalho-pagina">
    <h1>{{ ehDronista ? '🎬 Minhas entregas' : '🎬 Entregas recebidas' }}</h1>
  </div>
  <p class="muted">{{ ehDronista
      ? 'Acompanhe a aprovação e o pagamento dos seus trabalhos.'
      : 'Aprove as vídeos recebidas para liberar o pagamento e avaliar o dronista.' }}</p>

  @if (carregando) { <div class="alert alert-info">Carregando...</div> }
  @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

  @for (e of lista; track e.id) {
    <div class="cartao-item">
      <div class="linha-topo">
        <h3 class="card-titulo">{{ e.tituloProposta }}</h3>
        <span class="badge" [class]="'badge-' + e.status.toLowerCase()">{{ rotuloStatus(e.status) }}</span>
      </div>
      <ul class="meta-lista">
        <li><span class="drone-icone"></span> {{ e.nomeDronista }} · 💰 R$ {{ e.valorProposto }}</li>
        @if (e.arquivos?.length) {
          <li>🎬 {{ e.arquivos.length }} vídeo(s) — assista abaixo</li>
        } @else {
          <li>🎬 <button class="ver-video" (click)="abrirVideo(e)">▶️ Assistir pela plataforma</button></li>
        }
        @if (e.observacao) { <li>💬 {{ e.observacao }}</li> }
        @if (e.status === 'APROVADA') {
          @if (ehDronista) {
            <li>💸 Pagamento liberado pelo solicitante</li>
            @if (e.nota != null) { <li>⭐ Nota recebida: {{ e.nota }}★ @if (e.comentario) { — "{{ e.comentario }}" }</li> }
          } @else if (e.nota != null) {
            <li>⭐ Você avaliou: {{ e.nota }}★ @if (e.comentario) { — "{{ e.comentario }}" }</li>
          }
        }
      </ul>

      @if (e.arquivos?.length) {
        <div class="docs-lista">
          @for (a of e.arquivos; track a.id) {
            <div class="doc-item">
              <span class="doc-nome">🎬 {{ a.nomeOriginal }} <small class="muted">· {{ bytes(a.tamanho) }}</small></span>
              <button type="button" class="ver-video" (click)="abrirArquivo(a)">▶️ Assistir</button>
            </div>
            @if (videoArquivoId === a.id && videoArquivoUrl) {
              <div class="video-box">
                <video [src]="videoArquivoUrl" controls preload="metadata" style="width:100%; max-height:420px; border-radius:8px; background:#000"></video>
              </div>
            }
          }
        </div>
      }

      @if (videoUrl && videoEntregaId === e.id) {
        <div class="video-box">
          <video [src]="videoUrl" controls preload="metadata" style="width:100%; max-height:480px; border-radius:8px; background:#000"></video>
        </div>
      }

      @if (!ehDronista && e.status === 'ENVIADA') {
        <div class="alert alert-info">Aprove para liberar o pagamento ou recuse para nova versão.</div>
        <div class="acoes-linha">
          <button class="btn btn-sm" (click)="aprovar(e)">✓ Aprovar e liberar pagamento</button>
          <button class="btn btn-danger btn-sm" (click)="recusar(e)">✕ Recusar</button>
        </div>
      }
      @if (!ehDronista && e.status === 'APROVADA' && e.nota == null) {
        <h3>⭐ Avalie o dronista</h3>
        <app-estrelas [clicavel]="true" [grandes]="true" [nota]="notaPorId[e.id]" (aoMarcar)="notaPorId[e.id] = $event"></app-estrelas>
        <label>Comentário (opcional)
          <textarea [(ngModel)]="comentarioPorId[e.id]" name="com{{ e.id }}" rows="1"></textarea>
        </label>
        <div class="acoes-linha">
          <button class="btn btn-sm" (click)="avaliar(e)" [disabled]="!notaPorId[e.id]">Enviar avaliação</button>
        </div>
      }
      @if (!ehDronista && e.status === 'APROVADA' && e.nota != null) {
        <div class="alert alert-success">✓ Trabalho concluído, pagamento liberado e avaliado ({{ e.nota }}★).</div>
      }
      @if (ehDronista && e.status === 'APROVADA' && e.notaSolicitante == null) {
        <h3>⭐ Avalie este solicitante</h3>
        <app-estrelas [clicavel]="true" [grandes]="true" [nota]="notaPorId[e.id]" (aoMarcar)="notaPorId[e.id] = $event"></app-estrelas>
        <label>Comentário (opcional)
          <textarea [(ngModel)]="comentarioPorId[e.id]" name="cs{{ e.id }}" rows="1"></textarea>
        </label>
        <div class="acoes-linha">
          <button class="btn btn-sm" (click)="avaliarSolicitante(e)" [disabled]="!notaPorId[e.id]">Enviar avaliação</button>
        </div>
      }
    </div>
  } @empty {
    @if (!carregando) {
      <div class="vazio">
        <span class="icone">📼</span>
        {{ ehDronista ? 'Nenhuma entrega sua ainda. Envie o vídeo pela proposta aceita.' : 'Nenhuma entrega recebida ainda.' }}
      </div>
    }
  }`,
  styles: [`
    .ver-video { border: none; background: none; color: #3ea6ff; font-weight: 600; cursor: pointer; font-size: .9rem; padding: 0; }
    .ver-video:hover { text-decoration: underline; }
    .video-box { margin-top: .7rem; }
    .docs-lista { display: grid; gap: .4rem; margin-top: .6rem; }
    .doc-item {
      display: flex; align-items: center; justify-content: space-between; gap: .6rem;
      background: rgba(255, 255, 255, .04); border-radius: 8px; padding: .45rem .6rem;
    }
    .doc-nome { font-size: .875rem; word-break: break-all; }
  `]
})
export class EntregasComponent implements OnInit {
  ehDronista = false;
  lista: any[] = [];
  carregando = true; erro = '';
  notaPorId: any = {};
  comentarioPorId: any = {};
  videoUrl: string | null = null;      // blob autenticado (video principal legado)
  videoEntregaId = '';
  videoArquivoUrl: string | null = null; // blob do arquivo da lista (N vídeos)
  videoArquivoId = '';

  constructor(private api: ApiService, private dialog: DialogService) {}

  bytes(n: any): string {
    if (n == null) return '';
    if (n >= 1024 * 1024 * 1024) return (n / 1024 / 1024 / 1024).toFixed(1) + ' GB';
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    return (n / 1024).toFixed(0) + ' KB';
  }

  /** Abre um vídeo da lista (blob autenticado pelo backend). */
  abrirArquivo(a: any) {
    if (this.videoArquivoId === a.id) { this.videoArquivoId = ''; this.videoArquivoUrl = null; return; }
    this.videoArquivoId = a.id; this.videoArquivoUrl = null;
    this.api.videoArquivo(a.id).subscribe({
      next: url => { this.videoArquivoUrl = url; },
      error: err => this.dialog.info(err.error?.mensagem || 'Não foi possível abrir o vídeo')
    });
  }

  /** Abre o vídeo da entrega pela plataforma (blob via backend autenticado — nunca link do S3). */
  abrirVideo(e: any) {
    if (this.videoEntregaId === e.id) { this.videoEntregaId = ''; this.videoUrl = null; return; }
    this.videoEntregaId = e.id; this.videoUrl = null;
    this.api.videoEntrega(e.id).subscribe({
      next: url => { this.videoUrl = url; },
      error: err => this.dialog.info(err.error?.mensagem || 'Não foi possível abrir o vídeo')
    });
  }

  ngOnInit() {
    this.ehDronista = papelAtual() === 'DRONISTA';
    const pedido = this.ehDronista ? this.api.minhasEntregas() : this.api.entregasRecebidas();
    pedido.subscribe({
      next: es => { this.lista = es || []; this.carregando = false; },
      error: e => { this.erro = e.error?.mensagem || 'Erro ao carregar'; this.carregando = false; }
    });
  }

  aprovar(e: any) {
    this.dialog.confirmar({
      titulo: 'Aprovar entrega',
      mensagem: 'Aprovar este vídeo? O pagamento ao dronista será liberado e o trabalho concluído.',
      textoConfirmar: 'Aprovar e liberar'
    }).then(ok => {
      if (!ok) return;
      this.api.aprovarEntrega(e.id).subscribe({
        next: () => { flashSet('Entrega aprovada! Pagamento liberado.'); this.ngOnInit(); },
        error: err => this.dialog.info(err.error?.mensagem || 'Erro ao aprovar')
      });
    });
  }

  recusar(e: any) {
    this.dialog.confirmar({
      titulo: 'Recusar entrega',
      mensagem: 'Recusar este vídeo? O dronista poderá enviar uma nova versão.',
      textoConfirmar: 'Recusar', perigoso: true
    }).then(ok => {
      if (!ok) return;
      this.api.recusarEntrega(e.id).subscribe({
        next: () => this.ngOnInit(),
        error: err => this.dialog.info(err.error?.mensagem || 'Erro ao recusar')
      });
    });
  }

  avaliar(e: any) {
    this.api.avaliarEntrega(e.id, this.notaPorId[e.id], this.comentarioPorId[e.id] || '').subscribe({
      next: () => { flashSet('Avaliação enviada. Obrigado!'); this.ngOnInit(); },
      error: err => this.dialog.info(err.error?.mensagem || 'Erro ao avaliar')
    });
  }

  avaliarSolicitante(e: any) {
    this.api.avaliarSolicitante(e.id, this.notaPorId[e.id], this.comentarioPorId[e.id] || '').subscribe({
      next: () => { flashSet('Avaliação enviada.'); this.ngOnInit(); },
      error: err => this.dialog.info(err.error?.mensagem || 'Erro ao avaliar')
    });
  }

  rotuloStatus(s: string): string {
    return { ENVIADA: 'aguardando aprovação', APROVADA: 'aprovada ✓', REJEITADA: 'recusada' }[s] || s;
  }
}
