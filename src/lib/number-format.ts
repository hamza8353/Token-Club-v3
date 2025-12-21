/**
 * Formats a number to remove trailing zeros after decimal point
 * Examples:
 * - 100.000 -> "100"
 * - 100.200 -> "100.2"
 * - 100.234 -> "100.234"
 * - 1000000.000 -> "1000000"
 */
export function formatNumberWithoutTrailingZeros(value: number | string): string {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '';
  }
  
  // Convert to string and remove trailing zeros
  return numValue.toString().replace(/\.?0+$/, '');
}

/**
 * Formats a number for display, removing trailing zeros and adding thousand separators
 */
export function formatNumberForDisplay(value: number | string, decimals?: number): string {
  if (value === '' || value === null || value === undefined) {
    return '0';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '0';
  }
  
  // If decimals specified, format with that precision first
  if (decimals !== undefined) {
    const formatted = numValue.toFixed(decimals);
    return formatted.replace(/\.?0+$/, '');
  }
  
  // Otherwise, use the number as-is and remove trailing zeros
  return numValue.toString().replace(/\.?0+$/, '');
}

/**
 * Formats a number with thousand separators and removes trailing zeros
 */
export function formatNumberWithCommas(value: number | string): string {
  if (value === '' || value === null || value === undefined) {
    return '';
  }
  
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(numValue)) {
    return '';
  }
  
  // Use toLocaleString for proper formatting with commas
  // This handles large numbers correctly
  // Use maximumFractionDigits to preserve decimal places if needed
  const formatted = numValue.toLocaleString('en-US', {
    maximumFractionDigits: 20, // Allow many decimal places
    minimumFractionDigits: 0,
    useGrouping: true
  });
  
  // Remove trailing zeros after decimal point, but keep the number intact
  // Only remove if there's a decimal point
  if (formatted.includes('.')) {
    return formatted.replace(/\.?0+$/, '');
  }
  
  return formatted;
}

