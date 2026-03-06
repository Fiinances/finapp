"use client"

import React from "react"
import { initLLM } from "@/lib/llm-client"
import { toast } from "sonner"
import {
    Sheet,
    SheetClose,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

interface LoadModelSheetProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LoadModelSheet({ open, onOpenChange }: LoadModelSheetProps) {
    const [fileName, setFileName] = React.useState<string | null>(null)
    const [file, setFile] = React.useState<File | null>(null)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!file) return

        setLoading(true)
        setError(null)
        try {
            const modelBuffer = file.stream()
            await initLLM(modelBuffer)
            toast.success("Modelo carregado com sucesso", { position: "top-center" })
            onOpenChange(false)
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err))
        } finally {
            setLoading(false)
        }
    }

    function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        setFileName(f ? f.name : null)
        setFile(f ?? null)
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent side="right" showCloseButton>
                <SheetHeader>
                    <SheetTitle>Carregar Modelo</SheetTitle>
                    <SheetDescription>
                        Envie o modelo treinado para que possamos processá-lo e disponibilizá-lo para uso.
                    </SheetDescription>
                </SheetHeader>

                <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Arquivo</label>
                        <Input type="file" onChange={onFileChange} />
                        {fileName && (
                            <p className="text-xs text-muted-foreground mt-1">Arquivo: {fileName}</p>
                        )}
                    </div>

                    {error && <p className="text-xs text-destructive">{error}</p>}

                    <SheetFooter>
                        <div className="flex items-center justify-end gap-2">
                            <SheetClose asChild>
                                <Button variant="ghost" disabled={loading}>
                                    Cancelar
                                </Button>
                            </SheetClose>
                            <Button type="submit" disabled={!file || loading}>
                                {loading ? "Carregando…" : "Carregar Modelo"}
                            </Button>
                        </div>
                    </SheetFooter>
                </form>
            </SheetContent>
        </Sheet>
    )
}
