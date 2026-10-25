-- Movements move from each score to its work (Milestone 8).
-- For each work, the score with the most movements supplies the names and
-- order; every score of that work then maps its own list, position by
-- position, onto those movement ids.
WITH chosen AS (
  SELECT DISTINCT ON (work_id) work_id, movements
  FROM scores
  WHERE jsonb_array_length(movements) > 0
  ORDER BY work_id, jsonb_array_length(movements) DESC, id
),
named AS MATERIALIZED (
  SELECT c.work_id, m.ord, m.value ->> 'name' AS name, gen_random_uuid()::text AS mid
  FROM chosen c, jsonb_array_elements(c.movements) WITH ORDINALITY AS m(value, ord)
),
updated_works AS (
  UPDATE works w
  SET movements = (
    SELECT jsonb_agg(jsonb_build_object('id', n.mid, 'name', n.name) ORDER BY n.ord)
    FROM named n
    WHERE n.work_id = w.id
  )
  WHERE w.id IN (SELECT work_id FROM named)
)
UPDATE scores s
SET movement_pages = (
  SELECT coalesce(jsonb_object_agg(n.mid, (m.value ->> 'page')::int), '{}'::jsonb)
  FROM jsonb_array_elements(s.movements) WITH ORDINALITY AS m(value, ord)
  JOIN named n ON n.work_id = s.work_id AND n.ord = m.ord
)
WHERE s.work_id IN (SELECT work_id FROM named);
