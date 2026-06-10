export function Logo({ size = "md", showText = true }: { size?: "sm" | "md" | "lg"; showText?: boolean }) {
  const fontSize = size === "sm" ? 18 : size === "lg" ? 32 : 24;
  const wordmarkStyle: React.CSSProperties = {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontWeight: 900,
    letterSpacing: "-0.04em",
    lineHeight: 1,
    fontSize,
  };

  if (!showText) {
    return (
      <div className="flex items-center text-foreground lowercase" style={wordmarkStyle}>
        d<span className="text-accent">.</span>
      </div>
    );
  }

  return (
    <div className="flex items-center text-foreground lowercase select-none" style={wordmarkStyle}>
      drea<span className="text-accent">.</span>mar
    </div>
  );
}
