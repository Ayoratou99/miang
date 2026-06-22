import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_BASE, USE_MOCK } from './api';

/**
 * Web Push only fires in the background / when the app is closed; foreground
 * realtime goes through Socket.IO. On iOS, push requires the PWA to be installed
 * to the home screen (16.4+) and a user gesture to prompt.
 */
@Injectable({ providedIn: 'root' })
export class PushService {
  constructor(private readonly http: HttpClient) {}

  get supported(): boolean {
    return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  }

  get permission(): NotificationPermission {
    return this.supported ? Notification.permission : 'denied';
  }

  /** Ask permission then subscribe (call from a user gesture). */
  async enable(): Promise<boolean> {
    if (!this.supported) {
      return false;
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return false;
    }
    // Without a backend (mock mode) we stop at the granted permission — there is
    // no VAPID key to subscribe against yet.
    return USE_MOCK ? true : this.subscribe();
  }

  async syncIfGranted(): Promise<void> {
    if (!USE_MOCK && this.supported && Notification.permission === 'granted') {
      await this.subscribe();
    }
  }

  private async subscribe(): Promise<boolean> {
    try {
      const cfg = await firstValueFrom(
        this.http.get<{ vapidPublicKey: string }>(`${API_BASE}/config`),
      );
      if (!cfg.vapidPublicKey) {
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(cfg.vapidPublicKey),
      });
      await firstValueFrom(this.http.post(`${API_BASE}/notifications/push/subscribe`, sub.toJSON()));
      return true;
    } catch {
      return false;
    }
  }

  private urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(b64);
    const arr = new Uint8Array(new ArrayBuffer(raw.length));
    for (let i = 0; i < raw.length; i++) {
      arr[i] = raw.charCodeAt(i);
    }
    return arr;
  }
}
