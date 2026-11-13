import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ApiService } from './api.service';
import { papelAtual, flashSet } from './papel';
import { EstrelasComponent } from './estrelas.component';
import { DialogService } from './dialog.service';
import { MascaraValorDirective, Mascara } from './mascara';
/**
 * Detalhe da proposta — coração do fluxo:
 * - Solicitante autora: vê as contas-proposta recebidas, aceita/recusa, aprova a entrega,
 *   avalia o dronista e libera o pagamento.
 * - Dronista: envia a sua conta-proposta; quando aceito, entrega o vídeo, acompanha
 *   a aprovação e avalia o solicitante.
 */
@Component({
  selector: 'app-proposta-detalhe',
  standalone: true,
  imports: [FormsModule, RouterLink, EstrelasComponent, DatePipe, MascaraValorDirective],
  template: `
  <button class="volta" (click)="voltar()">← Voltar</button>

  @if (carregando) { <div class="alert alert-info">Carregando...</div> }
  @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

  @if (p) {
    <div class="cabecalho-pagina">
      <h1>{{ p.titulo }}</h1>
      <span class="badge" [class]="'badge-' + p.status.toLowerCase()">{{ rotuloStatus(p.status) }}</span>
    </div>

    <div class="card">
      <ul class="meta-lista" style="margin-top:0">
        <li>📅 <b>{{ p.dataVoo | date:'dd/MM/yyyy' }}</b> às <b>{{ hhmm(p.horaVoo) }}</b> · duração {{ p.duracaoMin }} min</li>
        <li>🎥 {{ rotuloQualidade(p.qualidadeVideo) }}@if (p.fps) { · {{ p.fps }} fps } · formato {{ p.formatoVideo }}</li>
        <li>📍 {{ rotuloLocal(p) }}</li>
        @if (ehDronista && p.distanciaKm != null) { <li>🛩️ Sua base fica a <b>~{{ p.distanciaKm }} km</b> do local do voo</li> }
        @if (p.descricao) { <li>📝 {{ p.descricao }}</li> }
        <li>👤 Solicitante: <b>{{ p.nomeSolicitante }}</b></li>
        <li>💰 Valor oferecido: <span class="valor grande" style="color:#6ee7a0">R$ {{ p.valorOferecido }}</span></li>
      </ul>

      @if (ehAutor && p.status === 'ABERTA') {
        <div class="acoes-linha">
          <button class="btn btn-danger btn-sm" (click)="cancelar()">🗑️ Cancelar proposta</button>
        </div>
      }
    </div>

    <!-- ===== Solicitante: contas recebidas ===== -->
    @if (ehAutor) {
      @if (p.status === 'ABERTA') {
        <h2>📨 Contas-proposta recebidas ({{ contas.length }})</h2>
        @for (c of contas; track c.id) {
          <div class="cartao-item">
            <div class="linha-topo">
              <h3 class="card-titulo"><span class="drone-icone"></span> {{ c.nomeDronista }}
                @if (c.notaDronista != null) { <app-estrelas [nota]="c.notaDronista"></app-estrelas> }
              </h3>
              <span class="badge badge-enviada">{{ rotuloStatusConta(c.status) }}</span>
            </div>
            <ul class="meta-lista">
              <li>💰 Proposta do dronista: <span class="valor grande">R$ {{ c.valorProposto }}</span></li>
              @if (c.licencaAnacDronista) { <li>🪪 Licença ANAC: {{ c.licencaAnacDronista }}</li> }
              @if (c.cidadeDronista) { <li>📍 Base do dronista: {{ c.cidadeDronista }}@if (c.estadoDronista) {/{{ c.estadoDronista }} }</li> }
              @if (c.mensagem) { <li>💬 "{{ c.mensagem }}"</li> }
            </ul>
            <div class="acoes-linha">
              <button class="btn" (click)="aceitar(c)">✓ Aceitar esta conta</button>
              <button class="btn btn-outline btn-sm" (click)="recusarConta(c)">Recusar</button>
            </div>
          </div>
        } @empty {
          <div class="vazio"><span class="icone">📭</span>Ainda sem contas-proposta. Os dronistas verão sua proposta no marketplace e poderão enviar propostas de preço.</div>
        }
      }

      @if (entrega) {
        <h2>🎬 Entrega{{ p.status === 'CONCLUIDA' ? ' aprovada — pagamento liberado 💸' : ' do vídeo' }}</h2>
        <div class="cartao-item">
          <ul class="meta-lista" style="margin-top:0">
            <li><span class="drone-icone"></span> {{ entrega.nomeDronista }}</li>
            <li>🔗 <a [href]="entrega.urlVideo" target="_blank" rel="noopener" class="link-video">{{ entrega.urlVideo }}</a></li>
            @if (entrega.observacao) { <li>💬 {{ entrega.observacao }}</li> }
          </ul>

          <div class="acoes-linha status-entrega">
            <span class="badge" [class]="'badge-' + entrega.status.toLowerCase()">{{ rotuloStatusEntrega(entrega.status) }}</span>
          </div>

          @if (entrega.status === 'ENVIADA') {
            <div class="alert alert-info">Aprove o vídeo para liberar o pagamento ao dronista. Se não estiver bom, recuse para receber uma nova versão.</div>
            <div class="acoes-linha">
              <button class="btn" (click)="aprovarEntrega()">✓ Aprovar e liberar pagamento</button>
              <button class="btn btn-danger" (click)="recusarEntrega()">✕ Recusar entrega</button>
            </div>
          }

          @if (entrega.status === 'APROVADA' && entrega.nota == null) {
            <h3>⭐ Avalie o dronista</h3>
            <app-estrelas [clicavel]="true" [grandes]="true" [nota]="nota" (aoMarcar)="nota = $event"></app-estrelas>
            <label>Comentário (opcional)
              <textarea [(ngModel)]="comentario" name="comentario" rows="2" placeholder="Como foi trabalhar com este dronista?"></textarea>
            </label>
            <div class="acoes-linha">
              <button class="btn" (click)="avaliarDronista()" [disabled]="!nota || avaliando">Enviar avaliação</button>
            </div>
          }
          @if (entrega.status === 'APROVADA' && entrega.nota != null) {
            <div class="alert alert-success">Trabalho concluído, pagamento liberado e avaliação registrada: {{ entrega.nota }}★</div>
          }
        </div>
      }
    }

    <!-- ===== Dronista: enviar conta / entregar vídeo ===== -->
    @if (ehDronista) {
      @if (p.status === 'ABERTA') {
        @if (minhaConta) {
          <h2>📨 Sua conta-proposta</h2>
          <div class="cartao-item">
            <ul class="meta-lista" style="margin-top:0">
              <li>💰 Valor proposto: <span class="valor grande">R$ {{ minhaConta.valorProposto }}</span></li>
              <li><span class="badge badge-enviada">aguardando o solicitante</span></li>
              @if (minhaConta.mensagem) { <li>💬 "{{ minhaConta.mensagem }}"</li> }
            </ul>
            <div class="acoes-linha">
              <button class="btn btn-outline btn-sm" (click)="editarConta = !editarConta">✏️ Atualizar proposta</button>
            </div>
            <div class="acoes-linha destaque-aceite">
              <button class="btn" (click)="aceitarDeCara()">✓ Aceitar de cara o valor ofertado (R$ {{ p.valorOferecido }})</button>
            </div>
            <small class="hint">Aceitar de cara fecha o acordo no valor do anúncio e descarta sua contraproposta atual.</small>
            @if (editarConta) {
              <form (ngSubmit)="enviarConta()">
                <label>Novo valor (R$)
                  <input [(ngModel)]="valorConta" name="valorConta" inputmode="numeric" required
                         mascaraValor placeholder="Ex.: 350,00">
                </label>
                <label>Mensagem
                  <textarea [(ngModel)]="mensagemConta" name="mensagemConta" rows="2"></textarea>
                </label>
                <button class="btn btn-sm" type="submit" [disabled]="ocupado">Salvar atualização</button>
              </form>
            }
          </div>
        } @else {
          <div class="acoes-linha destaque-aceite">
            <button class="btn" (click)="aceitarDeCara()">✓ Aceitar de cara o valor ofertado (R$ {{ p.valorOferecido }})</button>
          </div>
          <h2>📨 Ou envie sua conta-proposta</h2>
          <div class="card">
            <form (ngSubmit)="enviarConta()" #f="ngForm">
              <label>Seu preço para este trabalho (R$)
                <input [(ngModel)]="valorConta" name="valorConta" inputmode="numeric" required
                       mascaraValor placeholder="Ex.: 350,00">
              </label>
              <label>Mensagem ao solicitante
                <textarea [(ngModel)]="mensagemConta" name="mensagemConta" rows="2"
                          placeholder="Conte por que você é a melhor escolha, seu equipamento, experiência..."></textarea>
              </label>
              @if (erroConta) { <div class="alert alert-error">⚠️ {{ erroConta }}</div> }
              <button class="btn btn-block" type="submit" [disabled]="f.invalid || ocupado">
                {{ ocupado ? 'Enviando...' : 'Enviar conta-proposta' }}
              </button>
            </form>
          </div>
        }
      }

      @if (fuiAceito) {
        <h2>🎬 Sua entrega</h2>
        <div class="cartao-item">
          @if (entrega && entrega.status === 'ENVIADA') {
            <div class="alert alert-info">Vídeo enviado. Aguardando aprovação do solicitante.</div>
            <ul class="meta-lista">
              <li>🔗 <a [href]="entrega.urlVideo" target="_blank" rel="noopener" class="link-video">{{ entrega.urlVideo }}</a></li>
            </ul>
          }
          @if (!entrega || entrega.status === 'REJEITADA') {
            @if (entrega?.status === 'REJEITADA') {
              <div class="alert alert-error">⚠️ Sua entrega foi recusada. Ajuste e envie novamente.</div>
            }
            <form (ngSubmit)="entregarVideo()" #fe="ngForm">
              <label>URL do vídeo (YouTube, Drive, Vimeo...)
                <input [(ngModel)]="urlVideo" name="urlVideo" type="url" required placeholder="https://...">
              </label>
              <label>Observação (opcional)
                <textarea [(ngModel)]="obsEntrega" name="obsEntrega" rows="2"></textarea>
              </label>
              @if (erroEntrega) { <div class="alert alert-error">⚠️ {{ erroEntrega }}</div> }
              <button class="btn btn-block" type="submit" [disabled]="fe.invalid || ocupado">
                {{ ocupado ? 'Enviando...' : '🎬 Entregar vídeo' }}
              </button>
            </form>
          }
          @if (entrega && entrega.status === 'APROVADA') {
            <div class="alert alert-success">✓ Entrega aprovada! Pagamento liberado pelo solicitante.</div>
            @if (entrega.nota != null) { <p class="muted">Nota recebida: {{ entrega.nota }}★ @if (entrega.comentario) { — "{{ entrega.comentario }}" }</p> }
            @if (entrega.notaSolicitante == null) {
              <h3>⭐ Avalie este solicitante</h3>
              <app-estrelas [clicavel]="true" [grandes]="true" [nota]="notaSolic" (aoMarcar)="notaSolic = $event"></app-estrelas>
              <label>Comentário (opcional)
                <textarea [(ngModel)]="comentarioSolic" name="comentarioSolic" rows="2"></textarea>
              </label>
              <div class="acoes-linha">
                <button class="btn" (click)="avaliarSolicitante()" [disabled]="!notaSolic || ocupado">Enviar avaliação</button>
              </div>
            } @else {
              <p class="muted">Sua avaliação ao solicitante: {{ entrega.notaSolicitante }}★ @if (entrega.comentarioSolicitante) { — "{{ entrega.comentarioSolicitante }}" }</p>
            }
          }
        </div>
      }
    }
  }`,
  styles: [`
    .link-video { color: #3ea6ff; font-weight: 500; word-break: break-all; }
    .status-entrega { margin-top: .5rem; }
    .destaque-aceite {
      background: var(--color-success-bg); border: 1px solid var(--color-success);
      border-radius: var(--radius); padding: .6rem .75rem;
    }
  `]
})
export class PropostaDetalheComponent implements OnInit {
  id = '';
  p: any = null;
  contas: any[] = [];
  entrega: any = null;
  minhaConta: any = null;

