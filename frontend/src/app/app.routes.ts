import { Routes } from '@angular/router';
import { unsavedChangesGuard } from './features/pets/unsaved-changes.guard';

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
    path: 'pets/new',
    title: 'Add pet · Novellia Pets',
    loadComponent: () => import('./features/pets/pet-form.page').then((m) => m.PetFormPage),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: 'pets/:petId',
    title: 'Pet · Novellia Pets',
    loadComponent: () => import('./features/pets/pet-detail.page').then((m) => m.PetDetailPage),
  },
  {
    path: 'pets/:petId/edit',
    title: 'Edit pet · Novellia Pets',
    loadComponent: () => import('./features/pets/pet-form.page').then((m) => m.PetFormPage),
    canDeactivate: [unsavedChangesGuard],
  },
  {
    path: '**',
    title: 'Not found · Novellia Pets',
    loadComponent: () => import('./core/not-found.page').then((m) => m.NotFoundPage),
  },
];
