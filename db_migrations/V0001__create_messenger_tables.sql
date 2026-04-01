CREATE TABLE IF NOT EXISTS t_p87867187_messenger_beautiful_.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_color VARCHAR(7) DEFAULT '#6366f1',
    avatar_initials VARCHAR(3),
    bio TEXT DEFAULT '',
    is_online BOOLEAN DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p87867187_messenger_beautiful_.chats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100),
    is_group BOOLEAN DEFAULT false,
    avatar_color VARCHAR(7) DEFAULT '#6366f1',
    created_by UUID REFERENCES t_p87867187_messenger_beautiful_.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p87867187_messenger_beautiful_.chat_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES t_p87867187_messenger_beautiful_.chats(id),
    user_id UUID REFERENCES t_p87867187_messenger_beautiful_.users(id),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(chat_id, user_id)
);

CREATE TABLE IF NOT EXISTS t_p87867187_messenger_beautiful_.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id UUID REFERENCES t_p87867187_messenger_beautiful_.chats(id),
    sender_id UUID REFERENCES t_p87867187_messenger_beautiful_.users(id),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p87867187_messenger_beautiful_.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES t_p87867187_messenger_beautiful_.users(id),
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON t_p87867187_messenger_beautiful_.messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON t_p87867187_messenger_beautiful_.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_members_user_id ON t_p87867187_messenger_beautiful_.chat_members(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON t_p87867187_messenger_beautiful_.sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON t_p87867187_messenger_beautiful_.sessions(user_id);
