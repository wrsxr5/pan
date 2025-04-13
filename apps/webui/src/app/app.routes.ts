import { Routes } from '@angular/router';
import { mainRoutes } from 'src/component/main/main.routes';

async function loadLogin() {
  return (await import('src/component/login/login.component')).LoginComponent;
}

async function loadMain() {
  return (await import('src/component/main/main.component')).MainComponent;
}

export const appRoutes: Routes = [
  {
    path: 'login',
    loadComponent: loadLogin,
  },
  {
    path: '',
    loadComponent: loadMain,
    children: mainRoutes,
  },
  { path: '**', redirectTo: '' },
];
