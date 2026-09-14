/**
 * Web Crypto API (crypto.subtle) yordamida brauzerda to'g'ridan-to'g'ri
 * kriptografik SHA-256 xeshini hisoblash xizmati.
 */

export class CryptoService {
  /**
   * Fayl (File yoki Blob) ob'ektidan haqiqiy SHA-256 xeshini hisoblash
   */
  static async computeFileSha256(file: File | Blob): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', arrayBuffer);
    return this.bufferToHex(hashBuffer);
  }

  /**
   * Matn qatoridan SHA-256 xeshini hisoblash (Audit zanjiri uchun)
   */
  static async computeStringSha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    return this.bufferToHex(hashBuffer);
  }

  /**
   * ArrayBuffer'ni 64 belgili hex qatoriga o'girish
   */
  private static bufferToHex(buffer: ArrayBuffer): string {
    const byteArray = new Uint8Array(buffer);
    const hexParts: string[] = [];
    for (let i = 0; i < byteArray.length; i++) {
      const hex = byteArray[i].toString(16).padStart(2, '0');
      hexParts.push(hex);
    }
    return hexParts.join('');
  }

  /**
   * Fayl hajmini o'qilishi oson formatga o'tkazish (KB, MB)
   */
  static formatBytes(bytes: number, decimals = 2): string {
    if (bytes === 0) return '0 Bayt';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bayt', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}
