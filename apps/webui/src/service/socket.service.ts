import { Injectable, OnDestroy } from '@angular/core';
import type { SocketMessage } from '@pan/types';
import { filter, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SocketService implements OnDestroy {
  private socket: WebSocket | null = null;
  private subject = new Subject<SocketMessage>();
  private event = this.subject.asObservable();

  ngOnDestroy(): void {
    this.socket?.close();
    this.subject.complete();
  }

  on(topic: string) {
    return this.event.pipe(filter((msg) => msg.topic === topic));
  }

  constructor() {
    const { protocol, hostname, port } = window.location;
    const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${wsProtocol}//${hostname}${port ? `:${port}` : ''}/ws`;
    this.socket = new WebSocket(url);
    this.socket.addEventListener('message', (event) => {
      try {
        this.subject.next(JSON.parse(event.data));
      } catch (err) {
        console.error(err);
      }
    });
    this.socket.addEventListener('error', (event) => {
      this.subject.error(event);
    });
    this.socket.addEventListener('close', () => {
      this.subject.complete();
    });
  }
}
