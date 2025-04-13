export interface User {
  name: string;
  hash: string;
}

export interface Token {
  token?: string;
}

export interface Verification {
  authorized: boolean;
}
