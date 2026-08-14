/**
 * The five places a lot's pieces can be, in flow order.
 *
 * Shared by the Grey table's progress bar and the lot type-ahead on the issue
 * forms, so a stage always means the same colour wherever it appears.
 *
 * The class names are written out in full on purpose: Tailwind finds classes by
 * scanning source text, so anything assembled at runtime would be purged from
 * the build.
 *
 * Note the opacity values. An arbitrary colour folds any alpha into the hex
 * (`bg-[#448aff]/15` works), but a named theme colour resolves its modifier
 * against the opacity scale, so `bg-navy/12` compiles to nothing at all and the
 * row would come out unstyled. Keep named-colour tints on a scale step.
 */
export const LOT_STAGES = [
  { key: 'inGrey', label: 'In grey', bar: 'bg-[#c8c7c5]', tint: 'bg-[#c8c7c5]/30' },
  { key: 'atEmbroidery', label: 'At embroidery', bar: 'bg-[#448aff]', tint: 'bg-[#448aff]/15' },
  {
    key: 'awaitingHandwork',
    label: 'Back, awaiting handwork',
    bar: 'bg-[#97d0c3]',
    tint: 'bg-[#97d0c3]/35',
  },
  { key: 'atHandwork', label: 'At handwork', bar: 'bg-[#006fff]', tint: 'bg-[#006fff]/15' },
  { key: 'completed', label: 'Completed', bar: 'bg-navy', tint: 'bg-navy/10' },
];

/**
 * How far the lot has got as a whole: the earliest stage that still holds
 * pieces. A lot split across stages reads as the furthest-back one, so it never
 * looks more finished than it is. Null when nothing is recorded against it.
 */
export function currentStage(stages) {
  if (!stages) return null;
  return LOT_STAGES.find((stage) => Number(stages[stage.key] ?? 0) > 0) ?? null;
}
