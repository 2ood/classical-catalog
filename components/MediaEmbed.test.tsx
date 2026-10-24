import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import MediaEmbed from "./MediaEmbed";

describe("MediaEmbed", () => {
  it("embeds a YouTube video", () => {
    render(
      <MediaEmbed
        mediaType="youtube"
        mediaUrl="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        title="Gould"
      />,
    );
    expect(screen.getByTitle("Gould")).toHaveAttribute(
      "src",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    );
  });

  it("embeds a Spotify album with its type in the path", () => {
    render(
      <MediaEmbed
        mediaType="spotify"
        mediaUrl="https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3?si=x"
        title="Karajan"
      />,
    );
    expect(screen.getByTitle("Karajan")).toHaveAttribute(
      "src",
      "https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3",
    );
  });

  it("shows a message instead of an iframe for an unrecognized URL", () => {
    render(
      <MediaEmbed
        mediaType="youtube"
        mediaUrl="https://example.com"
        title="X"
      />,
    );
    expect(screen.queryByTitle("X")).toBeNull();
    expect(screen.getByText(/can't embed/i)).toBeInTheDocument();
  });
});
