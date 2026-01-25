import { FolderInput, BookOpen, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLibraryStore } from "@/store/library-store";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function EmptyLibrary() {
    const { addCourse } = useLibraryStore();
    const router = useRouter();

    const handleImport = async () => {
        try {
            if (!(window as any).electron) {
                toast.error("This feature requires the desktop app");
                return;
            }

            const result = await (window as any).electron.selectFolder();
            if (result) {
                addCourse(result);
                toast.success("Course imported successfully!");
            }
        } catch (error) {
            console.error("[EmptyLibrary] Import error:", error);
            toast.error("Failed to import folder. Please try again.");
        }
    };

    return (
        <div className="flex flex-col items-center justify-center h-[70vh] text-center space-y-6 fade-in animate-in zoom-in-95 duration-500">
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative p-8 bg-neutral-900 ring-1 ring-white/10 rounded-full">
                    <BookOpen className="h-16 w-16 text-muted-foreground group-hover:text-white transition-colors duration-300" />
                </div>
            </div>

            <div className="space-y-2 max-w-md mx-auto">
                <h2 className="text-2xl font-bold tracking-tight text-white">Your library is empty</h2>
                <p className="text-muted-foreground">
                    Get started by importing your local video courses. We'll automatically organize them with covers and metadata.
                </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <Button
                    onClick={handleImport}
                    size="lg"
                    className="gap-2 bg-white text-black hover:bg-white/90"
                >
                    <FolderInput className="h-5 w-5" />
                    Import Folder
                </Button>
                <Button
                    onClick={() => router.push('/settings')}
                    variant="outline"
                    size="lg"
                    className="gap-2 border-white/10 hover:bg-white/10"
                >
                    <Settings className="h-5 w-5" />
                    Configure AI
                </Button>
            </div>

            <p className="text-xs text-muted-foreground pt-8">
                Tip: You can drag and drop folders directly into the app (coming soon)
            </p>
        </div>
    );
}
