import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from './api.service';
import { CepService } from './cep.service';
import { MascaraDocDirective, MascaraFoneDirective, MascaraCepDirective } from './mascara';
import { salvarSessao } from './papel';

/** Landing + cadastro self-service (dronista ou solicitante). */
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
          <form (ngSubmit)="cadastrar()" #f="ngForm">
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
            </div>

            <label>Senha
              <input [(ngModel)]="senha" name="senha" type="password" required minlength="8" autocomplete="new-password">
              @if (senhaCurta) { <small class="hint" style="color:var(--color-error)">Mínimo de 8 caracteres — faltam {{ 8 - senha.length }}.</small> }
            </label>

            @if (papel === 'DRONISTA') {
              <details class="secao" open>
                <summary><span class="drone-icone"></span> Dados do profissional</summary>
                <label>CPF ou CNPJ
                  <input [(ngModel)]="cnpjCpf" name="cnpjCpf" required placeholder="000.000.000-00" maxlength="18" mascaraDoc>
                </label>
                <label>Licença ANAC
                  <input [(ngModel)]="licencaAnac" name="licencaAnac" placeholder="Ex.: CANAC-1234567">
                </label>
                <label>Bio / especialidade
                  <textarea [(ngModel)]="bio" name="bio" rows="2"
                            placeholder="Ex.: Filmagens imobiliárias e eventos, 5 anos de experiência"></textarea>
                </label>
              </details>
              <details class="secao" open>
                <summary>📍 Sua localização (base de operação)</summary>
                <div class="grid-local">
                  <label>Estado (UF)
                    <select [(ngModel)]="estado" name="estado">
                      <option value="">—</option>
                      @for (uf of ufs; track uf) { <option [value]="uf">{{ uf }}</option> }
                    </select>
                  </label>
                  <label>CEP
                    <input [(ngModel)]="cep" name="cep" mascaraCep placeholder="00000-000" (input)="buscaCepRegistro()">
                    @if (buscandoCep) { <small class="hint">Buscando CEP...</small> }
                    @if (avisoCep) { <small class="hint" style="color:var(--color-error)">{{ avisoCep }}</small> }
                  </label>
                  <label>Cidade
                    <input [(ngModel)]="cidade" name="cidade" placeholder="Ex.: Campinas">
                  </label>
                  <label>Bairro
                    <input [(ngModel)]="bairro" name="bairro" placeholder="Opcional">
                  </label>
                </div>
                <small class="hint">Usamos sua base para ordenar oportunidades por proximidade.</small>
              </details>
            } @else {
              <label>CPF ou CNPJ
                <input [(ngModel)]="cnpjCpf" name="cnpjCpf" placeholder="000.000.000-00" maxlength="18" mascaraDoc>
                <small class="hint">Opcional — validamos o dígito verificador ao salvar.</small>
              </label>
              <label>Empresa (opcional)
                <input [(ngModel)]="empresa" name="empresa" placeholder="Nome da sua empresa">
              </label>
            }

            @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }
            @if (sucesso) { <div class="alert alert-success">✓ {{ sucesso }}</div> }
            @if (f.invalid) { <div class="alert alert-warning">Preencha os campos pendentes acima para liberar o botão.</div> }

            <button class="btn btn-block" type="submit" [disabled]="f.invalid || ocupado">
              {{ ocupado ? 'Criando conta...' : 'Criar conta e entrar' }}
            </button>
          </form>
        </div>
      }

      <p class="muted" style="text-align:center; margin-top:1.25rem">
        Já tem conta? <a routerLink="/login">Entrar</a>
      </p>
    </div>
  </div>`,
  styles: [`
    a { color: var(--color-primary-dark); font-weight: 600; text-decoration: none; }
    a:hover { text-decoration: underline; }
  `]
})
export class SitePrincipalComponent {
  papel = '';
  nome = ''; email = ''; telefone = ''; senha = '';
  cnpjCpf = ''; licencaAnac = ''; bio = ''; empresa = '';
  estado = ''; cidade = ''; bairro = ''; cep = '';
  buscandoCep = false; avisoCep = ''; ultimoCep = '';
  erro = ''; sucesso = ''; ocupado = false;

  ufs = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

  get senhaCurta(): boolean {
    return this.senha.length > 0 && this.senha.length < 8;
  }

  get emailInvalido(): boolean {
    return this.email.length > 0 && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(this.email);
  }

  constructor(private api: ApiService, private cepService: CepService) {}

  buscaCepRegistro() {
    const d = (this.cep || '').replace(/\D/g, '');
    if (d.length !== 8 || d === this.ultimoCep) return;
    if (d.length !== 8) { this.buscandoCep = false; this.avisoCep = ''; return; }
    this.ultimoCep = d;
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

  cadastrar() {
    this.erro = ''; this.sucesso = ''; this.ocupado = true;
    this.api.registrar({
      nome: this.nome, email: this.email, senha: this.senha, telefone: this.telefone,
      papel: this.papel, cnpjCpf: this.cnpjCpf || null, licencaAnac: this.licencaAnac || null,
      bio: this.bio || null, empresa: this.empresa || null,
      estado: this.estado || null, cidade: this.cidade || null,
      bairro: this.bairro || null, cep: this.cep || null
    }).subscribe({
      next: r => {
        salvarSessao(r.token, r.papel, r.usuarioId);
        window.location.href = '/app';
      },
      error: e => {
        this.ocupado = false;
        this.erro = e.error?.mensagem || 'Erro ao criar conta. Verifique os dados.';
      }
    });
  }
}
