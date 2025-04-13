import {
  ChangeDetectionStrategy,
  Component,
  Input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { labelOf, Tabs, type Library, type LibraryTitle } from '@pan/types';

@Component({
  selector: 'app-anime-card',
  templateUrl: './anime-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AnimeCardComponent {
  @Input() root: Library | null = null;
  anime: LibraryTitle | null = null;
  label = signal('');
  xLink = signal('');

  constructor(private router: Router) {}

  @Input() set title(value: LibraryTitle | null) {
    this.anime = value;
    if (value !== null) {
      this.label.set(labelOf(value.title));
      this.xLink.set(this.getXLink(value.info.officialWebsite) || '');
    }
  }

  private getXLink(officialWebsite?: string) {
    return officialWebsite
      ?.split(' ')
      .find((site) => site.includes('twitter.com') || site.includes('x.com'));
  }

  navigate() {
    if (this.root && this.anime) {
      const path = this.anime.path.slice(this.root.path.length);
      this.router.navigate(['libraries', this.root.index, Tabs.FILE.route], {
        queryParams: { path },
      });
    }
  }
}
