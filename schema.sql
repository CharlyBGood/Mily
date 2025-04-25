-- Enable RLS (Row Level Security)
alter table if exists public.profiles enable row level security;
alter table if exists public.posts enable row level security;
alter table if exists public.comments enable row level security;
alter table if exists public.likes enable row level security;
alter table if exists public.follows enable row level security;
alter table if exists public.notifications enable row level security;
alter table if exists public.reports enable row level security;

-- Create profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  website text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Create posts table
create table if not exists public.posts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  image_url text,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_archived boolean default false
);

-- Create comments table
create table if not exists public.comments (
  id uuid default uuid_generate_v4() primary key,
  post_id uuid references public.posts(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  is_archived boolean default false
);

-- Create likes table
create table if not exists public.likes (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  created_at timestamp with time zone default now(),
  constraint one_like_per_user_per_post unique (user_id, post_id),
  constraint one_like_per_user_per_comment unique (user_id, comment_id),
  constraint must_like_something check (
    (post_id is null and comment_id is not null) or
    (post_id is not null and comment_id is null)
  )
);

-- Create follows table
create table if not exists public.follows (
  id uuid default uuid_generate_v4() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  following_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  constraint unique_follow unique (follower_id, following_id),
  constraint no_self_follow check (follower_id != following_id)
);

-- Create notifications table
create table if not exists public.notifications (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade,
  type text not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  created_at timestamp with time zone default now()
);

-- Create reports table
create table if not exists public.reports (
  id uuid default uuid_generate_v4() primary key,
  reporter_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade,
  comment_id uuid references public.comments(id) on delete cascade,
  reason text not null,
  status text default 'pending' check (status in ('pending', 'reviewed', 'resolved', 'dismissed')),
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint must_report_something check (
    (post_id is null and comment_id is not null) or
    (post_id is not null and comment_id is null)
  )
);

-- Create search index for posts
create index if not exists posts_content_search_idx on public.posts using gin(to_tsvector('spanish', content));

-- Create search index for profiles
create index if not exists profiles_username_search_idx on public.profiles using gin(to_tsvector('simple', username));
create index if not exists profiles_fullname_search_idx on public.profiles using gin(to_tsvector('simple', full_name));

-- RLS Policies

-- Profiles policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);

-- Posts policies
create policy "Posts are viewable by everyone"
  on posts for select
  using (not is_archived);

create policy "Users can create their own posts"
  on posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on posts for delete
  using (auth.uid() = user_id);

-- Comments policies
create policy "Comments are viewable by everyone"
  on comments for select
  using (not is_archived);

create policy "Users can create their own comments"
  on comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on comments for delete
  using (auth.uid() = user_id);

-- Likes policies
create policy "Likes are viewable by everyone"
  on likes for select
  using (true);

create policy "Users can create their own likes"
  on likes for insert
  with check (auth.uid() = user_id);

create policy "Users can delete their own likes"
  on likes for delete
  using (auth.uid() = user_id);

-- Follows policies
create policy "Follows are viewable by everyone"
  on follows for select
  using (true);

create policy "Users can create their own follows"
  on follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can delete their own follows"
  on follows for delete
  using (auth.uid() = follower_id);

-- Notifications policies
create policy "Users can view their own notifications"
  on notifications for select
  using (auth.uid() = user_id);

create policy "Users can update their own notifications"
  on notifications for update
  using (auth.uid() = user_id);

-- Reports policies
create policy "Users can create reports"
  on reports for insert
  with check (auth.uid() = reporter_id);

create policy "Only admins can view reports"
  on reports for select
  using (auth.uid() in (select id from public.profiles where email in ('admin@example.com')));

-- Functions for real-time notifications

-- Function to create a notification when someone likes a post
create or replace function public.handle_new_like()
returns trigger as $$
begin
  insert into public.notifications (user_id, actor_id, type, post_id, message)
  select 
    posts.user_id,
    new.user_id,
    'like',
    new.post_id,
    'liked your post'
  from public.posts
  where posts.id = new.post_id and posts.user_id != new.user_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new likes
create trigger on_new_like
  after insert on public.likes
  for each row
  when (new.post_id is not null)
  execute procedure public.handle_new_like();

-- Function to create a notification when someone comments on a post
create or replace function public.handle_new_comment()
returns trigger as $$
begin
  insert into public.notifications (user_id, actor_id, type, post_id, comment_id, message)
  select 
    posts.user_id,
    new.user_id,
    'comment',
    new.post_id,
    new.id,
    'commented on your post'
  from public.posts
  where posts.id = new.post_id and posts.user_id != new.user_id;
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new comments
create trigger on_new_comment
  after insert on public.comments
  for each row
  execute procedure public.handle_new_comment();

-- Function to create a notification when someone follows a user
create or replace function public.handle_new_follow()
returns trigger as $$
begin
  insert into public.notifications (user_id, actor_id, type, message)
  values (
    new.following_id,
    new.follower_id,
    'follow',
    'started following you'
  );
  
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new follows
create trigger on_new_follow
  after insert on public.follows
  for each row
  execute procedure public.handle_new_follow();
