import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { DatePipe, DecimalPipe } from '@angular/common';
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
  imports: [FormsModule, RouterLink, EstrelasComponent, DatePipe, DecimalPipe, MascaraValorDirective],
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

    @if (p.lat != null && p.lng != null) {
      <div class="card mapa-visual">
        <div class="mapa-visual-topo">
          <b>📍 Local do voo</b>
          <button type="button" class="chip" style="min-height:30px; margin:0" (click)="alternarCamadaVisual()">
            {{ camadaVisual === 'satelite' ? '🛰️ Satélite' : '🗺️ Ruas' }}
          </button>
        </div>
        <div id="mapa-detalhe" class="mapa-visual-area"></div>
        <small class="hint" style="padding:.55rem .9rem .8rem">Ponto marcado pelo solicitante ({{ p.lat | number:'1.0-5' }}, {{ p.lng | number:'1.0-5' }}).</small>
      </div>
    }

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
            @if (entrega.arquivos?.length) {
              <li>🎬 {{ entrega.arquivos.length }} vídeo(s) entregue(s) — assista abaixo</li>
            } @else {
              <li>🎬 <button class="mini" (click)="abrirVideo()">▶️ Assistir ao vídeo pela plataforma</button></li>
            }
            @if (entrega.observacao) { <li>💬 {{ entrega.observacao }}</li> }
          </ul>
          @if (videoUrl && assistindo) {
            <div class="video-box">
              <video [src]="videoUrl" controls preload="metadata" style="width:100%; max-height:480px; border-radius:8px; background:#000"></video>
            </div>
          }
          @if (entrega.arquivos?.length) {
            <div class="docs-lista">
              @for (a of entrega.arquivos; track a.id) {
                <div class="doc-item">
                  <span class="doc-nome">🎬 {{ a.nomeOriginal }} <small class="muted">· {{ tamanho(a.tamanho) }}</small></span>
                  <button type="button" class="mini" (click)="abrirArquivo(a)">▶️ Assistir</button>
                </div>
                @if (videoArquivoId === a.id && videoArquivoUrl) {
                  <div class="video-box">
                    <video [src]="videoArquivoUrl" controls preload="metadata" style="width:100%; max-height:420px; border-radius:8px; background:#000"></video>
                  </div>
                }
              }
            </div>
          }
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
      @if (p.status === 'ABERTA' && validacaoDoc !== 'APROVADA') {
        <div class="alert alert-warning">
          🔒 <b>Cadastro em aprovação.</b>
          @if (validacaoDoc === 'ENVIADA') {
            Seu documento está em análise — assim que aprovado, você poderá
            <b>aceitar esta proposta</b>. Acompanhe o status em
            <a routerLink="/app/perfil">seu perfil</a>.
          } @else if (validacaoDoc === 'REJEITADA') {
            Seu documento não pôde ser validado — envie uma foto nítida (frente e verso) no
            <a routerLink="/app/perfil">seu perfil</a> para liberar o aceite de propostas.
          } @else {
            Envie a foto do seu documento (RG/CNH) no <a routerLink="/app/perfil">seu perfil</a>
            para liberar o aceite de propostas. Você pode visualizar tudo enquanto isso.
          }
        </div>
      }

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
              <button class="btn" [disabled]="validacaoDoc !== 'APROVADA'" (click)="aceitarDeCara()">✓ Aceitar o valor ofertado (R$ {{ p.valorOferecido }})</button>
            </div>
            <small class="hint">Aceitar o valor ofertado fecha o acordo no preço do anúncio e descarta sua contraproposta atual.</small>
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
            <button class="btn" [disabled]="validacaoDoc !== 'APROVADA'" (click)="aceitarDeCara()">✓ Aceitar o valor ofertado (R$ {{ p.valorOferecido }})</button>
          </div>
          <h2>📨 Ou envie sua conta-proposta</h2>
          <div class="card">
            <form (ngSubmit)="enviarConta()" #f="ngForm">
              <label>Seu preço para este trabalho (R$)
                <input [(ngModel)]="valorConta" name="valorConta" inputmode="numeric" required
                       mascaraValor [disabled]="validacaoDoc !== 'APROVADA'"
                       placeholder="Ex.: 350,00">
              </label>
              <label>Mensagem ao solicitante
                <textarea [(ngModel)]="mensagemConta" name="mensagemConta" rows="2"
                          [disabled]="validacaoDoc !== 'APROVADA'"
                          placeholder="Conte por que você é a melhor escolha, seu equipamento, experiência..."></textarea>
              </label>
              @if (erroConta) { <div class="alert alert-error">⚠️ {{ erroConta }}</div> }
              <button class="btn btn-block" type="submit" [disabled]="f.invalid || ocupado || validacaoDoc !== 'APROVADA'">
                {{ ocupado ? 'Enviando...' : 'Enviar conta-proposta' }}
              </button>
            </form>
          </div>
        }
      }

      @if (fuiAceito) {
        <h2>🎬 Sua entrega</h2>
        <div class="cartao-item">
          @if (entrega && entrega.arquivos?.length) {
            @if (entrega.status === 'ENVIADA') {
              <div class="alert alert-info">{{ entrega.arquivos.length }} vídeo(s) entregue(s) ao solicitante. Aguardando aprovação — o vídeo não pode mais ser removido nem substituído; se for recusado, você poderá enviar uma nova versão.</div>
            }
            <div class="docs-lista">
              @for (a of entrega.arquivos; track a.id) {
                <div class="doc-item">
                  <span class="doc-nome">🎬 {{ a.nomeOriginal }} <small class="muted">· {{ tamanho(a.tamanho) }}</small></span>
                  <span class="doc-acoes">
                    <button class="mini" (click)="abrirArquivo(a)">▶️ Assistir</button>
                    @if (entrega.status === 'REJEITADA') {
                      <button class="mini perigo" (click)="removerArquivo(a)">🗑️ Remover</button>
                    }
                  </span>
                </div>
                @if (videoArquivoId === a.id && videoArquivoUrl) {
                  <div class="video-box">
                    <video [src]="videoArquivoUrl" controls preload="metadata" style="width:100%; max-height:420px; border-radius:8px; background:#000"></video>
                  </div>
                }
              }
            </div>
          }
          @if (entrega && entrega.videoTamanho != null && entrega.arquivos?.length === 0) {
            <div class="alert alert-info">Vídeo enviado ({{ tamanho(entrega.videoTamanho) }}). Aguardando aprovação do solicitante.</div>
            <div class="acoes-linha">
              <button class="btn btn-outline btn-sm" (click)="abrirVideo()">▶️ Assistir / conferir</button>
            </div>
          }
          <div class="upload-zona">
            @if (entrega && entrega.arquivos?.length < 10) {
              <div class="upload-slot">
                <b>📎 Anexar outro vídeo à entrega ({{ 10 - (entrega?.arquivos?.length || 0) }} restantes)</b>
                <small class="hint">MP4, MOV, WebM, MKV ou AVI · 8 GB por arquivo — clipes/parts separados.</small>
                <input type="file" name="arqExtra" accept=".mp4,.mov,.webm,.mkv,.avi,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo"
                       [disabled]="subindoExtra" (change)="anexarExtra($event)">
              </div>
              @if (subindoExtra) {
                <div class="progresso-upload">
                  <div class="prog-barra"><div class="prog-preenchido" [style.width.%]="progressoExtra"></div></div>
                  <span class="prog-txt">⬆️ Enviando — {{ progressoExtra }}%</span>
                </div>
              }
            }
          </div>
          @if (!entrega || entrega.status === 'REJEITADA') {
            @if (entrega?.status === 'REJEITADA') {
              <div class="alert alert-error">⚠️ Sua entrega foi recusada. Anexe novamente e realize a entrega ao solicitante.</div>
            }
            <div class="docs-lista">
              @for (r of rascunho; track r.id) {
                <div class="doc-item">
                  <span class="doc-nome">🎬 {{ r.nomeOriginal }} <small class="muted">· {{ tamanho(r.tamanho) }}</small></span>
                  <span class="doc-acoes">
                    <button class="mini" (click)="abrirRascunho(r)">▶️ Conferir</button>
                    <button class="mini perigo" (click)="tirarDoRascunho(r)">🗑️ Remover</button>
                  </span>
                </div>
              } @empty {
                <span class="falta">Nenhum vídeo anexado ainda — eles só vão para o solicitante depois de "Entregar vídeo".</span>
              }
            </div>
            <div class="upload-zona">
              <div class="upload-slot">
                <b>📎 Anexar vídeo ({{ rascunho.length }}/10 anexados)</b>
                <small class="hint">MP4, MOV, WebM, MKV ou AVI · 8 GB por arquivo.</small>
                <input type="file" name="arqRasc" accept=".mp4,.mov,.webm,.mkv,.avi,video/mp4,video/quicktime,video/webm,video/x-matroska,video/x-msvideo"
                       [disabled]="subindoExtra" (change)="anexarRascunho($event)">
              </div>
              @if (subindoExtra) {
                <div class="progresso-upload">
                  <div class="prog-barra"><div class="prog-preenchido" [style.width.%]="progressoExtra"></div></div>
                  <span class="prog-txt">⬆️ Enviando — {{ progressoExtra }}%</span>
                </div>
              }
              <label>Observação para o solicitante (opcional)
                <textarea [(ngModel)]="obsEntrega" name="obsEntrega" rows="2"></textarea>
              </label>
              @if (erroEntrega) { <div class="alert alert-error">⚠️ {{ erroEntrega }}</div> }
              <button class="btn btn-block" type="button" [disabled]="rascunho.length === 0 || finalizando" (click)="finalizar()">
                {{ finalizando ? '🎬 Realizando entrega...' : '🎬 Entregar vídeo ao solicitante' }}
              </button>
              <small class="hint">Anexe todos os arquivos primeiro — eles só ficam visíveis ao solicitante depois da entrega. Até 10 vídeos · 8 GB cada.</small>
            </div>
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
    .upload-zona { border: 1.5px dashed var(--color-border); border-radius: var(--radius); padding: .9rem; display: grid; gap: .7rem; }
    .upload-slot { display: flex; flex-direction: column; gap: .3rem; }
    .upload-slot b { font-size: .9rem; }
    .upload-slot input[type="file"] { padding: .4rem; margin-top: 0; min-height: 0; font-size: .85rem; }
    .upload-slot .ok { color: #7ee08a; font-size: .85rem; word-break: break-all; }
    .upload-slot .falta { color: var(--color-text-muted); font-size: .85rem; }
    .mini { border: none; background: none; color: #3ea6ff; font-size: .875rem; cursor: pointer; padding: .2rem .3rem; }
    .video-box { margin-top: .7rem; }
    .docs-lista { display: grid; gap: .4rem; margin-top: .6rem; }
    .doc-item {
      display: flex; align-items: center; justify-content: space-between; gap: .6rem;
      background: rgba(255, 255, 255, .04); border-radius: 8px; padding: .45rem .6rem;
    }
    .doc-nome { font-size: .875rem; word-break: break-all; }
    .doc-acoes { display: flex; gap: .6rem; flex-shrink: 0; }
    .mini { border: none; background: none; color: #3ea6ff; font-size: .8rem; cursor: pointer; padding: .15rem .3rem; }
    .mini.perigo { color: var(--color-error); }
    .progresso-upload { display: flex; flex-direction: column; gap: .35rem; }
    .prog-barra { height: 10px; border-radius: 999px; background: rgba(255, 255, 255, .08); overflow: hidden; }
    .prog-preenchido { height: 100%; background: #3ea6ff; border-radius: 999px; transition: width .3s ease; }
    .prog-txt { font-size: .85rem; font-weight: 600; color: #7cc0ff; }
    .mapa-visual-topo {
      display: flex; align-items: center; justify-content: space-between;
      padding: .7rem .9rem .4rem;
    }
    .mapa-visual-area { height: 260px; width: 100%; }
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
  obsEntrega = '';
  nota: number | null = null; comentario = '';
  notaSolic: number | null = null; comentarioSolic = '';
  validacaoDoc = 'PENDENTE';   // bloqueia aceite quando não APROVADA

  // Entrega do vídeo — fluxo novo: rascunho (anexa N) → finaliza (entrega visível)
  rascunho: any[] = [];
  finalizando = false;
  subindoExtra = false;
  progressoExtra = 0;
  rascBlobUrl: string | null = null;
  rascBlobId = '';
  videoUrl: string | null = null;   // blob do vídeo principal (legado/upload único)
  assistindo = false;
  videoArquivoUrl: string | null = null;
  videoArquivoId = '';

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
        this.agendarMapaVisual();
        if (this.ehDronista) this.carregarLadoDronista();
        else {
          // Autoria: comparo o solicitanteId da proposta com o perfil do logado
          // (robusto e independente da paginação da listagem)
          this.api.meuPerfil().subscribe(me => {
            this.ehAutor = !!me?.perfilId && String(this.p.solicitanteId) === String(me.perfilId);
            if (this.ehAutor) this.carregarLadoAutor();
            this.carregando = false;
          }, () => {
            this.carregando = false;
          });
        }
      },
      error: e => { this.erro = e.error?.mensagem || 'Proposta não encontrada'; this.carregando = false; }
    });
  }

  // ---------- Mapa do local (somente visualização) ----------

  camadaVisual: 'satelite' | 'ruas' = 'satelite';
  private mapaVisual: any = null;
  private camadaTilesVisual: any = null;

  /** Agenda a inicialização do mapa quando o template o renderizar. */
  private agendarMapaVisual() {
    if (this.p?.lat == null || this.p?.lng == null) return;
    setTimeout(() => this.iniciarMapaVisual(), 50);
  }

  private carregarLeaflet(): Promise<void> {
    return new Promise((resolve, reject) => {
      const w = window as any;
      if (w.L) { resolve(); return; }
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(link);
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Falha ao carregar mapa'));
      document.body.appendChild(script);
    });
  }

  private async iniciarMapaVisual() {
    const el = document.getElementById('mapa-detalhe');
    if (!el || this.p?.lat == null) return;
    // Se o mapa refere um container que saiu do DOM (re-render do template), descarta e recria
    const container = this.mapaVisual?.getContainer?.();
    if (this.mapaVisual && (!container || !container.isConnected)) {
      this.mapaVisual.remove();
      this.mapaVisual = null;
      this.camadaTilesVisual = null;
    }
    if (this.mapaVisual) { this.mapaVisual.invalidateSize?.(); return; }
    try { await this.carregarLeaflet(); } catch { return; }
    const L = (window as any).L;
    this.mapaVisual = L.map(el).setView([this.p.lat, this.p.lng], 16);
    this.aplicarCamadaVisual();
    L.marker([this.p.lat, this.p.lng]).addTo(this.mapaVisual);
    setTimeout(() => this.mapaVisual?.invalidateSize(), 100);
  }

  private aplicarCamadaVisual() {
    const L = (window as any).L;
    if (!this.mapaVisual) return;
    if (this.camadaTilesVisual) this.mapaVisual.removeLayer(this.camadaTilesVisual);
    this.camadaTilesVisual = this.camadaVisual === 'satelite'
      ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Imagens © Esri, Maxar, Earthstar Geographics', maxZoom: 19 })
      : L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
    this.camadaTilesVisual.addTo(this.mapaVisual);
  }

  alternarCamadaVisual() {
    this.camadaVisual = this.camadaVisual === 'satelite' ? 'ruas' : 'satelite';
    this.aplicarCamadaVisual();
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
    // Cadastro em aprovação: dronista vê a proposta, mas não pode aceitar/ofertar
    this.api.meuPerfil().subscribe(perf => {
      this.validacaoDoc = perf?.validacaoDoc || 'PENDENTE';
    });
  }

  aceitarDeCara() {
    this.dialog.confirmar({
      titulo: 'Aceitar o valor ofertado',
      mensagem: `Fechar o acordo por R$ ${this.p.valorOferecido}?\nVocê será contratado imediatamente e novas contrapropostas ficam bloqueadas.`,
      textoConfirmar: 'Aceitar proposta'
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

  /** Dronista anexa um vídeo ao RASCUNHO (invisível ao solicitante até a entrega final). */
  anexarRascunho(ev: any) {
    const input = ev.target as HTMLInputElement;
    const arquivo = input.files && input.files[0];
    this.erroEntrega = '';
    if (!arquivo) return;
    if (arquivo.size > 8 * 1024 * 1024 * 1024) {
      this.erroEntrega = 'Vídeo maior que 8 GB - exporte em resolução menor e tente novamente.';
      input.value = '';
      return;
    }
    this.subindoExtra = true; this.progressoExtra = 0;
    this.api.anexarRascunho(this.minhaConta.id, arquivo, pct => { this.progressoExtra = pct; }).subscribe({
      next: () => {
        this.subindoExtra = false; this.progressoExtra = 0;
        this.carregarRascunho();
      },
      error: e => {
        this.subindoExtra = false; this.progressoExtra = 0;
        this.erroEntrega = e.error?.mensagem || 'Falha ao anexar o vídeo';
        input.value = '';
      }
    });
  }

  /** Carrega a lista de vídeso do rascunho (staging antes da entrega final). */
  carregarRascunho() {
    if (!this.minhaConta) return;
    this.api.rascunhoDaConta(this.minhaConta.id).subscribe({
      next: lista => { this.rascunho = lista || []; },
      error: e => { this.rascunho = []; }
    });
  }

  /** Remove 1 vídeo do rascunho (apaga do S3 também). */
  tirarDoRascunho(r: any) {
    this.api.removerRascunho(r.id).subscribe({
      next: () => this.carregarRascunho(),
      error: e => this.dialog.info(e.error?.mensagem || 'Falha ao remover')
    });
  }

  /** Confere 1 vídeo do rascunho (blob autenticado pelo backend). */
  abrirRascunho(r: any) {
    if (this.rascBlobId === r.id) { this.rascBlobId = ''; this.rascBlobUrl = null; return; }
    this.rascBlobId = r.id; this.rascBlobUrl = null;
    this.api.rascunhoConteudo(r.id).subscribe({
      next: url => { this.rascBlobUrl = url; },
      error: e => this.dialog.info(e.error?.mensagem || 'Não foi possível abrir o vídeo')
    });
  }

  /** FINALIZA: todos os vídeos do rascunho vão para o solicitante. */
  finalizar() {
    if (!this.rascunho.length) { this.erroEntrega = 'Anexe pelo menos um vídeo antes de entregar.'; return; }
    this.finalizando = true;
    this.api.finalizarEntrega(this.minhaConta.id, this.obsEntrega || null).subscribe({
      next: () => {
        this.finalizando = false; this.rascunho = []; this.rascBlobUrl = null; this.rascBlobId = '';
        flashSet('Entrega realizada! O solicitante já pode assistir e aprovar.');
        this.carregar();
      },
      error: e => {
        this.finalizando = false;
        this.erroEntrega = e.error?.mensagem || 'Erro ao realizar a entrega';
      }
    });
  }

  /** Dronista anexa mais um vídeo à entrega (lista N arquivos, teto 10). */
  anexarExtra(ev: any) {
    const input = ev.target as HTMLInputElement;
    const arquivo = input.files && input.files[0];
    this.erroEntrega = '';
    if (!arquivo || !this.entrega) return;
    if (arquivo.size > 8 * 1024 * 1024 * 1024) {
      this.erroEntrega = 'Vídeo maior que 8 GB — exporte em resolução menor e tente novamente.';
      input.value = '';
      return;
    }
    this.subindoExtra = true; this.progressoExtra = 0;
    this.api.adicionarArquivoEntrega(this.entrega.id, arquivo).subscribe({
      next: () => {
        this.subindoExtra = false; this.progressoExtra = 0;
        flashSet('Vídeo anexado à entrega.');
        this.carregar();
      },
      error: e => {
        this.subindoExtra = false; this.progressoExtra = 0;
        this.erroEntrega = e.error?.mensagem || 'Falha ao anexar o vídeo';
        input.value = '';
      }
    });
  }

  /** Remove um vídeo da lista da entrega (exclui do S3). */
  removerArquivo(a: any) {
    this.dialog.confirmar({
      titulo: 'Remover vídeo',
      mensagem: `Remover este vídeo da entrega?`,
      textoConfirmar: 'Remover', perigoso: true
    }).then(ok => {
      if (!ok) return;
      this.api.excluirArquivoEntrega(a.id).subscribe({
        next: () => this.carregar(),
        error: e => this.dialog.info(e.error?.mensagem || 'Falha ao remover')
      });
    });
  }

  /** Abre um vídeo da lista (blob autenticado pelo backend). */
  abrirArquivo(a: any) {
    if (this.videoArquivoId === a.id) { this.videoArquivoId = ''; this.videoArquivoUrl = null; return; }
    this.videoArquivoId = a.id; this.videoArquivoUrl = null;
    this.api.videoArquivo(a.id).subscribe({
      next: url => { this.videoArquivoUrl = url; },
      error: e => this.dialog.info(e.error?.mensagem || 'Não foi possível abrir o vídeo')
    });
  }

  tamanho(bytes: number): string {
    if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  /** Abre o vídeo da entrega pela plataforma (blob autenticado via backend). */
  abrirVideo() {
    if (!this.entrega) return;
    this.videoUrl = null; this.assistindo = true;
    this.api.videoEntrega(this.entrega.id).subscribe({
      next: url => { this.videoUrl = url; },
      error: e => { this.assistindo = false; this.dialog.info(e.error?.mensagem || 'Não foi possível abrir o vídeo'); }
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
    const partes = [p.logradouro, p.bairro, p.cidade, p.estado].filter((x: string) => !!x);
    const base = partes.length ? partes.join(' · ') : 'Local não informado';
    return p.local ? base + ' — ' + p.local : base;
  }
  hhmm(t: string): string { return (t || '').slice(0, 5); }

  voltar() { this.router.navigate(['/app/propostas']); }
}
