import { AfterViewInit, Directive, ElementRef, OnDestroy, inject, input, output } from '@angular/core';

/**
 * Emits `(reached)` when the host sentinel scrolls into view. Put an empty
 * sentinel div at the bottom of a list:
 *   <div miangInfiniteScroll [disabled]="!hasMore()" (reached)="loadMore()"></div>
 */
@Directive({ selector: '[miangInfiniteScroll]' })
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy {
  readonly disabled = input(false);
  readonly reached = output<void>();

  private readonly host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && !this.disabled()) {
          this.reached.emit();
        }
      },
      { rootMargin: '250px' },
    );
    this.observer.observe(this.host.nativeElement);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
