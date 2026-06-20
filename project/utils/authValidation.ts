const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(normalizeEmail(email));
}

export type AuthValidationResult =
  | { ok: true; email: string }
  | { ok: false; message: string };

export function validateRegistration(fields: {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}): AuthValidationResult {
  const name = fields.name.trim();
  const email = normalizeEmail(fields.email);
  const phone = fields.phone.trim();

  if (!name || !phone || !email || !fields.password) {
    return { ok: false, message: 'Please fill in all required fields.' };
  }

  if (!isValidEmail(email)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  if (fields.password.length < 6) {
    return { ok: false, message: 'Password must be at least 6 characters.' };
  }

  if (fields.password.length > 72) {
    return { ok: false, message: 'Password must be at most 72 characters.' };
  }

  if (fields.password !== fields.confirmPassword) {
    return { ok: false, message: 'Passwords do not match.' };
  }

  return { ok: true, email };
}

export function validateLogin(email: string, password: string): AuthValidationResult {
  const normalized = normalizeEmail(email);

  if (!normalized || !password) {
    return { ok: false, message: 'Please enter both email and password.' };
  }

  if (!isValidEmail(normalized)) {
    return { ok: false, message: 'Please enter a valid email address.' };
  }

  return { ok: true, email: normalized };
}
