import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { tokenAtual, papelAtual } from './papel';

/** Exige login (token na sessão). */
export const authGuard: CanActivateFn = () => {
  if (tokenAtual()) return true;
  return inject(Router).parseUrl('/login');
};

/** Restringe a rota a solicitantes (admin passa). */
export const solicitanteGuard: CanActivateFn = () => {
  const papel = papelAtual();
  if (papel === 'SOLICITANTE' || papel === 'ADMIN') return true;
  return inject(Router).parseUrl('/app');
};

/** Restringe a rota a dronistas (admin passa). */
export const dronistaGuard: CanActivateFn = () => {
  const papel = papelAtual();
  if (papel === 'DRONISTA' || papel === 'ADMIN') return true;
  return inject(Router).parseUrl('/app');
};
