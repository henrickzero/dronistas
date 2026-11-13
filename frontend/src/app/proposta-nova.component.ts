import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { CepService } from './cep.service';
import { flashSet } from './papel';
import { MascaraCepDirective, MascaraValorDirective, Mascara } from './mascara';

/**
 * Publicação da proposta de voo como WIZARD de 5 etapas:
 * 1 O serviço (título, descrição, valor) · 2 Quando (data/hora/duração) ·
 * 3 Vídeo (qualidade/formato) · 4 Onde (mapa OU endereço + presença) · 5 Revisão.
 * Avançar é bloqueado até a etapa atual estar válida; a revisão permite voltar
 * direto a qualquer etapa para editar. Mantém o seletor de mapa (Leaflet) e ViaCEP.
 */
@Component({
  selector: 'app-proposta-nova',
  standalone: true,
  imports: [FormsModule, MascaraCepDirective, MascaraValorDirective, DecimalPipe, DatePipe],
  template: `
  <button class="volta" (click)="voltarInicio()">← Voltar</button>
  <h1>➕ Publicar proposta de voo</h1>
  <p class="muted">Responda aos 5 passos, revise e publique. Dronistas verão sua proposta no marketplace.</p>

  <div class="wizard-topo">
    <div class="wizard-barra"><div class="wizard-preenchido" [style.width.%]="progressoPct()"></div></div>
    <div class="wizard-linha">
      @for (p of passos; track p.n) {
        <span class="wizard-ponto" [class.feito]="passo > p.n" [class.atual]="passo === p.n">{{ passo > p.n ? '✓' : p.n }}</span>
      }
    </div>
    <div class="wizard-etapa"><b>{{ passos[passo - 1].rotulo }}</b> — etapa {{ passo }} de 5</div>
  </div>

  <div class="card">
    <form (ngSubmit)="salvar()" #f="ngForm">

      <!-- 1 · O serviço -->
      @if (passo === 1) {
        <label>Título do trabalho
          <input [(ngModel)]="titulo" name="titulo" required maxlength="200"
                 placeholder="Ex.: Filmagem aérea de casamento na serra">
        </label>
        <label>Descrição (o que deve ser gravado)
          <textarea [(ngModel)]="descricao" name="descricao" rows="3"
                    placeholder="Conte o roteiro, o que mostrar, restrições..."></textarea>
        </label>
        <label>Valor oferecido (R$)
          <input [(ngModel)]="valorOferecido" name="valorOferecido" inputmode="numeric" required
                 mascaraValor placeholder="Ex.: 350,00">
        </label>
      }

      <!-- 2 · Quando -->
      @if (passo === 2) {
        <div class="grid-2">
          <label>Data do voo
            <input [(ngModel)]="dataVoo" name="dataVoo" type="date" required [min]="hoje">
          </label>
          <label>Hora
            <input [(ngModel)]="horaVoo" name="horaVoo" type="time" required>
          </label>
        </div>
        <label>Duração (minutos)
          <input [(ngModel)]="duracaoMin" name="duracaoMin" type="number" required min="1" max="1440"
                 placeholder="Ex.: 60">
          <small class="hint">Referências: 30 min (voo curto) · 60 min (evento) · 120+ (cobertura completa).</small>
        </label>
      }

      <!-- 3 · Vídeo -->
      @if (passo === 3) {
        <label>Resolução e taxa de frames
          <select [(ngModel)]="qualidadeVideo" name="qualidadeVideo" required>
            @for (q of qualidades; track q.valor) {
              <option [value]="q.valor">{{ q.rotulo }}</option>
            }
          </select>
        </label>
        @if (precisaFps()) {
          <label>FPS
            <select [(ngModel)]="fps" name="fps" required>
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
              <option value="120">120 fps</option>
            </select>
          </label>
        }
        <label>Formato
          <select [(ngModel)]="formatoVideo" name="formatoVideo" required>
            @for (fo of formatos; track fo.valor) {
              <option [value]="fo.valor">{{ fo.rotulo }}</option>
            }
          </select>
        </label>
        <small class="hint">LOG/RAW/PRORES ficam para pós-produção; MP4 é o mais comum.</small>
      }

      <!-- 4 · Onde -->
      @if (passo === 4) {
        <div class="modo-escolha">
          <button type="button" class="chip" [class.ativo]="modoLocalizacao === 'mapa'" (click)="modoLocalizacao = 'mapa'">🗺️ No mapa</button>
          <button type="button" class="chip" [class.ativo]="modoLocalizacao === 'endereco'" (click)="modoLocalizacao = 'endereco'">📝 Endereço</button>
        </div>

        @if (modoLocalizacao === 'mapa') {
          <button type="button" class="btn btn-block" (click)="abrirMapa()">
            {{ lat != null ? '🗺️ Ver/ajustar o ponto no mapa' : '🗺️ Selecionar no mapa' }}
          </button>
          @if (lat != null) {
            <small class="hint" style="color:var(--color-success)">✓ Ponto marcado: ({{ lat | number:'1.0-6' }}, {{ lng | number:'1.0-6' }})</small>
          } @else {
            <small class="hint">Marque o local exato do voo — o dronista verá o ponto exato, distância incluída.</small>
          }
        } @else {
          <div class="grid-local">
            <label>Estado (UF)
              <select [(ngModel)]="estado" name="estado" (change)="buscaCepSePossivel()">
                <option value="">—</option>
                @for (uf of ufs; track uf) { <option [value]="uf">{{ uf }}</option> }
              </select>
            </label>
            <label>CEP
              <input [(ngModel)]="cep" name="cep" mascaraCep placeholder="00000-000" (input)="buscaCepSePossivel()">
              @if (buscandoCep) { <small class="hint">Buscando CEP...</small> }
              @if (avisoCep) { <small class="hint" style="color:var(--color-error)">{{ avisoCep }}</small> }
            </label>
            <label>Cidade
              <input [(ngModel)]="cidade" name="cidade" placeholder="Ex.: Itu">
            </label>
            <label>Bairro
              <input [(ngModel)]="bairro" name="bairro" placeholder="Opcional">
            </label>
            <label>Número
              <input [(ngModel)]="numero" name="numero" maxlength="10" placeholder="Ex.: 123A" style="text-transform:uppercase">
              <small class="hint">Alfanumérico (ex.: 123A, SN) — opcional</small>
            </label>
          </div>
          <small class="hint">Com CEP ou cidade/UF, o sistema localiza o voo automaticamente. Você pode complementar com o mapa.</small>
        }

        <label>Sua presença no local
          <select [(ngModel)]="solicitantePresente" name="solicitantePresente">
            <option [value]="true">Estarei presente no local</option>
            <option [value]="false">Não estarei presente — dronista realiza o voo no horário</option>
          </select>
          <small class="hint">Sem presença, o dronista executa sozinho no horário combinado.</small>
        </label>
        <label>Referência / ponto de encontro
          <input [(ngModel)]="local" name="local" placeholder="Ex.: sítio bom vista, estrada do sol, km 5">
        </label>
      }

      <!-- 5 · Revisão -->
      @if (passo === 5) {
        <h2 style="margin-top:0">✅ Revise sua proposta</h2>
        <div class="resumo">
          <div class="resumo-grupo">
            <div class="resumo-topo"><span>O serviço</span><button type="button" class="mini" (click)="irPara(1)">✏️ Editar</button></div>
            <b>{{ titulo }}</b>
            @if (descricao) { <p class="resumo-texto">{{ descricao }}</p> }
            <p class="resumo-valor">Valor oferecido: <b class="verde">R$ {{ valorOferecido }}</b></p>
          </div>
          <div class="resumo-grupo">
            <div class="resumo-topo"><span>Quando</span><button type="button" class="mini" (click)="irPara(2)">✏️ Editar</button></div>
            <p class="resumo-linha-txt">📅 {{ dataVoo | date:'dd/MM/yyyy' }} às {{ horaVoo }} · duração {{ duracaoMin }} min</p>
          </div>
          <div class="resumo-grupo">
            <div class="resumo-topo"><span>Vídeo</span><button type="button" class="mini" (click)="irPara(3)">✏️ Editar</button></div>
            <p class="resumo-linha-txt">🎥 {{ rotQualidade() }}@if (precisaFps()) { · {{ fps }} fps } · formato {{ rotFormato() }}</p>
          </div>
          <div class="resumo-grupo">
            <div class="resumo-topo"><span>Onde</span><button type="button" class="mini" (click)="irPara(4)">✏️ Editar</button></div>
            <p class="resumo-linha-txt">📍 {{ localResumo() }}</p>
            <p class="resumo-linha-txt">👤 {{ presencaTexto() }}@if (local) { · Ref.: {{ local }} }</p>
          </div>
        </div>
        <small class="hint">Revise com calma — depois de publicar, dronistas já poderão enviar contas-proposta.</small>
      }

      @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

      <div class="wizard-nav">
        @if (passo > 1) {
          <button type="button" class="btn btn-outline" (click)="passoAnterior()">◂ Anterior</button>
        }
        @if (passo < 5) {
          <button type="button" class="btn" [disabled]="!podeAvancar()" (click)="avancar()">Próximo ▸</button>
        } @else {
          <button class="btn" type="submit" [disabled]="!podePublicar() || ocupado">
            {{ ocupado ? 'Publicando...' : '🚀 Publicar proposta' }}
          </button>
        }
      </div>
      @if (passo < 5 && !podeAvancar()) {
        <small class="hint" style="text-align:center; display:block">Complete o passo atual para avançar.</small>
      }
    </form>
  </div>

  @if (mapaAberto) {
    <div class="mapa-overlay" (click)="fecharMapa($event)">
      <div class="mapa-caixa" (click)="$event.stopPropagation()">
        <div class="mapa-topo">
          <strong>Selecione o local do voo</strong>
          <span style="display:flex; align-items:center; gap:.5rem">
            <button type="button" class="chip" style="margin:0" (click)="alternarMapa()">{{ tipoMapa === 'satelite' ? '🛰️ Satélite' : '🗺️ Ruas' }}</button>
            <button type="button" class="mapa-fechar" (click)="fecharMapa()">✕</button>
          </span>
        </div>
        <div id="mapa-seletor" class="mapa-area"></div>
        <div class="mapa-rodape">
          <small class="hint">Toque/clique no mapa para marcar o ponto exato.</small>
          <button type="button" class="btn" [disabled]="lat == null" (click)="confirmarMapa()">
            {{ lat != null ? 'Confirmar local' : 'Marque um ponto no mapa' }}
          </button>
        </div>
      </div>
    </div>
  }`,
  styles: [`
    .mapa-overlay {
      position: fixed; inset: 0; z-index: 1000;
      background: rgba(15, 23, 42, .55);
      display: flex; align-items: center; justify-content: center;
      padding: 1rem;
    }
    .mapa-caixa {
      background: var(--color-surface); border-radius: var(--radius-lg);
      box-shadow: var(--shadow); width: min(640px, 100%);
      display: flex; flex-direction: column; overflow: hidden;
    }
    .mapa-topo {
      display: flex; align-items: center; justify-content: space-between;
      padding: .75rem 1rem; border-bottom: 1px solid var(--color-border);
    }
    .mapa-fechar {
      border: none; background: none; font-size: 1.1rem; cursor: pointer; color: var(--color-text-muted);
    }
    .mapa-area { height: 55vh; min-height: 320px; width: 100%; }
    .mapa-rodape {
      padding: .75rem 1rem; border-top: 1px solid var(--color-border);
      display: flex; align-items: center; justify-content: space-between; gap: .75rem;
    }

    /* ---------- Wizard ---------- */
    .wizard-topo { margin-bottom: 1.1rem; }
    .wizard-barra { height: 6px; border-radius: 999px; background: rgba(255, 255, 255, .08); overflow: hidden; }
    .wizard-preenchido { height: 100%; background: #3ea6ff; border-radius: 999px; transition: width .25s ease; }
    .wizard-linha { display: flex; justify-content: space-between; margin-top: .6rem; }
    .wizard-ponto {
      width: 30px; height: 30px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: .8rem; font-weight: 700;
      background: rgba(255, 255, 255, .08); color: var(--color-text-muted);
    }
    .wizard-ponto.atual { background: #3ea6ff; color: #081826; }
    .wizard-ponto.feito { background: rgba(62, 166, 255, .22); color: #7cc0ff; }
    .wizard-etapa { text-align: center; margin-top: .4rem; font-size: .85rem; color: var(--color-text-muted); }
    .wizard-nav { display: flex; gap: .6rem; margin-top: 1.25rem; }
    .wizard-nav .btn { flex: 1; }
    .modo-escolha { display: flex; gap: .5rem; margin-bottom: .9rem; }
    .modo-escolha .chip { flex: 1; min-height: 40px; }
    .resumo-grupo { padding: .85rem 0; border-bottom: 1px solid var(--color-border); }
    .resumo-grupo:first-child { padding-top: 0; }
    .resumo-grupo:last-child { border-bottom: none; padding-bottom: 0; }
    .resumo-topo { display: flex; justify-content: space-between; align-items: center; margin-bottom: .35rem; }
    .resumo-topo span:first-child {
      font-size: .72rem; font-weight: 700; letter-spacing: .4px;
      text-transform: uppercase; color: var(--color-text-muted);
    }
    .mini { border: none; background: none; color: #3ea6ff; font-size: .8rem; cursor: pointer; padding: .2rem .4rem; }
    .resumo-texto { margin: .25rem 0; color: var(--color-text-muted); font-size: .9rem; }
    .resumo-valor { margin: .35rem 0 0; color: var(--color-text-muted); font-size: .9rem; }
    .resumo-valor .verde { color: #6ee7a0; font-size: 1.05rem; }
    .resumo-linha-txt { margin: .25rem 0; font-size: .95rem; }
  `]
})
export class PropostaNovaComponent {
  titulo = ''; descricao = ''; local = '';
  dataVoo = ''; horaVoo = ''; duracaoMin: any = '';
  qualidadeVideo = '4K_30FPS'; fps: any = '30'; formatoVideo = 'MP4';
  valorOferecido: any = '';
  estado = ''; cidade = ''; bairro = ''; numero = ''; cep = '';
  solicitantePresente: any = true;
  lat: number | null = null; lng: number | null = null;
  mapaAberto = false;
  tipoMapa: 'satelite' | 'ruas' = 'satelite';
  private marcador: any = null;
  private mapa: any = null;
  private camadaTiles: any = null;
  buscandoCep = false; avisoCep = '';
  private ultimoCepConsultado = '';
  erro = ''; ocupado = false;

