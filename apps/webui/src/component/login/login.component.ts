import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from 'src/service/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  imports: [CommonModule, ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  errorMessage = signal('');

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
  ) {
    this.loginForm = this.fb.group({
      name: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  ngOnInit() {
    this.auth.verify().subscribe((authorized) => {
      if (authorized) {
        this.router.navigate(['']);
      }
    });
    this.loginForm.valueChanges.subscribe(() => {
      this.errorMessage.set('');
    });
  }

  onSubmit() {
    if (this.loginForm.invalid) return;

    const { name, password } = this.loginForm.value;

    this.auth.login(name, password).subscribe((authorized) => {
      if (authorized) {
        this.router.navigate(['']);
      } else {
        this.errorMessage.set('Invalid credentials!');
      }
    });
  }
}
