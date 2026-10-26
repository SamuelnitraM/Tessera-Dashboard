/** Module Terminal : shells disponibles sur le PC. */
export interface TerminalShell {
  /** `pwsh`, `powershell`, `cmd`, `bash` (Git Bash) ou `wsl`. */
  id: string
  name: string
}
