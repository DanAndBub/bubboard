'use client';

export default function ConflictScannerView() {
  return (
    <div className="max-w-[960px] mx-auto">
      <h1 className="text-xl font-semibold text-[#e2e8f0] mb-4">Conflict Scanner</h1>
      <p className="text-sm text-[#94a3b8] leading-relaxed mb-3">
        Scans your bootstrap files for contradicting instructions — places where one file says
        &quot;always ask before acting&quot; and another says &quot;be resourceful, figure it
        out.&quot; Pattern-matching catches structural conflicts.
      </p>
      <p className="text-sm text-[#94a3b8] leading-relaxed mb-8">
        A future Pro tier adds LLM-powered semantic scanning for subtle intent conflicts.
      </p>
      <p className="text-xs text-[#506880]">This feature is in development.</p>
    </div>
  );
}
