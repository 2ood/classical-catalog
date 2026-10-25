import { extractSpotifyId, extractYouTubeId } from "@/lib/media";

function embedSrc(mediaType: string, mediaUrl: string): string | null {
  if (mediaType === "youtube") {
    const id = extractYouTubeId(mediaUrl);
    return id && `https://www.youtube.com/embed/${id}`;
  }
  if (mediaType === "spotify") {
    const spotify = extractSpotifyId(mediaUrl);
    return (
      spotify && `https://open.spotify.com/embed/${spotify.type}/${spotify.id}`
    );
  }
  return null;
}

export default function MediaEmbed({
  mediaType,
  mediaUrl,
  title,
}: {
  mediaType: string;
  mediaUrl: string;
  title: string;
}) {
  const src = embedSrc(mediaType, mediaUrl);
  if (!src) {
    return <p className="text-muted">Can&apos;t embed this link: {mediaUrl}</p>;
  }
  return (
    <iframe
      src={src}
      title={title}
      className="w-full h-full"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      allowFullScreen
    />
  );
}
