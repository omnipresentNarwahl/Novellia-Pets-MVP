import { DestroyRef, ElementRef, Signal, afterNextRender, inject, signal } from '@angular/core';

/** The width of the component being constructed, kept up to date as it resizes. Call from a field initializer. */
export function hostWidth(initial = 640): Signal<number> {
  const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
  const destroyRef = inject(DestroyRef);
  const width = signal(initial);
  afterNextRender(() => {
    width.set(host.clientWidth || initial);
    if (typeof ResizeObserver === 'undefined') {
      return;
    }
    const observer = new ResizeObserver(([entry]) => width.set(entry.contentRect.width));
    observer.observe(host);
    destroyRef.onDestroy(() => observer.disconnect());
  });
  return width.asReadonly();
}
