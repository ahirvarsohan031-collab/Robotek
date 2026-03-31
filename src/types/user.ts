export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  phone?: string;
  role_name?: string;
  late_long?: string;
  image_url?: string;
  dob?: string;
  last_active?: string;
  permissions?: string[];
}
