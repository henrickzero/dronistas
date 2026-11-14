import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from './api.service';
import { AdminService } from './admin.service';
import { papelAtual } from './papel';
import { DialogService } from './dialog.service';

/**
 * Painel ADMIN: fila de validação de identidade dos dronistas.
 * Dronista com cadastro pendente/em análise não pode aceitar voos —
 * aqui o admin visualiza os documentos (URL pré-assinada) e aprova/rejeita.
 */
@Component({
  selector: 'app-validacoes',
  standalone: true,
  imports: [FormsModule],
  template: `
  @if (papel !== 'ADMIN') {
    <div class="alert alert-error">⚠️ Esta tela é exclusiva do administrador da plataforma.</div>
  } @else {
    <h1>✅ Validação de identidade</h1>
    <p class="muted">Dronistas com cadastro em aprovação não conseguem aceitar voos até a liberação aqui.</p>

    <div class="abas">
      <button class="chip" [class.ativo]="status === 'ENVIADA'" (click)="trocar('ENVIADA')">⏳ Em análise</button>
      <button class="chip" [class.ativo]="status === 'PENDENTE'" (click)="trocar('PENDENTE')">📌 Sem documento</button>
      <button class="chip" [class.ativo]="status === 'APROVADA'" (click)="trocar('APROVADA')">✓ Aprovados</button>
      <button class="chip" [class.ativo]="status === 'REJEITADA'" (click)="trocar('REJEITADA')">✕ Rejeitados</button>
    </div>

    @if (carregando) { <div class="alert alert-info">Carregando...</div> }
    @if (erro) { <div class="alert alert-error">⚠️ {{ erro }}</div> }

    @for (v of lista; track v.perfilId) {
      <div class="cartao-item">
        <div class="linha-topo">
          <b>{{ v.nome }}</b>
          <span class="muted" style="font-size:.85rem">{{ v.cidade }}@if (v.estado) {/{{ v.estado }} }</span>
        </div>
        <ul class="meta-lista">
          <li>📄 Documento: {{ v.cnpjCpf }}</li>
          <li>📞 {{ v.telefone || '—' }}</li>
          <li>🧾 Arquivos: {{ v.temFrente ? 'frente ✓' : 'frente ✗' }} · {{ v.temVerso ? 'verso ✓' : 'verso ✗' }}</li>
        </ul>
        @if (detalhesId === v.perfilId && docUrls) {
          <div class="docs">
            @if (docUrls.frente) {
              <a [href]="docUrls.frente" target="_blank" rel="noopener" class="mini-doc">🧾 Ver frente (15 min)</a>
            }
            @if (docUrls.verso) {
              <a [href]="docUrls.verso" target="_blank" rel="noopener" class="mini-doc">🧾 Ver verso (15 min)</a>
            }
            @if (!docUrls.frente && !docUrls.verso) { <span class="muted">nenhum arquivo enviado</span> }
          </div>
        }
        <div class="acoes-linha">
          <button class="btn btn-outline btn-sm" (click)="verDocs(v)">👁️ Abrir documentos</button>
          @if (v.validacaoDoc !== 'APROVADA') {
            <button class="btn btn-sm" (click)="aprovar(v)">✓ Aprovar identidade</button>
          }
          @if (v.validacaoDoc !== 'REJEITADA') {
            <button class="btn btn-danger btn-sm" (click)="rejeitar(v)">✕ Rejeitar</button>
          }
        </div>
      </div>
    } @empty {
      @if (!carregando) {
        <div class="vazio"><span class="icone">📭</span>Nenhum dronista nessa situação.</div>
      }
    }
  }`,
  styles: [`
    .abas { display: flex; flex-wrap: wrap; gap: .4rem; margin-bottom: 1rem; }
    .docs { display: flex; flex-wrap: wrap; gap: .6rem; margin-top: .6rem; }
    .mini-doc { color: #3ea6ff; font-weight: 600; font-size: .875rem; text-decoration: none; }
    .mini-doc:hover { text-decoration: underline; }
  `]
})
export class ValidacoesComponent implements OnInit {
  papel = papelAtual();
  status = 'ENVIADA';
  lista: any[] = [];
  carregando = true; erro = '';
  detalhesId = ''; docUrls: any = null;

  constructor(private admin: AdminService, private dialog: DialogService) {}

  ngOnInit() { this.carregar(); }

  trocar(st: string) { this.status = st; this.detalhesId = ''; this.docUrls = null; this.carregar(); }

  carregar() {
    this.carregando = true; this.erro = '';
    this.admin.fila(this.status).subscribe({
      next: lista => { this.lista = lista || []; this.carregando = false; },
      error: e => { this.erro = e.error?.mensagem || 'Erro ao carregar a fila'; this.carregando = false; }
    });
  }

  verDocs(v: any) {
    if (this.detalhesId === v.perfilId) { this.detalhesId = ''; this.docUrls = null; return; }
    this.admin.documentos(v.perfilId).subscribe({
      next: d => { this.docUrls = d; this.detalhesId = v.perfilId; },
      error: e => this.dialog.info(e.error?.mensagem || 'Erro ao abrir documentos')
    });
  }

  aprovar(v: any) {
    this.dialog.confirmar({
      titulo: 'Aprovar identidade',
      mensagem: `Aprovar a identidade de ${v.nome}?\\nO dronista poderá aceitar propostas de voo novamente.`,
      textoConfirmar: 'Aprovar'
    }).then(ok => {
      if (!ok) return;
      this.admin.aprovar(v.perfilId).subscribe({
        next: () => this.carregar(),
        error: e => this.dialog.info(e.error?.mensagem || 'Erro ao aprovar')
      });
    });
  }

  rejeitar(v: any) {
    this.dialog.confirmar({
      titulo: 'Rejeitar documentos',
      mensagem: `Rejeitar os documentos de ${v.nome}?\\nO dronista continuará sem poder aceitar voos até reapresentar.`,
      textoConfirmar: 'Rejeitar', perigoso: true
    }).then(ok => {
      if (!ok) return;
      this.admin.rejeitar(v.perfilId).subscribe({
        next: () => this.carregar(),
        error: e => this.dialog.info(e.error?.mensagem || 'Erro ao rejeitar')
      });
    });
  }
}