  // Wizard
  passo = 1;
  modoLocalizacao: 'mapa' | 'endereco' = 'mapa';
  passos = [
    { n: 1, rotulo: 'O serviço' },
    { n: 2, rotulo: 'Quando' },
    { n: 3, rotulo: 'Vídeo' },
    { n: 4, rotulo: 'Onde' },
    { n: 5, rotulo: 'Revisão' }
  ];

  qualidades = [
    { valor: 'FULLHD', rotulo: 'Full HD 1080p' },
    { valor: '2K', rotulo: '2K' },
    { valor: '4K_30FPS', rotulo: '4K — 30 fps' },
    { valor: '4K_60FPS', rotulo: '4K — 60 fps' },
    { valor: '4K_120FPS', rotulo: '4K — 120 fps (câmera lenta)' }
  ];
  formatos = [
    { valor: 'MP4', rotulo: 'MP4 (pronto para uso)' },
    { valor: 'MOV', rotulo: 'MOV' },
    { valor: 'LOG', rotulo: 'LOG (pós-produção)' },
    { valor: 'RAW', rotulo: 'RAW (pós-produção)' },
    { valor: 'PRORES', rotulo: 'ProRes (pós-produção)' }
  ];

  hoje: string = new Date().toISOString().slice(0, 10);

  ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  constructor(private api: ApiService, private router: Router, private cepService: CepService) {}

