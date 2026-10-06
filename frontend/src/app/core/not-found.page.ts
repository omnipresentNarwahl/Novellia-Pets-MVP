import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { EmptyState } from '../shared/empty-state';

@Component({
  selector: 'app-not-found-page',
  imports: [RouterLink, MatButtonModule, EmptyState],
  template: `
    <app-empty-state
      icon="search_off"
      title="Page not found"
      message="We couldn't find what you were looking for. It may have been deleted."
    >
      <a mat-flat-button routerLink="/pets">Back to pets</a>
    </app-empty-state>
  `,
})
export class NotFoundPage {}
