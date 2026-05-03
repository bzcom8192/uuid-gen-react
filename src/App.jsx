import { useEffect, useRef, useState } from 'react';
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('uuid');

  // UUID Generator states
  const [uuid, setUuid] = useState([
    crypto.randomUUID()
  ]);
  const [number, setNumber] = useState(1);
  const [copied, setCopied] = useState([]);

  // Salt Generator states
  const [salt, setSalt] = useState([]);
  const [saltNumber, setSaltNumber] = useState(1);
  const [saltLength, setSaltLength] = useState(32);
  const [saltCopied, setSaltCopied] = useState([]);
  const [useUppercase, setUseUppercase] = useState(true);
  const [useLowercase, setUseLowercase] = useState(true);
  const [useNumbers, setUseNumbers] = useState(true);
  const [useSpecial, setUseSpecial] = useState(true);

  const gen_uuid = (number) => {
    const uuids = [];
    for (let i = 0; i < number; i++) {
      uuids.push(crypto.randomUUID());
    }
    setUuid(uuids);
  }

  const gen_salt = (count) => {
    let charset = '';
    if (useUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    if (useLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
    if (useNumbers) charset += '0123456789';
    if (useSpecial) charset += '!@#$%^&*()_+-=[]{}|;:,.<>?';

    if (!charset) {
      charset = 'abcdefghijklmnopqrstuvwxyz';
    }

    const salts = [];
    for (let i = 0; i < count; i++) {
      let randomSalt = '';
      for (let j = 0; j < saltLength; j++) {
        randomSalt += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      salts.push(randomSalt);
    }
    setSalt(salts);
  }

  const copyToClipboard = (id) => {
    setCopied((prev) => ([...prev, id]));
  }

  const copySaltToClipboard = (id) => {
    setSaltCopied((prev) => ([...prev, id]));
  }

  return (
    <div className='w-screen h-screen bg-black overflow-y-auto'>
      <div className='w-full h-full flex flex-col items-center gap-5 text-white px-5'>

        {/* Tab Navigation */}
        <div className='flex gap-4 mt-5'>
          <button
            className={`px-6 py-2 rounded text-lg font-semibold transition ${activeTab === 'uuid' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setActiveTab('uuid')}
          >
            UUID Generator
          </button>
          <button
            className={`px-6 py-2 rounded text-lg font-semibold transition ${activeTab === 'salt' ? 'bg-blue-600' : 'bg-gray-700 hover:bg-gray-600'}`}
            onClick={() => setActiveTab('salt')}
          >
            Salt Generator
          </button>
        </div>

        {/* UUID Generator Tab */}
        {activeTab === 'uuid' && (
          <div className='w-full h-full flex flex-col items-center gap-5'>
            <div className='text-2xl'>UUID Generator</div>
            <div className='flex items-center'>
              <input type="number"
                className='py-2 px-4 text-black rounded bg-gray-300 text-lg'
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                min={1}
                max={1000}
              />
              <button className='ml-4 bg-blue-500 rounded px-4 py-2'
                onClick={() => gen_uuid(number)}
              >
                Generate
              </button>
            </div>
            <div className='w-full h-full flex flex-col text-white text-xl py-2 overflow-auto slim-scrollbar font-mono'>
              <table>
                <tbody>
                  {uuid.map((id, index) => (
                    <tr key={index}>
                      <td className='w-full px-4 py-2 border-b border-gray-600'>{id}</td>
                      <td className='w-full flex justify-end px-4 py-2 border-b border-gray-600'>
                        <button className='bg-green-500 rounded px-2 py-1 cursor-pointer'
                          onClick={() => {
                            navigator.clipboard.writeText(id);
                            copyToClipboard(index);
                          }}
                        >
                          {copied.includes(index) ? 'Copied!' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Salt Generator Tab */}
        {activeTab === 'salt' && (
          <div className='w-full flex flex-col items-center gap-5'>
            <div className='text-2xl'>Salt Generator</div>

            {/* Controls */}
            <div className='bg-gray-800 rounded-lg p-6 w-full max-w-md'>
              <div className='space-y-4'>
                {/* Number of salts */}
                <div>
                  <label className='block text-sm font-medium mb-2'>Number of Salts:</label>
                  <input type="number"
                    className='w-full py-2 px-4 text-black rounded bg-gray-300 text-lg'
                    value={saltNumber}
                    onChange={(e) => setSaltNumber(e.target.value)}
                    min={1}
                    max={1000}
                  />
                </div>

                {/* Salt Length */}
                <div>
                  <label className='block text-sm font-medium mb-2'>Salt Length: {saltLength}</label>
                  <input type="range"
                    className='w-full'
                    value={saltLength}
                    onChange={(e) => setSaltLength(e.target.value)}
                    min={8}
                    max={128}
                  />
                  <input type="number"
                    className='w-full mt-2 py-2 px-4 text-black rounded bg-gray-300 text-lg'
                    value={saltLength}
                    onChange={(e) => setSaltLength(e.target.value)}
                    min={8}
                    max={128}
                  />
                </div>

                {/* Character Set Options */}
                <div className='border-t border-gray-600 pt-4'>
                  <label className='block text-sm font-medium mb-3'>Character Set:</label>
                  <div className='space-y-2'>
                    <label className='flex items-center'>
                      <input type="checkbox"
                        className='mr-2 w-4 h-4'
                        checked={useUppercase}
                        onChange={(e) => setUseUppercase(e.target.checked)}
                      />
                      <span>Uppercase (A-Z)</span>
                    </label>
                    <label className='flex items-center'>
                      <input type="checkbox"
                        className='mr-2 w-4 h-4'
                        checked={useLowercase}
                        onChange={(e) => setUseLowercase(e.target.checked)}
                      />
                      <span>Lowercase (a-z)</span>
                    </label>
                    <label className='flex items-center'>
                      <input type="checkbox"
                        className='mr-2 w-4 h-4'
                        checked={useNumbers}
                        onChange={(e) => setUseNumbers(e.target.checked)}
                      />
                      <span>Numbers (0-9)</span>
                    </label>
                    <label className='flex items-center'>
                      <input type="checkbox"
                        className='mr-2 w-4 h-4'
                        checked={useSpecial}
                        onChange={(e) => setUseSpecial(e.target.checked)}
                      />
                      <span>Special Characters (!@#$%...)</span>
                    </label>
                  </div>
                </div>

                {/* Generate Button */}
                <button className='w-full bg-blue-500 rounded px-4 py-2 font-semibold hover:bg-blue-600 transition'
                  onClick={() => gen_salt(saltNumber)}
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Results */}
            <div className='w-full flex flex-col text-white text-lg py-2 overflow-auto slim-scrollbar font-mono'>
              <table>
                <tbody>
                  {salt.map((s, index) => (
                    <tr key={index}>
                      <td className='w-full px-4 py-2 border-b border-gray-600 break-all'>{s}</td>
                      <td className='flex justify-end px-4 py-2 border-b border-gray-600'>
                        <button className='bg-green-500 rounded px-2 py-1 cursor-pointer'
                          onClick={() => {
                            navigator.clipboard.writeText(s);
                            copySaltToClipboard(index);
                          }}
                        >
                          {saltCopied.includes(index) ? 'Copied!' : 'Copy'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
