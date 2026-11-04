import { afterEach, expect, it, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
import { CatalogConfigurationError, saveAlbum } from "./albums";

vi.mock("server-only", () => ({}));
vi.mock("@supabase/supabase-js", () => ({ createClient: vi.fn() }));

afterEach(() => vi.unstubAllEnvs());

it.each([undefined, "sb_secret_your_key"])(
  "detecta chave ausente ou de exemplo antes de consultar o catálogo (%s)",
  async (key) => {
    vi.stubEnv("SUPABASE_SECRET_KEY", key);
    await expect(
      saveAlbum({
        externalId: "test",
        primaryArtist: null,
        title: "Álbum",
        artist: "",
        year: null,
      }),
    ).rejects.toBeInstanceOf(CatalogConfigurationError);
    expect(createClient).not.toHaveBeenCalled();
  },
);
