import { Routes } from '@angular/router';
import { explorerRoutes } from './explorer/explorer.routes';

async function loadExplorer() {
  return (await import('src/component/main/explorer/explorer.component'))
    .ExplorerComponent;
}

async function loadSettings() {
  return (await import('src/component/main/settings/settings.component'))
    .SettingsComponent;
}

export const mainRoutes: Routes = [
  {
    path: 'libraries/:index',
    loadComponent: loadExplorer,
    children: explorerRoutes,
  },
  {
    path: 'settings',
    loadComponent: loadSettings,
  },
  { path: '', redirectTo: 'libraries/0', pathMatch: 'full' },
];
