export default function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-bold uppercase tracking-wider text-active-text/50 mb-3">
      {children}
    </h3>
  );
}
