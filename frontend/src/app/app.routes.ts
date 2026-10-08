import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: 'dashboard',
    title: 'Dashboard · Novellia Pets',
    loadComponent: () => import('./features/dashboard/dashboard.page').then((m) => m.DashboardPage),
  },
  {
    path: 'pets',
    title: 'Pets · Novellia Pets',
    loadComponent: () => import('./features/pets/pet-list.page').then((m) => m.PetListPage),
  },
  {
    path: 'pets/:petId',
    title: 'Pet · Novellia Pets',
    loadComponent: () => import('./features/pets/pet-detail.page').then((m) => m.PetDetailPage),
  },
  {
    path: '**',
    title: 'Not found · Novellia Pets',
    loadComponent: () => import('./core/not-found.page').then((m) => m.NotFoundPage),
  },
];
