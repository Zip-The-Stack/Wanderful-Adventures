import {
  createFileRoute,
  Link,
  useNavigate,
  useParams,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  MapPin,
  Trash2,
  Pencil,
  Save,
  X,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/location/")({
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
  notes: string | null;
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

function LocationPage() {
  const { locationId } = useParams({ from: "/location/$locationId" });
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [loc, setLoc] = useState<Loc | null>(null);
  const [media, setMedia] = useState<MedWithUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [confirmMedia, setConfirmMedia] = useState<MedWithUrl | null>(null);
  const [confirmLocation, setConfirmLocation] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState(false);

  async function load() {
    setLoading(true);
    const { data: l } = await supabase
      .from("locations")
      .select("*")
      .eq("id", locationId)
      .maybeSingle();
    setLoc(l);
    if (l) {
      setDraftName(l.name);
      setDraftNotes(l.notes ?? "");
    }
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
    } else {
      setMedia([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (authLoading || !user) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, user, authLoading]);

  async function saveEdit() {
    if (!loc) return;
    const { error } = await supabase
      .from("locations")
      .update({ name: draftName.trim(), notes: draftNotes.trim() || null })
      .eq("id", loc.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Chapter saved");
    setEditing(false);
    load();
  }

  async function clearNotes() {
    if (!loc) return;
    const { error } = await supabase
      .from("locations")
      .update({ notes: null })
      .eq("id", loc.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Journal entry deleted");
    setConfirmNotes(false);
    load();
  }

  async function setAsCover(m: MedWithUrl) {
    if (!loc) return;
    const { data: signed } = await supabase.storage
      .from("media")
      .createSignedUrl(m.storage_path, 60 * 60 * 24 * 365);
    if (!signed?.signedUrl) {
      toast.error("Could not generate cover URL");
      return;
    }
    const { error } = await supabase
      .from("locations")
      .update({ cover_image_url: signed.signedUrl })
      .eq("id", loc.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Cover updated");
    load();
  }

  async function deleteMedia(m: MedWithUrl) {
    if (!loc) return;
    try {
      await supabase.storage.from("media").remove([m.storage_path]);
      const { error } = await supabase.from("media").delete().eq("id", m.id);
      if (error) throw error;

      const remaining = media.filter((x) => x.id !== m.id);
      setMedia(remaining);

      // If this was the cover, recalculate to the next available image
      if (
        loc.cover_image_url &&
        loc.cover_image_url.includes(m.storage_path.split("/").pop() ?? "___")
      ) {
        const nextImage = remaining.find((x) => x.type !== "video");
        if (nextImage) {
          const { data: signed } = await supabase.storage
            .from("media")
            .createSignedUrl(nextImage.storage_path, 60 * 60 * 24 * 365);
          await supabase
            .from("locations")
            .update({ cover_image_url: signed?.signedUrl ?? null })
            .eq("id", loc.id);
        } else {
          await supabase
            .from("locations")
            .update({ cover_image_url: null })
            .eq("id", loc.id);
        }
        load();
      }

      toast.success("Memory deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setConfirmMedia(null);
    }
  }

  async function deleteLocation() {
    if (!loc) return;
    try {
      const paths = media.map((m) => m.storage_path);
      if (paths.length) await supabase.storage.from("media").remove(paths);
      await supabase.from("media").delete().eq("location_id", loc.id);
      const { error } = await supabase
        .from("locations")
        .delete()
        .eq("id", loc.id);
      if (error) throw error;
      toast.success("Chapter removed");
      navigate({ to: "/atlas" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setConfirmLocation(false);
    }
  }

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

  const hasGps = loc.latitude != null && loc.longitude != null;

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
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="font-script text-xl text-rust">✦ Chapter ✦</div>
              {editing ? (
                <div className="space-y-3 mt-2">
                  <Input
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    className="font-display text-3xl bg-parchment-deep/30 border-ink/20 h-auto py-2"
                  />
                  <Textarea
                    value={draftNotes}
                    onChange={(e) => setDraftNotes(e.target.value)}
                    placeholder="Journal entry..."
                    rows={4}
                    className="bg-parchment-deep/30 border-ink/20 font-script text-lg"
                  />
                </div>
              ) : (
                <>
                  <h1 className="font-display text-5xl text-ink mt-1">
                    {loc.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-2 text-ink-soft">
                    <MapPin className="h-4 w-4" />
                    <span className="font-mono text-sm">
                      {hasGps
                        ? `${loc.latitude!.toFixed(4)}°, ${loc.longitude!.toFixed(4)}°`
                        : "Location not set"}
                    </span>
                  </div>
                  {loc.notes && (
                    <div className="mt-4 max-w-2xl">
                      <p className="font-script text-lg text-ink whitespace-pre-wrap">
                        {loc.notes}
                      </p>
                      <button
                        onClick={() => setConfirmNotes(true)}
                        className="text-xs text-rust hover:underline mt-2 inline-flex items-center gap-1"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete journal entry
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="flex flex-col items-end gap-2">
              <div className="text-right">
                <div className="font-script text-2xl text-ink">
                  {media.length}
                </div>
                <div className="text-xs uppercase tracking-widest text-ink-soft">
                  memories
                </div>
              </div>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button
                      size="sm"
                      onClick={saveEdit}
                      className="bg-ink text-parchment hover:bg-ink/90"
                    >
                      <Save className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditing(false);
                        setDraftName(loc.name);
                        setDraftNotes(loc.notes ?? "");
                      }}
                      className="border-ink/30"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditing(true)}
                      className="border-ink/30"
                    >
                      <Pencil className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmLocation(true)}
                      className="border-rust/40 text-rust hover:bg-rust/10"
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
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
            {media.map((m) => {
              const isCover = loc.cover_image_url?.includes(
                m.storage_path.split("/").pop() ?? "___",
              );
              return (
                <div
                  key={m.id}
                  className="break-inside-avoid parchment-card rounded-xl overflow-hidden group relative"
                >
                  <div className="absolute top-2 right-2 z-10 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {m.type !== "video" && (
                      <button
                        onClick={() => setAsCover(m)}
                        title="Set as cover"
                        className={`rounded-full p-1.5 ${isCover ? "bg-gold text-ink" : "bg-ink/80 hover:bg-gold hover:text-ink text-parchment"}`}
                      >
                        <Star className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => setConfirmMedia(m)}
                      title="Delete"
                      className="bg-ink/80 hover:bg-rust text-parchment rounded-full p-1.5"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
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
              );
            })}
          </div>
        )}
      </main>

      <AlertDialog
        open={!!confirmMedia}
        onOpenChange={(v) => !v && setConfirmMedia(null)}
      >
        <AlertDialogContent className="bg-parchment border-ink/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-ink">
              Delete this memory?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This image will be permanently removed from your atlas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmMedia && deleteMedia(confirmMedia)}
              className="bg-rust text-parchment hover:bg-rust/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLocation} onOpenChange={setConfirmLocation}>
        <AlertDialogContent className="bg-parchment border-ink/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-ink">
              Delete "{loc.name}"?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the chapter and all {media.length} memories. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteLocation}
              className="bg-rust text-parchment hover:bg-rust/90"
            >
              Delete chapter
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmNotes} onOpenChange={setConfirmNotes}>
        <AlertDialogContent className="bg-parchment border-ink/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-ink">
              Delete journal entry?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The written notes for this chapter will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={clearNotes}
              className="bg-rust text-parchment hover:bg-rust/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
