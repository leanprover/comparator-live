-- https://github.com/google-deepmind/formal-conjectures/blob/main/FormalConjectures/Wikipedia/CollatzConjecture.lean
import Mathlib

def collatzStep (n : ℕ) : ℕ :=
  if Even n then n / 2 else 3 * n + 1

theorem collatz_conjecture (n : ℕ) (hn : n > 0) :
  ∃ m, collatzStep^[m] n = 1 := by
  sorry
