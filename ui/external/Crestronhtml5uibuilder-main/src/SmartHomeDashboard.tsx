import { useState } from 'react';
import { Home, Plus, Wifi, Camera, Sun, Wind, ThermometerSun, Snowflake } from 'lucide-react';
import imgPngegg1 from "figma:asset/b253f670cd5b89cfaaf62c1a053a76ad0e7edbeb.png";
import imgPngwing1 from "figma:asset/11c87cbf26405cf07f3f898509f69a6bed57b6ea.png";
import imgPngwing2 from "figma:asset/79b58ebb14125b96c4369468c6f2d0bb4f70a05a.png";
import imgPngwing5 from "figma:asset/8027aa9c4c01ff02ff85aa8214b08d4c8b005adc.png";
import imgPngwing6 from "figma:asset/4f89fc7095a8861132b52b47cba5e698e77ad0b2.png";
import imgRectangle7 from "figma:asset/8ccdbb9ef8b9c52bbda6f4f99b0337a81bd827a8.png";

export default function SmartHomeDashboard() {
  const [activeRoom, setActiveRoom] = useState('Living Room');
  const [brightness, setBrightness] = useState(52);
  const [acTemp, setAcTemp] = useState(18);
  const [acMode, setAcMode] = useState<'cooling' | 'heat' | 'dry'>('cooling');
  const [devices, setDevices] = useState({
    smartTV: false,
    lights: true,
    ac: true,
    speaker: true,
    wifiRouter: true,
    ledLamp: false
  });

  const rooms = ['Living Room', 'Bedroom', 'Kitchen', 'Kid Room'];

  const toggleDevice = (device: keyof typeof devices) => {
    setDevices(prev => ({ ...prev, [device]: !prev[device] }));
  };

  const currentTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const currentDate = new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-100 p-8">
      {/* Main Container */}
      <div className="max-w-[1400px] mx-auto">
        
        {/* Top Header Bar */}
        <div className="bg-white/30 backdrop-blur-xl rounded-[50px] px-6 py-4 mb-8 shadow-lg border border-white/20 flex items-center justify-between">
          <h1 className="text-xl text-gray-800">Welcome Home, Payal!</h1>
          
          <div className="flex-1 max-w-md mx-8">
            <div className="relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full bg-gray-400/20 border border-black/20 rounded-full px-5 py-2 text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-400/50"
              />
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-xl text-gray-800">{currentTime}</div>
            <div className="text-sm text-gray-600">{currentDate}</div>
          </div>
        </div>

        {/* Room Navigation + Add Device */}
        <div className="flex items-center justify-between mb-8">
          <div className="bg-white/40 backdrop-blur-xl rounded-[50px] px-6 py-3 shadow-lg border border-white/20 inline-flex gap-12">
            {rooms.map((room) => (
              <button
                key={room}
                onClick={() => setActiveRoom(room)}
                className={`px-6 py-2 rounded-full text-lg transition-all ${
                  activeRoom === room
                    ? 'bg-white/30 text-gray-800 shadow-inner'
                    : 'text-gray-700 hover:text-gray-900'
                }`}
              >
                {room}
              </button>
            ))}
            <button className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-all">
              <Plus className="w-5 h-5 text-gray-700" />
            </button>
          </div>

          <button className="bg-white/50 rounded-2xl px-5 py-2 flex items-center gap-2 hover:bg-white/60 transition-all">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
              <Plus className="w-4 h-4 text-gray-700" />
            </div>
            <span className="text-sm text-gray-800">Add device</span>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-12 gap-6">
          
          {/* Left Column - Weather & Stats */}
          <div className="col-span-3 space-y-6">
            
            {/* Weather Card */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-5xl mb-2">☀️</div>
                  <h3 className="text-lg text-gray-800">Sunny Day</h3>
                  <p className="text-sm text-gray-600">Temperature Outside</p>
                </div>
                <div className="text-4xl text-gray-800">21°C</div>
              </div>
            </div>

            {/* Brightness Control */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
              <h3 className="text-sm text-gray-800 mb-4">Brightness</h3>
              <div className="relative mb-2">
                <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-cyan-400 rounded-full transition-all"
                    style={{ width: `${brightness}%` }}
                  />
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="absolute inset-0 w-full opacity-0 cursor-pointer"
                />
              </div>
              <div className="text-right text-2xl text-gray-800 mt-3">{brightness}%</div>
            </div>

            {/* Internet Speed */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-full bg-white/30 flex items-center justify-center">
                  <Wifi className="w-6 h-6 text-gray-800" />
                </div>
                <div>
                  <h3 className="text-sm text-gray-800">Internet speed</h3>
                  <p className="text-sm text-gray-800">76 MP/S</p>
                  <p className="text-xs text-gray-600">5 Device connected</p>
                </div>
              </div>
            </div>

            {/* Add Widget Button */}
            <button className="w-full bg-white/30 rounded-2xl p-4 flex items-center gap-3 hover:bg-white/40 transition-all">
              <div className="w-6 h-6 rounded-full bg-white/50 flex items-center justify-center">
                <Plus className="w-4 h-4 text-gray-600" />
              </div>
              <span className="text-sm text-gray-600">Add Widget</span>
            </button>
          </div>

          {/* Middle Column - Camera & AC */}
          <div className="col-span-5 space-y-6">
            
            {/* Air Conditioner Control */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-8 shadow-lg">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl text-gray-800 mb-1">Air Conditioner</h3>
                  <p className="text-sm text-gray-600">LG 16 C°</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devices.ac}
                    onChange={() => toggleDevice('ac')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"></div>
                </label>
              </div>

              {/* Temperature Display */}
              <div className="flex items-center justify-center mb-8">
                <div className="relative">
                  <svg className="w-48 h-48" viewBox="0 0 200 200">
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#e0e0e0"
                      strokeWidth="20"
                    />
                    <circle
                      cx="100"
                      cy="100"
                      r="80"
                      fill="none"
                      stroke="#37C2FC"
                      strokeWidth="20"
                      strokeDasharray={`${(acTemp / 30) * 502} 502`}
                      strokeLinecap="round"
                      transform="rotate(-90 100 100)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl text-gray-800">{acTemp}°C</div>
                      <div className="text-sm text-gray-600 mt-2">Target</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Temperature Slider */}
              <div className="mb-6">
                <div className="flex justify-between text-xs text-gray-600 mb-2">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                </div>
                <div className="relative">
                  <div className="h-4 bg-gray-300 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-cyan-400 rounded-full transition-all"
                      style={{ width: `${(acTemp / 30) * 100}%` }}
                    />
                  </div>
                  <input
                    type="range"
                    min="16"
                    max="30"
                    value={acTemp}
                    onChange={(e) => setAcTemp(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Mode Selection */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setAcMode('cooling')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    acMode === 'cooling'
                      ? 'bg-white/30 border border-cyan-400 shadow-inner'
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  <Snowflake className="w-5 h-5 text-gray-700" />
                  <span className="text-sm text-gray-700">Cooling</span>
                </button>
                <button
                  onClick={() => setAcMode('heat')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    acMode === 'heat'
                      ? 'bg-white/30 border border-cyan-400 shadow-inner'
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  <ThermometerSun className="w-5 h-5 text-gray-700" />
                  <span className="text-sm text-gray-700">Heat</span>
                </button>
                <button
                  onClick={() => setAcMode('dry')}
                  className={`p-4 rounded-xl flex flex-col items-center gap-2 transition-all ${
                    acMode === 'dry'
                      ? 'bg-white/30 border border-cyan-400 shadow-inner'
                      : 'bg-white/20 hover:bg-white/30'
                  }`}
                >
                  <Wind className="w-5 h-5 text-gray-700" />
                  <span className="text-sm text-gray-700">Dry</span>
                </button>
              </div>
            </div>

            {/* Security Camera */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl overflow-hidden shadow-lg">
              <div className="relative">
                <img 
                  src={imgRectangle7} 
                  alt="Security Camera Feed" 
                  className="w-full h-56 object-cover"
                />
                <div className="absolute top-3 left-3 bg-black/35 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-2">
                  <Camera className="w-3 h-3 text-white" />
                  <span className="text-xs text-white">Camera 02</span>
                </div>
                <div className="absolute top-3 right-3 bg-black/35 backdrop-blur-sm px-3 py-1 rounded-lg flex items-center gap-2">
                  <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
                  <span className="text-xs text-white">Live</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Devices Grid */}
          <div className="col-span-4 grid grid-cols-2 gap-6 auto-rows-min">
            
            {/* Smart TV */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg text-gray-800">Smart TV</h3>
                  <p className="text-sm text-gray-600">Samsung, 32 Inch</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devices.smartTV}
                    onChange={() => toggleDevice('smartTV')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-white/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-gray-800 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-white/40 peer-checked:to-white/60 peer-checked:after:bg-white"></div>
                </label>
              </div>
              <img src={imgPngegg1} alt="TV" className="w-full h-28 object-contain drop-shadow-lg" />
            </div>

            {/* Lights */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg text-gray-800">Light</h3>
                  <p className="text-sm text-gray-600">5 lights</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devices.lights}
                    onChange={() => toggleDevice('lights')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"></div>
                </label>
              </div>
              <div className="flex justify-center">
                <div className="w-24 h-24 relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-400 via-pink-400 to-blue-400 rounded-full blur-xl opacity-60"></div>
                  <div className="relative">
                    <Sun className="w-24 h-24 text-gray-200" />
                  </div>
                </div>
              </div>
            </div>

            {/* AC Quick Card */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg text-gray-800">AC</h3>
                  <p className="text-sm text-gray-600">LG 16 C°</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devices.ac}
                    onChange={() => toggleDevice('ac')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"></div>
                </label>
              </div>
              <img src={imgPngwing1} alt="AC" className="w-full h-28 object-contain" />
            </div>

            {/* Speaker */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg text-gray-800">Speaker</h3>
                  <p className="text-sm text-gray-600">Amazon Echo</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devices.speaker}
                    onChange={() => toggleDevice('speaker')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"></div>
                </label>
              </div>
              <img src={imgPngwing2} alt="Speaker" className="w-full h-28 object-contain" />
            </div>

            {/* WiFi Router */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg text-gray-800">Wifi Router</h3>
                  <p className="text-sm text-gray-600">212 kwh Usage</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devices.wifiRouter}
                    onChange={() => toggleDevice('wifiRouter')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-400"></div>
                </label>
              </div>
              <img src={imgPngwing5} alt="Router" className="w-full h-28 object-contain" />
            </div>

            {/* LED Lamp */}
            <div className="bg-white/50 backdrop-blur-xl rounded-2xl p-5 shadow-lg">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg text-gray-800">LED lamp</h3>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={devices.ledLamp}
                    onChange={() => toggleDevice('ledLamp')}
                    className="sr-only peer"
                  />
                  <div className="w-12 h-6 bg-white/30 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-6 after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-gray-800 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gradient-to-r peer-checked:from-white/40 peer-checked:to-white/60 peer-checked:after:bg-white"></div>
                </label>
              </div>
              <img src={imgPngwing6} alt="LED Lamp" className="w-full h-28 object-contain" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
