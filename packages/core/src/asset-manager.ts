import type { AssetInfo, ImageInfo } from "@markitdownjs/shared";
import { generateId, uint8ArrayToDataUrl } from "@markitdownjs/shared";

export class AssetManager {
  private assets = new Map<string, AssetInfo>();
  private images = new Map<string, ImageInfo>();

  addAsset(asset: Omit<AssetInfo, "id">): AssetInfo {
    const id = generateId();
    const fullAsset: AssetInfo = { ...asset, id };
    this.assets.set(id, fullAsset);
    return fullAsset;
  }

  addImage(image: Omit<ImageInfo, "id">): ImageInfo {
    const id = generateId();
    const fullImage: ImageInfo = { ...image, id };
    this.images.set(id, fullImage);
    return fullImage;
  }

  getAsset(id: string): AssetInfo | undefined {
    return this.assets.get(id);
  }

  getImage(id: string): ImageInfo | undefined {
    return this.images.get(id);
  }

  getAllAssets(): AssetInfo[] {
    return Array.from(this.assets.values());
  }

  getAllImages(): ImageInfo[] {
    return Array.from(this.images.values());
  }

  clear(): void {
    this.assets.clear();
    this.images.clear();
  }

  toDataUrl(data: Uint8Array, mimeType: string): string {
    return uint8ArrayToDataUrl(data, mimeType);
  }

  getImageAsDataUrl(id: string): string | undefined {
    const image = this.images.get(id);
    if (!image?.data || !image.mimeType) return undefined;
    return this.toDataUrl(image.data, image.mimeType);
  }
}
