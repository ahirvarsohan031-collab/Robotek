'use client'

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { uploadData, getUrl } from 'aws-amplify/storage';
import type { Schema } from '../../../amplify/data/resource';

let client: ReturnType<typeof generateClient<Schema>> | null = null;
let clientError: string | null = null;

try {
  client = generateClient<Schema>();
} catch (e: any) {
  clientError = e.message;
}

export default function TestAwsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(!clientError);
  const [error, setError] = useState<string | null>(
    clientError ? "Amplify Configuration is Missing" : null
  );

  // Storage State
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{name: string, url: string}[]>([]);

  useEffect(() => {
    if (!client) return;

    // 1. Initial Fetch
    fetchItems();

    let sub: any;
    try {
      // 2. Real-time Subscription (The part that saves 52GB/day!)
      sub = client.models.TestRobotek.onCreate().subscribe({
        next: (newItem: any) => {
          console.log("New item received via subscription:", newItem);
          setItems((prev) => [newItem, ...prev]);
        },
        error: (err: any) => console.error("Subscription error:", err)
      });
    } catch (err: any) {
      console.warn("Could not start subscription. Backend may not be initialized.", err);
      // We also set the error state here if fetchItems didn't already
      setError(err.message || "Backend configuration missing");
    }

    return () => {
      if (sub) sub.unsubscribe();
    };
  }, []);

  async function fetchItems() {
    if (!client) return;
    try {
      setIsLoading(true);
      const { data, errors } = await client.models.TestRobotek.list();
      if (errors) throw new Error(errors[0].message);
      setItems(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch data from AWS");
    } finally {
      setIsLoading(false);
    }
  }

  async function addItem(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() || !client) return;

    try {
      await client.models.TestRobotek.create({
        name: content,
        email: 'test@example.com',
        number: '1234567890',
        status: 'Active',
      });
      setContent('');
    } catch (err: any) {
      alert("Error adding item: " + err.message);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) setFile(selectedFile);
  }

  async function uploadFile() {
    if (!file) return;
    try {
      setIsUploading(true);
      const result = await uploadData({
        path: `general/${file.name}`,
        data: file,
      }).result;
      
      const { url } = await getUrl({ path: result.path });
      setUploadedFiles(prev => [...prev, { name: file.name, url: url.toString() }]);
      setFile(null);
      alert("File uploaded successfully to S3!");
    } catch (err: any) {
      alert("Upload failed: " + err.message);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white">
          <h1 className="text-2xl font-bold">AWS Amplify Connection Check</h1>
          <p className="opacity-80 text-sm mt-1">Testing real-time data sync (GraphQL Subscriptions)</p>
        </div>

        <div className="p-6">
          {/* Status Bar */}
          <div className="flex items-center gap-2 mb-6 text-sm">
            <div className={`w-3 h-3 rounded-full ${isLoading ? 'bg-yellow-400 animate-pulse' : 'bg-green-500'}`}></div>
            <span className="text-gray-600">{isLoading ? 'Connecting to AWS...' : 'Connected to DynamoDB'}</span>
          </div>

          {/* Form */}
          <form onSubmit={addItem} className="mb-8 p-4 bg-gray-50 rounded-lg border border-dashed border-gray-300">
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">New Entry</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type something to send to AWS..."
                className="flex-1 px-4 py-2 rounded-md border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button 
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                Send
              </button>
            </div>
            <p className="text-[10px] text-gray-400 mt-2 italic">Sending this will trigger a GraphQL Subscription for all connected users.</p>
          </form>

          {/* Storage Section */}
          <div className="mb-8 p-4 bg-blue-50 rounded-lg border border-dashed border-blue-300">
            <h2 className="text-xs font-semibold text-blue-600 uppercase tracking-wider mb-4">S3 Storage Test (Documents & Attachments)</h2>
            <div className="flex gap-2">
              <input
                type="file"
                onChange={handleFileUpload}
                className="flex-1 text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              />
              <button 
                onClick={uploadFile}
                disabled={!file || isUploading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {isUploading ? 'Uploading...' : 'Upload to S3'}
              </button>
            </div>
            
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-[10px] font-bold text-blue-800 uppercase">Recent Uploads:</p>
                {uploadedFiles.map((upload, i) => (
                  <div key={i} className="flex justify-between items-center text-xs bg-white p-2 rounded border border-blue-100">
                    <span className="truncate max-w-[200px]">{upload.name}</span>
                    <a href={upload.url} target="_blank" rel="noreferrer" className="text-blue-600 font-bold hover:underline">View File</a>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Data List */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-gray-800">Live Data Feed</h2>
              <span className="bg-indigo-100 text-indigo-700 text-xs px-2 py-1 rounded-full font-bold">
                {items.length} records
              </span>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-md text-sm mb-4">
                ⚠️ {error}. <br/>
                <span className="text-xs opacity-80">(Note: Ensure you have run 'npx ampx sandbox' locally)</span>
              </div>
            )}

            <div className="space-y-3">
              {items.length === 0 && !isLoading && !error && (
                <div className="text-center py-10 text-gray-400 border-2 border-dashed border-gray-100 rounded-xl">
                  No data found in DynamoDB yet. Try adding one above!
                </div>
              )}

              {items.map((item) => (
                <div 
                  key={item.id} 
                  className="p-4 rounded-lg border border-gray-100 bg-white hover:border-indigo-200 transition-all shadow-sm flex justify-between items-center group"
                >
                  <div>
                    <div className="text-gray-800 font-medium">{item.name}</div>
                    <div className="text-[10px] text-gray-400 flex gap-2 items-center mt-1">
                      <span>ID: {item.id.substring(0, 8)}...</span>
                      <span>•</span>
                      <span>Status: {item.status}</span>
                      <span>•</span>
                      <span>Email: {item.email}</span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Live Sync</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-2xl mx-auto mt-6 text-center">
        <button 
          onClick={() => window.history.back()}
          className="text-gray-400 hover:text-gray-600 text-sm flex items-center gap-1 mx-auto"
        >
          ← Back to Robotek Dashboard
        </button>
      </div>
    </div>
  );
}
