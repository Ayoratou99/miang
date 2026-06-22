import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PwaInstallService } from '../../core/pwa-install.service';
import { LogoComponent } from '../../shared/logo.component';

@Component({
  selector: 'miang-landing',
  imports: [RouterLink, LogoComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
})
export class LandingComponent {
  protected readonly pwa = inject(PwaInstallService);

  installer(): void {
    void this.pwa.prompt();
  }
}