  ehDronista = papelAtual() === 'DRONISTA';
  ehAutor = false;
  fuiAceito = false;

  valorConta: any = ''; mensagemConta = '';
  editarConta = false;
  urlVideo = ''; obsEntrega = '';
  nota: number | null = null; comentario = '';
  notaSolic: number | null = null; comentarioSolic = '';

  carregando = true; ocupado = false;
  erro = ''; erroConta = ''; erroEntrega = '';

  constructor(private api: ApiService, private router: Router, private route: ActivatedRoute,
              private dialog: DialogService) {}

  ngOnInit() {
    this.id = this.route.snapshot.paramMap.get('id') || '';
    this.carregar();
  }

  carregar() {
    this.carregando = true;
    this.api.proposta(this.id).subscribe({
      next: p => {
        this.p = p;
        if (this.ehDronista) this.carregarLadoDronista();
        else {
          this.api.minhasPropostas().subscribe(ms => {
            this.ehAutor = (ms || []).some((m: any) => m.id === this.id);
            if (this.ehAutor) this.carregarLadoAutor();
            this.carregando = false;
          }, () => this.carregando = false);
        }
      },
      error: e => { this.erro = e.error?.mensagem || 'Proposta não encontrada'; this.carregando = false; }
    });
  }

  private carregarLadoAutor() {
    this.api.contasDaProposta(this.id).subscribe(cs => this.contas = cs || []);
    this.api.entregasRecebidas().subscribe(es => {
      const contaAceita = this.p.contaAceitaId;
      this.entrega = (es || []).find((e: any) => e.contaId === contaAceita) || null;
    });
  }

