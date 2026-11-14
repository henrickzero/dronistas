import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
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
  minhasPropostas(page = 0): Observable<any> {
    return this.get(`${this.base}/propostas/minhas?page=${page}`);
  }
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
  /** Entrega do vídeo por UPLOAD (multipart; até 8 GB) com progresso em % via HttpProgressEvent. */
  uploadEntrega(contaId: string, arquivo: File, observacao: string | null, onProgress?: (pct: number) => void): Observable<any> {
    const fd = new FormData();
    fd.append('arquivo', arquivo, arquivo.name);
    if (observacao) fd.append('observacao', observacao);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return new Observable<any>(assina => {
      const req = this.http.post(`${this.base}/contas/${contaId}/entrega`, fd, {
        headers,
        reportProgress: true,
        observe: 'events'
      }).subscribe({
        next: (ev: any) => {
          // 1 = UploadProgress · 4 = Response (resultado final)
          if (ev.type === 1 && ev.loaded != null && ev.total) {
            onProgress?.(Math.min(100, Math.round(ev.loaded * 100 / ev.total)));
          } else if (ev.type === 4) {
            assina.next(ev.body);
            assina.complete();
          }
        },
        error: e => assina.error(this.tratarSessao(e))
      });
      return () => req.unsubscribe();
    });
  }
  /** Vídeo da entrega como blob autenticado (nunca link direto ao S3) para abrir/assistir. */
  videoEntrega(id: string): Observable<string> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.get(`${this.base}/entregas/${id}/video`, { headers, responseType: 'blob' })
      .pipe(map(b => URL.createObjectURL(b)), catchError(e => this.tratarSessao(e)));
  }
  /** Dronista anexa mais um vídeo à entrega (lista de N arquivos, teto 10). */
  adicionarArquivoEntrega(entregaId: string, arquivo: File): Observable<any> {
    const fd = new FormData();
    fd.append('arquivo', arquivo, arquivo.name);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.post(`${this.base}/entregas/${entregaId}/arquivos`, fd, { headers })
      .pipe(catchError(e => this.tratarSessao(e)));
  }
  excluirArquivoEntrega(arquivoId: string): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.delete(`${this.base}/entregas/arquivos/${arquivoId}`, { headers })
      .pipe(catchError(e => this.tratarSessao(e)));
  }
  /** Vídeo de um arquivo da lista como blob autenticado (nunca link direto ao S3). */
  videoArquivo(arquivoId: string): Observable<string> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.get(`${this.base}/entregas/arquivos/${arquivoId}/video`, { headers, responseType: 'blob' })
      .pipe(map(b => URL.createObjectURL(b)), catchError(e => this.tratarSessao(e)));
  }
  /** Arquivos da entrega (lista de N vídeos). */
  arquivosDaEntrega(entregaId: string): Observable<any[]> { return this.get(`${this.base}/entregas/${entregaId}/arquivos`); }
  /** STAGING: anexa 1 vídeo ao rascunho (invisível ao solicitante) com progresso %. */
  anexarRascunho(contaId: string, arquivo: File, onProgress?: (pct: number) => void): Observable<any> {
    const fd = new FormData();
    fd.append('arquivo', arquivo, arquivo.name);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return new Observable<any>(assina => {
      const req = this.http.post(`${this.base}/contas/${contaId}/rascunho`, fd, {
        headers, reportProgress: true, observe: 'events'
      }).subscribe({
        next: (ev: any) => {
          if (ev.type === 1 && ev.loaded != null && ev.total) {
            onProgress?.(Math.min(100, Math.round(ev.loaded * 100 / ev.total)));
          } else if (ev.type === 4) {
            assina.next(ev.body);
            assina.complete();
          }
        },
        error: e => assina.error(this.tratarSessao(e))
      });
      return () => req.unsubscribe();
    });
  }
  /** STAGING: conteúdo do vídeo anexado (blob autenticado p/ conferir antes de entregar). */
  rascunhoConteudo(id: string): Observable<string> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.get(`${this.base}/contas/rascunho/${id}/conteudo`, { headers, responseType: 'blob' })
      .pipe(map(b => URL.createObjectURL(b)), catchError(e => this.tratarSessao(e)));
  }
  /** STAGING: lista os vídeos anexados no rascunho. */
  rascunhoDaConta(contaId: string): Observable<any[]> { return this.get(`${this.base}/contas/${contaId}/rascunho`); }
  /** STAGING: remove 1 vídeo do rascunho. */
  removerRascunho(rascunhoId: string): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.delete(`${this.base}/contas/rascunho/${rascunhoId}`, { headers })
      .pipe(catchError(e => this.tratarSessao(e)));
  }
  /** FINALIZA a entrega (move os vídeos do rascunho) e notifica o solicitante. */
  finalizarEntrega(contaId: string, observacao: string | null): Observable<any> {
    return this.post(`${this.base}/contas/${contaId}/entrega-final`, { observacao });
  }
  aprovarEntrega(id: string): Observable<any> { return this.post(`${this.base}/entregas/${id}/aprovar`, {}); }
  recusarEntrega(id: string): Observable<any> { return this.post(`${this.base}/entregas/${id}/recusar`, {}); }
  avaliarEntrega(id: string, nota: number, comentario: string): Observable<any> {
    return this.post(`${this.base}/entregas/${id}/avaliar`, { nota, comentario });
  }
  avaliarSolicitante(id: string, nota: number, comentario: string): Observable<any> {
    return this.post(`${this.base}/entregas/${id}/avaliar-solicitante`, { nota, comentario });
  }

  // ---- Upload de documentos (dronista; bucket privado; N arquivos, max 10) ----
  documentosMe(): Observable<any> { return this.get(`${this.base}/documentos/me`); }
  /** Upload de 1 documento (multipart; até 100 MB) com progresso em % via HttpProgressEvent. */
  uploadDocumento(arquivo: File, onProgress?: (pct: number) => void): Observable<any> {
    const fd = new FormData();
    fd.append('arquivo', arquivo, arquivo.name);
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return new Observable<any>(assina => {
      const req = this.http.post(`${this.base}/documentos/upload`, fd, {
        headers,
        reportProgress: true,
        observe: 'events'
      }).subscribe({
        next: (ev: any) => {
          // 1 = UploadProgress · 4 = Response (resultado final)
          if (ev.type === 1 && ev.loaded != null && ev.total) {
            onProgress?.(Math.min(100, Math.round(ev.loaded * 100 / ev.total)));
          } else if (ev.type === 4) {
            assina.next(ev.body);
            assina.complete();
          }
        },
        error: e => assina.error(this.tratarSessao(e))
      });
      return () => req.unsubscribe();
    });
  }
  /** Conteúdo do documento como blob autenticado (nunca link direto ao S3). */
  documentoConteudo(id: string): Observable<string> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.get(`${this.base}/documentos/${id}/conteudo`, { headers, responseType: 'blob' })
      .pipe(map(b => URL.createObjectURL(b)), catchError(e => this.tratarSessao(e)));
  }
  excluirDocumento(id: string): Observable<any> {
    const token = localStorage.getItem('token') || '';
    const headers = new HttpHeaders({ Authorization: 'Bearer ' + token });
    return this.http.delete(`${this.base}/documentos/${id}`, { headers })
      .pipe(catchError(e => this.tratarSessao(e)));
  }
  /** Lista os documentos do dronista (N arquivos). */
  meusDocumentos(): Observable<any> { return this.get(`${this.base}/documentos/me`); }

  // ---- Ranking ----
  rankingDronistas(): Observable<any[]> { return this.get(`${this.base}/ranking/dronistas`); }
  rankingSolicitantes(): Observable<any[]> { return this.get(`${this.base}/ranking/solicitantes`); }
}