  // ---------- Wizard: navegação e validação por etapa ----------

  progressoPct(): number { return (this.passo / 5) * 100; }

  validaPasso(n: number): boolean {
    switch (n) {
      case 1: {
        const valor = Mascara.numeroDeValorBr(this.valorOferecido);
        return !!this.titulo.trim() && valor != null && valor > 0;
      }
      case 2: {
        if (!this.dataVoo || !this.horaVoo) return false;
        const d = Number(this.duracaoMin);
        return Number.isFinite(d) && d >= 1 && d <= 1440;
      }
      case 3: return true; // selects sempre com valor padrão válido
      case 4: return this.localizacaoOk();
      default: return true;
    }
  }

  /** Etapa 4: ponto no mapa OU CEP completo OU cidade+UF. */
  localizacaoOk(): boolean {
    return this.lat != null
      || (this.cep || '').replace(/\D/g, '').length === 8
      || (!!this.estado && !!this.cidade && !!this.cidade.trim());
  }

  podeAvancar(): boolean { return this.validaPasso(this.passo); }

  podePublicar(): boolean {
    return this.podeAvancar() && [1, 2, 3].every(n => this.validaPasso(n));
  }

  avancar() { if (this.passo < 5 && this.podeAvancar()) { this.passo++; this.rolarTopo(); } }
  passoAnterior() { if (this.passo > 1) { this.passo--; this.rolarTopo(); } }
  irPara(n: number) { if (n >= 1 && n <= 5) { this.passo = n; this.rolarTopo(); } }
  rolarTopo() { window.scrollTo({ top: 0, behavior: 'smooth' }); }
  voltarInicio() { this.router.navigate(['/app/propostas']); }

