import { Component, OnInit } from '@angular/core';
import { ApiService } from './api.service';
import { AdminService } from './admin.service';
import { papelAtual } from './papel';
import { DialogService } from './dialog.service';

/**
 * Painel ADMIN: fila de validação de identidade dos dronistas.
 * Lista de N documentos (até 10), visualizados em blob autenticado pelo backend.
 */
@Component({
  selector: 'app-validacoes',
  standalone: true,
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
          <li>🧾 Arquivos anexados: {{ v.totalDocumentos || 0 }}</li>
        </ul>
        @if (detalhesId === v.perfilId && docRes) {
          <div class="docs-lista">
            @for (d of docRes.documentos; track d.id) {
              <div class="doc-item">
                <span class="doc-nome">🧾 {{ d.nome }} <small class="muted">· {{ bytes(d.tamanho) }}</small></span>
                <button type="button" class="mini" (click)="abrirDoc(d)">👁️ Abrir</button>
              </div>
            } @empty {
              <span class="muted" style="font-size:.85rem">nenhum arquivo da nova lista (podem estar nos slots antigos)</span>
            }
            @if (docRes.temFrente || docRes.temVerso) {
              <small class="muted" style="font-size:.8rem">Este dronista tem arquivos do formato antigo (slots frente/verso); peça reanexo para a lista nova se necessário.</small>
            }
          </div>
        }
        <div class="acoes-linha">
          <button class="btn btn-outline btn-sm" (click)="verDocs(v)">👁️ Ver documentos</button>
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
    .docs-lista { display: grid; gap: .4rem; margin-top: .6rem; }
    .doc-item {
      display: flex; align-items: center; justify-content: space-between; gap: .6rem;
      background: rgba(255, 255, 255, .04); border-radius: 8px; padding: .45rem .6rem;
    }
    .doc-nome { font-size: .875rem; word-break: break-all; }
    .mini { border: none; background: none; color: #3ea6ff; font-size: .8rem; cursor: pointer; padding: .15rem .3rem; }
    .mini:hover { text-decoration: underline; }
  `]
})
export class ValidacoesComponent implements OnInit {
  papel = papelAtual();
  status = 'ENVIADA';
  lista: any[] = [];
  carregando = true; erro = '';
  detalhesId = ''; docRes: any = null;

  constructor(private admin: AdminService, private dialog: DialogService) {}

  bytes(n: any): string {
    if (n == null) return '';
    if (n >= 1024 * 1024) return (n / 1024 / 1024).toFixed(1) + ' MB';
    return (n / 1024).toFixed(0) + ' KB';
  }

  ngOnInit() { this.carregar(); }

  trocar(st: string) { this.status = st; this.detalhesId = ''; this.docRes = null; this.carregar(); }

  carregar() {
    this.carregando = true; this.erro = '';
    this.admin.fila(this.status).subscribe({
      next: lista => { this.lista = lista || []; this.carregando = false; },
      error: e => { this.erro = e.error?.mensagem || 'Erro ao carregar a fila'; this.carregando = false; }
    });
  }

  verDocs(v: any) {
    if (this.detalhesId === v.perfilId) { this.detalhesId = ''; this.docRes = null; return; }
    this.admin.documentos(v.perfilId).subscribe({
      next: d => { this.docRes = d; this.detalhesId = v.perfilId; },
      error: e => this.dialog.info(e.error?.mensagem || 'Erro ao abrir documentos')
    });
  }

  abrirDoc(d: any) {
    this.admin.adminDocumentoConteudo(d.id).subscribe({
      next: url => window.open(url, '_blank'),
      error: e => this.dialog.info(e.error?.mensagem || 'Não foi possível abrir o documento')
    });
  }

  aprovar(v: any) {
    this.dialog.confirmar({
      titulo: 'Aprovar identidade',
      mensagem: `Aprovar a identidade de ${v.nome}?\nO dronista poderá aceitar propostas de voo novamente.`,
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
      mensagem: `Rejeitar os documentos de ${v.nome}?\nO dronista continuará sem poder aceitar voos até reapresentar.`,
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
