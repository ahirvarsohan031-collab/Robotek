export interface LocationEntry {
  name: string;
  coords: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  phone?: string;
  role_name?: string;
  late_long?: string; // Stringified JSON array of LocationEntry
  image_url?: string;
  dob?: string;
  last_active?: string;
  permissions?: string[];
  locations?: LocationEntry[]; // Added for UI convenience
}
