import { useState } from 'react';
import './App.css'

function App() {
  const [uuid, setUuid] = useState([]);
  const [number, setNumber] = useState(1);
  const [copied, setCopied] = useState([]);

  const gen_uuid = (number) => {
    const uuids = [];
    for (let i = 0; i < number; i++) {
      uuids.push(crypto.randomUUID());
    }
    setUuid(uuids);
  }

  const copyToClipboard = (id) => {
    setCopied((prev) => ([...prev, id]));
  }

  return (
    <div className='w-screen h-screen bg-black'>
      <div className='w-full h-full flex flex-col items-center gap-5 text-white px-5'>
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
    </div>
  )
}

export default App
