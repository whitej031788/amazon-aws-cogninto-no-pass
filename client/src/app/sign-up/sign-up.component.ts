// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: MIT-0

import { Component, ChangeDetectionStrategy, NgZone } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { BehaviorSubject } from 'rxjs';

declare var Paddle: any;

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignUpComponent {

  email = new FormControl('');
  fullName = new FormControl('');

  private busy_ = new BehaviorSubject(false);
  public busy = this.busy_.asObservable();

  private errorMessage_ = new BehaviorSubject('');
  public errorMessage = this.errorMessage_.asObservable();

  constructor(private router: Router, private auth: AuthService, private zone: NgZone) { }

  public async signup() {
    this.errorMessage_.next('');
    this.busy_.next(true);
    try {
      await this.auth.signUp(this.email.value, this.fullName.value);
      await this.auth.signIn(this.email.value);
      this.router.navigate(['/enter-secret-code']);
    } catch (err) {
      console.log(err);
      this.errorMessage_.next(err.message || err);
    } finally {
      this.busy_.next(false);
    }
  }

  public signupPaddle() {
    let self = this;

    Paddle.Checkout.open({
      email: self.email.value,
      override: 'https://checkout.staging.paddle-internal.com/checkout/custom/eyJ0IjoiTW92YXZpIiwiaSI6Imh0dHBzOlwvXC9wYWRkbGUtc3RhZ2luZy5zMy5hbWF6b25hd3MuY29tXC91c2VyXC8zMzExM1wvdWZyaFJ5aExTWG1CcWNMZGRDQ1JfZG93bmxvYWQlMjAlMjgxJTI5LnBuZyIsInIiOm51bGwsImNtIjoiIiwicmUiOjEsInAiOjUyODE0MiwiYWwiOjAsImNjIjp7IlVTRCI6Ijk5IiwiR0JQIjoiOTkifSwicnAiOnsiVVNEIjoiMCIsIkdCUCI6IjAifSwieSI6IiIsInEiOjAsImQiOjEsImEiOltdLCJ2IjoiMzMxMTMiLCJkdyI6ZmFsc2UsInMiOiJiOGYzNzdhNmQzZmIzZmM2NmQ3OGQ1MGI1MWNhMzAxNjE3ZTdlYzNhMWRkZjEyMDRkYzY0NDUyMzdkZWMyYWZlYTUyYzRmZTMzMjM2MGVmZmY4MDdjODUzNjBiOGQ5Njk3ODU1YTRkNTg5YjhkOWU2OTIxNTBhNDZkMjhiMGYxMSJ9',
      successCallback: function(data) {
        self.zone.run(() => self.signup());
      }
    });
  }
}
