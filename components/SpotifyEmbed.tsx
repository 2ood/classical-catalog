import { extractSpotifyId } from "@/lib/media";

export default function SpotifyEmbed({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const spotify = extractSpotifyId(url);
  if (!spotify) {
    return <p className="text-muted">Can&apos;t embed this link: {url}</p>;
  }
  return (
    <iframe
      src={`https://open.spotify.com/embed/${spotify.type}/${spotify.id}`}
      title={title}
      className="w-full h-full"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
    />
  );
}
