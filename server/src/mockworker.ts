import type { VerifyResult } from "@comparator/shared";

/**
 * Mock responses. These will always be sound — we won't report validity for
 * any invalid proof — but most valid proofs will return mock failure.
 */
export function doMockWork(challenge: string, solution: string): VerifyResult {
  for (const can of CANNED_RESPONSES) {
    if (
      (challenge.trim() === "" || // An empty challenge imposes no constraints
        (typeof can[0] === "string" && challenge.trim() === can[0].trim()) ||
        (typeof can[0] === "object" && challenge.trim().match(can[0]))) &&
      ((typeof can[1] === "string" && solution.trim() === can[1].trim()) ||
        (typeof can[1] === "object" && solution.trim().match(can[1])))
    ) {
      return { type: "verification-ok", theoremNames: challenge.trim() === "" ? [] : can[2] };
    }
  }
  return { type: "verification-failed", description: "Mock Failure", output: "Mock Output" };
}

/** A number of canned responses that we can resolve correctly. */
const CANNED_RESPONSES: [string | RegExp, string | RegExp, string[]][] = [
  [
    /^theorem\s+triv\s*:\s*True\s*:=\s*by\s+sorry$/,
    /^theorem\s+triv\s*:\s*True\s*:=\s*True.intro$/,
    ["triv"],
  ],
  [
    `macro "theorem " id:ident ":" _ty:term ":=" _pf:term : command =>
  \`(theorem $id : True := True.intro)

theorem amazing : False := by sorry`,
    `macro "theorem " id:ident ":" _ty:term ":=" _pf:term : command =>
  \`(theorem $id : True := True.intro)

theorem amazing : False :=
  bogus ai generated nonsense`,
    ["amazing"],
  ],
  [
    `def IsPrime (n : Nat) := 1 < n ∧ ∀ k, 1 < k → k < n → ¬ k ∣ n

theorem InfinitudeOfPrimes : ∀ n, ∃ p > n, IsPrime p := by
  sorry`,
    `/-- A prime is a number larger than 1 with no trivial divisors -/
def IsPrime (n : Nat) := 1 < n ∧ ∀ k, 1 < k → k < n → ¬ k ∣ n

/-- Every number larger than 1 has a prime factor -/
theorem exists_prime_factor :
    ∀ n, 1 < n → ∃ k, IsPrime k ∧ k ∣ n := by
  intro n h1
  -- Either \`n\` is prime...
  by_cases hprime : IsPrime n
  · grind [Nat.dvd_refl]
  -- ... or it has a non-trivial divisor with a prime factor
  · obtain ⟨k, _⟩ : ∃ k, 1 < k ∧ k < n ∧ k ∣ n := by
      simp_all [IsPrime]
    obtain ⟨p, _, _⟩ := exists_prime_factor k (by grind)
    grind [Nat.dvd_trans]

/-- The factorial, defined recursively, with custom notation -/
def factorial : Nat → Nat
  | 0 => 1
  | n+1 => (n + 1) * factorial n
notation:10000 n "!" => factorial n

/-- The factorial is always positive -/
theorem factorial_pos : ∀ n, 0 < n ! := by
  intro n; induction n <;> grind [factorial]

/-- ... and divided by its constituent factors -/
theorem dvd_factorial : ∀ n, ∀ k ≤ n, 0 < k → k ∣ n ! := by
  intro n; induction n <;>
    grind [Nat.dvd_mul_right, Nat.dvd_mul_left_of_dvd, factorial]

/--
We show that we find arbitrary large (and thus infinitely
many) prime numbers, by picking an arbitrary number \`n\`
and showing that \`n! + 1\` has a prime factor larger than \`n\`.
-/
theorem InfinitudeOfPrimes : ∀ n, ∃ p > n, IsPrime p := by
  intro n
  have : 1 < n ! + 1 := by grind [factorial_pos]
  obtain ⟨p, hp, _⟩ := exists_prime_factor (n ! + 1) this
  suffices ¬p ≤ n by grind
  intro (_ : p ≤ n)
  have : 1 < p := hp.1
  have : p ∣ n ! := dvd_factorial n p ‹p ≤ n› (by grind)
  have := Nat.dvd_sub ‹p ∣ n ! + 1› ‹p ∣ n !›
  grind [Nat.add_sub_cancel_left, Nat.dvd_one]`,
    ["InfinitudeOfPrimes"],
  ],
];
