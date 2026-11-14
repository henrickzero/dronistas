import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from './api.service';
import { CepService } from './cep.service';
import { MascaraDocDirective, MascaraFoneDirective, MascaraCepDirective } from './mascara';
import { salvarSessao } from './papel';

/**
 * Landing + cadastro self-service.
 * - SOLICITANTE: formulário único.
 * - DRONISTA: onboarding em 3 passos (leigo-friendly):
 *   1. Dados básicos + "Autônomo (CPF) ou Empresa/MEI (CNPJ)?" — sem jargão financeiro;
 *   2. Dados para repasse (Pix ou banco) com trava de titularidade obrigatória;
 *   3. Validação de identidade amigável (texto tranquilizador; foto opcional/depois).
 */
@Component({
  selector: 'app-site-principal',
  standalone: true,
  imports: [FormsModule, RouterLink, MascaraDocDirective, MascaraFoneDirective, MascaraCepDirective],
  template: `
  <div class="page">
    <div class="hero">
      <div class="logo">dron<span>istas</span></div>
      <h1 style="font-size:1.35rem">Conectamos donos de drone a quem precisa de um voo</h1>
      <p class="descricao">
        Publique sua necessidade de filmagem aérea, receba propostas de profissionais,
        aprove o vídeo e libere o pagamento. Tudo pela plataforma, do celular.
      </p>
    </div>

    <div class="container" style="padding-top:0">

      <div class="escolha-papel">
        <button type="button" class="opcao-papel" [class.selecionado]="papel === 'SOLICITANTE'" (click)="papel = 'SOLICITANTE'">
          <span class="icone">🎯</span>
          <span class="titulo">Preciso de um drone</span>
          <p>Quero publicar um trabalho e receber propostas de dronistas.</p>
        </button>
        <button type="button" class="opcao-papel" [class.selecionado]="papel === 'DRONISTA'" (click)="papel = 'DRONISTA'">
          <span class="icone"><span class="drone-icone"></span></span>
          <span class="titulo">Sou dronista</span>
          <p>Tenho drone e quero encontrar trabalhos para voar.</p>
        </button>
      </div>

      @if (papel) {
        <div class="card">
          <h2>Cadastro — {{ papel === 'DRONISTA' ? 'Dronista' : 'Solicitante' }}</h2>

          @if (papel === 'DRONISTA') {
            <div class="onb-linha">
              @for (n of [1, 2, 3]; track n) {
                <span class="onb-ponto" [class.feito]="passoDr > n" [class.atual]="passoDr === n">{{ passoDr > n ? '✓' : n }}</span>
              }
              <b class="onb-rotulo">{{ onboarding[passoDr - 1] }}</b>
            </div>
          }

          <form (ngSubmit)="cadastrar()" #f="ngForm">

            <!-- ===== DRONISTA · PASSO 1: dados básicos (sem jargões financeiros) ===== -->
            @if (papel === 'DRONISTA') {
              @if (passoDr === 1) {
                <label>Nome completo
                  <input [(ngModel)]="nome" name="nome" required autocomplete="name">
                </label>
                <label>E-mail
                  <input [(ngModel)]="email" name="email" type="email" required autocomplete="email">
                  @if (emailInvalido) { <small class="hint" style="color:var(--color-error)">Digite um e-mail válido (ex.: nome&#64;exemplo.com).</small> }
                </label>
                <div class="grid-2">
                  <label>Telefone
                    <input [(ngModel)]="telefone" name="telefone" placeholder="(11) 99999-9999" autocomplete="tel" mascaraFone>
                  </label>
                  <label>Senha
                    <input [(ngModel)]="senha" name="senha" type="password" required minlength="8" autocomplete="new-password">
                    @if (senhaCurta) { <small class="hint" style="color:var(--color-error)">Mínimo de 8 — faltam {{ 8 - senha.length }}.</small> }
                  </label>
                </div>

                <div class="pergunta-leigo">
                  <p class="pergunta">Como você vai receber pelos voos?</p>
                  <div class="escolha-2">
                    <button type="button" class="opcao-papel compacta" [class.selecionado]="tipoPessoa === 'CPF'" (click)="escolherTipoPessoa('CPF')">
                      <span class="titulo">🙋 Autônomo</span>
                      <p>Recebo no meu CPF</p>
                    </button>
                    <button type="button" class="opcao-papel compacta" [class.selecionado]="tipoPessoa === 'CNPJ'" (click)="escolherTipoPessoa('CNPJ')">
                      <span class="titulo">🏢 Empresa / MEI</span>
                      <p>Recebo no CNPJ da minha empresa</p>
                    </button>
                  </div>
                </div>

                <label>{{ tipoPessoa === 'CNPJ' ? 'CNPJ da empresa/MEI' : 'Seu CPF' }}
                  <input [(ngModel)]="cnpjCpf" name="cnpjCpf" required placeholder="000.000.000-00" maxlength="18" mascaraDoc>
                </label>

                <details class="secao" open>
                  <summary><span class="drone-icone"></span> Informações de dronista (opcional, pode completar depois)</summary>
                  <label>Licença ANAC
                    <input [(ngModel)]="licencaAnac" name="licencaAnac" placeholder="Ex.: CANAC-1234567">
                  </label>
                  <label>Bio / especialidade
                    <textarea [(ngModel)]="bio" name="bio" rows="2"
                              placeholder="Ex.: Filmagens imobiliárias e eventos, 5 anos de experiência"></textarea>
                  </label>
                </details>

                <details class="secao" open>
                  <summary>📍 Sua base de operação (opcional)</summary>
                  <div class="grid-local">
                    <label>CEP
                      <input [(ngModel)]="cep" name="cepBase" mascaraCep placeholder="00000-000" (input)="buscaCepRegistro()">
                      @if (buscandoCep) { <small class="hint">Buscando CEP...</small> }
                      @if (avisoCep) { <small class="hint" style="color:var(--color-error)">{{ avisoCep }}</small> }
                    </label>
                    <label>Logradouro (rua/avenida)
                      <input [(ngModel)]="logradouro" name="logradouroBase" maxlength="300" (input)="logradouroAuto = false"
                             placeholder="Preenchido automaticamente pelo CEP">
                    </label>
                    <label>Estado (UF)
                      <select [(ngModel)]="estado" name="estadoBase">
                        <option value="">—</option>
                        @for (uf of ufs; track uf) { <option [value]="uf">{{ uf }}</option> }
                      </select>
                    </label>
                    <label>Cidade
                      <input [(ngModel)]="cidade" name="cidadeBase" placeholder="Ex.: João Pessoa">
                    </label>
                    <label>Bairro
                      <input [(ngModel)]="bairro" name="bairroBase" placeholder="Opcional">
                    </label>
                    <label>Número
                      <input [(ngModel)]="numero" name="numeroBase" maxlength="10" placeholder="Ex.: 123A" style="text-transform:uppercase">
                      <small class="hint">Alfanumérico (ex.: 123A, SN) — opcional</small>
                    </label>
                  </div>
                  <small class="hint">Endereço completo = distância precisa entre você e cada proposta.</small>
                </details>
              }

              <!-- ===== DRONISTA · PASSO 2: para você receber (repasse simplificado) ===== -->
              @if (passoDr === 2) {
                <div class="alert alert-info">
                  💸 <b>O dinheiro dos seus trabalhos vai direto para você</b> — informe abaixo
                  onde prefere receber: <b>Chave Pix</b> ou dados bancários.
                </div>

                <div class="escolha-2">
                  <button type="button" class="opcao-papel compacta" [class.selecionado]="modoRepasse === 'pix'" (click)="modoRepasse = 'pix'">
                    <span class="titulo">⚡ Chave Pix</span>
                    <p>Recebe na hora</p>
                  </button>
                  <button type="button" class="opcao-papel compacta" [class.selecionado]="modoRepasse === 'banco'" (click)="modoRepasse = 'banco'">
                    <span class="titulo">🏦 Conta bancária</span>
                    <p>Transferência comum</p>
                  </button>
                </div>

                @if (modoRepasse === 'pix') {
                  <label>Tipo da sua chave Pix
                    <select [(ngModel)]="pixTipo" name="pixTipo" (change)="sugerirChavePix()">
                      <option value="">Escolha...</option>
                      <option value="CPF">CPF (a mais comum para autônomos)</option>
                      <option value="CNPJ">CNPJ (para empresas/MEI)</option>
                      <option value="EMAIL">E-mail</option>
                      <option value="TELEFONE">Telefone</option>
                      <option value="ALEATORIA">Chave aleatória</option>
                    </select>
                  </label>
                  <label>Chave Pix
                    <input [(ngModel)]="pixChave" name="pixChave" required (input)="pixAuto = false"
                           placeholder="Sua chave (CPF, e-mail, telefone ou aleatória)">
                  </label>
                } @else {
                  <label>Banco
                    <input [(ngModel)]="banco" name="banco" required placeholder="Ex.: Banco do Brasil, Nubank, Itaú...">
                  </label>
                  <div class="grid-2">
                    <label>Agência
                      <input [(ngModel)]="agencia" name="agencia" placeholder="Ex.: 1234-5">
                    </label>
                    <label>Conta
                      <input [(ngModel)]="conta" name="conta" required placeholder="Ex.: 98765-4">
                    </label>
                  </div>
                  <label>Tipo de conta
                    <select [(ngModel)]="tipoConta" name="tipoConta">
                      <option value="CORRENTE">Corrente</option>
                      <option value="POUPANCA">Poupança</option>
                    </select>
                  </label>
                }

                <div class="alert alert-warning" role="alert">
                  🔒 <b>Atenção — regra dos bancos:</b> a conta bancária ou a Chave Pix deve estar
                  <b>obrigatoriamente no mesmo CPF/CNPJ cadastrado acima</b>
                  ({{ rotuloDocumento() }} {{ cnpjCpf }}).
                  Repasse para conta de outra pessoa é recusado e estornado.
                </div>
              }

              <!-- ===== DRONISTA · PASSO 3: validação de identidade (amigável + upload real) ===== -->
              @if (passoDr === 3) {
                <div class="alert alert-info">
                  🛡️ <b>Para a sua segurança e a liberação dos seus repasses,</b> precisamos validar
                  seu documento <b>uma única vez</b>. Anexe agora (recebemos com segurança no nosso
                  armazenamento da AWS) ou faça depois no seu perfil.
                </div>

                <div class="upload-zona">
                  <div class="upload-slot">
                    <b>1 · Documento com foto (RG/CNH aberto ou frente)</b>
                    @if (arqFone) {
                      <span class="ok">✓ {{ arqFone.name }} · {{ tamanho(arqFone.size) }}</span>
                    } @else { <span class="falta">nenhum arquivo</span> }
                    <input type="file" name="arqFone" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                           (change)="pegarDoc($event, 'fone')">
                  </div>
                  <div class="upload-slot">
                    <b>2 · Verso (opcional)</b>
                    @if (arqVerso) {
                      <span class="ok">✓ {{ arqVerso.name }} · {{ tamanho(arqVerso.size) }}</span>
                    } @else { <span class="falta">nenhum arquivo</span> }
                    <input type="file" name="arqVerso" accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                           (change)="pegarDoc($event, 'verso')">
                  </div>
                  <small class="hint">JPG, PNG, WEBP, HEIC ou PDF · até 2 arquivos · 100 MB cada. Com boa luz, frente e verso.</small>
                </div>
                @if (erroDoc) { <div class="alert alert-error">⚠️ {{ erroDoc }}</div> }
              }

              @if (passoDr < 3) {
                <button type="button" class="btn btn-block" [disabled]="!passoDrOk()" (click)="avancarOnboarding()">
                  Continuar ▸
                </button>
                @if (!passoDrOk()) { <small class="hint" style="text-align:center; display:block">Complete acima para continuar.</small> }
              }
            }

            <!-- ===== SOLICITANTE: formulário único (como já era) ===== -->
            @if (papel === 'SOLICITANTE') {
              <label>Nome completo
                <input [(ngModel)]="nome" name="nomeS" required autocomplete="name">
              </label>
              <label>E-mail
                <input [(ngModel)]="email" name="emailS" type="email" required autocomplete="email">
                @if (emailInvalido) { <small class="hint" style="color:var(--color-error)">Digite um e-mail válido (ex.: nome&#64;exemplo.com).</small> }
              </label>
              <div class="grid-2">
                <label>Telefone
                  <input [(ngModel)]="telefone" name="telefoneS" placeholder="(11) 99999-9999" autocomplete="tel" mascaraFone>
                </label>
                <label>Senha
                  <input [(ngModel)]="senha" name="senhaS" type="password" required minlength="8" autocomplete="new-password">
                  @if (senhaCurta) { <small class="hint" style="color:var(--color-error)">Mínimo de 8 — faltam {{ 8 - senha.length }}.</small> }
                </label>
              </div>
              <label>CPF ou CNPJ
                <input [(ngModel)]="cnpjCpf" name="cnpjCpfS" placeholder="000.000.000-00" maxlength="18" mascaraDoc>
                <small class="hint">Opcional — validamos o dígito verificador ao salvar.</small>
              </label>
              <label>Empresa (opcional)
                <input [(ngModel)]="empresa" name="empresaS" placeholder="Nome da sua empresa">
              </label>
              <button class="btn btn-block" type="submit" [disabled]="f.invalid || ocupado" style="margin-top:1rem">
                {{ ocupado ? 'Criando conta...' : 'Criar conta e entrar' }}
              </button>
            }

            @if (papel === 'DRONISTA' && passoDr === 3) {
              @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }
              <button class="btn btn-block" type="submit" [disabled]="f.invalid || ocupado">
                {{ ocupado ? 'Criando conta...' : '✅ Criar minha conta de dronista' }}
              </button>
            }
          </form>
        </div>
      }

      <p class="muted" style="text-align:center; margin-top:1.25rem">
        Já tem conta? <a routerLink="/login">Entrar</a>
      </p>
    </div>
  </div>`,
  styles: [`
    a { color: #3ea6ff; font-weight: 600; text-decoration: none; }
    a:hover { text-decoration: underline; }

    .onb-linha { display: flex; align-items: center; gap: .5rem; margin-bottom: 1rem; }
    .onb-ponto {
      width: 28px; height: 28px; border-radius: 50%;
      display: inline-flex; align-items: center; justify-content: center;
      font-size: .78rem; font-weight: 700;
      background: rgba(255, 255, 255, .08); color: var(--color-text-muted);
    }
    .onb-ponto.atual { background: #3ea6ff; color: #081826; }
    .onb-ponto.feito { background: rgba(62, 166, 255, .22); color: #7cc0ff; }
    .onb-rotulo { font-size: .875rem; color: var(--color-text-muted); font-weight: 600; }

    .pergunta-leigo { margin: .25rem 0 1rem; }
    .pergunta { font-weight: 600; margin: 0 0 .5rem; }
    .escolha-2 { display: grid; grid-template-columns: 1fr 1fr; gap: .75rem; }
    @media (max-width: 640px) { .escolha-2 { grid-template-columns: 1fr; } }
    .opcao-papel.compacta { padding: .9rem .8rem; }
    .opcao-papel.compacta .titulo { font-size: .95rem; }
    .opcao-papel.compacta p { font-size: .8rem; margin-top: .2rem; }

    .chk { display: flex; align-items: flex-start; gap: .6rem; }
    .chk input { width: auto; min-height: 0; margin-top: .2rem; }

    .upload-zona { border: 1.5px dashed var(--color-border); border-radius: var(--radius); padding: .9rem; display: grid; gap: .7rem; }
    .upload-slot { display: flex; flex-direction: column; gap: .3rem; }
    .upload-slot b { font-size: .9rem; }
    .upload-slot input[type="file"] { padding: .4rem; margin-top: 0; min-height: 0; font-size: .85rem; }
    .upload-slot .ok { color: #7ee08a; font-size: .85rem; word-break: break-all; }
    .upload-slot .falta { color: var(--color-text-muted); font-size: .85rem; }
  `]
})
export class SitePrincipalComponent {
  papel = '';
  nome = ''; email = ''; telefone = ''; senha = '';
  cnpjCpf = ''; licencaAnac = ''; bio = ''; empresa = '';
  estado = ''; cidade = ''; bairro = ''; cep = '';
  logradouro = ''; logradouroAuto = false; numero = '';
  buscandoCep = false; avisoCep = ''; ultimoCep = '';
  erro = ''; sucesso = ''; ocupado = false;

