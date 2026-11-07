[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
namespace PerfectSoundAudio {
 [ComImport,Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] class Enumerator {}
 [ComImport,Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IEnum {
  [PreserveSig] int EnumAudioEndpoints(int flow,uint mask,out ICollection devices);
  [PreserveSig] int GetDefaultAudioEndpoint(int flow,int role,out IDevice device);
  [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)]string id,out IDevice device);
  [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr p);
  [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr p);
 }
 [ComImport,Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface ICollection {
  [PreserveSig] int GetCount(out uint n);[PreserveSig] int Item(uint n,out IDevice d);
 }
 [ComImport,Guid("D666063F-1587-4E43-81F1-B948E807363F"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IDevice {
  [PreserveSig] int Activate(ref Guid id,uint context,IntPtr parameters,[MarshalAs(UnmanagedType.IUnknown)]out object instance);
  [PreserveSig] int OpenPropertyStore(uint access,out IStore store);
  [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)]out string id);
  [PreserveSig] int GetState(out uint state);
 }
 [StructLayout(LayoutKind.Sequential)] struct Key {public Guid id;public uint pid;}
 [StructLayout(LayoutKind.Explicit,Size=24)] struct Variant {[FieldOffset(0)]public ushort type;[FieldOffset(8)]public IntPtr pointer;}
 [ComImport,Guid("886d8eeb-8cf2-4446-8d02-cdba1dbdcf99"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IStore {
  [PreserveSig] int GetCount(out uint n);[PreserveSig] int GetAt(uint i,out Key k);[PreserveSig] int GetValue(ref Key key,out Variant value);[PreserveSig] int SetValue(ref Key key,ref Variant value);[PreserveSig] int Commit();
 }
 [ComImport,Guid("5CDF2C82-841E-4546-9722-0CF74078229A"),InterfaceType(ComInterfaceType.InterfaceIsIUnknown)] interface IVolume {
  [PreserveSig]int RegisterControlChangeNotify(IntPtr p);[PreserveSig]int UnregisterControlChangeNotify(IntPtr p);[PreserveSig]int GetChannelCount(out uint n);
  [PreserveSig]int SetMasterVolumeLevel(float f,ref Guid c);[PreserveSig]int SetMasterVolumeLevelScalar(float f,ref Guid c);[PreserveSig]int GetMasterVolumeLevel(out float f);[PreserveSig]int GetMasterVolumeLevelScalar(out float f);
  [PreserveSig]int SetChannelVolumeLevel(uint n,float f,ref Guid c);[PreserveSig]int SetChannelVolumeLevelScalar(uint n,float f,ref Guid c);[PreserveSig]int GetChannelVolumeLevel(uint n,out float f);[PreserveSig]int GetChannelVolumeLevelScalar(uint n,out float f);
  [PreserveSig]int SetMute([MarshalAs(UnmanagedType.Bool)]bool mute,ref Guid c);[PreserveSig]int GetMute([MarshalAs(UnmanagedType.Bool)]out bool mute);
 }
 public class Endpoint {public string id;public string name;public uint state;public bool isDefault;public int? volume;public bool? muted;}
 public static class Audio {
  [DllImport("ole32.dll")]static extern int PropVariantClear(ref Variant v);
  static Guid volumeId=new Guid("5CDF2C82-841E-4546-9722-0CF74078229A");
  static void Check(int hr){Marshal.ThrowExceptionForHR(hr);}
  static IVolume Volume(IDevice device){object o;Check(device.Activate(ref volumeId,23,IntPtr.Zero,out o));return (IVolume)o;}
  public static Endpoint[] List(){var enumerator=(IEnum)new Enumerator();ICollection devices=null;IDevice defaultDevice=null;string defaultId=null;try{if(enumerator.GetDefaultAudioEndpoint(0,1,out defaultDevice)==0)defaultDevice.GetId(out defaultId);Check(enumerator.EnumAudioEndpoints(0,15,out devices));uint count;Check(devices.GetCount(out count));var result=new List<Endpoint>();for(uint i=0;i<count;i++){IDevice device=null;IStore store=null;IVolume volume=null;try{Check(devices.Item(i,out device));string id;uint state;Check(device.GetId(out id));Check(device.GetState(out state));string name=id;Check(device.OpenPropertyStore(0,out store));var key=new Key{id=new Guid("a45c254e-df1c-4efd-8020-67d146a850e0"),pid=14};Variant value;Check(store.GetValue(ref key,out value));try{if(value.type==31)name=Marshal.PtrToStringUni(value.pointer);}finally{PropVariantClear(ref value);}var item=new Endpoint{id=id,name=name,state=state,isDefault=id==defaultId};if(state==1){try{volume=Volume(device);float level;bool mute;Check(volume.GetMasterVolumeLevelScalar(out level));Check(volume.GetMute(out mute));item.volume=(int)Math.Round(level*100);item.muted=mute;}catch{}}result.Add(item);}finally{if(volume!=null)Marshal.ReleaseComObject(volume);if(store!=null)Marshal.ReleaseComObject(store);if(device!=null)Marshal.ReleaseComObject(device);}}return result.ToArray();}finally{if(defaultDevice!=null)Marshal.ReleaseComObject(defaultDevice);if(devices!=null)Marshal.ReleaseComObject(devices);Marshal.ReleaseComObject(enumerator);}}
  public static void Set(string id,int level,int mute){if(level< -1||level>100||mute< -1||mute>1)throw new ArgumentException("Invalid audio value");var enumerator=(IEnum)new Enumerator();IDevice device=null;IVolume volume=null;try{Check(enumerator.GetDevice(id,out device));uint state;Check(device.GetState(out state));if(state!=1)throw new Exception("Saida de audio indisponivel");volume=Volume(device);Guid context=Guid.Empty;if(level>=0)Check(volume.SetMasterVolumeLevelScalar(level/100f,ref context));if(mute>=0)Check(volume.SetMute(mute==1,ref context));}finally{if(volume!=null)Marshal.ReleaseComObject(volume);if(device!=null)Marshal.ReleaseComObject(device);Marshal.ReleaseComObject(enumerator);}}
 }
}
'@
try {
 $request=[Console]::In.ReadToEnd() | ConvertFrom-Json
 if($request.operation -eq 'set'){
  $level=-1; $muted=-1
  if($null -ne $request.volume){$level=[int]$request.volume}
  if($null -ne $request.muted){$muted=[int][bool]$request.muted}
  [PerfectSoundAudio.Audio]::Set([string]$request.id,$level,$muted)
 }
 @([PerfectSoundAudio.Audio]::List()) | ConvertTo-Json -Compress -Depth 4
} catch { @{error=$_.Exception.Message} | ConvertTo-Json -Compress; exit 1 }
