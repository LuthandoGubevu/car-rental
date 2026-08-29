import { useEffect, useRef, useState } from 'react';

// Takes over the device camera directly via getUserMedia rather than handing
// off to the OS file/camera picker. A plain <input type="file" capture> is
// only a hint - several browsers still offer "choose from gallery" alongside
// it, which would let a driver submit an old photo instead of the vehicle's
// current condition. Owning the camera stream closes that gap entirely.
export function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [supported] = useState(() => Boolean(navigator.mediaDevices?.getUserMedia));
  const [error, setError] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supported) return undefined;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setError('Camera access was denied. Please allow camera access in your browser settings and try again.');
        }
      });

    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [supported]);

  function capture() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) onCapture(blob);
    }, 'image/jpeg', 0.85);
  }

  if (!supported) {
    return <div className="camera-error">This device or browser does not support camera capture.</div>;
  }

  if (error) {
    return <div className="camera-error">{error}</div>;
  }

  return (
    <div className="camera-view">
      <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
      <button type="button" className="btn-primary btn-inline" disabled={!ready} onClick={capture}>
        Capture photo
      </button>
    </div>
  );
}
