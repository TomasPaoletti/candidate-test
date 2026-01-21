interface CategoryTime {
  [category: string]: number; // min
}

interface CategoryData {
  category: string;
  minutes: number;
  hours: number;
}

/**
 * Transforma el objeto de tiempo por categoria en un array
 * adecuado para el grafico de barras
 */
export function transformCategoryData(
  timeByCategory: CategoryTime,
): CategoryData[] {
  return Object.entries(timeByCategory)
    .map(([category, minutes]) => ({
      category,
      minutes,
      hours: Math.floor(minutes / 60),
    }))
    .filter((item) => item.minutes > 0)
    .sort((a, b) => b.minutes - a.minutes);
}
