import { DOCUMENT } from '@angular/common';
import {
  Inject,
  Injectable,
} from '@angular/core';
import {
  BehaviorSubject,
  Observable,
} from 'rxjs';

import {
  APP_CONFIG,
  AppConfig,
} from '../../config/app-config.interface';
import { CookieService } from '../core/services/cookie.service';

/**
 * Name of the cookie used to persist the user's dark mode preference.
 */
export const DARK_MODE_COOKIE = 'dsDarkMode';

/**
 * Attribute set on the document's root element to select Bootstrap 5.3's color mode.
 */
export const DARK_MODE_ATTRIBUTE = 'data-bs-theme';

/**
 * Media query used to detect the operating system's preferred color scheme.
 */
export const DARK_MODE_MEDIA_QUERY = '(prefers-color-scheme: dark)';

/**
 * Number of days the dark mode cookie remains valid.
 */
export const DARK_MODE_COOKIE_EXPIRATION_DAYS = 365;

/**
 * Explicit value written to {@link DARK_MODE_ATTRIBUTE}, or `null` to leave it unset so that the
 * `prefers-color-scheme` media query in the stylesheet decides the appearance.
 */
type ColorMode = 'dark' | 'light' | null;

/**
 * Service handling the retrieval and configuration of the dark mode preference.
 *
 * Resolution order:
 * 1. An explicit choice made on the settings page (persisted in a cookie) always wins. It is
 *    stored in a cookie so it can be applied during server-side rendering, avoiding a flash of the
 *    light theme before the browser takes over.
 * 2. Otherwise the operating system's `prefers-color-scheme` is followed. Because SSR cannot read
 *    the OS preference, the attribute is left unset in that case and the stylesheet's
 *    `@media (prefers-color-scheme: dark)` block handles the first paint; the browser then sets the
 *    attribute explicitly so Bootstrap's own components pick up the dark mode too, and keeps it in
 *    sync when the OS preference changes.
 */
@Injectable({
  providedIn: 'root',
})
export class DarkModeService {

  private readonly enabled$ = new BehaviorSubject<boolean>(false);

  /**
   * The `prefers-color-scheme` media query list, while we are following the OS preference.
   */
  private mediaQuery: MediaQueryList | null = null;

  constructor(
    protected cookieService: CookieService,
    @Inject(DOCUMENT) protected document: Document,
    @Inject(APP_CONFIG) protected appConfig: AppConfig,
  ) {
  }

  /**
   * Whether dark mode is enabled in the application configuration.
   */
  get isAvailable(): boolean {
    return this.appConfig.info.enableDarkMode !== false;
  }

  /**
   * Read the stored preference (or fall back to the OS preference) and apply it to the document.
   * Should be called once when the application starts.
   * When dark mode is disabled in the configuration, the theme is forced to light (so a stale
   * cookie or a dark OS preference can't keep it enabled).
   */
  initialize(): void {
    if (!this.isAvailable) {
      this.applyPreference(false, 'light');
      return;
    }

    const stored = this.cookieService.get(DARK_MODE_COOKIE);
    if (stored === true) {
      this.applyPreference(true, 'dark');
    } else if (stored === false) {
      this.applyPreference(false, 'light');
    } else {
      // No explicit choice: follow the OS and keep in sync with subsequent changes.
      this.listenToSystemPreference();
      const dark = this.prefersDark();
      this.applyPreference(dark, dark ? 'dark' : null);
    }
  }

  /**
   * Emits the current dark mode state and any subsequent changes.
   */
  isEnabled(): Observable<boolean> {
    return this.enabled$.asObservable();
  }

  /**
   * Returns the current dark mode state synchronously.
   */
  get enabled(): boolean {
    return this.enabled$.value;
  }

  /**
   * Enable or disable dark mode. The explicit preference is persisted in a cookie and applied
   * immediately, overriding the operating system's preference.
   */
  setEnabled(enabled: boolean): void {
    this.cookieService.set(DARK_MODE_COOKIE, enabled, { expires: DARK_MODE_COOKIE_EXPIRATION_DAYS });
    this.applyPreference(enabled, enabled ? 'dark' : 'light');
  }

  /**
   * Toggle dark mode between on and off.
   */
  toggle(): void {
    this.setEnabled(!this.enabled);
  }

  /**
   * Whether the operating system currently requests a dark color scheme.
   * Returns `false` when the media query is unavailable (e.g. during server-side rendering).
   */
  private prefersDark(): boolean {
    return this.getMediaQuery()?.matches === true;
  }

  /**
   * Resolve the `prefers-color-scheme` media query list, or `null` when it cannot be evaluated
   * (e.g. during server-side rendering, where `matchMedia` is not available).
   */
  private getMediaQuery(): MediaQueryList | null {
    const win = this.document?.defaultView;
    if (win == null || typeof win.matchMedia !== 'function') {
      return null;
    }
    return win.matchMedia(DARK_MODE_MEDIA_QUERY);
  }

  /**
   * While no explicit preference is stored, keep the theme in sync with OS changes.
   */
  private listenToSystemPreference(): void {
    if (this.mediaQuery != null) {
      return;
    }
    const mediaQuery = this.getMediaQuery();
    if (mediaQuery == null || typeof mediaQuery.addEventListener !== 'function') {
      return;
    }
    this.mediaQuery = mediaQuery;
    this.mediaQuery.addEventListener('change', (event: MediaQueryListEvent) => {
      // Only auto-follow while the user hasn't made an explicit choice.
      const stored = this.cookieService.get(DARK_MODE_COOKIE);
      if (stored !== true && stored !== false) {
        this.applyPreference(event.matches, event.matches ? 'dark' : null);
      }
    });
  }

  /**
   * Update the in-memory state and reflect the preference on the document's root element.
   *
   * @param enabled   the effective dark mode state (drives the settings toggle)
   * @param attribute the explicit `data-bs-theme` value, or `null` to leave the attribute unset so
   *                  the stylesheet's `prefers-color-scheme` block decides the appearance
   */
  private applyPreference(enabled: boolean, attribute: ColorMode): void {
    this.enabled$.next(enabled);

    const root = this.document?.documentElement;
    if (root == null) {
      return;
    }

    if (attribute == null) {
      root.removeAttribute(DARK_MODE_ATTRIBUTE);
    } else {
      root.setAttribute(DARK_MODE_ATTRIBUTE, attribute);
    }
  }
}
