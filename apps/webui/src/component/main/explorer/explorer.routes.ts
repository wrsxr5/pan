import { Routes } from '@angular/router';

async function loadTitleTab() {
  return (await import('src/component/main/explorer/title/title-tab.component'))
    .TitleTabComponent;
}

async function loadFileTab() {
  return (await import('src/component/main/explorer/file/file-tab.component'))
    .FileTabComponent;
}

export const explorerRoutes: Routes = [
  {
    path: 'title-tab',
    loadComponent: loadTitleTab,
  },
  {
    path: 'file-tab',
    loadComponent: loadFileTab,
  },
  { path: '', redirectTo: 'title-tab', pathMatch: 'full' },
];
