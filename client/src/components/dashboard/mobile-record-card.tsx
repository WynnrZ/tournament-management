import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Smartphone, Trophy } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";

export default function MobileRecordCard() {
  const [_, setLocation] = useLocation();
  const isMobile = useIsMobile();

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-br from-purple-100/90 to-purple-200/90 pb-8">
        <div className="flex justify-between items-start">
          <CardTitle className="text-slate-800">
            Quick Game Recording
          </CardTitle>
          <Smartphone className="h-6 w-6 text-slate-700" />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Record game results on the go
        </p>
      </CardHeader>
      <CardContent className="p-6 pt-0 -mt-4">
        <div className="bg-background shadow-sm rounded-lg p-4 mb-4">
          <div className="flex items-center mb-2">
            <Trophy className="h-5 w-5 text-primary mr-2" />
            <p className="font-medium">Mobile-optimized interface</p>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Quickly record game results with a streamlined mobile experience
            {!isMobile && " - try it on your mobile device!"}
          </p>
          {isMobile ? (
            <Button 
              className="w-full" 
              onClick={() => setLocation("/mobile")}
            >
              Quick Record
            </Button>
          ) : (
            <Button 
              className="w-full" 
              onClick={() => setLocation("/mobile")}
            >
              Open Mobile View
            </Button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          Simplified UI for fast result entry
        </div>
      </CardContent>
    </Card>
  );
}