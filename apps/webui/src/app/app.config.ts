import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  provideExperimentalZonelessChangeDetection,
} from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withViewTransitions } from '@angular/router';
import { authInterceptor } from 'src/interceptor/auth.interceptor';
import { appRoutes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAnimationsAsync(),
    provideExperimentalZonelessChangeDetection(),
    provideRouter(appRoutes, withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),
  ],
};
