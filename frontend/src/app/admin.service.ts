import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';

/** Endpoints exclusivos do ADMIN para validar identidade dos dronistas. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = '/api/admin';

  constructor(private http: HttpClient) {}

  private req<T>(url: string): Observable<T> {
    const token = localStorage.getItem('token') || '';
    return this.http.get<T>(url, { headers: new HttpHeaders({ Authorization: 'Bearer ' + token }) });
  }
  private post<T>(url: string): Observable<T> {
    const token = localStorage.getItem('token') || '';
    return this.http.post<T>(url, {}, { headers: new HttpHeaders({ Authorization: 'Bearer ' + token }) });
  }

  fila(status = 'ENVIADA'): Observable<any[]> {
    return this.req(`${this.base}/validacoes?status=${status}`);
  }
  documentos(perfilId: string): Observable<any> {
    return this.req(`${this.base}/validacoes/${perfilId}/documentos`);
  }
  aprovar(perfilId: string): Observable<any> { return this.post(`${this.base}/validacoes/${perfilId}/aprovar`); }
  rejeitar(perfilId: string): Observable<any> { return this.post(`${this.base}/validacoes/${perfilId}/rejeitar`); }
}
