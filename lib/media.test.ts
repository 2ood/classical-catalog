import { describe, expect, it } from "vitest";
import {
  extractSpotifyId,
  extractYouTubeId,
  withoutYouTubeStart,
  youTubeStart,
} from "./media";

describe("extractYouTubeId", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?feature=share&v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/live/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["  https://youtu.be/dQw4w9WgXcQ  ", "dQw4w9WgXcQ"],
  ])("extracts the id from %s", (url, id) => {
    expect(extractYouTubeId(url)).toBe(id);
  });

  it.each([
    "",
    "not a url",
    "https://www.youtube.com/",
    "https://www.youtube.com/watch?v=short",
    "https://youtu.be/",
    "https://example.com/watch?v=dQw4w9WgXcQ",
    "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
  ])("returns null for %j", (url) => {
    expect(extractYouTubeId(url)).toBeNull();
  });
});

describe("youTubeStart", () => {
  it.each([
    ["https://youtu.be/dQw4w9WgXcQ?t=754", 754],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc&t=754s", 754],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s", 3723],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=12m", 720],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=1m30s", 90],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ?start=95", 95],
    ["https://www.youtube.com/live/dQw4w9WgXcQ?t=3600", 3600],
  ])("reads where %s starts", (url, seconds) => {
    expect(youTubeStart(url)).toBe(seconds);
  });

  it.each([
    "https://youtu.be/dQw4w9WgXcQ",
    "https://youtu.be/dQw4w9WgXcQ?t=0",
    "https://youtu.be/dQw4w9WgXcQ?t=soon",
    "https://youtu.be/dQw4w9WgXcQ?t=1x",
    "not a url",
  ])("returns null for %j", (url) => {
    expect(youTubeStart(url)).toBeNull();
  });
});

describe("withoutYouTubeStart", () => {
  it.each([
    ["https://youtu.be/dQw4w9WgXcQ?t=754", "https://youtu.be/dQw4w9WgXcQ"],
    [
      "https://youtu.be/dQw4w9WgXcQ?si=abc&t=754s",
      "https://youtu.be/dQw4w9WgXcQ?si=abc",
    ],
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1h2m3s&list=x",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=x",
    ],
    [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=1m30s",
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ],
    [
      "https://www.youtube.com/embed/dQw4w9WgXcQ?start=95",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
    ],
    ["https://youtu.be/dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ"],
    [" not a url ", "not a url"],
  ])("%s → %s", (url, stripped) => {
    expect(withoutYouTubeStart(url)).toBe(stripped);
  });
});

describe("extractSpotifyId", () => {
  it.each([
    [
      "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC",
      { type: "track", id: "4uLU6hMCjMI75M1A2tKUQC" },
    ],
    [
      "https://open.spotify.com/track/4uLU6hMCjMI75M1A2tKUQC?si=abc123",
      { type: "track", id: "4uLU6hMCjMI75M1A2tKUQC" },
    ],
    [
      "https://open.spotify.com/album/1DFixLWuPkv3KT3TnV35m3",
      { type: "album", id: "1DFixLWuPkv3KT3TnV35m3" },
    ],
    [
      "https://open.spotify.com/playlist/37i9dQZF1DWWEJlAGA9gs0",
      { type: "playlist", id: "37i9dQZF1DWWEJlAGA9gs0" },
    ],
    [
      "https://open.spotify.com/intl-de/album/1DFixLWuPkv3KT3TnV35m3",
      { type: "album", id: "1DFixLWuPkv3KT3TnV35m3" },
    ],
    [
      "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC",
      { type: "track", id: "4uLU6hMCjMI75M1A2tKUQC" },
    ],
    [
      "spotify:playlist:37i9dQZF1DWWEJlAGA9gs0",
      { type: "playlist", id: "37i9dQZF1DWWEJlAGA9gs0" },
    ],
  ])("extracts the id from %s", (url, expected) => {
    expect(extractSpotifyId(url)).toEqual(expected);
  });

  it.each([
    "",
    "not a url",
    "https://open.spotify.com/",
    "https://open.spotify.com/artist/0OdUWJ0sBjDrqHygGUXeCF",
    "https://open.spotify.com/track/",
    "https://example.com/track/4uLU6hMCjMI75M1A2tKUQC",
    "spotify:artist:0OdUWJ0sBjDrqHygGUXeCF",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ])("returns null for %j", (url) => {
    expect(extractSpotifyId(url)).toBeNull();
  });
});
