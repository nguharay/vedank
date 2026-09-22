-- Same schema as setup-db.sql, wrapped in one PL/pgSQL block.
-- Use this in consoles that reject multi-statement input (Vercel's Query
-- tab, and anything else sending the whole buffer as one prepared statement).
-- Still idempotent: every statement inside is IF NOT EXISTS.
do $do$
begin
  create extension if not exists pgcrypto;
  create table if not exists users (
    id uuid default gen_random_uuid() not null,
    email text not null,
    password_hash text not null,
    name text not null,
    created_at timestamptz default now() not null,
    failed_attempts integer default 0 not null,
    locked_until timestamptz,
    last_active_date date,
    daily_streak integer default 0 not null,
    best_daily_streak integer default 0 not null,
    bonus_gems integer default 0 not null,
    preferred_lang text default 'en'::text not null,
    username text,
    country text,
    phone_code text,
    phone text,
    friend_code text,
    primary key (id)
  );
  create unique index if not exists users_email_unique on users (email);
  create unique index if not exists users_username_unique ON public.users USING btree (username);
  create unique index if not exists users_friend_code_unique ON public.users USING btree (friend_code);
  create table if not exists arena_progress (
    user_id uuid not null,
    puzzle_id text not null,
    solved boolean default false not null,
    best_moves integer,
    updated_at timestamptz default now() not null,
    primary key (user_id, puzzle_id),
    foreign key (user_id) references users(id) on delete cascade
  );
  create unique index if not exists arena_progress_user_id_puzzle_id_pk ON public.arena_progress USING btree (user_id, puzzle_id);
  create table if not exists challenges (
    id uuid default gen_random_uuid() not null,
    from_user_id uuid not null,
    to_user_id uuid not null,
    kind text default 'blitz'::text not null,
    from_score integer not null,
    to_score integer,
    status text default 'open'::text not null,
    created_at timestamptz default now() not null,
    responded_at timestamptz,
    level integer default 2 not null,
    primary key (id),
    foreign key (from_user_id) references users(id) on delete cascade,
    foreign key (to_user_id) references users(id) on delete cascade
  );
  create index if not exists challenges_to_open_idx ON public.challenges USING btree (to_user_id, status);
  create table if not exists classrooms (
    id uuid default gen_random_uuid() not null,
    teacher_id uuid not null,
    name text not null,
    join_code text not null,
    open boolean default true not null,
    assigned_topic_id text,
    assigned_note text,
    created_at timestamptz default now() not null,
    primary key (id),
    foreign key (teacher_id) references users(id) on delete cascade
  );
  create unique index if not exists classrooms_join_code_key on classrooms (join_code);
  create index if not exists classrooms_teacher_idx ON public.classrooms USING btree (teacher_id);
  create table if not exists class_members (
    class_id uuid not null,
    user_id uuid not null,
    joined_at timestamptz default now() not null,
    primary key (class_id, user_id),
    foreign key (class_id) references classrooms(id) on delete cascade,
    foreign key (user_id) references users(id) on delete cascade
  );
  create index if not exists class_members_user_idx ON public.class_members USING btree (user_id);
  create table if not exists competitions (
    id uuid default gen_random_uuid() not null,
    class_id uuid not null,
    teacher_id uuid not null,
    name text not null,
    level text default 'easy'::text not null,
    duration_sec integer default 300 not null,
    question_count integer default 12 not null,
    seed integer not null,
    status text default 'live'::text not null,
    created_at timestamptz default now() not null,
    ended_at timestamptz,
    primary key (id),
    foreign key (class_id) references classrooms(id) on delete cascade,
    foreign key (teacher_id) references users(id) on delete cascade
  );
  create index if not exists competitions_class_idx ON public.competitions USING btree (class_id, status);
  create table if not exists competition_entries (
    competition_id uuid not null,
    user_id uuid not null,
    started_at timestamptz default now() not null,
    finished_at timestamptz,
    correct integer default 0 not null,
    answered integer default 0 not null,
    elapsed_ms integer default 0 not null,
    score integer default 0 not null,
    primary key (competition_id, user_id),
    foreign key (competition_id) references competitions(id) on delete cascade,
    foreign key (user_id) references users(id) on delete cascade
  );
  create table if not exists daily_challenge (
    user_id uuid not null,
    day date not null,
    correct integer default 0 not null,
    total integer default 0 not null,
    elapsed_ms integer default 0 not null,
    points integer default 0 not null,
    played_at timestamptz default now() not null,
    primary key (user_id, day),
    foreign key (user_id) references users(id) on delete cascade
  );
  create table if not exists friendships (
    user_id uuid not null,
    friend_id uuid not null,
    created_at timestamptz default now() not null,
    primary key (user_id, friend_id),
    foreign key (user_id) references users(id) on delete cascade,
    foreign key (friend_id) references users(id) on delete cascade
  );
  create table if not exists inventory (
    user_id uuid not null,
    spent_gems integer default 0 not null,
    hint_tokens integer default 0 not null,
    fifty_tokens integer default 0 not null,
    time_boosts integer default 0 not null,
    streak_freezes integer default 0 not null,
    freeze_used_on date,
    updated_at timestamptz default now() not null,
    primary key (user_id),
    foreign key (user_id) references users(id) on delete cascade
  );
  create table if not exists league_points (
    user_id uuid not null,
    week_start date not null,
    points integer default 0 not null,
    tier integer default 0 not null,
    updated_at timestamptz default now() not null,
    primary key (user_id, week_start),
    foreign key (user_id) references users(id) on delete cascade
  );
  create index if not exists league_points_week_tier_idx ON public.league_points USING btree (week_start, tier, points DESC);
  create table if not exists mistakes (
    user_id uuid not null,
    prompt text not null,
    topic_id text not null,
    answer integer not null,
    misses integer default 1 not null,
    fixes integer default 0 not null,
    retired boolean default false not null,
    last_missed_at timestamptz default now() not null,
    box integer default 0 not null,
    due_at timestamptz default now() not null,
    reviewed_at timestamptz,
    primary key (user_id, prompt),
    foreign key (user_id) references users(id) on delete cascade
  );
  create index if not exists mistakes_due_idx ON public.mistakes USING btree (user_id, retired, due_at);
  create table if not exists password_reset_tokens (
    id uuid default gen_random_uuid() not null,
    user_id uuid not null,
    token_hash text not null,
    expires_at timestamptz not null,
    used_at timestamptz,
    created_at timestamptz default now() not null,
    primary key (id),
    foreign key (user_id) references users(id) on delete cascade
  );
  create unique index if not exists password_reset_tokens_token_hash_unique on password_reset_tokens (token_hash);
  create table if not exists quest_progress (
    user_id uuid not null,
    day date not null,
    quest_id text not null,
    count integer default 0 not null,
    claimed boolean default false not null,
    updated_at timestamptz default now() not null,
    primary key (user_id, day, quest_id),
    foreign key (user_id) references users(id) on delete cascade
  );
  create table if not exists topic_progress (
    user_id uuid not null,
    topic_id text not null,
    cleared integer default 0 not null,
    stage_stars jsonb default '{}'::jsonb not null,
    updated_at timestamptz default now() not null,
    primary key (user_id, topic_id),
    foreign key (user_id) references users(id) on delete cascade
  );
  create unique index if not exists topic_progress_user_id_topic_id_pk ON public.topic_progress USING btree (user_id, topic_id);
end
$do$;
