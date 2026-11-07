param([string]$Address)
[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding
$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
public static class BudsSocket {
 static System.Collections.Concurrent.ConcurrentQueue<string> commands=new System.Collections.Concurrent.ConcurrentQueue<string>();
 public static bool InputClosed=false;
 public static void StartInput(){var t=new System.Threading.Thread(()=>{string line;while((line=Console.ReadLine())!=null)commands.Enqueue(line);InputClosed=true;});t.IsBackground=true;t.Start();}
 public static string Next(){string line;return commands.TryDequeue(out line)?line:null;}
 [DllImport("Ws2_32.dll")] static extern int WSAStartup(ushort v, IntPtr data);
 [DllImport("Ws2_32.dll")] static extern IntPtr socket(int af,int type,int protocol);
 [DllImport("Ws2_32.dll")] static extern int connect(IntPtr s,byte[] address,int length);
 [DllImport("Ws2_32.dll")] static extern int recv(IntPtr s,byte[] b,int length,int flags);
 [DllImport("Ws2_32.dll")] static extern int send(IntPtr s,byte[] b,int length,int flags);
 [DllImport("Ws2_32.dll")] static extern int setsockopt(IntPtr s,int level,int option,ref int value,int len);
 [DllImport("Ws2_32.dll")] static extern int closesocket(IntPtr s);
 [DllImport("Ws2_32.dll")] static extern int WSAGetLastError();
 static IntPtr handle=new IntPtr(-1);
 public static void Open(string mac){
  IntPtr data=Marshal.AllocHGlobal(512);try {if(WSAStartup(0x202,data)!=0)throw new Exception("WSAStartup");}finally{Marshal.FreeHGlobal(data);}
  handle=socket(32,1,3);if(handle==new IntPtr(-1))throw new Exception("socket: "+WSAGetLastError());
  byte[] a=new byte[30];a[0]=32;Array.Copy(BitConverter.GetBytes(Convert.ToUInt64(mac,16)),0,a,2,8);
  Array.Copy(new Guid("2e73a4ad-332d-41fc-90e2-16bef06523f2").ToByteArray(),0,a,10,16);
  if(connect(handle,a,a.Length)!=0){int e=WSAGetLastError();Close();throw new Exception("connect: "+e);}
  int timeout=700;setsockopt(handle,65535,4102,ref timeout,4);
 }
 public static byte[] Read(){byte[] b=new byte[4096];int n=recv(handle,b,b.Length,0);if(n==0)throw new Exception("Bluetooth desconectado");if(n<0){int e=WSAGetLastError();if(e==10060)return new byte[0];throw new Exception("recv: "+e);}Array.Resize(ref b,n);return b;}
 public static void Write(byte[] b){int offset=0;while(offset<b.Length){byte[] part=new byte[b.Length-offset];Array.Copy(b,offset,part,0,part.Length);int n=send(handle,part,part.Length,0);if(n<=0)throw new Exception("send: "+WSAGetLastError());offset+=n;}}
 public static void Close(){if(handle!=new IntPtr(-1)){closesocket(handle);handle=new IntPtr(-1);}}
}
'@
try {
 [BudsSocket]::Open($Address)
 [Console]::Out.WriteLine('{"type":"connected"}')
 [BudsSocket]::StartInput()
 while($true){
  $line=[BudsSocket]::Next()
  if($null -ne $line){
   $command=$line | ConvertFrom-Json
   if($command.hex){[BudsSocket]::Write([byte[]]($command.hex -split '-' | ForEach-Object {[Convert]::ToByte($_,16)}))}
  }
  if([BudsSocket]::InputClosed){break}
  $bytes=[BudsSocket]::Read()
  if($bytes.Length){[Console]::Out.WriteLine('{"type":"data","hex":"'+[BitConverter]::ToString($bytes)+'"}')}
 }
} catch {[Console]::Out.WriteLine((@{type='error';error=$_.Exception.Message}|ConvertTo-Json -Compress))} finally {[BudsSocket]::Close()}
