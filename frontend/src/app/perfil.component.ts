import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { papelAtual, flashSet } from './papel';
import { MascaraFoneDirective, MascaraCepDirective } from './mascara';
import { CepService } from './cep.service';
import { EstrelasComponent } from './estrelas.component';

/** Perfil do usuário logado: dados, localização, métricas e edição. */
@Component({
  selector: 'app-perfil',
  standalone: true,
  imports: [FormsModule, MascaraFoneDirective, MascaraCepDirective, EstrelasComponent],
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
            <label>Cidade
              <input [(ngModel)]="cidade" name="cidade">
            </label>
            <label>Bairro
              <input [(ngModel)]="bairro" name="bairro">
            </label>
          </div>
          <small class="hint">Usamos sua base para ordenar oportunidades por proximidade.</small>
          <label>Bio / especialidade
            <textarea [(ngModel)]="bio" name="bio" rows="2"></textarea>
          </label>
        }

        @if (sucesso) { <div class="alert alert-success">✓ {{ sucesso }}</div> }
        @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

        <button class="btn" type="submit" [disabled]="f.invalid || ocupado">
          {{ ocupado ? 'Salvando...' : 'Salvar alterações' }}
        </button>
      </form>
    </div>
  }`,
  styles: [``]
})
export class PerfilComponent implements OnInit {
  p: any = null;
  papel = papelAtual();
  nome = ''; telefone = ''; licencaAnac = ''; bio = ''; empresa = '';
  estado = ''; cidade = ''; bairro = ''; cep = '';
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
        if (r?.erro) { this.avisoCep = 'CEP não encontrado — preencha manualmente'; return; }
        if (r?.uf) this.estado = r.uf;
        if (r?.localidade) this.cidade = r.localidade;
        if (r?.bairro && !this.bairro) this.bairro = r.bairro;
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
        this.estado = p.estado || ''; this.cidade = p.cidade || '';
        this.bairro = p.bairro || ''; this.cep = p.cep || '';
        this.carregando = false;
      },
      error: () => { this.carregando = false; this.erro = 'Não foi possível carregar o perfil'; }
    });
  }

  salvar() {
    this.erro = ''; this.sucesso = ''; this.ocupado = true;
    this.api.atualizarPerfil({
      nome: this.nome, telefone: this.telefone || null,
      licencaAnac: this.licencaAnac || null, bio: this.bio || null, empresa: this.empresa || null,
      estado: this.estado || null, cidade: this.cidade || null,
      bairro: this.bairro || null, cep: this.cep || null
    }).subscribe({
      next: p => { this.p = p; this.ocupado = false; this.sucesso = 'Perfil atualizado!'; flashSet('Perfil atualizado.'); },
      error: e => { this.ocupado = false; this.erro = e.error?.mensagem || 'Erro ao salvar'; }
    });
  }
}
