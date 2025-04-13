import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  signal,
} from '@angular/core';
import { RouterModule } from '@angular/router';
import { Theme } from '@pan/types';
import { Subscription } from 'rxjs';
import { ConfigService } from 'src/service/config.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppComponent implements OnDestroy {
  theme = signal<Theme>('auto');
  subscription: Subscription;

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  constructor(config: ConfigService) {
    this.subscription = config
      .onThemeChange()
      .subscribe((theme) => this.theme.set(theme));
    config.applyUIConfig();
  }
}
