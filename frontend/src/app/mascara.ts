import { Directive, ElementRef, HostListener, Input, Optional } from '@angular/core';
import { NgModel } from '@angular/forms';

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

  /** Digitação de valor (modelo de centavos): dígitos -> "1.234,56" (limite R$ 9.999.999.999,99). */
  static valorDigitado(v: string): string {
    const d = (v || '').replace(/\D/g, '');
    if (!d) return '';
    const n = parseInt(d.slice(0, 11), 10);
    if (isNaN(n)) return '';
    const reais = Math.floor(n / 100).toLocaleString('pt-BR');
    return `${reais},${String(n % 100).padStart(2, '0')}`;
  }

  /** Número do backend (320.5) -> "320,50" para exibição/edição. */
  static valorDeExibicao(v: number | string): string {
    if (v === '' || v === null || v === undefined) return '';
    const n = Number(v);
    if (!isFinite(n)) return '';
    return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /** "3.500,25" -> 3500.25; vazio/inválido -> null. */
  static numeroDeValorBr(v: string): number | null {
    const s = (v || '').replace(/\./g, '').replace(',', '.').trim();
    if (!s) return null;
    const n = Number(s);
    return isFinite(n) ? n : null;
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

/**
 * Máscara de valor monetário (R$). Formata enquanto digita (3500 -> "35,00")
 * e SINCRONIZA o ngModel com o texto exibido — sem isso o backend receberia
 * o número cru, não o valor que o usuário vê.
 */
@Directive({ selector: '[mascaraValor]', standalone: true })
export class MascaraValorDirective {
  @Input('mascaraValor') ativo: any;
  // NgModel é anterior no elemento ([(ngModel)] vem antes de mascaraValor no template)
  constructor(private el: ElementRef<HTMLInputElement>, @Optional() private model: NgModel | null) {}

  @HostListener('input')
  onInput() {
    const el = this.el.nativeElement;
    const mascarado = Mascara.valorDigitado(el.value);
    if (mascarado !== el.value) el.value = mascarado;
    if (this.model && this.model.value !== mascarado) this.model.viewToModelUpdate(mascarado);
  }
}