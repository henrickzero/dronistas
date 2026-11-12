import { Component, Input, Output, EventEmitter } from '@angular/core';

/** Exibe estrelas (leitura) ou coleta uma nota (clicável). */
@Component({
  selector: 'app-estrelas',
  standalone: true,
  template: `
    <span class="estrelas" [class.clicavel]="clicavel" [class.grandes]="grandes">
      @for (i of escala; track i) {
        <span (click)="marcar(i)">{{ valor >= i ? '★' : '☆' }}</span>
      }
    </span>
  `
})
export class EstrelasComponent {
  @Input() nota: number | null | undefined = null;
  @Input() clicavel = false;
  @Input() grandes = false;
  @Output() aoMarcar = new EventEmitter<number>();

  escala = [1, 2, 3, 4, 5];

  get valor(): number { return Number(this.nota ?? 0); }

  marcar(i: number) {
    if (this.clicavel) this.aoMarcar.emit(i);
  }
}
