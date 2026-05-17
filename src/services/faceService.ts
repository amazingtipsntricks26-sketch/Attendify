import * as faceDetection from '@tensorflow-models/face-detection';
import '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';

let detector: faceDetection.FaceDetector | null = null;
let isInitializing = false;

export const initializeFaceDetector = async () => {
  if (detector || isInitializing) return;
  isInitializing = true;
  
  try {
    const model = faceDetection.SupportedModels.MediaPipeFaceDetector;
    const detectorConfig: any = {
      runtime: 'tfjs',
      maxFaces: 1,
      modelType: 'short',
    };
    detector = await faceDetection.createDetector(model, detectorConfig);
    console.log('Face detector initialized');
  } catch (error) {
    console.error('Failed to initialize face detector:', error);
  } finally {
    isInitializing = false;
  }
};

export const detectFaces = async (image: HTMLVideoElement | HTMLCanvasElement | HTMLImageElement) => {
  if (!detector) {
    await initializeFaceDetector();
  }
  
  if (!detector) return [];
  
  return await detector.estimateFaces(image);
};

// Simple cosine similarity for face matching (placeholder for real production embedding)
// In a real app, you'd use a model like FaceNet or ArcFace to get embeddings.
// For this demo, we'll simulate the embedding extraction or use a simpler approach.
export const compareFaceEmbeddings = (descriptor1: number[], descriptor2: number[]) => {
  if (descriptor1.length !== descriptor2.length) return 0;
  
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < descriptor1.length; i++) {
    dotProduct += descriptor1[i] * descriptor2[i];
    norm1 += descriptor1[i] * descriptor1[i];
    norm2 += descriptor2[i] * descriptor2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
};

// Simulated embedding for registration (ideally from a more specialized model)
export const getFaceEmbedding = async (video: HTMLVideoElement) => {
  const faces = await detectFaces(video);
  if (faces.length === 0) return null;
  
  // Placeholder: In a real app, you'd pass the face crop to a secondary model like FaceNet.
  // Here we'll generate a pseudo-random embedding based on crop stats for the demo.
  const face = faces[0];
  const { box } = face;
  
  // Pseudo-embedding (Not for real security, just for demo matching)
  // We use rounded values to make the embedding more stable against slight jitters
  const b = box as any;
  const x = Math.round((b.xMin || b.x || 0) / 10) * 10;
  const y = Math.round((b.yMin || b.y || 0) / 10) * 10;
  const w = Math.round(b.width / 10) * 10;
  const h = Math.round(b.height / 10) * 10;
  
  const embedding = Array.from({ length: 128 }, (_, i) => 
    Math.sin(x + y + w + h + i)
  );
  
  return embedding;
};
