-- Estoque minimo configuravel por item (paridade OnSafety)
ALTER TABLE epi.itens ADD COLUMN IF NOT EXISTS estoque_minimo integer;
