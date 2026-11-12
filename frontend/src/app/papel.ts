/** Sessão global (sem tenant): token, papel e id do usuário em localStorage. */
export function tokenAtual(): string | null {
  return localStorage.getItem('token');
}

export function papelAtual(): string {
  return localStorage.getItem('papel') || '';
}

export function usuarioIdAtual(): string {
  return localStorage.getItem('usuarioId') || '';
}

export function salvarSessao(token: string, papel: string, usuarioId: string): void {
  localStorage.setItem('token', token);
  localStorage.setItem('papel', papel);
  localStorage.setItem('usuarioId', usuarioId);
}

export function limparSessao(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('papel');
  localStorage.removeItem('usuarioId');
}

/** Flash pós-redirect: "KIND:mensagem" lido e removido pela tela de destino. */
export function flashSet(mensagem: string, tipo: 'success' | 'info' = 'success'): void {
  sessionStorage.setItem('flash_msg', tipo + ':' + mensagem);
}

export function flashConsome(): { tipo: string; mensagem: string } | null {
  const bruto = sessionStorage.getItem('flash_msg');
  if (!bruto) return null;
  sessionStorage.removeItem('flash_msg');
  const i = bruto.indexOf(':');
  return { tipo: i > 0 ? bruto.slice(0, i) : 'info', mensagem: i > 0 ? bruto.slice(i + 1) : bruto };
}
