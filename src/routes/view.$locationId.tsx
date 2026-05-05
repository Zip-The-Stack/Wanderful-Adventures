import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, MapPin, Camera, Film } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/view/$locationId")({
  component: PublicLocationPage,
});

type Loc = {
  id: string;
  name: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  visited_at: string | null;
  album_id: string;
  notes: string | null;
  icon: string | null;
  cover_image_url: string | null;
};

type Med = {
  id: string;
  storage_path: string;
  type: string;
  caption: string | null;
  taken_at: string | null;
};

type MedWithUrl = Med & { url: string };

function PublicLocationPage() {
  const { locationId } = useParams({ from: "/view/$locationId" });
  const [loc, setLoc] = useState<Loc | null>(null);
  const [media, setMedia] = useState<MedWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightbox, setLightbox] = useState<MedWithUrl | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // Fetch location
      const { data: l } = await supabase
        .from("locations")
        .select("*")
        .eq("id", locationId)
        .maybeSingle();

      if (!l) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      // Verify the album is public
      const { data: album } = await supabase
        .from("albums")
        .select("visibility")
        .eq("id", l.album_id)
        .maybeSingle();

      if (!album || album.visibility !== "public") {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setLoc(l);

      // Fetch media — uses public-facing signed URLs
      const { data: m } = await supabase
        .from("media")
        .select("*")
        .eq("location_id", locationId)
        .order("taken_at", { ascending: true });

      if (m) {
        // For public albums we request signed URLs (storage policies allow public album reads)
        const withUrls = await Promise.all(
          m.map(async (item) => {
            const { data } = await supabase.storage
              .from("media")
              .createSignedUrl(item.storage_path, 60 * 60 * 24); // 24hr for public viewers
            return { ...item, url: data?.signedUrl ?? "" };
          }),
        );
        setMedia(withUrls.filter((m) => m.url));
      }

      setLoading(false);
    })();
  }, [locationId]);

  // Lightbox keyboard nav
  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") {
        const idx = media.findIndex((m) => m.id === lightbox.id);
        if (idx < media.length - 1) setLightbox(media[idx + 1]);
      }
      if (e.key === "ArrowLeft") {
        const idx = media.findIndex((m) => m.id === lightbox.id);
        if (idx > 0) setLightbox(media[idx - 1]);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, media]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-rust mx-auto mb-3" />
          <p className="font-script text-xl text-ink-soft">
            Opening the chapter…
          </p>
        </div>
      </div>
    );
  }

  if (notFound || !loc) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-24">
          <p className="font-script text-3xl text-ink-soft mb-4">
            This page of the journal is blank…
          </p>
          <Link
            to="/explore"
            className="text-rust underline font-script text-lg"
          >
            ← Back to the map
          </Link>
        </div>
      </div>
    );
  }

  const hasGps = loc.latitude != null && loc.longitude != null;
  const imageMedia = media.filter((m) => m.type !== "video");
  const videoMedia = media.filter((m) => m.type === "video");

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Back link */}
        <Link
          to="/explore"
          className="inline-flex items-center gap-2 text-ink-soft hover:text-ink mb-6 font-script text-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to the map
        </Link>

        {/* Hero card */}
        <div className="parchment-card rounded-2xl overflow-hidden mb-8">
          {loc.cover_image_url && (
            <div className="aspect-[21/6] overflow-hidden relative">
              <img
                src={loc.cover_image_url}
                alt={loc.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-parchment/90 via-transparent to-transparent" />
            </div>
          )}
          <div className="p-8">
            <div className="font-script text-xl text-rust">✦ Chapter ✦</div>
            <h1 className="font-display text-5xl text-ink mt-1">{loc.name}</h1>
            {hasGps && (
              <div className="flex items-center gap-2 mt-2 text-ink-soft">
                <MapPin className="h-4 w-4" />
                <span className="font-mono text-sm">
                  {loc.latitude!.toFixed(4)}°, {loc.longitude!.toFixed(4)}°
                  {loc.country && ` · ${loc.country}`}
                </span>
              </div>
            )}
            {loc.visited_at && (
              <p className="text-xs text-ink-soft mt-1 font-display tracking-widest uppercase">
                {new Date(loc.visited_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            )}

            {/* Journal entry */}
            {loc.notes && (
              <div className="mt-6 max-w-2xl border-l-2 border-rust/30 pl-5">
                <div className="font-script text-sm text-rust mb-2 uppercase tracking-wider">
                  Journal entry
                </div>
                <p className="font-script text-xl text-ink whitespace-pre-wrap leading-relaxed">
                  {loc.notes}
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex gap-6 mt-6 text-sm text-ink-soft">
              {imageMedia.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Camera className="h-4 w-4" />
                  <span>
                    {imageMedia.length} photo
                    {imageMedia.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
              {videoMedia.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Film className="h-4 w-4" />
                  <span>
                    {videoMedia.length} video
                    {videoMedia.length !== 1 ? "s" : ""}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Media gallery */}
        {media.length === 0 ? (
          <div className="text-center py-16 text-ink-soft font-script text-2xl">
            ✦ No memories captured here yet ✦
          </div>
        ) : (
          <>
            {/* Videos first if any */}
            {videoMedia.length > 0 && (
              <div className="mb-8">
                <h2 className="font-display text-2xl text-ink mb-4">Films</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {videoMedia.map((m) => (
                    <div
                      key={m.id}
                      className="parchment-card rounded-xl overflow-hidden"
                    >
                      <video src={m.url} controls className="w-full block" />
                      {(m.caption || m.taken_at) && (
                        <div className="p-3">
                          {m.caption && (
                            <p className="font-script text-lg text-ink">
                              {m.caption}
                            </p>
                          )}
                          {m.taken_at && (
                            <p className="text-xs text-ink-soft mt-1">
                              {new Date(m.taken_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Masonry photo grid */}
            {imageMedia.length > 0 && (
              <>
                {videoMedia.length > 0 && (
                  <h2 className="font-display text-2xl text-ink mb-4">
                    Photographs
                  </h2>
                )}
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                  {imageMedia.map((m) => (
                    <div
                      key={m.id}
                      className="break-inside-avoid parchment-card rounded-xl overflow-hidden group cursor-pointer"
                      onClick={() => setLightbox(m)}
                    >
                      <img
                        src={m.url}
                        alt={m.caption ?? loc.name}
                        loading="lazy"
                        className="w-full block group-hover:scale-[1.02] transition-transform duration-500"
                      />
                      {(m.caption || m.taken_at) && (
                        <div className="p-3">
                          {m.caption && (
                            <p className="font-script text-lg text-ink">
                              {m.caption}
                            </p>
                          )}
                          {m.taken_at && (
                            <p className="text-xs text-ink-soft mt-1">
                              {new Date(m.taken_at).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-ink/10 py-8 text-center text-sm text-ink-soft font-script text-base mt-16">
        ✦ Made for travelers, by travelers ✦
      </footer>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-ink/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-5xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightbox(null)}
              className="absolute -top-10 right-0 text-parchment/70 hover:text-parchment font-display text-sm tracking-widest"
            >
              ESC to close · ← → to navigate
            </button>
            <img
              src={lightbox.url}
              alt={lightbox.caption ?? loc.name}
              className="w-full rounded-xl shadow-2xl"
            />
            {lightbox.caption && (
              <p className="text-center font-script text-xl text-parchment/80 mt-4">
                {lightbox.caption}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
