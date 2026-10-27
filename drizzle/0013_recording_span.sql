ALTER TABLE "recordings" ADD COLUMN "start_seconds" integer;--> statement-breakpoint
ALTER TABLE "recordings" ADD COLUMN "end_seconds" integer;--> statement-breakpoint
-- A YouTube link's start (t=754, t=1h2m3s, #t=…, start=95) moves to start_seconds.
WITH t AS (
  SELECT id, (regexp_match(media_url, '[?&#](?:t|start)=([0-9hms]+)'))[1] AS v
  FROM recordings WHERE media_type = 'youtube'
)
UPDATE recordings r SET start_seconds = NULLIF(
  coalesce((regexp_match(t.v, '(\d+)h'))[1]::int, 0) * 3600 +
  coalesce((regexp_match(t.v, '(\d+)m'))[1]::int, 0) * 60 +
  coalesce((regexp_match(t.v, '(\d+)s?$'))[1]::int, 0), 0)
FROM t WHERE r.id = t.id AND t.v IS NOT NULL;--> statement-breakpoint
-- …and leaves the link (twice: a link can carry both t= and start=).
UPDATE recordings SET media_url = regexp_replace(regexp_replace(regexp_replace(regexp_replace(
  media_url, '#t=[^&]*$', ''),
  '([?&])(?:t|start)=[^&#]*(?:&|$)', '\1'),
  '([?&])(?:t|start)=[^&#]*(?:&|$)', '\1'),
  '[?&]$', '')
WHERE media_type = 'youtube';
