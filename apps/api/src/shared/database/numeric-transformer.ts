export const numericNumberTransformer = {
  to: (value: number): number => value,
  from: (value: string | number | null): number => {
    if (value == null) {
      return 0;
    }
    return typeof value === 'number' ? value : Number(value);
  },
};
