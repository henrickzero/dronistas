import { Component, Inject, Injectable, InjectionToken } from '@angular/core';
import { DialogService } from './dialog.service';

/**
 * Modal global de confirmação/aviso — substitui alert()/confirm() nativos.
 * Um único componente no AppComponent; usado por todas as telas via DialogService.
 */
@Component({
  selector: 'app-dialog',
  standalone: true,
  template: `
  @if (dialog.state()) {
    <div class="overlay" (click)="fecharFora($event)">
      <div class="caixa" role="dialog" aria-modal="true">
        <div class="icone" [class.perigo]="dialog.state()!.perigoso">
          {{ dialog.state()!.perigoso ? '⚠' : (dialog.state()!.tipo === 'info' ? 'ℹ' : '❓') }}
        </div>
        <h3>{{ dialog.state()!.titulo || (dialog.state()!.tipo === 'info' ? 'Atenção' : 'Confirmar') }}</h3>
        <p [innerHTML]="dialog.state()!.mensagem"></p>
        <div class="acoes">
          @if (dialog.state()!.tipo === 'confirm') {
            <button class="btn-cancelar" (click)="responder(false)">Cancelar</button>
            <button class="btn-ok" [class.perigoso]="dialog.state()!.perigoso" (click)="responder(true)">
              {{ dialog.state()!.textoConfirmar || 'Confirmar' }}
            </button>
          } @else {
            <button class="btn-ok" (click)="responder(true)">OK</button>
          }
        </div>
      </div>
    </div>
  }`,
  styles: [`
    .overlay {
      position: fixed; inset: 0; background: rgba(15, 23, 42, .45);
      display: flex; align-items: center; justify-content: center; z-index: 1000;
      backdrop-filter: blur(2px);
    }
    .caixa {
      background: var(--color-surface); border-radius: var(--radius-lg);
      box-shadow: 0 10px 40px rgba(15,23,42,.25); padding: 1.5rem 1.75rem;
      max-width: 380px; width: calc(100% - 2rem); text-align: center;
      animation: entrar .15s ease-out;
    }
    @keyframes entrar { from { opacity: 0; transform: scale(.95) translateY(8px); } }
    .icone {
      width: 48px; height: 48px; margin: 0 auto .75rem; border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-primary-light); color: var(--color-primary-dark);
      font-size: 1.4rem;
    }
    .icone.perigoso { background: var(--color-error-bg); color: var(--color-error); }
    h3 { margin: 0 0 .5rem; font-size: 1.1rem; }
    p { margin: 0 0 1.25rem; color: var(--color-text-muted); font-size: .95rem; white-space: pre-line; }
    .acoes { display: flex; gap: .6rem; justify-content: center; }
    .btn-cancelar, .btn-ok {
      padding: .55rem 1.3rem; border-radius: var(--radius); font-weight: 600;
      cursor: pointer; font-size: .925rem; border: none;
    }
    .btn-cancelar { background: var(--color-bg); color: var(--color-text-muted); border: 1px solid var(--color-border); }
    .btn-cancelar:hover { background: #eef2f7; }
    .btn-ok { background: var(--color-primary); color: #fff; }
    .btn-ok:hover { background: var(--color-primary-dark); }
    .btn-ok.perigoso { background: var(--color-error); }
    .btn-ok.perigoso:hover { background: #dc2626; }
  `]
})
export class DialogComponent {
  constructor(@Inject(DialogService) public dialog: DialogService) {}

  responder(v: boolean) { this.dialog.responder(v); }
  fecharFora(e: MouseEvent) { if ((e.target as HTMLElement).classList.contains('overlay')) this.responder(false); }
}