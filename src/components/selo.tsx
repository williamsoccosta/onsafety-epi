type SeloVariant = "ok" | "off" | "alert";

const VARIANT_CLASS: Record<SeloVariant, string> = {
  ok: "selo selo--ok",
  off: "selo selo--off",
  alert: "selo selo--alert",
};

export function Selo({ variant, children }: { variant: SeloVariant; children: React.ReactNode }) {
  return <span className={VARIANT_CLASS[variant]}>{children}</span>;
}

export function SeloBotao({
  variant,
  children,
  action,
}: {
  variant: SeloVariant;
  children: React.ReactNode;
  action: () => Promise<void>;
}) {
  return (
    <form action={action} className="selo-btn inline-block">
      <button type="submit" className="selo-btn">
        <Selo variant={variant}>{children}</Selo>
      </button>
    </form>
  );
}
