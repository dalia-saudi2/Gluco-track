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

export function validateRegistrationAccount(fields: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
}): AuthValidationResult {
  const name = fields.name.trim();
  const email = normalizeEmail(fields.email);
  const phone = fields.phone.trim();

  if (!name || !email || !fields.password || !phone) {
    return { ok: false, message: 'Please fill in all required fields.' };
  }

  if (phone.length > 30) {
    return { ok: false, message: 'Phone number must be at most 30 characters.' };
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

export function validateRegistrationDemographics(fields: {
  age: string;
  gender: string | null;
  heightCm: string;
  weightKg: string;
}): AuthValidationResult {
  if (!fields.age.trim() || !fields.gender || !fields.heightCm.trim() || !fields.weightKg.trim()) {
    return { ok: false, message: 'Please fill in all required fields.' };
  }

  const age = Number(fields.age);
  if (Number.isNaN(age) || age < 18 || age > 100) {
    return { ok: false, message: 'Age must be between 18 and 100.' };
  }

  const height = Number(fields.heightCm);
  if (Number.isNaN(height) || height < 100 || height > 250) {
    return { ok: false, message: 'Height must be between 100 and 250 cm.' };
  }

  const weight = Number(fields.weightKg);
  if (Number.isNaN(weight) || weight < 30 || weight > 250) {
    return { ok: false, message: 'Weight must be between 30 and 250 kg.' };
  }

  return { ok: true, email: '' };
}

export function validateRegistration(fields: {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  age: string;
  gender: string | null;
  heightCm: string;
  weightKg: string;
  phone: string;
}): AuthValidationResult {
  const account = validateRegistrationAccount({
    name: fields.name,
    email: fields.email,
    password: fields.password,
    confirmPassword: fields.confirmPassword,
    phone: fields.phone,
  });
  if (!account.ok) return account;

  const demographics = validateRegistrationDemographics({
    age: fields.age,
    gender: fields.gender,
    heightCm: fields.heightCm,
    weightKg: fields.weightKg,
  });
  if (!demographics.ok) return demographics;

  return { ok: true, email: account.email };
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
