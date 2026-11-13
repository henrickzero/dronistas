import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface EnderecoCep {
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  fonte: string;
  lat: number | null;
  lng: number | null;
}

/**
 * Busca de endereço por CEP em dupla fonte:
 *   1. ViaCEP (logradouro/bairro/cidade/UF)
 *   2. BrasilAPI CEP v2 (reserva — também traz coordenadas, usadas na prévia do mapa)
 * CEP inexistente nas duas ou falha de rede -> onError com mensagem amigável.
 */
@Injectable({ providedIn: 'root' })
export class CepService {
  constructor(private http: HttpClient) {}

  buscar(cep: string): Observable<EnderecoCep> {
    const digitos = (cep || '').replace(/\D/g, '');
    return this.http.get<any>(`https://viacep.com.br/ws/${digitos}/json/`).pipe(
      catchError(() => this.http.get<any>(`https://brasilapi.com.br/api/cep/v2/${digitos}`)),
      map(r => {
        if (!r || r.erro)
          throw new Error('CEP não encontrado nas duas bases — confira o número ou preencha o endereço manualmente');
        if (r.logradouro !== undefined) {
          return { logradouro: r.logradouro || '', bairro: r.bairro || '',
                   cidade: r.localidade || '', uf: r.uf || '', fonte: 'ViaCEP', lat: null, lng: null };
        }
        const coords = r.location?.coordinates;
        const lat = coords?.latitude != null ? Number(coords.latitude) : null;
        const lng = coords?.longitude != null ? Number(coords.longitude) : null;
        return { logradouro: r.street || '', bairro: r.neighborhood || '',
                 cidade: r.city || '', uf: r.state || '', fonte: 'BrasilAPI',
                 lat: !isNaN(lat as any) ? lat : null, lng: !isNaN(lng as any) ? lng : null };
      })
    );
  }

  /** Geocoding textual no navegador (Nominatim/OSM) para prévia do local na revisão. */
  geocodarTexto(consulta: string): Observable<{ lat: number; lng: number } | null> {
    const q = consulta.replace(/\s+/g, ' ').trim();
    if (!q) return new Observable(sub => { sub.next(null); sub.complete(); });
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ', Brasil')}&format=json&limit=1`;
    return this.http.get<any[]>(url).pipe(
      map(arr => {
        if (!Array.isArray(arr) || arr.length === 0) return null;
        const lat = Number(arr[0].lat), lng = Number(arr[0].lon);
        return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null;
      }),
      catchError(() => new Observable<null>(sub => { sub.next(null); sub.complete(); }))
    );
  }
}
