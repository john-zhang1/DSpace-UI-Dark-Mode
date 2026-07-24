import { AsyncPipe } from '@angular/common';
import {
  Component,
  OnInit,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { UiSwitchModule } from 'ngx-ui-switch';
import { Observable } from 'rxjs';

import { DarkModeService } from '../../dark-mode/dark-mode.service';

/**
 * Component providing the form where users can toggle dark mode on or off.
 */
@Component({
  selector: 'ds-dark-mode-settings',
  templateUrl: './dark-mode-settings.component.html',
  imports: [
    AsyncPipe,
    FormsModule,
    TranslateModule,
    UiSwitchModule,
  ],
})
export class DarkModeSettingsComponent implements OnInit {

  /**
   * Whether dark mode is currently enabled.
   */
  enabled$: Observable<boolean>;

  constructor(
    protected darkModeService: DarkModeService,
  ) {
  }

  ngOnInit(): void {
    this.enabled$ = this.darkModeService.isEnabled();
  }

  /**
   * Persist and apply the new dark mode preference.
   */
  setEnabled(enabled: boolean): void {
    this.darkModeService.setEnabled(enabled);
  }
}
