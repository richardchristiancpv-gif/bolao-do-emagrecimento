-- =========================================================
-- BOLÃO DO EMAGRECIMENTO — SCHEMA & SEED DATA SUPABASE
-- Copie e cole este código no SQL Editor do seu projeto Supabase
-- =========================================================

-- 1. TABELA DE PARTICIPANTES
CREATE TABLE IF NOT EXISTS public.participants (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  initial_weight NUMERIC(5,2) NOT NULL,
  current_weight NUMERIC(5,2) NOT NULL,
  password TEXT NOT NULL DEFAULT '123456',
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  is_vip BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE HISTÓRICO DE PESAGENS
CREATE TABLE IF NOT EXISTS public.weigh_ins (
  id BIGSERIAL PRIMARY KEY,
  participant_id TEXT REFERENCES public.participants(id) ON DELETE CASCADE,
  weight NUMERIC(5,2) NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE POSTS DO MURAL DE VITÓRIAS
CREATE TABLE IF NOT EXISTS public.posts (
  id BIGSERIAL PRIMARY KEY,
  author_id TEXT REFERENCES public.participants(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  caption TEXT NOT NULL,
  photo_type TEXT DEFAULT 'marmita',
  photo_url TEXT,
  reactions JSONB DEFAULT '{"love": 0, "fire": 0, "clap": 0}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. HABILITAR ROW LEVEL SECURITY (RLS) COM POLÍTICAS PÚBLICAS PARA O GRUPO
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weigh_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Políticas de Leitura e Escrita Públicas (Chave Anon)
CREATE POLICY "Acesso publico participantes" ON public.participants FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico pesagens" ON public.weigh_ins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso publico posts" ON public.posts FOR ALL USING (true) WITH CHECK (true);

-- 5. HABILITAR REALTIME (Para atualizar os celulares automaticamente sem recarregar a tela)
ALTER PUBLICATION supabase_realtime ADD TABLE public.participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.weigh_ins;
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- 6. POPULAR PARTICIPANTES OFICIAIS COM OS PESOS DE LARGADA (05/10)
INSERT INTO public.participants (id, username, name, initial_weight, current_weight, is_vip, password, must_change_password)
VALUES 
  ('gilmar', 'gilmar', 'Gilmar', 132.10, 132.10, FALSE, '123456', TRUE),
  ('thiffany', 'thiffany', 'Thiffany', 97.80, 97.80, FALSE, '123456', TRUE),
  ('estevao', 'estevao', 'Estevão', 94.40, 94.40, FALSE, '123456', TRUE),
  ('gabi', 'gabi', 'Gabi', 91.45, 91.45, FALSE, '123456', TRUE),
  ('sonia', 'sonia', 'Sonia', 89.50, 89.50, FALSE, '123456', TRUE),
  ('solange', 'solange', 'Solange', 84.50, 84.50, FALSE, '123456', TRUE),
  ('aparecida', 'aparecida', 'Irmã Aparecida', 84.15, 84.15, FALSE, '123456', TRUE),
  ('dora', 'dora', 'Irmã Dora', 82.90, 82.90, FALSE, '123456', TRUE),
  ('panmela', 'panmela', 'Panmela', 82.30, 82.30, TRUE, '123456', TRUE),
  ('vera', 'vera', 'Vera', 79.30, 79.30, FALSE, '123456', TRUE),
  ('edna', 'edna', 'Edna', 77.10, 77.10, FALSE, '123456', TRUE),
  ('elaine', 'elaine', 'Elaine', 75.25, 75.25, FALSE, '123456', TRUE)
ON CONFLICT (id) DO UPDATE 
SET initial_weight = EXCLUDED.initial_weight;

-- Inserir pesagem inicial de 05/10 no histórico de cada um
INSERT INTO public.weigh_ins (participant_id, weight, date, note)
SELECT id, initial_weight, '2026-10-05', 'Pesagem Oficial de Início'
FROM public.participants
ON CONFLICT DO NOTHING;

-- Inserir posts de exemplo no mural
INSERT INTO public.posts (author_id, author_name, caption, photo_type, photo_url, reactions)
VALUES
  ('panmela', 'Panmela ⭐', 'Marmitinha saudável pronta pra levar pro trabalho! Frango com legumes e bastante salada colorida 🥗✨ Vamos juntas!', 'marmita', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80', '{"love": 14, "fire": 9, "clap": 16}'),
  ('gilmar', 'Gilmar', 'Caminhada matinal concluída logo cedo! 45 minutos no ritmo. Disciplina hoje, resultados amanhã! 👟🔥', 'caminhada', 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80', '{"love": 8, "fire": 18, "clap": 12}'),
  ('elaine', 'Elaine', 'Meta de 2L de água batida e troquei o lanche calórico por frutas! Pequenas vitórias 🍎💧', 'frutas', 'https://images.unsplash.com/photo-1619546813926-a78fa6372cd2?auto=format&fit=crop&w=600&q=80', '{"love": 11, "fire": 6, "clap": 15}')
ON CONFLICT DO NOTHING;
