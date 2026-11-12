import { Injectable, signal } from '@angular/core';

/** Serviço central de diálogos: substitui alert()/confirm() nativos. */
@Injectable({ providedIn: 'root' })
export class DialogService {

  /** Estado atual (signal reativo consumido pelo ConfirmDialogComponent global). */
  readonly state = signal<DialogState | null>(null);

  /** Confirmação com retorno via Promise (await em qualquer componente). */
  confirmar(opcoes: ConfirmOpcoes): Promise<boolean> {
    return new Promise(resolve => {
      this.state.set({ ...opcoes, tipo: 'confirm' } as DialogState);
      this._resolver = resolve;
    });
  }

  /** Aviso informativo (botão único OK). */
  info(mensagem: string, titulo = 'Atenção') {
    this.state.set({ titulo, mensagem, tipo: 'info' } as DialogState);
  }

  responder(valor: boolean) {
    this.state.set(null);
    this._resolver?.(valor);
    this._resolver = null;
  }

  private _resolver: ((v: boolean) => void) | null = null;
}

export interface ConfirmOpcoes {
  titulo?: string;
  mensagem: string;
  /** Texto do botão de confirmação (ex.: "Desativar"). */
  textoConfirmar?: string;
  /** Estilo do botão de confirmar: primary (padrão) ou danger. */
  perigoso?: boolean;
}

export interface DialogState extends ConfirmOpcoes {
  tipo: 'confirm' | 'info';
}