  // ---------- Revisão ----------

  rotQualidade(): string {
    return this.qualidades.find(q => q.valor === this.qualidadeVideo)?.rotulo || this.qualidadeVideo;
  }
  rotFormato(): string {
    return this.formatos.find(f => f.valor === this.formatoVideo)?.rotulo || this.formatoVideo;
  }
  presencaTexto(): string {
    return this.solicitantePresente === true || this.solicitantePresente === 'true'
      ? 'Estarei presente no local'
      : 'Dronista executa o voo no horário';
  }
  localResumo(): string {
    const partes: string[] = [];
    const cidUf = [this.cidade, this.estado].filter((x: string) => !!x).join('/');
    if (cidUf) partes.push(cidUf);
    if (this.bairro) partes.push(this.bairro);
    if (this.numero) partes.push('nº ' + this.numero);
    if (this.cep) partes.push('CEP ' + this.cep);
    if (this.lat != null) partes.push('ponto no mapa (' + (this.lat as number).toFixed(5) + ', ' + (this.lng as number)?.toFixed(5) + ')');
    return partes.length ? partes.join(' · ') : 'não informado';
  }

  // ---------- ViaCEP ----------

  /** ViaCEP: ao completar 8 dígitos, preenche UF/cidade/bairro vazios automaticamente. */
  buscaCepSePossivel() {
    const d = (this.cep || '').replace(/\D/g, '');
    if (d.length !== 8 || d === this.ultimoCepConsultado) {
      if (d.length !== 8) { this.buscandoCep = false; this.avisoCep = ''; }
      return;
    }
    this.ultimoCepConsultado = d;
    this.buscandoCep = true; this.avisoCep = '';
    this.cepService.buscar(d).subscribe({
      next: (r: any) => {
        this.buscandoCep = false;
        if (r?.erro) { this.avisoCep = 'CEP não encontrado — preencha manualmente'; return; }
        if (r?.uf && !this.estado) this.estado = r.uf;
        if (r?.localidade && !this.cidade) this.cidade = r.localidade;
        if (r?.bairro && !this.bairro) this.bairro = r.bairro;
      },
      error: () => { this.buscandoCep = false; this.avisoCep = 'CEP não encontrado — preencha manualmente'; }
    });
  }

