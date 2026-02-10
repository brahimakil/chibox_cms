import { Settings as SettingsIcon, Store, Globe, CreditCard, Truck, Shield } from "lucide-react";

const settingSections = [
  {
    title: "General",
    description: "Store name, logo, and basic configuration",
    icon: Store,
  },
  {
    title: "Localization",
    description: "Languages, currencies, and regional settings",
    icon: Globe,
  },
  {
    title: "Payments",
    description: "Payment gateways and transaction settings",
    icon: CreditCard,
  },
  {
    title: "Shipping",
    description: "Shipping methods, zones, and rates",
    icon: Truck,
  },
  {
    title: "Security",
    description: "Authentication, API keys, and security policies",
    icon: Shield,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Configure your store and system preferences
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingSections.map((section) => (
          <button
            key={section.title}
            className="group flex flex-col items-start gap-3 rounded-xl border bg-card p-6 text-left shadow-sm transition-all hover:border-primary/20 hover:shadow-md"
          >
            <div className="rounded-lg bg-muted p-2.5 transition-colors group-hover:bg-primary/10">
              <section.icon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">{section.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {section.description}
              </p>
            </div>
          </button>
        ))}

        {/* Full Settings Card */}
        <button className="group flex flex-col items-start gap-3 rounded-xl border border-dashed bg-card/50 p-6 text-left transition-all hover:border-primary/20 hover:bg-card hover:shadow-md">
          <div className="rounded-lg bg-muted p-2.5 transition-colors group-hover:bg-primary/10">
            <SettingsIcon className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Advanced</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Database, cache, queue, and system configuration
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}
