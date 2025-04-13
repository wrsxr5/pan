import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

export interface LibraryModalResult {
  label: string;
  path: string;
}

@Component({
  selector: 'app-library-modal',
  templateUrl: './library-modal.component.html',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LibraryModalComponent {
  @Output() result = new EventEmitter<LibraryModalResult | null>();
  form: FormGroup;

  constructor(fb: FormBuilder) {
    this.form = fb.group({
      label: ['', [Validators.required, Validators.minLength(2)]],
      path: ['', [Validators.required, Validators.minLength(2)]],
    });
  }

  cancel() {
    this.result.emit(null);
    this.form.reset();
  }

  submit() {
    if (this.form.invalid) return;
    const { label, path } = this.form.value;
    this.result.emit({ label, path });
    this.form.reset();
  }
}
