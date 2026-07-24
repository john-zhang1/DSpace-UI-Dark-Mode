import { DOCUMENT } from '@angular/common';
import {
  TestBed,
  waitForAsync,
} from '@angular/core/testing';

import {
  APP_CONFIG,
  AppConfig,
} from '../../config/app-config.interface';
import { CookieService } from '../core/services/cookie.service';
import { CookieServiceMock } from '../shared/mocks/cookie.service.mock';
import {
  DARK_MODE_ATTRIBUTE,
  DARK_MODE_COOKIE,
  DarkModeService,
} from './dark-mode.service';

describe('DarkModeService', () => {
  let service: DarkModeService;
  let cookieService: CookieService;
  let document: Document;
  let appConfig: AppConfig;

  /**
   * Stub `window.matchMedia` so tests can control the OS `prefers-color-scheme`.
   */
  function mockPrefersColorScheme(matches: boolean): void {
    spyOn(document.defaultView, 'matchMedia').and.returnValue({
      matches,
      media: '(prefers-color-scheme: dark)',
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    } as unknown as MediaQueryList);
  }

  beforeEach(waitForAsync(() => {
    appConfig = { info: { enableDarkMode: true } } as AppConfig;

    TestBed.configureTestingModule({
      providers: [
        DarkModeService,
        { provide: CookieService, useValue: new CookieServiceMock() },
        { provide: APP_CONFIG, useValue: appConfig },
      ],
    });
    service = TestBed.inject(DarkModeService);
    cookieService = TestBed.inject(CookieService);
    document = TestBed.inject(DOCUMENT);
    document.documentElement.removeAttribute(DARK_MODE_ATTRIBUTE);
  }));

  describe('initialize', () => {
    it('should apply dark mode when the cookie is set to true', () => {
      cookieService.set(DARK_MODE_COOKIE, true);
      service.initialize();

      expect(service.enabled).toBeTrue();
      expect(document.documentElement.getAttribute(DARK_MODE_ATTRIBUTE)).toEqual('dark');
    });

    it('should force the light theme when the cookie is set to false, even if the OS prefers dark', () => {
      mockPrefersColorScheme(true);
      cookieService.set(DARK_MODE_COOKIE, false);
      service.initialize();

      expect(service.enabled).toBeFalse();
      expect(document.documentElement.getAttribute(DARK_MODE_ATTRIBUTE)).toEqual('light');
    });

    it('should follow the OS when no cookie is set and the OS prefers dark', () => {
      mockPrefersColorScheme(true);
      service.initialize();

      expect(service.enabled).toBeTrue();
      expect(document.documentElement.getAttribute(DARK_MODE_ATTRIBUTE)).toEqual('dark');
    });

    it('should leave the attribute unset when no cookie is set and the OS prefers light', () => {
      mockPrefersColorScheme(false);
      service.initialize();

      expect(service.enabled).toBeFalse();
      expect(document.documentElement.hasAttribute(DARK_MODE_ATTRIBUTE)).toBeFalse();
    });

    it('should force the light theme and ignore the cookie when disabled in the configuration', () => {
      appConfig.info.enableDarkMode = false;
      cookieService.set(DARK_MODE_COOKIE, true);
      service.initialize();

      expect(service.isAvailable).toBeFalse();
      expect(service.enabled).toBeFalse();
      expect(document.documentElement.getAttribute(DARK_MODE_ATTRIBUTE)).toEqual('light');
    });
  });

  describe('setEnabled', () => {
    it('should persist the preference and set the dark attribute when enabled', () => {
      service.setEnabled(true);

      expect(cookieService.get(DARK_MODE_COOKIE)).toBeTrue();
      expect(document.documentElement.getAttribute(DARK_MODE_ATTRIBUTE)).toEqual('dark');
    });

    it('should persist the preference and set the light attribute when disabled', () => {
      service.setEnabled(true);
      service.setEnabled(false);

      expect(cookieService.get(DARK_MODE_COOKIE)).toBeFalse();
      expect(document.documentElement.getAttribute(DARK_MODE_ATTRIBUTE)).toEqual('light');
    });
  });

  describe('toggle', () => {
    it('should flip the current state', () => {
      service.setEnabled(false);
      service.toggle();

      expect(service.enabled).toBeTrue();
    });
  });
});
