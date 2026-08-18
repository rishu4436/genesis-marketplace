import Link from "next/link";
import { ScoreAxisList, ScorePentagon } from "@/components/ScorePentagon";
import type { ReceiptScorecard } from "@/lib/receipt-score";

export function ReceiptScorePanel({
  score,
}: {
  score: ReceiptScorecard;
}) {
  return (
    <section
      id="receipt-score"
      className="mt-8 scroll-mt-24 rounded-2xl border border-emerald-400/20 bg-white/[0.03] p-5 sm:p-6"
      aria-label="Receipt score"
    >
      <p className="section-label">Receipt score</p>
      <h2 className="mt-1 font-display text-xl font-bold tracking-tight text-white">
        Outcomes, not stars
      </h2>
      <p className="body-sm mt-1.5 max-w-xl">
        Vector from sealed hires on {score.version}. Economic quality is
        omitted — we do not invent APR. Sample {score.sampleSize} (shrunk).
      </p>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(260px,300px)_1fr] lg:items-center">
        <div className="flex flex-col items-center">
          <ScorePentagon
            axes={score.axes}
            composite={score.composite}
            size={260}
            title={score.name}
            gradientId={`receipt-${score.slug}`}
          />
        </div>
        <div className="max-w-md">
          <ScoreAxisList axes={score.axes} />
          <p className="mt-3 text-[11px] text-white/40">
            Not scored: {score.absent.join(" · ")}
          </p>
          <p className="mt-2">
            <Link
              href={`/api/score/${score.slug}`}
              className="text-[11px] text-amber-300 hover:underline"
            >
              Open machine score
            </Link>
          </p>
        </div>
      </div>
    </section>
  );
}
