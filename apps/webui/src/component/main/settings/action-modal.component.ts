import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import type { ActionType } from '@pan/types';
import type { Action } from 'src/service/action.service';

@Component({
  selector: 'app-action-modal',
  templateUrl: './action-modal.component.html',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionModalComponent {
  @Output() result = new EventEmitter<Action | null>();
  actionType = signal<ActionType>('CLIENT');
  filename = '';
  file = '';
  isValidFile = signal(false);
  selectedTitle = signal(false);
  library = signal(false);
  libraryInfo = signal(false);
  libraryTitles = signal(false);
  form: FormGroup;

  constructor(fb: FormBuilder) {
    this.form = fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  resetFile() {
    this.filename = '';
    this.file = '';
    this.isValidFile.set(false);
  }

  onFileSelected(event: Event) {
    this.resetFile();
    if (!event.target) return;
    const target = event.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;
    const file = target.files[0];
    this.filename = file.name;
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target && e.target.result) {
        this.file = e.target.result as string;
        this.isValidFile.set(this.filename.length > 0 && this.file.length > 0);
      }
    };
    reader.readAsText(file);
  }

  cancel() {
    this.result.emit(null);
    this.resetFile();
  }

  submit() {
    if (this.actionType() === 'CLIENT') {
      this.result.emit({
        name: this.form.value.name,
        type: 'CLIENT',
        selectedTitle: this.selectedTitle(),
        library: this.library(),
        libraryInfo: this.libraryInfo(),
        libraryTitles: this.libraryTitles(),
      });
    } else if (this.actionType() === 'SERVER') {
      this.result.emit({
        name: this.form.value.name,
        type: 'SERVER',
        selectedTitle: this.selectedTitle(),
        library: this.library(),
        libraryInfo: this.libraryInfo(),
        libraryTitles: this.libraryTitles(),
        file: this.file,
        filename: this.filename,
      });
    }
    this.resetFile();
  }
}
