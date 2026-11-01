import { isAxiosError } from 'axios';

export function authErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (!error.response) return 'We could not reach the server. Check your connection and try again.';
    if (error.response.status === 401) return 'Your email or password is incorrect. Please try again.';
    if (error.response.status >= 500) return 'The service is temporarily unavailable. Please try again.';
    const message = error.response.data?.message;
    if (typeof message === 'string') return message;
  }
  return 'Something went wrong. Please try again.';
}
