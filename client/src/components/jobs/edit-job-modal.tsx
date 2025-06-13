import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { JobWithCustomer, Customer } from "@shared/schema";

interface EditJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobWithCustomer | null;
}

export default function EditJobModal({ open, onOpenChange, job }: EditJobModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customerId: 0,
    priority: "normal",
    status: "not_started",
    dueDate: "",
    notes: "",
    items: [{ id: undefined as number | undefined, name: "", quantity: 1, estimatedTimePerItem: 0, material: "", notes: "" }]
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Reset form when job changes
  useEffect(() => {
    if (job && open) {
      setFormData({
        customerId: job.customerId,
        priority: job.priority,
        status: job.status,
        dueDate: job.dueDate ? new Date(job.dueDate).toISOString().slice(0, 16) : "",
        notes: job.notes || "",
        items: job.items.map(item => ({
          id: item.id as number | undefined,
          name: item.name,
          quantity: item.quantity,
          estimatedTimePerItem: item.estimatedTimePerItem || 0,
          material: item.material || "",
          notes: item.notes || "",
        })),
      });
    }
  }, [job, open]);

  const parseTimeString = (timeStr: string | number): number => {
    if (!timeStr || timeStr === "") return 0;

    // If it's already a number, return it
    if (typeof timeStr === 'number' || !isNaN(Number(timeStr))) {
      return Number(timeStr);
    }

    // Parse formats like "2h 30m", "2h", "30m", "150"
    const hourMatch = String(timeStr).match(/(\d+)h/);
    const minuteMatch = String(timeStr).match(/(\d+)m/);

    const hours = hourMatch ? parseInt(hourMatch[1]) : 0;
    const minutes = minuteMatch ? parseInt(minuteMatch[1]) : 0;

    return hours * 60 + minutes;
  };

  const updateJobMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!job) throw new Error("No job to update");

      // Update job details
      const jobUpdate = {
        customerId: data.customerId,
        priority: data.priority,
        status: data.status,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        notes: data.notes,
      };

      await apiRequest("PUT", `/api/jobs/${job.id}`, jobUpdate);

      // Update job items
      const existingItemIds = job.items.map(item => item.id);
      const updatedItemIds = data.items.filter(item => item.id).map(item => item.id);

      // Delete removed items
      const itemsToDelete = existingItemIds.filter(id => !updatedItemIds.includes(id));
      for (const itemId of itemsToDelete) {
        await apiRequest("DELETE", `/api/jobs/${job.id}/items/${itemId}`);
      }

      // Update or create items
      for (const item of data.items) {
        const itemData = {
          name: item.name,
          quantity: item.quantity,
          estimatedTimePerItem: parseTimeString(item.estimatedTimePerItem),
          material: item.material,
          notes: item.notes,
        };

        if (item.id) {
          // Update existing item
          await apiRequest("PUT", `/api/jobs/${job.id}/items/${item.id}`, itemData);
        } else {
          // Create new item
          await apiRequest("POST", `/api/jobs/${job.id}/items`, { ...itemData, jobId: job.id });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Job updated successfully" });
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Update job error:", error);
      toast({ 
        title: "Failed to update job", 
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive" 
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.items.length === 0) {
      toast({ title: "At least one item is required", variant: "destructive" });
      return;
    }
    updateJobMutation.mutate(formData);
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: undefined, name: "", quantity: 1, estimatedTimePerItem: 0, material: "", notes: "" }]
    }));
  };

  const removeItem = (index: number) => {
    if (formData.items.length > 1) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateItem = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job #{job.jobNumber}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Job Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer *</Label>
              <Select 
                value={formData.customerId.toString()} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, customerId: parseInt(value) }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id.toString()}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="printing">Printing</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dueDate: e.target.value }))}
              />
            </div>
          </div>

          {/* Job Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-medium">Job Items *</Label>
              <Button type="button" onClick={addItem} size="sm" variant="outline">
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {formData.items.map((item, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {formData.items.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => removeItem(index)}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <Label>Name *</Label>
                        <Input
                          placeholder="Item name"
                          value={item.name}
                          onChange={(e) => updateItem(index, 'name', e.target.value)}
                          required
                        />
                      </div>

                      <div>
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                          required
                        />
                      </div>

                      <div>
                        <Label>Time per Item (min)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          value={item.estimatedTimePerItem}
                          onChange={(e) => updateItem(index, 'estimatedTimePerItem', parseFloat(e.target.value) || 0)}
                        />
                      </div>

                      <div>
                        <Label>Material</Label>
                        <Input
                          placeholder="e.g., PLA, ABS"
                          value={item.material}
                          onChange={(e) => updateItem(index, 'material', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <Label>Notes</Label>
                      <Textarea
                        placeholder="Special instructions for this item..."
                        value={item.notes}
                        onChange={(e) => updateItem(index, 'notes', e.target.value)}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Job Notes</Label>
            <Textarea
              placeholder="Any special instructions or notes for this job..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateJobMutation.isPending}>
              {updateJobMutation.isPending ? "Updating..." : "Update Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}