export const challengeExamples = Object.fromEntries(
  [
    {
      label: "Infinitely Many Primes",
      contents: `
def IsPrime (n : Nat) := 1 < n ∧ ∀ k, 1 < k → k < n → ¬ k ∣ n

theorem InfinitudeOfPrimes : ∀ n, ∃ p > n, IsPrime p := by
  sorry`,
    },
    {
      label: "Collatz Conjecture",
      contents: `
import Mathlib

def collatzStep (n : ℕ) : ℕ :=
  if Even n then n / 2 else 3 * n + 1

theorem collatz_conjecture (n : ℕ) (hn : n > 0) :
  ∃ m, collatzStep^[m] n = 1 := by
  sorry`,
    },
    {
      label: "Trivial (prove True)",
      contents: `
theorem triv : True := by
  sorry`,
    },
    {
      label: "Inconsistency (prove False)",
      contents: `
theorem inconsistent : False := by
  sorry`,
    },
  ].map((ex, i) => [`${i}`, ex]),
);
