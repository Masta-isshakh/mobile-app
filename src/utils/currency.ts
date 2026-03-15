const qarFormatter = new Intl.NumberFormat('en-QA', {
  style: 'currency',
  currency: 'QAR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatQar(amount: number) {
  return qarFormatter.format(Number.isFinite(amount) ? amount : 0);
}
