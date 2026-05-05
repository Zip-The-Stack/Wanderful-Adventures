import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/location/$locationId")({
  component: LocationPage,
});

type Loc = {
  id: string;
  name: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  visited_at: string | null;
  album_id: string;
};
type Med = {
  id: string;
  storage_path: string;
  type: string;
  caption: string | null;
  taken_at: string | null;
};

function LocationPage() {
  const { locationId } = useParams({ from: "/location/$locationId" });
  const { user, loading: authLoading } = useAuth();
  const [loc, setLoc] = useState<Loc | null>(null);
  const [media, setMedia] = useState<Array<Med & { url: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    (async () => {
      setLoading(true);
      const { data: l } = await supabase
        .from("locations")
        .select("*")
        .eq("id", locationId)
        .maybeSingle();
      setLoc(l);
      const { data: m } = await supabase
        .from("media")
        .select("*")
        .eq("location_id", locationId)
        .order("taken_at", { ascending: true });
      if (m) {
        const withUrls = await Promise.all(
          m.map(async (item) => {
            const { data } = await supabase.storage
              .from("media")
              .createSignedUrl(item.storage_path, 60 * 60);
            return { ...item, url: data?.signedUrl ?? "" };
          }),
        );
        setMedia(withUrls);
      }
      setLoading(false);
    })();
  }, [locationId, user, authLoading]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust" />
      </div>
    );
  }
  if (!loc) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="text-center py-24">
          <p className="font-script text-2xl text-ink-soft">
            Location not found
          </p>
          <Link to="/atlas" className="text-rust underline mt-4 inline-block">
            ← Back to atlas
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <Link
          to="/atlas"
          className="inline-flex items-center gap-2 text-ink-soft hover:text-ink mb-6 font-script text-lg"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to atlas
        </Link>

        <div className="parchment-card rounded-2xl p-8 mb-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-script text-xl text-rust">✦ Chapter ✦</div>
              <h1 className="font-display text-5xl text-ink mt-1">
                {loc.name}
              </h1>
              <div className="flex items-center gap-2 mt-2 text-ink-soft">
                <MapPin className="h-4 w-4" />
                <span className="font-mono text-sm">
                  {loc.latitude?.toFixed(4)}°, {loc.longitude?.toFixed(4)}°
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-script text-2xl text-ink">
                {media.length}
              </div>
              <div className="text-xs uppercase tracking-widest text-ink-soft">
                memories
              </div>
            </div>
          </div>
        </div>

        {media.length === 0 ? (
          <div className="text-center py-16 text-ink-soft font-script text-2xl">
            No memories yet for this place
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {media.map((m) => (
              <div
                key={m.id}
                className="break-inside-avoid parchment-card rounded-xl overflow-hidden group"
              >
                {m.type === "video" ? (
                  <video src={m.url} controls className="w-full block" />
                ) : (
                  <img
                    src={m.url}
                    alt={m.caption ?? loc.name}
                    loading="lazy"
                    className="w-full block group-hover:scale-[1.02] transition-transform duration-500"
                  />
                )}
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
        )}
      </main>
    </div>
  );
}
