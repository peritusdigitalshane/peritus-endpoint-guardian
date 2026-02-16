import { useState } from "react";
import { useRouters, useCreateRouter, useDeleteRouter, VENDOR_OPTIONS } from "@/hooks/useRouters";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Wifi, WifiOff, Loader2 } from "lucide-react";

export function RouterInventory() {
  const { data: routers, isLoading } = useRouters();
  const createRouter = useCreateRouter();
  const deleteRouter = useDeleteRouter();
  const [open, setOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [form, setForm] = useState({ hostname: "", vendor: "cisco", model: "", management_ip: "", wan_ip: "", site_name: "", location: "" });

  const handleCreate = async () => {
    if (!form.hostname || !form.vendor) return;
    await createRouter.mutateAsync({
      hostname: form.hostname,
      vendor: form.vendor,
      model: form.model || null,
      management_ip: form.management_ip || null,
      wan_ip: form.wan_ip || null,
      site_name: form.site_name || null,
      location: form.location || null,
    } as any);
    setOpen(false);
    setForm({ hostname: "", vendor: "cisco", model: "", management_ip: "", wan_ip: "", site_name: "", location: "" });
  };

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{routers?.length || 0} routers registered</p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Add Router</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Router</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Hostname *</Label>
                <Input value={form.hostname} onChange={e => setForm(f => ({ ...f, hostname: e.target.value }))} placeholder="router-hq-01" />
              </div>
              <div className="space-y-2">
                <Label>Vendor *</Label>
                <Select value={form.vendor} onValueChange={v => setForm(f => ({ ...f, vendor: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VENDOR_OPTIONS.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Model</Label><Input value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} placeholder="ISR 4331" /></div>
                <div className="space-y-2"><Label>Site Name</Label><Input value={form.site_name} onChange={e => setForm(f => ({ ...f, site_name: e.target.value }))} placeholder="HQ" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Management IP</Label><Input value={form.management_ip} onChange={e => setForm(f => ({ ...f, management_ip: e.target.value }))} placeholder="10.0.0.1" /></div>
                <div className="space-y-2"><Label>WAN IP</Label><Input value={form.wan_ip} onChange={e => setForm(f => ({ ...f, wan_ip: e.target.value }))} placeholder="203.0.113.1" /></div>
              </div>
              <div className="space-y-2"><Label>Location</Label><Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="London, UK" /></div>
              <Button onClick={handleCreate} disabled={createRouter.isPending || !form.hostname} className="w-full">
                {createRouter.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}Add Router
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Hostname</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Model</TableHead>
              <TableHead>Management IP</TableHead>
              <TableHead>WAN IP</TableHead>
              <TableHead>Site</TableHead>
              <TableHead className="w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {routers?.map(r => (
              <TableRow key={r.id}>
                <TableCell>
                  {r.is_online
                    ? <Badge variant="default" className="bg-green-600"><Wifi className="h-3 w-3 mr-1" />Online</Badge>
                    : <Badge variant="secondary"><WifiOff className="h-3 w-3 mr-1" />Offline</Badge>}
                </TableCell>
                <TableCell className="font-medium">{r.hostname}</TableCell>
                <TableCell><Badge variant="outline">{VENDOR_OPTIONS.find(v => v.value === r.vendor)?.label || r.vendor}</Badge></TableCell>
                <TableCell className="text-muted-foreground">{r.model || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{r.management_ip || "—"}</TableCell>
                <TableCell className="font-mono text-sm">{r.wan_ip || "—"}</TableCell>
                <TableCell>{r.site_name || "—"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget({ id: r.id, name: r.hostname })}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!routers?.length && (
              <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No routers registered yet</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will remove the router and all associated DNS zones, tunnels, and firewall rules.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { if (deleteTarget) { deleteRouter.mutate(deleteTarget.id); setDeleteTarget(null); } }}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
