// algorithms.js
//
// Milestone Three (Algorithms & Data Structures):
// I implemented merge sort to make the sorting logic explicit rather than relying on Array.sort.
// Merge sort uses divide-and-conquer and provides consistent O(n log n) time complexity.
//
// This file stayed the same for Milestone Four because the database changes
// are separate from the sorting algorithm enhancement.

/**
 * Sorts an array using merge sort and a comparison function.
 * Returns a new array (does not mutate the original).
 */
export function mergeSort(arr, compare) {
  if (!Array.isArray(arr)) throw new TypeError("mergeSort expects an array.");
  if (typeof compare !== "function") throw new TypeError("mergeSort expects a compare function.");
  if (arr.length <= 1) return arr;

  const mid = Math.floor(arr.length / 2);
  const left = mergeSort(arr.slice(0, mid), compare);
  const right = mergeSort(arr.slice(mid), compare);

  return merge(left, right, compare);
}

/**
 * Merges two sorted halves into one sorted result.
 * This is where the ordering is preserved.
 */
function merge(left, right, compare) {
  const result = [];
  let i = 0;
  let j = 0;

  while (i < left.length && j < right.length) {
    if (compare(left[i], right[j]) <= 0) {
      result.push(left[i]);
      i += 1;
    } else {
      result.push(right[j]);
      j += 1;
    }
  }

  while (i < left.length) {
    result.push(left[i]);
    i += 1;
  }

  while (j < right.length) {
    result.push(right[j]);
    j += 1;
  }

  return result;
}
