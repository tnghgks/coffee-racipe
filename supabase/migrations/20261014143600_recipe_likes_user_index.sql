-- The home page and "/me/liked" list a user's likes newest first, like recipe_saves_user_created_idx for saves.
create index recipe_likes_user_created_idx on public.recipe_likes (user_id, created_at desc);
