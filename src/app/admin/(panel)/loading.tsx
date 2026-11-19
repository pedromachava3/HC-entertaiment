export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center pt-24" role="status" aria-label="A carregar">
      <span className="size-10 animate-spin rounded-full border-2 border-white/10 border-t-hc-red" />
    </div>
  );
}
