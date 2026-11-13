import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { limparSessao } from './papel';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private base = '/api';

  constructor(private http: HttpClient) {}

  private headers(): HttpHeaders {
    const token = localStorage.getItem('token') || '';
    return new HttpHeaders({ Authorization: 'Bearer ' + token });
  }

  /** Sessão expirada: limpa e volta para o login. */
  private tratarSessao(err: HttpErrorResponse) {
    if (err.status === 401) {
      limparSessao();
      window.location.href = '/login';
    }
    return throwError(() => err);
  }

  private get<T>(url: string): Observable<T> {
    return this.http.get<T>(url, { headers: this.headers() }).pipe(catchError(e => this.tratarSessao(e)));
  }
  private post<T>(url: string, body: any): Observable<T> {
    return this.http.post<T>(url, body, { headers: this.headers() }).pipe(catchError(e => this.tratarSessao(e)));
  }
  private put<T>(url: string, body: any): Observable<T> {
    return this.http.put<T>(url, body, { headers: this.headers() }).pipe(catchError(e => this.tratarSessao(e)));
  }

  // ---- Auth (público) ----
  registrar(dados: any): Observable<any> {
    return this.http.post(`${this.base}/auth/registrar`, dados);
  }
  login(email: string, senha: string): Observable<any> {
    return this.http.post(`${this.base}/auth/login`, { email, senha });
  }

  // ---- Perfil ----
  meuPerfil(): Observable<any> { return this.get(`${this.base}/perfil/me`); }
  atualizarPerfil(dados: any): Observable<any> { return this.put(`${this.base}/perfil/me`, dados); }

  // ---- Propostas ----
  propostasAbertas(estado = '', cidade = '', page = 0): Observable<any> {
    const p = new URLSearchParams();
    if (estado) p.set('estado', estado);
    if (cidade) p.set('cidade', cidade);
    p.set('page', String(page));
    return this.get(`${this.base}/propostas/abertas?${p.toString()}`);
  }
  /** Cidades com oportunidades abertas (combo de filtro), opcionalmente filtradas por UF. */
  cidadesAbertas(uf = ''): Observable<string[]> {
    const q = uf ? `?estado=${encodeURIComponent(uf)}` : '';
    return this.get(`${this.base}/propostas/abertas/cidades${q}`);
  }
  propostasParticipando(): Observable<any[]> { return this.get(`${this.base}/propostas/participando`); }
  minhasPropostas(): Observable<any[]> { return this.get(`${this.base}/propostas/minhas`); }
  proposta(id: string): Observable<any> { return this.get(`${this.base}/propostas/${id}`); }
  criarProposta(dados: any): Observable<any> { return this.post(`${this.base}/propostas`, dados); }
  atualizarProposta(id: string, dados: any): Observable<any> { return this.put(`${this.base}/propostas/${id}`, dados); }
  aceitarPropostaDeCara(id: string): Observable<any> { return this.post(`${this.base}/propostas/${id}/aceitar`, {}); }
  cancelarProposta(id: string): Observable<any> { return this.post(`${this.base}/propostas/${id}/cancelar`, {}); }

  // ---- Contas-proposta ----
  contasDaProposta(propostaId: string): Observable<any[]> { return this.get(`${this.base}/propostas/${propostaId}/contas`); }
  enviarConta(propostaId: string, dados: any): Observable<any> { return this.post(`${this.base}/propostas/${propostaId}/contas`, dados); }
  minhasContas(): Observable<any[]> { return this.get(`${this.base}/contas/minhas`); }
  aceitarConta(id: string): Observable<any> { return this.post(`${this.base}/contas/${id}/aceitar`, {}); }
  recusarConta(id: string): Observable<any> { return this.post(`${this.base}/contas/${id}/recusar`, {}); }

  // ---- Entregas ----
  entregasRecebidas(): Observable<any[]> { return this.get(`${this.base}/entregas/recebidas`); }
  minhasEntregas(): Observable<any[]> { return this.get(`${this.base}/entregas/minhas`); }
  entregarVideo(contaId: string, dados: any): Observable<any> { return this.post(`${this.base}/contas/${contaId}/entrega`, dados); }
  aprovarEntrega(id: string): Observable<any> { return this.post(`${this.base}/entregas/${id}/aprovar`, {}); }
  recusarEntrega(id: string): Observable<any> { return this.post(`${this.base}/entregas/${id}/recusar`, {}); }
  avaliarEntrega(id: string, nota: number, comentario: string): Observable<any> {
    return this.post(`${this.base}/entregas/${id}/avaliar`, { nota, comentario });
  }
  avaliarSolicitante(id: string, nota: number, comentario: string): Observable<any> {
    return this.post(`${this.base}/entregas/${id}/avaliar-solicitante`, { nota, comentario });
  }

  // ---- Ranking ----
  rankingDronistas(): Observable<any[]> { return this.get(`${this.base}/ranking/dronistas`); }
  rankingSolicitantes(): Observable<any[]> { return this.get(`${this.base}/ranking/solicitantes`); }
}