  private carregarLadoDronista() {
    this.api.minhasContas().subscribe(cs => {
      this.minhaConta = (cs || []).find((c: any) => c.propostaId === this.id) || null;
      if (this.minhaConta) {
        this.valorConta = Mascara.valorDeExibicao(this.minhaConta.valorProposto);
        this.mensagemConta = this.minhaConta.mensagem || '';
      }
      this.fuiAceito = !!this.minhaConta && this.minhaConta.status === 'ACEITA'
        && (this.p.status === 'ACEITA' || this.p.status === 'CONCLUIDA');
      if (this.fuiAceito) {
        this.api.minhasEntregas().subscribe(es => {
          this.entrega = (es || []).find((e: any) => e.contaId === this.minhaConta.id) || null;
        });
      }
    });
  }

  aceitarDeCara() {
    this.dialog.confirmar({
      titulo: 'Aceitar o valor ofertado',
      mensagem: `Fechar o acordo por R$ ${this.p.valorOferecido}?\nVocê será contratado imediatamente e novas contrapropostas ficam bloqueadas.`,
      textoConfirmar: 'Aceitar de cara'
    }).then(ok => {
      if (!ok) return;
      this.api.aceitarPropostaDeCara(this.id).subscribe({
        next: () => {
          flashSet('Acordo fechado! Você foi contratado pelo valor ofertado. Prepare a captura e entregue o vídeo.');
          this.carregar();
        },
        error: e => this.dialog.info(e.error?.mensagem || 'Erro ao aceitar — a proposta pode ter sido fechada por outro dronista')
      });
    });
  }

