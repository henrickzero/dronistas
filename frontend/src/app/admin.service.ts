import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

/** Endpoints exclusivos do ADMIN para validar identidade dos dronistas. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private base = '/api/admin';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: 'Bearer ' + token });
  }

  fila(status = 'ENVIADA'): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/validacoes?status=${status}`, { headers: this.headers() });
  }
  documentos(perfilId: string): Observable<any> {
    return this.http.get<any>(`${this.base}/validacoes/${perfilId}/documentos`, { headers: this.headers() });
  }
  /** Documento como blob autenticado (streaming via backend — nunca link S3). */
  adminDocumentoConteudo(id: string): Observable<string> {
    return this.http.get(`/api/admin/documentos/${id}/conteudo`, { headers: this.headers(), responseType: 'blob' })
      .pipe(map(b => URL.createObjectURL(b)));
  }
  aprovar(perfilId: string): Observable<any> {
    return this.http.post(`${this.base}/validacoes/${perfilId}/aprovar`, {}, { headers: this.headers() });
  }
  rejeitar(perfilId: string): Observable<any> {
    return this.http.post(`${this.base}/validacoes/${perfilId}/rejeitar`, {}, { headers: this.headers() });
  }
}
