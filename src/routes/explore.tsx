import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Loader2, MapPin, BookOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { WorldMap, type MapMarker } from "@/components/WorldMap";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/explore")({
  head: () => ({
    meta: [
      { title: "Explore — Wanderful Journeys" },
      {
        name: "description",
        content:
          "Explore our travel map — photos, videos, and journal entries from adventures around the world.",
      },
    ],
  }),
  component: ExplorePage,
});

type Loc = {
  id: string;
  album_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  notes: string | null;
  icon: string | null;
};

type Album = {
  id: string;
  title: string;
  description: string | null;
};

function ExplorePage() {
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<string | "all">("all");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    // Fetch all public albums
    const { data: albumData } = await supabase
      .from("albums")
      .select("id, title, description")
      .eq("visibility", "public")
      .order("created_at", { ascending: false });

    const publicAlbums = albumData ?? [];
    setAlbums(publicAlbums);

    if (publicAlbums.length === 0) {
      setLocations([]);
      setLoading(false);
      return;
    }

    // Fetch locations for all public albums
    const albumIds = publicAlbums.map((a) => a.id);
    const { data: locData } = await supabase
      .from("locations")
      .select(
        "id, album_id, name, latitude, longitude, cover_image_url, notes, icon",
      )
      .in("album_id", albumIds);

    setLocations(locData ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visibleLocs =
    activeAlbum === "all"
      ? locations
      : locations.filter((l) => l.album_id === activeAlbum);

  const mappedLocs = visibleLocs.filter(
    (l) => l.latitude != null && l.longitude != null,
  );

  const markers: MapMarker[] = mappedLocs.map((l) => ({
    id: l.id,
    name: l.name,
    lat: l.latitude as number,
    lng: l.longitude as number,
    icon: l.icon ?? undefined,
    thumbnail: l.cover_image_url ?? undefined,
  }));

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-6 py-8">
        {/* Page header */}
        <div className="mb-8">
          <div className="font-script text-xl text-rust mb-1">
            ✦ The Atlas ✦
          </div>
          <h1 className="font-display text-4xl text-ink">
            Explore Our Journeys
          </h1>
          <p className="font-script text-xl text-ink-soft mt-2">
            Every pin is a story. Click to dive in.
          </p>
        </div>

        {/* Trip filter tabs */}
        {albums.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setActiveAlbum("all")}
              className={`px-4 py-2 rounded-full border font-display text-sm tracking-wide transition-all ${
                activeAlbum === "all"
                  ? "bg-ink text-parchment border-ink"
                  : "border-ink/30 text-ink hover:bg-parchment-deep/40"
              }`}
            >
              All Adventures
            </button>
            {albums.map((a) => (
              <button
                key={a.id}
                onClick={() => setActiveAlbum(a.id)}
                className={`px-4 py-2 rounded-full border font-display text-sm tracking-wide transition-all ${
                  activeAlbum === a.id
                    ? "bg-ink text-parchment border-ink"
                    : "border-ink/30 text-ink hover:bg-parchment-deep/40"
                }`}
              >
                {a.title}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="text-center py-24 text-ink-soft">
            <Loader2 className="h-6 w-6 animate-spin mx-auto mb-3" />
            <p className="font-script text-xl">Unrolling the map…</p>
          </div>
        ) : albums.length === 0 ? (
          <div className="parchment-card rounded-2xl p-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-rust mb-4" />
            <h2 className="font-display text-2xl text-ink mb-2">
              No adventures shared yet
            </h2>
            <p className="text-ink-soft font-script text-lg">
              Check back soon — the map is filling up.
            </p>
          </div>
        ) : (
          <>
            {/* The Map */}
            <WorldMap
              markers={markers}
              showRoutes
              onMarkerClick={(m) =>
                navigate({
                  to: "/view/$locationId",
                  params: { locationId: m.id },
                })
              }
            />

            {/* Location grid */}
            {visibleLocs.length > 0 && (
              <div className="mt-10">
                <h2 className="font-display text-2xl text-ink mb-5">
                  {activeAlbum === "all"
                    ? `${visibleLocs.length} Destinations`
                    : albums.find((a) => a.id === activeAlbum)?.title}
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleLocs.map((l) => (
                    <Link
                      key={l.id}
                      to="/view/$locationId"
                      params={{ locationId: l.id }}
                      className="parchment-card rounded-xl overflow-hidden hover:scale-[1.02] transition-transform group"
                    >
                      <div className="aspect-[4/3] bg-ink/10 relative overflow-hidden">
                        {l.cover_image_url ? (
                          <img
                            src={l.cover_image_url}
                            alt={l.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-ink-soft text-5xl">
                            {l.icon ?? "📍"}
                          </div>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-display text-lg text-ink">
                          {l.name}
                        </h3>
                        {l.latitude && l.longitude && (
                          <p className="text-xs text-ink-soft flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {l.latitude.toFixed(2)}°, {l.longitude.toFixed(2)}°
                          </p>
                        )}
                        {l.notes && (
                          <p className="font-script text-sm text-ink-soft mt-2 line-clamp-2">
                            {l.notes}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-ink/10 py-8 text-center text-sm text-ink-soft font-script text-base mt-16">
        ✦ Made for travelers, by travelers ✦
      </footer>
    </div>
  );
}
