"use client"

import { useEffect } from "react"
import { toast } from "sonner"

export function UpdateNotifier() {
    useEffect(() => {
        const api = window.electronAPI?.updater
        if (!api) return

        // Step 1 — nova versão detectada: perguntar se quer baixar
        api.onAvailable((info) => {
            toast.info(`Nova versão ${info.version} disponível`, {
                description: "Deseja baixar a atualização agora?",
                duration: Infinity,
                action: {
                    label: "Baixar",
                    onClick: () => {
                        window.electronAPI?.updater?.download()
                        toast.info("Baixando atualização…", {
                            description: "Você será notificado quando estiver pronto.",
                            duration: 5000,
                        })
                    },
                },
                cancel: {
                    label: "Agora não",
                    onClick: () => { },
                },
            })
        })

        // Step 2 — download concluído: perguntar se quer instalar
        api.onDownloaded((info) => {
            toast.success(`Versão ${info.version} pronta para instalar`, {
                description: "Deseja reiniciar agora para aplicar a atualização?",
                duration: Infinity,
                action: {
                    label: "Reiniciar agora",
                    onClick: () => window.electronAPI?.updater?.install(),
                },
                cancel: {
                    label: "Agora não",
                    onClick: () => { },
                },
            })
        })
    }, [])

    return null
}
