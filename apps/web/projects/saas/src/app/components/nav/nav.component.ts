
import { Component, computed, HostListener, signal } from '@angular/core';
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
  scrolled = signal(false);
  menuOpen = signal(false);
  readonly isDark = computed(() => this.themeService.theme() === 'dark');

  constructor(private themeService: ThemeService) {}

  @HostListener('window:scroll')
  onScroll(): void { this.scrolled.set(window.scrollY > 40); }

  toggleTheme(): void { this.themeService.toggle(); }
  toggleMenu(): void { this.menuOpen.update(v => !v); }
  closeMenu(): void { this.menuOpen.set(false); }

  scrollTo(id: string): void {
    this.closeMenu();
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
