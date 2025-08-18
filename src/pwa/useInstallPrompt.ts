import { useEffect, useState } from 'react'

type InstallOutcome = 'accepted' | 'dismissed'
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: InstallOutcome; platform: string }>
}

function isStandalone(): boolean {
  const standaloneMedia = window.matchMedia?.('(display-mode: standalone)').matches
  const iosStandalone = (navigator as any).standalone === true
  return Boolean(standaloneMedia || iosStandalone)
}

export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState<boolean>(isStandalone())

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferred(null)
    }
    window.addEventListener('beforeinstallprompt', onBIP as any)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP as any)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const canInstall = !!deferred && !installed

  const install = async (): Promise<InstallOutcome> => {
    if (!deferred) return 'dismissed'
    await deferred.prompt()
    const choice = await deferred.userChoice
    if (choice.outcome === 'accepted') {
      setDeferred(null)
    }
    return choice.outcome
  }

  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent)

  return { canInstall, install, installed, isiOS }
}
