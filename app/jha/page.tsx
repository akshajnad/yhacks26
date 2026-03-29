import StackedPanels from "@/components/ui/stacked-panels-cursor-intereactive-component";

export default function JhaPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-4 sm:p-24">
      <div className="w-full max-w-5xl">
        <StackedPanels />
      </div>
    </main>
  );
}
