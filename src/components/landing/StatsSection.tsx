export function StatsSection() {
  return (
    <section className="py-16 border-y border-border/40 bg-muted/30">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { value: "99.9%", label: "Uptime SLA" },
            { value: "50K+", label: "Endpoints Protected" },
            { value: "<5min", label: "Deployment Time" },
            { value: "24/7", label: "Monitoring" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
              <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
