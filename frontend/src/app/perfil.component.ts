import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { papelAtual, flashSet } from './papel';
import { MascaraFoneDirective, MascaraCepDirective, MascaraDocDirective } from './mascara';
import { CepService } from './cep.service';
import { EstrelasComponent } from './estrelas.component';

/** Perfil: dados, localização, 💸 repasse (Pix/banco) e 🛡️ validação de identidade (dronista). */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [FormsModule, MascaraFoneDirective, MascaraCepDirective, MascaraDocDirective, EstrelasComponent],
  template: `
  <h1>👤 Meu perfil</h1>

  @if (carregando) { <div class="alert alert-info">Carregando...</div> }

  @if (p) {
    <div class="card">
      <h2>{{ p.nome }}</h2>
      <p class="muted" style="margin-top:-.5rem">
        {{ papel === 'DRONISTA' ? 'Dronista profissional' : papel === 'SOLICITANTE' ? 'Solicitante de serviços de drone' : 'Administrador da plataforma' }}
      </p>

      <ul class="meta-lista" style="margin-bottom:1rem">
        @if (papel === 'DRONISTA') {
          <li>🪪 Licença ANAC: {{ p.licencaAnac || '—' }}</li>
          <li>📄 Documento: {{ p.cnpjCpf }}</li>
          <li>📍 Base: {{ p.cidade || '—' }}@if (p.estado) {/{{ p.estado }} }@if (p.bairro) { · {{ p.bairro }} }</li>
          <li>⭐ Nota média: <app-estrelas [nota]="p.notaMedia"></app-estrelas> {{ p.notaMedia != null ? p.notaMedia : 'sem avaliações' }}</li>
          <li>🎯 Trabalhos concluídos: {{ p.trabalhosConcluidos }}</li>
        } @else if (papel === 'SOLICITANTE') {
          <li>🏢 Empresa: {{ p.empresa || '—' }}</li>
          <li>📄 Documento: {{ p.cnpjCpf || '—' }}</li>
          <li>⭐ Nota média como solicitante: <app-estrelas [nota]="p.notaMedia"></app-estrelas> {{ p.notaMedia != null ? p.notaMedia : 'sem avaliações' }}</li>
          <li>🤝 Contratações concluídas: {{ p.contratacoes }}</li>
        }
      </ul>

      <form (ngSubmit)="salvar()" #f="ngForm">
        <label>Nome
          <input [(ngModel)]="nome" name="nome" required>
        </label>
        <div class="grid-2">
          <label>Telefone
            <input [(ngModel)]="telefone" name="telefone" mascaraFone placeholder="(11) 99999-9999">
          </label>
          @if (papel === 'DRONISTA') {
            <label>Licença ANAC
              <input [(ngModel)]="licencaAnac" name="licencaAnac" placeholder="CANAC-...">
            </label>
          } @else if (papel === 'SOLICITANTE') {
            <label>Empresa
              <input [(ngModel)]="empresa" name="empresa">
            </label>
          }
        </div>
        @if (papel === 'SOLICITANTE') {
          <label>CPF ou CNPJ
            <input [(ngModel)]="cnpjCpf" name="cnpjCpfS" mascaraDoc placeholder="000.000.000-00" maxlength="18">
            <small class="hint">Opcional — validamos o dígito verificador ao salvar.</small>
          </label>
        }
        @if (papel === 'DRONISTA') {
          <label>📍 Localização (base de operação)</label>
          <div class="grid-local">
            <label>Estado (UF)
              <select [(ngModel)]="estado" name="estado">
                <option value="">—</option>
                @for (uf of ufs; track uf) { <option [value]="uf">{{ uf }}</option> }
              </select>
            </label>
            <label>CEP
              <input [(ngModel)]="cep" name="cep" mascaraCep placeholder="00000-000" (input)="buscaCep()">
              @if (buscandoCep) { <small class="hint">Buscando CEP...</small> }
              @if (avisoCep) { <small class="hint" style="color:var(--color-error)">{{ avisoCep }}</small> }
            </label>
            <label>Logradouro (rua/avenida)
              <input [(ngModel)]="logradouro" name="logradouro" maxlength="300" (input)="logradouroAuto = false">
            </label>
            <label>Cidade
              <input [(ngModel)]="cidade" name="cidade">
            </label>
            <label>Bairro
              <input [(ngModel)]="bairro" name="bairro">
            </label>
            <label>Número
              <input [(ngModel)]="numero" name="numero" maxlength="10" placeholder="Ex.: 123A" style="text-transform:uppercase">
              <small class="hint">Alfanumérico (ex.: 123A, SN) — opcional</small>
            </label>
          </div>
          <small class="hint">Usamos sua base para ordenar oportunidades por proximidade.</small>
          <label>Bio / especialidade
            <textarea [(ngModel)]="bio" name="bio" rows="2"></textarea>
          </label>

          <h2 style="margin-top:1.5rem">💸 Para você receber</h2>
          <div class="escolha-2">
            <button type="button" class="opcao2" [class.selecionado]="modoRepasse === 'pix'" (click)="modoRepasse = 'pix'">
              <span class="titulo">⚡ Chave Pix</span><span class="sub">Recebe na hora</span>
            </button>
            <button type="button" class="opcao2" [class.selecionado]="modoRepasse === 'banco'" (click)="modoRepasse = 'banco'">
              <span class="titulo">🏦 Conta bancária</span><span class="sub">Transferência comum</span>
            </button>
          </div>

          @if (modoRepasse === 'pix') {
            <label>Tipo da chave Pix
              <select [(ngModel)]="pixTipo" name="pixTipo" (change)="sugerirChavePix()">
                <option value="">Escolha...</option>
                <option value="CPF">CPF</option>
                <option value="CNPJ">CNPJ</option>
                <option value="EMAIL">E-mail</option>
                <option value="TELEFONE">Telefone</option>
                <option value="ALEATORIA">Chave aleatória</option>
              </select>
            </label>
            <label>Chave Pix
              <input [(ngModel)]="pixChave" name="pixChave" (input)="pixAuto = false"
                     placeholder="Sua chave">
            </label>
          } @else {
            <label>Banco
              <input [(ngModel)]="banco" name="banco2" placeholder="Ex.: Nubank, Itaú...">
            </label>
            <div class="grid-2">
              <label>Agência
                <input [(ngModel)]="agencia" name="agencia">
              </label>
              <label>Conta
                <input [(ngModel)]="conta" name="conta2">
              </label>
            </div>
            <label>Tipo de conta
              <select [(ngModel)]="tipoConta" name="tipoConta2">
                <option value="CORRENTE">Corrente</option>
                <option value="POUPANCA">Poupança</option>
              </select>
            </label>
          }
          <div class="alert alert-warning" role="alert">
            🔒 A conta bancária ou Chave Pix deve estar <b>obrigatoriamente no mesmo CPF/CNPJ
            cadastrado</b> ({{ p.cnpjCpf }}). Repasse para conta de terceiros é recusado e estornado.
          </div>

          <h2 style="margin-top:1.5rem">🛡️ Validação de identidade</h2>
          @if (p.validacaoDoc === 'APROVADA') {
            <div class="alert alert-success">✓ Documento aprovado — seus repasses estão liberados.</div>
          } @else if (p.validacaoDoc === 'ENVIADA') {
            <div class="alert alert-info">⏳ Documento em análise — avisaremos quando estiver aprovado.</div>
          } @else if (p.validacaoDoc === 'REJEITADA') {
            <div class="alert alert-error">⚠️ Documento não pôde ser validado — envie uma foto nítida (frente e verso).</div>
          } @else {
            <div class="alert alert-warning">📌 Pendente — para liberar seus repasses, envie a foto do seu documento uma única vez.</div>
          }
          @if (p.validacaoDoc !== 'APROVADA') {
            <label>Link da foto do documento (RG/CNH frente e verso)
              <input [(ngModel)]="documentoFotoUrl" name="docFoto" type="url" placeholder="https://...">
              <small class="hint">Para sua segurança e a liberação dos seus repasses — feito uma única vez.</small>
            </label>
          }
        }

        @if (sucesso) { <div class="alert alert-success">✓ {{ sucesso }}</div> }
        @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

        <button class="btn" type="submit" [disabled]="f.invalid || ocupado">
          {{ ocupado ? 'Salvando...' : 'Salvar alterações' }}
        </button>
      </form>
    </div>
  }`,
  styles: [`
    .escolha-2 { display: grid; grid-template-columns: 1fr 1fr; gap: .6rem; margin-bottom: 1rem; }
    @media (max-width: 640px) { .escolha-2 { grid-template-columns: 1fr; } }
    .opcao2 {
      background: var(--color-surface); border: 1.5px solid var(--color-border);
      border-radius: var(--radius); padding: .7rem .85rem; cursor: pointer; text-align: left;
      font: inherit; color: inherit; display: flex; flex-direction: column; gap: .2rem;
    }
    .opcao2.selecionado { border-color: #3ea6ff; background: rgba(62, 166, 255, .06); }
    .opcao2 .titulo { font-weight: 700; }
    .opcao2 .sub { font-size: .8rem; color: var(--color-text-muted); }
  `]
})
export class PerfilComponent implements OnInit {
  p: any = null;
  papel = papelAtual();
  nome = ''; telefone = ''; licencaAnac = ''; bio = ''; empresa = ''; cnpjCpf = '';
  estado = ''; cidade = ''; bairro = ''; cep = '';
  logradouro = ''; logradouroAuto = false; numero = '';
  // Repasse + validação (dronista)
  modoRepasse: 'pix' | 'banco' = 'pix';
  pixTipo = ''; pixChave = ''; pixAuto = false;
  banco = ''; agencia = ''; conta = ''; tipoConta = 'CORRENTE';
  documentoFotoUrl = '';
  buscandoCep = false; avisoCep = ''; ultimoCep = '';
  ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];
  sucesso = ''; erro = ''; ocupado = false; carregando = true;

  constructor(private api: ApiService, private cepService: CepService) {}

  buscaCep() {
    const d = (this.cep || '').replace(/\D/g, '');
    if (d.length !== 8) { this.buscandoCep = false; this.avisoCep = ''; return; }
    if (d === this.ultimoCep) return;
    this.ultimoCep = d;
    this.buscandoCep = true; this.avisoCep = '';
    this.cepService.buscar(d).subscribe({
      next: (r: any) => {
        this.buscandoCep = false;
        if (r.logradouro && (!this.logradouro || this.logradouroAuto)) {
          this.logradouro = r.logradouro;
          this.logradouroAuto = true;
        }
        if (r.uf) this.estado = r.uf;
        if (r.cidade) this.cidade = r.cidade;
        if (r.bairro && !this.bairro) this.bairro = r.bairro;
      },
      error: () => { this.buscandoCep = false; this.avisoCep = 'CEP não encontrado — preencha manualmente'; }
    });
  }

  ngOnInit() { this.carregar(); }

  carregar() {
    this.api.meuPerfil().subscribe({
      next: p => {
        this.p = p;
        this.nome = p.nome || ''; this.telefone = p.telefone || '';
        this.licencaAnac = p.licencaAnac || ''; this.bio = p.bio || ''; this.empresa = p.empresa || '';
        this.cnpjCpf = p.cnpjCpf || '';
        this.estado = p.estado || ''; this.cidade = p.cidade || '';
        this.bairro = p.bairro || ''; this.cep = p.cep || '';
        this.logradouro = p.logradouro || ''; this.numero = p.numero || '';
        // Repasse
        if (papelAtual() === 'DRONISTA') {
          this.modoRepasse = p.pixChave ? 'pix' : (p.conta ? 'banco' : 'pix');
          this.pixTipo = p.pixTipo || ''; this.pixChave = p.pixChave || '';
          this.banco = p.banco || ''; this.agencia = p.agencia || ''; this.conta = p.conta || '';
          this.tipoConta = p.tipoConta || 'CORRENTE';
          this.documentoFotoUrl = p.documentoFotoUrl || '';
        }
        this.carregando = false;
      },
      error: () => { this.carregando = false; this.erro = 'Não foi possível carregar o perfil'; }
    });
  }

  sugerirChavePix() {
    if ((this.pixTipo === 'CPF' || this.pixTipo === 'CNPJ') && !this.pixChave && this.cnpjCpf) {
      this.pixChave = this.cnpjCpf;
      this.pixAuto = true;
    }
  }

  salvar() {
    this.erro = ''; this.sucesso = ''; this.ocupado = true;
    const ehDronista = this.papel === 'DRONISTA';
    this.api.atualizarPerfil({
      nome: this.nome, telefone: this.telefone || null,
      licencaAnac: this.licencaAnac || null, bio: this.bio || null, empresa: this.empresa || null,
      cnpjCpf: this.papel === 'SOLICITANTE' ? (this.cnpjCpf || null) : null,
      estado: this.estado || null, cidade: this.cidade || null,
      bairro: this.bairro || null, cep: this.cep || null,
      logradouro: ehDronista ? (this.logradouro || null) : null,
      numero: ehDronista ? ((this.numero || '').trim().toUpperCase() || null) : null,
      // Repasse + validação (só dronista; backend valida titularidade de novo)
      pixTipo: ehDronista && this.modoRepasse === 'pix' ? this.pixTipo : null,
      pixChave: ehDronista && this.modoRepasse === 'pix' ? this.pixChave : null,
      banco: ehDronista && this.modoRepasse === 'banco' ? this.banco : null,
      agencia: ehDronista && this.modoRepasse === 'banco' ? this.agencia : null,
      conta: ehDronista && this.modoRepasse === 'banco' ? this.conta : null,
      tipoConta: ehDronista && this.modoRepasse === 'banco' ? this.tipoConta : null,
      documentoFotoUrl: ehDronista ? (this.documentoFotoUrl || null) : null
    }).subscribe({
      next: p => { this.p = p; this.ocupado = false; this.sucesso = 'Perfil atualizado!'; flashSet('Perfil atualizado.'); },
      error: e => { this.ocupado = false; this.erro = e.error?.mensagem || 'Erro ao salvar'; }
    });
  }
}
