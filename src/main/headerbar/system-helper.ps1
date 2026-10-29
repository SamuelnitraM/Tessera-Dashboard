# Aide système de Tessera (widgets Média, Son et Système de la barre des pages).
# Lancée par Tessera (src/main/headerbar/helper.ts) ; une requête JSON par ligne sur l'entrée
# standard, une réponse JSON par ligne sur la sortie. S'arrête quand Tessera ferme l'entrée.
#   media.get / media.thumb / media.command  : lecture en cours (contrôles multimédias de Windows)
#   audio.get / audio.volume / audio.mute / audio.default : sortie et entrée audio (Core Audio)
#   cpu.get : charge du processeur ; net.get : octets reçus et envoyés depuis le démarrage
#   procs.top : programmes les plus gourmands (processeur ou mémoire)
#   sessions.list / sessions.set : volume par programme ; procs.under : programmes lancés d'un dossier

$ErrorActionPreference = 'Stop'
[Console]::InputEncoding = [Text.Encoding]::UTF8
[Console]::OutputEncoding = [Text.Encoding]::UTF8

Add-Type -ReferencedAssemblies System.Management -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Net.NetworkInformation;
using System.Runtime.InteropServices;

namespace Tessera {
  [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class MMDeviceEnumerator {}
  [ComImport, Guid("870AF99C-171D-4F9E-AF0D-E63DF40C2BC9")] class PolicyConfigClient {}

  [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices);
    [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
    [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string id, out IMMDevice device);
  }

  [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceCollection {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int Item(int index, out IMMDevice device);
  }

  [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object iface);
    [PreserveSig] int OpenPropertyStore(int access, out IPropertyStore store);
    [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
  }

  [StructLayout(LayoutKind.Sequential)] struct PropertyKey { public Guid fmtid; public int pid; }

  [StructLayout(LayoutKind.Explicit)] struct PropVariant {
    [FieldOffset(0)] public short vt;
    [FieldOffset(8)] public IntPtr pointer;
    [FieldOffset(16)] public long padding;
  }

  [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPropertyStore {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int GetAt(int index, out PropertyKey key);
    [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant value);
  }

  [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioEndpointVolume {
    [PreserveSig] int RegisterControlChangeNotify(IntPtr notify);
    [PreserveSig] int UnregisterControlChangeNotify(IntPtr notify);
    [PreserveSig] int GetChannelCount(out int count);
    [PreserveSig] int SetMasterVolumeLevel(float level, ref Guid context);
    [PreserveSig] int SetMasterVolumeLevelScalar(float level, ref Guid context);
    [PreserveSig] int GetMasterVolumeLevel(out float level);
    [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
    [PreserveSig] int SetChannelVolumeLevel(int channel, float level, ref Guid context);
    [PreserveSig] int SetChannelVolumeLevelScalar(int channel, float level, ref Guid context);
    [PreserveSig] int GetChannelVolumeLevel(int channel, out float level);
    [PreserveSig] int GetChannelVolumeLevelScalar(int channel, out float level);
    [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context);
    [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
  }

  // Interface non documentée de Windows (utilisée aussi par le panneau Son) pour choisir le
  // périphérique par défaut ; stable depuis Windows 7
  [ComImport, Guid("F8679F50-850A-41CF-9C72-430F290290C8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IPolicyConfig {
    [PreserveSig] int GetMixFormat(string id, IntPtr format);
    [PreserveSig] int GetDeviceFormat(string id, bool defaultFormat, IntPtr format);
    [PreserveSig] int ResetDeviceFormat(string id);
    [PreserveSig] int SetDeviceFormat(string id, IntPtr endpointFormat, IntPtr mixFormat);
    [PreserveSig] int GetProcessingPeriod(string id, bool defaultPeriod, IntPtr defaultPeriodValue, IntPtr minimumPeriod);
    [PreserveSig] int SetProcessingPeriod(string id, IntPtr period);
    [PreserveSig] int GetShareMode(string id, IntPtr mode);
    [PreserveSig] int SetShareMode(string id, IntPtr mode);
    [PreserveSig] int GetPropertyValue(string id, bool fxStore, IntPtr key, IntPtr value);
    [PreserveSig] int SetPropertyValue(string id, bool fxStore, IntPtr key, IntPtr value);
    [PreserveSig] int SetDefaultEndpoint([MarshalAs(UnmanagedType.LPWStr)] string id, int role);
    [PreserveSig] int SetEndpointVisibility(string id, bool visible);
  }

  public class Device { public string id; public string name; public bool isDefault; }

  public class Endpoint {
    public List<Device> devices = new List<Device>();
    public object volume;
    public bool muted;
  }

  public static class Audio {
    const int ACTIVE = 1;
    static readonly PropertyKey FriendlyName = new PropertyKey { fmtid = new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"), pid = 14 };

    static IMMDeviceEnumerator Enumerator() { return (IMMDeviceEnumerator)new MMDeviceEnumerator(); }

    static string DefaultId(IMMDeviceEnumerator enumerator, int flow) {
      IMMDevice device;
      if (enumerator.GetDefaultAudioEndpoint(flow, 0, out device) != 0 || device == null) return null;
      string id;
      device.GetId(out id);
      return id;
    }

    static IAudioEndpointVolume Volume(IMMDevice device) {
      object iface;
      Guid iid = typeof(IAudioEndpointVolume).GUID;
      Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out iface));
      return (IAudioEndpointVolume)iface;
    }

    /// <summary>flow : 0 = sortie, 1 = entrée.</summary>
    public static Endpoint Get(int flow) {
      var result = new Endpoint();
      var enumerator = Enumerator();
      string defaultId = DefaultId(enumerator, flow);
      IMMDeviceCollection collection;
      Marshal.ThrowExceptionForHR(enumerator.EnumAudioEndpoints(flow, ACTIVE, out collection));
      int count;
      collection.GetCount(out count);
      for (int i = 0; i < count; i++) {
        IMMDevice device;
        if (collection.Item(i, out device) != 0) continue;
        string id;
        device.GetId(out id);
        string name = id;
        IPropertyStore store;
        if (device.OpenPropertyStore(0, out store) == 0) {
          PropertyKey key = FriendlyName;
          PropVariant value;
          if (store.GetValue(ref key, out value) == 0 && value.vt == 31) name = Marshal.PtrToStringUni(value.pointer);
        }
        bool isDefault = id == defaultId;
        result.devices.Add(new Device { id = id, name = name, isDefault = isDefault });
        if (isDefault) {
          var volume = Volume(device);
          float level;
          bool muted;
          volume.GetMasterVolumeLevelScalar(out level);
          volume.GetMute(out muted);
          result.volume = (int)Math.Round(level * 100);
          result.muted = muted;
        }
      }
      return result;
    }

    static IAudioEndpointVolume DefaultVolume(int flow) {
      IMMDevice device;
      Marshal.ThrowExceptionForHR(Enumerator().GetDefaultAudioEndpoint(flow, 0, out device));
      return Volume(device);
    }

    public static void SetVolume(int flow, int percent) {
      Guid context = Guid.Empty;
      float level = Math.Max(0, Math.Min(100, percent)) / 100f;
      Marshal.ThrowExceptionForHR(DefaultVolume(flow).SetMasterVolumeLevelScalar(level, ref context));
    }

    public static void SetMute(int flow, bool muted) {
      Guid context = Guid.Empty;
      Marshal.ThrowExceptionForHR(DefaultVolume(flow).SetMute(muted, ref context));
    }

    /// <summary>Périphérique par défaut pour tous les usages (console, multimédia, communications).</summary>
    public static void SetDefault(string id) {
      IMMDevice device;
      Marshal.ThrowExceptionForHR(Enumerator().GetDevice(id, out device));
      var policy = (IPolicyConfig)new PolicyConfigClient();
      for (int role = 0; role < 3; role++) Marshal.ThrowExceptionForHR(policy.SetDefaultEndpoint(id, role));
    }
  }

  // ---------- Sessions audio par programme (volume d'un jeu) ----------

  [ComImport, Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 {
    [PreserveSig] int GetAudioSessionControl(IntPtr sessionGuid, int flags, out IntPtr control);
    [PreserveSig] int GetSimpleAudioVolume(IntPtr sessionGuid, int flags, out IntPtr volume);
    [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator sessions);
  }

  [ComImport, Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionEnumerator {
    [PreserveSig] int GetCount(out int count);
    [PreserveSig] int GetSession(int index, [MarshalAs(UnmanagedType.IUnknown)] out object session);
  }

  [ComImport, Guid("bfb7ff88-7239-4fc9-8fa2-07c950be9c6d"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl2 {
    [PreserveSig] int GetState(out int state);
    [PreserveSig] int GetDisplayName(IntPtr name);
    [PreserveSig] int SetDisplayName(IntPtr name, ref Guid context);
    [PreserveSig] int GetIconPath(IntPtr path);
    [PreserveSig] int SetIconPath(IntPtr path, ref Guid context);
    [PreserveSig] int GetGroupingParam(out Guid param);
    [PreserveSig] int SetGroupingParam(ref Guid param, ref Guid context);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr client);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr client);
    [PreserveSig] int GetSessionIdentifier(IntPtr id);
    [PreserveSig] int GetSessionInstanceIdentifier(IntPtr id);
    [PreserveSig] int GetProcessId(out int pid);
  }

  // Volume par canal de la session (l'interface « simple » n'est pas exposée par ces sessions)
  [ComImport, Guid("1C158861-B533-4B30-B1CF-E853E51C59B8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IChannelAudioVolume {
    [PreserveSig] int GetChannelCount(out int count);
    [PreserveSig] int SetChannelVolume(int index, float level, ref Guid context);
    [PreserveSig] int GetChannelVolume(int index, out float level);
  }

  // Niveau du son joué par la session (crête), pour ne montrer que les programmes qui en jouent
  [ComImport, Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioMeterInformation {
    [PreserveSig] int GetPeakValue(out float peak);
  }

  public class AppSession { public int pid; public int volume; }

  /// <summary>Session d'un programme : volume, flux ouvert (`active`), niveau du son, programme.</summary>
  public class AudibleSession {
    public int pid; public int volume; public bool active; public float peak;
    public string path; public string description;
  }

  public static class Sessions {
    static List<object> All() {
      var result = new List<object>();
      var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
      IMMDevice device;
      if (enumerator.GetDefaultAudioEndpoint(0, 0, out device) != 0 || device == null) return result;
      object iface;
      Guid iid = typeof(IAudioSessionManager2).GUID;
      if (device.Activate(ref iid, 23, IntPtr.Zero, out iface) != 0) return result;
      IAudioSessionEnumerator sessions;
      if (((IAudioSessionManager2)iface).GetSessionEnumerator(out sessions) != 0) return result;
      int count;
      sessions.GetCount(out count);
      for (int i = 0; i < count; i++) {
        object session;
        if (sessions.GetSession(i, out session) == 0 && session != null) result.Add(session);
      }
      return result;
    }

    static int VolumeOf(IChannelAudioVolume channels) {
      int count;
      if (channels.GetChannelCount(out count) != 0 || count == 0) return 100;
      float max = 0;
      for (int c = 0; c < count; c++) {
        float level;
        if (channels.GetChannelVolume(c, out level) == 0) max = Math.Max(max, level);
      }
      return (int)Math.Round(max * 100);
    }

    public static List<AppSession> List() {
      var list = new List<AppSession>();
      foreach (var session in All()) {
        int pid;
        if (((IAudioSessionControl2)session).GetProcessId(out pid) != 0 || pid == 0) continue;
        list.Add(new AppSession { pid = pid, volume = VolumeOf((IChannelAudioVolume)session) });
      }
      return list;
    }

    static readonly Dictionary<string, string> descriptions = new Dictionary<string, string>();

    /// <summary>Sessions des programmes sur la sortie par défaut, avec leur niveau de son.</summary>
    public static List<AudibleSession> Audible() {
      var list = new List<AudibleSession>();
      foreach (var session in All()) {
        var control = (IAudioSessionControl2)session;
        int pid, state;
        if (control.GetProcessId(out pid) != 0 || pid == 0) continue;
        if (control.GetState(out state) != 0) state = 0;
        float peak = 0;
        var meter = session as IAudioMeterInformation;
        if (meter == null || meter.GetPeakValue(out peak) != 0) peak = 0;
        string path = Procs.PathOf(pid);
        string description = null;
        if (path != null && !descriptions.TryGetValue(path, out description)) {
          try { description = System.Diagnostics.FileVersionInfo.GetVersionInfo(path).FileDescription; } catch { }
          descriptions[path] = description;
        }
        list.Add(new AudibleSession {
          pid = pid, volume = VolumeOf((IChannelAudioVolume)session), active = state == 1,
          peak = peak, path = path, description = description
        });
      }
      return list;
    }

    /// <summary>Volume (0 à 100) de toutes les sessions de ces programmes, sur tous les canaux.</summary>
    public static void Set(int[] pids, int volume) {
      Guid context = Guid.Empty;
      float level = Math.Max(0, Math.Min(100, volume)) / 100f;
      foreach (var session in All()) {
        int pid;
        if (((IAudioSessionControl2)session).GetProcessId(out pid) != 0) continue;
        if (Array.IndexOf(pids, pid) < 0) continue;
        var channels = (IChannelAudioVolume)session;
        int count;
        if (channels.GetChannelCount(out count) != 0) continue;
        for (int c = 0; c < count; c++) channels.SetChannelVolume(c, level, ref context);
      }
    }
  }

  // ---------- Programmes lancés depuis un dossier (jeu en cours) ----------

  public static class Procs {
    [DllImport("kernel32.dll")] static extern IntPtr OpenProcess(int access, bool inherit, int pid);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode)] static extern bool QueryFullProcessImageName(IntPtr process, int flags, System.Text.StringBuilder name, ref int size);

    public static string PathOf(int pid) {
      IntPtr handle = OpenProcess(0x1000, false, pid);
      if (handle == IntPtr.Zero) return null;
      try {
        var name = new System.Text.StringBuilder(1024);
        int size = name.Capacity;
        return QueryFullProcessImageName(handle, 0, name, ref size) ? name.ToString() : null;
      } finally {
        CloseHandle(handle);
      }
    }

    /// <summary>Programmes dont l'exécutable est dans un des dossiers : [pid, chemin].</summary>
    public static List<object[]> Under(string[] folders) {
      var result = new List<object[]>();
      foreach (var process in System.Diagnostics.Process.GetProcesses()) {
        string path = PathOf(process.Id);
        if (path == null) continue;
        foreach (var folder in folders) {
          if (path.StartsWith(folder.TrimEnd('\\') + "\\", StringComparison.OrdinalIgnoreCase)) {
            result.Add(new object[] { process.Id, path });
            break;
          }
        }
      }
      return result;
    }
  }

  // ---------- Programmes : nom, chemin et ligne de commande (module Services locaux) ----------

  public class ProcInfo { public int pid; public string name; public string path; public string command; }

  public static class ProcInfos {
    public static List<ProcInfo> Of(int[] pids) {
      var result = new List<ProcInfo>();
      if (pids.Length == 0) return result;
      var filter = string.Join(" OR ", Array.ConvertAll(pids, pid => "ProcessId = " + pid));
      using (var searcher = new System.Management.ManagementObjectSearcher(
        "SELECT ProcessId, Name, ExecutablePath, CommandLine FROM Win32_Process WHERE " + filter)) {
        foreach (System.Management.ManagementObject item in searcher.Get()) {
          result.Add(new ProcInfo {
            pid = Convert.ToInt32(item["ProcessId"]),
            name = item["Name"] as string,
            path = item["ExecutablePath"] as string,
            command = item["CommandLine"] as string
          });
        }
      }
      return result;
    }
  }

  // Charge du processeur comme le Gestionnaire des tâches (« % Processor Utility », qui tient
  // compte de la fréquence réelle ; le temps processeur classique sous-estime beaucoup)
  public static class Cpu {
    static PerformanceCounter counter;
    public static double Usage() {
      if (counter == null) {
        counter = new PerformanceCounter("Processor Information", "% Processor Utility", "_Total");
        counter.NextValue();
        System.Threading.Thread.Sleep(250);
      }
      return Math.Round(Math.Min(100, counter.NextValue()));
    }
  }

  // ---------- Programmes les plus gourmands (bloc Système agrandi) ----------
  // Processeur : temps consommé depuis la mesure précédente, par programme (onglets d'un
  // navigateur regroupés) ; mémoire : ensemble de travail.

  public class TopProc { public string name; public double cpu; public long memory; public int count; }

  public static class TopProcs {
    static Dictionary<int, double> previous = new Dictionary<int, double>();
    static DateTime previousAt = DateTime.MinValue;

    public static List<TopProc> Get(bool byMemory, int limit) {
      var now = DateTime.UtcNow;
      double elapsed = previousAt == DateTime.MinValue ? 0 : (now - previousAt).TotalMilliseconds;
      var current = new Dictionary<int, double>();
      var groups = new Dictionary<string, TopProc>(StringComparer.OrdinalIgnoreCase);
      int cores = Environment.ProcessorCount;
      foreach (var process in Process.GetProcesses()) {
        try {
          if (process.Id == 0) continue;
          double cpu = 0;
          try {
            double time = process.TotalProcessorTime.TotalMilliseconds;
            current[process.Id] = time;
            double before;
            if (elapsed > 0 && previous.TryGetValue(process.Id, out before)) {
              cpu = Math.Max(0, (time - before) / elapsed / cores * 100);
            }
          } catch { }
          TopProc group;
          if (!groups.TryGetValue(process.ProcessName, out group)) {
            group = new TopProc { name = process.ProcessName };
            groups[process.ProcessName] = group;
          }
          group.cpu += cpu;
          group.memory += process.WorkingSet64;
          group.count++;
        } catch { } finally { process.Dispose(); }
      }
      previous = current;
      previousAt = now;
      var list = new List<TopProc>(groups.Values);
      foreach (var item in list) item.cpu = Math.Round(Math.Min(100, item.cpu), 1);
      if (byMemory) list.Sort((a, b) => b.memory.CompareTo(a.memory));
      else list.Sort((a, b) => b.cpu != a.cpu ? b.cpu.CompareTo(a.cpu) : b.memory.CompareTo(a.memory));
      return list.Count > limit ? list.GetRange(0, limit) : list;
    }
  }

  public static class Network {
    public static long[] Totals() {
      long received = 0, sent = 0;
      foreach (var adapter in NetworkInterface.GetAllNetworkInterfaces()) {
        if (adapter.OperationalStatus != OperationalStatus.Up) continue;
        if (adapter.NetworkInterfaceType == NetworkInterfaceType.Loopback || adapter.NetworkInterfaceType == NetworkInterfaceType.Tunnel) continue;
        var stats = adapter.GetIPStatistics();
        received += stats.BytesReceived;
        sent += stats.BytesSent;
      }
      return new long[] { received, sent };
    }
  }
}
'@

# ---------- Contrôles multimédias de Windows (WinRT) ----------

$script:manager = $null
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = [System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
  $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation`1'
} | Select-Object -First 1

function Await($operation, [Type]$type) {
  $task = $asTask.MakeGenericMethod($type).Invoke($null, @($operation))
  if (-not $task.Wait(5000)) { throw 'timeout' }
  $task.Result
}

function Get-Manager {
  if ($null -eq $script:manager) {
    [Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager, Windows.Media.Control, ContentType = WindowsRuntime] | Out-Null
    $script:manager = Await ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager])
  }
  $script:manager
}

# Session affichée : celle que Windows met en avant, sinon une qui joue, sinon la première
function Get-Session {
  $manager = Get-Manager
  $current = $manager.GetCurrentSession()
  if ($null -ne $current) { return $current }
  $sessions = @($manager.GetSessions())
  $playing = $sessions | Where-Object { $_.GetPlaybackInfo().PlaybackStatus -eq 'Playing' } | Select-Object -First 1
  if ($null -ne $playing) { return $playing }
  $sessions | Select-Object -First 1
}

function Get-Media {
  $session = Get-Session
  if ($null -eq $session) { return $null }
  $properties = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  $info = $session.GetPlaybackInfo()
  @{
    app         = [string]$session.SourceAppUserModelId
    title       = [string]$properties.Title
    artist      = [string]$properties.Artist
    album       = [string]$properties.AlbumTitle
    playing     = [string]$info.PlaybackStatus -eq 'Playing'
    canPrevious = [bool]$info.Controls.IsPreviousEnabled
    canNext     = [bool]$info.Controls.IsNextEnabled
    hasThumb    = $null -ne $properties.Thumbnail
  }
}

function Get-Thumbnail {
  $session = Get-Session
  if ($null -eq $session) { return $null }
  $properties = Await ($session.TryGetMediaPropertiesAsync()) ([Windows.Media.Control.GlobalSystemMediaTransportControlsSessionMediaProperties])
  if ($null -eq $properties.Thumbnail) { return $null }
  $stream = Await ($properties.Thumbnail.OpenReadAsync()) ([Windows.Storage.Streams.IRandomAccessStreamWithContentType])
  # PowerShell ne voit pas les interfaces WinRT du flux : appels par réflexion
  $type = [Windows.Storage.Streams.IContentTypeProvider].GetProperty('ContentType').GetValue($stream)
  $read = [System.IO.WindowsRuntimeStreamExtensions].GetMethod('AsStreamForRead', [Type[]]@([Windows.Storage.Streams.IInputStream]))
  $source = $read.Invoke($null, @($stream))
  try {
    $memory = New-Object System.IO.MemoryStream
    $source.CopyTo($memory)
    if ($memory.Length -eq 0 -or $memory.Length -gt 2MB) { return $null }
    @{ type = [string]$type; data = [Convert]::ToBase64String($memory.ToArray()) }
  } finally {
    $source.Dispose()
  }
}

function Invoke-MediaCommand([string]$action) {
  $session = Get-Session
  if ($null -eq $session) { return $false }
  $operation = switch ($action) {
    'play-pause' { $session.TryTogglePlayPauseAsync() }
    'next' { $session.TrySkipNextAsync() }
    'previous' { $session.TrySkipPreviousAsync() }
    default { throw "unknown action $action" }
  }
  Await $operation ([bool])
}

# ---------- Boucle des requêtes ----------

function Invoke-Request($request) {
  $params = $request.args
  switch ($request.cmd) {
    'media.get' { Get-Media }
    'media.thumb' { Get-Thumbnail }
    'media.command' { Invoke-MediaCommand $params.action }
    'audio.get' { @{ output = [Tessera.Audio]::Get(0); input = [Tessera.Audio]::Get(1) } }
    'audio.volume' { [Tessera.Audio]::SetVolume([int]($params.flow -eq 'input'), [int]$params.value); $true }
    'audio.mute' { [Tessera.Audio]::SetMute([int]($params.flow -eq 'input'), [bool]$params.value); $true }
    'audio.default' { [Tessera.Audio]::SetDefault([string]$params.id); $true }
    # Listes dans un objet : PowerShell déroulerait une liste d'un seul élément
    'sessions.list' { @{ items = [Tessera.Sessions]::List().ToArray() } }
    'sessions.audible' { @{ items = [Tessera.Sessions]::Audible().ToArray() } }
    'sessions.set' { [Tessera.Sessions]::Set([int[]]@($params.pids), [int]$params.volume); $true }
    'procs.under' { @{ items = [Tessera.Procs]::Under([string[]]@($params.folders)).ToArray() } }
    'procs.info' { @{ items = [Tessera.ProcInfos]::Of([int[]]@($params.pids)).ToArray() } }
    'cpu.get' { [Tessera.Cpu]::Usage() }
    'procs.top' { @{ items = [Tessera.TopProcs]::Get([bool]($params.sort -eq 'memory'), [int]$params.limit).ToArray() } }
    'net.get' { $totals = [Tessera.Network]::Totals(); @{ received = $totals[0]; sent = $totals[1] } }
    default { throw "unknown command $($request.cmd)" }
  }
}

[Console]::Out.WriteLine('{"ready":true}')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($null -eq $line) { break }
  if ($line.Trim() -eq '') { continue }
  $id = $null
  try {
    $request = $line | ConvertFrom-Json
    $id = $request.id
    $result = Invoke-Request $request
    $response = @{ id = $id; ok = $true; data = $result }
  } catch {
    $response = @{ id = $id; ok = $false; error = [string]$_.Exception.Message }
  }
  [Console]::Out.WriteLine(($response | ConvertTo-Json -Compress -Depth 6))
}
