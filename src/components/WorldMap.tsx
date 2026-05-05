import { useMemo } from "react";
import worldMapImg from "@/assets/world-map.png";

export type MapMarker = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  icon?: string;
  thumbnail?: string;
};

type Props = {
  markers?: MapMarker[];
  onMarkerClick?: (m: MapMarker) => void;
  onMapClick?: (lat: number, lng: number) => void;
  showRoutes?: boolean;
  className?: string;
};

const W = 1536;
const H = 1024;

// The parchment map is roughly equirectangular but the drawn world occupies
// only a sub-region of the image (margins + ocean borders). These ratios are
// tuned to the supplied artwork so markers land on the correct landmass.
const MAP_BOX = {
  left: 0.035, // x where 180°W sits
  right: 0.965, // x where 180°E sits
  top: 0.045, // y where 90°N sits
  bottom: 0.955, // y where 90°S sits
};

function project(lat: number, lng: number) {
  const xRatio =
    MAP_BOX.left + ((lng + 180) / 360) * (MAP_BOX.right - MAP_BOX.left);
  const yRatio =
    MAP_BOX.top + ((90 - lat) / 180) * (MAP_BOX.bottom - MAP_BOX.top);
  return { x: xRatio * W, y: yRatio * H };
}

function unproject(x: number, y: number) {
  const xRatio = x / W;
  const yRatio = y / H;
  const lng =
    ((xRatio - MAP_BOX.left) / (MAP_BOX.right - MAP_BOX.left)) * 360 - 180;
  const lat =
    90 - ((yRatio - MAP_BOX.top) / (MAP_BOX.bottom - MAP_BOX.top)) * 180;
  return { lat, lng };
}

export function WorldMap({
  markers = [],
  onMarkerClick,
  onMapClick,
  showRoutes = true,
  className,
}: Props) {
  const points = useMemo(
    () => markers.map((m) => ({ ...m, ...project(m.lat, m.lng) })),
    [markers],
  );

  const pathD = useMemo(() => {
    if (!showRoutes || points.length < 2) return "";
    return points
      .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
      .join(" ");
  }, [points, showRoutes]);

  function handleSvgClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!onMapClick) return;
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const y = ((e.clientY - rect.top) / rect.height) * H;
    const { lat, lng } = unproject(x, y);
    onMapClick(lat, lng);
  }

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl shadow-2xl ${className ?? ""}`}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className={`w-full h-auto block ${onMapClick ? "cursor-crosshair" : ""}`}
        xmlns="http://www.w3.org/2000/svg"
        onClick={handleSvgClick}
      >
        <image
          href={worldMapImg}
          x="0"
          y="0"
          width={W}
          height={H}
          preserveAspectRatio="none"
        />

        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke="oklch(0.52 0.16 35)"
            strokeWidth="3"
            strokeDasharray="8 6"
            opacity="0.85"
          />
        )}

        {points.map((p) => (
          <g
            key={p.id}
            transform={`translate(${p.x}, ${p.y})`}
            className="cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onMarkerClick?.(p);
            }}
          >
            <circle r="18" fill="oklch(0.52 0.16 35 / 0.25)" />
            <circle
              r="9"
              fill="oklch(0.52 0.16 35)"
              stroke="oklch(0.96 0.03 75)"
              strokeWidth="3"
            />
            <text
              y="-20"
              textAnchor="middle"
              fontFamily="Cinzel, serif"
              fontSize="18"
              fill="oklch(0.20 0.04 40)"
              fontWeight="700"
              style={{
                paintOrder: "stroke",
                stroke: "oklch(0.96 0.03 75)",
                strokeWidth: 4,
              }}
            >
              {p.icon ? `${p.icon} ${p.name}` : p.name}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
