import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { insertJobSchema } from "@shared/schema";
import { z } from "zod";
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
      customerId: 1,
      priority: "normal",
      status: "not_started",
      items: [{ name: "", quantity: 1, estimatedTimePerItem: "", material: "", notes: "" }],
    },
  });

  const createJobMutation = useMutation({
    mutationFn: (data: JobFormData) => {
      const items = data.items.map(item => ({
        ...item,
        estimatedTimePerItem: parseTimeString(item.estimatedTimePerItem || "0"),
      }));
      
      return apiRequest("POST", "/api/jobs", { ...data, items });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Job created successfully" });
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create job", variant: "destructive" });
    },
  });

  const onSubmit = (data: JobFormData) => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Job</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Customer Selection */}
          <div>
            <Label htmlFor="customerId">Customer</Label>
            <Select onValueChange={(value) => form.setValue("customerId", parseInt(value))}>
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
              <Select onValueChange={(value) => form.setValue("priority", value as any)}>
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
                  setValueAs: (value) => value ? new Date(value) : undefined 
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
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
