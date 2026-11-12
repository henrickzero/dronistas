import { Directive, ElementRef, HostListener, Input } from '@angular/core';

/** Utilidades de máscara brasileira (CPF, CNPJ alfanumérico, telefone, CEP). */
export class Mascara {
  static telefone(v: string): string {
    const d = (v || '').replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  }

  /** CPF 000.000.000-00 | CNPJ alfanumérico 00.000.000/XXXX-DD (X = [0-9A-Z]). */
  static documento(v: string): string {
    const d = (v || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 14);
    if (d.length <= 3) return d;
    // Só dígitos com até 11 posições: formata como CPF
    if (d.length <= 11 && /^\d+$/.test(d)) {
      let cpf = d.slice(0, 3);
      if (d.length > 3) cpf += '.' + d.slice(3, 6);
      if (d.length > 6) cpf += '.' + d.slice(6, 9);
      if (d.length > 9) cpf += '-' + d.slice(9, 11);
      return cpf;
    }
    // Formato CNPJ (12 alfanuméricos + 2 dígitos verificadores)
    let out = d.slice(0, 2) + '.' + d.slice(2, 5);
    if (d.length > 5) out += '.' + d.slice(5, 8);
    if (d.length > 8) out += '/' + d.slice(8, 12);
    if (d.length > 12) out += '-' + d.slice(12, 14);
    return out;
  }

  /** CEP 00000-000. */
  static cep(v: string): string {
    const d = (v || '').replace(/\D/g, '').slice(0, 8);
    if (d.length <= 5) return d;
    return d.slice(0, 5) + '-' + d.slice(5);
  }
}

@Directive({ selector: '[mascaraDoc]', standalone: true })
export class MascaraDocDirective {
  @Input('mascaraDoc') ativo: any;
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  onInput() {
    const el = this.el.nativeElement;
    const mascarado = Mascara.documento(el.value);
    if (mascarado !== el.value) el.value = mascarado;
  }
}

@Directive({ selector: '[mascaraFone]', standalone: true })
export class MascaraFoneDirective {
  @Input('mascaraFone') ativo: any;
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  onInput() {
    const el = this.el.nativeElement;
    const mascarado = Mascara.telefone(el.value);
    if (mascarado !== el.value) el.value = mascarado;
  }
}

@Directive({ selector: '[mascaraCep]', standalone: true })
export class MascaraCepDirective {
  @Input('mascaraCep') ativo: any;
  constructor(private el: ElementRef<HTMLInputElement>) {}

  @HostListener('input')
  onInput() {
    const el = this.el.nativeElement;
    const mascarado = Mascara.cep(el.value);
    if (mascarado !== el.value) el.value = mascarado;
  }
}