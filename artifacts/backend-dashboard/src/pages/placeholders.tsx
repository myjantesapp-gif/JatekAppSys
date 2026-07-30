import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Tags, Wallet, Bell, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";

export function ComingSoon({ title, icon: Icon, description }: { title: string, icon: React.ElementType, description: string }) {
  return (
    <div className="flex items-center justify-center h-[60vh] animate-in fade-in zoom-in duration-500">
      <Card className="w-full max-w-md text-center border-dashed border-2 shadow-none">
        <CardHeader>
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Icon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">{title}</CardTitle>
          <CardDescription className="text-base mt-2">{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80">
            Coming Soon
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SettingsPage() {
  return <ComingSoon title="System Settings" icon={Settings} description="Global application configuration will be available in the next phase." />;
}

export function PromotionsPage() {
  return <ComingSoon title="Promotions" icon={Tags} description="Marketing campaigns and discount codes management." />;
}

export function WalletsPage() {
  return <ComingSoon title="Wallets" icon={Wallet} description="Restaurant and driver balance settlements." />;
}

export function NotificationsPage() {
  return <ComingSoon title="Notifications" icon={Bell} description="Push notification dispatch center." />;
}

export function ReportsPage() {
  return <ComingSoon title="Reports" icon={BarChart3} description="Advanced analytics and data export." />;
}
