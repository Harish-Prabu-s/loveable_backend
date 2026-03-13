import React, { useEffect, useRef, useState } from 'react';
import { Camera, Upload as UploadIcon, Wand2, Type, Image as ImageIcon, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { storiesApi } from '../api/stories';

type Props = {
  onClose: () => void;
  onCreated: () => void;
};

export default function StoryComposer({ onClose, onCreated }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recording, setRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const [mode, setMode] = useState<'photo' | 'video'>('photo');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textOverlay, setTextOverlay] = useState<string>('');
  const [gifUrl, setGifUrl] = useState<string>('');
  const [filter, setFilter] = useState({ brightness: 100, contrast: 100, saturate: 100, blur: 0 });
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Error playing video:", e));
    }
  }, [stream]);

  useEffect(() => {
    return () => {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop();
      }
      stream?.getTracks().forEach(t => t.stop());
    };
  }, [stream]);

  const startCamera = async () => {
    // Check for Secure Context
    if (!window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      toast.error("Camera requires HTTPS or Localhost");
      return;
    }

    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 } },
        audio: mode === 'video'
      });
      setStream(s);
    } catch (e: any) {
      console.error("Error accessing camera:", e);
      if (e.name === 'NotAllowedError') {
        toast.error("Camera permission denied");
      } else {
        toast.error(`Camera Error: ${e.message}`);
      }
      setStream(null);
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach(t => t.stop());
    setStream(null);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
    }
  };

  const capturePhoto = async () => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    ctx.filter = `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturate}%) blur(${filter.blur}px)`;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    if (gifUrl) {
      try {
        const img = await loadImage(gifUrl);
        const size = Math.min(c.width, c.height) / 3;
        ctx.drawImage(img, c.width - size - 20, c.height - size - 20, size, size);
      } catch (e) {
        void 0;
      }
    }
    if (textOverlay) {
      ctx.font = `${Math.floor(c.width / 15)}px sans-serif`;
      ctx.fillStyle = 'white';
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      ctx.strokeText(textOverlay, c.width / 2, c.height - 50);
      ctx.fillText(textOverlay, c.width / 2, c.height - 50);
    }
    c.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCapturedImage(url);
      setStream(null); // Stop camera after capture
      stream?.getTracks().forEach(t => t.stop());
    }, 'image/jpeg', 0.92);
  };

  const retakePhoto = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
      setCapturedImage(null);
      startCamera();
    }
  };

  const startRecording = () => {
    if (!stream) return;
    const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recorderRef.current = recorder;
    const chunks: BlobPart[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      setRecordingBlob(blob);
      setRecording(false);
    };
    recorder.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const uploadAndCreate = async (file: File) => {
    try {
      const { url } = await storiesApi.uploadMedia(file);
      await storiesApi.create(url);
      onCreated();
      onClose();
    } catch {
      onClose();
    }
  };

  const save = async () => {
    if (mode === 'photo') {
      if (selectedFile) {
        await uploadAndCreate(selectedFile);
      } else if (capturedImage) {
        // Convert blob URL to File
        const response = await fetch(capturedImage);
        const blob = await response.blob();
        const file = new File([blob], `story_${Date.now()}.jpg`, { type: 'image/jpeg' });
        await uploadAndCreate(file);
      }
    } else {
      const file = selectedFile || (recordingBlob ? new File([recordingBlob], `story_${Date.now()}.webm`, { type: 'video/webm' }) : null);
      if (file) {
        await uploadAndCreate(file);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-white z-10">
          <div className="flex gap-2">
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${mode === 'photo' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => { setMode('photo'); setCapturedImage(null); setStream(null); }}
            >
              Photo
            </button>
            <button
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${mode === 'video' ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
              onClick={() => { setMode('video'); setCapturedImage(null); setStream(null); }}
            >
              Video
            </button>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {/* Source Selection (only if no capture/file) */}
          {!capturedImage && !recordingBlob && !selectedFile && !stream && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={startCamera}
                className="flex flex-col items-center justify-center gap-3 p-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group"
              >
                <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <Camera className="w-8 h-8 text-primary" />
                </div>
                <span className="font-semibold text-gray-700">Open Camera</span>
              </button>

              <label className="flex flex-col items-center justify-center gap-3 p-8 bg-white border-2 border-dashed border-gray-200 rounded-2xl hover:border-primary hover:bg-primary/5 transition-all group cursor-pointer">
                <div className="p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                  <UploadIcon className="w-8 h-8 text-primary" />
                </div>
                <span className="font-semibold text-gray-700">Upload File</span>
                <input type="file" accept={mode === 'photo' ? 'image/*' : 'video/*'} className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
          )}

          {/* Preview Area */}
          {(stream || capturedImage || selectedFile || recordingBlob) && (
            <div className="relative bg-black rounded-2xl overflow-hidden shadow-lg aspect-[9/16] max-h-[60vh] mx-auto w-full flex items-center justify-center group">
              {mode === 'photo' ? (
                <>
                  {capturedImage || selectedFile ? (
                    <img
                      src={selectedFile ? URL.createObjectURL(selectedFile) : capturedImage!}
                      className="w-full h-full object-contain bg-black"
                      alt="Preview"
                    />
                  ) : (
                    <>
                      <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                      <canvas ref={canvasRef} className="hidden" />
                      {/* Capture Button Overlay */}
                      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                        <button
                          onClick={capturePhoto}
                          className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                        >
                          <div className="w-16 h-16 bg-white rounded-full shadow-inner" />
                        </button>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <>
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
                  {recording ? (
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                      <button
                        onClick={stopRecording}
                        className="w-20 h-20 rounded-full border-4 border-red-500 flex items-center justify-center animate-pulse"
                      >
                        <div className="w-10 h-10 bg-red-500 rounded-md" />
                      </button>
                    </div>
                  ) : (
                    stream && !recordingBlob && (
                      <div className="absolute bottom-8 left-0 right-0 flex justify-center z-20">
                        <button
                          onClick={startRecording}
                          className="w-20 h-20 rounded-full border-4 border-white bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-all transform hover:scale-105 active:scale-95 shadow-lg"
                        >
                          <div className="w-16 h-16 bg-red-500 rounded-full shadow-inner" />
                        </button>
                      </div>
                    )
                  )}
                </>
              )}

              {/* Retake Button (Overlay) */}
              {(capturedImage || recordingBlob || selectedFile) && (
                <button
                  onClick={() => {
                    setCapturedImage(null);
                    setRecordingBlob(null);
                    setSelectedFile(null);
                    setStream(null); // Will require restart
                    if (mode === 'photo') startCamera(); // Auto restart for photo
                  }}
                  className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm backdrop-blur-md hover:bg-black/70 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" /> Retake
                </button>
              )}
            </div>
          )}

          {/* Filters & Editing Tools (Photo Mode Only) */}
          {mode === 'photo' && (capturedImage || stream) && !selectedFile && (
            <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
                  <Wand2 className="w-4 h-4" />
                  <span>Filters & Effects</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex justify-between">Brightness <span>{filter.brightness}%</span></label>
                    <input type="range" min={0} max={200} value={filter.brightness} onChange={(e) => setFilter({ ...filter, brightness: Number(e.target.value) })} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex justify-between">Contrast <span>{filter.contrast}%</span></label>
                    <input type="range" min={0} max={200} value={filter.contrast} onChange={(e) => setFilter({ ...filter, contrast: Number(e.target.value) })} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex justify-between">Saturation <span>{filter.saturate}%</span></label>
                    <input type="range" min={0} max={200} value={filter.saturate} onChange={(e) => setFilter({ ...filter, saturate: Number(e.target.value) })} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-gray-500 flex justify-between">Blur <span>{filter.blur}px</span></label>
                    <input type="range" min={0} max={10} value={filter.blur} onChange={(e) => setFilter({ ...filter, blur: Number(e.target.value) })} className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary" />
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2 text-primary font-medium border-b border-gray-100 pb-2">
                  <Type className="w-4 h-4" />
                  <span>Text & Overlay</span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="Add caption text..."
                    value={textOverlay}
                    onChange={(e) => setTextOverlay(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                        placeholder="Paste GIF URL..."
                        value={gifUrl}
                        onChange={(e) => setGifUrl(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-white flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 rounded-xl font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={(!capturedImage && !selectedFile && !recordingBlob) || recording}
            className="px-6 py-2.5 bg-gradient-to-r from-primary to-pink-600 text-white rounded-xl font-medium shadow-lg shadow-primary/30 inline-flex items-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-4 h-4" />
            {recording ? 'Recording...' : 'Share Story'}
          </button>
        </div>
      </div>
    </div>
  );
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}
