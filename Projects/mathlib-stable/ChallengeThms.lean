import Lean
open Lean


def main : IO UInt32 := do
  initSearchPath (← findSysroot)
  let env ← importModules
    #[{ module := `Challenge, importAll := true}]
    {} (leakEnv := true) (loadExts := false)
  let moduleIdx := env.getModuleIdx? `Challenge |>.get!
  let moduleData := env.header.moduleData[moduleIdx]!
  let theorems := moduleData.constants
    |>.filterMap (fun const =>
      if let .thmInfo _ := const then
        .some const
      else
        .none)
    |>.map (·.name)
  println! s!"{ToJson.toJson theorems}"

  return 0
