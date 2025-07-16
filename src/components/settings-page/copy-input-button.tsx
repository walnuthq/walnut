import { Button } from "@/components/ui/button";
import { useState } from "react";
import { ClipboardDocumentIcon } from '@heroicons/react/24/outline';

export function CopyInputButton({text}: {text: string}) {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
        } catch (err) {
            console.error("Failed to copy text: ", err);
        }
    };

    return (
        <div className="flex items-center space-x-2">
            <Button onClick={handleCopy}>
                <ClipboardDocumentIcon/>
                {isCopied ? "Copied!" : "Copy"}
            </Button>
        </div>
    );
}
