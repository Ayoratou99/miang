import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ChatService } from '../core/data/chat.service';
import { OnboardingService } from '../core/onboarding.service';
import { PushService } from '../core/push.service';
import { PwaInstallService } from '../core/pwa-install.service';
import { OnboardingTourComponent } from '../features/onboarding/onboarding-tour.component';

interface NavItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'miang-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, OnboardingTourComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  protected readonly pwa = inject(PwaInstallService);
  protected readonly onboarding = inject(OnboardingService);
  private readonly push = inject(PushService);
  private readonly chat = inject(ChatService);

  protected readonly unread = this.chat.totalNonLus;
  protected readonly installDismissed = signal(false);

  protected readonly nav: NavItem[] = [
    { path: '/accueil', icon: 'ti-home', label: 'Accueil' },
    { path: '/messages', icon: 'ti-message-circle', label: 'Messages' },
    { path: '/portefeuille', icon: 'ti-wallet', label: 'Portefeuille' },
    { path: '/info', icon: 'ti-info-circle', label: 'Info' },
  ];

  ngOnInit(): void {
    this.onboarding.demarrerSiNecessaire();
    void this.push.syncIfGranted();
  }

  installer(): void {
    void this.pwa.prompt();
  }
}
