import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

const STAGE = 260; // px — square crop stage
const OUT = 320; // px — exported image size

/**
 * Pan (drag) + zoom (slider) image cropper. `forme='cercle'` for avatars,
 * `forme='carre'` for session covers. Emits a 320px JPEG data URL.
 */
@Component({
  selector: 'miang-cropper',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './cropper.component.html',
  styleUrl: './cropper.component.scss',
})
export class CropperComponent {
  readonly src = input.required<string>();
  readonly forme = input<'cercle' | 'carre'>('cercle');
  readonly cropped = output<string>();
  readonly annule = output<void>();

  private readonly imgRef = viewChild<ElementRef<HTMLImageElement>>('img');

  protected readonly ready = signal(false);
  protected readonly zoom = signal(1);
  protected readonly offX = signal(0);
  protected readonly offY = signal(0);
  protected readonly baseW = signal(0);
  protected readonly baseH = signal(0);

  private nw = 0;
  private nh = 0;
  private baseScale = 1;
  private drag: { x: number; y: number; ox: number; oy: number } | null = null;

  onImgLoad(): void {
    const el = this.imgRef()?.nativeElement;
    if (!el || !el.naturalWidth) return;
    this.nw = el.naturalWidth;
    this.nh = el.naturalHeight;
    this.baseScale = Math.max(STAGE / this.nw, STAGE / this.nh);
    this.baseW.set(this.nw * this.baseScale);
    this.baseH.set(this.nh * this.baseScale);
    this.zoom.set(1);
    this.offX.set(0);
    this.offY.set(0);
    this.ready.set(true);
  }

  transform(): string {
    return `translate(-50%, -50%) translate(${this.offX()}px, ${this.offY()}px) scale(${this.zoom()})`;
  }

  onDown(e: PointerEvent): void {
    if (!this.ready()) return;
    this.drag = { x: e.clientX, y: e.clientY, ox: this.offX(), oy: this.offY() };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  }

  onMove(e: PointerEvent): void {
    if (!this.drag) return;
    this.offX.set(this.clampX(this.drag.ox + (e.clientX - this.drag.x)));
    this.offY.set(this.clampY(this.drag.oy + (e.clientY - this.drag.y)));
  }

  onUp(e: PointerEvent): void {
    this.drag = null;
    (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
  }

  onZoom(e: Event): void {
    this.zoom.set(+(e.target as HTMLInputElement).value);
    this.offX.set(this.clampX(this.offX()));
    this.offY.set(this.clampY(this.offY()));
  }

  cancel(): void {
    this.annule.emit();
  }

  confirm(): void {
    const el = this.imgRef()?.nativeElement;
    if (!el || !this.ready()) return;
    const effScale = this.baseScale * this.zoom();
    const dispW = this.nw * effScale;
    const dispH = this.nh * effScale;
    const imgLeft = STAGE / 2 + this.offX() - dispW / 2;
    const imgTop = STAGE / 2 + this.offY() - dispH / 2;
    const srcSize = STAGE / effScale;
    const sx = (0 - imgLeft) / effScale;
    const sy = (0 - imgTop) / effScale;

    const canvas = document.createElement('canvas');
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(el, sx, sy, srcSize, srcSize, 0, 0, OUT, OUT);
    this.cropped.emit(canvas.toDataURL('image/jpeg', 0.85));
  }

  private clampX(v: number): number {
    const max = Math.max(0, (this.nw * this.baseScale * this.zoom() - STAGE) / 2);
    return Math.min(max, Math.max(-max, v));
  }

  private clampY(v: number): number {
    const max = Math.max(0, (this.nh * this.baseScale * this.zoom() - STAGE) / 2);
    return Math.min(max, Math.max(-max, v));
  }
}
