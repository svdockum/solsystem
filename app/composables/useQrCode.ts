import QRCode from 'qrcode'

export function useQrCode() {
  const generateDataUrl = async (sunSlug: string, width = 300): Promise<string> => {
    const url = `${window.location.origin}/join/${sunSlug}`
    return QRCode.toDataURL(url, {
      width,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
  }

  const getJoinUrl = (sunSlug: string): string => {
    if (import.meta.server) return `/join/${sunSlug}`
    return `${window.location.origin}/join/${sunSlug}`
  }

  return { generateDataUrl, getJoinUrl }
}
