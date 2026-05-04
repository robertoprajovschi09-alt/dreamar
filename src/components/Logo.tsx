export function Logo({ size = "md", showText = true }: { size?: "sm" | "md" | "lg"; showText?: boolean }) {
  const px = size === "sm" ? 24 : size === "lg" ? 40 : 32;
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="rounded-md bg-gradient-accent shadow-glow flex items-center justify-center font-mono font-bold text-accent-foreground"
        style={{ width: px, height: px, fontSize: px * 0.5 }}
      >
        A
      </div>
      {showText && (
        <div className="leading-none">
          <div className="font-bold tracking-tight" style={{ fontSize: size === "sm" ? 14 : 16 }}>
            AgencyOS<span className="text-accent">.</span>AI
          </div>
          {size !== "sm" && <div className="text-[10px] text-muted-foreground tracking-widest mt-0.5">PREMIUM AGENCY OS</div>}
        </div>
      )}
    </div>
  );
}
