import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-view">
      <div class="login-box">
        <h2>Login</h2>
        <input type="text" [(ngModel)]="username" placeholder="Login" />
        <input
          type="password"
          [(ngModel)]="password"
          placeholder="Password"
          (keydown.enter)="submit()"
        />
        <button type="button" (click)="submit()">Login</button>
      </div>
    </div>
  `,
})
export class LoginComponent {
  username = '';
  password = '';

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  async submit(): Promise<void> {
    await this.authService.login(this.username, this.password);
    if (this.authService.isLoggedIn()) {
      await this.router.navigate(['/files']);
    }
  }
}
