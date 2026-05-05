import { Link, useNavigate } from "@tanstack/react-router";
import { Compass, LogOut, Map as MapIcon, Globe } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";

export function Header() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 border-b border-ink/15 backdrop-blur-md bg-parchment/70">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2 group">
          <Compass
            className="h-6 w-6 text-rust group-hover:animate-compass"
            style={{ animationDuration: "8s" }}
          />
          <span className="font-display text-xl tracking-wide text-ink">
            Wanderful Journeys
          </span>
        </Link>
        <nav className="flex items-center gap-2">
          {/* Always visible: public explore link */}
          <Button asChild variant="ghost">
            <Link to="/explore">
              <Globe className="h-4 w-4 mr-2" />
              Explore
            </Link>
          </Button>

          {user ? (
            <>
              <Button asChild variant="ghost">
                <Link to="/atlas">
                  <MapIcon className="h-4 w-4 mr-2" />
                  My Atlas
                </Link>
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  await signOut();
                  navigate({ to: "/" });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              asChild
              variant="default"
              className="bg-ink text-parchment hover:bg-ink/90"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}
