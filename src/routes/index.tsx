import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Compass, MapPin, Sparkles, Globe } from "lucide-react";
import { Header } from "@/components/Header";
import { WorldMap, type MapMarker } from "@/components/WorldMap";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wanderful Journeys — Follow Our Adventures" },
      {
        name: "description",
        content:
          "A cinematic travel gallery — photos, videos, and journal entries from adventures around the world. Free to explore.",
      },
    ],
  }),
  component: Landing,
});

const SAMPLE: MapMarker[] = [
  { id: "1", name: "Paris", lat: 48.85, lng: 2.35, icon: "🗼" },
  { id: "2", name: "Pisa", lat: 43.72, lng: 10.4, icon: "🏛️" },
  { id: "3", name: "Cairo", lat: 30.04, lng: 31.23, icon: "🐫" },
  { id: "4", name: "Kyoto", lat: 35.01, lng: 135.77, icon: "⛩️" },
  { id: "5", name: "Cusco", lat: -13.53, lng: -71.97, icon: "🏔️" },
];

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  // Logged-in users go straight to their atlas
  useEffect(() => {
    if (!loading && user) navigate({ to: "/atlas" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-7xl px-6 pt-12 pb-24">
        <section className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-parchment-deep/40 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-ink-soft">
              <Sparkles className="h-3.5 w-3.5 text-gold" />A Life of Adventure
            </div>
            <h1 className="mt-6 text-5xl md:text-6xl lg:text-7xl font-display text-ink leading-[1.05] text-balance">
              Follow Our
              <br />
              <span className="text-rust font-bold">ADVENTURES</span>
            </h1>
            <p className="mt-6 text-lg text-ink-soft max-w-xl text-balance font-script text-2xl">
              We have created a map to chart our travels and share them with all
              of you. Galleries, videos, and journal entries — all free to
              explore.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button
                asChild
                size="lg"
                className="bg-ink text-parchment hover:bg-ink/90 h-12 px-8 text-base"
              >
                <Link to="/explore">
                  <Globe className="h-5 w-5 mr-2" />
                  Explore the Map
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 px-8 text-base border-ink/30 hover:bg-parchment-deep/50"
              >
                <a href="#how">How it works</a>
              </Button>
            </div>
            <div className="mt-12 flex gap-8 text-sm text-ink-soft">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-rust" />
                Pin every destination
              </div>
              <div className="flex items-center gap-2">
                <Compass className="h-4 w-4 text-rust" />
                Free to explore
              </div>
            </div>
          </div>

          <div
            className="relative animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            <div className="absolute -inset-4 bg-gradient-to-br from-gold/20 via-transparent to-rust/20 blur-2xl" />
            <div className="relative">
              <WorldMap markers={SAMPLE} className="shadow-map" />
              <div className="absolute -top-3 -left-3 bg-parchment-deep border border-ink/30 px-3 py-1 font-script text-lg text-ink rotate-[-4deg] shadow-md">
                ✦ A traveler's atlas ✦
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="mt-32">
          <h2 className="text-center text-4xl font-display text-ink mb-3">
            What you'll find here
          </h2>
          <p className="text-center text-ink-soft mb-16 font-script text-xl">
            Photos, films, and stories from every corner of the world
          </p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: MapPin,
                title: "An explorer's map",
                desc: "Every journey pinned on a hand-drawn map. Click any destination to open the full gallery.",
              },
              {
                icon: Globe,
                title: "Photos & videos",
                desc: "Unfiltered moments from the road. Browse the full media gallery for each destination.",
              },
              {
                icon: Compass,
                title: "The journal",
                desc: "Field notes and stories written from the road — an Indiana Jones–style travel journal.",
              },
            ].map((step, i) => (
              <div
                key={i}
                className="parchment-card rounded-2xl p-8 animate-fade-up"
                style={{ animationDelay: `${0.1 * i}s` }}
              >
                <div className="h-12 w-12 rounded-full bg-ink/5 border border-ink/20 flex items-center justify-center mb-5">
                  <step.icon className="h-6 w-6 text-rust" />
                </div>
                <h3 className="text-xl font-display text-ink mb-2">
                  {step.title}
                </h3>
                <p className="text-ink-soft leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-ink/10 py-8 text-center text-sm text-ink-soft font-script text-base">
        ✦ Made for travelers, by travelers ✦
      </footer>
    </div>
  );
}
