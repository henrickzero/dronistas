import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/** Busca gratuita de endereço por CEP (ViaCEP — sem chave). */
@Injectable({ providedIn: 'root' })
export class CepService {
  constructor(private http: HttpClient) {}

  buscar(cep: string): Observable<any> {
    const digitos = (cep || '').replace(/\D/g, '');
    return this.http.get(`https://viacep.com.br/ws/${digitos}/json/`);
  }
}
