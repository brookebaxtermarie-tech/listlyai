import { redirect } from 'next/navigation'

// The extension UI now lives in Settings → Extension.
export default function ExtensionRedirect() {
  redirect('/settings')
}
