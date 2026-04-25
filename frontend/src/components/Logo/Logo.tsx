import "./logo.css";
import pastilleMenus from "../../assets/logo/pastille-menus.png";

interface LogoProps {
  /** "menu" = pistache (Bizarre OS Menus) */
  product?: "menu";
  /** Diamètre de la pastille en px */
  size?: number;
  /** Active la rotation (surfaces héros ≥ 48 px seulement) */
  animated?: boolean;
  /** Affiche le wordmark complet à côté de la pastille */
  withWordmark?: boolean;
  /** Tagline affichée sous "Bizarre OS" */
  tagline?: string;
  /** Le fond est sombre (ajoute hairline interne) */
  dark?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Pastille({ size = 32, animated, dark, product = "menu" }: Pick<LogoProps, "size" | "animated" | "dark" | "product">) {
  const isAnimated = animated && size >= 48;
  const src = product === "menu" ? pastilleMenus : pastilleMenus;

  return (
    <span
      className={[
        "bz-disc",
        isAnimated ? "bz-disc--animated" : "",
        dark ? "bz-disc--dark" : "",
      ].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    >
      <img src={src} alt="Bizarre OS" draggable={false} />
    </span>
  );
}

export function Logo({
  product = "menu",
  size = 32,
  animated = false,
  withWordmark = true,
  tagline,
  dark = false,
  className,
  style,
}: LogoProps) {
  const resolvedTagline = tagline ?? (product === "menu" ? "/ Menus" : "/ Menus");
  const nameFontSize = Math.max(10, Math.round(size * 0.35));
  const taglineFontSize = Math.max(9, Math.round(size * 0.27));
  const showWordmark = withWordmark && size >= 14;

  return (
    <span className={["bz-logo", className].filter(Boolean).join(" ")} style={style}>
      <Pastille size={size} animated={animated} dark={dark} product={product} />
      {showWordmark && (
        <span className="bz-wordmark" style={{ maxWidth: 160 }}>
          <span className="bz-name" style={{ fontSize: nameFontSize }}>
            Bizarre OS
          </span>
          <span className="bz-tagline" style={{ fontSize: taglineFontSize }}>
            {resolvedTagline}
          </span>
        </span>
      )}
    </span>
  );
}
