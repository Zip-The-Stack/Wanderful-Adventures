import { useEffect, useMemo, useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import exifr from "exifr";
import { Upload, X, Loader2, MapPin, Navigation, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import {
  reverseGeocode,
  formatLocationLabel,
  haversineKm,
  getCurrentPosition,
} from "@/lib/geo";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { WorldMap } from "@/components/WorldMap";

export type KnownLocation = {
  id: string;
  album_id: string;
  name: string;
  latitude: number | null;
  longitude: number | null;
};

export type KnownAlbum = { id: string; title: string };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  albumId: string;
  /** Other locations across the user's atlas — used for smart album suggestions. */
  knownLocations?: KnownLocation[];
  /** Albums the user owns — needed to surface album titles in suggestions. */
  knownAlbums?: KnownAlbum[];
  onUploaded?: () => void;
  /** Called when user accepts a smart album suggestion (parent switches active album). */
  onSwitchAlbum?: (albumId: string) => void;
};

type Pending = {
  file: File;
  lat?: number;
  lng?: number;
  taken?: string;
  preview: string;
  status: "idle" | "uploading" | "done" | "error";
};

const SUGGEST_THRESHOLD_KM = 50;

export function UploadDialog({
  open,
  onOpenChange,
  albumId,
  knownLocations = [],
  knownAlbums = [],
  onUploaded,
  onSwitchAlbum,
}: Props) {
  const { user } = useAuth();
  const [files, setFiles] = useState<Pending[]>([]);
  const [locationName, setLocationName] = useState("");
  const [notes, setNotes] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [skipGps, setSkipGps] = useState(false);
  const [busy, setBusy] = useState(false);
  const [geoBusy, setGeoBusy] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoLabel, setGeoLabel] = useState<string | null>(null);
  const [autoFilledName, setAutoFilledName] = useState(false);
  const [suggestion, setSuggestion] = useState<{
    location: KnownLocation;
    albumTitle: string;
    distanceKm: number;
  } | null>(null);
  const geoAbort = useRef<AbortController | null>(null);

  // ─── Smart album suggestion: when coords change, find the nearest existing location
  useEffect(() => {
    if (!coords || knownLocations.length === 0) {
      setSuggestion(null);
      return;
    }
    let nearest: { loc: KnownLocation; distanceKm: number } | null = null;
    for (const loc of knownLocations) {
      if (loc.latitude == null || loc.longitude == null) continue;
      if (loc.album_id === albumId) continue; // already in current album
      const d = haversineKm(
        coords.lat,
        coords.lng,
        loc.latitude,
        loc.longitude,
      );
      if (d <= SUGGEST_THRESHOLD_KM && (!nearest || d < nearest.distanceKm)) {
        nearest = { loc, distanceKm: d };
      }
    }
    if (nearest) {
      const album = knownAlbums.find((a) => a.id === nearest!.loc.album_id);
      setSuggestion({
        location: nearest.loc,
        albumTitle: album?.title ?? "another trip",
        distanceKm: nearest.distanceKm,
      });
    } else {
      setSuggestion(null);
    }
  }, [coords, knownLocations, knownAlbums, albumId]);

  // ─── Reverse geocode + auto-fill name when coords arrive
  useEffect(() => {
    if (!coords) {
      setGeoLabel(null);
      return;
    }
    geoAbort.current?.abort();
    const ctl = new AbortController();
    geoAbort.current = ctl;
    setGeoBusy(true);
    reverseGeocode(coords.lat, coords.lng, ctl.signal)
      .then((geo) => {
        if (ctl.signal.aborted) return;
        const label = formatLocationLabel(geo);
        setGeoLabel(label || null);
        // Only auto-fill if user hasn't typed anything yet.
        if (!locationName.trim() && geo.city) {
          setLocationName(geo.city);
          setAutoFilledName(true);
        }
      })
      .finally(() => {
        if (!ctl.signal.aborted) setGeoBusy(false);
      });
    return () => ctl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng]);

  const totalProgress = useMemo(() => {
    if (files.length === 0) return 0;
    const done = files.filter((f) => f.status === "done").length;
    return Math.round((done / files.length) * 100);
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "image/*": [], "video/*": [] },
    onDrop: async (accepted) => {
      const enriched: Pending[] = await Promise.all(
        accepted.map(async (f) => {
          let lat: number | undefined,
            lng: number | undefined,
            taken: string | undefined;
          try {
            const exif = await exifr.parse(f, { gps: true });
            if (exif?.latitude) lat = exif.latitude;
            if (exif?.longitude) lng = exif.longitude;
            if (exif?.DateTimeOriginal)
              taken = new Date(exif.DateTimeOriginal).toISOString();
          } catch {
            /* iOS strips EXIF on upload — that's fine, fallbacks handle it */
          }
          return {
            file: f,
            lat,
            lng,
            taken,
            preview: URL.createObjectURL(f),
            status: "idle" as const,
          };
        }),
      );
      setFiles((prev) => {
        const next = [...prev, ...enriched];
        if (!coords) {
          const found = next.find((p) => p.lat != null && p.lng != null);
          if (found) setCoords({ lat: found.lat!, lng: found.lng! });
        }
        return next;
      });
    },
  });

  /** iOS Safari fallback — get device GPS when EXIF GPS is missing. */
  async function useCurrentLocation() {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setCoords(pos);
      setSkipGps(false);
      toast.success("Got your current location");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Couldn't get your location";
      toast.error(msg);
    } finally {
      setLocating(false);
    }
  }

  function reset() {
    files.forEach((f) => URL.revokeObjectURL(f.preview));
    setFiles([]);
    setLocationName("");
    setNotes("");
    setCoords(null);
    setSkipGps(false);
    setGeoLabel(null);
    setSuggestion(null);
    setAutoFilledName(false);
  }

  async function handleUpload(targetAlbumId: string = albumId) {
    if (!user || files.length === 0 || !locationName.trim()) {
      toast.error("Add a location name and at least one photo.");
      return;
    }
    if (!coords && !skipGps) {
      toast.error("Pin a location on the map, or mark as 'no location'.");
      return;
    }

    setBusy(true);
    try {
      const { data: loc, error: locErr } = await supabase
        .from("locations")
        .insert({
          album_id: targetAlbumId,
          user_id: user.id,
          name: locationName.trim(),
          latitude: coords?.lat ?? null,
          longitude: coords?.lng ?? null,
          notes: notes.trim() || null,
        })
        .select()
        .single();
      if (locErr) throw locErr;

      let coverPath: string | null = null;
      for (let i = 0; i < files.length; i++) {
        const p = files[i];
        setFiles((prev) =>
          prev.map((f, j) => (j === i ? { ...f, status: "uploading" } : f)),
        );

        const ext = p.file.name.split(".").pop();
        const path = `${user.id}/${loc.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("media")
          .upload(path, p.file);
        if (upErr) {
          setFiles((prev) =>
            prev.map((f, j) => (j === i ? { ...f, status: "error" } : f)),
          );
          throw upErr;
        }
        const { error: mediaErr } = await supabase.from("media").insert({
          location_id: loc.id,
          user_id: user.id,
          storage_path: path,
          type: p.file.type.startsWith("video") ? "video" : "image",
          taken_at: p.taken,
          latitude: p.lat,
          longitude: p.lng,
        });
        if (mediaErr) {
          setFiles((prev) =>
            prev.map((f, j) => (j === i ? { ...f, status: "error" } : f)),
          );
          throw mediaErr;
        }
        if (!coverPath) coverPath = path;
        setFiles((prev) =>
          prev.map((f, j) => (j === i ? { ...f, status: "done" } : f)),
        );
      }

      if (coverPath) {
        const { data: signed } = await supabase.storage
          .from("media")
          .createSignedUrl(coverPath, 60 * 60 * 24 * 365);
        if (signed?.signedUrl) {
          await supabase
            .from("locations")
            .update({ cover_image_url: signed.signedUrl })
            .eq("id", loc.id);
        }
      }

      toast.success(`Added ${files.length} memories to ${locationName}!`);
      reset();
      onOpenChange(false);
      onUploaded?.();
      if (targetAlbumId !== albumId) onSwitchAlbum?.(targetAlbumId);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) reset();
          onOpenChange(v);
        }}
      >
        <DialogContent className="max-w-2xl bg-parchment border-ink/20 max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-ink">
              Chart a new location
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pb-20 sm:pb-0">
            <div>
              <Label htmlFor="loc-name">Location name</Label>
              <Input
                id="loc-name"
                value={locationName}
                onChange={(e) => {
                  setLocationName(e.target.value);
                  setAutoFilledName(false);
                }}
                placeholder="Leaning Tower of Pisa"
                className="bg-parchment-deep/30 border-ink/20 h-11 text-base"
              />
              {autoFilledName && geoLabel && (
                <p className="text-xs text-ink-soft mt-1 flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-gold" />
                  Auto-filled from photo · {geoLabel}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="loc-notes">Journal entry (optional)</Label>
              <Textarea
                id="loc-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="What happened here..."
                className="bg-parchment-deep/30 border-ink/20 text-base"
                rows={3}
              />
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? "border-rust bg-gold/10"
                  : "border-ink/30 hover:border-ink/50"
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="h-8 w-8 mx-auto text-ink-soft mb-2" />
              <p className="text-ink text-base">
                Drop photos & videos here, or tap to browse
              </p>
              <p className="text-xs text-ink-soft mt-1">
                EXIF GPS will be extracted automatically
              </p>
            </div>

            {files.length > 0 && (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="relative aspect-square rounded overflow-hidden border border-ink/20"
                  >
                    <img
                      src={f.preview}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={() => {
                        URL.revokeObjectURL(f.preview);
                        setFiles((p) => p.filter((_, j) => j !== i));
                      }}
                      disabled={busy}
                      className="absolute top-1 right-1 bg-ink/80 text-parchment rounded-full p-1 disabled:opacity-50"
                      aria-label="Remove photo"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    {f.lat != null && (
                      <div className="absolute bottom-0 inset-x-0 bg-rust/90 text-parchment text-[10px] py-0.5 text-center">
                        📍 GPS
                      </div>
                    )}
                    {f.status === "uploading" && (
                      <div className="absolute inset-0 bg-ink/40 flex items-center justify-center">
                        <Loader2 className="h-5 w-5 text-parchment animate-spin" />
                      </div>
                    )}
                    {f.status === "done" && (
                      <div className="absolute inset-0 bg-rust/20 flex items-center justify-center">
                        <span className="text-parchment text-2xl drop-shadow">
                          ✓
                        </span>
                      </div>
                    )}
                    {f.status === "error" && (
                      <div className="absolute inset-0 bg-red-900/50 flex items-center justify-center">
                        <span className="text-parchment text-2xl">!</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {busy && files.length > 0 && (
              <div className="space-y-1">
                <Progress value={totalProgress} className="h-2" />
                <p className="text-xs text-ink-soft text-center">
                  Uploading {files.filter((f) => f.status === "done").length} of{" "}
                  {files.length}…
                </p>
              </div>
            )}

            {files.length > 0 && (
              <div className="p-3 bg-gold/10 border border-gold/30 rounded-lg space-y-2">
                {coords ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm text-ink min-w-0 flex-1">
                      <MapPin className="h-4 w-4 text-rust flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="font-mono text-xs">
                          {coords.lat.toFixed(4)}°, {coords.lng.toFixed(4)}°
                        </div>
                        {geoBusy ? (
                          <div className="text-xs text-ink-soft flex items-center gap-1">
                            <Loader2 className="h-3 w-3 animate-spin" /> Looking
                            up place…
                          </div>
                        ) : geoLabel ? (
                          <div className="text-xs text-ink-soft truncate">
                            {geoLabel}
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setPickerOpen(true)}
                      className="border-ink/30"
                    >
                      Change pin
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <span className="text-sm text-ink-soft block">
                      No GPS in photos. iOS often strips this on upload.
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={useCurrentLocation}
                        disabled={locating}
                        className="border-ink/30"
                      >
                        {locating ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <Navigation className="h-3 w-3 mr-1" />
                        )}
                        Use current location
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setPickerOpen(true)}
                        className="border-ink/30"
                      >
                        <MapPin className="h-3 w-3 mr-1" />
                        Pick on map
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSkipGps(!skipGps)}
                        className={skipGps ? "bg-ink/10" : ""}
                      >
                        {skipGps ? "✓ No location" : "Skip location"}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {suggestion && !busy && (
              <div className="p-3 bg-rust/10 border border-rust/30 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-rust mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-ink flex-1">
                    <div className="font-display">
                      This looks like it belongs in{" "}
                      <span className="font-semibold">
                        {suggestion.albumTitle}
                      </span>
                    </div>
                    <div className="text-xs text-ink-soft mt-0.5">
                      Only {suggestion.distanceKm.toFixed(1)} km from{" "}
                      {suggestion.location.name}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleUpload(suggestion.location.album_id)}
                    className="bg-rust text-parchment hover:bg-rust/90"
                  >
                    Add to {suggestion.albumTitle}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setSuggestion(null)}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            )}

            <div className="fixed sm:static inset-x-0 bottom-0 sm:inset-auto p-4 sm:p-0 bg-parchment sm:bg-transparent border-t sm:border-t-0 border-ink/10 z-10">
              <Button
                onClick={() => handleUpload()}
                disabled={busy || files.length === 0}
                className="w-full bg-ink text-parchment hover:bg-ink/90 h-12 text-base"
              >
                {busy ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Charting…
                  </>
                ) : (
                  `Add ${files.length} memor${files.length === 1 ? "y" : "ies"}`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-4xl bg-parchment border-ink/20">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl text-ink">
              Pin your location
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-ink-soft font-script text-lg">
            Click anywhere on the map to drop a pin.
          </p>
          <WorldMap
            markers={
              coords
                ? [
                    {
                      id: "pick",
                      name: locationName || "Here",
                      lat: coords.lat,
                      lng: coords.lng,
                    },
                  ]
                : []
            }
            showRoutes={false}
            onMapClick={(lat, lng) => {
              setCoords({ lat, lng });
              setSkipGps(false);
            }}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setPickerOpen(false)}
              className="border-ink/30"
            >
              Cancel
            </Button>
            <Button
              onClick={() => setPickerOpen(false)}
              disabled={!coords}
              className="bg-ink text-parchment hover:bg-ink/90"
            >
              Confirm pin
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
