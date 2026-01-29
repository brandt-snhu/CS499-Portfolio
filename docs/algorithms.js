// algorithms.js
// Milestone Three (Algorithms & Data Structures)
//
// This file contains a custom merge sort implementation.
// Merge sort was selected because it has predictable performance
// with a time complexity of O(n log n) and works well for sorting
// larger datasets in a consistent way.

/**
 * Performs merge sort on an array using a provided comparison function.
 * The original array is not modified.
 *
 * @template T
 * @param {T[]} arr - The array to sort
 * @param {(a: T, b: T) => number} compare - Comparison function
 * @returns {T[]} A new sorted array
 */
export function mergeSort(arr, compare) {
  // Defensive checks to prevent misuse of the algorithm
  if (!Array.isArray(arr)) {
    throw new TypeError("mergeSort expects an array.");
  }

  if (typeof compare !== "function") {
    throw new TypeError("mergeSort expects a comparison function.");
  }

  // Base case: arrays of length 0 or 1 are already sorted
  if (arr.length <= 1) {
    return arr;
  }

  // Split the array into two halves
  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), compare);
  const right = mergeSort(arr.slice(mid), compare);

  // Merge the sorted halves back together
  return merge(left, right, compare);
}

/**
 * Merges two sorted arrays into one sorted array.
 * This function preserves ordering based on the comparison logic.
 *
 * @template T
 * @param {T[]} left
 * @param {T[]} right
 * @param {(a: T, b: T) => number} compare
 * @returns {T[]}
 */
function merge(left, right, compare) {
  const result = [];

  // Index pointers for both halves
  let i = 0;
  let j = 0;

  // Compare elements from both arrays and merge in sorted order
  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i]);
      i += 1;
    } else {
      result.push(right[j]);
      j += 1;
    }
  }

  // Append any remaining elements from the left side
  while (i < left.length) {
    result.push(left[i]);
    i += 1;
  }

  // Append any remaining elements from the right side
  while (j < right.length) {
    result.push(right[j]);
    j += 1;
  }

  return result;
}