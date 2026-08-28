import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then((module) => module.LoginComponent),
  },
  {
    path: 'files',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/file-explorer/file-explorer.component').then(
        (module) => module.FileExplorerComponent
      ),
  },
  {
    path: 'recordings',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/game-recording/game-recording.component').then(
        (module) => module.GameRecordingComponent
      ),
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'files',
  },
  {
    path: '**',
    redirectTo: 'files',
  },
];
