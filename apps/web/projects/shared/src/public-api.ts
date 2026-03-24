// Icons
export { LucideModule, LODGIK_ICONS } from './lib/icons';

// Models
export * from './lib/models';

// Services
export * from './lib/services';

// Components
export * from './lib/components';

// Directives
export { FeatureGateDirective } from './lib/directives/feature-gate.directive';
export { HasPermDirective }     from './lib/directives/has-perm.directive';
export { PermDisableDirective } from './lib/directives/perm-disable.directive';
export { AmountInputDirective } from './lib/directives/amount-input.directive';

// Pipes
export { TimeAgoPipe, FileSizePipe, TruncatePipe, StatusVariantPipe } from './lib/pipes';

// Interceptors
export { authInterceptor } from './lib/interceptors/auth.interceptor';
export { errorInterceptor } from './lib/interceptors/error.interceptor';

// Guards
export { authGuard, adminGuard, roleGuard, featureGuard } from './lib/guards';

export { TourService, TourStep } from './lib/services/tour.service';
export { EmployeePickerComponent } from './lib/components/employee-picker.component';
export type { EmployeeOption } from './lib/components/employee-picker.component';
