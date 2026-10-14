-- =============================================================================
-- StockControl · script.sql
-- Estrutura completa do banco (Supabase / PostgreSQL) + dados de exemplo.
--
-- Como usar: num projeto Supabase novo, abra o SQL Editor, cole este arquivo
-- inteiro e clique em "Run".
--
-- Tabelas: usuarios, produtos, movimentacoes, comentarios
-- (as senhas ficam em auth.users, gerenciado pelo Supabase Auth; a tabela
--  usuarios guarda nome e perfil de cada conta, ligada 1:1 a auth.users)
-- =============================================================================

create extension if not exists pgcrypto;

-- -----------------------------------------------------------------------------
-- USUARIOS
-- -----------------------------------------------------------------------------
create table public.usuarios (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  role        text not null default 'user' check (role in ('admin', 'user')),
  created_at  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- PRODUTOS
-- -----------------------------------------------------------------------------
create sequence public.produtos_codigo_seq start 1049;

create table public.produtos (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique default ('SC-' || nextval('public.produtos_codigo_seq')),
  name        text not null check (length(trim(name)) > 0),
  category    text not null,
  description text not null default '' check (length(description) <= 500),
  price       numeric(12, 2) not null check (price > 0),
  stock       integer not null default 0 check (stock >= 0),
  unit        text not null default 'Unidade',
  active      boolean not null default true,
  image_url   text,
  created_at  timestamptz not null default now(),   -- data de inclusão automática
  updated_at  timestamptz not null default now()
);
create index produtos_category_idx on public.produtos (category);

-- -----------------------------------------------------------------------------
-- MOVIMENTACOES (histórico de entradas, saídas e ajustes)
-- -----------------------------------------------------------------------------
create table public.movimentacoes (
  id               uuid primary key default gen_random_uuid(),
  product_id       uuid not null references public.produtos (id) on delete cascade,
  type             text not null check (type in ('Entrada', 'Saída', 'Ajuste')),
  quantity         integer not null check (quantity > 0),
  note             text check (length(note) <= 500),
  balance          integer not null check (balance >= 0),
  responsible_id   uuid references public.usuarios (id) on delete set null,
  responsible_name text not null,
  moved_at         timestamptz not null default now(),
  created_at       timestamptz not null default now()
);
create index movimentacoes_product_idx on public.movimentacoes (product_id, moved_at desc);
create index movimentacoes_responsible_idx on public.movimentacoes (responsible_id);

-- -----------------------------------------------------------------------------
-- COMENTARIOS
-- -----------------------------------------------------------------------------
create table public.comentarios (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.produtos (id) on delete cascade,
  author_id   uuid references public.usuarios (id) on delete set null,
  author_name text not null default '',
  author_role text not null default '',
  body        text not null check (length(trim(body)) between 1 and 500),
  created_at  timestamptz not null default now()
);
create index comentarios_product_idx on public.comentarios (product_id, created_at desc);
create index comentarios_author_idx on public.comentarios (author_id);

-- -----------------------------------------------------------------------------
-- FUNÇÕES E TRIGGERS
-- -----------------------------------------------------------------------------

-- Cria o registro em usuarios quando alguém se cadastra (sempre como 'user').
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.usuarios (id, name, role)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin');
$$;

-- Preenche autor e data do comentário a partir do usuário logado.
create function public.set_comment_author()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
  v_role text;
begin
  select name, role into v_name, v_role from public.usuarios where id = auth.uid();
  new.author_id   := auth.uid();
  new.author_name := coalesce(v_name, 'Usuário');
  new.author_role := case when v_role = 'admin' then 'Administrador' else 'Usuário' end;
  new.created_at  := now();
  return new;
end;
$$;

create trigger comentarios_autor
  before insert on public.comentarios
  for each row execute function public.set_comment_author();

-- Registro de entrada/saída: atômico, só administradores, sem estoque negativo.
create function public.register_movement(
  p_product_id uuid,
  p_type       text,
  p_quantity   integer,
  p_note       text default null,
  p_moved_at   timestamptz default now()
)
returns integer
language plpgsql
security definer set search_path = public
as $$
declare
  v_stock   integer;
  v_balance integer;
  v_name    text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem movimentar o estoque';
  end if;
  if p_type not in ('Entrada', 'Saída') then
    raise exception 'Tipo de movimentação inválido';
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'A quantidade deve ser maior que zero';
  end if;

  select stock into v_stock from public.produtos where id = p_product_id for update;
  if not found then
    raise exception 'Produto não encontrado';
  end if;

  v_balance := case when p_type = 'Entrada' then v_stock + p_quantity else v_stock - p_quantity end;
  if v_balance < 0 then
    raise exception 'Estoque insuficiente para esta saída';
  end if;

  select name into v_name from public.usuarios where id = auth.uid();

  perform set_config('stockcontrol.skip_adjust', 'on', true);
  update public.produtos set stock = v_balance where id = p_product_id;
  perform set_config('stockcontrol.skip_adjust', 'off', true);

  insert into public.movimentacoes (product_id, type, quantity, note, balance, responsible_id, responsible_name, moved_at)
  values (p_product_id, p_type, p_quantity, nullif(trim(p_note), ''), v_balance, auth.uid(), coalesce(v_name, 'Sistema'), coalesce(p_moved_at, now()));

  return v_balance;
end;
$$;

-- Histórico automático: estoque inicial no cadastro e ajuste na edição.
create function public.track_product_stock()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text;
begin
  select name into v_name from public.usuarios where id = auth.uid();

  if tg_op = 'INSERT' then
    if new.stock > 0 then
      insert into public.movimentacoes (product_id, type, quantity, note, balance, responsible_id, responsible_name)
      values (new.id, 'Entrada', new.stock, 'Estoque inicial', new.stock, auth.uid(), coalesce(v_name, 'Sistema'));
    end if;
  elsif new.stock <> old.stock and coalesce(current_setting('stockcontrol.skip_adjust', true), 'off') <> 'on' then
    insert into public.movimentacoes (product_id, type, quantity, note, balance, responsible_id, responsible_name)
    values (new.id, 'Ajuste', abs(new.stock - old.stock), 'Ajuste manual na edição do produto', new.stock, auth.uid(), coalesce(v_name, 'Sistema'));
  end if;
  return new;
end;
$$;

create trigger produtos_historico
  after insert or update of stock on public.produtos
  for each row execute function public.track_product_stock();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger produtos_updated_at
  before update on public.produtos
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- SEGURANÇA (Row Level Security)
-- -----------------------------------------------------------------------------
alter table public.usuarios      enable row level security;
alter table public.produtos      enable row level security;
alter table public.movimentacoes enable row level security;
alter table public.comentarios   enable row level security;

create policy "usuarios: ver o próprio ou admin" on public.usuarios
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "usuarios: admin altera" on public.usuarios
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "produtos: leitura" on public.produtos
  for select to authenticated using (active or (select public.is_admin()));
create policy "produtos: admin insere" on public.produtos
  for insert to authenticated with check ((select public.is_admin()));
create policy "produtos: admin altera" on public.produtos
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "produtos: admin exclui" on public.produtos
  for delete to authenticated using ((select public.is_admin()));

create policy "movimentacoes: leitura" on public.movimentacoes
  for select to authenticated using (true);

create policy "comentarios: leitura" on public.comentarios
  for select to authenticated using (true);
create policy "comentarios: usuário logado insere" on public.comentarios
  for insert to authenticated with check ((select auth.uid()) is not null);
create policy "comentarios: admin exclui" on public.comentarios
  for delete to authenticated using ((select public.is_admin()));

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.set_comment_author() from public, anon, authenticated;
revoke execute on function public.track_product_stock() from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
revoke execute on function public.register_movement(uuid, text, integer, text, timestamptz) from public, anon;
grant execute on function public.register_movement(uuid, text, integer, text, timestamptz) to authenticated;

-- -----------------------------------------------------------------------------
-- STORAGE: imagens dos produtos
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product-images: admin envia" on storage.objects
  for insert to authenticated with check (bucket_id = 'product-images' and (select public.is_admin()));
create policy "product-images: admin altera" on storage.objects
  for update to authenticated using (bucket_id = 'product-images' and (select public.is_admin()));
create policy "product-images: admin exclui" on storage.objects
  for delete to authenticated using (bucket_id = 'product-images' and (select public.is_admin()));

-- -----------------------------------------------------------------------------
-- DADOS DE EXEMPLO
-- (o estoque inicial de cada produto gera uma "Entrada" em movimentacoes)
-- -----------------------------------------------------------------------------
insert into public.produtos (code, name, category, description, price, stock, unit, active, image_url) values
  ('SC-1043', 'Workstation Core X',   'Computadores', 'Desktop de alto desempenho para uso profissional.',  7299.00,  7, 'Unidade', true, 'https://images.unsplash.com/photo-1745910020846-3d4d0088d24d?auto=format&fit=crop&w=900&q=85'),
  ('SC-1044', 'Dock Station Connect', 'Periféricos',  'Hub profissional USB-C com 10 conexões.',              799.90, 32, 'Unidade', true, 'https://images.unsplash.com/photo-1755436612842-d239712f5967?auto=format&fit=crop&w=900&q=85'),
  ('SC-1045', 'Cadeira Axis Office',  'Mobiliário',   'Cadeira ergonômica com suporte lombar regulável.',     1299.00,  2, 'Unidade', true, 'https://images.unsplash.com/photo-1588358230342-b0db4bd555c4?auto=format&fit=crop&w=900&q=85'),
  ('SC-1046', 'Teclado Key 75',       'Periféricos',  'Teclado mecânico compacto com conexão sem fio.',        489.90, 27, 'Unidade', true, 'https://images.unsplash.com/photo-1533379007656-3a10925da2e2?auto=format&fit=crop&w=900&q=85'),
  ('SC-1047', 'Headset Wave Pro',     'Áudio',        'Áudio imersivo, microfone removível e conexão USB.',    649.90,  4, 'Unidade', true, 'https://images.unsplash.com/photo-1629317443309-2f4d67092065?auto=format&fit=crop&w=900&q=85'),
  ('SC-1048', 'Monitor Vision 27”',   'Monitores',    'Monitor QHD com painel IPS e ajuste de altura.',       1899.90, 18, 'Unidade', true, 'https://images.unsplash.com/photo-1548611716-3000815a5803?auto=format&fit=crop&w=900&q=85');

-- Para tornar uma conta administradora (troque o e-mail):
-- update public.usuarios set role = 'admin'
-- where id = (select id from auth.users where email = 'seuemail@empresa.com');