  // Onboarding do dronista (3 passos)
  passoDr = 1;
  onboarding = ['Dados básicos', 'Para você receber', 'Sua segurança'];
  tipoPessoa = '';                 // "Autônomo (CPF) ou Empresa/MEI (CNPJ)?"
  modoRepasse: 'pix' | 'banco' = 'pix';
  pixTipo = ''; pixChave = ''; pixAuto = false;
  banco = ''; agencia = ''; conta = ''; tipoConta = 'CORRENTE';
  arqFone: File | null = null;     // documento com foto (RG/CNH) — até 2 arquivos, 100 MB cada
  arqVerso: File | null = null;
  erroDoc = '';

  ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  get senhaCurta(): boolean {
    return this.senha.length > 0 && this.senha.length < 8;
  }

  get emailInvalido(): boolean {
    return this.email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email);
  }

  constructor(private api: ApiService, private cepService: CepService) {}

  // ---------- Passo 1 ----------

  escolherTipoPessoa(t: string) {
    this.tipoPessoa = t;
    // Se o documento digitado não bate com a escolha, limpa para re-digitar sem ambiguidade
    const d = (this.cnpjCpf || '').replace(/\D/g, '');
    if (d.length > 0) {
      const len = d.length === 11 && /^\d+$/.test(d) ? 11 : d.length;
      if ((t === 'CPF' && len !== 11) || (t === 'CNPJ' && len !== 14)) this.cnpjCpf = '';
    }
  }

  rotuloDocumento(): string {
    return this.tipoPessoa === 'CNPJ' ? 'CNPJ' : 'CPF';
  }

  validoDocumentoPasso1(): boolean {
    const d = (this.cnpjCpf || '').replace(/[^A-Z0-9]/gi, '').toUpperCase();
    if (this.tipoPessoa === 'CPF') return d.length === 11 && /^\d+$/.test(d);
    if (this.tipoPessoa === 'CNPJ') return d.length === 14;
    return false;
  }

  passoDrOk(): boolean {
    if (this.passoDr === 1) {
      return !!this.nome.trim() && !this.emailInvalido && !!this.email && this.senha.length >= 8
        && this.validoDocumentoPasso1();
    }
    if (this.passoDr === 2) {
      if (this.modoRepasse === 'pix') return !!this.pixTipo && !!this.pixChave.trim();
      return !!this.banco.trim() && !!this.conta.trim();
    }
    // Passo 3: arquivos são opcionais (podem ser enviados depois pelo perfil)
    return true;
  }

  avancarOnboarding() { if (this.passoDr < 3 && this.passoDrOk()) this.passoDr++; }

  /** Pré-preenche a chave Pix com o documento (evita erro de titularidade na hora). */
  sugerirChavePix() {
    if ((this.pixTipo === 'CPF' || this.pixTipo === 'CNPJ') && !this.pixChave && this.cnpjCpf) {
      this.pixChave = this.cnpjCpf;
      this.pixAuto = true;
    }
  }

  // ---------- CEP ----------

  buscaCepRegistro() {
    const d = (this.cep || '').replace(/\D/g, '');
    if (d.length !== 8 || d === this.ultimoCep) return;
    this.ultimoCep = d;
    this.buscandoCep = true; this.avisoCep = '';
    this.cepService.buscar(d).subscribe({
      next: (r: any) => {
        this.buscandoCep = false;
        if (r.logradouro && (!this.logradouro || this.logradouroAuto)) {
          this.logradouro = r.logradouro;
          this.logradouroAuto = true;
        }
        if (r.uf && !this.estado) this.estado = r.uf;
        if (r.cidade && !this.cidade) this.cidade = r.cidade;
        if (r.bairro && !this.bairro) this.bairro = r.bairro;
      },
      error: () => { this.buscandoCep = false; this.avisoCep = 'CEP não encontrado — preencha manualmente'; }
    });
  }

  /** Guarda o arquivo selecionado no cliente (upload acontece após criar a conta). */
  pegarDoc(ev: any, tipo: 'fone' | 'verso') {
    const input = ev.target as HTMLInputElement;
    const arquivo = input.files && input.files[0];
    this.erroDoc = '';
    if (!arquivo) return;
    if (arquivo.size > 100 * 1024 * 1024) {
      this.erroDoc = 'Arquivo maior que 100 MB — reduza a foto/escaneie em resolução menor.';
      input.value = '';
      return;
    }
    if (tipo === 'fone') this.arqFone = arquivo; else this.arqVerso = arquivo;
  }

  tamanho(bytes: number): string {
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  cadastrar() {
    this.erro = ''; this.sucesso = ''; this.ocupado = true;
    const ehDronista = this.papel === 'DRONISTA';
    this.api.registrar({
      nome: this.nome, email: this.email, senha: this.senha, telefone: this.telefone,
      papel: this.papel, cnpjCpf: this.cnpjCpf || null, licencaAnac: this.licencaAnac || null,
      bio: this.bio || null, empresa: this.empresa || null,
      estado: this.estado || null, cidade: this.cidade || null,
      bairro: this.bairro || null, cep: this.cep || null,
      logradouro: ehDronista ? (this.logradouro || null) : null,
      numero: ehDronista ? ((this.numero || '').trim().toUpperCase() || null) : null,
      // Onboarding do dronista:
      tipoPessoa: ehDronista ? this.tipoPessoa : null,
      pixTipo: ehDronista && this.modoRepasse === 'pix' ? this.pixTipo : null,
      pixChave: ehDronista && this.modoRepasse === 'pix' ? this.pixChave : null,
      banco: ehDronista && this.modoRepasse === 'banco' ? this.banco : null,
      agencia: ehDronista && this.modoRepasse === 'banco' ? this.agencia : null,
      conta: ehDronista && this.modoRepasse === 'banco' ? this.conta : null,
      tipoConta: ehDronista && this.modoRepasse === 'banco' ? this.tipoConta : null
    }).subscribe({
      next: r => {
        salvarSessao(r.token, r.papel, r.usuarioId);
        // Envia os documentos escolhidos (se houver) já autenticado; entra no app na sequência
        const uploads: any[] = [];
        if (ehDronista && this.arqFone) uploads.push(this.api.uploadDocumento(this.arqFone, 'pos'));
        if (ehDronista && this.arqVerso) uploads.push(this.api.uploadDocumento(this.arqVerso, 'vers'));
        if (uploads.length === 0) { window.location.href = '/app'; return; }
        let faltam = uploads.length;
        const fim = () => { if (--faltam <= 0) window.location.href = '/app'; };
        for (const u of uploads) u.subscribe({ next: fim, error: fim });
      },
      error: e => {
        this.ocupado = false;
        this.erro = e.error?.mensagem || 'Erro ao criar conta. Verifique os dados.';
      }
    });
  }
}
