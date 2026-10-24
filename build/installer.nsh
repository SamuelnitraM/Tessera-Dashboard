; Ajouts à l'installeur NSIS de Tessera Dashboard (voir electron-builder.yml).

; Désinstallation : Tessera ne se lance plus avec Windows. Pas pendant une mise à jour, qui
; désinstalle l'ancienne version avant d'installer la nouvelle.
!macro customUnInstall
  ${ifNot} ${isUpdated}
    DeleteRegValue HKCU "Software\Microsoft\Windows\CurrentVersion\Run" "Tessera Dashboard"
  ${endIf}
!macroend
