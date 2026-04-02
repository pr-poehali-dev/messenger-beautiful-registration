export interface User {
  id: string;
  username: string;
  display_name: string;
  email: string;
  avatar_color: string;
  avatar_initials: string;
  bio: string;
  is_online: boolean;
  last_seen: string;
  created_at: string;
  password_hash?: string;
}

export interface Chat {
  id: string;
  name: string | null;
  is_group: boolean;
  avatar_color: string;
  created_by?: string;
  created_at: string;
  members?: string[];
  display_name?: string;
  display_avatar_color?: string;
  display_avatar_initials?: string;
  is_online?: boolean;
  other_user_id?: string;
  other_last_seen?: string;
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  chat_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender_name?: string;
  sender_avatar_color?: string;
  sender_avatar_initials?: string;
  is_own?: boolean;
}