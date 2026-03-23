
import { Component, AfterViewInit, OnDestroy } from '@angular/core';
import { NavComponent }          from '../../components/nav/nav.component';
import { HeroComponent }         from '../../components/hero/hero.component';
import { LogosComponent }        from '../../components/logos/logos.component';
import { StatsComponent }        from '../../components/stats/stats.component';
import { FeaturesComponent }     from '../../components/features/features.component';
import { PlatformComponent }     from '../../components/platform/platform.component';
import { GuestPwaComponent }     from '../../components/guest-pwa/guest-pwa.component';
import { HowItWorksComponent }   from '../../components/how-it-works/how-it-works.component';
import { ModulesComponent }      from '../../components/modules/modules.component';
import { PricingComponent }      from '../../components/pricing/pricing.component';
import { TestimonialsComponent } from '../../components/testimonials/testimonials.component';
import { IntegrationsComponent } from '../../components/integrations/integrations.component';
import { FaqComponent }          from '../../components/faq/faq.component';
import { CtaSectionComponent }   from '../../components/cta-section/cta-section.component';
import { FooterComponent }       from '../../components/footer/footer.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    NavComponent, HeroComponent, LogosComponent, StatsComponent,
    FeaturesComponent, PlatformComponent, GuestPwaComponent,
    HowItWorksComponent, ModulesComponent, PricingComponent,
    TestimonialsComponent, IntegrationsComponent, FaqComponent,
    CtaSectionComponent, FooterComponent,
  ],
  template: `
    <app-nav />
    <main id="main-content">
      <app-hero />
      <app-logos />
      <app-stats />
      <app-features />
      <app-platform />
      <app-guest-pwa />
      <app-how-it-works />
      <app-modules />
      <app-pricing />
      <app-testimonials />
      <app-integrations />
      <app-faq />
      <app-cta-section />
    </main>
    <app-footer />
  `,
  styles: [`
    main { display: block; }
  `]
})
export class HomePage implements AfterViewInit, OnDestroy {
  private observer!: IntersectionObserver;

  ngAfterViewInit(): void {
    this.observer = new IntersectionObserver(
      (entries) => entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          this.observer.unobserve(e.target);
        }
      }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' }
    );
    document.querySelectorAll('.reveal').forEach(el => this.observer.observe(el));
  }

  ngOnDestroy(): void { this.observer?.disconnect(); }
}
