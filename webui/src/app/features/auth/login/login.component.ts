import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="login-view">
      <div class="login-box">
        <form
          action="/api/login"
          method="post"
          autocomplete="on"
          (ngSubmit)="submit()"
        >
          <h2>Login</h2>
          <input
            type="text"
            id="login"
            name="login"
            autocomplete="username"
            [(ngModel)]="username"
            placeholder="Login"
            required
          />
          <input
            type="password"
            id="password"
            name="password"
            autocomplete="current-password"
            [(ngModel)]="password"
            placeholder="Password"
            required
          />
          <button type="submit">Login</button>
        </form>
      </div>
    </div>
  `,
})
export class LoginComponent {
  username = '';
  password = '';

  private readonly authService = inject(AuthService);

  async submit(): Promise<void> {
    await this.authService.login(this.username, this.password);
    if (this.authService.isLoggedIn()) {
      window.location.assign('/files');
    }
  }
}
