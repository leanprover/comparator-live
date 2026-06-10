export const challengeExamples = Object.fromEntries(
  [
    {
      label: "There Are Infinitely Many Primes",
      contents: `
def IsPrime (n : Nat) := 1 < n ∧ ∀ k, 1 < k → k < n → ¬ k ∣ n

theorem InfinitudeOfPrimes : ∀ n, ∃ p > n, IsPrime p := by
  sorry`,
    },
    {
      label: "Finite Ramsey theorem for graphs",
      contents: `
import Mathlib

open SimpleGraph

theorem finite_graph_ramsey_theorem :
    ∀ r s : ℕ, 2 ≤ r → 2 ≤ s → ∃ n : ℕ, ∀ G : SimpleGraph (Fin n), ¬ G.CliqueFree r ∨ ¬ Gᶜ.CliqueFree s := by
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