  enviarConta() {
    this.erroConta = ''; this.ocupado = true;
    this.api.enviarConta(this.id, { valorProposto: Mascara.numeroDeValorBr(this.valorConta), mensagem: this.mensagemConta || null })
      .subscribe({
        next: () => { this.ocupado = false; this.editarConta = false; this.carregar(); },
        error: e => { this.ocupado = false; this.erroConta = e.error?.mensagem || 'Erro ao enviar conta-proposta'; }
      });
  }

  aceitar(c: any) {
    this.dialog.confirmar({
      titulo: 'Aceitar conta-proposta',
      mensagem: `Aceitar ${c.nomeDronista} por R$ ${c.valorProposto}?\nAs demais contas serão recusadas automaticamente.`,
      textoConfirmar: 'Aceitar'
    }).then(ok => {
      if (!ok) return;
      this.api.aceitarConta(c.id).subscribe({
        next: () => { flashSet('Conta aceita! O dronista foi contratado e receberá o trabalho.'); this.carregar(); },
        error: e => this.dialog.info(e.error?.mensagem || 'Erro ao aceitar')
      });
    });
  }

  recusarConta(c: any) {
    this.api.recusarConta(c.id).subscribe({ next: () => this.carregar(),
      error: e => this.dialog.info(e.error?.mensagem || 'Erro ao recusar') });
  }

