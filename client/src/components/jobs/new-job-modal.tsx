import React, { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { insertJobSchema } from "@shared/schema";
import { parseTimeString } from "@/lib/utils";
import type { Customer } from "@shared/schema";

const jobFormSchema = insertJobSchema.extend({
  customerId: z.number().min(1, "Please select a customer"),
  items: z.array(z.object({
    name: z.string().min(1, "Item name is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    estimatedTimePerItem: z.string().optional(),
    material: z.string().optional(),
    notes: z.string().optional(),
  })).min(1, "At least one item is required"),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface NewJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function NewJobModal({ open, onOpenChange }: NewJobModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      customerId: 0,
      priority: "normal",
      status: "not_started",
      notes: "",
      items: [{ name: "", quantity: 1, estimatedTimePerItem: "", material: "", notes: "" }],
    },
  });

  const resetForm = () => {
    form.reset({
      customerId: 0,
      priority: "normal",
      status: "not_started",
      notes: "",
      items: [{ name: "", quantity: 1, estimatedTimePerItem: "", material: "", notes: "" }],
    });
  };

  const createJobMutation = useMutation({
    mutationFn: (data: JobFormData) => {
      console.log("Submitting job data:", data);

      if (!data.customerId || data.customerId === 0) {
        throw new Error("Please select a customer");
      }

      const validItems = data.items.filter(item => item.name?.trim() !== "");
      if (validItems.length === 0) {
        throw new Error("At least one item is required");
      }

      const items = validItems.map(item => ({
        name: item.name.trim(),
        quantity: Number(item.quantity) || 1,
        estimatedTimePerItem: parseTimeString(item.estimatedTimePerItem || "0"),
        material: item.material?.trim() || "",
        notes: item.notes?.trim() || "",
      }));

      const jobData = {
        customerId: Number(data.customerId),
        priority: data.priority || "normal",
        status: data.status || "not_started",
        dueDate: data.dueDate || undefined,
        notes: data.notes?.trim() || "",
        items
      };

      console.log("Final job data:", jobData);
      return apiRequest("POST", "/api/jobs", jobData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Job created successfully" });
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Job creation error:", error);
      const message = error?.response?.data?.message || error?.message || "Failed to create job";
      toast({ title: message, variant: "destructive" });
    },
  });

  const onSubmit = (data: JobFormData) => {
    console.log("Form submitted with data:", data);

    if (!data.customerId || data.customerId === 0) {
      toast({ title: "Please select a customer", variant: "destructive" });
      return;
    }

    const validItems = data.items.filter(item => item.name?.trim() !== "");
    if (validItems.length === 0) {
      toast({ title: "Please add at least one item", variant: "destructive" });
      return;
    }

    createJobMutation.mutate(data);
  };

  const addItem = () => {
    const currentItems = form.getValues("items");
    form.setValue("items", [...currentItems, { name: "", quantity: 1, estimatedTimePerItem: "", material: "", notes: "" }]);
  };

  const removeItem = (index: number) => {
    const currentItems = form.getValues("items");
    if (currentItems.length > 1) {
      form.setValue("items", currentItems.filter((_, i) => i !== index));
    }
  };

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <Label htmlFor="customerId">Customer *</Label>
            <Select 
              value={form.watch("customerId")?.toString() || ""}
              onValueChange={(value) => {
                const customerId = parseInt(value);
                form.setValue("customerId", customerId);
                console.log("Selected customer ID:", customerId);
              }}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a customer..." />
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
              <p className="text-sm text-destructive mt-1">{form.formState.errors.customerId.message}</p>
            )}
          </div>

          {/* Job Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority">Job Priority</Label>
              <Select 
                value={form.watch("priority") || "normal"}
                onValueChange={(value) => form.setValue("priority", value as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Normal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Input
                type="date"
                {...form.register("dueDate", { 
                  setValueAs: (value) => {
                    if (!value || value === '') return undefined;
                    const date = new Date(value + 'T00:00:00.000Z');
                    return isNaN(date.getTime()) ? undefined : date;
                  }
                })}
              />
            </div>
          </div>

          {/* Items Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-4 h-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {form.watch("items").map((_, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-4">
                    <Input
                      placeholder="Item name"
                      {...form.register(`items.${index}.name`)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      {...form.register(`items.${index}.quantity`, { valueAsNumber: true })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      placeholder="2h 30m"
                      {...form.register(`items.${index}.estimatedTimePerItem`)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      placeholder="Material"
                      {...form.register(`items.${index}.material`)}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      disabled={form.watch("items").length === 1}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            {form.formState.errors.items && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.items.message}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              placeholder="Any special instructions or notes..."
              {...form.register("notes")}
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <Button type="button" variant="outline" onClick={() => {
              resetForm();
              onOpenChange(false);
            }}>
              Cancel
            </Button>
            <Button type="submit" disabled={createJobMutation.isPending}>
              {createJobMutation.isPending ? "Creating..." : "Create Job"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}