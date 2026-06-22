import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { guestGuard } from './core/auth/guest.guard';

export const routes: Routes = [
  {
    path: 'bienvenue',
    title: 'MIANG — deviens millionaire… comme la blague',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'connexion',
    title: 'Se connecter — MIANG',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'inscription',
    title: 'Créer un compte — MIANG',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'verification',
    title: 'Vérification — MIANG',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/auth/verify-otp.component').then((m) => m.VerifyOtpComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell.component').then((m) => m.ShellComponent),
    children: [
      {
        path: 'accueil',
        title: 'Accueil — MIANG',
        loadComponent: () =>
          import('./features/sessions/sessions.component').then((m) => m.SessionsComponent),
      },
      {
        path: 'creer-session',
        title: 'Créer une session — MIANG',
        loadComponent: () =>
          import('./features/sessions/create-session.component').then((m) => m.CreateSessionComponent),
      },
      {
        path: 'sessions/:id',
        title: 'Session — MIANG',
        loadComponent: () =>
          import('./features/sessions/session-view.component').then((m) => m.SessionViewComponent),
      },
      {
        path: 'historique',
        title: 'Historique — MIANG',
        loadComponent: () => import('./features/history/history.component').then((m) => m.HistoryComponent),
      },
      {
        path: 'tirage/:id',
        title: 'Tirage de minuit — MIANG',
        loadComponent: () => import('./features/sessions/draw.component').then((m) => m.DrawComponent),
      },
      {
        path: 'portefeuille',
        title: 'Portefeuille — MIANG',
        loadComponent: () => import('./features/wallet/wallet.component').then((m) => m.WalletComponent),
      },
      {
        path: 'messages',
        title: 'Messages — MIANG',
        loadComponent: () =>
          import('./features/messages/messages.component').then((m) => m.MessagesComponent),
      },
      {
        path: 'messages/:id',
        title: 'Conversation — MIANG',
        loadComponent: () => import('./features/messages/chat.component').then((m) => m.ChatComponent),
      },
      {
        path: 'amis',
        title: 'Amis — MIANG',
        loadComponent: () => import('./features/friends/friends.component').then((m) => m.FriendsComponent),
      },
      {
        path: 'profil',
        title: 'Profil — MIANG',
        loadComponent: () => import('./features/profile/profile.component').then((m) => m.ProfileComponent),
      },
      {
        path: 'kyc',
        title: 'Vérification d’identité — MIANG',
        loadComponent: () => import('./features/kyc/kyc.component').then((m) => m.KycComponent),
      },
      {
        path: 'info',
        title: 'Info — MIANG',
        loadComponent: () => import('./features/info/info.component').then((m) => m.InfoComponent),
      },
      { path: '', pathMatch: 'full', redirectTo: 'accueil' },
    ],
  },
  { path: '**', redirectTo: '' },
];
