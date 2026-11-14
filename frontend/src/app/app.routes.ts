import { Routes } from '@angular/router';
import { SitePrincipalComponent } from './site-principal.component';
import { LoginComponent } from './login.component';
import { ShellComponent } from './shell.component';
import { DashboardComponent } from './dashboard.component';
import { PropostasComponent } from './propostas.component';
import { PropostaNovaComponent } from './proposta-nova.component';
import { PropostaDetalheComponent } from './proposta-detalhe.component';
import { ContasComponent } from './contas.component';
import { EntregasComponent } from './entregas.component';
import { RankingComponent } from './ranking.component';
import { ValidacoesComponent } from './validacoes.component';
import { PerfilComponent } from './perfil.component';
import { authGuard, solicitanteGuard, dronistaGuard } from './auth.guard';

export const routes: Routes = [
  { path: '', component: SitePrincipalComponent },
  { path: 'login', component: LoginComponent },
  {
    path: 'app',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', component: DashboardComponent },
      { path: 'propostas', component: PropostasComponent },
      { path: 'propostas/nova', canActivate: [solicitanteGuard], component: PropostaNovaComponent },
      { path: 'propostas/:id', component: PropostaDetalheComponent },
      { path: 'contas', canActivate: [dronistaGuard], component: ContasComponent },
      { path: 'entregas', component: EntregasComponent },
      { path: 'ranking', component: RankingComponent },
      { path: 'validacoes', component: ValidacoesComponent },
      { path: 'perfil', component: PerfilComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
