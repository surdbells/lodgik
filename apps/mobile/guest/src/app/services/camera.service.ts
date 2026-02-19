import { Injectable } from '@angular/core';
import { ImageSource, knownFolders, path } from '@nativescript/core';

/**
 * Camera & Image Picker service for guest app.
 * Used for:
 *  - Service request photos (e.g. maintenance issues)
 *  - ID photo capture for verification
 *  - Chat image messages
 */
@Injectable({ providedIn: 'root' })
export class CameraService {

  /**
   * Take a photo using the device camera.
   * Returns base64-encoded image data or null on cancel/error.
   */
  async takePhoto(): Promise<string | null> {
    try {
      const { requestPermissions, takePicture } = await import('@nativescript/camera');
      await requestPermissions();
      const imageAsset = await takePicture({
        width: 1024,
        height: 1024,
        keepAspectRatio: true,
        saveToGallery: false,
      });
      const imageSource = await ImageSource.fromAsset(imageAsset);
      return imageSource.toBase64String('jpg', 80);
    } catch (err: any) {
      console.error('[CameraService] takePhoto error:', err);
      return null;
    }
  }

  /**
   * Pick an image from the gallery.
   * Returns base64-encoded image data or null on cancel/error.
   */
  async pickFromGallery(): Promise<string | null> {
    try {
      const { create } = await import('@nativescript/imagepicker');
      const context = create({ mode: 'single' });
      await context.authorize();
      const images = await context.present();
      if (!images || images.length === 0) return null;

      const asset = images[0] as any;
      const imageSource = await ImageSource.fromAsset(asset);
      return imageSource.toBase64String('jpg', 80);
    } catch (err: any) {
      console.error('[CameraService] pickFromGallery error:', err);
      return null;
    }
  }

  /**
   * Save base64 image to temp file and return file path.
   * Useful for upload APIs that need a file path.
   */
  saveToTemp(base64: string, filename?: string): string {
    const name = filename || `photo_${Date.now()}.jpg`;
    const tempPath = path.join(knownFolders.temp().path, name);
    const imageSource = ImageSource.fromBase64Sync(base64);
    imageSource.saveToFile(tempPath, 'jpg');
    return tempPath;
  }
}
