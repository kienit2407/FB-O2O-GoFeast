export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refresh_token?: string;
}
