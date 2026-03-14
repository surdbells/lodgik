
import { Component, HostListener, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.scss'
})
export class NavComponent {
  scrolled  = signal(false);
  menuOpen  = signal(false);
  readonly isDark = computed(() => this.theme.theme() === 'dark');
  constructor(private theme: ThemeService) {}

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled.set(window.scrollY > 20); }

  toggleTheme(): void { this.theme.toggle(); }
  toggleMenu():  void { this.menuOpen.update(v => !v); }
  closeMenu():   void { this.menuOpen.set(false); }

  scrollTo(id: string): void {
    this.closeMenu();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
