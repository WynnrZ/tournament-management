import { useEffect } from "react";
import { useLocation } from "wouter";
import { useIsMobile } from "@/hooks/use-mobile";
import QuickRecordForm from "@/components/mobile/quick-record-form";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Smartphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MobileRecordPage() {
  const [_, setLocation] = useLocation();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Show a message if this is accessed on desktop
  useEffect(() => {
    if (!isMobile) {
      toast({
        title: "Desktop detected",
        description: "This page is optimized for mobile devices",
      });
    }
  }, [isMobile, toast]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Simplified header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 flex-shrink-0">
        <div className="px-3 py-2 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/")}
            className="flex items-center p-2"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-base font-semibold">Quick Record</h1>
          <Smartphone className="h-4 w-4 text-muted-foreground" />
        </div>
      </header>

      {/* Main content - scrollable */}
      <main className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="max-w-sm mx-auto">
          <div className="mb-4">
            <h2 className="text-lg font-bold">Record Game Result</h2>
            <p className="text-sm text-muted-foreground">
              Quickly log game results on the go
            </p>
          </div>

          <QuickRecordForm
            onSuccess={() => {
              toast({
                title: "Success!",
                description: "Game result recorded successfully",
              });
            }}
          />
        </div>
      </main>

      {/* Bottom navigation - fixed at bottom */}
      <div className="bg-white border-t p-3 flex-shrink-0 safe-area-bottom">
        <Button
          onClick={() => setLocation("/")}
          variant="outline"
          className="w-full"
          size="sm"
        >
          Return to Dashboard
        </Button>
      </div>
    </div>
  );
}