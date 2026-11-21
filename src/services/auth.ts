export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phoneCountryCode?: string;
  phoneNumber?: string;
  createdAt: number;
}

interface StoredAccount extends UserProfile {
  passwordHash: string;
}

const KEYS = {
  TERMS_ACCEPTED: 'nova_terms_accepted_v1',
  ACCOUNTS: 'nova_accounts_v1',
  SESSION_USER_ID: 'nova_session_user_id_v1',
};

async function hashPassword(password: string): Promise<string> {
  try {
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const data = new TextEncoder().encode(`nova_salt_${password}`);
      const digest = await crypto.subtle.digest('SHA-256', data);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }
  } catch {
    // Fallback below
  }
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    hash = (hash << 5) - hash + password.charCodeAt(i);
    hash |= 0;
  }
  return `h_${Math.abs(hash).toString(36)}_${password.length}`;
}

function getAccounts(): StoredAccount[] {
  try {
    const raw = localStorage.getItem(KEYS.ACCOUNTS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAccounts(accounts: StoredAccount[]): void {
  try {
    localStorage.setItem(KEYS.ACCOUNTS, JSON.stringify(accounts));
  } catch (e) {
    console.error('Failed to save accounts:', e);
  }
}

function stripSensitive(account: StoredAccount): UserProfile {
  const { passwordHash: _ignored, ...profile } = account;
  return profile;
}

export const AuthService = {
  hasAcceptedTerms(): boolean {
    try {
      return localStorage.getItem(KEYS.TERMS_ACCEPTED) === 'true';
    } catch {
      return false;
    }
  },

  setAcceptedTerms(accepted: boolean): void {
    try {
      if (accepted) {
        localStorage.setItem(KEYS.TERMS_ACCEPTED, 'true');
      } else {
        localStorage.removeItem(KEYS.TERMS_ACCEPTED);
      }
    } catch (e) {
      console.error('Failed to persist terms acceptance:', e);
    }
  },

  getCurrentUser(): UserProfile | null {
    try {
      const userId = localStorage.getItem(KEYS.SESSION_USER_ID);
      if (!userId) return null;
      const accounts = getAccounts();
      const match = accounts.find((a) => a.id === userId);
      return match ? stripSensitive(match) : null;
    } catch {
      return null;
    }
  },

  async signUp(params: {
    name: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const name = params.name.trim();
    const email = params.email.trim().toLowerCase();
    const password = params.password;

    if (name.length < 2) {
      return { success: false, error: 'Please enter your full name (at least 2 characters).' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    const accounts = getAccounts();
    if (accounts.some((a) => a.email.toLowerCase() === email)) {
      return {
        success: false,
        error: 'An account with this email already exists. Please switch to Log In.',
      };
    }

    const passwordHash = await hashPassword(password);
    const newAccount: StoredAccount = {
      id: `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      name,
      email,
      passwordHash,
      createdAt: Date.now(),
    };

    saveAccounts([...accounts, newAccount]);
    try {
      localStorage.setItem(KEYS.SESSION_USER_ID, newAccount.id);
    } catch {
      // ignore
    }

    return { success: true, user: stripSensitive(newAccount) };
  },

  async logIn(params: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const email = params.email.trim().toLowerCase();
    const password = params.password;

    if (!email || !password) {
      return { success: false, error: 'Please enter both your email and password.' };
    }

    const accounts = getAccounts();
    const match = accounts.find((a) => a.email.toLowerCase() === email);
    if (!match) {
      return {
        success: false,
        error: 'No account found for this email. Please Sign Up first.',
      };
    }

    const passwordHash = await hashPassword(password);
    if (match.passwordHash !== passwordHash) {
      return { success: false, error: 'Incorrect password. Please try again.' };
    }

    try {
      localStorage.setItem(KEYS.SESSION_USER_ID, match.id);
    } catch {
      // ignore
    }

    return { success: true, user: stripSensitive(match) };
  },

  updatePhoneNumber(countryCode: string, phoneNumber: string): UserProfile | null {
    const userId = localStorage.getItem(KEYS.SESSION_USER_ID);
    if (!userId) return null;

    const cleanedDigits = phoneNumber.replace(/[^\d\s-]/g, '').trim();
    const accounts = getAccounts();
    let updatedProfile: UserProfile | null = null;

    const updatedAccounts = accounts.map((acc) => {
      if (acc.id !== userId) return acc;
      const next: StoredAccount = {
        ...acc,
        phoneCountryCode: countryCode,
        phoneNumber: cleanedDigits,
      };
      updatedProfile = stripSensitive(next);
      return next;
    });

    saveAccounts(updatedAccounts);
    return updatedProfile;
  },

  logout(): void {
    try {
      localStorage.removeItem(KEYS.SESSION_USER_ID);
    } catch (e) {
      console.error('Failed to clear session:', e);
    }
  },
};
