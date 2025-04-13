import {
  animate,
  state,
  style,
  transition,
  trigger,
} from '@angular/animations';

export const fadeAnimation = trigger('fadeAnimation', [
  state('visible', style({ opacity: 1 })),
  state('hidden', style({ opacity: 0 })),
  transition(
    'visible => hidden',
    animate('100ms ease-out', style({ opacity: 0 })),
  ),
  transition(
    'hidden => visible',
    animate('100ms ease-in', style({ opacity: 1 })),
  ),
]);

export const enterLeaveAnimation = trigger('enterLeaveAnimation', [
  transition(':enter', [
    style({ opacity: 0 }),
    animate('100ms ease-in', style({ opacity: 1 })),
  ]),
  transition(':leave', [animate('100ms ease-out', style({ opacity: 0 }))]),
]);
