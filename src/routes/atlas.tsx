import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { Plus, Loader2, BookOpen, Search, Trash2, Filter } from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { WorldMap, type MapMarker } from "@/components/WorldMap";
import { UploadDialog } from "@/components/UploadDialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/atlas")({
  head: () => ({ meta: [{ title: "My Atlas — Atlas Traveler" }] }),
  component: AtlasPage,
});

type Album = { id: string; title: string; description: string | null };
type Loc = {
  id: string;
  album_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
  cover_image_url: string | null;
  notes: string | null;
};

function AtlasPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [locations, setLocations] = useState<Loc[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<string | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [newAlbumOpen, setNewAlbumOpen] = useState(false);
  const [albumTitle, setAlbumTitle] = useState("");
  const [albumDesc, setAlbumDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "mapped" | "unmapped">("all");
  const [confirmAlbum, setConfirmAlbum] = useState<Album | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/login" });
  }, [user, loading, navigate]);

  const refresh = useCallback(async () => {
    if (!user) return;
    setDataLoading(true);
    const [{ data: a }, { data: l }] = await Promise.all([
      supabase
        .from("albums")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase.from("locations").select("*"),
    ]);
    setAlbums(a ?? []);
    setLocations(l ?? []);
    if (a && a.length > 0 && !activeAlbum) setActiveAlbum(a[0].id);
    setDataLoading(false);
  }, [user, activeAlbum]);

  useEffect(() => {
    if (user) refresh();
  }, [user, refresh]);

  async function createAlbum(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !albumTitle.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("albums")
      .insert({
        user_id: user.id,
        title: albumTitle.trim(),
        description: albumDesc.trim() || null,
        visibility: "public",
      })
      .select()
      .single();
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`"${data.title}" added to your atlas`);
    setAlbumTitle("");
    setAlbumDesc("");
    setNewAlbumOpen(false);
    setActiveAlbum(data.id);
    refresh();
  }

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-rust" />
      </div>
    );
  }

  const albumLocs = activeAlbum
    ? locations.filter((l) => l.album_id === activeAlbum)
    : [];
  const q = search.trim().toLowerCase();
  const visibleLocs = albumLocs.filter((l) => {
    if (
      q &&
      !(
        l.name.toLowerCase().includes(q) ||
        (l.notes ?? "").toLowerCase().includes(q)
      )
    )
      return false;
    if (filter === "mapped" && (l.latitude == null || l.longitude == null))
      return false;
    if (filter === "unmapped" && l.latitude != null && l.longitude != null)
      return false;
    return true;
  });
  const mappedLocs = visibleLocs.filter(
    (l) => l.latitude != null && l.longitude != null,
  );
  const unmappedLocs = visibleLocs.filter(
    (l) => l.latitude == null || l.longitude == null,
  );
  const markers: MapMarker[] = mappedLocs.map((l) => ({
    id: l.id,
    name: l.name,
    lat: l.latitude as number,
    lng: l.longitude as number,
    thumbnail: l.cover_image_url ?? undefined,
  }));

  async function deleteAlbum(album: Album) {
    try {
      const { data: locs } = await supabase
        .from("locations")
        .select("id")
        .eq("album_id", album.id);
      const locIds = (locs ?? []).map((l) => l.id);
      if (locIds.length) {
        const { data: meds } = await supabase
          .from("media")
          .select("storage_path")
          .in("location_id", locIds);
        const paths = (meds ?? []).map((m) => m.storage_path);
        if (paths.length) await supabase.storage.from("media").remove(paths);
        await supabase.from("media").delete().in("location_id", locIds);
        await supabase.from("locations").delete().eq("album_id", album.id);
      }
      const { error } = await supabase
        .from("albums")
        .delete()
        .eq("id", album.id);
      if (error) throw error;
      toast.success(`"${album.title}" removed`);
      if (activeAlbum === album.id) setActiveAlbum(null);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setConfirmAlbum(null);
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-4xl text-ink">My Atlas</h1>
            <p className="font-script text-xl text-ink-soft mt-1">
              Every adventure, charted
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setNewAlbumOpen(true)}
              variant="outline"
              className="border-ink/30 hover:bg-parchment-deep/50"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Trip
            </Button>
            {activeAlbum && (
              <Button
                onClick={() => setUploadOpen(true)}
                className="bg-ink text-parchment hover:bg-ink/90"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Location
              </Button>
            )}
          </div>
        </div>

        {albums.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {albums.map((a) => (
              <div
                key={a.id}
                className={`group inline-flex items-center rounded-full border transition-all ${activeAlbum === a.id ? "bg-ink text-parchment border-ink" : "border-ink/30 text-ink hover:bg-parchment-deep/40"}`}
              >
                <button
                  onClick={() => setActiveAlbum(a.id)}
                  className="px-4 py-2 font-display text-sm tracking-wide"
                >
                  {a.title}
                </button>
                <button
                  onClick={() => setConfirmAlbum(a)}
                  title="Delete trip"
                  className={`pr-3 pl-1 opacity-0 group-hover:opacity-100 transition-opacity ${activeAlbum === a.id ? "text-parchment/80 hover:text-parchment" : "text-rust hover:text-rust"}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {albums.length > 0 && activeAlbum && (
          <div className="flex flex-wrap gap-2 mb-6 items-center">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search chapters & journal entries..."
                className="pl-9 bg-parchment-deep/30 border-ink/20"
              />
            </div>
            <div className="flex items-center gap-1 text-xs">
              <Filter className="h-3.5 w-3.5 text-ink-soft mr-1" />
              {(["all", "mapped", "unmapped"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-full border font-display capitalize transition-all ${filter === f ? "bg-ink text-parchment border-ink" : "border-ink/30 text-ink hover:bg-parchment-deep/40"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        )}

        {dataLoading ? (
          <div className="text-center py-24 text-ink-soft">
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          </div>
        ) : albums.length === 0 ? (
          <div className="parchment-card rounded-2xl p-16 text-center">
            <BookOpen className="h-12 w-12 mx-auto text-rust mb-4" />
            <h2 className="font-display text-2xl text-ink mb-2">
              Your first journey awaits
            </h2>
            <p className="text-ink-soft mb-6 font-script text-lg">
              Create a trip to start charting memories on the map.
            </p>
            <Button
              onClick={() => setNewAlbumOpen(true)}
              className="bg-ink text-parchment hover:bg-ink/90"
            >
              <Plus className="h-4 w-4 mr-1" />
              Create your first trip
            </Button>
          </div>
        ) : (
          <>
            <WorldMap
              markers={markers}
              showRoutes
              onMarkerClick={(m) =>
                navigate({
                  to: "/location/$locationId",
                  params: { locationId: m.id },
                })
              }
            />

            {unmappedLocs.length > 0 && (
              <div className="mt-6 parchment-card rounded-xl p-4">
                <div className="font-script text-lg text-ink-soft mb-2">
                  📜 Unmapped chapters
                </div>
                <div className="flex flex-wrap gap-2">
                  {unmappedLocs.map((l) => (
                    <Link
                      key={l.id}
                      to="/location/$locationId"
                      params={{ locationId: l.id }}
                      className="px-3 py-1.5 rounded-full text-sm border border-ink/30 text-ink hover:bg-parchment-deep/40 font-display"
                    >
                      {l.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {visibleLocs.length > 0 && (
              <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {visibleLocs.map((l) => (
                  <Link
                    key={l.id}
                    to="/location/$locationId"
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
                        <div className="w-full h-full flex items-center justify-center text-ink-soft text-4xl">
                          📍
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-display text-lg text-ink">
                        {l.name}
                      </h3>
                      <p className="text-xs text-ink-soft">
                        {l.latitude?.toFixed(2)}°, {l.longitude?.toFixed(2)}°
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {visibleLocs.length === 0 && (
              <div className="text-center py-12 text-ink-soft">
                <p className="font-script text-2xl">
                  No locations yet — add your first memory!
                </p>
              </div>
            )}
          </>
        )}
      </main>

      {activeAlbum && (
        <UploadDialog
          open={uploadOpen}
          onOpenChange={setUploadOpen}
          albumId={activeAlbum}
          knownLocations={locations}
          knownAlbums={albums}
          onUploaded={refresh}
          onSwitchAlbum={setActiveAlbum}
        />
      )}

      <AlertDialog
        open={!!confirmAlbum}
        onOpenChange={(v) => !v && setConfirmAlbum(null)}
      >
        <AlertDialogContent className="bg-parchment border-ink/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-ink">
              Delete "{confirmAlbum?.title}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the trip and all of its chapters and memories.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmAlbum && deleteAlbum(confirmAlbum)}
              className="bg-rust text-parchment hover:bg-rust/90"
            >
              Delete trip
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={newAlbumOpen} onOpenChange={setNewAlbumOpen}>
        <DialogContent className="bg-parchment border-ink/20">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-ink">
              A new journey
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={createAlbum} className="space-y-4">
            <div>
              <Label>Trip name</Label>
              <Input
                value={albumTitle}
                onChange={(e) => setAlbumTitle(e.target.value)}
                placeholder="Italy 2024"
                required
                className="bg-parchment-deep/30 border-ink/20"
              />
            </div>
            <div>
              <Label>Story (optional)</Label>
              <Textarea
                value={albumDesc}
                onChange={(e) => setAlbumDesc(e.target.value)}
                placeholder="Two weeks across Tuscany..."
                className="bg-parchment-deep/30 border-ink/20"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full bg-ink text-parchment hover:bg-ink/90"
            >
              Begin
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
