-- https://en.wikipedia.org/wiki/Euler%27s_four-square_identity
theorem eulers_four_square_identity (a b c d p q r s : Int) :
    (a^2 + b^2 + c^2 + d^2) * (p^2 + q^2 + r^2 + s^2) =
      (a*p - b*q - c*r - d*s)^2 + (a*q + b*p + c*s - d*r)^2
      + (a*r - b*s + c*p + d*q)^2
      + (a*s + b*r - c*q + d*p)^2 := by
  sorry