  // ---------- Mapa (Leaflet) ----------

  /** Abre overlay do mapa, carregando Leaflet+CSS do CDN na primeira vez. */
  abrirMapa() {
    this.mapaAberto = true;
    setTimeout(() => this.iniciarMapa(), 50);
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

  private async iniciarMapa() {
    try { await this.carregarLeaflet(); } catch { this.mapaAberto = false; return; }
    const L = (window as any).L;
    const el = document.getElementById('mapa-seletor');
    if (!el) return;
    const centro: any = this.lat != null ? [this.lat, this.lng] : [-14.235, -51.925];
    const zoom = this.lat != null ? 16 : 4;
    this.mapa = L.map(el).setView(centro, zoom);
    this.aplicarCamada();
    if (this.lat != null) this.marcador = L.marker([this.lat, this.lng]).addTo(this.mapa);
    this.mapa.on('click', (e: any) => {
      this.lat = +e.latlng.lat.toFixed(6);
      this.lng = +e.latlng.lng.toFixed(6);
      if (this.marcador) this.mapa.removeLayer(this.marcador);
      this.marcador = L.marker([this.lat, this.lng]).addTo(this.mapa);
    });
    setTimeout(() => this.mapa?.invalidateSize(), 100);
  }

  private aplicarCamada() {
    const L = (window as any).L;
    if (!this.mapa) return;
    if (this.camadaTiles) this.mapa.removeLayer(this.camadaTiles);
    this.camadaTiles = this.tipoMapa === 'satelite'
      ? L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
          attribution: 'Imagens © Esri, Maxar, Earthstar Geographics', maxZoom: 19 })
      : L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap' });
    this.camadaTiles.addTo(this.mapa);
  }

  alternarMapa() { this.tipoMapa = this.tipoMapa === 'satelite' ? 'ruas' : 'satelite'; this.aplicarCamada(); }

  confirmarMapa() {
    this.mapaAberto = false;
    this.mapa?.remove(); this.mapa = null; this.marcador = null;
  }

  fecharMapa(e?: Event) {
    e?.preventDefault?.();
    this.mapaAberto = false;
    this.mapa?.remove(); this.mapa = null; this.marcador = null;
  }

  // ---------- Publicação ----------

  precisaFps(): boolean {
    return this.qualidadeVideo === 'FULLHD' || this.qualidadeVideo === '2K';
  }

  salvar() {
    if (!this.podePublicar()) {
      this.erro = 'Complete a etapa atual antes de publicar';
      return;
    }
    this.erro = ''; this.ocupado = true;
    this.api.criarProposta({
      titulo: this.titulo, descricao: this.descricao || null, local: this.local || null,
      dataVoo: this.dataVoo, horaVoo: this.horaVoo, duracaoMin: this.duracaoMin,
      qualidadeVideo: this.qualidadeVideo,
      fps: this.precisaFps() ? Number(this.fps) : null,
      formatoVideo: this.formatoVideo,
      valorOferecido: Mascara.numeroDeValorBr(this.valorOferecido),
      estado: this.estado || null, cidade: this.cidade || null,
      bairro: this.bairro || null, numero: (this.numero || '').trim().toUpperCase() || null,
      solicitantePresente: this.solicitantePresente === true || this.solicitantePresente === 'true',
      lat: this.lat, lng: this.lng,
      cep: this.cep || null
    }).subscribe({
      next: () => {
        flashSet('Proposta publicada! Agora aguarde as contas-proposta dos dronistas.');
        this.router.navigate(['/app/propostas']);
      },
      error: e => {
        this.ocupado = false;
        this.erro = e.error?.mensagem || 'Erro ao publicar proposta';
      }
    });
  }
}
