import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import SpotifyEmbed from "./SpotifyEmbed";

describe("SpotifyEmbed", () => {
  it("embeds a Spotify album with its type in the path", () => {
    render(
      <SpotifyEmbed
        url="https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3?si=x"
        title="Karajan"
      />,
    );
    expect(screen.getByTitle("Karajan")).toHaveAttribute(
      "src",
      "https://open.spotify.com/embed/album/1DFixLWuPkv3KT3TnV35m3",
    );
  });

  it("embeds a single track", () => {
    render(
      <SpotifyEmbed
        url="https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC"
        title="II."
      />,
    );
    expect(screen.getByTitle("II.")).toHaveAttribute(
      "src",
      "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
    );
  });

  it("shows a message instead of an iframe for an unrecognized URL", () => {
    render(<SpotifyEmbed url="https://example.com" title="X" />);
    expect(screen.queryByTitle("X")).toBeNull();
    expect(screen.getByText(/can't embed/i)).toBeInTheDocument();
  });
});
