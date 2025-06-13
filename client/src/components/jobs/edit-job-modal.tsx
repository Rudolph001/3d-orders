import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
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
import { insertJobSchema, insertJobItemSchema } from "@shared/schema";
import type { JobWithCustomer, Customer } from "@shared/schema";

const editJobSchema = insertJobSchema.extend({
  items: z.array(insertJobItemSchema.omit({ jobId: true }).extend({
    id: z.number().optional(),
    estimatedTimePerItem: z.coerce.number().min(0).default(0),
  })).min(1, "At least one item is required"),
});

type EditJobFormData = z.infer<typeof editJobSchema>;

interface EditJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job: JobWithCustomer | null;
}

export default function EditJobModal({ open, onOpenChange, job }: EditJobModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<EditJobFormData>({
    resolver: zodResolver(editJobSchema),
    defaultValues: {
      customerId: 0,
      priority: "normal",
      status: "not_started",
      dueDate: "",
      items: [{ name: "", quantity: 1, estimatedTimePerItem: 0, material: "", notes: "" }],
      notes: "",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Reset form when job changes
  useEffect(() => {
    if (job && open) {
      form.reset({
        customerId: job.customerId,
        priority: job.priority,
        status: job.status,
        dueDate: job.dueDate ? new Date(job.dueDate).toISOString().slice(0, 16) : "",
        items: job.items.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          estimatedTimePerItem: item.estimatedTimePerItem || 0,
          material: item.material || "",
          notes: item.notes || "",
        })),
        notes: job.notes || "",
      });
    }
  }, [job, open, form]);

  const updateJobMutation = useMutation({
    mutationFn: async (data: EditJobFormData) => {
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
          estimatedTimePerItem: item.estimatedTimePerItem,
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

  const onSubmit = (data: EditJobFormData) => {
    updateJobMutation.mutate(data);
  };

  const addItem = () => {
    append({ name: "", quantity: 1, estimatedTimePerItem: 0, material: "", notes: "" });
  };

  if (!job) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Job #{job.jobNumber}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Job Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerId">Customer *</Label>
              <Select 
                value={form.watch("customerId")?.toString() || ""} 
                onValueChange={(value) => form.setValue("customerId", parseInt(value))}
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
              {form.formState.errors.customerId && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.customerId.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="priority">Priority</Label>
              <Select 
                value={form.watch("priority")} 
                onValueChange={(value) => form.setValue("priority", value as "low" | "normal" | "high" | "urgent")}
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
                value={form.watch("status")} 
                onValueChange={(value) => form.setValue("status", value as "not_started" | "printing" | "paused" | "completed")}
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
                {...form.register("dueDate")}
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
              {fields.map((field, index) => (
                <Card key={field.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-medium">Item {index + 1}</h4>
                      {fields.length > 1 && (
                        <Button
                          type="button"
                          onClick={() => remove(index)}
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
                        <Label htmlFor={`items.${index}.name`}>Name *</Label>
                        <Input
                          placeholder="Item name"
                          {...form.register(`items.${index}.name`)}
                        />
                        {form.formState.errors.items?.[index]?.name && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.items[index]?.name?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.quantity`}>Quantity *</Label>
                        <Input
                          type="number"
                          min="1"
                          placeholder="1"
                          {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                        />
                        {form.formState.errors.items?.[index]?.quantity && (
                          <p className="text-sm text-red-600 mt-1">
                            {form.formState.errors.items[index]?.quantity?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.estimatedTimePerItem`}>Time per Item (min)</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.1"
                          placeholder="0"
                          {...form.register(`items.${index}.estimatedTimePerItem`, { valueAsNumber: true })}
                        />
                      </div>

                      <div>
                        <Label htmlFor={`items.${index}.material`}>Material</Label>
                        <Input
                          placeholder="e.g., PLA, ABS"
                          {...form.register(`items.${index}.material`)}
                        />
                      </div>
                    </div>

                    <div className="mt-3">
                      <Label htmlFor={`items.${index}.notes`}>Notes</Label>
                      <Textarea
                        placeholder="Special instructions for this item..."
                        {...form.register(`items.${index}.notes`)}
                        rows={2}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {form.formState.errors.items?.root && (
              <p className="text-sm text-red-600 mt-2">{form.formState.errors.items.root.message}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Job Notes</Label>
            <Textarea
              placeholder="Any special instructions or notes for this job..."
              {...form.register("notes")}
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