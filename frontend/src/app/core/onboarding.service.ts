import { Injectable, signal } from '@angular/core';

const KEY = 'miang_onboarding_done';

/** First-connection guided tour by Miango — shown once, always replayable. */
@Injectable({ providedIn: 'root' })
export class OnboardingService {
  private readonly _done = signal(localStorage.getItem(KEY) === '1');
  readonly done = this._done.asReadonly();
  /** Drives whether the tour overlay is currently visible. */
  readonly visible = signal(false);

  demarrerSiNecessaire(): void {
    if (!this._done()) {
      this.visible.set(true);
    }
  }

  rejouer(): void {
    this.visible.set(true);
  }

  terminer(): void {
    localStorage.setItem(KEY, '1');
    this._done.set(true);
    this.visible.set(false);
  }
}
