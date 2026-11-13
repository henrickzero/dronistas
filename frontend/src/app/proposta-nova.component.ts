import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from './api.service';
import { CepService } from './cep.service';
import { flashSet } from './papel';
import { MascaraCepDirective } from './mascara';

/** Form de publicação da proposta de voo (solicitante). */
@Component({
  selector: 'app-proposta-nova',
  standalone: true,
  imports: [FormsModule, MascaraCepDirective],
  template: `
  <button class="volta" (click)="voltar()">← Voltar</button>
  <h1>➕ Publicar proposta de voo</h1>
  <p class="muted">Descreva o que você precisa. Dronistas responderão com suas contas-proposta.</p>

  <div class="card">
    <form (ngSubmit)="salvar()" #f="ngForm">
      <label>Título do trabalho
        <input [(ngModel)]="titulo" name="titulo" required maxlength="200"
               placeholder="Ex.: Filmagem aérea de casamento na serra">
      </label>

      <label>Descrição (o que deve ser gravado)
        <textarea [(ngModel)]="descricao" name="descricao" rows="3"
                  placeholder="Conte o roteiro, o que mostrar, restrições..."></textarea>
      </label>

      <details class="secao" open>
        <summary>📅 Data e duração</summary>
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
        </label>
      </details>

      <details class="secao" open>
        <summary>🎥 Qualidade do vídeo</summary>
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
      </details>

      <details class="secao" open>
        <summary>📍 Localização do voo</summary>
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
      </details>

      <label>Valor oferecido (R$)
        <input [(ngModel)]="valorOferecido" name="valorOferecido" type="number" step="0.01" min="1" required
               placeholder="Ex.: 350.00">
      </label>

      @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

      <button class="btn btn-block" type="submit" [disabled]="f.invalid || ocupado">
        {{ ocupado ? 'Publicando...' : 'Publicar proposta' }}
      </button>
    </form>
  </div>`,
  styles: [``]
})
export class PropostaNovaComponent {
  titulo = ''; descricao = ''; local = '';
  dataVoo = ''; horaVoo = ''; duracaoMin: any = '';
  qualidadeVideo = '4K_30FPS'; fps: any = '30'; formatoVideo = 'MP4';
  valorOferecido: any = '';
  estado = ''; cidade = ''; bairro = ''; numero = ''; cep = '';
  solicitantePresente: any = true;
  buscandoCep = false; avisoCep = '';
  private ultimoCepConsultado = '';
  erro = ''; ocupado = false;

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

  precisaFps(): boolean {
    return this.qualidadeVideo === 'FULLHD' || this.qualidadeVideo === '2K';
  }

  salvar() {
    this.erro = ''; this.ocupado = true;
    this.api.criarProposta({
      titulo: this.titulo, descricao: this.descricao || null, local: this.local || null,
      dataVoo: this.dataVoo, horaVoo: this.horaVoo, duracaoMin: this.duracaoMin,
      qualidadeVideo: this.qualidadeVideo,
      fps: this.precisaFps() ? Number(this.fps) : null,
      formatoVideo: this.formatoVideo,
      valorOferecido: this.valorOferecido,
      estado: this.estado || null, cidade: this.cidade || null,
      bairro: this.bairro || null, numero: (this.numero || '').trim().toUpperCase() || null,
      solicitantePresente: this.solicitantePresente === true || this.solicitantePresente === 'true',
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

  voltar() { this.router.navigate(['/app/propostas']); }
}
