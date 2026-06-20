import { Settings as SettingsIcon, Bell, Shield, Palette, User } from "lucide-react";

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <SettingsIcon className="w-6 h-6 text-primary" /> Settings
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">Manage your workspace preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <div className="md:col-span-1 space-y-1">
          <button className="w-full text-left px-3 py-2 rounded-lg bg-primary/10 text-primary font-medium text-sm flex items-center gap-2">
            <User className="w-4 h-4" /> Profile
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground font-medium text-sm flex items-center gap-2 transition-colors">
            <Palette className="w-4 h-4" /> Appearance
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground font-medium text-sm flex items-center gap-2 transition-colors">
            <Bell className="w-4 h-4" /> Notifications
          </button>
          <button className="w-full text-left px-3 py-2 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground font-medium text-sm flex items-center gap-2 transition-colors">
            <Shield className="w-4 h-4" /> Security
          </button>
        </div>
        
        <div className="md:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-6 border-b border-border">
              <h2 className="text-lg font-semibold">Profile Information</h2>
              <p className="text-sm text-muted-foreground mt-1">Update your account details and public profile.</p>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-full bg-secondary border border-border flex items-center justify-center font-bold text-xl">
                  AK
                </div>
                <div className="space-x-3">
                  <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                    Upload new
                  </button>
                  <button className="px-4 py-2 border border-border text-foreground text-sm font-medium rounded-lg hover:bg-secondary transition-colors">
                    Remove
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">First Name</label>
                  <input type="text" defaultValue="Alex" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Last Name</label>
                  <input type="text" defaultValue="Knight" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Email Address</label>
                <input type="email" defaultValue="alex@nexus.io" className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50" />
              </div>
            </div>
            <div className="p-4 bg-secondary/30 border-t border-border flex justify-end">
              <button className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
