$ErrorActionPreference='Stop'
Add-Type -TypeDefinition @'
using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Collections.Concurrent;
public static class BudsWindows {
 [StructLayout(LayoutKind.Sequential)] struct POINT {public int x,y;}
 [StructLayout(LayoutKind.Sequential)] struct MSG {public IntPtr hwnd;public uint message;public UIntPtr wParam;public IntPtr lParam;public uint time;public POINT pt;}
 [DllImport("user32.dll")] static extern bool RegisterHotKey(IntPtr h,int id,uint modifiers,uint key);
 [DllImport("user32.dll")] static extern bool UnregisterHotKey(IntPtr h,int id);
 [DllImport("user32.dll")] static extern bool PeekMessage(out MSG msg,IntPtr h,uint min,uint max,uint remove);
 [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
 [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr h,out uint pid);
 [DllImport("user32.dll")] static extern void keybd_event(byte key,byte scan,uint flags,UIntPtr extra);
 static ConcurrentQueue<string> commands=new ConcurrentQueue<string>();static volatile bool closed;
 public static void Run(){
  var input=new Thread(()=>{string l;while((l=Console.ReadLine())!=null)commands.Enqueue(l);closed=true;});input.IsBackground=true;input.Start();
  bool[] registered=new bool[4];for(int i=0;i<4;i++){registered[i]=RegisterHotKey(IntPtr.Zero,i+1,0x4006,(uint)(0x78+i));Console.WriteLine("{\"type\":\"shortcut\",\"id\":"+(i+1)+",\"registered\":"+registered[i].ToString().ToLowerInvariant()+"}");}
  string last="";long tick=0;
  try {while(!closed){MSG m;while(PeekMessage(out m,IntPtr.Zero,0,0,1)){if(m.message==0x312)Console.WriteLine("{\"type\":\"hotkey\",\"id\":"+m.wParam.ToUInt64()+"}");}
   if(Environment.TickCount-tick>=1000||tick==0){tick=Environment.TickCount;try{uint pid;GetWindowThreadProcessId(GetForegroundWindow(),out pid);string name=Process.GetProcessById((int)pid).ProcessName;name=System.Text.RegularExpressions.Regex.Replace(name,@"[^a-zA-Z0-9_. -]","");if(name!=last){last=name;Console.WriteLine("{\"type\":\"foreground\",\"process\":\""+name+"\"}");}}catch{}}
   string command;while(commands.TryDequeue(out command)){if(command=="playPause"){keybd_event(0xB3,0,0,UIntPtr.Zero);keybd_event(0xB3,0,2,UIntPtr.Zero);}}
   Thread.Sleep(50);
  }}finally{for(int i=0;i<4;i++)if(registered[i])UnregisterHotKey(IntPtr.Zero,i+1);}
 }
}
'@
[BudsWindows]::Run()