  cancelar() {
    this.dialog.confirmar({
      titulo: 'Cancelar proposta',
      mensagem: 'Cancelar esta proposta de voo? Ela deixará de aparecer para os dronistas.',
      textoConfirmar: 'Cancelar proposta', perigoso: true
    }).then(ok => {
      if (!ok) return;
      this.api.cancelarProposta(this.id).subscribe({
        next: () => { flashSet('Proposta cancelada.'); this.carregar(); },
        error: e => this.dialog.info(e.error?.mensagem || 'Erro ao cancelar')
      });
    });
  }

  entregarVideo() {
    this.erroEntrega = ''; this.ocupado = true;
    this.api.entregarVideo(this.minhaConta.id, { urlVideo: this.urlVideo, observacao: this.obsEntrega || null })
      .subscribe({
        next: () => { this.ocupado = false; this.carregar(); },
        error: e => { this.ocupado = false; this.erroEntrega = e.error?.mensagem || 'Erro ao entregar vídeo'; }
      });
  }

  aprovarEntrega() {
    this.dialog.confirmar({
      titulo: 'Aprovar entrega',
      mensagem: 'Aprovar este vídeo? O pagamento ao dronista será liberado e o trabalho concluído.',
      textoConfirmar: 'Aprovar e liberar'
    }).then(ok => {
      if (!ok) return;
      this.api.aprovarEntrega(this.entrega.id).subscribe({
        next: () => { flashSet('Entrega aprovada! Pagamento liberado ao dronista. Não esqueça de avaliar.'); this.carregar(); },
        error: e => this.dialog.info(e.error?.mensagem || 'Erro ao aprovar')
      });
    });
  }

  recusarEntrega() {
    this.dialog.confirmar({
      titulo: 'Recusar entrega',
      mensagem: 'Recusar este vídeo? O dronista poderá enviar uma nova versão.',
      textoConfirmar: 'Recusar', perigoso: true
    }).then(ok => {
      if (!ok) return;
      this.api.recusarEntrega(this.entrega.id).subscribe({
        next: () => this.carregar(),
        error: e => this.dialog.info(e.error?.mensagem || 'Erro ao recusar')
      });
    });
  }

  avaliarDronista() {
    this.avaliando = true;
    this.api.avaliarEntrega(this.entrega.id, this.nota!, this.comentario || '').subscribe({
      next: () => { this.avaliando = false; flashSet('Avaliação enviada. Obrigado!'); this.carregar(); },
      error: e => { this.avaliando = false; this.dialog.info(e.error?.mensagem || 'Erro ao avaliar'); }
    });
  }

  avaliando = false;

  avaliarSolicitante() {
    this.ocupado = true;
    this.api.avaliarSolicitante(this.entrega.id, this.notaSolic!, this.comentarioSolic || '').subscribe({
      next: () => { this.ocupado = false; flashSet('Avaliação enviada.'); this.carregar(); },
      error: e => { this.ocupado = false; this.dialog.info(e.error?.mensagem || 'Erro ao avaliar'); }
    });
  }

  rotuloStatus(s: string): string {
    return { ABERTA: 'Aberta', ACEITA: 'Aceita', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' }[s] || s;
  }
  rotuloStatusConta(s: string): string {
    return { ENVIADA: 'em análise', ACEITA: 'aceita', RECUSADA: 'recusada' }[s] || s;
  }
  rotuloStatusEntrega(s: string): string {
    return { ENVIADA: 'aguardando aprovação', APROVADA: 'aprovada ✓', REJEITADA: 'recusada' }[s] || s;
  }
  rotuloQualidade(q: string): string {
    return { FULLHD: 'Full HD 1080p', '2K': '2K', '4K_30FPS': '4K 30fps', '4K_60FPS': '4K 60fps', '4K_120FPS': '4K 120fps' }[q] || q;
  }
  rotuloLocal(p: any): string {
    const partes = [p.bairro, p.cidade, p.estado].filter((x: string) => !!x);
    const base = partes.length ? partes.join(' · ') : 'Local não informado';
    return p.local ? base + ' — ' + p.local : base;
  }
  hhmm(t: string): string { return (t || '').slice(0, 5); }

  voltar() { this.router.navigate(['/app/propostas']); }
}
